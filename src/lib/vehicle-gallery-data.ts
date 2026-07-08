/**
 * H06 fleet photography — dark emerald studio sets only (side/front/rear/
 * interior), film-graded for the web. Cards and the home showroom keep the
 * blueprint icons; these appear on vehicle detail pages.
 *
 * Vehicles without matching studio photography (and the armoured fleet, by
 * design) use the blueprint turntable stage instead.
 */
export const VEHICLE_GALLERIES: Record<string, { src: string; credit?: string }[]> = {
  prado_2020: [
    { src: "/vehicles/prado_2020_side.webp" },
    { src: "/vehicles/prado_2020_front.webp" },
    { src: "/vehicles/prado_2020_rear.webp" },
    { src: "/vehicles/prado_2020_interior.webp" },
  ],
  prado_2022: [
    { src: "/vehicles/prado_2022_side.webp" },
    { src: "/vehicles/prado_2022_front.webp" },
    { src: "/vehicles/prado_2022_rear.webp" },
    { src: "/vehicles/prado_2022_interior.webp" },
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
  ],
  lx570: [{ src: "/vehicles/lx570_studio.webp" }],
};

/** All slugs whose galleries are managed by this file — the sync keeps the
 *  database exactly in step with it (there is no admin gallery editor yet,
 *  so the code is the source of truth). */
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
