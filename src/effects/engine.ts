/**
 * A tiny canvas particle engine for attack animations.
 *
 * Each effect is a factory that returns an `EffectDef`. Its `frame` hook runs
 * every animation frame: it spawns particles and may draw custom shapes
 * (lightning bolts, auras). The engine then moves, ages and draws particles.
 */

export type Shape =
  | "glow"
  | "ring"
  | "streak"
  | "star"
  | "flake"
  | "leaf"
  | "shard"
  | "bubble"
  | "heart"
  | "debris";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds remaining. */
  life: number;
  maxLife: number;
  size: number;
  /** Size change per second. */
  grow: number;
  rot: number;
  /** Rotation speed in radians per second. */
  vr: number;
  /** Downward acceleration in px/s². */
  gravity: number;
  /** Fraction of velocity lost per second (0 = none). */
  drag: number;
  /** Colors the particle moves through over its life, first to last. */
  colors: string[];
  alpha: number;
  shape: Shape;
  /** Optional custom motion, run before the default integration. */
  step?: (p: Particle, dt: number) => void;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface EffectEnv {
  /** Where the attack comes from (the centre of the artwork). */
  origin: Point;
  /** The card's bounding box on screen. */
  rect: Rect;
  /** Main colour for type-agnostic effects such as ability auras. */
  color: string;
}

export interface FrameApi extends EffectEnv {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** Seconds since the effect started. */
  t: number;
  dt: number;
  spawn(p: Partial<Particle> & Pick<Particle, "x" | "y">): void;
  /** True on exactly one frame: the first frame at or after `time`. */
  at(time: number): boolean;
  /** How many particles to emit this frame for a given rate per second. */
  rate(perSecond: number): number;
  flash(color: string, strength: number): void;
  impact(strength: number): void;
}

export interface EffectDef {
  /** Seconds during which the effect keeps emitting. */
  duration: number;
  frame(api: FrameApi): void;
}

export type EffectFactory = (env: EffectEnv) => EffectDef;

export interface PlayOptions {
  /** Called on big hits, e.g. to shake the screen. */
  onImpact?: (strength: number) => void;
}

export interface PlayHandle {
  cancel(): void;
  done: Promise<void>;
}

const MAX_PARTICLES = 1600;
/** Hard stop so a misbehaving effect can never run forever. */
const MAX_EXTRA_SECONDS = 2.5;

export function playEffect(
  canvas: HTMLCanvasElement,
  factory: EffectFactory,
  env: EffectEnv,
  options: PlayOptions = {},
): PlayHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { cancel() {}, done: Promise.resolve() };

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const def = factory(env);
  const particles: Particle[] = [];
  const flash = { color: "#fff", alpha: 0 };
  let start: number | null = null;
  let prevT = -1;
  let raf = 0;
  let finished = false;
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => (resolveDone = r));

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, width, height);
    resolveDone();
  };

  const spawn: FrameApi["spawn"] = (p) => {
    if (particles.length >= MAX_PARTICLES) return;
    const life = p.life ?? 1;
    particles.push({
      vx: 0, vy: 0, size: 6, grow: 0, rot: 0, vr: 0, gravity: 0, drag: 0,
      colors: ["#ffffff"], alpha: 1, shape: "glow",
      ...p,
      life,
      maxLife: life,
    });
  };

  const tick = (now: number) => {
    if (start === null) start = now;
    const t = (now - start) / 1000;
    const dt = prevT < 0 ? 1 / 60 : Math.min(0.05, t - prevT);

    ctx.clearRect(0, 0, width, height);

    const api: FrameApi = {
      ...env,
      ctx, width, height, t, dt, spawn,
      at: (time) => prevT < time && t >= time,
      rate: (perSecond) => (t > def.duration ? 0 : Math.floor(perSecond * dt + Math.random())),
      flash: (color, strength) => {
        flash.color = color;
        flash.alpha = Math.max(flash.alpha, strength);
      },
      impact: (strength) => options.onImpact?.(strength),
    };
    ctx.save();
    def.frame(api);
    ctx.restore();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.step?.(p, dt);
      const damp = Math.max(0, 1 - p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.size = Math.max(0, p.size + p.grow * dt);
      drawParticle(ctx, p);
    }

    if (flash.alpha > 0.001) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = flash.alpha;
      ctx.fillStyle = flash.color;
      ctx.fillRect(0, 0, width, height);
      flash.alpha = Math.max(0, flash.alpha - dt * 3);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    prevT = t;
    const stillGoing = t < def.duration || particles.length > 0 || flash.alpha > 0.001;
    if (stillGoing && t < def.duration + MAX_EXTRA_SECONDS) {
      raf = requestAnimationFrame(tick);
    } else {
      finish();
    }
  };

  raf = requestAnimationFrame(tick);
  return { cancel: finish, done };
}

const ADDITIVE: Record<Shape, boolean> = {
  glow: true, ring: true, streak: true, star: true, flake: true, shard: true, heart: true,
  leaf: false, bubble: false, debris: false,
};

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const k = p.life / p.maxLife; // 1 at birth, 0 at death
  const color = p.colors[Math.min(p.colors.length - 1, Math.floor((1 - k) * p.colors.length))];
  const s = p.size;
  if (s <= 0.1) return;

  const fade = p.shape === "ring" || p.shape === "streak" ? k : Math.min(1, k * 1.6);
  ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * fade));
  ctx.globalCompositeOperation = ADDITIVE[p.shape] ? "lighter" : "source-over";
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  switch (p.shape) {
    case "glow":
      ctx.drawImage(glowSprite(color), p.x - s, p.y - s, s * 2, s * 2);
      break;
    case "ring":
      ctx.lineWidth = Math.max(1, 5 * k);
      circle(ctx, p.x, p.y, s);
      ctx.stroke();
      break;
    case "streak":
      ctx.lineWidth = s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
      ctx.stroke();
      break;
    case "star":
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      starPath(ctx, s, s * 0.45, 5);
      ctx.fill();
      ctx.restore();
      break;
    case "flake":
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.lineWidth = Math.max(1, s * 0.18);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        ctx.moveTo(-Math.cos(a) * s, -Math.sin(a) * s);
        ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      }
      ctx.stroke();
      ctx.restore();
      break;
    case "leaf":
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(20,60,10,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(s, 0);
      ctx.stroke();
      ctx.restore();
      break;
    case "shard":
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx) + p.rot);
      ctx.beginPath();
      ctx.moveTo(s * 1.6, 0);
      ctx.lineTo(0, s * 0.4);
      ctx.lineTo(-s * 0.6, 0);
      ctx.lineTo(0, -s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    case "bubble":
      ctx.lineWidth = 1.5;
      circle(ctx, p.x, p.y, s);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      circle(ctx, p.x - s * 0.35, p.y - s * 0.35, s * 0.22);
      ctx.fill();
      break;
    case "heart":
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
      ctx.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
      ctx.fill();
      ctx.restore();
      break;
    case "debris":
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-s / 2, -s / 2, s, s * 0.7);
      ctx.restore();
      break;
  }
}

const SPRITE_SIZE = 64;
const sprites = new Map<string, HTMLCanvasElement>();

/**
 * A soft radial blob in the given colour, rendered once and cached.
 * Drawing a cached image is far cheaper than a gradient per particle, and
 * overlapping blobs blend additively into convincing fire and energy.
 */
function glowSprite(color: string): HTMLCanvasElement {
  let sprite = sprites.get(color);
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = SPRITE_SIZE;
  const g = sprite.getContext("2d")!;
  const c = SPRITE_SIZE / 2;
  g.fillStyle = color;
  g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  // Keep the colour only where the radial alpha mask is.
  g.globalCompositeOperation = "destination-in";
  const mask = g.createRadialGradient(c, c, 0, c, c, c);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(0.25, "rgba(0,0,0,0.85)");
  mask.addColorStop(0.6, "rgba(0,0,0,0.25)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = mask;
  g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  // A small hot core.
  g.globalCompositeOperation = "lighter";
  const core = g.createRadialGradient(c, c, 0, c, c, c * 0.3);
  core.addColorStop(0, "rgba(255,255,255,0.45)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = core;
  g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  sprites.set(color, sprite);
  return sprite;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function starPath(ctx: CanvasRenderingContext2D, outer: number, inner: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}
