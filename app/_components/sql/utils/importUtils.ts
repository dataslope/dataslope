import type { QueryExecResult, SqlValue } from "../../runtime/sqlite-wasm";
import type { TableColumnInfo } from "../../runtime/sqlite";
import type { ImportColComparison } from "../types";
import { ensureParquetWasm } from "./parquetWasm";

/** Parse CSV text into headers and rows. Used by every SQL playground
 *  (sqlite, postgres, duckdb) so all three import flows behave identically.
 *
 *  A single pass over the whole document, not a split-into-lines pre-pass:
 *  a record only ends at a line terminator seen *outside* quotes, so a quoted
 *  field may contain `\n`, `\r\n` or `\r`. Splitting first meant the app could
 *  not re-import its own CSV export — the exporter quotes multi-line values
 *  correctly, and every one of them was torn into extra rows. `""` is the
 *  escaped double-quote; short rows are padded and long rows truncated to the
 *  header width; blank lines are skipped. */
export function parseCsv(text: string): {
  headers: string[];
  rows: string[][];
} {
  const records: string[][] = [];
  let fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  // A record is only committed once something was seen on it, so trailing and
  // interstitial blank lines never produce an all-empty row.
  let started = false;

  const endField = () => {
    fields.push(cur);
    cur = "";
    started = true;
  };
  const endRecord = () => {
    if (!started) return;
    fields.push(cur);
    cur = "";
    records.push(fields);
    fields = [];
    started = false;
  };

  // Strip a UTF-8 BOM: it would otherwise become part of the first header.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      started = true;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      started = true;
    } else if (ch === ",") {
      endField();
    } else if (ch === "\n") {
      endRecord();
    } else if (ch === "\r") {
      // Bare \r (classic Mac) and \r\n both terminate the record.
      if (src[i + 1] === "\n") i += 1;
      endRecord();
    } else {
      cur += ch;
      started = true;
    }
  }
  endRecord();

  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0];
  const rows = records.slice(1).map((vals) => {
    while (vals.length < headers.length) vals.push("");
    return vals.slice(0, headers.length);
  });
  return { headers, rows };
}

/** A column type inferred from CSV text, in the dialect-neutral spelling each
 *  playground maps onto its own engine. */
export type InferredColumnType =
  | "bigint"
  | "double precision"
  | "boolean"
  | "date"
  | "timestamptz"
  | "text";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)?$/;
const INTEGER = /^[+-]?\d+$/;
const DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const BOOLEAN = /^(true|false|t|f|yes|no|y|n)$/i;

/** Shape *and* calendar validity. `2024-13-45` matches the ISO pattern but is
 *  not a date; inferring `date` for its column would make the import fail at
 *  the first INSERT instead of falling back to text. */
function isRealCalendarDate(match: RegExpMatchArray): boolean {
  const [, y, mo, d] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** True when a CSV token means "no value". Empty and the conventional `NULL`
 *  spellings are ignored by inference so one blank cell doesn't force `text`. */
function isNullToken(v: string): boolean {
  const s = v.trim();
  return s === "" || s.toLowerCase() === "null" || s === "\\N";
}

/** Guess a column's type from its values. Widens on conflict and falls back to
 *  `text`, so inference can only ever be safe: a column of integers with one
 *  stray word stays text rather than failing the import.
 *
 *  Leading zeros (`00012`) and `+`-prefixed digits stay text on purpose —
 *  they are identifiers (zip codes, product codes) far more often than
 *  numbers, and casting them silently loses the padding. */
export function inferColumnTypeFromValues(
  values: readonly string[],
): InferredColumnType {
  let sawValue = false;
  let allInteger = true;
  let allNumeric = true;
  let allBoolean = true;
  let allDate = true;
  let allTimestamp = true;

  for (const raw of values) {
    if (isNullToken(raw)) continue;
    const v = raw.trim();
    sawValue = true;
    const looksPadded = /^[+-]?0\d/.test(v);
    if (!INTEGER.test(v) || looksPadded) allInteger = false;
    if (!DECIMAL.test(v) || looksPadded) allNumeric = false;
    if (!BOOLEAN.test(v)) allBoolean = false;
    if (allDate) {
      const m = v.match(ISO_DATE);
      if (!m || !isRealCalendarDate(m)) allDate = false;
    }
    if (allTimestamp) {
      const m = v.match(ISO_TIMESTAMP);
      if (!m || !isRealCalendarDate(m)) allTimestamp = false;
    }
    if (!allInteger && !allNumeric && !allBoolean && !allDate && !allTimestamp) {
      return "text";
    }
  }
  if (!sawValue) return "text";
  // Integers before decimals (narrower), booleans before either so a column of
  // `0`/`1` stays numeric — only real true/false spellings read as boolean.
  if (allInteger) return "bigint";
  if (allNumeric) return "double precision";
  if (allBoolean) return "boolean";
  if (allDate) return "date";
  if (allTimestamp) return "timestamptz";
  return "text";
}

/** Column types the SQLite import flow is allowed to create. An allowlist,
 *  not free text: the value reaches `CREATE TABLE` unquoted. */
const SQLITE_IMPORT_TYPES = new Set(["TEXT", "INTEGER", "REAL", "NUMERIC", "BLOB"]);

/** Normalize a (possibly user-overridden) column type for `CREATE TABLE`,
 *  falling back to TEXT — SQLite's most permissive affinity. */
export function sqliteColumnType(type: string | undefined): string {
  const t = (type ?? "").trim().toUpperCase();
  return SQLITE_IMPORT_TYPES.has(t) ? t : "TEXT";
}

/** Map an inferred type onto a SQLite column affinity.
 *
 *  This is a correctness fix, not a nicety: SQLite compares a TEXT-affinity
 *  column as text, so a CSV of integers imported as TEXT makes
 *  `WHERE qty > 5` return the wrong rows with no error at all. Booleans and
 *  dates stay TEXT — SQLite has no native type for either, and INTEGER
 *  affinity would leave a column half-converted (`'true'` does not convert
 *  losslessly, so it would be stored as text beside real integers). */
export function sqliteAffinityFor(type: InferredColumnType): string {
  switch (type) {
    case "bigint":
      return "INTEGER";
    case "double precision":
      return "REAL";
    default:
      return "TEXT";
  }
}

/** Infer a type per column from the parsed rows. `sampleSize` caps the scan so
 *  a very large file doesn't stall the preview. */
export function inferCsvColumnTypes(
  headers: readonly string[],
  rows: readonly string[][],
  sampleSize = 500,
): InferredColumnType[] {
  const sample = rows.slice(0, sampleSize);
  return headers.map((_, i) =>
    inferColumnTypeFromValues(sample.map((r) => r[i] ?? "")),
  );
}

/** SQLite's 16-byte magic header. The import flow sniffs this instead of
 *  the filename extension, so any extension (.db3, .bak, …) imports
 *  correctly. */
const SQLITE_MAGIC = "SQLite format 3\0";

export function isSqliteBinary(bytes: Uint8Array): boolean {
  if (bytes.length < SQLITE_MAGIC.length) return false;
  for (let i = 0; i < SQLITE_MAGIC.length; i++) {
    if (bytes[i] !== SQLITE_MAGIC.charCodeAt(i)) return false;
  }
  return true;
}

/** Derive a SQL-safe table name from a filename, stripping the
 *  extension and collapsing non-identifier runs to underscores. */
export function tableNameFromFilename(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return base || "imported_table";
}

/** File extensions DuckDB can read directly through a replacement scan,
 *  i.e. `SELECT * FROM 'file.ext'` works without an explicit `read_*`
 *  wrapper. Used by the Files panel to decide whether to offer a
 *  "Create Table" action for a given file. */
export const DUCKDB_READABLE_EXTENSIONS = [
  "csv",
  "tsv",
  "json",
  "jsonl",
  "ndjson",
  "parquet",
] as const;

/** Transparent compression suffixes DuckDB unwraps for its text formats,
 *  so `data.csv.gz` reads the same as `data.csv`. */
const DUCKDB_COMPRESSION_SUFFIXES = ["gz", "zst"];

/** True when DuckDB can build a table straight from this file via a
 *  replacement scan, judged from its (case-insensitive) extension. A
 *  single `.gz`/`.zst` compression suffix is looked through to the real
 *  format extension (e.g. `data.csv.gz`). */
export function isDuckDbReadableFile(path: string): boolean {
  const name = (path.split("/").pop() ?? path).toLowerCase();
  const parts = name.split(".");
  if (parts.length < 2) return false; // no extension at all
  let ext = parts[parts.length - 1];
  if (DUCKDB_COMPRESSION_SUFFIXES.includes(ext)) {
    if (parts.length < 3) return false; // bare ".gz"/".zst", format unknown
    ext = parts[parts.length - 2];
  }
  return (DUCKDB_READABLE_EXTENSIONS as readonly string[]).includes(ext);
}

/** Read a Parquet file and materialise it into the same column/row
 *  shape parseCsv returns, so callers can hand the result off to a
 *  shared import preview component. */
export async function readParquetFile(
  file: File,
): Promise<{ columns: string[]; rows: QueryExecResult["values"] }> {
  const mod = await ensureParquetWasm();
  const { tableFromIPC } = await import("apache-arrow");
  const bytes = await file.arrayBuffer();
  const wasmTable = mod.readParquet(new Uint8Array(bytes));
  const ipcBytes = wasmTable.intoIPCStream();
  const arrowTable = tableFromIPC(ipcBytes);
  const columns = arrowTable.schema.fields.map((f) => f.name);
  const rows: QueryExecResult["values"] = [];
  for (const batch of arrowTable.batches) {
    for (let r = 0; r < batch.numRows; r++) {
      const row: SqlValue[] = [];
      for (let c = 0; c < columns.length; c++) {
        const val = batch.getChildAt(c)?.get(r);
        row.push(val === undefined ? null : (val as SqlValue));
      }
      rows.push(row);
    }
  }
  return { columns, rows };
}

/** Sanitizes a raw header/column name to the SQL identifier used when
 *  building INSERT statements. Case is preserved so the created column
 *  names match the original file. */
export function sanitizeImportColName(header: string): string {
  return header.trim().replace(/[^a-zA-Z0-9_]/g, "_") || "col";
}

/** Case-insensitive variant used only for column-matching comparisons.
 *  SQLite column lookups are case-insensitive, so we normalize both sides
 *  before comparing. */
export function normalizeImportColName(header: string): string {
  return sanitizeImportColName(header).toLowerCase();
}

export function computeImportColComparison(
  fileHeaders: string[],
  tableCols: TableColumnInfo[],
): ImportColComparison[] {
  const tableMap = new Map(tableCols.map((c) => [c.name.toLowerCase(), c]));
  const matched = new Set<string>();
  const rows: ImportColComparison[] = [];

  for (const h of fileHeaders) {
    const key = normalizeImportColName(h);
    const col = tableMap.get(key);
    if (col) {
      rows.push({ status: "matched", fileCol: h, tableCol: col.name });
      matched.add(key);
    } else {
      rows.push({ status: "extra", fileCol: h, tableCol: null });
    }
  }

  for (const col of tableCols) {
    if (!matched.has(col.name.toLowerCase())) {
      const isOptional =
        !col.notNull || col.defaultValue !== null || col.pk > 0;
      rows.push({
        status: isOptional ? "optional" : "required",
        fileCol: null,
        tableCol: col.name,
      });
    }
  }

  return rows;
}
