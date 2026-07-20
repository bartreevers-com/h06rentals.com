import "server-only";
import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * Private file storage for recruitment uploads.
 *
 * Production: a private Supabase Storage bucket ("recruitment"), accessed
 * server-side with the service role key; candidates and staff only ever
 * receive short-lived signed URLs. Local development falls back to
 * .data/uploads with HMAC-signed expiring tokens served by our own route.
 * No public URLs exist in either mode.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://vmbbwtgzfxveoegroxho.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "recruitment";
const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

export const STORAGE_DRIVER: "supabase" | "local" = SERVICE_KEY ? "supabase" : "local";

export const UPLOAD_LIMITS: Record<
  string,
  { maxBytes: number; mimes: string[]; extensions: string[] }
> = {
  cv: {
    maxBytes: 5 * 1024 * 1024,
    mimes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    extensions: [".pdf", ".docx"],
  },
  supporting: {
    maxBytes: 10 * 1024 * 1024,
    mimes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ],
    extensions: [".pdf", ".docx", ".png", ".jpg", ".jpeg"],
  },
  video: {
    maxBytes: 200 * 1024 * 1024,
    mimes: ["video/mp4", "video/quicktime"],
    extensions: [".mp4", ".mov"],
  },
  audio: {
    maxBytes: 30 * 1024 * 1024,
    mimes: ["audio/mpeg", "audio/wav", "audio/x-wav"],
    extensions: [".mp3", ".wav"],
  },
};

export function validateUpload(
  kind: string,
  filename: string,
  mime: string,
  size: number,
): { ok: true } | { ok: false; error: string } {
  const limits = UPLOAD_LIMITS[kind];
  if (!limits) return { ok: false, error: "Unknown upload kind" };
  const ext = path.extname(filename).toLowerCase();
  if (!limits.extensions.includes(ext))
    return { ok: false, error: `Allowed file types: ${limits.extensions.join(", ")}` };
  if (!limits.mimes.includes(mime)) return { ok: false, error: `File type ${mime} is not allowed` };
  if (size <= 0 || size > limits.maxBytes)
    return { ok: false, error: `Maximum size is ${Math.round(limits.maxBytes / 1048576)}MB` };
  return { ok: true };
}

async function supa(pathname: string, init: RequestInit): Promise<Response> {
  return fetch(`${SUPABASE_URL}/storage/v1${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY as string,
      ...(init.headers ?? {}),
    },
  });
}

let bucketEnsured = false;
async function ensureBucket() {
  if (bucketEnsured || STORAGE_DRIVER !== "supabase") return;
  const res = await supa("/bucket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  });
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    if (!text.includes("already exists")) throw new Error(`Bucket create failed: ${res.status} ${text}`);
  }
  bucketEnsured = true;
}

/** Store a file privately; returns the storage path. */
export async function storeFile(storagePath: string, data: Buffer, mime: string): Promise<void> {
  if (STORAGE_DRIVER === "supabase") {
    await ensureBucket();
    const res = await supa(`/object/${BUCKET}/${storagePath}`, {
      method: "POST",
      headers: { "Content-Type": mime, "x-upsert": "true" },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
    return;
  }
  const full = path.join(LOCAL_ROOT, storagePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, data);
}

/** A signed URL valid for `expiresIn` seconds. Never store these. */
export async function signedUrl(storagePath: string, expiresIn = 300): Promise<string> {
  if (STORAGE_DRIVER === "supabase") {
    const res = await supa(`/object/sign/${BUCKET}/${storagePath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn }),
    });
    if (!res.ok) throw new Error(`Sign failed: ${res.status} ${await res.text()}`);
    const { signedURL } = (await res.json()) as { signedURL: string };
    return `${SUPABASE_URL}/storage/v1${signedURL}`;
  }
  const expires = Date.now() + expiresIn * 1000;
  const token = crypto
    .createHmac("sha256", process.env.ADMIN_SESSION_SECRET ?? "h06-dev-secret")
    .update(`file:${storagePath}:${expires}`)
    .digest("hex");
  return `/api/careers/local-file?path=${encodeURIComponent(storagePath)}&expires=${expires}&token=${token}`;
}

/** Verify a local-driver token (dev only). */
export function verifyLocalToken(storagePath: string, expires: number, token: string): boolean {
  if (expires < Date.now()) return false;
  const expected = crypto
    .createHmac("sha256", process.env.ADMIN_SESSION_SECRET ?? "h06-dev-secret")
    .update(`file:${storagePath}:${expires}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function readLocalFile(storagePath: string): Buffer {
  return fs.readFileSync(path.join(LOCAL_ROOT, storagePath));
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  if (STORAGE_DRIVER === "supabase") {
    await supa(`/object/${BUCKET}/${storagePath}`, { method: "DELETE" });
    return;
  }
  try {
    fs.unlinkSync(path.join(LOCAL_ROOT, storagePath));
  } catch {
    // already gone
  }
}
