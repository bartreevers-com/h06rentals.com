import { sketchFor } from "@/lib/sketches";
import { VehicleSilhouette } from "./VehicleSilhouette";

/**
 * H06 design-studio sketch for a vehicle (default colour #8FCF9D), falling
 * back to the blueprint silhouette for anything without a drawing yet.
 */
export function VehicleSketch({
  slug,
  category,
  name,
  className,
}: {
  slug: string;
  category: string;
  name: string;
  className?: string;
}) {
  const src = sketchFor(slug);
  if (!src) {
    return <VehicleSilhouette category={category} className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`${name} design sketch`} className={className} draggable={false} />
  );
}
