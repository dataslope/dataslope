import m from "./measurements.json";

// Every count, reply, weight and word the video shows. The measured ones come
// from measurements.json, which measure.py writes by re-running the lesson's
// own code (interesting-discussions.mdx) and computing Spärck Jones's rule and
// the word2vec neighbours; nothing measured is typed here. The dates, counts
// and quotations of the history itself cannot be computed: they are copied
// from the sources named in script.ts, each beside its value below. Pure (no
// Remotion, no DOM).

export const VIDEO = "nlp-history";

/** Whether public/images/nlp-history/ holds the four watercolors from
 *  illustrations.json. Every frame is laid out with room for them either way. */
export const ILLUSTRATIONS = true;

/** The year the video was made: "today" on the timeline, and what the ages
 *  in the opening are counted to. */
export const NOW = 2026;

// ── The timeline (Fig. 1) ───────────────────────────────────────────────────

export type Story = { id: string; year: number; name: string };

/** The seven stories, oldest first, each dated as script.ts's sources date
 *  it. Zipf's is the year of The Psycho-Biology of Language. */
export const STORIES: readonly Story[] = [
  { id: "zipf", year: 1935, name: "Zipf" },
  { id: "shannon", year: 1948, name: "Shannon" },
  { id: "turing", year: 1950, name: "Turing" },
  { id: "georgetown", year: 1954, name: "Georgetown–IBM" },
  { id: "eliza", year: 1966, name: "ELIZA" },
  { id: "sparck", year: 1972, name: "Spärck Jones" },
  { id: "w2v", year: 2013, name: "word2vec" },
];
export const storyYear = (id: string) => STORIES.find((s) => s.id === id)!.year;

/** The three course ideas the opening dates, and the story each comes from. */
export const IDEAS = [
  { story: "zipf", text: "Ranking word counts" },
  { story: "shannon", text: "Guessing the next word" },
  { story: "sparck", text: "Extra weight for rare words" },
] as const;

/** How old an idea is, in whole years, counted to NOW. */
export const age = (year: number) => NOW - year;

// ── Zipf: the lesson's Emma count ───────────────────────────────────────────

export const ZIPF = {
  top: m.zipf.top as readonly { rank: number; word: string; count: number }[],
  /** The thirty most common words, for the chart. */
  bars: m.zipf.bars as readonly { word: string; count: number }[],
  words: m.zipf.words,
  distinct: m.zipf.distinct,
  hapaxes: m.zipf.hapaxes,
  top100Share: m.zipf.top100Share,
  /** The ranked curve: [rank, count] at both ends of every run of equal counts. */
  curve: m.zipf.curve as unknown as readonly (readonly [number, number])[],
  /** count = lineC / rank: the 1/rank line placed where it best fits ranks 1 to 1,000. */
  lineC: m.zipf.lineC,
  /** Half the top word's count: where one over the rank puts the second word. */
  secondByLaw: m.zipf.secondByLaw,
  /** The tenth word, and where one over the rank puts it (a tenth of the first). */
  tenth: m.zipf.tenth as { rank: number; word: string; count: number },
  tenthByLaw: m.zipf.tenthByLaw,
  /** The share of different words that appear once. */
  hapaxShare: m.zipf.hapaxShare,
  /** The first rank whose count is 1: every word from here on appears once. */
  firstHapaxRank: m.zipf.distinct - m.zipf.hapaxes + 1,
};

// ── Shannon ─────────────────────────────────────────────────────────────────

/** The paper, as its first page sets it. */
export const SHANNON_PAPER = {
  title: "A Mathematical Theory of Communication",
  journal: "Bell System Technical Journal",
  date: "July 1948",
  author: "C. E. Shannon",
};

/** "6. Second-order word approximation" (Part I, section 3), in the paper's
 *  capitals, word for word. */
export const SHANNON_SAMPLE = (
  "THE HEAD AND IN FRONTAL ATTACK ON AN ENGLISH WRITER THAT THE CHARACTER OF THIS POINT IS " +
  "THEREFORE ANOTHER METHOD FOR THE LETTERS THAT THE TIME OF WHO EVER TOLD THE PROBLEM FOR AN UNEXPECTED."
).split(" ");

/** The lesson's next-word demo. */
export const BIGRAM = {
  text: m.bigram.text as readonly string[],
  following: m.bigram.following as Record<string, Record<string, number>>,
  guess: m.bigram.guess as Record<string, string>,
};

// ── Georgetown–IBM, 1954, and ALPAC, 1966 ───────────────────────────────────

/** Hutchins, "The Georgetown-IBM experiment demonstrated in January 1954":
 *  "250 words, 6 rules, limited sentences (just over 60)". */
export const DEMO = { date: "7 January 1954", words: 250, rules: 6, sentences: 60 };
/** Leon Dostert's forecast, "five, perhaps three, years hence" (Christian
 *  Science Monitor, via Hutchins): set in GeorgetownScene with its two
 *  numbers marked as they are said. */
/** ALPAC, Language and Machines (1966), p. 32. */
export const ALPAC = "no immediate or predictable prospect of useful machine translation";
export const ALPAC_YEAR = 1966;

// ── ELIZA ───────────────────────────────────────────────────────────────────

/** The lesson's four inputs and its rules' replies. */
export const ELIZA = m.eliza as readonly { you: string; eliza: string }[];
/** Computer Power and Human Reason (1976), p. 6. */
export const SECRETARY = "she asked me to leave the room";

// ── Spärck Jones, 1972 ──────────────────────────────────────────────────────

/** Her weight f(N) - f(n) + 1 over her 200-document example, as runs of
 *  document counts that share a weight. */
export const IDF = {
  N: m.idf.N,
  steps: m.idf.steps as readonly { from: number; to: number; weight: number }[],
  common: m.idf.examples[0] as { docs: number; weight: number; log2: number },
  rare: m.idf.examples[1] as { docs: number; weight: number; log2: number },
};

// ── word2vec, 2013 ──────────────────────────────────────────────────────────

/** The paper behind word2vec, as arXiv lists it (1301.3781, v1 16 January
 *  2013); the authors' affiliation is the paper's own (Google Inc.). */
export const W2V_PAPER = {
  date: "January 2013",
  title: "Efficient Estimation of Word Representations in Vector Space",
  authors: "Tomas Mikolov, Kai Chen, Greg Corrado, Jeffrey Dean",
  place: "Google",
};

export const W2V = {
  words: m.w2v.words,
  dims: m.w2v.dims,
  analogy: m.w2v.analogy as readonly { word: string; sim: number }[],
  /** Each word's place on the plane through "man": [toward woman, toward king]. */
  plane: m.w2v.plane as Record<"man" | "woman" | "king" | "queen" | "query", [number, number]>,
  excellent: m.w2v.excellent as readonly { word: string; sim: number }[],
};
