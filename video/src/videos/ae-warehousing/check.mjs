// Measures every number the ae-warehousing video shows, and writes what came
// back to results.json, which data.ts reads. From the repo root, where
// @duckdb/duckdb-wasm is installed:
//
//   node video/src/videos/ae-warehousing/check.mjs
//
// No vendor warehouse runs here, and no number below is Snowflake's,
// BigQuery's or Redshift's. Two kinds of number:
//
// 1. Measured in DuckDB-Wasm 1.32.0 (DuckDB v1.4.3), on files: what a query
//    reads from a Parquet file, how big a column is, how many rows an update
//    touches. The table is Data Engineer Part 9's (de-warehousing/check.mjs):
//    a million rows shaped like that page's `sales` table, 2024 in date
//    order, the other columns drawn from a seeded generator. Its setup is
//    copied here verbatim, and the run fails unless the table it builds has
//    the same checksum and the same file sizes as de-warehousing's
//    results.json, so the two videos measure one table. What that video
//    already measured (the partitions, the row groups, the small files) is
//    imported by data.ts from its results.json, not run again.
//    What a query reads is DuckDB's own file statistics, as de-warehousing
//    measures it: each file is registered again as a buffer with statistics
//    on, the query runs over that copy, and the bytes read are summed.
//    No timing is recorded: a scan inside WebAssembly, from memory, says
//    nothing about a warehouse.
//
// 2. Models, from stated assumptions, said aloud as models: the page's own
//    "200 columns, 3 selected", the page's partition-pruning chart (read
//    from charts/partition-pruning-scan.mjs, so a change there fails here),
//    and an hour of a compute cluster's time. No prices: the page gives
//    none, and neither does this video.
/* global console, process, URL */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const require = createRequire(join(root, "package.json"));
const duckdb = require("@duckdb/duckdb-wasm");
const { default: Worker } = await import(pathToFileURL(require.resolve("web-worker")).href);
const dist = join(dirname(require.resolve("@duckdb/duckdb-wasm")), "..", "dist");
const bundle = await duckdb.selectBundle({
  mvp: { mainModule: join(dist, "duckdb-mvp.wasm"), mainWorker: join(dist, "duckdb-node-mvp.worker.cjs") },
  eh: { mainModule: join(dist, "duckdb-eh.wasm"), mainWorker: join(dist, "duckdb-node-eh.worker.cjs") },
});
// DuckDB-Wasm's Node bindings write COPY ... TO files relative to the working
// directory, so the run works in a temporary directory and deletes it.
const work = mkdtempSync(join(tmpdir(), "ae-warehousing-"));
process.chdir(work);
const worker = new Worker(pathToFileURL(bundle.mainWorker).href, { type: "module" });
const db = new duckdb.AsyncDuckDB({ log: () => {} }, worker);
await db.instantiate(bundle.mainModule);
const conn = await db.connect();

/** A value as a SQL client prints it. */
function shown(value, type) {
  if (value === null || value === undefined) return null;
  const t = String(type);
  if (t.startsWith("Decimal")) {
    const scale = type.scale ?? 0;
    const raw = String(value);
    const digits = raw.replace("-", "").padStart(scale + 1, "0");
    const sign = raw.startsWith("-") ? "-" : "";
    return scale ? `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}` : `${sign}${digits}`;
  }
  if (t.startsWith("Date")) return new Date(Number(value)).toISOString().slice(0, 10);
  if (typeof value === "bigint") return Number(value);
  return value?.valueOf?.() ?? value;
}

/** Runs a statement: its SQL, columns and rows as printed. */
async function run(sql) {
  const table = await conn.query(sql);
  const fields = table.schema.fields;
  const rows = table.toArray().map((r) => {
    const obj = r.toJSON();
    return fields.map((f) => shown(obj[f.name], f.type));
  });
  return { sql, columns: fields.map((f) => f.name), rows };
}
const one = async (sql) => (await run(sql)).rows[0][0];

/** A file DuckDB wrote, as bytes. */
const bytesOf = async (name) => (await db.copyFileToBuffer(name)).length;

/**
 * What a query reads, as de-warehousing measures it: the file is registered
 * again under `<alias>/<name>` with file statistics on, `query(alias)` runs
 * over that copy, and the bytes DuckDB read from it (cold, read-ahead and
 * cached) are summed. Only the row count of the result is kept: a SELECT *
 * returns a million rows.
 */
let aliases = 0;
async function measureRead(file, query) {
  const alias = `measured${++aliases}`;
  const name = `${alias}/${file}`;
  await db.registerFileBuffer(name, await db.copyFileToBuffer(file));
  await db.collectFileStatistics(name, true);
  const result = await conn.query(query(`'${name}'`));
  const s = await db.exportFileStatistics(name);
  const read = s.totalFileReadsCold + s.totalFileReadsAhead + s.totalFileReadsCached;
  await db.collectFileStatistics(name, false);
  await db.dropFile(name);
  return { sql: query(`'${file}'`), read, total: await bytesOf(file), resultRows: result.numRows };
}

const ROWS = 1_000_000;
const SEED = 0.42;
const R = { engine: { duckdbWasm: "1.32.0", duckdb: await one("SELECT version()") } };

// ── The table: de-warehousing's, verbatim ───────────────────────────────────

const SETUP = `CREATE TABLE sales AS
SELECT
  (i + 1)::INTEGER                                  AS sale_id,
  DATE '2024-01-01' + (i * 366 // ${ROWS})::INTEGER  AS sale_date,
  ['North', 'South', 'East', 'West'][1 + floor(random() * 4)::INTEGER]               AS region,
  ['Electronics', 'Books', 'Home', 'Garden', 'Toys'][1 + floor(random() * 5)::INTEGER] AS category,
  (1 + floor(random() * 5))::INTEGER                 AS units,
  round(5 + random() * 495, 2)::DECIMAL(10,2)        AS amount
FROM range(${ROWS}) t(i)
ORDER BY i;`;
await run(`SELECT setseed(${SEED})`);
await run(SETUP);
await run("COPY sales TO 'sales.parquet' (FORMAT parquet)");

const de = JSON.parse(readFileSync(join(here, "../de-warehousing/results.json"), "utf8"));
R.table = {
  seed: SEED,
  rows: await one("SELECT count(*) FROM sales"),
  checksum: await one("SELECT sum(amount)::VARCHAR FROM sales"),
  parquet: await bytesOf("sales.parquet"),
  columns: (await run("SELECT * FROM sales LIMIT 0")).columns,
};
if (R.table.checksum !== de.table.checksum || R.table.parquet !== de.files.parquet) {
  throw new Error(
    `not de-warehousing's table: checksum ${R.table.checksum} (want ${de.table.checksum}), parquet ${R.table.parquet} (want ${de.files.parquet})`,
  );
}

// ── SELECT * against the columns a query needs ─────────────────────────────

// Each column's compressed bytes in the file, from its own metadata.
R.columnBytes = Object.fromEntries(
  (
    await run(
      "SELECT path_in_schema AS col, sum(total_compressed_size) AS bytes\nFROM parquet_metadata('sales.parquet')\nGROUP BY col",
    )
  ).rows.map(([c, b]) => [c, Number(b)]),
);
R.select = {
  star: await measureRead("sales.parquet", (f) => `SELECT *\nFROM ${f};`),
  // Two columns a dashboard tile needs: revenue by region.
  regionAmount: await measureRead("sales.parquet", (f) => `SELECT region, SUM(amount) AS revenue\nFROM ${f}\nGROUP BY region;`),
  // Two narrow columns: units by region.
  regionUnits: await measureRead("sales.parquet", (f) => `SELECT region, SUM(units) AS units\nFROM ${f}\nGROUP BY region;`),
};

// The page's model: "On a 200-column table, selecting 3 columns reads roughly
// 3/200 of the data", every column taken as the same width.
R.selectModel = { columns: 200, selected: 3, share: 3 / 200 };

// ── One big table against a star ────────────────────────────────────────────

// The same million rows two ways. The star keeps a category key on the fact
// and the names in a five-row dimension; the one big table carries each
// name on every row, as the sales table already does, plus a second copied
// attribute (each category's department) to show what one more costs.
await run(`CREATE TABLE dim_category AS SELECT * FROM (VALUES
  (1, 'Electronics', 'Tech'), (2, 'Books', 'Media'), (3, 'Home', 'Living'),
  (4, 'Garden', 'Living'), (5, 'Toys', 'Kids')
) AS t(category_id, category, department)`);
await run(`CREATE TABLE fct_sales AS
SELECT s.sale_id, s.sale_date, s.region, d.category_id, s.units, s.amount
FROM sales s JOIN dim_category d USING (category)
ORDER BY s.sale_id`);
await run(`CREATE TABLE obt_sales AS
SELECT s.*, d.department
FROM sales s JOIN dim_category d USING (category)
ORDER BY s.sale_id`);
await run("COPY fct_sales TO 'fct_sales.parquet' (FORMAT parquet)");
await run("COPY obt_sales TO 'obt_sales.parquet' (FORMAT parquet)");
const colBytes = async (file, col) =>
  Number(await one(`SELECT sum(total_compressed_size) FROM parquet_metadata('${file}') WHERE path_in_schema = '${col}'`));
const STAR_QUERY =
  "SELECT d.category, SUM(f.amount) AS revenue\nFROM fct_sales f\nJOIN dim_category d ON d.category_id = f.category_id\nGROUP BY d.category\nORDER BY revenue DESC;";
const OBT_QUERY = "SELECT category, SUM(amount) AS revenue\nFROM obt_sales\nGROUP BY category\nORDER BY revenue DESC;";
R.obt = {
  dimension: await run("SELECT * FROM dim_category ORDER BY category_id;"),
  starFile: await bytesOf("fct_sales.parquet"),
  obtFile: await bytesOf("obt_sales.parquet"),
  keyBytes: await colBytes("fct_sales.parquet", "category_id"),
  nameBytes: await colBytes("obt_sales.parquet", "category"),
  departmentBytes: await colBytes("obt_sales.parquet", "department"),
  starQuery: await run(STAR_QUERY),
  obtQuery: await run(OBT_QUERY),
};
if (JSON.stringify(R.obt.starQuery.rows) !== JSON.stringify(R.obt.obtQuery.rows)) {
  throw new Error("the star and the one big table disagree on revenue by category");
}
// An attribute changes: 'Home' is renamed. The star updates one dimension
// row; the one big table updates every sale in the category, and they sit
// in every row group of the file (rows were written in sale_id order,
// 122,880 to a group).
// The new name is one no other category is part of ('Home & Garden' sat
// beside 'Garden' and read as a merge).
const NEW_NAME = "Home & Kitchen";
const RENAME_STAR = `UPDATE dim_category\nSET category = '${NEW_NAME}'\nWHERE category = 'Home';`;
const RENAME_OBT = `UPDATE obt_sales\nSET category = '${NEW_NAME}'\nWHERE category = 'Home';`;
const rowGroupRows = Number(await one("SELECT max(row_group_num_rows) FROM parquet_metadata('obt_sales.parquet')"));
R.rename = {
  star: { sql: RENAME_STAR, rows: Number(await one(RENAME_STAR)) },
  obt: { sql: RENAME_OBT, rows: Number(await one(RENAME_OBT)) },
  newName: NEW_NAME,
  rowGroupRows,
  rowGroups: Number(await one("SELECT count(DISTINCT row_group_id) FROM parquet_metadata('obt_sales.parquet')")),
  rowGroupsTouched: Number(
    await one(`SELECT count(DISTINCT (sale_id - 1) // ${rowGroupRows}) FROM obt_sales WHERE category = '${NEW_NAME}'`),
  ),
};

await conn.close();
await db.terminate();
await worker.terminate();
process.chdir(here);
rmSync(work, { recursive: true, force: true });

// ── Models ──────────────────────────────────────────────────────────────────

// The page's partition-pruning chart, its constants read from its source.
const chart = readFileSync(join(root, "charts/partition-pruning-scan.mjs"), "utf8");
const constant = (name) => {
  const m = chart.match(new RegExp(`const ${name} = ([\\d.]+);`));
  if (!m) throw new Error(`charts/partition-pruning-scan.mjs has no ${name}`);
  return Number(m[1]);
};
const days = constant("DAYS");
const gbPerDay = constant("GB_PER_DAY");
const typical = constant("TYPICAL");
R.pruneModel = {
  source: "charts/partition-pruning-scan.mjs",
  days,
  gbPerDay,
  typicalDays: typical,
  fullGb: days * gbPerDay,
  typicalGb: typical * gbPerDay,
  ratio: (days * gbPerDay) / (typical * gbPerDay),
};

// An hour of a compute cluster billed for the time it runs (the page: credits
// per second while running, so auto-suspend saves money). The assumption is
// the video's own, said aloud: the dashboard's queries keep it busy for two
// minutes in the hour. Left running, the hour is billed; suspended when idle,
// the busy minutes are, plus the wait before each suspend. The page gives no
// wait; one minute is drawn, the shortest timeout in common use (Snowflake's
// default AUTO_SUSPEND is ten minutes, and it bills at least a minute each
// time a warehouse resumes), so the picture understates the wait if anything.
R.computeModel = { busyMinutes: 2, hourMinutes: 60, ratio: 60 / 2, suspendWaitMinutes: 1 };

// ── Checks: the narration says these, so a change must fail here ───────────

const expect = (what, ok) => {
  if (!ok) throw new Error(what);
};
expect("SELECT * reads the whole file", R.select.star.read >= R.table.parquet);
expect("units by region reads under 800 kB", R.select.regionUnits.read < 800_000);
expect("revenue by region reads about 4.6 MB", Math.round(R.select.regionAmount.read / 1e5) === 46);
expect("amount is nearly half the file", R.columnBytes.amount / R.table.parquet > 0.44 && R.columnBytes.amount / R.table.parquet < 0.5);
expect("the copied name costs what the key does (within 1%)", Math.abs(R.obt.nameBytes / R.obt.keyBytes - 1) < 0.01);
expect("about 380 kB a column", Math.round(R.obt.nameBytes / 1e4) === 38);
expect("the rename: one dimension row", R.rename.star.rows === 1);
expect("the rename: almost 200,000 rows", R.rename.obt.rows > 195_000 && R.rename.obt.rows < 200_000);
expect("the rename touches every row group", R.rename.rowGroupsTouched === R.rename.rowGroups);
expect("the pruning model: about fifty times", Math.round(R.pruneModel.ratio) === 52);

const outFile = new URL("./results.json", import.meta.url);
writeFileSync(outFile, `${JSON.stringify(R, null, 2)}\n`);
const mb = (b) => `${(b / 1e6).toFixed(2)} MB`;
console.log(`wrote ${fileURLToPath(outFile)} (${R.engine.duckdb}, checksum ${R.table.checksum}, de-warehousing's table)`);
console.log(`column bytes: ${JSON.stringify(R.columnBytes)}`);
console.log(
  `SELECT * read ${mb(R.select.star.read)} of ${mb(R.select.star.total)}; region+amount ${mb(R.select.regionAmount.read)}; region+units ${mb(R.select.regionUnits.read)}`,
);
console.log(
  `obt: star file ${mb(R.obt.starFile)}, obt file ${mb(R.obt.obtFile)}, key ${R.obt.keyBytes} B, name ${R.obt.nameBytes} B, department ${R.obt.departmentBytes} B`,
);
console.log(`rename: star ${R.rename.star.rows} row, obt ${R.rename.obt.rows} rows in ${R.rename.rowGroupsTouched}/${R.rename.rowGroups} row groups`);
console.log(`prune model: ${R.pruneModel.typicalGb} GB of ${R.pruneModel.fullGb} GB, ${R.pruneModel.ratio.toFixed(1)}x`);
