import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCandidate } from "@/lib/candidate-auth";
import { getDb } from "@/lib/db";
import { applicationFiles, applications, fileAccessLog } from "@/lib/db/schema";
import { signedUrl } from "@/lib/recruitment/storage";

/** A candidate fetching a short-lived link to their OWN file. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const candidate = await getCandidate();
  if (!candidate) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;

  const db = await getDb();
  const rows = await db
    .select({ file: applicationFiles, app: applications })
    .from(applicationFiles)
    .innerJoin(applications, eq(applicationFiles.applicationId, applications.id))
    .where(eq(applicationFiles.id, Number(id)))
    .limit(1);
  const row = rows[0];
  if (!row || row.app.candidateId !== candidate.id) {
    if (row)
      await db.insert(fileAccessLog).values({ fileId: row.file.id, actor: candidate.email, action: "denied" });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await signedUrl(row.file.storagePath, 300);
  await db.insert(fileAccessLog).values({ fileId: row.file.id, actor: candidate.email, action: "signed_url" });
  return NextResponse.redirect(new URL(url, req.nextUrl.origin));
}
