import "server-only";
import crypto from "crypto";

/**
 * Server-side Paystack integration.
 *
 * With PAYSTACK_SECRET_KEY set (test or live), transactions are initialised
 * and verified against the real Paystack API. Without it, the platform runs
 * a clearly-labelled mock gateway so the full booking + payment flow can be
 * exercised end-to-end before keys are added.
 */

const PAYSTACK_API = "https://api.paystack.co";

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export interface InitResult {
  authorizationUrl: string;
  reference: string;
  provider: "paystack" | "mock";
}

export async function initializeTransaction(opts: {
  email: string;
  amountNgn: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitResult> {
  if (!paystackConfigured()) {
    // Mock gateway: local checkout page that can simulate success/failure.
    const url = `/pay/mock?reference=${encodeURIComponent(opts.reference)}&amount=${opts.amountNgn}&callback=${encodeURIComponent(opts.callbackUrl)}`;
    return { authorizationUrl: url, reference: opts.reference, provider: "mock" };
  }

  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountNgn * 100, // kobo
      currency: "NGN",
      reference: opts.reference,
      callback_url: opts.callbackUrl,
      metadata: opts.metadata,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? `Paystack initialize failed (${res.status})`);
  }
  return {
    authorizationUrl: json.data.authorization_url,
    reference: json.data.reference,
    provider: "paystack",
  };
}

export interface VerifyResult {
  status: "success" | "failed" | "pending";
  amountNgn: number;
  channel?: string;
  paidAt?: Date;
  raw: unknown;
}

export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  if (!paystackConfigured()) {
    throw new Error("Paystack not configured — mock payments verify via /api/payments/mock");
  }
  const res = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    },
  );
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? `Paystack verify failed (${res.status})`);
  }
  const d = json.data;
  return {
    status: d.status === "success" ? "success" : d.status === "failed" ? "failed" : "pending",
    amountNgn: Math.round((d.amount ?? 0) / 100),
    channel: d.channel,
    paidAt: d.paid_at ? new Date(d.paid_at) : undefined,
    raw: d,
  };
}

/** Verify x-paystack-signature on webhook payloads. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

export function makePaymentReference(bookingRef: string): string {
  return `${bookingRef}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}
