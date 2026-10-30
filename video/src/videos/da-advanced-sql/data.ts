import results from "./results.json" with { type: "json" };

// Every table, statement and message the video shows, read from
// results.json: what DuckDB v1.4.3 (DuckDB-Wasm 1.32.0, the engine the
// page's blocks run) returned for the statements in check.mjs, which wrote
// it. Each figure ran in a fresh database built by its own setup, and the SQL
// printed on screen is the SQL in that file, so a listing cannot drift from
// what ran. Pure (no Remotion, no DOM).

export const VIDEO = "da-advanced-sql";

/**
 * Whether public/images/da-advanced-sql/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

type Value = string | number | boolean | null;
type Step = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type Figure = { setup: string; steps: Record<string, Step>; version: string };
const FIGURES = results.figures as unknown as Record<string, Figure>;

/** A value as a SQL client prints it. */
const shown = (v: Value): string => (v === null ? "null" : String(v));

export type Table = { cols: string[]; rows: string[][] };

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  return s;
};

/** A result, as rows of printed cells in its column order. */
const table = (figure: string, id: string): Table => {
  const s = step(figure, id);
  if (!s.ok || !s.columns || !s.rows) throw new Error(`${figure}.${id} is not a result: ${s.sql}`);
  return { cols: s.columns, rows: s.rows.map((r) => r.map(shown)) };
};

/** A statement as it is printed: its SQL, one string per line. */
export type Query = { lines: string[] };
const query = (figure: string, id: string): Query & Table => ({ lines: step(figure, id).sql.split("\n"), ...table(figure, id) });

/** A statement DuckDB refused: its SQL and its error, split into the kind
 *  ("Binder Error") and the message. */
const refused = (figure: string, id: string) => {
  const s = step(figure, id);
  if (s.ok || !s.error) throw new Error(`${figure}.${id} did not fail: ${s.sql}`);
  const [kind, ...rest] = s.error.split(": ");
  return { lines: s.sql.split("\n"), kind, message: rest.join(": ") };
};

/** Rows of a result whose `col` lies between `lo` and `hi`, inclusive. */
const slice = (t: Table, col: string, lo: number, hi: number): Table => {
  const j = t.cols.indexOf(col);
  return { cols: t.cols, rows: t.rows.filter((r) => Number(r[j]) >= lo && Number(r[j]) <= hi) };
};

// ── 1, 2. Windows ───────────────────────────────────────────────────────────

export const WINDOW = {
  /** The video's own six sales, by region and day. */
  sales: table("window", "table"),
  grouped: query("window", "grouped"),
  windowed: query("window", "windowed"),
  ranked: query("window", "ranked"),
};

// ── 3, 4, 5. Ranking ────────────────────────────────────────────────────────

const ranks = query("rank", "ordered");
export const RANK = {
  /** The page's query, as the page prints it. */
  lines: step("rank", "all").sql.split("\n"),
  rows: ranks.rows.length,
  /** Ranks 7 to 14 by row number: where the 88s and 85s tie. */
  ties: slice(ranks, "rn", 7, 14),
  products: table("topN", "table"),
  rowNumber: query("topN", "rowNumber"),
  rank: query("topN", "rank"),
  qualify: query("topN", "qualify"),
  inWhere: refused("topN", "inWhere"),
};

// ── 6, 7, 8. Frames ─────────────────────────────────────────────────────────

export const FRAME = {
  /** The video's own four payments, two on January 2. */
  payments: table("frame", "table"),
  rows: query("frame", "rows"),
  range: query("frame", "range"),
  defaulted: query("frame", "defaulted"),
  whole: query("frame", "whole"),
  lastDefault: query("last", "defaulted"),
  lastWide: query("last", "widened"),
  /** FIRST_VALUE and NTH_VALUE(amount, 3) with the default frame. */
  firstNth: query("last", "firstNth"),
};

// ── 9, 10. Running total and moving average ─────────────────────────────────

export const RUNNING = {
  both: query("running", "both"),
  centered: query("running", "centered"),
  /** A three-day average by date rather than by row, over the spine's gappy
   *  sales: only its frame clause is shown. */
  rangeDays: query("spine", "rangeDays"),
};

// ── 11, 12. The latest row, and a date spine ────────────────────────────────

export const LATEST = {
  ranked: query("latest", "ranked"),
  kept: query("latest", "kept"),
  without: query("spine", "without"),
  spine: query("spine", "spine"),
};

// ── At speed ────────────────────────────────────────────────────────────────

export const RAPID = {
  lag: query("running", "lag"),
  weeks: query("running", "weeks"),
  quartiles: query("ntile", "quartiles"),
  quartileSizes: table("ntile", "quartileSizes"),
  fifthSizes: table("ntile", "fifthSizes"),
  standing: query("ntile", "standing"),
  org: query("recursive", "org"),
  /** The recursive CTE, counted by level: the figure's listing and table. */
  levels: query("recursive", "levels"),
  pivot: query("pivot", "pivot"),
  unpivot: query("pivot", "unpivot"),
  inWhere: refused("topN", "inWhere"),
};

export const RUNTIME = `DuckDB ${(results.figures as unknown as Record<string, Figure>).window.version}`;
