import results from "./results.json" with { type: "json" };

// Every number and every curve the video shows, read from results.json: what
// NumPy, SciPy and statsmodels in Pyodide 314.0.7 (the runtime the page's
// blocks run in) returned for check.mjs, which wrote it. The novelty lifts are
// Data Analyst Part 7's, recomputed there and checked against its results, so
// the two series agree. Every random draw is seeded, so a rerun gives the same
// figures. Pure (no Remotion, no DOM).

export const VIDEO = "ds-experiments-in-practice";

/**
 * Whether public/images/ds-experiments-in-practice/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

type Srm = { observed: [number, number]; expected: number; chi2: number; p: number };

/** The page's SRM block (4,800 against 5,200), and a split chance explains. */
export const SRM = results.srm as { bad: Srm; fine: Srm };

type NullTest = { n: number; a: number; b: number; diff: number; lo: number; hi: number; p: number };

/** Two simulated A/A tests on a 10% rate, in percentage points; `worth` is the video's own bar. */
export const NOSIG = results.nosig as { base: number; worth: number; small: NullTest; large: NullTest };

type Arm = { conv: number; n: number; rate: number };

/** The video's own uneven rollout: mobile, desktop, and both pooled. */
export const SIMPSON = results.simpson as { segment: "Mobile" | "Desktop" | "Pooled"; control: Arm; treatment: Arm }[];

/** charts/novelty-effect-fades.mjs, weeks 1 to 8: lift over control, in percent. */
export const NOVELTY = results.novelty as { novelty: number[]; durable: number[] };

/** The chance of at least one false positive in k tests at 5%, k = 1 to 20. */
export const FAMILY = results.family as { k: number[]; p: number[]; at20: number };

/** Ten simulated metrics, three with a real effect, sorted by p. */
export const METRICS = results.metrics as {
  m: number;
  real: number;
  /** `bar` is Benjamini-Hochberg's bar for the rank, rank / m x 0.05. */
  rows: { rank: number; p: number; bar: number; real: boolean; raw: boolean; bh: boolean; bonferroni: boolean }[];
  counts: { raw: number; bh: number; bonferroni: number; rawFalse: number };
  bonferroniCut: number;
};

/** Two simulated cities over twelve weeks; the policy starts in week `start`. */
export const DID = results.did as {
  weeks: number[];
  start: number;
  truth: number;
  treated: number[];
  control: number[];
  treatedBefore: number;
  treatedAfter: number;
  controlBefore: number;
  controlAfter: number;
  treatedChange: number;
  controlChange: number;
  did: number;
  ols: number;
  /** The slope of the treated-minus-comparison gap over the weeks before the policy, per week. */
  preGap: number;
};

/** The average significant estimate over the truth, by power, computed exactly. */
export const CURSE = results.curse as { power: number; se: number; ratio: number }[];

/** Three experiments of one change (the video's own): each lift in percent
 *  with its standard error and its share of the inverse-variance weight; the
 *  plain average of their headlines, and the pooled estimate. */
export const META = results.meta as {
  studies: { est: number; se: number; weight: number }[];
  average: number;
  pooled: number;
  pooledSe: number;
};

/** A count with thousands separators. */
export const count = (v: number) => v.toLocaleString("en-US");

/** Points or percent to one decimal, with its sign when asked. */
export const fixed = (v: number, digits = 1, signed = false) => `${signed && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
