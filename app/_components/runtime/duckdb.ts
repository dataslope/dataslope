// DuckDB engine wrapper for the DuckDB Playground. DuckDB-Wasm is loaded
// from jsDelivr at runtime (not npm) because the npm package is flagged by
// an overly broad GitHub advisory (GHSA-w62p-hx95-gf2c; 1.30.0+ are clean).
// A minimal local type shim covers the API surface the engine touches.
"use client";

import type { QueryExecResult, SqlValue } from "./sqlite-wasm";
import type {
  ColumnSpec,
  ColumnConstraintInfo,
  ForeignKeyInfo,
  TableRebuildSpec,
  TableColumnInfo,
} from "./sqlite";
import {
  findDuckDbSampleDatabase,
  DUCKDB_BLANK_DATABASE,
  type DuckDbSampleDatabase,
} from "./duckdbSamples";
import { datasetFileName, fetchDatasetBytes, fetchDatasetText } from "./remoteDatasets";
import { defaultGeneratesUniqueValue } from "../sql/utils/duplicateRow";
import {
  toDateOnlyString,
  toTimestampString,
  arrowTimeToString,
  arrowIntervalToString,
  unscaledDecimalToString,
  unscaledIntegerFrom,
} from "./valueFormat";

// ─── Local type shim for @duckdb/duckdb-wasm (1.30+ API) ────────────

interface DuckDbBundle {
  mainModule: string;
  mainWorker?: string | null;
  pthreadWorker?: string | null;
}

interface DuckDbBundles {
  mvp: DuckDbBundle;
  eh?: DuckDbBundle;
  coi?: DuckDbBundle;
}

interface DuckDbArrowField {
  name: string;
  /** Arrow DataType, Decimal fields additionally expose `scale` (integer). */
  type: { toString(): string; scale?: number };
}
interface DuckDbArrowSchema {
  fields: DuckDbArrowField[];
}
interface DuckDbArrowVector {
  get(index: number): unknown;
}
interface DuckDbArrowTable {
  schema: DuckDbArrowSchema;
  numRows: number;
  getChildAt(index: number): DuckDbArrowVector | null;
}

interface DuckDbPreparedStatement {
  query(...params: unknown[]): Promise<DuckDbArrowTable>;
  close(): Promise<void>;
}

interface DuckDbConnection {
  query(sql: string): Promise<DuckDbArrowTable>;
  prepare(sql: string): Promise<DuckDbPreparedStatement>;
  close(): Promise<void>;
}

interface AsyncDuckDB {
  instantiate(
    mainModule: string,
    pthreadWorker?: string | null,
    progress?: (p: { bytesLoaded: number; bytesTotal: number }) => void,
  ): Promise<void>;
  connect(): Promise<DuckDbConnection>;
  registerFileBuffer(name: string, buffer: Uint8Array): Promise<void>;
  registerFileText?(name: string, text: string): Promise<void>;
  copyFileToBuffer?(name: string): Promise<Uint8Array>;
  dropFile?(name: string): Promise<void>;
  terminate(): Promise<void>;
}

interface DuckDbModule {
  AsyncDuckDB: new (logger: unknown, worker: Worker) => AsyncDuckDB;
  ConsoleLogger: new (level?: number) => unknown;
  VoidLogger: new () => unknown;
  selectBundle(bundles: DuckDbBundles): Promise<DuckDbBundle>;
  getJsDelivrBundles(): DuckDbBundles;
}

// ─── Module-level lazy initializer ──────────────────────────────────
// The ~5–10 MB bundle is fetched once; the promise is memoized so
// navigating away and back doesn't re-fetch.

export const DUCKDB_VERSION = "1.32.0";
const DUCKDB_CDN = `https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${DUCKDB_VERSION}/+esm`;

let _duckdbModulePromise: Promise<DuckDbModule> | null = null;

async function loadDuckDbModule(): Promise<DuckDbModule> {
  if (!_duckdbModulePromise) {
    _duckdbModulePromise = (async () => {
      // Magic comments keep webpack/turbopack from resolving the URL at build time.
      const mod = (await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ DUCKDB_CDN
      )) as DuckDbModule;
      return mod;
    })();
  }
  return _duckdbModulePromise;
}

async function instantiateDuckDb(
  onProgress?: (fraction: number) => void,
): Promise<{
  db: AsyncDuckDB;
  bundle: DuckDbBundle;
}> {
  const duckdb = await loadDuckDbModule();
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);
  // Standard duckdb-wasm pattern: wrap the worker script in a Blob.
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    }),
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.VoidLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  // duckdb-wasm reports real download progress for the .wasm bundle.
  await db.instantiate(
    bundle.mainModule,
    bundle.pthreadWorker,
    onProgress
      ? (p) => {
          if (p.bytesTotal > 0) onProgress(p.bytesLoaded / p.bytesTotal);
        }
      : undefined,
  );
  URL.revokeObjectURL(workerUrl);
  return { db, bundle };
}

let _dbPromise: Promise<{ db: AsyncDuckDB; bundle: DuckDbBundle }> | null =
  null;

// DuckDB-Wasm shares one catalog across every connection to an instance, so
// /learn blocks (which each seed their own tables) must pass `isolated` for a
// fresh instance; the caller must terminate it (see destroy()). The shared
// singleton is only safe for the one-engine-per-page playground.
function getDuckDbInstance(
  isolated = false,
  onProgress?: (fraction: number) => void,
): Promise<{ db: AsyncDuckDB; bundle: DuckDbBundle }> {
  if (isolated) return instantiateDuckDb(onProgress);
  // Progress only fires during the singleton's first instantiation.
  if (!_dbPromise) _dbPromise = instantiateDuckDb(onProgress);
  return _dbPromise;
}

// ─── Helpers ────────────────────────────────────────────────────────

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

const FK_ACTIONS = new Set([
  "NO ACTION",
  "RESTRICT",
  "CASCADE",
  "SET NULL",
  "SET DEFAULT",
]);

function normalizeFkAction(action: string | undefined): string {
  const normalized = (action || "NO ACTION").trim().toUpperCase();
  return FK_ACTIONS.has(normalized) ? normalized : "NO ACTION";
}

/** Best-effort coercion from Arrow's heterogenous JS values into the
 *  flat `SqlValue` shape the playground UI expects. BigInts (common in
 *  DuckDB BIGINT/HUGEINT columns) are converted to a number when safe
 *  and to a string otherwise to avoid silent precision loss. */
function toSqlValue(value: unknown): SqlValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") {
    if (
      value <= BigInt(Number.MAX_SAFE_INTEGER) &&
      value >= BigInt(Number.MIN_SAFE_INTEGER)
    ) {
      return Number(value);
    }
    return value.toString();
  }
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string") return value;
  // Arrow DECIMALs are `Decimal` objects whose toString() is the numeric
  // string; without this branch JSON.stringify would add literal quotes
  // that leak into the table and break re-inserts.
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const proto = Object.getPrototypeOf(value) as { toString?: () => string } | null;
    if (
      proto &&
      proto.toString &&
      proto.toString !== Object.prototype.toString
    ) {
      const s = String(value);
      if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(s)) {
        return s;
      }
    }
  }
  // STRUCT/LIST/MAP arrive as plain objects/arrays; serialize to text.
  try {
    return JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    );
  } catch {
    return String(value);
  }
}

/** Normalize a JS value for binding as a DuckDB prepared-statement
 *  parameter. Scalars and bigint bind directly; `Date` becomes an ISO string
 *  DuckDB casts to a timestamp; other objects fall back to string form. */
export function toBindParam(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (value !== null && typeof value === "object") return String(value);
  return value;
}

/** Serialize a JS array as a DuckDB list literal (`[1, 2, 'a']`). Needed
 *  because DuckDB-Wasm can't bind a JS array as a LIST parameter; strings
 *  are single-quote-escaped, nested arrays recurse. */
export function toDuckDbListLiteral(arr: readonly unknown[]): string {
  const elem = (v: unknown): string => {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    if (typeof v === "bigint") return v.toString();
    if (Array.isArray(v)) return toDuckDbListLiteral(v);
    return `'${String(v).replace(/'/g, "''")}'`;
  };
  return `[${arr.map(elem).join(", ")}]`;
}

/** Normalise `duckdb_constraints().constraint_column_names` (VARCHAR[]),
 *  which may arrive as a JS array, an Arrow Vector (iterable, but not
 *  `Array.isArray`), or a stringified list with quoted elements. */
export function parseConstraintColumnNames(value: unknown): string[] {
  let raw: unknown[] = [];
  if (Array.isArray(value)) raw = value;
  else if (typeof value === "string")
    raw = value.replace(/^\[|\]$/g, "").split(/,\s*/);
  else if (
    value != null &&
    typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] ===
      "function"
  )
    raw = Array.from(value as Iterable<unknown>);
  return raw
    .map((x) => String(x).trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/** Parse the labels out of a DuckDB enum `data_type` string, e.g.
 *  `ENUM('sad', 'ok', 'happy')` (labels single-quoted, `''` escapes).
 *  Returns null when the string isn't an enum definition. */
export function parseDuckDbEnumValues(
  dataType: string | null | undefined,
): string[] | null {
  if (!dataType) return null;
  const m = /^enum\s*\((.*)\)\s*$/is.exec(dataType.trim());
  if (!m) return null;
  const body = m[1];
  const values: string[] = [];
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /[\s,]/.test(body[i])) i++; // skip separators
    if (i >= body.length) break;
    if (body[i] !== "'") return null; // malformed, bail rather than guess
    i++; // opening quote
    let label = "";
    while (i < body.length) {
      if (body[i] === "'") {
        if (body[i + 1] === "'") {
          label += "'";
          i += 2;
          continue;
        }
        i++; // closing quote
        break;
      }
      label += body[i];
      i++;
    }
    values.push(label);
  }
  return values.length > 0 ? values : null;
}

/** Map an Arrow type string to the DuckDB SQL type name (`Decimal[38e+2]` →
 *  `DECIMAL(38,2)`, `Int64` → `BIGINT`). Unknown notations pass through
 *  unchanged rather than becoming an empty label. */
export function arrowTypeToSqlName(arrowType: string): string {
  const t = arrowType.trim();
  const lower = t.toLowerCase();
  const scalar: Record<string, string> = {
    int8: "TINYINT",
    int16: "SMALLINT",
    int32: "INTEGER",
    int64: "BIGINT",
    uint8: "UTINYINT",
    uint16: "USMALLINT",
    uint32: "UINTEGER",
    uint64: "UBIGINT",
    float16: "FLOAT",
    float32: "FLOAT",
    float64: "DOUBLE",
    utf8: "VARCHAR",
    largeutf8: "VARCHAR",
    bool: "BOOLEAN",
    binary: "BLOB",
    largebinary: "BLOB",
  };
  if (scalar[lower]) return scalar[lower];
  // List<Int32> / FixedSizeList[4]<Int32> → INTEGER[]
  let m =
    lower.match(/^(?:large)?list<(.+)>$/) ??
    lower.match(/^fixedsizelist\[\d+\]<(.+)>$/);
  if (m) return `${arrowTypeToSqlName(m[1])}[]`;
  // Decimal[38e+2] → DECIMAL(38,2); the exponent part is the scale.
  m = lower.match(/^decimal\[(\d+)e([+-]?\d+)\]/);
  if (m) {
    // DuckDB sends HUGEINT over Arrow as a 128-bit decimal with scale 0, so
    // labelling it `DECIMAL(38,0)` named a type the user never wrote. 38 is
    // also DuckDB's maximum DECIMAL precision, so nothing else lands here.
    if (m[1] === "38" && Number(m[2]) === 0) return "HUGEINT";
    return `DECIMAL(${m[1]},${Number(m[2])})`;
  }
  // Timestamp<MICROSECOND> → TIMESTAMP; a trailing ", <tz>" marks TIMESTAMPTZ.
  if (lower.startsWith("timestamp")) {
    return lower.includes(",")
      ? "TIMESTAMP WITH TIME ZONE"
      : "TIMESTAMP";
  }
  if (lower.startsWith("date")) return "DATE";
  if (lower.startsWith("time")) return "TIME";
  if (lower.startsWith("interval") || lower.startsWith("duration")) {
    return "INTERVAL";
  }
  if (lower.startsWith("fixedsizebinary")) return "BLOB";
  // DuckDB ENUM columns arrive as an Arrow dictionary of their labels.
  if (lower.startsWith("dictionary<")) return "ENUM";
  if (lower.startsWith("struct")) return "STRUCT";
  if (lower.startsWith("map<")) return "MAP";
  return t;
}


/** Read an `Interval<MONTH_DAY_NANO>` cell straight from the Arrow buffer.
 *
 *  apache-arrow's `.get()` dispatches this unit to the YEAR_MONTH getter, so
 *  it hands back `[years, months]` and silently drops the day and time
 *  components: `INTERVAL '3 days'` arrives as `[0, 0]`. The buffer itself is
 *  correct — 4 int32s per row, `[months, days, nanosLow, nanosHigh]` — so the
 *  value is read from there instead. Returns null when the layout is not what
 *  we expect, leaving the caller on its normal path. */
function readMonthDayNano(
  vec: { data?: ReadonlyArray<{ length: number; offset: number; values: Int32Array }> },
  rowIndex: number,
): Int32Array | null {
  const chunks = vec.data;
  if (!chunks) return null;
  let idx = rowIndex;
  for (const chunk of chunks) {
    if (idx < chunk.length) {
      const start = (chunk.offset + idx) * 4;
      const slice = chunk.values.subarray(start, start + 4);
      return slice.length === 4 ? slice : null;
    }
    idx -= chunk.length;
  }
  return null;
}

function arrowToQueryExecResult(
  table: DuckDbArrowTable,
): (QueryExecResult & { columnTypes?: string[] }) | null {
  const fields = table.schema.fields;
  if (fields.length === 0) return null;
  const columns = fields.map((f) => f.name);
  const columnTypes = fields.map((f) => {
    try {
      return arrowTypeToSqlName(String(f.type));
    } catch {
      return "";
    }
  });
  // Decimal scales: unscaled 2999 with scale=2 must render as "29.99", not
  // the raw integer (which would round-trip to the wrong magnitude on edit).
  const columnScales: (number | null)[] = fields.map((f) => {
    if (typeof f.type.scale === "number" && f.type.scale > 0) {
      return f.type.scale;
    }
    return null;
  });
  // DATE columns arrive as an epoch number; render as `YYYY-MM-DD`.
  const columnIsDate: boolean[] = fields.map((f) =>
    /^date/i.test(String(f.type)),
  );
  // The other time-like Arrow types had no branch at all, so a TIMESTAMP came
  // through as epoch millis, a TIME as a bare microsecond count, and an
  // INTERVAL as an index-keyed dump of its Int32Array — on screen *and* in
  // every export.
  const columnTemporal = fields.map((f) => {
    const type = String(f.type);
    // apache-arrow normalizes every timestamp unit to epoch milliseconds on
    // the way out, so the unit only matters for TIME and INTERVAL.
    const ts = /^timestamp/i.test(type);
    if (ts) return { kind: "timestamp" as const, unit: "", withZone: type.includes(",") };
    // DuckDB sends TIME as `Time64<MICROSECOND>`, so the digits matter.
    const time = /^time\d*</i.exec(type);
    if (time) {
      return {
        kind: "time" as const,
        unit: type.slice(type.indexOf("<") + 1, type.lastIndexOf(">")),
        withZone: false,
      };
    }
    const interval = /^interval</i.exec(type);
    if (interval) {
      return {
        kind: "interval" as const,
        unit: type.slice(type.indexOf("<") + 1, type.lastIndexOf(">")),
        withZone: false,
      };
    }
    return null;
  });
  const vectors = fields.map((_f, i) => table.getChildAt(i));
  const values: SqlValue[][] = [];
  for (let r = 0; r < table.numRows; r++) {
    const row: SqlValue[] = new Array(fields.length);
    for (let c = 0; c < fields.length; c++) {
      const vec = vectors[c];
      const raw = vec ? vec.get(r) : null;
      const scale = columnScales[c];
      if (raw === null || raw === undefined) {
        row[c] = null;
      } else if (columnIsDate[c]) {
        row[c] = toDateOnlyString(raw) ?? toSqlValue(raw);
      } else if (columnTemporal[c] !== null) {
        const spec = columnTemporal[c]!;
        const formatted =
          spec.kind === "timestamp"
            ? toTimestampString(
                typeof raw === "bigint" ? Number(raw) : raw,
                spec.withZone,
              )
            : spec.kind === "time"
              ? arrowTimeToString(raw, spec.unit)
              : arrowIntervalToString(
                  spec.unit.toUpperCase() === "MONTH_DAY_NANO"
                    ? ((vec &&
                        readMonthDayNano(
                          vec as unknown as Parameters<typeof readMonthDayNano>[0],
                          r,
                        )) ??
                      raw)
                    : raw,
                  spec.unit,
                );
        row[c] = formatted ?? toSqlValue(raw);
      } else if (scale !== null) {
        // Arrow stores DECIMAL(p,s) as the unscaled integer (BigInt or
        // Decimal object depending on build); re-apply the scale.
        const unscaled = unscaledIntegerFrom(raw);
        row[c] =
          unscaled !== null
            ? unscaledDecimalToString(unscaled, scale)
            : toSqlValue(raw);
      } else {
        row[c] = toSqlValue(raw);
      }
    }
    values.push(row);
  }
  return { columns, columnTypes, values };
}

/** Split a multi-statement SQL string — DuckDB-Wasm's `conn.query()` only
 *  accepts one statement. Tracks string/identifier quotes, line and block
 *  comments, and dollar-quoted bodies so semicolons inside them don't split. */
function splitDuckDbStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  const len = sql.length;
  let i = 0;
  while (i < len) {
    const ch = sql[i];
    const next = i + 1 < len ? sql[i + 1] : "";
    // Line comment.
    if (ch === "-" && next === "-") {
      const eol = sql.indexOf("\n", i);
      const stop = eol === -1 ? len : eol;
      buf += sql.slice(i, stop);
      i = stop;
      continue;
    }
    // Block comment.
    if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      const stop = end === -1 ? len : end + 2;
      buf += sql.slice(i, stop);
      i = stop;
      continue;
    }
    // Single-quoted string with `''` escape.
    if (ch === "'") {
      buf += ch;
      i += 1;
      while (i < len) {
        const c = sql[i];
        buf += c;
        if (c === "'") {
          if (sql[i + 1] === "'") {
            buf += sql[i + 1];
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    // Double-quoted identifier with `""` escape.
    if (ch === '"') {
      buf += ch;
      i += 1;
      while (i < len) {
        const c = sql[i];
        buf += c;
        if (c === '"') {
          if (sql[i + 1] === '"') {
            buf += sql[i + 1];
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    // Dollar-quoted string body: $tag$ … $tag$ (tag may be empty).
    if (ch === "$") {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end === -1 ? len : end + tag.length;
        buf += sql.slice(i, stop);
        i = stop;
        continue;
      }
    }
    if (ch === ";") {
      const trimmed = buf.trim();
      if (trimmed) out.push(trimmed);
      buf = "";
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

// ─── DDL rendering for createTable / rebuildTable ───────────────────

const IDENTITY_TYPES = new Set([
  "tinyint",
  "smallint",
  "integer",
  "int",
  "bigint",
  "ubigint",
  "uinteger",
  "usmallint",
  "utinyint",
  "hugeint",
]);

function renderDuckDbType(col: ColumnSpec): string {
  return (col.type || "INTEGER").trim();
}

function renderDuckDbColumnDef(col: ColumnSpec): string {
  const name = quoteIdent(col.name);
  const type = renderDuckDbType(col);
  if (col.generated) {
    // DuckDB only supports STORED generated columns; `storageType` is
    // deliberately ignored so shared forms can't produce invalid VIRTUAL DDL.
    return `${name} ${type} GENERATED ALWAYS AS (${col.generated.expression}) STORED`;
  }
  const parts = [name, type];
  // GENERATED BY DEFAULT AS IDENTITY must precede NOT NULL in DuckDB's parser.
  if (col.autoIncrement) {
    parts.push("GENERATED BY DEFAULT AS IDENTITY");
  } else if (col.defaultValue) {
    parts.push(`DEFAULT ${col.defaultValue}`);
  }
  if (col.notNull) parts.push("NOT NULL");
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  return parts.join(" ");
}

function renderDuckDbCreateTable(
  name: string,
  columns: ColumnSpec[],
): string {
  const defs = columns.map((col) => `  ${renderDuckDbColumnDef(col)}`);
  const pk = columns.filter((col) => col.primaryKey);
  if (pk.length > 0) {
    defs.push(
      `  PRIMARY KEY (${pk.map((col) => quoteIdent(col.name)).join(", ")})`,
    );
  }
  for (const col of columns) {
    if (!col.foreignKey?.table || !col.foreignKey.column) continue;
    // DuckDB silently ignores ON DELETE / ON UPDATE; still emitted so the
    // DDL round-trips through SQLite/Postgres without losing intent.
    defs.push(
      [
        `  FOREIGN KEY (${quoteIdent(col.name)}) REFERENCES ${quoteIdent(col.foreignKey.table)}(${quoteIdent(col.foreignKey.column)})`,
        `ON DELETE ${normalizeFkAction(col.foreignKey.onDelete)}`,
        `ON UPDATE ${normalizeFkAction(col.foreignKey.onUpdate)}`,
      ].join(" "),
    );
  }
  return `CREATE TABLE ${quoteIdent(name)} (\n${defs.join(",\n")}\n)`;
}

let duckRebuildCounter = 0;

// ─── Engine interface ───────────────────────────────────────────────

export interface DuckDbEngine {
  loadSampleDatabase: (id: string) => Promise<DuckDbSampleDatabase>;
  loadBlankDatabase: () => Promise<DuckDbSampleDatabase>;
  exec: (sql: string) => Promise<(QueryExecResult | null)[]>;
  execParams: (sql: string, params: unknown[]) => Promise<QueryExecResult[]>;
  execPaged: (
    sql: string,
    pageSize: number,
    offset: number,
  ) => Promise<{ result: QueryExecResult[]; totalCount: number }>;
  listSchemas: (includeSystem?: boolean) => Promise<string[]>;
  createSchema: (name: string) => Promise<void>;
  listTables: (schema?: string) => Promise<string[]>;
  listViews: (schema?: string) => Promise<string[]>;
  listIndexes: (schema?: string) => Promise<string[]>;
  /** DuckDB has no triggers; always empty. Kept so schema-refresh code can
   *  call either engine unconditionally. */
  listTriggers: () => Promise<string[]>;
  listSequences: (schema?: string) => Promise<string[]>;
  listColumns: (name: string, schema?: string) => Promise<TableColumnInfo[]>;
  listForeignKeys: (name: string, schema?: string) => Promise<ForeignKeyInfo[]>;
  getColumnConstraintInfo: (tableName: string, schema?: string) => Promise<ColumnConstraintInfo[]>;
  createTable: (name: string, columns: ColumnSpec[]) => Promise<void>;
  rebuildTable: (spec: TableRebuildSpec) => Promise<void>;
  dropEntity: (
    name: string,
    kind: "table" | "view" | "index" | "trigger" | "sequence",
    schema?: string,
  ) => Promise<void>;
  truncateTable: (name: string, schema?: string) => Promise<void>;
  getDDL: (name: string, schema?: string) => Promise<string>;
  deleteRows: (
    tableName: string,
    pkColumns: string[],
    pkRows: ReadonlyArray<ReadonlyArray<unknown>>,
    schema?: string,
  ) => Promise<number>;
  updateRows: (
    tableName: string,
    updates: ReadonlyArray<{
      rowIndex: number;
      column: string;
      value: unknown;
      /** Identify the row by primary-key value(s) instead of rowid offset. */
      pk?: ReadonlyArray<{ column: string; value: unknown }>;
    }>,
    schema?: string,
  ) => Promise<number>;
  insertRow: (
    tableName: string,
    columnNames: string[],
    values: unknown[],
    schema?: string,
  ) => Promise<void>;
  /** Register a file's bytes with DuckDB's virtual filesystem
   *  (queryable via `read_csv_auto`, `read_parquet`, …). */
  registerFileBuffer: (name: string, buffer: Uint8Array) => Promise<void>;
  /** Bytes of a previously registered file, or null if unregistered or
   *  the WASM build lacks `copyFileToBuffer`. */
  readFileBuffer: (name: string) => Promise<Uint8Array | null>;
  /** Remove a file from the virtual filesystem. Safe on unregistered names. */
  dropFile: (name: string) => Promise<void>;
  /** Import a SQL dump as a new blank database. On failure the previous
   *  sample is restored, then the SQL error is rethrown. */
  importSqlDump: (sql: string) => Promise<DuckDbSampleDatabase>;
  /** Binary .duckdb image of the whole catalog — the same bytes the OPFS
   *  snapshot persists. Used for cloud/share bundles. */
  exportBinaryImage: () => Promise<Uint8Array>;
  /** Replace the catalog from a .duckdb image. On failure the previous
   *  sample is restored, mirroring importSqlDump. */
  importBinaryImage: (bytes: Uint8Array) => Promise<DuckDbSampleDatabase>;
  /** Whole-database export as a portable SQL script (CREATE TABLE / INSERT). */
  exportDatabase: () => Promise<{ data: Uint8Array; mimeType: string; suggestedExtension: string }>;
  activeSample: () => DuckDbSampleDatabase;
  runtimeVersion: () => string;
  /** Close the engine's connection. The shared module stays alive across
   *  navigations on purpose; only the per-engine connection is released so
   *  its schema work can't interleave with a freshly created engine. */
  destroy: () => Promise<void>;
}

/** Drop all user objects from the main schema before loading a sample, so
 *  revisits/switches never hit "already exists" errors. Views first, then
 *  tables in iterative passes (CASCADE first, plain DROP for older builds
 *  that reject it) — avoids computing a topological FK order. */
async function cleanDuckDbSchema(conn: DuckDbConnection): Promise<void> {
  async function listNames(sql: string): Promise<string[]> {
    const t = await conn.query(sql);
    const out: string[] = [];
    for (let r = 0; r < t.numRows; r++) {
      const v = t.getChildAt(0)?.get(r);
      if (v != null) out.push(String(v));
    }
    return out;
  }

  async function remainingTables(): Promise<string[]> {
    return listNames(
      `SELECT table_name FROM duckdb_tables() WHERE schema_name = 'main' AND NOT internal`,
    );
  }

  const views = await listNames(
    `SELECT view_name FROM duckdb_views() WHERE schema_name = 'main' AND NOT internal`,
  );
  for (const v of views) {
    try {
      await conn.query(`DROP VIEW IF EXISTS ${quoteIdent(v)} CASCADE`);
    } catch {
      try {
        await conn.query(`DROP VIEW IF EXISTS ${quoteIdent(v)}`);
      } catch {
        /* surface as a remaining-table error below if it matters */
      }
    }
  }

  let remaining = await remainingTables();
  while (remaining.length > 0) {
    const before = remaining.length;
    for (const t of remaining) {
      try {
        await conn.query(`DROP TABLE IF EXISTS ${quoteIdent(t)} CASCADE`);
      } catch {
        try {
          await conn.query(`DROP TABLE IF EXISTS ${quoteIdent(t)}`);
        } catch {
          // Still has dependents, leave it for the next pass.
        }
      }
    }
    remaining = await remainingTables();
    if (remaining.length >= before) {
      // No progress (circular FKs or silent DROP failures): drop each
      // table's FK constraints individually and retry once.
      for (const t of remaining) {
        const safe = t.replace(/'/g, "''");
        const fks = await listNames(
          `SELECT constraint_name FROM duckdb_constraints() WHERE schema_name = 'main' AND table_name = '${safe}' AND constraint_type = 'FOREIGN KEY' AND constraint_name IS NOT NULL`,
        );
        for (const fk of fks) {
          try {
            await conn.query(
              `ALTER TABLE ${quoteIdent(t)} DROP CONSTRAINT ${quoteIdent(fk)}`,
            );
          } catch {
            /* ignore, final DROP TABLE will surface a useful error */
          }
        }
      }
      for (const t of remaining) {
        try {
          await conn.query(`DROP TABLE IF EXISTS ${quoteIdent(t)}`);
        } catch {
          /* will be reported below */
        }
      }
      remaining = await remainingTables();
      if (remaining.length > 0) {
        throw new Error(
          `Failed to clear DuckDB catalog: tables still present after cleanup: ${remaining.join(", ")}`,
        );
      }
      break;
    }
  }

  const seqs = await listNames(
    `SELECT sequence_name FROM duckdb_sequences() WHERE schema_name = 'main'`,
  );
  for (const s of seqs) {
    try {
      await conn.query(`DROP SEQUENCE IF EXISTS ${quoteIdent(s)}`);
    } catch {
      /* ignore, sample SQL would re-create any name conflicts explicitly */
    }
  }
}

// Bootstraps share one module-level catalog, so two concurrent bootstraps
// (StrictMode double-effects, rapid database switches) can interleave
// cleanup/create steps and produce "already exists" errors. This promise
// chain queues them to run one at a time.
let _bootstrapChain: Promise<unknown> = Promise.resolve();

async function bootstrapDatabase(
  sample: DuckDbSampleDatabase,
  db: AsyncDuckDB,
): Promise<DuckDbConnection> {
  const run = async (): Promise<DuckDbConnection> => {
    // Download remote payloads before the cleanup step so a failed
    // download leaves the current catalog intact.
    const seedSql = sample.remoteSql
      ? await fetchDatasetText(sample.remoteSql)
      : sample.sql;
    const remoteFiles = await Promise.all(
      (sample.remoteFiles ?? []).map(async (file) => ({
        name: file.registerAs ?? datasetFileName(file.path),
        bytes: await fetchDatasetBytes(file.path),
      })),
    );
    const conn = await db.connect();
    // Force consistent timestamp formatting for reproducible output.
    await conn.query("SET TimeZone='UTC'");
    await cleanDuckDbSchema(conn);
    for (const { name, bytes } of remoteFiles) {
      // Drop any same-named file first (re-register throws). Hand DuckDB a
      // copy: the buffer is transferred to its worker, which would detach
      // the module-level bytes cache.
      try {
        await db.dropFile?.(name);
      } catch {
        /* not registered yet */
      }
      await db.registerFileBuffer(name, bytes.slice());
    }
    if (seedSql && seedSql.trim()) {
      const stmts = splitDuckDbStatements(seedSql);
      for (const stmt of stmts) {
        await conn.query(stmt);
      }
    }
    return conn;
  };
  const next = _bootstrapChain.then(run, run);
  // Swallow rejection on the chain so one failed bootstrap doesn't poison
  // subsequent calls; the error still reaches the caller via `next`.
  _bootstrapChain = next.catch(() => undefined);
  return next;
}

export async function createDuckDbEngine(
  initialSampleId: string,
  workspaceId?: string | null,
  onProgress?: (fraction: number) => void,
): Promise<DuckDbEngine> {
  let sample = findDuckDbSampleDatabase(initialSampleId);
  // Learn blocks (no workspaceId) get an isolated instance so they can't
  // clobber each other's catalog; the Playground keeps the singleton.
  const isolated = !workspaceId;
  const { db } = await getDuckDbInstance(isolated, onProgress);
  let conn = await bootstrapDatabase(sample, db);
  let destroyed = false;

  // ─── OPFS persistence ───────────────────────────────────────────────
  // DuckDB-Wasm has no native OPFS VFS, so persistence is periodic
  // snapshot-and-restore against the workspace's OPFS `db/duckdb.db`;
  // databaseStorage.writeDatabase debounces and flushes on pagehide.
  const DUCKDB_FILE = "duckdb.db";
  let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  let snapshotInFlight = false;
  let snapshotPending = false;

  async function takeSnapshot(): Promise<void> {
    if (!workspaceId || destroyed) return;
    if (snapshotInFlight) {
      snapshotPending = true;
      return;
    }
    snapshotInFlight = true;
    try {
      const bytes = await exportAsBinaryInternal();
      if (!destroyed) {
        const { writeDatabase } = await import("../opfs/databaseStorage");
        writeDatabase(workspaceId, DUCKDB_FILE, bytes);
      }
    } catch {
      // Snapshots are best-effort; the in-memory DB is still intact.
    } finally {
      snapshotInFlight = false;
      if (snapshotPending) {
        snapshotPending = false;
        scheduleSnapshot(0);
      }
    }
  }

  function scheduleSnapshot(delayMs = 1500): void {
    if (!workspaceId) return;
    if (snapshotTimer) clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => {
      snapshotTimer = null;
      void takeSnapshot();
    }, delayMs);
  }

  /** Run a pending snapshot now instead of waiting out its debounce.
   *
   *  Without this the database was simply not persisted: `writeDatabase`
   *  flushes on pagehide, but a snapshot taken 1.5s after the statement had
   *  not called it yet, so a reload within that window found nothing to
   *  restore and silently dropped every user-created table. Uploaded files go
   *  straight to `writeDatabase`, which is why those survived and made the
   *  loss look arbitrary. */
  function flushPendingSnapshot(): void {
    if (!workspaceId || destroyed) return;
    if (snapshotTimer) {
      clearTimeout(snapshotTimer);
      snapshotTimer = null;
    }
    void takeSnapshot().then(async () => {
      const { flushDatabaseWrites } = await import("../opfs/databaseStorage");
      await flushDatabaseWrites();
    });
  }

  // `visibilitychange` fires before `pagehide` on a reload, which buys the
  // snapshot the most time; both are registered because neither is reliable
  // alone across browsers.
  const onHide = () => {
    if (typeof document === "undefined" || document.visibilityState === "hidden") {
      flushPendingSnapshot();
    }
  };
  if (typeof window !== "undefined" && workspaceId) {
    window.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
  }

  /** Snapshot helper outside the engine surface (usable during construction
   *  and destroy): ATTACH a temp VFS file, COPY FROM DATABASE, read bytes. */
  async function exportAsBinaryInternal(): Promise<Uint8Array> {
    if (!db.copyFileToBuffer) {
      throw new Error("This DuckDB-Wasm build does not support binary file export.");
    }
    const exportFile = "_playground_snapshot_tmp.duckdb";
    const alias = "_playground_snapshot_alias";
    await db.registerFileBuffer(exportFile, new Uint8Array());
    try {
      await conn.query(`ATTACH '${exportFile}' AS ${quoteIdent(alias)}`);
      await conn.query(`COPY FROM DATABASE memory TO ${quoteIdent(alias)}`);
      await conn.query(`DETACH ${quoteIdent(alias)}`);
      return await db.copyFileToBuffer(exportFile);
    } finally {
      try {
        await conn.query(`DETACH ${quoteIdent(alias)}`);
      } catch {
        /* already detached */
      }
      try {
        await db.dropFile?.(exportFile);
      } catch {
        /* ignore */
      }
    }
  }

  /** Restore a saved snapshot, replacing the freshly-bootstrapped sample
   *  data. Failure leaves the sample data intact. */
  async function restoreFromOpfs(): Promise<boolean> {
    if (!workspaceId) return false;
    try {
      const { readDatabase } = await import("../opfs/databaseStorage");
      const bytes = await readDatabase(workspaceId, DUCKDB_FILE);
      if (!bytes || bytes.byteLength === 0) return false;
      const importFile = "_playground_restore_tmp.duckdb";
      const alias = "_playground_restore_alias";
      await db.registerFileBuffer(importFile, bytes);
      try {
        await cleanDuckDbSchema(conn);
        await conn.query(
          `ATTACH '${importFile}' AS ${quoteIdent(alias)} (READ_ONLY)`,
        );
        await conn.query(`COPY FROM DATABASE ${quoteIdent(alias)} TO memory`);
        await conn.query(`DETACH ${quoteIdent(alias)}`);
        return true;
      } finally {
        try {
          await conn.query(`DETACH ${quoteIdent(alias)}`);
        } catch {
          /* ignore */
        }
        try {
          await db.dropFile?.(importFile);
        } catch {
          /* ignore */
        }
      }
    } catch {
      return false;
    }
  }

  if (workspaceId) {
    const restored = await restoreFromOpfs();
    if (!restored) {
      // First visit: take an initial snapshot so the file exists next time.
      scheduleSnapshot(0);
    }
    // Queue a fresh snapshot by pagehide; databaseStorage flushes it.
    if (typeof window !== "undefined") {
      const flushHandler = () => {
        // Fire-and-forget: pagehide doesn't await.
        void takeSnapshot();
      };
      window.addEventListener("pagehide", flushHandler);
      window.addEventListener("visibilitychange", flushHandler);
    }
  }

  async function rowsFor(sql: string, params?: unknown[]): Promise<unknown[][]> {
    let prepared = sql;
    if (params && params.length > 0) {
      // Inlining literals is acceptable here: every call site passes
      // trusted identifiers from the catalog.
      let out = "";
      let pIdx = 0;
      for (let i = 0; i < sql.length; i++) {
        const c = sql[i];
        if (c === "?" && pIdx < params.length) {
          const v = params[pIdx++];
          if (v === null || v === undefined) {
            out += "NULL";
          } else if (typeof v === "number" || typeof v === "bigint") {
            out += String(v);
          } else {
            out += `'${String(v).replace(/'/g, "''")}'`;
          }
        } else {
          out += c;
        }
      }
      prepared = out;
    }
    const table = await conn.query(prepared);
    const fields = table.schema.fields;
    const vectors = fields.map((_f, i) => table.getChildAt(i));
    const result: unknown[][] = [];
    for (let r = 0; r < table.numRows; r++) {
      const row: unknown[] = new Array(fields.length);
      for (let c = 0; c < fields.length; c++) {
        const vec = vectors[c];
        row[c] = vec ? vec.get(r) : null;
      }
      result.push(row);
    }
    return result;
  }

  // Run a statement with positional `?` parameters so user values reach
  // DuckDB as typed params, never hand-built literals. Closes the statement.
  async function runParams(
    sql: string,
    params: unknown[],
  ): Promise<DuckDbArrowTable> {
    const stmt = await conn.prepare(sql);
    try {
      return await stmt.query(...params.map(toBindParam));
    } finally {
      try {
        await stmt.close();
      } catch {
        /* ignore */
      }
    }
  }

  const engine: DuckDbEngine = {
    async loadSampleDatabase(id) {
      const target = findDuckDbSampleDatabase(id);
      const next = await bootstrapDatabase(target, db);
      if (destroyed) {
        // Unmounted mid-switch: close the orphaned connection, don't adopt it.
        try {
          await next.close();
        } catch {
          /* ignore */
        }
        return sample;
      }
      sample = target;
      try {
        await conn.close();
      } catch {
        /* ignore */
      }
      conn = next;
      return sample;
    },

    async loadBlankDatabase() {
      const next = await bootstrapDatabase(DUCKDB_BLANK_DATABASE, db);
      if (destroyed) {
        try {
          await next.close();
        } catch {
          /* ignore */
        }
        return sample;
      }
      sample = DUCKDB_BLANK_DATABASE;
      try {
        await conn.close();
      } catch {
        /* ignore */
      }
      conn = next;
      return sample;
    },

    async importSqlDump(sql) {
      // The import can't be sandboxed (connections share one instance):
      // bootstrap a blank schema, try the SQL, restore the sample on failure.
      const previousSample = sample;
      const next = await bootstrapDatabase(DUCKDB_BLANK_DATABASE, db);
      try {
        const stmts = splitDuckDbStatements(sql);
        for (const stmt of stmts) {
          await next.query(stmt);
        }
      } catch (err) {
        try {
          await next.close();
        } catch {
          /* ignore */
        }
        const restored = await bootstrapDatabase(previousSample, db);
        try {
          await conn.close();
        } catch {
          /* ignore */
        }
        conn = restored;
        sample = previousSample;
        throw err;
      }
      try {
        await conn.close();
      } catch {
        /* ignore */
      }
      conn = next;
      sample = DUCKDB_BLANK_DATABASE;
      return sample;
    },

    async exportBinaryImage() {
      return exportAsBinaryInternal();
    },

    async importBinaryImage(bytes) {
      // Same sandboxing caveat as importSqlDump.
      const previousSample = sample;
      const importFile = "_playground_bundle_import_tmp.duckdb";
      const alias = "_playground_bundle_import_alias";
      const next = await bootstrapDatabase(DUCKDB_BLANK_DATABASE, db);
      try {
        await db.registerFileBuffer(importFile, bytes);
        try {
          await next.query(
            `ATTACH '${importFile}' AS ${quoteIdent(alias)} (READ_ONLY)`,
          );
          await next.query(`COPY FROM DATABASE ${quoteIdent(alias)} TO memory`);
          await next.query(`DETACH ${quoteIdent(alias)}`);
        } finally {
          try {
            await next.query(`DETACH ${quoteIdent(alias)}`);
          } catch {
            /* already detached */
          }
          try {
            await db.dropFile?.(importFile);
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        try {
          await next.close();
        } catch {
          /* ignore */
        }
        const restored = await bootstrapDatabase(previousSample, db);
        try {
          await conn.close();
        } catch {
          /* ignore */
        }
        conn = restored;
        sample = previousSample;
        throw err;
      }
      try {
        await conn.close();
      } catch {
        /* ignore */
      }
      conn = next;
      sample = DUCKDB_BLANK_DATABASE;
      // Persist now so a reload doesn't resurrect the pre-restore snapshot.
      scheduleSnapshot(0);
      return sample;
    },

    async exec(sql) {
      const stmts = splitDuckDbStatements(sql);
      const out: (QueryExecResult | null)[] = [];
      for (const stmt of stmts) {
        const table = await conn.query(stmt);
        out.push(arrowToQueryExecResult(table));
      }
      // Queue an OPFS snapshot (debounced) after every user-driven exec.
      scheduleSnapshot();
      return out;
    },

    async execParams(sql, params) {
      const rows = await rowsFor(sql, params);
      // Re-run via plain query to capture columns/types (0 rows for pure DML).
      const table = await conn.query(sql.replace(/\?/g, "NULL"));
      const result = arrowToQueryExecResult(table);
      if (!result) return [];
      return [
        {
          columns: result.columns,
          values: rows.map((row) => row.map((v) => toSqlValue(v))),
        },
      ];
    },

    async execPaged(sql, pageSize, offset) {
      const base = sql.replace(/\s*;+\s*$/, "");
      let totalCount = 0;
      try {
        const countRows = await rowsFor(
          `SELECT COUNT(*) FROM (${base}) AS __dataslope_count`,
        );
        const raw = countRows[0]?.[0];
        totalCount =
          typeof raw === "bigint" ? Number(raw) : Number(raw ?? 0);
      } catch {
        totalCount = 0;
      }
      const safePageSize = Math.max(1, pageSize);
      const safeOffset = Math.max(0, offset);
      const pageStmts = await engine.exec(
        `${base} LIMIT ${safePageSize} OFFSET ${safeOffset}`,
      );
      const result = pageStmts.filter(
        (r): r is QueryExecResult => r !== null,
      );
      if (totalCount === 0) totalCount = result[0]?.values.length ?? 0;
      return { result, totalCount };
    },

    async listSchemas(includeSystem = false) {
      // No NOT internal filter: in DuckDB-WASM the default "main" schema has
      // internal = TRUE and would be silently excluded.
      const rows = await rowsFor(
        `SELECT schema_name FROM duckdb_schemas()
         WHERE database_name = current_database()
         ORDER BY schema_name`,
      );
      const found = rows.map((r) => String(r[0]));
      // Virtual schemas have no catalog row in the WASM build; add explicitly.
      const virtualSystemSchemas = ["information_schema", "pg_catalog"];
      if (includeSystem) {
        for (const sys of virtualSystemSchemas) {
          if (!found.includes(sys)) found.push(sys);
        }
        found.sort();
        return found;
      }
      const systemSet = new Set(virtualSystemSchemas);
      return found.filter((s) => !systemSet.has(s) && !s.startsWith("pg_"));
    },

    async createSchema(name) {
      await conn.query(`CREATE SCHEMA ${quoteIdent(name)}`);
    },

    async listTables(schema = "main") {
      const safe = schema.replace(/'/g, "''");
      const rows = await rowsFor(
        `SELECT table_name FROM duckdb_tables() WHERE schema_name = '${safe}' AND NOT internal ORDER BY table_name`,
      );
      return rows.map((r) => String(r[0]));
    },

    async listViews(schema = "main") {
      const safe = schema.replace(/'/g, "''");
      // System-schema views are all internal = TRUE; drop the filter there.
      const isSystemSchema =
        schema === "information_schema" || schema.startsWith("pg_");
      const rows = await rowsFor(
        `SELECT view_name FROM duckdb_views() WHERE schema_name = '${safe}'${isSystemSchema ? "" : " AND NOT internal"} ORDER BY view_name`,
      );
      return rows.map((r) => String(r[0]));
    },

    async listIndexes(schema = "main") {
      const safe = schema.replace(/'/g, "''");
      const rows = await rowsFor(
        `SELECT index_name FROM duckdb_indexes() WHERE schema_name = '${safe}' ORDER BY index_name`,
      );
      return rows.map((r) => String(r[0]));
    },

    async listTriggers() {
      // DuckDB has no triggers.
      return [];
    },

    async listSequences(schema = "main") {
      const safe = schema.replace(/'/g, "''");
      const rows = await rowsFor(
        `SELECT sequence_name FROM duckdb_sequences() WHERE schema_name = '${safe}' ORDER BY sequence_name`,
      );
      return rows.map((r) => String(r[0]));
    },

    async listColumns(name, schema = "main") {
      const safe = name.replace(/'/g, "''");
      const safeSch = schema.replace(/'/g, "''");
      const rows = await rowsFor(
        `SELECT
           column_index,
           column_name,
           data_type,
           is_nullable,
           column_default
         FROM duckdb_columns()
         WHERE schema_name = '${safeSch}' AND table_name = '${safe}'
         ORDER BY column_index`,
      );
      // PK and UNIQUE columns come from duckdb_constraints, not per-column
      // flags. One query covers both, so `unique` costs no extra round trip.
      const constraintRows = await rowsFor(
        `SELECT constraint_type, constraint_column_names
         FROM duckdb_constraints()
         WHERE schema_name = '${safeSch}'
           AND table_name = '${safe}'
           AND constraint_type IN ('PRIMARY KEY', 'UNIQUE')`,
      );
      const pkRow = constraintRows.find(
        (row) => String(row[0]).toUpperCase() === "PRIMARY KEY",
      );
      const pkCols = parseConstraintColumnNames(pkRow?.[1]);
      const uniqueCols = new Set(
        constraintRows
          .filter((row) => String(row[0]).toUpperCase() === "UNIQUE")
          .flatMap((row) => parseConstraintColumnNames(row[1])),
      );
      return rows.map((row) => {
        const colName = String(row[1]);
        const pkIndex = pkCols.indexOf(colName);
        const def = row[4];
        const defStr = def == null ? null : String(def);
        const isGenerated = false; // duckdb_columns() does not surface generation_expression in all builds
        const dataType = String(row[2] ?? "");
        return {
          cid: Number(row[0]),
          name: colName,
          type: dataType,
          notNull: String(row[3]).toLowerCase() === "false",
          defaultValue: defStr,
          pk: pkIndex >= 0 ? pkIndex + 1 : 0,
          generated: isGenerated
            ? { expression: "", storageType: "STORED" as const }
            : null,
          enumValues: parseDuckDbEnumValues(dataType),
          unique: uniqueCols.has(colName),
        };
      });
    },

    async listForeignKeys(name, schema = "main") {
      const safe = name.replace(/'/g, "''");
      const safeSch = schema.replace(/'/g, "''");
      const rows = await rowsFor(
        `SELECT
           constraint_column_names,
           referenced_table,
           referenced_column_names
         FROM duckdb_constraints()
         WHERE schema_name = '${safeSch}'
           AND table_name = '${safe}'
           AND constraint_type = 'FOREIGN KEY'`,
      );
      const out: ForeignKeyInfo[] = [];
      for (const row of rows) {
        const fromCols = Array.isArray(row[0])
          ? (row[0] as unknown[]).map(String)
          : [String(row[0] ?? "")];
        const toCols = Array.isArray(row[2])
          ? (row[2] as unknown[]).map(String)
          : [String(row[2] ?? "")];
        const refTable = String(row[1] ?? "");
        for (let i = 0; i < fromCols.length; i++) {
          out.push({
            from: fromCols[i],
            table: refTable,
            to: toCols[i] ?? toCols[0] ?? "",
            // DuckDB exposes no action info; NO ACTION matches its runtime.
            onDelete: "NO ACTION",
            onUpdate: "NO ACTION",
          });
        }
      }
      return out;
    },

    async getColumnConstraintInfo(tableName, schema = "main") {
      // `listColumns` already resolves the UNIQUE columns from
      // duckdb_constraints, so this needs no query of its own.
      const cols = await engine.listColumns(tableName, schema);
      return cols.map((col) => {
        const isAutoIncrement =
          /nextval\(/i.test(col.defaultValue ?? "") ||
          /^GENERATED\b/i.test(col.defaultValue ?? "");
        return {
          name: col.name,
          isPrimaryKey: col.pk > 0,
          isAutoIncrement,
          isUnique: col.unique === true,
          autoPopulated:
            isAutoIncrement || defaultGeneratesUniqueValue(col.defaultValue),
          type: col.type,
          notNull: col.notNull,
          defaultValue: col.defaultValue,
        };
      });
    },

    async createTable(name, columns) {
      const finalName = name.trim();
      if (!finalName) throw new Error("Table name cannot be empty.");
      const filtered = columns
        .filter((col) => col.name.trim())
        .map((col) => ({
          ...col,
          name: col.name.trim(),
          type: (col.type || "INTEGER").trim(),
        }));
      if (filtered.length === 0)
        throw new Error("A table must have at least one column.");
      // Validate identity columns sit on integer-family types.
      for (const col of filtered) {
        if (
          col.autoIncrement &&
          !IDENTITY_TYPES.has(col.type.toLowerCase().split("(")[0].trim())
        ) {
          throw new Error(
            `Column "${col.name}" must use an integer type for IDENTITY.`,
          );
        }
      }
      const sql = renderDuckDbCreateTable(finalName, filtered);
      await conn.query(sql);
    },

    async rebuildTable(spec) {
      const finalName = spec.newName.trim();
      if (!finalName) throw new Error("Table name cannot be empty.");
      const columns = spec.columns
        .filter((col) => col.name.trim())
        .map((col) => ({
          ...col,
          name: col.name.trim(),
          type: (col.type || "INTEGER").trim(),
        }));
      if (columns.length === 0)
        throw new Error("A table must have at least one column.");

      const renameMap = new Map<string, string>();
      for (const col of columns) {
        if (col.originalName && col.originalName !== col.name) {
          renameMap.set(col.originalName, col.name);
        }
      }
      const patched =
        renameMap.size > 0
          ? columns.map((col) => {
              if (!col.generated) return col;
              let expr = col.generated.expression;
              for (const [oldName, newName] of renameMap) {
                expr = expr.replace(
                  new RegExp(
                    `\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                    "g",
                  ),
                  newName,
                );
              }
              return expr === col.generated.expression
                ? col
                : { ...col, generated: { ...col.generated, expression: expr } };
            })
          : columns;

      const tmpName = `${spec.originalName}__tmp_rebuild_${++duckRebuildCounter}`;
      const createSql = renderDuckDbCreateTable(tmpName, patched);
      const copyable = patched.filter(
        (col) => col.originalName && !col.generated,
      );
      const targetCols = copyable.map((col) => quoteIdent(col.name)).join(", ");
      const sourceCols = copyable
        .map((col) => quoteIdent(col.originalName!))
        .join(", ");
      try {
        await conn.query("BEGIN TRANSACTION");
        await conn.query(createSql);
        if (copyable.length > 0) {
          await conn.query(
            `INSERT INTO ${quoteIdent(tmpName)} (${targetCols}) SELECT ${sourceCols} FROM ${quoteIdent(spec.originalName)}`,
          );
        }
        await conn.query(`DROP TABLE ${quoteIdent(spec.originalName)}`);
        await conn.query(
          `ALTER TABLE ${quoteIdent(tmpName)} RENAME TO ${quoteIdent(finalName)}`,
        );
        await conn.query("COMMIT");
      } catch (err) {
        try {
          await conn.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw err;
      }
    },

    async dropEntity(name, kind, schema = "main") {
      if (kind === "trigger") {
        // No-op rather than generating bad DDL (UI never offers this).
        return;
      }
      const keyword =
        kind === "table"
          ? "TABLE"
          : kind === "view"
            ? "VIEW"
            : kind === "index"
              ? "INDEX"
              : "SEQUENCE";
      await conn.query(`DROP ${keyword} IF EXISTS ${quoteIdent(schema)}.${quoteIdent(name)}`);
    },

    async truncateTable(name, schema = "main") {
      await conn.query(`DELETE FROM ${quoteIdent(schema)}.${quoteIdent(name)}`);
    },

    async getDDL(name, schema = "main") {
      // Prefer the catalog's own DDL; it round-trips generated columns,
      // defaults, and constraints faithfully.
      const safe = name.replace(/'/g, "''");
      const safeSch = schema.replace(/'/g, "''");
      try {
        const tableRows = await rowsFor(
          `SELECT sql FROM duckdb_tables() WHERE schema_name = '${safeSch}' AND table_name = '${safe}' AND sql IS NOT NULL`,
        );
        if (tableRows.length > 0 && tableRows[0][0]) {
          return `${String(tableRows[0][0]).replace(/;\s*$/, "")};`;
        }
      } catch {
        /* fall through */
      }
      try {
        const viewRows = await rowsFor(
          `SELECT sql FROM duckdb_views() WHERE schema_name = '${safeSch}' AND view_name = '${safe}' AND sql IS NOT NULL`,
        );
        if (viewRows.length > 0 && viewRows[0][0]) {
          return `${String(viewRows[0][0]).replace(/;\s*$/, "")};`;
        }
      } catch {
        /* fall through */
      }
      try {
        const indexRows = await rowsFor(
          `SELECT sql FROM duckdb_indexes() WHERE schema_name = '${safeSch}' AND index_name = '${safe}' AND sql IS NOT NULL`,
        );
        if (indexRows.length > 0 && indexRows[0][0]) {
          return `${String(indexRows[0][0]).replace(/;\s*$/, "")};`;
        }
      } catch {
        /* fall through */
      }
      // Reconstruct from columns + FKs as a fallback.
      const [cols, fks] = await Promise.all([
        engine.listColumns(name, schema),
        engine.listForeignKeys(name, schema),
      ]);
      if (cols.length === 0) return "";
      const lines = cols.map((col) => {
        if (col.generated) {
          return `  ${quoteIdent(col.name)} ${col.type} GENERATED ALWAYS AS (${col.generated.expression}) STORED`;
        }
        const parts = [quoteIdent(col.name), col.type];
        if (col.notNull) parts.push("NOT NULL");
        if (col.defaultValue) parts.push(`DEFAULT ${col.defaultValue}`);
        return `  ${parts.join(" ")}`;
      });
      const pk = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
      if (pk.length > 0) {
        lines.push(
          `  PRIMARY KEY (${pk.map((c) => quoteIdent(c.name)).join(", ")})`,
        );
      }
      for (const fk of fks) {
        lines.push(
          `  FOREIGN KEY (${quoteIdent(fk.from)}) REFERENCES ${quoteIdent(fk.table)}(${quoteIdent(fk.to)})`,
        );
      }
      return `CREATE TABLE ${quoteIdent(name)} (\n${lines.join(",\n")}\n);`;
    },

    async deleteRows(tableName, pkColumns, pkRows, schema = "main") {
      const qualifiedTable = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;
      let deleted = 0;
      for (const row of pkRows) {
        const params: unknown[] = [];
        const where = pkColumns
          .map((col, i) => {
            const v = row[i];
            if (v === null || v === undefined) {
              return `${quoteIdent(col)} IS NULL`;
            }
            params.push(v);
            return `${quoteIdent(col)} = ?`;
          })
          .join(" AND ");
        const before = await runParams(
          `SELECT COUNT(*) FROM ${qualifiedTable} WHERE ${where}`,
          params,
        );
        const matched = Number(before.getChildAt(0)?.get(0) ?? 0);
        await runParams(`DELETE FROM ${qualifiedTable} WHERE ${where}`, params);
        deleted += matched;
      }
      return deleted;
    },

    async updateRows(tableName, updates, schema = "main") {
      // Prefers the PK-aware path; falls back to rowid offset for PK-less
      // tables. Values are bound as parameters so DuckDB casts them to the
      // target column type.
      const qualifiedTable = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;
      let count = 0;
      for (const update of updates) {
        // A LIST/array value can't be bound in DuckDB-Wasm; inline it as a
        // list literal. Everything else stays a bound parameter.
        const isArr = Array.isArray(update.value);
        const setExpr = isArr
          ? `${quoteIdent(update.column)} = ${toDuckDbListLiteral(update.value as unknown[])}`
          : `${quoteIdent(update.column)} = ?`;
        const setParams = isArr ? [] : [update.value];
        if (update.pk && update.pk.length > 0) {
          const where = update.pk
            .map((p) => `${quoteIdent(p.column)} = ?`)
            .join(" AND ");
          await runParams(
            `UPDATE ${qualifiedTable}
             SET ${setExpr}
             WHERE ${where}`,
            [...setParams, ...update.pk.map((p) => p.value)],
          );
        } else {
          // rowIndex is a trusted integer, inlined because DuckDB doesn't
          // accept a bound parameter in OFFSET.
          const offset = Math.trunc(Number(update.rowIndex)) || 0;
          await runParams(
            `UPDATE ${qualifiedTable}
             SET ${setExpr}
             WHERE rowid = (
               SELECT rowid FROM ${qualifiedTable}
               ORDER BY rowid
               LIMIT 1 OFFSET ${offset}
             )`,
            setParams,
          );
        }
        count += 1;
      }
      return count;
    },

    async insertRow(tableName, columnNames, values, schema = "main") {
      const qualified = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;
      if (columnNames.length === 0) {
        await conn.query(`INSERT INTO ${qualified} DEFAULT VALUES`);
        return;
      }
      const cols = columnNames.map(quoteIdent).join(", ");
      // Bound parameters: DuckDB casts each to its column type.
      const placeholders = values.map(() => "?").join(", ");
      await runParams(
        `INSERT INTO ${qualified} (${cols}) VALUES (${placeholders})`,
        values,
      );
    },

    async registerFileBuffer(name, buffer) {
      await db.registerFileBuffer(name, buffer);
    },

    async readFileBuffer(name) {
      if (!db.copyFileToBuffer) return null;
      try {
        return await db.copyFileToBuffer(name);
      } catch {
        return null;
      }
    },

    async dropFile(name) {
      try {
        await db.dropFile?.(name);
      } catch {
        /* unregistered already, ignore */
      }
    },

    async exportDatabase() {
      // In-memory builds have no binary dump that round-trips via OPEN;
      // emit a portable CREATE TABLE / INSERT script instead.
      const out: string[] = [];
      const tables = await engine.listTables();
      for (const tbl of tables) {
        const ddl = await engine.getDDL(tbl);
        if (ddl) out.push(`-- Table: ${tbl}\n${ddl}\n`);
        const rowsTable = await conn.query(
          `SELECT * FROM ${quoteIdent(tbl)}`,
        );
        const cols = rowsTable.schema.fields.map((f) => f.name);
        const colList = cols.map(quoteIdent).join(", ");
        const vectors = rowsTable.schema.fields.map((_f, i) =>
          rowsTable.getChildAt(i),
        );
        for (let r = 0; r < rowsTable.numRows; r++) {
          const literals = vectors
            .map((vec) => {
              const v = vec ? vec.get(r) : null;
              if (v === null || v === undefined) return "NULL";
              if (typeof v === "number") return String(v);
              if (typeof v === "bigint") return v.toString();
              if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
              if (v instanceof Date) return `'${v.toISOString()}'`;
              return `'${String(v).replace(/'/g, "''")}'`;
            })
            .join(", ");
          out.push(
            `INSERT INTO ${quoteIdent(tbl)} (${colList}) VALUES (${literals});`,
          );
        }
        out.push("");
      }
      const views = await engine.listViews();
      for (const v of views) {
        const ddl = await engine.getDDL(v);
        if (ddl) out.push(`-- View: ${v}\n${ddl}\n`);
      }
      const text = out.join("\n");
      const encoder = new TextEncoder();
      return {
        data: encoder.encode(text),
        mimeType: "application/sql",
        suggestedExtension: ".duckdb.sql",
      };
    },

    activeSample() {
      return sample;
    },

    runtimeVersion() {
      return DUCKDB_VERSION;
    },

    async destroy() {
      if (destroyed) return;
      if (typeof window !== "undefined" && workspaceId) {
        window.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("pagehide", onHide);
      }
      if (snapshotTimer) {
        clearTimeout(snapshotTimer);
        snapshotTimer = null;
        // A pending snapshot is the user's most recent work; take it before
        // tearing the connection down rather than dropping it.
        try {
          await takeSnapshot();
        } catch {
          /* best effort */
        }
      }
      destroyed = true;
      try {
        await conn.close();
      } catch {
        /* ignore */
      }
      // Isolated learn instances own their worker; terminate it so a page
      // of SQL blocks doesn't leak a worker + WASM heap per block.
      if (isolated) {
        try {
          await db.terminate();
        } catch {
          /* ignore */
        }
      }
    },
  };

  // Wrap catalog-mutating methods to queue an OPFS snapshot on completion
  // (`exec` already does this inline), keeping the policy in one place.
  if (workspaceId) {
    const MUTATING_METHODS: readonly (keyof DuckDbEngine)[] = [
      "loadSampleDatabase",
      "loadBlankDatabase",
      "importSqlDump",
      "rebuildTable",
      "dropEntity",
      "truncateTable",
      "deleteRows",
      "updateRows",
      "insertRow",
    ];
    for (const key of MUTATING_METHODS) {
      const original = engine[key] as unknown as (
        ...args: unknown[]
      ) => Promise<unknown>;
      (engine as unknown as Record<string, unknown>)[key as string] = async (
        ...args: unknown[]
      ): Promise<unknown> => {
        const result = await original.apply(engine, args);
        scheduleSnapshot();
        return result;
      };
    }
  }

  return engine;
}

export { splitDuckDbStatements };
