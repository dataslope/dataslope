// What the mle-system-design video draws, read from results.json, which
// check.mjs computed (see script.ts for every number and where it comes
// from, and check.mjs for how each was made): scikit-learn runs in Pyodide
// on a seeded fraud simulation and on the digits set it bundles, a seeded
// queue simulation on the page's own batching cost model, and the funnel's
// arithmetic. Nothing here is a real system's output, and the video calls
// each simulation one. Pure (no React, no Remotion), so the scenes and any
// test can import it.
import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-system-design";

/** Whether public/images/mle-system-design/ holds the watercolors from
 *  illustrations.json (the giraffe and four spots). */
export const ILLUSTRATIONS = true;

/** Pyodide's Python, scikit-learn and NumPy versions the runs used. */
export const RUNTIME = results.runtime as { python: string; sklearn: string; numpy: string };

type Caught = { recall: number; precision: number; flagged: number };

/** Question 2, training-serving skew: one gradient-boosted fraud model, its
 *  held-out fraud caught with the past-hour count built the training way
 *  (the current transaction included) and the serving way (one less).
 *  `histTraining` and `histServing` count held-out rows at each count, 0 to
 *  7 and then 8 or more; `scoreByCount` is the model's mean fraud score with
 *  the count set to 0 to 8, the step it learned. */
export const SKEW = results.skew as {
  n: number;
  fraudShare: number;
  train: number;
  test: number;
  testFraud: number;
  offline: Caught;
  serving: Caught;
  trainMinCount: number;
  servingZeroShare: number;
  histTraining: number[];
  histServing: number[];
  scoreByCount: number[];
};

type Sim = {
  rate: number;
  maxBatch: number;
  waitMs: number;
  requests: number;
  p50: number;
  p99: number;
  meanBatch: number;
  backlogAtEnd: number;
  seconds: number;
};

/** Questions 5 and 6: the page's batching chart (each curve a multiple of
 *  batch 1), and the queue simulation of one GPU on its cost model, heavy
 *  (1,000 requests a second) and light (100), one at a time, batched up to
 *  32 with no wait, and batched with a 5 ms wait. Latencies in ms. */
export const BATCHING = results.batching as {
  model: { peak: number; overhead: number; passMs: number; perRequestMs: number };
  chart: {
    one: { b: number; throughput: number; latencyMs: number };
    knee: { b: number; throughput: number; latencyMs: number };
    big: { b: number; throughput: number; latencyMs: number };
    curve: { b: number; throughputX: number; latencyX: number }[];
    kneeThroughputX: number;
    kneeLatencyX: number;
  };
  capacityOne: number;
  capacityBatch32: number;
  heavy: { rate: number; backlogGrowth: number; oneAtATime: Sim; batched: Sim; batchedWait: Sim; fourReplicas: Sim };
  light: { rate: number; oneAtATime: Sim; batched: Sim; batchedWait: Sim };
};

/** Question 7: the digits network at 32-bit floats and with its weights
 *  rounded to 8, 4, 3 and 2 bits. `changed` counts held-out answers that
 *  differ from the 32-bit model's; `fixed` and `broke` split them. */
export const QUANT = results.quant as {
  weights: number;
  biases: number;
  test: number;
  train: number;
  rows: { bits: number; weightBytes: number; accuracy: number; changed: number; fixed: number; broke: number }[];
  /** The first eight held-out digits (8x8 pixels, 0 to 16, row by row), with
   *  the 32-bit network's answer. */
  gallery: { image: number[]; label: number; pred: number }[];
  /** The held-out digits whose answer changes at 4 bits, both answers. */
  changed4: { index: number; image: number[]; label: number; pred32: number; pred4: number }[];
};

/** Quick round, distillation: the same network's probabilities (digits 0 to
 *  9) for one held-out nine, and the nine's 8x8 pixels (0 to 16, row by
 *  row) for drawing it. */
export const SOFT = results.soft as {
  index: number;
  label: number;
  probs: number[];
  image: number[];
  medianTop: number;
  shareAbove99: number;
};

/** Questions 10 and 11: the funnel's round numbers and their ratio. */
export const FUNNEL = results.funnel as { items: number; candidates: number; ratio: number };
