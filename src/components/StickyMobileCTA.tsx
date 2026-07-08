"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { waLink, WA_PRESETS } from "@/lib/whatsapp-client";

/** Persistent booking bar on mobile — the express lane is never out of reach. */
export function StickyMobileCTA() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/book") || pathname.startsWith("/pay")) {
    return null;
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t hairline bg-ink/90 p-3 backdrop-blur-lg lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Link href="/book" className="btn btn-primary btn-md flex-1">
        Build my trip
      </Link>
      <a
        href={waLink(WA_PRESETS.concierge)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-whatsapp btn-md"
        aria-label="WhatsApp concierge"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.2.3c-.1.1-.2.3-.1.5.1.2.6 1 1.3 1.7.9.9 1.7 1.2 2 1.3.2.1.4.1.5-.1l.8-.9c.2-.2.4-.3.6-.2l2 .9c.2.1.4.2.4.3.1.2.1.6-.2 1.2Z" />
        </svg>
        Concierge
      </a>
    </div>
  );
}
