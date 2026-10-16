import m from "./measurements.json";

// Every histogram and number the video shows. Measured, not drawn: measure.py
// re-runs the lesson's own code blocks with their seeds, and measurements.json
// is its output, imported here as it is. Pure (no Remotion, no DOM). The
// numbers the narration quotes are printed by measure.py, on stderr.

export const VIDEO = "sampling-distributions";

/**
 * Whether public/images/sampling-distributions/ holds the two watercolors
 * from illustrations.json. Set it to true once `npm run illustrations --
 * sampling-distributions` has written both WebPs. Every frame is laid out
 * with room for them either way.
 */
export const ILLUSTRATIONS = true;

export type Hist = { lo: number; hi: number; bin: number; counts: readonly number[] };

/** Counts per bin over [lo, hi). Values outside are left out. */
export function histogram(xs: readonly number[], lo: number, hi: number, width: number): Hist {
  const bins = Math.round((hi - lo) / width);
  const counts = new Array<number>(bins).fill(0);
  for (const x of xs) {
    const i = Math.floor((x - lo) / width);
    if (i >= 0 && i < bins) counts[i]++;
  }
  return { lo, hi, bin: width, counts };
}

export const peak = (h: Hist) => Math.max(1, ...h.counts);

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

// ── The three distributions (the lesson's seed-0 block) ─────────────────────

const three = m.three;

/** Customers per sample. */
export const N = three.n;

/** (a) A million customers' spend: normal, mean 50 and sd 18 as drawn. */
export const POPULATION = {
  mean: three.population.mean,
  sd: three.population.sd,
  size: three.population.count,
  hist: three.population.hist as Hist,
};

/** (b) One sample of forty: its raw values, in the order they were drawn. */
export const SAMPLE = {
  values: three.sample.values as readonly number[],
  mean: three.sample.mean,
  sd: three.sample.sd,
};

/** Samples 2 to 101 of the pile, as raw values, for the dots on screen. */
export const NEXT_SAMPLES: readonly (readonly number[])[] = three.next_samples;

/** (c) The averages, in the order they are drawn: the one sample's first,
 *  then the lesson's next 4,999. */
export const PILE = {
  means: three.pile.means as readonly number[],
  mean: three.pile.mean,
  sd: three.pile.sd,
};
export const SAMPLE_COUNT = PILE.means.length;

/** Raw values of the sample whose mean is PILE.means[i], when measured. */
export const sampleValues = (i: number): readonly number[] | null =>
  i === 0 ? SAMPLE.values : (NEXT_SAMPLES[i - 1] ?? null);

// ── More samples, or bigger ones (the lesson's seed-1 block) ────────────────

export type LeverRow = { n: number; samples: number; sd: number; mean: number; hist: Hist };
const lever = (r: (typeof m.levers.more)[number]): LeverRow => ({
  n: r.n,
  samples: r.samples,
  sd: r.sd,
  mean: r.mean,
  hist: r.hist as Hist,
});
/** n = 40 throughout, with 500, 2,000, 8,000 and 32,000 samples. */
export const MORE: readonly LeverRow[] = m.levers.more.map(lever);
/** 4,000 samples throughout, with n = 10, 40, 160 and 640. */
export const BIGGER: readonly LeverRow[] = m.levers.bigger.map(lever);

// ── Any statistic (the lesson's seed-5 block) ──────────────────────────────

/** Customers per sample in the any-statistic block. */
export const ANY_N = m.any.n;
export const LOPSIDED = {
  mean: m.any.population.mean,
  sd: m.any.population.sd,
  skew: m.any.population.skew,
  hist: m.any.population.hist as Hist,
};
export type StatKey = "mean" | "median" | "max";
export const STATS: readonly {
  key: StatKey;
  name: string;
  center: number;
  sd: number;
  skew: number;
  hist: Hist;
}[] = (
  [
    ["mean", "Mean"],
    ["median", "Median"],
    ["max", "Maximum"],
  ] as const
).map(([key, name]) => {
  const s = m.any.stats[key];
  return { key, name, center: s.mean, sd: s.sd, skew: s.skew, hist: s.hist as Hist };
});
export const ANY_SAMPLES = STATS[0].hist.counts.reduce((a, b) => a + b, 0);
