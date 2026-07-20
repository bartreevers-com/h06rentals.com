import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signOutCandidate, startOtp, verifyOtp } from "@/lib/candidate-auth";

const StartSchema = z.object({ action: z.literal("start"), email: z.string().email() });
const VerifySchema = z.object({ action: z.literal("verify"), email: z.string().email(), code: z.string().min(4).max(8) });
const SignOutSchema = z.object({ action: z.literal("signout") });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (SignOutSchema.safeParse(body).success) {
    await signOutCandidate();
    return NextResponse.json({ ok: true });
  }
  const start = StartSchema.safeParse(body);
  if (start.success) {
    await startOtp(start.data.email);
    return NextResponse.json({ ok: true });
  }
  const verify = VerifySchema.safeParse(body);
  if (verify.success) {
    const candidate = await verifyOtp(verify.data.email, verify.data.code);
    if (!candidate) return NextResponse.json({ error: "That code is wrong or has expired" }, { status: 401 });
    return NextResponse.json({ ok: true, verified: true });
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
