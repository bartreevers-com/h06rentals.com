import { describe, expect, it } from "vitest";
import {
  applicationTransition,
  isTerminal,
  nextStage,
  PIPELINE,
  retentionExpiry,
  vacancyTransition,
} from "./workflow";

describe("vacancy workflow", () => {
  it("only the owner approves publication", () => {
    expect(vacancyTransition("internal_review", "approved", "owner").ok).toBe(true);
    expect(vacancyTransition("internal_review", "approved", "hr").ok).toBe(false);
    expect(vacancyTransition("internal_review", "approved", "hiring_manager").ok).toBe(false);
  });

  it("hr can draft → review and publish approved vacancies", () => {
    expect(vacancyTransition("draft", "internal_review", "hr").ok).toBe(true);
    expect(vacancyTransition("approved", "published", "hr").ok).toBe(true);
  });

  it("cannot skip approval: draft → published is blocked for everyone", () => {
    expect(vacancyTransition("draft", "published", "owner").ok).toBe(false);
    expect(vacancyTransition("draft", "published", "hr").ok).toBe(false);
  });

  it("reopening a closed vacancy is owner-only with a reason", () => {
    const hr = vacancyTransition("closed", "published", "hr");
    expect(hr.ok).toBe(false);
    const owner = vacancyTransition("closed", "published", "owner");
    expect(owner.ok).toBe(true);
    if (owner.ok) expect(owner.requiresReason).toBe(true);
  });

  it("pausing requires a reason", () => {
    const t = vacancyTransition("published", "paused", "hr");
    expect(t.ok).toBe(true);
    if (t.ok) expect(t.requiresReason).toBe(true);
  });

  it("archived is terminal", () => {
    expect(vacancyTransition("archived", "draft", "owner").ok).toBe(false);
  });
});

describe("application pipeline", () => {
  it("advances exactly one stage at a time, in order", () => {
    for (let i = 0; i < PIPELINE.length - 1; i++) {
      expect(nextStage(PIPELINE[i])).toBe(PIPELINE[i + 1]);
    }
    expect(nextStage("hired")).toBeNull();
  });

  it("every manual forward move requires a reason", () => {
    const t = applicationTransition("submitted", "screening", "hr");
    expect(t.ok).toBe(true);
    expect(t.requiresReason).toBe(true);
    expect(t.isOverride).toBe(false);
  });

  it("stage-skipping is blocked for hr — no silent bypass of mandatory stages", () => {
    const t = applicationTransition("submitted", "interview", "hr");
    expect(t.ok).toBe(false);
    expect(t.error).toContain("skips mandatory stages");
  });

  it("stage-skipping by the owner is allowed but flagged as an override", () => {
    const t = applicationTransition("submitted", "interview", "owner");
    expect(t.ok).toBe(true);
    expect(t.isOverride).toBe(true);
    expect(t.requiresReason).toBe(true);
  });

  it("only the owner advances out of owner_review and conditional_offer", () => {
    expect(applicationTransition("owner_review", "conditional_offer", "hr").ok).toBe(false);
    expect(applicationTransition("owner_review", "conditional_offer", "owner").ok).toBe(true);
    expect(applicationTransition("conditional_offer", "hired", "hr").ok).toBe(false);
    expect(applicationTransition("conditional_offer", "hired", "owner").ok).toBe(true);
  });

  it("assessors and hiring managers cannot move candidates at all", () => {
    expect(applicationTransition("screening", "shortlisted", "assessor").ok).toBe(false);
    expect(applicationTransition("screening", "shortlisted", "hiring_manager").ok).toBe(false);
  });

  it("hr can reject from active stages, always with a reason", () => {
    const t = applicationTransition("screening", "rejected", "hr");
    expect(t.ok).toBe(true);
    expect(t.requiresReason).toBe(true);
  });

  it("reserve is owner-only and only from late stages", () => {
    expect(applicationTransition("finalist", "reserve", "owner").ok).toBe(true);
    expect(applicationTransition("finalist", "reserve", "hr").ok).toBe(false);
    expect(applicationTransition("screening", "reserve", "hr").ok).toBe(false);
  });

  it("terminal states are locked for non-owners", () => {
    expect(isTerminal("rejected")).toBe(true);
    expect(applicationTransition("rejected", "screening", "hr").ok).toBe(false);
    const reinstate = applicationTransition("rejected", "screening", "owner");
    expect(reinstate.ok).toBe(true);
    expect(reinstate.isOverride).toBe(true);
  });
});

describe("retention", () => {
  it("computes expiry from the terminal date", () => {
    const d = retentionExpiry(new Date("2026-07-20T12:00:00Z"), 180);
    expect(d.toISOString().slice(0, 10)).toBe("2027-01-16");
  });

  it("never allows a sub-day retention window", () => {
    const d = retentionExpiry(new Date("2026-07-20T12:00:00Z"), 0);
    expect(d.getTime()).toBeGreaterThan(new Date("2026-07-20T12:00:00Z").getTime());
  });
});
