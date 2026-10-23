// Runs every statement the da-sql video shows in DuckDB, the engine the Data
// Analyst SQL page's blocks run in the reader's browser, and writes what came
// back to results.json, which data.ts reads. From the repo root, where
// @duckdb/duckdb-wasm (pinned to the version runtime/duckdb.ts loads) is
// installed:
//
//   node video/src/videos/da-sql/check.mjs
//
// Each figure runs in a fresh database built by its own setup, as the page
// gives every block its own engine. Values are printed the way a SQL client
// prints them: a DECIMAL at its scale ("798.75"), a DATE as "2024-01-01", a
// NULL as null. Tables are the page's own (content/interview/data-analyst/
// sql.mdx) wherever the page has one; the few rows the page doesn't give are
// marked "the video's own" below and in script.ts.
/* global console, URL */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../../../package.json"));
const duckdb = require("@duckdb/duckdb-wasm");
const { default: Worker } = await import(pathToFileURL(require.resolve("web-worker")).href);
const dist = join(dirname(require.resolve("@duckdb/duckdb-wasm")), "..", "dist");
const bundle = await duckdb.selectBundle({
  mvp: { mainModule: join(dist, "duckdb-mvp.wasm"), mainWorker: join(dist, "duckdb-node-mvp.worker.cjs") },
  eh: { mainModule: join(dist, "duckdb-eh.wasm"), mainWorker: join(dist, "duckdb-node-eh.worker.cjs") },
});

/** One value as a SQL client prints it, from its Arrow column type. */
function shown(value, type) {
  if (value === null || value === undefined) return null;
  const t = String(type);
  if (t.startsWith("Decimal")) {
    const scale = type.scale ?? 0;
    const digits = String(value).replace("-", "").padStart(scale + 1, "0");
    const sign = String(value).startsWith("-") ? "-" : "";
    return scale ? `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}` : `${sign}${digits}`;
  }
  if (t.startsWith("Date")) return new Date(Number(value)).toISOString().slice(0, 10);
  if (t.startsWith("Timestamp")) return new Date(Number(value)).toISOString().slice(0, 19).replace("T", " ");
  if (typeof value === "bigint") return Number(value);
  return value?.valueOf?.() ?? value;
}

async function figure(setup, steps) {
  const worker = new Worker(pathToFileURL(bundle.mainWorker).href, { type: "module" });
  const db = new duckdb.AsyncDuckDB({ log: () => {} }, worker);
  await db.instantiate(bundle.mainModule);
  const conn = await db.connect();
  for (const stmt of setup.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) await conn.query(stmt);
  const out = {};
  for (const [id, sql] of Object.entries(steps)) {
    try {
      const table = await conn.query(sql);
      const fields = table.schema.fields;
      const rows = table.toArray().map((r) => {
        const obj = r.toJSON();
        return fields.map((f) => shown(obj[f.name], f.type));
      });
      out[id] = { sql, ok: true, columns: fields.map((f) => f.name), rows };
    } catch (e) {
      // DuckDB's message is "<Kind> Error: <text>", then a LINE excerpt.
      const message = String(e.message).split("\n")[0];
      out[id] = { sql, ok: false, error: message };
    }
  }
  const version = (await conn.query("SELECT version() AS v")).toArray()[0].toJSON().v;
  await conn.close();
  await db.terminate();
  await worker.terminate();
  return { setup, steps: out, version };
}

// ── The page's tables ───────────────────────────────────────────────────────

/** The page's first block: 24 orders, a region and an amount each. */
const PAGE_ORDERS = `CREATE TABLE orders (region TEXT, amount DECIMAL(8,2));
INSERT INTO orders VALUES
  ('North', 120.00), ('South', 80.50), ('East', 200.00),
  ('West', 50.25),   ('North', 60.00), ('South', 90.00),
  ('East', 140.00),  ('West', 110.00), ('North', 75.50),
  ('South', 65.00),  ('North', 145.75), ('East', 95.00),
  ('West', 40.00),   ('South', 130.25), ('North', 88.00),
  ('East', 175.50),  ('West', 62.75),   ('South', 105.00),
  ('North', 210.00), ('East', 45.25),   ('West', 155.00),
  ('South', 70.75),  ('North', 99.50),  ('East', 185.00);`;

/** The page's second challenge, its first four customers and every one of
 *  their orders, ids and amounts unchanged. Di never ordered. */
const PAGE_CUSTOMERS = `CREATE TABLE customers (id INTEGER, name TEXT);
INSERT INTO customers VALUES (1, 'Ava'), (2, 'Ben'), (3, 'Cy'), (4, 'Di');`;
const PAGE_CUSTOMER_ORDERS = `CREATE TABLE orders (id INTEGER, customer_id INTEGER, amount DECIMAL(8,2));
INSERT INTO orders VALUES
  (101, 1, 120.00), (102, 1, 40.00), (103, 2, 80.00),
  (104, 3, 55.00),  (105, 3, 45.00), (106, 2, 30.00);`;

const results = { figures: {} };

// 1. WHERE against HAVING, and the order a query runs in. The thresholds
//    (amount >= 100, revenue > 400 and > 600) are the video's own.
results.figures.where = await figure(PAGE_ORDERS, {
  rows: "SELECT COUNT(*) AS n FROM orders;",
  // The 24 rows in the page's order, for the figure that runs them through.
  table: "SELECT region, amount FROM orders ORDER BY rowid;",
  totals: "SELECT region, SUM(amount) AS revenue FROM orders GROUP BY region ORDER BY revenue DESC;",
  whereAggregate: "SELECT region, SUM(amount) AS revenue\nFROM orders\nWHERE SUM(amount) > 600\nGROUP BY region;",
  having: "SELECT region, SUM(amount) AS revenue\nFROM orders\nGROUP BY region\nHAVING SUM(amount) > 600\nORDER BY revenue DESC;",
  bigRows: "SELECT COUNT(*) AS n FROM orders WHERE amount >= 100;",
  bigGroups:
    "SELECT region, COUNT(*) AS orders, SUM(amount) AS revenue FROM orders WHERE amount >= 100 GROUP BY region ORDER BY revenue DESC;",
  both:
    "SELECT region, SUM(amount) AS revenue\nFROM orders\nWHERE amount >= 100\nGROUP BY region\nHAVING SUM(amount) > 400\nORDER BY revenue DESC\nLIMIT 10;",
  // Not shown: DuckDB lets WHERE see a plain SELECT alias, which standard
  // SQL and Postgres refuse. An aggregate's alias still fails (as above).
  plainAlias: "SELECT region, amount * 2 AS doubled FROM orders WHERE doubled > 400 ORDER BY doubled DESC;",
});

// 2. The four joins, and the LEFT JOIN trap. Order 125, for a customer 25
//    who isn't in the table, is the video's own row: the page's data has no
//    order without a customer, and RIGHT and FULL need one to show anything.
const JOINS_SETUP = `${PAGE_CUSTOMERS}
${PAGE_CUSTOMER_ORDERS.replace("(106, 2, 30.00);", "(106, 2, 30.00), (125, 25, 64.00);")}`;
const pick = "c.name, o.id AS order_id, o.amount";
results.figures.joins = await figure(JOINS_SETUP, {
  customers: "SELECT id, name FROM customers ORDER BY id;",
  orders: "SELECT id, customer_id, amount FROM orders ORDER BY id;",
  inner: `SELECT ${pick} FROM customers c INNER JOIN orders o ON o.customer_id = c.id ORDER BY o.id;`,
  left: `SELECT ${pick} FROM customers c LEFT JOIN orders o ON o.customer_id = c.id ORDER BY o.id NULLS LAST, c.id;`,
  right: `SELECT ${pick} FROM customers c RIGHT JOIN orders o ON o.customer_id = c.id ORDER BY o.id;`,
  full: `SELECT ${pick} FROM customers c FULL JOIN orders o ON o.customer_id = c.id ORDER BY o.id NULLS LAST, c.id;`,
});
results.figures.leftTrap = await figure(`${PAGE_CUSTOMERS}\n${PAGE_CUSTOMER_ORDERS}`, {
  // The left join before any filter: every customer, Di with a null.
  joined: "SELECT c.name, o.amount FROM customers c LEFT JOIN orders o ON o.customer_id = c.id ORDER BY c.id, o.id;",
  whereRight:
    "SELECT c.name, o.amount\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.id\nWHERE o.amount > 50\nORDER BY c.id;",
  inOn: "SELECT c.name, o.amount\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.id\n  AND o.amount > 50\nORDER BY c.id;",
});

// 3. Fan-out. The first two orders of the Analytics Engineer track's fan-trap
//    block (content/interview/analytics-engineer/metrics-and-semantic-layer.mdx).
const FANOUT_SETUP = `CREATE TABLE orders (order_id INTEGER, amount DECIMAL(8,2));
INSERT INTO orders VALUES (1, 100.00), (2, 50.00);
CREATE TABLE order_items (order_id INTEGER, item TEXT);
INSERT INTO order_items VALUES (1, 'A'), (1, 'B'), (1, 'C'), (2, 'D');`;
results.figures.fanout = await figure(FANOUT_SETUP, {
  ordersTable: "SELECT order_id, amount FROM orders ORDER BY order_id;",
  itemsTable: "SELECT order_id, item FROM order_items ORDER BY order_id, item;",
  orders: "SELECT SUM(amount) AS revenue FROM orders;",
  joined: "SELECT o.order_id, o.amount, i.item FROM orders o JOIN order_items i ON i.order_id = o.order_id ORDER BY i.item;",
  inflated: "SELECT SUM(o.amount) AS revenue\nFROM orders o\nJOIN order_items i\n  ON i.order_id = o.order_id;",
  fixed:
    "WITH items AS (\n  SELECT order_id, COUNT(*) AS n\n  FROM order_items GROUP BY order_id\n)\nSELECT SUM(o.amount) AS revenue,\n       SUM(items.n) AS items\nFROM orders o\nJOIN items ON items.order_id = o.order_id;",
});

// 4. NULLs in comparisons and aggregates. The six discounts are the video's
//    own; the page's answer is the rule they illustrate.
const NULLS_SETUP = `CREATE TABLE orders (id INTEGER, discount INTEGER);
INSERT INTO orders VALUES (1, 10), (2, NULL), (3, 5), (4, NULL), (5, 0), (6, 15);`;
results.figures.nulls = await figure(NULLS_SETUP, {
  table: "SELECT id, discount FROM orders ORDER BY id;",
  equalsNull: "SELECT COUNT(*) FROM orders\nWHERE discount = NULL;",
  isNull: "SELECT COUNT(*) FROM orders\nWHERE discount IS NULL;",
  nullEqualsNull: "SELECT NULL = NULL AS same;",
  counts:
    "SELECT COUNT(*), COUNT(1), COUNT(discount),\n       AVG(discount),\n       AVG(COALESCE(discount, 0))\nFROM orders;",
});

// 5. The anti-join, and NOT IN against a NULL. Order 107, a guest checkout
//    with no customer, is the video's own row.
const ANTI_SETUP = `${PAGE_CUSTOMERS}
${PAGE_CUSTOMER_ORDERS.replace("(106, 2, 30.00);", "(106, 2, 30.00), (107, NULL, 25.00);")}`;
results.figures.anti = await figure(ANTI_SETUP, {
  customers: "SELECT id, name FROM customers ORDER BY id;",
  orders: "SELECT id, customer_id FROM orders ORDER BY id;",
  notIn: "SELECT name FROM customers\nWHERE id NOT IN (\n  SELECT customer_id FROM orders\n);",
  notExists: "SELECT c.name FROM customers c\nWHERE NOT EXISTS (\n  SELECT 1 FROM orders o\n  WHERE o.customer_id = c.id\n);",
  leftNull: "SELECT c.name FROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.id\nWHERE o.customer_id IS NULL;",
  notInGuarded:
    "SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL);",
});

// 6. DISTINCT hiding a bug. The fan-out's two orders plus a third that also
//    cost 50.00 (the video's own), each with its items.
const DISTINCT_SETUP = `CREATE TABLE orders (order_id INTEGER, amount DECIMAL(8,2));
INSERT INTO orders VALUES (1, 100.00), (2, 50.00), (3, 50.00);
CREATE TABLE order_items (order_id INTEGER, item TEXT);
INSERT INTO order_items VALUES (1, 'A'), (1, 'B'), (1, 'C'), (2, 'D'), (3, 'E');`;
results.figures.distinct = await figure(DISTINCT_SETUP, {
  ordersTable: "SELECT order_id, amount FROM orders ORDER BY order_id;",
  joined:
    "SELECT o.order_id, o.amount, i.item FROM orders o JOIN order_items i ON i.order_id = o.order_id ORDER BY o.order_id, i.item;",
  joinedRows: "SELECT COUNT(*) AS n FROM orders o JOIN order_items i ON i.order_id = o.order_id;",
  distinctRows:
    "SELECT DISTINCT o.order_id, o.amount\nFROM orders o\nJOIN order_items i\n  ON i.order_id = o.order_id\nORDER BY o.order_id;",
  sumDistinct: "SELECT SUM(DISTINCT o.amount) AS revenue\nFROM orders o\nJOIN order_items i\n  ON i.order_id = o.order_id;",
  truth: "SELECT SUM(amount) AS revenue FROM orders;",
});

// 7. CTEs and subqueries, correlated and not, on the page's orders for its
//    first three customers (their names, for the averages the video reads).
results.figures.subqueries = await figure(`${PAGE_CUSTOMERS}\n${PAGE_CUSTOMER_ORDERS}`, {
  ordersTable: "SELECT id, customer_id, amount FROM orders ORDER BY id;",
  averagesNamed:
    "SELECT c.name, AVG(o.amount) AS avg_amount FROM orders o JOIN customers c ON c.id = o.customer_id GROUP BY c.id, c.name ORDER BY c.id;",
  averages: "SELECT customer_id, AVG(amount) AS avg_amount FROM orders GROUP BY customer_id ORDER BY customer_id;",
  overall: "SELECT AVG(amount) AS avg_amount FROM orders;",
  uncorrelated: "SELECT id, amount FROM orders\nWHERE amount > (\n  SELECT AVG(amount) FROM orders\n)\nORDER BY id;",
  correlated:
    "SELECT id, customer_id, amount\nFROM orders o\nWHERE amount > (\n  SELECT AVG(amount) FROM orders\n  WHERE customer_id = o.customer_id\n)\nORDER BY id;",
  cte: "WITH avgs AS (\n  SELECT customer_id, AVG(amount) AS avg_amount\n  FROM orders GROUP BY customer_id\n)\nSELECT o.id, o.customer_id, o.amount\nFROM orders o\nJOIN avgs ON avgs.customer_id = o.customer_id\nWHERE o.amount > avgs.avg_amount\nORDER BY o.id;",
});

// 8. The rapid-fire round. Each table is the page's example table at its
//    smallest; the rows in them are the video's own, except the employees'
//    names (the page's employees table) and the page's CASE thresholds.
results.figures.rapid = await figure(
  `CREATE TABLE employees (id INTEGER, name TEXT, manager_id INTEGER);
INSERT INTO employees VALUES (1, 'Mona', NULL), (2, 'Gina', 1), (3, 'Bob', 1), (4, 'Sara', 2);
CREATE TABLE store_a (city TEXT);
INSERT INTO store_a VALUES ('Austin'), ('Boston');
CREATE TABLE store_b (city TEXT);
INSERT INTO store_b VALUES ('Boston'), ('Chicago');
CREATE TABLE expected_products (product_id INTEGER);
INSERT INTO expected_products VALUES (1), (2), (3), (4);
CREATE TABLE received_products (product_id INTEGER);
INSERT INTO received_products VALUES (1), (2), (4);
CREATE TABLE tests (student TEXT, score INTEGER);
INSERT INTO tests VALUES ('Ava', 95), ('Ben', NULL), ('Cy', 72);
CREATE TABLE traffic (day INTEGER, discount INTEGER, revenue INTEGER, sessions INTEGER);
INSERT INTO traffic VALUES (1, NULL, 500, 0), (2, 5, 300, 60);
CREATE TABLE users (id INTEGER, email TEXT);
INSERT INTO users VALUES (1, 'ada@example.com'), (2, 'bo@example.com'), (3, 'ada@example.com'), (4, 'cy@example.com'), (5, 'bo@example.com');
CREATE TABLE regions (region TEXT);
INSERT INTO regions VALUES ('North'), ('South'), ('East'), ('West');
CREATE TABLE products (product_name TEXT);
INSERT INTO products VALUES ('Mug'), ('Tee'), ('Cap');`,
  {
    employees: "SELECT id, name, manager_id FROM employees ORDER BY id;",
    storeA: "SELECT city FROM store_a;",
    storeB: "SELECT city FROM store_b;",
    expected: "SELECT product_id FROM expected_products ORDER BY product_id;",
    received: "SELECT product_id FROM received_products ORDER BY product_id;",
    users: "SELECT id, email FROM users ORDER BY id;",
    // What an index on email holds: the emails in order, each with its row.
    emailIndex: "SELECT email, id FROM users ORDER BY email, id;",
    products: "SELECT product_name FROM products;",
    regions: "SELECT region FROM regions;",
    selfJoin:
      "SELECT e.name AS employee, m.name AS manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.id\nORDER BY e.id;",
    union: "SELECT city FROM store_a\nUNION\nSELECT city FROM store_b\nORDER BY city;",
    unionAll: "SELECT city FROM store_a\nUNION ALL\nSELECT city FROM store_b\nORDER BY city;",
    except: "SELECT product_id FROM expected_products\nEXCEPT\nSELECT product_id FROM received_products;",
    caseSizes:
      "SELECT amount, CASE\n  WHEN amount >= 500 THEN 'Large'\n  WHEN amount >= 100 THEN 'Medium'\n  ELSE 'Small' END AS order_size\nFROM (VALUES (620.00), (120.00), (50.25)) AS t(amount);",
    caseEqualsNull:
      "SELECT student, CASE\n  WHEN score = NULL THEN 'Unknown'\n  WHEN score >= 90 THEN 'A'\n  ELSE 'Below A' END AS grade\nFROM tests ORDER BY student;",
    caseIsNull:
      "SELECT student, CASE\n  WHEN score IS NULL THEN 'Unknown'\n  WHEN score >= 90 THEN 'A'\n  ELSE 'Below A' END AS grade\nFROM tests ORDER BY student;",
    coalesceNullif:
      "SELECT day,\n  COALESCE(discount, 0) AS safe_discount,\n  revenue / NULLIF(sessions, 0) AS per_session\nFROM traffic ORDER BY day;",
    divideByZero: "SELECT revenue / sessions AS revenue_per_session FROM traffic ORDER BY day;",
    dates:
      "SELECT EXTRACT(YEAR FROM DATE '2024-01-17') AS order_year,\n  DATE_TRUNC('month', DATE '2024-01-17') AS order_month,\n  DATE '2024-01-17' + INTERVAL '7 days' AS due_date;",
    strings:
      "SELECT UPPER(TRIM('  ada lovelace ')) AS clean_name,\n  LENGTH('ada@example.com') AS email_len,\n  SUBSTRING('ada@example.com', 1, 3) AS prefix,\n  'ada' || '@' || 'example.com' LIKE '%@example.com' AS matches;",
    duplicates: "SELECT email, COUNT(*) AS cnt FROM users\nGROUP BY email\nHAVING COUNT(*) > 1\nORDER BY email;",
    // The numbers the delete below gives each copy, before it runs.
    rowNumbers: "SELECT id, email, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn FROM users ORDER BY id;",
    dedupe:
      "WITH dupes AS (\n  SELECT id, ROW_NUMBER() OVER (\n    PARTITION BY email ORDER BY id) AS rn\n  FROM users)\nDELETE FROM users\nWHERE id IN (SELECT id FROM dupes WHERE rn > 1);",
    afterDedupe: "SELECT id, email FROM users ORDER BY id;",
    crossJoin: "SELECT COUNT(*) FROM products CROSS JOIN regions;",
    crossJoinThousand: "SELECT COUNT(*) FROM range(1000) a CROSS JOIN range(1000) b;",
  },
);

// ROLLUP on the page's first challenge table (with its category column).
results.figures.rollup = await figure(
  `CREATE TABLE orders AS SELECT * FROM (VALUES
  (1,  'North', 'A', 120.00), (2,  'South', 'B',  80.50),
  (3,  'East',  'A', 200.00), (4,  'West',  'C',  50.25),
  (5,  'North', 'B',  60.00), (6,  'South', 'A',  90.00),
  (7,  'East',  'C', 140.00), (8,  'West',  'B', 110.00),
  (9,  'North', 'C',  75.50), (10, 'South', 'B',  65.00),
  (11, 'North', 'A', 145.75), (12, 'East',  'B',  95.00),
  (13, 'West',  'A',  40.00), (14, 'South', 'C', 130.25),
  (15, 'North', 'B',  88.00), (16, 'East',  'A', 175.50),
  (17, 'West',  'C',  62.75), (18, 'South', 'A', 105.00),
  (19, 'North', 'C', 210.00), (20, 'East',  'B',  45.25),
  (21, 'West',  'A', 155.00), (22, 'South', 'B',  70.75),
  (23, 'North', 'A',  99.50), (24, 'East',  'C', 185.00)
) AS t(id, region, category, amount);`,
  {
    rollup:
      "SELECT region, category, SUM(amount) AS revenue\nFROM orders\nGROUP BY ROLLUP (region, category)\nORDER BY region NULLS LAST, category NULLS LAST;",
    groupByAll: "SELECT region, SUM(amount) AS revenue\nFROM orders\nGROUP BY ALL\nORDER BY revenue DESC;",
  },
);

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps)
    .filter(([, s]) => !s.ok)
    .map(([id, s]) => `${f}.${id}: ${s.error}`),
);
console.log(`wrote ${fileURLToPath(out)} (${results.figures.where.version})`);
console.log(failed.length ? `errors, as expected where a figure shows one:\n  ${failed.join("\n  ")}` : "no errors");
