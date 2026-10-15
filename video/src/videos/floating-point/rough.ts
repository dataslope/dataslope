// Hand-drawn geometry for the chalkboard: lines, circles, boxes, arrows and
// braces that wobble the way a hand does. Every wobble comes from a seeded
// generator, so a shape is identical on every frame and every machine (a
// chalk mark does not "boil"); change the seed to get a different hand.

export type Pt = [number, number];

/** A path plus its approximate length, so a multi-stroke figure can share
 *  one drawing progress in proportion to how much chalk each stroke takes. */
export type Stroke = { d: string; len: number };

/** mulberry32: small, fast, deterministic. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const jitter = (r: () => number, amount: number) => (r() * 2 - 1) * amount;

const polyLength = (pts: Pt[]) =>
  pts.reduce(
    (sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])),
    0,
  );

const f = (n: number) => n.toFixed(1);

/** A smooth curve through the points (Catmull-Rom as cubic Béziers). */
export function smooth(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

const stroke = (pts: Pt[]): Stroke => ({ d: smooth(pts), len: polyLength(pts) });

/** A line drawn by hand: a few low-frequency bends, plus an optional bow
 *  (a positive bow sags to the left of the direction of travel). */
export function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number,
  { wobble = 2.5, bow = 0 }: { wobble?: number; bow?: number } = {},
): Stroke {
  const r = rng(seed);
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const n = Math.max(3, Math.round(len / 140));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sag = Math.sin(Math.PI * t) * bow + (i === 0 || i === n ? jitter(r, wobble * 0.4) : jitter(r, wobble));
    pts.push([x1 + (x2 - x1) * t + nx * sag, y1 + (y2 - y1) * t + ny * sag]);
  }
  return stroke(pts);
}

/** A hand-drawn loop around a point: it starts and ends in slightly different
 *  places and runs a little past a full turn, the way a circled answer does. */
export function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  { turns = 1.12, tilt = -0.08, wobble = 0.035 }: { turns?: number; tilt?: number; wobble?: number } = {},
): Stroke {
  const r = rng(seed);
  const start = -Math.PI * (0.55 + r() * 0.2);
  const phase = r() * Math.PI * 2;
  const n = Math.round(30 * turns);
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = start + t * Math.PI * 2 * turns;
    // Spiral in a touch over the turn, so the overshoot doesn't retrace.
    const k = 1 + wobble * Math.sin(a * 2 + phase) + jitter(r, wobble * 0.3) - 0.07 * t;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    pts.push([cx + x * cos - y * sin, cy + x * sin + y * cos]);
  }
  return stroke(pts);
}

/** A box as four separate strokes that overshoot at the corners. */
export function box(x: number, y: number, w: number, h: number, seed: number, wobble = 2.5): Stroke[] {
  const r = rng(seed);
  const o = () => 6 + r() * 8;
  return [
    line(x - o(), y + jitter(r, 2), x + w + o(), y + jitter(r, 2), seed + 1, { wobble }),
    line(x + w + jitter(r, 2), y - o(), x + w + jitter(r, 2), y + h + o(), seed + 2, { wobble }),
    line(x + w + o(), y + h + jitter(r, 2), x - o(), y + h + jitter(r, 2), seed + 3, { wobble }),
    line(x + jitter(r, 2), y + h + o(), x + jitter(r, 2), y - o(), seed + 4, { wobble }),
  ];
}

/** An arrow: a gently bent shaft, then the two strokes of its head. */
export function arrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number,
  { bend = 0.12, head = 22 }: { bend?: number; head?: number } = {},
): Stroke[] {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const shaft = line(x1, y1, x2, y2, seed, { wobble: 2, bow: len * bend });
  // The head follows the shaft's final direction, which the bow has turned.
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const back = 0.18;
  const bx = x1 + (x2 - x1) * (1 - back) + nx * Math.sin(Math.PI * (1 - back)) * len * bend;
  const by = y1 + (y2 - y1) * (1 - back) + ny * Math.sin(Math.PI * (1 - back)) * len * bend;
  const a = Math.atan2(y2 - by, x2 - bx);
  const wing = (side: number, s: number) =>
    line(
      x2,
      y2,
      x2 - Math.cos(a + side * 0.5) * head,
      y2 - Math.sin(a + side * 0.5) * head,
      s,
      { wobble: 1 },
    );
  return [shaft, wing(1, seed + 7), wing(-1, seed + 9)];
}

/** A curly brace under (or, with a negative depth, over) the span x1..x2. */
export function brace(x1: number, x2: number, y: number, depth: number, seed: number): Stroke {
  const r = rng(seed);
  const m = (x1 + x2) / 2;
  const q = depth / 2;
  const pts: Pt[] = [
    [x1, y],
    [x1 + 10, y + q],
    [(x1 + m) / 2, y + q + jitter(r, 1.5)],
    [m - 12, y + q],
    [m, y + depth],
    [m + 12, y + q],
    [(m + x2) / 2, y + q + jitter(r, 1.5)],
    [x2 - 10, y + q],
    [x2, y],
  ];
  return stroke(pts);
}

/** A tick mark, as a teacher writes it. */
export function check(x: number, y: number, size: number, seed: number): Stroke[] {
  const r = rng(seed);
  return [
    stroke([
      [x, y + size * 0.5],
      [x + size * 0.32, y + size * 0.86 + jitter(r, 2)],
      [x + size * 0.55, y + size * 0.55],
      [x + size, y - size * 0.05 + jitter(r, 2)],
    ]),
  ];
}

/** A cross: two strokes. */
export function cross(cx: number, cy: number, size: number, seed: number): Stroke[] {
  const h = size / 2;
  return [
    line(cx - h, cy - h, cx + h, cy + h, seed, { wobble: 2, bow: 4 }),
    line(cx + h, cy - h, cx - h, cy + h, seed + 3, { wobble: 2, bow: -4 }),
  ];
}
