import { ds, inkOf } from "../../theme/brand";
import { BLUE_INK } from "../../editorial/style";
import m from "./measurements.json";

// Every table and number the video shows. Computed, not typed: measure.py
// runs the lesson's own seven-row frame through pandas 3.0.5 (split, agg,
// transform, and the share) and measurements.json is its output, imported
// here as it is. Pure (no Remotion, no DOM).

export const VIDEO = "pandas-groupby";

/**
 * Whether public/images/pandas-groupby/ holds the two watercolors from
 * illustrations.json. Set it to true once `npm run illustrations --
 * pandas-groupby` has written both WebPs. Every frame is laid out with room
 * for them either way.
 */
export const ILLUSTRATIONS = true;

export const PANDAS_VERSION = m.meta.pandas;

export type Dept = "Eng" | "Ops" | "Sales";
export type Row = { index: number; dept: Dept; salary: number };

/** The frame, in its own order: index 0 to 6. */
export const ROWS: readonly Row[] = m.rows.map((r) => ({ ...r, dept: r.dept as Dept }));

/** The pieces groupby splits it into, in the order it sorts the keys. */
export const PIECES = m.pieces.map((p) => ({
  dept: p.dept as Dept,
  rows: p.index.map((i) => ROWS[i]),
}));

/** `.agg("sum")`: one row per department. */
export const AGG = m.agg.map((a) => ({ dept: a.dept as Dept, salary: a.salary }));
export const aggOf = (dept: Dept) => AGG.find((a) => a.dept === dept)!;

/** `.transform("sum")`: one value per original row, by index. */
export const TOTALS: readonly number[] = m.transform.map((t) => t.salary);
/** The index `.transform` returned: the frame's own, first to last. */
export const TOTAL_INDEX = m.transform.map((t) => t.index);
/** salary over its department's total, by index. */
export const SHARES: readonly number[] = m.share.map((s) => s.share);

/** Each department's shares, added up: 1 for every one of them. */
export const SHARE_SUMS = PIECES.map((p) => p.rows.reduce((a, r) => a + SHARES[r.index], 0));

/** Where each row lands among the pieces: which piece, and which row of it. */
export const pieceOf = (index: number) => {
  const k = PIECES.findIndex((p) => p.rows.some((r) => r.index === index));
  return { piece: k, slot: PIECES[k].rows.findIndex((r) => r.index === index) };
};

/** The example the narration reads: the largest salary in engineering. */
export const EXAMPLE = PIECES[0].rows.reduce((a, b) => (b.salary > a.salary ? b : a));

/** One color per department, kept through every figure. Blue, teal and
 *  orange: categorical, and none of them the page's red accent. The ink
 *  steps are for text. */
export const DEPT_COLOR: Record<Dept, string> = {
  Eng: ds("blue", 500),
  Ops: ds("teal", 500),
  Sales: ds("orange", 500),
};
export const DEPT_INK: Record<Dept, string> = {
  Eng: BLUE_INK,
  Ops: inkOf.teal,
  Sales: inkOf.orange,
};

/** "36%" */
export const pct = (x: number) => `${Math.round(x * 100)}%`;
