"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CandidateSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/careers/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", email }),
    });
    setBusy(false);
    if (res.ok) setSent(true);
    else setError((await res.json()).error ?? "Could not send the code");
  }

  async function verify() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/careers/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", email, code: code.trim() }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError((await res.json()).error ?? "That code didn't work");
  }

  return (
    <div className="space-y-4">
      {!sent ? (
        <>
          <input
            type="email"
            className="field w-full"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <button className="btn btn-primary w-full" onClick={start} disabled={busy || !email.includes("@")}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted">
            Code sent to <span className="text-cream">{email}</span> — valid for 10 minutes.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            className="field w-full tracking-[0.5em]"
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button className="btn btn-primary w-full" onClick={verify} disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button className="w-full text-xs text-muted hover:text-cream" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
