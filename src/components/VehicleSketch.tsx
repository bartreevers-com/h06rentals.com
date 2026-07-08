import { sketchFor, type SketchTint } from "@/lib/sketches";
import { VehicleSilhouette } from "./VehicleSilhouette";

/**
 * H06 design-studio sketch for a vehicle — showroom green for the core
 * fleet, champagne bronze for the VIP wing — falling back to the blueprint
 * silhouette for anything without a drawing yet.
 */
export function VehicleSketch({
  slug,
  category,
  name,
  className,
  tint = "green",
}: {
  slug: string;
  category: string;
  name: string;
  className?: string;
  tint?: SketchTint;
}) {
  const src = sketchFor(slug, tint);
  if (!src) {
    return <VehicleSilhouette category={category} className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`${name} design sketch`} className={className} draggable={false} />
  );
}
