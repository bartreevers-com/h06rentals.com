/**
 * H06's own fleet photography (studio sets shot on the emerald showroom
 * stage, plus Lagos location shots). Cards and the home showroom keep the
 * blueprint icons; these appear on vehicle detail pages.
 *
 * Vehicles without their own photography (and the armoured fleet, by
 * design) fall back to the blueprint turntable stage.
 */
export const VEHICLE_GALLERIES: Record<string, { src: string; credit?: string }[]> = {
  prado_2020: [
    { src: "/vehicles/prado_2020_side.webp" },
    { src: "/vehicles/prado_2020_front.webp" },
    { src: "/vehicles/prado_2020_rear.webp" },
    { src: "/vehicles/prado_2020_interior.webp" },
    { src: "/vehicles/prado_2020_lagos.webp" },
  ],
  prado_2022: [
    { src: "/vehicles/prado_2022_side.webp" },
    { src: "/vehicles/prado_2022_front.webp" },
    { src: "/vehicles/prado_2022_rear.webp" },
    { src: "/vehicles/prado_2022_interior.webp" },
    { src: "/vehicles/prado_2022_lagos.webp" },
  ],
  gx460_2020: [
    { src: "/vehicles/gx460_2020_side.webp" },
    { src: "/vehicles/gx460_2020_front.webp" },
    { src: "/vehicles/gx460_2020_rear.webp" },
    { src: "/vehicles/gx460_2020_interior.webp" },
  ],
  gx460_2022: [
    { src: "/vehicles/gx460_2022_side.webp" },
    { src: "/vehicles/gx460_2022_front.webp" },
    { src: "/vehicles/gx460_2022_rear.webp" },
    { src: "/vehicles/gx460_2022_interior.webp" },
  ],
  hilux_2022: [
    { src: "/vehicles/hilux_2022_side.webp" },
    { src: "/vehicles/hilux_2022_front.webp" },
    { src: "/vehicles/hilux_2022_rear.webp" },
    { src: "/vehicles/hilux_2022_interior.webp" },
    { src: "/vehicles/hilux_2022_lagos.webp" },
  ],
  landcruiser_2024: [{ src: "/vehicles/landcruiser_2024_main.webp" }],
  lx570: [
    { src: "/vehicles/lx570_studio.webp" },
    { src: "/vehicles/lx570_lagos.webp" },
  ],
  prado_2025: [{ src: "/vehicles/prado_2025_main.webp" }],
};

/** Slugs whose placeholder galleries should be cleared if no H06 photography
 *  exists (previously seeded with licensed stock imagery). */
export const ALL_GALLERY_SLUGS = [
  "prado_2020",
  "prado_2022",
  "gx460_2020",
  "gx460_2022",
  "hilux_2022",
  "lx600",
  "lx570",
  "gwagon_2023",
  "landcruiser_2022",
  "landcruiser_2024",
  "prado_2025",
  "range_rover",
  "rolls_royce",
  "urus",
  "armoured",
  "luxury_bus",
];
