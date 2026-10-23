import m from "./measurements.json";

// Every count, ratio, tag and n-gram the video shows. Measured, not typed:
// measure.py runs the lessons' own blocks (checked against what the site's
// Pyodide printed) and the same calls on Jane Austen's Emma, and
// measurements.json is its output, imported here as it is. Pure (no Remotion,
// no DOM).

export const VIDEO = "nlp-counting-words";

/** Whether public/images/nlp-counting-words/ holds the four watercolors from
 *  illustrations.json. Every frame is laid out with room for them either way. */
export const ILLUSTRATIONS = true;

export type Pair = readonly [string, number];
const pairs = (rows: readonly (readonly (string | number)[])[]): Pair[] => rows.map(([w, c]) => [String(w), Number(c)] as const);

// ── frequency-distributions: the fox and the dog ────────────────────────────

export const FOX = {
  tokens: m.fox.tokens as readonly string[],
  total: m.fox.total,
  distinct: m.fox.distinct,
  /** Every word with its count, in most_common() order. */
  counts: pairs(m.fox.counts),
  top5: pairs(m.fox.top5),
};

// ── frequency-distributions: lexical diversity ──────────────────────────────

export const DIVERSITY = {
  repetitive: m.diversity.repetitive,
  varied: m.diversity.varied,
};

// ── Emma (interesting-discussions' corpus line, the lessons' calls) ─────────

export const EMMA = {
  total: m.emma.total,
  distinct: m.emma.distinct,
  top10Share: m.emma.top10Share,
  /** Every count in rank order. */
  ranked: m.emma.ranked as readonly number[],
  top10: pairs(m.emma.top10),
  hapaxes: m.emma.hapaxes,
  hapaxShare: m.emma.hapaxShare,
  byLength: m.emma.byLength,
  /** [words read, distinct words so far] every 2,000 words, and the end. */
  growth: m.emma.growth.map(([a, b]) => [a, b] as const),
  last: m.emma.last,
  newAtEnd: m.emma.newAtEnd,
  withStop: pairs(m.emma.withStop),
  withoutStop: pairs(m.emma.withoutStop),
  pairs: pairs(m.emma.pairs),
  sparsity: m.emma.sparsity,
};

/** Distinct words after `read` words, from the growth samples. */
export const vocabAt = (read: number) => {
  const g = EMMA.growth;
  let prev: readonly [number, number] = [0, 0];
  for (const p of g) {
    if (p[0] >= read) return prev[1] + ((p[1] - prev[1]) * (read - prev[0])) / (p[0] - prev[0]);
    prev = p;
  }
  return g[g.length - 1][1];
};

// ── pos-tagging ─────────────────────────────────────────────────────────────

export type Tagged = readonly (readonly [string, string])[];
const tagged = (rows: readonly (readonly string[])[]): Tagged => rows.map(([w, t]) => [w, t] as const);

export const FISH = m.fish.map((s) => ({ sentence: s.sentence, tagged: tagged(s.tagged) }));
export const TALL = tagged(m.tall);
export const ENGINEER = {
  tagged: tagged(m.engineer.tagged),
  nouns: m.engineer.nouns,
  adjectives: m.engineer.adjectives,
  verbs: m.engineer.verbs,
  adverbs: m.engineer.adverbs,
};
export const LEMMA = {
  tagged: tagged(m.lemma.tagged),
  naive: m.lemma.naive,
  aware: m.lemma.aware,
};

/** The Penn tag's family, by its first letter: the lesson's shortcut. */
export type Family = "noun" | "verb" | "adj" | "adv" | "other";
export const familyOf = (tag: string): Family =>
  tag.startsWith("N") ? "noun" : tag.startsWith("V") ? "verb" : tag.startsWith("J") ? "adj" : tag.startsWith("R") ? "adv" : "other";

// ── ngrams ──────────────────────────────────────────────────────────────────

export const WINDOW = {
  tokens: m.window.tokens,
  bigrams: m.window.bigrams,
  trigrams: m.window.trigrams,
};
export const ORDER = m.order;
export const PHRASES = { top3: pairs(m.phrases.top3) };
