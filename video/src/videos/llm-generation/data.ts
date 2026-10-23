import m from "./measurements.json";

// Every number, token and string the video shows. Computed, not typed:
// measure.py re-runs the unit's lesson code blocks (NumPy 2.4.6, tiktoken
// 0.12.0) and asserts each against the output the page prints, and
// measurements.json is its output, imported here as it is. Pure (no Remotion,
// no DOM).

export const VIDEO = "llm-generation";

/**
 * Whether public/images/llm-generation/ holds the four watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = false;

// ── 1. Sampling (sampling.mdx) ──────────────────────────────────────────────

const S = m.sampling;

/** The lesson's four candidate tokens, in score order, and their scores. */
export const TOKENS: readonly string[] = S.tokens;
export const LOGITS: readonly number[] = S.logits;
export const TOP_P = S.topP;
export const CAT_OVER_DOG = S.catOverDog;
/** LlmTemperature's seed (the most typical of 0 to 99) and its twenty draws at T = 1. */
export const SEED: number = S.seed;
export const DRAWS_T1: readonly number[] = S.drawsT1;

export type Row = {
  t: number;
  probs: readonly number[];
  scaled: readonly number[];
  topP: { kept: readonly number[]; running: readonly number[]; renormalized: readonly number[] };
};

/** The temperatures the video stops at: 0.2, 0.7, 1.0, 1.5 and 2.0. */
export const ROWS: readonly Row[] = S.rows;
export const row = (t: number): Row => {
  const r = ROWS.find((x) => x.t === t);
  if (!r) throw new Error(`No computed row for T = ${t}`);
  return r;
};

const GRID: readonly { t: number; probs: readonly number[] }[] = S.grid;
const GREEDY: readonly number[] = S.greedy;

/**
 * The probabilities at any temperature from 0 to 2, read off measure.py's
 * grid (steps of 0.01) and blended linearly between its points, so bars that
 * move between two stops are drawn from computed values. T = 0 is greedy.
 */
export const probsAt = (t: number): number[] => {
  const lo = GRID[0];
  const hi = GRID[GRID.length - 1];
  if (t <= 0) return [...GREEDY];
  if (t <= lo.t) return GREEDY.map((g, i) => g + (lo.probs[i] - g) * (t / lo.t));
  if (t >= hi.t) return [...hi.probs];
  const k = Math.min(GRID.length - 2, Math.floor((t - lo.t) / 0.01 + 1e-9));
  const a = GRID[k];
  const b = GRID[k + 1];
  const f = (t - a.t) / (b.t - a.t);
  return a.probs.map((p, i) => p + (b.probs[i] - p) * f);
};

/** The lesson's top-p block: six candidates, a confident and an uncertain context. */
export const NUCLEUS_TOKENS: readonly string[] = S.nucleusTokens;
export type Nucleus = { scores: readonly number[]; probs: readonly number[]; kept: readonly number[]; running: readonly number[] };
export const NUCLEUS: { confident: Nucleus; uncertain: Nucleus } = S.nucleus;

/** "Watch randomness accumulate": three tokens, close scores, five seeded runs of eight. */
export const RUN_TOKENS: readonly string[] = S.runTokens;
export const RUN_LOGITS: readonly number[] = S.runLogits;
export const RUN_PROBS: readonly number[] = S.runProbs;
export const RUNS: readonly string[] = S.runs;

// ── 2. Why models hallucinate ───────────────────────────────────────────────

const HL = m.hallucination;
export const CONTINUATIONS: readonly { prompt: string; continuation: string; grounded: boolean }[] = HL.continuations;
export type RiskRow = { case: string; flags: readonly number[]; score: number; hits: readonly string[] };
export const RISK: readonly RiskRow[] = HL.risk;
export const RISK_FACTORS: readonly string[] = HL.riskFactors;

// ── 3. Context windows ──────────────────────────────────────────────────────

const C = m.context;
export const WINDOW = C.window;
export const MAX_OUTPUT = C.maxOutput;
export const BUDGET: readonly { part: string; tokens: number }[] = C.budget;
export const USED = C.used;
export const ROOM = C.room;
export const RECALL: readonly { position: string; at: number; recall: number }[] = C.recall;
export const MONEY = C.money;
export const ATTENTION = C.attention;

// ── 4. Reasoning models ─────────────────────────────────────────────────────

const R = m.reasoning;
export const THINKING_LINES: readonly string[] = R.thinkingLines;
export const ANSWER: string = R.answer;
/** o200k_base's count of the working and of the answer. */
export const THINKING_TOKENS: number = R.o200k.thinking;
export const ANSWER_TOKENS: number = R.o200k.answer;
/** The page's own estimate, words times 1.3. */
export const ESTIMATE = R.estimate;
export const BUDGETS: readonly number[] = R.budgets;
export const ACCURACY: readonly number[] = R.accuracy;
export const GAINS: readonly (number | null)[] = R.gains;
export const FIRST_500_SHARE: number = R.first500Share;

// ── Formatting ──────────────────────────────────────────────────────────────

/** "64.8%", "<0.1%" for a sliver, "0%" and "100%" when exact. */
export const pct = (x: number, digits = 1) => {
  if (x === 0) return "0%";
  if (x === 1) return "100%";
  if (x * 100 < 0.5 * 10 ** -digits) return `<${(10 ** -digits).toFixed(digits)}%`;
  return `${(x * 100).toFixed(digits)}%`;
};

/** "3.2", "−0.4": a real minus sign. */
export const signed = (x: number, digits = 1) => `${x < 0 ? "−" : ""}${Math.abs(x).toFixed(digits)}`;

/** "193,700". */
export const count = (x: number) => Math.round(x).toLocaleString("en-US");

/** "8k", "1M", "200k". */
export const kTokens = (x: number) => (x >= 1_000_000 ? `${x / 1_000_000}M` : `${Math.round(x / 1000)}k`);
