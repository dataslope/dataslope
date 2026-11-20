import results from "./results.json" with { type: "json" };

// Every table, query and total the video shows, read from results.json: what
// the site's Postgres (PGlite, PostgreSQL 18) returned for the statements in
// check.mjs, which wrote it, plus the page's MetricFlow YAML as check.mjs
// read it. Pure (no Remotion, no DOM).

export const VIDEO = "ae-metrics";

/**
 * Whether public/images/ae-metrics/ holds the watercolors from
 * illustrations.json. Phase 2 sets it once they are generated; every frame
 * is laid out with room for them either way.
 */
export const ILLUSTRATIONS = false;

type Value = string | number | null;
type Step = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type Figure = { setup: string; steps: Record<string, Step>; version: string };
const FIGURES = results.figures as unknown as Record<string, Figure>;

/** A step that must have run. */
const ran = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  if (!s.ok) throw new Error(`${figure}.${id} failed: ${s.error}`);
  return s;
};

export type Table = { cols: string[]; rows: string[][] };

/** A result as rows of printed cells, in its column order ("null" for NULL). */
const table = (figure: string, id: string): Table => {
  const s = ran(figure, id);
  return { cols: s.columns ?? [], rows: (s.rows ?? []).map((r) => r.map((v) => (v === null ? "null" : String(v)))) };
};

/** One cell of a one-row result, as a number. */
const scalar = (figure: string, id: string, col?: string) => {
  const t = table(figure, id);
  return Number(t.rows[0][col ? t.cols.indexOf(col) : 0]);
};

/** A statement as it is printed: one string per line. */
const lines = (figure: string, id: string) => ran(figure, id).sql.split("\n");

/** A query on screen and what it returned. */
export type Run = { sql: string[]; result: Table };
const run = (figure: string, id: string): Run => ({ sql: lines(figure, id), result: table(figure, id) });

/** "4,555.25". */
export const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const POSTGRES = FIGURES.fan.version;

// ── Opening, 1, 2, 3 and 6. The page's orders and items ─────────────────────

export const FAN = {
  /** The page's twelve orders and twenty-four items. */
  orders: table("fan", "orders"),
  items: table("fan", "items"),
  /** Dashboard one: orders alone. */
  revenue: scalar("fan", "revenue", "revenue"),
  orderCount: scalar("fan", "revenue", "orders"),
  /** Dashboard two: the page's own query, as written. */
  page: run("fan", "page"),
  inflated: scalar("fan", "page"),
  joinedRows: scalar("fan", "joinedRows"),
  times: scalar("fan", "multiple"),
  /** Orders 1 and 2: their four joined rows, 150.00 and 350.00. */
  firstTwo: run("fan", "firstTwo"),
  firstTwoRevenue: scalar("fan", "firstTwoSums", "revenue"),
  firstTwoJoined: scalar("fan", "firstTwoSums", "joined"),
  /** Each order's amount, its item count and what the join counted. */
  perOrder: table("fan", "perOrder").rows.map(([order, amount, items, counted]) => ({
    order: Number(order),
    amount: Number(amount),
    items: Number(items),
    counted: Number(counted),
  })),
  /** The four tests the opening shows passing: each returned no rows. */
  tests: (["testUnique", "testNotNull", "testItemsNotNull", "testRelationships"] as const).map((id) => ({
    id,
    sql: lines("fan", id),
    passes: table("fan", id).rows.length === 0,
  })),
};

export const FIX = {
  /** The page's "aggregate each grain independently" listing, as written. */
  page: run("fan", "fix"),
  revenue: scalar("fan", "fix", "revenue"),
  units: scalar("fan", "fix", "units"),
  /** After the join: COUNT(DISTINCT order_id) and SUM(qty). */
  afterJoin: run("fan", "afterJoin"),
  distinctOrders: scalar("fan", "afterJoin", "orders"),
};

/** Question 6: revenue and units by order, each summed at its own grain. */
export const BY_ORDER = {
  query: run("fan", "byOrder"),
  orders: scalar("fan", "byOrderTotals", "orders"),
  revenue: scalar("fan", "byOrderTotals", "revenue"),
  units: scalar("fan", "byOrderTotals", "units"),
};

// ── 4. The chasm trap ───────────────────────────────────────────────────────

export const CHASM = {
  payments: table("chasm", "payments"),
  refunds: table("chasm", "refunds"),
  paid: scalar("chasm", "truth", "paid"),
  refunded: scalar("chasm", "truth", "refunded"),
  /** Ada's six joined rows. */
  joined: run("chasm", "joined"),
  trap: run("chasm", "trap"),
  /** Totalled per branch, joined with inner joins: Ada only. */
  fixInner: run("chasm", "fixInner"),
  /** The same with left joins: Ada, and Ben at 40.00 and 0.00. */
  fix: run("chasm", "fix"),
};

// ── 7, 8. Non-additive metrics ──────────────────────────────────────────────

export const DISTINCT = {
  /** Distinct products per order, stored. */
  summary: table("distinct", "summary"),
  summed: scalar("distinct", "summed"),
  recount: run("distinct", "recount"),
  products: scalar("distinct", "recount"),
  /** How many orders each product is in: A in 5. */
  perProduct: table("distinct", "perProduct").rows.map(([item, orders]) => ({ item, orders: Number(orders) })),
};

export const RATIO = {
  /** Data Analyst Part 8's two days, run again: 5 of 10, 20 of 1,000. */
  days: table("ratio", "table"),
  averaged: run("ratio", "averaged"),
  averagedPct: scalar("ratio", "averaged"),
  pooled: run("ratio", "pooled"),
  pooledPct: scalar("ratio", "pooled"),
  conversions: scalar("ratio", "parts", "conversions"),
  sessions: scalar("ratio", "parts", "sessions"),
};

// ── Quick. The page's MetricFlow definition ─────────────────────────────────

export const METRICFLOW_YAML = results.definitions.metricflow.split("\n");
