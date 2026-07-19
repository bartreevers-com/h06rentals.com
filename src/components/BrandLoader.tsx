"use client";

import { useEffect, useState } from "react";
import { isMatchday, SOLIDARITY } from "@/lib/matchday";

/**
 * The glass mark, swirling — H06's loading state. Emerald for the showroom,
 * clear glass for the back office.
 *
 * On matchday the mark spins, grows, and becomes the H06 match ball in a
 * looping morph; if SOLIDARITY is set, the swirl ring wears the winning
 * nation's colours. Client-side so matchday expires on its own.
 */
const RENDERS = {
  emerald: "/brand/render-emerald-alpha.png",
  glass: "/brand/render-glass-alpha.png",
} as const;

export type LoaderVariant = keyof typeof RENDERS;

function solidarityRing(): string | undefined {
  if (!SOLIDARITY || SOLIDARITY.colors.length === 0) return undefined;
  const stops: string[] = [];
  const n = SOLIDARITY.colors.length;
  SOLIDARITY.colors.forEach((c, i) => {
    const from = Math.round((i / n) * 360);
    const to = Math.round(((i + 1) / n) * 360);
    stops.push(`${c}66 ${from}deg`, `${c}66 ${to}deg`);
  });
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

export function BrandLoader({ size = 84, variant = "emerald" }: { size?: number; variant?: LoaderVariant }) {
  const [matchday, setMatchday] = useState(false);
  useEffect(() => {
    setMatchday(isMatchday());
  }, []);

  const ringStyle = solidarityRing();

  return (
    <div className="h06-loader" style={{ width: size, height: size }}>
      <div
        className={`h06-loader-ring ${variant === "glass" ? "h06-loader-ring-glass" : ""}`}
        style={ringStyle ? { background: ringStyle } : undefined}
      />
      {matchday && variant === "emerald" ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={RENDERS.emerald}
            alt="Loading"
            width={size}
            height={size}
            className="h06-loader-mark h06-morph-mark"
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/matchball.png"
            alt=""
            width={size}
            height={size}
            className="h06-morph-ball"
            draggable={false}
            aria-hidden
          />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={RENDERS[variant]}
          alt="Loading"
          width={size}
          height={size}
          className="h06-loader-mark"
          draggable={false}
        />
      )}
    </div>
  );
}

/** Full-viewport centred loading state for route segments. */
export function PageLoader({ variant = "emerald" }: { variant?: LoaderVariant }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <BrandLoader variant={variant} />
    </div>
  );
}
