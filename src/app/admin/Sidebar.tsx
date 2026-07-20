"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavTab {
  href: string;
  label: string;
}

export interface NavSection {
  label: string;
  tabs: NavTab[];
}

/** Minimal line icons, keyed by section. */
function Icon({ href }: { href: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (href.includes("bookings"))
    return (
      <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
    );
  if (href.includes("fleet"))
    return (
      <svg {...common}><path d="M5 16l1.5-6.5A2 2 0 0 1 8.4 8h7.2a2 2 0 0 1 1.9 1.5L19 16" /><rect x="3" y="16" width="18" height="4" rx="1.5" /><circle cx="7.5" cy="20" r="1" /><circle cx="16.5" cy="20" r="1" /></svg>
    );
  if (href.includes("addons"))
    return (
      <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
    );
  if (href.includes("enquiries"))
    return (
      <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
    );
  if (href.includes("performance"))
    return (
      <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></svg>
    );
  if (href.includes("recruitment"))
    return (
      <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>
    );
  if (href.includes("team"))
    return (
      <svg {...common}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3.2 3.2 0 0 1 0 6.4M17.5 14.5a5.5 5.5 0 0 1 3 5.5" /></svg>
    );
  if (href.includes("trips"))
    return (
      <svg {...common}><circle cx="12" cy="10" r="3" /><path d="M12 2a8 8 0 0 1 8 8c0 5.3-8 12-8 12S4 15.3 4 10a8 8 0 0 1 8-8Z" /></svg>
    );
  return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
}

function NavItem({ tab, active }: { tab: NavTab; active: boolean }) {
  return (
    <Link href={tab.href} className={`bo-nav-item whitespace-nowrap ${active ? "active" : ""}`}>
      <Icon href={tab.href} />
      {tab.label}
    </Link>
  );
}

/** Grouped navigation: labelled sections on desktop, a flat pill row on mobile. */
export function SidebarNav({
  sections,
  orientation,
}: {
  sections: NavSection[];
  orientation: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const isActive = (t: NavTab) => pathname === t.href || pathname.startsWith(`${t.href}/`);

  if (orientation === "horizontal") {
    return (
      <nav aria-label="Admin" className="flex gap-1.5 overflow-x-auto pb-1">
        {sections.flatMap((s) => s.tabs).map((t) => (
          <NavItem key={t.href} tab={t} active={isActive(t)} />
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Admin" className="flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="eyebrow mb-2.5 px-1 !text-[0.6rem]">{section.label}</p>
          <div className="flex flex-col gap-1">
            {section.tabs.map((t) => (
              <NavItem key={t.href} tab={t} active={isActive(t)} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
