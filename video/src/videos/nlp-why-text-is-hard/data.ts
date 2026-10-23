import m from "./measurements.json";

// Every token, list and count the video shows, read from measurements.json:
// what NLTK 3.9.4 returned when measure.py ran the lessons' own code, each
// printed line checked there against the site's prepopulated output. Pure
// (no Remotion, no DOM).
//
//   HOOK      what-is-nlp.mdx's opening sentence: its characters and tokens
//   SPLIT     what-is-nlp.mdx, "why .split() is not enough"
//   LAYERS    what-is-nlp.mdx's layers, on three words of the pipeline sentence
//   PIPE      the-nlp-pipeline.mdx, "Watching a list flow through the pipeline"
//   ORDER     the-nlp-pipeline.mdx, "Order matters: a concrete example"

export const VIDEO = "nlp-why-text-is-hard";

/**
 * Whether public/images/nlp-why-text-is-hard/ holds the four watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

export const ART = {
  ribbon: `${VIDEO}-ribbon`,
  telescope: `${VIDEO}-telescope`,
  trophy: `${VIDEO}-trophy`,
  conveyor: `${VIDEO}-conveyor`,
} as const;
/** Each image's own pixels (the trimmed WebP), so a spot is never drawn
 *  larger than half of them on the 1080p layout (a 4K render doubles it). */
export const ART_PX = {
  ribbon: [1519, 980],
  telescope: [851, 1020],
  trophy: [983, 998],
  conveyor: [1536, 658],
} as const;

// ── Part 1 ──────────────────────────────────────────────────────────────────

export const HOOK = {
  text: m.hook.text,
  /** 62: what a computer is handed. */
  chars: m.hook.chars,
  tokens: m.hook.tokens,
  /** For each token, the whitespace piece it came from. */
  tokenPiece: m.hook.tokenPiece,
  pieces: m.hook.split,
};

export const SPLIT = {
  text: m.split.text,
  pieces: m.split.pieces,
  tokens: m.split.tokens,
  tokenPiece: m.split.tokenPiece,
};

// ── Part 2 ──────────────────────────────────────────────────────────────────

export const LAYERS = {
  chars: m.layers.chars,
  tokens: m.layers.tokens,
  normalized: m.layers.normalized,
  tagNames: m.layers.tagNames,
  counts: m.layers.counts as [string, number][],
};

// ── Part 3 ──────────────────────────────────────────────────────────────────

export type Stage = { name: string; tokens: string[]; cols: number[] };
export const PIPE = {
  text: m.pipeline.text,
  stages: m.pipeline.stages as Stage[],
};
/** The tokenized list: one column per token, kept as the list shrinks. */
export const PIPE_COLS = PIPE.stages[0].tokens;
/** Columns a stage drops from the one before it. */
export const dropped = (k: number) => PIPE.stages[k - 1].cols.filter((c) => !PIPE.stages[k].cols.includes(c));
/** Columns whose text a stage changes. */
export const changed = (k: number) =>
  PIPE.stages[k].cols.filter((c, i) => {
    const j = PIPE.stages[k - 1].cols.indexOf(c);
    return j >= 0 && PIPE.stages[k - 1].tokens[j] !== PIPE.stages[k].tokens[i];
  });

/** Where each item of `sub` sits in `full`, matched in order (each list in
 *  the order example is the token list with some items left out). */
const colsOf = (full: readonly string[], sub: readonly string[], same: (a: string, b: string) => boolean) => {
  const cols: number[] = [];
  let j = 0;
  for (const w of sub) {
    while (j < full.length && !same(full[j], w)) j++;
    if (j === full.length) throw new Error(`${w} is not in ${full.join(" ")}`);
    cols.push(j++);
  }
  return cols;
};
const ci = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const ORDER = {
  text: m.order.text,
  tokens: m.order.tokens,
  a: {
    lowered: { tokens: m.order.a.lowered, cols: colsOf(m.order.tokens, m.order.a.lowered, ci) },
    filtered: { tokens: m.order.a.filtered, cols: colsOf(m.order.tokens, m.order.a.filtered, ci) },
  },
  b: {
    filtered: { tokens: m.order.b.filtered, cols: colsOf(m.order.tokens, m.order.b.filtered, ci) },
    lowered: { tokens: m.order.b.lowered, cols: colsOf(m.order.tokens, m.order.b.lowered, ci) },
  },
};

export const STOPWORDS = m.stopwords;

// ── What the narration says aloud ───────────────────────────────────────────
// script.ts speaks these numbers as words; if a re-run of measure.py ever
// changed one, the video would contradict itself, so it stops here instead.
const SPOKEN: [string, number, number][] = [
  ["sixty-two characters", HOOK.chars, 62],
  ["eight pieces", SPLIT.pieces.length, 8],
  ["twelve tokens", SPLIT.tokens.length, 12],
  ["thirteen tokens", PIPE.stages[0].tokens.length, 13],
  ["eleven left", PIPE.stages[2].tokens.length, 11],
  ["five little words", dropped(3).length, 5],
  ["six left", PIPE.stages[3].tokens.length, 6],
];
for (const [said, measured, expected] of SPOKEN) {
  if (measured !== expected) throw new Error(`The narration says "${said}", but measure.py gives ${measured}`);
}
