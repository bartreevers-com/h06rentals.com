"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { applicationNotes, applications, applicationFiles, candidates, vacancies } from "@/lib/db/schema";
import { getSession, type Session } from "@/lib/admin-auth";
import {
  applicationTransition,
  GUARDED_VACANCY_FIELDS,
  retentionExpiry,
  vacancyTransition,
  type ApplicationStatus,
  type StaffRecruitRole,
  type VacancyStatus,
} from "@/lib/recruitment/workflow";
import {
  auditApplication,
  auditVacancy,
  getApplication,
  getVacancy,
  isRecruitRole,
  nextVacancyRef,
  staffCanSeeVacancy,
  vacancyHasApplicationsOpen,
} from "@/lib/recruitment/repo";
import { COMM_TEMPLATES, sendCandidateComm, type CommTemplate } from "@/lib/recruitment/comms";
import { deleteStoredFile } from "@/lib/recruitment/storage";

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
