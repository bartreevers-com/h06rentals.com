import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  applicationAudit,
  applicationFiles,
  applications,
  candidates,
  vacancies,
  vacancyAudit,
  type Application,
  type Vacancy,
} from "../db/schema";
import type { StaffRecruitRole, VacancyStatus } from "./workflow";

/** Data access for the recruitment module. All permission checks happen in
 *  the actions layer before these run; these functions stay dumb and honest. */

export async function nextVacancyRef(): Promise<{ reference: string; slug: string }> {
  const db = await getDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(vacancies);
  const n = Number(count) + 1;
  return { reference: `H06-VAC-${String(n).padStart(4, "0")}`, slug: `vac-${String(n).padStart(4, "0")}` };
}

export async function nextApplicationRef(): Promise<string> {
  const db = await getDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(applications);
  return `APP-${String(Number(count) + 1).padStart(5, "0")}`;
}

export async function listVacancies(): Promise<Vacancy[]> {
  const db = await getDb();
  return db.select().from(vacancies).orderBy(desc(vacancies.createdAt));
}

export async function publishedVacancies(): Promise<Vacancy[]> {
  const db = await getDb();
  return db.select().from(vacancies).where(eq(vacancies.status, "published")).orderBy(desc(vacancies.createdAt));
}

export async function getVacancy(id: number): Promise<Vacancy | null> {
  const db = await getDb();
  const rows = await db.select().from(vacancies).where(eq(vacancies.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getVacancyBySlug(slug: string): Promise<Vacancy | null> {
  const db = await getDb();
  const rows = await db.select().from(vacancies).where(eq(vacancies.slug, slug)).limit(1);
  return rows[0] ?? null;
}

/** Applications a vacancy is currently open to (time window + status). */
export function vacancyIsOpen(v: Vacancy, now = new Date()): boolean {
  if (v.status !== "published") return false;
  if (v.opensAt && now < v.opensAt) return false;
  if (v.closesAt && now > v.closesAt) return false;
  return true;
}

export function vacancyHasApplicationsOpen(v: Vacancy): boolean {
  return ["published", "paused", "closed"].includes(v.status);
}

export async function auditVacancy(opts: {
  vacancyId: number;
  actor: string;
  actorRole: string;
  action: string;
  reason?: string | null;
  previousConfig?: unknown;
}) {
  const db = await getDb();
  await db.insert(vacancyAudit).values({
    vacancyId: opts.vacancyId,
    actor: opts.actor,
    actorRole: opts.actorRole,
    action: opts.action,
    reason: opts.reason ?? null,
    previousConfig: opts.previousConfig ?? null,
  });
}

export async function getApplication(id: number): Promise<Application | null> {
  const db = await getDb();
  const rows = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function candidateApplications(candidateId: number) {
  const db = await getDb();
  const rows = await db
    .select({ application: applications, vacancy: vacancies })
    .from(applications)
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.createdAt));
  return rows;
}

export async function vacancyApplications(vacancyId: number) {
  const db = await getDb();
  return db
    .select({ application: applications, candidate: candidates })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .where(and(eq(applications.vacancyId, vacancyId), sql`${applications.status} != 'draft'`))
    .orderBy(desc(applications.submittedAt));
}

export async function draftApplication(vacancyId: number, candidateId: number): Promise<Application | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(applications)
    .where(and(eq(applications.vacancyId, vacancyId), eq(applications.candidateId, candidateId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function auditApplication(opts: {
  applicationId: number;
  actor: string;
  actorRole: string;
  fromStatus: string;
  toStatus: string;
  reason?: string | null;
  isOverride?: boolean;
}) {
  const db = await getDb();
  await db.insert(applicationAudit).values({
    applicationId: opts.applicationId,
    actor: opts.actor,
    actorRole: opts.actorRole,
    fromStatus: opts.fromStatus,
    toStatus: opts.toStatus,
    reason: opts.reason ?? null,
    isOverride: Boolean(opts.isOverride),
  });
}

export async function applicationFilesFor(applicationId: number) {
  const db = await getDb();
  return db.select().from(applicationFiles).where(eq(applicationFiles.applicationId, applicationId));
}

/** Can this staff member see this vacancy's candidates? */
export function staffCanSeeVacancy(role: StaffRecruitRole, staffId: number, v: Vacancy): boolean {
  if (role === "owner" || role === "hr") return true;
  return (v.panel ?? []).includes(staffId);
}

export function isRecruitRole(role: string): role is StaffRecruitRole {
  return ["owner", "hr", "hiring_manager", "assessor"].includes(role);
}

export type { VacancyStatus };
