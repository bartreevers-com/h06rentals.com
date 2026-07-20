import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import {
  aiAnalyses,
  applications,
  candidates,
  scorecards as scorecardsTable,
  screenings as screeningsTable,
} from "@/lib/db/schema";
import { applicationFilesFor, getVacancy, isRecruitRole } from "@/lib/recruitment/repo";
import { AI_LABEL } from "@/lib/recruitment/ai";
import { COMPETENCIES, RECOMMENDATIONS, competencyAverages } from "@/lib/recruitment/scoring";
import { OwnerDecision } from "../FinalistForms";

export const dynamic = "force-dynamic";

/** Side-by-side comparison of the finalists, and the Owner's decision.
 *  The panel's scores are shown, never assumed to be the answer. */
export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isRecruitRole(session.role) || !["owner", "hr"].includes(session.role)) redirect("/admin");
  const { id } = await params;
  const vacancy = await getVacancy(Number(id));
  if (!vacancy) notFound();

  const db = await getDb();
  const finalists = await db
    .select({ app: applications, cand: candidates })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .where(and(eq(applications.vacancyId, vacancy.id), inArray(applications.status, ["finalist", "conditional_offer", "hired", "reserve"])));

  const cards = await Promise.all(
    finalists.map(async ({ app, cand }) => {
      const submitted = (app.submitted ?? {}) as { form?: Record<string, unknown>; firstName?: string; lastName?: string };
      const form = submitted.form ?? {};
      const scRows = await db
        .select()
        .from(scorecardsTable)
        .where(eq(scorecardsTable.applicationId, app.id));
      const submittedCards = scRows.filter((c) => c.submittedAt);
      const avg =
        submittedCards.length > 0
          ? Math.round(submittedCards.reduce((s, c) => s + (c.weightedTotal ?? 0), 0) / submittedCards.length)
          : null;
      const screening = (
        await db
          .select()
          .from(screeningsTable)
          .where(eq(screeningsTable.applicationId, app.id))
          .orderBy(desc(screeningsTable.reviewedAt))
          .limit(1)
      )[0];
      const ai = (
        await db.select().from(aiAnalyses).where(eq(aiAnalyses.applicationId, app.id)).orderBy(desc(aiAnalyses.createdAt)).limit(1)
      )[0];
      const files = await applicationFilesFor(app.id);
      return {
        app,
        cand,
        form,
        name:
          `${submitted.firstName ?? cand.firstName ?? ""} ${submitted.lastName ?? cand.lastName ?? ""}`.trim() ||
          cand.email,
        avg,
        perCompetency: competencyAverages(submittedCards.map((c) => c.scores)),
        strengths: submittedCards.map((c) => c.strengths).filter(Boolean),
        concerns: submittedCards.map((c) => c.concerns).filter(Boolean),
        recommendations: submittedCards
          .map((c) => RECOMMENDATIONS.find((r) => r.id === c.recommendation)?.label)
          .filter(Boolean) as string[],
        screening,
        ai,
        files,
      };
    }),
  );
  cards.sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  const pending = cards.filter((c) => c.app.status === "finalist");
  const panelTopId = pending.length > 0 && pending[0].avg !== null ? pending[0].app.id : null;

  return (
    <div>
      <Link
        href={`/admin/recruitment/${vacancy.id}`}
        className="text-xs uppercase tracking-widest text-muted hover:text-cream"
      >
        ← {vacancy.title}
      </Link>
      <h1 className="display mt-4 text-2xl text-cream">Finalists — {vacancy.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {pending.length} awaiting the Owner&apos;s decision. The panel&apos;s scores inform the decision — they don&apos;t make it.
      </p>

      {cards.length === 0 ? (
        <div className="glass mt-6 p-8 text-sm text-muted">No finalists yet — select them from the vacancy page.</div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.app.id} className="glass flex flex-col p-5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-cream">{c.name}</h2>
                  <p className="text-[10px] uppercase tracking-widest text-muted">{c.app.ref}</p>
                </div>
                <span className="rounded-full border border-emerald-glow/50 px-2.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-emerald-glow">
                  {c.app.status.replace(/_/g, " ")}
                </span>
              </div>

              <p className="mt-3 text-2xl font-semibold text-emerald-glow">
                {c.avg ?? "—"}<span className="text-xs text-muted">/100 panel avg</span>
              </p>

              <dl className="mt-3 space-y-1 text-xs">
                {COMPETENCIES.map((comp) => (
                  <div key={comp.id} className="flex justify-between">
                    <dt className="text-muted">{comp.label}</dt>
                    <dd className="text-cream">{c.perCompetency[comp.id] ?? "—"}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs">
                <p>
                  <span className="text-muted">Screening:</span>{" "}
                  <span className={c.screening?.result === "eligible" ? "text-emerald-glow" : "text-amber-300"}>
                    {c.screening ? c.screening.result.replace("_", " ") : "not screened"}
                  </span>
                </p>
                <p><span className="text-muted">Panel says:</span> {c.recommendations.join(", ") || "—"}</p>
                <p><span className="text-muted">Availability:</span> {String(c.form.availability ?? "—")}</p>
                <p><span className="text-muted">Expected compensation:</span> {String(c.form.expectedCompensation ?? "—")}</p>
                <p>
                  <span className="text-muted">Conflicts:</span>{" "}
                  {c.form.conflictOfInterest === "yes" || c.form.brandConflict === "yes"
                    ? [String(c.form.conflictDetails ?? ""), String(c.form.brandConflictDetails ?? "")].filter(Boolean).join(" · ") || "declared — see application"
                    : "none declared"}
                </p>
              </div>

              {c.strengths.length > 0 && (
                <div className="mt-2 text-xs">
                  <p className="text-emerald-glow">Strengths</p>
                  <ul className="mt-0.5 list-inside list-disc text-muted">
                    {c.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {c.concerns.length > 0 && (
                <div className="mt-2 text-xs">
                  <p className="text-amber-300">Concerns</p>
                  <ul className="mt-0.5 list-inside list-disc text-muted">
                    {c.concerns.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {c.ai && (
                <details className="mt-3 border-t border-white/10 pt-3 text-xs">
                  <summary className="cursor-pointer text-cream-dim">AI-assisted summary</summary>
                  <p className="mt-1 text-[10px] italic text-amber-300">{AI_LABEL}</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-muted">{c.ai.summary}</p>
                </details>
              )}

              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                {c.files.map((f) => (
                  <a
                    key={f.id}
                    href={`/api/admin/recruitment/file/${f.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-subtle rounded-full px-3 py-1 text-[10px] uppercase tracking-widest text-muted hover:text-cream"
                  >
                    {f.kind}
                  </a>
                ))}
                <Link
                  href={`/admin/recruitment/app/${c.app.id}`}
                  className="glass-subtle rounded-full px-3 py-1 text-[10px] uppercase tracking-widest text-emerald-glow"
                >
                  Full record →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {session.role === "owner" && pending.length > 0 && (
        <div className="glass mt-8 max-w-xl p-6">
          <h2 className="eyebrow">Owner decision</h2>
          <div className="mt-3">
            <OwnerDecision
              vacancyId={vacancy.id}
              finalists={pending.map((c) => ({ id: c.app.id, name: c.name, ref: c.app.ref }))}
              panelTopId={panelTopId}
            />
          </div>
        </div>
      )}
      {session.role !== "owner" && pending.length > 0 && (
        <p className="mt-8 text-xs text-muted">Awaiting the Owner&apos;s decision — only the Owner can decide.</p>
      )}
    </div>
  );
}
