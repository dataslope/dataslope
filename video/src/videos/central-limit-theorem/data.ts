// The simulated data every chart and every number in the video is drawn from.
// Pure (no Remotion, no DOM) and computed once at module load from a seeded
// PRNG, so every frame, every render tab and every machine sees the same
// samples. `node src/videos/central-limit-theorem/data.ts` prints the numbers
// the narration quotes, for checking against script.ts.

export const VIDEO = "central-limit-theorem";

/** mulberry32: a tiny, fast, well-mixed 32-bit PRNG. Never Math.random. */
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

type Rng = () => number;

const exponential = (rng: Rng, mean: number) => -mean * Math.log(1 - rng());

/** Box-Muller, one draw at a time (the twin is discarded for simplicity). */
const normal = (rng: Rng, mu = 0, sd = 1) => {
  const u = 1 - rng();
  const v = rng();
  return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Population standard deviation (ddof 0), as numpy's `.std()`. */
export const sd = (xs: readonly number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
};

export const skew = (xs: readonly number[]) => {
  const m = mean(xs);
  const s = sd(xs);
  return xs.reduce((acc, x) => acc + ((x - m) / s) ** 3, 0) / xs.length;
};

/** Counts per bin over [lo, hi). Values outside are left out (and counted
 *  separately by whoever cares). */
export function histogram(xs: readonly number[], lo: number, hi: number, width: number) {
  const bins = Math.round((hi - lo) / width);
  const counts = new Array<number>(bins).fill(0);
  for (const x of xs) {
    const i = Math.floor((x - lo) / width);
    if (i >= 0 && i < bins) counts[i]++;
  }
  return counts;
}

/** `k` distinct indices out of `n`: one sample without replacement, as the
 *  lesson's `rng.choice(population, size=n, replace=False)`. */
function pick(rng: Rng, n: number, k: number) {
  const seen = new Set<number>();
  while (seen.size < k) seen.add(Math.floor(rng() * n));
  return [...seen];
}

// ── Act 1: coffee shop wait times ───────────────────────────────────────────

/** Mean of the exponential the waits are drawn from, in minutes. */
export const WAIT_MEAN = 10;
export const POP_SIZE = 10_000;
export const SAMPLE_COUNT = 2000;

const rngWaits = mulberry32(20261015);
export const WAITS: readonly number[] = Array.from({ length: POP_SIZE }, () =>
  exponential(rngWaits, WAIT_MEAN),
);
export const WAIT_MU = mean(WAITS);
export const WAIT_SD = sd(WAITS);
export const WAIT_MAX = Math.max(...WAITS);
/** Share of customers who wait half an hour or more. */
export const SHARE_30 = WAITS.filter((w) => w >= 30).length / POP_SIZE;
export const OVER_50 = WAITS.filter((w) => w >= 50).length;

/** Repeated samples of `n` customers from WAITS: the values and their mean. */
function samplesOf(n: number, seed: number) {
  const rng = mulberry32(seed);
  return Array.from({ length: SAMPLE_COUNT }, () => {
    const values = pick(rng, POP_SIZE, n).map((i) => WAITS[i]);
    return { values, mean: mean(values) };
  });
}

/** The sample of thirty the video builds its bell from, one block at a time. */
export const SAMPLES_30 = samplesOf(30, 30);
export const MEANS_30 = SAMPLES_30.map((s) => s.mean);
export const MEANS_5 = samplesOf(5, 5).map((s) => s.mean);
export const MEANS_100 = samplesOf(100, 100).map((s) => s.mean);

export const SPREADS = [
  { n: 5, means: MEANS_5 },
  { n: 30, means: MEANS_30 },
  { n: 100, means: MEANS_100 },
].map((s) => ({
  ...s,
  center: mean(s.means),
  spread: sd(s.means),
  /** The CLT's prediction, from the population's own SD. */
  theory: WAIT_SD / Math.sqrt(s.n),
}));

// ── Act 2: other shapes ─────────────────────────────────────────────────────

const rngDie = mulberry32(6);
const roll = () => 1 + Math.floor(rngDie() * 6);
/** Six thousand rolls of a fair die: the flat population. */
export const DIE_ROLLS: readonly number[] = Array.from({ length: 6000 }, roll);
export const DIE_MEANS_30: readonly number[] = Array.from({ length: SAMPLE_COUNT }, () =>
  mean(Array.from({ length: 30 }, roll)),
);

const rngHumps = mulberry32(2);
/** The lesson's bimodal population: half around 5, half around 15. */
export const HUMPS: readonly number[] = Array.from({ length: POP_SIZE }, (_, i) =>
  normal(rngHumps, i % 2 ? 15 : 5, 1.5),
);
export const HUMP_MEANS_30: readonly number[] = Array.from({ length: SAMPLE_COUNT }, () =>
  mean(pick(rngHumps, POP_SIZE, 30).map((i) => HUMPS[i])),
);

/** The lesson's heavy tail: a log-normal with sigma 1.3 ("think income"),
 *  drawn fresh for each sample so the rare giant values are not capped by a
 *  finite population. */
const rngIncome = mulberry32(13);
const income = () => Math.exp(normal(rngIncome, 0, 1.3));
const incomeMeans = (n: number) =>
  Array.from({ length: SAMPLE_COUNT }, () => mean(Array.from({ length: n }, income)));
export const INCOME_MEANS = { 30: incomeMeans(30), 300: incomeMeans(300) } as const;

// ── Printing, for checking the script ───────────────────────────────────────

const runAsScript =
  typeof process !== "undefined" &&
  typeof process.argv?.[1] === "string" &&
  process.argv[1].endsWith("data.ts");
if (runAsScript) {
  const f = (x: number, d = 2) => x.toFixed(d);
  console.log(`waits: n=${POP_SIZE} mean ${f(WAIT_MU)} sd ${f(WAIT_SD)} max ${f(WAIT_MAX, 1)}`);
  console.log(`  share >= 30 min: ${f(SHARE_30 * 100, 1)}%   >= 50 min: ${OVER_50}`);
  console.log(`  skew ${f(skew(WAITS))}`);
  for (const s of SPREADS) {
    console.log(
      `n=${s.n}: center ${f(s.center)} spread ${f(s.spread)} theory ${f(s.theory)} skew ${f(skew(s.means))}`,
    );
  }
  console.log(`first sample of 30: mean ${f(SAMPLES_30[0].mean)}; next ${f(SAMPLES_30[1].mean)}, ${f(SAMPLES_30[2].mean)}`);
  console.log(`die: rolls mean ${f(mean(DIE_ROLLS))} sd ${f(sd(DIE_ROLLS))}; means30 ${f(mean(DIE_MEANS_30))} sd ${f(sd(DIE_MEANS_30), 3)} skew ${f(skew(DIE_MEANS_30))}`);
  console.log(`humps: mean ${f(mean(HUMPS))} sd ${f(sd(HUMPS))}; means30 ${f(mean(HUMP_MEANS_30))} sd ${f(sd(HUMP_MEANS_30), 3)} skew ${f(skew(HUMP_MEANS_30))}`);
  for (const n of [30, 300] as const) {
    const m = INCOME_MEANS[n];
    console.log(`income n=${n}: mean ${f(mean(m))} sd ${f(sd(m), 3)} skew ${f(skew(m))}`);
  }
}
