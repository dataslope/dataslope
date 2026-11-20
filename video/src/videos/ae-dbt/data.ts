import results from "./results.json" with { type: "json" };

// Every graph, plan, count and listing the ae-dbt video shows, read from
// results.json, which check.mjs wrote. dbt does not run here: the graph is the
// page's own lineage slice and exposure, read out of dbt.mdx, with its build
// order and selections worked out from those edges; the materializations ran
// on the site's Postgres (PGlite, PostgreSQL 18) on the warehousing page's
// dim_customer; the listings are the page's, verbatim. Pure (no Remotion, no
// DOM).

export const VIDEO = "ae-dbt";

/**
 * Whether public/images/ae-dbt/ holds the watercolors from illustrations.json.
 * Phase 2 generates them; until then every frame is laid out with room for
 * them either way.
 */
export const ILLUSTRATIONS = false;

type Value = string | number | null;
type Ok = { sql: string; ok: true; columns: string[]; rows: Value[][] };
type Err = { sql: string; ok: false; error: string };
type Step = Ok | Err;
type Figure = { setup: string; version: string; steps: Record<string, Step> };

type Selection = { selector: string; models: string[]; sources: string[]; exposures: string[] };

const R = results as unknown as {
  graph: {
    sources: string[];
    models: string[];
    exposure: { name: string; dependsOn: string[] };
    edges: [string, string][];
    waves: string[][];
    selections: Selection[];
    selectorsListing: string;
  };
  materializations: Record<"view" | "table" | "tableRebuilt", Figure>;
  macro: Figure;
  listings: Record<"fctOrders" | "sourceLine" | "ephemeral" | "macro" | "packages" | "varsModel" | "varsCli" | "exposure" | "selectors", string>;
  modelSql: string;
  postgres: string[];
};

const ok = (fig: Figure, id: string): Ok => {
  const s = fig.steps[id];
  if (!s?.ok) throw new Error(`${id} did not run`);
  return s;
};
const one = (fig: Figure, id: string) => Number(ok(fig, id).rows[0][0]);

/** A listing, one string per line. */
export const lines = (sql: string) => sql.split("\n");

/** The Postgres the materializations ran on, for a small source note. */
export const POSTGRES = R.postgres[0];

// ── The graph (questions 2, 3, 4, 7, 8, 15) ─────────────────────────────────

/** The page's lineage slice and its exposure: 2 sources, 4 models, 5 edges,
 *  plus the dashboard's 2. Models in build order. */
export const GRAPH = {
  sources: R.graph.sources,
  models: R.graph.waves.flat(),
  exposure: R.graph.exposure,
  edges: R.graph.edges,
  /** Each model's build step: stg_orders and stg_customers together, then
   *  dim_customer, then fct_orders. */
  waves: R.graph.waves,
};

/** What a selector picks: the page's `+fct_orders` (all four models), and a
 *  trailing `+` on each model (what a change to it rebuilds). */
export const selection = (selector: string): Selection => {
  const s = R.graph.selections.find((x) => x.selector === selector);
  if (!s) throw new Error(`no selection ${selector} in results.json`);
  return s;
};

/** The page's three selectors, as its bash block prints them. */
export const SELECTORS = lines(R.graph.selectorsListing);

// ── The materializations (questions 1 and 5) ────────────────────────────────

/** The model: the warehousing page's dim_customer SELECT. */
export const MODEL_SQL = lines(R.modelSql);

/** A plan as Postgres printed it, its "actual rows=12.00" read as "rows=12". */
const plan = (fig: Figure, id: string) =>
  ok(fig, id).rows.map((r) => String(r[0]).replace(/actual rows=(\d+)\.00 loops=1/, "rows=$1"));

const view = R.materializations.view;
const table = R.materializations.table;
export const MATERIALIZE = {
  /** The page's log: 24 events, 12 customers. */
  events: Number(ok(view, "events").rows[0][0]),
  customers: Number(ok(view, "events").rows[0][1]),
  /** The statements the warehouse is asked to run, view and table. */
  createView: lines(ok(view, "create").sql),
  createTable: lines(ok(table, "create").sql),
  /** The view regroups every event on every read: HashAggregate (12) over a
   *  Seq Scan on customer_events (24). */
  viewPlan: plan(view, "plan"),
  /** The table reads its stored rows: Seq Scan on dim_customer (12). */
  tablePlan: plan(table, "plan"),
  /** The video's own new event, for a 13th customer. */
  newEvent: lines(ok(view, "arrive").sql),
  /** Customers after it lands: view 13, table 12, the table rebuilt 13. */
  viewAfter: one(view, "countAfter"),
  tableAfter: one(table, "countAfter"),
  tableRebuilt: one(R.materializations.tableRebuilt, "count"),
};

// ── The page's listings ─────────────────────────────────────────────────────

export const LISTING = Object.fromEntries(Object.entries(R.listings).map(([k, v]) => [k, lines(v)])) as Record<
  keyof typeof R.listings,
  string[]
>;

// ── 12. The macro ───────────────────────────────────────────────────────────

/** The page's cents_to_dollars on 1999 cents: 19.99; the same over a plain
 *  `100`: 19. */
export const MACRO = {
  expanded: String(ok(R.macro, "expanded").rows[0][0]),
  integer: String(ok(R.macro, "integer").rows[0][0]),
  expandedSql: lines(ok(R.macro, "expanded").sql),
  integerSql: lines(ok(R.macro, "integer").sql),
};
