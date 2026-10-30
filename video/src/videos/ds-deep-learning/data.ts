import results from "./results.json" with { type: "json" };

// Every number and every curve the video shows, read from results.json: what
// NumPy in Pyodide 314.0.7 (the runtime the page's one runnable block uses)
// returned for check.mjs, which wrote it. No deep-learning framework runs
// there, so every network is NumPy by hand and a toy, marked as such on
// screen. Every random draw is seeded, so a rerun gives the same figures.
// Pure (no Remotion, no DOM).

export const VIDEO = "ds-deep-learning";

/**
 * Whether public/images/ds-deep-learning/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

type Pair = [number, number];

/** One neuron: three inputs and weights, their products, the sum with the bias, and its sigmoid. */
export const NEURON = results.neuron as { x: number[]; w: number[]; b: number; products: number[]; z: number; a: number };

/** Two 2x2 layers, their product, one input through each, and through a ReLU between them. */
export const COLLAPSE = results.collapse as {
  W1: number[][];
  W2: number[][];
  W: number[][];
  x: number[];
  hidden: number[];
  twoLayers: number[];
  oneLayer: number[];
  relu: number[];
  withRelu: number[];
};

/** The activations on z from -5 to 5, and one softmax. */
export const ACT = results.act as {
  z: number[];
  sigmoid: number[];
  tanh: number[];
  relu: number[];
  leaky: number[];
  leakySlope: number;
  scores: number[];
  softmax: number[];
};

/** Backpropagation through one sigmoid neuron: its forward values and three local slopes. */
export const BACKPROP = results.backprop as {
  x: number;
  w: number;
  b: number;
  y: number;
  z: number;
  a: number;
  loss: number;
  dL_da: number;
  da_dz: number;
  dz_dw: number;
  grad: number;
  finiteDiff: number;
};

/** The page's own block: the sigmoid's slope at -2, 0 and 2, by formula and by finite difference. */
export const PAGE_CHECK = results.pageCheck as { z: number[]; analytic: number[]; numeric: number[]; max: number };

/** Ten layers of a factor below one and above one. */
export const VANISH = results.vanish as {
  small: number;
  big: number;
  smallPowers: number[];
  bigPowers: number[];
  ten: number;
  tenBig: number;
};

export type Optimizer = "sgd" | "momentum" | "rmsprop" | "adam";

/** Fifty steps of each optimizer on the ravine 0.5 (0.1 x² + 10 y²), from (-8, 1). */
export const OPT = results.opt as {
  start: Pair;
  steps: number;
  rates: Record<Optimizer, number>;
  paths: Record<Optimizer, Pair[]>;
  dist: Record<Optimizer, number>;
  sgdStepsToAdam: number;
};

/** The toy network's loss every 20 epochs, plain and with decoupled weight decay. */
export const OVERFIT = results.overfit as {
  points: Pair[];
  noiseVar: number;
  epochs: number[];
  hidden: number;
  n: number;
  train: number[];
  val: number[];
  fit: number[];
  fitDecay: number[];
  grid: number[];
  bestEpoch: number;
  bestVal: number;
  endVal: number;
  endTrain: number;
  decay: number;
  decayTrain: number[];
  decayVal: number[];
  decayEndVal: number;
};

/** One real dropout draw at p = 0.5 on eight activations, and the total averaged over 100,000 draws. */
export const DROPOUT = results.dropout as {
  act: number[];
  mask: number[];
  out: number[];
  sum: number;
  outSum: number;
  meanSum: number;
  p: number;
};

/** One step of weight decay against one step on the loss plus an L2 penalty, under plain SGD. */
export const DECAY = results.decay as {
  w: number[];
  g: number[];
  eta: number;
  lam: number;
  shrink: number;
  l2: number[];
  decay: number[];
  same: boolean;
};

/** One batch of eight pre-activations, normalized, then scaled and shifted. */
export const BN = results.bn as {
  batch: number[];
  mean: number;
  sd: number;
  normed: number[];
  gamma: number;
  beta: number;
  out: number[];
};

/** Self-attention on four tokens of random vectors, length four. */
export const ATTN = results.attn as {
  tokens: string[];
  d: number;
  scores: number[][];
  weights: number[][];
  rowSums: number[];
  roundedSums: number[];
  out: number[][];
};

/** The signal's spread through ten ReLU layers, 256 wide, at three starting weight spreads. */
export const INIT = results.init as {
  width: number;
  layers: number;
  heStd: number;
  sd: Record<"one" | "small" | "he", number[]>;
};

/** Iterations in an epoch: n / batch exactly, rounded up, and the partial last batch. */
export const EPOCH = results.epoch as { n: number; batch: number; iterations: number; exact: number; lastBatch: number };
