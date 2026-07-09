"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "./Logo";
import { waLink, WA_PRESETS } from "@/lib/whatsapp-client";

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="border-t hairline bg-ink">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <Mark variant="silver" size={30} />
              <span className="text-sm font-semibold tracking-[0.22em]">H06 RENTALS</span>
            </div>
            <p className="mt-4 text-sm text-muted leading-relaxed">
              Luxury car hire and chauffeur-driven mobility.
              <br />
              Lagos, Nigeria — available 24/7.
            </p>
          </div>

          <div>
            <h3 className="eyebrow mb-4">Explore</h3>
            <ul className="space-y-2.5 text-sm text-cream-dim">
              <li><Link href="/fleet" className="hover:text-cream">The Fleet</Link></li>
              <li><Link href="/vip" className="hover:text-cream">VIP Wing</Link></li>
              <li><Link href="/chauffeur" className="hover:text-cream">Chauffeur Hire</Link></li>
              <li><Link href="/services" className="hover:text-cream">Services</Link></li>
              <li><Link href="/corporate" className="hover:text-cream">Corporate Accounts</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4">Book</h3>
            <ul className="space-y-2.5 text-sm text-cream-dim">
              <li><Link href="/book" className="hover:text-cream">Build my trip</Link></li>
              <li><Link href="/book?trip=airport_pickup" className="hover:text-cream">Airport pickup</Link></li>
              <li>
                <a href={waLink(WA_PRESETS.concierge)} target="_blank" rel="noopener noreferrer" className="hover:text-cream">
                  WhatsApp concierge
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4">Contact</h3>
            <ul className="space-y-2.5 text-sm text-cream-dim">
              <li><a href="tel:+2349139999533" className="hover:text-cream">+234 913 999 9533</a></li>
              <li><a href="mailto:hello@h06rentals.com" className="hover:text-cream">hello@h06rentals.com</a></li>
              <li>1 Gbangbala Street, Ikate, Lekki, Lagos</li>
              <li>
                <a href="https://www.instagram.com/h06rentals" target="_blank" rel="noopener noreferrer" className="hover:text-cream">
                  Instagram — @h06rentals
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t hairline pt-6 text-xs text-muted md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} H06 Rentals. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-cream-dim">Terms</Link>
            <Link href="/privacy" className="hover:text-cream-dim">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
