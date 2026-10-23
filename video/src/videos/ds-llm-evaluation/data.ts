import results from "./results.json" with { type: "json" };

// Every number the video shows, read from results.json: what check.mjs got
// back from NumPy and SciPy in Pyodide. The page's own inputs (an 80% pass
// rate, a judge agreeing 90% of the time, a classifier with sensitivity 0.90
// and specificity 0.95) are redone there; the paired table and the notebook
// are the video's own, and the screen says so. Pure (no Remotion, no DOM).

export const VIDEO = "ds-llm-evaluation";

/**
 * Whether public/images/ds-llm-evaluation/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

export const SIZE = results.size;
export const PAIR = results.pair;
export const JUDGE = results.judge;
export const PREV = results.prev;
export const NOTEBOOK = results.notebook;
export const BANK = results.bank;

/** A share as a percent, the way the narration says it. */
export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;

/** A count with thousands separators. */
export const num = (x: number) => x.toLocaleString("en-US");
