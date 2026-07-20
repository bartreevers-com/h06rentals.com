"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The H06 run — an unlisted, extremely minimal runner in the spirit of the
 * offline dinosaur: the G-Wagon design sketch drives the empty corridor,
 * jumping traffic cones. Lives only on the 404 page; there is no public
 * link to it anywhere. Space / tap to jump.
 */

const GROUND = 24; // px from container bottom
const CAR_X = 36;
const CAR_W = 132;
const CAR_H = 62;
const GRAVITY = 2600; // px/s²
const JUMP_V = 880; // px/s
const BASE_SPEED = 320; // px/s
const RAMP = 7; // speed gain per second

interface Cone {
  el: HTMLDivElement;
  x: number;
  w: number;
  h: number;
}

export function GarageRun() {
  const stageRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLImageElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "over">("idle");
  const [best, setBest] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const game = useRef({ y: 0, vy: 0, speed: BASE_SPEED, dist: 0, nextGap: 0, cones: [] as Cone[], raf: 0, last: 0 });

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem("h06_run_best")) || 0);
    } catch {}
  }, []);

  useEffect(() => {
    const g = game.current;

    const clearCones = () => {
      for (const c of g.cones) c.el.remove();
      g.cones = [];
    };

    const spawnCone = (stageW: number) => {
      const lane = laneRef.current;
      if (!lane) return;
      const el = document.createElement("div");
      const big = Math.random() > 0.6;
      const w = big ? 26 : 18;
      const h = big ? 30 : 22;
      el.style.cssText = `position:absolute;bottom:${GROUND}px;width:${w}px;height:${h}px;`;
      el.innerHTML = `<svg viewBox="0 0 26 30" width="${w}" height="${h}" fill="none" stroke="var(--emerald-glow)" stroke-width="1.6" stroke-linecap="round"><path d="M13 3 L20 26 M13 3 L6 26 M3 27 H23 M9 17 H17"/></svg>`;
      lane.appendChild(el);
      g.cones.push({ el, x: stageW + w, w, h });
    };

    const stop = (finalScore: number) => {
      cancelAnimationFrame(g.raf);
      setLastScore(finalScore);
      setPhase("over");
      setBest((b) => {
        const nb = Math.max(b, finalScore);
        try {
          localStorage.setItem("h06_run_best", String(nb));
        } catch {}
        return nb;
      });
    };

    const frame = (t: number) => {
      const stage = stageRef.current;
      const car = carRef.current;
      if (!stage || !car) return;
      const dt = Math.min((t - g.last) / 1000, 0.05);
      g.last = t;
      const stageW = stage.clientWidth;

      g.speed += RAMP * dt;
      g.dist += g.speed * dt;

      // car physics
      if (g.y > 0 || g.vy > 0) {
        g.vy -= GRAVITY * dt;
        g.y = Math.max(0, g.y + g.vy * dt);
        if (g.y === 0) g.vy = 0;
      }
      car.style.transform = `translateY(${-g.y}px)`;

      // cones
      g.nextGap -= g.speed * dt;
      if (g.nextGap <= 0) {
        spawnCone(stageW);
        g.nextGap = 420 + Math.random() * 520 + g.speed * 0.35;
      }
      for (let i = g.cones.length - 1; i >= 0; i--) {
        const c = g.cones[i];
        c.x -= g.speed * dt;
        if (c.x < -40) {
          c.el.remove();
          g.cones.splice(i, 1);
          continue;
        }
        c.el.style.transform = `translateX(${c.x}px)`;
        // forgiving collision box
        const carLeft = CAR_X + 16;
        const carRight = CAR_X + CAR_W - 20;
        const carBottom = g.y;
        if (c.x < carRight && c.x + c.w > carLeft && carBottom < c.h - 6) {
          stop(Math.floor(g.dist / 10));
          return;
        }
      }

      if (scoreRef.current) scoreRef.current.textContent = String(Math.floor(g.dist / 10)).padStart(4, "0");
      g.raf = requestAnimationFrame(frame);
    };

    const start = () => {
      clearCones();
      g.y = 0;
      g.vy = 0;
      g.speed = BASE_SPEED;
      g.dist = 0;
      g.nextGap = 500;
      g.last = performance.now();
      setPhase("running");
      g.raf = requestAnimationFrame(frame);
    };

    const jump = () => {
      if (g.y === 0) g.vy = JUMP_V;
    };

    const act = () => {
      if (phaseRef.current === "running") jump();
      else start();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        // only react when the stage is on screen and no field is focused
        const stage = stageRef.current;
        if (!stage) return;
        const tag = (document.activeElement?.tagName ?? "").toLowerCase();
        if (["input", "textarea", "select"].includes(tag)) return;
        e.preventDefault();
        act();
      }
    };
    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      act();
    };

    window.addEventListener("keydown", onKey);
    const stage = stageRef.current;
    stage?.addEventListener("pointerdown", onPointer);
    return () => {
      cancelAnimationFrame(g.raf);
      window.removeEventListener("keydown", onKey);
      stage?.removeEventListener("pointerdown", onPointer);
      clearCones();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={stageRef}
      className="relative mx-auto mt-4 h-48 w-full max-w-xl cursor-pointer touch-none select-none overflow-hidden"
      role="application"
      aria-label="The H06 run — press space or tap to jump"
    >
      <span
        ref={scoreRef}
        className="absolute right-1 top-1 font-mono text-xs tabular-nums text-muted"
      >
        0000
      </span>
      {best > 0 && (
        <span className="absolute left-1 top-1 font-mono text-xs tabular-nums text-muted/60">
          best {String(best).padStart(4, "0")}
        </span>
      )}

      <div ref={laneRef} className="absolute inset-0" />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={carRef}
        src="/sketches/gwagon-2023-spin.svg"
        alt=""
        width={CAR_W}
        height={CAR_H}
        draggable={false}
        className="absolute"
        style={{ left: CAR_X, bottom: GROUND - 6, width: CAR_W }}
      />

      {/* the road */}
      <div className="absolute inset-x-0 border-t hairline" style={{ bottom: GROUND }} />

      {phase !== "running" && (
        <div className="absolute inset-x-0 bottom-1 text-center text-[11px] uppercase tracking-[0.25em] text-muted">
          {phase === "over" ? `${lastScore}m — press space or tap to drive again` : "press space or tap to drive"}
        </div>
      )}
    </div>
  );
}
