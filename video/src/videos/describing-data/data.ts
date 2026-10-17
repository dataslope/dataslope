import m from "./measurements.json";

// Every dot, bar and number the video shows. Measured, not drawn: measure.py
// re-runs the lessons' own code blocks (and two of their chart specs) with
// their seeds, and measurements.json is its output, imported here as it is.
// Pure (no Remotion, no DOM). The lessons' printed lines are echoed by
// measure.py on stderr, for checking against script.ts.

export const VIDEO = "describing-data";

/**
 * Whether public/images/describing-data/ holds the four watercolors from
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

/**
 * A beeswarm: each value's vertical offset (in multiples of the dot's
 * diameter, alternating up and down from 0) so that no two dots closer than
 * `gap` along the axis share a row. `gap` is in data units.
 */
export function swarm(values: readonly number[], gap: number): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const rows: number[] = new Array(values.length).fill(0);
  const placed: { v: number; row: number }[] = [];
  for (const [v, i] of order) {
    const near = placed.filter((p) => v - p.v < gap);
    let row = 0;
    for (let k = 0; ; k++) {
      row = k === 0 ? 0 : k % 2 ? (k + 1) / 2 : -k / 2;
      if (!near.some((p) => p.row === row)) break;
    }
    rows[i] = row;
    placed.push({ v, row });
  }
  return rows;
}

/** A dot plot: each value's row, counting up from 0 for every repeat of it. */
export function stack(values: readonly number[]): number[] {
  const seen = new Map<number, number>();
  return values.map((v) => {
    const k = seen.get(v) ?? 0;
    seen.set(v, k + 1);
    return k;
  });
}

// ── Part 1. Ten salaries and a CEO (measures-of-center) ─────────────────────

export const SALARIES = {
  values: m.salaries.values as readonly number[],
  ceo: m.salaries.ceo,
  mean: m.salaries.mean,
  median: m.salaries.median,
  ceoMean: m.salaries.ceoMean,
  ceoMedian: m.salaries.ceoMedian,
  below: m.salaries.below,
  count: m.salaries.count,
};

/** Five hundred right-skewed orders (seed 7), in $2 bins from $0. */
export const ORDERS = {
  n: m.orders.n,
  bin: m.orders.bin,
  lo: m.orders.lo,
  counts: m.orders.counts as readonly number[],
  mean: m.orders.mean,
  median: m.orders.median,
  gap: m.orders.gap,
  max: m.orders.max,
};

// ── Part 2. Spread (measures-of-spread) ─────────────────────────────────────

export const DELIVERY = {
  steady: m.delivery.steady as readonly number[],
  erratic: m.delivery.erratic as readonly number[],
  mean: m.delivery.mean,
  steadyMin: m.delivery.steadyMin,
  steadyMax: m.delivery.steadyMax,
  erraticMin: m.delivery.erraticMin,
  erraticMax: m.delivery.erraticMax,
  deviations: m.delivery.deviations as readonly number[],
  squares: m.delivery.squares as readonly number[],
  sumSquares: m.delivery.sumSquares,
  divisor: m.delivery.divisor,
  variance: m.delivery.variance,
  steadySd: m.delivery.steadySd,
  erraticSd: m.delivery.erraticSd,
};

/** The bessel-correction chart's first sample of five, and its averages. */
export const DIVISOR = {
  sigma2: m.divisor.sigma2,
  trials: m.divisor.trials,
  five: m.divisor.five as readonly number[],
  fiveMean: m.divisor.fiveMean,
  ssAroundMean: m.divisor.ssAroundMean,
  ssAroundTruth: m.divisor.ssAroundTruth,
  byN: m.divisor.byN,
  byN1: m.divisor.byN1,
  lowPct: m.divisor.lowPct,
  numpyStd: m.divisor.numpyStd,
  pandasStd: m.divisor.pandasStd,
};

/** Sum of squared distances from the five values to `c`. */
export const sumSquaresAround = (c: number) => DIVISOR.five.reduce((s, x) => s + (x - c) ** 2, 0);

export const ROBUST = {
  values: m.robust.values as readonly number[],
  q1: m.robust.q1,
  q3: m.robust.q3,
  iqr: m.robust.iqr,
  sd: m.robust.sd,
  median: m.robust.median,
  distances: m.robust.distances as readonly number[],
  mad: m.robust.mad,
};

// ── Part 3. Shape, tails and outliers (shape-and-outliers) ──────────────────

export type Shape = {
  lo: number;
  hi: number;
  bin: number;
  counts: readonly number[];
  mean: number;
  median: number;
  gap: number;
};
export const SKEW = m.skew as { left: Shape; symmetric: Shape; right: Shape };

export const HEIGHTS = {
  lo: m.heights.lo,
  hi: m.heights.hi,
  bin: m.heights.bin,
  counts: m.heights.counts as readonly number[],
  countsA: m.heights.countsA as readonly number[],
  countsB: m.heights.countsB as readonly number[],
  mean: m.heights.mean,
  muA: m.heights.muA,
  muB: m.heights.muB,
};

export type Tail = {
  n: number;
  /** Standardized values in 32 bins from -4 to 4 SD. */
  counts: readonly number[];
  far: number;
  farZ: readonly number[];
};
export const TAILS = m.tails as { normal: Tail; heavy: Tail };

export const OUTLIERS = {
  values: m.outliers.values as readonly number[],
  planted: m.outliers.planted as readonly number[],
  upper: m.outliers.upper,
  zCut: m.outliers.zCut,
  iqrFlagged: m.outliers.iqrFlagged as readonly number[],
  zFlagged: m.outliers.zFlagged as readonly number[],
  iqrFlags: m.outliers.iqrFlags,
  zFlags: m.outliers.zFlags,
  tailFlags: m.outliers.tailFlags,
};

// ── Part 4. Always plot first ────────────────────────────────────────────────

export type DinoStats = { meanX: number; meanY: number; sdX: number; sdY: number; corr: number };
export const DINO = {
  order: m.dino.order as readonly string[],
  points: m.dino.points as unknown as Record<string, readonly (readonly [number, number])[]>,
  stats: m.dino.stats as Record<string, DinoStats>,
  n: m.dino.n,
};

export type BinSet = { width: number; counts: readonly number[]; density: readonly number[] };
export const BINS = {
  n: m.bins.n,
  lo: m.bins.lo,
  hi: m.bins.hi,
  sets: m.bins.sets as Record<"5" | "20" | "80", BinSet>,
  box: m.bins.box,
  kde: m.bins.kde as { grid: readonly number[]; density: readonly number[] },
  /** Every fifth sorted value: the ECDF's steps, thinned for drawing. */
  ecdf: m.bins.ecdf as readonly number[],
};
