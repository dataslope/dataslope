import results from "./results.json" with { type: "json" };

// Every frame, Series, snippet, error and warning the video shows, read from
// results.json: what pandas 3.0.2 in Pyodide 314.0.7 (the runtime the page's
// blocks run in) returned for the snippets in check.mjs, which wrote it. Each
// figure ran in a fresh namespace built by its own setup, and the code printed
// on screen is the code in that file, so a listing cannot drift from what ran.
// Pure (no Remotion, no DOM).

export const VIDEO = "da-pandas";

/**
 * Whether public/images/da-pandas/ holds the watercolor from
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

/**
 * A DataFrame as pandas displays it: the index as the first, untitled column
 * (titled with the index's name when it has one), then the columns.
 */
const frame = (figure: string, id: string): Table & { index: string[] } => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "frame") throw new Error(`${figure}.${id} is not a DataFrame`);
  return {
    cols: [v.indexName ?? "", ...v.columns],
    rows: v.index.map((label, i) => [label, ...v.rows[i]]),
    index: v.index,
  };
};

/** A Series as two columns: its index, and its values under its name. */
const series = (figure: string, id: string): Table & { dtype: string; name: string | null } => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "series") throw new Error(`${figure}.${id} is not a Series`);
  return {
    cols: [v.indexName ?? "", v.name ?? ""],
    rows: v.index.map((label, i) => [label, v.values[i]]),
    dtype: v.dtype,
    name: v.name,
  };
};

/** A scalar the way Python prints it: str() for a number or a string. */
const scalar = (figure: string, id: string): string => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "value") throw new Error(`${figure}.${id} is not a scalar`);
  return v.str;
};

/**
 * A snippet as it is printed, one string per line. A last line that is only a
 * name (`df`, `north`) is there to display the result, which the table beside
 * the listing already shows, so the listing leaves it off.
 */
const code = (figure: string, id: string): string[] => {
  const lines = step(figure, id).code.split("\n");
  return lines.length > 1 && /^[A-Za-z_]\w*$/.test(lines[lines.length - 1]) ? lines.slice(0, -1) : lines;
};

/** A snippet pandas refused: its code, and its error split into the kind
 *  ("KeyError") and the message. */
const refused = (figure: string, id: string) => {
  const s = step(figure, id);
  if (s.ok || !s.error) throw new Error(`${figure}.${id} did not fail`);
  const [kind, ...rest] = s.error.split(": ");
  return { lines: s.code.split("\n"), kind, message: rest.join(": ") };
};

/** A snippet that ran but warned: the warning's kind and its first sentence. */
const warned = (figure: string, id: string) => {
  const s = step(figure, id);
  if (!s.warnings.length) throw new Error(`${figure}.${id} did not warn`);
  const [kind, ...rest] = s.warnings[0].split(": ");
  return { kind, message: rest.join(": ").split("\n")[0] };
};

// ── 1, 2. loc and iloc; boolean filtering ───────────────────────────────────

export const LOC = {
  frame: frame("loc", "frame"),
  loc: { lines: code("loc", "loc"), value: scalar("loc", "loc") },
  iloc: { lines: code("loc", "iloc"), value: scalar("loc", "iloc") },
  north: { lines: code("loc", "north"), ...frame("loc", "north") },
  northIloc: { lines: code("loc", "northIloc"), ...series("loc", "northIloc") },
  northLoc: refused("loc", "northLoc"),
};

export const FILTER = {
  frame: frame("filter", "frame"),
  noParens: refused("filter", "noParens"),
  andWord: refused("filter", "andWord"),
  mask: { lines: code("filter", "mask"), ...series("filter", "mask") },
  result: { lines: code("filter", "result"), ...frame("filter", "result") },
};

// ── 3, 4, 5. groupby ────────────────────────────────────────────────────────

export const GROUPBY = {
  frame: frame("groupby", "frame"),
  sum: { lines: code("groupby", "sum"), ...series("groupby", "sum") },
  agg: { lines: code("groupby", "agg"), ...frame("groupby", "agg") },
  aggMean: { lines: code("groupby", "aggMean"), ...series("groupby", "aggMean") },
  transform: { lines: code("groupby", "transform"), ...series("groupby", "transform") },
  pct: { lines: code("groupby", "pct"), ...frame("groupby", "pct") },
};

// ── 6, 7, 8. merge, concat and join ─────────────────────────────────────────

export const MERGE = {
  jan: frame("merge", "jan"),
  feb: frame("merge", "feb"),
  customers: frame("merge", "customers"),
  stacked: { lines: code("merge", "stacked"), ...frame("merge", "stacked") },
  clean: { lines: code("merge", "stackedClean"), ...frame("merge", "stackedClean") },
  merged: { lines: code("merge", "merged"), ...frame("merge", "merged") },
  stock: frame("merge", "stock"),
  prices: frame("merge", "prices"),
  oneKey: { lines: code("merge", "oneKey"), ...frame("merge", "oneKey") },
  twoKeys: { lines: code("merge", "twoKeys"), ...frame("merge", "twoKeys") },
};

// ── 9, 10. Missing data ─────────────────────────────────────────────────────

export const MISSING = {
  frame: frame("missing", "frame"),
  isnaSum: { lines: code("missing", "isnaSum"), ...series("missing", "isnaSum") },
  equalsNan: { lines: code("missing", "equalsNan"), value: scalar("missing", "equalsNan") },
  isnaAmount: { lines: code("missing", "isnaAmount"), value: scalar("missing", "isnaAmount") },
  dropna: { lines: code("missing", "dropna"), ...frame("missing", "dropna") },
  fillna: { lines: code("missing", "fillna"), ...series("missing", "fillna") },
  filled: frame("fill", "filled"),
};

// ── 11, 12. Chained assignment, views and copies ────────────────────────────

export const COPY = {
  frame: frame("chained", "frame"),
  chained: { lines: code("chained", "chained"), ...frame("chained", "chained"), warning: warned("chained", "chained") },
  loc: { lines: code("chained", "loc"), ...frame("chained", "loc") },
  subset: { lines: code("subset", "subset"), ...frame("subset", "subset"), warnings: step("subset", "subset").warnings },
  parent: frame("subset", "parent"),
  version: scalar("subset", "version"),
};

// ── 13, 14, 15. Vectorization, apply and map ────────────────────────────────

export const VECTOR = {
  amounts: frame("vectorize", "frame"),
  vectorized: { lines: code("vectorize", "vectorized"), ...series("vectorize", "vectorized") },
  applied: { lines: code("vectorize", "applied"), ...series("vectorize", "applied") },
  calls: Number(scalar("vectorize", "calls")),
  frame: frame("map", "frame"),
  seriesMap: { lines: code("map", "seriesMap"), ...series("map", "seriesMap") },
  byColumn: { lines: code("map", "byColumn"), ...series("map", "byColumn") },
  byRow: { lines: code("map", "byRow"), ...series("map", "byRow") },
  frameMap: { lines: code("map", "frameMap"), ...frame("map", "frameMap") },
};

// ── 16, 17. Reshaping ───────────────────────────────────────────────────────

export const RESHAPE = {
  wide: frame("reshape", "wide"),
  melted: { lines: code("reshape", "melted"), ...frame("reshape", "melted") },
  long: frame("reshape", "long"),
  pivot: refused("reshape", "pivot"),
  pivotTable: { lines: code("reshape", "pivotTable"), ...frame("reshape", "pivotTable") },
};

// ── Rapid fire ──────────────────────────────────────────────────────────────

export const RAPID = {
  categorical: {
    convert: code("categorical", "convert"),
    before: Number(scalar("categorical", "before")),
    after: Number(scalar("categorical", "after")),
  },
  sorted: { lines: code("sort", "sorted"), ...frame("sort", "sorted") },
  ranked: { lines: code("sort", "ranked"), ...frame("sort", "ranked") },
  counts: { lines: code("counts", "counts"), ...series("counts", "counts") },
  shares: { lines: code("counts", "shares"), ...series("counts", "shares") },
  parsed: code("dates", "parsed"),
  parts: { lines: code("dates", "parts"), ...frame("dates", "parts") },
  monthly: { lines: code("dates", "monthly"), ...series("dates", "monthly") },
  chain: { lines: code("chain", "result"), ...frame("chain", "result") },
  duplicates: {
    frame: frame("duplicates", "frame"),
    count: Number(scalar("duplicates", "count")),
    countLines: code("duplicates", "count"),
    clean: { lines: code("duplicates", "clean"), ...frame("duplicates", "clean") },
  },
  rename: { lines: code("rename", "after"), before: scalar("rename", "before"), after: scalar("rename", "after") },
  dtypes: { lines: code("dtypes", "numeric"), value: scalar("dtypes", "numeric") },
  case: { lines: code("case", "sized"), ...frame("case", "sized") },
  csv: {
    withIndex: { lines: code("csv", "withIndex"), text: scalar("csv", "withIndex") },
    readBack: frame("csv", "readBack"),
    withoutIndex: { lines: code("csv", "withoutIndex"), text: scalar("csv", "withoutIndex") },
  },
  query: { lines: code("query", "result"), ...frame("query", "result") },
  shape: {
    shapeLines: code("shape", "shape"),
    shape: scalar("shape", "shape"),
    dtypesLines: code("shape", "dtypes"),
    dtypes: series("shape", "dtypes"),
    memoryLines: code("shape", "memory"),
    memory: Number(scalar("shape", "memory")),
  },
};

export const RUNTIME = results.runtime as string;
