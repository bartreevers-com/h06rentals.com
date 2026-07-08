import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/Reveal";
import { Turntable360 } from "@/components/Turntable360";
import { VehicleGallery } from "@/components/VehicleGallery";
import { formatNaira } from "@/lib/quote";
import { getRate, getVehicle, listVehicles } from "@/lib/repo";
import { waLink, WA_PRESETS } from "@/lib/whatsapp-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  if (!vehicle) return { title: "Vehicle not found" };
  return {
    title: `${vehicle.name} — Chauffeur-Driven Hire, Lagos`,
    description: `${vehicle.tagline}. Book the ${vehicle.name} with a professional H06 chauffeur in Lagos.`,
  };
}

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  if (!vehicle) notFound();
  const rate = await getRate(slug);
  const isVip = vehicle.tier === "vip";

  const others = (await listVehicles({ tier: vehicle.tier as "core" | "vip" }))
    .filter((v) => v.slug !== slug)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 lg:px-8">
      <nav className="mb-6 text-xs text-muted" aria-label="Breadcrumb">
        <Link href={isVip ? "/vip" : "/fleet"} className="hover:text-cream-dim">
          {isVip ? "VIP Wing" : "The Fleet"}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cream-dim">{vehicle.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <Reveal>
            {vehicle.frames360.length >= 8 ? (
              <Turntable360
                frames={vehicle.frames360}
                category={vehicle.category}
                vehicleName={vehicle.name}
                imageUrl={vehicle.imageUrl}
              />
            ) : vehicle.gallery.length > 0 ? (
              <VehicleGallery images={vehicle.gallery} vehicleName={vehicle.name} />
            ) : (
              <Turntable360
                frames={vehicle.frames360}
                category={vehicle.category}
                vehicleName={vehicle.name}
                imageUrl={vehicle.imageUrl}
              />
            )}
          </Reveal>

          <Reveal className="mt-8">
            <h1 className="display text-3xl text-cream md:text-4xl">{vehicle.name}</h1>
            <p className="mt-2 text-sm text-cream-dim">{vehicle.tagline}</p>
            {vehicle.description && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{vehicle.description}</p>
            )}
          </Reveal>

          <Reveal className="mt-8">
            <div className="flex flex-wrap gap-2">
              {vehicle.features.map((f) => (
                <span key={f} className="glass-subtle px-3.5 py-1.5 text-xs text-cream-dim">
                  {f}
                </span>
              ))}
            </div>
          </Reveal>

          {vehicle.bestFor.length > 0 && (
            <Reveal className="mt-8">
              <h2 className="eyebrow mb-3">Best for</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {vehicle.bestFor.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm text-cream-dim">
                    <span className={`h-1.5 w-1.5 rounded-full ${isVip ? "bg-champagne" : "bg-emerald-glow"}`} />
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>

        {/* rate card / booking rail */}
        <div>
          <Reveal>
            <div className={`${isVip ? "glass-bronze" : "glass-emerald"} sticky top-24 p-6`}>
              {rate ? (
                <>
                  <h2 className="eyebrow mb-4">Rate card</h2>
                  <dl className="space-y-3 text-sm">
                    {[
                      ["Airport transfer", rate.airportTransfer],
                      ["12-hour hire", rate.twelveHours],
                      ["24-hour hire", rate.twentyFourHours],
                      ["Multi-day, per day", rate.multiDayDaily],
                      ["Interstate base, per day", rate.interstateBase],
                    ].map(([label, amount]) => (
                      <div key={label as string} className="flex items-center justify-between">
                        <dt className="text-cream-dim">{label}</dt>
                        <dd className="font-medium text-cream">{formatNaira(amount as number)}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-xs leading-relaxed text-muted">
                    Chauffeur, and vehicle prep included. Interstate trips add a per-state surcharge
                    shown before payment. {vehicle.baggageCapacity} bags included, excess at{" "}
                    {formatNaira(vehicle.excessLuggageCharge)}/piece.
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    <Link href={`/book?vehicle=${vehicle.slug}`} className="btn btn-primary btn-lg w-full">
                      Book this vehicle
                    </Link>
                    <a
                      href={waLink(`Hello H06 Rentals! I'd like to check availability for the ${vehicle.name}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp btn-md w-full"
                    >
                      Check availability on WhatsApp
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="eyebrow eyebrow-bronze mb-4">Concierge priced</h2>
                  <p className="text-sm leading-relaxed text-cream-dim">
                    The {vehicle.name} is prepared per engagement — pricing depends on occasion,
                    route and protocol requirements. The concierge responds fast.
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    <a
                      href={waLink(WA_PRESETS.vip(vehicle.name))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-bronze btn-lg w-full"
                    >
                      Request this vehicle
                    </a>
                    <Link href={`/book?trip=custom&vehicle=${vehicle.slug}`} className="btn btn-ghost btn-md w-full">
                      Build a custom trip
                    </Link>
                  </div>
                </>
              )}
              {!vehicle.isAvailable && (
                <p className="mt-4 rounded-lg border border-cream/20 bg-ink/40 p-3 text-xs text-cream-dim">
                  This vehicle is currently engaged. The concierge can suggest dates or an equivalent car.
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      {others.length > 0 && (
        <Reveal className="mt-20">
          <h2 className="display text-2xl text-cream">Also on the floor</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {others.map((v) => (
              <Link
                key={v.slug}
                href={`/fleet/${v.slug}`}
                className="glass-subtle group p-5 transition-colors hover:border-emerald-glow/40"
              >
                <p className="text-sm font-medium text-cream group-hover:text-emerald-glow">{v.name}</p>
                <p className="mt-1 text-xs text-muted line-clamp-1">{v.tagline}</p>
              </Link>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}
