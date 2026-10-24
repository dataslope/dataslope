import m from "./measurements.json";

// Every token, vector, weight and verdict the video shows. Computed, not typed
// in: measure.py runs the four lessons' own code (choosing-your-pipeline,
// bag-of-words, tf-idf, rule-based-sentiment) in the site's Pyodide versions,
// checks each printed result against the site's prepopulated output, and
// measurements.json is its output, imported here as it is. Pure (no Remotion,
// no DOM).

export const VIDEO = "nlp-text-to-features";

/**
 * Whether public/images/nlp-text-to-features/ holds the four watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

// ── Part 1. choosing-your-pipeline ───────────────────────────────────────────

export const PIPE = {
  review: m.pipeline.review,
  /** Lowercased, punctuation dropped: what both pipelines filter. */
  alpha: m.pipeline.alpha as readonly string[],
  /** Which of those NLTK's English list holds. */
  stop: new Set(m.pipeline.stopwordsInReview),
  topic: m.pipeline.topic as readonly string[],
  sentiment: m.pipeline.sentiment as readonly string[],
  bigrams: m.pipeline.bigrams.map(([a, b]) => [a, b] as const),
  /** The negations and the contrast the sentiment pipeline keeps. */
  keep: new Set(m.pipeline.keep),
  stopListSize: m.pipeline.stopListSize,
};

// ── Part 2. bag-of-words ─────────────────────────────────────────────────────

export const BOW = {
  corpus: m.bag.corpus as readonly string[],
  docs: m.bag.docs as readonly (readonly string[])[],
  vocab: m.bag.vocab as readonly string[],
  rows: m.bag.rows as readonly (readonly number[])[],
  spam: m.bag.spam,
  order: m.bag.order,
  /** Two near-synonym reviews: they share only the word they have in common. */
  meaning: m.bag.meaning,
};
export const BOW_THE = BOW.vocab.indexOf("the");

// ── Part 3. tf-idf (the TfIdf video's data, from the same lesson) ────────────

const t = m.tfidf;
export const CORPUS: readonly string[] = t.corpus;
export const DOCS: readonly (readonly string[])[] = t.docs;
export const N = t.N;
export const LENGTHS: readonly number[] = t.lengths;
/** Table columns: "the", then each document's own words, in reading order. */
export const VOCAB: readonly string[] = t.vocab;
/** COUNTS[doc][col], and the rest likewise. */
export const COUNTS: readonly (readonly number[])[] = t.counts;
export const DF: readonly number[] = t.df;
export const IDF: readonly number[] = t.idf;
export const TF: readonly (readonly number[])[] = t.tf;
export const TFIDF: readonly (readonly number[])[] = t.tfidf;
export const THE = VOCAB.indexOf("the");
export const CAT = VOCAB.indexOf("cat");
/** Cat, had it appeared twice in Doc 1's six words: 2/6 times its idf. */
export const TWICE = t.catTwice;
/** The lesson's reason for the log: 1 in 10,000 weighs 10,000 without it. */
export const LOG_EXAMPLE = t.logExample;
/** Doc 1's words that tie for the top score, as the lesson names them. */
export const DOC0_TOP: readonly string[] = t.doc0Top;

/** Which document (0-based) uses each column's word, or -1 for "the". */
export const OWNER: readonly number[] = VOCAB.map((_, j) =>
  DF[j] === N ? -1 : COUNTS.findIndex((row) => row[j] > 0),
);
export const MAX_COUNT = Math.max(...COUNTS.flat());
export const MAX_TFIDF = Math.max(...TFIDF.flat());

/** scikit-learn's default TfidfVectorizer(), on the same corpus. */
export const DEFAULT_IDF: readonly number[] = t.sklearnDefault.idf;
/** Its output rows: raw counts times that idf, each row scaled to length one. */
export const DEFAULT_ROWS: readonly (readonly number[])[] = t.sklearnDefault.rows;
export const DEFAULT_THE_TOPS: boolean = t.sklearnDefault.theTopsEveryRow;

// ── Part 4. rule-based-sentiment ─────────────────────────────────────────────

export type Step = { token: string; polarity: number; role?: string; flag?: boolean };
export type Trace = { text: string; steps: readonly Step[]; score: number; label: string };

const s = m.sentiment;
export const POSITIVE: readonly string[] = s.positive;
export const NEGATIVE: readonly string[] = s.negative;
export const NEGATIONS: readonly string[] = s.negations;
export const RESET: readonly string[] = s.reset;
export const NAIVE: readonly Trace[] = s.naive;
export const NEGATION: readonly Trace[] = s.negation;
export const SARCASM: Trace = s.sarcasm;
export const UNKNOWN: Trace = s.unknown;
/** The video's reset example, with the flag's state after each token, and
 *  its score with no reset tokens at all. */
export const RESET_EXAMPLE: Trace & { scoreWithoutReset: number; labelWithoutReset: string } = s.resetExample;
/** The context case: a thriller scored with "unpredictable" added to NEGATIVE. */
export const CONTEXT: Trace & { added: string } = s.context;
/** A negation-aware trace by its text. */
export const traceOf = (text: string) => {
  const found = NEGATION.find((r) => r.text === text);
  if (!found) throw new Error(`measure.py has no trace for "${text}"`);
  return found;
};

const SPELLED = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
/** A small whole number in words, as running text sets it. */
export const spell = (k: number) => SPELLED[k] ?? String(k);

/** "1.10", "0.18"; an exact zero is set as "0", which is the point. */
export const num = (x: number, digits = 2) => (x === 0 ? "0" : x.toFixed(digits));

/** "+1", "−1", "0": a polarity as the figures print it. */
export const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0");
