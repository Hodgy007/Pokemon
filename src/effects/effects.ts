import type { EffectKind } from "../types";
import type { EffectFactory, FrameApi, Point } from "./engine";

type SpawnInput = Parameters<FrameApi["spawn"]>[0];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const TAU = Math.PI * 2;

/** Emit `count` particles flying outward from a point. */
function burst(
  a: FrameApi,
  at: Point,
  count: number,
  speed: [number, number],
  extra: (angle: number) => Partial<SpawnInput>,
) {
  for (let i = 0; i < count; i++) {
    const ang = rand(0, TAU);
    const v = rand(speed[0], speed[1]);
    a.spawn({ x: at.x, y: at.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, ...extra(ang) });
  }
}

function ring(a: FrameApi, at: Point, colors: string[], grow: number, life = 0.6, size = 12) {
  a.spawn({ x: at.x, y: at.y, shape: "ring", size, grow, life, colors });
}

/** Jagged lightning path between two points via midpoint displacement. */
function boltPath(from: Point, to: Point, spread: number, depth = 5): Point[] {
  let pts = [from, to];
  let s = spread;
  for (let d = 0; d < depth; d++) {
    const next: Point[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      next.push({ x: (p0.x + p1.x) / 2 + rand(-s, s), y: (p0.y + p1.y) / 2 + rand(-s, s) * 0.5 }, p1);
    }
    pts = next;
    s /= 2;
  }
  return pts;
}

const FIRE = ["#fffbe0", "#ffe066", "#ff9f1c", "#ff4d00", "#a61b00"];
const WATER = ["#ffffff", "#bfe6ff", "#5ab4ff", "#1f6fe0"];
const LEAVES = ["#9be15d", "#5fbf3a", "#3f9b2b", "#b8e986"];
const PSY = ["#ffd1f0", "#ff7ad9", "#c86bff", "#7a3cff"];
const ICE = ["#ffffff", "#d9fbff", "#8be8ff", "#46b8e0"];
const DRAGON = ["#fff1a8", "#b28dff", "#7038f8", "#33d1c8"];
const FAIRY = ["#ffffff", "#ffd6e7", "#ff8fc0", "#f15bb5"];
const STAR = ["#ffffff", "#fff3b0", "#ffd166"];

export const EFFECTS: Record<EffectKind, EffectFactory> = {
  /** Fire Spin: a wall of flame engulfs the card while a fiery ring spins round it, then a blast. */
  fire: ({ origin: o, rect }) => ({
    duration: 1.4,
    frame(a) {
      const r = Math.max(rect.width, rect.height) * 0.5;
      const spinning = a.t < 1.15;
      for (let i = spinning ? a.rate(420) : 0; i > 0; i--) {
        const ang = a.t * 6 + (Math.floor(rand(0, 4)) * TAU) / 4 + rand(-0.15, 0.15);
        a.spawn({
          x: o.x + Math.cos(ang) * r * 0.75, y: o.y + Math.sin(ang) * r,
          vx: rand(-30, 30), vy: rand(-220, -90), life: rand(0.35, 0.7),
          size: rand(22, 40), grow: -30, colors: FIRE,
        });
      }
      for (let i = spinning ? a.rate(260) : 0; i > 0; i--) {
        a.spawn({
          x: o.x + rand(-rect.width * 0.55, rect.width * 0.55), y: rect.top + rect.height + rand(-20, 20),
          vx: rand(-25, 25), vy: rand(-520, -300), life: rand(0.5, 0.9),
          size: rand(28, 52), grow: -45, colors: FIRE, alpha: 0.8,
        });
      }
      for (let i = a.rate(90); i > 0; i--) {
        a.spawn({
          x: o.x + rand(-rect.width / 2, rect.width / 2), y: rect.top + rect.height,
          vx: rand(-60, 60), vy: rand(-420, -180), drag: 0.5, life: rand(0.8, 1.5),
          size: rand(3, 6), colors: ["#fff6c2", "#ffb347", "#ff6a00"],
        });
      }
      if (a.at(1.1)) {
        a.flash("#ff7b00", 0.35);
        a.impact(1);
        ring(a, o, ["#fff4c2", "#ff9f1c", "#ff4d00"], 900, 0.5);
        burst(a, o, 110, [250, 750], () => ({ life: rand(0.4, 0.9), size: rand(20, 40), grow: -30, drag: 2.5, colors: FIRE }));
      }
    },
  }),

  /** Hydro Pump: rising bubbles, ripples and a splash. */
  water: ({ origin: o, rect }) => ({
    duration: 1.3,
    frame(a) {
      for (let i = a.rate(70); i > 0; i--) {
        a.spawn({
          x: o.x + rand(-rect.width * 0.8, rect.width * 0.8), y: rect.top + rect.height + 20,
          vx: rand(-20, 20), vy: rand(-320, -140), life: rand(1, 1.8), size: rand(4, 14),
          colors: ["#d4efff", "#8fd0ff"], shape: "bubble",
          step: (p, dt) => (p.vx += Math.sin(p.life * 8) * 200 * dt),
        });
      }
      for (const time of [0.05, 0.3, 0.55, 0.8]) {
        if (a.at(time)) ring(a, o, WATER, 520, 0.8, 20);
      }
      for (const time of [0.15, 0.9]) {
        if (a.at(time)) {
          a.impact(time > 0.5 ? 1 : 0.5);
          a.flash("#4aa3ff", 0.2);
          burst(a, o, 60, [250, 600], () => ({
            vy: rand(-650, -250), gravity: 1100, life: rand(0.6, 1.1), size: rand(4, 9), colors: WATER,
          }));
        }
      }
    },
  }),

  /** Thunderbolt: bolts strike the card from above with sparks and flashes. */
  electric: ({ origin: o, rect }) => {
    const bolts: { pts: Point[]; born: number; width: number }[] = [];
    const strikes = [0.05, 0.2, 0.32, 0.5, 0.62, 0.8, 1.0];
    return {
      duration: 1.15,
      frame(a) {
        for (const time of strikes) {
          if (!a.at(time)) continue;
          const big = time === 1.0;
          const target = { x: o.x + rand(-30, 30), y: o.y + rand(-30, 30) };
          const from = { x: o.x + rand(-rect.width, rect.width), y: -20 };
          bolts.push({ pts: boltPath(from, target, big ? 140 : 90), born: a.t, width: big ? 1.8 : 1 });
          if (big) bolts.push({ pts: boltPath({ x: o.x + rand(-60, 60), y: -20 }, target, 120), born: a.t, width: 1.4 });
          a.flash("#fff7b0", big ? 0.55 : 0.18);
          if (big) {
            a.impact(1.2);
            ring(a, target, ["#ffffff", "#fff176", "#ffd600"], 1000, 0.45);
          }
          burst(a, target, big ? 60 : 18, [200, 700], () => ({
            shape: "streak", size: rand(1.5, 3), drag: 3, life: rand(0.2, 0.5), colors: ["#ffffff", "#fff59d", "#ffd600"],
          }));
        }
        a.ctx.globalCompositeOperation = "lighter";
        a.ctx.lineJoin = "round";
        for (const b of bolts) {
          const age = a.t - b.born;
          if (age > 0.22) continue;
          const alpha = 1 - age / 0.22;
          const trace = (w: number, color: string, al: number) => {
            a.ctx.globalAlpha = al * alpha;
            a.ctx.strokeStyle = color;
            a.ctx.lineWidth = w * b.width;
            a.ctx.beginPath();
            b.pts.forEach((p, i) => (i ? a.ctx.lineTo(p.x, p.y) : a.ctx.moveTo(p.x, p.y)));
            a.ctx.stroke();
          };
          trace(18, "#ffd600", 0.25);
          trace(8, "#fff176", 0.6);
          trace(2.5, "#ffffff", 1);
        }
      },
    };
  },

  /** Razor Leaf: a vortex of leaves spirals out from the card. */
  grass: ({ origin: o }) => ({
    duration: 1.3,
    frame(a) {
      for (let i = a.rate(80); i > 0; i--) {
        const ang = rand(0, TAU);
        const v = rand(240, 420);
        a.spawn({
          x: o.x, y: o.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
          life: rand(1, 1.6), size: rand(10, 17), rot: ang, vr: rand(-8, 8),
          colors: [pick(LEAVES)], shape: "leaf",
          step: (p, dt) => {
            // Curve the velocity to make a spiral.
            const turn = 2.6 * dt;
            const cos = Math.cos(turn), sin = Math.sin(turn);
            [p.vx, p.vy] = [p.vx * cos - p.vy * sin, p.vx * sin + p.vy * cos];
          },
        });
      }
      for (let i = a.rate(40); i > 0; i--) {
        a.spawn({
          x: o.x + rand(-200, 200), y: o.y + rand(-250, 250), vy: rand(-40, -10),
          life: rand(0.6, 1.2), size: rand(2, 5), colors: ["#f9ffb5", "#d4ff6b"],
        });
      }
      if (a.at(1.05)) {
        a.impact(0.7);
        ring(a, o, ["#eaffd0", "#78c850"], 800, 0.5);
      }
    },
  }),

  /** Psystrike: pulsing psychic rings, twinkles and a warped vignette. */
  psychic: ({ origin: o }) => ({
    duration: 1.4,
    frame(a) {
      for (let i = 0; i < 7; i++) {
        if (a.at(i * 0.17)) ring(a, o, PSY, 480 + i * 40, 0.9, 10);
      }
      for (let i = a.rate(50); i > 0; i--) {
        const ang = rand(0, TAU);
        const d = rand(60, 320);
        a.spawn({
          x: o.x + Math.cos(ang) * d, y: o.y + Math.sin(ang) * d,
          life: rand(0.4, 0.8), size: rand(4, 9), grow: -8, rot: rand(0, TAU), vr: rand(-3, 3),
          colors: PSY, shape: "star",
        });
      }
      const pulse = Math.max(0, Math.sin(a.t * 9)) * Math.max(0, 1 - a.t / 1.4);
      const g = a.ctx.createRadialGradient(o.x, o.y, 50, o.x, o.y, Math.max(a.width, a.height) * 0.7);
      g.addColorStop(0, "rgba(255,120,220,0)");
      g.addColorStop(1, `rgba(120,40,255,${0.35 * pulse})`);
      a.ctx.fillStyle = g;
      a.ctx.fillRect(0, 0, a.width, a.height);
      if (a.at(1.2)) {
        a.impact(1);
        a.flash("#e0a0ff", 0.3);
        burst(a, o, 50, [300, 700], () => ({ shape: "streak", size: 3, drag: 2.5, life: 0.5, colors: PSY }));
      }
    },
  }),

  /** Dynamic Punch: three heavy impacts with shockwaves and debris. */
  fighting: ({ origin: o }) => ({
    duration: 1.2,
    frame(a) {
      for (const [time, strength] of [[0.1, 0.7], [0.45, 0.8], [0.9, 1.4]] as const) {
        if (!a.at(time)) continue;
        const at = { x: o.x + rand(-40, 40), y: o.y + rand(-40, 40) };
        a.impact(strength);
        a.flash("#ffffff", 0.25 * strength);
        ring(a, at, ["#ffffff", "#ffd2a0", "#ff6a3d"], 900 * strength, 0.4, 16);
        ring(a, at, ["#fff", "#ffb380"], 500 * strength, 0.5, 8);
        burst(a, at, Math.round(28 * strength), [700, 1300], () => ({
          shape: "streak", size: rand(2, 4), drag: 4, life: 0.3, colors: ["#ffffff", "#ffe0c0"],
        }));
        burst(a, at, Math.round(26 * strength), [250, 600], () => ({
          shape: "debris", gravity: 1400, vy: rand(-700, -200), size: rand(5, 11), vr: rand(-12, 12),
          life: rand(0.7, 1.2), colors: [pick(["#8d6e63", "#6d4c41", "#a1887f", "#5d4037"])],
        }));
        burst(a, at, 20, [80, 250], () => ({ life: 0.5, size: rand(14, 26), grow: -30, colors: ["#fff3e0", "#ff8a50", "#c62828"] }));
      }
    },
  }),

  /** Blizzard: ice shards shoot out while snow sweeps across. */
  ice: ({ origin: o }) => ({
    duration: 1.3,
    frame(a) {
      for (let i = a.rate(75); i > 0; i--) {
        const ang = rand(0, TAU);
        const v = rand(350, 700);
        a.spawn({
          x: o.x, y: o.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, drag: 1.8,
          life: rand(0.9, 1.4), size: rand(8, 16), colors: ICE, shape: "shard",
        });
      }
      for (let i = a.rate(70); i > 0; i--) {
        a.spawn({
          x: rand(-100, a.width), y: rand(-40, a.height * 0.6), vx: rand(250, 450), vy: rand(80, 180),
          life: rand(1, 1.8), size: rand(3, 7), rot: rand(0, TAU), vr: rand(-4, 4), colors: ["#ffffff"], shape: "flake",
        });
      }
      if (a.at(0.02)) {
        a.flash("#bdf3ff", 0.3);
        ring(a, o, ICE, 700, 0.7, 20);
      }
      if (a.at(1.05)) {
        a.impact(0.8);
        a.flash("#e8fdff", 0.4);
      }
    },
  }),

  /** Outrage: energy spirals inward into a vortex, then detonates. */
  dragon: ({ origin: o, rect }) => ({
    duration: 1.35,
    frame(a) {
      if (a.t < 1) {
        for (let i = a.rate(300); i > 0; i--) {
          const ang = rand(0, TAU);
          const r = Math.max(rect.width, rect.height) * rand(0.55, 0.95);
          a.spawn({
            x: o.x + Math.cos(ang) * r, y: o.y + Math.sin(ang) * r,
            life: rand(0.6, 1), size: rand(10, 22), colors: [pick(DRAGON)],
            step: (p, dt) => {
              const dx = p.x - o.x, dy = p.y - o.y;
              const dist = Math.max(0, Math.hypot(dx, dy) - dt * 380);
              const angle = Math.atan2(dy, dx) + dt * 5;
              p.x = o.x + Math.cos(angle) * dist;
              p.y = o.y + Math.sin(angle) * dist;
            },
          });
        }
        // A dark core that swells as the vortex charges.
        const charge = a.t;
        const g = a.ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 40 + charge * 140);
        g.addColorStop(0, `rgba(255,240,170,${0.7 * charge})`);
        g.addColorStop(0.4, `rgba(112,56,248,${0.5 * charge})`);
        g.addColorStop(1, "rgba(30,10,80,0)");
        a.ctx.globalCompositeOperation = "lighter";
        a.ctx.fillStyle = g;
        a.ctx.fillRect(0, 0, a.width, a.height);
      }
      if (a.at(1.05)) {
        a.impact(1.5);
        a.flash("#c9b0ff", 0.5);
        ring(a, o, ["#ffffff", "#ffe27a", "#7038f8"], 1200, 0.55, 20);
        ring(a, o, ["#ffffff", "#33d1c8"], 700, 0.7, 10);
        burst(a, o, 140, [300, 950], () => ({ life: rand(0.5, 1), size: rand(12, 26), grow: -18, drag: 2, colors: DRAGON }));
        burst(a, o, 40, [900, 1500], () => ({ shape: "streak", size: 3, drag: 3, life: 0.35, colors: ["#ffffff", "#ffe27a"] }));
      }
    },
  }),

  /** Swift / Body Slam: a starburst with speed lines. */
  normal: ({ origin: o }) => ({
    duration: 0.9,
    frame(a) {
      for (const [time, n] of [[0.05, 26], [0.45, 18], [0.75, 34]] as const) {
        if (!a.at(time)) continue;
        a.impact(n / 30);
        a.flash("#ffffff", 0.15);
        ring(a, o, ["#ffffff", "#fff3b0"], 800, 0.45);
        burst(a, o, n, [300, 700], () => ({
          shape: "star", size: rand(8, 16), drag: 2.5, rot: rand(0, TAU), vr: rand(-6, 6), life: rand(0.6, 1), colors: STAR,
        }));
        burst(a, o, n, [900, 1500], () => ({ shape: "streak", size: 2, drag: 3, life: 0.3, colors: ["#ffffff"] }));
      }
    },
  }),

  /** Moonblast: hearts and sparkles drift up around a shimmering moon-glow. */
  fairy: ({ origin: o, rect }) => ({
    duration: 1.4,
    frame(a) {
      for (let i = a.rate(30); i > 0; i--) {
        const phase = rand(0, TAU);
        a.spawn({
          x: o.x + rand(-rect.width * 0.7, rect.width * 0.7), y: rect.top + rect.height,
          vy: rand(-260, -140), life: rand(1.2, 1.8), size: rand(7, 13), rot: rand(-0.4, 0.4),
          colors: [pick(FAIRY.slice(1))], shape: "heart",
          step: (p) => (p.vx = Math.sin(p.life * 5 + phase) * 60),
        });
      }
      for (let i = a.rate(45); i > 0; i--) {
        a.spawn({
          x: o.x + rand(-250, 250), y: o.y + rand(-300, 300), life: rand(0.4, 0.8), size: rand(3, 8),
          grow: -6, rot: rand(0, TAU), colors: FAIRY, shape: "star",
        });
      }
      const glow = Math.sin(Math.min(1, a.t / 1.4) * Math.PI);
      const g = a.ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 260);
      g.addColorStop(0, `rgba(255,240,250,${0.5 * glow})`);
      g.addColorStop(1, "rgba(255,143,192,0)");
      a.ctx.globalCompositeOperation = "lighter";
      a.ctx.fillStyle = g;
      a.ctx.fillRect(0, 0, a.width, a.height);
      if (a.at(1.15)) {
        a.impact(0.8);
        ring(a, o, FAIRY, 800, 0.6, 16);
        burst(a, o, 40, [200, 500], () => ({ shape: "heart", size: rand(6, 11), drag: 2, life: 0.9, colors: FAIRY.slice(1) }));
      }
    },
  }),

  /** Abilities: a glowing aura rises from the card's edges. */
  aura: ({ origin: o, rect, color }) => ({
    duration: 1.5,
    frame(a) {
      const perimeter = 2 * (rect.width + rect.height);
      for (let i = a.rate(160); i > 0; i--) {
        let d = rand(0, perimeter);
        let x: number, y: number;
        if (d < rect.width) [x, y] = [rect.left + d, rect.top];
        else if ((d -= rect.width) < rect.height) [x, y] = [rect.left + rect.width, rect.top + d];
        else if ((d -= rect.height) < rect.width) [x, y] = [rect.left + rect.width - d, rect.top + rect.height];
        else [x, y] = [rect.left, rect.top + rect.height - (d - rect.width)];
        a.spawn({ x, y, vx: rand(-15, 15), vy: rand(-140, -50), life: rand(0.6, 1.2), size: rand(4, 10), grow: -5, colors: ["#ffffff", color] });
      }
      const pulse = Math.sin(Math.min(1, a.t / 1.5) * Math.PI);
      a.ctx.globalCompositeOperation = "lighter";
      a.ctx.globalAlpha = pulse;
      a.ctx.shadowColor = color;
      a.ctx.shadowBlur = 40;
      a.ctx.strokeStyle = color;
      a.ctx.lineWidth = 6;
      a.ctx.beginPath();
      a.ctx.roundRect(rect.left - 4, rect.top - 4, rect.width + 8, rect.height + 8, 22);
      a.ctx.stroke();
      for (const time of [0.1, 0.6]) {
        if (a.at(time)) ring(a, o, ["#ffffff", color], 500, 0.9, 30);
      }
    },
  }),
};
