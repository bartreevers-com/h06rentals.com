import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/admin-auth";
import { logoutAction } from "./actions";
import { SidebarNav, type NavSection, type NavTab } from "./Sidebar";

export const metadata: Metadata = {
  title: "Admin — H06 Rentals",
  robots: { index: false, follow: false },
};

const OPS: NavTab[] = [
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/fleet", label: "Fleet & Rates" },
  { href: "/admin/addons", label: "Add-ons" },
  { href: "/admin/enquiries", label: "Enquiries" },
];
const PEOPLE: NavTab[] = [
  { href: "/admin/performance", label: "Performance" },
  { href: "/admin/recruitment", label: "Recruitment" },
  { href: "/admin/team", label: "Team" },
];

/** Every role sees the same structure — Operations, then People — with
 *  only the entries their role can open. */
const SECTIONS: Record<string, NavSection[]> = {
  owner: [
    { label: "Operations", tabs: OPS },
    { label: "People", tabs: PEOPLE },
  ],
  admin: [{ label: "Operations", tabs: OPS }],
  sales: [
    { label: "Operations", tabs: [OPS[0], OPS[3]] },
  ],
  driver: [{ label: "Workspace", tabs: [{ href: "/admin/trips", label: "My Trips" }] }],
  hr: [{ label: "People", tabs: [PEOPLE[0], PEOPLE[1]] }],
  hiring_manager: [{ label: "People", tabs: [PEOPLE[1]] }],
  assessor: [{ label: "People", tabs: [PEOPLE[1]] }],
};

function LogoBlock() {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark-emerald.png"
        alt=""
        width={30}
        height={30}
        className="object-contain"
        draggable={false}
      />
      <span className="flex flex-col leading-none">
        <span className="text-[0.8rem] font-semibold tracking-[0.24em] text-cream">H06</span>
        <span className="mt-1 text-[0.55rem] uppercase tracking-[0.34em] text-muted">Office</span>
      </span>
    </div>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    return (
      <div className="backoffice min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
          <div className="glass p-8">
            <LogoBlock />
            <div className="mt-6">{children}</div>
          </div>
          <p className="mt-6 text-center text-xs text-muted">
            <Link href="/" className="hover:text-cream">← Back to h06rentals.com</Link>
          </p>
        </div>
      </div>
    );
  }

  const sections = SECTIONS[session.role] ?? [];
  const tabCount = sections.reduce((n, s) => n + s.tabs.length, 0);

  return (
    <div className="backoffice min-h-screen">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-4 lg:px-6 lg:py-6">
        {/* sidebar */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col lg:flex">
          <div className="glass flex h-full flex-col p-5">
            <LogoBlock />
            <div className="mt-8 flex-1 overflow-y-auto">
              <SidebarNav sections={sections} orientation="vertical" />
            </div>
            <div className="border-t hairline pt-4">
              <p className="truncate text-sm font-medium text-cream">{session.name}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-widest text-muted">
                {session.role.replace("_", " ")}
              </p>
              <div className="mt-3 flex items-center gap-2">
                {session.userId !== 0 && (
                  <Link href="/admin/account" className="btn btn-ghost btn-sm">
                    Password
                  </Link>
                )}
                <form action={logoutAction}>
                  <button className="btn btn-ghost btn-sm">Sign out</button>
                </form>
              </div>
            </div>
          </div>
        </aside>

        {/* content */}
        <div className="min-w-0 flex-1">
          {/* mobile header */}
          <header className="glass mb-5 p-4 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <LogoBlock />
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted sm:block">
                  {session.name} · {session.role.replace("_", " ")}
                </span>
                {session.userId !== 0 && (
                  <Link href="/admin/account" className="btn btn-ghost btn-sm">
                    Password
                  </Link>
                )}
                <form action={logoutAction}>
                  <button className="btn btn-ghost btn-sm">Sign out</button>
                </form>
              </div>
            </div>
            {tabCount > 1 && (
              <div className="mt-3">
                <SidebarNav sections={sections} orientation="horizontal" />
              </div>
            )}
          </header>

          <main className="pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
