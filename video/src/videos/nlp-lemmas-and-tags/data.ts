import m from "./measurements.json";

// Every tag, lemma, stem and lookup step the deep dive shows, read from
// measurements.json: what NLTK 3.9.4 (the site's Pyodide) returns with the
// pinned punkt_tab, averaged_perceptron_tagger_eng and wordnet data.
// measure.py runs the lessons' blocks verbatim, checks them against the
// page's prepopulated output, traces WordNet's lookup step by step against
// lemmatize() itself, and asserts agreement with the unit videos. Pure (no
// Remotion, no DOM).
//
//   DEFAULTS, DEFAULT_POS     stemming-and-lemmatization.mdx, the lemma block
//   TRACES, RULE_EXAMPLES     WordNet's _morphy, step by step
//   SENTENCE                  pos-tagging.mdx, "POS tagging makes
//                             lemmatization accurate", plus Porter's stems

export const VIDEO = "nlp-lemmas-and-tags";

/** Whether public/images/nlp-lemmas-and-tags/ holds the two watercolors. */
export const ILLUSTRATIONS = true;

/** lemmatize(w) with no part of speech, on the lesson's first three words. */
export const DEFAULTS: readonly { word: string; lemma: string }[] = m.defaults;

/** The pos lemmatize() falls back to: "n". */
export const DEFAULT_POS: string = m.defaultPos;

export type Checked = { form: string; inWordnet: boolean };
export type Trace = {
  word: string;
  pos: string;
  posName: string;
  /** The exception list's base forms, or null when the word is not on it. */
  listed: string[] | null;
  /** Each suffix rule that fits, and the form it leaves. */
  guesses: { rule: string[]; form: string }[];
  /** The word itself, then each candidate, and whether WordNet has it under
   *  this part of speech. */
  checked: Checked[];
  kept: string[];
  result: string;
  unchanged: boolean;
};

/** Fig. 3's six lookups, in the order the narration takes them. */
export const TRACES: readonly Trace[] = m.traces;

/** One lookup by word and part of speech. */
export const trace = (word: string, pos: string) => {
  const t = TRACES.find((x) => x.word === word && x.pos === pos);
  if (!t) throw new Error(`no trace for ${word} (${pos})`);
  return t;
};

/**
 * better's tie (said: "Good and well tie at four letters, so the first one
 * listed wins"): of the forms WordNet kept, the two shortest are good and
 * well, both four letters, and lemmatize()'s min(key=len) returns the first.
 */
export const TIE = (() => {
  const t = trace("better", "a");
  const length = Math.min(...t.kept.map((k) => k.length));
  const tied = t.kept.filter((k) => k.length === length);
  if (tied.length !== 2 || tied[0] !== t.result || length !== 4) {
    throw new Error(`better keeps ${t.kept.join(", ")}: not a four-letter tie won by the first`);
  }
  return { row: TRACES.indexOf(t), tied, result: t.result };
})();

/** A rule as it reads on screen: "-s", or "-ies → y". */
export const ruleText = ([old, rep]: readonly string[]) => (rep ? `-${old} → ${rep}` : `-${old}`);

/** WordNet's suffix rules, per part of speech, as _morphy holds them. */
export const RULES: Record<string, string[][]> = m.rules;

/** The rules Fig. 3's header names (said: "a noun's s, or a verb's ed or
 *  ing"), each checked to be in the table. */
export const RULE_EXAMPLES = (() => {
  const pick = (pos: string, old: string) => {
    const r = RULES[pos].find(([o, n]) => o === old && n === "");
    if (!r) throw new Error(`no rule -${old} for ${pos}`);
    return ruleText(r);
  };
  return { noun: [pick("n", "s")], verb: [pick("v", "ed"), pick("v", "ing")] };
})();

/** The noun "wa" is a lemma of: Washington, the state. */
export const WA = m.wa[0];

export type Sentence = {
  text: string;
  tokens: string[];
  tags: string[];
  letters: string[];
  wordnetPos: string[];
  naive: string[];
  aware: string[];
  porter: string[];
  /** to_wordnet_pos on one Penn tag of each family. */
  mapping: Record<string, string>;
  /** How each POS-aware lemma was reached. */
  paths: Trace[];
};

/** The pos-tagging lesson's sentence: tokens, Penn tags, first letters,
 *  WordNet parts of speech, lemmas without and with them, Porter's stems. */
export const SENTENCE: Sentence = m.sentence;

/** Where the tags change the lemma: the lesson's naive line and its
 *  POS-aware line differ (were, running, had, eaten), checked against what
 *  the narration says. */
export const RESCUED: readonly boolean[] = (() => {
  const r = SENTENCE.naive.map((l, i) => l !== SENTENCE.aware[i]);
  const words = SENTENCE.tokens.filter((_, i) => r[i]).join(" ");
  if (words !== "were running had eaten") throw new Error(`the tags rescue ${words}`);
  return r;
})();

/** Index of a token by its text (the nth occurrence). */
export const tokenAt = (text: string, nth = 1) => {
  let seen = 0;
  for (let i = 0; i < SENTENCE.tokens.length; i++) {
    if (SENTENCE.tokens[i] === text && ++seen === nth) return i;
  }
  throw new Error(`"${text}" is not in the sentence ${nth} times`);
};

/** The lesson's to_wordnet_pos, as a legend: a Penn tag's first letter and
 *  the WordNet part of speech it maps to, checked against the sentence. */
export const MAPPING = (() => {
  const rows = [
    { letter: "J", pos: "a", name: "adjective" },
    { letter: "V", pos: "v", name: "verb" },
    { letter: "R", pos: "r", name: "adverb" },
    { letter: "else", pos: "n", name: "noun" },
  ];
  const rowOf = (tag: string) => rows.find((r) => r.letter === tag[0]) ?? rows[3];
  for (const [tag, pos] of Object.entries(SENTENCE.mapping)) {
    if (rowOf(tag).pos !== pos) throw new Error(`to_wordnet_pos maps ${tag} to ${pos}, not ${rowOf(tag).pos}`);
  }
  SENTENCE.tags.forEach((tag, i) => {
    if (rowOf(tag).pos !== SENTENCE.wordnetPos[i]) throw new Error(`${tag} maps to ${SENTENCE.wordnetPos[i]}`);
  });
  return rows;
})();
