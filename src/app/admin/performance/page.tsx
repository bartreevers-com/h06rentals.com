import Link from "next/link";
import { redirect } from "next/navigation";
import { hasRole } from "@/lib/admin-auth";
import { KPI_TEMPLATES } from "@/lib/kpi-templates";
import {
  addDays,
  computeAwards,
  loadStaffWeeks,
  mondayOf,
  weekDays,
  type StaffWeek,
} from "@/lib/performance";
import {
  applyKpiTemplateAction,
  createKpiAction,
  deleteKpiAction,
  recordScoresAction,
  toggleKpiAction,
} from "../actions";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtWeek(weekStart: string): string {
  const end = addDays(weekStart, 5);
  return `${weekStart} → ${end}`;
}

function Bar({ pct, tone }: { pct: number | null; tone: "emerald" | "muted" }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/70">
      {pct !== null && (
        <div
          className={`h-full rounded-full ${tone === "emerald" ? "bg-gradient-to-r from-emerald-deep to-emerald-glow" : "bg-cream/25"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      )}
    </div>
  );
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; period?: string }>;
}) {
  const session = await hasRole("owner", "hr");
  if (!session) redirect("/admin");
  const isOwner = session.role === "owner";

  const params = await searchParams;
  const thisWeek = mondayOf(new Date());
  const week = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "") ? mondayOf(new Date(`${params.week}T00:00:00Z`)) : thisWeek;
  const prevWeek = addDays(week, -7);
  const nextWeek = addDays(week, 7);
  const days = weekDays(week);

  const [staffWeeks, prevWeeks] = await Promise.all([loadStaffWeeks(week), loadStaffWeeks(prevWeek)]);
  const prevBy = new Map(prevWeeks.map((s) => [s.staffId, s.scorePct]));

  // awards periods anchored on the selected week's Monday
  const monday = new Date(`${week}T00:00:00Z`);
  const y = monday.getUTCFullYear();
  const m = monday.getUTCMonth();
  const monthStart = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const monthEnd = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  const qStartMonth = Math.floor(m / 3) * 3;
  const quarterStart = new Date(Date.UTC(y, qStartMonth, 1)).toISOString().slice(0, 10);
  const quarterEnd = new Date(Date.UTC(y, qStartMonth + 3, 0)).toISOString().slice(0, 10);
  const yearStart = `${y}-01-01`;
  const yearEnd = `${y}-12-31`;

  const [monthAwards, quarterAwards, yearAwards] = await Promise.all([
    computeAwards(monthStart, monthEnd),
    computeAwards(quarterStart, quarterEnd),
    computeAwards(yearStart, yearEnd),
  ]);

  const monthName = monday.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  const ranked = [...staffWeeks].sort((a, b) => (b.scorePct ?? -1) - (a.scorePct ?? -1));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-2xl text-cream">Performance</h1>
          <p className="mt-1 text-sm text-muted">
            Owner &amp; HR only. HR sets the KPIs, records the numbers weekly, and the platform
            does the arithmetic.
          </p>
        </div>
        <a href="/admin/export/performance" className="btn btn-ghost btn-sm" download>
          Download performance CSV
        </a>
      </div>

      {/* ── week picker ─────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href={`/admin/performance?week=${prevWeek}`} className="btn btn-ghost btn-sm">← Previous</Link>
        <span className="glass-subtle px-4 py-2 text-sm text-cream">
          Week {fmtWeek(week)} {week === thisWeek && <span className="text-emerald-glow">· current</span>}
        </span>
        {week < thisWeek && (
          <Link href={`/admin/performance?week=${nextWeek}`} className="btn btn-ghost btn-sm">Next →</Link>
        )}
        {week !== thisWeek && (
          <Link href="/admin/performance" className="btn btn-ghost btn-sm">This week</Link>
        )}
      </div>

      {/* ── the weekly picture ──────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="eyebrow mb-4">The week at a glance</h2>
        {ranked.length === 0 ? (
          <div className="glass-subtle p-8 text-center text-sm text-muted">
            No tracked staff yet. Add your team in the Team tab (role “Staff” works for people
            who never sign in), then set their KPIs below.
          </div>
        ) : (
          <div className="glass-subtle divide-y divide-cream/5 p-2">
            {ranked.map((s) => {
              const prev = prevBy.get(s.staffId) ?? null;
              const delta = s.scorePct !== null && prev !== null ? s.scorePct - prev : null;
              return (
                <div key={s.staffId} className="flex flex-wrap items-center gap-4 p-3">
                  <span className="w-40 shrink-0 truncate text-sm text-cream">{s.name}</span>
                  <span className="w-16 shrink-0 text-[0.65rem] uppercase tracking-wider text-muted">{s.role}</span>
                  <div className="min-w-40 flex-1">
                    <Bar pct={s.scorePct} tone={s.eligible ? "emerald" : "muted"} />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-sm text-cream">
                    {s.scorePct === null ? "—" : `${s.scorePct}%`}
                  </span>
                  <span className={`w-16 shrink-0 text-right text-xs ${delta === null ? "text-muted" : delta >= 0 ? "text-emerald-glow" : "text-red-300"}`}>
                    {delta === null ? "" : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}`}
                  </span>
                  <span className={`w-24 shrink-0 text-right text-xs ${s.eligible ? "text-muted" : "text-champagne"}`}>
                    {s.coveragePct}% scored
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Score = weighted average of each KPI&apos;s completion (capped at 100% per KPI), Monday to
          Saturday. Weeks with less than 60% of KPIs scored are excluded from awards, so missing
          data never helps or hurts anyone.
        </p>
      </section>

      {/* ── score entry + KPI management ────────────────────────── */}
      <section className="mt-10">
        <h2 className="eyebrow mb-4">Record the week</h2>
        <div className="space-y-4">
          {staffWeeks.map((s: StaffWeek) => (
            <details key={s.staffId} className="glass-subtle overflow-hidden">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-medium text-cream">{s.name}</span>
                <span className="text-[0.65rem] uppercase tracking-wider text-muted">{s.role}</span>
                <span className="ml-auto text-xs text-muted">
                  {s.rows.length} KPI{s.rows.length === 1 ? "" : "s"} ·{" "}
                  {s.scorePct === null ? "not scored" : `${s.scorePct}%`}
                </span>
              </summary>
              <div className="border-t hairline p-4">
                {s.rows.length === 0 && (
                  <p className="mb-4 text-sm text-muted">No KPIs yet — apply a template or add one below.</p>
                )}
                {s.rows.map(({ kpi, scores }) => (
                  <form
                    key={kpi.id}
                    action={recordScoresAction}
                    className="mb-3 rounded-lg border border-cream/10 bg-ink/40 p-3"
                  >
                    <input type="hidden" name="kpiId" value={kpi.id} />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm ${kpi.isActive ? "text-cream" : "text-muted line-through"}`}>
                        {kpi.title}
                      </span>
                      <span className="text-[0.65rem] uppercase tracking-wider text-muted">
                        {kpi.cadence} · target {kpi.target} · weight {kpi.weight}
                      </span>
                      <span className="ml-auto flex gap-2">
                        <button formAction={toggleKpiAction} name="id" value={kpi.id} className="text-xs text-muted hover:text-cream-dim">
                          {kpi.isActive ? "Archive" : "Restore"}
                        </button>
                        {isOwner && (
                          <button formAction={deleteKpiAction} name="id" value={kpi.id} className="text-xs text-red-300/70 hover:text-red-300">
                            Delete
                          </button>
                        )}
                      </span>
                    </div>
                    {kpi.isActive && (
                      <div className="mt-3 flex flex-wrap items-end gap-2">
                        {kpi.cadence === "daily" ? (
                          days.map((d, i) => (
                            <label key={d} className="flex flex-col items-center gap-1 text-[0.65rem] text-muted">
                              {DAY_LABELS[i]}
                              <input
                                name={`achieved:${d}`}
                                type="number"
                                min={0}
                                defaultValue={scores[d]?.achieved ?? ""}
                                placeholder="–"
                                className="field !w-14 !px-2 !py-1.5 text-center text-sm"
                              />
                            </label>
                          ))
                        ) : (
                          <label className="flex flex-col gap-1 text-[0.65rem] text-muted">
                            This week
                            <input
                              name={`achieved:${week}`}
                              type="number"
                              min={0}
                              defaultValue={scores[week]?.achieved ?? ""}
                              placeholder="–"
                              className="field !w-20 !px-2 !py-1.5 text-center text-sm"
                            />
                          </label>
                        )}
                        <input name="note" placeholder="Note (optional)" className="field !w-44 !py-1.5 text-xs" />
                        <button className="btn btn-primary btn-sm">Save</button>
                      </div>
                    )}
                  </form>
                ))}

                <div className="mt-4 grid gap-3 border-t hairline pt-4 lg:grid-cols-2">
                  <form action={applyKpiTemplateAction} className="flex items-end gap-2">
                    <input type="hidden" name="staffId" value={s.staffId} />
                    <label className="flex-1 text-[0.65rem] uppercase tracking-wider text-muted">
                      Apply a job-description template
                      <select name="template" className="field mt-1 !py-2 text-sm">
                        {Object.entries(KPI_TEMPLATES).map(([key, t]) => (
                          <option key={key} value={key}>{t.label}</option>
                        ))}
                      </select>
                    </label>
                    <button className="btn btn-ghost btn-sm">Apply</button>
                  </form>
                  <form action={createKpiAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="staffId" value={s.staffId} />
                    <label className="min-w-40 flex-1 text-[0.65rem] uppercase tracking-wider text-muted">
                      Custom KPI
                      <input name="title" placeholder="e.g. Client follow-up calls" className="field mt-1 !py-2 text-sm" />
                    </label>
                    <select name="cadence" className="field !w-24 !py-2 text-sm" defaultValue="weekly">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                    <input name="target" type="number" min={1} defaultValue={1} title="Target" className="field !w-16 !py-2 text-center text-sm" />
                    <input name="weight" type="number" min={1} max={5} defaultValue={3} title="Weight 1-5" className="field !w-14 !py-2 text-center text-sm" />
                    <button className="btn btn-ghost btn-sm">Add</button>
                  </form>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── awards ──────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="eyebrow mb-4">Recognition — factual and fair</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { label: `Staff of the Month — ${monthName}`, rows: monthAwards },
            { label: `Staff of the Quarter — Q${Math.floor(monday.getUTCMonth() / 3) + 1} ${y}`, rows: quarterAwards },
            { label: `Staff of the Year — ${y}`, rows: yearAwards },
          ].map(({ label, rows }) => {
            const qualifying = rows.filter((r) => r.qualifies);
            return (
              <div key={label} className="glass-subtle p-5">
                <h3 className="text-sm font-medium text-cream">{label}</h3>
                {qualifying.length === 0 ? (
                  <p className="mt-3 text-xs text-muted">
                    No one qualifies yet — a result needs scored weeks covering at least 60% of the period.
                  </p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {qualifying.slice(0, 3).map((r, i) => (
                      <li key={r.staffId} className="flex items-center gap-3 text-sm">
                        <span className={i === 0 ? "text-champagne" : "text-muted"}>
                          {i === 0 ? "★" : `${i + 1}.`}
                        </span>
                        <span className={i === 0 ? "text-cream" : "text-cream-dim"}>{r.name}</span>
                        <span className="ml-auto font-mono text-xs text-cream-dim">{r.avgPct}%</span>
                        <span className="text-[0.65rem] text-muted">
                          {r.weeksEligible}/{r.weeksInPeriod} wks
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Awards average the eligible weekly scores across the period. Ties break on scoring
          coverage. Everything is computed from the recorded numbers — nothing is hand-picked.
        </p>
      </section>
    </div>
  );
}
