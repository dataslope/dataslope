import m from "./measurements.json";

// Every number the video shows. Measured, not typed: measure.py re-runs
// attention-intuition.mdx's "Doing it properly, with real vectors" with NumPy
// 2.4.6 (the site's Pyodide version), keeps the working (each product, each
// e-power, the total), asserts every step reproduces from the rounded numbers
// on screen, and asserts the page's printed output and the unit video's
// numbers (llm-meaning) against it. measurements.json is its output, imported
// here as it is. Pure (no Remotion, no DOM).

export const VIDEO = "llm-attention-score";

/**
 * Whether public/images/llm-attention-score/ holds the art: the unit's
 * trophy (copied) and the two watercolors from illustrations.json. Every
 * frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

export type Vec = readonly number[];

export type Row = {
  token: string;
  key: Vec;
  /** query[0] * key[0], query[1] * key[1] */
  products: Vec;
  dot: number;
  /** dot / sqrt(2) */
  score: number;
  /** e to the score as shown */
  power: number;
  weight: number;
};

export type Attend = {
  query: Vec;
  rows: readonly Row[];
  /** The sum of the three e-powers on screen. */
  total: number;
  /** The new vector, to two decimals (see measure.py). */
  output2: Vec;
};

export const TOKENS = m.lesson.tokens as readonly string[];
export const KEYS = m.lesson.keys as readonly Vec[];
export const VALUES = m.lesson.values as readonly Vec[];
/** Numbers per vector, and its square root. */
export const D = m.lesson.d;
export const ROOT = m.lesson.root;

/** The lesson's query from "it", toward trophy-like keys. */
export const TROPHY = m.trophy as Attend;
/** The lesson's suggestion: the query turned to 0.2, 1.0. */
export const SUITCASE = m.suitcase as Attend;

/** "1.02", "0.40": a dot product, to two decimals. */
export const two = (x: number) => x.toFixed(2);
/** "0.721": a score, an e-power or a weight. */
export const three = (x: number) => x.toFixed(3);
/** "1.0": one number of a key, value or query, as the lesson writes it. */
export const one = (x: number) => x.toFixed(1);
