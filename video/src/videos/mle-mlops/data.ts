// What the mle-mlops video draws, read from results.json, which check.mjs
// computed (see script.ts for every number and where it comes from, and
// check.mjs for how each was made): scikit-learn runs in Pyodide on the
// digits set it bundles and on seeded simulations, and PSI computed exactly
// on simulated buckets. Nothing here is a real system's output, and the
// video calls each simulation one. Pure (no React, no Remotion), so the
// scenes and any test can import it.
import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-mlops";

/** Whether public/images/mle-mlops/ holds the watercolors from
 *  illustrations.json: the walrus and three spots (the container, the coin
 *  and the lever). */
export const ILLUSTRATIONS = true;

/** Pyodide's Python, scikit-learn and NumPy versions the runs used. */
export const RUNTIME = results.runtime as { python: string; sklearn: string; numpy: string };

/** Questions 2 and 3: a 50-tree random forest on the digits, trained with
 *  seeds 0 to 19 (`accuracy`, one per seed, held-out), and twice with seed
 *  0 (`sameSeedIdentical`, and the two runs' probability digests). */
export const SEEDS = results.seeds as {
  trees: number;
  train: number;
  test: number;
  accuracy: number[];
  min: number;
  max: number;
  sameSeedIdentical: boolean;
  digestA: string;
  digestB: string;
};

type Scores = { overall: number; rest: number; group: number };

/** Questions 4 and 5: the incumbent (last year's rows) and the candidate
 *  (last month's) on today's holdout, overall, on everyone outside the
 *  group, and on the group. */
export const GATE = results.gate as {
  incumbent: Scores;
  candidate: Scores;
  trainYear: number;
  trainMonth: number;
  groupRowsYear: number;
  groupRowsMonth: number;
  holdout: number;
  groupHoldout: number;
  groupShare: number;
  groupPositiveRate: number;
};

type Quarter = { psiX1: number; psiX2: number; psiPred: number; accuracy: number; positiveRate: number };

/** Questions 7 and 8: one logistic regression scored on the same quarter,
 *  a quarter with data drift (x1's mean up by one) and one with concept
 *  drift (no input moved, the rule changed). `x1Shares` is each quarter's
 *  first feature, as shares of the ten training deciles. */
export const DRIFT = results.drift as {
  train: number;
  window: number;
  coef: number[];
  intercept: number;
  same: Quarter;
  data: Quarter;
  concept: Quarter;
  x1Shares: { same: number[]; data: number[]; concept: number[] };
};

/** Questions 9 and 10, the page's own draws: PSI with the page's
 *  compute_psi (outer edges at the training minimum and maximum) and with
 *  open outer buckets, which the video shows; the shares are the current
 *  window's, bucket by bucket (each training bucket holds 0.1). */
export const PSI = results.psi as {
  pageStable: number;
  pageDrifted: number;
  openStable: number;
  openDrifted: number;
  pageDroppedDrifted: number;
  stableShares: number[];
  driftedShares: number[];
};

type Noise = { over01: number; over02: number; median: number; p95: number; max: number };

/** Questions 9 and 10: no drift at all, a reference of 1,000 and a window of
 *  100, 300 or 1,000 from the same distribution, 2,000 tries each. */
export const PSI_NOISE = results.psiNoise as {
  reference: number;
  tries: number;
  bySize: Record<"100" | "300" | "1000", Noise>;
};

/** Questions 9 and 10: a window with a fifth of its values beyond the
 *  reference's maximum, scored with closed and open outer buckets. */
export const PSI_EDGES = results.psiEdges as {
  reference: number;
  window: number;
  beyond: number;
  closed: number;
  open: number;
  openShares: number[];
};
