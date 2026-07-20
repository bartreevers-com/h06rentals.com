import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { staffUsers, vacancyAudit } from "@/lib/db/schema";
import {
  getVacancy,
  isRecruitRole,
  staffCanSeeVacancy,
  vacancyApplications,
  vacancyHasApplicationsOpen,
} from "@/lib/recruitment/repo";
import {
  VACANCY_STATUSES,
  vacancyTransition,
  type StaffRecruitRole,
  type VacancyStatus,
} from "@/lib/recruitment/workflow";
import { scorecards as scorecardsTable } from "@/lib/db/schema";
import { duplicateVacancyAction, updateVacancyAction, vacancyStatusAction } from "../actions";
import { VacancyForm } from "../VacancyForm";
import { FinalistSelect } from "./FinalistForms";

export const dynamic = "force-dynamic";

const TRANSITION_LABELS: Record<string, string> = {
  internal_review: "Submit for review",
  approved: "Approve (Owner)",
  published: "Publish",
  paused: "Pause",
  closed: "Close",
  archived: "Archive",
  draft: "Return to draft",
};

export default async function VacancyAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isRecruitRole(session.role)) redirect("/admin");
  const { id } = await params;
  const vacancy = await getVacancy(Number(id));
  if (!vacancy) notFound();
  if (!staffCanSeeVacancy(session.role, session.userId, vacancy)) redirect("/admin/recruitment");

  const role = session.role as StaffRecruitRole;
  const canManage = ["owner", "hr"].includes(role);
  const apps = await vacancyApplications(vacancy.id);
  const db = await getDb();
  const audit = await db
    .select()
    .from(vacancyAudit)
    .where(eq(vacancyAudit.vacancyId, vacancy.id))
    .orderBy(desc(vacancyAudit.createdAt));
  const panelOptions = canManage
    ? await db
        .select({ id: staffUsers.id, name: staffUsers.name, role: staffUsers.role })
        .from(staffUsers)
        .where(inArray(staffUsers.role, ["hiring_manager", "assessor", "hr"]))
    : [];

  const moves = canManage
    ? VACANCY_STATUSES.map((to) => ({ to, check: vacancyTransition(vacancy.status as VacancyStatus, to, role) }))
        .filter((m): m is { to: VacancyStatus; check: { ok: true; requiresReason: boolean } } => m.check.ok)
    : [];

  // finalist selection: candidates far enough along, with their panel averages
  const finalistPool = apps.filter(({ application: a }) =>
    ["interview", "final_assessment"].includes(a.status),
  );
  const finalistCount = apps.filter(({ application: a }) =>
    ["finalist", "conditional_offer", "hired", "reserve"].includes(a.status),
  ).length;
  const poolCards =
    finalistPool.length > 0
      ? await db
          .select()
          .from(scorecardsTable)
          .where(inArray(scorecardsTable.applicationId, finalistPool.map(({ application: a }) => a.id)))
      : [];
  const avgFor = (appId: number) => {
    const cards = poolCards.filter((c) => c.applicationId === appId && c.submittedAt);
    if (cards.length === 0) return null;
    return Math.round(cards.reduce((s, c) => s + (c.weightedTotal ?? 0), 0) / cards.length);
  };

  return (
    <div>
      <Link href="/admin/recruitment" className="text-xs uppercase tracking-widest text-muted hover:text-cream">
        ← Recruitment
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted">
            {vacancy.reference} · {vacancy.department} · status:{" "}
            <span className="text-emerald-glow">{vacancy.status.replace("_", " ")}</span>
            {vacancy.approvedBy && ` · approved by ${vacancy.approvedBy}`}
          </p>
          <h1 className="display mt-1 text-2xl text-cream">{vacancy.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/careers/${vacancy.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            {["published", "paused", "closed"].includes(vacancy.status) ? "Public page ↗" : "Preview ↗"}
          </a>
          {canManage && (
            <form action={duplicateVacancyAction}>
              <input type="hidden" name="id" value={vacancy.id} />
              <button className="btn btn-ghost btn-sm">Duplicate</button>
            </form>
          )}
        </div>
      </div>

      {/* workflow */}
      {moves.length > 0 && (
        <div className="glass-subtle mt-6 p-5">
          <h2 className="eyebrow">Workflow</h2>
          <div className="mt-3 flex flex-wrap gap-4">
            {moves.map(({ to, check }) => (
              <form key={to} action={vacancyStatusAction} className="flex items-end gap-2">
                <input type="hidden" name="id" value={vacancy.id} />
                <input type="hidden" name="to" value={to} />
                {check.requiresReason && (
                  <input
                    name="reason"
                    className="field w-56"
                    placeholder="Reason (required, audited)"
                    required
                    minLength={5}
                  />
                )}
                <button className="btn btn-sm btn-primary">{TRANSITION_LABELS[to] ?? to}</button>
              </form>
            ))}
          </div>
          {vacancy.status === "internal_review" && role !== "owner" && (
            <p className="mt-3 text-xs text-muted">Awaiting Owner approval — only the Owner can approve publication.</p>
          )}
        </div>
      )}

      {/* applications */}
      <div className="mt-8">
        <h2 className="eyebrow">Applications ({apps.length})</h2>
        <div className="mt-3 space-y-2">
          {apps.length === 0 && <p className="glass p-5 text-sm text-muted">No submitted applications yet.</p>}
          {apps.map(({ application: a, candidate: c }) => (
            <Link
              key={a.id}
              href={`/admin/recruitment/app/${a.id}`}
              className="glass flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-emerald-glow/40"
            >
              <div>
                <p className="text-sm font-semibold text-cream">
                  {a.anonymisedAt ? "Anonymised candidate" : `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email}
                  <span className="ml-2 text-[11px] font-normal uppercase tracking-widest text-muted">{a.ref}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {a.submittedAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {a.eligibilityResult && (
                    <span className={a.eligibilityResult === "fail" ? "text-amber-300" : "text-emerald-glow"}>
                      {" "}· eligibility: {a.eligibilityResult}
                    </span>
                  )}
                </p>
              </div>
              <span className="rounded-full border border-cream/25 px-3 py-1 text-[0.65rem] uppercase tracking-wider text-cream-dim">
                {a.status.replace("_", " ")}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* finalists */}
      {canManage && (finalistPool.length > 0 || finalistCount > 0) && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="eyebrow">Finalists</h2>
            {finalistCount > 0 && (
              <Link href={`/admin/recruitment/${vacancy.id}/compare`} className="btn btn-primary btn-sm">
                Compare finalists ({finalistCount}) →
              </Link>
            )}
          </div>
          {finalistPool.length > 0 && (
            <div className="glass mt-3 p-5">
              <p className="mb-3 text-xs text-muted">
                Select up to three from interview / final assessment to send to the Owner.
              </p>
              <FinalistSelect
                vacancyId={vacancy.id}
                candidates={finalistPool.map(({ application: a, candidate: c }) => ({
                  id: a.id,
                  name: a.anonymisedAt
                    ? "Anonymised"
                    : `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email,
                  ref: a.ref,
                  status: a.status,
                  avgScore: avgFor(a.id),
                }))}
              />
            </div>
          )}
        </div>
      )}

      {/* edit */}
      {canManage && (
        <div className="mt-10">
          <h2 className="eyebrow">Edit vacancy</h2>
          <div className="glass mt-3 p-6">
            <VacancyForm
              action={updateVacancyAction}
              vacancy={vacancy}
              panelOptions={panelOptions}
              guardedLocked={vacancyHasApplicationsOpen(vacancy)}
              isOwner={role === "owner"}
            />
          </div>
        </div>
      )}

      {/* audit */}
      <div className="mt-10">
        <h2 className="eyebrow">Audit trail</h2>
        <div className="glass mt-3 divide-y divide-white/5 p-2 text-xs">
          {audit.length === 0 && <p className="p-3 text-muted">No entries.</p>}
          {audit.map((entry) => (
            <div key={entry.id} className="p-3">
              <p className="text-cream">
                {entry.action}
                <span className="text-muted">
                  {" "}
                  — {entry.actor} ({entry.actorRole}),{" "}
                  {entry.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </p>
              {entry.reason && <p className="mt-1 text-muted">Reason: {entry.reason}</p>}
              {entry.previousConfig != null && (
                <details className="mt-1 text-muted">
                  <summary className="cursor-pointer">Previous configuration (preserved)</summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2">
                    {JSON.stringify(entry.previousConfig, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
