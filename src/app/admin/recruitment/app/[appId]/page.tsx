import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import {
  aiAnalyses,
  applicationAmendments,
  applicationAudit,
  applicationNotes,
  candidateComms,
  candidates,
  interviews as interviewsTable,
  scorecards as scorecardsTable,
  screenings as screeningsTable,
  staffUsers,
} from "@/lib/db/schema";
import {
  applicationFilesFor,
  getApplication,
  getVacancy,
  isRecruitRole,
  logEvent,
  staffCanSeeVacancy,
} from "@/lib/recruitment/repo";
import {
  APPLICATION_STATUSES,
  applicationTransition,
  type ApplicationStatus,
  type StaffRecruitRole,
} from "@/lib/recruitment/workflow";
import { COMM_TEMPLATES, previewComm, type CommTemplate } from "@/lib/recruitment/comms";
import { AI_LABEL } from "@/lib/recruitment/ai";
import { COMPETENCIES, RECOMMENDATIONS, competencyAverages, disagreements } from "@/lib/recruitment/scoring";
import { addNoteAction, setLegalHoldAction, setRetentionDateAction } from "../../actions";
import { CommForm, MoveForm } from "./PipelineForms";
import { AiGenerateButton, InterviewScheduler, ScorecardForm, ScreeningForm } from "./AssessmentForms";

export const dynamic = "force-dynamic";

const STANDARD_FIELDS: [string, string][] = [
  ["location", "Based in"],
  ["contactPreference", "Contact preference"],
  ["portfolio", "Portfolio / links"],
  ["employmentStatus", "Employment status"],
  ["noticePeriod", "Notice period"],
  ["availability", "Availability"],
  ["expectedCompensation", "Expected compensation"],
  ["rightToWork", "Right to work in Nigeria"],
  ["locationWilling", "Able to work from Lekki base"],
  ["conflictOfInterest", "Conflict of interest"],
  ["conflictDetails", "Conflict details"],
  ["brandConflict", "Existing brand commitments"],
  ["brandConflictDetails", "Brand commitment details"],
];

const SCREENING_LABELS: Record<string, string> = {
  eligible: "Eligible",
  not_eligible: "Not eligible",
  needs_review: "Needs review",
};

export default async function ApplicationAdminPage({ params }: { params: Promise<{ appId: string }> }) {
  const session = await getSession();
  if (!session || !isRecruitRole(session.role)) redirect("/admin");
  const { appId } = await params;
  const app = await getApplication(Number(appId));
  if (!app || app.status === "draft") notFound();
  const vacancy = await getVacancy(app.vacancyId);
  if (!vacancy) notFound();
  if (!staffCanSeeVacancy(session.role, session.userId, vacancy)) redirect("/admin/recruitment");

  const role = session.role as StaffRecruitRole;
  const canManage = ["owner", "hr"].includes(role);
  const isAssessorOnly = role === "assessor";
  const db = await getDb();

  // every staff view of a candidate is on the record
  await logEvent({
    actor: session.name,
    actorRole: role,
    action: "candidate_viewed",
    applicationId: app.id,
    vacancyId: vacancy.id,
  });

  const cand = (await db.select().from(candidates).where(eq(candidates.id, app.candidateId)).limit(1))[0];
  const files = await applicationFilesFor(app.id);
  const amendments = await db
    .select()
    .from(applicationAmendments)
    .where(eq(applicationAmendments.applicationId, app.id))
    .orderBy(asc(applicationAmendments.createdAt));
  const notes = await db
    .select()
    .from(applicationNotes)
    .where(eq(applicationNotes.applicationId, app.id))
    .orderBy(desc(applicationNotes.createdAt));
  const comms = canManage
    ? await db
        .select()
        .from(candidateComms)
        .where(eq(candidateComms.applicationId, app.id))
        .orderBy(desc(candidateComms.createdAt))
    : [];
  const audit = await db
    .select()
    .from(applicationAudit)
    .where(eq(applicationAudit.applicationId, app.id))
    .orderBy(desc(applicationAudit.createdAt));
  const screeningHistory = await db
    .select()
    .from(screeningsTable)
    .where(eq(screeningsTable.applicationId, app.id))
    .orderBy(desc(screeningsTable.reviewedAt));
  const latestScreening = screeningHistory[0];
  const interviewRows = await db
    .select()
    .from(interviewsTable)
    .where(eq(interviewsTable.applicationId, app.id))
    .orderBy(desc(interviewsTable.scheduledAt));
  const allScorecards = await db
    .select()
    .from(scorecardsTable)
    .where(eq(scorecardsTable.applicationId, app.id))
    .orderBy(asc(scorecardsTable.createdAt));
  const aiRows = await db
    .select()
    .from(aiAnalyses)
    .where(eq(aiAnalyses.applicationId, app.id))
    .orderBy(desc(aiAnalyses.createdAt));
  const latestAi = aiRows[0];

  // panel & interviewer name lookups
  const recruitStaff = await db
    .select({ id: staffUsers.id, name: staffUsers.name, role: staffUsers.role })
    .from(staffUsers)
    .where(inArray(staffUsers.role, ["hr", "hiring_manager", "assessor"]));
  const staffName = (id: number) => (id === 0 ? "Owner" : recruitStaff.find((s) => s.id === id)?.name ?? `#${id}`);

  // independent scoring: an assessor sees others' cards only after submitting their own
  const ownCard = allScorecards.find((c) => c.assessorId === session.userId) ?? null;
  const ownSubmitted = Boolean(ownCard?.submittedAt);
  const submittedCards = allScorecards.filter((c) => c.submittedAt);
  const canSeePanelResults = canManage || role === "hiring_manager" || (isAssessorOnly && ownSubmitted);
  const averages = competencyAverages(submittedCards.map((c) => c.scores));
  const strongDisagreements = disagreements(submittedCards.map((c) => c.scores));
  const avgTotal =
    submittedCards.length > 0
      ? Math.round(submittedCards.reduce((s, c) => s + (c.weightedTotal ?? 0), 0) / submittedCards.length)
      : null;

  const submitted = (app.submitted ?? {}) as {
    form?: Record<string, unknown>;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  const form = submitted.form ?? {};
  const anonymised = Boolean(app.anonymisedAt);

  const moves = canManage
    ? APPLICATION_STATUSES.filter((s) => s !== "draft" && s !== "withdrawn")
        .map((to) => ({ to, check: applicationTransition(app.status as ApplicationStatus, to, role) }))
        .filter((m) => m.check.ok)
        .map((m) => ({
          to: m.to,
          label: `${m.to.replace(/_/g, " ")}${m.check.isOverride ? " (override)" : ""}`,
          isOverride: m.check.isOverride,
        }))
    : [];

  const templateVars = {
    firstName: cand?.firstName ?? undefined,
    vacancyTitle: vacancy.title,
    applicationRef: app.ref,
  };
  const templates = Object.entries(COMM_TEMPLATES).map(([id, t]) => ({ id, label: t.label }));
  const previews = Object.fromEntries(
    Object.keys(COMM_TEMPLATES).map((id) => [id, previewComm(id as CommTemplate, templateVars)]),
  );

  return (
    <div>
      <Link
        href={`/admin/recruitment/${vacancy.id}`}
        className="text-xs uppercase tracking-widest text-muted hover:text-cream"
      >
        ← {vacancy.title}
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted">
            {app.ref} · submitted{" "}
            {app.submittedAt?.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · privacy notice v
            {app.privacyVersion} · lawful basis: {app.lawfulBasis.replace("_", " ")}
          </p>
          <h1 className="display mt-1 text-2xl text-cream">
            {anonymised
              ? "Anonymised candidate"
              : `${submitted.firstName ?? cand?.firstName ?? ""} ${submitted.lastName ?? cand?.lastName ?? ""}`.trim() ||
                cand?.email}
          </h1>
          {!anonymised && (
            <p className="mt-1 text-sm text-muted">
              {cand?.email} · {submitted.phone ?? cand?.phone ?? "no phone"}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="rounded-full border border-emerald-glow/50 px-3 py-1 text-[0.7rem] uppercase tracking-wider text-emerald-glow">
            {app.status.replace(/_/g, " ")}
          </span>
          {latestScreening ? (
            <p
              className={`mt-2 text-xs ${
                latestScreening.result === "eligible"
                  ? "text-emerald-glow"
                  : latestScreening.result === "not_eligible"
                    ? "text-red-300"
                    : "text-amber-300"
              }`}
            >
              Screening: {SCREENING_LABELS[latestScreening.result]}
            </p>
          ) : (
            app.eligibilityResult && (
              <p className={`mt-2 text-xs ${app.eligibilityResult === "fail" ? "text-amber-300" : "text-emerald-glow"}`}>
                Auto-screen: {app.eligibilityResult} (awaiting human screening)
              </p>
            )
          )}
          {avgTotal !== null && canSeePanelResults && (
            <p className="mt-1 text-xs text-cream">
              Panel average: <span className="font-semibold text-emerald-glow">{avgTotal}</span>/100 ({submittedCards.length}{" "}
              scorecard{submittedCards.length === 1 ? "" : "s"})
            </p>
          )}
          {app.talentPoolConsent && <p className="mt-1 text-xs text-muted">Talent-pool consent: yes</p>}
          {app.legalHold && <p className="mt-1 text-xs text-amber-300">⚖ Legal hold</p>}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* main column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass p-6">
            <h2 className="eyebrow">Submitted application {anonymised && "(anonymised)"}</h2>
            {anonymised ? (
              <p className="mt-3 text-sm text-muted">
                Personal data was destroyed on {app.anonymisedAt?.toLocaleDateString("en-GB")} under the retention
                policy. The stage history below is retained.
              </p>
            ) : (
              <dl className="mt-4 space-y-3 text-sm">
                {STANDARD_FIELDS.filter(([k]) => form[k] !== undefined && String(form[k]).trim() !== "").map(
                  ([k, label]) => (
                    <div key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                      <dt className="w-52 shrink-0 text-[11px] uppercase tracking-widest text-muted">{label}</dt>
                      <dd className="whitespace-pre-wrap text-cream/90">{String(form[k])}</dd>
                    </div>
                  ),
                )}
                {vacancy.questions.map((q) => (
                  <div key={q.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="w-52 shrink-0 text-[11px] uppercase tracking-widest text-muted">
                      {q.label}
                      {q.eligibility && " (eligibility)"}
                    </dt>
                    <dd className="whitespace-pre-wrap text-cream/90">{String(form[q.id] ?? "—")}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {amendments.length > 0 && (
            <div className="glass p-6">
              <h2 className="eyebrow">Candidate corrections ({amendments.length})</h2>
              <p className="mt-1 text-xs text-muted">
                Versioned amendments — the original submission above is never overwritten.
              </p>
              <div className="mt-3 space-y-3 text-sm">
                {amendments.map((am, i) => (
                  <div key={am.id} className="glass-subtle p-4">
                    <p className="text-[11px] uppercase tracking-widest text-muted">
                      Amendment {i + 1} —{" "}
                      {am.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-cream/90">{am.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && !anonymised && (
            <div className="glass p-6">
              <h2 className="eyebrow">Files</h2>
              <p className="mt-1 text-xs text-muted">
                Served via short-lived signed links; every access is logged. Videos stream at original quality.
              </p>
              <div className="mt-3 space-y-2 text-sm">
                {files.map((f) => (
                  <a
                    key={f.id}
                    href={`/api/admin/recruitment/file/${f.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-subtle flex items-center justify-between gap-3 p-3 text-cream hover:border-emerald-glow/40"
                  >
                    <span>
                      <span className="mr-2 text-[10px] uppercase tracking-widest text-emerald-glow">{f.kind}</span>
                      {f.filename}
                    </span>
                    <span className="text-xs text-muted">{(f.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* eligibility screening */}
          {!anonymised && (
            <div className="glass p-6">
              <h2 className="eyebrow">Eligibility screening</h2>
              {screeningHistory.length > 0 && (
                <div className="mt-3 space-y-2 text-sm">
                  {screeningHistory.map((s, i) => (
                    <div key={s.id} className={`glass-subtle p-3 ${i > 0 ? "opacity-60" : ""}`}>
                      <p className="text-cream">
                        {SCREENING_LABELS[s.result]}
                        {s.meetsEssentials && " · meets essentials"}
                        <span className="text-xs text-muted">
                          {" "}
                          — {s.reviewer},{" "}
                          {s.reviewedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted">Reason: {s.reason}</p>
                      {s.notes && <p className="mt-0.5 text-xs text-muted">Notes: {s.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
              {canManage && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <ScreeningForm applicationId={app.id} />
                </div>
              )}
              {!canManage && screeningHistory.length === 0 && (
                <p className="mt-2 text-xs text-muted">Not yet screened by HR.</p>
              )}
            </div>
          )}

          {/* interviews */}
          {!anonymised && (
            <div className="glass p-6">
              <h2 className="eyebrow">Interviews</h2>
              {canManage ? (
                <div className="mt-3">
                  <InterviewScheduler
                    applicationId={app.id}
                    interviews={interviewRows.map((iv) => ({
                      id: iv.id,
                      scheduledAt: iv.scheduledAt.toISOString(),
                      mode: iv.mode,
                      locationOrLink: iv.locationOrLink,
                      interviewerNames: iv.interviewers.map(staffName),
                      status: iv.status,
                      attendance: iv.attendance,
                    }))}
                    panelOptions={[
                      { id: 0, name: "Owner" },
                      ...recruitStaff.map((s) => ({ id: s.id, name: `${s.name} (${s.role.replace("_", " ")})` })),
                    ]}
                  />
                </div>
              ) : (
                <div className="mt-3 space-y-2 text-sm">
                  {interviewRows.length === 0 && <p className="text-xs text-muted">No interviews scheduled.</p>}
                  {interviewRows.map((iv) => (
                    <div key={iv.id} className="glass-subtle p-3">
                      <p className="text-cream">
                        {iv.scheduledAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                        <span className="ml-2 text-xs text-muted">
                          {iv.mode === "physical" ? "In person" : "Online"} · {iv.attendance ?? iv.status}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{iv.locationOrLink}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* scorecards */}
          {!anonymised && (
            <div className="glass p-6">
              <h2 className="eyebrow">Panel scorecards</h2>
              <p className="mt-1 text-xs text-muted">
                Independent scoring — assessors cannot see each other&apos;s scores before submitting their own.
              </p>

              {canSeePanelResults && submittedCards.length > 0 && (
                <div className="mt-4 space-y-4">
                  <div className="glass-subtle overflow-x-auto p-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-widest text-muted">
                          <th className="pb-2 pr-3">Competency</th>
                          {submittedCards.map((c) => (
                            <th key={c.id} className="pb-2 pr-3">{c.assessorName.split(" (")[0]}</th>
                          ))}
                          <th className="pb-2">Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPETENCIES.map((comp) => {
                          const flagged = strongDisagreements.some((d) => d.id === comp.id);
                          return (
                            <tr key={comp.id} className="border-t border-white/5">
                              <td className="py-1.5 pr-3 text-cream-dim">
                                {comp.label} <span className="text-muted">({comp.weight}%)</span>
                                {flagged && <span className="ml-1 text-amber-300" title="Assessors strongly disagreed">⚑</span>}
                              </td>
                              {submittedCards.map((c) => (
                                <td key={c.id} className="py-1.5 pr-3 text-cream">{c.scores[comp.id] ?? "—"}</td>
                              ))}
                              <td className="py-1.5 font-semibold text-emerald-glow">{averages[comp.id] ?? "—"}</td>
                            </tr>
                          );
                        })}
                        <tr className="border-t border-white/10">
                          <td className="py-2 pr-3 text-cream">Weighted total</td>
                          {submittedCards.map((c) => (
                            <td key={c.id} className="py-2 pr-3 font-semibold text-cream">{c.weightedTotal ?? "—"}</td>
                          ))}
                          <td className="py-2 font-semibold text-emerald-glow">{avgTotal ?? "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {strongDisagreements.length > 0 && (
                    <p className="text-xs text-amber-300">
                      ⚑ Strong disagreement (2+ point spread) on:{" "}
                      {strongDisagreements
                        .map((d) => `${COMPETENCIES.find((c) => c.id === d.id)?.label} (${d.min}–${d.max})`)
                        .join(", ")}
                    </p>
                  )}
                  <div className="space-y-2">
                    {submittedCards.map((c) => (
                      <details key={c.id} className="glass-subtle p-3 text-xs">
                        <summary className="cursor-pointer text-cream">
                          {c.assessorName} — {c.weightedTotal}/100 ·{" "}
                          {RECOMMENDATIONS.find((r) => r.id === c.recommendation)?.label ?? "no recommendation"}
                          {c.revisions.length > 0 && <span className="ml-2 text-amber-300">edited ×{c.revisions.length}</span>}
                        </summary>
                        <div className="mt-2 space-y-1.5 text-muted">
                          <p><span className="text-cream-dim">Evidence:</span> {c.evidence}</p>
                          {c.strengths && <p><span className="text-cream-dim">Strengths:</span> {c.strengths}</p>}
                          {c.concerns && <p><span className="text-cream-dim">Concerns:</span> {c.concerns}</p>}
                          {c.revisions.map((r, i) => (
                            <p key={i} className="text-amber-300/80">
                              Revision {i + 1} ({new Date(r.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}):
                              previous total {r.weightedTotal ?? "—"} — {r.reason}
                            </p>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
              {!canSeePanelResults && (
                <p className="mt-3 text-xs text-amber-300">
                  Other assessors&apos; scores unlock after you submit your own scorecard.
                </p>
              )}

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="eyebrow mb-3">{ownCard?.submittedAt ? "Your submitted scorecard" : "Your scorecard"}</p>
                <ScorecardForm
                  applicationId={app.id}
                  competencies={COMPETENCIES.map((c) => ({ id: c.id, label: c.label, weight: c.weight }))}
                  recommendations={RECOMMENDATIONS.map((r) => ({ id: r.id, label: r.label }))}
                  existing={
                    ownCard
                      ? {
                          scores: ownCard.scores,
                          evidence: ownCard.evidence,
                          strengths: ownCard.strengths,
                          concerns: ownCard.concerns,
                          recommendation: ownCard.recommendation,
                          submitted: Boolean(ownCard.submittedAt),
                        }
                      : null
                  }
                />
              </div>
            </div>
          )}

          {/* AI assistant */}
          {!anonymised && canManage && (
            <div className="glass p-6">
              <h2 className="eyebrow">AI assistant</h2>
              <p className="mt-1 text-[11px] italic text-amber-300">{AI_LABEL}</p>
              {latestAi && (
                <div className="mt-3 space-y-3 text-sm">
                  <p className="whitespace-pre-wrap text-cream/90">{latestAi.summary}</p>
                  {latestAi.evidence.length > 0 && (
                    <div>
                      <p className="eyebrow mb-1.5">Evidence (linked to the application)</p>
                      <ul className="space-y-1.5 text-xs text-muted">
                        {latestAi.evidence.map((e, i) => (
                          <li key={i}>
                            <span className="text-cream-dim">{e.observation}</span> — from {e.source}:{" "}
                            <span className="italic">&quot;{e.quote}&quot;</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {latestAi.missingInfo.length > 0 && (
                    <div>
                      <p className="eyebrow mb-1.5">Missing information</p>
                      <ul className="list-inside list-disc text-xs text-muted">
                        {latestAi.missingInfo.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {latestAi.followUpQuestions.length > 0 && (
                    <div>
                      <p className="eyebrow mb-1.5">Suggested follow-up questions</p>
                      <ul className="list-inside list-disc text-xs text-muted">
                        {latestAi.followUpQuestions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[10px] text-muted">
                    Generated {latestAi.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} by{" "}
                    {latestAi.createdBy} · model {latestAi.model} · written answers only (video/audio not transcribed)
                  </p>
                </div>
              )}
              <div className="mt-3">
                <AiGenerateButton applicationId={app.id} hasExisting={Boolean(latestAi)} />
              </div>
            </div>
          )}

          {/* audit */}
          <div className="glass p-6">
            <h2 className="eyebrow">Audit trail</h2>
            <div className="mt-3 divide-y divide-white/5 text-xs">
              {audit.map((entry) => (
                <div key={entry.id} className="py-2.5">
                  <p className="text-cream">
                    {entry.fromStatus.replace(/_/g, " ")} → {entry.toStatus.replace(/_/g, " ")}
                    {entry.isOverride && <span className="ml-2 text-amber-300">OVERRIDE</span>}
                    <span className="text-muted">
                      {" "}
                      — {entry.actor} ({entry.actorRole}),{" "}
                      {entry.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </p>
                  {entry.reason && <p className="mt-0.5 text-muted">Reason: {entry.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-6">
          {canManage && moves.length > 0 && (
            <div className="glass p-5">
              <h2 className="eyebrow">Pipeline</h2>
              <div className="mt-3">
                <MoveForm applicationId={app.id} moves={moves} />
              </div>
            </div>
          )}

          {canManage && (
            <div className="glass p-5">
              <h2 className="eyebrow">Retention</h2>
              <p className="mt-2 text-xs text-muted">
                {app.retentionExpiry
                  ? `Scheduled deletion after ${app.retentionExpiry.toLocaleDateString("en-GB")} — then it appears in the owner's deletion-review queue.`
                  : "Retention date is set automatically at an outcome, or set one now."}
              </p>
              <form action={setRetentionDateAction} className="mt-3 flex items-end gap-2">
                <input type="hidden" name="id" value={app.id} />
                <div>
                  <label className="field-label" htmlFor="ret-date">Deletion review date</label>
                  <input
                    id="ret-date"
                    type="date"
                    name="retentionDate"
                    className="field"
                    defaultValue={app.retentionExpiry ? app.retentionExpiry.toISOString().slice(0, 10) : ""}
                  />
                </div>
                <button className="btn btn-ghost btn-sm">Set</button>
              </form>
              {role === "owner" && (
                <form action={setLegalHoldAction} className="mt-3 border-t border-white/10 pt-3">
                  <input type="hidden" name="id" value={app.id} />
                  <label className="flex items-center gap-2 text-xs text-cream-dim">
                    <input type="checkbox" name="hold" defaultChecked={app.legalHold} />
                    Legal hold (suspends deletion)
                  </label>
                  <button className="btn btn-ghost btn-sm mt-2">Update hold</button>
                </form>
              )}
            </div>
          )}

          {canManage && !anonymised && (
            <div className="glass p-5">
              <h2 className="eyebrow">Message the candidate</h2>
              <div className="mt-3">
                <CommForm applicationId={app.id} templates={templates} previews={previews} />
              </div>
            </div>
          )}

          {comms.length > 0 && (
            <div className="glass p-5">
              <h2 className="eyebrow">Message history</h2>
              <div className="mt-3 space-y-2 text-xs">
                {comms.map((c) => (
                  <details key={c.id} className="glass-subtle p-3">
                    <summary className="cursor-pointer text-cream">
                      {c.subject}
                      <span className="ml-2 text-muted">
                        {c.status} · {c.createdAt.toLocaleDateString("en-GB")} · {c.sentBy}
                      </span>
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-muted">{c.body}</pre>
                  </details>
                ))}
              </div>
            </div>
          )}

          <div className="glass p-5">
            <h2 className="eyebrow">Internal notes</h2>
            <p className="mt-1 text-[11px] text-muted">Never visible to the candidate.</p>
            <form action={addNoteAction} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={app.id} />
              <textarea name="note" rows={3} className="field" placeholder="Add a note…" required minLength={2} />
              <button className="btn btn-ghost btn-sm">Add note</button>
            </form>
            <div className="mt-3 space-y-2 text-xs">
              {notes.map((n) => (
                <div key={n.id} className="glass-subtle p-3">
                  <p className="whitespace-pre-wrap text-cream/90">{n.note}</p>
                  <p className="mt-1 text-muted">
                    {n.author} — {n.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
