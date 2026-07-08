import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { paystackConfigured } from "@/lib/paystack";
import { settlePayment } from "@/lib/payments";

/** Mock gateway settlement — only available while Paystack keys are absent. */
export async function POST(req: NextRequest) {
  if (paystackConfigured()) {
    return NextResponse.json({ error: "Mock payments are disabled when Paystack is configured" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = z
    .object({ reference: z.string(), outcome: z.enum(["success", "failed"]) })
    .safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { bookingRef, applied } = await settlePayment({
    reference: parsed.data.reference,
    outcome: parsed.data.outcome,
    channel: "mock",
    raw: { mock: true },
  });
  if (!bookingRef) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ bookingRef, applied });
}
