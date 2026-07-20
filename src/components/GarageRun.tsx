"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The H06 run — unlisted, on the 404 only. The G-Wagon sketch drives an
 * endless Lagos road: construction cones and potholes are JUMPED; danfos,
 * kekes, okadas and hawkers must be SWERVED. One control (space / tap):
 * with Lagos traffic ahead it swerves — each time in a different style —
 * otherwise it jumps. Mistime it and the driver is out of the car.
 */

const GROUND = 24;
const CAR_X = 36;
const CAR_W = 132;
const GRAVITY = 2600;
const JUMP_V = 880;
const BASE_SPEED = 340;
const RAMP = 9;
const MAX_SPEED = 920;

type Kind = "cone" | "pothole" | "hawker" | "okada" | "keke" | "danfo";
type Action = "jump" | "swerve";

interface Spec {
  kind: Kind;
  action: Action;
  w: number;
  h: number;
  extraSpeed: number; // own movement relative to traffic
  gap: number; // extra breathing room after this obstacle
  weight: number;
  svg: string;
}

const YELLOW = "#e3b341";
const LINE = "var(--emerald-glow)";
const FAINT = "rgba(120,130,124,0.9)";

const SPECS: Spec[] = [
  {
    kind: "cone", action: "jump", w: 22, h: 26, extraSpeed: 0, gap: 0, weight: 20,
    svg: `<svg viewBox="0 0 26 30" width="22" height="26" fill="none" stroke="${LINE}" stroke-width="1.6" stroke-linecap="round"><path d="M13 3 L20 26 M13 3 L6 26 M3 27 H23 M9 17 H17"/></svg>`,
  },
  {
    kind: "pothole", action: "jump", w: 52, h: 10, extraSpeed: 0, gap: 20, weight: 18,
    svg: `<svg viewBox="0 0 52 12" width="52" height="12" fill="none" stroke="${FAINT}" stroke-width="1.5" stroke-linecap="round"><path d="M2 4 L9 9 L17 6 L26 10 L35 5 L43 9 L50 4"/><path d="M8 4 L14 3 M30 3 L38 2" opacity="0.5"/></svg>`,
  },
  {
    kind: "hawker", action: "swerve", w: 30, h: 58, extraSpeed: -40, gap: 10, weight: 16,
    svg: `<svg viewBox="0 0 30 58" width="30" height="58" fill="none" stroke="${LINE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="22" height="6" rx="1"/><path d="M8 2 V0 M22 2 V0"/><circle cx="15" cy="14" r="4.5"/><path d="M15 18 V36 M15 22 L6 30 M15 22 L24 28 M15 36 L8 54 M15 36 L22 54"/></svg>`,
  },
  {
    kind: "okada", action: "swerve", w: 64, h: 46, extraSpeed: 90, gap: 20, weight: 16,
    svg: `<svg viewBox="0 0 64 46" width="64" height="46" fill="none" stroke="${LINE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="37" r="7"/><circle cx="50" cy="37" r="7"/><path d="M12 37 L24 24 H40 L50 37 M40 24 L46 16 H52 M24 24 L20 30"/><circle cx="34" cy="8" r="4"/><path d="M34 12 L30 24 M34 14 L42 18 M30 24 L26 36 M32 25 L34 36"/></svg>`,
  },
  {
    kind: "keke", action: "swerve", w: 70, h: 52, extraSpeed: -60, gap: 24, weight: 16,
    svg: `<svg viewBox="0 0 70 52" width="70" height="52" fill="none" stroke="${YELLOW}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 40 L14 18 Q15 8 26 8 H50 Q58 8 60 18 L62 40"/><path d="M22 8 V26 H62 M12 40 H62 M30 8 V26"/><circle cx="20" cy="44" r="6"/><circle cx="52" cy="44" r="6"/></svg>`,
  },
  {
    kind: "danfo", action: "swerve", w: 124, h: 58, extraSpeed: -90, gap: 70, weight: 14,
    svg: `<svg viewBox="0 0 124 58" width="124" height="58" fill="none" stroke="${YELLOW}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 46 V16 Q6 8 14 8 H104 L118 24 V46 H6 Z"/><path d="M6 30 H118" stroke-width="3" opacity="0.55"/><path d="M18 8 V22 H34 V8 M42 8 V22 H58 V8 M66 8 V22 H82 V8 M104 8 L104 22 H92 V8"/><circle cx="26" cy="49" r="7"/><circle cx="96" cy="49" r="7"/></svg>`,
  },
];
const TOTAL_WEIGHT = SPECS.reduce((s, o) => s + o.weight, 0);

const DRIVER_SVG = `<svg viewBox="0 0 24 34" width="24" height="34" fill="none" stroke="${LINE}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="4"/><path d="M12 9 V20 M12 12 L4 8 M12 12 L20 8 M12 20 L5 31 M12 20 L19 31"/></svg>`;

const SWERVE_STYLES = ["h06-swerve-cut", "h06-swerve-wide", "h06-swerve-drift"];

interface Ob {
  el: HTMLDivElement;
  spec: Spec;
  x: number;
  dodged: boolean;
}

export function GarageRun() {
  const stageRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const carImgRef = useRef<HTMLImageElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "over">("idle");
  const [best, setBest] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [crashedBy, setCrashedBy] = useState<Kind | null>(null);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const game = useRef({
    y: 0, vy: 0, speed: BASE_SPEED, dist: 0, nextGap: 0,
    obs: [] as Ob[], raf: 0, last: 0, swerveUntil: 0,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setBest(Number(localStorage.getItem("h06_run_best")) || 0);
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const g = game.current;

    const clearObs = () => {
      for (const o of g.obs) o.el.remove();
      g.obs = [];
    };

    const pickSpec = (): Spec => {
      let r = Math.random() * TOTAL_WEIGHT;
      for (const s of SPECS) {
        r -= s.weight;
        if (r <= 0) return s;
      }
      return SPECS[0];
    };

    const spawn = (stageW: number) => {
      const lane = laneRef.current;
      if (!lane) return;
      const spec = pickSpec();
      const el = document.createElement("div");
      const bottom = spec.kind === "pothole" ? GROUND - 6 : GROUND;
      el.style.cssText = `position:absolute;bottom:${bottom}px;width:${spec.w}px;height:${spec.h}px;will-change:transform;`;
      el.innerHTML = spec.svg;
      lane.appendChild(el);
      g.obs.push({ el, spec, x: stageW + spec.w, dodged: false });
      // reaction distance grows with speed; big vehicles get extra room
      g.nextGap = 300 + Math.random() * 420 + g.speed * 0.45 + spec.gap * 4;
    };

    const crash = (ob: Ob) => {
      cancelAnimationFrame(g.raf);
      const car = carRef.current;
      const stage = stageRef.current;
      // the driver is out of the car
      if (car && stage) {
        car.classList.add("h06-crashed");
        const driver = document.createElement("div");
        driver.className = "h06-driver-eject";
        driver.style.cssText = `position:absolute;left:${CAR_X + CAR_W / 2}px;bottom:${GROUND + 40}px;`;
        driver.innerHTML = DRIVER_SVG;
        stage.appendChild(driver);
        setTimeout(() => driver.remove(), 1400);
      }
      const finalScore = Math.floor(g.dist / 10);
      setLastScore(finalScore);
      setCrashedBy(ob.spec.kind);
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

      g.speed = Math.min(MAX_SPEED, g.speed + RAMP * dt);
      g.dist += g.speed * dt;

      // car physics (vertical only; swerves are a CSS animation)
      if (g.y > 0 || g.vy > 0) {
        g.vy -= GRAVITY * dt;
        g.y = Math.max(0, g.y + g.vy * dt);
        if (g.y === 0) g.vy = 0;
      }
      car.style.transform = `translateY(${-g.y}px)`;

      g.nextGap -= g.speed * dt;
      if (g.nextGap <= 0) spawn(stageW);

      const swerving = performance.now() < g.swerveUntil;
      const carLeft = CAR_X + 16;
      const carRight = CAR_X + CAR_W - 20;

      for (let i = g.obs.length - 1; i >= 0; i--) {
        const o = g.obs[i];
        o.x -= (g.speed + o.spec.extraSpeed) * dt;
        if (o.x < -140) {
          o.el.remove();
          g.obs.splice(i, 1);
          continue;
        }
        o.el.style.transform = `translateX(${o.x}px)`;

        const overlap = o.x < carRight && o.x + o.spec.w > carLeft;
        if (!overlap || o.dodged) continue;

        if (o.spec.action === "swerve") {
          if (!swerving) {
            crash(o);
            return;
          }
          o.dodged = true; // carried through the swerve
        } else if (o.spec.kind === "pothole") {
          if (g.y < 10) {
            crash(o);
            return;
          }
        } else if (g.y < o.spec.h - 6) {
          crash(o);
          return;
        }
      }

      if (scoreRef.current) scoreRef.current.textContent = String(Math.floor(g.dist / 10)).padStart(4, "0");
      g.raf = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(g.raf); // never two loops, however fast the restarts
      clearObs();
      const car = carRef.current;
      car?.classList.remove("h06-crashed", ...SWERVE_STYLES);
      g.y = 0;
      g.vy = 0;
      g.speed = BASE_SPEED;
      g.dist = 0;
      g.nextGap = 480;
      g.swerveUntil = 0;
      g.last = performance.now();
      setCrashedBy(null);
      setPhase("running");
      g.raf = requestAnimationFrame(frame);
    };

    /** One control. Traffic ahead → swerve (random style); road ahead → jump. */
    const act = () => {
      if (phaseRef.current !== "running") {
        start();
        return;
      }
      const carRight = CAR_X + CAR_W - 20;
      const reaction = 60 + g.speed * 0.42; // press window scales with speed
      const target = g.obs
        .filter((o) => !o.dodged && o.spec.action === "swerve" && o.x + o.spec.w > CAR_X && o.x < carRight + reaction)
        .sort((a, b) => a.x - b.x)[0];

      const car = carRef.current;
      if (target && car) {
        g.swerveUntil = performance.now() + 470;
        const style = SWERVE_STYLES[Math.floor(Math.random() * SWERVE_STYLES.length)];
        car.classList.remove(...SWERVE_STYLES);
        void car.offsetWidth; // restart the animation
        car.classList.add(style);
        setTimeout(() => car.classList.remove(style), 500);
      } else if (g.y === 0) {
        g.vy = JUMP_V;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        if (!stageRef.current) return;
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
      clearObs();
    };
  }, []);

  const CRASH_LINES: Record<Kind, string> = {
    cone: "the construction got you",
    pothole: "that pothole was personal",
    hawker: "you owe someone gala money",
    okada: "the okada came out of nowhere",
    keke: "keke no dey brake",
    danfo: "the danfo always wins",
  };

  return (
    <div
      ref={stageRef}
      className="relative mx-auto mt-4 h-52 w-full max-w-xl cursor-pointer touch-none select-none overflow-hidden"
      role="application"
      aria-label="The H06 run — press space or tap: swerve the traffic, jump the potholes"
    >
      <span ref={scoreRef} className="absolute right-1 top-1 font-mono text-xs tabular-nums text-muted">
        0000
      </span>
      {best > 0 && (
        <span className="absolute left-1 top-1 font-mono text-xs tabular-nums text-muted/60">
          best {String(best).padStart(4, "0")}
        </span>
      )}

      <div ref={laneRef} className="absolute inset-0" />

      <div ref={carRef} className="absolute" style={{ left: CAR_X, bottom: GROUND - 6, width: CAR_W }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={carImgRef}
          src="/sketches/gwagon-2023-spin.svg"
          alt=""
          width={CAR_W}
          height={62}
          draggable={false}
          className="w-full"
          style={{ transform: "scaleX(-1)" }} // the sketch faces left; the run goes right
        />
      </div>

      <div className="absolute inset-x-0 border-t hairline" style={{ bottom: GROUND }} />

      {phase !== "running" && (
        <div className="absolute inset-x-0 bottom-1 text-center text-[11px] uppercase tracking-[0.22em] text-muted">
          {phase === "over"
            ? `${lastScore}m — ${crashedBy ? CRASH_LINES[crashedBy] : "crashed"} · space or tap to drive again`
            : "space or tap · swerve the traffic, jump the potholes"}
        </div>
      )}
    </div>
  );
}
