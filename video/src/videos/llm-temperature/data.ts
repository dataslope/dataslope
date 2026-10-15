import m from "./measurements.json";

// Every probability and draw the video shows. Computed, not drawn: measure.py
// runs the lesson's softmax and top-p with numpy, and measurements.json is its
// output, imported here as it is. Pure (no Remotion, no DOM).

export const VIDEO = "llm-temperature";

/**
 * Whether public/images/llm-temperature/ holds the two watercolors from
 * illustrations.json. Set it to true once `npm run illustrations --
 * llm-temperature` has written both WebPs. Every frame is laid out with room
 * for them either way.
 */
export const ILLUSTRATIONS = true;

/** The lesson's four candidate tokens, in score order, and their scores. */
export const TOKENS: readonly string[] = m.tokens;
export const LOGITS: readonly number[] = m.logits;
export const DRAWS = m.draws;
export const SEED = m.seed;
export const TOP_P = m.topP;
/** One uniform per draw: every row of Fig. 3 consumes these same twenty. */
export const UNIFORMS: readonly number[] = m.uniforms;

export type Row = {
  t: number;
  probs: readonly number[];
  scaled: readonly number[];
  draws: readonly number[];
  counts: readonly number[];
  topP: { kept: readonly number[]; running: readonly number[]; renormalized: readonly number[] };
};

/** The four temperatures the video stops at: 0.2, 0.7, 1.0 and 1.5. */
export const ROWS: readonly Row[] = m.rows;
export const row = (t: number): Row => {
  const r = ROWS.find((x) => x.t === t);
  if (!r) throw new Error(`No computed row for T = ${t}`);
  return r;
};

const GRID: readonly { t: number; probs: readonly number[] }[] = m.grid;
const GREEDY: readonly number[] = m.greedy;

/**
 * The probabilities at any temperature from 0 to 2, read off measure.py's
 * grid (steps of 0.01) and blended linearly between its points, so the bars
 * that move between two stops are drawn from computed values. T = 0 is the
 * greedy one-hot.
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

/** "64.8%", "<0.1%" for a sliver, "0%" and "100%" when exact. */
export const pct = (x: number, digits = 1) => {
  if (x === 0) return "0%";
  if (x === 1) return "100%";
  if (x * 100 < 0.5 * 10 ** -digits) return `<${(10 ** -digits).toFixed(digits)}%`;
  return `${(x * 100).toFixed(digits)}%`;
};

/** "3.2", "−0.4": a real minus sign. */
export const signed = (x: number, digits = 1) => `${x < 0 ? "−" : ""}${Math.abs(x).toFixed(digits)}`;
