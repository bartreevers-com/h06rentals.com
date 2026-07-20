import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { getCandidate } from "@/lib/candidate-auth";
import { getDb } from "@/lib/db";
import { applicationFiles, applications, type Application } from "@/lib/db/schema";
import {
  STORAGE_DRIVER,
  createSignedUpload,
  deleteStoredFile,
  statObject,
  storeFile,
  validateUpload,
} from "@/lib/recruitment/storage";
import { getVacancy, vacancyIsOpen } from "@/lib/recruitment/repo";

export const maxDuration = 60;

/**
 * Candidate uploads for their own draft application.
 *
 * Production (Supabase driver) is a two-step direct upload, because Vercel
 * rejects request bodies over ~4.5 MB:
 *   1. JSON {action:"sign", applicationId, kind, filename, mime, size}
 *      → validates and returns a one-time signed URL the browser PUTs the
 *        file to, straight into the private bucket.
 *   2. JSON {action:"confirm", applicationId, kind, storagePath, filename,
 *      mime, size} → verifies the object actually landed, replaces any
 *      previous file of that kind, records the row.
 *
 * Local dev (no Supabase key) accepts classic multipart form-data.
 */
export async function POST(req: NextRequest) {
  const candidate = await getCandidate();
  if (!candidate) return NextResponse.json({ error: "Please verify your email first" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as {
      action?: string;
      applicationId?: number;
      kind?: string;
      filename?: string;
      mime?: string;
      size?: number;
      storagePath?: string;
    } | null;
    if (!body?.action) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const gate = await draftGate(candidate.id, Number(body.applicationId));
    if ("error" in gate) return gate.error;
    const { app } = gate;

    const kind = String(body.kind ?? "");
    const filename = String(body.filename ?? "");
    const mime = String(body.mime ?? "");
    const size = Number(body.size ?? 0);
    const check = validateUpload(kind, filename, mime, size);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    if (body.action === "sign") {
      if (STORAGE_DRIVER !== "supabase") return NextResponse.json({ mode: "proxy" });
      const storagePath = `app-${app.id}/${kind}/${crypto.randomUUID()}-${safeName(filename)}`;
      try {
        const uploadUrl = await createSignedUpload(storagePath);
        return NextResponse.json({ mode: "direct", uploadUrl, storagePath });
      } catch (err) {
        console.error("[careers/upload:sign]", err);
        return NextResponse.json({ error: "Could not prepare the upload — please try again" }, { status: 502 });
      }
    }

    if (body.action === "confirm") {
      const storagePath = String(body.storagePath ?? "");
      // the path must be one we would have signed for THIS application + kind
      if (!storagePath.startsWith(`app-${app.id}/${kind}/`) || storagePath.includes(".."))
        return NextResponse.json({ error: "Invalid upload reference" }, { status: 400 });
      const storedSize = await statObject(storagePath);
      if (storedSize === null)
        return NextResponse.json({ error: "The upload didn't complete — please try again" }, { status: 409 });
      const recheck = validateUpload(kind, filename, mime, storedSize);
      if (!recheck.ok) {
        await deleteStoredFile(storagePath).catch(() => {});
        return NextResponse.json({ error: recheck.error }, { status: 400 });
      }
      const row = await recordFile(app, kind, filename, mime, storedSize, storagePath);
      return NextResponse.json({ ok: true, fileId: row.id, filename: row.filename, kind });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  /* ── multipart proxy (local dev driver) ─────────────────────── */
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  const applicationId = Number(formData.get("applicationId"));
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  if (!applicationId || !(file instanceof File))
    return NextResponse.json({ error: "Missing file or application" }, { status: 400 });

  const gate = await draftGate(candidate.id, applicationId);
  if ("error" in gate) return gate.error;
  const { app } = gate;

  const check = validateUpload(kind, file.name, file.type, file.size);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `app-${app.id}/${kind}/${crypto.randomUUID()}-${safeName(file.name)}`;

  try {
    await storeFile(storagePath, buffer, file.type);
  } catch (err) {
    console.error("[careers/upload]", err);
    return NextResponse.json({ error: "Upload failed — please try again" }, { status: 502 });
  }

  const row = await recordFile(app, kind, file.name, file.type, file.size, storagePath);
  return NextResponse.json({ ok: true, fileId: row.id, filename: row.filename, kind });
}

function safeName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/** The application must exist, belong to this candidate, still be a draft,
 *  and its vacancy must still be open. */
async function draftGate(
  candidateId: number,
  applicationId: number,
): Promise<{ app: Application } | { error: NextResponse }> {
  if (!applicationId) return { error: NextResponse.json({ error: "Missing application" }, { status: 400 }) };
  const db = await getDb();
  const apps = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.candidateId, candidateId)))
    .limit(1);
  const app = apps[0];
  if (!app) return { error: NextResponse.json({ error: "Application not found" }, { status: 404 }) };
  if (app.status !== "draft")
    return { error: NextResponse.json({ error: "This application is already submitted" }, { status: 409 }) };
  const vacancy = await getVacancy(app.vacancyId);
  if (!vacancy || !vacancyIsOpen(vacancy))
    return { error: NextResponse.json({ error: "Applications are closed" }, { status: 409 }) };
  return { app };
}

/** Replace any previous file of this kind on the draft, then record the new one. */
async function recordFile(
  app: Application,
  kind: string,
  filename: string,
  mime: string,
  sizeBytes: number,
  storagePath: string,
) {
  const db = await getDb();
  const previous = await db
    .select()
    .from(applicationFiles)
    .where(and(eq(applicationFiles.applicationId, app.id), eq(applicationFiles.kind, kind)));
  for (const p of previous) {
    await deleteStoredFile(p.storagePath).catch(() => {});
    await db.delete(applicationFiles).where(eq(applicationFiles.id, p.id));
  }
  const [row] = await db
    .insert(applicationFiles)
    .values({ applicationId: app.id, kind, filename, mime, sizeBytes, storagePath, storageDriver: STORAGE_DRIVER })
    .returning();
  return row;
}
