import results from "./results.json" with { type: "json" };
import dbNorm from "../db-normalization/results.json" with { type: "json" };

// Every table, listing and number the video shows, read from results.json:
// what DuckDB 1.4.3 (DuckDB-Wasm, the engine the page's blocks run in)
// returned when check.mjs ran each statement from a fresh database. The SQL
// printed on screen is the SQL in that file, split into lines, so a listing
// cannot drift from what ran. Question 6's three small tables are Unit 7's
// (db-normalization's results.json, from PGlite), so the course video and
// this one show the same rows. Pure (no Remotion, no DOM).

export const VIDEO = "de-dimensional-modeling";

/**
 * Whether public/images/de-dimensional-modeling/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

/** The hero's pixels (1373x1022): at 4K it may be drawn at most half that. */
export const HERO = { id: "de-dimensional-modeling-starfish", w: 1373, h: 1022 } as const;

type Step = { sql: string; ok: boolean; cols: string[]; rows: (string | null)[][] };
const FIGS = results.figures as unknown as Record<string, { steps: Record<string, Step> }>;

/** A query's columns and its rows, a SQL NULL printed "null" as a client prints it. */
export type Result = { cols: readonly string[]; rows: readonly (readonly string[])[]; sql: string };

const step = (fig: string, id: string): Step => {
  const s = FIGS[fig]?.steps[id];
  if (!s || !s.ok) throw new Error(`results.json: ${fig}.${id} did not run`);
  return s;
};
const table = (fig: string, id: string): Result => {
  const s = step(fig, id);
  return { cols: s.cols, rows: s.rows.map((r) => r.map((v) => v ?? "null")), sql: s.sql };
};
/** One value: the first row's column `col`. */
const value = (fig: string, id: string, col = 0) => String(step(fig, id).rows[0][col]);
/** A statement as it ran, one string per printed line. */
export const linesOf = (r: Result) => r.sql.split("\n") as readonly string[];

export const DUCKDB_VERSION = results.version;

// ── Question 3. A column at the wrong grain ─────────────────────────────────

export const LINES = table("lines", "rows");
export const LINE_TOTALS = table("lines", "totals");
export const ORDER_GRAIN = table("lines", "orders");

// ── Question 4. Grain mismatch ──────────────────────────────────────────────

export const SALES = table("mismatch", "sales");
export const BUDGET = table("mismatch", "budget");
export const NAIVE = table("mismatch", "naive");
export const NAIVE_TOTALS = table("mismatch", "naiveTotals");
export const FIXED = table("mismatch", "fixed");
export const FIXED_TOTALS = table("mismatch", "fixedTotals");

// ── Question 5. why-normalization's shop, in DuckDB ─────────────────────────

export const FLAT = table("norm", "flat");
export const FLAT_AFTER = table("norm", "flatAfter");
export const NORM_CUSTOMERS = table("norm", "customers");
export const NORM_ORDERS = table("norm", "orders");
export const NORM_JOIN = table("norm", "join");
export const UPDATE_SQL = step("norm", "update").sql;
export const UPDATE_ROWS = value("norm", "update");
export const ADA_EMAILS = value("norm", "emails");

// ── Question 6. Unit 7's three tables (PGlite) ──────────────────────────────

type PgOk = { ok: true; fields: string[]; rows: (string | null)[][] };
const PG = dbNorm.results as unknown as Record<string, PgOk>;
const pgTable = (k: string): Result => ({
  cols: PG[k].fields,
  rows: PG[k].rows.map((r) => r.map((v) => v ?? "null")),
  sql: (dbNorm.sql as Record<string, string>)[k],
});
/** 1NF: Ada's two phone numbers in one cell. */
export const NF1 = pgTable("listCell");
/** 2NF: order lines keyed by (order_id, product_id), with the product's name. */
export const NF2 = pgTable("itemsBad");
/** 3NF: orders carrying their customer's city. */
export const NF3 = pgTable("cityBad");

// ── Question 8. The page's Type 2 dimension ─────────────────────────────────

export const VERSIONS = table("scd", "versions");
export const KEYED_ORDERS = table("scd", "orders");

// ── Questions 9 and 10. Ada's account, a loan application, visits ───────────

export const TRANSACTIONS = table("account", "transactions");
export const SNAPSHOT_ADA = table("account", "snapshotAda");
export const BALANCE = table("account", "balance");
export const APPLIED = table("account", "applied");
export const APPROVED = table("account", "approved");
export const FUNDED = table("account", "funded");
export const STAGES = { approve: Number(value("account", "stages", 0)), fund: Number(value("account", "stages", 1)) };
export const ACROSS = value("account", "acrossAccounts");
export const OVER_TIME = value("account", "overTime");
export const CLOSING = table("account", "closing");
export const CLOSING_TOTAL = value("account", "closingTotal");
export const VISITS_PER_DAY = table("visits", "perDay");
export const VISITS_BOTH = value("visits", "both");

// ── Questions 14 and 15. The page's date dimension ──────────────────────────

export const BY_QUARTER = table("datePage", "page");
export const AOV_ALL = table("datePage", "aovAll");
export const AOV_WORKING = table("datePage", "aovWorking");
export const HOLIDAYS = value("datePage", "holidays");

/** "1,600.00" from "1600.00": dollars set the way the narration says them. */
export const money = (v: string, digits = 2) =>
  Number(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
