import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { listAddOns } from "@/lib/repo";
import { updateAddOnAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminAddOns() {
  if (!(await isAdmin())) redirect("/admin");
  const rows = await listAddOns(false);

  return (
    <div>
      <h1 className="display text-2xl text-cream">Add-ons</h1>
      <p className="mt-1 text-sm text-muted">
        Set prices (leave blank for &ldquo;custom quote&rdquo;) and control which add-ons appear in the booking flow.
      </p>

      <div className="mt-6 space-y-3">
        {rows.map((a) => (
          <form key={a.slug} action={updateAddOnAction} className="glass-subtle flex flex-wrap items-end gap-4 p-4">
            <input type="hidden" name="slug" value={a.slug} />
            <div className="min-w-48 flex-1">
              <p className="text-sm font-medium text-cream">{a.label}</p>
              <p className="mt-0.5 text-xs text-muted">{a.description}</p>
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-muted">Price ₦ (blank = quote)</label>
              <input
                name="priceNgn"
                type="number"
                min={0}
                step={1000}
                className="field !w-36 !py-2 text-sm"
                defaultValue={a.priceNgn ?? ""}
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-cream-dim">
              <input type="checkbox" name="isActive" defaultChecked={a.isActive} className="accent-emerald" />
              Active
            </label>
            <button className="btn btn-ghost btn-sm">Save</button>
          </form>
        ))}
      </div>
    </div>
  );
}
