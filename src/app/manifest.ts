import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "H06 Rentals — Luxury Car Hire, Lagos",
    short_name: "H06 Rentals",
    description: "Luxury car hire and chauffeur-driven mobility in Lagos.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b100d",
    theme_color: "#0b100d",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
