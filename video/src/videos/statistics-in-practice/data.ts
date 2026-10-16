import m from "./measurements.json";

// Every dot, bar and number the video shows. Measured, not drawn: measure.py
// re-runs the lessons' own code blocks and chart specs with their seeds, and
// measurements.json is its output, imported here as it is. Pure (no
// Remotion, no DOM). The lessons' printed lines are echoed by measure.py on
// stderr, for checking against script.ts.

export const VIDEO = "statistics-in-practice";

/**
 * Whether public/images/statistics-in-practice/ holds the three watercolors
 * from illustrations.json. Every frame is laid out with room for them either
 * way.
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

// ── Part 1. The tips data (exploratory-statistical-analysis) ────────────────

export type Day = "Thur" | "Fri" | "Sat" | "Sun";
export const DAYS = m.tips.days as Day[];
export const DAY_NAMES: Record<Day, string> = { Thur: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

export const TIPS = {
  rows: m.tips.rows,
  byDay: m.tips.byDay as Record<Day, { mean: number; median: number; count: number }>,
  bestMean: m.tips.bestMean as Day,
  bestMedian: m.tips.bestMedian as Day,
  worstMean: m.tips.worstMean as Day,
  /** Each bill's day, as an index into DAYS. */
  billDay: m.tips.billDay as readonly number[],
  /** Each bill's tip, as a percentage of the bill. */
  billPct: m.tips.billPct as readonly number[],
  max: m.tips.max,
};

/** The hold-out split: which bills are locked away (layout only). */
export const HOLDOUT = {
  share: m.holdout.share,
  held: new Set(m.holdout.held as readonly number[]),
  nHeld: m.holdout.nHeld,
  nExplore: m.holdout.nExplore,
};

// ── Part 2. The A/B test (ab-testing) ───────────────────────────────────────

export const DESIGN = {
  p1: m.design.p1,
  p2: m.design.p2,
  power: m.design.power,
  alpha: m.design.alpha,
  perArm: m.design.perArm,
};

export type Covariate = { key: string; selected: number; randomised: number; unmeasured: boolean };
export const BALANCE = {
  rows: m.balance.rows as readonly Covariate[],
  threshold: m.balance.threshold,
  over: m.balance.over,
  overRandomised: m.balance.overRandomised,
};

export const PEEKING = {
  planned: m.peeking.planned,
  step: m.peeking.step,
  alpha: m.peeking.alpha,
  rows: m.peeking.rows as readonly { n: number; p: number }[],
  crossings: m.peeking.crossings,
  crossingAt: m.peeking.crossingAt as readonly number[],
  final: m.peeking.final,
};

export const EXPERIMENT = {
  n: m.experiment.n,
  convertedA: new Set(m.experiment.convertedA as readonly number[]),
  convertedB: new Set(m.experiment.convertedB as readonly number[]),
  xA: m.experiment.xA,
  xB: m.experiment.xB,
  pA: m.experiment.pA,
  pB: m.experiment.pB,
  /** Treatment minus control, as a proportion. */
  absLift: m.experiment.absLift,
  relLift: m.experiment.relLift,
  p: m.experiment.p,
  ciLow: m.experiment.ciLow,
  ciHigh: m.experiment.ciHigh,
  h: m.experiment.h,
};

/** The lesson's quiz case: significant, and too small to matter. */
export const TINY = {
  pA: m.tiny.pA,
  pB: m.tiny.pB,
  ciLow: m.tiny.ciLow,
  ciHigh: m.tiny.ciHigh,
};

// ── Close. The course's first example (why-statistics-matters, seed 0) ──────

export const CALLBACK = {
  n: m.callback.n,
  a: m.callback.a as readonly number[],
  b: m.callback.b as readonly number[],
  meanA: m.callback.meanA,
  meanB: m.callback.meanB,
  gap: m.callback.gap,
};
