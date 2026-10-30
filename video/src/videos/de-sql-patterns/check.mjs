// Runs every statement the de-sql-patterns video shows in DuckDB, the engine
// the Data Engineer SQL page's blocks run in the reader's browser, and writes
// what came back to results.json, which data.ts reads. From the repo root,
// where @duckdb/duckdb-wasm (pinned to the version runtime/duckdb.ts loads)
// is installed:
//
//   node video/src/videos/de-sql-patterns/check.mjs
//
// Each figure runs in a fresh database built by its own setup, as the page
// gives every block its own engine. Values are printed the way a SQL client
// prints them: a DECIMAL at its scale, a DATE as "2024-01-01", a NULL as
// null. Tables are the page's own (content/interview/data-engineer/sql.mdx:
// its players, events, orders and daily_logins blocks) wherever the page has
// one; the rest are marked "the video's own" below and in script.ts.
//
// Figures this video reuses unchanged from the Data Analyst and Data
// Scientist SQL videos are not run here: data.ts imports their results.json
// (da-sql: the order a query runs in, WHERE and HAVING, the anti-join, the
// joins, UNION, duplicates and CROSS JOIN; da-advanced-sql: ROWS and RANGE,
// NTILE; ds-sql: the running total's tie, pivoting), so a table both videos
// show is the same table. Where this video asks something new of one of their
// tables (EXCEPT on the anti-join's customers and orders, LAG and LEAD on
// the advanced SQL page's first days), the setup is copied here verbatim.
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

/** The page's ranking block: 24 players and their scores. */
const PAGE_PLAYERS = `CREATE TABLE players (name VARCHAR, score INTEGER);
INSERT INTO players VALUES
  ('Alice', 95), ('Bob', 80), ('Carol', 80), ('Dave', 70),
  ('Erin', 97), ('Frank', 78), ('Grace', 91), ('Hugo', 80),
  ('Iris', 72), ('Jonas', 88), ('Kira', 95), ('Leo', 64),
  ('Mona', 80), ('Nils', 99), ('Otto', 76), ('Pia', 88),
  ('Quinn', 69), ('Rui', 93), ('Sara', 85), ('Theo', 71),
  ('Ulla', 82), ('Vik', 96), ('Wanda', 74), ('Yara', 88);`;

/** The page's deduplication block: 24 events from ten users. */
const PAGE_EVENTS = `CREATE TABLE events (user_id INTEGER, event_time TIMESTAMP, status VARCHAR);
INSERT INTO events VALUES
  (1, TIMESTAMP '2024-01-01 10:00', 'signup'),
  (1, TIMESTAMP '2024-01-03 09:00', 'active'),
  (1, TIMESTAMP '2024-01-09 14:00', 'active'),
  (2, TIMESTAMP '2024-01-02 12:00', 'signup'),
  (2, TIMESTAMP '2024-01-05 08:00', 'churn'),
  (2, TIMESTAMP '2024-01-04 15:00', 'active'),
  (3, TIMESTAMP '2024-01-01 11:00', 'signup'),
  (3, TIMESTAMP '2024-01-06 16:00', 'active'),
  (3, TIMESTAMP '2024-01-12 10:30', 'churn'),
  (4, TIMESTAMP '2024-01-03 08:15', 'signup'),
  (4, TIMESTAMP '2024-01-07 13:45', 'active'),
  (5, TIMESTAMP '2024-01-04 09:20', 'signup'),
  (5, TIMESTAMP '2024-01-08 11:10', 'active'),
  (5, TIMESTAMP '2024-01-15 17:00', 'active'),
  (6, TIMESTAMP '2024-01-05 10:05', 'signup'),
  (6, TIMESTAMP '2024-01-11 12:30', 'churn'),
  (7, TIMESTAMP '2024-01-06 14:40', 'signup'),
  (7, TIMESTAMP '2024-01-13 09:50', 'active'),
  (8, TIMESTAMP '2024-01-07 15:25', 'signup'),
  (8, TIMESTAMP '2024-01-14 08:35', 'active'),
  (8, TIMESTAMP '2024-01-20 16:15', 'churn'),
  (9, TIMESTAMP '2024-01-08 11:55', 'signup'),
  (9, TIMESTAMP '2024-01-16 13:05', 'active'),
  (10, TIMESTAMP '2024-01-09 10:45', 'signup');`;

/** The page's running-total block: 24 orders from six users. */
const PAGE_ORDERS = `CREATE TABLE orders (user_id INTEGER, order_date DATE, amount DECIMAL(10,2));
INSERT INTO orders VALUES
  (1, DATE '2024-01-01', 100.00), (1, DATE '2024-01-05', 250.00),
  (1, DATE '2024-01-12', 75.50),  (1, DATE '2024-01-19', 310.00),
  (1, DATE '2024-01-26', 45.25),  (2, DATE '2024-01-03', 200.00),
  (2, DATE '2024-01-08', 150.00), (2, DATE '2024-01-15', 90.75),
  (2, DATE '2024-01-22', 265.00), (3, DATE '2024-01-02', 120.00),
  (3, DATE '2024-01-09', 340.50), (3, DATE '2024-01-16', 60.00),
  (3, DATE '2024-01-23', 175.25), (4, DATE '2024-01-04', 210.00),
  (4, DATE '2024-01-11', 85.00),  (4, DATE '2024-01-18', 295.75),
  (5, DATE '2024-01-06', 130.00), (5, DATE '2024-01-13', 240.50),
  (5, DATE '2024-01-20', 70.00),  (5, DATE '2024-01-27', 190.25),
  (6, DATE '2024-01-07', 155.00), (6, DATE '2024-01-14', 280.00),
  (6, DATE '2024-01-21', 110.50), (6, DATE '2024-01-28', 205.00);`;

/** The page's gaps-and-islands block: 24 logins from five users. */
const PAGE_LOGINS = `CREATE TABLE daily_logins (user_id INTEGER, login_date DATE);
INSERT INTO daily_logins VALUES
  (1, DATE '2024-01-01'), (1, DATE '2024-01-02'), (1, DATE '2024-01-03'),
  (1, DATE '2024-01-05'), (1, DATE '2024-01-06'), (1, DATE '2024-01-10'),
  (1, DATE '2024-01-11'), (1, DATE '2024-01-12'), (1, DATE '2024-01-13'),
  (2, DATE '2024-01-01'), (2, DATE '2024-01-04'), (2, DATE '2024-01-05'),
  (2, DATE '2024-01-06'), (2, DATE '2024-01-09'),
  (3, DATE '2024-01-02'), (3, DATE '2024-01-03'), (3, DATE '2024-01-04'),
  (3, DATE '2024-01-08'), (3, DATE '2024-01-09'),
  (4, DATE '2024-01-01'), (4, DATE '2024-01-07'),
  (5, DATE '2024-01-03'), (5, DATE '2024-01-04'), (5, DATE '2024-01-05');`;

// ── Copied from the Data Analyst videos' check.mjs ──────────────────────────

/** da-sql's anti-join setup: the DA page's first four customers and their
 *  orders, plus order 107, a guest checkout with no customer (that video's
 *  own row). */
const DA_ANTI = `CREATE TABLE customers (id INTEGER, name TEXT);
INSERT INTO customers VALUES (1, 'Ava'), (2, 'Ben'), (3, 'Cy'), (4, 'Di');
CREATE TABLE orders (id INTEGER, customer_id INTEGER, amount DECIMAL(8,2));
INSERT INTO orders VALUES
  (101, 1, 120.00), (102, 1, 40.00), (103, 2, 80.00),
  (104, 3, 55.00),  (105, 3, 45.00), (106, 2, 30.00), (107, NULL, 25.00);`;

// ── The video's own tables ──────────────────────────────────────────────────

/** The video's own daily metric, for the moving average and the spine: its
 *  values are the video's own, on the nine days user 1 logs in on in the
 *  page's daily_logins (January 1 to 13, with the 4th and the 7th to the 9th
 *  missing), so the opening's strip of days is the same thirteen days. */
const METRICS = `CREATE TABLE daily_metrics (event_date DATE, daily_value INTEGER);
INSERT INTO daily_metrics VALUES
  (DATE '2024-01-01', 120), (DATE '2024-01-02', 135), (DATE '2024-01-03', 110),
  (DATE '2024-01-05', 150), (DATE '2024-01-06', 140), (DATE '2024-01-10', 160),
  (DATE '2024-01-11', 155), (DATE '2024-01-12', 170), (DATE '2024-01-13', 180);`;

/** The video's own revenue by day, for LAG and LEAD: the first four amounts
 *  of the Data Analyst advanced SQL page's transactions, in the Data Engineer
 *  page's column names. */
const REVENUE = `CREATE TABLE daily_revenue (order_date DATE, revenue INTEGER);
INSERT INTO daily_revenue VALUES
  (DATE '2024-01-01', 100), (DATE '2024-01-02', 250),
  (DATE '2024-01-03', 75),  (DATE '2024-01-04', 180);`;

/** The video's own seven employees in three levels, for the recursive CTE,
 *  and a three-node loop (1 to 2 to 3 to 1) for the depth cap. */
const STAFF = `CREATE TABLE employees (id INTEGER, name TEXT, manager_id INTEGER);
INSERT INTO employees VALUES
  (1, 'Ana', NULL), (2, 'Ben', 1), (3, 'Cy', 1),
  (4, 'Dee', 2), (5, 'Eli', 2), (6, 'Fay', 3), (7, 'Gus', 3);
CREATE TABLE edges (src INTEGER, dst INTEGER);
INSERT INTO edges VALUES (1, 2), (2, 3), (3, 1);`;

/** The video's own users, for COALESCE: a phone, only an email, neither. */
const CONTACTS = `CREATE TABLE users (user_id INTEGER, phone TEXT, email TEXT);
INSERT INTO users VALUES
  (1, '555-0101', 'ada@example.com'), (2, NULL, 'bo@example.com'), (3, NULL, NULL);`;

const results = { figures: {} };

// 1. ROW_NUMBER, RANK and DENSE_RANK: the page's query, and the same ordered
//    by row number so the figure can show the slice where the 80s tie.
const RANKS =
  "SELECT name, score,\n  ROW_NUMBER() OVER (ORDER BY score DESC) AS rn,\n  RANK()       OVER (ORDER BY score DESC) AS rnk,\n  DENSE_RANK() OVER (ORDER BY score DESC) AS dr\nFROM players";
results.figures.rank = await figure(PAGE_PLAYERS, {
  page: `${RANKS};`,
  ordered: `${RANKS}\nORDER BY rn;`,
});

// 2, 3. The latest row per key: numbered from the newest, kept in a
//    subquery (the Postgres way), then with QUALIFY (the page's block, with
//    an ORDER BY so the rows print in user order). The tie is the video's
//    own: a second event for user 3 at the same moment as their last.
const NUMBERED = "ROW_NUMBER() OVER (\n    PARTITION BY user_id ORDER BY event_time DESC) AS rn";
const SUBQUERY = (fn) =>
  `SELECT user_id, event_time, status\nFROM (\n  SELECT *, ${fn}() OVER (\n    PARTITION BY user_id ORDER BY event_time DESC) AS rn\n  FROM events\n) t\nWHERE rn = 1\nORDER BY user_id;`;
results.figures.latest = await figure(PAGE_EVENTS, {
  rows: "SELECT COUNT(*) AS events, COUNT(DISTINCT user_id) AS users FROM events;",
  // The numbering, for the first three users: what the subquery filters.
  numbered: `SELECT user_id, event_time, status,\n  ${NUMBERED}\nFROM events\nWHERE user_id <= 3\nORDER BY user_id, rn;`,
  subquery: SUBQUERY("ROW_NUMBER"),
  qualify: "SELECT *\nFROM events\nQUALIFY ROW_NUMBER() OVER (\n  PARTITION BY user_id ORDER BY event_time DESC\n) = 1\nORDER BY user_id;",
});
results.figures.latestTie = await figure(
  `${PAGE_EVENTS}\nINSERT INTO events VALUES (3, TIMESTAMP '2024-01-12 10:30', 'active');`,
  {
    userThree: "SELECT user_id, event_time, status FROM events WHERE user_id = 3 ORDER BY event_time DESC, status;",
    // User 3's events as RANK numbers them: both latest events are 1.
    userThreeRanks:
      "SELECT event_time, status,\n  RANK() OVER (ORDER BY event_time DESC) AS rnk\nFROM events\nWHERE user_id = 3\nORDER BY rnk, status;",
    rank: SUBQUERY("RANK"),
    rowNumber: SUBQUERY("ROW_NUMBER"),
  },
);

// 6. A seven-day moving average on the video's own days with gaps: the
//    page's ROWS frame (rounded to one place, with where each frame starts
//    and how many rows it holds), then a RANGE frame of six days.
const frameCols = (frame) =>
  `ROUND(AVG(daily_value) OVER w, 1) AS avg_7,\n  MIN(event_date) OVER w AS frame_start,\n  COUNT(*) OVER w AS n\nFROM daily_metrics\nWINDOW w AS (ORDER BY event_date\n  ${frame})\nORDER BY event_date;`;
results.figures.moving = await figure(METRICS, {
  table: "SELECT event_date, daily_value FROM daily_metrics ORDER BY event_date;",
  // The page's query as it prints, ordered.
  page: "SELECT\n  event_date,\n  daily_value,\n  AVG(daily_value) OVER (\n    ORDER BY event_date\n    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\n  ) AS moving_avg_7d\nFROM daily_metrics\nORDER BY event_date;",
  rows: `SELECT event_date, daily_value,\n  ${frameCols("ROWS BETWEEN 6 PRECEDING AND CURRENT ROW")}`,
  range: `SELECT event_date, daily_value,\n  ${frameCols("RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW")}`,
});

// 7. Detecting and filling the gaps with a date spine. The page's block
//    calls generate_series in SELECT, which DuckDB returns as one list, so
//    the cast fails ("pageSpine"); the spine here is generate_series as a
//    table, which is what the page's DuckDB needs. Then the same moving
//    average over the filled days.
const SPINE =
  "WITH spine AS (\n  SELECT CAST(day AS DATE) AS day\n  FROM generate_series(DATE '2024-01-01',\n    DATE '2024-01-13', INTERVAL 1 DAY) AS t(day)\n)";
results.figures.spine = await figure(METRICS, {
  pageSpine:
    "WITH spine AS (\n  SELECT generate_series(\n    DATE '2024-01-01', DATE '2024-01-31', INTERVAL '1 day'\n  )::date AS day\n)\nSELECT\n  s.day,\n  COALESCE(m.daily_value, 0) AS daily_value\nFROM spine s\nLEFT JOIN daily_metrics m ON m.event_date = s.day\nORDER BY s.day;",
  joined: `${SPINE}\nSELECT s.day, m.daily_value\nFROM spine s\nLEFT JOIN daily_metrics m ON m.event_date = s.day\nORDER BY s.day;`,
  gaps: `${SPINE}\nSELECT s.day\nFROM spine s\nLEFT JOIN daily_metrics m ON m.event_date = s.day\nWHERE m.event_date IS NULL\nORDER BY s.day;`,
  filled: `${SPINE}\nSELECT s.day, COALESCE(m.daily_value, 0) AS daily_value\nFROM spine s\nLEFT JOIN daily_metrics m ON m.event_date = s.day\nORDER BY s.day;`,
  filledAvg: `${SPINE},\nfilled AS (\n  SELECT s.day, COALESCE(m.daily_value, 0) AS daily_value\n  FROM spine s\n  LEFT JOIN daily_metrics m ON m.event_date = s.day\n)\nSELECT day, daily_value,\n  ROUND(AVG(daily_value) OVER (ORDER BY day\n    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1) AS avg_7,\n  MIN(day) OVER (ORDER BY day\n    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS frame_start\nFROM filled\nORDER BY day;`,
});

// 8. Gaps and islands: the page's query, user 1's rows with the key it
//    builds (cast to a date for printing; the page's key is that date at
//    midnight), and the duplicate login that breaks it (the video's own row)
//    with the fix, deduplicating the days first.
const ISLANDS = (from) =>
  `SELECT\n  user_id,\n  MIN(login_date) AS island_start,\n  MAX(login_date) AS island_end,\n  COUNT(*)        AS streak_days\nFROM (\n  SELECT\n    user_id,\n    login_date,\n    login_date - ROW_NUMBER() OVER (\n      PARTITION BY user_id ORDER BY login_date\n    ) * INTERVAL '1 day' AS grp\n  FROM ${from}\n) t\nGROUP BY user_id, grp\nORDER BY user_id, island_start;`;
const KEYS = (where) =>
  `SELECT login_date,\n  ROW_NUMBER() OVER (ORDER BY login_date) AS rn,\n  CAST(login_date - ROW_NUMBER() OVER (ORDER BY login_date)\n    * INTERVAL '1 day' AS DATE) AS grp\nFROM daily_logins\nWHERE ${where}\nORDER BY login_date;`;
results.figures.islands = await figure(PAGE_LOGINS, {
  page: ISLANDS("daily_logins"),
  userOne: KEYS("user_id = 1"),
  counts: "SELECT COUNT(*) AS logins, COUNT(DISTINCT user_id) AS users FROM daily_logins;",
});
results.figures.islandsDup = await figure(`${PAGE_LOGINS}\nINSERT INTO daily_logins VALUES (1, DATE '2024-01-02');`, {
  userOne: KEYS("user_id = 1"),
  page: ISLANDS("daily_logins"),
  deduped: ISLANDS("(SELECT DISTINCT user_id, login_date FROM daily_logins)"),
});

// 9. Rows in one table but not another: EXCEPT on da-sql's anti-join tables,
//    where NOT IN returned nothing. EXCEPT compares as a set, so the guest
//    order's null does not stop it.
results.figures.anti = await figure(DA_ANTI, {
  except: "SELECT id FROM customers\nEXCEPT\nSELECT customer_id FROM orders;",
  notIn: "SELECT id FROM customers\nWHERE id NOT IN (SELECT customer_id FROM orders);",
});

// 10. A recursive CTE: the page's query on the video's own seven employees,
//     then what each pass adds (the anchor, then each level down).
const ORG =
  "WITH RECURSIVE org_tree AS (\n  -- anchor: top-level manager\n  SELECT id, name, manager_id, 1 AS depth\n  FROM employees\n  WHERE manager_id IS NULL\n\n  UNION ALL\n\n  -- recursive: direct reports of rows already in the result\n  SELECT e.id, e.name, e.manager_id, t.depth + 1\n  FROM employees e\n  JOIN org_tree t ON e.manager_id = t.id\n)";
results.figures.recursive = await figure(STAFF, {
  table: "SELECT id, name, manager_id FROM employees ORDER BY id;",
  page: `${ORG}\nSELECT * FROM org_tree;`,
  ordered: `${ORG}\nSELECT * FROM org_tree\nORDER BY depth, id;`,
  levels: `${ORG}\nSELECT depth, COUNT(*) AS people\nFROM org_tree\nGROUP BY depth\nORDER BY depth;`,
  // A walk of a loop never runs dry; the cap in the recursive half stops it.
  loop: "WITH RECURSIVE walk AS (\n  SELECT 1 AS node, 1 AS depth\n  UNION ALL\n  SELECT e.dst, t.depth + 1\n  FROM edges e\n  JOIN walk t ON e.src = t.node\n  WHERE t.depth < 10\n)\nSELECT MAX(depth) AS deepest, COUNT(*) AS rows FROM walk;",
});

// At speed.
// A CTE against a subquery: the page's two statements on the page's orders,
// with the video's own threshold (no user's total passes the page's 1000).
results.figures.cte = await figure(PAGE_ORDERS, {
  totals: "SELECT user_id, SUM(amount) AS total FROM orders GROUP BY user_id ORDER BY user_id;",
  pageThreshold: "SELECT COUNT(*) AS over_1000 FROM (SELECT user_id, SUM(amount) AS total FROM orders GROUP BY user_id) WHERE total > 1000;",
  subquery: "SELECT user_id, total\nFROM (SELECT user_id, SUM(amount) AS total\n      FROM orders GROUP BY user_id) t\nWHERE t.total > 700\nORDER BY user_id;",
  cte: "WITH user_totals AS (\n  SELECT user_id, SUM(amount) AS total\n  FROM orders GROUP BY user_id\n)\nSELECT user_id, total FROM user_totals\nWHERE total > 700\nORDER BY user_id;",
  // The page's running total on its first user, in the round's width: the
  // same frame, partitioned and ordered as the page writes it.
  runningOne:
    "SELECT order_date, amount,\n  SUM(amount) OVER (\n    PARTITION BY user_id ORDER BY order_date\n    ROWS BETWEEN UNBOUNDED PRECEDING\n      AND CURRENT ROW) AS running_total\nFROM orders\nWHERE user_id = 1\nORDER BY order_date;",
  // The page's running total, as the page writes it.
  running:
    "SELECT\n  user_id,\n  order_date,\n  amount,\n  SUM(amount) OVER (\n    PARTITION BY user_id\n    ORDER BY order_date\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n  ) AS running_total\nFROM orders\nORDER BY user_id, order_date;",
});
// LAG and LEAD: the page's query with its default of 0, and LEAD beside it.
results.figures.lag = await figure(REVENUE, {
  page: "SELECT\n  order_date,\n  revenue,\n  LAG(revenue, 1, 0) OVER (ORDER BY order_date) AS prev_revenue,\n  revenue - LAG(revenue, 1, 0) OVER (ORDER BY order_date) AS delta\nFROM daily_revenue;",
  both: "SELECT order_date, revenue,\n  LAG(revenue, 1, 0) OVER (ORDER BY order_date) AS prev,\n  LEAD(revenue) OVER (ORDER BY order_date) AS next,\n  revenue - LAG(revenue, 1, 0)\n    OVER (ORDER BY order_date) AS delta\nFROM daily_revenue\nORDER BY order_date;",
});
// PERCENT_RANK and CUME_DIST on the page's own example values.
results.figures.percent = await figure("CREATE TABLE scores AS SELECT * FROM (VALUES (10), (20), (20), (30)) AS t(v);", {
  both: "SELECT v,\n  ROUND(PERCENT_RANK() OVER (ORDER BY v), 2) AS pct_rank,\n  ROUND(CUME_DIST()    OVER (ORDER BY v), 2) AS cume_dist\nFROM scores\nORDER BY v;",
});
// COALESCE: the page's query on the video's own three users.
results.figures.coalesce = await figure(CONTACTS, {
  table: "SELECT user_id, phone, email FROM users ORDER BY user_id;",
  page: "SELECT COALESCE(phone, email, 'no contact') AS contact\nFROM users;",
  nullif: "SELECT 500 / NULLIF(0, 0) AS per_unit;",
});
// Pivoting: DuckDB's PIVOT clause on ds-sql's traffic table, which the round
// names beside the conditional aggregation (ds-sql's result, imported).
results.figures.pivot = await figure(
  `CREATE TABLE traffic AS SELECT * FROM (VALUES
  ('North', 'mobile', 120), ('North', 'desktop', 80),
  ('South', 'mobile', 95),  ('South', 'desktop', 140),
  ('East', 'mobile', 60),   ('East', 'desktop', 70)
) AS t(region, device, sessions);`,
  {
    pivot: "PIVOT traffic ON device USING SUM(sessions) GROUP BY region ORDER BY region;",
  },
);

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps)
    .filter(([, s]) => !s.ok)
    .map(([id, s]) => `${f}.${id}: ${s.error}`),
);
console.log(`wrote ${fileURLToPath(out)} (${results.figures.rank.version})`);
console.log(failed.length ? `errors, as expected where a figure shows one:\n  ${failed.join("\n  ")}` : "no errors");
