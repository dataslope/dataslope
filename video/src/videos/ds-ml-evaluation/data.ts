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

/** How often a model kept both cholesterol measures, only one, or neither, over resamples. */
export type PairCounts = { both: number; s1: number; s2: number; neither: number };
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
  enetDropped: string[];
  /** Elastic net's share of L1 in its penalty (the rest is L2). */
  enetL1Ratio: number;
  s1s2: number;
  lassoS1S2: Pair;
  enetS1S2: Pair;
  /** Lasso and elastic net refitted on `n` resamples of the patients. */
  boot: { n: number; lasso: PairCounts; enet: PairCounts };
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
  /** The five-fold mean again, over two hundred reshuffles of the folds. */
  means: number[];
  meansMin: number;
  meansMax: number;
  splitsSd: number;
  meansSd: number;
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
  /** The share positive on the balanced test set: PR's chance level there. */
  prevalenceBalanced: number;
  /** At one low threshold: catches, false alarms, and the false positive rate. */
  alarms: { t: number; tp: number; fp: number; negatives: number; fpr: number; recall: number };
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
export const LOSS = results.loss as {
  p: number[];
  xent: number[];
  sq: number[];
  at: number;
  xentAt: number;
  sqAt: number;
  /** Each loss's slope against the logit behind a sigmoid, at `at`. */
  xentGrad: number;
  sqGrad: number;
};

/** A share as a whole percent, the way the narration says it. */
export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

/** A count with thousands separators. */
export const count = (v: number) => v.toLocaleString("en-US");

/** A signed number with a true minus sign, which a hyphen only imitates. */
export const signed = (v: number, digits = 2) => `${v < 0 ? "\u2212" : ""}${Math.abs(v).toFixed(digits)}`;
