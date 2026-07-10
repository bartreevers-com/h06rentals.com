"use client";

import { useEffect } from "react";

/**
 * The showroom entrance: the emerald glass mark floating in dark space with
 * slow swirls of emerald mist behind it. Shown once per session (an inline
 * script in the root layout sets `data-h06-splash` on <html> before first
 * paint, so there is no flash of content). Click anywhere to skip.
 */
export function Splash() {
  useEffect(() => {
    const html = document.documentElement;
    if (html.getAttribute("data-h06-splash") !== "1") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dismiss = () => {
      html.removeAttribute("data-h06-splash");
      try {
        sessionStorage.setItem("h06_splash_seen", "1");
      } catch {
        // private mode — splash will simply show again next time
      }
    };
    const timer = setTimeout(dismiss, reduce ? 1200 : 2600);
    window.addEventListener("pointerdown", dismiss, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", dismiss);
    };
  }, []);

  return (
    <div className="h06-splash" aria-hidden>
      <div className="h06-splash-swirl" />
      <div className="h06-splash-swirl h06-splash-swirl-2" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/render-emerald-alpha.png" alt="" className="h06-splash-mark" draggable={false} />
      <div className="h06-splash-sheen" />
      <div className="h06-splash-word absolute bottom-[16vh] text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.5em] text-cream">
          H06<span className="ml-3 font-normal text-cream-dim">Rentals</span>
        </p>
        <p className="mt-2 text-[0.65rem] uppercase tracking-[0.3em] text-muted">
          Lagos · Private luxury mobility
        </p>
      </div>
    </div>
  );
}
