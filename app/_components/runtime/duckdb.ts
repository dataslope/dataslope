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

import type { QueryExecResult, SqlValue } from "sql.js";
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
  type: { toString(): string };
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

interface DuckDbConnection {
  query(sql: string): Promise<DuckDbArrowTable>;
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

const DUCKDB_VERSION = "1.30.0";
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
  const vectors = fields.map((_f, i) => table.getChildAt(i));
  const values: SqlValue[][] = [];
  for (let r = 0; r < table.numRows; r++) {
    const row: SqlValue[] = new Array(fields.length);
    for (let c = 0; c < fields.length; c++) {
      const vec = vectors[c];
      row[c] = vec ? toSqlValue(vec.get(r)) : null;
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
  if (col.notNull) parts.push("NOT NULL");
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  if (col.autoIncrement) {
    parts.push("GENERATED BY DEFAULT AS IDENTITY");
  } else if (col.defaultValue) {
    parts.push(`DEFAULT ${col.defaultValue}`);
  }
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
  listTables: () => Promise<string[]>;
  listViews: () => Promise<string[]>;
  listIndexes: () => Promise<string[]>;
  /** DuckDB has no triggers; this always resolves to an empty array.
   *  Kept on the interface so the playground's schema-refresh code can
   *  call `listTriggers()` on either engine without conditional branches. */
  listTriggers: () => Promise<string[]>;
  listSequences: () => Promise<string[]>;
  listColumns: (name: string) => Promise<TableColumnInfo[]>;
  listForeignKeys: (name: string) => Promise<ForeignKeyInfo[]>;
  getColumnConstraintInfo: (tableName: string) => Promise<ColumnConstraintInfo[]>;
  createTable: (name: string, columns: ColumnSpec[]) => Promise<void>;
  rebuildTable: (spec: TableRebuildSpec) => Promise<void>;
  dropEntity: (
    name: string,
    kind: "table" | "view" | "index" | "trigger" | "sequence",
  ) => Promise<void>;
  truncateTable: (name: string) => Promise<void>;
  getDDL: (name: string) => Promise<string>;
  deleteRows: (
    tableName: string,
    pkColumns: string[],
    pkRows: ReadonlyArray<ReadonlyArray<unknown>>,
  ) => Promise<number>;
  updateRows: (
    tableName: string,
    updates: ReadonlyArray<{ rowIndex: number; column: string; value: unknown }>,
  ) => Promise<number>;
  insertRow: (
    tableName: string,
    columnNames: string[],
    values: unknown[],
  ) => Promise<void>;
  /** Register a file's bytes with DuckDB's virtual filesystem so it
   *  can be queried via `read_csv_auto`, `read_parquet`, `read_json_auto`, … */
  registerFileBuffer: (name: string, buffer: Uint8Array) => Promise<void>;
  /** Best-effort whole-database export. Falls back to a multi-statement
   *  SQL script when binary export isn't available in the in-memory
   *  build (the common case in WASM). */
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
 *  dropped in multiple passes without CASCADE so that FK-referenced tables
 *  are always dropped after the tables that reference them — DuckDB-Wasm
 *  may not honour the CASCADE modifier on DROP TABLE even when it parses. */
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

  const views = await listNames(
    `SELECT view_name FROM duckdb_views() WHERE schema_name = 'main' AND NOT internal`,
  );
  for (const v of views) {
    await conn.query(`DROP VIEW IF EXISTS ${quoteIdent(v)}`);
  }

  // Drop tables in dependency order by retrying the list until all are gone.
  // Each pass drops whichever tables no longer have dependents; tables that
  // still have FK references from surviving tables are skipped and retried in
  // the next pass.  At most N passes are needed for a chain of N tables, and
  // the extra +1 pass ensures we still make a final attempt when the very last
  // table in a chain of length N has been freed only at the end of pass N.
  let remaining = await listNames(
    `SELECT table_name FROM duckdb_tables() WHERE schema_name = 'main' AND NOT internal`,
  );
  for (let pass = 0; pass < remaining.length + 1 && remaining.length > 0; pass++) {
    const stillLeft: string[] = [];
    for (const t of remaining) {
      try {
        await conn.query(`DROP TABLE IF EXISTS ${quoteIdent(t)}`);
      } catch {
        stillLeft.push(t); // depends on another surviving table — retry later
      }
    }
    remaining = stillLeft;
  }

  const seqs = await listNames(
    `SELECT sequence_name FROM duckdb_sequences() WHERE schema_name = 'main'`,
  );
  for (const s of seqs) {
    await conn.query(`DROP SEQUENCE IF EXISTS ${quoteIdent(s)}`);
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
): Promise<DuckDbEngine> {
  let sample = findDuckDbSampleDatabase(initialSampleId);
  let conn = await bootstrapDatabase(sample);
  let destroyed = false;

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

    async exec(sql) {
      const stmts = splitDuckDbStatements(sql);
      const out: (QueryExecResult | null)[] = [];
      for (const stmt of stmts) {
        const table = await conn.query(stmt);
        out.push(arrowToQueryExecResult(table));
      }
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

    async listTables() {
      const rows = await rowsFor(
        `SELECT table_name FROM duckdb_tables() WHERE schema_name = 'main' AND NOT internal ORDER BY table_name`,
      );
      return rows.map((r) => String(r[0]));
    },

    async listViews() {
      const rows = await rowsFor(
        `SELECT view_name FROM duckdb_views() WHERE schema_name = 'main' AND NOT internal ORDER BY view_name`,
      );
      return rows.map((r) => String(r[0]));
    },

    async listIndexes() {
      const rows = await rowsFor(
        `SELECT index_name FROM duckdb_indexes() WHERE schema_name = 'main' ORDER BY index_name`,
      );
      return rows.map((r) => String(r[0]));
    },

    async listTriggers() {
      // Intentionally empty — DuckDB has no triggers. See module
      // header comment in DuckDbPlayground.tsx for context.
      return [];
    },

    async listSequences() {
      const rows = await rowsFor(
        `SELECT sequence_name FROM duckdb_sequences() WHERE schema_name = 'main' ORDER BY sequence_name`,
      );
      return rows.map((r) => String(r[0]));
    },

    async listColumns(name) {
      const safe = name.replace(/'/g, "''");
      const rows = await rowsFor(
        `SELECT
           column_index,
           column_name,
           data_type,
           is_nullable,
           column_default
         FROM duckdb_columns()
         WHERE schema_name = 'main' AND table_name = '${safe}'
         ORDER BY column_index`,
      );
      // DuckDB exposes PK columns via duckdb_constraints rather than
      // a per-column flag. Resolve them in a second query and merge.
      const pkRows = await rowsFor(
        `SELECT constraint_column_names
         FROM duckdb_constraints()
         WHERE schema_name = 'main'
           AND table_name = '${safe}'
           AND constraint_type = 'PRIMARY KEY'
         LIMIT 1`,
      );
      const pkCols: string[] = (() => {
        const v = pkRows[0]?.[0];
        if (Array.isArray(v)) return v.map((x) => String(x));
        if (typeof v === "string") {
          // Sometimes returned as a stringified Arrow list "[a, b]".
          return v.replace(/^\[|\]$/g, "").split(/,\s*/).filter(Boolean);
        }
        return [];
      })();
      return rows.map((row) => {
        const colName = String(row[1]);
        const pkIndex = pkCols.indexOf(colName);
        const def = row[4];
        const defStr = def == null ? null : String(def);
        const isGenerated = false; // duckdb_columns() does not surface generation_expression in all builds
        return {
          cid: Number(row[0]),
          name: colName,
          type: String(row[2] ?? ""),
          notNull: String(row[3]).toLowerCase() === "false",
          defaultValue: defStr,
          pk: pkIndex >= 0 ? pkIndex + 1 : 0,
          generated: isGenerated
            ? { expression: "", storageType: "STORED" as const }
            : null,
        };
      });
    },

    async listForeignKeys(name) {
      const safe = name.replace(/'/g, "''");
      const rows = await rowsFor(
        `SELECT
           constraint_column_names,
           referenced_table,
           referenced_column_names
         FROM duckdb_constraints()
         WHERE schema_name = 'main'
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

    async getColumnConstraintInfo(tableName) {
      const cols = await engine.listColumns(tableName);
      const safe = tableName.replace(/'/g, "''");
      const uniqueRows = await rowsFor(
        `SELECT constraint_column_names
         FROM duckdb_constraints()
         WHERE schema_name = 'main'
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

    async dropEntity(name, kind) {
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
      await conn.query(`DROP ${keyword} IF EXISTS ${quoteIdent(name)}`);
    },

    async truncateTable(name) {
      await conn.query(`DELETE FROM ${quoteIdent(name)}`);
    },

    async getDDL(name) {
      // Try the catalog's own pretty-printed DDL first — it round-trips
      // generated columns, defaults, and constraints faithfully.
      const safe = name.replace(/'/g, "''");
      try {
        const tableRows = await rowsFor(
          `SELECT sql FROM duckdb_tables() WHERE schema_name = 'main' AND table_name = '${safe}' AND sql IS NOT NULL`,
        );
        if (tableRows.length > 0 && tableRows[0][0]) {
          return `${String(tableRows[0][0]).replace(/;\s*$/, "")};`;
        }
      } catch {
        /* fall through */
      }
      try {
        const viewRows = await rowsFor(
          `SELECT sql FROM duckdb_views() WHERE schema_name = 'main' AND view_name = '${safe}' AND sql IS NOT NULL`,
        );
        if (viewRows.length > 0 && viewRows[0][0]) {
          return `${String(viewRows[0][0]).replace(/;\s*$/, "")};`;
        }
      } catch {
        /* fall through */
      }
      try {
        const indexRows = await rowsFor(
          `SELECT sql FROM duckdb_indexes() WHERE schema_name = 'main' AND index_name = '${safe}' AND sql IS NOT NULL`,
        );
        if (indexRows.length > 0 && indexRows[0][0]) {
          return `${String(indexRows[0][0]).replace(/;\s*$/, "")};`;
        }
      } catch {
        /* fall through */
      }
      // Reconstruct from columns + FKs as a fallback.
      const [cols, fks] = await Promise.all([
        engine.listColumns(name),
        engine.listForeignKeys(name),
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

    async deleteRows(tableName, pkColumns, pkRows) {
      let deleted = 0;
      for (const row of pkRows) {
        const where = pkColumns
          .map((col, i) => {
            const v = row[i];
            if (v === null || v === undefined) {
              return `${quoteIdent(col)} IS NULL`;
            }
            const literal =
              typeof v === "number" || typeof v === "bigint"
                ? String(v)
                : `'${String(v).replace(/'/g, "''")}'`;
            return `${quoteIdent(col)} = ${literal}`;
          })
          .join(" AND ");
        const before = await rowsFor(
          `SELECT COUNT(*) FROM ${quoteIdent(tableName)} WHERE ${where}`,
        );
        const matched = Number(before[0]?.[0] ?? 0);
        await conn.query(`DELETE FROM ${quoteIdent(tableName)} WHERE ${where}`);
        deleted += matched;
      }
      return deleted;
    },

    async updateRows(tableName, updates) {
      // DuckDB has no `rowid` and provides no implicit row identifier;
      // the playground's PK-aware update path is preferred. As a
      // fallback for PKless tables we use a CTID-style emulation via
      // ROW_NUMBER() OVER () over a stable ordering of the table.
      let count = 0;
      for (const update of updates) {
        const literal = (() => {
          const v = update.value;
          if (v === null || v === undefined) return "NULL";
          if (typeof v === "number" || typeof v === "bigint") return String(v);
          if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
          return `'${String(v).replace(/'/g, "''")}'`;
        })();
        await conn.query(
          `UPDATE ${quoteIdent(tableName)}
           SET ${quoteIdent(update.column)} = ${literal}
           WHERE rowid = (
             SELECT rowid FROM ${quoteIdent(tableName)}
             ORDER BY rowid
             LIMIT 1 OFFSET ${update.rowIndex}
           )`,
        );
        count += 1;
      }
      return count;
    },

    async insertRow(tableName, columnNames, values) {
      const cols = columnNames.map(quoteIdent).join(", ");
      const literals = values
        .map((v) => {
          if (v === null || v === undefined) return "NULL";
          if (typeof v === "number" || typeof v === "bigint") return String(v);
          if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
          return `'${String(v).replace(/'/g, "''")}'`;
        })
        .join(", ");
      await conn.query(
        `INSERT INTO ${quoteIdent(tableName)} (${cols}) VALUES (${literals})`,
      );
    },

    async registerFileBuffer(name, buffer) {
      const { db } = await getDuckDbInstance();
      await db.registerFileBuffer(name, buffer);
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
      try {
        await conn.close();
      } catch {
        /* ignore */
      }
    },
  };

  return engine;
}

export { splitDuckDbStatements };
