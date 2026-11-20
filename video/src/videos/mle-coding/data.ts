// What the mle-coding video draws, read from results.json, which check.mjs
// measured in Pyodide 314.0.7 with NumPy 2.4.6 and scikit-learn 1.8.0 (see
// script.ts for the numbers, and check.mjs for how each was made). Pure: no
// React, no Remotion, so the scenes and any test can import it.
//
// Timings (VECTOR.ms, TOPK.ms, RAPID.knn.ms) are one run's, on one machine:
// draw them as that run's bars, and say the ratio, never the milliseconds.
import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-coding";

/** The tree frog and the spots are imported (illustrations.json → public/images/mle-coding). */
export const ILLUSTRATIONS = true;

type Ms<K extends string> = Record<K, number>;

/** Python version and library versions the run used. */
export const RUNTIME = results.runtime as { python: string; numpy: string; sklearn: string };

/** Question 1: one vector scored against 100,000 rows of 64, three ways, timed once. */
export const VECTOR = results.vector as {
  items: number;
  dims: number;
  /** Largest difference between the loop's scores and the product's. */
  maxDiff: number;
  ms: Ms<"loop" | "perRow" | "matrix">;
  /** Each way's time over the matrix product's. */
  ratio: Ms<"loop" | "perRow">;
};

/** The page's own cosine block: three rows, every pairwise similarity. */
export const COSINE_PAGE = results.cosinePage as number[][];

/** Question 2: six items (index 4 all zeros), one user, scores with and without the guard. */
export const COSINE = results.cosine as {
  items: [number, number][];
  user: [number, number];
  /** Index of the all-zero item. */
  empty: number;
  /** Unguarded: null is nan, the empty item's score. */
  scores: (number | null)[];
  /** The top three by the page's idiom (argpartition, then argsort reversed). */
  pageTop: number[];
  /** The top three by the challenge's solution (argsort reversed). */
  challengeTop: number[];
  argmax: number;
  /** With + 1e-12 in the denominator: the empty item scores 0. */
  guardedScores: number[];
  guardedTop: number[];
  /** np.sort of [0.5, nan, 0.9, 0.2]: nan (null) last. */
  sortedWithNan: (number | null)[];
};

/** Question 3: the page's five scores and their top two; a million scores timed. */
export const TOPK = results.topk as {
  scores: number[];
  k: number;
  top: number[];
  topScores: number[];
  n: number;
  ms: Ms<"sort" | "partition">;
  ratio: number;
  heapq: number[];
};

/** Question 4: the page's standardization, and the (1000, 1) − (1000,) bug. */
export const BROADCAST = results.broadcast as {
  X: number[][];
  mean: number[];
  Z: number[][];
  zMeans: number[];
  n: number;
  predShape: number[];
  yShape: number[];
  wrongShape: number[];
  mseRight: number;
  mseWrong: number;
};

/** Question 5: memory by arithmetic, and the identity's rounding on 1,000 float32 rows. */
export const PAIRWISE = results.pairwise as {
  n: number;
  d: number;
  broadcastBytes: number;
  identityBytes: number;
  rows: number;
  cols: number;
  dtype: string;
  /** Rows whose distance to themselves came out negative (float32). */
  selfNegative: number;
  /** The same rows, in float64. */
  selfNegative64: number;
  nanAfterRoot: number;
  nanAfterClip: number;
  /** The largest distance from a row to itself, after clipping. */
  selfWorst: number;
  /** The median distance between two different rows. */
  typical: number;
  maxAbsVsBroadcast: number;
};

/** Question 6: memory by arithmetic, and a running total of 0.1 ten million times. */
export const FLOATS = results.floats as {
  embeddings: number;
  dims: number;
  bytes32: number;
  bytes64: number;
  adds: number;
  /** float32 cumsum: the running total. */
  running32: number;
  runningError: number;
  /** np.sum in float32 (pairwise). */
  pairwise32: number;
  running64: number;
  /** Gap between neighbouring float32 values near a million. */
  spacingNearMillion: number;
  /** What adding 0.1 to a million adds, in float32. */
  stepNearMillion: number;
  eps32: number;
  eps64: number;
};

/** Question 7: the page's softmax, unshifted and shifted, and the log of an underflow. */
export const SOFTMAX = results.softmax as {
  z: number[];
  /** "nan" three times. */
  naive: string[];
  stable: number[];
  /** ln of the largest float64. */
  ceiling: number;
  shifted: number[];
  z2: number[];
  p2: number[];
  /** log of the shifted softmax: [0, "-inf"]. */
  logp: (number | string)[];
  logSoftmax: number[];
};

/** Question 8: the page's generator on ten rows, batches of four. */
export const BATCHES = results.batches as {
  epoch1: number[][];
  /** Called again with the default seed: the same order. */
  epoch2: number[][];
  epoch2Seed1: number[][];
  sizes: number[];
};

/** Question 9: logistic regression on breast cancer, rows shuffled together or apart. */
export const SHUFFLE = results.shuffle as {
  train: number;
  test: number;
  aligned: number;
  separate: number;
  majority: number;
  majorityClass: string;
};

/** Question 10: a simulation of 20,000 streams of 1,000 lines, reservoir of 10. */
export const RESERVOIR = results.reservoir as {
  stream: number;
  k: number;
  runs: number;
  itemShare: [number, number];
  expected: number;
  /** Share of the kept lines that came from each tenth of the stream. */
  tenths: number[];
  tenthsRange: [number, number];
  /** Keeping each line with probability k / n: the sample's size. */
  coinSizes: { p5: number; p95: number; min: number; max: number; notTen: number };
};

/** The quick round. */
export const RAPID = results.rapid as {
  counts: [string, number][];
  majority: string;
  majorityShare: number;
  dedupIn: string[];
  dedup: string[];
  probs: number[][];
  argmax1: number[];
  argmax0: number[];
  shapes: { P: number[]; axis1: number[]; axis0: number[] };
  precisionNumpy: string;
  precisionSklearn: number;
  knn: {
    n: number;
    d: number;
    k: number;
    ms: Ms<"distances" | "sort" | "partition">;
    distShareSort: number;
    distSharePartition: number;
  };
};

/** Bytes as the screen writes them: 102400000000 → "102.4 GB", 800000000 → "800 MB". */
export const bytes = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 2).replace(/\.?0+$/, "")} GB` : `${Math.round(n / 1e6)} MB`;

/** A percentage: 0.959 → "95.9%". */
export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
