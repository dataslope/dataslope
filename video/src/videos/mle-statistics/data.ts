// What the mle-statistics video draws, read from results.json, which
// check.mjs computed in Pyodide 314.0.7 with NumPy 2.4.6 (see script.ts for
// the numbers, and check.mjs for how each was made; every draw is seeded).
// Pure: no React, no Remotion, so the scenes and any test can import it.
import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-statistics";

/** The zebra and the spots are imported (illustrations.json → public/images/mle-statistics). */
export const ILLUSTRATIONS = true;

/** A histogram: counts per bin, and the bins' edges (one more than the counts). */
type Hist = { counts: number[]; edges: number[] };

/** Python version and library versions the run used. */
export const RUNTIME = results.runtime as { python: string; numpy: string; sklearn: string };

/** The hook: two models on the same 2,000 test examples (constructed, not drawn). */
export const MODELS = results.models as {
  n: number;
  old: number;
  new: number;
  bothRight: number;
  bothWrong: number;
  onlyOld: number;
  onlyNew: number;
};

/** Question 1: the SD of one right-or-wrong, and the accuracy's standard error by n. */
export const SE = results.se as {
  p: number;
  sd: number;
  n: number;
  se: number;
  /** The standard error at four times the data. */
  half: number;
  nHalf: number;
  /** 1.96 standard errors. */
  margin: number;
  curve: [number, number][];
};

/** Question 2: the page's own CLT block (exponential, scale 3; 3,000 samples of 40). */
export const CLT = results.clt as {
  popMean: number;
  meanOfMeans: number;
  seFormula: number;
  seSimulated: number;
  n: number;
  samples: number;
  popSkew: number;
  meanSkew: number;
  means: Hist;
  /** The population, binned over 0 to 15. */
  population: Hist;
};

/** Question 3: one running mean over the same population, settling on its mean. */
export const LLN = results.lln as { at: [number, number][]; truth: number };

/** Question 4: a hundred intervals for a model truly 91% accurate, [low, high, covers]. */
export const CI = results.ci as {
  truth: number;
  n: number;
  sets: number;
  covered: number;
  intervals: [number, number, boolean][];
};

/** Question 4's follow-up: slices of 40 at 97%, the textbook interval against Wilson's. */
export const SLICE = results.slice as {
  n: number;
  p: number;
  sims: number;
  wald: number;
  wilson: number;
  /** Share of slices scoring 40 of 40, simulated, and 0.97 to the 40th. */
  perfect: number;
  perfectExact: number;
};

/** Question 5: the page's own bootstrap block (kept, not said). */
export const BOOT_PAGE = results.bootPage as { mean: number; low: number; high: number; formula: [number, number] };

/** Question 5: simulated latencies (ms), their p95, and 5,000 bootstrap p95s. */
export const BOOT_P95 = results.bootP95 as {
  requests: number;
  resamples: number;
  median: number;
  p95: number;
  low: number;
  high: number;
  se: number;
  boots: Hist;
  /** The latencies, binned over 0 to 200 ms; `above` fall past 200. */
  latency: Hist & { above: number };
};

/** Question 5's follow-up: 2,000 rows from 200 users, resampled by row and by user. */
export const CLUSTER = results.cluster as {
  users: number;
  perUser: number;
  rows: number;
  accuracy: number;
  seRows: number;
  seUsers: number;
  /** The spread over 3,000 fresh datasets: what the interval should show. */
  seTrue: number;
  /** How much narrower the row interval is than the user one. */
  narrower: number;
};

/** Question 7: two equally good models, checked every 200 labels up to 2,000. */
export const PEEK = results.peek as {
  runs: number;
  step: number;
  looks: number;
  accuracy: number;
  onceAtEnd: number;
  everyLook: number;
};

/** Question 8: the page's own permutation block. */
export const PERM_PAGE = results.permPage as { observed: number; p: number; null: Hist };

/** Question 8: the two models, shuffled pooled and shuffled within pairs. */
export const PERM_MODELS = results.permModels as {
  gap: number;
  shuffles: number;
  unpaired: number;
  paired: number;
  signTest: number;
  disagree: number;
  newWins: number;
  unpairedNull: Hist;
  /** The paired null takes few values: each one and how often it came up. */
  pairedNull: { values: number[]; counts: number[] };
};

/** Question 9: an online test from a 5% to a 5.5% click rate. */
export const POWER = results.power as {
  base: number;
  target: number;
  alpha: number;
  power: number;
  perArm: number;
  perArmHalfLift: number;
  ratio: number;
  smallArm: number;
  powerSmall: number;
  simSmall: number;
  simFull: number;
  /** [users per arm, power]. */
  curve: [number, number][];
};

/** Question 10: a simulation of loan applicants, approvals and defaults. */
export const SELECTION = results.selection as {
  applicants: number;
  approvedShare: number;
  approved: number;
  population: number;
  approvedRate: number;
  /** Default rate in samples of 1,000, 10,000 and 60,000 approved loans. */
  bySize: Record<"1000" | "10000" | "60000", number>;
  explore: number;
  exploreRate: number;
  exploreSe: number;
};

/** Question 11: the underflow, and the likelihood of 3 clicks in 3 views, raw and smoothed. */
export const MLE = results.mle as {
  labels: number;
  product: number;
  logLik: number;
  smallest: number;
  clicks: number;
  views: number;
  mle: number;
  smoothed: number;
  grid: number[];
  /** Each scaled so its peak is 1. */
  curve33: number[];
  curveSmoothed: number[];
};

type Flags = {
  prevalence: number;
  fraud: number;
  caught: number;
  falseFlags: number;
  flagged: number;
  precision: number;
  recall: number;
};

/** Question 12: the page's base-rate grid as fraud, at 1 in 1,000 and 1 in 100. */
export const BAYES = results.bayes as { rare: Flags; common: Flags; population: number };

/** The quick round. */
export const RAPID = results.rapid as {
  densitySd: number;
  densityPeak: number;
  densityArea: number;
  rSquare: number;
  covariance: { cmKg: number; mKg: number; r: number; rM: number };
};

/** A percentage: 0.0534 → "5.3%". */
export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
