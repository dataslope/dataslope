import m from "./measurements.json";

// Every number, path and count the video shows. Measured, not drawn:
// measure.py re-runs the lessons' own code blocks with their seeds, and
// measurements.json is its output, imported here as it is. Pure (no
// Remotion, no DOM). The lessons' printed lines are echoed by measure.py on
// stderr, for checking against script.ts.

export const VIDEO = "probability";

/**
 * Whether public/images/probability/ holds the three watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

/** mulberry32: a tiny, well-mixed 32-bit PRNG, for layout jitter only. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Part 1. Long-run frequency (probability-basics) ─────────────────────────

/** 100,000 flips, seed 7: the count of heads and the first few flips
 *  (1 = heads), of which the first seven are heads. */
export const COIN = {
  flips: m.coin.flips,
  heads: m.coin.heads,
  pHeads: m.coin.pHeads,
  first: m.coin.first as readonly number[],
  /** How many heads open the run. */
  streak: m.coin.first.findIndex((f) => f === 0),
};

/** The running share of heads over 5,000 flips, seed 1. */
export const LLN = {
  n: m.lln.n,
  path: m.lln.path as unknown as readonly (readonly [number, number])[],
  after10: m.lln.after10,
  after100: m.lln.after100,
  after5000: m.lln.after5000,
  maxOffLate: m.lln.maxOffLate,
  /** The flip this run's first five heads in a row start on (21: flips 21
   *  to 25, which lift the share to its high of 56%). */
  streakFrom: m.lln.streakFrom,
};
/** The share after `k` flips, read off the kept path. */
export const llnAt = (k: number) => LLN.path.find(([n]) => n === k)?.[1] ?? NaN;
/** The lowest and highest share between two flip counts, inclusive. */
export const llnRange = (from: number, to: number) => {
  const vs = LLN.path.filter(([n]) => n >= from && n <= to).map(([, v]) => v);
  return { lo: Math.min(...vs), hi: Math.max(...vs) };
};

export const STREAK = { ten: m.streak.ten, tenOneIn: m.streak.tenOneIn };

// ── Part 2. Conditioning from a table (conditional-probability) ─────────────

export const TABLE = {
  rows: m.table.rows as readonly string[],
  churned: m.table.churned as readonly number[],
  stayed: m.table.stayed as readonly number[],
  total: m.table.total,
  rowTotals: [m.table.paidTotal, m.table.freeTotal] as const,
  churnedTotal: m.table.churnedTotal,
  pPaid: m.table.pPaid,
  pFree: m.table.pFree,
  pAll: m.table.pAll,
  pFreeGivenChurn: m.table.pFreeGivenChurn,
};

// ── Part 3. The 99% test (conditional-probability) ──────────────────────────

export const TEST = m.test;

// ── Part 4. Monty Hall (conditional-probability, seed 0) ────────────────────

export const MONTY = {
  trials: m.monty.trials,
  stay: m.monty.stay,
  switch: m.monty.switch,
  /** The running share of games that staying has won; switching wins the
   *  rest of each game, so its share is one minus this. */
  path: m.monty.path as unknown as readonly (readonly [number, number])[],
};

// ── Part 5. Random variables (random-variables) ─────────────────────────────

export const HEADS = m.heads as Record<string, number>;

export const DIE = {
  values: m.die.values as readonly number[],
  probs: m.die.probs as readonly number[],
  expected: m.die.expected,
  mode: m.die.mode,
  draws: m.die.draws,
  simMean: m.die.simMean,
  terms: m.die.terms as readonly number[],
  variance: m.spread.var,
  sd: m.spread.sd,
  squares: m.spread.squares as readonly number[],
  /** Each face's chance times its squared distance from 4.5: the six terms
   *  that add up to the variance. */
  varTerms: m.spread.terms as readonly number[],
};

export const WARRANTY = m.warranty;

/** "9%", "90.7%" */
export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
/** "1,098" */
export const num = (x: number) => Math.round(x).toLocaleString("en-US");

/** The lesson's frozen binomial, n = 10 and p = 0.3: one of the shapes the
 *  closing scene sketches. */
export const BINOM = m.binom.pmf as readonly number[];
