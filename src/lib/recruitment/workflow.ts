/**
 * Recruitment workflow — the single source of truth for what may move
 * where, and who may move it. Every server action validates against this
 * before touching the database, and every transition writes an audit row.
 *
 * Nothing moves silently past a mandatory stage: the only path forward is
 * one stage at a time, except the Owner's controlled override, which still
 * demands a written reason and is flagged in the audit trail.
 */

export type StaffRecruitRole = "owner" | "hr" | "hiring_manager" | "assessor";

/* ── vacancies ─────────────────────────────────────────────────── */

export const VACANCY_STATUSES = [
  "draft",
  "internal_review",
  "approved",
  "published",
  "paused",
  "closed",
  "archived",
] as const;
export type VacancyStatus = (typeof VACANCY_STATUSES)[number];

interface VacancyTransition {
  to: VacancyStatus;
  roles: StaffRecruitRole[];
  requiresReason?: boolean;
}

const VACANCY_FLOW: Record<VacancyStatus, VacancyTransition[]> = {
  draft: [{ to: "internal_review", roles: ["hr", "owner"] }],
  internal_review: [
    { to: "approved", roles: ["owner"] }, // only the Owner approves
    { to: "draft", roles: ["owner", "hr"], requiresReason: true }, // return for amendment
  ],
  approved: [
    { to: "published", roles: ["owner", "hr"] },
    { to: "draft", roles: ["owner"], requiresReason: true },
  ],
  published: [
    { to: "paused", roles: ["owner", "hr"], requiresReason: true },
    { to: "closed", roles: ["owner", "hr"] },
  ],
  paused: [
    { to: "published", roles: ["owner", "hr"] },
    { to: "closed", roles: ["owner", "hr"] },
  ],
  closed: [
    { to: "published", roles: ["owner"], requiresReason: true }, // reopen: authorised reason
    { to: "archived", roles: ["owner", "hr"] },
  ],
  archived: [],
};

export function vacancyTransition(
  from: VacancyStatus,
  to: VacancyStatus,
  role: StaffRecruitRole,
): { ok: true; requiresReason: boolean } | { ok: false; error: string } {
  const options = VACANCY_FLOW[from] ?? [];
  const t = options.find((o) => o.to === to);
  if (!t) return { ok: false, error: `A vacancy cannot move from ${from} to ${to}.` };
  if (!t.roles.includes(role))
    return { ok: false, error: `Your role (${role}) cannot move a vacancy from ${from} to ${to}.` };
  return { ok: true, requiresReason: Boolean(t.requiresReason) };
}

/** Fields protected once applications are open: changing them is owner-only,
 *  reasoned, audited, and snapshots the previous configuration. */
export const GUARDED_VACANCY_FIELDS = [
  "essentials",
  "desirables",
  "competencies",
  "questions",
  "requiredDocs",
  "stages",
] as const;

/* ── applications ──────────────────────────────────────────────── */

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "screening",
  "shortlisted",
  "interview",
  "final_assessment",
  "finalist",
  "owner_review",
  "conditional_offer",
  "hired",
  "reserve",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** The mandatory forward pipeline, in order. */
export const PIPELINE: ApplicationStatus[] = [
  "submitted",
  "screening",
  "shortlisted",
  "interview",
  "final_assessment",
  "finalist",
  "owner_review",
  "conditional_offer",
  "hired",
];

const TERMINAL: ApplicationStatus[] = ["hired", "reserve", "rejected", "withdrawn"];

export function isTerminal(status: ApplicationStatus): boolean {
  return TERMINAL.includes(status);
}

/** Which single forward step follows a status. */
export function nextStage(from: ApplicationStatus): ApplicationStatus | null {
  const i = PIPELINE.indexOf(from);
  if (i < 0 || i === PIPELINE.length - 1) return null;
  return PIPELINE[i + 1];
}

/** Stages whose forward move is restricted beyond HR. */
const FORWARD_ROLE_GATES: Partial<Record<ApplicationStatus, StaffRecruitRole[]>> = {
  owner_review: ["owner"], // moving OUT of owner_review (to conditional_offer)
  conditional_offer: ["owner"], // marking hired
};

export interface TransitionCheck {
  ok: boolean;
  error?: string;
  requiresReason: boolean;
  isOverride: boolean;
}

/**
 * Validate an application move.
 * - Forward: exactly one stage at a time (role-gated at owner stages).
 * - reject: from any active stage (hr/owner), reason required.
 * - reserve: from finalist/owner_review/conditional_offer (owner), reason required.
 * - withdrawn: candidate action, handled separately.
 * - Owner override: any other move, reason required, flagged.
 */
export function applicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  role: StaffRecruitRole,
): TransitionCheck {
  if (from === to) return { ok: false, error: "Already in that stage.", requiresReason: false, isOverride: false };
  if (isTerminal(from) && role !== "owner")
    return { ok: false, error: `Only the Owner can move a ${from} application.`, requiresReason: true, isOverride: true };

  // one-step forward
  if (nextStage(from) === to) {
    const gate = FORWARD_ROLE_GATES[from];
    if (gate && !gate.includes(role))
      return { ok: false, error: `Only ${gate.join("/")} can advance out of ${from}.`, requiresReason: false, isOverride: false };
    if (!["hr", "owner"].includes(role))
      return { ok: false, error: "Only HR or the Owner can advance applications.", requiresReason: false, isOverride: false };
    // every manual change records a reason
    return { ok: true, requiresReason: true, isOverride: false };
  }

  if (to === "rejected" && !isTerminal(from) && from !== "draft") {
    if (!["hr", "owner"].includes(role))
      return { ok: false, error: "Only HR or the Owner can reject.", requiresReason: true, isOverride: false };
    return { ok: true, requiresReason: true, isOverride: false };
  }

  if (to === "reserve" && ["finalist", "owner_review", "conditional_offer"].includes(from)) {
    if (role !== "owner")
      return { ok: false, error: "Only the Owner places candidates on the reserve list.", requiresReason: true, isOverride: false };
    return { ok: true, requiresReason: true, isOverride: false };
  }

  // anything else is an owner override, reasoned and flagged
  if (role === "owner") return { ok: true, requiresReason: true, isOverride: true };

  return {
    ok: false,
    error: `That move (${from} → ${to}) skips mandatory stages. Only the Owner may override, with a written reason.`,
    requiresReason: true,
    isOverride: true,
  };
}

/* ── retention ─────────────────────────────────────────────────── */

export function retentionExpiry(terminalAt: Date, retentionDays: number): Date {
  const d = new Date(terminalAt);
  d.setUTCDate(d.getUTCDate() + Math.max(1, retentionDays));
  return d;
}

/* ── permission matrix (documented + enforced) ─────────────────── */

export const PERMISSIONS = {
  owner: {
    vacancies: "create, edit, approve, publish, pause, close, reopen, archive, guarded edits after open",
    applications: "view all, advance all stages, reject, reserve, override with reason, retention & deletion",
    files: "view all",
    comms: "send, view history",
    notes: "add, view",
  },
  hr: {
    vacancies: "create, edit drafts, submit for approval, publish approved, pause, close",
    applications: "view all, screening, advance to owner_review, reject with reason",
    files: "view all",
    comms: "send, view history",
    notes: "add, view",
  },
  hiring_manager: {
    vacancies: "view vacancies where panelled",
    applications: "view candidates for panelled vacancies",
    files: "view for panelled vacancies",
    comms: "view history",
    notes: "add, view",
  },
  assessor: {
    vacancies: "view vacancies where panelled",
    applications: "view assigned candidates only",
    files: "view for panelled vacancies",
    comms: "none",
    notes: "add, view own",
  },
  applicant: {
    scope: "own applications, own files, own messages only — via candidate session, never staff session",
  },
} as const;
