import results from "./results.json" with { type: "json" };

// Every number and every curve the video shows, read from results.json: what
// NumPy, SciPy and statsmodels in Pyodide 314.0.7 (the runtime the page's
// blocks run in) returned for check.mjs, which wrote it, plus the two figures
// taken from Data Analyst Part 7 so the series agree. Every random draw is
// seeded there, so a rerun gives the same figures. Pure (no Remotion, no DOM).

export const VIDEO = "ds-experiment-design";

/**
 * Whether public/images/ds-experiment-design/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = false;

type Pair = [number, number];

/** A/A tests on orders nested in users: how often each analysis calls a difference. */
export const UNIT = results.unit as { sims: number; users: number; ordersPerUser: number; naive: number; user: number };

/** The page's power block, and power at its 393 per arm with one lever moved at a time. */
export const POWER = results.power as {
  solve: number;
  n: number;
  base: number;
  levers: { key: "users" | "effect" | "variance" | "alpha"; from: string; to: string; power: number }[];
};

/** The two errors on one threshold: a two-sided 5% test placed for 80% power (DA Part 7's). */
export const ERRORS = results.errors as { crit: number; shift: number; alpha: number; beta: number; power: number };

/** The page's sample-size function: 10% baseline, at each MDE in points. */
export const SIZE = results.size as { baseline: number; two: number; one: number; ratio: number; statsmodels: number; curve: Pair[] };

/** One- and two-sided on the same design: critical values, power, and a regression caught. */
export const SIDES = results.sides as {
  z2: number;
  z1: number;
  shift: number;
  twoPower: number;
  onePower: number;
  twoCatches: number;
  oneCatches: number;
};

type Interval = { n: number; control: number; treatment: number; diff: number; lo: number; hi: number };
/** A cheaper checkout as good as the old one, at two sizes, against a margin in points. */
export const NONINF = results.noninf as { margin: number; big: Interval; small: Interval };

/** charts/ab-test-peeking.mjs (via DA Part 7): identical arms, the p-value every hundred visitors. */
export const PEEK = results.peeking as { planned: number; rows: Pair[]; under: number[]; crossings: number[]; final: number };

type Rate = { looks: number; rate: number };
/** 10,000 A/A tests, checked on four schedules. */
export const PEEK_RATES = results.peekRates as { sims: number; once: Rate; weekly: Rate; daily: Rate; every100: Rate };

/** The SPRT on pairs of users: boundaries, error rates, average pairs, and two example paths. */
export const SPRT = results.sprt as {
  upper: number;
  lower: number;
  fixed: number;
  falsePositive: number;
  power: number;
  meanH0: number;
  meanH1: number;
  examples: { effect: { n: number; path: number[] }; none: { n: number; path: number[] } };
};

/** The page's CUPED block: X, Y and the adjusted Y for each of 500 users. */
export const CUPED = results.cuped as {
  n: number;
  theta: number;
  varY: number;
  varAdj: number;
  share: number;
  meanY: number;
  meanAdj: number;
  meanX: number;
  corr: number;
  points: [number, number, number][];
};

/** Long-tailed revenue, capped at its 99th percentile. */
export const CAP = results.cap as { users: number; p99: number; cut: number; max: number };

/** Twenty users, the first six heavy users, and one fair coin's assignment (1 = treatment). */
export const STRATA = results.strata as { users: number; heavy: number; lopsided: number; coin: number[] };

/** The page's A/A block: 1,000 tests. */
export const AA = results.aa as { tests: number; rate: number };

/** A share as a whole percent, or to one place when it needs one. */
export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
