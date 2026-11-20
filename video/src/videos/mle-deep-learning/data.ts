// What the mle-deep-learning video draws, read from results.json, which
// check.mjs measured in Pyodide 314.0.7 with NumPy and scikit-learn (see
// script.ts for the numbers, and check.mjs for how each was made). Pure: no
// React, no Remotion, so the scenes and any test can import it.
import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-deep-learning";

/** The orangutan and the spot art are prompted in illustrations.json; the
 *  builder generates them into public/images/mle-deep-learning. */
export const ILLUSTRATIONS = true;

/** An 8x8 image as 64 brightnesses from 0 to 1, row by row. */
type Pixels = number[];

/** scikit-learn's digits: how many images, and pixels in each. */
export const DIGITS = results.digits as { n: number; pixels: number };

/** Questions 1 and 2: XOR, the best straight line, and two hidden ReLU units. */
export const XOR = results.xor as {
  points: [number, number][];
  labels: number[];
  /** Lines tried (a grid of weights and bias from -3 to 3). */
  linesSearched: number;
  /** The best line's share of the four points right: 0.75. */
  bestLine: number;
  perceptron: number;
  W1: [number, number][];
  b1: [number, number];
  w2: [number, number];
  /** Each point's two hidden values after the ReLU. */
  hidden: [number, number][];
  withRelu: number[];
  withoutRelu: number[];
  /** Without the ReLU, the same weights as one linear function. */
  collapsed: { w: [number, number]; b: number };
};

type Curves = Record<
  "z" | "sigmoid" | "sigmoidDeriv" | "tanh" | "tanhDeriv" | "relu" | "reluDeriv" | "leaky" | "gelu",
  number[]
>;

/** Question 3: the page's activation block, run as written, and curves from -5 to 5. */
export const ACTIVATIONS = results.activations as {
  page: { z: number[]; sigmoid: number[]; sigmoidDeriv: number[]; relu: number[]; reluDeriv: number[] };
  tanhDeriv: { "0": number; "2": number };
  sigmoidDerivAt2: number;
  curves: Curves;
};

/** Question 4: what one gradient costs, and the gradient check. */
export const BACKPROP = results.backprop as {
  sizes: number[];
  params: number;
  forwardMacs: number;
  backwardMacs: number;
  backwardOverForward: number;
  nudgePasses: number;
  checked: number;
  worstRelError: number;
  batch: number;
};

/** Question 5: the gradient reaching each layer, as a share of what left the
 *  top, for 20 layers of 128 units (a seeded simulation). Index 0 is the
 *  first layer. */
export const VANISH = results.vanish as {
  layers: number;
  width: number;
  batch: number;
  byLayer: Record<"sigmoidXavier" | "reluHe" | "reluTwiceHe", number[]>;
  first: Record<"sigmoidXavier" | "reluHe" | "reluTwiceHe", number>;
};

/** Question 6: sixteen hidden units started equal against started from Xavier. */
export const INIT = results.init as {
  hidden: number;
  steps: number;
  constant: number;
  train: number;
  test: number;
  constantAcc: number;
  constantUnitSpread: number;
  constantDistinctUnits: number;
  xavierAcc: number;
  xavierDistinctUnits: number;
  /** The first four hidden units' 64 incoming weights, as 8x8 images. */
  constantUnits: Pixels[];
  xavierUnits: Pixels[];
  xavierVar: string;
  heVar: string;
};

/** Question 7: one digit's pixel batch-normalized beside bright and dark
 *  neighbours, alone, and layer-normalized. */
export const NORM = results.norm as {
  /** Pixel index (row 4, column 4). */
  pixel: number;
  /** The digit's index in scikit-learn's digits, and its label. */
  image: number;
  label: number;
  value: number;
  brightBatch: number[];
  darkBatch: number[];
  brightValues: number[];
  darkValues: number[];
  bnBright: number;
  bnDark: number;
  bnAlone: number;
  layerNorm: number;
  /** Every image in either batch, by index. */
  images: Record<string, Pixels>;
};

/** Question 8: average step size for two parameters, and bytes per weight. */
export const OPTIM = results.optim as {
  steps: number;
  lr: number;
  gradientScale: [number, number];
  sgdStep: [number, number];
  sgdRatio: number;
  adamStep: [number, number];
  adamRatio: number;
  bytesPerWeight: Record<"sgd" | "momentum" | "rmsprop" | "adam", number>;
  /** Gigabytes (decimal) for a billion float32 weights. */
  gbPerBillion: Record<"sgd" | "momentum" | "rmsprop" | "adam", number>;
};

/** Question 9: a dropout-trained digit classifier, served with dropout off and left on. */
export const DROPOUT = results.dropout as {
  p: number;
  hidden: number;
  epochs: number;
  evalAcc: number;
  onAcc: number;
  twoCallsDiffer: number;
  image: {
    index: number;
    label: number;
    pixels: Pixels;
    evalClass: number;
    evalP: number;
    /** Ten calls with dropout left on: the predicted class and its probability. */
    calls: { class: number; p: number }[];
  };
  flipIn10: number;
  test: number;
};

/** Questions 10 and 11: a filter on a digit, the shift, and the page's weight counts. */
export const CNN = results.cnn as {
  label: number;
  image: number[][];
  kernel: number[][];
  map: number[][];
  shiftedImage: number[][];
  shiftedMap: number[][];
  shift: number;
  equivariant: boolean;
  conv1: number;
  conv2: number;
  head: number;
  total: number;
  imageInputs: number;
  denseUnits: number;
  dense: number;
  conv1Positions: number;
  conv1Macs: number;
};

/** Question 13: softmax applied twice, ten classes. */
export const DOUBLE_SOFTMAX = results.doubleSoftmax as { classes: number; bestP: number; lossFloor: number };

/** Questions 14 and 15: products over fifty steps, from stated assumptions. */
export const RNN = results.rnn as {
  steps: number;
  rnnFactor: number;
  rnnProduct: number;
  forgetGate: number;
  lstmProduct: number;
  lstmBlocks: number;
  gruBlocks: number;
};
