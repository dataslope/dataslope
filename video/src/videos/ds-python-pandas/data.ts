import results from "./results.json" with { type: "json" };

// Every frame, Series, snippet, error and warning the video shows, read from
// results.json: what pandas 3.0.2 in Pyodide 314.0.7 (the runtime the page's
// blocks run in) returned for the snippets in check.mjs, which wrote it. The
// code printed on screen is the code in that file, so a listing cannot drift
// from what ran. Pure (no Remotion, no DOM).

export const VIDEO = "ds-python-pandas";

/**
 * Whether public/images/ds-python-pandas/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

type FrameValue = {
  kind: "frame";
  index: string[];
  indexName: string | null;
  columns: string[];
  rows: string[][];
  dtypes: string[];
};
type SeriesValue = {
  kind: "series";
  name: string | null;
  index: string[];
  indexName: string | null;
  values: string[];
  dtype: string;
};
type ScalarValue = { kind: "value"; repr: string; str: string };
type Step = {
  code: string;
  ok: boolean;
  value?: FrameValue | SeriesValue | ScalarValue | null;
  error?: string;
  stdout: string;
  warnings: string[];
};
type Figure = { setup: string; steps: Record<string, Step> };
const FIGURES = results.figures as unknown as Record<string, Figure>;

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  return s;
};

/** A table as the kit draws it: a column title per column, and printed cells. */
export type Table = { cols: string[]; rows: string[][] };

/** A DataFrame as pandas displays it: the index as the first column (titled
 *  with the index's name when it has one), then the columns. */
const frame = (figure: string, id: string): Table => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "frame") throw new Error(`${figure}.${id} is not a DataFrame`);
  return {
    cols: [v.indexName ?? "", ...v.columns],
    rows: v.index.map((label, i) => [label, ...v.rows[i]]),
  };
};

/** A Series as two columns: its index, and its values under its name. */
const series = (figure: string, id: string): Table & { dtype: string } => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "series") throw new Error(`${figure}.${id} is not a Series`);
  return {
    cols: [v.indexName ?? "", v.name ?? ""],
    rows: v.index.map((label, i) => [label, v.values[i]]),
    dtype: v.dtype,
  };
};

/** A scalar the way print() shows it: str(), so a string has no quotes. */
const scalar = (figure: string, id: string): string => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "value") throw new Error(`${figure}.${id} is not a scalar`);
  return v.str;
};

/** A snippet as printed, one string per line. A last line that only names a
 *  frame (`df`) displays the result the table beside it already shows, so the
 *  listing leaves it off. */
const code = (figure: string, id: string): string[] => {
  const lines = step(figure, id).code.split("\n");
  return lines.length > 1 && /^[A-Za-z_]\w*$/.test(lines[lines.length - 1]) ? lines.slice(0, -1) : lines;
};

/** A snippet pandas refused: its code, the error's kind, and the message's
 *  first line. */
const refused = (figure: string, id: string) => {
  const s = step(figure, id);
  if (s.ok || !s.error) throw new Error(`${figure}.${id} did not fail`);
  const [kind, ...rest] = s.error.split(": ");
  return { lines: s.code.split("\n"), kind, message: rest.join(": ").split("\n")[0] };
};

/** A snippet that ran but warned: the warning's kind and its first sentence. */
const warned = (figure: string, id: string) => {
  const s = step(figure, id);
  if (!s.warnings.length) throw new Error(`${figure}.${id} did not warn`);
  const [kind, ...rest] = s.warnings[0].split(": ");
  return { kind, message: rest.join(": ").split("\n")[0] };
};

/** A tuple of two ints, as `(4, 265)` comes back: [4, 265]. */
const pair = (figure: string, id: string): [number, number] => {
  const m = scalar(figure, id).match(/^\((\d+), (\d+)\)$/);
  if (!m) throw new Error(`${figure}.${id} is not a pair of ints`);
  return [Number(m[1]), Number(m[2])];
};

// ── The opening, and question 6: the merge that fans out ────────────────────

export const FANOUT = {
  orders: frame("fanout", "orders"),
  customers: frame("fanout", "customers"),
  before: pair("fanout", "before"),
  merged: { lines: code("fanout", "merged"), ...frame("fanout", "merged") },
  after: pair("fanout", "after"),
  unique: { lines: code("fanout", "unique"), value: scalar("fanout", "unique") },
  validate: refused("fanout", "validate"),
};

export const PLAN = { lines: code("plan", "size"), ...series("plan", "size") };

// ── 1. Vectorization ────────────────────────────────────────────────────────

const loopMs = Number(scalar("vector", "loopMs"));
const vecMs = Number(scalar("vector", "vecMs"));
const revenues = (t: Table) => t.rows.map((r) => r[t.cols.indexOf("revenue")]).join(",");

export const VECTOR = {
  frame: frame("vector", "frame"),
  loop: { lines: code("vector", "loop"), ...frame("vector", "loop") },
  vectorized: { lines: code("vector", "vectorized"), ...frame("vector", "vectorized") },
  /** The same revenues from .apply with a lambda: a Python call per row. */
  apply: { lines: code("vector", "apply"), ...frame("vector", "apply") },
  /** The loop and the vectorized line agree on all million rows. */
  same: scalar("vector", "same") === "True",
  loopMs,
  vecMs,
  /** How many times faster the vectorized line ran, to the nearest 50: the
   *  two times move from run to run, so a finer figure would be false
   *  precision. The script says only "hundreds of times". */
  ratio: Math.round(loopMs / vecMs / 50) * 50,
};
if (revenues(VECTOR.apply) !== revenues(VECTOR.vectorized)) throw new Error("apply and the vectorized line disagree");
// The script says "several hundred milliseconds", "about one millisecond"
// and "hundreds of times faster". A run on a busy machine can measure the
// loop at well over a second (four were, during the 2026-10-29 fixes), so a
// result.json that no longer fits those words stops the build here.
if (VECTOR.loopMs < 200 || VECTOR.loopMs >= 1000) throw new Error(`the script says "several hundred milliseconds"; results.json has ${VECTOR.loopMs}`);
if (VECTOR.vecMs >= 2) throw new Error(`the script says "about one millisecond"; results.json has ${VECTOR.vecMs}`);
if (VECTOR.ratio < 200) throw new Error(`the script says "hundreds of times faster"; results.json gives ${VECTOR.ratio}x`);

// ── 2. Split-apply-combine ──────────────────────────────────────────────────

export const SPLIT = {
  frame: frame("split", "frame"),
  grouped: scalar("split", "grouped"),
  one: { lines: code("split", "one"), ...series("split", "one") },
  named: { lines: code("split", "named"), ...frame("split", "named") },
};

// ── 3, 4. agg, transform, apply; a percentage of each group ─────────────────

export const SHAPES = {
  frame: frame("shapes", "frame"),
  agg: { lines: code("shapes", "agg"), ...series("shapes", "agg") },
  transform: { lines: code("shapes", "transform"), ...series("shapes", "transform") },
  apply: { lines: code("shapes", "apply"), ...frame("shapes", "apply") },
  pct: { lines: code("shapes", "pct"), ...frame("shapes", "pct") },
};

// ── 5. merge, join and concat ───────────────────────────────────────────────

export const COMBINE = {
  orders: frame("combine", "orders"),
  customers: frame("combine", "customers"),
  merged: { lines: code("combine", "merged"), ...frame("combine", "merged") },
  joined: { lines: code("combine", "joined"), ...frame("combine", "joined") },
  stacked: { lines: code("combine", "stacked"), ...frame("combine", "stacked") },
};

// ── 7. Missing data ─────────────────────────────────────────────────────────

export const MISSING = {
  frame: frame("missing", "frame"),
  nanEq: { lines: code("missing", "nanEq"), value: scalar("missing", "nanEq") },
  isnaSum: { lines: code("missing", "isnaSum"), ...series("missing", "isnaSum") },
  mean: scalar("missing", "mean"),
  filled: { lines: code("missing", "filled"), ...frame("missing", "filled") },
};

// ── 8. Chained assignment ───────────────────────────────────────────────────

export const COPY = {
  frame: frame("chained", "frame"),
  chained: { lines: code("chained", "chained"), ...frame("chained", "chained"), warning: warned("chained", "chained") },
  loc: { lines: code("chained", "loc"), ...frame("chained", "loc") },
  subset: { lines: code("subset", "subset"), ...frame("subset", "subset") },
  version: scalar("chained", "version"),
};

// ── 9. Wide and long ────────────────────────────────────────────────────────

export const RESHAPE = {
  wide: frame("reshape", "wide"),
  long: { lines: code("reshape", "long"), ...frame("reshape", "long") },
  back: { lines: code("reshape", "back"), ...frame("reshape", "back") },
};

// ── Quickly, 10 to 14 ───────────────────────────────────────────────────────

export const QUICK = {
  mapCode: { lines: code("map", "code"), ...series("map", "code") },
  mapLabel: { lines: code("map", "label"), ...frame("map", "label") },
  mapCells: { lines: code("map", "cells"), ...frame("map", "cells") },
  chain: { lines: code("chain", "result"), ...frame("chain", "result") },
  select: { lines: code("case", "select"), ...frame("case", "select") },
  caseWhen: { lines: code("case", "caseWhen"), ...series("case", "caseWhen") },
  bare: { lines: code("case", "bare"), ...series("case", "bare") },
  catBefore: Number(scalar("category", "before")),
  catAfter: Number(scalar("category", "after")),
  weekly: { lines: code("dates", "weekly"), ...series("dates", "weekly") },
};

// The screen calls np.select's table "started from the default", which is
// case_when's answer only while the two agree.
if (QUICK.caseWhen.rows.map((r) => r[1]).join() !== QUICK.select.rows.map((r) => r[QUICK.select.cols.indexOf("size")]).join()) {
  throw new Error("case_when from the default and np.select disagree");
}
