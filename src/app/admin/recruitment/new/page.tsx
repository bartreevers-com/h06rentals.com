import Link from "next/link";
import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { hasRole } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { staffUsers } from "@/lib/db/schema";
import { createVacancyAction } from "../actions";
import { VacancyForm } from "../VacancyForm";

export const dynamic = "force-dynamic";

export default async function NewVacancyPage() {
  const session = await hasRole("owner", "hr");
  if (!session) redirect("/admin");

  const db = await getDb();
  const panelOptions = await db
    .select({ id: staffUsers.id, name: staffUsers.name, role: staffUsers.role })
    .from(staffUsers)
    .where(inArray(staffUsers.role, ["hiring_manager", "assessor", "hr"]));

  return (
    <div className="max-w-3xl">
      <Link href="/admin/recruitment" className="text-xs uppercase tracking-widest text-muted hover:text-cream">
        ← Recruitment
      </Link>
      <h1 className="display mt-4 text-2xl text-cream">New vacancy</h1>
      <p className="mt-1 text-sm text-muted">
        Saves as a draft. The flow after that: internal review → Owner approval → publish.
      </p>
      <div className="glass mt-6 p-6">
        <VacancyForm action={createVacancyAction} panelOptions={panelOptions} />
      </div>
    </div>
  );
}
