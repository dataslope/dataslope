import m from "./measurements.json";

// Every token, stem, lemma, count and filtered sentence the video shows, read
// from measurements.json: what the unit's lesson code returns under NLTK 3.9.4
// (the site's Pyodide) with its pinned data. measure.py runs each lesson block
// verbatim, checks it prints what the page's prepopulated output shows, then
// makes the same calls directly. Pure (no Remotion, no DOM).
//
//   WORDS, SENTENCES, TWEET     tokenization.mdx
//   CASE, LOSSY, PUNCT          text-normalization.mdx
//   STOPLIST, FOX, NEGATION,
//   REVIEW, CUSTOM              stopwords.mdx
//   STEMS, LEMMAS               stemming-and-lemmatization.mdx

export const VIDEO = "nlp-cleaning-text";

/** Whether public/images/nlp-cleaning-text/ holds the four watercolors. */
export const ILLUSTRATIONS = true;

// ── Part 1. Tokens ───────────────────────────────────────────────────────────

/** The lesson's sentence: split() against word_tokenize(). */
export const WORDS = {
  text: m.words.text,
  split: m.words.split,
  tokens: m.words.tokens,
};

/** Which split() piece each word_tokenize() token came out of, by walking the
 *  tokens through the pieces (the tokens are the pieces' characters, in
 *  order, cut further). */
export const TOKEN_PIECE: readonly number[] = (() => {
  const out: number[] = [];
  let piece = 0;
  let used = 0;
  for (const t of WORDS.tokens) {
    if (used >= WORDS.split[piece].length) {
      piece++;
      used = 0;
    }
    if (!WORDS.split[piece].startsWith(t, used)) throw new Error(`token ${t} is not next in ${WORDS.split[piece]}`);
    out.push(piece);
    used += t.length;
  }
  return out;
})();

/** Index of a piece, or of a token, by its text (the nth occurrence). */
export const pieceOf = (text: string, nth = 1) => indexOf(WORDS.split, text, nth);
export const tokenOf = (text: string, nth = 1) => indexOf(WORDS.tokens, text, nth);

function indexOf(list: readonly string[], text: string, nth: number) {
  let seen = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === text && ++seen === nth) return i;
  }
  throw new Error(`"${text}" is not in [${list.join(", ")}] ${nth} times`);
}

/** split(".") against sent_tokenize() (Punkt). */
export const SENTENCES = {
  text: m.sentences.text,
  naive: m.sentences.naive,
  sentences: m.sentences.sentences,
};

/** A tweet under the default tokenizer and under TweetTokenizer. */
export const TWEET = {
  text: m.tweet.text,
  default: m.tweet.default,
  tweet: m.tweet.tweet,
};

// ── Part 2. Normalization ────────────────────────────────────────────────────

export const CASE = {
  words: m.case.words,
  distinct: m.case.distinct,
  folded: m.case.folded,
  /** The distinct lowercase forms, in order of first appearance. */
  foldedDistinct: m.case.foldedDistinct,
};

/** lower() on the lesson's three words, and its glosses for each side. */
export const LOSSY = m.lossy.map((r, i) => ({
  ...r,
  before: ["the country", "the health organization", "the company"][i],
  after: ["the pronoun", "the question word", "the fruit"][i],
}));

/** The three recipes on one line. `split` is what the first one filters. */
export const PUNCT = m.punct;

// ── Part 3. Stopwords ────────────────────────────────────────────────────────

export const STOPLIST = m.stopwords;

export type Filtered = { text: string; tokens: string[]; isStop: boolean[]; content: string[] };
export const FOX: Filtered = m.fox;
export const REVIEW: Filtered = m.review;
export const NEGATION = m.negation;

export const CUSTOM = {
  keep: m.custom.keep,
  add: m.custom.add,
  has: m.custom.has,
  review: m.custom.review as Filtered,
};

// ── Part 4. Stems and lemmas ─────────────────────────────────────────────────

const STEM = Object.fromEntries(m.stems.map((s) => [s.word, s.stem]));
export const stemOf = (w: string) => {
  const s = STEM[w];
  if (s === undefined) throw new Error(`no stem measured for ${w}`);
  return s;
};

/** The year of Porter's rules, from the lesson's own text ("a set of
 *  suffix-stripping rules from 1980"): a date to quote, not a result to run. */
export const PORTER_YEAR = 1980;

export type Lemma = { word: string; default: string; pos: string; withPos: string };
export const LEMMAS: readonly Lemma[] = m.lemmas;
