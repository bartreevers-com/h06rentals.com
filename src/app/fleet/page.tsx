import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { VehicleCard } from "@/components/VehicleCard";
import { formatNaira } from "@/lib/quote";
import { listRates, listVehicles } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Fleet — Luxury SUVs with Chauffeur, Lagos",
  description:
    "Explore the H06 instant-booking fleet: Toyota Prado, Lexus GX460 and Hilux V6, chauffeur-driven with fixed transparent rates for airport, city and interstate trips.",
};

export default async function FleetPage() {
  const [vehicles, rates] = await Promise.all([listVehicles({ tier: "core", includeUnavailable: true }), listRates()]);
  const rateFor = (slug: string) => rates.find((r) => r.vehicleSlug === slug) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 lg:px-8">
      <Reveal>
        <p className="eyebrow eyebrow-emerald mb-3">The showroom floor</p>
        <h1 className="display text-4xl text-cream md:text-5xl">The Fleet</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          Every vehicle is chauffeur-driven, fuelled and detailed before arrival. Rates are fixed
          and transparent — what you see is what the concierge confirms.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v, i) => (
          <Reveal key={v.slug} delay={i * 0.05}>
            <VehicleCard vehicle={v} rate={rateFor(v.slug)} />
          </Reveal>
        ))}
      </div>

      {/* rate comparison */}
      <Reveal className="mt-16">
        <h2 className="display text-2xl text-cream">Compare at a glance</h2>
        <div className="glass mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b hairline text-left">
                <th className="p-4 font-medium text-muted">Vehicle</th>
                <th className="p-4 font-medium text-muted">Airport</th>
                <th className="p-4 font-medium text-muted">12 hours</th>
                <th className="p-4 font-medium text-muted">24 hours</th>
                <th className="p-4 font-medium text-muted">Interstate / day</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const r = rateFor(v.slug);
                if (!r) return null;
                return (
                  <tr key={v.slug} className="border-b hairline last:border-0">
                    <td className="p-4 text-cream">{v.name}</td>
                    <td className="p-4 text-cream-dim">{formatNaira(r.airportTransfer)}</td>
                    <td className="p-4 text-cream-dim">{formatNaira(r.twelveHours)}</td>
                    <td className="p-4 text-cream-dim">{formatNaira(r.twentyFourHours)}</td>
                    <td className="p-4 text-cream-dim">{formatNaira(r.interstateBase)}+</td>
                    <td className="p-4 text-right">
                      <Link href={`/book?vehicle=${v.slug}`} className="btn btn-primary btn-sm">
                        Book
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Interstate fares add a per-state surcharge — the booking flow shows the exact figure before you pay.
        </p>
      </Reveal>

      <Reveal className="mt-16">
        <div className="glass-bronze flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div>
            <p className="eyebrow eyebrow-bronze mb-2">Beyond the floor</p>
            <h2 className="display text-2xl text-cream">Looking for something rarer?</h2>
            <p className="mt-2 text-sm text-muted">
              LX600 · G-Wagon · Range Rover · Rolls-Royce · Urus · Armoured · Luxury buses
            </p>
          </div>
          <Link href="/vip" className="btn btn-bronze btn-md shrink-0">
            Enter the VIP wing
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
