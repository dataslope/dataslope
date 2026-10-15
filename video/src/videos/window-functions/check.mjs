// Runs every statement this video prints in PGlite (Postgres compiled to WASM)
// and writes what Postgres returned, every value as Postgres's own text, to
// results.json beside this file. data.ts reads the tables from there, so a
// cell on screen is a cell Postgres printed.
//
//   node src/videos/window-functions/check.mjs        (from video/)
//
// It also checks each claim the narration makes about those results, and
// exits non-zero if one fails.
/* global console */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "../../../../node_modules/@electric-sql/pglite/dist/index.js";
import { QUERIES, SETUP } from "./queries.ts";

const here = dirname(fileURLToPath(import.meta.url));

// Keep every value as the text Postgres sent: "2025-03-01", "33.8", "355".
const raw = (v) => v;
const parsers = Object.fromEntries([16, 20, 21, 23, 25, 700, 701, 1043, 1082, 1700].map((oid) => [oid, raw]));

const db = new PGlite();
const run = async (sql) => {
  const r = await db.query(sql, [], { rowMode: "array", parsers });
  return { columns: r.fields.map((f) => f.name), rows: r.rows };
};

await db.exec(SETUP);
const [[version]] = (await run("SELECT version()")).rows;

const results = {};
for (const [name, lines] of Object.entries(QUERIES)) {
  results[name] = { sql: lines.join("\n"), ...(await run(lines.join("\n"))) };
}

// ── The six rows are the lesson's own ──────────────────────────────────────
// content/courses/intro-sql-postgres/running-totals.mdx, "A running total per
// region": the full 24-row table, filtered to North and South, days 1 to 3.
await db.exec(`CREATE TABLE regional_sales (
  id     INTEGER PRIMARY KEY,
  region TEXT,
  day    DATE,
  amount NUMERIC
);
INSERT INTO regional_sales (id, region, day, amount) VALUES
  (1,'North','2025-03-01',120), (2,'North','2025-03-02',95),
  (3,'North','2025-03-03',140), (4,'North','2025-03-04',60),
  (5,'North','2025-03-05',210), (6,'North','2025-03-06',85),
  (7,'South','2025-03-01',175), (8,'South','2025-03-02',130),
  (9,'South','2025-03-03',90), (10,'South','2025-03-04',45),
  (11,'South','2025-03-05',160), (12,'South','2025-03-06',115),
  (13,'East','2025-03-01',200), (14,'East','2025-03-02',70),
  (15,'East','2025-03-03',155), (16,'East','2025-03-04',105),
  (17,'East','2025-03-05',135), (18,'East','2025-03-06',80),
  (19,'West','2025-03-01',190), (20,'West','2025-03-02',125),
  (21,'West','2025-03-03',100), (22,'West','2025-03-04',55),
  (23,'West','2025-03-05',145), (24,'West','2025-03-06',165);`);
const lesson = await run(`SELECT id, region, day, amount FROM regional_sales
  WHERE region IN ('North', 'South') AND day <= '2025-03-03' ORDER BY id`);
const ours = await run("SELECT id, region, day, amount FROM sales ORDER BY id");
assert.deepEqual(ours.rows, lesson.rows, "the six rows are the lesson's");

// ── What the narration says ────────────────────────────────────────────────
const { rows, group, over, payoff } = results;
// "six sales, from two regions, over three days"
assert.equal(rows.rows.length, 6);
assert.equal(new Set(rows.rows.map((r) => r[0])).size, 2);
assert.equal(new Set(rows.rows.map((r) => r[1])).size, 3);
// "Six rows go in, and two come out."
assert.equal(group.rows.length, 2);
// The window keeps every row, and its total is GROUP BY's total, on each one.
assert.equal(over.rows.length, 6);
const totalOf = Object.fromEntries(group.rows);
for (const [region, , , regionTotal] of over.rows) assert.equal(regionTotal, totalOf[region]);
// A row's own columns are untouched by either window.
assert.deepEqual(
  payoff.rows.map((r) => r.slice(0, 3)),
  rows.rows,
);
// "The first North sale is about a third of its region."
assert.deepEqual(payoff.rows[0].slice(0, 4), ["North", "2025-03-01", "120", "33.8"]);
// Each region's shares add up to 100.0.
for (const region of Object.keys(totalOf)) {
  const sum = payoff.rows.filter((r) => r[0] === region).reduce((s, r) => s + Number(r[3]), 0);
  assert.equal(sum.toFixed(1), "100.0", `${region} shares`);
}
// "Each sum stops at the current row": no two rows of a region share a day,
// so the default RANGE frame is the same as ROWS up to the current row.
const ties = await run("SELECT region, day FROM sales GROUP BY region, day HAVING COUNT(*) > 1");
assert.equal(ties.rows.length, 0);
const byRows = await run(`SELECT SUM(amount) OVER (
  PARTITION BY region ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) FROM sales ORDER BY region, day`);
assert.deepEqual(
  byRows.rows.map((r) => r[0]),
  payoff.rows.map((r) => r[4]),
);
// "North climbs to three hundred fifty-five, and South starts over at one
// hundred seventy-five": the running total ends at each region's total and
// restarts at the partition boundary.
assert.deepEqual(
  payoff.rows.map((r) => r[4]),
  ["120", "215", "355", "175", "305", "395"],
);
assert.equal(payoff.rows[2][4], totalOf.North);
assert.equal(payoff.rows[5][4], totalOf.South);

await db.close();

const out = { postgres: version, ...results };
writeFileSync(join(here, "results.json"), `${JSON.stringify(out, null, 2)}\n`);
for (const [name, r] of Object.entries(results)) {
  console.log(`\n${name}  (${r.rows.length} rows)\n  ${r.columns.join(" | ")}`);
  for (const row of r.rows) console.log(`  ${row.join(" | ")}`);
}
console.log(`\n${version}\nAll checks passed; wrote results.json.`);
