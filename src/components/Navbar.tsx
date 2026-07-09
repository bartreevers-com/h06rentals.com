"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoLockup } from "./Logo";
import { waLink, WA_PRESETS } from "@/lib/whatsapp-client";

const LINKS = [
  { href: "/fleet", label: "The Fleet" },
  { href: "/vip", label: "VIP Wing" },
  { href: "/chauffeur", label: "Chauffeur" },
  { href: "/services", label: "Services" },
  { href: "/corporate", label: "Corporate" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || open ? "glass-subtle !rounded-none border-x-0 border-t-0" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
        <LogoLockup />
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm transition-colors ${
                pathname.startsWith(l.href) ? "text-emerald-glow" : "text-cream-dim hover:text-cream"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={waLink(WA_PRESETS.concierge)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-sm"
          >
            WhatsApp concierge
          </a>
          <Link href="/book" className="btn btn-primary btn-sm">
            Build my trip
          </Link>
        </div>
        <button
          className="lg:hidden p-2 text-cream"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="lg:hidden border-t hairline px-5 pb-6 pt-2" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-3 text-base text-cream-dim hover:text-cream"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/book" className="btn btn-primary btn-md w-full">
              Build my trip
            </Link>
            <a
              href={waLink(WA_PRESETS.concierge)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-md w-full"
            >
              WhatsApp concierge
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
