import m from "./measurements.json";

// Every token, piece, id and count the video shows, read from
// measurements.json: what measure.py computed by running the lessons' own
// code blocks (checked against the site's recorded outputs) and tiktoken's
// o200k_base on the lessons' own text. Pure (no Remotion, no DOM).

export const VIDEO = "llm-tokens";

/** Whether public/images/llm-tokens/ holds the four watercolors from
 *  illustrations.json. Every frame is laid out with room for them either way. */
export const ILLUSTRATIONS = true;

export const ENCODING = m.meta.encoding;

export type Piece = { text: string; id: number };

/** How a token is set on screen: a leading space shown as a middle dot. */
export const shown = (text: string) => text.replace(/^ /, "·");

// ── Part 1. what-a-language-model-is ─────────────────────────────────────────

/** Tokens in o200k_base: 199,998 merged ones and two special ones. */
export const VOCAB = m.model.vocab;
/** The lesson's next-token table (an illustration, "Something like:"). */
export const DIST = m.model.dist;
export const SHOWN_SUM = m.model.shownSum;
/** The toy loop's six steps: each context and what came next. */
export const LOOP = m.model.loop;

// ── Part 2. tokens.mdx ───────────────────────────────────────────────────────

export const STRAWBERRY: Piece[] = m.tokens.strawberry;
export const SPACED: Piece = m.tokens.spaced;
export const RS = m.tokens.rs;
export const OPENING = m.tokens.opening;

/** A few rows of the vocabulary, in id order: Fig. 1's four candidates,
 *  each a whole word with its leading space, and the two pieces o200k_base
 *  cuts "Tokenization" into in the lesson's opening (Fig. 7). None of
 *  strawberry's ids, which Fig. 5 reveals on their own words. */
const tokenization = OPENING.pieces.filter((p) => p.text === " Token" || p.text === "ization");
export const VOCAB_ROWS: (Piece & { kind: "word" | "piece" })[] = [
  ...DIST.map((d) => ({ text: ` ${d.token}`, id: d.id, kind: "word" as const })),
  ...tokenization.map((p) => ({ ...p, kind: "piece" as const })),
].sort((a, b) => a.id - b.id);

// ── Part 3. building-a-tokenizer ─────────────────────────────────────────────

export const WORDS = Object.keys(m.bpe.freqs);
export const FREQS = m.bpe.freqs as Record<string, number>;
export const FIRST_PAIRS = m.bpe.firstPairs;
/** How many distinct neighbouring pairs the first count finds. */
export const PAIR_TOTAL = m.bpe.pairTotal;
/** Step 0 is the split into characters; step k is after merge k. */
export const STEPS = m.bpe.steps as { merge: [string, string] | null; count: number | null; splits: Record<string, string[]> }[];
export const MERGES = STEPS.slice(1).map((s) => ({ a: s.merge![0], b: s.merge![1], count: s.count! }));
export const END = "</w>";

/** Unit widths of each symbol of a word at a step: a merged symbol spans
 *  the units of the characters (and the end marker) it was made from. */
export const unitsOf = (sym: string) => (sym.endsWith(END) ? sym.length - END.length + 1 : sym.length);

// ── Part 4. token-counts-in-practice ─────────────────────────────────────────

export const SAMPLES = m.counts.samples;
export const FORMATS = m.counts.formats;
/** The three records as the tokenizer cuts them, key names marked. */
export const JSON_PIECES: (Piece & { key: boolean })[] = m.counts.formats.json.pieces;
export const CSV_PIECES: (Piece & { key: boolean })[] = m.counts.formats.csv.pieces;
export const FAMILIES = m.counts.families.map((f) => ({
  ...f,
  json: (FORMATS.json as unknown as Record<string, number>)[f.encoding],
}));
export const GREETINGS = m.counts.greetings;
export const CONVERSATION = m.counts.conversation;
export const PRICE = m.counts.priceCheck;

// ── The bridge ───────────────────────────────────────────────────────────────

export const BERRY: Piece = m.bridge.berry;
export const CHERRY: Piece = m.bridge.cherry;

/** "4,000": numbers as the page sets them. */
export const num = (x: number) => x.toLocaleString("en-US");
