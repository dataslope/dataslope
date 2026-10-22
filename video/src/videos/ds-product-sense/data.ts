import results from "./results.json" with { type: "json" };

// Every number the video shows, read from results.json: what check.mjs got
// back from NumPy and SciPy in Pyodide. The page has no data of its own, so
// the product numbers all belong to one made-up recipe app (the screen says
// so); the arithmetic on them is done there so the parts add up, and the
// random series are seeded, so a rerun gives the same figures. Pure (no
// Remotion, no DOM).

export const VIDEO = "ds-product-sense";

/**
 * Whether public/images/ds-product-sense/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

export const HOOK = results.hook;
export const LEAD = results.lead;
export const GOODHART = results.goodhart;
export const DROP = results.drop;
export const NOISE = results.noise;
export const SAMPLE = results.sample;
export const MARKET = results.market;
export const IMPACT = results.impact;
export const RATIO = results.ratio;
export const TRADE = results.trade;

/** A share as a whole percent, the way the narration says it. */
export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;

/** A count with thousands separators. */
export const num = (x: number) => x.toLocaleString("en-US");
