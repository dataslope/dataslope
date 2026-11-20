// Runs every statement the ae-advanced-sql video shows and writes what came
// back to results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/ae-advanced-sql/check.mjs
//
// Postgres first: PGlite (PostgreSQL 18), through
// video/scripts/lib/pg-figure.mjs, the engine the Analytics Engineer advanced
// SQL page's blocks run in the reader's browser. Each figure runs in a fresh
// database built by its own setup, as the page gives every block its own
// engine. Values are printed as psql prints them (a numeric at its scale, a
// DATE as "2024-01-01", a TIMESTAMP to the second, a NULL as null), and an
// error is Postgres's own "ERROR: ..." line.
//
// DuckDB second, only where Postgres can't: QUALIFY (the page's own snippet,
// on the page's own table) and approx_count_distinct. DuckDB-Wasm 1.32.0
// (DuckDB v1.4.3), the version the site serves, through the root's
// scripts/lib/sql-engines.mjs.
//
// Tables are the page's own (content/interview/analytics-engineer/
// advanced-sql.mdx: customer_updates, daily, monthly, logins) wherever the
// page has one, copied verbatim. Data Analyst Part 4's tables
// (da-advanced-sql/check.mjs: six sales, four payments, eight products,
// sales by region and quarter, the org chart) are copied verbatim where this
// video asks them something new; what that video already ran is imported by
// data.ts from its results.json, not run again, so the two series show the
// same table. The rest are marked "the video's own" below and in script.ts.
/* global console, URL */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { figure } from "../../../scripts/lib/pg-figure.mjs";

const { createEngine } = await import(new URL("../../../../scripts/lib/sql-engines.mjs", import.meta.url).href);

// ── The page's tables, verbatim ─────────────────────────────────────────────

/** The page's deduplication block and first challenge. */
const PAGE_CUSTOMER_UPDATES = `CREATE TABLE customer_updates AS SELECT * FROM (VALUES
  (1, TIMESTAMP '2024-01-01 10:00:00', 'a@x.com'),
  (1, TIMESTAMP '2024-03-01 09:00:00', 'a2@x.com'),
  (2, TIMESTAMP '2024-02-01 08:00:00', 'b@x.com'),
  (2, TIMESTAMP '2024-02-15 08:00:00', 'b2@x.com'),
  (3, TIMESTAMP '2024-01-20 12:00:00', 'c@x.com'),
  (3, TIMESTAMP '2024-04-02 07:30:00', 'c2@x.com'),
  (3, TIMESTAMP '2024-05-18 16:45:00', 'c3@x.com'),
  (4, TIMESTAMP '2024-01-09 11:15:00', 'd@x.com'),
  (4, TIMESTAMP '2024-03-22 14:20:00', 'd2@x.com'),
  (5, TIMESTAMP '2024-02-07 09:40:00', 'e@x.com'),
  (5, TIMESTAMP '2024-04-11 13:05:00', 'e2@x.com'),
  (5, TIMESTAMP '2024-06-01 08:55:00', 'e3@x.com'),
  (6, TIMESTAMP '2024-01-14 15:30:00', 'f@x.com'),
  (7, TIMESTAMP '2024-02-23 10:10:00', 'g@x.com'),
  (7, TIMESTAMP '2024-05-04 12:25:00', 'g2@x.com'),
  (8, TIMESTAMP '2024-03-08 07:45:00', 'h@x.com'),
  (8, TIMESTAMP '2024-04-27 17:00:00', 'h2@x.com'),
  (9, TIMESTAMP '2024-01-31 09:20:00', 'i@x.com'),
  (9, TIMESTAMP '2024-03-15 11:35:00', 'i2@x.com'),
  (9, TIMESTAMP '2024-06-09 14:50:00', 'i3@x.com'),
  (10, TIMESTAMP '2024-02-12 08:05:00', 'j@x.com'),
  (10, TIMESTAMP '2024-05-26 16:15:00', 'j2@x.com'),
  (11, TIMESTAMP '2024-04-03 13:40:00', 'k@x.com'),
  (12, TIMESTAMP '2024-05-11 10:55:00', 'l@x.com')
) AS t(customer_id, updated_at, email);`;

/** The page's running-total block: 24 days. */
const PAGE_DAILY = `CREATE TABLE daily AS SELECT * FROM (VALUES
  (DATE '2024-01-01', 10), (DATE '2024-01-02', 20), (DATE '2024-01-03', 5),
  (DATE '2024-01-04', 15), (DATE '2024-01-05', 32), (DATE '2024-01-06', 14),
  (DATE '2024-01-07', 9),  (DATE '2024-01-08', 21), (DATE '2024-01-09', 6),
  (DATE '2024-01-10', 27), (DATE '2024-01-11', 13), (DATE '2024-01-12', 18),
  (DATE '2024-01-13', 34), (DATE '2024-01-14', 5),  (DATE '2024-01-15', 22),
  (DATE '2024-01-16', 16), (DATE '2024-01-17', 9),  (DATE '2024-01-18', 30),
  (DATE '2024-01-19', 12), (DATE '2024-01-20', 24), (DATE '2024-01-21', 7),
  (DATE '2024-01-22', 19), (DATE '2024-01-23', 15), (DATE '2024-01-24', 28)
) AS t(day, amt);`;

/** The page's period-over-period block: 24 months. */
const PAGE_MONTHLY = `CREATE TABLE monthly AS SELECT * FROM (VALUES
  (DATE '2022-07-01', 180), (DATE '2022-08-01', 155), (DATE '2022-09-01', 210),
  (DATE '2022-10-01', 195), (DATE '2022-11-01', 240), (DATE '2022-12-01', 330),
  (DATE '2023-01-01', 145), (DATE '2023-02-01', 165), (DATE '2023-03-01', 220),
  (DATE '2023-04-01', 205), (DATE '2023-05-01', 275), (DATE '2023-06-01', 250),
  (DATE '2023-07-01', 190), (DATE '2023-08-01', 175), (DATE '2023-09-01', 235),
  (DATE '2023-10-01', 260), (DATE '2023-11-01', 290), (DATE '2023-12-01', 385),
  (DATE '2024-01-01', 100), (DATE '2024-02-01', 130), (DATE '2024-03-01', 120),
  (DATE '2024-04-01', 165), (DATE '2024-05-01', 205), (DATE '2024-06-01', 185)
) AS t(month, revenue);`;

/** The page's second challenge: 24 logins over May 1 to 15, five days empty. */
const PAGE_LOGINS = `CREATE TABLE logins AS SELECT * FROM (VALUES
  (101, DATE '2024-05-01'), (102, DATE '2024-05-01'), (101, DATE '2024-05-01'),
  (103, DATE '2024-05-03'), (101, DATE '2024-05-04'), (104, DATE '2024-05-03'),
  (102, DATE '2024-05-04'), (105, DATE '2024-05-05'), (101, DATE '2024-05-05'),
  (106, DATE '2024-05-07'), (103, DATE '2024-05-07'), (107, DATE '2024-05-08'),
  (102, DATE '2024-05-08'), (108, DATE '2024-05-08'), (101, DATE '2024-05-10'),
  (109, DATE '2024-05-10'), (104, DATE '2024-05-11'), (110, DATE '2024-05-11'),
  (105, DATE '2024-05-14'), (102, DATE '2024-05-14'), (111, DATE '2024-05-14'),
  (106, DATE '2024-05-15'), (101, DATE '2024-05-15'), (112, DATE '2024-05-15')
) AS t(user_id, login_date);`;

// ── Data Analyst Part 4's tables, verbatim (da-advanced-sql/check.mjs) ─────

/** Its six sales: the DA page's first six amounts, three days in each of two regions. */
const DA_SALES = `CREATE TABLE sales (day DATE, region TEXT, amount INTEGER);
INSERT INTO sales VALUES
  ('2024-01-01', 'North', 100), ('2024-01-02', 'North', 250), ('2024-01-03', 'North', 75),
  ('2024-01-01', 'South', 180), ('2024-01-02', 'South', 320), ('2024-01-03', 'South', 140);`;

/** Its eight products, Emma and Ulysses tied at 310. */
const DA_PRODUCTS = `CREATE TABLE products (category TEXT, product TEXT, revenue INTEGER);
INSERT INTO products VALUES
  ('Books', 'Dune', 420), ('Books', 'Emma', 310), ('Books', 'Ulysses', 310), ('Books', 'Beloved', 150),
  ('Games', 'Chess', 500), ('Games', 'Go', 260), ('Games', 'Risk', 180), ('Games', 'Uno', 90);`;

/** The DA page's pivot block: 24 sales by region and quarter. */
const DA_PIVOT_SALES = `CREATE TABLE sales (region TEXT, quarter TEXT, amount INTEGER);
INSERT INTO sales VALUES
  ('North','Q1',100), ('North','Q2',140), ('South','Q1',80),
  ('South','Q2',120), ('North','Q1',60),  ('South','Q2',30),
  ('East','Q1',95),   ('East','Q2',175),  ('West','Q1',110),
  ('West','Q2',65),   ('North','Q2',85),  ('South','Q1',145),
  ('East','Q1',40),   ('West','Q2',200),  ('North','Q1',75),
  ('South','Q2',55),  ('East','Q2',130),  ('West','Q1',90),
  ('North','Q2',115), ('South','Q1',35),  ('East','Q1',160),
  ('West','Q2',105),  ('North','Q1',50),  ('South','Q2',185);`;

const results = { figures: {} };

// ── 1, 2, 3. A window against GROUP BY, the three parts of OVER, and a
//    window over an aggregate. DA's six sales: its GROUP BY (North 425, South
//    640) and SUM OVER (PARTITION BY region) are imported from its
//    results.json; these are the new statements.

results.figures.window = await figure(DA_SALES, {
  // The three parts added one at a time, on the same column: no OVER
  // contents (one partition, every row), a partition, then an order, whose
  // default frame makes it a running total inside each region.
  parts:
    "SELECT day, region, amount,\n  SUM(amount) OVER () AS all_rows,\n  SUM(amount) OVER (PARTITION BY region) AS by_region,\n  SUM(amount) OVER (PARTITION BY region ORDER BY day) AS running\nFROM sales\nORDER BY region, day;",
  // The page's "SUM(amt) grouped by region ... SUM(amt) OVER () on the same
  // rows gives the grand total on every row": the window runs after GROUP
  // BY, so it sums the group totals.
  share:
    "SELECT region,\n  SUM(amount) AS total,\n  SUM(SUM(amount)) OVER () AS grand_total,\n  ROUND(100.0 * SUM(amount) / SUM(SUM(amount)) OVER (), 1) AS pct\nFROM sales\nGROUP BY region\nORDER BY region;",
  // The same window without the outer SUM: the grouped query no longer has
  // a per-row amount to sum.
  shareBare:
    "SELECT region,\n  SUM(amount) AS total,\n  SUM(amount) OVER () AS grand_total\nFROM sales\nGROUP BY region;",
});

// ── 4, 5. The latest record per key, and QUALIFY. The page's 24 updates.

const LATEST =
  "SELECT customer_id, updated_at, email\nFROM (\n  SELECT\n    *,\n    ROW_NUMBER() OVER (\n      PARTITION BY customer_id\n      ORDER BY updated_at DESC\n    ) AS rn\n  FROM customer_updates\n) ranked\nWHERE rn = 1\nORDER BY customer_id;";
const PAGE_QUALIFY =
  "SELECT customer_id, updated_at, email\nFROM customer_updates\nQUALIFY ROW_NUMBER() OVER (\n  PARTITION BY customer_id\n  ORDER BY updated_at DESC\n) = 1;";

results.figures.latest = await figure(PAGE_CUSTOMER_UPDATES, {
  counts: "SELECT COUNT(*) AS rows, COUNT(DISTINCT customer_id) AS customers\nFROM customer_updates;",
  // The page's block, as written.
  latest: LATEST,
  // The window put straight into WHERE: refused.
  inWhere:
    "SELECT customer_id, updated_at, email\nFROM customer_updates\nWHERE ROW_NUMBER() OVER (\n  PARTITION BY customer_id\n  ORDER BY updated_at DESC\n) = 1;",
  // GROUP BY with MAX finds each customer's latest time, but not the email
  // that goes with it (the page's concept check).
  groupMax:
    "SELECT customer_id, MAX(updated_at) AS updated_at\nFROM customer_updates\nGROUP BY customer_id\nORDER BY customer_id;",
  // The page's Postgres-only shortcut.
  distinctOn:
    "SELECT DISTINCT ON (customer_id) customer_id, updated_at, email\nFROM customer_updates\nORDER BY customer_id, updated_at DESC;",
  // The page's QUALIFY snippet, which Postgres refuses.
  qualify: PAGE_QUALIFY,
});

// The video's own tie: customer 3 gets a second update at the very moment of
// its latest one, as a duplicated load would leave it.
const TIE = `${PAGE_CUSTOMER_UPDATES}
INSERT INTO customer_updates VALUES (3, TIMESTAMP '2024-05-18 16:45:00', 'c4@x.com');`;
results.figures.tie = await figure(TIE, {
  three: "SELECT customer_id, updated_at, email\nFROM customer_updates\nWHERE customer_id = 3\nORDER BY updated_at DESC, email;",
  rowNumber: LATEST,
  rank: LATEST.replace("ROW_NUMBER()", "RANK()"),
  rankCount: `SELECT COUNT(*) AS rows FROM (\n${LATEST.replace("ROW_NUMBER()", "RANK()").replace(/;$/, "")}\n) kept;`,
  rowNumberCount: `SELECT COUNT(*) AS rows FROM (\n${LATEST.replace(/;$/, "")}\n) kept;`,
});

// ── 6, 7. A running total and its frame. The page's 24 days; ROWS against
//    RANGE on DA's four payments is imported from its results.json.

results.figures.running = await figure(PAGE_DAILY, {
  // The page's block, as written.
  running:
    "SELECT\n  day,\n  amt,\n  SUM(amt) OVER (\n    ORDER BY day\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n  ) AS running_total\nFROM daily\nORDER BY day;",
  // The page's moving window: 6 PRECEDING, a 7-row trailing average. Its
  // first six rows average fewer than seven.
  trailing:
    "SELECT day, amt,\n  COUNT(*) OVER w AS n_rows,\n  ROUND(AVG(amt) OVER w, 2) AS avg_7\nFROM daily\nWINDOW w AS (ORDER BY day\n  ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)\nORDER BY day;",
  // No frame written: here no two days tie, so the default (RANGE) gives
  // the same totals as ROWS.
  defaulted: "SELECT day, amt,\n  SUM(amt) OVER (ORDER BY day) AS running_total\nFROM daily\nORDER BY day;",
});

// ── 8. Period over period. The page's 24 months.

const MOM = "SELECT\n  month,\n  revenue,\n  revenue - LAG(revenue) OVER (ORDER BY month) AS mom_change\nFROM monthly\nORDER BY month;";
const YOY =
  "SELECT month, revenue,\n  revenue - LAG(revenue) OVER (ORDER BY month) AS mom_change,\n  revenue - LAG(revenue, 12) OVER (ORDER BY month) AS yoy_change\nFROM monthly\nORDER BY month;";
results.figures.lag = await figure(PAGE_MONTHLY, {
  mom: MOM,
  yoy: YOY,
});
// The video's own gap: March 2023 missing from the page's months, as a month
// with no rows would be. LAG counts rows, so March 2024 is compared with
// February 2023.
results.figures.lagGap = await figure(`${PAGE_MONTHLY}\nDELETE FROM monthly WHERE month = DATE '2023-03-01';`, {
  rows: "SELECT COUNT(*) AS months FROM monthly;",
  yoy:
    "SELECT month, revenue,\n  LAG(month, 12) OVER (ORDER BY month) AS compared_with,\n  revenue - LAG(revenue, 12) OVER (ORDER BY month) AS yoy_change\nFROM monthly\nORDER BY month;",
});

// ── 9, 10. A date spine, and generating dates. The page's logins and its
//    challenge's solution.

const SPINE = (count) =>
  `WITH bounds AS (\n  SELECT MIN(login_date) AS lo, MAX(login_date) AS hi FROM logins\n),\nspine AS (\n  SELECT CAST(g AS DATE) AS day\n  FROM bounds, generate_series(bounds.lo, bounds.hi, INTERVAL '1 day') AS gs(g)\n)\nSELECT\n  s.day,\n  ${count} AS active_users\nFROM spine s\nLEFT JOIN logins l ON l.login_date = s.day\nGROUP BY s.day\nORDER BY s.day;`;
results.figures.spine = await figure(PAGE_LOGINS, {
  // Without a spine: one row per day that had a login.
  without: "SELECT login_date AS day,\n  COUNT(DISTINCT user_id) AS active_users\nFROM logins\nGROUP BY login_date\nORDER BY login_date;",
  // The challenge's solution, as the page writes it.
  spine: SPINE("COUNT(DISTINCT l.user_id)"),
  // The trap: COUNT(*) counts the spine's own row on an empty day.
  countStar: SPINE("COUNT(*)"),
  // What generate_series hands back from DATE bounds, before the cast.
  type: "SELECT pg_typeof(g) AS type, g\nFROM generate_series(DATE '2024-05-01', DATE '2024-05-03', INTERVAL '1 day') AS gs(g);",
  // The page's spine query from its "generate a series of dates" answer.
  pageSeries:
    "WITH bounds AS (SELECT MIN(login_date) AS lo, MAX(login_date) AS hi FROM logins)\nSELECT CAST(g AS DATE) AS day\nFROM bounds, generate_series(bounds.lo, bounds.hi, INTERVAL '1 day') AS gs(g);",
});

// ── 11. COUNT(DISTINCT). The page's logins: each day's distinct users,
//    summed, against the distinct users over the whole range.
results.figures.distinct = await figure(PAGE_LOGINS, {
  daily: "SELECT login_date, COUNT(DISTINCT user_id) AS users\nFROM logins\nGROUP BY login_date\nORDER BY login_date;",
  summed: "SELECT SUM(users) AS summed_daily FROM (\n  SELECT COUNT(DISTINCT user_id) AS users\n  FROM logins\n  GROUP BY login_date\n) d;",
  whole: "SELECT COUNT(DISTINCT user_id) AS users\nFROM logins;",
  rows: "SELECT COUNT(*) AS logins FROM logins;",
  // Who the sum counts more than once: users active on more than one day,
  // and how many extra times.
  repeat:
    "SELECT COUNT(*) AS users, SUM(days - 1) AS extra_counts FROM (\n  SELECT user_id, COUNT(DISTINCT login_date) AS days\n  FROM logins\n  GROUP BY user_id\n  HAVING COUNT(DISTINCT login_date) > 1\n) r;",
});

// ── 12. Ratios from summed components. The video's own two days, the
//    page's "a 1-order day and a 10,000-order day".
const DAYS = `CREATE TABLE daily_orders (day DATE, revenue NUMERIC(12,2), orders INTEGER);
INSERT INTO daily_orders VALUES
  ('2024-01-01', 200.00, 1),
  ('2024-01-02', 500000.00, 10000);`;
results.figures.ratio = await figure(DAYS, {
  perDay: "SELECT day, revenue, orders,\n  ROUND(revenue / NULLIF(orders, 0), 2) AS aov\nFROM daily_orders\nORDER BY day;",
  averaged: "SELECT ROUND(AVG(revenue / NULLIF(orders, 0)), 2) AS avg_of_ratios\nFROM daily_orders;",
  summed: "SELECT ROUND(SUM(revenue) / NULLIF(SUM(orders), 0), 2) AS ratio_of_sums\nFROM daily_orders;",
});

// ── Quick round ─────────────────────────────────────────────────────────────

// Divide by zero: the page's query on the video's own three days.
const SUMMARY = `CREATE TABLE daily_summary (day DATE, gross_revenue NUMERIC(10,2), order_count INTEGER);
INSERT INTO daily_summary VALUES
  ('2024-01-01', 1200.00, 8),
  ('2024-01-02', 0.00, 0),
  ('2024-01-03', 450.00, 3);`;
results.figures.divide = await figure(SUMMARY, {
  bare: "SELECT gross_revenue, order_count,\n  gross_revenue / order_count AS avg_order_value\nFROM daily_summary;",
  // The page's query, as written (ROUND only so the cell prints at cents).
  nullif:
    "SELECT\n  gross_revenue,\n  order_count,\n  ROUND(gross_revenue / NULLIF(order_count, 0), 2) AS avg_order_value\nFROM daily_summary\nORDER BY day;",
  coalesce:
    "SELECT day,\n  COALESCE(ROUND(gross_revenue / NULLIF(order_count, 0), 2), 0) AS avg_order_value\nFROM daily_summary\nORDER BY day;",
});

// ROW_NUMBER, RANK, DENSE_RANK on DA's books, which hold a tie. Top N per
// group (ROW_NUMBER keeps 4 rows, RANK 5) is imported from DA's results.
results.figures.rank = await figure(DA_PRODUCTS, {
  books:
    "SELECT product, revenue,\n  ROW_NUMBER() OVER (ORDER BY revenue DESC) AS row_number,\n  RANK()       OVER (ORDER BY revenue DESC) AS rank,\n  DENSE_RANK() OVER (ORDER BY revenue DESC) AS dense_rank\nFROM products\nWHERE category = 'Books'\nORDER BY revenue DESC, product;",
});

// A CTE: the page's own shape (WITH recent AS (...) SELECT * FROM recent),
// on the page's customer_updates. And its recursive CTE, run as written.
results.figures.cte = await figure(PAGE_CUSTOMER_UPDATES, {
  cte: "WITH recent AS (\n  SELECT * FROM customer_updates\n  WHERE updated_at >= TIMESTAMP '2024-05-01'\n)\nSELECT * FROM recent\nORDER BY updated_at;",
  recursive: "WITH RECURSIVE nums(n) AS (\n  SELECT 1\n  UNION ALL\n  SELECT n + 1 FROM nums WHERE n < 5\n)\nSELECT * FROM nums;",
});

// Pivot and unpivot on DA's pivot sales: the page's FILTER form (Postgres),
// and its lateral VALUES unpivot. DA's CASE WHEN pivot is imported.
const PIVOT_FILTER =
  "SELECT region,\n  SUM(amount) FILTER (WHERE quarter = 'Q1') AS q1,\n  SUM(amount) FILTER (WHERE quarter = 'Q2') AS q2\nFROM sales\nGROUP BY region\nORDER BY region;";
results.figures.pivot = await figure(DA_PIVOT_SALES, {
  rows: "SELECT COUNT(*) AS rows FROM sales;",
  pivotCase:
    "SELECT region,\n  SUM(CASE WHEN quarter = 'Q1' THEN amount END) AS q1,\n  SUM(CASE WHEN quarter = 'Q2' THEN amount END) AS q2\nFROM sales\nGROUP BY region\nORDER BY region;",
  pivotFilter: PIVOT_FILTER,
  // The PIVOT clause Postgres does not have.
  pivotClause: "SELECT *\nFROM sales\nPIVOT (SUM(amount) FOR quarter IN ('Q1', 'Q2'));",
  unpivot: `WITH wide AS (\n${PIVOT_FILTER.replace(/;$/, "").replace(/^/gm, "  ")}\n)\nSELECT region, u.quarter, u.amt\nFROM wide CROSS JOIN LATERAL (VALUES ('Q1', q1), ('Q2', q2)) AS u(quarter, amt)\nORDER BY region, u.quarter;`,
});

// ── DuckDB: QUALIFY on the page's table, and approx_count_distinct ─────────

/** A DuckDB value as a SQL client prints it: a TIMESTAMP comes back from
 *  Arrow as epoch milliseconds, read here as UTC to the second. */
function duckShown(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  return v;
}
async function duckFigure(setup, steps, timestampCols = []) {
  const engine = await createEngine("duckdb");
  await engine.exec(setup);
  const out = {};
  for (const [id, sql] of Object.entries(steps)) {
    try {
      const rs = await engine.exec(sql);
      const r = rs[rs.length - 1];
      out[id] = {
        sql,
        ok: true,
        columns: r.columns,
        rows: r.values.map((row) =>
          row.map((v, i) =>
            timestampCols.includes(r.columns[i]) && v !== null
              ? new Date(Number(v)).toISOString().slice(0, 19).replace("T", " ")
              : duckShown(v),
          ),
        ),
      };
    } catch (e) {
      out[id] = { sql, ok: false, error: String(e.message).split("\n")[0] };
    }
  }
  const [v] = await engine.exec("SELECT version() AS v");
  await engine.destroy();
  return { setup, steps: out, version: `DuckDB ${v.values[0][0]}` };
}

results.figures.qualify = await duckFigure(
  PAGE_CUSTOMER_UPDATES,
  {
    // The page's snippet, as written, with an ORDER BY so the rows print in
    // the subquery's order and can be compared line for line.
    qualify: `${PAGE_QUALIFY.replace(/;$/, "")}\nORDER BY customer_id;`,
    // The page's Postgres form, on DuckDB, for the comparison.
    subquery: LATEST,
  },
  ["updated_at"],
);

// The page: "For large approximate needs, warehouses offer
// APPROX_COUNT_DISTINCT (HyperLogLog)". DuckDB has one; a million distinct
// values, counted both ways.
results.figures.approx = await duckFigure("CREATE TABLE ids AS SELECT i AS user_id FROM range(1000000) t(i);", {
  both: "SELECT COUNT(DISTINCT user_id) AS exact,\n  approx_count_distinct(user_id) AS approx\nFROM ids;",
});

// ── Checks: the narration says these, so a change in the data must fail here.

const rowsOf = (f, s) => {
  const st = results.figures[f].steps[s];
  if (!st.ok) throw new Error(`${f}.${s} failed: ${st.error}`);
  return st.rows;
};
const expect = (what, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
expect("latest keeps one row per customer", rowsOf("latest", "latest").length, 12);
expect("QUALIFY on DuckDB keeps the same rows", rowsOf("qualify", "qualify"), rowsOf("qualify", "subquery"));
expect(
  "DuckDB and Postgres agree on the latest rows",
  rowsOf("qualify", "qualify").map((r) => r[2]),
  rowsOf("latest", "latest").map((r) => r[2]),
);
expect("DISTINCT ON agrees", rowsOf("latest", "distinctOn").map((r) => r[2]), rowsOf("latest", "latest").map((r) => r[2]));
expect("a tie: ROW_NUMBER keeps 12", rowsOf("tie", "rowNumberCount")[0][0], 12);
expect("a tie: RANK keeps 13", rowsOf("tie", "rankCount")[0][0], 13);
expect("the spine has 15 days", rowsOf("spine", "spine").length, 15);
expect("daily distinct users sum to 23", rowsOf("distinct", "summed")[0][0], "23");
expect("12 distinct users", rowsOf("distinct", "whole")[0][0], 12);
expect("the rows the sum repeats", rowsOf("distinct", "repeat")[0], [6, "11"]);
expect("empty days count one under COUNT(*)", rowsOf("spine", "countStar").filter((r) => r[1] === 1).length, 5);
expect("average of ratios", rowsOf("ratio", "averaged")[0][0], "125.00");
// With March 2023 gone, a comparison is wrong when the month it lands on is
// not twelve months back: eight of them, March 2024 against February 2023.
const back12 = (m) => {
  const [y, mo] = m.split("-").map(Number);
  return `${y - 1}-${String(mo).padStart(2, "0")}-01`;
};
const shifted = rowsOf("lagGap", "yoy").filter((r) => r[2] !== null && r[2] !== back12(r[0]));
expect("LAG(12) over a missing month: eight wrong comparisons", shifted.length, 8);
expect("March 2024 lands on February 2023", rowsOf("lagGap", "yoy").find((r) => r[0] === "2024-03-01").slice(2), ["2023-02-01", -45]);
expect("January 2024: -285 a month back, -45 a year back", rowsOf("lag", "yoy").find((r) => r[0] === "2024-01-01").slice(2), [-285, -45]);
expect("the running total ends at 411", rowsOf("running", "running").at(-1)[2], 411);
expect("ratio of sums", rowsOf("ratio", "summed")[0][0], "50.01");
expect("without the spine, 10 days", rowsOf("spine", "without").length, 10);
if (results.figures.latest.steps.qualify.ok) throw new Error("Postgres ran QUALIFY");
if (results.figures.latest.steps.inWhere.ok) throw new Error("Postgres ran a window in WHERE");

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps)
    .filter(([, s]) => !s.ok)
    .map(([id, s]) => `${f}.${id}: ${s.error}`),
);
console.log(`wrote ${fileURLToPath(out)} (${results.figures.window.version}; ${results.figures.qualify.version})`);
console.log(failed.length ? `errors, as expected where a figure shows one:\n  ${failed.join("\n  ")}` : "no errors");
