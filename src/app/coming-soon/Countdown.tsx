"use client";

import { useEffect, useState } from "react";

/** ?crew=1 lets the team through the gate early (72h cookie). */
export function CrewGate() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("crew") === "1") {
      document.cookie = "h06_crew=1; path=/; max-age=259200; samesite=lax";
      window.location.href = "/";
    }
  }, []);
  return null;
}

/** Live countdown to launch. When it hits zero, the page reloads and the
 *  proxy lets the visitor straight into the showroom. */
export function Countdown({ launchAt }: { launchAt: string }) {
  const target = new Date(launchAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (now !== null && now >= target) {
      const r = setTimeout(() => window.location.reload(), 1500);
      return () => clearTimeout(r);
    }
  }, [now, target]);

  if (now === null) {
    return <div className="mt-10 h-[76px]" aria-hidden />;
  }

  const remaining = Math.max(0, target - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  if (remaining === 0) {
    return (
      <p className="mt-10 text-lg font-medium text-emerald-glow">
        The doors are opening…
      </p>
    );
  }

  const cells: [string, number][] = [
    ["Days", days],
    ["Hours", hours],
    ["Minutes", minutes],
    ["Seconds", seconds],
  ];

  return (
    <div className="mt-10 flex items-start gap-3 sm:gap-5" role="timer" aria-live="off">
      {cells.map(([label, value], i) => (
        <div key={label} className="flex items-start gap-3 sm:gap-5">
          {i > 0 && <span className="pt-2 text-2xl text-emerald-deep sm:text-3xl">:</span>}
          <div className="flex flex-col items-center">
            <span className="glass-subtle min-w-[64px] px-3 py-2.5 text-center font-mono text-3xl tabular-nums text-cream sm:min-w-[76px] sm:text-4xl">
              {String(value).padStart(2, "0")}
            </span>
            <span className="mt-2 text-[0.6rem] uppercase tracking-[0.25em] text-muted">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
