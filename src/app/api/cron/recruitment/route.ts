import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { applications, candidates, interviews, vacancies } from "@/lib/db/schema";
import { sendCandidateComm } from "@/lib/recruitment/comms";
import { logEvent } from "@/lib/recruitment/repo";

export const maxDuration = 60;

/** Daily housekeeping (Vercel cron, 07:00 UTC): reminder emails for
 *  interviews happening in the next 24 hours. Never deletes anything. */
export async function GET(req: NextRequest) {
  // Vercel sends Authorization: Bearer CRON_SECRET when the env var is set
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const db = await getDb();
  const now = new Date();
  const dayAhead = new Date(now.getTime() + 24 * 3600_000);
  const due = await db
    .select()
    .from(interviews)
    .where(
      and(
        inArray(interviews.status, ["scheduled", "rescheduled"]),
        gte(interviews.scheduledAt, now),
        lte(interviews.scheduledAt, dayAhead),
        isNull(interviews.reminderSentAt),
      ),
    );

  let sent = 0;
  for (const iv of due) {
    const rows = await db
      .select({ app: applications, cand: candidates, vacancy: vacancies })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
      .where(eq(applications.id, iv.applicationId))
      .limit(1);
    const row = rows[0];
    if (!row) continue;
    await sendCandidateComm({
      candidateId: row.cand.id,
      applicationId: row.app.id,
      email: row.cand.email,
      template: "interview_reminder",
      vars: {
        firstName: row.cand.firstName ?? undefined,
        vacancyTitle: row.vacancy.title,
        applicationRef: row.app.ref,
        interviewDate: iv.scheduledAt.toLocaleString("en-GB", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Africa/Lagos",
        }),
        interviewMode: iv.mode === "physical" ? "in person" : "online",
        interviewLocation: iv.locationOrLink || "to be confirmed",
      },
    });
    await db.update(interviews).set({ reminderSentAt: now }).where(eq(interviews.id, iv.id));
    await logEvent({
      actor: "system",
      actorRole: "system",
      action: "interview_reminder_sent",
      applicationId: iv.applicationId,
      vacancyId: row.app.vacancyId,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, remindersSent: sent });
}
