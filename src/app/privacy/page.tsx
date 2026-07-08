import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How H06 Rentals collects, uses and protects your personal information.",
};

const SECTIONS = [
  {
    title: "1. What we collect",
    body: "When you book or enquire we collect your name, phone number, email, trip details and payment status. Payment card details are processed entirely by our payment partner (Paystack) and never touch our servers.",
  },
  {
    title: "2. How we use it",
    body: "Your details are used to deliver the service you booked: dispatching your chauffeur, confirming on WhatsApp, sending booking and payment confirmations, and reaching you if plans change. We do not sell or share your data with third parties for marketing.",
  },
  {
    title: "3. Storage & security",
    body: "Booking records are stored in a secured database with access limited to the H06 operations team. Payment webhooks are cryptographically verified. We retain records for accounting and service-history purposes.",
  },
  {
    title: "4. Analytics",
    body: "We use privacy-respecting analytics to understand how the showroom is used and improve the experience. You can decline non-essential cookies where prompted.",
  },
  {
    title: "5. Your rights",
    body: "You may request a copy of your data or ask for it to be deleted at any time: hello@h06rentals.com.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-28">
      <h1 className="display text-4xl text-cream">Privacy Policy</h1>
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
