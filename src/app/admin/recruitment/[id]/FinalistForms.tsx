"use client";

import { useActionState, useState } from "react";
import { ownerDecisionAction, setFinalistsAction } from "../actions";

type ActionState = { error?: string } | null;
const asAction = (fn: unknown) => fn as (prev: ActionState, fd: FormData) => Promise<ActionState>;

function ErrorNote({ state }: { state: ActionState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
      {state.error}
    </p>
  );
}

/** HR selects up to three finalists; each move walks the audited pipeline. */
export function FinalistSelect({
  vacancyId,
  candidates,
}: {
  vacancyId: number;
  candidates: { id: number; name: string; ref: string; status: string; avgScore: number | null }[];
}) {
  const [state, formAction, pending] = useActionState(asAction(setFinalistsAction), null);
  const [picked, setPicked] = useState<number[]>([]);

  if (candidates.length === 0) return null;
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <div className="space-y-2">
        {candidates.map((c) => (
          <label key={c.id} className="glass-subtle flex cursor-pointer items-center justify-between gap-3 p-3 text-sm">
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                name="finalist"
                value={c.id}
                checked={picked.includes(c.id)}
                onChange={(e) =>
                  setPicked((p) => (e.target.checked ? [...p, c.id].slice(-3) : p.filter((x) => x !== c.id)))
                }
              />
              <span className="text-cream">{c.name}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted">{c.ref} · {c.status.replace(/_/g, " ")}</span>
            </span>
            {c.avgScore !== null && <span className="text-xs text-emerald-glow">{c.avgScore}/100</span>}
          </label>
        ))}
      </div>
      <p className="text-[11px] text-muted">
        Up to three. Fewer is fine if only one or two meet the standard. The highest score doesn&apos;t
        automatically win — the owner decides.
      </p>
      <div>
        <label className="field-label" htmlFor="fin-reason">Reason for this shortlist (audited)</label>
        <textarea id="fin-reason" name="reason" rows={2} className="field" required minLength={5} />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" name="notify" defaultChecked /> Email finalists that they&apos;ve reached the final stage
      </label>
      <ErrorNote state={state} />
      <button className="btn btn-primary btn-sm" disabled={pending || picked.length === 0}>
        {pending ? "Submitting…" : `Send ${picked.length || ""} finalist${picked.length === 1 ? "" : "s"} to the Owner`}
      </button>
    </form>
  );
}

/** The Owner's decision panel on the comparison page. */
export function OwnerDecision({
  vacancyId,
  finalists,
  panelTopId,
}: {
  vacancyId: number;
  finalists: { id: number; name: string; ref: string }[];
  panelTopId: number | null;
}) {
  const [state, formAction, pending] = useActionState(asAction(ownerDecisionAction), null);
  const [decision, setDecision] = useState("approve");
  const needsCandidate = ["approve", "reserve", "request_info"].includes(decision);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <input type="hidden" name="panelTopId" value={panelTopId ?? ""} />
      <div>
        <label className="field-label" htmlFor="own-decision">Decision</label>
        <select id="own-decision" name="decision" className="field" value={decision} onChange={(e) => setDecision(e.target.value)}>
          <option value="approve">Approve a candidate (offer)</option>
          <option value="reserve">Place a candidate on reserve</option>
          <option value="request_info">Request more information</option>
          <option value="return_to_hr">Return finalists to HR</option>
          <option value="reject_all">Reject all finalists</option>
        </select>
      </div>
      {needsCandidate && (
        <div>
          <label className="field-label" htmlFor="own-cand">Candidate</label>
          <select id="own-cand" name="applicationId" className="field" defaultValue="">
            <option value="" disabled>Select…</option>
            {finalists.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.ref}){panelTopId === f.id ? " — panel's top score" : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="own-reason">
          Reason {decision === "approve" ? "(required if you choose against the panel's top score)" : "(required)"}
        </label>
        <textarea id="own-reason" name="reason" rows={2} className="field" />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" name="notify" defaultChecked /> Email the affected candidate(s)
      </label>
      <p className="text-[11px] text-muted">
        Your decision never alters or deletes the panel&apos;s original scores.
      </p>
      <ErrorNote state={state} />
      <button className="btn btn-primary btn-md" disabled={pending}>
        {pending ? "Recording…" : "Record decision"}
      </button>
    </form>
  );
}
