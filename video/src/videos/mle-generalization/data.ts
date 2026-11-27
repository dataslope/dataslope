// What the mle-generalization video draws, read from results.json, which
// check.mjs measured in Pyodide 314.0.7 with scikit-learn 1.8.0 and NumPy
// 2.4.6 (see script.ts for the numbers as said, and check.mjs for how each was
// made). Pure: no React, no Remotion, so the scenes and any test can import it.
import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-generalization";

/** The flamingo and the two spots in illustrations.json, generated and
 *  imported into public/images/mle-generalization/. */
export const ILLUSTRATIONS = true;

/** The opening and question six: 200 rows of 10,000 random columns, coin-flip
 *  labels. `leaky` picks 20 columns on every row before cross-validating;
 *  `honest` picks them inside each fold. Fifty folds (five, ten times).
 *  `draws` is [leaky, honest] on twenty other draws; the scaler pair is the
 *  page's own example on the page's own data. */
export const LEAK = results.leak as {
  rows: number;
  columns: number;
  kept: number;
  positives: number;
  leaky: number;
  honest: number;
  folds: number;
  leakyFolds: number[];
  honestFolds: number[];
  draws: [number, number][];
  scalerLeaky: number;
  scalerHonest: number;
};

export type Decomp = {
  depth: number;
  bias2: number;
  variance: number;
  noise: number;
  /** bias2 + variance + noise */
  sum: number;
  /** The expected squared error on fresh points, measured directly. */
  measured: number;
};

/** Question one: the bias-variance decomposition of regression trees on
 *  sin(2πx) with noise sd 0.3, 500 training sets of 50 points (and 200 of 500
 *  for `tenfold`). `dart` holds sixty trees' predictions at x0 = 0.25, where
 *  the curve is 1, for depth 1 (the stump) and depth 6. */
export const BIAS = results.bias as {
  n: number;
  reps: number;
  sigma: number;
  noise: number;
  x0: number;
  truthAt0: number;
  curve: [number, number][];
  rows: Decomp[];
  best: number;
  tenfold: { n: number; reps: number; rows: Decomp[] };
  dart: Record<"1" | "6", { first: number[]; mean: number; sd: number }>;
  worstGap: number;
};

type Curve = { sizes: number[]; train: number[]; validation: number[] };

/** Questions two and three: learning curves on Friedman #1 (mean squared
 *  error; noise floor 1.0), and the straight line with and without two
 *  engineered features (x1·x2, x3²), trained on 2,000 rows, tested on 1,000. */
export const FIT = results.fit as {
  noise: number;
  varianceOfY: number;
  tree: Curve;
  linear: Curve;
  plain: number;
  engineered: number;
};

/** Question four: the page's ridge and lasso block. Coefficients by feature
 *  index; `informative` are the five columns make_regression gave signal. */
export const REG = results.reg as {
  features: number;
  informative: number[];
  ridgeNonZero: number;
  lassoNonZero: number;
  lassoKept: number[];
  ridge: number[];
  lasso: number[];
  true: number[];
  ridgeUselessMaxAbs: number;
  ridgeUselessMedianAbs: number;
  lassoSample: number[];
};

/** Question five: the page's split (train, validation, test sizes), and the
 *  selection simulation: coin-flip labels, the best of 50 settings on
 *  validation, scored once on test, 200 repeats. `first` is repeat 0's fifty
 *  validation scores; `shown` is the repeat drawn on screen, the one whose
 *  fifty scores average closest to 50% with a winner closest to the mean. */
export const SPLIT = results.split as {
  sizes: [number, number, number];
  settings: number;
  repeats: number;
  winnerVal: number[];
  winnerTest: number[];
  meanWinnerVal: number;
  meanWinnerTest: number;
  first: { val: number[]; winnerVal: number; winnerTest: number };
  shown: { repeat: number; val: number[]; mean: number; winnerVal: number; winnerTest: number };
};

/** Question seven: the page's five folds (and its printed line), and sixty
 *  users scored with shuffled folds against folds grouped by user. */
export const CV = results.cv as {
  folds: number[];
  mean: number;
  std: number;
  printed: string;
  users: number;
  rowsPerUser: number;
  shuffled: number;
  grouped: number;
};

/** The page's own eight-example blocks: the confusion counts behind
 *  precision, recall and F1, and its ROC-AUC and PR-AUC. */
export const PAGE = results.page as {
  precision: number;
  recall: number;
  f1: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  rocAuc: number;
  prAuc: number;
};

export type AtThreshold = {
  t: number;
  precision: number;
  recall: number;
  fpr: number;
  tp: number;
  fp: number;
  flagged: number;
};

/** Questions eight to ten: the fraud simulation, 100,000 test transactions,
 *  1% fraud. `sweep` is [threshold, precision, recall]; `roc` is [fpr, tpr];
 *  `pr` is [recall, precision]. `weighted` is the same model trained with
 *  balanced class weights. */
export const FRAUD = results.fraud as {
  test: number;
  fraud: number;
  legit: number;
  rate: number;
  allLegitAccuracy: number;
  accuracy: number;
  rocAuc: number;
  prAuc: number;
  thresholds: AtThreshold[];
  sweep: [number, number, number][];
  roc: [number, number][];
  pr: [number, number][];
  top1000: { flagged: number; caught: number; precision: number };
  weighted: {
    meanProbability: number;
    plainMeanProbability: number;
    at: AtThreshold;
    rocAuc: number;
    prAuc: number;
  };
};

type Stop = { patience: number; best: number; bestValidation: number; stop: number | null };

/** Quick, early stopping: a small network's loss by epoch (index 0 is epoch
 *  1), and where a patience of 20 and of 50 stop. */
export const EARLY = results.early as {
  epochs: number;
  train: number[];
  validation: number[];
  short: Stop;
  long: Stop;
  globalBest: number;
  globalBestValidation: number;
  endValidation: number;
  endTrain: number;
};

/** Quick, RMSE and MAE: [outlier residual, MAE, RMSE] as one residual of
 *  fifty is swept from 0 to 40. */
export const ERRORS = results.errors as {
  n: number;
  sweep: [number, number, number][];
  start: [number, number, number];
  end: [number, number, number];
};
