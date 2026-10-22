import results from "./results.json" with { type: "json" };

// Every table, statement and message the video shows, read from
// results.json: what DuckDB v1.4.3 (DuckDB-Wasm 1.32.0, the engine the
// page's blocks run) returned for the statements in check.mjs, which wrote
// it. Each figure ran in a fresh database built by its own setup, and the SQL
// printed on screen is the SQL in that file, so a listing cannot drift from
// what ran. Pure (no Remotion, no DOM).

export const VIDEO = "da-sql";

/**
 * Whether public/images/da-sql/ holds the three watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
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

/** The one value of a one-row, one-column result. */
const scalar = (figure: string, id: string) => table(figure, id).rows[0][0];

// ── 1, 2. WHERE, HAVING, and the order a query runs in ─────────────────────

export const WHERE = {
  /** The page's 24 orders, region and amount, in the page's order. */
  orders: table("where", "table"),
  rows: Number(scalar("where", "rows")),
  totals: table("where", "totals"),
  aggregate: refused("where", "whereAggregate"),
  having: query("where", "having"),
  /** Rows of 100 or more: the count WHERE keeps. */
  bigRows: Number(scalar("where", "bigRows")),
  bigGroups: table("where", "bigGroups"),
  both: query("where", "both"),
};

// ── 3. Joins, and the left join that turns inner ────────────────────────────

export const JOINS = {
  customers: table("joins", "customers"),
  orders: table("joins", "orders"),
  inner: table("joins", "inner"),
  left: table("joins", "left"),
  right: table("joins", "right"),
  full: table("joins", "full"),
};

export const TRAP = {
  joined: table("leftTrap", "joined"),
  where: query("leftTrap", "whereRight"),
  on: query("leftTrap", "inOn"),
};

// ── 4. Fan-out ──────────────────────────────────────────────────────────────

export const FANOUT = {
  orders: table("fanout", "ordersTable"),
  items: table("fanout", "itemsTable"),
  revenue: scalar("fanout", "orders"),
  joined: table("fanout", "joined"),
  inflated: query("fanout", "inflated"),
  fixed: query("fanout", "fixed"),
};

// ── 5, 6. NULLs, and the three COUNTs ───────────────────────────────────────

export const NULLS = {
  orders: table("nulls", "table"),
  equals: query("nulls", "equalsNull"),
  isNull: query("nulls", "isNull"),
  counts: query("nulls", "counts"),
};

// ── 7. The anti-join ────────────────────────────────────────────────────────

export const ANTI = {
  customers: table("anti", "customers"),
  orders: table("anti", "orders"),
  notIn: query("anti", "notIn"),
  notExists: query("anti", "notExists"),
  leftNull: query("anti", "leftNull"),
};

// ── 8. DISTINCT ─────────────────────────────────────────────────────────────

export const DISTINCT = {
  orders: table("distinct", "ordersTable"),
  joined: table("distinct", "joined"),
  rows: query("distinct", "distinctRows"),
  sum: query("distinct", "sumDistinct"),
  truth: scalar("distinct", "truth"),
};

// ── 9, 10. CTEs and subqueries ──────────────────────────────────────────────

export const SUBQUERIES = {
  orders: table("subqueries", "ordersTable"),
  averages: table("subqueries", "averagesNamed"),
  /** Everyone's average, as the narration rounds it ("about sixty-two"). */
  overall: Number(scalar("subqueries", "overall")),
  uncorrelated: query("subqueries", "uncorrelated"),
  correlated: query("subqueries", "correlated"),
  cte: query("subqueries", "cte"),
};

// ── Rapid fire ──────────────────────────────────────────────────────────────

export const RAPID = {
  employees: table("rapid", "employees"),
  selfJoin: query("rapid", "selfJoin"),
  storeA: table("rapid", "storeA"),
  storeB: table("rapid", "storeB"),
  union: query("rapid", "union"),
  unionAll: query("rapid", "unionAll"),
  expected: table("rapid", "expected"),
  received: table("rapid", "received"),
  except: query("rapid", "except"),
  caseSizes: query("rapid", "caseSizes"),
  caseEquals: query("rapid", "caseEqualsNull"),
  caseIs: query("rapid", "caseIsNull"),
  coalesce: query("rapid", "coalesceNullif"),
  dates: query("rapid", "dates"),
  strings: query("rapid", "strings"),
  users: table("rapid", "users"),
  emailIndex: table("rapid", "emailIndex"),
  duplicates: query("rapid", "duplicates"),
  rowNumbers: table("rapid", "rowNumbers"),
  dedupe: query("rapid", "dedupe"),
  afterDedupe: table("rapid", "afterDedupe"),
  products: table("rapid", "products"),
  regions: table("rapid", "regions"),
  cross: Number(scalar("rapid", "crossJoin")),
  crossThousand: Number(scalar("rapid", "crossJoinThousand")),
  rollup: query("rollup", "rollup"),
  groupByAll: query("rollup", "groupByAll"),
};

export const VERSION = FIGURES.where.version;
