import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getCandidate } from "@/lib/candidate-auth";
import { getDb } from "@/lib/db";
import { applications, vacancies } from "@/lib/db/schema";
import { sendCandidateComm } from "@/lib/recruitment/comms";
import { auditApplication } from "@/lib/recruitment/repo";
import { retentionExpiry } from "@/lib/recruitment/workflow";
import { sendEmail } from "@/lib/email";

const Schema = z.object({ applicationId: z.number().int() });

/** A candidate withdrawing their own application, from any active stage. */
export async function POST(req: NextRequest) {
  const candidate = await getCandidate();
  if (!candidate) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const db = await getDb();
  const rows = await db
    .select({ app: applications, vacancy: vacancies })
    .from(applications)
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .where(and(eq(applications.id, parsed.data.applicationId), eq(applications.candidateId, candidate.id)))
    .limit(1);
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (["hired", "rejected", "withdrawn"].includes(row.app.status))
    return NextResponse.json({ error: `This application is already ${row.app.status}` }, { status: 409 });

  const now = new Date();
  await db
    .update(applications)
    .set({
      status: "withdrawn",
      withdrawnAt: now,
      retentionExpiry: retentionExpiry(now, row.vacancy.retentionDays),
      updatedAt: now,
    })
    .where(eq(applications.id, row.app.id));

  await auditApplication({
    applicationId: row.app.id,
    actor: candidate.email,
    actorRole: "applicant",
    fromStatus: row.app.status,
    toStatus: "withdrawn",
    reason: "Candidate withdrew their application",
  });

  await sendCandidateComm({
    candidateId: candidate.id,
    applicationId: row.app.id,
    email: candidate.email,
    template: "withdrawal_confirmation",
    vars: { firstName: candidate.firstName ?? undefined, vacancyTitle: row.vacancy.title, applicationRef: row.app.ref },
  });

  await sendEmail({
    to: process.env.ADMIN_NOTIFY_EMAIL ?? "hello@h06rentals.com",
    subject: `Application withdrawn — ${row.app.ref} (${row.vacancy.title})`,
    text: `${candidate.email} withdrew application ${row.app.ref}.`,
  });

  return NextResponse.json({ ok: true });
}
