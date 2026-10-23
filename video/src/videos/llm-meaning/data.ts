import m from "./measurements.json";

// Every id, vector, score and count the video shows. Measured, not drawn:
// measure.py re-runs the lessons' own code blocks with NumPy and tiktoken (the
// site's Pyodide versions), and measurements.json is its output, imported
// here as it is. Pure (no Remotion, no DOM). The lessons' printed lines are
// echoed by measure.py on stderr, for checking against script.ts.

export const VIDEO = "llm-meaning";

/**
 * Whether public/images/llm-meaning/ holds the four watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

export type Vec = readonly number[];

// ── Part 1. Ids and embeddings (tokens.mdx's o200k_base; embeddings.mdx) ────

export const IDS = {
  encoding: m.ids.encoding,
  vocab: m.ids.vocab,
  berry: m.ids.berry,
  teeth: m.ids.teeth,
  cherry: m.ids.cherry,
};

/** embeddings.mdx's sentence, in the course's tokenizer. */
export const PROMPT = {
  text: m.prompt.text,
  tokens: m.prompt.tokens as readonly { id: number; piece: string }[],
};

/** The lesson's five words in three named dimensions, and each one's
 *  distance from cat. */
export const SPACE = {
  axes: m.space.axes as readonly string[],
  words: m.space.words as readonly { word: string; vec: Vec; dist: number }[],
  nearest: m.space.nearest as readonly string[],
};
export const spaceWord = (w: string) => {
  const found = SPACE.words.find((x) => x.word === w);
  if (!found) throw new Error(`No word ${w} in the lesson's space`);
  return found;
};

export type Tok = { word: string; vec: Vec };
/** "Dog bites man" and "man bites dog": the vectors, their order-blind sums,
 *  the lesson's position signal, and each token with its slot added. */
export const ORDER = {
  sentences: m.order.sentences as readonly (readonly string[])[],
  vectors: m.order.vectors as readonly (readonly Tok[])[],
  position: m.order.position as readonly Vec[],
  positioned: m.order.positioned as readonly (readonly Tok[])[],
  sum: m.order.sum as readonly Vec[],
};

// ── Part 2. Similarity (similarity.mdx) ──────────────────────────────────────

export const COSINE = m.cosine;

export type Doc = { text: string; vec: Vec; score: number };
export const SEARCH = {
  axes: m.search.axes as readonly string[],
  docs: m.search.docs as readonly Doc[],
  question: m.search.question,
  query: m.search.query as Vec,
  ranked: m.search.ranked as readonly { text: string; score: number }[],
  top: m.search.top,
};

// ── Part 3. Attention (attention-intuition.mdx) ──────────────────────────────

export const WEIGHTS = {
  tokens: m.weights.tokens as readonly string[],
  raw: m.weights.raw as readonly number[],
  weights: m.weights.weights as readonly number[],
  sum: m.weights.sum,
};

export type Attend = { query: Vec; scores: readonly number[]; weights: readonly number[]; output: Vec };
export const QKV = {
  tokens: m.qkv.tokens as readonly string[],
  keys: m.qkv.keys as readonly Vec[],
  values: m.qkv.values as readonly Vec[],
  trophy: m.qkv.trophy as Attend,
  suitcase: m.qkv.suitcase as Attend,
};

export const COST = m.cost as readonly { n: number; scores: number }[];

// ── Part 4. The shape of a transformer (the-shape-of-a-transformer.mdx) ──────

export const PARAMS = {
  vocab: m.params.vocab,
  dModel: m.params.dModel,
  layers: m.params.layers,
  dFf: m.params.dFf,
  parts: m.params.parts as readonly { name: string; b: number }[],
  total: m.params.total,
  ffShare: m.params.ffShare,
};

export const MOE = m.moe;

/** sampling.mdx's example scores, the next unit's: four of the vocabulary's. */
export const LOGITS = {
  tokens: m.logits.tokens as readonly string[],
  scores: m.logits.scores as readonly number[],
};

/** "0.998", "1.0", "-0.4" as the screen sets them: a real minus sign. */
export const num = (x: number, digits = 3) => {
  const s = Math.abs(x).toFixed(digits);
  return x < 0 ? `−${s}` : s;
};
/** "128,000" */
export const thousands = (x: number) => x.toLocaleString("en-US");
