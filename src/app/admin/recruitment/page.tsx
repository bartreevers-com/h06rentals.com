import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { getSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { applications, vacancies } from "@/lib/db/schema";
import { isRecruitRole, staffCanSeeVacancy } from "@/lib/recruitment/repo";
import { anonymiseApplicationAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  draft: "border-cream/25 text-cream-dim",
  internal_review: "border-amber-400/40 text-amber-300",
  approved: "border-emerald-glow/40 text-emerald-glow",
  published: "border-emerald-glow/60 text-emerald-glow",
  paused: "border-amber-400/40 text-amber-300",
  closed: "border-cream/25 text-cream-dim",
  archived: "border-cream/15 text-muted",
};

export default async function RecruitmentPage() {
  const session = await getSession();
  if (!session || !isRecruitRole(session.role)) redirect("/admin");
  const role = session.role;

  const db = await getDb();
  const allVacancies = await db.select().from(vacancies).orderBy(sql`${vacancies.createdAt} desc`);
  const visible = allVacancies.filter((v) => staffCanSeeVacancy(role, session.userId, v));

  const counts = await db
    .select({ vacancyId: applications.vacancyId, count: sql<number>`count(*)` })
    .from(applications)
    .where(sql`${applications.status} != 'draft'`)
    .groupBy(applications.vacancyId);
  const countFor = (id: number) => Number(counts.find((c) => c.vacancyId === id)?.count ?? 0);

  const canManage = ["owner", "hr"].includes(session.role);

  // retention review queue — owner only
  const expired =
    session.role === "owner"
      ? await db
          .select()
          .from(applications)
          .where(
            and(
              lt(applications.retentionExpiry, new Date()),
              isNull(applications.anonymisedAt),
              eq(applications.legalHold, false),
              eq(applications.talentPoolConsent, false),
            ),
          )
      : [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-2xl text-cream">Recruitment</h1>
          <p className="mt-1 text-sm text-muted">
            {canManage
              ? "Vacancies, candidates, and the audited pipeline from draft to hire."
              : "Vacancies you're panelled on."}
          </p>
        </div>
        {canManage && (
          <Link href="/admin/recruitment/new" className="btn btn-primary">
            New vacancy
          </Link>
        )}
      </div>

      {session.role === "owner" && expired.length > 0 && (
        <div className="glass-subtle mt-6 border-amber-400/30 p-5">
          <h2 className="eyebrow text-amber-300">Retention review — {expired.length} past retention date</h2>
          <p className="mt-1 text-xs text-muted">
            These applications have passed their retention date. Anonymising destroys files and
            personal data but keeps the anonymous stage history. Nothing is deleted automatically.
          </p>
          <div className="mt-3 space-y-2">
            {expired.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <Link href={`/admin/recruitment/app/${a.id}`} className="text-cream hover:text-emerald-glow">
                  {a.ref} — {a.status} — expired{" "}
                  {a.retentionExpiry?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </Link>
                <form action={anonymiseApplicationAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="btn btn-sm">Anonymise now</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {visible.length === 0 && (
          <div className="glass p-8 text-sm text-muted">
            {canManage ? "No vacancies yet — create the first one." : "You're not panelled on any vacancies yet."}
          </div>
        )}
        {visible.map((v) => (
          <Link
            key={v.id}
            href={`/admin/recruitment/${v.id}`}
            className="glass flex flex-wrap items-center justify-between gap-4 p-5 transition hover:border-emerald-glow/40"
          >
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted">
                {v.reference} · {v.department}
              </p>
              <h2 className="mt-1 text-base font-semibold text-cream">{v.title}</h2>
              <p className="mt-0.5 text-xs text-muted">
                {countFor(v.id)} application{countFor(v.id) === 1 ? "" : "s"}
                {v.closesAt &&
                  ` · closes ${v.closesAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-wider ${STATUS_TONE[v.status] ?? "border-cream/25 text-cream-dim"}`}
            >
              {v.status.replace("_", " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
