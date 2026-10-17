import m from "./measurements.json";

// Every bar, dot, curve and number the video shows. Measured, not drawn:
// measure.py re-runs the lessons' own code blocks with their seeds, and
// measurements.json is its output, imported here as it is. Pure (no
// Remotion, no DOM). The lessons' printed lines are echoed by measure.py on
// stderr, for checking against script.ts. The curves are the named
// distributions' own formulas, evaluated at the parameters measured there.

export const VIDEO = "distributions";

/**
 * Whether public/images/distributions/ holds the four watercolors from
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

// ── The named distributions' formulas ───────────────────────────────────────

export const normalPdf = (x: number, mu: number, s: number) =>
  Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
export const expPdf = (x: number, scale: number) => (x < 0 ? 0 : Math.exp(-x / scale) / scale);
export const expCdf = (x: number, scale: number) => (x < 0 ? 0 : 1 - Math.exp(-x / scale));

/** The standard normal CDF (Abramowitz and Stegun 7.1.26 via erf, accurate
 *  to about 1e-7), for shading an area as it sweeps. */
export const normalCdf = (x: number, mu = 0, s = 1) => {
  const z = (x - mu) / (s * Math.SQRT2);
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return 0.5 * (1 + (z >= 0 ? y : -y));
};

// ── Part 1. Counting (discrete-distributions) ───────────────────────────────

export const BERNOULLI = {
  p: m.bernoulli.p,
  /** P(no), P(yes). */
  pmf: m.bernoulli.pmf as readonly number[],
  /** The lesson's ten simulated visitors, random_state=0: 1 signed up. */
  sample: m.bernoulli.sample as readonly number[],
};

export const BINOMIAL = {
  n: m.binomial.n,
  p: m.binomial.p,
  k: m.binomial.k as readonly number[],
  pmf: m.binomial.pmf as readonly number[],
  mean: m.binomial.mean,
  sd: m.binomial.sd,
  mode: m.binomial.mode,
  atLeast: m.binomial.atLeast,
  /** P(10 or more), the lesson's sf(9). */
  sfAtLeast: m.binomial.sfAtLeast,
};

export const POISSON = {
  lambda: m.poisson.lambda,
  k: m.poisson.k as readonly number[],
  pmf: m.poisson.pmf as readonly number[],
  mean: m.poisson.mean,
  variance: m.poisson.var,
  atLeast: m.poisson.atLeast,
  /** P(8 or more), sf(7). */
  sfAtLeast: m.poisson.sfAtLeast,
  /** "roughly 1 hour out of 84". */
  oneIn: m.poisson.oneIn,
  hours: m.poisson.hours,
  /** Share of the 100,000 simulated hours with each count. */
  simulated: m.poisson.simulated as readonly number[],
  simulatedAtLeast: m.poisson.simulatedAtLeast,
  /** The first 24 of those hours. */
  firstHours: m.poisson.firstHours as readonly number[],
};

export const GEOMETRIC = {
  p: m.geometric.p,
  k: m.geometric.k as readonly number[],
  pmf: m.geometric.pmf as readonly number[],
  mean: m.geometric.mean,
  median: m.geometric.median,
  moreThan: m.geometric.moreThan,
  sfMoreThan: m.geometric.sfMoreThan,
};

// ── Part 2. Probability is area (continuous-distributions) ──────────────────

export const EXPONENTIAL = {
  scale: m.exponential.scale,
  a: m.exponential.a,
  b: m.exponential.b,
  cdfA: m.exponential.cdfA,
  cdfB: m.exponential.cdfB,
  between: m.exponential.between,
  pdf0: m.exponential.pdf0,
  point: m.exponential.point,
};

export const UNIFORM = {
  loc: m.uniform.loc,
  scale: m.uniform.scale,
  pdf: m.uniform.pdf,
  a: m.uniform.a,
  b: m.uniform.b,
  between: m.uniform.between,
  narrowScale: m.uniform.narrowScale,
  narrowPdf: m.uniform.narrowPdf,
};

export const QUANTILE = { scale: m.quantile.scale, p: m.quantile.p, ppf: m.quantile.ppf };

// ── Part 3. The normal (the-normal-distribution) ────────────────────────────

export const PENGUINS = {
  n: m.penguins.n,
  mean: m.penguins.mean,
  sd: m.penguins.sd,
  lo: m.penguins.lo,
  bin: m.penguins.bin,
  counts: m.penguins.counts as readonly number[],
};

export const RULE = {
  /** Percent within 1, 2 and 3 SDs. */
  within: m.rule.within as readonly number[],
  mu: m.rule.mu,
  sigma: m.rule.sigma,
  rare: m.rule.rare,
  aboveRare: m.rule.aboveRare,
};

export const Z = m.z;

export const INCOME = {
  n: m.income.n,
  mean: m.income.mean,
  median: m.income.median,
  sd: m.income.sd,
  max: m.income.max,
  belowZero: m.income.belowZero,
  /** norm.fit on the same incomes. */
  fitLoc: m.income.fitLoc,
  fitScale: m.income.fitScale,
  lo: m.income.lo,
  bin: m.income.bin,
  counts: m.income.counts as readonly number[],
  beyond: m.income.beyond,
};

// ── Part 4. Fitting (working-with-distributions) ────────────────────────────

export const FIT = {
  n: m.fit.n,
  loc: m.fit.loc,
  scale: m.fit.scale,
  ppf95: m.fit.ppf95,
  lo: m.fit.lo,
  bin: m.fit.bin,
  counts: m.fit.counts as readonly number[],
};

type QQ = { theoretical: readonly number[]; sample: readonly number[]; corr: number };
export const QQ_PLOTS = { normal: m.qq.normal as QQ, skewed: m.qq.skewed as QQ };

export const RANGE = {
  n: m.range.n,
  values: m.range.values as readonly number[],
  min: m.range.min,
  max: m.range.max,
  loc: m.range.loc,
  scale: m.range.scale,
  near: m.range.near,
  sfNear: m.range.sfNear,
  dataAboveNear: m.range.dataAboveNear,
  far: m.range.far,
  sfFar: m.range.sfFar,
  farZeros: m.range.farZeros,
  farDigits: m.range.farDigits,
};
