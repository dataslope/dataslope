// Runs every statement the da-advanced-sql video shows in DuckDB, the engine
// the Data Analyst advanced SQL page's blocks run in the reader's browser, and
// writes what came back to results.json, which data.ts reads. From the repo
// root, where @duckdb/duckdb-wasm (pinned to the version runtime/duckdb.ts
// loads) is installed:
//
//   node video/src/videos/da-advanced-sql/check.mjs
//
// Each figure runs in a fresh database built by its own setup, as the page
// gives every block its own engine. Values are printed the way a SQL client
// prints them: a DECIMAL at its scale ("798.75"), a DATE as "2024-01-01", a
// NULL as null. Tables are the page's own (content/interview/data-analyst/
// advanced-sql.mdx) wherever the page has one; the rest are marked "the
// video's own" below and in script.ts.
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

/** The page's running-total block: 24 days of transactions. */
const PAGE_TXNS = `CREATE TABLE txns (day DATE, amount DECIMAL(8,2));
INSERT INTO txns VALUES
  ('2024-01-01', 100.00), ('2024-01-02', 250.00), ('2024-01-03', 75.00),
  ('2024-01-04', 180.00), ('2024-01-05', 320.00), ('2024-01-06', 140.00),
  ('2024-01-07', 95.00),  ('2024-01-08', 210.00), ('2024-01-09', 60.00),
  ('2024-01-10', 275.00), ('2024-01-11', 130.00), ('2024-01-12', 185.00),
  ('2024-01-13', 340.00), ('2024-01-14', 55.00),  ('2024-01-15', 220.00),
  ('2024-01-16', 165.00), ('2024-01-17', 90.00),  ('2024-01-18', 300.00),
  ('2024-01-19', 125.00), ('2024-01-20', 240.00), ('2024-01-21', 70.00),
  ('2024-01-22', 195.00), ('2024-01-23', 155.00), ('2024-01-24', 280.00);`;

/** The page's ranking block: 24 names and scores. */
const PAGE_RESULTS = `CREATE TABLE results (name TEXT, score INTEGER);
INSERT INTO results VALUES
  ('Alice', 90), ('Bob', 85), ('Carol', 85), ('Dave', 80),
  ('Erin', 97), ('Frank', 78), ('Grace', 91), ('Hugo', 85),
  ('Iris', 72), ('Jonas', 88), ('Kira', 95), ('Leo', 64),
  ('Mona', 80), ('Nils', 99), ('Otto', 76), ('Pia', 88),
  ('Quinn', 69), ('Rui', 93), ('Sara', 85), ('Theo', 71),
  ('Ulla', 82), ('Vik', 96), ('Wanda', 74), ('Yara', 88);`;

/** The page's NTILE block: 24 customers and what they spent. */
const PAGE_CUSTOMERS = `CREATE TABLE customers (name TEXT, spend DECIMAL(8,2));
INSERT INTO customers VALUES
  ('Ava', 900), ('Ben', 720), ('Cy', 540), ('Di', 480),
  ('Eve', 300), ('Finn', 260), ('Gus', 150), ('Hana', 90),
  ('Iris', 1450), ('Jonas', 1120), ('Kira', 880), ('Leo', 815),
  ('Mona', 640), ('Nils', 605), ('Otto', 570), ('Pia', 505),
  ('Quinn', 430), ('Rui', 375), ('Sara', 340), ('Theo', 285),
  ('Ulla', 230), ('Vik', 195), ('Wanda', 130), ('Yara', 45);`;

/** The page's recursive CTE block: a 24-person org chart. */
const PAGE_EMP = `CREATE TABLE emp (id INT, name TEXT, manager_id INT);
INSERT INTO emp VALUES
  (1,'CEO',NULL),
  (2,'VP Eng',1), (3,'VP Sales',1), (4,'VP Finance',1),
  (5,'Eng Mgr Platform',2), (6,'Eng Mgr Product',2), (7,'Eng Mgr Data',2),
  (8,'Sales Dir East',3), (9,'Sales Dir West',3),
  (10,'Controller',4),
  (11,'Engineer A',5), (12,'Engineer B',5), (13,'Engineer C',6),
  (14,'Engineer D',6), (15,'Engineer E',7), (16,'Engineer F',7),
  (17,'AE East 1',8), (18,'AE East 2',8), (19,'AE West 1',9),
  (20,'AE West 2',9), (21,'Accountant',10),
  (22,'Intern Platform',11), (23,'Intern Data',15), (24,'Intern Product',13);`;

/** The page's date-spine block: March and April sales, with gaps. */
const PAGE_SPINE_SALES = `CREATE TABLE sales (day DATE, amount INTEGER);
INSERT INTO sales VALUES
  ('2024-03-01', 100), ('2024-03-03', 250), ('2024-03-04', 75),
  ('2024-03-06', 190), ('2024-03-07', 145), ('2024-03-10', 220),
  ('2024-03-11', 80),  ('2024-03-12', 310), ('2024-03-15', 125),
  ('2024-03-17', 265), ('2024-03-18', 95),  ('2024-03-20', 175),
  ('2024-03-21', 240), ('2024-03-24', 60),  ('2024-03-25', 205),
  ('2024-03-26', 130), ('2024-03-28', 285), ('2024-03-29', 110),
  ('2024-03-31', 160), ('2024-04-02', 195), ('2024-04-03', 70),
  ('2024-04-05', 250), ('2024-04-06', 140), ('2024-04-08', 300);`;

/** The page's pivot block: 24 sales by region and quarter. */
const PAGE_PIVOT_SALES = `CREATE TABLE sales (region TEXT, quarter TEXT, amount INTEGER);
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

// 1, 2. What a window is, and PARTITION BY against ORDER BY. The video's own
//    six sales: the page's first six transaction amounts, three days in each
//    of two regions.
const SALES = `CREATE TABLE sales (day DATE, region TEXT, amount INTEGER);
INSERT INTO sales VALUES
  ('2024-01-01', 'North', 100), ('2024-01-02', 'North', 250), ('2024-01-03', 'North', 75),
  ('2024-01-01', 'South', 180), ('2024-01-02', 'South', 320), ('2024-01-03', 'South', 140);`;
results.figures.window = await figure(SALES, {
  table: "SELECT day, region, amount FROM sales ORDER BY region, day;",
  grouped: "SELECT region, SUM(amount) AS total\nFROM sales\nGROUP BY region\nORDER BY region;",
  windowed: "SELECT day, region, amount,\n  SUM(amount) OVER (PARTITION BY region) AS total\nFROM sales\nORDER BY region, day;",
  ranked:
    "SELECT day, region, amount,\n  RANK() OVER (PARTITION BY region\n               ORDER BY amount DESC) AS rnk\nFROM sales\nORDER BY region, rnk;",
});

// 3, 4, 5. ROW_NUMBER, RANK and DENSE_RANK on the page's scores; top N per
//    group and QUALIFY on the video's own eight products, with a tie at 310.
results.figures.rank = await figure(PAGE_RESULTS, {
  // The page's query; the figure shows ranks 7 to 14, where the ties are.
  all: "SELECT name, score,\n  ROW_NUMBER() OVER (ORDER BY score DESC) AS rn,\n  RANK()       OVER (ORDER BY score DESC) AS rnk,\n  DENSE_RANK() OVER (ORDER BY score DESC) AS drnk\nFROM results;",
  // The same, ordered, so the figure can take its slice in rank order.
  ordered:
    "SELECT name, score,\n  ROW_NUMBER() OVER (ORDER BY score DESC) AS rn,\n  RANK()       OVER (ORDER BY score DESC) AS rnk,\n  DENSE_RANK() OVER (ORDER BY score DESC) AS drnk\nFROM results\nORDER BY rn;",
});
const PRODUCTS = `CREATE TABLE products (category TEXT, product TEXT, revenue INTEGER);
INSERT INTO products VALUES
  ('Books', 'Dune', 420), ('Books', 'Emma', 310), ('Books', 'Ulysses', 310), ('Books', 'Beloved', 150),
  ('Games', 'Chess', 500), ('Games', 'Go', 260), ('Games', 'Risk', 180), ('Games', 'Uno', 90);`;
results.figures.topN = await figure(PRODUCTS, {
  table: "SELECT category, product, revenue FROM products ORDER BY category, revenue DESC, product;",
  rowNumber:
    "WITH ranked AS (\n  SELECT *,\n    ROW_NUMBER() OVER (PARTITION BY category\n                       ORDER BY revenue DESC) AS rn\n  FROM products\n)\nSELECT * FROM ranked WHERE rn <= 2\nORDER BY category, rn;",
  rank:
    "WITH ranked AS (\n  SELECT *,\n    RANK() OVER (PARTITION BY category\n                 ORDER BY revenue DESC) AS rn\n  FROM products\n)\nSELECT * FROM ranked WHERE rn <= 2\nORDER BY category, rn, product;",
  qualify:
    "SELECT *,\n  ROW_NUMBER() OVER (PARTITION BY category\n                     ORDER BY revenue DESC) AS rn\nFROM products\nQUALIFY rn <= 2\nORDER BY category, rn;",
  // Rapid fire: a window function in WHERE.
  inWhere:
    "SELECT *\nFROM products\nWHERE ROW_NUMBER() OVER (PARTITION BY category\n                         ORDER BY revenue DESC) <= 2;",
});

// 6, 7, 8. Frames. The video's own four payments: the page's first four
//    amounts, the middle two on one day, so RANGE has peers to take in.
const PAYMENTS = `CREATE TABLE payments (id INTEGER, day DATE, amount INTEGER);
INSERT INTO payments VALUES
  (1, '2024-01-01', 100), (2, '2024-01-02', 250), (3, '2024-01-02', 75), (4, '2024-01-03', 180);`;
results.figures.frame = await figure(PAYMENTS, {
  table: "SELECT id, day, amount FROM payments ORDER BY id;",
  rows: "SELECT id, day, amount,\n  SUM(amount) OVER (ORDER BY day\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total\nFROM payments\nORDER BY day, total;",
  range:
    "SELECT id, day, amount,\n  SUM(amount) OVER (ORDER BY day\n    RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total\nFROM payments\nORDER BY day, id;",
  defaulted: "SELECT id, day, amount,\n  SUM(amount) OVER (ORDER BY day) AS total\nFROM payments\nORDER BY day, id;",
  whole: "SELECT id, day, amount,\n  SUM(amount) OVER () AS total\nFROM payments\nORDER BY day, id;",
});
results.figures.last = await figure(PAGE_TXNS, {
  // The page's first four days: no ties, so the default frame ends on the row itself.
  defaulted:
    "SELECT day, amount,\n  LAST_VALUE(amount) OVER (ORDER BY day) AS last\nFROM txns\nWHERE day <= DATE '2024-01-04'\nORDER BY day;",
  widened:
    "SELECT day, amount,\n  LAST_VALUE(amount) OVER (ORDER BY day\n    ROWS BETWEEN UNBOUNDED PRECEDING\n         AND UNBOUNDED FOLLOWING) AS last\nFROM txns\nWHERE day <= DATE '2024-01-04'\nORDER BY day;",
});

// 9, 10. Running total and moving average: the page's block, with the moving
//    average rounded to cents for the screen.
results.figures.running = await figure(PAGE_TXNS, {
  both:
    "SELECT day, amount,\n  SUM(amount) OVER (ORDER BY day) AS running_total,\n  ROUND(AVG(amount) OVER (ORDER BY day\n    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg_3\nFROM txns\nORDER BY day;",
  centered:
    "SELECT day, amount,\n  ROUND(AVG(amount) OVER (ORDER BY day\n    ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING), 2) AS centered_3\nFROM txns\nORDER BY day;",
  // Rapid fire: LAG and day-over-day change, on the same days.
  lag: "SELECT day, amount,\n  LAG(amount) OVER (ORDER BY day) AS prev_day,\n  amount - LAG(amount) OVER (ORDER BY day) AS change\nFROM txns\nORDER BY day;",
  // Rapid fire: bucketing by week (2024-01-01 is a Monday).
  weeks:
    "SELECT DATE_TRUNC('week', day) AS week,\n  COUNT(*) AS days,\n  SUM(amount) AS revenue\nFROM txns\nGROUP BY 1\nORDER BY 1;",
});

// 11. Latest row per key: the video's own profile updates.
const EVENTS = `CREATE TABLE events (user_id INTEGER, plan TEXT, updated_at DATE);
INSERT INTO events VALUES
  (1, 'free', '2024-01-03'), (1, 'pro', '2024-02-10'), (1, 'team', '2024-03-05'),
  (2, 'free', '2024-01-20'), (2, 'pro', '2024-02-28'),
  (3, 'free', '2024-02-14');`;
results.figures.latest = await figure(EVENTS, {
  ranked:
    "SELECT *,\n  ROW_NUMBER() OVER (PARTITION BY user_id\n                     ORDER BY updated_at DESC) AS rn\nFROM events\nORDER BY user_id, rn;",
  kept: "WITH ranked AS (\n  SELECT *,\n    ROW_NUMBER() OVER (PARTITION BY user_id\n                       ORDER BY updated_at DESC) AS rn\n  FROM events\n)\nSELECT * FROM ranked WHERE rn = 1\nORDER BY user_id;",
});

// 12. A date spine: the page's block, and the same days without it. The
//    generated days are cast to DATE, so they print as dates rather than as
//    midnight timestamps; the join and the result are otherwise the page's.
results.figures.spine = await figure(PAGE_SPINE_SALES, {
  without: "SELECT day, amount\nFROM sales\nWHERE day <= DATE '2024-03-05'\nORDER BY day;",
  spine:
    "WITH spine AS (\n  SELECT unnest(generate_series(DATE '2024-03-01',\n    DATE '2024-03-05', INTERVAL 1 DAY))::DATE AS day\n)\nSELECT s.day, COALESCE(x.amount, 0) AS amount\nFROM spine s\nLEFT JOIN sales x ON x.day = s.day\nORDER BY s.day;",
});

// Rapid fire.
results.figures.ntile = await figure(PAGE_CUSTOMERS, {
  quartiles:
    "SELECT name, spend,\n  NTILE(4) OVER (ORDER BY spend DESC) AS spend_quartile\nFROM customers\nORDER BY spend DESC;",
  quartileSizes:
    "SELECT spend_quartile, COUNT(*) AS customers FROM (\n  SELECT NTILE(4) OVER (ORDER BY spend DESC) AS spend_quartile FROM customers\n) GROUP BY 1 ORDER BY 1;",
  fifthSizes:
    "SELECT bucket, COUNT(*) AS customers FROM (\n  SELECT NTILE(5) OVER (ORDER BY spend DESC) AS bucket FROM customers\n) GROUP BY 1 ORDER BY 1;",
  // PERCENT_RANK and CUME_DIST on the page's first five customers.
  standing:
    "SELECT name, spend,\n  PERCENT_RANK() OVER (ORDER BY spend) AS pct_rank,\n  CUME_DIST()    OVER (ORDER BY spend) AS cume_dist\nFROM customers\nWHERE name IN ('Ava', 'Ben', 'Cy', 'Di', 'Eve')\nORDER BY spend;",
});
results.figures.recursive = await figure(PAGE_EMP, {
  org: "WITH RECURSIVE org AS (\n  SELECT id, name, manager_id, 1 AS depth\n  FROM emp\n  WHERE manager_id IS NULL\n  UNION ALL\n  SELECT e.id, e.name, e.manager_id, o.depth + 1\n  FROM emp e\n  JOIN org o ON e.manager_id = o.id\n)\nSELECT * FROM org ORDER BY depth, id;",
  levels:
    "WITH RECURSIVE org AS (\n  SELECT id, 1 AS depth FROM emp WHERE manager_id IS NULL\n  UNION ALL\n  SELECT e.id, o.depth + 1 FROM emp e JOIN org o ON e.manager_id = o.id\n)\nSELECT depth, COUNT(*) AS people FROM org GROUP BY depth ORDER BY depth;",
});
results.figures.pivot = await figure(PAGE_PIVOT_SALES, {
  pivot:
    "SELECT\n  region,\n  SUM(CASE WHEN quarter = 'Q1' THEN amount ELSE 0 END) AS q1,\n  SUM(CASE WHEN quarter = 'Q2' THEN amount ELSE 0 END) AS q2\nFROM sales\nGROUP BY region\nORDER BY region;",
  unpivot:
    "WITH wide AS (\n  SELECT region,\n    SUM(CASE WHEN quarter = 'Q1' THEN amount ELSE 0 END) AS q1,\n    SUM(CASE WHEN quarter = 'Q2' THEN amount ELSE 0 END) AS q2\n  FROM sales GROUP BY region\n)\nSELECT region, 'q1' AS quarter, q1 AS amount FROM wide\nUNION ALL\nSELECT region, 'q2' AS quarter, q2 AS amount FROM wide\nORDER BY region, quarter;",
});

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps)
    .filter(([, s]) => !s.ok)
    .map(([id, s]) => `${f}.${id}: ${s.error}`),
);
console.log(`wrote ${fileURLToPath(out)} (${results.figures.window.version})`);
console.log(failed.length ? `errors, as expected where a figure shows one:\n  ${failed.join("\n  ")}` : "no errors");
