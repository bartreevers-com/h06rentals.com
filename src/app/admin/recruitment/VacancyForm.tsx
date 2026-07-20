"use client";

import { useActionState } from "react";
import type { Vacancy } from "@/lib/db/schema";

type ActionState = { error?: string; saved?: boolean } | null;

/** Shared create/edit form. `guardedLocked` = applications are open, so
 *  selection-criteria edits demand an owner + a written reason. */
export function VacancyForm({
  action,
  vacancy,
  panelOptions,
  guardedLocked,
  isOwner,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  vacancy?: Vacancy;
  panelOptions: { id: number; name: string; role: string }[];
  guardedLocked?: boolean;
  isOwner?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  const dateValue = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const questionLines = (vacancy?.questions ?? [])
    .map((q) => [q.label, q.type, q.required ? "required" : "optional", ...(q.eligibility ? ["eligibility"] : [])].join(" | "))
    .join("\n");
  const competencyLines = (vacancy?.competencies ?? []).map((c) => `${c.name} | ${c.weight}`).join("\n");

  return (
    <form action={formAction} className="space-y-6">
      {vacancy && <input type="hidden" name="id" value={vacancy.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="v-title">Title</label>
          <input id="v-title" name="title" className="field" defaultValue={vacancy?.title ?? ""} required />
        </div>
        <div>
          <label className="field-label" htmlFor="v-dept">Department</label>
          <input id="v-dept" name="department" className="field" defaultValue={vacancy?.department ?? ""} placeholder="Brand & Marketing" />
        </div>
        <div>
          <label className="field-label" htmlFor="v-hm">Hiring manager</label>
          <input id="v-hm" name="hiringManager" className="field" defaultValue={vacancy?.hiringManager ?? ""} />
        </div>
        <div>
          <label className="field-label" htmlFor="v-openings">Openings</label>
          <input id="v-openings" name="openings" type="number" min={1} className="field" defaultValue={vacancy?.openings ?? 1} />
        </div>
        <div>
          <label className="field-label" htmlFor="v-engagement">Engagement</label>
          <select id="v-engagement" name="engagementType" className="field" defaultValue={vacancy?.engagementType ?? "full_time"}>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="v-arrangement">Work arrangement</label>
          <select id="v-arrangement" name="workArrangement" className="field" defaultValue={vacancy?.workArrangement ?? "on_site"}>
            <option value="on_site">On-site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="v-location">Location</label>
          <input id="v-location" name="location" className="field" defaultValue={vacancy?.location ?? "Lagos, Nigeria"} />
        </div>
        <div>
          <label className="field-label" htmlFor="v-start">Expected start</label>
          <input id="v-start" name="expectedStart" className="field" defaultValue={vacancy?.expectedStart ?? ""} placeholder="September 2026" />
        </div>
        <div>
          <label className="field-label" htmlFor="v-opens">Applications open</label>
          <input id="v-opens" name="opensAt" type="date" className="field" defaultValue={dateValue(vacancy?.opensAt)} />
        </div>
        <div>
          <label className="field-label" htmlFor="v-closes">Applications close</label>
          <input id="v-closes" name="closesAt" type="date" className="field" defaultValue={dateValue(vacancy?.closesAt)} />
        </div>
        <div>
          <label className="field-label" htmlFor="v-comp">Compensation</label>
          <input id="v-comp" name="compensation" className="field" defaultValue={vacancy?.compensation ?? ""} placeholder="₦— / month + …" />
          <label className="mt-2 flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" name="compensationPublic" defaultChecked={vacancy?.compensationPublic ?? false} />
            Show compensation on the public listing
          </label>
        </div>
        <div>
          <label className="field-label" htmlFor="v-retention">Retention (days after process ends)</label>
          <input id="v-retention" name="retentionDays" type="number" min={30} className="field" defaultValue={vacancy?.retentionDays ?? 180} />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="v-summary">Public summary</label>
        <textarea id="v-summary" name="summary" rows={3} className="field" defaultValue={vacancy?.summary ?? ""} required />
      </div>
      <div>
        <label className="field-label" htmlFor="v-resp">Responsibilities (one per line)</label>
        <textarea id="v-resp" name="responsibilities" rows={5} className="field" defaultValue={(vacancy?.responsibilities ?? []).join("\n")} />
      </div>

      <div className={guardedLocked ? "rounded-xl border border-amber-400/30 p-4" : ""}>
        {guardedLocked && (
          <p className="mb-4 text-xs leading-relaxed text-amber-300">
            ⚠ Applications are open. The fields below are selection criteria — changing them is
            Owner-only, requires a written reason, and the previous configuration is preserved on
            the audit record. Historic screening decisions are never recalculated.
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="v-ess">Essential requirements (one per line)</label>
            <textarea id="v-ess" name="essentials" rows={4} className="field" defaultValue={(vacancy?.essentials ?? []).join("\n")} disabled={guardedLocked && !isOwner} />
          </div>
          <div>
            <label className="field-label" htmlFor="v-des">Desirable requirements (one per line)</label>
            <textarea id="v-des" name="desirables" rows={3} className="field" defaultValue={(vacancy?.desirables ?? []).join("\n")} disabled={guardedLocked && !isOwner} />
          </div>
          <div>
            <label className="field-label" htmlFor="v-compt">Competencies (name | weight, one per line)</label>
            <textarea id="v-compt" name="competencies" rows={3} className="field" defaultValue={competencyLines} disabled={guardedLocked && !isOwner} placeholder={"On-camera presence | 3\nHospitality instinct | 2"} />
          </div>
          <div>
            <label className="field-label" htmlFor="v-q">Application questions (label | type | required/optional | eligibility)</label>
            <textarea id="v-q" name="questions" rows={5} className="field" defaultValue={questionLines} disabled={guardedLocked && !isOwner} placeholder={"Why H06, and why you? | textarea | required\nDo you have the right to work in Nigeria? | yes_no | required | eligibility\nLink to your best content | link | optional"} />
            <p className="mt-1 text-[11px] text-muted">Types: text, textarea, yes_no, link. Add &quot;eligibility&quot; to a yes_no line to auto-screen on it.</p>
          </div>
          <div>
            <span className="field-label">Required documents &amp; media</span>
            <div className="mt-1 flex flex-wrap gap-5 text-sm text-cream-dim">
              {(["cv", "supporting", "video", "audio"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" name={`doc_${k}`} defaultChecked={vacancy?.requiredDocs?.[k] ?? k === "cv"} disabled={guardedLocked && !isOwner} />
                  {k === "cv" ? "CV" : k[0].toUpperCase() + k.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="v-stages">Recruitment stages (one per line, informational)</label>
            <textarea id="v-stages" name="stages" rows={3} className="field" defaultValue={(vacancy?.stages ?? []).join("\n")} disabled={guardedLocked && !isOwner} placeholder={"Eligibility screening\nShortlist review\nOn-camera interview\nFinal assessment"} />
          </div>
        </div>
        {guardedLocked && isOwner && (
          <div className="mt-4">
            <label className="field-label" htmlFor="v-greason">Reason for changing selection criteria (goes on the audit record)</label>
            <textarea id="v-greason" name="guardedReason" rows={2} className="field" placeholder="Only needed if you changed any field in this box" />
          </div>
        )}
      </div>

      <div>
        <span className="field-label">Panel members (see this vacancy&apos;s candidates)</span>
        {panelOptions.length === 0 ? (
          <p className="mt-1 text-xs text-muted">No hiring managers or assessors on the team yet — add them under Team.</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-cream-dim">
            {panelOptions.map((p) => (
              <label key={p.id} className="flex items-center gap-2">
                <input type="checkbox" name="panel" value={p.id} defaultChecked={(vacancy?.panel ?? []).includes(p.id)} />
                {p.name} <span className="text-[10px] uppercase text-muted">{p.role.replace("_", " ")}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="v-privacy">Privacy notice version</label>
        <input id="v-privacy" name="privacyVersion" className="field max-w-32" defaultValue={vacancy?.privacyVersion ?? "1.0"} />
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.saved && !state.error && <p className="text-sm text-emerald-glow">Saved.</p>}

      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : vacancy ? "Save changes" : "Create draft vacancy"}
      </button>
    </form>
  );
}
