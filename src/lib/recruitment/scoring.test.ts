import { describe, expect, it } from "vitest";
import { COMPETENCIES, competencyAverages, disagreements, scoresComplete, weightedTotal } from "./scoring";

const allScores = (v: number) => Object.fromEntries(COMPETENCIES.map((c) => [c.id, v]));

describe("competency framework", () => {
  it("weights sum to exactly 100", () => {
    expect(COMPETENCIES.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });

  it("conversation & listening carries the top weight (20)", () => {
    expect(COMPETENCIES.find((c) => c.id === "conversation_listening")?.weight).toBe(20);
  });
});

describe("weighted total", () => {
  it("all fives = 100, all ones = 20, all threes = 60", () => {
    expect(weightedTotal(allScores(5))).toBe(100);
    expect(weightedTotal(allScores(1))).toBe(20);
    expect(weightedTotal(allScores(3))).toBe(60);
  });

  it("weights matter: a 5 on the heaviest competency beats a 5 on a light one", () => {
    const heavy = { ...allScores(3), conversation_listening: 5 };
    const light = { ...allScores(3), humour: 5 };
    expect(weightedTotal(heavy)!).toBeGreaterThan(weightedTotal(light)!);
  });

  it("incomplete or out-of-range scorecards produce no total", () => {
    const partial = allScores(4);
    delete (partial as Record<string, number>).humour;
    expect(weightedTotal(partial)).toBeNull();
    expect(scoresComplete(partial)).toBe(false);
    expect(weightedTotal({ ...allScores(4), humour: 6 })).toBeNull();
    expect(weightedTotal({ ...allScores(4), humour: 0 })).toBeNull();
  });
});

describe("panel aggregation", () => {
  it("averages per competency to 1 decimal", () => {
    const avg = competencyAverages([allScores(4), allScores(5)]);
    expect(avg.conversation_listening).toBe(4.5);
  });

  it("flags strong disagreement only on 2+ point spreads", () => {
    const a = { ...allScores(4), humour: 5 };
    const b = { ...allScores(4), humour: 2, improvisation: 3 };
    const flags = disagreements([a, b]);
    expect(flags.map((f) => f.id)).toContain("humour");
    expect(flags.map((f) => f.id)).not.toContain("improvisation");
    expect(flags.find((f) => f.id === "humour")).toMatchObject({ min: 2, max: 5 });
  });

  it("a single scorecard can never disagree with itself", () => {
    expect(disagreements([allScores(3)])).toEqual([]);
  });
});
