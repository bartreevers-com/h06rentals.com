import type { Metadata } from "next";
import { launchGate } from "@/lib/launch-gate";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/Reveal";
import { Turntable360 } from "@/components/Turntable360";
import { VehicleGallery } from "@/components/VehicleGallery";
import { formatNaira } from "@/lib/quote";
import { getRate, getVehicle, listRates, listVehicles } from "@/lib/repo";
import { formatDay, getBusyMap, suggestAlternative } from "@/lib/availability";
import { SourceVehicleForm } from "@/components/SourceVehicleForm";
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
  const title = `${vehicle.name} — Chauffeur-Driven Hire, Lagos`;
  const description = `${vehicle.tagline}. Book the ${vehicle.name} with a professional H06 chauffeur in Lagos.`;
  // share previews show this exact car: studio photo when we have one
  const image = vehicle.gallery[0]?.src ?? "/images/hero-lagos-bridge.webp";
  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  await launchGate();
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  if (!vehicle) notFound();
  const [rate, allRates, busyMap, tierVehicles] = await Promise.all([
    getRate(slug),
    listRates(),
    getBusyMap(),
    listVehicles({ tier: vehicle.tier as "core" | "vip" }),
  ]);
  const isVip = vehicle.tier === "vip";

  const busyUntil = busyMap[slug] ?? null;
  const unavailable = Boolean(busyUntil) || !vehicle.isAvailable;
  const suggestion = unavailable
    ? suggestAlternative(vehicle, tierVehicles, allRates, busyMap)
    : null;

  const others = tierVehicles.filter((v) => v.slug !== slug).slice(0, 3);

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
                slug={vehicle.slug}
                tint={isVip ? "bronze" : "green"}
              />
            ) : vehicle.gallery.length > 0 ? (
              <VehicleGallery images={vehicle.gallery} vehicleName={vehicle.name} />
            ) : (
              <Turntable360
                frames={vehicle.frames360}
                category={vehicle.category}
                vehicleName={vehicle.name}
                imageUrl={vehicle.imageUrl}
                slug={vehicle.slug}
                tint={isVip ? "bronze" : "green"}
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
                  {unavailable ? (
                    <div className="mt-6 flex flex-col gap-4">
                      <p className="rounded-lg border border-cream/20 bg-ink/50 px-4 py-3 text-center text-sm font-medium text-cream-dim">
                        {busyUntil
                          ? `Fully booked until ${formatDay(busyUntil)}`
                          : "Temporarily unavailable"}
                      </p>
                      {suggestion && (
                        <Link
                          href={`/fleet/${suggestion.slug}`}
                          className="glass-subtle block p-4 transition-colors hover:border-emerald-glow/40"
                        >
                          <p className="text-[0.65rem] uppercase tracking-wider text-emerald-glow">
                            The concierge recommends
                          </p>
                          <p className="mt-1 text-sm font-medium text-cream">{suggestion.name}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {suggestion.tagline} — available now →
                          </p>
                        </Link>
                      )}
                      <div className="border-t hairline pt-4">
                        <SourceVehicleForm vehicleSlug={vehicle.slug} vehicleName={vehicle.name} />
                      </div>
                    </div>
                  ) : (
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
                  )}
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
