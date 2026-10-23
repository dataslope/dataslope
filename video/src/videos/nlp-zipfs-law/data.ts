import m from "./measurements.json";

// Every count, share, prediction and slope the video shows. Measured, not
// typed: measure.py re-runs the lesson's Zipf block on Jane Austen's Emma
// (checked against what the site's Pyodide printed), reads the same FreqDist
// further, and asserts agreement with the two unit videos that show the same
// quantities. measurements.json is its output, imported here as it is. Pure
// (no Remotion, no DOM).

export const VIDEO = "nlp-zipfs-law";

/** Whether public/images/nlp-zipfs-law/ holds the art: the unit's novel
 *  (copied) and the two spots from illustrations.json. Every frame is laid
 *  out with room for them either way. */
export const ILLUSTRATIONS = true;
/** The images in that folder, by file name. */
export const IMAGES = new Set(["nlp-counting-words-novel"]);

export type Row = { rank: number; word: string; count: number };
export type Predicted = Row & { law: number; product: number };

export const EMMA = {
  /** Words in the book (alphabetic tokens, lowercased: the lesson's line). */
  words: m.words,
  /** Different words: the last rank. */
  distinct: m.distinct,
  /** The twenty most common words, in rank order. */
  top: m.top as readonly Row[],
  /** The ranked curve: [rank, count] at both ends of every run of equal
   *  counts. Exact: every rank between two points of a run has its count. */
  curve: m.curve as unknown as readonly (readonly [number, number])[],
  /** Ranks 1 to 10 with what one over the rank predicts from the top word. */
  predict: m.predict as readonly Predicted[],
  /** The tenth word's count over its prediction. */
  tenthOverLaw: m.tenthOverLaw,
  /** Least-squares slope of log count on log rank, over ranks 1 to fitRanks. */
  slope: m.slope,
  fitRanks: m.fitRanks,
  /** count = lineC / rank: the 1/rank line placed where it fits those ranks. */
  lineC: m.lineC,
  top100Share: m.top100Share,
  /** How many of the top hundred are on NLTK's English stopword list. */
  top100Stop: m.top100Stop,
  /** The top hundred in rank order: [word, on the stopword list]. */
  top100Words: m.top100Words as unknown as readonly (readonly [string, boolean])[],
  hapaxes: m.hapaxes,
  hapaxShare: m.hapaxShare,
  firstHapaxRank: m.firstHapaxRank,
  onceOrTwice: m.onceOrTwice,
  onceOrTwiceShare: m.onceOrTwiceShare,
  firstOnceOrTwiceRank: m.firstOnceOrTwiceRank,
  /** 100 / distinct: the top hundred as a share of the different words. */
  top100OfDistinct: m.top100OfDistinct,
};

/** The count at a rank, from the run-length curve. */
export const countAt = (rank: number) => {
  const c = EMMA.curve;
  for (let i = 0; i < c.length; i++) {
    if (c[i][0] === rank) return c[i][1];
    if (c[i][0] > rank) return c[i - 1][1];
  }
  return c[c.length - 1][1];
};

/** "60%", "39%": a share as said. */
export const pct = (share: number, digits = 0) => `${(share * 100).toFixed(digits)}%`;
