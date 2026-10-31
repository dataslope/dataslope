import results from "./results.json" with { type: "json" };

// Every number, listing and plan line the video shows, read from
// results.json: what DuckDB v1.4.3 (DuckDB-Wasm 1.32.0, the engine the
// page's blocks run) wrote, read and printed for the statements in check.mjs,
// which wrote it. Sizes are the lengths of files DuckDB wrote; "read" is what
// its file statistics counted while the query ran. Pure (no Remotion, no DOM).

export const VIDEO = "de-warehousing";

/** Whether public/images/de-warehousing/ holds the hero from illustrations.json. */
export const ILLUSTRATIONS = true;

export const RUNTIME = `DuckDB ${results.engine.duckdb}`;

/** Decimal megabytes and kilobytes, as the narration says them. */
export const MB = (bytes: number, digits = 1) => `${(bytes / 1e6).toFixed(digits)} MB`;
export const KB = (bytes: number) => `${Math.round(bytes / 1e3)} KB`;
/** "1,000,000". */
export const count = (n: number) => n.toLocaleString("en-US");

type Plan = {
  sql: string;
  function: string | null;
  projections: string[] | null;
  filters: string | null;
  fileFilters: string | null;
  scanning: string | null;
  filesRead: number;
};
const lines = (sql: string) => sql.split("\n");

// ── The table ───────────────────────────────────────────────────────────────

export const TABLE = {
  rows: results.table.rows,
  days: results.table.days,
  /** The four regions, in the order they first appear. */
  regions: results.table.regions as string[],
  /** Its first four rows, as a SQL client prints them. */
  sample: { cols: results.table.sample.columns, rows: results.table.sample.rows.map((r) => r.map(String)) },
};

// ── The files ───────────────────────────────────────────────────────────────

export const FILES = results.files;

/** Each column: its share of the CSV against its chunks in Parquet. */
export type Column = (typeof results.columns)[number];
export const COLUMNS: readonly Column[] = results.columns;
export const column = (name: string): Column => {
  const c = COLUMNS.find((k) => k.name === name);
  if (!c) throw new Error(`results.json has no column ${name}`);
  return c;
};
export const SORTED_REGION = results.sortedRegion;

// ── The page's query, and what it read ─────────────────────────────────────

export const QUERY = {
  lines: lines(results.query.page),
  csv: results.query.csv,
  parquet: results.query.parquet,
  csvPlan: results.query.csvPlan as Plan,
  parquetPlan: results.query.parquetPlan as Plan,
};

// ── Partitions ──────────────────────────────────────────────────────────────

export const PARTITION = {
  files: results.partition.files,
  /** "2024-03", one per folder, in order. */
  months: results.partition.names.map((n) => n.match(/sale_month=([\d-]+)/)?.[1] ?? n),
  rowsPerFile: results.partition.rowsPerFile as [number, number],
  march: { ...(results.partition.march as Plan), lines: lines(results.partition.march.sql) },
  region: { ...(results.partition.region as Plan), lines: lines(results.partition.region.sql) },
  fn: { ...(results.partition.fn as Plan), lines: lines(results.partition.fn.sql) },
};

// ── Clustering ──────────────────────────────────────────────────────────────

export const CLUSTER = {
  range: results.cluster.range as [string, string],
  rowGroupRows: results.files.rowGroupRows,
  sorted: results.cluster.sorted,
  shuffled: results.cluster.shuffled,
};

// ── Small files ─────────────────────────────────────────────────────────────

export const SMALL = results.small;

// ── Cost ────────────────────────────────────────────────────────────────────

export const COST = results.cost;
