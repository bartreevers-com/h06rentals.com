"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface DashboardApp {
  id: number;
  ref: string;
  status: string;
  submittedAt: string | null;
  talentPoolConsent: boolean;
  vacancyTitle: string;
  vacancySlug: string;
  vacancyOpen: boolean;
  files: { id: number; kind: string; filename: string }[];
}

/** Candidate-facing status labels — internal pipeline detail stays internal. */
const STATUS_LABELS: Record<string, { label: string; tone: "active" | "good" | "closed" }> = {
  draft: { label: "Draft — not yet submitted", tone: "active" },
  submitted: { label: "Received", tone: "active" },
  screening: { label: "Under review", tone: "active" },
  shortlisted: { label: "Shortlisted", tone: "good" },
  interview: { label: "Interview stage", tone: "good" },
  final_assessment: { label: "Final assessment", tone: "good" },
  finalist: { label: "Final stage", tone: "good" },
  owner_review: { label: "Final stage", tone: "good" },
  conditional_offer: { label: "Offer stage", tone: "good" },
  hired: { label: "Hired 🎉", tone: "good" },
  reserve: { label: "Reserve list", tone: "active" },
  rejected: { label: "Not successful this time", tone: "closed" },
  withdrawn: { label: "Withdrawn", tone: "closed" },
};

export function ApplicationCard({ app }: { app: DashboardApp }) {
  const router = useRouter();
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [amending, setAmending] = useState(false);
  const [amendText, setAmendText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const status = STATUS_LABELS[app.status] ?? { label: app.status, tone: "active" as const };
  const closed = ["rejected", "withdrawn", "hired"].includes(app.status);
  const isDraft = app.status === "draft";

  async function withdraw() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/careers/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: app.id }),
    });
    setBusy(false);
    if (res.ok) {
      setConfirmWithdraw(false);
      setMsg("Your application has been withdrawn. A confirmation email is on its way.");
      router.refresh();
    } else {
      setError((await res.json()).error ?? "Could not withdraw — please try again");
    }
  }

  async function amend() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/careers/amend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: app.id, note: amendText }),
    });
    setBusy(false);
    if (res.ok) {
      setAmending(false);
      setAmendText("");
      setMsg("Correction received — it's now attached to your application.");
    } else {
      setError((await res.json()).error ?? "Could not send the correction");
    }
  }

  return (
    <div className="glass p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">{app.ref}</p>
          <h2 className="display text-xl text-cream">{app.vacancyTitle}</h2>
          {app.submittedAt && (
            <p className="mt-1 text-[11px] text-muted">
              Submitted{" "}
              {new Date(app.submittedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest ${
            status.tone === "good"
              ? "border-emerald-glow/50 text-emerald-glow"
              : status.tone === "closed"
                ? "border-white/20 text-muted"
                : "border-white/30 text-cream/80"
          }`}
        >
          {status.label}
        </span>
      </div>

      {app.files.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          {app.files.map((f) => (
            <a
              key={f.id}
              href={`/api/careers/file/${f.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-subtle rounded-full px-3 py-1 text-muted hover:text-cream"
            >
              {f.filename}
            </a>
          ))}
        </div>
      )}

      {msg && <p className="mt-4 text-xs text-emerald-glow">{msg}</p>}
      {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-4 text-xs">
        {isDraft && app.vacancyOpen && (
          <Link href={`/careers/${app.vacancySlug}/apply`} className="btn btn-primary btn-sm">
            Continue application
          </Link>
        )}
        {!closed && !isDraft && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setAmending((v) => !v)}>
              Send a correction
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmWithdraw(true)}>
              Withdraw
            </button>
          </>
        )}
        {isDraft && !app.vacancyOpen && <p className="text-muted">This vacancy has closed — the draft can no longer be submitted.</p>}
      </div>

      {amending && (
        <div className="mt-4 space-y-3">
          <textarea
            className="field w-full"
            rows={4}
            placeholder="What needs correcting? e.g. 'My phone number should be…' — your original answers stay on file, with this correction attached."
            value={amendText}
            onChange={(e) => setAmendText(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={amend} disabled={busy || amendText.trim().length < 5}>
            {busy ? "Sending…" : "Send correction"}
          </button>
        </div>
      )}

      {confirmWithdraw && (
        <div className="glass-subtle mt-4 p-4">
          <p className="text-xs leading-relaxed text-cream/90">
            Withdraw this application? You&apos;ll leave the process for this role, and we&apos;ll
            confirm by email. Your data is then deleted on our standard retention schedule.
          </p>
          <div className="mt-3 flex gap-3">
            <button className="btn btn-primary btn-sm" onClick={withdraw} disabled={busy}>
              {busy ? "Withdrawing…" : "Yes, withdraw"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmWithdraw(false)} disabled={busy}>
              Keep my application
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        await fetch("/api/careers/otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "signout" }),
        });
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
