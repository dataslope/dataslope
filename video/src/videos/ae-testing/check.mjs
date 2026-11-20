// Runs every query the ae-testing video shows on the site's Postgres engine
// (PGlite, PostgreSQL 18, through scripts/lib/sql-engines.mjs by way of
// video/scripts/lib/pg-figure.mjs: the engine the testing page's block runs
// in the reader's browser) and writes what came back to results.json, which
// data.ts reads. From the repo root:
//
//   node video/src/videos/ae-testing/check.mjs
//
// dbt does not run here. A dbt test is a query that returns the rows that
// break an assumption, so what the video shows of a test is that query, run:
//   - the page's own SQL wherever the page gives it, read from the page so the
//     video and the page cannot drift: its uniqueness block (initSql and
//     starterCode, as written), and its singular test with the ref() compiled
//     to the table name;
//   - for the other built-in tests, the query each one compiles to, written in
//     the same "roughly" shape the page uses for unique: not_null returns the
//     rows where the column is null, accepted_values the rows whose value is
//     not in the list, relationships the rows with no match in the parent;
//   - dbt_utils.unique_combination_of_columns as the page describes its
//     singular equivalent ("groups by the column set and returns rows with a
//     count above 1"), and accepted_range and the reconciliation as the
//     page's "Testing that a metric is correct" describes them.
// The CI selection is not SQL: it is a walk of the page's own DAG (dbt.mdx's
// mermaid figure), parsed below, for state:modified+.
//
// Every table other than the page's is the video's own, marked so below and
// in script.ts. Each figure runs in a fresh database. Two runs write
// identical files: nothing reads the clock (the freshness checks are pinned
// to fixed times) and nothing is random.
/* global console, process, URL */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { figure } from "../../../scripts/lib/pg-figure.mjs";

const page = (name) =>
  readFileSync(new URL(`../../../../content/interview/analytics-engineer/${name}.mdx`, import.meta.url), "utf8");
const TESTING = page("testing-and-data-quality");
const DBT = page("dbt");

/** A template-literal prop of the page's one SqlCodeBlock. */
const prop = (mdx, name) => {
  const m = mdx.match(new RegExp(`${name}=\\{\`([\\s\\S]*?)\`\\}`));
  if (!m) throw new Error(`the page has no ${name}`);
  return m[1];
};

/** A fenced block of the page, found by its first line. */
const fence = (mdx, firstLine) => {
  const m = mdx.match(new RegExp("```[a-z]*\\n(" + firstLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?)\\n```"));
  if (!m) throw new Error(`the page has no block starting ${JSON.stringify(firstLine)}`);
  return m[1];
};

const results = { figures: {} };

// ── 1, 2. The page's uniqueness block, as written ───────────────────────────

const PAGE_INIT = prop(TESTING, "initSql");
const PAGE_UNIQUE = prop(TESTING, "starterCode");
results.figures.unique = await figure(PAGE_INIT, {
  // The 24 rows in the page's order, for the hook's table.
  table: "SELECT order_id, amount FROM fct_orders ORDER BY ctid;",
  rows: "SELECT COUNT(*) AS rows, COUNT(DISTINCT order_id) AS orders\nFROM fct_orders;",
  test: PAGE_UNIQUE,
  // The hook's "three hundred thirty-five dollars too high": every row
  // summed, against one row per order.
  revenue:
    "SELECT SUM(amount) AS every_row,\n  (SELECT SUM(amount) FROM (SELECT DISTINCT order_id, amount FROM fct_orders) d) AS one_per_order,\n  SUM(amount) - (SELECT SUM(amount) FROM (SELECT DISTINCT order_id, amount FROM fct_orders) d) AS too_high\nFROM fct_orders;",
  // A test reads; it changes nothing. The table after the test ran.
  after: "SELECT COUNT(*) AS rows FROM fct_orders;",
});

// ── 3, 4. The four built-in tests and a singular test ───────────────────────
//
// The video's own eight rows, one break for each test: order 3 twice, a row
// with no order_id, status 'returned' (not on the page's list), customer 99
// (not in dim_customer), and order 7 at -25.00 for the page's singular test.
// The tests are the page's YAML: unique and not_null on order_id,
// accepted_values on status with the page's four values, relationships from
// customer_id to dim_customer.

const BUILTINS = `CREATE TABLE dim_customer (customer_id INTEGER, name TEXT);
INSERT INTO dim_customer VALUES (10, 'Ada'), (11, 'Ben'), (12, 'Cy');
CREATE TABLE fct_orders (order_id INTEGER, status TEXT, customer_id INTEGER, amount DECIMAL(8,2));
INSERT INTO fct_orders VALUES
  (1, 'placed', 10, 40.00),
  (2, 'shipped', 11, 25.00),
  (3, 'shipped', 12, 60.00),
  (3, 'shipped', 12, 60.00),
  (NULL, 'delivered', 10, 15.00),
  (5, 'returned', 11, 30.00),
  (6, 'delivered', 99, 55.00),
  (7, 'placed', 12, -25.00);`;

/** What each generic test compiles to, roughly; unique is the page's own. */
const COMPILED = {
  unique: "SELECT order_id, COUNT(*) AS n\nFROM fct_orders\nGROUP BY order_id\nHAVING COUNT(*) > 1;",
  notNull: "SELECT *\nFROM fct_orders\nWHERE order_id IS NULL;",
  acceptedValues:
    "SELECT *\nFROM fct_orders\nWHERE status NOT IN\n  ('placed', 'shipped', 'delivered', 'cancelled');",
  relationships:
    "SELECT o.*\nFROM fct_orders o\nLEFT JOIN dim_customer c\n  ON c.customer_id = o.customer_id\nWHERE o.customer_id IS NOT NULL\n  AND c.customer_id IS NULL;",
};
// The page's singular test, its ref() compiled to the table it names.
const SINGULAR_FILE = fence(TESTING, "-- tests/assert_no_negative_amounts.sql");
const SINGULAR = SINGULAR_FILE.split("\n")
  .filter((l) => !l.startsWith("--"))
  .join("\n")
  .replace("{{ ref('fct_orders') }}", "fct_orders");

results.figures.builtins = await figure(BUILTINS, {
  table: "SELECT order_id, status, customer_id, amount FROM fct_orders ORDER BY ctid;",
  dim: "SELECT customer_id, name FROM dim_customer ORDER BY customer_id;",
  ...COMPILED,
  singular: `${SINGULAR};`,
});
results.figures.builtins.yaml = fence(TESTING, "# models/schema.yml");
results.figures.builtins.singularFile = SINGULAR_FILE;

// ── 5. A compound key ───────────────────────────────────────────────────────
//
// The video's own order lines: order 1 has three lines, order 2 one, order 3
// two, and order 3's line 2 is there twice, the one real duplicate.

const LINES = `CREATE TABLE fct_order_lines (order_id INTEGER, line_number INTEGER, sku TEXT);
INSERT INTO fct_order_lines VALUES
  (1, 1, 'A'), (1, 2, 'B'), (1, 3, 'C'),
  (2, 1, 'D'),
  (3, 1, 'A'), (3, 2, 'E'), (3, 2, 'E');`;
results.figures.compound = await figure(LINES, {
  table: "SELECT order_id, line_number, sku FROM fct_order_lines ORDER BY ctid;",
  // A unique test on order_id alone: false failures on orders with lines.
  orderOnly: "SELECT order_id, COUNT(*) AS n\nFROM fct_order_lines\nGROUP BY order_id\nHAVING COUNT(*) > 1\nORDER BY order_id;",
  pair: "SELECT order_id, line_number, COUNT(*) AS n\nFROM fct_order_lines\nGROUP BY order_id, line_number\nHAVING COUNT(*) > 1;",
});
results.figures.compound.yaml = fence(TESTING, "- name: fct_order_lines");

// ── 6. Source freshness ─────────────────────────────────────────────────────
//
// The video's own raw orders, the newest loaded at 01:00 on 2 March 2026,
// against the page's thresholds (warn after 6 hours, error after 12). dbt
// compares the newest loaded_at with the time the check runs; here that time
// is pinned to three checks (04:00, 09:00, 14:00) so the run is repeatable.
// The four tests, run on the same stale rows, return nothing.

const RAW = `CREATE TABLE dim_customer (customer_id INTEGER);
INSERT INTO dim_customer VALUES (10), (11), (12);
CREATE TABLE raw_orders (order_id INTEGER, status TEXT, customer_id INTEGER, _loaded_at TIMESTAMP);
INSERT INTO raw_orders VALUES
  (101, 'placed', 10, '2026-03-01 23:10'),
  (102, 'shipped', 11, '2026-03-01 23:40'),
  (103, 'placed', 12, '2026-03-02 00:15'),
  (104, 'delivered', 10, '2026-03-02 00:30'),
  (105, 'cancelled', 11, '2026-03-02 01:00');`;
const CHECKS = ["2026-03-02 04:00", "2026-03-02 09:00", "2026-03-02 14:00"];
results.figures.freshness = await figure(RAW, {
  newest: "SELECT MAX(_loaded_at) AS newest FROM raw_orders;",
  checks: `SELECT c.checked_at,
  c.checked_at - MAX(r._loaded_at) AS age,
  CASE
    WHEN c.checked_at - MAX(r._loaded_at) > INTERVAL '12 hours' THEN 'error'
    WHEN c.checked_at - MAX(r._loaded_at) > INTERVAL '6 hours' THEN 'warn'
    ELSE 'pass'
  END AS freshness
FROM raw_orders r
CROSS JOIN (VALUES ${CHECKS.map((t) => `(TIMESTAMP '${t}')`).join(", ")}) AS c(checked_at)
GROUP BY c.checked_at
ORDER BY c.checked_at;`,
  unique: "SELECT order_id, COUNT(*) AS n FROM raw_orders GROUP BY order_id HAVING COUNT(*) > 1;",
  notNull: "SELECT * FROM raw_orders WHERE order_id IS NULL;",
  acceptedValues: "SELECT * FROM raw_orders WHERE status NOT IN ('placed', 'shipped', 'delivered', 'cancelled');",
  relationships:
    "SELECT r.* FROM raw_orders r LEFT JOIN dim_customer c ON c.customer_id = r.customer_id WHERE r.customer_id IS NOT NULL AND c.customer_id IS NULL;",
});
results.figures.freshness.yaml = fence(TESTING, "sources:");

// ── 7. CI: state:modified+ on the page's DAG ────────────────────────────────
//
// dbt.mdx's lineage figure, parsed: each `a --> b` is an edge from a to b,
// and a node labelled "source:" is a source, not a model. state:modified+
// selects the changed model and everything downstream of it.
{
  const mermaid = DBT.match(/```mermaid\n([\s\S]*?)\n```/)[1];
  const labels = {};
  const edges = [];
  const node = (s) => {
    const m = s.trim().match(/^(\w+)(?:\["(.*)"\])?$/);
    if (!m) throw new Error(`unparsed node ${s}`);
    if (m[2]) labels[m[1]] = m[2].replace(/<\/?code>/g, "");
    return m[1];
  };
  for (const line of mermaid.split("\n").slice(1)) {
    const [from, to] = line.split("-->");
    if (to) edges.push([node(from), node(to)]);
  }
  const name = (id) => labels[id].replace(/^source: /, "");
  const models = Object.keys(labels).filter((id) => !labels[id].startsWith("source:")).map(name);
  const downstream = (start) => {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const at = queue.shift();
      for (const [a, b] of edges) {
        if (a === at && !seen.has(b)) {
          seen.add(b);
          queue.push(b);
        }
      }
    }
    return [...seen];
  };
  const byName = Object.fromEntries(Object.keys(labels).map((id) => [name(id), id]));
  results.figures.ci = {
    command: fence(TESTING, "# Slim CI: build + test only what changed and its children"),
    nodes: Object.keys(labels).map((id) => ({ name: name(id), source: labels[id].startsWith("source:") })),
    edges: edges.map(([a, b]) => [name(a), name(b)]),
    models,
    selected: Object.fromEntries(
      models.map((m) => [m, downstream(byName[m]).map(name).filter((n) => models.includes(n))]),
    ),
  };
}

// ── 9. Testing against observability ────────────────────────────────────────
//
// The video's own two days of loads into one model: 30 orders on 2 March, 20
// on 3 March, every row well formed. The four tests, per day, return nothing;
// only the count changes.

const LOADS = `CREATE TABLE dim_customer (customer_id INTEGER);
INSERT INTO dim_customer VALUES (10), (11), (12);
CREATE TABLE fct_orders (load_date DATE, order_id INTEGER, status TEXT, customer_id INTEGER);
INSERT INTO fct_orders
SELECT DATE '2026-03-02', g, (ARRAY['placed', 'shipped', 'delivered', 'cancelled'])[1 + g % 4], 10 + g % 3
FROM generate_series(1, 30) g;
INSERT INTO fct_orders
SELECT DATE '2026-03-03', g, (ARRAY['placed', 'shipped', 'delivered', 'cancelled'])[1 + g % 4], 10 + g % 3
FROM generate_series(31, 50) g;`;
const perDay = (where) =>
  `SELECT d.load_date, COUNT(t.load_date) AS failing\nFROM (SELECT DISTINCT load_date FROM fct_orders) d\nLEFT JOIN (${where}) t ON t.load_date = d.load_date\nGROUP BY d.load_date\nORDER BY d.load_date;`;
results.figures.observe = await figure(LOADS, {
  volume: "SELECT load_date, COUNT(*) AS rows\nFROM fct_orders\nGROUP BY load_date\nORDER BY load_date;",
  unique: perDay("SELECT load_date, order_id FROM fct_orders GROUP BY load_date, order_id HAVING COUNT(*) > 1"),
  notNull: perDay("SELECT load_date FROM fct_orders WHERE order_id IS NULL"),
  acceptedValues: perDay(
    "SELECT load_date FROM fct_orders WHERE status NOT IN ('placed', 'shipped', 'delivered', 'cancelled')",
  ),
  relationships: perDay(
    "SELECT o.load_date FROM fct_orders o LEFT JOIN dim_customer c ON c.customer_id = o.customer_id WHERE o.customer_id IS NOT NULL AND c.customer_id IS NULL",
  ),
  drop:
    "SELECT ROUND(100.0 * (a.n - b.n) / a.n, 1) AS drop_pct\nFROM (SELECT COUNT(*) AS n FROM fct_orders WHERE load_date = '2026-03-02') a,\n  (SELECT COUNT(*) AS n FROM fct_orders WHERE load_date = '2026-03-03') b;",
});

// ── 10. Testing that a metric is correct ────────────────────────────────────
//
// The video's own daily revenue model, built with a join that fans out: the
// page's first two fan-trap orders (metrics-and-semantic-layer.mdx: order 1,
// 100.00, items A, B and C; order 2, 50.00, item D), on one day. Finance's
// ledger says 150.00 for the day. The range (0 to 1,000) and the 1%
// tolerance are the video's own.

const METRIC = `CREATE TABLE orders (order_id INTEGER, order_date DATE, amount DECIMAL(8,2));
INSERT INTO orders VALUES (1, '2026-03-02', 100.00), (2, '2026-03-02', 50.00);
CREATE TABLE order_items (order_id INTEGER, item TEXT);
INSERT INTO order_items VALUES (1, 'A'), (1, 'B'), (1, 'C'), (2, 'D');
CREATE TABLE finance_daily (day DATE, revenue DECIMAL(8,2));
INSERT INTO finance_daily VALUES ('2026-03-02', 150.00);
CREATE TABLE daily_revenue AS
SELECT o.order_date AS day, SUM(o.amount) AS revenue
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
GROUP BY o.order_date;`;
const MODEL =
  "SELECT o.order_date AS day, SUM(o.amount) AS revenue\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id\nGROUP BY o.order_date;";
results.figures.metric = await figure(METRIC, {
  model: "SELECT day, revenue FROM daily_revenue;",
  notNull: "SELECT *\nFROM daily_revenue\nWHERE revenue IS NULL;",
  range: "SELECT *\nFROM daily_revenue\nWHERE NOT (revenue >= 0 AND revenue <= 1000);",
  reconcile:
    "SELECT d.day, d.revenue, f.revenue AS finance\nFROM daily_revenue d\nJOIN finance_daily f ON f.day = d.day\nWHERE ABS(d.revenue - f.revenue) > 0.01 * f.revenue;",
});
results.figures.metric.modelSql = MODEL;

// The unit test: the model's own SQL on mocked rows, one order of 100.00 with
// three items, against the 100.00 it should give.
results.figures.unit = await figure(
  `CREATE TABLE orders (order_id INTEGER, order_date DATE, amount DECIMAL(8,2));
INSERT INTO orders VALUES (1, '2026-03-02', 100.00);
CREATE TABLE order_items (order_id INTEGER, item TEXT);
INSERT INTO order_items VALUES (1, 'A'), (1, 'B'), (1, 'C');`,
  { actual: MODEL, expected: "SELECT DATE '2026-03-02' AS day, 100.00 AS revenue;" },
);

// ── The quick round: the page's own YAML, shown as written ──────────────────
//
// Nothing runs: these are the contract and the severity blocks the quick
// round puts on screen, read from the page so the two cannot drift.

results.figures.quick = {
  contract: fence(TESTING, "models:\n  - name: fct_orders\n    config:"),
  severity: fence(TESTING, "- name: customer_email"),
};

// ── Checks ──────────────────────────────────────────────────────────────────

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);

const rows = (f, s) => results.figures[f].steps[s].rows;
const problems = [];
const expect = (what, actual, wanted) => {
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    problems.push(`${what}: got ${JSON.stringify(actual)}, the script says ${JSON.stringify(wanted)}`);
  }
};
for (const [f, fig] of Object.entries(results.figures)) {
  for (const [id, s] of Object.entries(fig.steps ?? {})) if (!s.ok) problems.push(`${f}.${id}: ${s.error}`);
}
// What the narration says, against what ran.
expect("unique: the page's 24 rows", rows("unique", "rows"), [[24, 21]]);
expect("unique: orders 2, 11 and 19, twice each", rows("unique", "test"), [[2, 2], [11, 2], [19, 2]]);
expect("unique: 335 too high", rows("unique", "revenue")[0][2], "335.00");
expect("unique: unchanged after the test", rows("unique", "after"), [[24]]);
expect("builtins: unique returns order 3", rows("builtins", "unique"), [[3, 2]]);
expect("builtins: not_null returns the row with no id", rows("builtins", "notNull"), [[null, "delivered", 10, "15.00"]]);
expect("builtins: accepted_values returns 'returned'", rows("builtins", "acceptedValues"), [[5, "returned", 11, "30.00"]]);
expect("builtins: relationships returns customer 99", rows("builtins", "relationships"), [[6, "delivered", 99, "55.00"]]);
expect("builtins: the singular test returns order 7", rows("builtins", "singular"), [[7, "-25.00"]]);
expect("compound: order_id alone flags 1 and 3", rows("compound", "orderOnly"), [[1, 3], [3, 3]]);
expect("compound: the pair flags order 3 line 2", rows("compound", "pair"), [[3, 2, 2]]);
expect(
  "freshness: 3, 8 and 13 hours",
  rows("freshness", "checks").map((r) => [r[1], r[2]]),
  [["03:00:00", "pass"], ["08:00:00", "warn"], ["13:00:00", "error"]],
);
for (const t of ["unique", "notNull", "acceptedValues", "relationships"]) {
  expect(`freshness: ${t} passes on the stale rows`, rows("freshness", t), []);
  expect(`observe: ${t} passes on both days`, rows("observe", t).map((r) => r[1]), [0, 0]);
}
expect("ci: changing stg_customers selects three of four", results.figures.ci.selected.stg_customers, [
  "stg_customers",
  "dim_customer",
  "fct_orders",
]);
expect("ci: four models", results.figures.ci.models.length, 4);
expect("observe: 30 then 20", rows("observe", "volume").map((r) => r[1]), [30, 20]);
expect("observe: a third gone", rows("observe", "drop"), [["33.3"]]);
expect("metric: 350.00", rows("metric", "model")[0][1], "350.00");
expect("metric: not_null passes", rows("metric", "notNull"), []);
expect("metric: the range passes", rows("metric", "range"), []);
expect("metric: reconciliation returns the day", rows("metric", "reconcile")[0].slice(1), ["350.00", "150.00"]);
expect("unit: 300.00 against 100.00", [rows("unit", "actual")[0][1], rows("unit", "expected")[0][1]], ["300.00", "100.00"]);
// The series agrees: Data Analyst Part 1 measured the same two orders.
const daSql = JSON.parse(readFileSync(new URL("../da-sql/results.json", import.meta.url), "utf8"));
expect("metric: da-sql's fan-out on the same orders", daSql.figures.fanout.steps.inflated.rows[0][0], rows("metric", "model")[0][1]);

console.log(`wrote ${fileURLToPath(out)} (${results.figures.unique.version})`);
if (problems.length) {
  console.log(`problems:\n  ${problems.join("\n  ")}`);
  process.exitCode = 1;
} else console.log("every value matches the script");
