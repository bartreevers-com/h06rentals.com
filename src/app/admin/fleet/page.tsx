import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { listRates, listVehicles } from "@/lib/repo";
import { toggleVehicleAction, updateRatesAction, updateVehicleAction } from "../actions";

export const dynamic = "force-dynamic";

const RATE_FIELDS = [
  ["airportTransfer", "Airport"],
  ["twelveHours", "12 hrs"],
  ["twentyFourHours", "24 hrs"],
  ["multiDayDaily", "Multi-day/day"],
  ["interstateBase", "Interstate/day"],
  ["interstateChauffeur", "Chauffeur int."],
] as const;

export default async function AdminFleet() {
  if (!(await isAdmin())) redirect("/admin");
  const [vehicles, rates] = await Promise.all([listVehicles({ includeUnavailable: true }), listRates()]);

  return (
    <div>
      <h1 className="display text-2xl text-cream">Fleet &amp; Rates</h1>
      <p className="mt-1 text-sm text-muted">
        Toggle availability, adjust taglines and image URLs, and edit the rate card. Changes go live immediately.
      </p>

      <div className="mt-6 space-y-4">
        {vehicles.map((v) => {
          const r = rates.find((x) => x.vehicleSlug === v.slug);
          return (
            <details key={v.slug} className="glass-subtle overflow-hidden">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-medium text-cream">{v.name}</span>
                <span className="text-xs uppercase tracking-wider text-muted">{v.tier}</span>
                <span className="ml-auto flex items-center gap-3">
                  <span className={`text-xs ${v.isAvailable ? "text-emerald-glow" : "text-red-300"}`}>
                    {v.isAvailable ? "Available" : "Unavailable"}
                  </span>
                  <form action={toggleVehicleAction}>
                    <input type="hidden" name="slug" value={v.slug} />
                    <button className="btn btn-ghost btn-sm">
                      {v.isAvailable ? "Mark unavailable" : "Mark available"}
                    </button>
                  </form>
                </span>
              </summary>

              <div className="space-y-5 border-t hairline p-4">
                <form action={updateVehicleAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input type="hidden" name="slug" value={v.slug} />
                  <div>
                    <label className="field-label">Tagline</label>
                    <input name="tagline" className="field !py-2 text-sm" defaultValue={v.tagline} />
                  </div>
                  <div>
                    <label className="field-label">Image URL (optional)</label>
                    <input name="imageUrl" className="field !py-2 text-sm" defaultValue={v.imageUrl ?? ""} placeholder="https://…" />
                  </div>
                  <button className="btn btn-ghost btn-sm self-end">Save</button>
                </form>

                {r && (
                  <form action={updateRatesAction}>
                    <input type="hidden" name="slug" value={v.slug} />
                    <p className="field-label">Rates (₦)</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {RATE_FIELDS.map(([key, label]) => (
                        <div key={key}>
                          <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-muted">
                            {label}
                          </label>
                          <input
                            name={key}
                            type="number"
                            min={0}
                            step={1000}
                            className="field !py-2 text-sm"
                            defaultValue={r[key]}
                          />
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-primary btn-sm mt-3">Update rates</button>
                  </form>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
