"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * The showroom entrance: a brief emerald-glass mark moment on first visit,
 * then the doors open. Skipped for returning visitors in the same session
 * and for users who prefer reduced motion.
 */
export function ShowroomEntry() {
  const [show, setShow] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    try {
      if (sessionStorage.getItem("h06_entered")) return;
      sessionStorage.setItem("h06_entered", "1");
      setShow(true);
      const t = setTimeout(() => setShow(false), 1900);
      return () => clearTimeout(t);
    } catch {
      // storage unavailable — skip the moment
    }
  }, [reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          aria-hidden
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.21, 0.6, 0.35, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <Image
              src="/brand/mark-emerald.png"
              alt=""
              width={110}
              height={110}
              priority
              className="mark-pulse"
            />
            <p className="eyebrow eyebrow-emerald">Entering the showroom</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
