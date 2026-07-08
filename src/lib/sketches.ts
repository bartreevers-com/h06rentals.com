/**
 * H06 design-studio vehicle sketches (hand-drawn line art, default colour
 * #8FCF9D). One sketch per model; year variants share a drawing.
 */
export const HERO_SKETCH = "/sketches/hero-gwagon.svg";

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

export function sketchFor(slug: string): string | null {
  return SKETCH_BY_SLUG[slug] ?? null;
}
