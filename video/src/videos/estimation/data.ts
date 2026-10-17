import m from "./measurements.json";

// Every dot, interval and number the video shows. Measured, not drawn:
// measure.py re-runs the lessons' own code blocks with their seeds, and
// measurements.json is its output, imported here as it is. Pure (no Remotion,
// no DOM). The lessons' printed lines are echoed by measure.py on stderr, for
// checking against script.ts.

export const VIDEO = "estimation";

/**
 * Whether public/images/estimation/ holds the three watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
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

/** Counts per bin over [lo, hi). */
export function histogram(xs: readonly number[], lo: number, hi: number, width: number) {
  const bins = Math.round((hi - lo) / width);
  const counts = new Array<number>(bins).fill(0);
  for (const x of xs) {
    const i = Math.floor((x - lo) / width + 1e-9);
    if (i >= 0 && i < bins) counts[i]++;
  }
  return counts;
}

// ── Part 1. Fifty users (confidence-intervals, seed 42) ─────────────────────

export const USERS = {
  mu: m.users.mu,
  n: m.users.n,
  values: m.users.values as readonly number[],
  xBar: m.users.xBar,
  s: m.users.s,
  se: m.users.se,
  tCrit: m.users.tCrit,
  zCrit: m.users.zCrit,
  lo: m.users.lo,
  hi: m.users.hi,
  margin: m.users.margin,
  zLo: m.users.zLo,
  zHi: m.users.zHi,
  vagueLo: m.users.vagueLo,
  vagueHi: m.users.vagueHi,
  twoSdLo: m.users.twoSdLo,
  twoSdHi: m.users.twoSdHi,
  insideTwoSd: m.users.insideTwoSd,
  insideCi: m.users.insideCi,
};

// ── Part 1. A hundred intervals (confidence-intervals, seed 7) ──────────────

export type Interval = { lo: number; hi: number; mean: number; covers: boolean };
export const COVERAGE = {
  mu: m.coverage.mu,
  sigma: m.coverage.sigma,
  n: m.coverage.n,
  count: m.coverage.count,
  intervals: m.coverage.intervals as readonly Interval[],
  hits: m.coverage.hits,
  misses: m.coverage.misses,
  missRows: m.coverage.missRows as readonly number[],
  first: m.coverage.first as readonly number[],
};

// ── Part 2. The three levers (confidence-intervals, seed 0) ─────────────────

export const LEVELS = {
  n: m.levels.n,
  xBar: m.levels.xBar,
  rows: m.levels.rows as readonly { level: number; lo: number; hi: number; width: number; crit: number }[],
};
export const SIZES = {
  rows: m.sizes.rows as readonly { n: number; lo: number; hi: number; width: number; mean: number }[],
  ratios: m.sizes.ratios as readonly number[],
};
export const SPREAD = m.spread;

// ── Part 2. A rate, and a difference (confidence-intervals) ─────────────────

export const RATE = m.rate;
export const DIFFERENCE = m.difference;

// ── Part 3. The bootstrap (the-bootstrap, seeds 42 and 7) ───────────────────

export const BOOT = {
  n: m.bootMean.n,
  B: m.bootMean.B,
  values: m.bootMean.values as readonly number[],
  mean: m.bootMean.mean,
  picks: m.bootMean.picks as readonly (readonly number[])[],
  pickMeans: m.bootMean.pickMeans as readonly number[],
  timesDrawn: m.bootMean.timesDrawn as readonly number[],
  neverDrawn: m.bootMean.neverDrawn,
  means: m.bootMean.means as readonly number[],
  bootSe: m.bootMean.bootSe,
  formulaSe: m.bootMean.formulaSe,
  lo: m.bootMean.lo,
  hi: m.bootMean.hi,
  tLo: m.bootMean.tLo,
  tHi: m.bootMean.tHi,
  max: m.bootMean.max,
};

export const MEDIAN = {
  n: m.bootMedian.n,
  B: m.bootMedian.B,
  values: m.bootMedian.values as readonly number[],
  median: m.bootMedian.median,
  medians: m.bootMedian.medians as readonly number[],
  distinct: m.bootMedian.distinct,
  lo: m.bootMedian.lo,
  hi: m.bootMedian.hi,
  max: m.bootMedian.max,
};

// ── Part 3. The cautions (the video's own, on the lesson's waits) ───────────

export const BIASED = {
  cutoff: m.biased.cutoff,
  n: m.biased.n,
  trueMean: m.biased.trueMean,
  values: m.biased.values as readonly number[],
  mean: m.biased.mean,
  lo: m.biased.lo,
  hi: m.biased.hi,
  means: m.biased.means as readonly number[],
};

export const MAXIMUM = {
  sampleMax: m.maximum.sampleMax,
  top: m.maximum.top as readonly number[],
  atTop: m.maximum.atTop,
  spikes: m.maximum.spikes as readonly { v: number; count: number }[],
};
