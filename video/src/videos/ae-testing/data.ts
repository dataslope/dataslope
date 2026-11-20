import results from "./results.json" with { type: "json" };

// Every table, query, count and verdict the video shows, read from
// results.json: what the site's Postgres (PGlite, PostgreSQL 18) returned for
// the statements in check.mjs, which wrote it, plus the page's own YAML and
// DAG as check.mjs read them. Pure (no Remotion, no DOM).

export const VIDEO = "ae-testing";

/**
 * Whether public/images/ae-testing/ holds the watercolors from
 * illustrations.json. Phase 2 sets it once they are generated; every frame
 * is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

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

/** A test: the query it runs, printed, and the rows it returned (none is a pass). */
export type Test = { sql: string[]; result: Table; passes: boolean };
const test = (figure: string, id: string): Test => {
  const result = table(figure, id);
  return { sql: lines(figure, id), result, passes: result.rows.length === 0 };
};

/** "3,569.50". */
export const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const POSTGRES = FIGURES.unique.version;

// ── Opening, 1 and 2. The page's uniqueness block ───────────────────────────

export const UNIQUE = {
  /** The page's 24 rows, in its order. */
  table: table("unique", "table"),
  rows: scalar("unique", "rows", "rows"),
  orders: scalar("unique", "rows", "orders"),
  /** The page's starter query, as written. */
  test: test("unique", "test"),
  everyRow: scalar("unique", "revenue", "every_row"),
  onePerOrder: scalar("unique", "revenue", "one_per_order"),
  tooHigh: scalar("unique", "revenue", "too_high"),
  /** Rows in the table after the test ran: unchanged. */
  after: scalar("unique", "after"),
};
/** The duplicated keys, from the test's own result: [2, 11, 19]. */
export const DUPLICATES = UNIQUE.test.result.rows.map((r) => Number(r[0]));

// ── 3, 4. The four built-in tests, and a singular test ──────────────────────

const builtins = results.figures.builtins as unknown as Figure & { yaml: string; singularFile: string };
export const BUILTINS = {
  /** The page's schema.yml for fct_orders. */
  yaml: builtins.yaml.split("\n"),
  /** The video's own eight rows, and the customer dimension. */
  table: table("builtins", "table"),
  dim: table("builtins", "dim"),
  unique: test("builtins", "unique"),
  notNull: test("builtins", "notNull"),
  acceptedValues: test("builtins", "acceptedValues"),
  relationships: test("builtins", "relationships"),
  /** The page's tests/assert_no_negative_amounts.sql, as the page writes it
   *  (with its ref()), and as it ran. */
  singularFile: builtins.singularFile.split("\n"),
  singular: test("builtins", "singular"),
};

// ── 5. A compound key ───────────────────────────────────────────────────────

const compound = results.figures.compound as unknown as Figure & { yaml: string };
export const COMPOUND = {
  table: table("compound", "table"),
  /** unique on order_id alone: orders 1 and 3, three rows each. */
  orderOnly: test("compound", "orderOnly"),
  /** Grouped by order_id and line_number: (3, 2), twice. */
  pair: test("compound", "pair"),
  /** The page's dbt_utils.unique_combination_of_columns YAML. */
  yaml: compound.yaml.split("\n"),
};

// ── 6. Source freshness ─────────────────────────────────────────────────────

const freshness = results.figures.freshness as unknown as Figure & { yaml: string };
export type FreshnessCheck = { checkedAt: string; age: string; hours: number; verdict: "pass" | "warn" | "error" };
export const FRESHNESS = {
  /** The page's sources YAML: warn after 6 hours, error after 12. */
  yaml: freshness.yaml.split("\n"),
  warnHours: 6,
  errorHours: 12,
  newest: table("freshness", "newest").rows[0][0],
  checks: table("freshness", "checks").rows.map(
    ([checkedAt, age, verdict]): FreshnessCheck => ({
      checkedAt,
      age,
      hours: Number(age.split(":")[0]),
      verdict: verdict as FreshnessCheck["verdict"],
    }),
  ),
  /** The four tests on the same stale rows: all empty. */
  tests: {
    unique: test("freshness", "unique"),
    notNull: test("freshness", "notNull"),
    acceptedValues: test("freshness", "acceptedValues"),
    relationships: test("freshness", "relationships"),
  },
};
if (!/warn_after: \{count: 6, period: hour\}[\s\S]*error_after: \{count: 12, period: hour\}/.test(freshness.yaml)) {
  throw new Error("the page's freshness thresholds are no longer 6 and 12 hours");
}

// ── 7, 8. CI on the page's DAG ──────────────────────────────────────────────

type Ci = {
  command: string;
  nodes: { name: string; source: boolean }[];
  edges: [string, string][];
  models: string[];
  selected: Record<string, string[]>;
};
const ci = results.figures.ci as unknown as Ci;
export const CI = {
  /** The page's slim-CI command, comment line first. */
  command: ci.command.split("\n"),
  nodes: ci.nodes,
  edges: ci.edges,
  models: ci.models,
  /** state:modified+ for a change to each model: it and its descendants. */
  selected: ci.selected,
  /** The change the video makes. */
  changed: "stg_customers",
};
export const CI_SELECTED = CI.selected[CI.changed];

// ── 9. Testing against observability ────────────────────────────────────────

export const OBSERVE = {
  /** Rows loaded per day: 30, then 20. */
  volume: table("observe", "volume").rows.map(([day, rows]) => ({ day, rows: Number(rows) })),
  dropPct: scalar("observe", "drop"),
  /** Failing rows per day for each test: zero every time. */
  tests: (["unique", "notNull", "acceptedValues", "relationships"] as const).map((id) => ({
    id,
    failing: table("observe", id).rows.map(([day, n]) => ({ day, failing: Number(n) })),
  })),
};

// ── 10. Testing that a metric is correct ────────────────────────────────────

/** The rows a setup inserted into `name`, as printed cells, read from the
 *  setup SQL that ran (results.json), so the figure's inputs are the run's. */
const inserted = (setup: string, name: string): string[][] => {
  const m = setup.match(new RegExp(`INSERT INTO ${name} VALUES ([^;]*);`));
  if (!m) throw new Error(`the setup inserts nothing into ${name}`);
  return [...m[1].matchAll(/\(([^()]*)\)/g)].map((t) => t[1].split(",").map((v) => v.trim().replace(/^'|'$/g, "")));
};
/** Each order beside each of its items: what the model's join produced. */
const joined = (orders: string[][], items: string[][]) =>
  orders.flatMap(([id, , amount]) => items.filter(([oid]) => oid === id).map(([, item]) => ({ order: id, amount, item })));

const metric = results.figures.metric as unknown as Figure & { modelSql: string };
export const METRIC = {
  /** The model's SQL: a join to the items, then a sum of the order amount. */
  modelSql: metric.modelSql.split("\n"),
  model: table("metric", "model"),
  revenue: Number(table("metric", "model").rows[0][1]),
  notNull: test("metric", "notNull"),
  /** The video's own bounds, 0 to 1,000. */
  range: test("metric", "range"),
  /** Against finance's ledger at a 1% tolerance: the day comes back. */
  reconcile: test("metric", "reconcile"),
  finance: Number(table("metric", "reconcile").rows[0][2]),
  /** The model's inputs, and the rows its join made: one per item. */
  orders: inserted(FIGURES.metric.setup, "orders"),
  items: inserted(FIGURES.metric.setup, "order_items"),
  joined: joined(inserted(FIGURES.metric.setup, "orders"), inserted(FIGURES.metric.setup, "order_items")),
};
export const UNIT_TEST = {
  /** One mocked order of 100.00 with three items, through the model's SQL. */
  actual: Number(table("unit", "actual").rows[0][1]),
  expected: Number(table("unit", "expected").rows[0][1]),
  /** The mocked inputs: one order, and its items. */
  orders: inserted(FIGURES.unit.setup, "orders"),
  items: inserted(FIGURES.unit.setup, "order_items"),
};
{
  // The joined rows sum to the revenue the model returned.
  const sum = METRIC.joined.reduce((s, r) => s + Number(r.amount), 0);
  if (Math.abs(sum - METRIC.revenue) > 1e-9) throw new Error(`the join's rows sum to ${sum}, not ${METRIC.revenue}`);
}

// ── The quick round ─────────────────────────────────────────────────────────

const quick = results.figures.quick as unknown as { contract: string; severity: string };
export const QUICK = {
  /** The page's contract YAML: enforced, a data_type per column. */
  contract: quick.contract.split("\n"),
  /** The page's severity YAML: a not_null at warn. */
  severity: quick.severity.split("\n"),
};
