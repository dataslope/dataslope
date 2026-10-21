import m from "./measurements.json";

// Every dot, line and number the video shows. Measured, not drawn: measure.py
// re-runs the lessons' own code blocks with their seeds (and the seeded
// charts the lessons place, through a port of their generator), and
// measurements.json is its output, imported here as it is. Pure (no
// Remotion, no DOM). The lessons' printed lines are echoed by measure.py on
// stderr, for checking against script.ts.

export const VIDEO = "interpreting-results";

/** Whether public/images/interpreting-results/ holds the four watercolors
 *  from illustrations.json. Every frame is laid out with room for them either
 *  way. */
export const ILLUSTRATIONS = true;

/** mulberry32: a tiny, well-mixed 32-bit PRNG, for layout jitter only. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` seeded values in [0, 1), for jittering a strip of dots. */
export const jitter = (seed: number, count: number) => {
  const r = mulberry32(seed);
  return Array.from({ length: count }, () => r());
};

// ── Part 1. Significant yet negligible (effect-sizes challenge, seed 2024) ──

export const HUGE = m.huge;

/** Two unit normals d apart: how much area they share (effect-size-overlap). */
export const OVERLAP = m.overlap as readonly { d: number; label: string; shared: number; nonOverlap: number }[];

/** A true d of 0.30 at five sample sizes (seed 123). `p` is 0 at 50,000,
 *  where it underflows and the lesson prints 0.0e+00. */
export const SWEEP = m.sweep;

/** The checkout test: 90 and 126 conversions of 3,000, and the lift's 95%
 *  interval (`lo`, `hi`, from the unpooled standard error `se`) and p-value
 *  (pooled two-proportion z-test), as ab-testing.mdx computes them. */
export const RATES = m.rates;

// ── Part 2. Simpson's paradox (statistical-fallacies) ───────────────────────

export type Group = "men" | "women";
export type Dept = "Easy" | "Hard";
type Cell = { applied: number; admitted: number; rate: number };
const cell = (dept: Dept, group: Group): Cell => {
  const row = m.simpson.rows.find((r) => r.dept === dept && r.group === group);
  if (!row) throw new Error(`No ${dept} ${group}`);
  return { applied: row.applied, admitted: row.admitted, rate: row.rate };
};
export const DEPTS: readonly { dept: Dept; men: Cell; women: Cell }[] = (["Easy", "Hard"] as const).map((dept) => ({
  dept,
  men: cell(dept, "men"),
  women: cell(dept, "women"),
}));
export const POOLED: Record<Group, Cell> = m.simpson.pooled;

// ── Part 2. A confounder reverses a slope (simpsons-paradox-trend) ──────────

export type Line = { slope: number; intercept: number; x0: number; x1: number };
export const CONFOUND = {
  bands: m.confound.bands,
  /** [exercise minutes a week, systolic mmHg, age band] */
  points: m.confound.points as unknown as readonly (readonly [number, number, number])[],
  pooled: m.confound.pooled as Line,
  fits: m.confound.fits as readonly Line[],
  pooledPerHour: m.confound.pooledPerHour,
};

// ── Part 3. Regression to the mean (statistical-fallacies, seed 3) ──────────

export const RTM = {
  ...m.rtm,
  topSet: new Set(m.rtm.top),
  bottomSet: new Set(m.rtm.bottom),
};

// ── Part 4. Cherry-picking, the sharpshooter, selection, units ──────────────

export const WANDER = m.wander;
export const SHOTS = {
  ...m.shots,
  first: m.shots.first as unknown as readonly (readonly [number, number])[],
  second: m.shots.second as unknown as readonly (readonly [number, number])[],
};
export const BERKSON = { ...m.berkson, admittedSet: new Set(m.berkson.admitted) };
export const DISTRICTS = m.districts;

/** "0.30", "−0.56": a signed number with a real minus sign. */
export const signed = (x: number, digits = 2) => `${x < 0 ? "−" : ""}${Math.abs(x).toFixed(digits)}`;
