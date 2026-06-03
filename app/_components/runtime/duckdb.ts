// DuckDB engine wrapper for the DuckDB Playground.
//
// The `@duckdb/duckdb-wasm` npm package is currently flagged in the
// GitHub Advisory Database (an overly broad duplicate of GHSA-w62p-hx95-gf2c
// — only 1.29.2 was actually compromised; 1.30.0+ are clean upstream).
// To avoid the advisory entirely while still shipping the playground,
// this module loads DuckDB-Wasm dynamically from jsDelivr at runtime,
// the same pattern this repo already uses for `parquet-wasm` and
// `wasm-xlsxwriter`. A minimal local type shim covers the small API
// surface the engine actually touches.
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
import {
  toDateOnlyString,
  unscaledDecimalToString,
  unscaledIntegerFrom,
} from "./valueFormat";

// ─── Local type shim for @duckdb/duckdb-wasm ─────────────────────────
// Only the small surface area we actually touch is typed. The shim
// matches the public AsyncDuckDB / AsyncDuckDBConnection API as of
// duckdb-wasm 1.30+, which is API-stable for these fields.

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
  /** Arrow DataType — Decimal fields additionally expose `scale` (integer). */
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
  instantiate(mainModule: string, pthreadWorker?: string | null): Promise<void>;
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
// The DuckDB-Wasm bundle (~5–10 MB) is downloaded once per page load
// and cached by the browser. The promise is memoized so navigating
// away and back doesn't re-fetch the module.

export const DUCKDB_VERSION = "1.32.0";
const DUCKDB_CDN = `https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${DUCKDB_VERSION}/+esm`;

let _duckdbModulePromise: Promise<DuckDbModule> | null = null;

async function loadDuckDbModule(): Promise<DuckDbModule> {
  if (!_duckdbModulePromise) {
    _duckdbModulePromise = (async () => {
      // The magic comments tell webpack/turbopack to leave this URL
      // alone instead of trying to resolve it at build time.
      const mod = (await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ DUCKDB_CDN
      )) as DuckDbModule;
      return mod;
    })();
  }
  return _duckdbModulePromise;
}

let _dbPromise: Promise<{ db: AsyncDuckDB; bundle: DuckDbBundle }> | null =
  null;

async function getDuckDbInstance(): Promise<{
  db: AsyncDuckDB;
  bundle: DuckDbBundle;
}> {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const duckdb = await loadDuckDbModule();
      const bundles = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(bundles);
      // Bundlers can't always resolve the worker URL, so we wrap the
      // worker script in a Blob — the standard duckdb-wasm pattern.
      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], {
          type: "text/javascript",
        }),
      );
      const worker = new Worker(workerUrl);
      const logger = new duckdb.VoidLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      URL.revokeObjectURL(workerUrl);
      return { db, bundle };
    })();
  }
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
  // Apache Arrow returns DECIMAL values as `Decimal` instances whose
  // `toString()` produces the canonical numeric string (e.g. "950.00").
  // Without this branch they fall through to JSON.stringify, which wraps
  // the result in literal `"` characters — those then leak into the
  // result table and break re-inserts (e.g. duplicate row → DuckDB sees
  // '"950"' and can't coerce it to DECIMAL).
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
  // Arrow vector elements for STRUCT/LIST/MAP arrive as plain JS
  // objects/arrays; serialize them so the table renderer can show them
  // as text rather than `[object Object]`.
  try {
    return JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    );
  } catch {
    return String(value);
  }
}

/** Normalize a JS value for binding as a DuckDB prepared-statement parameter
 *  (UX-17). Replaces the old quote-escaped string-concatenation path used by
 *  the row-mutation methods, so values flow to DuckDB as typed parameters that
 *  it casts to the target column — instead of as VARCHAR literals that could
 *  mis-cast (e.g. a numeric column silently receiving text) or, for values
 *  with quotes, require fragile manual escaping.
 *
 *  Cell-edit values are string/number/boolean/null; primary-key values read
 *  back from a result set may also be `bigint` (DuckDB BIGINT) or `Date`. The
 *  binder accepts the scalars and bigint directly; `Date` is sent as an ISO
 *  string DuckDB casts back to a timestamp, and any other object/array (e.g. a
 *  STRUCT/LIST display value) falls back to its string form. */
export function toBindParam(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (value !== null && typeof value === "object") return String(value);
  return value;
}

/** Parse the allowed labels out of a DuckDB enum `data_type` string.
 *  `duckdb_columns()` reports an enum column's type as the full inline
 *  definition, e.g. `ENUM('sad', 'ok', 'happy')`. Labels are single-quoted
 *  with `''` escaping an embedded quote. Returns the labels in order, or
 *  `null` when the string isn't an enum definition (the common case). */
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
    if (body[i] !== "'") return null; // malformed — bail rather than guess
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

function arrowToQueryExecResult(
  table: DuckDbArrowTable,
): (QueryExecResult & { columnTypes?: string[] }) | null {
  const fields = table.schema.fields;
  if (fields.length === 0) return null;
  const columns = fields.map((f) => f.name);
  const columnTypes = fields.map((f) => {
    try {
      return String(f.type);
    } catch {
      return "";
    }
  });
  // Extract decimal scales so DECIMAL values are formatted as proper decimal
  // strings (e.g. unscaled 2999 with scale=2 → "29.99") instead of the raw
  // unscaled integer (which would otherwise display as 2999 and round-trip to
  // the wrong magnitude when the user edits and re-saves a cell).
  const columnScales: (number | null)[] = fields.map((f) => {
    if (typeof f.type.scale === "number" && f.type.scale > 0) {
      return f.type.scale;
    }
    return null;
  });
  // DATE columns (Arrow `Date32<DAY>`/`Date64`) arrive as an epoch number;
  // render them as a plain `YYYY-MM-DD` calendar date rather than a raw int.
  const columnIsDate: boolean[] = fields.map((f) =>
    /^date/i.test(String(f.type)),
  );
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
      } else if (scale !== null) {
        // Arrow stores DECIMAL(p,s) as the unscaled integer — a BigInt in some
        // builds, a Decimal object whose String() is the unscaled integer in
        // duckdb-wasm. Re-apply the scale in both cases.
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

/** Split a multi-statement SQL string into individual statements that
 *  DuckDB can execute one at a time. DuckDB-Wasm's `conn.query()` only
 *  accepts a single statement, so the engine has to do this itself.
 *
 *  The splitter walks the input character by character, tracking string
 *  literals (single-quoted, with `''` escapes), identifier quotes, line
 *  comments (`--` … EOL), block comments (`/* … *\/`), and dollar-quoted
 *  string bodies (`$tag$ … $tag$`). Semicolons inside any of those
 *  contexts are treated as ordinary characters. */
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
    // DuckDB only supports STORED generated columns. The `storageType`
    // hint from `ColumnSpec` is intentionally ignored so the same form
    // can drive both engines without producing invalid VIRTUAL DDL.
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
    // DuckDB supports REFERENCES but currently ignores ON DELETE /
    // ON UPDATE actions silently. We still emit them so the playground
    // UI captures intent and the DDL round-trips through SQLite/Postgres
    // engines without losing information.
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
  /** DuckDB has no triggers; this always resolves to an empty array.
   *  Kept on the interface so the playground's schema-refresh code can
   *  call `listTriggers()` on either engine without conditional branches. */
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
      /** When present, identifies the target row by primary-key value(s)
       *  instead of the rowid offset — robust to display reordering. */
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
  /** Register a file's bytes with DuckDB's virtual filesystem so it
   *  can be queried via `read_csv_auto`, `read_parquet`, `read_json_auto`, … */
  registerFileBuffer: (name: string, buffer: Uint8Array) => Promise<void>;
  /** Read the bytes of a previously registered virtual-filesystem file
   *  (e.g. so the user can download it). Returns null if the file isn't
   *  registered or the WASM build lacks `copyFileToBuffer`. */
  readFileBuffer: (name: string) => Promise<Uint8Array | null>;
  /** Remove a file from DuckDB's virtual filesystem. Safe to call on a
   *  name that wasn't registered. */
  dropFile: (name: string) => Promise<void>;
  /** Try to import a SQL dump as a new blank database. If any statement
   *  fails partway through, restores the previously active sample so the
   *  user's database is never left in a half-populated state. Throws the
   *  underlying SQL error after a successful restore. */
  importSqlDump: (sql: string) => Promise<DuckDbSampleDatabase>;
  /** Whole-database export as a portable multi-statement SQL script
   *  (CREATE TABLE / INSERT statements) that round-trips through any
   *  DuckDB instance. */
  exportDatabase: () => Promise<{ data: Uint8Array; mimeType: string; suggestedExtension: string }>;
  activeSample: () => DuckDbSampleDatabase;
  runtimeVersion: () => string;
  /** Close the engine's current connection. The shared DuckDB-Wasm module
   *  is kept alive across navigations on purpose (its WASM bundle is large
   *  and the browser already cached it), but the per-engine connection
   *  must be released when the playground component unmounts so its
   *  schema work cannot interleave with a freshly created engine. */
  destroy: () => Promise<void>;
}

/** Drop all user-defined objects from the main schema.
 *  Called before loading any sample so that revisiting the page or
 *  switching samples never hits "Table with name … already exists!" errors.
 *
 *  Views are dropped first (they may depend on tables). Tables are then
 *  dropped iteratively: each pass attempts to drop every remaining table
 *  and re-queries the catalog to see which are left, looping until either
 *  none remain or no progress is made (in which case the catalog is in an
 *  unexpected state and we surface a clear error). Each drop tries CASCADE
 *  first — DuckDB 1.30+ honours it, and falls back to a plain DROP TABLE
 *  if an older WASM build rejects the keyword — so a table referenced by
 *  FKs from other tables still in the catalog can be dropped without
 *  having to compute a topological order. */
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
          // Still has dependents — leave it for the next pass.
        }
      }
    }
    remaining = await remainingTables();
    if (remaining.length >= before) {
      // No progress: either every remaining table has a circular FK
      // dependency or DROP TABLE is silently leaving them behind. Drop
      // each table's foreign-key constraints individually and retry one
      // last time so the next bootstrap doesn't hit a stale catalog.
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
            /* ignore — final DROP TABLE will surface a useful error */
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
      /* ignore — sample SQL would re-create any name conflicts explicitly */
    }
  }
}

// All bootstrap operations share the same module-level DuckDB instance, which
// means their schema-cleanup and CREATE-TABLE statements run against a single
// catalog. Two concurrent bootstraps — e.g. an in-flight engine load whose
// component unmounted and a fresh engine load from the next mount, or
// React StrictMode's double-invoked effect, or two rapid database switches —
// can interleave their cleanup and create steps and produce
// "Table with name 'customers' already exists" errors. The promise chain
// below queues every bootstrap so they execute one at a time.
let _bootstrapChain: Promise<unknown> = Promise.resolve();

async function bootstrapDatabase(
  sample: DuckDbSampleDatabase,
): Promise<DuckDbConnection> {
  const run = async (): Promise<DuckDbConnection> => {
    const { db } = await getDuckDbInstance();
    const conn = await db.connect();
    // Force consistent timestamp formatting for reproducible output.
    await conn.query("SET TimeZone='UTC'");
    // Clear any previously loaded sample so that revisiting the page or
    // switching samples never hits "Table with name … already exists!" errors.
    await cleanDuckDbSchema(conn);
    if (sample.sql && sample.sql.trim()) {
      const stmts = splitDuckDbStatements(sample.sql);
      for (const stmt of stmts) {
        await conn.query(stmt);
      }
    }
    return conn;
  };
  const next = _bootstrapChain.then(run, run);
  // Swallow rejection on the chain itself so a single failed bootstrap
  // doesn't poison every subsequent call. The original error still reaches
  // the caller via `next`.
  _bootstrapChain = next.catch(() => undefined);
  return next;
}

export async function createDuckDbEngine(
  initialSampleId: string,
  workspaceId?: string | null,
): Promise<DuckDbEngine> {
  let sample = findDuckDbSampleDatabase(initialSampleId);
  let conn = await bootstrapDatabase(sample);
  let destroyed = false;

  // ─── OPFS persistence (Phase 4) ─────────────────────────────────────
  // DuckDB-Wasm has no native OPFS VFS, so persistence is implemented
  // via periodic snapshot-and-restore against the workspace's
  // `db/duckdb.db` file in OPFS. Snapshots are produced by
  // `exportAsBinaryInternal` (ATTACH + COPY FROM DATABASE) and queued
  // through `databaseStorage.writeDatabase`, which debounces writes and
  // flushes on `pagehide` / `visibilitychange`.
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

  /** Inline snapshot helper that doesn't go through the engine surface
   *  (so it stays available when the engine is being constructed and
   *  during `destroy`). ATTACHes a temporary virtual-filesystem file,
   *  copies the whole catalog via `COPY FROM DATABASE`, and reads the
   *  bytes back out for OPFS persistence. */
  async function exportAsBinaryInternal(): Promise<Uint8Array> {
    const { db } = await getDuckDbInstance();
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

  /** Restore a previously-saved snapshot into the freshly-bootstrapped
   *  connection. The connection has already had `sample.sql` applied
   *  by `bootstrapDatabase`; we wipe that and replace it with the
   *  snapshot's contents. Failure leaves the sample data intact. */
  async function restoreFromOpfs(): Promise<boolean> {
    if (!workspaceId) return false;
    try {
      const { readDatabase } = await import("../opfs/databaseStorage");
      const bytes = await readDatabase(workspaceId, DUCKDB_FILE);
      if (!bytes || bytes.byteLength === 0) return false;
      const { db } = await getDuckDbInstance();
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
      // No snapshot yet (first visit) — keep the sample data and take
      // an initial snapshot so the file exists for next time.
      scheduleSnapshot(0);
    }
    // Best-effort flush on tab close.  databaseStorage already flushes
    // pending writes on `pagehide`; we only need to make sure a fresh
    // snapshot has been *queued* by that point.
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
      // duckdb-wasm's AsyncDuckDBConnection only exposes positional
      // parameters via prepared statements; for the small handful of
      // internal catalog queries we issue, inlining literal values is
      // acceptable because every call site passes trusted, validated
      // identifiers (table/column names from the catalog).
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

  // Run a statement through a DuckDB prepared statement, binding values as
  // positional `?` parameters (UX-17). Used by the row-mutation methods so
  // user/result-set values reach DuckDB as typed params it casts to the target
  // column, never as hand-built SQL literals. Always closes the statement.
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
      const next = await bootstrapDatabase(target);
      if (destroyed) {
        // The component unmounted while this switch was in flight. Don't
        // adopt the new connection — close it so the orphaned bootstrap
        // doesn't outlive the engine.
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
      const next = await bootstrapDatabase(DUCKDB_BLANK_DATABASE);
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
      // DuckDB-Wasm shares a single underlying instance across connections,
      // so any "fresh" connection sees the same schema. We can't sandbox
      // the import; the best we can do is bootstrap a blank schema, try
      // the SQL there, and restore the previous sample if it fails.
      const previousSample = sample;
      const next = await bootstrapDatabase(DUCKDB_BLANK_DATABASE);
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
        const restored = await bootstrapDatabase(previousSample);
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

    async exec(sql) {
      const stmts = splitDuckDbStatements(sql);
      const out: (QueryExecResult | null)[] = [];
      for (const stmt of stmts) {
        const table = await conn.query(stmt);
        out.push(arrowToQueryExecResult(table));
      }
      // Queue an OPFS snapshot after every user-driven exec. The
      // helper debounces, so a burst of statements only produces one
      // write.
      scheduleSnapshot();
      return out;
    },

    async execParams(sql, params) {
      const rows = await rowsFor(sql, params);
      // Re-run via plain query to capture columns / types from the
      // result set. For pure DML this returns 0 rows, which is fine.
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
      // Query without NOT internal — in DuckDB-WASM the default "main" schema
      // has internal = TRUE, so the filter would silently exclude it.
      const rows = await rowsFor(
        `SELECT schema_name FROM duckdb_schemas()
         WHERE database_name = current_database()
         ORDER BY schema_name`,
      );
      const found = rows.map((r) => String(r[0]));
      // Virtual schemas (information_schema, pg_catalog) have no catalog row
      // in the WASM in-memory build — add them explicitly.
      const virtualSystemSchemas = ["information_schema", "pg_catalog"];
      if (includeSystem) {
        for (const sys of virtualSystemSchemas) {
          if (!found.includes(sys)) found.push(sys);
        }
        found.sort();
        return found;
      }
      // When hiding system schemas, exclude known system schema names.
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
      // System schemas (information_schema, pg_catalog) only contain views
      // that are marked internal = TRUE. Drop the NOT internal filter so
      // they appear in the sidebar when the user selects one of those schemas.
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
      // Intentionally empty — DuckDB has no triggers. See module
      // header comment in DuckDbPlayground.tsx for context.
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
      // DuckDB exposes PK columns via duckdb_constraints rather than
      // a per-column flag. Resolve them in a second query and merge.
      const pkRows = await rowsFor(
        `SELECT constraint_column_names
         FROM duckdb_constraints()
         WHERE schema_name = '${safeSch}'
           AND table_name = '${safe}'
           AND constraint_type = 'PRIMARY KEY'
         LIMIT 1`,
      );
      const pkCols: string[] = (() => {
        const v = pkRows[0]?.[0];
        // `constraint_column_names` is a VARCHAR[]. Depending on the WASM
        // bridge it arrives as a JS array, an Arrow `Vector` (object, iterable
        // — NOT `Array.isArray`), or a stringified list `["product_id"]` whose
        // elements keep their quotes. Normalise all three, stripping brackets
        // and per-element quotes, so names match the column list.
        let raw: unknown[] = [];
        if (Array.isArray(v)) raw = v;
        else if (typeof v === "string")
          raw = v.replace(/^\[|\]$/g, "").split(/,\s*/);
        else if (
          v != null &&
          typeof (v as { [Symbol.iterator]?: unknown })[Symbol.iterator] ===
            "function"
        )
          raw = Array.from(v as Iterable<unknown>);
        return raw
          .map((x) => String(x).trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      })();
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
            // DuckDB does not currently expose action info; default
            // to NO ACTION which matches its runtime behaviour.
            onDelete: "NO ACTION",
            onUpdate: "NO ACTION",
          });
        }
      }
      return out;
    },

    async getColumnConstraintInfo(tableName, schema = "main") {
      const cols = await engine.listColumns(tableName, schema);
      const safe = tableName.replace(/'/g, "''");
      const safeSch = schema.replace(/'/g, "''");
      const uniqueRows = await rowsFor(
        `SELECT constraint_column_names
         FROM duckdb_constraints()
         WHERE schema_name = '${safeSch}'
           AND table_name = '${safe}'
           AND constraint_type = 'UNIQUE'`,
      );
      const unique = new Set<string>();
      for (const row of uniqueRows) {
        const v = row[0];
        if (Array.isArray(v)) v.forEach((x) => unique.add(String(x)));
        else if (typeof v === "string")
          v.replace(/^\[|\]$/g, "")
            .split(/,\s*/)
            .filter(Boolean)
            .forEach((x) => unique.add(x));
      }
      return cols.map((col) => ({
        name: col.name,
        isPrimaryKey: col.pk > 0,
        isAutoIncrement:
          /nextval\(/i.test(col.defaultValue ?? "") ||
          /^GENERATED\b/i.test(col.defaultValue ?? ""),
        isUnique: unique.has(col.name),
      }));
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
        // Defensive — the playground UI never offers this for DuckDB,
        // but make the call a no-op instead of generating bad DDL.
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
      // Try the catalog's own pretty-printed DDL first — it round-trips
      // generated columns, defaults, and constraints faithfully.
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
      // DuckDB has no `rowid` and provides no implicit row identifier;
      // the playground's PK-aware update path is preferred. As a
      // fallback for PKless tables we use a CTID-style emulation via
      // ROW_NUMBER() OVER () over a stable ordering of the table.
      //
      // Values are bound as prepared-statement parameters (UX-17) rather than
      // concatenated as SQL literals: DuckDB casts each param to the target
      // column type (so a numeric column edited via a text input no longer
      // receives a VARCHAR), and strings with quotes need no manual escaping.
      const qualifiedTable = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;
      let count = 0;
      for (const update of updates) {
        if (update.pk && update.pk.length > 0) {
          // Primary-key identification: stable regardless of display order.
          const where = update.pk
            .map((p) => `${quoteIdent(p.column)} = ?`)
            .join(" AND ");
          await runParams(
            `UPDATE ${qualifiedTable}
             SET ${quoteIdent(update.column)} = ?
             WHERE ${where}`,
            [update.value, ...update.pk.map((p) => p.value)],
          );
        } else {
          // `rowIndex` is a trusted integer we computed, so it stays inlined
          // (DuckDB doesn't accept a bound parameter in OFFSET).
          const offset = Math.trunc(Number(update.rowIndex)) || 0;
          await runParams(
            `UPDATE ${qualifiedTable}
             SET ${quoteIdent(update.column)} = ?
             WHERE rowid = (
               SELECT rowid FROM ${qualifiedTable}
               ORDER BY rowid
               LIMIT 1 OFFSET ${offset}
             )`,
            [update.value],
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
      // Bind values as parameters (UX-17) so DuckDB casts each to its column
      // type and quoted strings need no manual escaping.
      const placeholders = values.map(() => "?").join(", ");
      await runParams(
        `INSERT INTO ${qualified} (${cols}) VALUES (${placeholders})`,
        values,
      );
    },

    async registerFileBuffer(name, buffer) {
      const { db } = await getDuckDbInstance();
      await db.registerFileBuffer(name, buffer);
    },

    async readFileBuffer(name) {
      const { db } = await getDuckDbInstance();
      if (!db.copyFileToBuffer) return null;
      try {
        return await db.copyFileToBuffer(name);
      } catch {
        return null;
      }
    },

    async dropFile(name) {
      const { db } = await getDuckDbInstance();
      try {
        await db.dropFile?.(name);
      } catch {
        /* unregistered already — ignore */
      }
    },

    async exportDatabase() {
      // DuckDB-Wasm in-memory builds don't expose a compact binary
      // dump that round-trips back through `OPEN`. Generate a SQL
      // script of CREATE TABLE / INSERT statements as a portable
      // fallback. This isn't a 1:1 binary clone but it round-trips
      // through any DuckDB instance.
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
      destroyed = true;
      if (snapshotTimer) {
        clearTimeout(snapshotTimer);
        snapshotTimer = null;
      }
      try {
        await conn.close();
      } catch {
        /* ignore */
      }
    },
  };

  // Wrap engine methods that can mutate the DuckDB catalog so they
  // queue an OPFS snapshot on completion. `exec` already does this
  // inline; the methods below are catalog/admin operations that bypass
  // user-typed SQL. Wrapping them centrally keeps the OPFS persistence
  // policy in one place rather than scattered through each method body.
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
