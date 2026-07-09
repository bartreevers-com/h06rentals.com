import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { waLink, WA_PRESETS } from "@/lib/whatsapp-client";

export const metadata: Metadata = {
  title: "Services — Airport, Corporate, Interstate & VIP",
  description:
    "H06 Rentals services: airport transfers with VIP protocol, 12/24-hour chauffeured hire, interstate travel, weddings, corporate accounts and security escorts in Lagos.",
};

const SERVICES = [
  {
    title: "Airport Transfers",
    body: "Meet & greet at arrivals, flight tracking, VIP fast-track protocol through MMIA. Land, walk out, and your car is waiting.",
    cta: { label: "Book airport pickup", href: "/book?trip=airport_pickup" },
  },
  {
    title: "City Hire — 12 & 24 Hours",
    body: "A chauffeured luxury SUV at your disposal across Lagos. Meetings, dinners, errands — the car waits, you don't.",
    cta: { label: "Book city hire", href: "/book?trip=12hrs" },
  },
  {
    title: "Interstate Travel",
    body: "Twenty states on a transparent surcharge card, from Ibadan day trips to Abuja engagements. Overnight logistics handled.",
    cta: { label: "Plan interstate trip", href: "/book?trip=interstate" },
  },
  {
    title: "Corporate Movement",
    body: "Executive transport for leadership and guests, monthly retainers, event fleets and priority availability under one account.",
    cta: { label: "Request corporate account", href: "/corporate" },
  },
  {
    title: "Weddings & Occasions",
    body: "Bridal cars, styled convoys and coordinated arrivals. The fleet turns up polished, on brief and on time.",
    cta: { label: "Plan an occasion", href: "/book?trip=wedding_event" },
  },
  {
    title: "VIP & Security-Conscious",
    body: "Spy-police chauffeurs, fully kitted MOPOL escorts, armoured options and discreet protocol for high-profile movement.",
    cta: { label: "Arrange VIP movement", href: "/book?trip=vip_security" },
  },
  {
    title: "Chauffeur Only",
    body: "Your vehicle, our professional. Vetted chauffeurs — regular or security-trained — for Lagos or interstate.",
    cta: { label: "Explore chauffeur hire", href: "/chauffeur" },
  },
  {
    title: "Concierge & Custom",
    body: "Multi-city itineraries, film productions, visa-on-arrival support. If it moves in Nigeria, the concierge can arrange it.",
    cta: { label: "Make a custom request", href: "/book?trip=custom" },
  },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 lg:px-8">
      <Reveal>
        <p className="eyebrow eyebrow-emerald mb-3">What we do</p>
        <h1 className="display text-4xl text-cream md:text-5xl">Services</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          One standard across every service: a prepared car, a professional chauffeur, and a
          concierge who answers.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {SERVICES.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.04}>
            <div className="glass flex h-full flex-col p-7">
              <h2 className="display text-xl text-cream">{s.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{s.body}</p>
              <Link href={s.cta.href} className="btn btn-ghost btn-sm mt-5 self-start">
                {s.cta.label}
              </Link>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-14">
        <div className="glass-emerald flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="display text-2xl text-cream">Not sure which fits?</h2>
          <p className="max-w-md text-sm text-muted">
            Describe the trip in one message — the concierge will shape it into a quote.
          </p>
          <a href={waLink(WA_PRESETS.concierge)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-lg">
            WhatsApp the concierge
          </a>
        </div>
      </Reveal>
    </div>
  );
}
