import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load these from node_modules at runtime instead of bundling —
  // PGlite ships WASM that must not be transformed by the bundler.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
