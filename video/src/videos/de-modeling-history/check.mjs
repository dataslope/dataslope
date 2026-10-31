// Runs every statement the de-modeling-history video shows in DuckDB, the
// engine the Data Engineer data-modeling page's blocks run in the reader's
// browser (<SqlCodeBlock dialect="duckdb">), and writes what came back to
// results.json, which data.ts reads. From the repo root, where
// @duckdb/duckdb-wasm (pinned to the version runtime/duckdb.ts loads) is
// installed:
//
//   node video/src/videos/de-modeling-history/check.mjs
//
// Each figure runs in a fresh database built by its own setup, as the page
// gives every block its own engine; its steps run in order on one
// connection, so an UPDATE in one step is seen by the next. Values are
// printed the way a SQL client prints them: a DECIMAL at its scale, a DATE
// as "2024-01-01", a NULL as null.
//
// The SCD tables are the page's own (content/interview/data-engineer/
// data-modeling.mdx, "How do you preserve history when a dimension attribute
// changes (SCD)?"): dim_customer with valid_from, valid_to and is_current,
// and its 24 orders. Customer 42 is the one who moves, Boston to Austin on
// 2024-03-15. The page's own Type 2 statements use CURRENT_DATE; the video
// runs them with the dates the page's table already holds, so the result is
// the page's rows. Everything else is the video's own small table, marked
// so below and in script.ts.
//
// The one Postgres figure (the UUID index sizes) runs on the site's Postgres
// engine through scripts/lib/sql-engines.mjs: index size is a B-tree
// question, and DuckDB keeps no B-tree it reports a size for.
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
  if (t.startsWith("Timestamp")) return new Date(Number(value)).toISOString().slice(0, 16).replace("T", " ");
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

/** The same, on the site's Postgres engine (PGlite). */
async function pgFigure(setup, steps) {
  const { createEngine } = await import(new URL("../../../../scripts/lib/sql-engines.mjs", import.meta.url).href);
  const engine = await createEngine("postgres");
  await engine.exec(setup);
  const out = {};
  for (const [id, sql] of Object.entries(steps)) {
    try {
      const res = await engine.exec(sql);
      const r = res[res.length - 1];
      out[id] = { sql, ok: true, columns: r.columns, rows: r.values.map((row) => row.map((v) => (v === null ? null : String(v)))) };
    } catch (e) {
      out[id] = { sql, ok: false, error: `ERROR: ${String(e.message).split("\n")[0]}` };
    }
  }
  const version = (await engine.exec("SHOW server_version"))[0].values[0][0];
  await engine.destroy();
  return { setup, steps: out, version: `PostgreSQL ${version}` };
}

// ── The page's tables ───────────────────────────────────────────────────────

/** The page's SCD block, its initSql verbatim: a Type 2 dim_customer (24
 *  versions of 15 customers) and 24 orders. */
const PAGE_SCD = `CREATE TABLE dim_customer (
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

/** The page's point-in-time join, as the page writes it, without its comment. */
const PAGE_JOIN = `SELECT f.order_id, f.order_date, d.city, f.amount
FROM fact_orders f
JOIN dim_customer d
  ON  d.customer_id = f.customer_id
  AND f.order_date BETWEEN d.valid_from AND d.valid_to`;

/** Customer 42 before the move: the page's table with the Austin version
 *  taken out and Boston open-ended and current again. */
const BEFORE_MOVE = `${PAGE_SCD}
DELETE FROM dim_customer WHERE customer_key = 1087;
UPDATE dim_customer SET valid_to = DATE '9999-12-31', is_current = true WHERE customer_key = 1001;`;

const results = { figures: {} };

// 1. Preserving history: Type 1 overwrites, Type 2 adds a row, Type 3 keeps
//    one previous value. Customer 42's two orders, 101 (placed in Boston)
//    and 102 (in Austin).
results.figures.history = await figure(
  `${PAGE_SCD}
CREATE TABLE customer_t1 (customer_id INTEGER, city VARCHAR);
INSERT INTO customer_t1 VALUES (42, 'Boston');
CREATE TABLE customer_t3 (customer_id INTEGER, city VARCHAR, previous_city VARCHAR);
INSERT INTO customer_t3 VALUES (42, 'Boston', NULL);`,
  {
    orders: "SELECT order_id, order_date, amount\nFROM fact_orders\nWHERE customer_id = 42\nORDER BY order_id;",
    t1Before: "SELECT customer_id, city FROM customer_t1;",
    t1Update: "UPDATE customer_t1\nSET city = 'Austin'\nWHERE customer_id = 42;",
    t1After: "SELECT customer_id, city FROM customer_t1;",
    t1Orders:
      "SELECT f.order_id, f.order_date, c.city, f.amount\nFROM fact_orders f\nJOIN customer_t1 c ON c.customer_id = f.customer_id\nWHERE f.customer_id = 42\nORDER BY f.order_id;",
    t1ByCity:
      "SELECT c.city, SUM(f.amount) AS revenue\nFROM fact_orders f\nJOIN customer_t1 c ON c.customer_id = f.customer_id\nWHERE f.customer_id = 42\nGROUP BY c.city\nORDER BY c.city DESC;",
    t2Rows:
      "SELECT customer_key, city, valid_from, valid_to, is_current\nFROM dim_customer\nWHERE customer_id = 42\nORDER BY valid_from;",
    t2Orders: `${PAGE_JOIN}\nWHERE f.customer_id = 42\nORDER BY f.order_id;`,
    t2ByCity: `SELECT d.city, SUM(f.amount) AS revenue\nFROM fact_orders f\nJOIN dim_customer d\n  ON  d.customer_id = f.customer_id\n  AND f.order_date BETWEEN d.valid_from AND d.valid_to\nWHERE f.customer_id = 42\nGROUP BY d.city\nORDER BY d.city DESC;`,
    t3Update: "UPDATE customer_t3\nSET previous_city = city, city = 'Austin'\nWHERE customer_id = 42;",
    t3After: "SELECT customer_id, city, previous_city FROM customer_t3;",
    // A second move: Type 3 keeps one step back, so Boston is gone.
    t3Again: "UPDATE customer_t3\nSET previous_city = city, city = 'Denver'\nWHERE customer_id = 42;",
    t3Twice: "SELECT customer_id, city, previous_city FROM customer_t3;",
  },
);

// 2. Type 2 in practice: the page's two statements, close then insert, run
//    with the dates the page's table holds (and the surrogate key it gives
//    the new version), then the point-in-time join and the current row.
results.figures.type2 = await figure(BEFORE_MOVE, {
  before:
    "SELECT customer_key, city, valid_from, valid_to, is_current\nFROM dim_customer\nWHERE customer_id = 42;",
  close: "UPDATE dim_customer\nSET valid_to = DATE '2024-03-14',\n    is_current = false\nWHERE customer_id = 42 AND is_current;",
  insert: "INSERT INTO dim_customer VALUES\n  (1087, 42, 'Austin', DATE '2024-03-15',\n   DATE '9999-12-31', true);",
  after:
    "SELECT customer_key, city, valid_from, valid_to, is_current\nFROM dim_customer\nWHERE customer_id = 42\nORDER BY valid_from;",
  // The table now equals the page's own, row for row.
  samePage: `SELECT COUNT(*) AS rows FROM dim_customer;`,
  pit: `${PAGE_JOIN}\nWHERE f.customer_id = 42\nORDER BY f.order_id;`,
  pitAll: `SELECT COUNT(*) AS matched\nFROM fact_orders f\nJOIN dim_customer d\n  ON  d.customer_id = f.customer_id\n  AND f.order_date BETWEEN d.valid_from AND d.valid_to;`,
  orders: "SELECT COUNT(*) AS orders FROM fact_orders;",
  // Each order matched once, not one dropped and another doubled.
  pitDistinct: `SELECT COUNT(DISTINCT f.order_id) AS orders_matched\nFROM fact_orders f\nJOIN dim_customer d\n  ON  d.customer_id = f.customer_id\n  AND f.order_date BETWEEN d.valid_from AND d.valid_to;`,
  // Every version starts the day after the one before it ends: no overlap, no gap.
  seams:
    "SELECT COUNT(*) AS seams,\n  COUNT(*) FILTER (WHERE next_from <> valid_to + 1) AS bad_seams\nFROM (\n  SELECT valid_to, LEAD(valid_from) OVER (PARTITION BY customer_id ORDER BY valid_from) AS next_from\n  FROM dim_customer\n) WHERE next_from IS NOT NULL;",
  current: "SELECT customer_key, city\nFROM dim_customer\nWHERE customer_id = 42 AND is_current;",
  currentAll: "SELECT COUNT(*) AS current_rows, COUNT(DISTINCT customer_id) AS customers\nFROM dim_customer\nWHERE is_current;",
  // At load time, the fact keeps the key of the version true on its date.
  load: `SELECT f.order_id, f.order_date, d.customer_key\nFROM fact_orders f\nJOIN dim_customer d\n  ON  d.customer_id = f.customer_id\n  AND f.order_date BETWEEN d.valid_from AND d.valid_to\nWHERE f.customer_id = 42\nORDER BY f.order_id;`,
});

// The page's own INSERT, exactly as printed: it names no customer_key, so
// the new version has none (reported, not shown).
results.figures.pageInsert = await figure(BEFORE_MOVE, {
  close: "UPDATE dim_customer\nSET valid_to = CURRENT_DATE - INTERVAL '1 day',\n    is_current = false\nWHERE customer_id = 42 AND is_current = true;",
  insert:
    "INSERT INTO dim_customer\n  (customer_id, city, valid_from, valid_to, is_current)\nVALUES\n  (42, 'Austin', CURRENT_DATE, DATE '9999-12-31', true);",
  after: "SELECT customer_key, city, is_current FROM dim_customer WHERE customer_id = 42 ORDER BY valid_from;",
});

// 3. Type 0: insert once. A later load that sends a different value for the
//    customer is ignored (the video's own two loads).
results.figures.type0 = await figure(
  "CREATE TABLE dim_customer (\n  customer_id INTEGER PRIMARY KEY,\n  signup_date DATE\n);",
  {
    first: "INSERT INTO dim_customer\nVALUES (42, DATE '2022-01-01')\nON CONFLICT DO NOTHING;",
    later: "INSERT INTO dim_customer\nVALUES (42, DATE '2023-06-30')\nON CONFLICT DO NOTHING;",
    rows: "SELECT customer_id, signup_date FROM dim_customer;",
  },
);

// 4. Types 4 and 6, built from the page's Type 2 table. Type 4: the main
//    table keeps only current values, history goes to a table of its own.
//    Type 6: Type 2's rows, plus a current-value column on every row.
results.figures.types46 = await figure(PAGE_SCD, {
  t4Main: "CREATE TABLE customer AS\nSELECT customer_id, city\nFROM dim_customer WHERE is_current;",
  t4History: "CREATE TABLE customer_history AS\nSELECT customer_id, city, valid_from, valid_to\nFROM dim_customer;",
  t4MainRows: "SELECT customer_id, city FROM customer WHERE customer_id = 42;",
  t4HistoryRows: "SELECT customer_id, city, valid_from, valid_to\nFROM customer_history\nWHERE customer_id = 42\nORDER BY valid_from;",
  t4Counts: "SELECT (SELECT COUNT(*) FROM customer) AS main_rows,\n  (SELECT COUNT(*) FROM customer_history) AS history_rows;",
  t6Add: "ALTER TABLE dim_customer ADD COLUMN current_city VARCHAR;",
  t6Fill:
    "UPDATE dim_customer d\nSET current_city = c.city\nFROM dim_customer c\nWHERE c.customer_id = d.customer_id\n  AND c.is_current;",
  t6Rows:
    "SELECT customer_key, city, current_city, valid_from, valid_to\nFROM dim_customer\nWHERE customer_id = 42\nORDER BY valid_from;",
  t6Orders:
    "SELECT f.order_id, f.order_date, d.city, d.current_city\nFROM fact_orders f\nJOIN dim_customer d\n  ON  d.customer_id = f.customer_id\n  AND f.order_date BETWEEN d.valid_from AND d.valid_to\nWHERE f.customer_id = 42\nORDER BY f.order_id;",
});

// 5. A late-arriving dimension member (the video's own three orders and two
//    customers): customer 77's order arrives before customer 77 does.
results.figures.late = await figure(
  `CREATE TABLE dim_customer (
  customer_key INTEGER,
  customer_id  INTEGER,
  city         VARCHAR,
  inferred     BOOLEAN
);
INSERT INTO dim_customer VALUES
  (1087, 42, 'Austin', false),
  (2001, 99, 'Denver', false);
CREATE TABLE staged_orders (order_id INTEGER, customer_id INTEGER, amount DECIMAL(10,2));
INSERT INTO staged_orders VALUES
  (201, 42, 200.00), (202, 99, 500.00), (203, 77, 410.00);`,
  {
    staged: "SELECT order_id, customer_id, amount FROM staged_orders ORDER BY order_id;",
    dimBefore: "SELECT customer_key, customer_id, city, inferred FROM dim_customer ORDER BY customer_key;",
    load: "SELECT o.order_id, d.customer_key, o.amount\nFROM staged_orders o\nJOIN dim_customer d\n  ON d.customer_id = o.customer_id\nORDER BY o.order_id;",
    loadSum: "SELECT SUM(o.amount) AS loaded,\n  (SELECT SUM(amount) FROM staged_orders) AS staged\nFROM staged_orders o\nJOIN dim_customer d ON d.customer_id = o.customer_id;",
    placeholder: "INSERT INTO dim_customer VALUES\n  (2002, 77, 'Unknown', true);",
    dimMid: "SELECT customer_key, customer_id, city, inferred FROM dim_customer ORDER BY customer_key;",
    reload:
      "CREATE TABLE fact_orders AS\nSELECT o.order_id, d.customer_key, o.amount\nFROM staged_orders o\nJOIN dim_customer d\n  ON d.customer_id = o.customer_id;",
    facts: "SELECT order_id, customer_key, amount FROM fact_orders ORDER BY order_id;",
    report: "SELECT f.order_id, d.city, f.amount\nFROM fact_orders f\nJOIN dim_customer d USING (customer_key)\nORDER BY f.order_id;",
    arrive: "UPDATE dim_customer\nSET city = 'Tulsa', inferred = false\nWHERE customer_key = 2002;",
    reportAfter: "SELECT f.order_id, d.city, f.amount\nFROM fact_orders f\nJOIN dim_customer d USING (customer_key)\nORDER BY f.order_id;",
    dimAfter: "SELECT customer_key, customer_id, city, inferred FROM dim_customer ORDER BY customer_key;",
  },
);

// 6. Snapshot against insert-only (the video's own two orders): the log of
//    every change, the latest row per order (which is the snapshot), and a
//    question only the log can answer.
results.figures.snap = await figure(
  `CREATE TABLE order_events (order_id INTEGER, status VARCHAR, changed_at TIMESTAMP);
INSERT INTO order_events VALUES
  (501, 'placed',    TIMESTAMP '2024-06-01 09:00'),
  (501, 'paid',      TIMESTAMP '2024-06-01 09:05'),
  (502, 'placed',    TIMESTAMP '2024-06-01 10:00'),
  (502, 'paid',      TIMESTAMP '2024-06-01 10:02'),
  (502, 'cancelled', TIMESTAMP '2024-06-01 16:30'),
  (501, 'shipped',   TIMESTAMP '2024-06-02 14:00');`,
  {
    log: "SELECT order_id, status, changed_at\nFROM order_events\nORDER BY order_id, changed_at;",
    snapshot:
      "CREATE TABLE order_snapshot AS\nSELECT order_id, status\nFROM order_events\nQUALIFY ROW_NUMBER() OVER (\n  PARTITION BY order_id ORDER BY changed_at DESC) = 1;",
    snapshotRows: "SELECT order_id, status FROM order_snapshot ORDER BY order_id;",
    paidThenCancelled:
      "SELECT order_id\nFROM order_events\nGROUP BY order_id\nHAVING bool_or(status = 'paid')\n   AND bool_or(status = 'cancelled');",
    counts: "SELECT (SELECT COUNT(*) FROM order_events) AS log_rows,\n  (SELECT COUNT(*) FROM order_snapshot) AS snapshot_rows;",
  },
);

// 7, 8. A bridge table between orders and promotions (the video's own three
//    orders and three promotions), with the page's weighting factor.
results.figures.bridge = await figure(
  `CREATE TABLE fact_orders (order_key INTEGER, amount DECIMAL(10,2));
INSERT INTO fact_orders VALUES (1, 100.00), (2, 60.00), (3, 40.00);
CREATE TABLE dim_promotion (promo_key INTEGER, promo_name VARCHAR);
INSERT INTO dim_promotion VALUES (10, 'SUMMER10'), (20, 'FREESHIP'), (30, 'LOYALTY');
CREATE TABLE order_promotion_bridge (order_key INTEGER, promo_key INTEGER, weight DECIMAL(3,2));
INSERT INTO order_promotion_bridge VALUES
  (1, 10, 0.50), (1, 20, 0.50),
  (2, 10, 1.00),
  (3, 20, 0.50), (3, 30, 0.50);`,
  {
    orders: "SELECT order_key, amount FROM fact_orders ORDER BY order_key;",
    rows: "SELECT order_key, promo_key, weight FROM order_promotion_bridge ORDER BY order_key, promo_key;",
    total: "SELECT SUM(amount) AS revenue FROM fact_orders;",
    fanout:
      "SELECT p.promo_name, SUM(f.amount) AS revenue\nFROM fact_orders f\nJOIN order_promotion_bridge b ON b.order_key = f.order_key\nJOIN dim_promotion p          ON p.promo_key  = b.promo_key\nGROUP BY p.promo_name\nORDER BY p.promo_name DESC;",
    fanoutTotal:
      "SELECT SUM(f.amount) AS revenue\nFROM fact_orders f\nJOIN order_promotion_bridge b ON b.order_key = f.order_key;",
    weighted:
      "SELECT p.promo_name,\n       SUM(f.amount * b.weight) AS attributed_revenue\nFROM fact_orders f\nJOIN order_promotion_bridge b ON b.order_key = f.order_key\nJOIN dim_promotion p          ON p.promo_key  = b.promo_key\nGROUP BY p.promo_name\nORDER BY p.promo_name DESC;",
    weightedTotal:
      "SELECT SUM(f.amount * b.weight) AS revenue\nFROM fact_orders f\nJOIN order_promotion_bridge b ON b.order_key = f.order_key;",
    weightSums: "SELECT order_key, SUM(weight) AS weights\nFROM order_promotion_bridge\nGROUP BY order_key\nORDER BY order_key;",
    usedBy:
      "SELECT p.promo_name, COUNT(*) AS orders\nFROM order_promotion_bridge b\nJOIN dim_promotion p ON p.promo_key = b.promo_key\nGROUP BY p.promo_name\nORDER BY p.promo_name DESC;",
  },
);

// The quick round's small tables (all the video's own).
results.figures.rapid = await figure(
  `CREATE TABLE fact_order_lines (order_number VARCHAR, product VARCHAR, amount DECIMAL(10,2));
INSERT INTO fact_order_lines VALUES
  ('INV-1001', 'kettle', 40.00), ('INV-1001', 'mugs', 18.00),
  ('INV-1002', 'teapot', 35.00);
CREATE TABLE dim_date (date_key INTEGER, full_date DATE, day_name VARCHAR);
INSERT INTO dim_date VALUES
  (20240607, DATE '2024-06-07', 'Friday'),
  (20240610, DATE '2024-06-10', 'Monday');
CREATE TABLE fact_shipments (order_id INTEGER, order_date_key INTEGER, ship_date_key INTEGER);
INSERT INTO fact_shipments VALUES (301, 20240607, 20240610);
CREATE TABLE attendance (student VARCHAR, class VARCHAR, class_date DATE);
INSERT INTO attendance VALUES
  ('Ada', 'Databases', DATE '2024-09-02'),
  ('Ben', 'Databases', DATE '2024-09-02'),
  ('Ada', 'Statistics', DATE '2024-09-03');`,
  {
    lines: "SELECT order_number, product, amount FROM fact_order_lines;",
    degenerate: "SELECT order_number, COUNT(*) AS lines, SUM(amount) AS total\nFROM fact_order_lines\nGROUP BY order_number\nORDER BY order_number;",
    junk:
      "SELECT COUNT(*) AS junk_rows\nFROM (VALUES ('card'), ('cash'), ('voucher')) p(payment),\n     (VALUES (true), (false)) g(is_gift),\n     (VALUES ('web'), ('store')) c(channel);",
    shipments: "SELECT order_id, order_date_key, ship_date_key FROM fact_shipments;",
    dates: "SELECT date_key, full_date, day_name FROM dim_date ORDER BY date_key;",
    role:
      "SELECT f.order_id,\n       od.day_name AS ordered,\n       sd.day_name AS shipped\nFROM fact_shipments f\nJOIN dim_date od ON od.date_key = f.order_date_key\nJOIN dim_date sd ON sd.date_key = f.ship_date_key;",
    mini:
      "SELECT COUNT(*) AS mini_rows\nFROM (VALUES ('18-24'), ('25-34'), ('35-49'), ('50-64'), ('65+')) a(age_band),\n     (VALUES ('low'), ('middle'), ('high'), ('top')) i(income_tier);",
    factless: "SELECT student, class, class_date FROM attendance ORDER BY class_date, student;",
    factlessCount: "SELECT class, COUNT(*) AS attended\nFROM attendance\nGROUP BY class\nORDER BY class;",
  },
);

// The surrogate key: a sequence against a UUID, on the site's Postgres. Key
// sizes as Postgres stores them, and the primary-key index each builds over
// 100,000 rows. The random UUIDs are md5 of the row number cast to uuid, so
// the run is repeatable and their order is as scattered as random ones';
// version 7 is Postgres 18's own time-ordered uuidv7().
results.figures.uuid = await pgFigure(
  `CREATE TABLE seq_keys (id bigint PRIMARY KEY);
INSERT INTO seq_keys SELECT g FROM generate_series(1, 100000) g;
CREATE TABLE uuid_keys (id uuid PRIMARY KEY);
INSERT INTO uuid_keys SELECT md5(g::text)::uuid FROM generate_series(1, 100000) g;
CREATE TABLE uuid7_keys (id uuid PRIMARY KEY);
INSERT INTO uuid7_keys SELECT uuidv7() FROM generate_series(1, 100000) g;`,
  {
    bytes: "SELECT pg_column_size(1::integer) AS integer_bytes,\n  pg_column_size(1::bigint) AS bigint_bytes,\n  pg_column_size(gen_random_uuid()) AS uuid_bytes;",
    index:
      "SELECT pg_relation_size('seq_keys_pkey') AS sequence,\n  pg_relation_size('uuid_keys_pkey') AS random_uuid,\n  pg_relation_size('uuid7_keys_pkey') AS uuid_v7;",
    sample: "SELECT id FROM uuid_keys ORDER BY id LIMIT 1;",
    seqSample: "SELECT id FROM seq_keys ORDER BY id DESC LIMIT 1;",
  },
);

for (const [name, fig] of Object.entries(results.figures)) {
  for (const [id, step] of Object.entries(fig.steps)) {
    if (!step.ok && !(name === "pageInsert")) console.log(`FAILED ${name}.${id}: ${step.error}`);
  }
}
results.engines = { duckdb: results.figures.history.version, postgres: results.figures.uuid.version };
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
console.log("wrote results.json:", Object.keys(results.figures).join(", "));
