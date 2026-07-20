import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getCandidate } from "@/lib/candidate-auth";
import { getDb } from "@/lib/db";
import { applications, candidates } from "@/lib/db/schema";
import { sendCandidateComm } from "@/lib/recruitment/comms";
import {
  applicationFilesFor,
  auditApplication,
  draftApplication,
  getVacancy,
  vacancyIsOpen,
} from "@/lib/recruitment/repo";
import { sendEmail } from "@/lib/email";

const SubmitSchema = z.object({
  vacancyId: z.number().int(),
  form: z.record(z.string(), z.unknown()),
  privacyAcknowledged: z.literal(true),
  accuracyDeclared: z.literal(true),
  talentPoolConsent: z.boolean().default(false),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().min(7).max(20),
});

/** Final submission: validates required uploads and mandatory declarations,
 *  freezes the submitted version, confirms by email, notifies the team. */
export async function POST(req: NextRequest) {
  const candidate = await getCandidate();
  if (!candidate) return NextResponse.json({ error: "Please verify your email first" }, { status: 401 });

  const parsed = SubmitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Please complete the required declarations and details", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  const vacancy = await getVacancy(parsed.data.vacancyId);
  if (!vacancy) return NextResponse.json({ error: "Vacancy not found" }, { status: 404 });
  if (!vacancyIsOpen(vacancy))
    return NextResponse.json({ error: "The closing date for this vacancy has passed" }, { status: 409 });

  const draft = await draftApplication(vacancy.id, candidate.id);
  if (!draft) return NextResponse.json({ error: "No draft to submit — save your application first" }, { status: 400 });
  if (draft.status !== "draft")
    return NextResponse.json(
      { error: `You already submitted this application (${draft.ref})`, ref: draft.ref },
      { status: 409 },
    );

  // required questions answered?
  for (const q of vacancy.questions) {
    const answer = parsed.data.form[q.id];
    if (q.required && (answer === undefined || answer === null || String(answer).trim() === "")) {
      return NextResponse.json({ error: `Please answer: ${q.label}` }, { status: 400 });
    }
  }

  // required uploads present?
  const files = await applicationFilesFor(draft.id);
  const have = new Set(files.map((f) => f.kind));
  const need = vacancy.requiredDocs;
  for (const [kind, required] of Object.entries(need)) {
    if (required && !have.has(kind)) {
      const labels: Record<string, string> = {
        cv: "your CV",
        supporting: "a supporting document",
        video: "your video submission",
        audio: "your audio submission",
      };
      return NextResponse.json({ error: `Please upload ${labels[kind] ?? kind} before submitting` }, { status: 400 });
    }
  }

  // eligibility screening on flagged yes/no questions
  const eligibilityFailed = vacancy.questions.some(
    (q) => q.eligibility && q.type === "yes_no" && parsed.data.form[q.id] !== "yes",
  );

  const db = await getDb();
  const now = new Date();
  const snapshot = {
    form: parsed.data.form,
    files: files.map((f) => ({ id: f.id, kind: f.kind, filename: f.filename })),
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone,
    email: candidate.email,
    submittedAt: now.toISOString(),
  };

  await db
    .update(candidates)
    .set({ firstName: parsed.data.firstName, lastName: parsed.data.lastName, phone: parsed.data.phone })
    .where(eq(candidates.id, candidate.id));

  const [updated] = await db
    .update(applications)
    .set({
      status: "submitted",
      form: parsed.data.form,
      submitted: snapshot,
      submittedAt: now,
      privacyVersion: vacancy.privacyVersion,
      privacyAcknowledgedAt: now,
      talentPoolConsent: parsed.data.talentPoolConsent,
      talentPoolConsentAt: parsed.data.talentPoolConsent ? now : null,
      eligibilityResult: eligibilityFailed ? "fail" : "pass",
      updatedAt: now,
    })
    .where(eq(applications.id, draft.id))
    .returning();

  await auditApplication({
    applicationId: draft.id,
    actor: candidate.email,
    actorRole: "applicant",
    fromStatus: "draft",
    toStatus: "submitted",
    reason: "Candidate submitted application",
  });

  await sendCandidateComm({
    candidateId: candidate.id,
    applicationId: draft.id,
    email: candidate.email,
    template: "submission_confirmation",
    vars: { firstName: parsed.data.firstName, vacancyTitle: vacancy.title, applicationRef: updated.ref },
  });

  await sendEmail({
    to: process.env.ADMIN_NOTIFY_EMAIL ?? "hello@h06rentals.com",
    subject: `New application ${updated.ref} — ${vacancy.title}`,
    text: `${parsed.data.firstName} ${parsed.data.lastName} (${candidate.email}, ${parsed.data.phone}) applied for ${vacancy.title}.\nEligibility screen: ${eligibilityFailed ? "FAIL — review before shortlisting" : "pass"}.\nReview in the back office → Recruitment.`,
  });

  return NextResponse.json({ ok: true, ref: updated.ref });
}
