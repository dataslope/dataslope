/**
 * Arrowheads that sit on their line. Every arrow in every video builds its
 * head here, so the rule below is kept in one place.
 *
 * **A head follows the last stretch of its line, not the direction at the
 * tip.** A head is a V about 15 px long, so the eye reads its angle against
 * the 15 px of line it sits on. On a straight end the two are the same. On a
 * curve they can be far apart: a cubic whose last control point sits under
 * its end arrives vertically over the last pixel or two, after sweeping in
 * at 45 degrees. A head turned to that tangent pointed straight up off a line
 * that visibly came in diagonally (CPointers, Fig. 3), and every curved arrow
 * in the set was built the same way.
 *
 * Two rules follow, and `arrowHead` applies both:
 *
 * 1. **The head's axis is the chord over its length**: from the point one
 *    head-length back along the line (measured along it) to the tip
 *    (`headDirection`). Never a control point, never the derivative at the
 *    end.
 * 2. **The line must be nearly straight under the head.** If it turns inside
 *    the head, no angle fits: aimed at the tip, the wings cross the line
 *    coming in; aimed at the chord, the line leaves the head's base off
 *    centre. CPointers' arrows turned 40 degrees in their last 15 px, a hook
 *    made by a last control point too close to the tip for how far the curve
 *    still had to swing. Shape the curve so it has finished turning before
 *    the head starts: put the last control point well back along the
 *    direction the line arrives in. `headBend` measures the turn, every head
 *    reports it as it renders, and `npm run check:frames` fails any arrow in
 *    any video that turns more than MAX_HEAD_BEND degrees under its head.
 *
 * Sample the drawn line densely (`sampleCubic`, `roundedPolyline`) and pass
 * the samples to `arrowHead`.
 */
export type Pt = readonly [number, number];
/** A cubic Bézier: start, two controls, end. */
export type Cubic = readonly [Pt, Pt, Pt, Pt];

export const cubicAt = (c: Cubic, t: number): Pt => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return [
    a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0],
    a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1],
  ];
};

/** The SVG path of a cubic. */
export const cubicPath = ([s, c1, c2, e]: Cubic) => `M${s[0]},${s[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${e[0]},${e[1]}`;

/** Points along a cubic from start to end, dense enough to measure it by. */
export const sampleCubic = (c: Cubic, n = 240): Pt[] => Array.from({ length: n + 1 }, (_, i) => cubicAt(c, i / n));

/**
 * A polyline with its inner corners rounded off by quadratic arcs of up to
 * `radius`: the SVG path, and samples of exactly that path.
 */
export function roundedPolyline(points: readonly Pt[], radius: number): { d: string; samples: Pt[] } {
  const n = points.length;
  let d = `M${points[0][0]},${points[0][1]}`;
  const samples: Pt[] = [points[0]];
  for (let i = 1; i < n - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const a: Pt = [cx - ((cx - px) / inLen) * r, cy - ((cy - py) / inLen) * r];
    const b: Pt = [cx + ((nx - cx) / outLen) * r, cy + ((ny - cy) / outLen) * r];
    d += ` L${a[0]},${a[1]} Q${cx},${cy} ${b[0]},${b[1]}`;
    samples.push(a);
    for (let k = 1; k <= 16; k++) {
      const t = k / 16;
      const u = 1 - t;
      samples.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]);
    }
  }
  d += ` L${points[n - 1][0]},${points[n - 1][1]}`;
  samples.push(points[n - 1]);
  return { d, samples };
}

/** Length of a sampled line. */
export const lineLength = (line: readonly Pt[]) =>
  line.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - line[i][0], y - line[i][1]), 0);

/** The point `len` back from the end of a sampled line, measured along it. */
export function pointBack(line: readonly Pt[], len: number): Pt {
  let walked = 0;
  for (let i = line.length - 1; i > 0; i--) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i - 1];
    const seg = Math.hypot(ax - bx, ay - by);
    if (seg > 0 && walked + seg >= len) {
      const f = (len - walked) / seg;
      return [ax + (bx - ax) * f, ay + (by - ay) * f];
    }
    walked += seg;
  }
  return line[0];
}

/** The unit vector a head of length `len` at the end of `line` points along. */
export function headDirection(line: readonly Pt[], len: number): Pt {
  const [tx, ty] = line[line.length - 1];
  const [bx, by] = pointBack(line, len);
  const l = Math.hypot(tx - bx, ty - by) || 1;
  return [(tx - bx) / l, (ty - by) / l];
}

/** An open V: two wings `len` back along `dir` and `half` out to each side,
 *  meeting at `tip`. */
export function headWings(tip: Pt, dir: Pt, len: number, half: number) {
  const [ux, uy] = dir;
  const wing = (side: 1 | -1) => `${tip[0] - ux * len + side * uy * half},${tip[1] - uy * len - side * ux * half}`;
  return `M${wing(1)} L${tip[0]},${tip[1]} L${wing(-1)}`;
}

/** A filled head: a triangle with its point at `tip` and its base `len`
 *  back along `dir`, `half` out to each side. */
export function headTriangle(tip: Pt, dir: Pt, len: number, half: number) {
  const [ux, uy] = dir;
  const [bx, by] = [tip[0] - ux * len, tip[1] - uy * len];
  return `M${tip[0]},${tip[1]} L${bx - uy * half},${by + ux * half} L${bx + uy * half},${by - ux * half} Z`;
}

const angleOf = (from: Pt, to: Pt) => Math.atan2(to[1] - from[1], to[0] - from[0]);

/** How many degrees a line turns under a head of length `len`: between its
 *  direction at the head's base and at the tip. */
export function headBend(line: readonly Pt[], len: number): number {
  const tip = angleOf(pointBack(line, 3), line[line.length - 1]);
  const base = angleOf(pointBack(line, len + 1.5), pointBack(line, len - 1.5));
  const turn = Math.abs(((tip - base + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
  return (turn * 180) / Math.PI;
}

/** The most a line may turn under its head before the head stops reading as
 *  sitting on it. */
export const MAX_HEAD_BEND = 10;

const reported = new Set<string>();
const round = ([x, y]: Pt) => `${Math.round(x)},${Math.round(y)}`;

/**
 * The head for the end of `line`: open wings, or a filled triangle. Every
 * arrow builds its head with this. As it renders, it reports how far its line
 * turns under it, once per arrow, which `npm run check:frames` collects.
 */
export function arrowHead(line: readonly Pt[], len: number, half: number, { filled = false } = {}) {
  const tip = line[line.length - 1];
  const dir = headDirection(line, len);
  if (typeof window !== "undefined") {
    const key = `${round(line[0])} to ${round(tip)}`;
    if (!reported.has(key)) {
      reported.add(key);
      const bend = headBend(line, len);
      const report = `[arrowhead] ${key} turns ${bend.toFixed(1)}° under its head`;
      if (bend > MAX_HEAD_BEND) console.warn(report);
      else console.debug(report);
    }
  }
  return filled ? headTriangle(tip, dir, len, half) : headWings(tip, dir, len, half);
}
