// What the mle-models video draws, read from results.json, which check.mjs
// measured in Pyodide 314.0.7 with scikit-learn 1.8.0 and NumPy 2.4.6 (see
// script.ts for the numbers as said, and check.mjs for how each was made).
// Pure: no React, no Remotion, so the scenes and any test can import it.
import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-models";

/** The toucan and the two spots in illustrations.json, generated and
 *  imported into public/images/mle-models/. */
export const ILLUSTRATIONS = true;

/** The opening and question four: the page's logistic regression block
 *  (make_classification, 160 training rows, 40 test, 10 scaled features). */
export const LOGIT = results.logit as {
  accuracy: number;
  first5: number[];
  /** The block's two printed lines, as it prints them. */
  printed: [string, string];
  /** Ten weights and a bias. */
  parameters: number;
  weights: number[];
  bias: number;
  trainRows: number;
  features: number;
  testRows: number;
  /** Values a nearest-neighbours model keeps: every training row. */
  knnStores: number;
};

/** Questions one and three: the page's gradient-descent rows (true weights
 *  1, 2, −1). Losses are by step, index 0 the start; `lossDiverge` is at a
 *  rate of 2.5. `settle` is the steps to come within 0.001 of the
 *  least-squares answer, by rate. */
export const GD = results.gd as {
  rows: number;
  true: [number, number, number];
  learned: [number, number, number];
  ols: [number, number, number];
  printed: string;
  lossPage: number[];
  lossFast: number[];
  lossDiverge: number[];
  divergeRate: number;
  eigenvalues: number[];
  limit: number;
  settle: Record<"0.01" | "0.1" | "0.5" | "0.9" | "1.5" | "1.9", number | null>;
  diverges: Record<"2.0" | "2.05" | "2.5", boolean>;
  minLoss: number;
  /** The loss's curvature in (θ1, θ2) with the bias at its best: a contour
   *  of loss L is dᵀ·bowl·d = L − minLoss around the least-squares answer. */
  bowl: [[number, number], [number, number]];
  /** The page's run (0.01, 500 steps) in (θ1, θ2), every tenth step. */
  pagePath: [number, number][];
};

type Path = { rows: number; path: [number, number][]; rowsRead: number; distance: number };

/** Question two: thirty steps each at a rate of 0.1 from zero, the path in
 *  (θ1, θ2), toward the least-squares `target`. */
export const BATCH = results.batch as {
  rate: number;
  updates: number;
  runs: { batch: Path; mini: Path; single: Path };
  target: [number, number];
};

/** Question three: the range test ([rate, loss after that step]), its
 *  bottom, its turn and the step nearest a tenth of the turn (the pick), the
 *  distance single-row SGD ends from the answer at a constant rate and on a
 *  cosine, and a warmup-then-cosine schedule's shape ([step, multiple of the
 *  base rate]). */
export const LR = results.lr as {
  range: [number, number][];
  lowest: [number, number];
  blowup: [number, number];
  turn: [number, number];
  tenth: [number, number];
  constant: number;
  cosine: number;
  decayPasses: number;
  schedule: [number, number][];
  warmup: number;
  steps: number;
};

/** Question five: training accuracy by step from a confidently wrong start,
 *  under cross-entropy and under squared error (index 0 is after step 1). */
export const CE = results.ce as {
  start: number;
  target: number;
  rate: number;
  ceSteps: number;
  mseSteps: number;
  ceAccuracy: number[];
  mseAccuracy: number[];
};

/** Questions seven and nine: the simulated customers (age in years, income
 *  in dollars, `z` the two standardized), the fifteen-neighbour vote at `q`,
 *  and kNN's five-fold accuracy raw, standardized and on one feature. */
export const KNN = results.knn as {
  k: number;
  rows: number;
  age: number[];
  income: number[];
  label: number[];
  z: [number, number][];
  vote: {
    q: [number, number];
    qAge: number;
    qIncome: number;
    neighbors: number[];
    ones: number;
    zeros: number;
    radius: number;
  };
  raw: number;
  scaled: number;
  incomeOnly: number;
  ageOnly: number;
};

/** Question six: the arithmetic of serving at ten million rows. */
export const SERVING = results.serving as {
  rows: number;
  features: number;
  bytes: number;
  logisticNumbers: number;
  distancesPerPrediction: number;
};

/** Question eight: two noisy rings. Up to 400 training points with the RBF
 *  model's support vectors among them, each model's prediction and decision
 *  function on a 64 × 64 grid over `range` (row-major, bottom row first; the
 *  boundary is the function's zero contour, the margin its contours at ±1),
 *  support-vector counts by training size, and fit times measured once
 *  (seconds; only the ratios are said). */
export const SVM = results.svm as {
  linear: number;
  rbf: number;
  x: number[];
  y: number[];
  label: number[];
  support: number[];
  range: [number, number];
  gridLinear: string[];
  gridRbf: string[];
  decisionLinear: number[][];
  decisionRbf: number[][];
  supportVectors: Record<"200" | "2000" | "20000", number>;
  fitSeconds: Record<"4000" | "8000" | "16000", number>;
  doubling: [number, number];
};

type Settle = { steps: number; rate: number; limit: number; condition: number };

/** Question nine: steps to settle at the best rate, the page's rows as they
 *  are and with one column multiplied by 100. */
export const SCALE = results.scale as { asIs: Settle; times100: Settle };

/** Question ten: the page's PCA block, the full spectrum, and the simulated
 *  trap (variance shares, components, and accuracy on each component). */
export const PCA = results.pca as {
  ratio: [number, number];
  total: number;
  printed: string;
  full: number[];
  zero: number;
  trap: {
    x: number[];
    y: number[];
    label: number[];
    ratio: [number, number];
    components: [[number, number], [number, number]];
    first: number;
    second: number;
    both: number;
  };
};

/** Questions eleven and twelve: handwritten digits. Accuracy of one tree,
 *  300 bagged trees and a 300-tree forest, by trees averaged; the average
 *  single tree of each; and the page's formula ([models, variance as a share
 *  of one model's]) at correlations 0.6 and 0.3. */
export const ENSEMBLE = results.ensemble as unknown as {
  images: number;
  pixels: number;
  tried: number;
  test: number;
  tree: number;
  bagged: number;
  forest: number;
  baggedCurve: Record<string, number>;
  forestCurve: Record<string, number>;
  baggedSingle: number;
  forestSingle: number;
  /** The first image (a zero), its 64 pixels row by row (0 to 16), and the
   *  eight pixels one split may try. */
  digit: number[];
  digitLabel: number;
  split: number[];
  formula: Record<"0.6" | "0.3", [number, number][]>;
};

type Boost = { validation: number[]; best: number; bestValidation: number; testAtBest: number; atEnd: number };

/** Question thirteen: validation error (mean squared) after each of 1,000
 *  depth-3 trees on Friedman #1, at learning rates 1.0, 0.3 and 0.1. */
export const BOOST = results.boost as {
  trees: number;
  depth: number;
  noise: number;
  runs: Record<"1.0" | "0.3" | "0.1", Boost>;
};

/** Quick, k-means: three stretched blobs, true cluster and k-means'
 *  assignment per point; agreement on round and stretched clusters. */
export const KMEANS = results.kmeans as {
  round: number;
  stretched: number;
  x: number[];
  y: number[];
  truth: number[];
  assigned: number[];
  centers: [number, number][];
};

/** Quick, one-hot: the page's block, and a colour it never saw. */
export const ONEHOT = results.onehot as {
  categories: string[];
  rows: string[];
  encoded: number[][];
  purple: number[];
};
