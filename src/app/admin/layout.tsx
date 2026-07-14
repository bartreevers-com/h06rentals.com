import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/admin-auth";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Admin — H06 Rentals",
  robots: { index: false, follow: false },
};

const OPS_TABS = [
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/fleet", label: "Fleet & Rates" },
  { href: "/admin/addons", label: "Add-ons" },
  { href: "/admin/enquiries", label: "Enquiries" },
];

const TABS: Record<string, { href: string; label: string }[]> = {
  owner: [
    ...OPS_TABS,
    { href: "/admin/performance", label: "Performance" },
    { href: "/admin/team", label: "Team" },
  ],
  admin: OPS_TABS,
  sales: [
    { href: "/admin/bookings", label: "Bookings" },
    { href: "/admin/enquiries", label: "Enquiries" },
  ],
  driver: [{ href: "/admin/trips", label: "My Trips" }],
  hr: [{ href: "/admin/performance", label: "Performance" }],
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const tabs = session ? TABS[session.role] ?? [] : [];

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b hairline">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/render-glass-alpha.png"
              alt=""
              width={26}
              height={28}
              className="object-contain drop-shadow-[0_2px_8px_rgba(201,205,209,0.25)]"
              draggable={false}
            />
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-cream-dim">
              H06 Operations
            </span>
          </div>
          {session && (
            <div className="flex items-center gap-6">
              <nav className="hidden gap-5 md:flex" aria-label="Admin">
                {tabs.map((t) => (
                  <Link key={t.href} href={t.href} className="text-sm text-cream-dim hover:text-cream">
                    {t.label}
                  </Link>
                ))}
              </nav>
              <span className="hidden text-xs text-muted sm:block">
                {session.name} · {session.role}
              </span>
              <form action={logoutAction}>
                <button className="btn btn-ghost btn-sm">Sign out</button>
              </form>
            </div>
          )}
        </div>
        {session && tabs.length > 1 && (
          <nav className="flex gap-4 overflow-x-auto px-5 pb-3 md:hidden" aria-label="Admin mobile">
            {tabs.map((t) => (
              <Link key={t.href} href={t.href} className="whitespace-nowrap text-sm text-cream-dim">
                {t.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">{children}</div>
    </div>
  );
}
