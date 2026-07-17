import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { launched } from "@/lib/launch-gate";
import { Countdown, CrewGate } from "./Countdown";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "H06 Rentals — The Showroom Reopens Soon",
  description:
    "H06 Rentals, Lagos. The showroom will be re-opened momentarily. Luxury car hire and chauffeur service.",
  robots: { index: false, follow: false },
};

/** Pre-launch landing page. The proxy routes all public traffic here until
 *  launch time, then steps aside automatically — no redeploy needed. */
export default function ComingSoon() {
  if (launched()) redirect("/");
  const launchAt = process.env.NEXT_PUBLIC_LAUNCH_AT ?? "2026-07-18T18:00:00+01:00";

  return (
    <main className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,#0c1a14_0%,#050807_68%,#030504_100%)] px-6">
      <CrewGate />
      {/* the swirling emerald atmosphere, same language as the splash */}
      <div className="h06-splash-swirl !opacity-40" />
      <div className="h06-splash-swirl h06-splash-swirl-2 !opacity-30" />

      <div className="relative flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/render-emerald-alpha.png"
          alt="H06 Rentals"
          className="h06-glass-breathe w-[min(48vw,240px)]"
          draggable={false}
        />

        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.5em] text-cream">
          H06<span className="ml-3 font-normal text-cream-dim">Rentals</span>
        </p>

        <h1 className="display mt-6 max-w-xl text-3xl leading-snug text-cream md:text-4xl">
          The showroom will be re&#8209;opened momentarily.
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted">
          Lagos · Private luxury mobility
        </p>

        <Countdown launchAt={launchAt} />

        <p className="mt-4 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
          Saturday 18 July · 6:00 PM WAT
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://wa.me/2349139999533?text=Hello%20H06%20Rentals!%20I%27d%20like%20to%20book%20ahead%20of%20the%20reopening."
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-md"
          >
            WhatsApp the concierge
          </a>
          <a
            href="https://www.instagram.com/h06rentals"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-md"
          >
            Follow @h06rentals
          </a>
        </div>
      </div>
    </main>
  );
}
