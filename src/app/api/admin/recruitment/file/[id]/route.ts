import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { applicationFiles, applications, fileAccessLog, vacancies } from "@/lib/db/schema";
import { isRecruitRole, staffCanSeeVacancy } from "@/lib/recruitment/repo";
import { signedUrl } from "@/lib/recruitment/storage";

/** Staff access to candidate files: role-checked, panel-checked, logged,
 *  and served via a short-lived signed URL — never a public link. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isRecruitRole(session.role))
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const { id } = await ctx.params;

  const db = await getDb();
  const rows = await db
    .select({ file: applicationFiles, app: applications, vacancy: vacancies })
    .from(applicationFiles)
    .innerJoin(applications, eq(applicationFiles.applicationId, applications.id))
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .where(eq(applicationFiles.id, Number(id)))
    .limit(1);
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const actor = `${session.name} (${session.role})`;
  if (!staffCanSeeVacancy(session.role, session.userId, row.vacancy)) {
    await db.insert(fileAccessLog).values({ fileId: row.file.id, actor, action: "denied" });
    return NextResponse.json({ error: "Not authorised for this vacancy" }, { status: 403 });
  }

  const url = await signedUrl(row.file.storagePath, 300);
  await db.insert(fileAccessLog).values({ fileId: row.file.id, actor, action: "signed_url" });
  return NextResponse.redirect(new URL(url, req.nextUrl.origin));
}
