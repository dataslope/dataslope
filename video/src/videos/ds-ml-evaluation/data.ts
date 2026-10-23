import results from "./results.json" with { type: "json" };

// Every number and every curve the video shows, read from results.json: what
// scikit-learn 1.8.0 and NumPy in Pyodide 314.0.7 (the runtime the page's
// blocks run in) returned for check.mjs, which wrote it. Every random draw is
// seeded there, so a rerun gives the same figures. Pure (no Remotion, no DOM).

export const VIDEO = "ds-ml-evaluation";

/**
 * Whether public/images/ds-ml-evaluation/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

type Pair = [number, number];

/** The hook: an unpruned tree's accuracy on its own training half and on the other half. */
export const HOOK = results.hook as { n: number; train: number; test: number };

/** Twenty points from a noisy sine, the fits of degree 1, 3 and 9, and every degree's two errors. */
export const BIAS = results.bias as {
  points: Pair[];
  curves: Record<"1" | "3" | "9", number[]>;
  grid: number[];
  degrees: number[];
  train: number[];
  val: number[];
};

/** The diabetes set's ten coefficients along the lasso and ridge paths, and the marked strength. */
export const REG = results.reg as {
  features: string[];
  logAlpha: number[];
  lasso: number[][];
  ridge: number[][];
  pickLog: number;
  lassoKept: number;
  ridgeKept: number;
  enetKept: number;
  lassoDropped: string[];
  s1s2: number;
  lassoS1S2: Pair;
  enetS1S2: Pair;
};

/** Two hundred single splits of the breast cancer set, and five folds. */
export const CV = results.cv as {
  rows: number;
  test: number;
  splits: number[];
  min: number;
  max: number;
  folds: number[];
  mean: number;
  std: number;
};

type Errors = { train: number[]; val: number[] };
/** Learning curves on the sine for a straight line and for degree 9. */
export const LEARN = results.learn as { sizes: number[]; noise: number; "1": Errors; "9": Errors };

export type Rates = { t: number; precision: number; recall: number; flagged: number };
export type Calibration = { pred: number[]; obs: number[]; counts: number[] };
/** One logistic regression on 200,000 simulated cases, 2% positive. */
export const CLS = results.cls as {
  train: number;
  test: number;
  positives: number;
  prevalence: number;
  thresholds: Rates[];
  /** [threshold, precision, recall] */
  curve: [number, number, number][];
  roc: Pair[];
  rocBalanced: Pair[];
  /** [recall, precision] */
  pr: Pair[];
  prBalanced: Pair[];
  auc: number;
  ap: number;
  aucBalanced: number;
  apBalanced: number;
  allNegative: number;
  accuracy: number;
  plainAt50: Rates;
  weightedAt50: Rates;
  calPlain: Calibration;
  calWeighted: Calibration;
  calRecal: Calibration;
};

/** Gradient descent on x² from 8, the page's chart: the x at each step, per rate. */
export const GD = results.gd as { start: number; steps: number; runs: Record<"0.004" | "0.25" | "1.05", number[]> };

/** The page's five regression predictions and their three scores. */
export const METRICS = results.metrics as { true: number[]; pred: number[]; rmse: number; mae: number; r2: number };

/** Squared error and cross-entropy for a true positive, against the predicted probability. */
export const LOSS = results.loss as { p: number[]; xent: number[]; sq: number[]; at: number; xentAt: number; sqAt: number };

/** A share as a whole percent, the way the narration says it. */
export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
