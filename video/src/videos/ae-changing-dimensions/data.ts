import results from "./results.json" with { type: "json" };

// Every table, listing and number the video shows, read from results.json:
// what Postgres (PGlite, PostgreSQL 18, the engine the page's blocks run in)
// returned when check.mjs ran each statement from a fresh database. The SQL
// printed on screen is the SQL in that file, split into lines, so a listing
// cannot drift from what ran. The SCD tables are the page's own; Question
// 5's staged orders and Question 9's count re-run Data Engineer Part 4's
// (de-modeling-history), and check.mjs stops if the two runs disagree. The
// dbt snapshot (Question 4) is drawn, not run, so nothing here describes
// it. Pure (no Remotion, no DOM).

export const VIDEO = "ae-changing-dimensions";

/**
 * Whether public/images/ae-changing-dimensions/ holds the watercolors from
 * illustrations.json. Phase 2 generates them and turns this on; every frame
 * is laid out with room for them either way.
 */
export const ILLUSTRATIONS = false;

/** The hero's prompt id in illustrations.json. */
export const HERO_ID = "ae-changing-dimensions-hermit-crab";

type Value = string | number | boolean | null;
type Step = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type Figure = { setup: string; steps: Record<string, Step>; version: string };
const FIGURES = results.figures as unknown as Record<string, Figure>;

/** A value as a SQL client prints it. */
const shown = (v: Value): string => (v === null ? "null" : String(v));

export type Table = { cols: string[]; rows: string[][] };
/** A statement as it is printed, one string per line, with what it returned. */
export type Query = Table & { lines: string[] };

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  if (!s.ok) throw new Error(`${figure}.${id} failed: ${s.error}`);
  return s;
};

const table = (figure: string, id: string): Table => {
  const s = step(figure, id);
  return { cols: s.columns ?? [], rows: (s.rows ?? []).map((r) => r.map(shown)) };
};

const query = (figure: string, id: string): Query => ({ lines: step(figure, id).sql.split("\n"), ...table(figure, id) });

/** One cell of a result, by row and column name. */
export const cell = (t: Table, row: number, col: string) => {
  const j = t.cols.indexOf(col);
  if (j < 0) throw new Error(`no column ${col} in ${t.cols.join(", ")}`);
  return t.rows[row][j];
};

/** The first row's value in `col` (or the first column). */
const value = (figure: string, id: string, col?: string) => {
  const t = table(figure, id);
  return col ? cell(t, 0, col) : t.rows[0][0];
};

/** How many rows a statement wrote: an UPDATE or INSERT returns no
 *  columns, so check.mjs reports its rows affected. */
const written = (figure: string, id: string) => Number(value(figure, id));

/** "1,200.00" from "1200.00": money at two places, with separators. */
export const money = (v: string) =>
  Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A result's two columns as a lookup: region to revenue. */
const byFirst = (t: Table): Record<string, string> => Object.fromEntries(t.rows.map((r) => [r[0], r[1]]));

// ── The hook: Acme's two orders ─────────────────────────────────────────────

/** 5001 (2022-05-10, 1,200.00) and 5002 (2024-02-20, 850.00). */
export const ORDERS_42 = table("scd", "orders42");

// ── 1. Type 1 ───────────────────────────────────────────────────────────────

export const TYPE1 = {
  /** The Type 1 row: one per customer, overwritten (West). */
  row42: table("scd", "t1Rows42"),
  /** Both of Acme's orders, both West. */
  orders42: query("scd", "t1Orders42"),
  /** 2022 revenue by region, as it was (Type 2) and as Type 1 reports it.
   *  Type 2 has no South row for 2022; Type 1 has 195.00 there. */
  regions2022: { type2: byFirst(table("scd", "t2Regions2022")), type1: byFirst(table("scd", "t1Regions2022")) },
  /** The typo on both versions, the fix (2 rows), and both rows after. */
  mixBefore: table("t1mix", "before"),
  mixFix: query("t1mix", "fix"),
  mixFixed: written("t1mix", "fix"),
  mixAfter: table("t1mix", "after"),
};

// ── 2. Type 2: the page's table ─────────────────────────────────────────────

export const TYPE2 = {
  /** Acme's two versions: 1001 East to 2023-06-14, 1002 West from 2023-06-15. */
  rows42: table("scd", "rows42"),
  /** The page's point-in-time read, all 24 rows (5001 East, 5002 West). */
  read: query("scd", "page"),
  /** 24 matched rows, 24 distinct orders. */
  matched: table("scd", "matched"),
  /** The close UPDATE and the INSERT, one row each, on the table before the
   *  move; afterwards it equals the page's table (differ: 0). */
  before: table("type2", "before"),
  close: query("type2", "close"),
  insert: query("type2", "insert"),
  after: table("type2", "after"),
  closed: written("type2", "close"),
  inserted: written("type2", "insert"),
  samePage: Number(value("type2", "samePage")),
  /** The trap: 44 rows and 31,580.00, against 24 and 17,930.00. */
  natural: query("scd", "natural"),
  truth: table("scd", "truth"),
  /** The page's is_current read: 15 rows. */
  current: query("scd", "current"),
  currentCount: table("scd", "currentCount"),
  /** 24 rows, 15 customers, 8 of whom changed. */
  versions: table("scd", "versions"),
  /** The page's chart's model: 50,000 customers, 4% a month, 36 months:
   *  122,000 rows, 2.44 times. Computed, not measured. */
  growth: table("growth", "model"),
};

// ── 3. Type 3 ───────────────────────────────────────────────────────────────

export const TYPE3 = {
  before: table("type3", "before"),
  move: query("type3", "move"),
  /** West, previous East. */
  after: table("type3", "after"),
  again: query("type3", "again"),
  /** North, previous West: East is gone. */
  twice: table("type3", "twice"),
};

// ── 5. A late-arriving dimension record ─────────────────────────────────────

export const LATE = {
  staged: table("late", "staged"),
  /** The inner-join load: 203 is dropped. */
  load: query("late", "load"),
  /** 700.00 loaded of 1,110.00 staged. */
  loadSum: table("late", "loadSum"),
  /** Every order loads; 203 on the unknown member, -1, with customer 77 kept. */
  loadUnknown: query("late", "loadUnknown"),
  facts: table("late", "facts"),
  factsSum: value("late", "factsSum"),
  reportBefore: table("late", "reportBefore"),
  arrive: query("late", "arrive"),
  /** The correction job, and the 1 row it re-keys. */
  correct: query("late", "correct"),
  corrected: written("late", "correct"),
  factsAfter: table("late", "factsAfter"),
  reportAfter: table("late", "reportAfter"),
  stillUnknown: Number(value("late", "stillUnknown")),
};

// ── 6. A late-arriving fact: order 5001, looked up two ways ─────────────────

export const LATE_FACT = {
  /** By is_current: 1002, West. */
  current: query("scd", "lateCurrent"),
  /** Valid on 2022-05-10: 1001, East. */
  pointInTime: query("scd", "latePit"),
};

// ── 7. A slowly changing measure ────────────────────────────────────────────

export const MEASURE = {
  /** Order 7001, 900.00, posted 2024-03-01. */
  before: table("measure", "before"),
  marchReport: query("measure", "marchReport"),
  reverse: query("measure", "reverse"),
  /** The ledger after the correction: 900.00, -900.00, 800.00. */
  rows: table("measure", "rows"),
  /** 800.00. */
  today: value("measure", "today"),
  /** March, rerun after the correction: still 900.00. */
  marchRerun: value("measure", "marchRerun"),
  /** The same correction made in place: March now says 800.00. */
  overwrite: query("measure", "overwrite"),
  marchOverwritten: value("measure", "marchOverwritten"),
};

// ── Rapid round ─────────────────────────────────────────────────────────────

/** 9: five age bands by four income tiers, 20 rows. */
export const MINI_ROWS = Number(value("mini", "mini"));
