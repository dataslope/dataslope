import results from "./results.json" with { type: "json" };

// Every table, statement and number the video shows, read from results.json:
// what DuckDB v1.4.3 (DuckDB-Wasm 1.32.0, the engine the page's blocks run)
// returned for the statements in check.mjs, which wrote it. The SQL printed
// on screen is the SQL in that file, so a listing cannot drift from what ran.
// Pure (no Remotion, no DOM).

export const VIDEO = "da-ai-assisted";

/**
 * Whether public/images/da-ai-assisted/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = false;

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

/** The one value of a one-row, one-column result. */
const scalar = (figure: string, id: string) => table(figure, id).rows[0][0];

// ── 3. The date boundary and averaged ratios ────────────────────────────────

export const BOUNDARY = {
  /** The page's nine orders, each with whether each filter keeps it. */
  kept: table("boundary", "kept"),
  /** The page's query, verbatim, and its two totals. */
  page: query("boundary", "page"),
  /** The assistant's query alone, as the page's concept check describes it. */
  assistant: query("boundary", "assistant"),
  halfOpen: query("boundary", "halfOpen"),
  /** How much of January the assistant's total misses, in percent. */
  missed: Number(scalar("boundary", "missed")),
  /** '2026-01-31' as a timestamp: the start of the day. */
  cutoff: scalar("boundary", "cutoff"),
};

export const RATIOS = {
  /** The video's own two days. */
  days: query("ratios", "table"),
  averaged: query("ratios", "averaged"),
  pooled: query("ratios", "pooled"),
};

/** The track's question bank, counted by check.mjs. */
export const BANK = results.bank as number;

export const RUNTIME = `DuckDB ${FIGURES.boundary.version}`;
