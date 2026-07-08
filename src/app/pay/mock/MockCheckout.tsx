"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MockCheckout({ reference }: { reference: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"success" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = async (outcome: "success" | "failed") => {
    setBusy(outcome);
    setError(null);
    try {
      const res = await fetch("/api/payments/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, outcome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Simulation failed");
      router.push(`/booking/${data.bookingRef}?payment=${outcome}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
      setBusy(null);
    }
  };

  return (
    <div className="mt-8 flex flex-col gap-3">
      <button
        onClick={() => complete("success")}
        disabled={busy !== null}
        className="btn btn-primary btn-lg w-full disabled:opacity-60"
      >
        {busy === "success" ? "Processing…" : "Simulate successful payment"}
      </button>
      <button
        onClick={() => complete("failed")}
        disabled={busy !== null}
        className="btn btn-ghost btn-md w-full disabled:opacity-60"
      >
        {busy === "failed" ? "Processing…" : "Simulate failed payment"}
      </button>
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
