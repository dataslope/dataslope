// Runs every statement the de-sql-performance video shows on the site's
// Postgres engine (PGlite, PostgreSQL 18, through scripts/lib/sql-engines.mjs,
// the engine the Postgres lessons grade with), plus one plan in DuckDB-Wasm,
// the engine the Data Engineer SQL page's own blocks run in, and writes what
// came back to results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/de-sql-performance/check.mjs
//
// The tables are the video's own, built by generate_series from fixed
// expressions (no random draws), so every run returns the same plans, counts
// and sizes:
//   orders     1,000,000 rows; customer_id cycles through 1..50,000 by a
//              stride of 7919, so each customer has exactly 20 orders, spread
//              across the table; order_date climbs through 2024; one order in
//              ten is 'returned', the rest 'shipped'.
//   customers  50,000 rows, four regions.
//   employees  10,000 rows in ten departments (question 7).
// Each figure runs in a fresh database. Plans are EXPLAIN (ANALYZE, TIMING
// OFF, BUFFERS OFF, SUMMARY OFF) unless a step says otherwise; data.ts trims
// each node's "cost=…" and "width=…" and keeps everything else as printed.
// No timing is recorded: milliseconds in WebAssembly are not a server's.
/* global console, URL */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { createEngine } = await import(new URL("../../../../scripts/lib/sql-engines.mjs", import.meta.url).href);

/** A value as psql prints it. */
const shown = (v) => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

/** Runs `sql` one statement at a time (VACUUM and CLUSTER refuse to run in
 *  the implicit transaction of a multi-statement string). */
async function runAll(engine, sql) {
  let last = [];
  for (const stmt of sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) last = await engine.exec(stmt);
  return last;
}

/** A figure on the site's Postgres: its setup, then each step in order, in
 *  one database, so a step can change what the next one sees. */
async function pgFigure(setup, steps) {
  const engine = await createEngine("postgres");
  await runAll(engine, setup);
  const out = {};
  for (const [id, sql] of Object.entries(steps)) {
    try {
      const results = await runAll(engine, sql);
      const r = results[results.length - 1];
      out[id] = r?.columns?.length
        ? { sql, ok: true, columns: r.columns, rows: r.values.map((row) => row.map(shown)) }
        : { sql, ok: true, columns: [], rows: [] };
    } catch (e) {
      out[id] = { sql, ok: false, error: `ERROR: ${String(e.message).split("\n")[0]}` };
    }
  }
  const [v] = await engine.exec("SELECT version() AS v");
  await engine.destroy();
  return { setup, steps: out, version: String(v.values[0][0]).split(" (")[0] };
}

const EXPLAIN = "EXPLAIN (ANALYZE, TIMING OFF, BUFFERS OFF, SUMMARY OFF)";
const EXPLAIN_COSTS_OFF = "EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF)";

// ── The video's own tables ──────────────────────────────────────────────────

/** ANALYZE samples rows at random, so its estimates differ run to run. A
 *  statistics target of 10,000 samples up to 3,000,000 rows, more than any
 *  table here holds, so ANALYZE reads every row. Each setup starts with it. */
const EXACT_STATS = "SET default_statistics_target = 10000";

const ORDERS = `${EXACT_STATS};
CREATE TABLE customers AS
SELECT g AS id, 'customer ' || g AS name,
  (ARRAY['North', 'South', 'East', 'West'])[1 + g % 4] AS region
FROM generate_series(1, 50000) g;
ALTER TABLE customers ADD PRIMARY KEY (id);
CREATE TABLE orders AS
SELECT g AS id,
  (1 + (g::bigint * 7919) % 50000)::int AS customer_id,
  DATE '2024-01-01' + ((g - 1) * 366 / 1000000) AS order_date,
  round(5 + ((g * 37) % 9500) / 100.0, 2) AS amount,
  CASE WHEN g % 10 = 0 THEN 'returned' ELSE 'shipped' END AS status
FROM generate_series(1, 1000000) g;
ALTER TABLE orders ADD PRIMARY KEY (id);
VACUUM ANALYZE customers;
VACUUM ANALYZE orders`;

const BY_CUSTOMER = "SELECT * FROM orders\nWHERE customer_id = 42;";
/** The pages of the table a customer's rows sit on, from each row's ctid
 *  (page, slot). */
const PAGES_OF_42 = "SELECT DISTINCT (ctid::text::point)[0]::int AS page\nFROM orders WHERE customer_id = 42\nORDER BY page;";
const TABLE_PAGES = "SELECT pg_relation_size('orders') / current_setting('block_size')::int AS pages;";

const results = { figures: {} };

// 1. A slow query: the plan of one customer's orders, with no index.
results.figures.slow = await pgFigure(ORDERS, {
  sizes:
    "SELECT COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS customers,\n  MIN(order_date) AS first_day, MAX(order_date) AS last_day\nFROM orders;",
  customers: "SELECT COUNT(*) AS customers FROM customers;",
  query: BY_CUSTOMER,
  plan: `${EXPLAIN}\n${BY_CUSTOMER}`,
  pages: TABLE_PAGES,
});

// 2. Reading a plan: 50,000 pending orders land after the last ANALYZE, so
//    the planner expects one row and picks a nested loop; ANALYZE fixes it.
const PENDING = "SELECT c.region, o.amount\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'pending';";
results.figures.explain = await pgFigure(ORDERS, {
  insert:
    "INSERT INTO orders\nSELECT 1000000 + g, (1 + (g::bigint * 7919) % 50000)::int,\n  DATE '2025-01-01', 20.00, 'pending'\nFROM generate_series(1, 50000) g;",
  pending: "SELECT COUNT(*) AS pending FROM orders WHERE status = 'pending';",
  query: PENDING,
  stale: `${EXPLAIN}\n${PENDING}`,
  analyze: "ANALYZE orders;",
  fresh: `${EXPLAIN}\n${PENDING}`,
});

// 3. Indexes: selective, unselective, and what each one costs a write.
const SHIPPED = "SELECT * FROM orders\nWHERE status = 'shipped';";
const INSERT_10K = (t) =>
  `${"EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF)"}\nINSERT INTO ${t}\nSELECT g, (1 + (g::bigint * 7919) % 50000)::int, DATE '2024-01-01' + g % 366, 10.00, 'shipped'\nFROM generate_series(1, 10000) g;`;
results.figures.index = await pgFigure(ORDERS, {
  create: "CREATE INDEX orders_customer_idx ON orders (customer_id);\nCREATE INDEX orders_status_idx ON orders (status);\nANALYZE orders;",
  createShown: "SELECT 'CREATE INDEX ON orders (customer_id);' AS sql;",
  plan: `${EXPLAIN}\n${BY_CUSTOMER}`,
  pages42: PAGES_OF_42,
  pages: TABLE_PAGES,
  shipped: "SELECT COUNT(*) AS shipped FROM orders WHERE status = 'shipped';",
  shippedPlan: `${EXPLAIN}\n${SHIPPED}`,
  // Not on screen: the rare value of the same two-value column (one row in
  // ten) does use the index, so what decides is how selective the value is,
  // not how few values the column has (the page says "low-cardinality").
  returnedPlan: `${EXPLAIN}\nSELECT * FROM orders\nWHERE status = 'returned';`,
  writeTables:
    "CREATE TABLE no_index (id int, customer_id int, order_date date, amount numeric, status text);\nCREATE TABLE three_indexes (id int, customer_id int, order_date date, amount numeric, status text);\nCREATE INDEX ON three_indexes (customer_id);\nCREATE INDEX ON three_indexes (order_date);\nCREATE INDEX ON three_indexes (status);",
  walNone: INSERT_10K("no_index"),
  walThree: INSERT_10K("three_indexes"),
});

// 4. A covering index: the same lookup for two columns, before and after
//    INCLUDE, and the two indexes' sizes.
const TWO_COLS = "SELECT customer_id, amount FROM orders\nWHERE customer_id = 42;";
results.figures.cover = await pgFigure(ORDERS, {
  create: "CREATE INDEX orders_customer_idx ON orders (customer_id);\nANALYZE orders;",
  query: TWO_COLS,
  before: `${EXPLAIN}\n${TWO_COLS}`,
  include: "CREATE INDEX orders_customer_amount_idx\n  ON orders (customer_id) INCLUDE (amount);",
  vacuum: "VACUUM ANALYZE orders;",
  after: `${EXPLAIN}\n${TWO_COLS}`,
  sizes:
    "SELECT relname AS index, pg_relation_size(oid) AS bytes,\n  pg_size_pretty(pg_relation_size(oid)) AS size\nFROM pg_class\nWHERE relname IN ('orders_customer_idx', 'orders_customer_amount_idx')\nORDER BY bytes;",
});

// 5. CLUSTER: customer 42's rows, page by page, before and after; then one
//    order inserted afterwards, and where it lands.
results.figures.cluster = await pgFigure(ORDERS, {
  create: "CREATE INDEX orders_customer_idx ON orders (customer_id);\nANALYZE orders;",
  pagesBefore: PAGES_OF_42,
  planBefore: `${EXPLAIN_COSTS_OFF}\n${BY_CUSTOMER}`,
  cluster: "CLUSTER orders USING orders_customer_idx;\nANALYZE orders;",
  clusterShown: "SELECT 'CLUSTER orders USING orders_customer_idx;' AS sql;",
  pagesAfter: PAGES_OF_42,
  planAfter: `${EXPLAIN_COSTS_OFF}\n${BY_CUSTOMER}`,
  tablePages: TABLE_PAGES,
  insert: "INSERT INTO orders VALUES (1000001, 42, DATE '2025-01-02', 30.00, 'shipped');",
  newPage: "SELECT (ctid::text::point)[0]::int AS page\nFROM orders WHERE id = 1000001;",
  pagesNow: TABLE_PAGES,
});

// 6. Partition pruning: the same million orders, partitioned by month.
const pad = (m) => String(m).padStart(2, "0");
const PARTITIONED = `${EXACT_STATS};
CREATE TABLE orders (id int, customer_id int, order_date date, amount numeric(8,2))
  PARTITION BY RANGE (order_date);
${Array.from({ length: 12 }, (_, i) => i + 1)
  .map((m) => `CREATE TABLE orders_2024_${pad(m)} PARTITION OF orders\n  FOR VALUES FROM ('2024-${pad(m)}-01') TO ('${m === 12 ? "2025-01" : `2024-${pad(m + 1)}`}-01')`)
  .join(";\n")};
INSERT INTO orders
SELECT g, (1 + (g::bigint * 7919) % 50000)::int,
  DATE '2024-01-01' + ((g - 1) * 366 / 1000000),
  round(5 + ((g * 37) % 9500) / 100.0, 2)
FROM generate_series(1, 1000000) g;
ANALYZE orders`;
const MARCH = "SELECT SUM(amount) FROM orders\nWHERE order_date >= DATE '2024-03-01'\n  AND order_date <  DATE '2024-04-01';";
const MARCH_FN = "SELECT SUM(amount) FROM orders\nWHERE EXTRACT(MONTH FROM order_date) = 3;";
results.figures.prune = await pgFigure(PARTITIONED, {
  perPartition: "SELECT tableoid::regclass AS partition, COUNT(*) AS orders\nFROM orders\nGROUP BY 1\nORDER BY 1;",
  march: MARCH,
  marchPlan: `${EXPLAIN_COSTS_OFF}\n${MARCH}`,
  marchSum: MARCH,
  fn: MARCH_FN,
  fnPlan: `EXPLAIN (COSTS OFF)\n${MARCH_FN}`,
  fnSum: MARCH_FN,
});

// 7. A correlated subquery: the page's block, and its CTE rewrite, on the
//    video's own employees.
const EMPLOYEES = `${EXACT_STATS};
CREATE TABLE employees AS
SELECT g AS id, 'emp ' || g AS name,
  (ARRAY['Sales', 'Engineering', 'Support', 'Finance', 'Marketing',
         'Legal', 'Ops', 'Data', 'Design', 'HR'])[1 + g % 10] AS department,
  40000 + (g * 7919) % 80000 AS salary
FROM generate_series(1, 10000) g;
ANALYZE employees`;
const CORRELATED =
  "SELECT e.name,\n  (SELECT AVG(salary) FROM employees e2\n   WHERE e2.department = e.department) AS dept_avg\nFROM employees e;";
const REWRITE =
  "WITH dept_avgs AS (\n  SELECT department, AVG(salary) AS dept_avg\n  FROM employees GROUP BY department\n)\nSELECT e.name, d.dept_avg\nFROM employees e\nJOIN dept_avgs d ON d.department = e.department;";
results.figures.corr = await pgFigure(EMPLOYEES, {
  rows: "SELECT COUNT(*) AS employees, COUNT(DISTINCT department) AS departments FROM employees;",
  correlated: CORRELATED,
  correlatedPlan: `${EXPLAIN_COSTS_OFF}\n${CORRELATED}`,
  rewrite: REWRITE,
  rewritePlan: `${EXPLAIN_COSTS_OFF}\n${REWRITE}`,
  windowPlan: `${EXPLAIN_COSTS_OFF}\nSELECT name, AVG(salary) OVER (PARTITION BY department) AS dept_avg\nFROM employees;`,
  // Rows one form returns that the other does not, both ways round.
  differ: `SELECT COUNT(*) AS differ FROM (\n  (SELECT * FROM (${CORRELATED.replace(/;$/, "")}) a\n   EXCEPT ALL\n   SELECT * FROM (${REWRITE.replace(/;$/, "")}) b)\n  UNION ALL\n  (SELECT * FROM (${REWRITE.replace(/;$/, "")}) b\n   EXCEPT ALL\n   SELECT * FROM (${CORRELATED.replace(/;$/, "")}) a)\n) x;`,
});

// The same correlated subquery in DuckDB, the page's engine: its physical
// plan's operators, read from EXPLAIN's drawn tree.
{
  const engine = await createEngine("duckdb");
  await engine.exec(EMPLOYEES.replace(`${EXACT_STATS};\n`, "").replace(/ARRAY\[/, "[").replace("generate_series(1, 10000) g", "range(1, 10001) t(g)").replace(/;\s*ANALYZE employees$/, ""));
  const [plan] = await engine.exec(`EXPLAIN ${CORRELATED}`);
  const tree = String(plan.values[0][1]);
  const operators = [...tree.matchAll(/│\s+([A-Z][A-Z_]{2,})\s+│/g)].map((m) => m[1]).filter((op) => op !== "PROJECTION");
  const [v] = await engine.exec("SELECT version() AS v");
  await engine.destroy();
  results.figures.corrDuck = { sql: `EXPLAIN ${CORRELATED}`, operators: [...new Set(operators)], version: String(v.values[0][0]) };
}

// 8. Joining two large tables: the whole year, then December only.
const JOIN_ALL = "SELECT c.region, SUM(o.amount) AS revenue\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nGROUP BY c.region;";
const JOIN_DEC =
  "SELECT c.region, SUM(o.amount) AS revenue\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.order_date >= DATE '2024-12-01'\nGROUP BY c.region;";
results.figures.join = await pgFigure(ORDERS, {
  all: JOIN_ALL,
  allPlan: `${EXPLAIN_COSTS_OFF}\n${JOIN_ALL}`,
  december: JOIN_DEC,
  decemberPlan: `${EXPLAIN_COSTS_OFF}\n${JOIN_DEC}`,
});

// 10. A materialized view, read, left stale, and refreshed.
const DAY = "SELECT * FROM daily_revenue\nWHERE order_date = DATE '2024-12-31';";
results.figures.mv = await pgFigure(ORDERS, {
  create:
    "CREATE MATERIALIZED VIEW daily_revenue AS\nSELECT order_date, COUNT(*) AS orders, SUM(amount) AS revenue\nFROM orders\nGROUP BY order_date;",
  rows: "SELECT COUNT(*) AS days FROM daily_revenue;",
  day: DAY,
  dayPlan: `${EXPLAIN_COSTS_OFF}\n${DAY}`,
  basePlan: `${EXPLAIN_COSTS_OFF}\nSELECT order_date, COUNT(*) AS orders, SUM(amount) AS revenue\nFROM orders\nWHERE order_date = DATE '2024-12-31'\nGROUP BY order_date;`,
  insert:
    "INSERT INTO orders\nSELECT 1000000 + g, g, DATE '2024-12-31', 50.00, 'shipped'\nFROM generate_series(1, 500) g;",
  stale: DAY,
  truth: "SELECT order_date, COUNT(*) AS orders, SUM(amount) AS revenue\nFROM orders\nWHERE order_date = DATE '2024-12-31'\nGROUP BY order_date;",
  refresh: "REFRESH MATERIALIZED VIEW daily_revenue;",
  fresh: DAY,
});

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps ?? {})
    .filter(([, s]) => !s.ok)
    .map(([id, s]) => `${f}.${id}: ${s.error}`),
);
console.log(`wrote ${fileURLToPath(out)} (${results.figures.slow.version}; ${results.figures.corrDuck.version})`);
console.log(failed.length ? `errors:\n  ${failed.join("\n  ")}` : "no errors");
