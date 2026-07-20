import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getCandidate } from "@/lib/candidate-auth";
import { getDb } from "@/lib/db";
import { applicationAmendments, applications, vacancies } from "@/lib/db/schema";
import { sendCandidateComm } from "@/lib/recruitment/comms";
import { sendEmail } from "@/lib/email";

const Schema = z.object({
  applicationId: z.number().int(),
  note: z.string().min(5).max(4000),
});

/** A candidate correction after submission: stored as a versioned amendment
 *  beside the frozen original — never an overwrite. */
export async function POST(req: NextRequest) {
  const candidate = await getCandidate();
  if (!candidate) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Please describe the correction (at least a sentence)" }, { status: 400 });

  const db = await getDb();
  const rows = await db
    .select({ app: applications, vacancy: vacancies })
    .from(applications)
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .where(and(eq(applications.id, parsed.data.applicationId), eq(applications.candidateId, candidate.id)))
    .limit(1);
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (row.app.status === "draft")
    return NextResponse.json({ error: "Drafts can be edited directly — no correction needed" }, { status: 400 });
  if (["withdrawn", "rejected"].includes(row.app.status))
    return NextResponse.json({ error: "This application is closed" }, { status: 409 });

  await db.insert(applicationAmendments).values({
    applicationId: row.app.id,
    content: { correction: parsed.data.note },
    note: parsed.data.note,
  });

  await sendCandidateComm({
    candidateId: candidate.id,
    applicationId: row.app.id,
    email: candidate.email,
    template: "correction_confirmation",
    vars: { firstName: candidate.firstName ?? undefined, applicationRef: row.app.ref },
  });

  await sendEmail({
    to: process.env.ADMIN_NOTIFY_EMAIL ?? "hello@h06rentals.com",
    subject: `Correction on ${row.app.ref} (${row.vacancy.title})`,
    text: `${candidate.email} filed a correction on ${row.app.ref}:\n\n${parsed.data.note}`,
  });

  return NextResponse.json({ ok: true });
}
