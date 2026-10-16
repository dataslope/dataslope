// Every number and every mark the video draws. Measured, not drawn:
// measure.py samples the lesson's population with numpy and
// measurements.json is its output, imported here as it is. Pure (no
// Remotion, no DOM).
import m from "./measurements.json" with { type: "json" };

export const VIDEO = "sampling-bias";

/**
 * Whether public/images/sampling-bias/ holds the two watercolors from
 * illustrations.json. Set it to true once `npm run illustrations --
 * sampling-bias` has written both WebPs. Every frame is laid out with room
 * for them either way.
 */
export const ILLUSTRATIONS = true;

// ── The population ──────────────────────────────────────────────────────────

export const POP_SIZE = m.population.size;
export const TRUE_MEAN = m.population.trueMean;
/** Counts in 2-point bins over [0, 100]; a clipped 100 is in the last bin. */
export const POP_HIST: readonly number[] = m.population.hist;
export const POP_BIN = m.population.binWidth;
/** Share of the 200,000 who score above THRESHOLD. */
export const SHARE_ABOVE = m.population.shareAbove;
export const THRESHOLD = m.meta.threshold;
/** How much likelier a customer above THRESHOLD is to be picked: 1.1 / 0.1. */
export const LIKELIER = Math.round(m.meta.likelier);

// ── The lesson's two samples of 500 ─────────────────────────────────────────

export const SAMPLE_N = m.first.n;
export type Sample = { mean: number; shareAbove: number; values: readonly number[] };
export const FIRST_RANDOM: Sample = m.first.random;
export const FIRST_EASY: Sample = m.first.convenience;

// ── Draw again: 100 samples of 500 by each method ───────────────────────────

/** The first of each is the lesson's own sample above. */
export const REPEAT_RANDOM: readonly number[] = m.repeat.random;
export const REPEAT_EASY: readonly number[] = m.repeat.convenience;
export const REPEAT_COUNT = REPEAT_RANDOM.length;
export const RANDOM_ABOVE = m.repeat.randomAbove;
export const RANDOM_BELOW = m.repeat.randomBelow;
export const EASY_MIN = m.repeat.convenienceMin;
export const EASY_MAX = m.repeat.convenienceMax;

// ── Grow the sample: 400 samples by each method at each size ────────────────

export type Spread = {
  center: number;
  spread: number;
  bias: number;
  lo: number;
  hi: number;
  min: number;
  max: number;
  means: readonly number[];
};
export type SweepRow = { n: number; random: Spread; convenience: Spread };
export const SWEEP: readonly SweepRow[] = m.sweep;
export const SIZES = SWEEP.map((r) => r.n);
export const sweepAt = (n: number) => {
  const r = SWEEP.find((s) => s.n === n);
  if (!r) throw new Error(`No sample size ${n} in measurements.json`);
  return r;
};
export const LARGEST = SWEEP[SWEEP.length - 1];
/** How many times tighter the averages get from the smallest size to the
 *  largest, by method: "about the same pace". */
export const TIGHTENING = {
  random: SWEEP[0].random.spread / LARGEST.random.spread,
  convenience: SWEEP[0].convenience.spread / LARGEST.convenience.spread,
};

// ── The closing figure: one pile, squeezed and then moved ───────────────────

/** Where the averages of the easy way land at 200 a sample, at 5,000, and
 *  where the random way's land at 5,000. */
export const CLOSE = {
  wide: sweepAt(200).convenience,
  narrow: sweepAt(5000).convenience,
  moved: sweepAt(5000).random,
} as const;

/** Silverman's rule-of-thumb bandwidth for a Gaussian kernel. */
const bandwidth = (s: Spread) => 1.06 * s.spread * s.means.length ** -0.2;

/**
 * A pile's outline, as a function of the standardized position z: the kernel
 * density of its averages at center + z * spread, times spread. Written in z
 * so that two piles of very different widths can be morphed into each other
 * point for point; the height on screen is this over the spread.
 */
export function shapeOf(s: Spread, zs: readonly number[]) {
  const b = bandwidth(s);
  const k = 1 / (s.means.length * b * Math.sqrt(2 * Math.PI));
  return zs.map((z) => {
    const x = s.center + z * s.spread;
    let d = 0;
    for (const v of s.means) d += Math.exp(-0.5 * ((x - v) / b) ** 2);
    return d * k * s.spread;
  });
}

// ── 1936 ────────────────────────────────────────────────────────────────────

export const H = m.history;
/** One square of the ballot grid, in ballots. */
export const PER_SQUARE = 100_000;
export const SQUARES = H.digestMailed / PER_SQUARE;
export const RETURNED_SQUARES = Math.round(H.digestReturned / PER_SQUARE);

// ── Small helpers ───────────────────────────────────────────────────────────

/** Counts per bin over [lo, hi), and which bin each value fell in. */
export function binsOf(xs: readonly number[], lo: number, hi: number, width: number) {
  const n = Math.round((hi - lo) / width);
  const counts = new Array<number>(n).fill(0);
  const slot = xs.map((x) => {
    const i = Math.floor((x - lo) / width);
    if (i < 0 || i >= n) return { bin: -1, level: -1 };
    const level = counts[i]++;
    return { bin: i, level };
  });
  return { counts, slot };
}

/** mulberry32: a tiny seeded PRNG for layout jitter. Never Math.random. */
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

export const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

// ── Printing, for checking the script ───────────────────────────────────────

const runAsScript =
  typeof process !== "undefined" &&
  typeof process.argv?.[1] === "string" &&
  process.argv[1].endsWith("data.ts");
if (runAsScript) {
  const f = (x: number, d = 2) => x.toFixed(d);
  console.log(`population ${POP_SIZE}: true mean ${f(TRUE_MEAN)}, ${f(SHARE_ABOVE * 100, 1)}% above ${THRESHOLD}`);
  console.log(`random 500: ${f(FIRST_RANDOM.mean)}  easy 500: ${f(FIRST_EASY.mean)} (+${f(FIRST_EASY.mean - TRUE_MEAN)})`);
  console.log(`repeat: random ${RANDOM_ABOVE} above / ${RANDOM_BELOW} below; easy ${f(EASY_MIN)} to ${f(EASY_MAX)}`);
  for (const r of SWEEP) {
    console.log(
      `n=${r.n}: random ${f(r.random.center)} ±${f(r.random.spread, 3)}  easy ${f(r.convenience.center)} ±${f(r.convenience.spread, 3)} bias ${f(r.convenience.bias)}`,
    );
  }
  console.log(`tightening: random ${f(TIGHTENING.random, 1)}x, easy ${f(TIGHTENING.convenience, 1)}x`);
  console.log(`1936: ${H.digestRooseveltShare}% / ${H.gallupRooseveltShare}% / ${H.resultRooseveltShare}%; squares ${RETURNED_SQUARES} of ${SQUARES}`);
}
