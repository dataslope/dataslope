import results from "./results.json" with { type: "json" };

// Every number the video shows, read from results.json: what check.mjs got
// back from Pyodide (the page's block, run as written; NumPy for the
// simulation and the arithmetic). The five-word space is llm-meaning's and
// the prose rate llm-tokens', each read by check.mjs from that video's own
// measurements.json. Pure (no Remotion, no DOM).

export const VIDEO = "de-pipelines-for-ai";

/**
 * Whether public/images/de-pipelines-for-ai/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

/** The hero's own pixels: drawn at most half of each at 4K. */
export const HERO = { id: "de-pipelines-for-ai-llama", w: 1025, h: 996 };

export const FRESH = results.fresh;
export const SWITCH = results.switch;
export const ANN = results.ann;
export const FILTER = results.filter;
export const HYBRID = results.hybrid;
export const BACKFILL = results.backfill;
export const CHUNK = results.chunk;
export const PRACTICE = results.practice;

/** A share as a percent, the way the narration says it. */
export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;

/** A count with thousands separators. */
export const num = (x: number) => x.toLocaleString("en-US");

/** The page's block, as the page prints it (read out of pipelines-for-ai.mdx by check.mjs). */
export const BLOCK: readonly string[] = results.fresh.block;
