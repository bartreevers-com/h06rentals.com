"use client";

import { useState } from "react";

export function EnquiryForm({
  type,
  vehicleSlug,
  messageLabel = "Message",
  messagePlaceholder = "How can we help?",
  submitLabel = "Send enquiry",
}: {
  type: "vip" | "corporate" | "custom" | "contact";
  vehicleSlug?: string;
  messageLabel?: string;
  messagePlaceholder?: string;
  submitLabel?: string;
}) {
  const [state, setState] = useState({ name: "", phone: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.name.trim().length < 2) return setError("Please add your name");
    if (state.phone.trim().length < 7) return setError("Please add a phone number");
    setError(null);
    setStatus("busy");
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, vehicleSlug, ...state }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not send — please try WhatsApp instead");
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send — please try WhatsApp instead");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="rounded-xl border border-emerald-glow/30 bg-emerald-deep/15 p-5 text-sm text-emerald-glow">
        Received. The concierge will reach out shortly — usually within the hour.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <label className="field-label" htmlFor={`${type}-name`}>Full name</label>
        <input
          id={`${type}-name`}
          className="field"
          autoComplete="name"
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`${type}-phone`}>Phone</label>
          <input
            id={`${type}-phone`}
            className="field"
            type="tel"
            autoComplete="tel"
            placeholder="+234…"
            value={state.phone}
            onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${type}-email`}>Email (optional)</label>
          <input
            id={`${type}-email`}
            className="field"
            type="email"
            autoComplete="email"
            value={state.email}
            onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor={`${type}-message`}>{messageLabel}</label>
        <textarea
          id={`${type}-message`}
          className="field min-h-28"
          placeholder={messagePlaceholder}
          value={state.message}
          onChange={(e) => setState((s) => ({ ...s, message: e.target.value }))}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={status === "busy"} className="btn btn-primary btn-md disabled:opacity-60">
        {status === "busy" ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
