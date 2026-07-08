import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for H06 Rentals luxury car hire and chauffeur services in Lagos, Nigeria.",
};

const SECTIONS = [
  {
    title: "1. Bookings & Quotes",
    body: "Instant quotes on the platform are calculated from our published rate card. Items marked as estimates require confirmation by the H06 concierge before they are final. For custom-quote services (exotic vehicles, security escorts), a deposit may be required at the time of booking with the balance due before the trip commences.",
  },
  {
    title: "2. Payment",
    body: "H06 Rentals accepts card, bank transfer, USSD and mobile money via our secure payment partner, as well as direct bank transfer arranged through the concierge. A booking is held once payment or a deposit is received, and confirmed once the concierge verifies availability.",
  },
  {
    title: "3. Chauffeur Service",
    body: "All vehicle hires are chauffeur-driven. Self-drive is not offered. Chauffeurs are vetted professionals; security-trained (spy police) chauffeurs are available on request. On interstate trips, fuel beyond the agreed itinerary and chauffeur accommodation for overnight stays are the client's responsibility unless otherwise agreed.",
  },
  {
    title: "4. Cancellations & Changes",
    body: "Plans change — tell the concierge as early as possible. Cancellations made more than 24 hours before pickup receive a full refund of amounts paid. Later cancellations may attract a fee depending on preparation already committed. Rescheduling is free when the fleet can accommodate it.",
  },
  {
    title: "5. Waiting Time & Overages",
    body: "Airport pickups include flight tracking and reasonable arrival waiting. For other trips, extended waiting or hours beyond the booked window are billed at the prevailing hourly rate for the vehicle.",
  },
  {
    title: "6. Conduct & Liability",
    body: "Clients are responsible for damage caused by their party beyond normal use. H06 Rentals maintains comprehensive insurance on all fleet vehicles. We are not liable for delays caused by force majeure, road closures or security situations, though the concierge will always work alternatives.",
  },
  {
    title: "7. Contact",
    body: "Questions about these terms: hello@h06rentals.com or +234 913 999 9533.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-28">
      <h1 className="display text-4xl text-cream">Terms of Service</h1>
      <p className="mt-3 text-xs text-muted">H06 Rentals — Lagos, Nigeria</p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="display text-lg text-cream">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
