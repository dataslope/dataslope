// Runs every statement the da-ai-assisted video shows in DuckDB, the engine
// the Data Analyst AI-assisted analysis page's blocks run in the reader's
// browser, and writes what came back to results.json, which data.ts reads.
// From the repo root, where @duckdb/duckdb-wasm (pinned to the version
// runtime/duckdb.ts loads) is installed:
//
//   node video/src/videos/da-ai-assisted/check.mjs
//
// Each figure runs in a fresh database built by its own setup, as the page
// gives every block its own engine. Values are printed the way a SQL client
// prints them: a DECIMAL at its scale ("405.50"), a TIMESTAMP as
// "2026-01-31 00:00:00", a NULL as null. The orders table and the assistant's
// query are the page's own (content/interview/data-analyst/
// ai-assisted-analysis.mdx); the daily conversion table is the video's own.
/* global console, URL */
import { readFileSync, writeFileSync } from "node:fs";
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

// ── The page's table ────────────────────────────────────────────────────────

/** The page's date-boundary block: nine orders around January 2026. */
const PAGE_ORDERS = `CREATE TABLE orders AS SELECT * FROM (VALUES
  (1, TIMESTAMP '2025-12-31 23:59:00', 75.00, 'completed'),
  (2, TIMESTAMP '2026-01-01 00:00:00', 120.00, 'completed'),
  (3, TIMESTAMP '2026-01-12 19:45:00', 95.50, 'completed'),
  (4, TIMESTAMP '2026-01-18 11:30:00', 140.00, 'completed'),
  (5, TIMESTAMP '2026-01-22 16:10:00', 33.25, 'cancelled'),
  (6, TIMESTAMP '2026-01-31 00:00:00', 50.00, 'completed'),
  (7, TIMESTAMP '2026-01-31 09:15:00', 310.00, 'completed'),
  (8, TIMESTAMP '2026-01-31 18:40:00', 125.00, 'completed'),
  (9, TIMESTAMP '2026-02-01 00:00:00', 99.00, 'completed')
) AS t(order_id, order_ts, amount, status);`;

const results = { figures: {} };

// The assistant's January total against the half-open one: the page's query,
// verbatim, then each order with which filter keeps it.
results.figures.boundary = await figure(PAGE_ORDERS, {
  table: "SELECT order_id, order_ts, amount, status FROM orders ORDER BY order_id;",
  page: `SELECT
  SUM(amount) FILTER (
    WHERE order_ts BETWEEN '2026-01-01' AND '2026-01-31'
  ) AS assistant_total,
  SUM(amount) FILTER (
    WHERE order_ts >= '2026-01-01' AND order_ts < '2026-02-01'
  ) AS half_open_total
FROM orders
WHERE status = 'completed';`,
  kept: `SELECT order_id, order_ts, amount, status,
  order_ts BETWEEN '2026-01-01' AND '2026-01-31' AS assistant,
  order_ts >= '2026-01-01' AND order_ts < '2026-02-01' AS half_open
FROM orders
ORDER BY order_id;`,
  // The assistant's query on its own, as the page's concept check describes it
  // ("reports January revenue using WHERE order_ts BETWEEN '2026-01-01' AND
  // '2026-01-31'"), and the same with the page's half-open range.
  assistant: `SELECT SUM(amount) AS january_revenue
FROM orders
WHERE status = 'completed'
  AND order_ts BETWEEN '2026-01-01' AND '2026-01-31';`,
  halfOpen: `SELECT SUM(amount) AS january_revenue
FROM orders
WHERE status = 'completed'
  AND order_ts >= '2026-01-01' AND order_ts < '2026-02-01';`,
  // How much of January the assistant's total misses.
  missed: `SELECT ROUND(100 * (1 - a / h), 1) AS missed_pct FROM (
  SELECT
    SUM(amount) FILTER (WHERE order_ts BETWEEN '2026-01-01' AND '2026-01-31') AS a,
    SUM(amount) FILTER (WHERE order_ts >= '2026-01-01' AND order_ts < '2026-02-01') AS h
  FROM orders WHERE status = 'completed'
);`,
  // The string '2026-01-31' as the timestamp BETWEEN compares against.
  cutoff: "SELECT CAST('2026-01-31' AS TIMESTAMP) AS upper_bound;",
});

// Averaging ratios: the video's own two days, one tiny and one large.
const DAYS = `CREATE TABLE daily (day DATE, sessions INTEGER, conversions INTEGER);
INSERT INTO daily VALUES ('2026-01-05', 10, 5), ('2026-01-06', 1000, 20);`;
results.figures.ratios = await figure(DAYS, {
  table: "SELECT day, sessions, conversions,\n  ROUND(100.0 * conversions / sessions, 1) AS rate_pct\nFROM daily ORDER BY day;",
  averaged: "SELECT ROUND(AVG(100.0 * conversions / sessions), 1) AS avg_of_rates\nFROM daily;",
  pooled: "SELECT ROUND(100.0 * SUM(conversions) / SUM(sessions), 1) AS overall_rate\nFROM daily;",
});

// The closing line's count: the track's question bank, counted rather than
// copied from its description.
const BANK = new URL("../../../../content/interview/data-analyst/multiple-choice-questions.mdx", import.meta.url);
results.bank = (readFileSync(BANK, "utf8").match(/<MultipleChoice\b/g) ?? []).length;

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps)
    .filter(([, s]) => !s.ok)
    .map(([id, s]) => `${f}.${id}: ${s.error}`),
);
console.log(`wrote ${fileURLToPath(out)} (${results.figures.boundary.version}; question bank: ${results.bank})`);
console.log(failed.length ? `errors:\n  ${failed.join("\n  ")}` : "no errors");
