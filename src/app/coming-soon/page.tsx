import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { launched } from "@/lib/launch-gate";
import { CrewGate } from "./Countdown";
import { RevealStage } from "./RevealStage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "H06 Rentals — The Showroom Reopens Soon",
  description:
    "H06 Rentals, Lagos. The showroom will be re-opened momentarily. Luxury car hire and chauffeur service.",
  robots: { index: false, follow: false },
};

/** Pre-launch landing in two acts: the veiled countdown until the unveiling
 *  (Fri 6 PM WAT), then the mark springs in and the timer runs the final
 *  24 hours to the reopening (Sat 6 PM WAT). The gate lifts itself. */
export default async function ComingSoon({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  if (launched()) redirect("/");
  const { preview } = await searchParams;
  const forcePhase =
    preview === "veil" ? ("veil" as const) : preview === "revealed" ? ("revealed" as const) : undefined;

  const revealAt = process.env.NEXT_PUBLIC_REVEAL_AT ?? "2026-07-17T18:00:00+01:00";
  const launchAt = process.env.NEXT_PUBLIC_LAUNCH_AT ?? "2026-07-18T18:00:00+01:00";

  return (
    <main className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,#0c1a14_0%,#050807_68%,#030504_100%)] px-6">
      <CrewGate />
      {/* the swirling emerald atmosphere, same language as the splash */}
      <div className="h06-splash-swirl !opacity-40" />
      <div className="h06-splash-swirl h06-splash-swirl-2 !opacity-30" />

      <div className="relative flex flex-col items-center text-center">
        <RevealStage revealAt={revealAt} launchAt={launchAt} forcePhase={forcePhase} />

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
