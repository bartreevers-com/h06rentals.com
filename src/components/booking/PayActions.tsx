"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/quote";

/** Retry / complete payment from the booking page. */
export function PayActions({ bookingRef, outstanding }: { bookingRef: string; outstanding: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: bookingRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start payment");
      window.location.href = data.authorizationUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button onClick={pay} disabled={busy} className="btn btn-primary btn-lg w-full disabled:opacity-60">
        {busy ? "Opening secure checkout…" : `Pay ${formatNaira(outstanding)} securely`}
      </button>
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
