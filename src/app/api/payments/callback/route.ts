import { NextRequest, NextResponse } from "next/server";
import { paystackConfigured, verifyTransaction } from "@/lib/paystack";
import { settlePayment, getPaymentByReference } from "@/lib/payments";

/** Paystack redirects here after checkout. Verify server-side, then send the
 *  customer to their booking page with the outcome. */
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref");
  const origin = req.nextUrl.origin;
  if (!reference) return NextResponse.redirect(`${origin}/book`);

  const payment = await getPaymentByReference(reference);
  if (!payment) return NextResponse.redirect(`${origin}/book`);

  let outcome: "success" | "failed" = "failed";
  let amountNgn: number | undefined;
  let channel: string | undefined;
  let paidAt: Date | undefined;
  let raw: unknown;

  if (paystackConfigured()) {
    try {
      const v = await verifyTransaction(reference);
      outcome = v.status === "success" ? "success" : "failed";
      amountNgn = v.amountNgn;
      channel = v.channel;
      paidAt = v.paidAt;
      raw = v.raw;
    } catch (err) {
      console.error("[payments/callback] verify failed", err);
      outcome = "failed";
    }
  } else {
    // Mock mode settles via /api/payments/mock; a bare callback hit is a failure.
    outcome = "failed";
  }

  const { bookingRef } = await settlePayment({ reference, outcome, amountNgn, channel, paidAt, raw });
  const target = bookingRef
    ? `${origin}/booking/${bookingRef}?payment=${outcome}`
    : `${origin}/book`;
  return NextResponse.redirect(target);
}
