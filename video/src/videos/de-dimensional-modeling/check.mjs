// Runs every statement the de-dimensional-modeling video shows in DuckDB, the
// engine the Data Engineer data-modeling page's blocks run in the reader's
// browser, and writes what came back to results.json, which data.ts reads.
// From the repo root, where @duckdb/duckdb-wasm (pinned to the version
// runtime/duckdb.ts loads) is installed:
//
//   node video/src/videos/de-dimensional-modeling/check.mjs
//
// Each figure runs in a fresh database built by its own setup, as the page
// gives every block its own engine. Values are printed the way a SQL client
// prints them: a DECIMAL at its scale ("350.00"), a DATE as "2024-01-01", a
// NULL as null. The harness is da-sql's (video/src/videos/da-sql/check.mjs).
//
// The page's three <SqlCodeBlock dialect="duckdb"> blocks run as the page
// gives them (content/interview/data-engineer/data-modeling.mdx): the Type 2
// point-in-time join (its customer 42 is Question 8's figure), the grain
// mismatch fix, and the date dimension (Question 14). Every other table is
// the video's own, marked as such here and in script.ts:
//   - order lines carrying an order-level shipping fee (Question 3);
//   - five sales against two days of budget (Question 4), because the page's
//     own fact_sales holds one row per day and region, so its tables cannot
//     double-count (checked below, under "grainPage");
//   - why-normalization's shop, re-run here (Question 5), so the two videos
//     show the same table: video/src/videos/why-normalization/data.ts;
//   - an account's transactions, its month-end balances and a loan
//     application (Questions 9 and 10);
//   - two days of visits, for the distinct count (Question 10).
/* global console */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
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
  if (typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return String(value);
  return String(value?.valueOf?.() ?? value);
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
      out[id] = { sql, ok: true, cols: fields.map((f) => f.name), rows };
    } catch (e) {
      // DuckDB's message is "<Kind> Error: <text>", then a LINE excerpt.
      out[id] = { sql, ok: false, error: String(e.message).split("\n")[0] };
    }
  }
  const version = (await conn.query("SELECT version() AS v")).toArray()[0].toJSON().v;
  await conn.close();
  await db.terminate();
  await worker.terminate();
  return { steps: out, version };
}

const results = { figures: {} };
const F = results.figures;

// ── The page's own blocks ───────────────────────────────────────────────────

// 1. The Type 2 point-in-time join (the SCD answer's block), exactly as the
//    page gives it. Question 8 shows customer 42's two versions and the key
//    each of its orders resolves to.
const SCD_SETUP = `CREATE TABLE dim_customer (
  customer_key INTEGER,
  customer_id  INTEGER,
  city         VARCHAR,
  valid_from   DATE,
  valid_to     DATE,
  is_current   BOOLEAN
);
INSERT INTO dim_customer VALUES
  (1001, 42, 'Boston', DATE '2022-01-01', DATE '2024-03-14', false),
  (1087, 42, 'Austin', DATE '2024-03-15', DATE '9999-12-31', true),
  (2001, 99, 'Denver', DATE '2023-06-01', DATE '9999-12-31', true),
  (3001, 17, 'Seattle', DATE '2021-04-01', DATE '2023-08-31', false),
  (3062, 17, 'Portland', DATE '2023-09-01', DATE '9999-12-31', true),
  (4001, 23, 'Chicago', DATE '2020-06-15', DATE '2022-12-31', false),
  (4055, 23, 'Detroit', DATE '2023-01-01', DATE '9999-12-31', true),
  (5001, 31, 'Miami', DATE '2022-02-01', DATE '9999-12-31', true),
  (6001, 55, 'Phoenix', DATE '2019-03-01', DATE '2021-11-30', false),
  (6044, 55, 'Tucson', DATE '2021-12-01', DATE '2023-09-30', false),
  (6099, 55, 'Reno', DATE '2023-10-01', DATE '9999-12-31', true),
  (7001, 68, 'Boise', DATE '2021-01-01', DATE '9999-12-31', true),
  (8001, 74, 'Dallas', DATE '2020-09-01', DATE '2022-04-30', false),
  (8033, 74, 'Houston', DATE '2022-05-01', DATE '9999-12-31', true),
  (9001, 86, 'Atlanta', DATE '2022-07-01', DATE '9999-12-31', true),
  (9501, 91, 'Nashville', DATE '2021-10-01', DATE '2023-03-31', false),
  (9577, 91, 'Memphis', DATE '2023-04-01', DATE '9999-12-31', true),
  (9801, 12, 'Denver', DATE '2020-01-01', DATE '9999-12-31', true),
  (9901, 28, 'Omaha', DATE '2021-05-01', DATE '2022-12-31', false),
  (9955, 28, 'Wichita', DATE '2023-01-01', DATE '9999-12-31', true),
  (9971, 39, 'Austin', DATE '2020-08-01', DATE '9999-12-31', true),
  (9982, 47, 'Tampa', DATE '2019-11-01', DATE '2021-06-30', false),
  (9988, 47, 'Orlando', DATE '2021-07-01', DATE '9999-12-31', true),
  (9994, 63, 'Raleigh', DATE '2022-03-01', DATE '9999-12-31', true);

CREATE TABLE fact_orders (
  order_id    INTEGER,
  customer_id INTEGER,
  order_date  DATE,
  amount      DECIMAL(10,2)
);
INSERT INTO fact_orders VALUES
  (101, 42, DATE '2023-05-10', 350.00), (102, 42, DATE '2024-06-01', 200.00),
  (103, 99, DATE '2024-01-15', 500.00), (104, 17, DATE '2022-07-14', 640.00),
  (105, 17, DATE '2024-03-08', 415.00), (106, 23, DATE '2021-04-19', 980.00),
  (107, 23, DATE '2023-08-22', 275.00), (108, 31, DATE '2023-10-05', 1530.00),
  (109, 55, DATE '2020-06-11', 720.00), (110, 55, DATE '2022-09-27', 460.00),
  (111, 55, DATE '2024-01-16', 1105.00), (112, 68, DATE '2023-05-30', 385.00),
  (113, 74, DATE '2021-03-24', 890.00), (114, 74, DATE '2023-12-09', 540.00),
  (115, 86, DATE '2023-11-18', 1250.00), (116, 91, DATE '2022-12-02', 305.00),
  (117, 91, DATE '2024-03-15', 770.00), (118, 12, DATE '2022-06-07', 1420.00),
  (119, 28, DATE '2022-03-21', 195.00), (120, 28, DATE '2023-09-13', 660.00),
  (121, 39, DATE '2023-02-26', 1080.00), (122, 47, DATE '2020-09-04', 425.00),
  (123, 47, DATE '2023-06-17', 935.00), (124, 63, DATE '2023-10-28', 580.00);`;
F.scd = await figure(SCD_SETUP, {
  page: `SELECT f.order_id, f.order_date, d.city, f.amount
FROM fact_orders f
JOIN dim_customer d
  ON  d.customer_id = f.customer_id
  AND f.order_date BETWEEN d.valid_from AND d.valid_to
ORDER BY f.order_id;`,
  // Customer 42's two versions: one natural key on two rows.
  versions: `SELECT customer_key, customer_id, city
FROM dim_customer
WHERE customer_id = 42
ORDER BY valid_from;`,
  // The surrogate key each of customer 42's orders resolves to, by the page's own join.
  orders: `SELECT f.order_id, f.order_date, d.customer_key, d.city
FROM fact_orders f
JOIN dim_customer d
  ON  d.customer_id = f.customer_id
  AND f.order_date BETWEEN d.valid_from AND d.valid_to
WHERE f.customer_id = 42
ORDER BY f.order_id;`,
  // The natural key can't be the dimension's key: how many ids repeat.
  repeats: `SELECT COUNT(*) AS ids, COUNT(*) FILTER (WHERE n > 1) AS repeated
FROM (SELECT customer_id, COUNT(*) AS n FROM dim_customer GROUP BY customer_id);`,
});

// 2. The grain-mismatch block, exactly as the page gives it, and a check of
//    what it can show: its fact_sales holds one row per day and region, the
//    same grain as fact_budget, so even the naive join counts every budget
//    row once. Not on screen; the video builds tables that do mismatch.
const PAGE_GRAIN_SETUP = `CREATE TABLE fact_sales (
  sale_date DATE,
  region    VARCHAR,
  amount    DECIMAL(10,2)
);
INSERT INTO fact_sales VALUES
  (DATE '2024-01-01', 'North', 60.00),
  (DATE '2024-01-01', 'South', 97.00),
  (DATE '2024-01-02', 'North', 134.00),
  (DATE '2024-01-02', 'South', 171.00),
  (DATE '2024-01-03', 'North', 208.00),
  (DATE '2024-01-03', 'South', 65.00),
  (DATE '2024-01-04', 'North', 102.00),
  (DATE '2024-01-04', 'South', 139.00),
  (DATE '2024-01-05', 'North', 176.00),
  (DATE '2024-01-05', 'South', 213.00),
  (DATE '2024-01-06', 'North', 70.00),
  (DATE '2024-01-06', 'South', 107.00),
  (DATE '2024-01-07', 'North', 144.00),
  (DATE '2024-01-07', 'South', 181.00),
  (DATE '2024-01-08', 'North', 218.00),
  (DATE '2024-01-08', 'South', 75.00),
  (DATE '2024-01-09', 'North', 112.00),
  (DATE '2024-01-09', 'South', 149.00),
  (DATE '2024-01-10', 'North', 186.00),
  (DATE '2024-01-10', 'South', 223.00),
  (DATE '2024-01-11', 'North', 80.00),
  (DATE '2024-01-11', 'South', 117.00),
  (DATE '2024-01-12', 'North', 154.00),
  (DATE '2024-01-12', 'South', 191.00);

CREATE TABLE fact_budget (
  sale_date DATE,
  region    VARCHAR,
  budget    DECIMAL(10,2)
);
INSERT INTO fact_budget VALUES
  (DATE '2024-01-01', 'North', 150.00),
  (DATE '2024-01-01', 'South', 173.00),
  (DATE '2024-01-02', 'North', 196.00),
  (DATE '2024-01-02', 'South', 219.00),
  (DATE '2024-01-03', 'North', 242.00),
  (DATE '2024-01-03', 'South', 265.00),
  (DATE '2024-01-04', 'North', 288.00),
  (DATE '2024-01-04', 'South', 311.00),
  (DATE '2024-01-05', 'North', 334.00),
  (DATE '2024-01-05', 'South', 157.00),
  (DATE '2024-01-06', 'North', 180.00),
  (DATE '2024-01-06', 'South', 203.00),
  (DATE '2024-01-07', 'North', 226.00),
  (DATE '2024-01-07', 'South', 249.00),
  (DATE '2024-01-08', 'North', 272.00),
  (DATE '2024-01-08', 'South', 295.00),
  (DATE '2024-01-09', 'North', 318.00),
  (DATE '2024-01-09', 'South', 341.00),
  (DATE '2024-01-10', 'North', 164.00),
  (DATE '2024-01-10', 'South', 187.00),
  (DATE '2024-01-11', 'North', 210.00),
  (DATE '2024-01-11', 'South', 233.00),
  (DATE '2024-01-12', 'North', 256.00),
  (DATE '2024-01-12', 'South', 279.00);`;
F.grainPage = await figure(PAGE_GRAIN_SETUP, {
  page: `WITH daily_sales AS (
  SELECT sale_date, region, SUM(amount) AS total_sales
  FROM fact_sales
  GROUP BY sale_date, region
)
SELECT b.sale_date, b.region, b.budget, ds.total_sales
FROM fact_budget b
JOIN daily_sales ds
  ON ds.sale_date = b.sale_date AND ds.region = b.region
ORDER BY b.sale_date, b.region;`,
  salesPerKey: "SELECT MAX(n) AS most_rows_per_day_and_region FROM (SELECT COUNT(*) AS n FROM fact_sales GROUP BY sale_date, region);",
  naive: `SELECT COUNT(*) AS joined_rows, SUM(b.budget) AS budget
FROM fact_budget b
JOIN fact_sales s ON s.sale_date = b.sale_date AND s.region = b.region;`,
  budget: "SELECT COUNT(*) AS rows, SUM(budget) AS budget FROM fact_budget;",
});

// 3. The date-dimension block, exactly as the page gives it (Question 14),
//    and average order value over its orders, with and without the holidays
//    (Question 15: one name, two definitions).
const PAGE_DATE_SETUP = `CREATE TABLE dim_date (
  date_key        INTEGER,
  calendar_date   DATE,
  fiscal_quarter  VARCHAR,
  is_holiday      BOOLEAN,
  day_of_week_name VARCHAR
);
INSERT INTO dim_date VALUES
  (20240101, DATE '2024-01-01', 'Q1', true,  'Monday'),
  (20240102, DATE '2024-01-02', 'Q1', false, 'Tuesday'),
  (20240103, DATE '2024-01-03', 'Q1', false, 'Wednesday'),
  (20240115, DATE '2024-01-15', 'Q1', false, 'Monday'),
  (20240116, DATE '2024-01-16', 'Q1', false, 'Tuesday'),
  (20240201, DATE '2024-02-01', 'Q1', false, 'Thursday'),
  (20240214, DATE '2024-02-14', 'Q1', false, 'Wednesday'),
  (20240219, DATE '2024-02-19', 'Q1', true,  'Monday'),
  (20240301, DATE '2024-03-01', 'Q1', false, 'Friday'),
  (20240315, DATE '2024-03-15', 'Q1', false, 'Friday'),
  (20240329, DATE '2024-03-29', 'Q1', true,  'Friday'),
  (20240401, DATE '2024-04-01', 'Q2', false, 'Monday'),
  (20240415, DATE '2024-04-15', 'Q2', false, 'Monday'),
  (20240430, DATE '2024-04-30', 'Q2', false, 'Tuesday'),
  (20240501, DATE '2024-05-01', 'Q2', false, 'Wednesday'),
  (20240527, DATE '2024-05-27', 'Q2', true,  'Monday'),
  (20240603, DATE '2024-06-03', 'Q2', false, 'Monday'),
  (20240619, DATE '2024-06-19', 'Q2', true,  'Wednesday'),
  (20240701, DATE '2024-07-01', 'Q3', false, 'Monday'),
  (20240704, DATE '2024-07-04', 'Q3', true,  'Thursday'),
  (20240815, DATE '2024-08-15', 'Q3', false, 'Thursday'),
  (20240902, DATE '2024-09-02', 'Q3', true,  'Monday'),
  (20241001, DATE '2024-10-01', 'Q4', false, 'Tuesday'),
  (20241128, DATE '2024-11-28', 'Q4', true,  'Thursday');

CREATE TABLE fact_orders (
  order_id       INTEGER,
  order_date_key INTEGER,
  amount         DECIMAL(10,2)
);
INSERT INTO fact_orders VALUES
  (1, 20240101, 50.00),   (2, 20240102, 200.00),  (3, 20240103, 120.00),
  (4, 20240115, 175.00),  (5, 20240116, 65.00),   (6, 20240201, 240.00),
  (7, 20240214, 95.00),   (8, 20240219, 310.00),  (9, 20240301, 145.00),
  (10, 20240315, 220.00), (11, 20240329, 80.00),  (12, 20240401, 300.00),
  (13, 20240415, 90.00),  (14, 20240430, 265.00), (15, 20240501, 130.00),
  (16, 20240527, 185.00), (17, 20240603, 55.00),  (18, 20240619, 275.00),
  (19, 20240701, 160.00), (20, 20240704, 340.00), (21, 20240815, 105.00),
  (22, 20240902, 195.00), (23, 20241001, 250.00), (24, 20241128, 415.00);`;
F.datePage = await figure(PAGE_DATE_SETUP, {
  page: `SELECT d.fiscal_quarter, SUM(f.amount) AS revenue
FROM fact_orders f
JOIN dim_date d ON d.date_key = f.order_date_key
WHERE d.is_holiday = false
GROUP BY d.fiscal_quarter
ORDER BY d.fiscal_quarter;`,
  holidays: "SELECT COUNT(*) AS holidays FROM dim_date WHERE is_holiday;",
  aovAll: "SELECT SUM(amount) AS revenue, COUNT(*) AS orders, ROUND(SUM(amount) / COUNT(*), 2) AS aov FROM fact_orders;",
  aovWorking: `SELECT SUM(f.amount) AS revenue, COUNT(*) AS orders, ROUND(SUM(f.amount) / COUNT(*), 2) AS aov
FROM fact_orders f JOIN dim_date d ON d.date_key = f.order_date_key
WHERE NOT d.is_holiday;`,
});

// ── The video's own tables ──────────────────────────────────────────────────

// Question 3. A fact declared at one row per order line, given a column that
// belongs to the whole order: order 1001's shipping fee, on each of its lines.
F.lines = await figure(
  `CREATE TABLE fact_order_lines (
  order_id     INTEGER,
  line         INTEGER,
  product      VARCHAR,
  quantity     INTEGER,
  amount       DECIMAL(10,2),
  shipping_fee DECIMAL(10,2)
);
INSERT INTO fact_order_lines VALUES
  (1001, 1, 'Notebook', 2, 16.00, 5.00),
  (1001, 2, 'Pen',      3,  4.50, 5.00),
  (1001, 3, 'Mug',      1, 12.00, 5.00);`,
  {
    rows: "SELECT * FROM fact_order_lines ORDER BY order_id, line;",
    totals: "SELECT SUM(quantity) AS quantity, SUM(amount) AS amount, SUM(shipping_fee) AS shipping_fee FROM fact_order_lines;",
    // Where the fee belongs: a fact at order grain.
    orders: `SELECT order_id, MAX(shipping_fee) AS shipping_fee
FROM fact_order_lines GROUP BY order_id;`,
  },
);

// Question 4. Five sales, recorded per transaction, against a budget kept one
// row per day and region: the join repeats each day's budget once per sale.
const MISMATCH_SETUP = `CREATE TABLE fact_sales (
  sale_id   INTEGER,
  sale_date DATE,
  region    VARCHAR,
  amount    DECIMAL(10,2)
);
INSERT INTO fact_sales VALUES
  (1, DATE '2024-01-01', 'North', 40.00),
  (2, DATE '2024-01-01', 'North', 25.00),
  (3, DATE '2024-01-01', 'North', 35.00),
  (4, DATE '2024-01-02', 'North', 60.00),
  (5, DATE '2024-01-02', 'North', 30.00);

CREATE TABLE fact_budget (
  sale_date DATE,
  region    VARCHAR,
  budget    DECIMAL(10,2)
);
INSERT INTO fact_budget VALUES
  (DATE '2024-01-01', 'North', 150.00),
  (DATE '2024-01-02', 'North', 120.00);`;
F.mismatch = await figure(MISMATCH_SETUP, {
  sales: "SELECT sale_date, region, amount FROM fact_sales ORDER BY sale_id;",
  budget: "SELECT sale_date, region, budget FROM fact_budget ORDER BY sale_date;",
  naive: `SELECT s.sale_date, s.amount, b.budget
FROM fact_sales s
JOIN fact_budget b
  ON b.sale_date = s.sale_date AND b.region = s.region
ORDER BY s.sale_id;`,
  naiveTotals: `SELECT SUM(s.amount) AS sales, SUM(b.budget) AS budget
FROM fact_sales s
JOIN fact_budget b
  ON b.sale_date = s.sale_date AND b.region = s.region;`,
  fixed: `WITH daily_sales AS (
  SELECT sale_date, region, SUM(amount) AS sales
  FROM fact_sales
  GROUP BY sale_date, region
)
SELECT b.sale_date, b.budget, d.sales
FROM fact_budget b
JOIN daily_sales d
  ON d.sale_date = b.sale_date AND d.region = b.region
ORDER BY b.sale_date;`,
  fixedTotals: `WITH daily_sales AS (
  SELECT sale_date, region, SUM(amount) AS sales
  FROM fact_sales
  GROUP BY sale_date, region
)
SELECT SUM(d.sales) AS sales, SUM(b.budget) AS budget
FROM fact_budget b
JOIN daily_sales d
  ON d.sale_date = b.sale_date AND d.region = b.region;`,
});

// Question 5. why-normalization's shop (its data.ts: orders 1 and 2 are
// Ada's, order 3 is Grace's), the same statements run here in DuckDB: one
// wide table, the rushed update, and the two-table design with its join.
F.norm = await figure(
  `CREATE TABLE orders_flat (
  order_id       INTEGER PRIMARY KEY,
  product_name   TEXT NOT NULL,
  customer_name  TEXT NOT NULL,
  customer_email TEXT NOT NULL
);
INSERT INTO orders_flat VALUES
  (1, 'Notebook', 'Ada',   'ada@old.test'),
  (2, 'Pencil',   'Ada',   'ada@old.test'),
  (3, 'Notebook', 'Grace', 'grace@test.test');
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL
);
CREATE TABLE orders (
  order_id     INTEGER PRIMARY KEY,
  product_name TEXT NOT NULL,
  customer_id  INTEGER NOT NULL REFERENCES customers
);
INSERT INTO customers VALUES
  (1, 'Ada',   'ada@old.test'),
  (2, 'Grace', 'grace@test.test');
INSERT INTO orders VALUES
  (1, 'Notebook', 1),
  (2, 'Pencil',   1),
  (3, 'Notebook', 2);`,
  {
    flat: "SELECT * FROM orders_flat ORDER BY order_id;",
    customers: "SELECT * FROM customers ORDER BY customer_id;",
    orders: "SELECT * FROM orders ORDER BY order_id;",
    join: `SELECT o.order_id, o.product_name, c.name, c.email
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
ORDER BY o.order_id;`,
    update: "UPDATE orders_flat SET customer_email = 'ada@new.test' WHERE order_id = 1;",
    flatAfter: "SELECT * FROM orders_flat ORDER BY order_id;",
    emails: "SELECT COUNT(DISTINCT customer_email) AS emails FROM orders_flat WHERE customer_name = 'Ada';",
  },
);

// Questions 9 and 10. Two accounts' transactions over a quarter, the
// month-end balances built from them (a periodic snapshot), and a loan
// application whose dates fill in as it moves along (an accumulating
// snapshot). All the video's own.
const ACCOUNT_SETUP = `CREATE TABLE fact_transactions (
  txn_date DATE,
  account  VARCHAR,
  amount   DECIMAL(10,2)
);
INSERT INTO fact_transactions VALUES
  (DATE '2024-01-05', 'Ada', 1000.00),
  (DATE '2024-01-09', 'Ben',  500.00),
  (DATE '2024-02-03', 'Ada',  300.00),
  (DATE '2024-02-20', 'Ada', -100.00),
  (DATE '2024-03-12', 'Ada', -300.00),
  (DATE '2024-03-18', 'Ben',  200.00);
CREATE TABLE fact_balance AS
SELECT m.month_end, a.account,
       SUM(t.amount) AS balance
FROM (VALUES (DATE '2024-01-31'), (DATE '2024-02-29'), (DATE '2024-03-31')) m(month_end)
CROSS JOIN (SELECT DISTINCT account FROM fact_transactions) a
JOIN fact_transactions t
  ON t.account = a.account AND t.txn_date <= m.month_end
GROUP BY m.month_end, a.account;
CREATE TABLE fact_loan_application (
  application_id INTEGER,
  applied        DATE,
  approved       DATE,
  funded         DATE
);
INSERT INTO fact_loan_application VALUES (7, DATE '2024-03-04', NULL, NULL);`;
F.account = await figure(ACCOUNT_SETUP, {
  transactions: "SELECT txn_date, account, amount FROM fact_transactions WHERE account = 'Ada' ORDER BY txn_date;",
  snapshotAda: "SELECT month_end, account, balance FROM fact_balance WHERE account = 'Ada' ORDER BY month_end;",
  balance: "SELECT month_end, account, balance FROM fact_balance ORDER BY month_end, account;",
  // Additive: the amounts sum over anything, here the whole quarter.
  flows: "SELECT SUM(amount) AS amount FROM fact_transactions;",
  // Semi-additive: across accounts on one day is right...
  acrossAccounts: "SELECT SUM(balance) AS balance FROM fact_balance WHERE month_end = DATE '2024-03-31';",
  // ...across the quarter's month-ends is not...
  overTime: "SELECT SUM(balance) AS balance FROM fact_balance;",
  // ...and the last value in the period is.
  closing: `SELECT account, arg_max(balance, month_end) AS closing
FROM fact_balance
GROUP BY account
ORDER BY account;`,
  closingTotal: `SELECT SUM(closing) AS balance FROM (
  SELECT arg_max(balance, month_end) AS closing
  FROM fact_balance GROUP BY account);`,
  average: "SELECT account, ROUND(AVG(balance), 2) AS average FROM fact_balance GROUP BY account ORDER BY account;",
  // The accumulating snapshot, as each stage lands: one row, updated in place.
  applied: "SELECT * FROM fact_loan_application;",
  approve: "UPDATE fact_loan_application SET approved = DATE '2024-03-11' WHERE application_id = 7;",
  approved: "SELECT * FROM fact_loan_application;",
  fund: "UPDATE fact_loan_application SET funded = DATE '2024-03-20' WHERE application_id = 7;",
  funded: "SELECT * FROM fact_loan_application;",
  stages: `SELECT date_diff('day', applied, approved) AS days_to_approve,
       date_diff('day', approved, funded) AS days_to_fund
FROM fact_loan_application;`,
});

// Question 10, non-additive: distinct users per day, and over both days.
F.visits = await figure(
  `CREATE TABLE visits (day VARCHAR, user_name VARCHAR);
INSERT INTO visits VALUES
  ('Mon', 'Ada'), ('Mon', 'Ben'), ('Mon', 'Cy'),
  ('Tue', 'Ben'), ('Tue', 'Cy'),  ('Tue', 'Di');`,
  {
    perDay: "SELECT day, COUNT(DISTINCT user_name) AS users FROM visits GROUP BY day ORDER BY day;",
    both: "SELECT COUNT(DISTINCT user_name) AS users FROM visits;",
  },
);

// ── Checks: what the narration says has to be what came back ───────────────

const one = (fig, step) => {
  const s = F[fig].steps[step];
  if (!s.ok) throw new Error(`${fig}.${step} failed: ${s.error}`);
  return s.rows;
};
const expect = (what, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
for (const [fig, f] of Object.entries(F)) for (const [id, s] of Object.entries(f.steps)) if (!s.ok) throw new Error(`${fig}.${id}: ${s.error}`);
expect("customer 42's versions", one("scd", "versions"), [["1001", "42", "Boston"], ["1087", "42", "Austin"]]);
expect("customer 42's orders", one("scd", "orders").map((r) => [r[0], r[2], r[3]]), [["101", "1001", "Boston"], ["102", "1087", "Austin"]]);
expect("the page's sales grain", one("grainPage", "salesPerKey"), [["1"]]);
expect("the page's naive join", one("grainPage", "naive")[0][1], one("grainPage", "budget")[0][1]);
expect("shipping summed", one("lines", "totals")[0][2], "15.00");
expect("mismatch naive", one("mismatch", "naiveTotals"), [["190.00", "690.00"]]);
expect("mismatch fixed", one("mismatch", "fixedTotals"), [["190.00", "270.00"]]);
expect("Ada's two emails", one("norm", "emails"), [["2"]]);
expect("balances", one("account", "balance").map((r) => r[2]), ["1000.00", "500.00", "1200.00", "500.00", "900.00", "700.00"]);
expect("across accounts", one("account", "acrossAccounts"), [["1600.00"]]);
expect("over time", one("account", "overTime"), [["4800.00"]]);
expect("closing total", one("account", "closingTotal"), [["1600.00"]]);
expect("stages", one("account", "stages"), [["7", "9"]]);
expect("distinct", one("visits", "both"), [["4"]]);

results.version = F.scd.version;
const path = join(here, "results.json");
writeFileSync(path, JSON.stringify(results, null, 2) + "\n");
console.log(`wrote ${path} (DuckDB ${results.version})`);
for (const [fig, f] of Object.entries(F)) {
  for (const [id, s] of Object.entries(f.steps)) {
    console.log(`${fig}.${id}: ${s.cols.join(", ")} -> ${JSON.stringify(s.rows).slice(0, 220)}`);
  }
}
