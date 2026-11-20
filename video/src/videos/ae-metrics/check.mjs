// Runs every query the ae-metrics video shows on the site's Postgres engine
// (PGlite, PostgreSQL 18, through scripts/lib/sql-engines.mjs by way of
// video/scripts/lib/pg-figure.mjs: the engine the metrics page's block runs
// in the reader's browser) and writes what came back to results.json, which
// data.ts reads. From the repo root:
//
//   node video/src/videos/ae-metrics/check.mjs
//
// The page's own tables and queries are read from the page, so the video and
// the page cannot drift: its fan-trap block (initSql and starterCode, as
// written) and its "aggregate each grain independently" fix. Everything else
// runs on those same twelve orders and twenty-four items, except:
//   - the chasm trap, which the page describes (payments and refunds, both to
//     customer) without rows: the video's own customer, three payments and
//     two refunds;
//   - the averaged ratio, which the page states for daily conversion rates
//     without rows: Data Analyst Part 8's two days (da-ai-assisted, 5 of 10
//     sessions, then 20 of 1,000), run again here and checked against its
//     results.json, so the series agree.
// MetricFlow and LookML do not run here; the screen shows their definitions
// as the page writes them (the YAML is read from the page below). What the
// semantic layer "writes for you" in the entities question is the page's own
// fix, run per order: the shape of SQL the page says the layer generates
// ("aggregating before it fans out"), not MetricFlow's output.
//
// Each figure runs in a fresh database. Two runs write identical files.
/* global console, process, URL */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { figure } from "../../../scripts/lib/pg-figure.mjs";

const PAGE = readFileSync(
  new URL("../../../../content/interview/analytics-engineer/metrics-and-semantic-layer.mdx", import.meta.url),
  "utf8",
);
const prop = (name) => {
  const m = PAGE.match(new RegExp(`${name}=\\{\`([\\s\\S]*?)\`\\}`));
  if (!m) throw new Error(`the page has no ${name}`);
  return m[1];
};
const fence = (firstLine) => {
  const m = PAGE.match(new RegExp("```[a-z]*\\n(" + firstLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?)\\n```"));
  if (!m) throw new Error(`the page has no block starting ${JSON.stringify(firstLine)}`);
  return m[1];
};

const PAGE_TABLES = prop("initSql");
const PAGE_QUERY = prop("starterCode");
const PAGE_FIX = fence("-- Aggregate each grain independently, then join the summaries");

const results = { figures: {} };

// ── Opening, and 1, 2, 3. Two dashboards, the fan trap, the fix ─────────────

results.figures.fan = await figure(PAGE_TABLES, {
  orders: "SELECT order_id, amount FROM orders ORDER BY order_id;",
  items: "SELECT order_id, item, qty FROM order_items ORDER BY ctid;",
  // Dashboard one: revenue from orders alone.
  revenue: "SELECT COUNT(*) AS orders, SUM(amount) AS revenue\nFROM orders;",
  // Dashboard two: the page's query, as written (comments and all).
  page: PAGE_QUERY,
  // The opening's two dashboard queries, each aliased the way a dashboard
  // would alias it (the page's alias, inflated_revenue, names the answer):
  // orders alone, and the page's join.
  dashboardA: "SELECT SUM(amount) AS revenue\nFROM orders;",
  dashboardB: "SELECT SUM(o.amount) AS revenue\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id;",
  joinedRows: "SELECT COUNT(*) AS rows\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id;",
  // The zoom: orders 1 and 2, the rows the page's comment describes.
  firstTwo: "SELECT o.order_id, o.amount, i.item\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id\nWHERE o.order_id IN (1, 2)\nORDER BY o.order_id, i.item;",
  firstTwoSums:
    "SELECT (SELECT SUM(amount) FROM orders WHERE order_id IN (1, 2)) AS revenue,\n  SUM(o.amount) AS joined\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id\nWHERE o.order_id IN (1, 2);",
  // Each order counted once per item: its multiple is its item count.
  perOrder:
    "SELECT o.order_id, o.amount, COUNT(*) AS items,\n  SUM(o.amount) AS counted\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id\nGROUP BY o.order_id, o.amount\nORDER BY o.order_id;",
  multiple:
    "SELECT ROUND(\n  (SELECT SUM(o.amount) FROM orders o JOIN order_items i ON i.order_id = o.order_id)\n  / (SELECT SUM(amount) FROM orders), 2) AS times;",
  // Every test on the two tables passes: keys unique and present, every item's
  // order exists.
  testUnique: "SELECT order_id, COUNT(*) AS n FROM orders GROUP BY order_id HAVING COUNT(*) > 1;",
  testNotNull: "SELECT * FROM orders WHERE order_id IS NULL OR amount IS NULL;",
  testItemsNotNull: "SELECT * FROM order_items WHERE order_id IS NULL;",
  testRelationships:
    "SELECT i.* FROM order_items i LEFT JOIN orders o ON o.order_id = i.order_id WHERE o.order_id IS NULL;",
  // 3. The page's fix, as written; and after a join, a distinct count of
  // orders and a sum of a measure native to the item rows.
  fix: PAGE_FIX,
  afterJoin:
    "SELECT COUNT(DISTINCT o.order_id) AS orders,\n  SUM(i.qty) AS units\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id;",
  // 6. Revenue and units by order, each summed at its own grain first: the
  // page's fix, per order.
  byOrder:
    "WITH revenue AS (\n  SELECT order_id, SUM(amount) AS revenue\n  FROM orders GROUP BY order_id\n),\nunits AS (\n  SELECT order_id, SUM(qty) AS units\n  FROM order_items GROUP BY order_id\n)\nSELECT r.order_id, r.revenue, u.units\nFROM revenue r\nJOIN units u ON u.order_id = r.order_id\nORDER BY r.order_id;",
  byOrderTotals:
    "WITH revenue AS (\n  SELECT order_id, SUM(amount) AS revenue\n  FROM orders GROUP BY order_id\n),\nunits AS (\n  SELECT order_id, SUM(qty) AS units\n  FROM order_items GROUP BY order_id\n)\nSELECT COUNT(*) AS orders, SUM(r.revenue) AS revenue, SUM(u.units) AS units\nFROM revenue r\nJOIN units u ON u.order_id = r.order_id;",
});
// ── 4. The chasm trap ───────────────────────────────────────────────────────
//
// The video's own (the page names payments and refunds, both to customer,
// but gives no rows): Ada (customer 1) made three payments, 100.00, 50.00 and
// 30.00, and got two refunds, 20.00 and 10.00. Ben (customer 2) paid 40.00
// and was never refunded: the inner joins drop him, left joins keep him.

const CHASM = `CREATE TABLE customer (customer_id INTEGER, name TEXT);
INSERT INTO customer VALUES (1, 'Ada'), (2, 'Ben');
CREATE TABLE payments (payment_id INTEGER, customer_id INTEGER, amount DECIMAL(8,2));
INSERT INTO payments VALUES (1, 1, 100.00), (2, 1, 50.00), (3, 1, 30.00), (4, 2, 40.00);
CREATE TABLE refunds (refund_id INTEGER, customer_id INTEGER, amount DECIMAL(8,2));
INSERT INTO refunds VALUES (1, 1, 20.00), (2, 1, 10.00);`;
const BRANCHES =
  "WITH paid AS (\n  SELECT customer_id, SUM(amount) AS paid\n  FROM payments GROUP BY customer_id\n),\nrefunded AS (\n  SELECT customer_id, SUM(amount) AS refunded\n  FROM refunds GROUP BY customer_id\n)\n";
results.figures.chasm = await figure(CHASM, {
  payments: "SELECT payment_id, customer_id, amount FROM payments ORDER BY payment_id;",
  refunds: "SELECT refund_id, customer_id, amount FROM refunds ORDER BY refund_id;",
  truth:
    "SELECT (SELECT SUM(amount) FROM payments WHERE customer_id = 1) AS paid,\n  (SELECT SUM(amount) FROM refunds WHERE customer_id = 1) AS refunded;",
  joined:
    "SELECT c.name, p.amount AS payment, r.amount AS refund\nFROM customer c\nJOIN payments p ON p.customer_id = c.customer_id\nJOIN refunds r ON r.customer_id = c.customer_id\nORDER BY p.payment_id, r.refund_id;",
  trap:
    "SELECT c.name, SUM(p.amount) AS paid, SUM(r.amount) AS refunded\nFROM customer c\nJOIN payments p ON p.customer_id = c.customer_id\nJOIN refunds r ON r.customer_id = c.customer_id\nGROUP BY c.name;",
  // Each branch totalled first, then joined: with inner joins, Ben drops out.
  fixInner: `${BRANCHES}SELECT c.name, p.paid, r.refunded\nFROM customer c\nJOIN paid p ON p.customer_id = c.customer_id\nJOIN refunded r ON r.customer_id = c.customer_id\nORDER BY c.customer_id;`,
  fix: `${BRANCHES}SELECT c.name, COALESCE(p.paid, 0.00) AS paid,\n  COALESCE(r.refunded, 0.00) AS refunded\nFROM customer c\nLEFT JOIN paid p ON p.customer_id = c.customer_id\nLEFT JOIN refunded r ON r.customer_id = c.customer_id\nORDER BY c.customer_id;`,
});

// ── 7. Pre-aggregated distinct counts, on the page's items ──────────────────

results.figures.distinct = await figure(
  `${PAGE_TABLES}
CREATE TABLE order_summary AS
SELECT order_id, COUNT(DISTINCT item) AS products
FROM order_items
GROUP BY order_id;`,
  {
    summary: "SELECT order_id, products FROM order_summary ORDER BY order_id;",
    summed: "SELECT SUM(products) AS products\nFROM order_summary;",
    recount: "SELECT COUNT(DISTINCT item) AS products\nFROM order_items;",
    perProduct: "SELECT item, COUNT(DISTINCT order_id) AS orders\nFROM order_items\nGROUP BY item\nORDER BY item;",
  },
);

// ── 7, 8. A ratio: Data Analyst Part 8's two days, run again ────────────────

const DAYS = `CREATE TABLE daily (day DATE, sessions INTEGER, conversions INTEGER);
INSERT INTO daily VALUES ('2026-01-05', 10, 5), ('2026-01-06', 1000, 20);`;
results.figures.ratio = await figure(DAYS, {
  table: "SELECT day, sessions, conversions,\n  ROUND(100.0 * conversions / sessions, 1) AS rate_pct\nFROM daily ORDER BY day;",
  averaged: "SELECT ROUND(AVG(100.0 * conversions / sessions), 1)\n  AS avg_of_rates_pct\nFROM daily;",
  pooled: "SELECT ROUND(100.0 * SUM(conversions) / SUM(sessions), 1)\n  AS overall_rate_pct\nFROM daily;",
  parts: "SELECT SUM(conversions) AS conversions, SUM(sessions) AS sessions\nFROM daily;",
});

// ── 5. What the layer writes for completed revenue, by month and by region ──
//
// Drawn, not measured: the page's tables have no status, date or region. The
// two statements the screen shows run here on empty tables of that shape, so
// they are at least valid Postgres; no number comes from them.

const LAYER = `CREATE TABLE customers (customer_id INTEGER, region TEXT);
CREATE TABLE orders (order_id INTEGER, customer_id INTEGER, order_date DATE, status TEXT, amount DECIMAL(10,2));`;
results.figures.layer = await figure(LAYER, {
  byMonth:
    "SELECT date_trunc('month', o.order_date) AS month,\n  SUM(o.amount) AS completed_revenue\nFROM orders o\nWHERE o.status = 'completed'\nGROUP BY 1;",
  byRegion:
    "SELECT c.region,\n  SUM(o.amount) AS completed_revenue\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nWHERE o.status = 'completed'\nGROUP BY c.region;",
});

// ── The definitions the screen shows as the page writes them ────────────────

results.definitions = {
  // The page's MetricFlow block, in dbt's current spec (since 1.12): entities
  // and dimensions on the model's columns, the metric inline with its own
  // aggregation (measures are deprecated).
  metricflow: fence("models:\n  - name: fct_orders"),
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
  for (const [id, s] of Object.entries(fig.steps)) if (!s.ok) problems.push(`${f}.${id}: ${s.error}`);
}
expect("fan: twelve orders, 1,949.25", rows("fan", "revenue"), [[12, "1949.25"]]);
expect("fan: the page's query returns 4,555.25", rows("fan", "page"), [["4555.25"]]);
expect("fan: dashboard A reads 1,949.25", rows("fan", "dashboardA"), [["1949.25"]]);
expect("fan: dashboard B reads 4,555.25", rows("fan", "dashboardB"), [["4555.25"]]);
expect("fan: 24 rows", rows("fan", "joinedRows"), [[24]]);
expect("fan: orders 1 and 2, 150 becomes 350", rows("fan", "firstTwoSums"), [["150.00", "350.00"]]);
expect("fan: more than double", rows("fan", "multiple"), [["2.34"]]);
for (const t of ["testUnique", "testNotNull", "testItemsNotNull", "testRelationships"]) {
  expect(`fan: ${t} passes`, rows("fan", t), []);
}
expect("fan: the page's fix, 1,949.25 and 38 units", rows("fan", "fix"), [["1949.25", 38]]);
expect("fan: after the join, 12 orders and 38 units", rows("fan", "afterJoin"), [[12, 38]]);
expect("fan: by order, each at its own grain", rows("fan", "byOrderTotals"), [[12, "1949.25", "38"]]);
expect(
  "fan: each order's multiple is its item count",
  rows("fan", "perOrder").every(([, amount, items, counted]) => Number(counted) === Number(amount) * items),
  true,
);
expect("chasm: 180 paid, 30 refunded", rows("chasm", "truth"), [["180.00", "30.00"]]);
expect("chasm: six rows", rows("chasm", "joined").length, 6);
expect("chasm: 360 and 90", rows("chasm", "trap"), [["Ada", "360.00", "90.00"]]);
expect("chasm: totalled first, 180 and 30, and Ben dropped", rows("chasm", "fixInner"), [["Ada", "180.00", "30.00"]]);
expect("chasm: with left joins, Ben kept", rows("chasm", "fix"), [
  ["Ada", "180.00", "30.00"],
  ["Ben", "40.00", "0.00"],
]);
expect("distinct: 24 summed", rows("distinct", "summed"), [["24"]]);
expect("distinct: 7 products", rows("distinct", "recount"), [[7]]);
expect("distinct: product A in five orders", rows("distinct", "perProduct")[0], ["A", 5]);
expect("ratio: 26.0 averaged", rows("ratio", "averaged"), [["26.0"]]);
expect("ratio: 2.5 pooled", rows("ratio", "pooled"), [["2.5"]]);
// The series agrees with what Data Analyst Parts 1 and 8 measured.
const other = (v) => JSON.parse(readFileSync(new URL(`../${v}/results.json`, import.meta.url), "utf8"));
const daSql = other("da-sql").figures.fanout.steps;
expect("fan: da-sql's two orders", [daSql.orders.rows[0][0], daSql.inflated.rows[0][0]], rows("fan", "firstTwoSums")[0]);
const daAi = other("da-ai-assisted").figures.ratios.steps;
expect("ratio: da-ai-assisted's two days", [daAi.averaged.rows[0][0], daAi.pooled.rows[0][0]], [
  rows("ratio", "averaged")[0][0],
  rows("ratio", "pooled")[0][0],
]);
// The page's own words about its block, which the run contradicts (reported,
// not fixed: the video follows the run).
const claims = PAGE.match(/True revenue is 100 \+ 50 = 150, but this returns 350/);
results.pageNote = claims
  ? "The page says its block returns 350 against a true 150; on its twelve orders it returns 4555.25 against 1949.25 (150 and 350 are orders 1 and 2 alone)."
  : null;
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);

console.log(`wrote ${fileURLToPath(out)} (${results.figures.fan.version})`);
if (results.pageNote) console.log(`page: ${results.pageNote}`);
if (problems.length) {
  console.log(`problems:\n  ${problems.join("\n  ")}`);
  process.exitCode = 1;
} else console.log("every value matches the script");
