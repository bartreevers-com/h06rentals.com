import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import {
  applicationAmendments,
  applicationAudit,
  applicationNotes,
  candidateComms,
  candidates,
} from "@/lib/db/schema";
import {
  applicationFilesFor,
  getApplication,
  getVacancy,
  isRecruitRole,
  staffCanSeeVacancy,
} from "@/lib/recruitment/repo";
import {
  APPLICATION_STATUSES,
  applicationTransition,
  type ApplicationStatus,
  type StaffRecruitRole,
} from "@/lib/recruitment/workflow";
import { COMM_TEMPLATES, previewComm, type CommTemplate } from "@/lib/recruitment/comms";
import { addNoteAction, setLegalHoldAction } from "../../actions";
import { CommForm, MoveForm } from "./PipelineForms";

export const dynamic = "force-dynamic";

const STANDARD_FIELDS: [string, string][] = [
  ["location", "Based in"],
  ["contactPreference", "Contact preference"],
  ["portfolio", "Portfolio / links"],
  ["employmentStatus", "Employment status"],
  ["noticePeriod", "Notice period"],
  ["rightToWork", "Right to work in Nigeria"],
  ["locationWilling", "Able to work from Lekki base"],
  ["conflictOfInterest", "Conflict of interest"],
  ["conflictDetails", "Conflict details"],
  ["brandConflict", "Existing brand commitments"],
  ["brandConflictDetails", "Brand commitment details"],
];

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
  const db = await getDb();
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
  const comms = await db
    .select()
    .from(candidateComms)
    .where(eq(candidateComms.applicationId, app.id))
    .orderBy(desc(candidateComms.createdAt));
  const audit = await db
    .select()
    .from(applicationAudit)
    .where(eq(applicationAudit.applicationId, app.id))
    .orderBy(desc(applicationAudit.createdAt));

  const submitted = (app.submitted ?? {}) as {
    form?: Record<string, unknown>;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
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
          {app.eligibilityResult && (
            <p className={`mt-2 text-xs ${app.eligibilityResult === "fail" ? "text-amber-300" : "text-emerald-glow"}`}>
              Eligibility screen: {app.eligibilityResult}
            </p>
          )}
          {app.talentPoolConsent && <p className="mt-1 text-xs text-muted">Talent-pool consent: yes</p>}
          {app.legalHold && <p className="mt-1 text-xs text-amber-300">⚖ Legal hold</p>}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* submission */}
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
                      Amendment {i + 1} — {am.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
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

        {/* sidebar: pipeline, comms, notes */}
        <div className="space-y-6">
          {canManage && moves.length > 0 && (
            <div className="glass p-5">
              <h2 className="eyebrow">Pipeline</h2>
              <div className="mt-3">
                <MoveForm applicationId={app.id} moves={moves} />
              </div>
            </div>
          )}

          {role === "owner" && (
            <div className="glass p-5">
              <h2 className="eyebrow">Retention</h2>
              <p className="mt-2 text-xs text-muted">
                {app.retentionExpiry
                  ? `Scheduled deletion after ${app.retentionExpiry.toLocaleDateString("en-GB")}`
                  : "Retention date set when the application reaches an outcome."}
              </p>
              <form action={setLegalHoldAction} className="mt-3">
                <input type="hidden" name="id" value={app.id} />
                <label className="flex items-center gap-2 text-xs text-cream-dim">
                  <input type="checkbox" name="hold" defaultChecked={app.legalHold} />
                  Legal hold (suspends deletion)
                </label>
                <button className="btn btn-sm mt-2">Update hold</button>
              </form>
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
              <button className="btn btn-sm">Add note</button>
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
