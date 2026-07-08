import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Simple HMAC-signed session for the admin dashboard.
 * ADMIN_PASSWORD must be set in production; a dev default keeps local QA easy.
 */
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

export async function createAdminSession() {
  const expires = Date.now() + MAX_AGE * 1000;
  const payload = String(expires);
  const token = `${payload}.${sign(payload)}`;
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (sign(payload) !== sig) return false;
  return Number(payload) > Date.now();
}
