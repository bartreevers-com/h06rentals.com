"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VehicleSilhouette } from "./VehicleSilhouette";
import { sketchFor, type SketchTint } from "@/lib/sketches";

/**
 * 360° vehicle turntable.
 *
 * With real frames (8+ images shot around the car) it scrubs frame-by-frame
 * on drag/swipe — the architecture the H06 team can feed studio assets into
 * later. Until then it presents an honest, premium "stage" with the vehicle
 * silhouette that responds to drag with a subtle perspective sway.
 */
export function Turntable360({
  frames,
  category,
  vehicleName,
  imageUrl,
  slug,
  tint = "green",
}: {
  frames: string[];
  category: string;
  vehicleName: string;
  imageUrl?: string | null;
  slug?: string;
  tint?: SketchTint;
}) {
  const sketchSrc = slug ? sketchFor(slug, tint) : null;
  const hasFrames = frames.length >= 8;
  const [frame, setFrame] = useState(0);
  const [sway, setSway] = useState(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const swayTarget = useRef(0);
  const raf = useRef<number | null>(null);

  const onDown = useCallback((x: number) => {
    dragging.current = true;
    lastX.current = x;
  }, []);

  const onMove = useCallback(
    (x: number) => {
      if (!dragging.current) return;
      const dx = x - lastX.current;
      lastX.current = x;
      if (hasFrames) {
        setFrame((f) => {
          const n = frames.length;
          return (((f + Math.round(dx / 6)) % n) + n) % n;
        });
      } else {
        swayTarget.current = Math.max(-14, Math.min(14, swayTarget.current + dx * 0.12));
      }
    },
    [hasFrames, frames.length],
  );

  const onUp = useCallback(() => {
    dragging.current = false;
    swayTarget.current = 0;
  }, []);

  // spring the sway back to centre
  useEffect(() => {
    if (hasFrames) return;
    const tick = () => {
      setSway((s) => {
        const t = swayTarget.current;
        const next = s + (t - s) * 0.12;
        return Math.abs(next - t) < 0.01 ? t : next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [hasFrames]);

  // preload frames
  useEffect(() => {
    frames.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, [frames]);

  return (
    <div
      className="relative select-none touch-pan-y cursor-grab active:cursor-grabbing overflow-hidden rounded-3xl stage-gradient"
      style={{ aspectRatio: "16/9" }}
      onMouseDown={(e) => onDown(e.clientX)}
      onMouseMove={(e) => onMove(e.clientX)}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchStart={(e) => onDown(e.touches[0].clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onUp}
      role="img"
      aria-label={`${vehicleName} 360 degree view`}
    >
      <div className="mark-watermark" />

      {hasFrames ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frames[frame]}
          alt={vehicleName}
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={vehicleName}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-10">
          <div
            className="w-full max-w-xl"
            style={{
              transform: `perspective(900px) rotateY(${sway}deg)`,
              transition: dragging.current ? "none" : "transform 0.4s ease",
            }}
          >
            {sketchSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sketchSrc}
                alt={`${vehicleName} design sketch`}
                className="w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)]"
                draggable={false}
              />
            ) : (
              <VehicleSilhouette category={category} className="w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)]" />
            )}
          </div>
        </div>
      )}

      {/* stage floor reflection */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 90% at 50% 100%, rgba(46,139,106,0.22), transparent 70%)",
        }}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 glass-subtle px-4 py-2 text-xs text-cream-dim whitespace-nowrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 12a9 9 0 1 1-9-9" />
          <path d="M21 3v6h-6" />
        </svg>
        {hasFrames ? "Drag to rotate" : "Drag to preview · full 360° imagery in production"}
      </div>
    </div>
  );
}
