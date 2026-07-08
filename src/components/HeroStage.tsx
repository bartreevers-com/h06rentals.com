"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HERO_SKETCH } from "@/lib/sketches";

/**
 * The showroom hero: the H06 design-studio sketch of the Mercedes G-Wagon
 * 2025 (default colour #8FCF9D), fading up onto the dark stage with a slow
 * breathing glow beneath.
 */
export function HeroStage() {
  const reduce = useReducedMotion();

  return (
    <div className="relative w-full select-none" aria-hidden>
      <motion.img
        src={HERO_SKETCH}
        alt=""
        draggable={false}
        className="w-full drop-shadow-[0_28px_60px_rgba(30,92,69,0.35)]"
        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.21, 0.6, 0.35, 1], delay: 0.15 }}
      />
      {!reduce && (
        <motion.div
          className="pointer-events-none absolute inset-x-[8%] bottom-2 h-16 rounded-[100%]"
          style={{ background: "radial-gradient(ellipse at center, rgba(143,207,157,0.22), transparent 70%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ delay: 1.4, duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
