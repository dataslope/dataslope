// Measures every number the de-warehousing video shows, in DuckDB-Wasm 1.32.0
// (DuckDB v1.4.3), the engine the Data warehousing page's
// <SqlCodeBlock dialect="duckdb"> blocks run in the reader's browser, and
// writes what came back to results.json, which data.ts reads. From the repo
// root, where @duckdb/duckdb-wasm is installed:
//
//   node video/src/videos/de-warehousing/check.mjs
//
// DuckDB-Wasm's Node bindings write `COPY ... TO 'x.parquet'` and `'x.csv'`
// to the real disk, relative to the working directory, so the run works in a
// temporary directory of its own and deletes it at the end. Every size below
// is the length of a file DuckDB wrote (`copyFileToBuffer`). What a query
// reads is measured, not inferred: each file is registered again as a buffer
// with file statistics switched on (`collectFileStatistics`), the query runs
// over that copy, and `exportFileStatistics` reports the bytes DuckDB read
// from it. The plan lines (`Projections:`, `Scanning Files: 1/12`) are
// DuckDB's own EXPLAIN ANALYZE output.
//
// The table is the video's own, labelled as such on screen and in script.ts:
// a million rows shaped like the page's `sales` table (its six columns and
// types: sale_id, sale_date, region, category, units, amount), the year 2024
// in date order, with region, category, units and amount drawn from a seeded
// generator (setseed), so a rerun writes the same bytes. The page's own query
// (revenue and units by category) runs on it as the page writes it.
//
// No timing is recorded: a scan inside WebAssembly, from memory, says nothing
// about object storage. File counts, rows, bytes and plans are what it shows.
/* global console, process, URL */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
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
const work = mkdtempSync(join(tmpdir(), "de-warehousing-"));
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
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/** A file DuckDB wrote, as bytes. */
const bytesOf = async (name) => (await db.copyFileToBuffer(name)).length;

/**
 * What a query reads. Each written file is registered again as a buffer
 * under `<alias>/<name>` with file statistics on; `query(alias)` runs over
 * those copies, and the bytes DuckDB read from them (cold, read-ahead and
 * cached reads) are summed. The SQL kept is the one shown, over the
 * original names.
 */
let aliases = 0;
async function measureRead(files, query) {
  const alias = `measured${++aliases}`;
  const names = [];
  for (const f of files) {
    const name = `${alias}/${f}`;
    await db.registerFileBuffer(name, await db.copyFileToBuffer(f));
    await db.collectFileStatistics(name, true);
    names.push(name);
  }
  const result = await run(query(alias));
  let read = 0;
  for (const name of names) {
    const s = await db.exportFileStatistics(name);
    read += s.totalFileReadsCold + s.totalFileReadsAhead + s.totalFileReadsCached;
    await db.collectFileStatistics(name, false);
    await db.dropFile(name);
  }
  const total = sum(await Promise.all(files.map(bytesOf)));
  return { sql: query(null), read, total, columns: result.columns, rows: result.rows };
}

/**
 * The scan operator of an EXPLAIN ANALYZE, as DuckDB prints it: the function,
 * the columns it projects, its filters, and the files it scanned and read.
 */
async function scanPlan(sql) {
  const r = await conn.query(`EXPLAIN ANALYZE ${sql.replace(/;$/, "")}`);
  const text = String(r.toArray()[0].toJSON().explain_value);
  const box = text.slice(text.lastIndexOf("TABLE_SCAN"));
  const lines = box
    .split("\n")
    .map((l) => l.replace(/[│┌┐└┘─┬┴]/g, "").trim())
    .filter((l, i, all) => l !== "" || all[i - 1] !== "");
  const section = (title) => {
    const i = lines.indexOf(title);
    if (i < 0) return null;
    const out = [];
    for (let k = i + 1; k < lines.length && lines[k] !== ""; k++) out.push(lines[k]);
    return out;
  };
  const joined = lines.join(" ");
  return {
    sql,
    function: section("Function:")?.[0] ?? null,
    projections: section("Projections:"),
    filters: section("Filters:")?.join("") ?? null,
    fileFilters: section("File Filters:")?.join("") ?? null,
    scanning: joined.match(/Scanning Files:\s*([\d/]+)/)?.[1] ?? null,
    filesRead: Number(joined.match(/Total Files Read:\s*(\d+)/)?.[1]),
  };
}

const ROWS = 1_000_000;
const SEED = 0.42;
const R = { engine: { duckdbWasm: "1.32.0", duckdb: await one("SELECT version()") } };

// ── The table: the page's six columns, a million rows of 2024 ───────────────

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
const COLS = ["sale_id", "sale_date", "region", "category", "units", "amount"];
R.table = {
  seed: SEED,
  setup: SETUP,
  rows: await one("SELECT count(*) FROM sales"),
  days: await one("SELECT count(DISTINCT sale_date) FROM sales"),
  first: await one("SELECT min(sale_date)::VARCHAR FROM sales"),
  last: await one("SELECT max(sale_date)::VARCHAR FROM sales"),
  sample: await run("SELECT * FROM sales ORDER BY sale_id LIMIT 4"),
  /** The four regions in the order they first appear, for the dictionary drawn. */
  regions: (await run("SELECT region FROM sales GROUP BY region ORDER BY min(sale_id)")).rows.map((r) => r[0]),
  distinct: (await run(`SELECT ${COLS.map((c) => `count(DISTINCT ${c}) AS ${c}`).join(", ")} FROM sales`)).rows[0],
  /** A fingerprint, so a rerun that drew different numbers shows in the diff. */
  checksum: await one("SELECT sum(amount)::VARCHAR FROM sales"),
};

// ── 3. The same table as CSV and as Parquet, and Parquet's codecs ───────────

await run("COPY sales TO 'sales.csv' (HEADER)");
await run("COPY sales TO 'sales.parquet' (FORMAT parquet)");
await run("COPY sales TO 'sales_zstd.parquet' (FORMAT parquet, COMPRESSION zstd)");
await run("COPY sales TO 'sales_raw.parquet' (FORMAT parquet, COMPRESSION uncompressed)");
R.files = {
  csv: await bytesOf("sales.csv"),
  parquet: await bytesOf("sales.parquet"),
  zstd: await bytesOf("sales_zstd.parquet"),
  uncompressed: await bytesOf("sales_raw.parquet"),
  /** DuckDB's default codec, as the file's metadata names it. */
  codec: await one("SELECT any_value(compression) FROM parquet_metadata('sales.parquet')"),
  rowGroups: await one("SELECT count(DISTINCT row_group_id) FROM parquet_metadata('sales.parquet')"),
  rowGroupRows: await one("SELECT max(row_group_num_rows) FROM parquet_metadata('sales.parquet')"),
};

// ── 4. Each column: its share of the CSV against its chunks in Parquet ──────

// A column's share of the CSV is the characters of its values plus one
// separator each, plus its header.
const csvText = await run(`SELECT ${COLS.map((c) => `sum(length(${c}::VARCHAR) + 1) + ${c.length + 1} AS ${c}`).join(", ")} FROM sales`);
const chunks = await run(
  "SELECT path_in_schema AS col, sum(total_compressed_size) AS bytes, sum(total_uncompressed_size) AS raw,\n" +
    "  string_agg(DISTINCT encodings, ',') AS encodings\nFROM parquet_metadata('sales.parquet')\nGROUP BY col",
);
R.columns = COLS.map((c, j) => {
  const row = chunks.rows.find((r) => r[0] === c);
  return {
    name: c,
    distinct: R.table.distinct[j],
    csv: Number(csvText.rows[0][j]),
    parquet: Number(row[1]),
    uncompressed: Number(row[2]),
    encodings: row[3],
  };
});
// Sorted before writing: the same rows ordered by region, so each region is
// one long run.
await run("COPY (SELECT * FROM sales ORDER BY region, sale_id) TO 'by_region.parquet' (FORMAT parquet)");
R.sortedRegion = {
  copy: "COPY (SELECT * FROM sales ORDER BY region)\nTO 'by_region.parquet' (FORMAT parquet);",
  region: Number(await one("SELECT sum(total_compressed_size) FROM parquet_metadata('by_region.parquet') WHERE path_in_schema = 'region'")),
};

// ── 2. The page's query, on each file: what it reads ─────────────────────────

const PAGE_QUERY = (from, where = "") =>
  `SELECT category,\n       SUM(amount) AS revenue,\n       SUM(units)  AS units_sold\nFROM ${from}\n${where ? `WHERE ${where}\n` : ""}GROUP BY category\nORDER BY revenue DESC;`;
const at = (alias, file) => (alias ? `'${alias}/${file}'` : `'${file}'`);
R.query = {
  page: PAGE_QUERY("sales"),
  csv: await measureRead(["sales.csv"], (a) => PAGE_QUERY(at(a, "sales.csv"))),
  parquet: await measureRead(["sales.parquet"], (a) => PAGE_QUERY(at(a, "sales.parquet"))),
  csvPlan: await scanPlan(PAGE_QUERY("'sales.csv'")),
  parquetPlan: await scanPlan(PAGE_QUERY("'sales.parquet'")),
};

// ── 5. Partitioned by month: one folder per month ───────────────────────────

await run(
  "COPY (SELECT *, strftime(sale_date, '%Y-%m') AS sale_month FROM sales)\nTO 'by_month' (FORMAT parquet, PARTITION_BY (sale_month))",
);
const monthFiles = (await db.globFiles("by_month/*/*.parquet")).map((f) => f.fileName).sort();
const monthsOf = (a) => `read_parquet('${a ? `${a}/` : ""}by_month/*/*.parquet', hive_partitioning = true)`;
const MONTH_QUERY = (where) => `SELECT SUM(amount) AS revenue\nFROM read_parquet('by_month/*/*.parquet',\n                  hive_partitioning = true)\nWHERE ${where};`;
R.partition = {
  copy: "COPY (SELECT *, strftime(sale_date, '%Y-%m') AS sale_month FROM sales)\nTO 'by_month' (FORMAT parquet, PARTITION_BY (sale_month));",
  files: monthFiles.length,
  names: monthFiles,
  rowsPerFile: (
    await run(`SELECT min(n) AS fewest, max(n) AS most FROM (SELECT count(*) AS n FROM ${monthsOf(null)} GROUP BY sale_month)`)
  ).rows[0],
  march: await scanPlan(MONTH_QUERY("sale_month = '2024-03'")),
  region: await scanPlan(MONTH_QUERY("region = 'North'")),
  // A function wrapped around the key. The page warns that this usually
  // defeats pruning; DuckDB evaluates it against each folder's value.
  fn: await scanPlan(MONTH_QUERY("right(sale_month, 2) = '03'")),
  marchResult: await run(MONTH_QUERY("sale_month = '2024-03'")),
  regionResult: await run(MONTH_QUERY("region = 'North'")),
};

// ── 6. Clustering: row groups and their min/max, in date order and shuffled ─

await run("COPY (SELECT * FROM sales ORDER BY hash(sale_id)) TO 'shuffled.parquet' (FORMAT parquet)");
const groupsOf = async (file) =>
  (
    await run(
      `SELECT row_group_id, row_group_num_rows AS n, stats_min AS lo, stats_max AS hi\nFROM parquet_metadata('${file}')\nWHERE path_in_schema = 'sale_date'\nORDER BY row_group_id`,
    )
  ).rows.map(([id, n, lo, hi]) => ({ id, n, lo, hi }));
const RANGE = ["2024-03-01", "2024-03-31"];
const RANGE_QUERY = (from) =>
  `SELECT region, COUNT(*) AS n_sales, AVG(amount) AS avg_amt\nFROM ${from}\nWHERE sale_date BETWEEN DATE '${RANGE[0]}' AND DATE '${RANGE[1]}'\nGROUP BY region;`;
const overlap = (gs) => gs.filter((g) => g.hi >= RANGE[0] && g.lo <= RANGE[1]).length;
const sortedGroups = await groupsOf("sales.parquet");
const shuffledGroups = await groupsOf("shuffled.parquet");
R.cluster = {
  range: RANGE,
  query: RANGE_QUERY("sales"),
  sorted: {
    groups: sortedGroups,
    overlapping: overlap(sortedGroups),
    ...(await measureRead(["sales.parquet"], (a) => RANGE_QUERY(at(a, "sales.parquet")))),
  },
  shuffled: {
    file: await bytesOf("shuffled.parquet"),
    groups: shuffledGroups,
    overlapping: overlap(shuffledGroups),
    ...(await measureRead(["shuffled.parquet"], (a) => RANGE_QUERY(at(a, "shuffled.parquet")))),
  },
};

// ── 7. Small files: the same year, one file a day ───────────────────────────

await run("COPY sales TO 'by_day' (FORMAT parquet, PARTITION_BY (sale_date))");
const dayFiles = (await db.globFiles("by_day/*/*.parquet")).map((f) => f.fileName).sort();
const daySizes = await Promise.all(dayFiles.map(bytesOf));
const monthSizes = await Promise.all(monthFiles.map(bytesOf));
/** A Parquet footer's length: the file ends with it, its 4-byte length and "PAR1". */
const footerOf = async (name) => {
  const b = await db.copyFileToBuffer(name);
  return new DataView(b.buffer, b.byteOffset + b.length - 8, 4).getUint32(0, true) + 8;
};
const yearScan = (root) => `SELECT SUM(amount) FROM read_parquet('${root}/*/*.parquet', hive_partitioning = true)`;
R.small = {
  copy: "COPY sales TO 'by_day' (FORMAT parquet, PARTITION_BY (sale_date));",
  one: { files: 1, bytes: R.files.parquet, footers: await footerOf("sales.parquet"), read: (await scanPlan("SELECT SUM(amount) FROM 'sales.parquet'")).filesRead },
  month: {
    files: monthFiles.length,
    bytes: sum(monthSizes),
    avg: Math.round(sum(monthSizes) / monthFiles.length),
    footers: sum(await Promise.all(monthFiles.map(footerOf))),
    read: (await scanPlan(yearScan("by_month"))).filesRead,
  },
  day: {
    files: dayFiles.length,
    bytes: sum(daySizes),
    avg: Math.round(sum(daySizes) / dayFiles.length),
    smallest: Math.min(...daySizes),
    largest: Math.max(...daySizes),
    footers: sum(await Promise.all(dayFiles.map(footerOf))),
    rowsPerFile: (
      await run("SELECT min(n) AS fewest, max(n) AS most FROM (SELECT count(*) AS n FROM read_parquet('by_day/*/*.parquet', hive_partitioning = true) GROUP BY sale_date)")
    ).rows[0],
    read: (await scanPlan(yearScan("by_day"))).filesRead,
  },
  /** The page's rule of thumb: about 128 MB to 1 GB a file. */
  target: { lo: 128 * 1024 * 1024, hi: 1024 * 1024 * 1024 },
};

// ── 8. Cost: one question, read three ways ──────────────────────────────────

R.cost = {
  csv: { read: R.query.csv.read, total: R.query.csv.total },
  parquet: { read: R.query.parquet.read, total: R.query.parquet.total },
  // The page's query again, on March alone, from the monthly folders.
  march: await measureRead(monthFiles, (a) => PAGE_QUERY(monthsOf(a), "sale_month = '2024-03'")),
};

await conn.close();
await db.terminate();
await worker.terminate();
process.chdir(here);
rmSync(work, { recursive: true, force: true });

const outFile = new URL("./results.json", import.meta.url);
writeFileSync(outFile, `${JSON.stringify(R, null, 2)}\n`);
const mb = (b) => `${(b / 1e6).toFixed(2)} MB`;
console.log(`wrote ${fileURLToPath(outFile)} (${R.engine.duckdb}, checksum ${R.table.checksum})`);
console.log(`csv ${mb(R.files.csv)}, parquet ${mb(R.files.parquet)} (${R.files.codec}), zstd ${mb(R.files.zstd)}, none ${mb(R.files.uncompressed)}`);
for (const c of R.columns) console.log(`  ${c.name.padEnd(10)} csv ${mb(c.csv)}  parquet ${c.parquet} B  ${c.encodings}`);
console.log(`region sorted: ${R.sortedRegion.region} B`);
console.log(`page query reads: csv ${mb(R.query.csv.read)} of ${mb(R.query.csv.total)}, parquet ${mb(R.query.parquet.read)} of ${mb(R.query.parquet.total)}`);
console.log(`plans: ${JSON.stringify(R.query.csvPlan.projections)} ${JSON.stringify(R.query.parquetPlan.projections)}`);
console.log(`partition: ${R.partition.files} files, march ${R.partition.march.scanning}/${R.partition.march.filesRead}, region ${R.partition.region.scanning}/${R.partition.region.filesRead}, fn ${R.partition.fn.scanning}`);
console.log(`cluster: sorted ${R.cluster.sorted.overlapping}/${R.cluster.sorted.groups.length} read ${mb(R.cluster.sorted.read)}; shuffled ${R.cluster.shuffled.overlapping}/${R.cluster.shuffled.groups.length} read ${mb(R.cluster.shuffled.read)}`);
console.log(`small: day ${R.small.day.files} files avg ${R.small.day.avg} B, footers ${R.small.day.footers}; one footer ${R.small.one.footers}`);
console.log(`cost: csv ${mb(R.cost.csv.read)}, parquet ${mb(R.cost.parquet.read)}, march ${mb(R.cost.march.read)}`);
