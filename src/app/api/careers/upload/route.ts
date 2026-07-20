import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { getCandidate } from "@/lib/candidate-auth";
import { getDb } from "@/lib/db";
import { applicationFiles, applications } from "@/lib/db/schema";
import { STORAGE_DRIVER, storeFile, validateUpload, deleteStoredFile } from "@/lib/recruitment/storage";
import { getVacancy, vacancyIsOpen } from "@/lib/recruitment/repo";

export const maxDuration = 60;

/** Candidate uploads for their own draft application. Multipart form-data:
 *  fields applicationId, kind; file field "file". Re-uploading a kind
 *  replaces the previous file (draft stage only). */
export async function POST(req: NextRequest) {
  const candidate = await getCandidate();
  if (!candidate) return NextResponse.json({ error: "Please verify your email first" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  const applicationId = Number(formData.get("applicationId"));
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  if (!applicationId || !(file instanceof File))
    return NextResponse.json({ error: "Missing file or application" }, { status: 400 });

  const db = await getDb();
  const apps = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.candidateId, candidate.id)))
    .limit(1);
  const app = apps[0];
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.status !== "draft")
    return NextResponse.json({ error: "This application is already submitted" }, { status: 409 });

  const vacancy = await getVacancy(app.vacancyId);
  if (!vacancy || !vacancyIsOpen(vacancy))
    return NextResponse.json({ error: "Applications are closed" }, { status: 409 });

  const check = validateUpload(kind, file.name, file.type, file.size);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const storagePath = `app-${app.id}/${kind}/${crypto.randomUUID()}-${safeName}`;

  try {
    await storeFile(storagePath, buffer, file.type);
  } catch (err) {
    console.error("[careers/upload]", err);
    return NextResponse.json({ error: "Upload failed — please try again" }, { status: 502 });
  }

  // replace any previous file of this kind on the draft
  const previous = await db
    .select()
    .from(applicationFiles)
    .where(and(eq(applicationFiles.applicationId, app.id), eq(applicationFiles.kind, kind)));
  for (const p of previous) {
    await deleteStoredFile(p.storagePath).catch(() => {});
    await db.delete(applicationFiles).where(eq(applicationFiles.id, p.id));
  }

  const [row] = await db
    .insert(applicationFiles)
    .values({
      applicationId: app.id,
      kind,
      filename: file.name,
      mime: file.type,
      sizeBytes: file.size,
      storagePath,
      storageDriver: STORAGE_DRIVER,
    })
    .returning();

  return NextResponse.json({ ok: true, fileId: row.id, filename: row.filename, kind });
}
