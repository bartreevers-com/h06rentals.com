import { sketchFor, type SketchTint } from "@/lib/sketches";
import { VehicleSilhouette } from "./VehicleSilhouette";

/**
 * H06 design-studio sketch for a vehicle — showroom green for the core
 * fleet, champagne bronze for the VIP wing — falling back to the blueprint
 * silhouette for anything without a drawing yet.
 *
 * With `hoverSpin`, a second variant of the sketch with permanently
 * spinning wheels sits on top and fades in when an ancestor `.group`
 * is hovered — the car "rolls" under the cursor.
 */
export function VehicleSketch({
  slug,
  category,
  name,
  className,
  tint = "green",
  hoverSpin = false,
}: {
  slug: string;
  category: string;
  name: string;
  className?: string;
  tint?: SketchTint;
  hoverSpin?: boolean;
}) {
  const src = sketchFor(slug, tint);
  if (!src) {
    return <VehicleSilhouette category={category} className={className} />;
  }
  if (!hoverSpin) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={`${name} design sketch`} className={className} draggable={false} />
    );
  }
  const spinSrc = src.replace(".svg", "-spin.svg");
  return (
    <span className={`sketch-swap block ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`${name} design sketch`} className="sketch-static block w-full" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spinSrc} alt="" aria-hidden className="sketch-spin block w-full" draggable={false} loading="lazy" />
    </span>
  );
}
