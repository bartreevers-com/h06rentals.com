import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getCandidate } from "@/lib/candidate-auth";
import { getDb } from "@/lib/db";
import { applications } from "@/lib/db/schema";
import { draftApplication, getVacancy, nextApplicationRef, vacancyIsOpen } from "@/lib/recruitment/repo";

const DraftSchema = z.object({
  vacancyId: z.number().int(),
  form: z.record(z.string(), z.unknown()),
});

/** Autosave: create-or-update the candidate's draft for a vacancy.
 *  Submitted applications are never touched here. */
export async function PUT(req: NextRequest) {
  const candidate = await getCandidate();
  if (!candidate) return NextResponse.json({ error: "Please verify your email first" }, { status: 401 });

  const parsed = DraftSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid draft" }, { status: 400 });

  const vacancy = await getVacancy(parsed.data.vacancyId);
  if (!vacancy) return NextResponse.json({ error: "Vacancy not found" }, { status: 404 });
  if (!vacancyIsOpen(vacancy))
    return NextResponse.json({ error: "Applications for this vacancy are closed" }, { status: 409 });

  const db = await getDb();
  const existing = await draftApplication(vacancy.id, candidate.id);

  if (existing) {
    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "You've already submitted for this vacancy", ref: existing.ref, submitted: true },
        { status: 409 },
      );
    }
    await db
      .update(applications)
      .set({ form: parsed.data.form, updatedAt: new Date() })
      .where(eq(applications.id, existing.id));
    return NextResponse.json({ ok: true, applicationId: existing.id });
  }

  const ref = await nextApplicationRef();
  const [created] = await db
    .insert(applications)
    .values({
      ref,
      vacancyId: vacancy.id,
      candidateId: candidate.id,
      status: "draft",
      form: parsed.data.form,
    })
    .returning();
  return NextResponse.json({ ok: true, applicationId: created.id });
}
