import own from "./results.json" with { type: "json" };
import de from "../de-warehousing/results.json" with { type: "json" };

// Every number the video shows, read from results.json files: what DuckDB
// (DuckDB-Wasm 1.32.0, DuckDB v1.4.3) measured on files for the statements
// in this video's check.mjs, and, for the figures it shares with Data
// Engineer Part 9, what de-warehousing's check.mjs measured on the same
// million-row table (check.mjs refuses to run unless the table it rebuilds
// matches that one's checksum and file size). The models are computed in
// check.mjs from stated assumptions and marked as models here. No number is
// a vendor warehouse's. Pure (no Remotion, no DOM).

export const VIDEO = "ae-warehousing";

/**
 * Whether public/images/ae-warehousing/ holds the watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

export const ENGINE = `DuckDB ${own.engine.duckdb}`;

/** Decimal megabytes and kilobytes, as de-warehousing prints them. */
export const mb = (bytes: number, digits = 1) => `${(bytes / 1e6).toFixed(digits)} MB`;
export const kb = (bytes: number) => `${Math.round(bytes / 1e3)} kB`;

if (own.table.checksum !== de.table.checksum || own.table.parquet !== de.files.parquet) {
  throw new Error("ae-warehousing's table is not de-warehousing's: run check.mjs");
}

/** The video's own million sales (de-warehousing's table), as a Parquet file. */
export const TABLE = {
  rows: own.table.rows,
  columns: own.table.columns,
  parquet: own.table.parquet,
  /** Each column's compressed bytes in the file, in table order. */
  columnBytes: own.table.columns.map((c) => ({ name: c, bytes: (own.columnBytes as Record<string, number>)[c] })),
};

// ── 4. Columnar storage: one column as text against one encoded column ──────

/** The table's first four sales, as de-warehousing printed them. */
export const SAMPLE = {
  cols: de.table.sample.columns,
  rows: de.table.sample.rows.map((r) => r.map(String)),
};
/** The four regions, in the order they first appear: the dictionary. */
export const REGIONS = de.table.regions;

const region = de.columns.find((c) => c.name === "region")!;
export const COLUMNAR = {
  regionCsv: region.csv,
  regionParquet: region.parquet,
  regionValues: de.table.distinct[2],
};

// ── 5. SELECT * ─────────────────────────────────────────────────────────────

export const SELECT_STAR = {
  /** The page's model: 3 columns of 200, every column the same width. */
  model: own.selectModel,
  star: own.select.star,
  regionUnits: own.select.regionUnits,
  regionAmount: own.select.regionAmount,
  amountShare: own.columnBytes.amount / own.table.parquet,
};

// ── 6. Partitioning (de-warehousing's month folders, and the page's chart) ──

export const PRUNE = {
  /** A model: the page's chart's own constants, read by check.mjs. */
  model: own.pruneModel,
  files: de.partition.files,
  /** "2024-03", one per folder, in order. */
  months: de.partition.names.map((n) => n.match(/sale_month=([\d-]+)/)?.[1] ?? n),
  march: de.partition.march,
  region: de.partition.region,
};

// ── 7. Clustering (de-warehousing's row groups) ─────────────────────────────

export const CLUSTER = {
  range: de.cluster.range,
  groups: de.cluster.sorted.groups,
  overlapping: de.cluster.sorted.overlapping,
  sortedRead: de.cluster.sorted.read,
  shuffledGroups: de.cluster.shuffled.groups,
  shuffledOverlapping: de.cluster.shuffled.overlapping,
  shuffledRead: de.cluster.shuffled.read,
  ratio: de.cluster.shuffled.read / de.cluster.sorted.read,
};

// ── 8. When it hurts (de-warehousing's day folders) ─────────────────────────

export const SMALL = {
  day: de.small.day,
  month: de.small.month,
  one: de.small.one,
};

// ── 9. Compute: a model ─────────────────────────────────────────────────────

/** A model, the video's own assumption: busy two minutes in an hour. */
export const COMPUTE_MODEL = own.computeModel;

// ── 10. One big table against a star ────────────────────────────────────────

export const OBT = {
  dimension: own.obt.dimension,
  starFile: own.obt.starFile,
  obtFile: own.obt.obtFile,
  keyBytes: own.obt.keyBytes,
  nameBytes: own.obt.nameBytes,
  departmentBytes: own.obt.departmentBytes,
  revenueByCategory: own.obt.obtQuery,
  starQuery: own.obt.starQuery.sql,
  obtQuery: own.obt.obtQuery.sql,
  rename: own.rename,
};
