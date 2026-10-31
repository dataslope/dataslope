// Runs every statement the de-pipelines video shows or quotes in DuckDB-Wasm,
// the engine the Pipelines page's <SqlCodeBlock dialect="duckdb"> runs in the
// reader's browser, and writes what came back to results.json, which data.ts
// reads. From the repo root, where @duckdb/duckdb-wasm (pinned to the version
// runtime/duckdb.ts loads) is installed:
//
//   node video/src/videos/de-pipelines/check.mjs
//
// The harness is da-sql/check.mjs's: each figure runs in a fresh database
// built by its own setup, and values are printed the way a SQL client prints
// them (a DECIMAL at its scale, a DATE as "2024-06-01", a NULL as null).
//
// Data. The idempotency figure loads the page's own events table (the 24 rows
// of its one runnable block, content/interview/data-engineer/pipelines.mdx)
// through the page's partition-overwrite and ON CONFLICT statements. The
// orders rows in the upsert, CDC and schema figures are the video's own, and
// script.ts says so.
/* global console, process */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
  if (typeof value === "bigint") return Number(value);
  return value?.valueOf?.() ?? value;
}

/** A fresh database: run `setup`, then each step in order, keeping what each
 *  printed (or the error it raised). Steps run one statement each, in the
 *  order given, so a step can change what a later one reads. */
async function figure(setup, steps) {
  const worker = new Worker(pathToFileURL(bundle.mainWorker).href, { type: "module" });
  const db = new duckdb.AsyncDuckDB({ log: () => {} }, worker);
  await db.instantiate(bundle.mainModule);
  const conn = await db.connect();
  for (const stmt of setup.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) await conn.query(stmt);
  const out = {};
  for (const [id, sql] of steps) {
    try {
      const table = await conn.query(sql);
      const fields = table.schema.fields;
      const rows = table.toArray().map((r) => {
        const obj = r.toJSON();
        return fields.map((f) => shown(obj[f.name], f.type));
      });
      out[id] = { sql, ok: true, columns: fields.map((f) => f.name), rows };
    } catch (e) {
      // DuckDB's message is "<Kind> Error: <text>", then more lines.
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

// ── The page's events table (its one <SqlCodeBlock>), as the staging table ──

const PAGE_EVENTS = `(DATE '2024-06-01', 1, 'click'), (DATE '2024-06-01', 1, 'click'),
  (DATE '2024-06-01', 2, 'view'),  (DATE '2024-06-01', 3, 'view'),
  (DATE '2024-06-01', 3, 'click'), (DATE '2024-06-01', 4, 'purchase'),
  (DATE '2024-06-01', 5, 'view'),  (DATE '2024-06-01', 2, 'click'),
  (DATE '2024-06-02', 1, 'purchase'), (DATE '2024-06-02', 3, 'click'),
  (DATE '2024-06-02', 4, 'view'),  (DATE '2024-06-02', 5, 'click'),
  (DATE '2024-06-02', 6, 'view'),  (DATE '2024-06-02', 2, 'purchase'),
  (DATE '2024-06-03', 2, 'click'), (DATE '2024-06-03', 6, 'click'),
  (DATE '2024-06-03', 7, 'view'),  (DATE '2024-06-03', 1, 'view'),
  (DATE '2024-06-04', 3, 'purchase'), (DATE '2024-06-04', 7, 'click'),
  (DATE '2024-06-04', 8, 'view'),  (DATE '2024-06-05', 4, 'click'),
  (DATE '2024-06-05', 8, 'purchase'), (DATE '2024-06-05', 5, 'view')`;

const EVENTS_SETUP = `CREATE TABLE events_stage (event_date DATE, user_id INTEGER, event_type VARCHAR);
INSERT INTO events_stage VALUES
  ${PAGE_EVENTS};
CREATE TABLE events (event_date DATE, user_id INTEGER, event_type VARCHAR);`;

// The statements the video prints, as the page writes them.
const BLIND = "INSERT INTO events\nSELECT * FROM events_stage\nWHERE event_date = '2024-06-01';";
const DELETE_DAY = "DELETE FROM events\nWHERE event_date = '2024-06-01';";
const COUNT_DAY = "SELECT COUNT(*) AS events FROM events WHERE event_date = '2024-06-01'";

const idempotency = await figure(EVENTS_SETUP, [
  // The page's block itself, as it runs on the page (its table holds all 24
  // rows), and how many of them are June 1.
  ["perDay", "SELECT event_date, COUNT(*) AS events FROM events_stage GROUP BY event_date ORDER BY event_date"],
  // A blind INSERT, run, then run again (the retry).
  ["blind1", BLIND],
  ["blindCount1", COUNT_DAY],
  ["blind2", BLIND],
  ["blindCount2", COUNT_DAY],
  ["reset", "DELETE FROM events"],
  // The page's partition overwrite, run, then run again.
  ["over1Delete", DELETE_DAY],
  ["over1Insert", BLIND],
  ["overCount1", COUNT_DAY],
  ["over2Delete", DELETE_DAY],
  ["over2Insert", BLIND],
  ["overCount2", COUNT_DAY],
  // The delete and the insert in one transaction, with the insert failing:
  // the rollback leaves the day as it was, not empty.
  ["txBegin", "BEGIN TRANSACTION"],
  ["txDelete", DELETE_DAY],
  ["txInsertFails", "INSERT INTO events SELECT * FROM events_stage_missing WHERE event_date = '2024-06-01'"],
  ["txRollback", "ROLLBACK"],
  ["txCount", COUNT_DAY],
]);

// The page's upsert, run twice on the video's own three staged orders.
const UPSERT = `INSERT INTO orders (order_id, status, updated_at)
SELECT order_id, status, updated_at
FROM orders_stage
ON CONFLICT (order_id)
DO UPDATE SET
  status     = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at`;
const upsert = await figure(
  `CREATE TABLE orders (order_id INTEGER PRIMARY KEY, status VARCHAR, updated_at TIMESTAMP);
CREATE TABLE orders_stage (order_id INTEGER, status VARCHAR, updated_at TIMESTAMP);
INSERT INTO orders_stage VALUES
  (101, 'paid', TIMESTAMP '2024-06-01 09:10:00'),
  (102, 'shipped', TIMESTAMP '2024-06-01 11:45:00'),
  (103, 'paid', TIMESTAMP '2024-06-01 16:20:00');`,
  [
    ["run1", UPSERT],
    ["count1", "SELECT COUNT(*) AS orders FROM orders"],
    ["run2", UPSERT],
    ["count2", "SELECT COUNT(*) AS orders FROM orders"],
    ["merge", `MERGE INTO orders USING orders_stage AS s ON orders.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET status = s.status, updated_at = s.updated_at
WHEN NOT MATCHED THEN INSERT VALUES (s.order_id, s.status, s.updated_at)`],
    ["count3", "SELECT COUNT(*) AS orders FROM orders"],
  ],
);

// ── CDC: what a poll on updated_at sees, the video's own orders ─────────────

const LAST_RUN = "2024-06-01 00:00:00";
const POLL = `SELECT * FROM orders\nWHERE updated_at > '${LAST_RUN}'\nORDER BY order_id`;
const cdc = await figure(
  `CREATE TABLE orders (order_id INTEGER, status VARCHAR, updated_at TIMESTAMP);
INSERT INTO orders VALUES
  (1, 'paid', TIMESTAMP '2024-05-31 14:02:00'),
  (2, 'paid', TIMESTAMP '2024-05-31 16:40:00'),
  (3, 'paid', TIMESTAMP '2024-05-31 18:15:00');`,
  [
    ["before", "SELECT * FROM orders ORDER BY order_id"],
    // What happens between two polls, in order: order 2 ships, order 4 is
    // placed, order 3 is deleted.
    ["update2", "UPDATE orders SET status = 'shipped', updated_at = TIMESTAMP '2024-06-01 08:15:00' WHERE order_id = 2"],
    ["insert4", "INSERT INTO orders VALUES (4, 'paid', TIMESTAMP '2024-06-01 09:30:00')"],
    ["delete3", "DELETE FROM orders WHERE order_id = 3"],
    ["after", "SELECT * FROM orders ORDER BY order_id"],
    ["poll", POLL],
  ],
);

// ── Schema evolution: three daily Parquet files, written and read back ──────

// In Node, DuckDB-Wasm's COPY ... TO a relative path writes through to the
// real disk in the working directory (probed: an in-memory file buffer
// registered first is not honored), so the three files are written in a
// throwaway directory, removed afterwards. The SQL keeps its short names.
const home = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "de-pipelines-"));
process.chdir(scratch);

const parquet = await figure(
  `COPY (SELECT * FROM (VALUES (1, 'paid', 20.00::DECIMAL(8,2)), (2, 'paid', 35.50::DECIMAL(8,2))) t(order_id, status, amount)) TO 'day1.parquet' (FORMAT parquet);
COPY (SELECT * FROM (VALUES (3, 'paid', 12.00::DECIMAL(8,2), 'SAVE10')) t(order_id, status, amount, coupon)) TO 'day2.parquet' (FORMAT parquet);
COPY (SELECT * FROM (VALUES (4, 'paid', 48.00::DECIMAL(8,2), 'WELCOME')) t(order_id, status, total, coupon)) TO 'day3.parquet' (FORMAT parquet);`,
  [
    ["day1", "DESCRIBE SELECT * FROM 'day1.parquet'"],
    ["day2", "DESCRIBE SELECT * FROM 'day2.parquet'"],
    ["day3", "DESCRIBE SELECT * FROM 'day3.parquet'"],
    // By default the first file's columns win: day 2's coupon is dropped.
    ["plain", "SELECT * FROM read_parquet(\n  ['day1.parquet', 'day2.parquet'])"],
    // The other order fails outright.
    ["plainReversed", "SELECT * FROM read_parquet(['day2.parquet', 'day1.parquet'])"],
    ["byName", "SELECT * FROM read_parquet(\n  ['day1.parquet', 'day2.parquet'],\n  union_by_name = true)"],
    // Day 3 renames amount to total: by name, that is a drop and an add.
    [
      "renamed",
      "SELECT * FROM read_parquet(\n  ['day1.parquet', 'day2.parquet', 'day3.parquet'],\n  union_by_name = true)",
    ],
  ],
);
process.chdir(home);
rmSync(scratch, { recursive: true, force: true });

// ── A source adds a column: SELECT * against a fixed downstream table ────────

const source = await figure(
  `CREATE TABLE orders_raw (order_id INTEGER, status VARCHAR, amount DECIMAL(8,2));
CREATE TABLE orders_clean (order_id INTEGER, status VARCHAR, amount DECIMAL(8,2));
INSERT INTO orders_raw VALUES (1, 'paid', 20.00), (2, 'paid', 35.50);`,
  [
    ["before", "INSERT INTO orders_clean SELECT * FROM orders_raw"],
    ["reset", "DELETE FROM orders_clean"],
    // The source system adds a column.
    ["alter", "ALTER TABLE orders_raw ADD COLUMN coupon VARCHAR"],
    ["newRow", "INSERT INTO orders_raw VALUES (3, 'paid', 12.00, 'SAVE10')"],
    ["raw", "SELECT * FROM orders_raw ORDER BY order_id"],
    ["star", "INSERT INTO orders_clean\nSELECT * FROM orders_raw;"],
    ["named", "INSERT INTO orders_clean\nSELECT order_id, status, amount\nFROM orders_raw;"],
    ["clean", "SELECT * FROM orders_clean ORDER BY order_id"],
  ],
);

const results = { idempotency, upsert, cdc, parquet, source };
const versions = [...new Set(Object.values(results).map((r) => r.version))];
const path = join(here, "results.json");
writeFileSync(path, `${JSON.stringify({ duckdb: versions, ...results }, null, 2)}\n`);

// What the narration says, checked against what ran.
const v = (fig, id) => results[fig].steps[id];
const one = (fig, id) => v(fig, id).rows[0][0];
const checks = [
  ["June 1 holds 8 of the page's 24 events", v("idempotency", "perDay").rows[0][1] === 8],
  ["blind insert: 8, then 16", one("idempotency", "blindCount1") === 8 && one("idempotency", "blindCount2") === 16],
  ["overwrite: 8, then 8", one("idempotency", "overCount1") === 8 && one("idempotency", "overCount2") === 8],
  ["a failed insert rolls the delete back", !v("idempotency", "txInsertFails").ok && one("idempotency", "txCount") === 8],
  ["upsert twice, then MERGE: 3 orders", [1, 2, 3].every((k) => one("upsert", `count${k}`) === 3)],
  ["the poll finds orders 2 and 4", JSON.stringify(v("cdc", "poll").rows.map((r) => r[0])) === "[2,4]"],
  ["a plain read drops coupon", !v("parquet", "plain").columns.includes("coupon")],
  ["the reversed read fails", !v("parquet", "plainReversed").ok],
  ["union by name keeps coupon", v("parquet", "byName").columns.includes("coupon")],
  ["the rename reads as two columns", ["amount", "total"].every((c) => v("parquet", "renamed").columns.includes(c))],
  ["SELECT * fails after the new column", !v("source", "star").ok],
  ["named columns load 3 rows", v("source", "clean").rows.length === 3],
];
for (const [what, ok] of checks) console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
console.log(`DuckDB ${versions.join(", ")}; wrote ${path}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
