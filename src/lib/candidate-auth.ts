import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { candidates, type Candidate } from "./db/schema";
import { sendEmail } from "./email";

/**
 * Candidate authentication — entirely separate from staff sessions.
 * Email OTP (6 digits, 10-minute expiry, scrypt-hashed at rest) creates a
 * 30-day HMAC cookie session. Candidates only ever see their own data.
 */

const COOKIE = "h06_cand";
const SESSION_DAYS = 30;
const OTP_TTL_MS = 10 * 60 * 1000;

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "h06-dev-secret";
}
const sign = (payload: string) => crypto.createHmac("sha256", secret()).update(`cand:${payload}`).digest("hex");

function hashOtp(email: string, code: string): string {
  return crypto.scryptSync(code, `otp:${email.toLowerCase()}`, 32).toString("hex");
}

export async function startOtp(email: string): Promise<{ ok: boolean }> {
  const db = await getDb();
  const clean = email.trim().toLowerCase();
  const code = String(crypto.randomInt(100000, 1000000));
  const otpHash = hashOtp(clean, code);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  await db
    .insert(candidates)
    .values({ email: clean, otpHash, otpExpiresAt })
    .onConflictDoUpdate({ target: candidates.email, set: { otpHash, otpExpiresAt } });
  await sendEmail({
    to: clean,
    subject: `${code} is your H06 Careers verification code`,
    text: [
      `Your H06 Careers verification code is: ${code}`,
      ``,
      `It expires in 10 minutes. If you didn't request it, you can ignore this email.`,
      ``,
      `H06 Rentals — Careers`,
    ].join("\n"),
  });
  return { ok: true };
}

export async function verifyOtp(email: string, code: string): Promise<Candidate | null> {
  const db = await getDb();
  const clean = email.trim().toLowerCase();
  const rows = await db.select().from(candidates).where(eq(candidates.email, clean)).limit(1);
  const cand = rows[0];
  if (!cand?.otpHash || !cand.otpExpiresAt || cand.otpExpiresAt.getTime() < Date.now()) return null;
  const candidateHash = Buffer.from(hashOtp(clean, code.trim()), "hex");
  const stored = Buffer.from(cand.otpHash, "hex");
  if (candidateHash.length !== stored.length || !crypto.timingSafeEqual(candidateHash, stored)) return null;
  const [updated] = await db
    .update(candidates)
    .set({ otpHash: null, otpExpiresAt: null, verifiedAt: new Date() })
    .where(eq(candidates.id, cand.id))
    .returning();
  await createCandidateSession(updated.id);
  return updated;
}

export async function createCandidateSession(candidateId: number) {
  const body = Buffer.from(
    JSON.stringify({ c: candidateId, e: Date.now() + SESSION_DAYS * 86400000 }),
  ).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 86400,
    path: "/",
  });
}

export async function getCandidate(): Promise<Candidate | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || sign(body) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.e !== "number" || data.e < Date.now()) return null;
    const db = await getDb();
    const rows = await db.select().from(candidates).where(eq(candidates.id, Number(data.c))).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function signOutCandidate() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
