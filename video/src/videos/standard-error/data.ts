// Every number and every point the video shows, read from measurements.json:
// the output of measure.py, which re-runs the lesson's own code blocks with
// their own seeds. Nothing on screen is typed in by hand. Pure (no Remotion,
// no DOM). measure.py's JSON is also the place to read what the narration
// quotes, for checking against script.ts.
import m from "./measurements.json";

export const VIDEO = "standard-error";

/** The watercolor spots exist in public/images/standard-error/. */
export const ILLUSTRATIONS = true;

/** mulberry32: a tiny seeded PRNG, for layout jitter only (never data). */
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

/** Counts per bin over [lo, hi). */
export function histogram(xs: readonly number[], lo: number, hi: number, width: number) {
  const bins = Math.round((hi - lo) / width);
  const counts = new Array<number>(bins).fill(0);
  for (const x of xs) {
    const i = Math.floor((x - lo) / width);
    if (i >= 0 && i < bins) counts[i]++;
  }
  return counts;
}

// ── Act 1: two hundred ages (the lesson's first block, seed 42) ────────────

export const AGES = {
  n: m.ages.n,
  values: m.ages.values as readonly number[],
  mean: m.ages.mean,
  sd: m.ages.sd,
  se: m.ages.se,
  sqrtN: m.ages.sqrtN,
  min: m.ages.min,
  max: m.ages.max,
  /** Averages of other samples of 200 from the same population. */
  others: m.ages.otherMeans as readonly number[],
};

/** Where each age's dot sits in a dot plot: its one-year bin, and how many
 *  dots are already stacked in that bin. */
export const AGE_DOTS = (() => {
  const seen = new Map<number, number>();
  return AGES.values.map((v) => {
    const bin = Math.floor(v);
    const row = seen.get(bin) ?? 0;
    seen.set(bin, row + 1);
    return { v, bin, row };
  });
})();
export const AGE_ROWS = Math.max(...AGE_DOTS.map((d) => d.row)) + 1;

// ── Act 2: ten thousand samples of fifty (the lesson's second block, seed 7) ─

export const CHECK = {
  mu: m.check.mu,
  sigma: m.check.sigma,
  popSize: m.check.popSize,
  n: m.check.n,
  samples: m.check.samples,
  /** The spread of the 10,000 averages, measured directly. */
  measured: m.check.trueSamplingSd,
  /** One sample's own s / root n. */
  estimated: m.check.estimatedSe,
  /** sigma / root n, the theory. */
  theory: m.check.sigmaOverRootN,
  meansCenter: m.check.meansMean,
  popHist: m.check.popHist,
  first: m.check.first as readonly (readonly number[])[],
  firstMeans: m.check.firstMeans as readonly number[],
  means: m.check.means as readonly number[],
};

// ── Act 3: the square-root law (the lesson's third block, sigma 20) ────────

export const LAW = {
  sigma: m.law.sigma,
  points: m.law.points,
  tenth: m.law.tenth,
};
export const seAt = (n: number) => {
  const p = LAW.points.find((q) => q.n === n);
  if (!p) throw new Error(`No n = ${n} in measurements.json`);
  return p.se;
};

// ── Act 4: the ruler (the lesson's fourth block, seed 0) ───────────────────

export const TIMES = {
  n: m.interval.n,
  values: m.interval.values as readonly number[],
  mean: m.interval.mean,
  se: m.interval.se,
  lo: m.interval.lo,
  hi: m.interval.hi,
  tested: m.interval.tested,
  gapInSe: m.interval.gapInSe,
};
