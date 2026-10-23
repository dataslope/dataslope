import results from "./results.json" with { type: "json" };

// Every number and every mark the video draws, read from results.json: the
// Data Analyst visualization page's own chart data, rebuilt and measured by
// check.mjs, which wrote it. Pure (no Remotion, no DOM).

export const VIDEO = "da-visualization";

/**
 * Whether public/images/da-visualization/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

const R = results;

/** 1. Five encodings, by judgement error relative to position. */
export const ENCODINGS = R.encodings;

/** 2. Six weekly values, over weeks and over issue types. */
export const LINE_BAR = R.lineBar;

/** 3. Five shares, and the two closest. */
export const PIE = R.pie;

/** 4. 420 tickets: by channel, and by hours to resolve. */
export const TICKETS = R.tickets;

/** 5. One bimodal sample in three bin widths, as density. */
export const BINS = R.bins;

/** 6. Five team scores, from zero and from 94. */
export const TRUNCATION = R.truncation;

/** 7. A year of scores on an axis from 92. */
export const BASELINE = R.baseline;

/** 8. Two series twelve periods long, one large and slow, one small and fast. */
export const LOG = R.log;

/** 9. Two unrelated series and two choices of right-hand axis. */
export const DUAL = R.dual;

/** 10. A flat decade with a cherry-picked window; a rising series; a gap. */
export const CHERRY = R.cherry;
export const INVERTED = R.inverted;
export const MISSING = R.missing;

/** 11. Attention by dashboard slot; panels added against panels opened. */
export const DASHBOARD = R.dashboard;

/** 13, 14. A titled revenue chart; an annotated signup line. */
export const STORY = R.story;
export const ANNOTATION = R.annotation;

/** 17. The page's deuteranope simulation as one linear-RGB color matrix. */
export const DEUTERANOPE = R.deuteranope.matrix.join(" ");

/** The quick ones. */
export const BUBBLES = R.bubbles;
export const INK_WEEK = R.ink.bars;
export const SCATTER = R.scatter;
export const PARTS = R.parts;
