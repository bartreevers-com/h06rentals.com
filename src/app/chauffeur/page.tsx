import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { formatNaira } from "@/lib/quote";
import { CHAUFFEUR_TIERS } from "@/lib/trip-types";
import { waLink } from "@/lib/whatsapp-client";

export const metadata: Metadata = {
  title: "Chauffeur Hire — Our Driver, Your Vehicle, Lagos & Interstate",
  description:
    "Hire a vetted professional H06 chauffeur for your own vehicle from ₦50,000. Regular and security-trained spy police drivers, Lagos or interstate, 12-hour and 24-hour hire.",
  openGraph: {
    title: "H06 Chauffeur Hire — Our Driver, Your Vehicle",
    description:
      "Vetted professional chauffeurs for your own car, Lagos or interstate, from ₦50,000.",
    images: ["/images/chauffeur-lagos.webp"],
  },
};

const VETTING_REGULAR = [
  "Background check",
  "Identity verification",
  "Defensive driving assessment",
  "Reference checks",
  "Uniform and conduct standards",
  "Ongoing performance reviews",
];

const VETTING_SPY = [
  "Active police certification",
  "Security clearance",
  "Tactical driving training",
  "Weapons licensing",
];

const STEPS = [
  {
    n: "01",
    t: "Tell us the trip",
    d: "Dates, hours, Lagos or interstate, and the vehicle they'll be driving.",
  },
  {
    n: "02",
    t: "Driver matched",
    d: "We assign a vetted chauffeur suited to your vehicle and itinerary — regular or security-trained.",
  },
  {
    n: "03",
    t: "Driver arrives",
    d: "Uniformed, briefed and on time. The concierge stays reachable for the whole engagement.",
  },
];

const FAQ = [
  {
    q: "Whose vehicle does the chauffeur drive?",
    a: "Yours. Chauffeur hire is our driver in your car — the same H06 standard without a fleet rental. If you need a car as well, book from the fleet instead.",
  },
  {
    q: "What does an interstate engagement include?",
    a: "The daily rate covers the chauffeur's professional service. Fuel and the driver's accommodation on overnight interstate trips are the client's responsibility.",
  },
  {
    q: "When should I choose a spy police chauffeur?",
    a: "High-profile movement, valuable cargo, late-night interstate routes, or any itinerary where a certified, security-trained officer behind the wheel adds real assurance.",
  },
  {
    q: "Can I keep the same driver on retainer?",
    a: "Yes — corporates and individuals can arrange a consistent chauffeur on a weekly or monthly basis through the concierge.",
  },
];

export default function ChauffeurPage() {
  return (
    <>
      {/* ── hero: the greeting sketch on the silver stage ───────── */}
      <section className="stage-gradient relative min-h-[88vh] overflow-hidden flex items-center">
        <div
          className="mark-watermark"
          style={{
            backgroundImage: "url(/brand/mark-silver.png)",
            backgroundSize: "36%",
            backgroundPosition: "84% 16%",
            opacity: 0.05,
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-20 pt-36 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
            <div className="fade-up">
              <p className="eyebrow eyebrow-silver mb-4">Chauffeur hire</p>
              <h1 className="display text-4xl leading-[1.05] text-cream md:text-6xl">
                Our driver.
                <br />
                Your vehicle.
              </h1>
              <p className="mt-5 max-w-md text-base text-cream-dim">
                Professional, vetted chauffeurs for your own car — daily Lagos commutes, corporate
                transfers, or multi-day interstate journeys. The H06 standard, without the fleet rental.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/book?trip=interstate_chauffeur" className="btn btn-primary btn-lg">
                  Hire a chauffeur
                </Link>
                <a
                  href={waLink("Hello H06 Rentals! I'd like to hire a chauffeur for my own vehicle.\n\nDriver type (regular / spy police):\nDates:\nLagos or interstate:\nVehicle:")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-lg"
                >
                  WhatsApp concierge
                </a>
              </div>
            </div>
            <div className="mx-auto w-full max-w-xl lg:max-w-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sketches/chauffeur-greeting.svg"
                alt="Hand-drawn sketch of an H06 chauffeur greeting you in front of a luxury SUV"
                className="w-full drop-shadow-[0_28px_60px_rgba(201,205,209,0.12)]"
                draggable={false}
              />
              <div className="mt-6 flex items-center justify-between border-t hairline pt-4 text-[0.68rem] uppercase tracking-[0.22em] text-muted">
                <span>Vetted professionals</span>
                <span>From {formatNaira(50000)}</span>
                <span>Lagos &amp; interstate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── rates ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <Reveal>
          <p className="eyebrow eyebrow-silver mb-3">Transparent pricing</p>
          <h2 className="display text-3xl text-cream md:text-4xl">Simple, flat-rate hire</h2>
          <p className="mt-3 max-w-xl text-sm text-muted">
            No hidden fees. Interstate engagements bill the 24-hour rate per day; fuel and driver
            accommodation on overnight trips are the client&apos;s responsibility.
          </p>
        </Reveal>
        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {CHAUFFEUR_TIERS.map((tier, i) => (
            <Reveal key={tier.id} delay={i * 0.07}>
              <div className="glass-silver h-full p-7">
                <h3 className="display text-xl text-cream">{tier.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{tier.description}</p>
                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-cream-dim">12-hour hire</dt>
                    <dd className="font-semibold text-silver">{formatNaira(tier.rate12)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-cream-dim">24-hour hire</dt>
                    <dd className="font-semibold text-silver">{formatNaira(tier.rate24)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-cream-dim">Interstate, per day</dt>
                    <dd className="font-semibold text-silver">{formatNaira(tier.rate24)}</dd>
                  </div>
                </dl>
                <Link
                  href="/book?trip=interstate_chauffeur"
                  className={`btn ${tier.id === "spy_police" ? "btn-primary" : "btn-ghost"} btn-md mt-7 w-full`}
                >
                  Book {tier.label.toLowerCase()}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── vetting ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <Reveal>
          <p className="eyebrow eyebrow-silver mb-3">Our standards</p>
          <h2 className="display text-3xl text-cream md:text-4xl">How we vet our drivers</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Every driver who works under the H06 name goes through a rigorous screening process.
            We don&apos;t cut corners here — your safety and peace of mind depend on it.
          </p>
        </Reveal>
        <div className="mt-9 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="glass-subtle h-full p-7">
              <h3 className="display text-lg text-cream">Every H06 chauffeur</h3>
              <ul className="mt-4 space-y-2.5">
                {VETTING_REGULAR.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-cream-dim">
                    <span className="h-1.5 w-1.5 rounded-full bg-silver" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.07}>
            <div className="glass-subtle h-full p-7">
              <h3 className="display text-lg text-cream">Spy police chauffeurs, additionally</h3>
              <ul className="mt-4 space-y-2.5">
                {VETTING_SPY.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-cream-dim">
                    <span className="h-1.5 w-1.5 rounded-full bg-silver" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-muted">
                Certified serving officers with security training — ideal for high-profile and
                interstate movement.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── the standard, in person ─────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <Reveal>
          <div className="glass-silver relative overflow-hidden md:flex">
            <div className="relative h-56 md:h-auto md:w-1/2">
              <Image
                src="/images/chauffeur-lagos.webp"
                alt="H06 chauffeur in a dark suit beside a black Land Cruiser at a Lagos hotel entrance at dusk"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-charcoal/80 hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent md:hidden" />
            </div>
            <div className="relative p-8 md:w-1/2 md:p-12">
              <p className="eyebrow eyebrow-silver mb-4">The standard, in person</p>
              <h2 className="display text-2xl text-cream md:text-3xl">
                Suited, briefed, and early.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-cream-dim">
                Every engagement starts before you step outside — route planned, vehicle checked,
                chauffeur waiting. Quiet professionalism from the first greeting to the last door.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/book?trip=interstate_chauffeur" className="btn btn-primary btn-md">
                  Hire a chauffeur
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── process ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <Reveal>
          <p className="eyebrow eyebrow-silver mb-3">The process</p>
          <h2 className="display text-3xl text-cream md:text-4xl">How it works</h2>
        </Reveal>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.07}>
              <div className="glass-subtle h-full p-7">
                <p className="text-xs tracking-[0.3em] text-silver">{s.n}</p>
                <h3 className="display mt-3 text-xl text-cream">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-5 py-14 lg:px-8">
        <Reveal>
          <p className="eyebrow eyebrow-silver mb-3">Common questions</p>
          <h2 className="display text-3xl text-cream md:text-4xl">Good to know</h2>
        </Reveal>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <Reveal key={f.q}>
              <details className="glass-subtle group p-5">
                <summary className="cursor-pointer text-sm font-medium text-cream [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-6 lg:px-8">
        <Reveal>
          <div className="glass-silver flex flex-col items-center gap-5 p-10 text-center">
            <h2 className="display max-w-lg text-2xl text-cream md:text-3xl">Ready to get started?</h2>
            <p className="max-w-md text-sm text-muted">
              Get in touch today and we&apos;ll arrange the right driver for your vehicle.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/book?trip=interstate_chauffeur" className="btn btn-primary btn-lg">
                Hire a chauffeur
              </Link>
              <a
                href={waLink("Hello H06 Rentals! I'd like to hire a chauffeur for my own vehicle.")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-lg"
              >
                WhatsApp concierge
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
