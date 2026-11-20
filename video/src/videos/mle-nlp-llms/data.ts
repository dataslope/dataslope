// What the mle-nlp-llms video draws, read from results.json, which check.mjs
// measured in Pyodide 314.0.7 with NumPy, scikit-learn and tiktoken (see
// script.ts for the numbers, and check.mjs for how each was made). Pure: no
// React, no Remotion, so the scenes and any test can import it.
import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-nlp-llms";

/** The dolphin and the spot art are prompted in illustrations.json; the
 *  builder generates them into public/images/mle-nlp-llms. */
export const ILLUSTRATIONS = true;

/** Question 1: a word vocabulary from seven pages read against the NLP page,
 *  and the same page in characters and in o200k_base tokens. */
export const TOKENS = results.tokens as {
  vocabPages: string[];
  vocabWords: number;
  pageWords: number;
  pageDistinct: number;
  unseenDistinct: number;
  unseenDistinctShare: number;
  unseenRunningShare: number;
  /** Words the vocabulary never saw, picked for the screen. */
  unseenExamples: string[];
  chars: number;
  distinctChars: number;
  subwordTokens: number;
  charsPerToken: number;
  tokensPerWord: number;
  charPositionsOverTokens: number;
  charPairsOverTokens: number;
  encoding: string;
  vocabSize: number;
  /** o200k_base's pieces for a few words, each with its leading space. */
  pieces: Record<"hallucination" | "tokenization" | "unhappiness" | "GloVe" | "LoRA" | "embeddings", string[]>;
  embeddingWidth: number;
  embeddingTable: number;
};

/** Question 13: the track's 167 answers searched by shared words. */
export const RETRIEVAL = results.retrieval as {
  passages: number;
  query: string;
  queryTerms: string[];
  top: { page: string; question: string; score: number }[];
  target: { page: string; question: string; score: number; shared: string[]; above: number };
};

/** Question 4: softmax over 16 keys of 64 numbers, unscaled and scaled (a seeded simulation). */
export const SCALING = results.scaling as {
  dk: number;
  keys: number;
  rows: number;
  rootDk: number;
  rawSd: number;
  scaledSd: number;
  topUnscaled: number;
  topScaled: number;
  over90Unscaled: number;
  over90Scaled: number;
  /** One row's sixteen weights, each way. */
  exampleRow: { unscaled: number[]; scaled: number[] };
};

/** Question 5: eight heads of 64 against one of 512. */
export const HEADS = results.heads as {
  width: number;
  heads: number;
  headWidth: number;
  projections: number;
  pairMacsOne: number;
  pairMacsMulti: number;
};

/** Questions 8 and 9: pairs by length, and attention against the rest of a
 *  layer (multiply-adds per token per layer, from stated sizes). */
export const COST = results.cost as {
  pairs: Record<"1000" | "2000" | "4000" | "8000", number>;
  width: number;
  ffnMultiple: number;
  linearPerToken: number;
  crossover: number;
  curve: { n: number; attention: number; rest: number }[];
};

/** Question 12: LoRA's sizes, from stated assumptions. */
export const LORA = results.lora as {
  width: number;
  rank: number;
  layers: number;
  matricesPerLayer: number;
  full: number;
  adapter: number;
  share: number;
  trained: number;
  model: number;
  trainedShare: number;
  copyGB: number;
  adapterMB: number;
};
