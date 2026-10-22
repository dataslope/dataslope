// Runs every statement the ds-sql video shows in DuckDB, the engine the Data
// Scientist SQL page's blocks run in the reader's browser, and writes what
// came back to results.json, which data.ts reads. From the repo root, where
// @duckdb/duckdb-wasm (pinned to the version runtime/duckdb.ts loads) is
// installed:
//
//   node video/src/videos/ds-sql/check.mjs
//
// Each figure runs in a fresh database built by its own setup, as the page
// gives every block its own engine. Values are printed the way a SQL client
// prints them: a DECIMAL at its scale, a DATE as "2024-01-01", a NULL as
// null. Tables are the page's own (content/interview/data-scientist/sql.mdx)
// wherever the page has one; the rest are marked "the video's own" below and
// in script.ts. The one Postgres figure (a rate's integer division and its
// divide-by-zero error) runs on the site's Postgres engine through
// scripts/lib/sql-engines.mjs, the same one the Postgres lessons grade with.
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

/** The same, on the site's Postgres engine (PGlite), for the one figure that
 *  shows what Postgres does differently. Values come back as Postgres prints
 *  them. */
async function pgFigure(setup, steps) {
  const { createEngine } = await import(new URL("../../../../scripts/lib/sql-engines.mjs", import.meta.url).href);
  const engine = await createEngine("postgres");
  await engine.exec(setup);
  const out = {};
  for (const [id, sql] of Object.entries(steps)) {
    try {
      const [r] = await engine.exec(sql);
      out[id] = { sql, ok: true, columns: r.columns, rows: r.values.map((row) => row.map((v) => (v === null ? null : String(v)))) };
    } catch (e) {
      out[id] = { sql, ok: false, error: `ERROR: ${String(e.message).split("\n")[0]}` };
    }
  }
  const version = engine.version;
  await engine.destroy();
  return { setup, steps: out, version };
}

// ── The page's tables ───────────────────────────────────────────────────────

/** The page's WHERE and HAVING block: 24 events, a region and an amount. */
const PAGE_EVENTS = `CREATE TABLE events AS SELECT * FROM (VALUES
  (1, 'North', 120.0), (2, 'South', 80.0), (3, 'North', 60.0),
  (4, 'East', 200.0), (5, 'South', 90.0), (6, 'North', 75.0),
  (7, 'West', 145.0), (8, 'East', 95.0), (9, 'South', 130.0),
  (10, 'North', 210.0), (11, 'West', 40.0), (12, 'East', 175.0),
  (13, 'South', 65.0), (14, 'North', 88.0), (15, 'West', 62.0),
  (16, 'East', 45.0), (17, 'South', 105.0), (18, 'North', 99.0),
  (19, 'West', 155.0), (20, 'East', 185.0), (21, 'South', 70.0),
  (22, 'North', 143.0), (23, 'West', 118.0), (24, 'East', 52.0)
) AS t(id, region, amount);`;

/** The page's window block: 24 sales by region and rep. */
const PAGE_SALES = `CREATE TABLE sales AS SELECT * FROM (VALUES
  ('North', 'Ava', 100), ('North', 'Ben', 140), ('North', 'Cy', 120),
  ('North', 'Dana', 175), ('North', 'Eli', 85), ('North', 'Fay', 210),
  ('South', 'Di', 90), ('South', 'Ed', 130), ('South', 'Gil', 165),
  ('South', 'Hana', 75), ('South', 'Ira', 145), ('South', 'Jo', 110),
  ('East', 'Kim', 200), ('East', 'Lars', 95), ('East', 'Mira', 155),
  ('East', 'Ned', 130), ('East', 'Ola', 70), ('East', 'Pax', 185),
  ('West', 'Quin', 115), ('West', 'Rae', 160), ('West', 'Sol', 45),
  ('West', 'Tao', 195), ('West', 'Uma', 105), ('West', 'Val', 140)
) AS t(region, rep, amount);`;

/** The page's safe-rate block: 24 variants, four of them with no sessions. */
const PAGE_FUNNEL = `CREATE TABLE funnel AS SELECT * FROM (VALUES
  ('A', 1000, 120), ('B', 800, 96), ('C', 0, 0),
  ('D', 1240, 173), ('E', 640, 51), ('F', 0, 0),
  ('G', 2100, 315), ('H', 480, 24), ('I', 1560, 218),
  ('J', 920, 110), ('K', 0, 0), ('L', 1380, 152),
  ('M', 760, 68), ('N', 1900, 247), ('O', 540, 43),
  ('P', 1120, 179), ('Q', 860, 60), ('R', 1440, 216),
  ('S', 700, 35), ('T', 1680, 269), ('U', 0, 0),
  ('V', 980, 127), ('W', 1260, 88), ('X', 820, 106)
) AS t(variant, sessions, conversions);`;

/** The page's sessionization block: 24 hits from five users on one day. */
const PAGE_HITS = `CREATE TABLE hits AS SELECT * FROM (VALUES
  (1, TIMESTAMP '2024-01-01 09:00:00'), (1, TIMESTAMP '2024-01-01 09:10:00'),
  (1, TIMESTAMP '2024-01-01 09:25:00'), (1, TIMESTAMP '2024-01-01 11:00:00'),
  (1, TIMESTAMP '2024-01-01 11:15:00'), (1, TIMESTAMP '2024-01-01 14:40:00'),
  (2, TIMESTAMP '2024-01-01 09:05:00'), (2, TIMESTAMP '2024-01-01 09:20:00'),
  (2, TIMESTAMP '2024-01-01 09:45:00'), (2, TIMESTAMP '2024-01-01 13:00:00'),
  (2, TIMESTAMP '2024-01-01 13:20:00'), (3, TIMESTAMP '2024-01-01 08:30:00'),
  (3, TIMESTAMP '2024-01-01 08:55:00'), (3, TIMESTAMP '2024-01-01 12:10:00'),
  (3, TIMESTAMP '2024-01-01 12:35:00'), (3, TIMESTAMP '2024-01-01 18:00:00'),
  (4, TIMESTAMP '2024-01-01 10:00:00'), (4, TIMESTAMP '2024-01-01 10:20:00'),
  (4, TIMESTAMP '2024-01-01 10:45:00'), (4, TIMESTAMP '2024-01-01 16:05:00'),
  (5, TIMESTAMP '2024-01-01 07:15:00'), (5, TIMESTAMP '2024-01-01 07:40:00'),
  (5, TIMESTAMP '2024-01-01 15:30:00'), (5, TIMESTAMP '2024-01-01 15:50:00')
) AS t(user_id, ts);`;

/** The page's running-total block: 24 days of transactions. */
const PAGE_TXNS = `CREATE TABLE txns AS SELECT * FROM (VALUES
  (DATE '2024-01-01', 100), (DATE '2024-01-02', 250),
  (DATE '2024-01-03', 75),  (DATE '2024-01-04', 180),
  (DATE '2024-01-05', 320), (DATE '2024-01-06', 140),
  (DATE '2024-01-07', 95),  (DATE '2024-01-08', 210),
  (DATE '2024-01-09', 60),  (DATE '2024-01-10', 275),
  (DATE '2024-01-11', 130), (DATE '2024-01-12', 185),
  (DATE '2024-01-13', 340), (DATE '2024-01-14', 55),
  (DATE '2024-01-15', 220), (DATE '2024-01-16', 165),
  (DATE '2024-01-17', 90),  (DATE '2024-01-18', 300),
  (DATE '2024-01-19', 125), (DATE '2024-01-20', 240),
  (DATE '2024-01-21', 70),  (DATE '2024-01-22', 195),
  (DATE '2024-01-23', 155), (DATE '2024-01-24', 280)
) AS t(day, amount);`;

/** The page's second challenge: 24 orders from twelve customers. */
const PAGE_ORDERS = `CREATE TABLE orders AS SELECT * FROM (VALUES
  (1, 10, DATE '2024-01-05', 120.0), (2, 10, DATE '2024-02-01', 60.0),
  (3, 20, DATE '2024-01-20', 80.0),  (4, 30, DATE '2024-01-02', 45.0),
  (5, 30, DATE '2024-03-10', 90.0),  (6, 20, DATE '2024-04-01', 30.0),
  (7, 40, DATE '2024-01-11', 210.0), (8, 40, DATE '2024-02-18', 75.0),
  (9, 50, DATE '2024-01-27', 165.0), (10, 50, DATE '2024-03-02', 55.0),
  (11, 60, DATE '2024-01-08', 95.0), (12, 60, DATE '2024-02-25', 140.0),
  (13, 70, DATE '2024-01-16', 185.0), (14, 70, DATE '2024-04-05', 40.0),
  (15, 80, DATE '2024-01-23', 130.0), (16, 80, DATE '2024-03-19', 70.0),
  (17, 90, DATE '2024-01-30', 250.0), (18, 90, DATE '2024-02-12', 85.0),
  (19, 100, DATE '2024-01-14', 110.0), (20, 100, DATE '2024-03-27', 65.0),
  (21, 110, DATE '2024-01-19', 175.0), (22, 110, DATE '2024-04-09', 50.0),
  (23, 120, DATE '2024-01-04', 200.0), (24, 120, DATE '2024-02-29', 35.0)
) AS t(id, customer_id, order_date, amount);`;

// ── The video's own tables ──────────────────────────────────────────────────

/** The video's own two months of active users: six in January; three of
 *  them back in February, plus one new. */
const ACTIVE = `CREATE TABLE active_jan AS SELECT * FROM (VALUES (1), (2), (3), (4), (5), (6)) AS t(user_id);
CREATE TABLE active_feb AS SELECT * FROM (VALUES (2), (3), (5), (7)) AS t(user_id);`;

/**
 * The video's own activity log for the cohort question: 23 users who first
 * show up in January (8), February (6), March (5) or April (4) 2024, and the
 * months each was active in. One event per active month, on a day that
 * varies by user, so the query has dates to truncate.
 */
const MONTHS_ACTIVE = {
  1: [1, 2, 3, 4], 2: [1, 2, 3, 4], 3: [1, 2, 3], 4: [1, 2], 5: [1, 2, 3, 4], 6: [1, 2], 7: [1], 8: [1],
  9: [2, 3, 4], 10: [2, 3, 4], 11: [2, 3], 12: [2], 13: [2, 3, 4], 14: [2],
  15: [3, 4], 16: [3, 4], 17: [3], 18: [3, 4], 19: [3],
  20: [4], 21: [4], 22: [4], 23: [4],
};
const activityRows = Object.entries(MONTHS_ACTIVE).flatMap(([user, months]) =>
  months.map((m) => `(${user}, DATE '2024-0${m}-${String(3 + ((Number(user) * 7 + m * 5) % 24)).padStart(2, "0")}')`),
);
const ACTIVITY = `CREATE TABLE activity AS SELECT * FROM (VALUES
  ${activityRows.join(",\n  ")}
) AS t(user_id, event_date);`;

/** The video's own twelve request latencies, in milliseconds: a fast body
 *  and a slow tail. */
const REQUESTS = `CREATE TABLE requests AS SELECT * FROM (VALUES
  (95), (110), (120), (130), (140), (150), (180), (190), (210), (260), (900), (2400)
) AS t(ms);`;

/** The video's own four scores, with the tie the page's 1, 2, 2, 4 needs. */
const SCORES = `CREATE TABLE scores AS SELECT * FROM (VALUES
  ('Ana', 300), ('Ben', 250), ('Cy', 250), ('Dee', 200)
) AS t(name, points);`;

/** The video's own sessions by region and device, for the pivot. */
const TRAFFIC = `CREATE TABLE traffic AS SELECT * FROM (VALUES
  ('North', 'mobile', 120), ('North', 'desktop', 80),
  ('South', 'mobile', 95),  ('South', 'desktop', 140),
  ('East', 'mobile', 60),   ('East', 'desktop', 70)
) AS t(region, device, sessions);`;

/** The video's own eight page views: two anonymous, four people. */
const VIEWS = `CREATE TABLE views AS SELECT * FROM (VALUES
  (1, 11), (2, 11), (3, 12), (4, NULL), (5, 13), (6, 12), (7, NULL), (8, 14)
) AS t(view_id, user_id);`;

const results = { figures: {} };

// 1, 2. Retention needs a LEFT JOIN, and churn is its NULL rows.
const RETAIN = "COUNT(b.user_id) * 1.0 / COUNT(*)";
results.figures.retain = await figure(ACTIVE, {
  jan: "SELECT user_id FROM active_jan ORDER BY user_id;",
  feb: "SELECT user_id FROM active_feb ORDER BY user_id;",
  inner: "SELECT a.user_id, b.user_id AS feb\nFROM active_jan a\nJOIN active_feb b ON b.user_id = a.user_id\nORDER BY a.user_id;",
  left: "SELECT a.user_id, b.user_id AS feb\nFROM active_jan a\nLEFT JOIN active_feb b ON b.user_id = a.user_id\nORDER BY a.user_id;",
  innerRate: `SELECT ${RETAIN} AS retention\nFROM active_jan a\nJOIN active_feb b ON b.user_id = a.user_id;`,
  leftRate: `SELECT ${RETAIN} AS retention\nFROM active_jan a\nLEFT JOIN active_feb b ON b.user_id = a.user_id;`,
  // The page's own churn query, as the page writes it.
  churn:
    "SELECT a.user_id\nFROM active_jan a\nLEFT JOIN active_feb b ON b.user_id = a.user_id\nWHERE b.user_id IS NULL;   -- active in Jan, gone in Feb",
  notExists:
    "SELECT a.user_id\nFROM active_jan a\nWHERE NOT EXISTS (\n  SELECT 1 FROM active_feb b WHERE b.user_id = a.user_id\n)\nORDER BY a.user_id;",
});

// 3. A safe rate: the page's block in DuckDB, and the same funnel in
//    Postgres, where integer division truncates and a zero divisor errors.
const FIRST_SIX = "WHERE variant IN ('A', 'B', 'C', 'D', 'E', 'F')";
results.figures.rate = await figure(PAGE_FUNNEL, {
  page: "SELECT\n  variant,\n  sessions,\n  conversions,\n  ROUND(conversions * 1.0 / NULLIF(sessions, 0), 4) AS conversion_rate\nFROM funnel\nORDER BY variant;",
  firstSix: `SELECT variant, sessions, conversions,\n  ROUND(conversions * 1.0 / NULLIF(sessions, 0), 4) AS conversion_rate\nFROM funnel\n${FIRST_SIX}\nORDER BY variant;`,
  bare: `SELECT variant, conversions / sessions AS rate\nFROM funnel\n${FIRST_SIX}\nORDER BY variant;`,
  zeros: "SELECT COUNT(*) AS no_sessions FROM funnel WHERE sessions = 0;",
  coalesced: `SELECT variant,\n  COALESCE(conversions * 1.0 / NULLIF(sessions, 0), 0) AS rate\nFROM funnel\n${FIRST_SIX}\nORDER BY variant;`,
});
results.figures.ratePg = await pgFigure(PAGE_FUNNEL, {
  bare: `SELECT variant, conversions / sessions AS rate\nFROM funnel\n${FIRST_SIX}\nORDER BY variant;`,
  truncated: "SELECT variant, conversions / sessions AS rate\nFROM funnel\nWHERE variant IN ('A', 'B')\nORDER BY variant;",
  fixed: `SELECT variant,\n  ROUND(conversions * 1.0 / NULLIF(sessions, 0), 4) AS rate\nFROM funnel\n${FIRST_SIX}\nORDER BY variant;`,
});

// 4. Cohort retention: the page's query on the video's own activity log,
//    then its counts as rates of each cohort's month zero.
const COHORT_CTES =
  "WITH first_seen AS (\n  SELECT user_id, DATE_TRUNC('month', MIN(event_date)) AS cohort\n  FROM activity\n  GROUP BY user_id\n),\nlabeled AS (\n  SELECT a.user_id, f.cohort,\n    DATE_DIFF('month', f.cohort, DATE_TRUNC('month', a.event_date)) AS month_offset\n  FROM activity a\n  JOIN first_seen f USING (user_id)\n)";
results.figures.cohort = await figure(ACTIVITY, {
  rows: "SELECT COUNT(*) AS events, COUNT(DISTINCT user_id) AS users FROM activity;",
  sample: "SELECT user_id, event_date FROM activity ORDER BY user_id, event_date LIMIT 6;",
  page: `${COHORT_CTES}\nSELECT cohort, month_offset, COUNT(DISTINCT user_id) AS retained\nFROM labeled\nGROUP BY cohort, month_offset\nORDER BY cohort, month_offset;`,
  rates: `${COHORT_CTES},\ncounts AS (\n  SELECT cohort, month_offset, COUNT(DISTINCT user_id) AS retained\n  FROM labeled\n  GROUP BY cohort, month_offset\n)\nSELECT cohort, month_offset, retained,\n  ROUND(100.0 * retained / FIRST_VALUE(retained) OVER (\n    PARTITION BY cohort ORDER BY month_offset), 0) AS pct\nFROM counts\nORDER BY cohort, month_offset;`,
});

// 5. Sessionization: the page's block, and the same steps for user 1 with
//    the gap in minutes, for the timeline.
results.figures.sessions = await figure(PAGE_HITS, {
  page: "WITH gaps AS (\n  SELECT user_id, ts,\n    CASE\n      WHEN ts - LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) > INTERVAL '30 minutes'\n        OR LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) IS NULL\n      THEN 1 ELSE 0\n    END AS is_new_session\n  FROM hits\n)\nSELECT user_id, ts,\n  SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY ts) AS session_id\nFROM gaps\nORDER BY user_id, ts;",
  userOne:
    "SELECT strftime(ts, '%H:%M') AS time,\n  DATE_DIFF('minute', LAG(ts) OVER (ORDER BY ts), ts) AS gap_min\nFROM hits\nWHERE user_id = 1\nORDER BY ts;",
  userOneSteps:
    "WITH g AS (\n  SELECT ts, DATE_DIFF('minute', LAG(ts) OVER (ORDER BY ts), ts) AS gap_min\n  FROM hits WHERE user_id = 1\n),\nf AS (\n  SELECT *, CASE WHEN gap_min IS NULL OR gap_min > 30 THEN 1 ELSE 0 END AS is_new\n  FROM g\n)\nSELECT strftime(ts, '%H:%M') AS time, gap_min, is_new,\n  SUM(is_new) OVER (ORDER BY ts) AS session_id\nFROM f\nORDER BY ts;",
  perUser:
    "WITH gaps AS (\n  SELECT user_id, ts,\n    CASE WHEN ts - LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) > INTERVAL '30 minutes'\n      OR LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) IS NULL THEN 1 ELSE 0 END AS is_new_session\n  FROM hits\n)\nSELECT user_id, SUM(is_new_session) AS sessions, COUNT(*) AS hits\nFROM gaps\nGROUP BY user_id\nORDER BY user_id;",
});

// 6. Median and percentiles on the video's own latencies.
results.figures.pct = await figure(REQUESTS, {
  values: "SELECT ms FROM requests ORDER BY ms;",
  mean: "SELECT ROUND(AVG(ms), 1) AS mean FROM requests;",
  slower: "SELECT COUNT(*) AS faster_than_mean FROM requests WHERE ms < (SELECT AVG(ms) FROM requests);",
  median:
    "SELECT\n  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ms), 1) AS median_cont,\n  PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY ms) AS median_disc\nFROM requests;",
  p90:
    "SELECT\n  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ms), 1) AS p90_cont,\n  PERCENTILE_DISC(0.9) WITHIN GROUP (ORDER BY ms) AS p90_disc\nFROM requests;",
});

// At speed.
results.figures.having = await figure(PAGE_EVENTS, {
  page: "SELECT region, COUNT(*) AS n, SUM(amount) AS revenue\nFROM events\nWHERE amount > 0          -- row filter, before grouping\nGROUP BY region\nHAVING COUNT(*) >= 2      -- group filter, after aggregation\nORDER BY revenue DESC;",
  inWhere: "SELECT region, COUNT(*) AS n\nFROM events\nWHERE COUNT(*) >= 2\nGROUP BY region;",
});
results.figures.window = await figure(PAGE_SALES, {
  rows: "SELECT COUNT(*) AS n FROM sales;",
  grouped: "SELECT region, SUM(amount) AS region_total\nFROM sales\nGROUP BY region\nORDER BY region;",
  windowed:
    "SELECT region, rep, amount,\n  SUM(amount) OVER (PARTITION BY region) AS region_total\nFROM sales\nORDER BY region, rep;",
  topN: "WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY region ORDER BY amount DESC) AS rn\n  FROM sales\n)\nSELECT region, rep, amount, rn\nFROM ranked\nWHERE rn <= 2\nORDER BY region, rn;",
});
results.figures.rank = await figure(SCORES, {
  ranks:
    "SELECT name, points,\n  ROW_NUMBER() OVER (ORDER BY points DESC) AS row_number,\n  RANK()       OVER (ORDER BY points DESC) AS rank,\n  DENSE_RANK() OVER (ORDER BY points DESC) AS dense_rank\nFROM scores\nORDER BY points DESC, name;",
});
results.figures.txns = await figure(PAGE_TXNS, {
  dod: "SELECT day, amount,\n  amount - LAG(amount) OVER (ORDER BY day) AS dod_change\nFROM txns\nORDER BY day;",
  running: "SELECT day, amount,\n  SUM(amount) OVER (ORDER BY day) AS running_total\nFROM txns\nORDER BY day;",
});
results.figures.latest = await figure(PAGE_ORDERS, {
  latest:
    "WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY customer_id ORDER BY order_date DESC) AS rn\n  FROM orders\n)\nSELECT customer_id, order_date, amount\nFROM ranked\nWHERE rn = 1\nORDER BY customer_id;",
  rows: "SELECT COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS customers FROM orders;",
});
results.figures.pivot = await figure(TRAFFIC, {
  pivot:
    "SELECT\n  region,\n  SUM(CASE WHEN device = 'mobile' THEN sessions ELSE 0 END) AS mobile,\n  SUM(CASE WHEN device = 'desktop' THEN sessions ELSE 0 END) AS desktop\nFROM traffic\nGROUP BY region\nORDER BY region;",
});
results.figures.count = await figure(VIEWS, {
  counts: "SELECT\n  COUNT(*)                AS all_rows,\n  COUNT(user_id)          AS signed_in,\n  COUNT(DISTINCT user_id) AS people\nFROM views;",
});

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps)
    .filter(([, s]) => !s.ok)
    .map(([id, s]) => `${f}.${id}: ${s.error}`),
);
console.log(`wrote ${fileURLToPath(out)} (${results.figures.retain.version}; ${results.figures.ratePg.version})`);
console.log(failed.length ? `errors, as expected where a figure shows one:\n  ${failed.join("\n  ")}` : "no errors");
