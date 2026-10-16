import m from "./measurements.json";

// Every dot, line and number the video shows. Measured, not drawn: measure.py
// re-runs the lessons' own code blocks with their seeds, and
// measurements.json is its output, imported here as it is. Pure (no
// Remotion, no DOM). The lessons' printed lines are echoed by measure.py on
// stderr, for checking against script.ts.

export const VIDEO = "thinking-statistically";

/**
 * Whether public/images/thinking-statistically/ holds the three watercolors
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

// ── Part 1. Two groups from one process (why-statistics-matters, seed 0) ────

export type Trial = {
  a: readonly number[];
  b: readonly number[];
  meanA: number;
  meanB: number;
  /** A's average minus B's. */
  gap: number;
};
export const GAPS = {
  n: m.gaps.n,
  mu: m.gaps.mu,
  sigma: m.gaps.sigma,
  trials: m.gaps.trials as readonly Trial[],
};

// ── Part 1. A trend that is pure noise (statistical-thinking, seed 3) ───────

export const TREND = {
  level: m.trend.level,
  months: m.trend.months as readonly number[],
  metric: m.trend.metric as readonly number[],
  lastSixFrom: m.trend.lastSixFrom,
  lastSixTo: m.trend.lastSixTo,
  lastSixStart: m.trend.lastSixStart,
  lastSixEnd: m.trend.lastSixEnd,
  /** The lesson's printed "-11.7". */
  change: m.trend.lastSixChange,
};

// ── Part 2. The survey (why-statistics-matters) ─────────────────────────────

export const SURVEY = {
  surveyed: m.survey.surveyed,
  customers: m.survey.customers,
  oneIn: m.survey.oneIn,
  perDot: m.survey.perDot,
  dots: m.survey.dots,
  /** Indices of the dots that stand for the 500 surveyed. */
  picked: new Set(m.survey.picked as readonly number[]),
};

// ── Part 2. A known population (populations-and-samples) ────────────────────

/** One sample of fifty from Normal(100, 15), seed 42. */
export const KNOWN = {
  mu: m.known.mu,
  n: m.known.n,
  values: m.known.values as readonly number[],
  xBar: m.known.xBar,
  error: m.known.error,
};

/** Twenty samples of fifty: KNOWN's sample, then the first nineteen of the
 *  lesson's seed-7 block. */
export const ROWS: readonly { values: readonly number[]; mean: number }[] = m.many.rows.map((values, i) => ({
  values,
  mean: m.many.rowMeans[i],
}));

// ── Part 3. Flavor codes and the zip-code trap (types-of-data) ─────────────

export const FLAVORS = {
  codes: m.flavors.codes as Record<string, string>,
  answers: m.flavors.answers as readonly number[],
  mean: m.flavors.mean,
  mode: m.flavors.mode,
  counts: m.flavors.counts as Record<string, number>,
};

export const ZIPS = {
  zips: m.zips.zips as readonly number[],
  dtypes: m.zips.dtypes as Record<string, string>,
  zipMean: m.zips.zipMean,
  ratingMedian: m.zips.ratingMedian,
  prices: m.zips.prices as readonly number[],
  priceMean: m.zips.priceMean,
  price: m.zips.price,
  priceDoubled: m.zips.priceDoubled,
  zip: m.zips.zip,
  zipDoubled: m.zips.zipDoubled,
};
