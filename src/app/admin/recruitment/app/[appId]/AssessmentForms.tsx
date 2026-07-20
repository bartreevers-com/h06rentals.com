"use client";

import { useActionState, useMemo, useState } from "react";
import {
  generateAiAnalysisAction,
  saveScorecardAction,
  scheduleInterviewAction,
  screenApplicationAction,
  updateInterviewAction,
} from "../../actions";

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

/* ── eligibility screening ──────────────────────────────────────── */

export function ScreeningForm({ applicationId }: { applicationId: number }) {
  const [state, formAction, pending] = useActionState(asAction(screenApplicationAction), null);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={applicationId} />
      <div className="flex flex-wrap gap-4">
        {[
          ["eligible", "Eligible"],
          ["not_eligible", "Not eligible"],
          ["needs_review", "Needs review"],
        ].map(([v, label]) => (
          <label key={v} className="flex items-center gap-2 text-sm text-cream-dim">
            <input type="radio" name="result" value={v} required /> {label}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" name="meetsEssentials" />
        Meets all essential requirements
      </label>
      <div>
        <label className="field-label" htmlFor="scr-reason">Reason for decision (required, audited)</label>
        <textarea id="scr-reason" name="reason" rows={2} className="field" required minLength={5} />
      </div>
      <div>
        <label className="field-label" htmlFor="scr-notes">Internal notes (optional)</label>
        <textarea id="scr-notes" name="notes" rows={2} className="field" />
      </div>
      <ErrorNote state={state} />
      <button className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Recording…" : "Record screening decision"}
      </button>
    </form>
  );
}

/* ── interviews ─────────────────────────────────────────────────── */

export interface InterviewRow {
  id: number;
  scheduledAt: string;
  mode: string;
  locationOrLink: string;
  interviewerNames: string[];
  status: string;
  attendance: string | null;
}

export function InterviewScheduler({
  applicationId,
  interviews,
  panelOptions,
}: {
  applicationId: number;
  interviews: InterviewRow[];
  panelOptions: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(asAction(scheduleInterviewAction), null);
  const [updState, updAction, updPending] = useActionState(asAction(updateInterviewAction), null);
  const [mode, setMode] = useState("online");
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {interviews.map((iv) => (
        <div key={iv.id} className="glass-subtle p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-cream">
                {new Date(iv.scheduledAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                <span className="ml-2 text-xs text-muted">{iv.mode === "physical" ? "In person" : "Online"}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">{iv.locationOrLink}</p>
              {iv.interviewerNames.length > 0 && (
                <p className="mt-0.5 text-xs text-muted">Panel: {iv.interviewerNames.join(", ")}</p>
              )}
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wider ${
                iv.status === "cancelled"
                  ? "border-red-400/40 text-red-300"
                  : iv.status === "completed"
                    ? "border-emerald-glow/50 text-emerald-glow"
                    : "border-cream/25 text-cream-dim"
              }`}
            >
              {iv.attendance ?? iv.status}
            </span>
          </div>

          {["scheduled", "rescheduled"].includes(iv.status) && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReschedulingId(reschedulingId === iv.id ? null : iv.id)}>
                Reschedule
              </button>
              <form action={updAction}>
                <input type="hidden" name="interviewId" value={iv.id} />
                <input type="hidden" name="op" value="cancel" />
                <input type="hidden" name="notify" value="on" />
                <button className="btn btn-ghost btn-sm" disabled={updPending}>Cancel (emails candidate)</button>
              </form>
              <form action={updAction}>
                <input type="hidden" name="interviewId" value={iv.id} />
                <input type="hidden" name="op" value="attendance" />
                <input type="hidden" name="attendance" value="attended" />
                <button className="btn btn-ghost btn-sm" disabled={updPending}>Mark attended</button>
              </form>
              <form action={updAction}>
                <input type="hidden" name="interviewId" value={iv.id} />
                <input type="hidden" name="op" value="attendance" />
                <input type="hidden" name="attendance" value="no_show" />
                <button className="btn btn-ghost btn-sm" disabled={updPending}>No-show</button>
              </form>
            </div>
          )}

          {reschedulingId === iv.id && (
            <form action={updAction} className="mt-3 space-y-2 border-t border-white/10 pt-3">
              <input type="hidden" name="interviewId" value={iv.id} />
              <input type="hidden" name="op" value="reschedule" />
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="field-label">New date &amp; time</label>
                  <input type="datetime-local" name="scheduledAt" className="field" required />
                </div>
                <select name="mode" className="field" defaultValue={iv.mode}>
                  <option value="online">Online</option>
                  <option value="physical">In person</option>
                </select>
                <input name="locationOrLink" className="field" defaultValue={iv.locationOrLink} placeholder="Link or address" />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" name="notify" defaultChecked /> Email the candidate the new time
              </label>
              <button className="btn btn-primary btn-sm" disabled={updPending}>
                {updPending ? "Saving…" : "Confirm reschedule"}
              </button>
            </form>
          )}
        </div>
      ))}
      <ErrorNote state={updState} />

      <form action={formAction} className="space-y-3 border-t border-white/10 pt-4">
        <p className="eyebrow">Schedule an interview</p>
        <input type="hidden" name="id" value={applicationId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="iv-when">Date &amp; time</label>
            <input id="iv-when" type="datetime-local" name="scheduledAt" className="field" required />
          </div>
          <div>
            <label className="field-label" htmlFor="iv-mode">Format</label>
            <select id="iv-mode" name="mode" className="field" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="online">Online</option>
              <option value="physical">In person</option>
            </select>
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="iv-where">{mode === "physical" ? "Location" : "Meeting link"}</label>
          <input id="iv-where" name="locationOrLink" className="field" required placeholder={mode === "physical" ? "1 Gbangbala Street, Ikate, Lekki" : "https://meet…"} />
        </div>
        {panelOptions.length > 0 && (
          <div>
            <span className="field-label">Interviewers</span>
            <div className="flex flex-wrap gap-4 text-sm text-cream-dim">
              {panelOptions.map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <input type="checkbox" name="interviewers" value={p.id} /> {p.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" name="notify" defaultChecked /> Email the candidate an invitation
        </label>
        <ErrorNote state={state} />
        <button className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Scheduling…" : "Schedule interview"}
        </button>
      </form>
    </div>
  );
}

/* ── scorecard (independent, weighted) ──────────────────────────── */

export interface ScorecardSeed {
  scores: Record<string, number>;
  evidence: string;
  strengths: string;
  concerns: string;
  recommendation: string | null;
  submitted: boolean;
}

export function ScorecardForm({
  applicationId,
  competencies,
  recommendations,
  existing,
}: {
  applicationId: number;
  competencies: { id: string; label: string; weight: number }[];
  recommendations: { id: string; label: string }[];
  existing: ScorecardSeed | null;
}) {
  const [state, formAction, pending] = useActionState(asAction(saveScorecardAction), null);
  const [scores, setScores] = useState<Record<string, number>>(existing?.scores ?? {});

  const liveTotal = useMemo(() => {
    if (!competencies.every((c) => scores[c.id] >= 1 && scores[c.id] <= 5)) return null;
    return Math.round(competencies.reduce((sum, c) => sum + (scores[c.id] / 5) * c.weight, 0));
  }, [scores, competencies]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={applicationId} />
      <div className="space-y-3">
        {competencies.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-cream-dim">
              {c.label} <span className="text-[10px] text-muted">({c.weight}%)</span>
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <label
                  key={v}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-xs transition ${
                    scores[c.id] === v
                      ? "border-emerald-glow bg-emerald-glow/20 text-emerald-glow"
                      : "border-white/15 text-muted hover:border-white/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={`score_${c.id}`}
                    value={v}
                    className="sr-only"
                    checked={scores[c.id] === v}
                    onChange={() => setScores((s) => ({ ...s, [c.id]: v }))}
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">
        Weighted total:{" "}
        <span className="text-base font-semibold text-emerald-glow">{liveTotal ?? "—"}</span>
        <span className="text-muted"> / 100</span>
      </p>
      <div>
        <label className="field-label" htmlFor="sc-ev">Evidence / comments (required to submit)</label>
        <textarea id="sc-ev" name="evidence" rows={3} className="field" defaultValue={existing?.evidence ?? ""} placeholder="What did you see or hear that supports these scores?" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="sc-str">Strengths</label>
          <textarea id="sc-str" name="strengths" rows={2} className="field" defaultValue={existing?.strengths ?? ""} />
        </div>
        <div>
          <label className="field-label" htmlFor="sc-con">Concerns</label>
          <textarea id="sc-con" name="concerns" rows={2} className="field" defaultValue={existing?.concerns ?? ""} />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="sc-rec">Overall recommendation</label>
        <select id="sc-rec" name="recommendation" className="field" defaultValue={existing?.recommendation ?? ""}>
          <option value="">Select…</option>
          {recommendations.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>
      {existing?.submitted && (
        <div>
          <label className="field-label" htmlFor="sc-editreason">Reason for changing a submitted scorecard (required — previous scores are preserved)</label>
          <textarea id="sc-editreason" name="editReason" rows={2} className="field" />
        </div>
      )}
      <ErrorNote state={state} />
      <div className="flex gap-2">
        <button name="submit" value="no" className="btn btn-ghost btn-sm" disabled={pending}>
          Save draft
        </button>
        <button name="submit" value="yes" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Saving…" : existing?.submitted ? "Update submitted scorecard" : "Submit scorecard"}
        </button>
      </div>
    </form>
  );
}

/* ── AI assistant ───────────────────────────────────────────────── */

export function AiGenerateButton({ applicationId, hasExisting }: { applicationId: number; hasExisting: boolean }) {
  const [state, formAction, pending] = useActionState(asAction(generateAiAnalysisAction), null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={applicationId} />
      <ErrorNote state={state} />
      <button className="btn btn-ghost btn-sm" disabled={pending}>
        {pending ? "Analysing…" : hasExisting ? "Regenerate AI summary" : "Generate AI summary"}
      </button>
    </form>
  );
}
