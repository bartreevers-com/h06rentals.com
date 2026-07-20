import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { staffUsers } from "@/lib/db/schema";
import { hasRole } from "@/lib/admin-auth";
import { setStaffRoleAction, toggleStaffAction } from "../actions";
import { CreateStaffForm, ResetPasswordForm } from "./TeamForms";

export const dynamic = "force-dynamic";

const ROLE_TONE: Record<string, string> = {
  admin: "border-emerald-glow/40 text-emerald-glow",
  hr: "border-emerald-glow/40 text-emerald-glow",
  sales: "border-cream/25 text-cream-dim",
  driver: "border-cream/25 text-cream-dim",
  hiring_manager: "border-cream/25 text-cream-dim",
  assessor: "border-cream/25 text-cream-dim",
  staff: "border-cream/15 text-muted",
};

const ROLES: [string, string][] = [
  ["admin", "Admin"],
  ["sales", "Sales"],
  ["driver", "Driver"],
  ["hr", "HR"],
  ["hiring_manager", "Hiring manager"],
  ["assessor", "Assessor"],
  ["staff", "Staff (no sign-in)"],
];

export default async function AdminTeam() {
  if (!(await hasRole("owner"))) redirect("/admin");
  const db = await getDb();
  const rows = await db.select().from(staffUsers).orderBy(asc(staffUsers.role), asc(staffUsers.name));

  return (
    <div>
      <h1 className="display text-2xl text-cream">Team</h1>
      <p className="mt-1 text-sm text-muted">
        Owner-only. One sign-in page for everyone — the role decides what they see.
        Admin: everything except this page. Sales: bookings &amp; enquiries.
        Driver: their assigned trips.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {rows.length === 0 && (
            <div className="glass-subtle p-8 text-center text-sm text-muted">
              No staff accounts yet — add your first team member on the right.
              The owner password keeps working regardless.
            </div>
          )}
          {rows.map((u) => (
            <div key={u.id} className="glass-subtle p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-cream">{u.name}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wider ${ROLE_TONE[u.role]}`}>
                  {u.role}
                </span>
                <span className="text-xs text-muted">{u.phone}{u.email ? ` · ${u.email}` : ""}</span>
                <span className={`ml-auto text-xs ${u.isActive ? "text-emerald-glow" : "text-red-300"}`}>
                  {u.isActive ? "Active" : "Deactivated"}
                </span>
                <form action={toggleStaffAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="btn btn-ghost btn-sm">{u.isActive ? "Deactivate" : "Reactivate"}</button>
                </form>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted hover:text-cream-dim">Reset password</summary>
                <ResetPasswordForm userId={u.id} />
              </details>
              <details className="mt-1.5">
                <summary className="cursor-pointer text-xs text-muted hover:text-cream-dim">Change role</summary>
                <form action={setStaffRoleAction} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" className="field max-w-56" defaultValue={u.role}>
                    {ROLES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <button className="btn btn-ghost btn-sm">Update role</button>
                </form>
                <p className="mt-1.5 text-[11px] text-muted">
                  Takes effect on their next sign-in (an open session keeps the old role for up to 12 hours).
                </p>
              </details>
            </div>
          ))}
        </div>

        <div className="glass h-fit p-6">
          <h2 className="eyebrow mb-4">Add a team member</h2>
          <CreateStaffForm />
        </div>
      </div>
    </div>
  );
}
