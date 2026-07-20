/**
 * The approved competency framework for H06 recruitment scoring.
 * Weights sum to 100. Every scorecard scores each competency 1–5;
 * the weighted total normalises to 0–100. Pure module — unit tested.
 */

export const COMPETENCIES = [
  { id: "conversation_listening", label: "Conversation & listening", weight: 20 },
  { id: "improvisation", label: "Improvisation", weight: 15 },
  { id: "intelligence_curiosity", label: "Intelligence & curiosity", weight: 15 },
  { id: "humour", label: "Humour", weight: 10 },
  { id: "fluency_clarity", label: "Fluency & clarity", weight: 10 },
  { id: "reliability_preparation", label: "Reliability & preparation", weight: 10 },
  { id: "brand_judgement", label: "Brand judgement", weight: 10 },
  { id: "commercial_content", label: "Commercial & content instinct", weight: 10 },
] as const;

export type CompetencyId = (typeof COMPETENCIES)[number]["id"];

export const RECOMMENDATIONS = [
  { id: "strong_yes", label: "Strong yes" },
  { id: "yes", label: "Yes" },
  { id: "neutral", label: "Neutral" },
  { id: "no", label: "No" },
] as const;

/** Are all eight competencies scored 1–5? */
export function scoresComplete(scores: Record<string, number>): boolean {
  return COMPETENCIES.every((c) => {
    const v = scores[c.id];
    return Number.isInteger(v) && v >= 1 && v <= 5;
  });
}

/** Weighted total on a 0–100 scale (score/5 × weight, summed). Null if incomplete. */
export function weightedTotal(scores: Record<string, number>): number | null {
  if (!scoresComplete(scores)) return null;
  const total = COMPETENCIES.reduce((sum, c) => sum + (scores[c.id] / 5) * c.weight, 0);
  return Math.round(total);
}

/** Per-competency mean across submitted scorecards, 1 decimal place. */
export function competencyAverages(all: Record<string, number>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of COMPETENCIES) {
    const values = all.map((s) => s[c.id]).filter((v) => Number.isFinite(v));
    if (values.length) out[c.id] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }
  return out;
}

/** Competencies where assessors strongly disagreed (spread of 2+ points). */
export function disagreements(all: Record<string, number>[]): { id: CompetencyId; min: number; max: number }[] {
  if (all.length < 2) return [];
  const out: { id: CompetencyId; min: number; max: number }[] = [];
  for (const c of COMPETENCIES) {
    const values = all.map((s) => s[c.id]).filter((v) => Number.isFinite(v));
    if (values.length < 2) continue;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max - min >= 2) out.push({ id: c.id, min, max });
  }
  return out;
}
