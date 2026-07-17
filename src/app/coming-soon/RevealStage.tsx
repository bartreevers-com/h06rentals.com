"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * The two-act countdown.
 *
 * Act one (until revealAt): the mark stays hidden — an empty spotlight
 * pulses where it will appear, and the timer counts to the unveiling.
 * Act two (revealAt → launchAt): the emerald glass mark springs in live
 * on the page, and the timer retargets to the showroom opening.
 * At launchAt the page reloads itself and the gate lets everyone in.
 *
 * `forcePhase` lets the team preview either act via
 * /coming-soon?preview=veil or ?preview=revealed.
 */
export function RevealStage({
  revealAt,
  launchAt,
  forcePhase,
}: {
  revealAt: string;
  launchAt: string;
  forcePhase?: "veil" | "revealed";
}) {
  const reveal = new Date(revealAt).getTime();
  const launch = new Date(launchAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const revealed =
    forcePhase === "revealed" || (forcePhase !== "veil" && now !== null && now >= reveal);
  const launched = forcePhase === undefined && now !== null && now >= launch;

  useEffect(() => {
    if (launched) {
      const r = setTimeout(() => window.location.reload(), 1500);
      return () => clearTimeout(r);
    }
  }, [launched]);

  const target = revealed ? launch : reveal;
  const remaining = now === null ? null : Math.max(0, target - now);
  const days = remaining === null ? 0 : Math.floor(remaining / 86400000);
  const hours = remaining === null ? 0 : Math.floor((remaining % 86400000) / 3600000);
  const minutes = remaining === null ? 0 : Math.floor((remaining % 3600000) / 60000);
  const seconds = remaining === null ? 0 : Math.floor((remaining % 60000) / 1000);

  const cells: [string, number][] = [
    ["Days", days],
    ["Hours", hours],
    ["Minutes", minutes],
    ["Seconds", seconds],
  ];

  return (
    <div className="relative flex flex-col items-center text-center">
      {/* ── the stage: veil or the mark ─────────────────────────── */}
      <div className="relative flex h-[min(52vw,260px)] w-[min(48vw,240px)] items-center justify-center">
        <AnimatePresence mode="wait">
          {now === null ? (
            <div key="ssr" aria-hidden />
          ) : revealed ? (
            <motion.img
              key="mark"
              src="/brand/render-emerald-alpha.png"
              alt="The H06 mark — two blades of emerald glass"
              draggable={false}
              className="h06-glass-breathe w-full"
              initial={{ opacity: 0, scale: 0.35, filter: "blur(26px)", rotate: -8 }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)", rotate: 0 }}
              transition={{ type: "spring", stiffness: 110, damping: 13, mass: 1.1 }}
            />
          ) : (
            <motion.div
              key="veil"
              className="relative h-40 w-40"
              exit={{ opacity: 0, scale: 1.6, filter: "blur(18px)" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              aria-hidden
            >
              {/* an empty spotlight, waiting */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 50% 42%, rgba(46,139,106,0.4), rgba(30,92,69,0.12) 55%, transparent 72%)",
                  filter: "blur(6px)",
                }}
                animate={{ opacity: [0.55, 1, 0.55], scale: [0.96, 1.05, 0.96] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute inset-6 rounded-full border border-emerald-glow/20" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-10 text-sm font-semibold uppercase tracking-[0.5em] text-cream">
        H06<span className="ml-3 font-normal text-cream-dim">Rentals</span>
      </p>

      <h1 className="display mt-6 max-w-xl text-3xl leading-snug text-cream md:text-4xl">
        The showroom will be re&#8209;opened momentarily.
      </h1>
      <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted">
        Lagos · Private luxury mobility
      </p>

      {/* ── the timer ───────────────────────────────────────────── */}
      {now === null ? (
        <div className="mt-10 h-[104px]" aria-hidden />
      ) : launched ? (
        <p className="mt-10 text-lg font-medium text-emerald-glow">The doors are opening…</p>
      ) : (
        <>
          <div className="mt-10 flex items-start gap-3 sm:gap-5" role="timer" aria-live="off">
            {cells.map(([label, value], i) => (
              <div key={label} className="flex items-start gap-3 sm:gap-5">
                {i > 0 && <span className="pt-2 text-2xl text-emerald-deep sm:text-3xl">:</span>}
                <div className="flex flex-col items-center">
                  <span className="glass-subtle min-w-[64px] px-3 py-2.5 text-center font-mono text-3xl tabular-nums text-cream sm:min-w-[76px] sm:text-4xl">
                    {String(value).padStart(2, "0")}
                  </span>
                  <span className="mt-2 text-[0.6rem] uppercase tracking-[0.25em] text-muted">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <motion.p
            key={revealed ? "to-launch" : "to-reveal"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-[0.65rem] uppercase tracking-[0.25em] text-muted"
          >
            {revealed ? "Reopening · Saturday 18 July · 6:00 PM WAT" : "The unveiling · Today · 6:00 PM WAT"}
          </motion.p>
        </>
      )}
    </div>
  );
}
