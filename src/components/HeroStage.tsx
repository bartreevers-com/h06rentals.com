"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The showroom hero: a luxury SUV drawn in emerald light on the dark stage.
 * The outline draws itself on entry, then breathes with a slow glow — no
 * photography, pure line work, matching the fleet's blueprint language.
 */

const BODY =
  "M30 130 L30 96 Q30 86 42 84 L100 80 L116 44 Q120 34 132 34 L306 34 Q318 34 320 46 L324 80 L352 86 Q366 90 368 100 L372 122 Q374 130 362 130 L344 130 M308 130 L144 130 M90 130 L40 130 Q30 130 30 126 Z";
const WINDOW_F = "M132 44 L196 44 L196 76 L118 78 Z";
const WINDOW_R = "M208 44 L296 44 L308 76 L208 76 Z";
const HANDLE = "M52 96 L80 96";

export function HeroStage() {
  const reduce = useReducedMotion();

  const draw = (delay: number) => ({
    initial: { pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: reduce
      ? { duration: 0 }
      : {
          pathLength: { duration: 1.8, delay, ease: "easeInOut" as const },
          opacity: { duration: 0.3, delay },
        },
  });

  return (
    <div className="relative w-full select-none" aria-hidden>
      <motion.svg
        viewBox="0 0 400 170"
        className="w-full drop-shadow-[0_28px_60px_rgba(30,92,69,0.35)]"
        initial={reduce ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <defs>
          <linearGradient id="heroStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2e8b6a" />
            <stop offset="55%" stopColor="#3fae85" />
            <stop offset="100%" stopColor="#c9cdd1" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        <motion.path
          d={BODY}
          fill="none"
          stroke="url(#heroStroke)"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...draw(0.2)}
        />
        <motion.path d={WINDOW_F} fill="none" stroke="rgba(63,174,133,0.55)" strokeWidth={1.8} strokeLinejoin="round" {...draw(1.1)} />
        <motion.path d={WINDOW_R} fill="none" stroke="rgba(63,174,133,0.55)" strokeWidth={1.8} strokeLinejoin="round" {...draw(1.25)} />
        <motion.path d={HANDLE} fill="none" stroke="rgba(63,174,133,0.6)" strokeWidth={1.8} strokeLinecap="round" {...draw(1.5)} />

        {[{ cx: 116 }, { cx: 326 }].map((w, i) => (
          <g key={w.cx}>
            <motion.circle
              cx={w.cx}
              cy={130}
              r={26}
              fill="none"
              stroke="url(#heroStroke)"
              strokeWidth={2.2}
              {...draw(0.9 + i * 0.15)}
            />
            <motion.circle
              cx={w.cx}
              cy={130}
              r={10}
              fill="none"
              stroke="rgba(63,174,133,0.5)"
              strokeWidth={1.8}
              {...draw(1.3 + i * 0.15)}
            />
          </g>
        ))}

        {/* stage floor line + reflection glow */}
        <motion.line
          x1={12}
          y1={160}
          x2={388}
          y2={160}
          stroke="rgba(201,205,209,0.18)"
          strokeWidth={1}
          {...draw(1.6)}
        />
      </motion.svg>

      {!reduce && (
        <motion.div
          className="pointer-events-none absolute inset-x-[8%] bottom-0 h-16 rounded-[100%]"
          style={{ background: "radial-gradient(ellipse at center, rgba(46,139,106,0.28), transparent 70%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ delay: 2, duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
