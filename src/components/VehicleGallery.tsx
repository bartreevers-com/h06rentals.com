"use client";

import { useState } from "react";

/**
 * Vehicle photo gallery for detail pages. Shows the real car; the caption is
 * honest about representative imagery until H06's studio shots land.
 */
export function VehicleGallery({
  images,
  vehicleName,
}: {
  images: { src: string; credit?: string }[];
  vehicleName: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];

  return (
    <figure>
      <div className="relative overflow-hidden rounded-3xl stage-gradient" style={{ aspectRatio: "16/9" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={vehicleName}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/45 via-transparent to-transparent" />
        <span className="absolute bottom-4 left-4 glass-subtle px-3.5 py-1.5 text-xs text-cream-dim">
          Representative imagery · 360° studio shoot in production
        </span>
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-24 overflow-hidden rounded-lg border transition-colors ${
                i === active ? "border-emerald-glow/70" : "border-transparent opacity-60 hover:opacity-100"
              }`}
              aria-label={`View photo ${i + 1} of ${vehicleName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {current.credit && (
        <figcaption className="mt-2 text-right text-[0.65rem] text-muted/70">
          Photo: {current.credit}
        </figcaption>
      )}
    </figure>
  );
}
