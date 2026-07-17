import type { Metadata } from "next";
import { launchGate } from "@/lib/launch-gate";
import { Reveal } from "@/components/Reveal";
import { EnquiryForm } from "@/components/EnquiryForm";
import { waLink, WA_PRESETS } from "@/lib/whatsapp-client";

export const metadata: Metadata = {
  title: "Contact — H06 Rentals, Lekki, Lagos",
  description:
    "Reach the H06 concierge: WhatsApp +234 913 999 9533, hello@h06rentals.com, or visit 1 Gbangbala Street, Ikate, Lekki, Lagos. Available 24/7.",
};

export default async function ContactPage() {
  await launchGate();
  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="eyebrow eyebrow-emerald mb-3">The concierge desk</p>
          <h1 className="display text-4xl text-cream md:text-5xl">Contact</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            Fastest on WhatsApp — a human answers around the clock.
          </p>

          <dl className="mt-9 space-y-5 text-sm">
            <div>
              <dt className="eyebrow mb-1">WhatsApp / Phone</dt>
              <dd>
                <a href="tel:+2349139999533" className="text-cream hover:text-emerald-glow">
                  +234 913 999 9533
                </a>
              </dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Email</dt>
              <dd>
                <a href="mailto:hello@h06rentals.com" className="text-cream hover:text-emerald-glow">
                  hello@h06rentals.com
                </a>
              </dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Showroom</dt>
              <dd className="text-cream">1 Gbangbala Street, Ikate, Lekki, Lagos</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Hours</dt>
              <dd className="text-cream">24/7 — every day of the year</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Instagram</dt>
              <dd>
                <a
                  href="https://www.instagram.com/h06rentals"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cream hover:text-emerald-glow"
                >
                  @h06rentals
                </a>
              </dd>
            </div>
          </dl>

          <a
            href={waLink(WA_PRESETS.concierge)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-lg mt-9"
          >
            WhatsApp the concierge
          </a>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass p-7">
            <h2 className="eyebrow mb-5">Or leave a message</h2>
            <EnquiryForm type="contact" />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
