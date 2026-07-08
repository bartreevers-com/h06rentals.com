import type { Metadata } from "next";
import { Mark } from "@/components/Logo";
import { MockCheckout } from "./MockCheckout";
import { paystackConfigured } from "@/lib/paystack";
import { formatNaira } from "@/lib/quote";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Test Checkout",
  robots: { index: false },
};

/**
 * Mock payment gateway — active only while Paystack keys are not configured.
 * Lets the full booking → payment → confirmation flow run end-to-end in test.
 */
export default async function MockPayPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; amount?: string }>;
}) {
  const { reference, amount } = await searchParams;

  if (paystackConfigured() || !reference) {
    return (
      <div className="mx-auto max-w-md px-5 pb-24 pt-36 text-center">
        <p className="text-sm text-muted">This test checkout is not available.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-32">
      <div className="glass p-8 text-center">
        <Mark variant="silver" size={48} className="mx-auto" />
        <p className="mt-5 rounded-lg border border-cream/25 bg-ink/50 px-3 py-2 text-xs uppercase tracking-wider text-cream-dim">
          Test mode — no real money moves
        </p>
        <h1 className="display mt-6 text-2xl text-cream">Secure checkout</h1>
        <p className="mt-2 text-sm text-muted">
          Paystack keys haven&apos;t been connected yet, so this simulator stands in for the real
          gateway. The rest of the flow — records, receipts, confirmations — is fully live.
        </p>
        <p className="display mt-6 text-3xl text-emerald-glow">
          {formatNaira(Number(amount ?? 0))}
        </p>
        <p className="mt-1 text-xs text-muted">Ref: {reference}</p>
        <MockCheckout reference={reference} />
      </div>
    </div>
  );
}
