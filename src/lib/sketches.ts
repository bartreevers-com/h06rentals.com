/**
 * H06 design-studio vehicle sketches (hand-drawn line art). Core fleet
 * renders in showroom green (#8FCF9D); the VIP wing renders in champagne
 * bronze (#D6B98C). Year variants share a drawing.
 */
export const HERO_SKETCH = "/sketches/hero-gwagon.svg";

export type SketchTint = "green" | "bronze";

const SKETCH_BY_SLUG: Record<string, string> = {
  prado_2020: "/sketches/prado.svg",
  prado_2022: "/sketches/prado.svg",
  gx460_2020: "/sketches/gx460-2020.svg",
  gx460_2022: "/sketches/gx460-2022.svg",
  hilux_2022: "/sketches/hilux.svg",
  lx570: "/sketches/lx570.svg",
  lx600: "/sketches/lx600.svg",
  gwagon_2023: "/sketches/gwagon-2023.svg",
  landcruiser_2022: "/sketches/landcruiser-300.svg",
  landcruiser_2024: "/sketches/landcruiser-300.svg",
  prado_2025: "/sketches/prado-2025.svg",
  range_rover: "/sketches/range-rover.svg",
  rolls_royce: "/sketches/rolls-royce.svg",
  urus: "/sketches/urus.svg",
  armoured: "/sketches/armoured.svg",
  luxury_bus: "/sketches/luxury-bus.svg",
};

/** Slugs with a bronze variant on disk (the VIP wing). */
const BRONZE_SLUGS = new Set([
  "lx570",
  "lx600",
  "gwagon_2023",
  "landcruiser_2022",
  "landcruiser_2024",
  "prado_2025",
  "range_rover",
  "rolls_royce",
  "urus",
  "armoured",
  "luxury_bus",
]);

export function sketchFor(slug: string, tint: SketchTint = "green"): string | null {
  const base = SKETCH_BY_SLUG[slug];
  if (!base) return null;
  if (tint === "bronze" && BRONZE_SLUGS.has(slug)) {
    return base.replace(".svg", "-bronze.svg");
  }
  return base;
}
