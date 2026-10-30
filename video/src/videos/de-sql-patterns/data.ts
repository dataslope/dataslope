import own from "./results.json" with { type: "json" };
import daSql from "../da-sql/results.json" with { type: "json" };
import daAdv from "../da-advanced-sql/results.json" with { type: "json" };
import dsSql from "../ds-sql/results.json" with { type: "json" };

// Every table, statement and message the video shows, read from results.json
// files: what DuckDB v1.4.3 (DuckDB-Wasm 1.32.0, the engine the page's blocks
// run) returned for the statements in this video's check.mjs, and, for the
// figures it reuses, in da-sql's, da-advanced-sql's and ds-sql's, so a table
// two videos show is the same table. Each figure ran in a fresh database
// built by its own setup, and the SQL printed on screen is the SQL in that
// file, so a listing cannot drift from what ran. Pure (no Remotion, no DOM).

export const VIDEO = "de-sql-patterns";

/**
 * Whether public/images/de-sql-patterns/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

type Value = string | number | boolean | null;
type Step = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type Figure = { setup: string; steps: Record<string, Step>; version: string };
type Source = { figures: unknown };
const figuresOf = (r: Source) => r.figures as Record<string, Figure>;
const SOURCES = { own, daSql, daAdv, dsSql } as const satisfies Record<string, Source>;
type From = keyof typeof SOURCES;

/** A value as a SQL client prints it. */
const shown = (v: Value): string => (v === null ? "null" : String(v));

export type Table = { cols: string[]; rows: string[][] };
export type Query = Table & { lines: string[] };

const step = (from: From, figure: string, id: string): Step => {
  const s = figuresOf(SOURCES[from])[figure]?.steps[id];
  if (!s) throw new Error(`${from} results.json has no step ${id} in ${figure}`);
  return s;
};

/** A result, as rows of printed cells in its column order. */
const table = (from: From, figure: string, id: string): Table => {
  const s = step(from, figure, id);
  if (!s.ok || !s.columns || !s.rows) throw new Error(`${from} ${figure}.${id} is not a result: ${s.sql}`);
  return { cols: s.columns, rows: s.rows.map((r) => r.map(shown)) };
};

/** A statement as it is printed: its SQL, one string per line, and its result. */
const query = (from: From, figure: string, id: string): Query => ({ lines: step(from, figure, id).sql.split("\n"), ...table(from, figure, id) });

/** A statement the engine refused: its SQL and its error, split into the
 *  kind ("Binder Error") and the message. */
const refused = (from: From, figure: string, id: string) => {
  const s = step(from, figure, id);
  if (s.ok || !s.error) throw new Error(`${from} ${figure}.${id} did not fail: ${s.sql}`);
  const [kind, ...rest] = s.error.split(": ");
  return { lines: s.sql.split("\n"), kind, message: rest.join(": ") };
};

/** The one value of a one-row result's column. */
const scalar = (from: From, figure: string, id: string, col: number | string = 0) => {
  const t = table(from, figure, id);
  return t.rows[0][typeof col === "number" ? col : t.cols.indexOf(col)];
};

/** Rows of a result whose `col` lies between `lo` and `hi`, inclusive. */
const slice = (t: Table, col: string, lo: number, hi: number): Table => {
  const j = t.cols.indexOf(col);
  return { cols: t.cols, rows: t.rows.filter((r) => Number(r[j]) >= lo && Number(r[j]) <= hi) };
};

/** Two results that must say the same thing. */
const same = (a: Table, b: Table, what: string) => {
  if (JSON.stringify(a.rows) !== JSON.stringify(b.rows)) throw new Error(`${what}: the results differ`);
};

// ── The opening: user 1's logins, the page's daily_logins ───────────────────

const userOne = table("own", "islands", "userOne");
export const LOGINS = {
  /** User 1's login dates, "2024-01-01" … "2024-01-13". */
  days: userOne.rows.map((r) => r[0]),
  /** Their islands: start, end, length. */
  islands: table("own", "islands", "page").rows.filter((r) => r[0] === "1").map((r) => ({ start: r[1], end: r[2], days: Number(r[3]) })),
};

// ── 1, 2, 3. Ranking, the latest row, QUALIFY ───────────────────────────────

const ranks = query("own", "rank", "ordered");
export const RANK = {
  /** The page's query, as the page prints it. */
  lines: step("own", "rank", "page").sql.split("\n"),
  rows: ranks.rows.length,
  /** Rows 11 to 17 by row number: Sara's 85, the four 80s, Frank's 78. */
  ties: slice(ranks, "rn", 11, 17),
};

const subquery = query("own", "latest", "subquery");
const qualify = query("own", "latest", "qualify");
same(subquery, qualify, "the subquery and QUALIFY");
export const LATEST = {
  events: Number(scalar("own", "latest", "rows", "events")),
  users: Number(scalar("own", "latest", "rows", "users")),
  /** The first three users' events, numbered from the newest. */
  numbered: table("own", "latest", "numbered"),
  subquery,
  qualify,
  /** The video's own tie: user 3's events with a second one at their latest
   *  moment, and how many rows RANK and ROW_NUMBER then keep. */
  userThree: table("own", "latestTie", "userThreeRanks"),
  rankKept: table("own", "latestTie", "rank").rows.length,
  rowNumberKept: table("own", "latestTie", "rowNumber").rows.length,
  rankUserThree: table("own", "latestTie", "rank").rows.filter((r) => r[0] === "3").length,
};

// ── 4, 5. The order a query runs in, WHERE and HAVING (da-sql's) ────────────

export const WHERE = {
  /** The DA page's 24 orders, region and amount, in the page's order. */
  orders: table("daSql", "where", "table"),
  rows: Number(scalar("daSql", "where", "rows")),
  /** Rows over 100: the count WHERE keeps. */
  bigRows: Number(scalar("daSql", "where", "bigRows")),
  bigGroups: table("daSql", "where", "bigGroups"),
  both: query("daSql", "where", "both"),
  aggregate: refused("daSql", "where", "whereAggregate"),
};

// ── 6. Window frames (da-advanced-sql's) ────────────────────────────────────

export const FRAME = {
  /** Its four payments, two on January 2. */
  payments: table("daAdv", "frame", "table"),
  rows: query("daAdv", "frame", "rows"),
  range: query("daAdv", "frame", "range"),
};

// ── 7, 8. A moving average over days with gaps, and the spine ───────────────

const rowsFrame = query("own", "moving", "rows");
const rangeFrame = query("own", "moving", "range");
const filledAvg = query("own", "spine", "filledAvg");
/** One row of a result by its first cell. */
const rowOf = (t: Table, first: string): Record<string, string> => {
  const r = t.rows.find((row) => row[0] === first);
  if (!r) throw new Error(`no row ${first}`);
  const row: Record<string, string> = Object.fromEntries(t.cols.map((c, j) => [c, r[j]]));
  // ROUND(x, 1) on a DOUBLE: a client prints 95.0, where JSON kept 95.
  return { ...row, avg_7: Number(row.avg_7).toFixed(1) };
};
const LAST_DAY = "2024-01-13";
export const MOVING = {
  /** The video's own metric on user 1's login days. */
  days: table("own", "moving", "table"),
  /** The page's query, as it prints (ordered). */
  page: query("own", "moving", "page"),
  /** The frame clause each figure ran with. */
  rowsClause: rowsFrame.lines.find((l) => l.includes("ROWS BETWEEN"))!.trim(),
  rangeClause: rangeFrame.lines.find((l) => l.includes("RANGE BETWEEN"))!.trim(),
  /** The 13th under each frame: average, first day, rows in it. */
  last: {
    rows: rowOf(rowsFrame, LAST_DAY),
    range: rowOf(rangeFrame, LAST_DAY),
    spine: rowOf(filledAvg, LAST_DAY),
  },
};

export const SPINE = {
  /** The page's own spine query, which DuckDB refuses as written. */
  page: refused("own", "spine", "pageSpine"),
  joined: query("own", "spine", "joined"),
  gaps: table("own", "spine", "gaps").rows.map((r) => r[0]),
  filled: query("own", "spine", "filled"),
  filledAvg,
};

// ── 9. Gaps and islands ─────────────────────────────────────────────────────

export const ISLANDS = {
  /** The page's query, as the page prints it. */
  page: query("own", "islands", "page"),
  logins: Number(scalar("own", "islands", "counts", "logins")),
  /** User 1's logins, numbered, with the key the query groups by. */
  keys: table("own", "islands", "userOne"),
  /** User 1's islands from the page's query. */
  userOne: { cols: table("own", "islands", "page").cols, rows: table("own", "islands", "page").rows.filter((r) => r[0] === "1") },
  /** The same with the video's own second login on January 2. */
  dupKeys: table("own", "islandsDup", "userOne"),
  dupIslands: { cols: table("own", "islandsDup", "page").cols, rows: table("own", "islandsDup", "page").rows.filter((r) => r[0] === "1") },
  dedupedIslands: { cols: table("own", "islandsDup", "deduped").cols, rows: table("own", "islandsDup", "deduped").rows.filter((r) => r[0] === "1") },
  /** The fix's FROM, as it ran. */
  dedupedFrom: query("own", "islandsDup", "deduped").lines.find((l) => l.includes("SELECT DISTINCT"))!.trim(),
};
same(ISLANDS.userOne, ISLANDS.dedupedIslands, "deduplicated islands");

// ── 10. Rows in one table but not another (da-sql's, plus EXCEPT) ───────────

export const ANTI = {
  customers: table("daSql", "anti", "customers"),
  orders: table("daSql", "anti", "orders"),
  notIn: query("daSql", "anti", "notIn"),
  notExists: query("daSql", "anti", "notExists"),
  leftNull: query("daSql", "anti", "leftNull"),
  except: query("own", "anti", "except"),
};
if (query("own", "anti", "notIn").rows.length !== ANTI.notIn.rows.length) throw new Error("NOT IN disagrees with da-sql's");

// ── 11. A recursive CTE ─────────────────────────────────────────────────────

export const RECURSIVE = {
  employees: table("own", "recursive", "table"),
  /** The page's query, as the page prints it, on the video's own staff. */
  page: query("own", "recursive", "page"),
  levels: table("own", "recursive", "levels"),
  /** The cap on a walk of a loop, and the deepest row it reached. */
  cap: step("own", "recursive", "loop").sql.split("\n").map((l) => l.trim()).find((l) => l.startsWith("WHERE t.depth"))!,
  capped: Number(scalar("own", "recursive", "loop", "deepest")),
};

// ── At speed ────────────────────────────────────────────────────────────────

const rowNumbers = table("daSql", "rapid", "rowNumbers");
const pageRunning = table("own", "cte", "running");
const runningOne = table("own", "cte", "runningOne");
same({ cols: runningOne.cols, rows: pageRunning.rows.filter((r) => r[0] === "1").map((r) => r.slice(1)) }, runningOne, "the running total on user 1");
export const RAPID = {
  // 12. Duplicates (da-sql's).
  users: table("daSql", "rapid", "users"),
  duplicates: query("daSql", "rapid", "duplicates"),
  rowNumbers,
  // 13. A CTE against a subquery, on the page's orders.
  subquery: query("own", "cte", "subquery"),
  cte: query("own", "cte", "cte"),
  // 14. UNION (da-sql's).
  storeA: table("daSql", "rapid", "storeA"),
  storeB: table("daSql", "rapid", "storeB"),
  union: query("daSql", "rapid", "union"),
  unionAll: query("daSql", "rapid", "unionAll"),
  // 15. LAG and LEAD.
  lag: query("own", "lag", "both"),
  // 16. The page's running total, and ds-sql's tie under the default frame.
  running: query("own", "cte", "runningOne"),
  tied: query("dsSql", "ties", "running"),
  // 17. Pivoting (ds-sql's), and DuckDB's PIVOT clause on the same table.
  pivot: query("dsSql", "pivot", "pivot"),
  pivotClause: step("own", "pivot", "pivot").sql.replace(/ GROUP BY.*/, ""),
  // 18. The four joins (da-sql's).
  joins: {
    inner: table("daSql", "joins", "inner"),
    left: table("daSql", "joins", "left"),
    right: table("daSql", "joins", "right"),
    full: table("daSql", "joins", "full"),
  },
  // 19. NTILE (da-advanced-sql's).
  quartiles: query("daAdv", "ntile", "quartiles"),
  quartileSizes: table("daAdv", "ntile", "quartileSizes"),
  fifthSizes: table("daAdv", "ntile", "fifthSizes"),
  // 20. PERCENT_RANK and CUME_DIST on the page's own values.
  percent: query("own", "percent", "both"),
  // 21. COALESCE.
  contacts: table("own", "coalesce", "table"),
  coalesce: query("own", "coalesce", "page"),
  nullif: query("own", "coalesce", "nullif"),
  // 22. CROSS JOIN (da-sql's).
  products: table("daSql", "rapid", "products"),
  regions: table("daSql", "rapid", "regions"),
  cross: Number(scalar("daSql", "rapid", "crossJoin")),
};

export const RUNTIME = `DuckDB ${figuresOf(own).rank.version}`;
