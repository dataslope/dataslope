import results from "./results.json" with { type: "json" };

// Every number the video shows, read from results.json: what NumPy and SciPy
// in Pyodide 314.0.7 (the runtime the page's blocks run in) returned for
// check.mjs, which wrote it. Exact answers are worked there in fractions and
// the simulations are seeded, so a rerun gives the same figures. Pure (no
// Remotion, no DOM).

export const VIDEO = "ds-probability";

/**
 * Whether public/images/ds-probability/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = false;

/** "1/3" as a number. */
const frac = (s: string) => {
  const [a, b = "1"] = s.split("/");
  return Number(a) / Number(b);
};

export const COND = { ...results.cond, sixGivenEven: frac(results.cond.pSixGivenEven) };
export const TEST = results.test;
export const CHURN = results.churn;
export const EXCL = results.excl;
export const DIE = results.die;
export const HATS = results.hats;
export const DISTS = results.dists;
export const MEMORY = results.memory;
export const LIMIT = results.limit;
export const MONTY = results.monty;
export const BDAY = results.birthday;
export const COV = results.cov;
export const BET = results.bet;

/** A share as a whole percent, the way the narration says it. */
export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
