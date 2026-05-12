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
  DUCKDB_BLANK_DATABASE,
  findDuckDbSampleDatabase,
  type DuckDbSampleDatabase,
} from "./duckdbSamples";

type DuckDbModule = {
  AsyncDuckDB: new (logger: unknown, worker: Worker) => DuckDbDatabase;
  ConsoleLogger: new () => unknown;
  selectBundle: (bundles: unknown) => Promise<DuckDbBundle>;
  getJsDelivrBundles: () => unknown;
};

type DuckDbBundle = {
  mainModule: string;
  mainWorker?: string | null;
  pthreadWorker?: string | null;
};

type DuckDbDatabase = {
  instantiate: (mainModule: string, pthreadWorker?: string | null) => Promise<unknown>;
  connect: () => Promise<DuckDbConnection>;
  registerFileBuffer: (name: string, buffer: Uint8Array) => Promise<void>;
  terminate: () => Promise<void>;
};

type ArrowLikeTable = {
  schema: { fields: Array<{ name: string; type?: { toString(): string } }> };
  numRows: number;
  getChildAt: (index: number) => { get: (row: number) => unknown } | null | undefined;
};

type PreparedStatement = {
  query: (...params: unknown[]) => Promise<ArrowLikeTable>;
  close: () => Promise<void>;
};

type DuckDbConnection = {
  query: (sql: string) => Promise<ArrowLikeTable>;
  prepare: (sql: string) => Promise<PreparedStatement>;
  close: () => Promise<void>;
};

const DUCKDB_MODULE_URL = "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/+esm";
let duckDbModulePromise: Promise<DuckDbModule> | null = null;
let duckDbInstancePromise: Promise<DuckDbDatabase> | null = null;
let duckDbFileCounter = 0;
let duckDbRebuildCounter = 0;

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function quoteString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function toSqlValue(value: unknown): SqlValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "bigint") return value.toString();
  return String(value);
}

function arrowToResult(table: ArrowLikeTable): QueryExecResult | null {
  const columns = table.schema.fields.map((field) => field.name);
  if (columns.length === 0) return null;
  const columnTypes = table.schema.fields.map((field) => field.type?.toString?.() ?? "");
  const values: QueryExecResult["values"] = [];
  for (let r = 0; r < table.numRows; r += 1) {
    values.push(columns.map((_, c) => toSqlValue(table.getChildAt(c)?.get(r))));
  }
  return { columns, columnTypes, values } as QueryExecResult & {
    columnTypes: string[];
  };
}

async function loadDuckDbModule(): Promise<DuckDbModule> {
  if (!duckDbModulePromise) {
    duckDbModulePromise = import(/* webpackIgnore: true */ DUCKDB_MODULE_URL) as Promise<DuckDbModule>;
  }
  return duckDbModulePromise;
}

async function getDuckDbInstance(): Promise<DuckDbDatabase> {
  if (!duckDbInstancePromise) {
    duckDbInstancePromise = (async () => {
      const duckdb = await loadDuckDbModule();
      const bundles = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(bundles);
      if (!bundle.mainWorker) throw new Error("DuckDB WASM worker bundle is unavailable.");
      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts(${JSON.stringify(bundle.mainWorker)});`], {
          type: "text/javascript",
        }),
      );
      const worker = new Worker(workerUrl);
      const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker ?? null);
      URL.revokeObjectURL(workerUrl);
      return db;
    })().catch((err) => {
      duckDbInstancePromise = null;
      throw err;
    });
  }
  return duckDbInstancePromise;
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let cur = "";
  let quote: "'" | '"' | "`" | null = null;
  let lineComment = false;
  let blockComment = false;
  let dollarTag: string | null = null;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (lineComment) {
      cur += ch;
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      cur += ch;
      if (ch === "*" && next === "/") {
        cur += next;
        i += 1;
        blockComment = false;
      }
      continue;
    }
    if (dollarTag) {
      cur += ch;
      if (sql.startsWith(dollarTag, i)) {
        cur += dollarTag.slice(1);
        i += dollarTag.length - 1;
        dollarTag = null;
      }
      continue;
    }
    if (quote) {
      cur += ch;
      if (ch === quote) {
        if (next === quote) {
          cur += next;
          i += 1;
        } else {
          quote = null;
        }
      } else if (ch === "\\" && quote !== "`" && next) {
        cur += next;
        i += 1;
      }
      continue;
    }
    if (ch === "-" && next === "-") {
      cur += ch + next;
      i += 1;
      lineComment = true;
      continue;
    }
    if (ch === "/" && next === "*") {
      cur += ch + next;
      i += 1;
      blockComment = true;
      continue;
    }
    if (ch === "$") {
      const rest = sql.slice(i);
      const match = rest.match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        cur += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === ";") {
      const trimmed = cur.trim();
      if (trimmed) statements.push(trimmed);
      cur = "";
      continue;
    }
    cur += ch;
  }
  const trimmed = cur.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

function renderDuckDbType(col: ColumnSpec): string {
  const type = (col.type || "VARCHAR").trim();
  if (col.autoIncrement) return `${type} GENERATED BY DEFAULT AS IDENTITY`;
  return type;
}

function renderDuckDbColumnDef(col: ColumnSpec): string {
  const name = quoteIdent(col.name);
  const type = renderDuckDbType(col);
  if (col.generated) {
    return `${name} ${type} GENERATED ALWAYS AS (${col.generated.expression}) STORED`;
  }
  const parts = [name, type];
  if (col.notNull) parts.push("NOT NULL");
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  if (col.defaultValue && !col.autoIncrement) parts.push(`DEFAULT ${col.defaultValue}`);
  return parts.join(" ");
}

function renderDuckDbCreateTable(name: string, columns: ColumnSpec[]): string {
  const defs = columns.map((col) => `  ${renderDuckDbColumnDef(col)}`);
  const pk = columns.filter((col) => col.primaryKey);
  if (pk.length > 0) defs.push(`  PRIMARY KEY (${pk.map((col) => quoteIdent(col.name)).join(", ")})`);
  for (const col of columns) {
    if (!col.foreignKey?.table || !col.foreignKey.column) continue;
    defs.push(`  FOREIGN KEY (${quoteIdent(col.name)}) REFERENCES ${quoteIdent(col.foreignKey.table)}(${quoteIdent(col.foreignKey.column)})`);
  }
  return `CREATE TABLE ${quoteIdent(name)} (\n${defs.join(",\n")}\n)`;
}

async function createFreshConnection(sample: DuckDbSampleDatabase): Promise<DuckDbConnection> {
  const db = await getDuckDbInstance();
  const conn = await db.connect();
  if (sample.sql.trim()) {
    for (const statement of splitSqlStatements(sample.sql)) await conn.query(statement);
  }
  return conn;
}

export interface DuckDbEngine {
  loadSampleDatabase: (id: string) => Promise<DuckDbSampleDatabase>;
  loadBlankDatabase: () => Promise<DuckDbSampleDatabase>;
  exec: (sql: string) => Promise<(QueryExecResult | null)[]>;
  execParams: (sql: string, params: unknown[]) => Promise<QueryExecResult[]>;
  execPaged: (sql: string, pageSize: number, offset: number) => Promise<{ result: QueryExecResult[]; totalCount: number }>;
  listTables: () => Promise<string[]>;
  listViews: () => Promise<string[]>;
  listIndexes: () => Promise<string[]>;
  listTriggers: () => Promise<string[]>;
  listColumns: (name: string) => Promise<TableColumnInfo[]>;
  listForeignKeys: (name: string) => Promise<ForeignKeyInfo[]>;
  getColumnConstraintInfo: (tableName: string) => Promise<ColumnConstraintInfo[]>;
  createTable: (name: string, columns: ColumnSpec[]) => Promise<void>;
  rebuildTable: (spec: TableRebuildSpec) => Promise<void>;
  dropEntity: (name: string, kind: "table" | "view" | "index" | "trigger") => Promise<void>;
  truncateTable: (name: string) => Promise<void>;
  getDDL: (name: string) => Promise<string>;
  deleteRows: (tableName: string, pkColumns: string[], pkRows: ReadonlyArray<ReadonlyArray<unknown>>) => Promise<number>;
  updateRows: (tableName: string, updates: ReadonlyArray<{ rowIndex: number; column: string; value: unknown }>) => Promise<number>;
  insertRow: (tableName: string, columnNames: string[], values: unknown[]) => Promise<void>;
  registerFileBuffer: (name: string, bytes: Uint8Array) => Promise<string>;
  activeSample: () => DuckDbSampleDatabase;
}

export async function createDuckDbEngine(initialSampleId: string): Promise<DuckDbEngine> {
  let sample = findDuckDbSampleDatabase(initialSampleId);
  let conn = await createFreshConnection(sample);

  async function queryRows<T extends Record<string, unknown> = Record<string, unknown>>(sql: string): Promise<T[]> {
    const result = arrowToResult(await conn.query(sql));
    if (!result) return [];
    return result.values.map((row) => Object.fromEntries(result.columns.map((col, i) => [col, row[i]])) as T);
  }

  async function runPrepared(sql: string, params: unknown[]): Promise<QueryExecResult[]> {
    const stmt = await conn.prepare(sql);
    try {
      const result = arrowToResult(await stmt.query(...params));
      return result ? [result] : [];
    } finally {
      await stmt.close();
    }
  }

  const engine: DuckDbEngine = {
    async loadSampleDatabase(id) {
      sample = findDuckDbSampleDatabase(id);
      const next = await createFreshConnection(sample);
      await conn.close();
      conn = next;
      return sample;
    },
    async loadBlankDatabase() {
      sample = DUCKDB_BLANK_DATABASE;
      const next = await createFreshConnection(sample);
      await conn.close();
      conn = next;
      return sample;
    },
    async exec(sql) {
      const statements = splitSqlStatements(sql);
      const results: (QueryExecResult | null)[] = [];
      for (const statement of statements) results.push(arrowToResult(await conn.query(statement)));
      return results;
    },
    async execParams(sql, params) {
      return runPrepared(sql, params);
    },
    async execPaged(sql, pageSize, offset) {
      const base = sql.replace(/\s*;+\s*$/, "");
      let totalCount = 0;
      try {
        const rows = await queryRows<{ count: string | number }>(`SELECT COUNT(*) AS count FROM (${base}) AS __dataslope_count`);
        totalCount = Number(rows[0]?.count ?? 0);
      } catch {
        totalCount = 0;
      }
      const raw = await engine.exec(`${base} LIMIT ${Math.max(1, pageSize)} OFFSET ${Math.max(0, offset)}`);
      const result = raw.filter((r): r is QueryExecResult => r !== null);
      if (totalCount === 0) totalCount = result[0]?.values.length ?? 0;
      return { result, totalCount };
    },
    async listTables() {
      const rows = await queryRows<{ table_name: string }>(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE' ORDER BY table_name`);
      return rows.map((row) => row.table_name);
    },
    async listViews() {
      const rows = await queryRows<{ table_name: string }>(`SELECT table_name FROM information_schema.views WHERE table_schema = 'main' ORDER BY table_name`);
      return rows.map((row) => row.table_name);
    },
    async listIndexes() {
      try {
        const rows = await queryRows<{ index_name: string }>(`SELECT index_name FROM duckdb_indexes() WHERE schema_name = 'main' ORDER BY index_name`);
        return rows.map((row) => row.index_name);
      } catch {
        return [];
      }
    },
    async listTriggers() {
      // DuckDB does not support triggers; the DuckDB UI omits the Triggers section.
      return [];
    },
    async listColumns(name) {
      const rows = await queryRows<{ ordinal_position: number; column_name: string; data_type: string; is_nullable: string; column_default: string | null }>(
        `SELECT ordinal_position, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'main' AND table_name = ${quoteString(name)} ORDER BY ordinal_position`,
      );
      const constraints = await engine.getColumnConstraintInfo(name).catch(() => []);
      const pkOrder = new Map(constraints.filter((c) => c.isPrimaryKey).map((c, i) => [c.name, i + 1]));
      return rows.map((row) => ({
        cid: Number(row.ordinal_position) - 1,
        name: row.column_name,
        type: row.data_type,
        notNull: row.is_nullable === "NO",
        defaultValue: row.column_default,
        pk: pkOrder.get(row.column_name) ?? 0,
        generated: null,
      }));
    },
    async listForeignKeys(name) {
      const rows = await queryRows<{ column_name: string; foreign_table_name: string; foreign_column_name: string }>(
        `SELECT kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.table_schema
         WHERE tc.table_schema = 'main' AND tc.table_name = ${quoteString(name)} AND tc.constraint_type = 'FOREIGN KEY'
         ORDER BY kcu.ordinal_position`,
      ).catch(() => []);
      return rows.map((row) => ({ from: row.column_name, table: row.foreign_table_name, to: row.foreign_column_name, onDelete: "NO ACTION", onUpdate: "NO ACTION" }));
    },
    async getColumnConstraintInfo(tableName) {
      const rows = await queryRows<{ column_name: string; constraint_type: string }>(
        `SELECT kcu.column_name, tc.constraint_type
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
         WHERE tc.table_schema = 'main' AND tc.table_name = ${quoteString(tableName)}`,
      ).catch(() => []);
      const grouped = new Map<string, ColumnConstraintInfo>();
      for (const row of rows) {
        const prev = grouped.get(row.column_name) ?? { name: row.column_name, isPrimaryKey: false, isAutoIncrement: false, isUnique: false };
        if (row.constraint_type === "PRIMARY KEY") prev.isPrimaryKey = true;
        if (row.constraint_type === "UNIQUE") prev.isUnique = true;
        grouped.set(row.column_name, prev);
      }
      const cols = await queryRows<{ column_name: string; column_default: string | null }>(
        `SELECT column_name, column_default FROM information_schema.columns WHERE table_schema = 'main' AND table_name = ${quoteString(tableName)} ORDER BY ordinal_position`,
      ).catch(() => []);
      return cols.map((col) => ({
        ...(grouped.get(col.column_name) ?? { name: col.column_name, isPrimaryKey: false, isUnique: false }),
        isAutoIncrement: /identity|nextval/i.test(col.column_default ?? ""),
      }));
    },
    async createTable(name, columns) {
      const finalName = name.trim();
      if (!finalName) throw new Error("Table name cannot be empty.");
      const filtered = columns.filter((col) => col.name.trim()).map((col) => ({ ...col, name: col.name.trim(), type: (col.type || "VARCHAR").trim() }));
      if (filtered.length === 0) throw new Error("A table must have at least one column.");
      await conn.query(renderDuckDbCreateTable(finalName, filtered));
    },
    async rebuildTable(spec) {
      const finalName = spec.newName.trim();
      if (!finalName) throw new Error("Table name cannot be empty.");
      const columns = spec.columns.filter((col) => col.name.trim()).map((col) => ({ ...col, name: col.name.trim(), type: (col.type || "VARCHAR").trim() }));
      if (columns.length === 0) throw new Error("A table must have at least one column.");
      const tmpName = `${spec.originalName}__tmp_rebuild_${++duckDbRebuildCounter}`;
      const copyable = columns.filter((col) => col.originalName && !col.generated);
      try {
        await conn.query("BEGIN TRANSACTION");
        await conn.query(renderDuckDbCreateTable(tmpName, columns));
        if (copyable.length > 0) {
          await conn.query(`INSERT INTO ${quoteIdent(tmpName)} (${copyable.map((c) => quoteIdent(c.name)).join(", ")}) SELECT ${copyable.map((c) => quoteIdent(c.originalName!)).join(", ")} FROM ${quoteIdent(spec.originalName)}`);
        }
        await conn.query(`DROP TABLE ${quoteIdent(spec.originalName)}`);
        await conn.query(`ALTER TABLE ${quoteIdent(tmpName)} RENAME TO ${quoteIdent(finalName)}`);
        await conn.query("COMMIT");
      } catch (err) {
        try { await conn.query("ROLLBACK"); } catch {}
        throw err;
      }
    },
    async dropEntity(name, kind) {
      if (kind === "trigger") throw new Error("DuckDB does not support triggers.");
      const keyword = kind === "table" ? "TABLE" : kind === "view" ? "VIEW" : "INDEX";
      await conn.query(`DROP ${keyword} IF EXISTS ${quoteIdent(name)}`);
    },
    async truncateTable(name) {
      await conn.query(`DELETE FROM ${quoteIdent(name)}`);
    },
    async getDDL(name) {
      const tableRows = await queryRows<{ sql: string }>(`SELECT sql FROM duckdb_tables() WHERE schema_name = 'main' AND table_name = ${quoteString(name)} LIMIT 1`).catch(() => []);
      if (tableRows[0]?.sql) return `${tableRows[0].sql};`;
      const viewRows = await queryRows<{ sql: string }>(`SELECT sql FROM duckdb_views() WHERE schema_name = 'main' AND view_name = ${quoteString(name)} LIMIT 1`).catch(() => []);
      if (viewRows[0]?.sql) return `${viewRows[0].sql};`;
      const indexRows = await queryRows<{ sql: string }>(`SELECT sql FROM duckdb_indexes() WHERE schema_name = 'main' AND index_name = ${quoteString(name)} LIMIT 1`).catch(() => []);
      return indexRows[0]?.sql ? `${indexRows[0].sql};` : "";
    },
    async deleteRows(tableName, pkColumns, pkRows) {
      let deleted = 0;
      for (const row of pkRows) {
        const where = pkColumns.map((column) => `${quoteIdent(column)} = ?`).join(" AND ");
        await runPrepared(`DELETE FROM ${quoteIdent(tableName)} WHERE ${where}`, [...row]);
        deleted += 1;
      }
      return deleted;
    },
    async updateRows() {
      throw new Error("DuckDB inline editing is only supported when a primary-key value is available in the result set; this view cannot be edited safely.");
    },
    async insertRow(tableName, columnNames, values) {
      const cols = columnNames.map(quoteIdent).join(", ");
      const placeholders = columnNames.map(() => "?").join(", ");
      await runPrepared(`INSERT INTO ${quoteIdent(tableName)} (${cols}) VALUES (${placeholders})`, values);
    },
    async registerFileBuffer(name, bytes) {
      const safe = `${++duckDbFileCounter}_${name.replace(/[^A-Za-z0-9_.-]/g, "_")}`;
      const db = await getDuckDbInstance();
      await db.registerFileBuffer(safe, bytes);
      return safe;
    },
    activeSample() {
      return sample;
    },
  };
  return engine;
}
