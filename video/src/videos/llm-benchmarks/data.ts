import m from "./measurements.json";

// Every number the video shows, read from measurements.json: what measure.py
// printed when it re-ran the lessons' own code blocks (and checked each
// against the page's prepopulated output). Scores the lessons quote in prose
// are in its "quoted", each with the lesson line it comes from. Pure (no
// Remotion, no DOM).

export const VIDEO = "llm-benchmarks";

/**
 * Whether public/images/llm-benchmarks/ holds the four watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

const pct = (x: number, digits = 1) => (x * 100).toFixed(digits);

// ── Part 1. A launch table, and where its gaps sit ───────────────────────────

/** what-benchmarks-measure, "How to read a score": two models, three rows. */
export const SCORES = m.score.map((r) => ({
  name: r.name,
  a: Number(pct(r.a)),
  b: Number(pct(r.b)),
  ceiling: Number(pct(r.ceiling, 0)),
  gap: Number(pct(r.gap)),
  headroom: Number(pct(r.headroom)),
}));
const row = (name: string) => {
  const r = SCORES.find((s) => s.name === name);
  if (!r) throw new Error(`no score row ${name}`);
  return r;
};
export const MMLU = row("MMLU");
export const GPQA = row("GPQA Diamond");
export const ARC3 = row("ARC-AGI-3");

const Q = m.quoted;
/** The lessons' prose, as quoted (what-benchmarks-measure, benchmark-pitfalls). */
export const QUOTED = {
  mmluSubjects: Q.mmluSubjects.value,
  mmluFrontierAbove: Q.mmluFrontierAbove.value,
  mmluCeiling: Q.mmluCeiling.value,
  gpqaNonExpertPhd: Q.gpqaNonExpertPhd.value,
  gpqaLeaders: Q.gpqaLeaders.value,
  hleLaunch: Q.hleLaunch.value,
  hleNow: Q.hleNow.value,
  withinPoints: Q.withinPoints.value,
  astraStandard: Q.astraStandard.value,
  astraStandardUsd: Q.astraStandard.usd,
  astraVendor: Q.astraVendor.value,
  astraVendorUsd: Q.astraVendor.usd,
  examplesLo: Q.examplesLo.value,
  examplesHi: Q.examplesHi.value,
};
if (QUOTED.mmluCeiling !== MMLU.ceiling) throw new Error("MMLU's ceiling: prose and block disagree");

// ── Part 2. Contamination ────────────────────────────────────────────────────

/** benchmark-pitfalls' first block: what the score reports in each case. */
export const CONTAMINATION = m.contamination;

// ── Part 3. Your own evaluation ──────────────────────────────────────────────

/** The four tiers and their October 2026 prices, USD per million tokens. */
export const TIERS = m.cost.rows.map((r) => ({
  name: r.name,
  inPrice: r.in,
  outPrice: r.out,
  accuracy: Math.round(r.accuracy * 100),
  monthly: r.monthly,
  perCorrect: r.perCorrect,
}));
export const COST = { inTokens: m.cost.inTokens, outTokens: m.cost.outTokens, volume: m.cost.volume };

/** evaluating-for-your-task, "How many examples" (seed 7, 2,000 runs). */
export const SIZES = {
  trueA: Math.round(m.sizes.trueA * 100),
  trueB: Math.round(m.sizes.trueB * 100),
  trials: m.sizes.trials,
  /** How often the better one ranks ahead, by number of examples, as the
   *  page prints it (one decimal). */
  rates: Object.entries(m.sizes.rates).map(([n, r]) => ({ n: Number(n), pct: Number(pct(r)) })),
  /** The draws at n = 20: correct answers out of 20, in run order. */
  n: m.sizes.keptN,
  runsA: m.sizes.keptA,
  runsB: m.sizes.keptB,
  histA: m.sizes.histA,
  histB: m.sizes.histB,
  ...m.sizes.keptSummary,
};
export const rateAt = (n: number) => {
  const r = SIZES.rates.find((x) => x.n === n);
  if (!r) throw new Error(`no rate at n=${n}`);
  return r.pct;
};

/** evaluating-for-your-task, "Building the harness". */
export type Ticket = { text: string; expected: string; cheap: string; good: string };
export const TICKETS: Ticket[] = m.harness.cheap.results.map((r, i) => ({
  text: r.text,
  expected: r.expected,
  cheap: r.got,
  good: m.harness.good.results[i].got,
}));
export const HARNESS = {
  cheap: Math.round(m.harness.cheap.accuracy * 100),
  good: Math.round(m.harness.good.accuracy * 100),
  cheapRight: TICKETS.filter((t) => t.cheap === t.expected).length,
  cheapMisses: TICKETS.filter((t) => t.cheap !== t.expected),
};
/** Where every one of the cheap model's misses went. */
export const MISS_QUEUE = (() => {
  const queues = [...new Set(HARNESS.cheapMisses.map((t) => t.cheap))];
  if (queues.length !== 1) throw new Error("the cheap model's misses go to more than one queue");
  return queues[0];
})();

/** Dollars, the way the lesson's table prints a monthly bill: "$1,650". */
export const usd = (x: number, digits = 0) =>
  `$${x.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
