import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";
import { EnquiryForm } from "@/components/EnquiryForm";

export const metadata: Metadata = {
  title: "Corporate Accounts — Executive Transport, Lagos",
  description:
    "Executive transportation for corporates in Lagos: priority fleet access, monthly billing, vetted chauffeurs and a dedicated concierge line.",
};

const PERKS = [
  { t: "Priority fleet access", d: "Guaranteed availability windows for leadership and visiting executives." },
  { t: "One account, one invoice", d: "Monthly consolidated billing with trip-level reporting." },
  { t: "Vetted, consistent chauffeurs", d: "The same professional faces for your team, security-trained on request." },
  { t: "Dedicated concierge line", d: "A direct line that answers at 2pm and at 2am." },
];

export default function CorporatePage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="eyebrow eyebrow-emerald mb-3">For organisations</p>
          <h1 className="display text-4xl text-cream md:text-5xl">Corporate accounts</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
            Executive movement your operations team never has to chase. H06 runs transport for
            corporates across Lagos — quietly, reliably, on account.
          </p>
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {PERKS.map((p) => (
              <div key={p.t} className="glass-subtle p-5">
                <h2 className="text-sm font-medium text-cream">{p.t}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{p.d}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass p-7">
            <h2 className="eyebrow mb-5">Request a corporate account</h2>
            <EnquiryForm type="corporate" messageLabel="Tell us about your transport needs" messagePlaceholder="Team size, typical routes, expected monthly usage…" submitLabel="Request corporate account" />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
