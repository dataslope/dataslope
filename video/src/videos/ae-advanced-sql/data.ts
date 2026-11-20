import own from "./results.json" with { type: "json" };
import daAdv from "../da-advanced-sql/results.json" with { type: "json" };

// Every table, statement and error the video shows, read from results.json
// files: what Postgres (PGlite, PostgreSQL 18, the engine the Analytics
// Engineer advanced SQL page's blocks run) and, for QUALIFY and
// approx_count_distinct, DuckDB returned for the statements in this video's
// check.mjs; and, for the figures it shares with Data Analyst Part 4, what
// da-advanced-sql's check.mjs ran, so a table both series show is the same
// table. The SQL printed on screen is the SQL in those files, so a listing
// cannot drift from what ran. Pure (no Remotion, no DOM).

export const VIDEO = "ae-advanced-sql";

/**
 * Whether public/images/ae-advanced-sql/ holds the watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

type Value = string | number | boolean | null;
type Step = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type Figure = { setup: string; steps: Record<string, Step>; version: string };
type Source = { figures: unknown };
const figuresOf = (r: Source) => r.figures as Record<string, Figure>;
const SOURCES = { own, daAdv } as const satisfies Record<string, Source>;
type From = keyof typeof SOURCES;

/** A value as a SQL client prints it. */
const shown = (v: Value): string => (v === null ? "null" : String(v));

export type Table = { cols: string[]; rows: string[][] };
export type Query = Table & { lines: string[] };
export type Refusal = { lines: string[]; kind: string; message: string };

const step = (from: From, figure: string, id: string): Step => {
  const s = figuresOf(SOURCES[from])[figure]?.steps[id];
  if (!s) throw new Error(`${from} results.json has no step ${id} in ${figure}`);
  return s;
};

/** A result, as rows of printed cells in its column order. */
const table = (from: From, figure: string, id: string): Table => {
  const s = step(from, figure, id);
  if (!s.ok || !s.columns || !s.rows) throw new Error(`${from} ${figure}.${id} is not a result: ${s.error ?? s.sql}`);
  return { cols: s.columns, rows: s.rows.map((r) => r.map(shown)) };
};

/** A statement as it is printed, one string per line, with its result. */
const query = (from: From, figure: string, id: string): Query => ({ lines: step(from, figure, id).sql.split("\n"), ...table(from, figure, id) });

/** A statement the engine refused: its SQL, and its error split into the
 *  kind ("ERROR") and the message, as Postgres printed it. */
const refused = (from: From, figure: string, id: string): Refusal => {
  const s = step(from, figure, id);
  if (s.ok || !s.error) throw new Error(`${from} ${figure}.${id} did not fail: ${s.sql}`);
  const [kind, ...rest] = s.error.split(": ");
  return { lines: s.sql.split("\n"), kind, message: rest.join(": ") };
};

/** One cell of a one-row result. */
const scalar = (from: From, figure: string, id: string, col: number | string = 0) => {
  const t = table(from, figure, id);
  return t.rows[0][typeof col === "number" ? col : t.cols.indexOf(col)];
};

/** The cell in column `col` of the row whose first cell is `key`. */
const cell = (t: Table, key: string, col: string) => {
  const row = t.rows.find((r) => r[0] === key);
  if (!row) throw new Error(`no row ${key}`);
  return row[t.cols.indexOf(col)];
};

/** Two results that must say the same thing. */
const same = (a: Table, b: Table, what: string) => {
  if (JSON.stringify(a.rows) !== JSON.stringify(b.rows)) throw new Error(`${what}: the results differ`);
};

// ── 1, 2, 3. Windows (DA Part 4's six sales) ────────────────────────────────

export const WINDOW = {
  sales: table("daAdv", "window", "table"),
  grouped: query("daAdv", "window", "grouped"),
  windowed: query("daAdv", "window", "windowed"),
  /** OVER (), OVER (PARTITION BY region), OVER (PARTITION BY region ORDER BY day). */
  parts: query("own", "window", "parts"),
  /** GROUP BY region with SUM(SUM(amount)) OVER (): 1,065 on both rows. */
  share: query("own", "window", "share"),
  /** The same window without the outer SUM: Postgres refuses. */
  shareBare: refused("own", "window", "shareBare"),
};
export const GRAND_TOTAL = cell(WINDOW.share, "North", "grand_total");
export const NORTH_PCT = cell(WINDOW.share, "North", "pct");

// ── 4, 5. The latest record per key, and QUALIFY (the page's table) ─────────

const latest = query("own", "latest", "latest");
export const LATEST = {
  rows: Number(scalar("own", "latest", "counts", "rows")),
  customers: Number(scalar("own", "latest", "counts", "customers")),
  query: latest,
  kept: latest.rows.length,
  inWhere: refused("own", "latest", "inWhere"),
  groupMax: query("own", "latest", "groupMax"),
  distinctOn: query("own", "latest", "distinctOn"),
  /** Customer 3's rows, with the video's own tie at 2024-05-18 16:45:00. */
  tieRows: table("own", "tie", "three"),
  tieRank: query("own", "tie", "rank"),
  tieRankCount: Number(scalar("own", "tie", "rankCount")),
  tieRowNumberCount: Number(scalar("own", "tie", "rowNumberCount")),
};
same(
  { cols: [], rows: LATEST.distinctOn.rows },
  { cols: [], rows: latest.rows },
  "DISTINCT ON against the page's ROW_NUMBER block",
);

const qualify = query("own", "qualify", "qualify");
export const QUALIFY = {
  /** The page's snippet, as Postgres refused it. */
  postgres: refused("own", "latest", "qualify"),
  /** The page's snippet in DuckDB (an ORDER BY added so it prints in key order). */
  duckdb: qualify,
  duckdbVersion: (own.figures.qualify as Figure).version,
  /** The engines the page names. */
  engines: ["Snowflake", "BigQuery", "Databricks", "DuckDB"],
};
same(qualify, latest, "QUALIFY in DuckDB against the subquery in Postgres");

// ── 6, 7. Running total, and ROWS against RANGE ─────────────────────────────

const running = query("own", "running", "running");
export const RUNNING = {
  query: running,
  last: running.rows.at(-1)![2],
  trailing: query("own", "running", "trailing"),
};
export const FRAME = {
  /** DA Part 4's four payments, two on January 2. */
  payments: table("daAdv", "frame", "table"),
  rows: query("daAdv", "frame", "rows"),
  range: query("daAdv", "frame", "range"),
  defaulted: query("daAdv", "frame", "defaulted"),
};
same(FRAME.range, FRAME.defaulted, "the default frame is RANGE");

// ── 8. Period over period (the page's months) ───────────────────────────────

const yoy = query("own", "lag", "yoy");
export const LAG = {
  mom: query("own", "lag", "mom"),
  yoy,
  january: { mom: cell(yoy, "2024-01-01", "mom_change"), yoy: cell(yoy, "2024-01-01", "yoy_change") },
  /** March 2023 deleted: what LAG(revenue, 12) compares each month with. */
  gap: query("own", "lagGap", "yoy"),
};

// ── 9, 10. Date spine, and generating dates (the page's logins) ─────────────

const spine = query("own", "spine", "spine");
export const SPINE = {
  without: query("own", "spine", "without"),
  spine,
  countStar: query("own", "spine", "countStar"),
  emptyDays: spine.rows.filter((r) => r[1] === "0").map((r) => r[0]),
  type: table("own", "spine", "type").rows[0][0],
  /** pg_typeof over generate_series from DATE bounds. */
  typeQuery: query("own", "spine", "type"),
  pageSeries: query("own", "spine", "pageSeries"),
};

// ── 11. COUNT(DISTINCT) ─────────────────────────────────────────────────────

export const DISTINCT = {
  daily: query("own", "distinct", "daily"),
  summed: scalar("own", "distinct", "summed"),
  whole: scalar("own", "distinct", "whole"),
  repeatUsers: scalar("own", "distinct", "repeat", "users"),
  extraCounts: scalar("own", "distinct", "repeat", "extra_counts"),
  approx: query("own", "approx", "both"),
};

// ── 12. Ratios (the video's own two days) ───────────────────────────────────

export const RATIO = {
  perDay: query("own", "ratio", "perDay"),
  averaged: query("own", "ratio", "averaged"),
  summed: query("own", "ratio", "summed"),
};

// ── Quick round ─────────────────────────────────────────────────────────────

export const RAPID = {
  zeroBare: refused("own", "divide", "bare"),
  zeroNullif: query("own", "divide", "nullif"),
  zeroCoalesce: query("own", "divide", "coalesce"),
  /** DA Part 4's four books, three rankings. */
  rank: query("own", "rank", "books"),
  /** DA Part 4's top two per category. */
  topRowNumber: query("daAdv", "topN", "rowNumber"),
  topRank: query("daAdv", "topN", "rank"),
  cte: query("own", "cte", "cte"),
  recursive: query("own", "cte", "recursive"),
  /** DA Part 4's org chart, people per level. */
  orgLevels: table("daAdv", "recursive", "levels"),
  pivotCase: query("own", "pivot", "pivotCase"),
  pivotFilter: query("own", "pivot", "pivotFilter"),
  pivotClause: refused("own", "pivot", "pivotClause"),
  /** Engines with a PIVOT clause, as the page names them. */
  pivotEngines: ["Snowflake", "BigQuery", "SQL Server", "DuckDB"],
  unpivot: query("own", "pivot", "unpivot"),
};
same(RAPID.pivotCase, RAPID.pivotFilter, "CASE WHEN and FILTER pivots");
same(RAPID.pivotCase, table("daAdv", "pivot", "pivot"), "this pivot and DA Part 4's");

export const POSTGRES_VERSION = (own.figures.window as Figure).version;

// ── Views the scenes draw, derived from the results above ───────────────────

/** Customer 3's rows, newest first, with the video's own tie (c4@x.com at
 *  the same second as c3@x.com): rank and row number computed from the
 *  order the engine printed them in. */
const TIE_EMAIL = "c4@x.com";
const three = LATEST.tieRows;
const at3 = three.cols.indexOf("updated_at");
export const CUSTOMER3 = {
  /** The page's three rows (the tie left out), numbered from the newest. */
  page: three.rows.filter((r) => !r.includes(TIE_EMAIL)).map((r, i) => [r[at3], r[three.cols.indexOf("email")], String(i + 1)]),
  /** All four rows, with RANK and ROW_NUMBER over updated_at DESC. */
  tie: three.rows.map((r, i) => [
    r[at3],
    r[three.cols.indexOf("email")],
    String(1 + three.rows.filter((o) => o[at3] > r[at3]).length),
    String(i + 1),
  ]),
  tieEmail: TIE_EMAIL,
};

/** The page's logins, (user_id, login_date), read from the setup that ran. */
const loginsSetup = (own.figures.spine as Figure).setup;
export const LOGINS = [...loginsSetup.matchAll(/\((\d+), DATE '([\d-]+)'\)/g)].map((m) => ({ user: m[1], day: m[2] }));
if (LOGINS.length !== Number(scalar("own", "distinct", "rows"))) throw new Error("the logins setup does not parse to its row count");

/** Each login day's distinct users, in the order they first log in that day. */
export const USERS_BY_DAY = DISTINCT.daily.rows.map((r) => ({
  day: r[0],
  users: [...new Set(LOGINS.filter((l) => l.day === r[0]).map((l) => l.user))],
  count: Number(r[1]),
}));
for (const d of USERS_BY_DAY) if (d.users.length !== d.count) throw new Error(`${d.day}: the setup and COUNT(DISTINCT) disagree`);
/** Users who logged in on more than one day. */
export const RETURNING = [...new Set(LOGINS.map((l) => l.user))].filter((u) => USERS_BY_DAY.filter((d) => d.users.includes(u)).length > 1);
if (String(RETURNING.length) !== DISTINCT.repeatUsers) throw new Error("returning users disagree with the run");

/** The months LAG(revenue, 12) compares with the wrong month once March 2023
 *  is gone: those whose comparison is not twelve months back. */
const monthsBack = (a: string, b: string) => (Number(a.slice(0, 4)) - Number(b.slice(0, 4))) * 12 + Number(a.slice(5, 7)) - Number(b.slice(5, 7));
export const LAG_WRONG = LAG.gap.rows
  .filter((r) => r[2] !== "null" && monthsBack(r[0], r[2]) !== 12)
  .map((r) => ({ month: r[0], with: r[2], change: r[3] }));
