import daSql from "../da-sql/results.json" with { type: "json" };
import results from "./results.json" with { type: "json" };

// Every plan, count, size and table the video shows, read from results.json:
// what the site's Postgres (PGlite, PostgreSQL 18) returned for the
// statements in check.mjs, which wrote it, plus one DuckDB plan. Question 5's
// users table and email index are Data Analyst Part 1's (da-sql/results.json),
// so the two series show the same figure. Pure (no Remotion, no DOM).

export const VIDEO = "de-sql-performance";

/**
 * Whether public/images/de-sql-performance/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

type Value = string | null;
type Step = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type Figure = { setup: string; steps: Record<string, Step>; version: string };
const FIGURES = results.figures as unknown as Record<string, Figure>;

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  if (!s.ok) throw new Error(`${figure}.${id} failed: ${s.error}`);
  return s;
};

export type Table = { cols: string[]; rows: string[][] };

/** A result, as rows of printed cells in its column order. */
const table = (figure: string, id: string): Table => {
  const s = step(figure, id);
  return { cols: s.columns ?? [], rows: (s.rows ?? []).map((r) => r.map((v) => (v === null ? "null" : v))) };
};

/** One cell of a one-row result, as a number. */
const scalar = (figure: string, id: string, col?: string) => {
  const t = table(figure, id);
  return Number(t.rows[0][col ? t.cols.indexOf(col) : 0]);
};

/** A statement as it is printed: its SQL, one string per line. */
const lines = (figure: string, id: string) => step(figure, id).sql.split("\n");

/**
 * A plan as Postgres printed it, one string per line, with each node's
 * "cost=…" and "width=…" trimmed (its estimated rows kept): "Seq Scan on
 * orders  (cost=0.00..19860.00 rows=20 width=26)" reads "Seq Scan on orders
 * (rows=20)". Nothing else is changed.
 */
const plan = (figure: string, id: string): string[] =>
  table(figure, id).rows.map((r) => r[0].replace(/cost=\S+ /, "").replace(/ width=\d+/, ""));

/** The statement a plan was made from, as the listing prints it: EXPLAIN
 *  ANALYZE over the query. The run's other options (TIMING, BUFFERS and
 *  SUMMARY OFF, COSTS OFF on some) only drop lines and fields. */
const explained = (figure: string, id: string) => {
  const [, ...query] = lines(figure, id);
  return [lines(figure, id)[0].startsWith("EXPLAIN (COSTS OFF)") ? "EXPLAIN" : "EXPLAIN ANALYZE", ...query];
};

/** The number after `key=` (or `key: `) on the plan line that holds `on`. */
export const planNumber = (planLines: readonly string[], on: string, key: string) => {
  const line = planLines.find((l) => l.includes(on));
  const m = line?.match(new RegExp(`${key}[=:]\\s*([\\d.]+)`));
  if (!m) throw new Error(`no ${key} on the plan line holding ${JSON.stringify(on)}`);
  return Number(m[1]);
};

/** "1,000,000". */
export const thousands = (n: number) => n.toLocaleString("en-US");

// ── Opening, and 1. A slow query ────────────────────────────────────────────

const slowPlan = plan("slow", "plan");
export const SLOW = {
  orders: scalar("slow", "sizes", "orders"),
  customers: scalar("slow", "customers"),
  firstDay: table("slow", "sizes").rows[0][2],
  lastDay: table("slow", "sizes").rows[0][3],
  query: explained("slow", "plan"),
  plan: slowPlan,
  /** Customer 42's orders, by id: where its rows sit in the table. */
  ids: table("slow", "query").rows.map((r) => Number(r[0])),
  kept: planNumber(slowPlan, "Seq Scan", "actual rows"),
  removed: planNumber(slowPlan, "Rows Removed", "Filter"),
  version: FIGURES.slow.version,
};

// ── 2. Reading a plan ───────────────────────────────────────────────────────

const stale = plan("explain", "stale");
const fresh = plan("explain", "fresh");
export const EXPLAIN = {
  pending: scalar("explain", "pending"),
  query: explained("explain", "stale"),
  stale,
  fresh,
  staleEstimate: planNumber(stale, "Seq Scan on orders", "rows"),
  staleActual: planNumber(stale, "Seq Scan on orders", "actual rows"),
  lookups: planNumber(stale, "Index Scan", "loops"),
  freshEstimate: planNumber(fresh, "Seq Scan on orders", "rows"),
};

// ── 3. Indexes ──────────────────────────────────────────────────────────────

const indexPlan = plan("index", "plan");
export const INDEX = {
  create: [table("index", "createShown").rows[0][0]],
  query: explained("index", "plan"),
  plan: indexPlan,
  /** The table's pages, and the ones customer 42's rows sit on. */
  pages: scalar("index", "pages"),
  pages42: table("index", "pages42").rows.map((r) => Number(r[0])),
  heapBlocks: planNumber(indexPlan, "Heap Blocks", "exact"),
  shipped: scalar("index", "shipped"),
  shippedQuery: explained("index", "shippedPlan"),
  shippedPlan: plan("index", "shippedPlan"),
  walNone: planNumber(plan("index", "walNone"), "WAL", "records"),
  walThree: planNumber(plan("index", "walThree"), "WAL", "records"),
};

// ── 4. Covering indexes ─────────────────────────────────────────────────────

const coverSizes = table("cover", "sizes");
const sizeOf = (name: string) => {
  const row = coverSizes.rows.find((r) => r[0] === name);
  if (!row) throw new Error(`no size for ${name}`);
  return { bytes: Number(row[1]), pretty: row[2] };
};
export const COVER = {
  /** Customer 42's rows, the two columns the query asks for. */
  rows: table("cover", "query"),
  include: lines("cover", "include"),
  query: explained("cover", "after"),
  before: plan("cover", "before"),
  after: plan("cover", "after"),
  plain: sizeOf("orders_customer_idx"),
  covering: sizeOf("orders_customer_amount_idx"),
};

// ── 5. Clustered and non-clustered ──────────────────────────────────────────

type DaFigure = { steps: Record<string, { columns: string[]; rows: (string | number)[][] }> };
const daRapid = (daSql.figures as unknown as Record<string, DaFigure>).rapid.steps;
const daTable = (id: string): Table => ({ cols: daRapid[id].columns, rows: daRapid[id].rows.map((r) => r.map(String)) });

export const CLUSTER = {
  /** Data Analyst Part 1's users table and its email index (DuckDB). */
  users: daTable("users"),
  emailIndex: daTable("emailIndex"),
  sql: [table("cluster", "clusterShown").rows[0][0]],
  pagesBefore: table("cluster", "pagesBefore").rows.map((r) => Number(r[0])),
  pagesAfter: table("cluster", "pagesAfter").rows.map((r) => Number(r[0])),
  planBefore: plan("cluster", "planBefore"),
  planAfter: plan("cluster", "planAfter"),
  /** The table's pages after CLUSTER rewrote it, and the page an order
   *  inserted afterwards lands on. */
  tablePages: scalar("cluster", "tablePages"),
  newPage: scalar("cluster", "newPage"),
};

// ── 6. Partition pruning ────────────────────────────────────────────────────

const fnPlan = plan("prune", "fnPlan");
export const PRUNE = {
  partitions: table("prune", "perPartition").rows.map((r) => ({ name: r[0], orders: Number(r[1]) })),
  march: explained("prune", "marchPlan"),
  marchPlan: plan("prune", "marchPlan"),
  marchSum: table("prune", "marchSum").rows[0][0],
  fn: explained("prune", "fnPlan"),
  fnPlan,
  /** How many partitions each plan scans. */
  fnScans: fnPlan.filter((l) => l.includes("Seq Scan on")).length,
  fnSum: table("prune", "fnSum").rows[0][0],
};

// ── 7. Correlated subqueries ────────────────────────────────────────────────

const corrPlan = plan("corr", "correlatedPlan");
const duck = (results.figures as unknown as { corrDuck: { operators: string[]; version: string } }).corrDuck;
export const CORR = {
  employees: scalar("corr", "rows", "employees"),
  departments: scalar("corr", "rows", "departments"),
  correlated: explained("corr", "correlatedPlan"),
  correlatedPlan: corrPlan,
  loops: planNumber(corrPlan, "Seq Scan on employees e2", "loops"),
  perLoop: planNumber(corrPlan, "Seq Scan on employees e2", "actual rows") + planNumber(corrPlan, "Rows Removed", "Filter"),
  rewrite: lines("corr", "rewrite"),
  rewritePlan: plan("corr", "rewritePlan"),
  differ: scalar("corr", "differ"),
  duckOps: duck.operators,
  duckVersion: duck.version,
};

// ── 8. Joining two large tables ─────────────────────────────────────────────

const decPlan = plan("join", "decemberPlan");
export const JOIN = {
  december: explained("join", "decemberPlan"),
  decemberPlan: decPlan,
  allPlan: plan("join", "allPlan"),
  probe: planNumber(decPlan, "Seq Scan on orders", "actual rows"),
  build: planNumber(decPlan, "Seq Scan on customers", "actual rows"),
  allProbe: planNumber(plan("join", "allPlan"), "Seq Scan on orders", "actual rows"),
};

// ── 10. Materialized views ──────────────────────────────────────────────────

export const MV = {
  create: lines("mv", "create"),
  days: scalar("mv", "rows"),
  day: explained("mv", "dayPlan"),
  dayPlan: plan("mv", "dayPlan"),
  basePlan: plan("mv", "basePlan"),
  view: table("mv", "day"),
  insert: lines("mv", "insert"),
  stale: table("mv", "stale"),
  truth: table("mv", "truth"),
  refresh: lines("mv", "refresh"),
  fresh: table("mv", "fresh"),
};
