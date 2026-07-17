import type { Metadata } from "next";
import { launchGate } from "@/lib/launch-gate";
import { Mark } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import { VehicleCard } from "@/components/VehicleCard";
import { listVehicles } from "@/lib/repo";
import { getBusyMap } from "@/lib/availability";
import { waLink, WA_PRESETS } from "@/lib/whatsapp-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VIP Wing — Exotic & Bespoke Vehicles, Lagos",
  description:
    "Lexus LX600, Mercedes G-Wagon, Range Rover, Rolls-Royce, Lamborghini Urus, armoured vehicles and luxury buses — concierge-arranged in Lagos.",
};

export default async function VipPage() {
  await launchGate();
  const [vehicles, busyMap] = await Promise.all([listVehicles({ tier: "vip", includeUnavailable: true }), getBusyMap()]);

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(168,126,74,0.16), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-28 lg:px-8">
        <Reveal>
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow eyebrow-bronze mb-3">By request only</p>
              <h1 className="display text-4xl text-cream md:text-5xl">The VIP Wing</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-cream-dim">
                The cars behind the glass. Each engagement is arranged personally — occasion,
                route, protocol and security considered — and priced by the concierge.
              </p>
            </div>
            <Mark variant="bronze" size={72} className="hidden md:block opacity-80" />
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v, i) => (
            <Reveal key={v.slug} delay={i * 0.05}>
              <VehicleCard vehicle={v} bronze busyUntil={busyMap[v.slug]} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-16">
          <div className="glass-bronze flex flex-col items-center gap-5 p-10 text-center">
            <h2 className="display max-w-lg text-2xl text-cream md:text-3xl">
              Tell us the occasion. We&apos;ll bring the car.
            </h2>
            <p className="max-w-md text-sm text-muted">
              Weddings, state visits, film productions, armoured movement — the concierge will
              confirm availability and a private quote.
            </p>
            <a
              href={waLink(WA_PRESETS.vip())}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-bronze btn-lg"
            >
              Speak with the concierge
            </a>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
