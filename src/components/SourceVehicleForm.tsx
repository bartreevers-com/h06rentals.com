"use client";

import { useState } from "react";

/**
 * When the exact car a client wants is unavailable, this pings the
 * concierge immediately (email + Enquiries tab) with the client's details
 * so the team can source the same vehicle for them.
 */
export function SourceVehicleForm({ vehicleSlug, vehicleName }: { vehicleSlug: string; vehicleName: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [form, setForm] = useState({ name: "", phone: "", dates: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2 || form.phone.trim().length < 7) {
      setState("error");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sourcing",
          name: form.name.trim(),
          phone: form.phone.trim(),
          vehicleSlug,
          message: `Wants the ${vehicleName} (currently unavailable).${form.dates ? ` Dates: ${form.dates}.` : ""} Source the same vehicle for this client.`,
        }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p className="rounded-lg border border-emerald-glow/30 bg-emerald-deep/15 p-4 text-sm leading-relaxed text-emerald-glow">
        The concierge has your request and is already looking for a {vehicleName} for you.
        Expect a WhatsApp message shortly.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <p className="text-sm leading-relaxed text-cream-dim">
        Want this exact car? Leave your details — the concierge is pinged instantly and will
        source the same vehicle for you.
      </p>
      <input
        className="field"
        placeholder="Your name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        className="field"
        placeholder="WhatsApp number (+234…)"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <input
        className="field"
        placeholder="Dates you need it (optional)"
        value={form.dates}
        onChange={(e) => setForm({ ...form, dates: e.target.value })}
      />
      {state === "error" && (
        <p role="alert" className="text-xs text-red-300">
          Please add your name and a valid phone number, then try again.
        </p>
      )}
      <button className="btn btn-primary btn-md" disabled={state === "sending"}>
        {state === "sending" ? "Pinging the concierge…" : "Source this car for me"}
      </button>
    </form>
  );
}
