import Image from "next/image";
import Link from "next/link";
import { Mark } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import { VehicleCard } from "@/components/VehicleCard";
import { formatNaira } from "@/lib/quote";
import { listRates, listVehicles } from "@/lib/repo";
import { waLink, WA_PRESETS } from "@/lib/whatsapp-client";

export const dynamic = "force-dynamic";

const TRIP_DOORS = [
  { trip: "airport_pickup", label: "Airport pickup", note: "From ₦100,000" },
  { trip: "12hrs", label: "12-hour hire", note: "Half-day, chauffeur-driven" },
  { trip: "24hrs", label: "24-hour hire", note: "Full-day, chauffeur-driven" },
  { trip: "interstate", label: "Interstate travel", note: "20 states covered" },
  { trip: "wedding_event", label: "Weddings & events", note: "Styled convoys" },
  { trip: "vip_security", label: "VIP & security", note: "Escorts & protocol" },
];

export default async function HomePage() {
  const [vehicles, rates] = await Promise.all([listVehicles({ tier: "core" }), listRates()]);
  const vips = await listVehicles({ tier: "vip" });
  const rateFor = (slug: string) => rates.find((r) => r.vehicleSlug === slug) ?? null;

  return (
    <>
      {/* ── Hero: entering the showroom ─────────────────────────── */}
      <section className="relative min-h-[92vh] overflow-hidden flex items-end">
        <Image
          src="/images/hero-lagos-bridge.webp"
          alt="H06 chauffeur-driven Prado crossing the Lekki-Ikoyi Link Bridge at night"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/55 to-charcoal/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/60 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-20 pt-40 lg:px-8">
          <div className="max-w-2xl fade-up">
            <p className="eyebrow eyebrow-emerald mb-5">Lagos · Private luxury mobility</p>
            <h1 className="display text-5xl leading-[1.05] text-cream md:text-7xl">
              The showroom
              <br />
              is open.
            </h1>
            <p className="mt-6 max-w-md text-lg text-cream-dim">
              Chauffeur-driven luxury for Lagos and beyond.
              Over 5,000 trips delivered. Zero compromises.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/fleet" className="btn btn-primary btn-lg">
                Enter the showroom
              </Link>
              <Link href="/book" className="btn btn-ghost btn-lg">
                Build my trip
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trip doors ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <Reveal>
          <p className="eyebrow mb-3">Where are we taking you?</p>
          <h2 className="display text-3xl text-cream md:text-4xl">Choose your trip</h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {TRIP_DOORS.map((d, i) => (
            <Reveal key={d.trip} delay={i * 0.05}>
              <Link
                href={`/book?trip=${d.trip}`}
                className="glass-subtle group block h-full p-4 transition-colors hover:border-emerald-glow/40"
              >
                <p className="text-sm font-medium text-cream group-hover:text-emerald-glow">{d.label}</p>
                <p className="mt-1.5 text-xs text-muted">{d.note}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── The fleet ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <Reveal>
            <p className="eyebrow mb-3">On the floor tonight</p>
            <h2 className="display text-3xl text-cream md:text-4xl">The instant-booking fleet</h2>
            <p className="mt-3 max-w-xl text-sm text-muted">
              Fixed, transparent rates. Every car comes with a professional chauffeur, fuelled and prepared.
            </p>
          </Reveal>
          <Link href="/fleet" className="btn btn-ghost btn-md hidden md:inline-flex shrink-0">
            View the full fleet
          </Link>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.slice(0, 6).map((v, i) => (
            <Reveal key={v.slug} delay={i * 0.06}>
              <VehicleCard vehicle={v} rate={rateFor(v.slug)} />
            </Reveal>
          ))}
        </div>
        <div className="mt-8 md:hidden">
          <Link href="/fleet" className="btn btn-ghost btn-md w-full">
            View the full fleet
          </Link>
        </div>
      </section>

      {/* ── VIP wing teaser ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <Reveal>
          <div className="glass-bronze relative overflow-hidden p-8 md:p-12">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 opacity-[0.14]"
              style={{
                backgroundImage: "url(/brand/mark-bronze.png)",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
              }}
            />
            <p className="eyebrow eyebrow-bronze mb-4">The VIP wing</p>
            <h2 className="display text-3xl text-cream md:text-4xl max-w-lg">
              Some cars aren&apos;t listed. They&apos;re requested.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-cream-dim">
              {vips.slice(0, 7).map((v) => v.name).join(" · ")} — prepared and priced by the concierge
              for weddings, state visits, and moments that demand presence.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/vip" className="btn btn-bronze btn-md">
                Enter the VIP wing
              </Link>
              <a
                href={waLink(WA_PRESETS.vip())}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-md"
              >
                WhatsApp concierge
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Why H06 ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <Reveal>
          <p className="eyebrow mb-3">The H06 difference</p>
          <h2 className="display text-3xl text-cream md:text-4xl">Quiet confidence, delivered</h2>
        </Reveal>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "5,000+", v: "Trips delivered across Nigeria without compromise" },
            { k: "24/7", v: "Concierge and fleet availability, every day of the year" },
            { k: "Vetted", v: "Professional chauffeurs, security-trained options available" },
            { k: "Lekki HQ", v: "1 Gbangbala Street, Ikate — serving all of Lagos" },
          ].map((item, i) => (
            <Reveal key={item.k} delay={i * 0.06}>
              <div className="glass h-full p-6">
                <p className="display text-3xl text-emerald-glow">{item.k}</p>
                <p className="mt-3 text-sm leading-relaxed text-cream-dim">{item.v}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <Reveal>
          <p className="eyebrow mb-3">Effortless by design</p>
          <h2 className="display text-3xl text-cream md:text-4xl">Three steps to the back seat</h2>
        </Reveal>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Choose",
              d: "Pick your trip and your car — or let the showroom recommend the right one.",
            },
            {
              n: "02",
              t: "Confirm",
              d: "See your quote instantly. Pay in full, drop a deposit, or confirm on WhatsApp.",
            },
            {
              n: "03",
              t: "Arrive",
              d: "Your chauffeur arrives prepared. The concierge stays a message away.",
            },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.07}>
              <div className="glass-subtle h-full p-7">
                <p className="text-xs tracking-[0.3em] text-emerald-glow">{s.n}</p>
                <h3 className="display mt-3 text-xl text-cream">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Airport strip ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <Reveal>
          <div className="glass relative overflow-hidden md:flex">
            <div className="relative h-56 md:h-auto md:w-1/2">
              <Image
                src="/images/airport-transfer.webp"
                alt="H06 airport meet and greet service at Murtala Muhammed International Airport"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-charcoal/80 hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent md:hidden" />
            </div>
            <div className="relative p-8 md:w-1/2 md:p-12">
              <p className="eyebrow eyebrow-emerald mb-4">Airport protocol</p>
              <h2 className="display text-2xl text-cream md:text-3xl">
                Land. Walk out. Your car is already there.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-cream-dim">
                Meet &amp; greet at arrivals, VIP fast-track protocol through MMIA, and a chauffeur
                who tracks your flight — from {formatNaira(100000)}.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/book?trip=airport_pickup" className="btn btn-primary btn-md">
                  Book airport pickup
                </Link>
                <Link href="/book?trip=airport_dropoff" className="btn btn-ghost btn-md">
                  Airport drop-off
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Concierge band ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-8 lg:px-8">
        <Reveal>
          <div className="flex flex-col items-center gap-6 text-center">
            <Mark variant="emerald" size={64} />
            <h2 className="display max-w-xl text-3xl text-cream md:text-4xl">
              Prefer a human? The concierge is awake.
            </h2>
            <p className="max-w-md text-sm text-muted">
              Availability, custom itineraries, corporate accounts — one message, answered fast.
            </p>
            <a
              href={waLink(WA_PRESETS.concierge)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-lg"
            >
              WhatsApp the concierge
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
