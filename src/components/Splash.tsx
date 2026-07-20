"use client";

import { useEffect } from "react";

/**
 * The showroom entrance, shown only on a visitor's very first arrival
 * (localStorage-gated; the inline script in the root layout sets
 * `data-h06-splash` before first paint, so there's no flash of content).
 *
 * Choreography: the mark swells gently toward the viewer, breathing as it
 * approaches, then accelerates past the camera and dissolves — revealing
 * the hero beneath. Click anywhere to skip.
 */
export function Splash() {
  useEffect(() => {
    const html = document.documentElement;
    if (html.getAttribute("data-h06-splash") !== "1") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dismiss = () => {
      html.removeAttribute("data-h06-splash");
      try {
        localStorage.setItem("h06_splash_seen_v2", "1");
      } catch {
        // private mode — the splash will simply show again next visit
      }
    };
    // the backdrop fade overlaps the mark's final zoom-through
    const timer = setTimeout(dismiss, reduce ? 900 : 2050);
    window.addEventListener("pointerdown", dismiss, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", dismiss);
    };
  }, []);

  return (
    <div className="h06-splash" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/render-emerald-alpha.png" alt="" className="h06-splash-mark" draggable={false} />
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
