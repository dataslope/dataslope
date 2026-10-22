// What the ds-ml-models video draws, read from results.json, which check.mjs
// measured in Pyodide 314.0.7 with scikit-learn 1.8.0 (see script.ts for the
// numbers, and check.mjs for how each was made). Pure: no React, no
// Remotion, so the scenes and any test can import it.
import results from "./results.json" with { type: "json" };

export const VIDEO = "ds-ml-models";

/** The raccoon is imported (illustrations.json → public/images/ds-ml-models). */
export const ILLUSTRATIONS = true;

type Grid = { grid: string[]; test: number };

/** The moons every boundary is drawn on: 200 training points, two classes. */
export const MOONS = results.moons as {
  x: number[];
  y: number[];
  label: number[];
  xlim: [number, number];
  ylim: [number, number];
  nx: number;
  ny: number;
  nTrain: number;
  nTest: number;
};

/** The hook's three models: each one's predicted class over the grid, and its held-out accuracy. */
export const HOOK = results.hook as { logistic: Grid; tree: Grid; knn: Grid };

/** k-nearest neighbors at k = 1, 15 and 75. */
export const KNN = results.knn as Record<"1" | "15" | "75", Grid & { train: number }>;

/** One new point and its fifteen nearest training points. */
export const VOTE = results.knnVote as {
  q: [number, number];
  neighbors: number[];
  ones: number;
  zeros: number;
  radius: number;
  predicted: number;
};

/** Logistic regression on mean radius, and a straight line through the same labels. */
export const LOGIT = results.logit as {
  n: number;
  malignant: number;
  radius: number[];
  label: number[];
  linA: number;
  linB: number;
  linBelow: number;
  linAbove: number;
  linAt: Record<"7" | "28", number>;
  b0: number;
  b1: number;
  oddsPerUnit: number;
  curve: [number, number][];
  line: [number, number][];
  example: { radius: number; z: number; p: number };
  half: number;
};

type Side = { n: number; versicolor: number; virginica: number; gini: number };

/** Iris versicolor (0) against virginica (1) by petal width, and the weighted Gini of every cut. */
export const TREE = results.tree as unknown as {
  width: number[];
  label: number[];
  parent: number;
  curve: [number, number][];
  best: [number, number];
  sklearn: number;
  left: Side;
  right: Side;
};

/** Bagging and boosting on the video's own noisy sine wave. */
export const ENS = results.ens as {
  x: number[];
  y: number[];
  grid: number[];
  truth: number[];
  one: number[];
  trees: number[][];
  bag: number[];
  stages: Record<"1" | "3" | "10" | "100", number[]>;
  mse: { one: number; bag: number; gb: number; stages: Record<"1" | "3" | "10" | "100", number>; noise: number };
  resid1: number[];
  fit1: number[];
};

/** One tree, bagged trees and a forest on the tumor data. */
export const FOREST = results.forest as {
  features: number;
  tried: number;
  nTest: number;
  tree: number;
  bagged: number;
  forest: number;
  corrBagged: number;
  corrForest: number;
};

/** AdaBoost by hand: three rounds of stumps on 24 moons. */
export const ADA = results.ada as {
  x: number[];
  y: number[];
  label: number[];
  rounds: { feature: number; threshold: number; wrong: number[]; error: number; alpha: number; weights: number[] }[];
  final: number[];
};

/** k-means on the page's three blobs: Lloyd's steps, and every k from one to eight. */
export const KMEANS = results.kmeans as {
  x: number[];
  y: number[];
  inertia: number;
  silhouette: number;
  elbow: { k: number; inertia: number; silhouette: number | null }[];
  steps: { centroids: [number, number][]; labels: string; inertia: number }[];
};

/** PCA on the page's scaled iris. */
export const PCA = results.pca as {
  ratio: number[];
  cumulative: number[];
  x: number[];
  y: number[];
  species: number[];
  loadings: Record<string, number>;
};

/** Nearest over farthest neighbor distance, by dimension. */
export const CURSE = results.curse as { ratio: [number, number][]; shell: [number, number][]; points: number };

/** The made-up churn table: impurity importance, permutation importance, and exact Shapley values. */
export const SHAP = results.shap as {
  names: string[];
  n: number;
  test: number;
  explained: number;
  background: number;
  accuracy: number;
  impurity: number[];
  permutation: number[];
  meanAbs: number[];
  base: number;
  row: { values: number[]; phi: number[]; prediction: number; sumCheck: number };
  /** The first four training rows: plan, region, tenure, customer ID, churned. */
  head: number[][];
  /** Distinct values of each feature in the training rows. */
  distinct: number[];
  train: number;
};

/** The quick round. */
export const SCALING = results.scaling as {
  knnRaw: number;
  knnScaled: number;
  treeRaw: number;
  treeScaled: number;
  range: { proline: [number, number]; hue: [number, number] };
};
export const ONEHOT = results.onehot as { colors: string[]; columns: string[]; rows: number[][] };
export const RFE = results.rfe as { indices: number[]; names: string[]; of: number };

/** A percentage as the narration says it: 0.953 → "95.3%", 0.93 → "93%". */
export const pct = (v: number, digits = 1) => {
  const s = (v * 100).toFixed(digits);
  return `${s.replace(/\.0+$/, "")}%`;
};
