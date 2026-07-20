"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  aiAnalyses,
  applicationNotes,
  applications,
  applicationFiles,
  candidates,
  interviews,
  scorecards,
  screenings,
  vacancies,
} from "@/lib/db/schema";
import { getSession, type Session } from "@/lib/admin-auth";
import {
  applicationTransition,
  GUARDED_VACANCY_FIELDS,
  nextStage,
  retentionExpiry,
  vacancyTransition,
  type ApplicationStatus,
  type StaffRecruitRole,
  type VacancyStatus,
} from "@/lib/recruitment/workflow";
import {
  applicationFilesFor,
  auditApplication,
  auditVacancy,
  getApplication,
  getVacancy,
  isRecruitRole,
  logEvent,
  nextVacancyRef,
  staffCanSeeVacancy,
  vacancyHasApplicationsOpen,
} from "@/lib/recruitment/repo";
import { COMM_TEMPLATES, sendCandidateComm, type CommTemplate } from "@/lib/recruitment/comms";
import { deleteStoredFile } from "@/lib/recruitment/storage";
import { COMPETENCIES, RECOMMENDATIONS, scoresComplete, weightedTotal } from "@/lib/recruitment/scoring";
import { analyseApplication } from "@/lib/recruitment/ai";

async function requireRecruit(...roles: StaffRecruitRole[]): Promise<Session & { role: StaffRecruitRole }> {
  const session = await getSession();
  if (!session || !isRecruitRole(session.role) || !roles.includes(session.role)) redirect("/admin");
  return session as Session & { role: StaffRecruitRole };
}

/* ── form parsing helpers ────────────────────────────────────── */

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** One question per line: `label | type | required|optional [| eligibility]`
 *  type ∈ text, textarea, yes_no, link. */
function parseQuestions(value: FormDataEntryValue | null) {
  return lines(value).map((line, i) => {
    const parts = line.split("|").map((p) => p.trim());
    const type = ["text", "textarea", "yes_no", "link"].includes(parts[1]) ? parts[1] : "textarea";
    return {
      id: `q${i + 1}`,
      label: parts[0],
      type: type as "text" | "textarea" | "yes_no" | "link",
      required: parts[2] !== "optional",
      eligibility: parts.includes("eligibility") && type === "yes_no",
    };
  });
}

/** One competency per line: `name | weight` (weight defaults to 1). */
function parseCompetencies(value: FormDataEntryValue | null) {
  return lines(value).map((line) => {
    const [name, weight] = line.split("|").map((p) => p.trim());
    return { name, weight: Math.max(1, Number(weight) || 1) };
  });
}

function parseDate(value: FormDataEntryValue | null): Date | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function vacancyFieldsFrom(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim() || "General",
    hiringManager: String(formData.get("hiringManager") ?? "").trim() || null,
    engagementType: String(formData.get("engagementType") ?? "full_time"),
    location: String(formData.get("location") ?? "").trim() || "Lagos, Nigeria",
    workArrangement: String(formData.get("workArrangement") ?? "on_site"),
    openings: Math.max(1, Number(formData.get("openings")) || 1),
    summary: String(formData.get("summary") ?? "").trim(),
    responsibilities: lines(formData.get("responsibilities")),
    essentials: lines(formData.get("essentials")),
    desirables: lines(formData.get("desirables")),
    competencies: parseCompetencies(formData.get("competencies")),
    compensation: String(formData.get("compensation") ?? "").trim() || null,
    compensationPublic: formData.get("compensationPublic") === "on",
    opensAt: parseDate(formData.get("opensAt")),
    closesAt: parseDate(formData.get("closesAt")),
    expectedStart: String(formData.get("expectedStart") ?? "").trim() || null,
    questions: parseQuestions(formData.get("questions")),
    requiredDocs: {
      cv: formData.get("doc_cv") === "on",
      supporting: formData.get("doc_supporting") === "on",
      video: formData.get("doc_video") === "on",
      audio: formData.get("doc_audio") === "on",
    },
    stages: lines(formData.get("stages")),
    panel: formData.getAll("panel").map(Number).filter(Boolean),
    privacyVersion: String(formData.get("privacyVersion") ?? "1.0").trim() || "1.0",
    retentionDays: Math.max(30, Number(formData.get("retentionDays")) || 180),
  };
}

/* ── vacancy actions ─────────────────────────────────────────── */

export async function createVacancyAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const fields = vacancyFieldsFrom(formData);
  if (fields.title.length < 3) return { error: "Please give the vacancy a title" };
  if (!fields.summary) return { error: "Please write a short summary — it appears on the careers page" };

  const db = await getDb();
  const { reference, slug } = await nextVacancyRef();
  const [created] = await db
    .insert(vacancies)
    .values({ ...fields, reference, slug, status: "draft", createdBy: session.name })
    .returning();
  await auditVacancy({
    vacancyId: created.id,
    actor: session.name,
    actorRole: session.role,
    action: "created",
  });
  revalidatePath("/admin/recruitment");
  redirect(`/admin/recruitment/${created.id}`);
}

export async function updateVacancyAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const id = Number(formData.get("id"));
  const vacancy = await getVacancy(id);
  if (!vacancy) return { error: "Vacancy not found" };

  const fields = vacancyFieldsFrom(formData);
  if (fields.title.length < 3) return { error: "Please give the vacancy a title" };

  // Selection criteria are frozen for non-owners once candidates can rely on them.
  if (vacancyHasApplicationsOpen(vacancy)) {
    const guardedChanges = GUARDED_VACANCY_FIELDS.filter(
      (f) => JSON.stringify(vacancy[f]) !== JSON.stringify(fields[f]),
    );
    if (guardedChanges.length > 0) {
      if (session.role !== "owner")
        return {
          error: `Applications are open — only the Owner may change: ${guardedChanges.join(", ")}. Everything else saved? No — nothing was saved; revert those fields or ask the Owner.`,
        };
      const reason = String(formData.get("guardedReason") ?? "").trim();
      if (reason.length < 10)
        return {
          error: `You're changing selection criteria after applications opened (${guardedChanges.join(", ")}). A written reason (10+ characters) is required — it goes on the permanent audit record.`,
        };
      await auditVacancy({
        vacancyId: vacancy.id,
        actor: session.name,
        actorRole: session.role,
        action: `guarded_edit: ${guardedChanges.join(", ")}`,
        reason,
        previousConfig: Object.fromEntries(guardedChanges.map((f) => [f, vacancy[f]])),
      });
    }
  }

  const db = await getDb();
  await db
    .update(vacancies)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(vacancies.id, vacancy.id));
  await auditVacancy({
    vacancyId: vacancy.id,
    actor: session.name,
    actorRole: session.role,
    action: "updated",
  });
  revalidatePath("/admin/recruitment");
  revalidatePath(`/admin/recruitment/${vacancy.id}`);
  revalidatePath("/careers");
  revalidatePath(`/careers/${vacancy.slug}`);
  return { error: undefined, saved: true } as { error?: string; saved?: boolean };
}

export async function vacancyStatusAction(formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const id = Number(formData.get("id"));
  const to = String(formData.get("to")) as VacancyStatus;
  const reason = String(formData.get("reason") ?? "").trim();

  const vacancy = await getVacancy(id);
  if (!vacancy) return;
  const check = vacancyTransition(vacancy.status as VacancyStatus, to, session.role);
  if (!check.ok) return;
  if (check.requiresReason && reason.length < 5) return;

  const db = await getDb();
  const patch: Partial<typeof vacancies.$inferInsert> = { status: to, updatedAt: new Date() };
  if (to === "approved") {
    patch.approvedBy = session.name;
    patch.approvedAt = new Date();
  }
  await db.update(vacancies).set(patch).where(eq(vacancies.id, id));
  await auditVacancy({
    vacancyId: id,
    actor: session.name,
    actorRole: session.role,
    action: `${vacancy.status} → ${to}`,
    reason: reason || null,
  });
  revalidatePath("/admin/recruitment");
  revalidatePath(`/admin/recruitment/${id}`);
  revalidatePath("/careers");
  revalidatePath(`/careers/${vacancy.slug}`);
}

export async function duplicateVacancyAction(formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const id = Number(formData.get("id"));
  const vacancy = await getVacancy(id);
  if (!vacancy) return;

  const db = await getDb();
  const { reference, slug } = await nextVacancyRef();
  const [copy] = await db
    .insert(vacancies)
    .values({
      reference,
      slug,
      title: `${vacancy.title} (copy)`,
      department: vacancy.department,
      hiringManager: vacancy.hiringManager,
      engagementType: vacancy.engagementType,
      location: vacancy.location,
      workArrangement: vacancy.workArrangement,
      openings: vacancy.openings,
      summary: vacancy.summary,
      responsibilities: vacancy.responsibilities,
      essentials: vacancy.essentials,
      desirables: vacancy.desirables,
      competencies: vacancy.competencies,
      compensation: vacancy.compensation,
      compensationPublic: vacancy.compensationPublic,
      expectedStart: vacancy.expectedStart,
      questions: vacancy.questions,
      requiredDocs: vacancy.requiredDocs,
      stages: vacancy.stages,
      panel: vacancy.panel,
      privacyVersion: vacancy.privacyVersion,
      retentionDays: vacancy.retentionDays,
      status: "draft",
      createdBy: session.name,
    })
    .returning();
  await auditVacancy({
    vacancyId: copy.id,
    actor: session.name,
    actorRole: session.role,
    action: `duplicated from ${vacancy.reference}`,
  });
  revalidatePath("/admin/recruitment");
  redirect(`/admin/recruitment/${copy.id}`);
}

/* ── application actions ─────────────────────────────────────── */

export async function moveApplicationAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const id = Number(formData.get("id"));
  const to = String(formData.get("to")) as ApplicationStatus;
  const reason = String(formData.get("reason") ?? "").trim();
  const notify = formData.get("notify") === "on";

  const app = await getApplication(id);
  if (!app) return { error: "Application not found" };
  const vacancy = await getVacancy(app.vacancyId);
  if (!vacancy) return { error: "Vacancy not found" };

  const check = applicationTransition(app.status as ApplicationStatus, to, session.role);
  if (!check.ok) return { error: check.error };
  if (check.requiresReason && reason.length < 5)
    return { error: "A written reason is required for this change — it goes on the audit record" };

  const db = await getDb();
  const now = new Date();
  const terminal = ["hired", "reserve", "rejected"].includes(to);
  await db
    .update(applications)
    .set({
      status: to,
      updatedAt: now,
      ...(terminal && !app.legalHold ? { retentionExpiry: retentionExpiry(now, vacancy.retentionDays) } : {}),
    })
    .where(eq(applications.id, id));

  await auditApplication({
    applicationId: id,
    actor: session.name,
    actorRole: session.role,
    fromStatus: app.status,
    toStatus: to,
    reason,
    isOverride: check.isOverride,
  });

  if (notify) {
    const cand = (await db.select().from(candidates).where(eq(candidates.id, app.candidateId)).limit(1))[0];
    if (cand) {
      const template: CommTemplate | null =
        to === "shortlisted" ? "shortlist_invitation" : to === "rejected" ? "rejection" : null;
      if (template) {
        await sendCandidateComm({
          candidateId: cand.id,
          applicationId: id,
          email: cand.email,
          template,
          vars: {
            firstName: cand.firstName ?? undefined,
            vacancyTitle: vacancy.title,
            applicationRef: app.ref,
          },
          sentBy: session.name,
        });
      }
    }
  }

  revalidatePath(`/admin/recruitment/${app.vacancyId}`);
  revalidatePath(`/admin/recruitment/app/${id}`);
  return { error: undefined };
}

export async function addNoteAction(formData: FormData) {
  const session = await requireRecruit("owner", "hr", "hiring_manager", "assessor");
  const id = Number(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim();
  if (!id || note.length < 2) return;

  const app = await getApplication(id);
  if (!app) return;
  const vacancy = await getVacancy(app.vacancyId);
  if (!vacancy || !staffCanSeeVacancy(session.role, session.userId, vacancy)) return;

  const db = await getDb();
  await db.insert(applicationNotes).values({ applicationId: id, author: `${session.name} (${session.role})`, note });
  revalidatePath(`/admin/recruitment/app/${id}`);
}

export async function sendCommAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const id = Number(formData.get("id"));
  const template = String(formData.get("template") ?? "");
  const manualSubject = String(formData.get("subject") ?? "").trim();
  const manualBody = String(formData.get("body") ?? "").trim();

  const app = await getApplication(id);
  if (!app) return { error: "Application not found" };
  const vacancy = await getVacancy(app.vacancyId);
  const db = await getDb();
  const cand = (await db.select().from(candidates).where(eq(candidates.id, app.candidateId)).limit(1))[0];
  if (!cand || !vacancy) return { error: "Candidate not found" };

  if (template && template in COMM_TEMPLATES) {
    await sendCandidateComm({
      candidateId: cand.id,
      applicationId: id,
      email: cand.email,
      template: template as CommTemplate,
      vars: { firstName: cand.firstName ?? undefined, vacancyTitle: vacancy.title, applicationRef: app.ref },
      sentBy: session.name,
    });
  } else if (manualSubject && manualBody) {
    await sendCandidateComm({
      candidateId: cand.id,
      applicationId: id,
      email: cand.email,
      manual: { subject: manualSubject, body: manualBody },
      sentBy: session.name,
    });
  } else {
    return { error: "Pick a template, or write both a subject and a message" };
  }
  revalidatePath(`/admin/recruitment/app/${id}`);
  return { error: undefined };
}

/* ── retention (owner only) ──────────────────────────────────── */

export async function setLegalHoldAction(formData: FormData) {
  const session = await requireRecruit("owner");
  const id = Number(formData.get("id"));
  const hold = formData.get("hold") === "on";
  const app = await getApplication(id);
  if (!app) return;
  const db = await getDb();
  await db.update(applications).set({ legalHold: hold, updatedAt: new Date() }).where(eq(applications.id, id));
  await auditApplication({
    applicationId: id,
    actor: session.name,
    actorRole: session.role,
    fromStatus: app.status,
    toStatus: app.status,
    reason: hold ? "Legal hold applied — retention deletion suspended" : "Legal hold released",
  });
  revalidatePath(`/admin/recruitment/app/${id}`);
}

/** Anonymise an expired application: files destroyed, personal data blanked,
 *  the fact an application existed (ref, stage history) is retained. */
export async function anonymiseApplicationAction(formData: FormData) {
  const session = await requireRecruit("owner");
  const id = Number(formData.get("id"));
  const app = await getApplication(id);
  if (!app) return;
  if (app.legalHold) return;
  if (!app.retentionExpiry || app.retentionExpiry > new Date()) return;
  if (app.talentPoolConsent) return; // talent-pool candidates keep their data until consent lapses

  const db = await getDb();
  const files = await db.select().from(applicationFiles).where(eq(applicationFiles.applicationId, id));
  for (const f of files) {
    await deleteStoredFile(f.storagePath).catch(() => {});
    await db.delete(applicationFiles).where(eq(applicationFiles.id, f.id));
  }
  await db
    .update(applications)
    .set({ form: {}, submitted: null, anonymisedAt: new Date(), updatedAt: new Date() })
    .where(eq(applications.id, id));
  await auditApplication({
    applicationId: id,
    actor: session.name,
    actorRole: session.role,
    fromStatus: app.status,
    toStatus: app.status,
    reason: "Retention period elapsed — application anonymised, files destroyed",
  });
  revalidatePath("/admin/recruitment");
  revalidatePath(`/admin/recruitment/app/${id}`);
}

/* ── eligibility screening (human decision, never automated) ─── */

export async function screenApplicationAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const id = Number(formData.get("id"));
  const result = String(formData.get("result"));
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const meetsEssentials = formData.get("meetsEssentials") === "on";

  if (!["eligible", "not_eligible", "needs_review"].includes(result))
    return { error: "Pick a screening result" };
  if (reason.length < 5) return { error: "A written reason is required — it goes on the record" };
  const app = await getApplication(id);
  if (!app) return { error: "Application not found" };

  const db = await getDb();
  await db.insert(screenings).values({
    applicationId: id,
    result,
    meetsEssentials,
    reason,
    notes: notes || null,
    reviewer: `${session.name} (${session.role})`,
  });
  await db
    .update(applications)
    .set({
      eligibilityResult: result === "eligible" ? "pass" : result === "not_eligible" ? "fail" : "manual",
      updatedAt: new Date(),
    })
    .where(eq(applications.id, id));
  await logEvent({
    actor: session.name,
    actorRole: session.role,
    action: `screening: ${result}`,
    applicationId: id,
    vacancyId: app.vacancyId,
    detail: reason,
  });
  revalidatePath(`/admin/recruitment/app/${id}`);
  return { error: undefined };
}

/* ── interviews ───────────────────────────────────────────────── */

async function notifyInterview(
  appId: number,
  template: CommTemplate,
  interview: { scheduledAt: Date; mode: string; locationOrLink: string },
  sentBy: string,
  detail?: string,
) {
  const app = await getApplication(appId);
  if (!app) return;
  const vacancy = await getVacancy(app.vacancyId);
  const db = await getDb();
  const cand = (await db.select().from(candidates).where(eq(candidates.id, app.candidateId)).limit(1))[0];
  if (!cand || !vacancy) return;
  await sendCandidateComm({
    candidateId: cand.id,
    applicationId: appId,
    email: cand.email,
    template,
    vars: {
      firstName: cand.firstName ?? undefined,
      vacancyTitle: vacancy.title,
      applicationRef: app.ref,
      interviewDate: interview.scheduledAt.toLocaleString("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Africa/Lagos",
      }),
      interviewMode: interview.mode === "physical" ? "in person" : "online",
      interviewLocation: interview.locationOrLink || "to be confirmed",
      detail,
    },
    sentBy,
  });
}

export async function scheduleInterviewAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const id = Number(formData.get("id"));
  const scheduledAt = new Date(String(formData.get("scheduledAt") ?? ""));
  const mode = formData.get("mode") === "physical" ? "physical" : "online";
  const locationOrLink = String(formData.get("locationOrLink") ?? "").trim();
  const interviewers = formData.getAll("interviewers").map(Number).filter((n) => Number.isFinite(n));
  const notify = formData.get("notify") === "on";

  if (Number.isNaN(scheduledAt.getTime())) return { error: "Pick a date and time" };
  if (!locationOrLink) return { error: mode === "physical" ? "Add the location" : "Add the meeting link" };
  const app = await getApplication(id);
  if (!app) return { error: "Application not found" };

  const db = await getDb();
  await db.insert(interviews).values({
    applicationId: id,
    scheduledAt,
    mode,
    locationOrLink,
    interviewers,
    createdBy: session.name,
  });
  if (notify) await notifyInterview(id, "interview_invitation", { scheduledAt, mode, locationOrLink }, session.name);
  await logEvent({
    actor: session.name,
    actorRole: session.role,
    action: "interview_scheduled",
    applicationId: id,
    vacancyId: app.vacancyId,
    detail: `${scheduledAt.toISOString()} · ${mode}`,
  });
  revalidatePath(`/admin/recruitment/app/${id}`);
  return { error: undefined };
}

export async function updateInterviewAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const interviewId = Number(formData.get("interviewId"));
  const op = String(formData.get("op"));
  const notify = formData.get("notify") === "on";

  const db = await getDb();
  const rows = await db.select().from(interviews).where(eq(interviews.id, interviewId)).limit(1);
  const interview = rows[0];
  if (!interview) return { error: "Interview not found" };
  const app = await getApplication(interview.applicationId);

  if (op === "reschedule") {
    const scheduledAt = new Date(String(formData.get("scheduledAt") ?? ""));
    if (Number.isNaN(scheduledAt.getTime())) return { error: "Pick the new date and time" };
    const mode = formData.get("mode") === "physical" ? "physical" : "online";
    const locationOrLink = String(formData.get("locationOrLink") ?? "").trim() || interview.locationOrLink;
    await db
      .update(interviews)
      .set({ scheduledAt, mode, locationOrLink, status: "rescheduled", reminderSentAt: null, updatedAt: new Date() })
      .where(eq(interviews.id, interviewId));
    if (notify)
      await notifyInterview(interview.applicationId, "interview_reschedule", { scheduledAt, mode, locationOrLink }, session.name);
    await logEvent({
      actor: session.name,
      actorRole: session.role,
      action: "interview_rescheduled",
      applicationId: interview.applicationId,
      vacancyId: app?.vacancyId,
      detail: scheduledAt.toISOString(),
    });
  } else if (op === "cancel") {
    await db.update(interviews).set({ status: "cancelled", updatedAt: new Date() }).where(eq(interviews.id, interviewId));
    if (notify)
      await notifyInterview(interview.applicationId, "interview_cancelled", interview, session.name);
    await logEvent({
      actor: session.name,
      actorRole: session.role,
      action: "interview_cancelled",
      applicationId: interview.applicationId,
      vacancyId: app?.vacancyId,
    });
  } else if (op === "attendance") {
    const attendance = formData.get("attendance") === "no_show" ? "no_show" : "attended";
    await db
      .update(interviews)
      .set({ status: "completed", attendance, updatedAt: new Date() })
      .where(eq(interviews.id, interviewId));
    await logEvent({
      actor: session.name,
      actorRole: session.role,
      action: `interview_${attendance}`,
      applicationId: interview.applicationId,
      vacancyId: app?.vacancyId,
    });
  } else {
    return { error: "Unknown operation" };
  }
  revalidatePath(`/admin/recruitment/app/${interview.applicationId}`);
  return { error: undefined };
}

/* ── panel scorecards (independent, versioned) ────────────────── */

export async function saveScorecardAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner", "hr", "hiring_manager", "assessor");
  const id = Number(formData.get("id"));
  const app = await getApplication(id);
  if (!app) return { error: "Application not found" };
  const vacancy = await getVacancy(app.vacancyId);
  if (!vacancy || !staffCanSeeVacancy(session.role, session.userId, vacancy))
    return { error: "You're not on this vacancy's panel" };

  const scores: Record<string, number> = {};
  for (const c of COMPETENCIES) {
    const v = Number(formData.get(`score_${c.id}`));
    if (v >= 1 && v <= 5) scores[c.id] = v;
  }
  const evidence = String(formData.get("evidence") ?? "").trim();
  const strengths = String(formData.get("strengths") ?? "").trim();
  const concerns = String(formData.get("concerns") ?? "").trim();
  const recommendation = String(formData.get("recommendation") ?? "");
  const submitting = formData.get("submit") === "yes";
  const editReason = String(formData.get("editReason") ?? "").trim();

  if (submitting) {
    if (!scoresComplete(scores)) return { error: "Score every competency (1–5) before submitting" };
    if (!evidence) return { error: "Evidence or comments are required — scores need grounding" };
    if (!RECOMMENDATIONS.some((r) => r.id === recommendation))
      return { error: "Pick an overall recommendation" };
  }

  const db = await getDb();
  const existingRows = await db
    .select()
    .from(scorecards)
    .where(and(eq(scorecards.applicationId, id), eq(scorecards.assessorId, session.userId)));
  const existing = existingRows[0];
  const total = weightedTotal(scores);
  const now = new Date();

  if (existing) {
    // a submitted scorecard can only be edited by its author, with a reason,
    // and the previous scores are preserved forever
    const wasSubmitted = Boolean(existing.submittedAt);
    if (wasSubmitted && editReason.length < 5)
      return { error: "This scorecard was already submitted — a written reason is required to change it" };
    const revisions = wasSubmitted
      ? [
          ...existing.revisions,
          {
            scores: existing.scores,
            weightedTotal: existing.weightedTotal,
            reason: editReason,
            at: now.toISOString(),
          },
        ]
      : existing.revisions;
    await db
      .update(scorecards)
      .set({
        scores,
        evidence,
        strengths,
        concerns,
        recommendation: recommendation || null,
        weightedTotal: total,
        submittedAt: submitting ? (existing.submittedAt ?? now) : existing.submittedAt,
        revisions,
        updatedAt: now,
      })
      .where(eq(scorecards.id, existing.id));
    await logEvent({
      actor: session.name,
      actorRole: session.role,
      action: wasSubmitted ? "score_changed" : submitting ? "score_submitted" : "score_draft_saved",
      applicationId: id,
      vacancyId: app.vacancyId,
      detail: wasSubmitted ? editReason : total !== null ? `weighted total ${total}` : null,
    });
  } else {
    await db.insert(scorecards).values({
      applicationId: id,
      assessorId: session.userId,
      assessorName: `${session.name} (${session.role})`,
      scores,
      evidence,
      strengths,
      concerns,
      recommendation: recommendation || null,
      weightedTotal: total,
      submittedAt: submitting ? now : null,
    });
    await logEvent({
      actor: session.name,
      actorRole: session.role,
      action: submitting ? "score_submitted" : "score_draft_saved",
      applicationId: id,
      vacancyId: app.vacancyId,
      detail: total !== null ? `weighted total ${total}` : null,
    });
  }
  revalidatePath(`/admin/recruitment/app/${id}`);
  return { error: undefined };
}

/* ── AI assistant (never a decision-maker) ────────────────────── */

export async function generateAiAnalysisAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const id = Number(formData.get("id"));
  const app = await getApplication(id);
  if (!app || !app.submitted) return { error: "No submitted application to analyse" };
  const vacancy = await getVacancy(app.vacancyId);
  if (!vacancy) return { error: "Vacancy not found" };

  const submitted = app.submitted as { form?: Record<string, unknown> };
  const files = await applicationFilesFor(id);
  try {
    const result = await analyseApplication({
      vacancy,
      form: submitted.form ?? {},
      files: files.map((f) => ({ kind: f.kind, filename: f.filename })),
    });
    const db = await getDb();
    await db.insert(aiAnalyses).values({
      applicationId: id,
      model: result.model,
      summary: result.summary,
      evidence: result.evidence,
      missingInfo: result.missingInfo,
      followUpQuestions: result.followUpQuestions,
      createdBy: session.name,
    });
    await logEvent({
      actor: session.name,
      actorRole: session.role,
      action: "ai_analysis_generated",
      applicationId: id,
      vacancyId: app.vacancyId,
      detail: result.model,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI analysis failed" };
  }
  revalidatePath(`/admin/recruitment/app/${id}`);
  return { error: undefined };
}

/* ── finalists & the owner's decision ─────────────────────────── */

export async function setFinalistsAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const vacancyId = Number(formData.get("vacancyId"));
  const ids = formData.getAll("finalist").map(Number).filter(Boolean);
  const reason = String(formData.get("reason") ?? "").trim();
  const notify = formData.get("notify") === "on";

  if (ids.length === 0) return { error: "Select at least one finalist" };
  if (ids.length > 3) return { error: "No more than three finalists" };
  if (reason.length < 5) return { error: "A written reason is required — it goes on the audit record" };
  const vacancy = await getVacancy(vacancyId);
  if (!vacancy) return { error: "Vacancy not found" };

  const db = await getDb();
  for (const id of ids) {
    const app = await getApplication(id);
    if (!app || app.vacancyId !== vacancyId) return { error: `Application ${id} doesn't belong to this vacancy` };
    // advance one audited stage at a time — never a silent skip
    let current = app.status as ApplicationStatus;
    const target: ApplicationStatus = "finalist";
    let guard = 0;
    while (current !== target && guard++ < 6) {
      const next = nextStage(current);
      if (!next) return { error: `${app.ref} can't reach finalist from ${current}` };
      const check = applicationTransition(current, next, session.role);
      if (!check.ok) return { error: `${app.ref}: ${check.error}` };
      await db.update(applications).set({ status: next, updatedAt: new Date() }).where(eq(applications.id, id));
      await auditApplication({
        applicationId: id,
        actor: session.name,
        actorRole: session.role,
        fromStatus: current,
        toStatus: next,
        reason: `Finalist selection: ${reason}`,
      });
      current = next;
    }
    if (notify) {
      const cand = (await db.select().from(candidates).where(eq(candidates.id, app.candidateId)).limit(1))[0];
      if (cand)
        await sendCandidateComm({
          candidateId: cand.id,
          applicationId: id,
          email: cand.email,
          template: "finalist_notification",
          vars: { firstName: cand.firstName ?? undefined, vacancyTitle: vacancy.title, applicationRef: app.ref },
          sentBy: session.name,
        });
    }
  }
  await logEvent({
    actor: session.name,
    actorRole: session.role,
    action: "finalists_submitted",
    vacancyId,
    detail: `${ids.length} finalist(s): ${ids.join(", ")} — ${reason}`,
  });
  revalidatePath(`/admin/recruitment/${vacancyId}`);
  revalidatePath(`/admin/recruitment/${vacancyId}/compare`);
  return { error: undefined };
}

export async function ownerDecisionAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await requireRecruit("owner");
  const vacancyId = Number(formData.get("vacancyId"));
  const decision = String(formData.get("decision"));
  const targetId = Number(formData.get("applicationId")) || null;
  const reason = String(formData.get("reason") ?? "").trim();
  const panelTopId = Number(formData.get("panelTopId")) || null;
  const notify = formData.get("notify") === "on";

  const vacancy = await getVacancy(vacancyId);
  if (!vacancy) return { error: "Vacancy not found" };
  const db = await getDb();
  const finalists = await db
    .select()
    .from(applications)
    .where(and(eq(applications.vacancyId, vacancyId), eq(applications.status, "finalist")));
  if (finalists.length === 0) return { error: "No finalists are awaiting a decision" };

  async function move(appId: number, to: ApplicationStatus, moveReason: string, override = false) {
    const app = finalists.find((f) => f.id === appId);
    if (!app) return;
    const now = new Date();
    const terminal = ["hired", "reserve", "rejected"].includes(to);
    await db
      .update(applications)
      .set({
        status: to,
        updatedAt: now,
        ...(terminal && !app.legalHold && vacancy ? { retentionExpiry: retentionExpiry(now, vacancy.retentionDays) } : {}),
      })
      .where(eq(applications.id, appId));
    await auditApplication({
      applicationId: appId,
      actor: session.name,
      actorRole: session.role,
      fromStatus: "finalist",
      toStatus: to,
      reason: moveReason,
      isOverride: override,
    });
  }

  async function notifyCandidate(appId: number, template: CommTemplate) {
    if (!notify) return;
    const app = finalists.find((f) => f.id === appId);
    if (!app || !vacancy) return;
    const cand = (await db.select().from(candidates).where(eq(candidates.id, app.candidateId)).limit(1))[0];
    if (cand)
      await sendCandidateComm({
        candidateId: cand.id,
        applicationId: appId,
        email: cand.email,
        template,
        vars: { firstName: cand.firstName ?? undefined, vacancyTitle: vacancy.title, applicationRef: app.ref },
        sentBy: session.name,
      });
  }

  if (decision === "approve") {
    if (!targetId || !finalists.some((f) => f.id === targetId)) return { error: "Pick the candidate to approve" };
    // choosing against the panel's recommendation demands a written reason
    if (panelTopId && targetId !== panelTopId && reason.length < 5)
      return { error: "You're choosing a different candidate than the panel's top score — a short written reason is required" };
    await move(targetId, "conditional_offer", reason || "Owner approved for offer");
    await notifyCandidate(targetId, "offer_message");
  } else if (decision === "reserve") {
    if (!targetId || !finalists.some((f) => f.id === targetId)) return { error: "Pick the candidate to reserve" };
    if (reason.length < 5) return { error: "A written reason is required for the reserve list" };
    await move(targetId, "reserve", reason);
    await notifyCandidate(targetId, "reserve_message");
  } else if (decision === "reject_all") {
    if (reason.length < 5) return { error: "A written reason is required to reject all finalists" };
    for (const f of finalists) {
      await move(f.id, "rejected", reason);
      await notifyCandidate(f.id, "rejection");
    }
  } else if (decision === "return_to_hr") {
    if (reason.length < 5) return { error: "Tell HR what needs another look" };
    for (const f of finalists) {
      await move(f.id, "final_assessment", `Returned to HR: ${reason}`, true);
    }
  } else if (decision === "request_info") {
    if (reason.length < 5) return { error: "Say what information you need" };
    await db.insert(applicationNotes).values({
      applicationId: targetId ?? finalists[0].id,
      author: `${session.name} (${session.role})`,
      note: `OWNER REQUEST FOR INFORMATION: ${reason}`,
    });
  } else {
    return { error: "Unknown decision" };
  }

  await logEvent({
    actor: session.name,
    actorRole: session.role,
    action: `owner_decision: ${decision}`,
    vacancyId,
    applicationId: targetId,
    detail: reason || null,
  });
  revalidatePath(`/admin/recruitment/${vacancyId}`);
  revalidatePath(`/admin/recruitment/${vacancyId}/compare`);
  return { error: undefined };
}

/* ── retention date (HR-adjustable, deletion stays owner-reviewed) ─ */

export async function setRetentionDateAction(formData: FormData) {
  const session = await requireRecruit("owner", "hr");
  const id = Number(formData.get("id"));
  const date = new Date(String(formData.get("retentionDate") ?? ""));
  const app = await getApplication(id);
  if (!app || Number.isNaN(date.getTime())) return;
  const db = await getDb();
  await db.update(applications).set({ retentionExpiry: date, updatedAt: new Date() }).where(eq(applications.id, id));
  await logEvent({
    actor: session.name,
    actorRole: session.role,
    action: "retention_date_set",
    applicationId: id,
    vacancyId: app.vacancyId,
    detail: date.toISOString().slice(0, 10),
  });
  revalidatePath(`/admin/recruitment/app/${id}`);
}
