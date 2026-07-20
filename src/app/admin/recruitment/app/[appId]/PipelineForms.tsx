"use client";

import { useActionState, useState } from "react";
import { moveApplicationAction, sendCommAction } from "../../actions";

type ActionState = { error?: string } | null;

export function MoveForm({
  applicationId,
  moves,
}: {
  applicationId: number;
  moves: { to: string; label: string; isOverride: boolean }[];
}) {
  const [state, formAction, pending] = useActionState(
    moveApplicationAction as (prev: ActionState, fd: FormData) => Promise<ActionState>,
    null,
  );
  const [to, setTo] = useState(moves[0]?.to ?? "");
  const selected = moves.find((m) => m.to === to);

  if (moves.length === 0) return null;
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={applicationId} />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="field-label" htmlFor="move-to">Move to</label>
          <select id="move-to" name="to" className="field" value={to} onChange={(e) => setTo(e.target.value)}>
            {moves.map((m) => (
              <option key={m.to} value={m.to}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-xs text-muted">
          <input type="checkbox" name="notify" defaultChecked />
          Email candidate (shortlist / rejection templates)
        </label>
      </div>
      {selected?.isOverride && (
        <p className="text-xs text-amber-300">
          ⚠ This skips mandatory stages — it will be recorded as an Owner override on the audit trail.
        </p>
      )}
      <div>
        <label className="field-label" htmlFor="move-reason">Reason (required — every manual change is audited)</label>
        <textarea id="move-reason" name="reason" rows={2} className="field" required minLength={5} />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Moving…" : "Apply change"}
      </button>
    </form>
  );
}

export function CommForm({
  applicationId,
  templates,
  previews,
}: {
  applicationId: number;
  templates: { id: string; label: string }[];
  previews: Record<string, { subject: string; body: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    sendCommAction as (prev: ActionState, fd: FormData) => Promise<ActionState>,
    null,
  );
  const [mode, setMode] = useState<"template" | "manual">("template");
  const [template, setTemplate] = useState(templates[0]?.id ?? "");
  const preview = previews[template];

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={applicationId} />
      <div className="flex gap-2">
        <button type="button" className={`btn btn-sm ${mode === "template" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("template")}>
          Template
        </button>
        <button type="button" className={`btn btn-sm ${mode === "manual" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("manual")}>
          Manual message
        </button>
      </div>

      {mode === "template" ? (
        <>
          <select name="template" className="field" value={template} onChange={(e) => setTemplate(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {preview && (
            <div className="glass-subtle p-3 text-xs">
              <p className="font-semibold text-cream">{preview.subject}</p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-muted">{preview.body}</pre>
            </div>
          )}
        </>
      ) : (
        <>
          <input type="hidden" name="template" value="" />
          <input name="subject" className="field" placeholder="Subject" required={mode === "manual"} />
          <textarea name="body" rows={5} className="field" placeholder="Message to the candidate…" required={mode === "manual"} />
        </>
      )}

      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Sending…" : "Send to candidate"}
      </button>
    </form>
  );
}
