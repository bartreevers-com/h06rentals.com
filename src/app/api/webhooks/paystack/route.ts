import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { settlePayment } from "@/lib/payments";

/** Paystack webhook — authoritative settlement, verified by HMAC signature. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string; amount?: number; channel?: string; paid_at?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const reference = event.data?.reference;
  if (!reference) return NextResponse.json({ ok: true });

  if (event.event === "charge.success") {
    await settlePayment({
      reference,
      outcome: "success",
      amountNgn: Math.round((event.data?.amount ?? 0) / 100),
      channel: event.data?.channel,
      paidAt: event.data?.paid_at ? new Date(event.data.paid_at) : undefined,
      raw: event.data,
    });
  } else if (event.event === "charge.failed") {
    await settlePayment({ reference, outcome: "failed", raw: event.data });
  }

  return NextResponse.json({ ok: true });
}
