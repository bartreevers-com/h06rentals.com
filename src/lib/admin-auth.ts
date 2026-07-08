import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Staff sessions for the operations dashboard.
 *
 * One login, four roles: owner (everything, incl. team management — the
 * env-password break-glass login), admin (everything except team), sales
 * (bookings + enquiries), driver (own trips).
 */

export type StaffRole = "owner" | "admin" | "sales" | "driver";

export interface Session {
  userId: number; // 0 = owner (env-password login)
  role: StaffRole;
  name: string;
}

const COOKIE = "h06_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "h06-dev-secret";
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "h06admin";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export async function createSession(session: Session) {
  const body = Buffer.from(
    JSON.stringify({ s: session.userId, r: session.role, n: session.name, e: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || sign(body) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.e !== "number" || data.e < Date.now()) return null;
    if (!["owner", "admin", "sales", "driver"].includes(data.r)) return null;
    return { userId: Number(data.s) || 0, role: data.r, name: String(data.n ?? "Staff") };
  } catch {
    return null;
  }
}

export async function hasRole(...roles: StaffRole[]): Promise<Session | null> {
  const session = await getSession();
  return session && roles.includes(session.role) ? session : null;
}

/* ── password hashing (scrypt, no external deps) ─────────────── */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
