import "server-only";
import { inArray } from "drizzle-orm";
import { getDb } from "./db";
import { kpis, kpiScores, staffUsers, type Kpi, type KpiScore } from "./db/schema";

/**
 * Scoring, stated plainly (the same text appears in the dashboard):
 *
 * - Each KPI's period ratio = min(1, achieved / target). Capped at 100%
 *   so volume on one duty can't buy back a missed one.
 * - Daily KPIs count Monday-Saturday (6 working days); weekly KPIs once.
 * - Weekly score = sum(weight × ratio) / sum(weight), as a percentage.
 * - Coverage = share of KPI periods HR actually scored. Weeks under 60%
 *   coverage are excluded from award averages — missing data neither
 *   helps nor hurts anyone.
 * - Awards = average of eligible weekly scores in the period; at least
 *   60% of the period's weeks must be eligible. Ties break on coverage.
 */

export const WORKING_DAYS = 6; // Mon-Sat

export function mondayOf(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: WORKING_DAYS }, (_, i) => addDays(weekStart, i));
}

export interface KpiWeekRow {
  kpi: Kpi;
  /** daily: one entry per working day; weekly: single entry at weekStart */
  scores: Record<string, KpiScore | undefined>;
  ratio: number | null; // null = nothing scored this week
}

export interface StaffWeek {
  staffId: number;
  name: string;
  role: string;
  rows: KpiWeekRow[];
  scorePct: number | null; // weighted; null when nothing scored
  coveragePct: number; // 0-100
  eligible: boolean;
}

export async function loadStaffWeeks(weekStart: string): Promise<StaffWeek[]> {
  const db = await getDb();
  const people = await db.select().from(staffUsers);
  const tracked = people.filter((p) => p.isActive && p.role !== "owner");
  if (tracked.length === 0) return [];

  const allKpis = await db
    .select()
    .from(kpis)
    .where(inArray(kpis.staffId, tracked.map((p) => p.id)));
  const active = allKpis.filter((k) => k.isActive);
  const days = weekDays(weekStart);
  const periodDates = [...days, weekStart];
  const allScores = active.length
    ? await db
        .select()
        .from(kpiScores)
        .where(inArray(kpiScores.kpiId, active.map((k) => k.id)))
    : [];
  const scoreMap = new Map<string, KpiScore>();
  for (const s of allScores) {
    if (periodDates.includes(s.periodDate)) scoreMap.set(`${s.kpiId}:${s.periodDate}`, s);
  }

  return tracked
    .map((person) => {
      const mine = active.filter((k) => k.staffId === person.id);
      const rows: KpiWeekRow[] = mine.map((kpi) => {
        if (kpi.cadence === "daily") {
          const scores: Record<string, KpiScore | undefined> = {};
          let scored = 0;
          let sum = 0;
          for (const day of days) {
            const s = scoreMap.get(`${kpi.id}:${day}`);
            scores[day] = s;
            if (s) {
              scored++;
              sum += Math.min(1, s.achieved / Math.max(1, kpi.target));
            }
          }
          return { kpi, scores, ratio: scored === 0 ? null : sum / WORKING_DAYS };
        }
        const s = scoreMap.get(`${kpi.id}:${weekStart}`);
        return {
          kpi,
          scores: { [weekStart]: s },
          ratio: s ? Math.min(1, s.achieved / Math.max(1, kpi.target)) : null,
        };
      });

      const expectedPeriods = rows.reduce(
        (n, r) => n + (r.kpi.cadence === "daily" ? WORKING_DAYS : 1),
        0,
      );
      const scoredPeriods = rows.reduce(
        (n, r) => n + Object.values(r.scores).filter(Boolean).length,
        0,
      );
      // Only scored KPIs enter the weighted average — an unscored KPI is
      // missing data, not a zero. Coverage (below) keeps this honest.
      const scoredRows = rows.filter((r) => r.ratio !== null);
      const weightSum = scoredRows.reduce((n, r) => n + r.kpi.weight, 0);
      const weighted = scoredRows.reduce((n, r) => n + (r.ratio ?? 0) * r.kpi.weight, 0);
      const anyScored = scoredRows.length > 0;
      const coveragePct = expectedPeriods === 0 ? 0 : Math.round((scoredPeriods / expectedPeriods) * 100);

      return {
        staffId: person.id,
        name: person.name,
        role: person.role,
        rows,
        scorePct: anyScored && weightSum > 0 ? Math.round((weighted / weightSum) * 100) : null,
        coveragePct,
        eligible: coveragePct >= 60 && anyScored,
      };
    })
    .filter((s) => s.rows.length > 0 || true); // keep everyone visible, even before KPIs exist
}

export interface AwardRow {
  staffId: number;
  name: string;
  avgPct: number;
  weeksEligible: number;
  weeksInPeriod: number;
  avgCoverage: number;
  qualifies: boolean;
}

/** Average eligible weekly scores over [start, end] (Mondays inclusive). */
export async function computeAwards(periodStart: string, periodEnd: string): Promise<AwardRow[]> {
  const weeks: string[] = [];
  let w = mondayOf(new Date(`${periodStart}T00:00:00Z`));
  if (w < periodStart) w = addDays(w, 7);
  for (; w <= periodEnd; w = addDays(w, 7)) weeks.push(w);
  if (weeks.length === 0) return [];

  const byStaff = new Map<number, { name: string; scores: number[]; coverages: number[] }>();
  for (const week of weeks) {
    const staffWeeks = await loadStaffWeeks(week);
    for (const sw of staffWeeks) {
      const entry = byStaff.get(sw.staffId) ?? { name: sw.name, scores: [], coverages: [] };
      if (sw.eligible && sw.scorePct !== null) {
        entry.scores.push(sw.scorePct);
        entry.coverages.push(sw.coveragePct);
      }
      byStaff.set(sw.staffId, entry);
    }
  }

  const minWeeks = Math.max(1, Math.ceil(weeks.length * 0.6));
  return [...byStaff.entries()]
    .map(([staffId, e]) => ({
      staffId,
      name: e.name,
      avgPct: e.scores.length ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : 0,
      weeksEligible: e.scores.length,
      weeksInPeriod: weeks.length,
      avgCoverage: e.coverages.length
        ? Math.round(e.coverages.reduce((a, b) => a + b, 0) / e.coverages.length)
        : 0,
      qualifies: e.scores.length >= minWeeks,
    }))
    .sort((a, b) =>
      b.qualifies !== a.qualifies
        ? Number(b.qualifies) - Number(a.qualifies)
        : b.avgPct - a.avgPct || b.avgCoverage - a.avgCoverage,
    );
}
