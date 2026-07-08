import Link from "next/link";
import type { Vehicle, VehicleRate } from "@/lib/db/schema";
import { formatNaira } from "@/lib/quote";
import { VehicleSketch } from "./VehicleSketch";

export function VehicleCard({
  vehicle,
  rate,
  bronze,
}: {
  vehicle: Vehicle;
  rate?: VehicleRate | null;
  bronze?: boolean;
}) {
  const href = `/fleet/${vehicle.slug}`;
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden ${bronze ? "glass-bronze" : "glass"} transition-transform duration-300 hover:-translate-y-1`}
    >
      <div className="relative stage-gradient" style={{ aspectRatio: "16/9" }}>
        <div className="mark-watermark" style={{ backgroundSize: "42%" }} />
        {vehicle.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.imageUrl}
            alt={vehicle.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <VehicleSketch
              slug={vehicle.slug}
              category={vehicle.category}
              name={vehicle.name}
              className="w-full max-w-md transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        )}
        {!vehicle.isAvailable && (
          <span className="absolute left-4 top-4 rounded-full bg-ink/80 px-3 py-1 text-xs text-cream-dim">
            Currently engaged
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="display text-lg text-cream">{vehicle.name}</h3>
            <p className="mt-1 text-sm text-muted line-clamp-1">{vehicle.tagline}</p>
          </div>
          {rate ? (
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-emerald-glow">{formatNaira(rate.twelveHours)}</p>
              <p className="text-[0.68rem] uppercase tracking-wider text-muted">12-hr hire</p>
            </div>
          ) : (
            <span className={`shrink-0 rounded-full px-3 py-1 text-[0.68rem] uppercase tracking-wider ${bronze ? "text-champagne border border-champagne/30" : "text-muted border hairline"}`}>
              Concierge priced
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>{vehicle.seats} seats · {vehicle.year}</span>
          <span className={`inline-flex items-center gap-1.5 font-medium ${bronze ? "text-champagne" : "text-emerald-glow"}`}>
            {rate ? "View & book" : "View & request"}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
