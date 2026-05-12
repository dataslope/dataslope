"use client";

// DuckDB engine adapter for the DuckDB Playground.
//
// Uses @duckdb/duckdb-wasm (AsyncDuckDB) with CDN bundles from jsDelivr.
// The engine is fully async, mirroring the PostgresEngine interface with
// DuckDB-specific adaptations:
//
//  • No triggers — DuckDB does not support triggers.
//  • No rowid — row updates require primary-key values.
//  • Arrow result format — conn.query() returns Arrow tables; we convert
//    them to QueryExecResult here.
//  • Multi-statement splitting — conn.query() executes one statement at a
//    time; we split on semicolons (with comment awareness) and run them
//    sequentially.
//  • Catalog introspection — uses duckdb_tables(), duckdb_columns(), etc.

import * as duckdb from "@duckdb/duckdb-wasm";
import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
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
import { stripSqlComments } from "../sql/utils/sqlAnalysis";

// ─── DB initialisation (module-level singleton) ───────────────────────────────

let _dbPromise: Promise<AsyncDuckDB> | null = null;

async function getOrCreateDb(): Promise<AsyncDuckDB> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = (async () => {
    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);
    // Use blob URL pattern so bundlers don't need to resolve the worker path.
    const workerUrl = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker!}");`], {
        type: "text/javascript",
      }),
    );
    const worker = new Worker(workerUrl);
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(workerUrl);
    return db;
  })();
  return _dbPromise;
}

// ─── Arrow → QueryExecResult conversion ──────────────────────────────────────

type ArrowTable = Awaited<ReturnType<AsyncDuckDBConnection["query"]>>;

/** Convert a BigInt value to a number (or string if it would overflow). */
function bigIntToSqlValue(v: bigint): SqlValue {
  if (v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(v);
  }
  return String(v);
}

function arrowValueToSql(v: unknown): SqlValue {
  if (v === null || v === undefined) return null;
  if (v instanceof Uint8Array) return v;
  if (typeof v === "bigint") return bigIntToSqlValue(v);
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return v;
  // Dates, structs, lists, maps → string
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function arrowToQueryExecResult(
  table: ArrowTable,
): (QueryExecResult & { columnTypes?: string[] }) | null {
  if (table.numCols === 0) return null;
  const fields = table.schema.fields;
  const columns = fields.map((f) => f.name);
  const columnTypes = fields.map((f) => f.type.toString());
  const values: SqlValue[][] = [];
  for (let r = 0; r < table.numRows; r++) {
    values.push(
      columns.map((_, c) => arrowValueToSql(table.getChildAt(c)?.get(r))),
    );
  }
  return { columns, columnTypes, values };
}

// ─── SQL statement splitting ───────────────────────────────────────────────────
// Splits a multi-statement SQL string into individual statements, respecting
// single-quoted strings, double-quoted identifiers, $-quoted strings, and
// -- / /* */ comments.

export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql[i];

    // Single-line comment
    if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const comment = end === -1 ? sql.slice(i) : sql.slice(i, end + 1);
      current += comment;
      i += comment.length;
      continue;
    }

    // Block comment
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      const comment = end === -1 ? sql.slice(i) : sql.slice(i, end + 2);
      current += comment;
      i += comment.length;
      continue;
    }

    // Single-quoted string literal
    if (ch === "'") {
      let j = i + 1;
      while (j < len) {
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2; // escaped quote
        } else if (sql[j] === "'") {
          j++;
          break;
        } else {
          j++;
        }
      }
      current += sql.slice(i, j);
      i = j;
      continue;
    }

    // Double-quoted identifier
    if (ch === '"') {
      let j = i + 1;
      while (j < len) {
        if (sql[j] === '"' && sql[j + 1] === '"') {
          j += 2;
        } else if (sql[j] === '"') {
          j++;
          break;
        } else {
          j++;
        }
      }
      current += sql.slice(i, j);
      i = j;
      continue;
    }

    // $-quoted string (DuckDB supports $$ and $tag$)
    if (ch === "$") {
      const tagEnd = sql.indexOf("$", i + 1);
      if (tagEnd !== -1) {
        const tag = sql.slice(i, tagEnd + 1); // e.g. $$ or $body$
        const closeIdx = sql.indexOf(tag, tagEnd + 1);
        if (closeIdx !== -1) {
          current += sql.slice(i, closeIdx + tag.length);
          i = closeIdx + tag.length;
          continue;
        }
      }
    }

    // Statement separator
    if (ch === ";") {
      current += ";";
      const trimmed = current.trim();
      if (trimmed && trimmed !== ";") {
        statements.push(trimmed);
      }
      current = "";
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

// ─── Quote identifier ────────────────────────────────────────────────────────

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

// ─── Column DDL rendering ─────────────────────────────────────────────────────

function renderDuckDbType(col: ColumnSpec): string {
  const type = (col.type || "INTEGER").trim();
  if (col.autoIncrement) {
    return `${type} GENERATED BY DEFAULT AS IDENTITY`;
  }
  return type;
}

function renderDuckDbColumnDef(col: ColumnSpec): string {
  const name = quoteIdent(col.name);
  if (col.generated) {
    // DuckDB only supports STORED generated columns.
    return `${name} ${col.type || "VARCHAR"} GENERATED ALWAYS AS (${col.generated.expression}) STORED`;
  }
  const type = renderDuckDbType(col);
  const parts = [name, type];
  if (col.notNull && !col.autoIncrement) parts.push("NOT NULL");
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  if (col.defaultValue && !col.autoIncrement) parts.push(`DEFAULT ${col.defaultValue}`);
  return parts.join(" ");
}

function renderDuckDbCreateTable(name: string, columns: ColumnSpec[]): string {
  const defs = columns.map((col) => `  ${renderDuckDbColumnDef(col)}`);
  const pk = columns.filter((col) => col.primaryKey);
  if (pk.length > 0) {
    defs.push(`  PRIMARY KEY (${pk.map((col) => quoteIdent(col.name)).join(", ")})`);
  }
  for (const col of columns) {
    if (!col.foreignKey?.table || !col.foreignKey.column) continue;
    const onDelete = col.foreignKey.onDelete ?? "NO ACTION";
    const onUpdate = col.foreignKey.onUpdate ?? "NO ACTION";
    defs.push(
      `  FOREIGN KEY (${quoteIdent(col.name)}) REFERENCES ${quoteIdent(col.foreignKey.table)}(${quoteIdent(col.foreignKey.column)}) ON DELETE ${onDelete} ON UPDATE ${onUpdate}`,
    );
  }
  return `CREATE TABLE ${quoteIdent(name)} (\n${defs.join(",\n")}\n)`;
}

// ─── Engine interface ─────────────────────────────────────────────────────────

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
  listColumns: (name: string) => Promise<TableColumnInfo[]>;
  listForeignKeys: (name: string) => Promise<ForeignKeyInfo[]>;
  getColumnConstraintInfo: (tableName: string) => Promise<ColumnConstraintInfo[]>;
  createTable: (name: string, columns: ColumnSpec[]) => Promise<void>;
  rebuildTable: (spec: TableRebuildSpec) => Promise<void>;
  dropEntity: (
    name: string,
    kind: "table" | "view" | "index",
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
  activeSample: () => DuckDbSampleDatabase;
}

let _rebuildCounter = 0;

export async function createDuckDbEngine(
  initialSampleId: string,
): Promise<DuckDbEngine> {
  const db = await getOrCreateDb();
  const conn: AsyncDuckDBConnection = await db.connect();
  let sample = findDuckDbSampleDatabase(initialSampleId);

  async function runRaw(sql: string): Promise<ArrowTable> {
    return conn.query(sql);
  }

  async function queryRows<T = Record<string, unknown>>(
    sql: string,
  ): Promise<T[]> {
    const table = await runRaw(sql);
    const result = arrowToQueryExecResult(table);
    if (!result) return [];
    return result.values.map((row) =>
      Object.fromEntries(result.columns.map((col, i) => [col, row[i]])),
    ) as T[];
  }

  async function recreateDatabase(nextSample: DuckDbSampleDatabase): Promise<void> {
    // Drop all user-created objects in the default schema.
    // DuckDB doesn't have a DROP DATABASE in in-memory mode,
    // so we drop all user tables, views, indexes in reverse dependency order.
    const tables = await queryRows<{ table_name: string }>(
      `SELECT table_name FROM duckdb_tables() WHERE schema_name = 'main' ORDER BY table_name`,
    );
    const views = await queryRows<{ view_name: string }>(
      `SELECT view_name FROM duckdb_views() WHERE schema_name = 'main' ORDER BY view_name`,
    );
    const sequences = await queryRows<{ sequence_name: string }>(
      `SELECT sequence_name FROM duckdb_sequences() WHERE schema_name = 'main' ORDER BY sequence_name`,
    );

    // Drop views first (may reference tables)
    for (const row of views) {
      await runRaw(`DROP VIEW IF EXISTS ${quoteIdent(row.view_name)} CASCADE`);
    }
    // Drop tables (CASCADE handles FK ordering)
    for (const row of tables) {
      await runRaw(`DROP TABLE IF EXISTS ${quoteIdent(row.table_name)} CASCADE`);
    }
    // Drop sequences
    for (const row of sequences) {
      await runRaw(`DROP SEQUENCE IF EXISTS ${quoteIdent(row.sequence_name)} CASCADE`);
    }

    // Execute sample init SQL
    if (nextSample.sql.trim()) {
      const stmts = splitStatements(nextSample.sql);
      for (const stmt of stmts) {
        await runRaw(stmt);
      }
    }
  }

  const engine: DuckDbEngine = {
    async loadSampleDatabase(id) {
      sample = findDuckDbSampleDatabase(id);
      await recreateDatabase(sample);
      return sample;
    },

    async loadBlankDatabase() {
      sample = DUCKDB_BLANK_DATABASE;
      await recreateDatabase(sample);
      return sample;
    },

    async exec(sql) {
      const stmts = splitStatements(sql);
      if (stmts.length === 0) return [];
      const results: (QueryExecResult | null)[] = [];
      for (const stmt of stmts) {
        const table = await runRaw(stmt);
        results.push(arrowToQueryExecResult(table));
      }
      return results;
    },

    async execParams(sql, params) {
      // DuckDB-wasm prepared statements use positional ? placeholders.
      // We build a prepared statement and execute it.
      const stmt = await conn.prepare(sql);
      const table = await stmt.query(...(params as (string | number | null | boolean)[]));
      await stmt.close();
      const result = arrowToQueryExecResult(table);
      return result ? [result] : [];
    },

    async execPaged(sql, pageSize, offset) {
      const base = sql.replace(/\s*;+\s*$/, "");
      let totalCount = 0;
      try {
        const countRows = await queryRows<{ count: SqlValue }>(
          `SELECT COUNT(*) AS count FROM (${base}) __dataslope_count`,
        );
        totalCount = Number(countRows[0]?.count ?? 0);
      } catch {
        totalCount = 0;
      }
      const paged = await engine.exec(
        `${base} LIMIT ${Math.max(1, pageSize)} OFFSET ${Math.max(0, offset)}`,
      );
      const result = paged.filter((r): r is QueryExecResult => r !== null);
      if (totalCount === 0) totalCount = result[0]?.values.length ?? 0;
      return { result, totalCount };
    },

    async listTables() {
      const rows = await queryRows<{ table_name: string }>(
        `SELECT table_name FROM duckdb_tables() WHERE schema_name = 'main' ORDER BY table_name`,
      );
      return rows.map((r) => r.table_name);
    },

    async listViews() {
      const rows = await queryRows<{ view_name: string }>(
        `SELECT view_name FROM duckdb_views() WHERE schema_name = 'main' ORDER BY view_name`,
      );
      return rows.map((r) => r.view_name);
    },

    async listIndexes() {
      const rows = await queryRows<{ index_name: string }>(
        `SELECT index_name FROM duckdb_indexes() WHERE schema_name = 'main' ORDER BY index_name`,
      );
      return rows.map((r) => r.index_name);
    },

    async listColumns(name) {
      const rows = await queryRows<{
        column_index: number;
        column_name: string;
        column_type: string;
        is_nullable: string;
        column_default: string | null;
        is_generated: boolean;
        expression: string | null;
      }>(
        `SELECT
          column_index,
          column_name,
          column_type,
          is_nullable,
          column_default,
          COALESCE(is_generated, false) AS is_generated,
          expression
        FROM duckdb_columns()
        WHERE schema_name = 'main' AND table_name = '${name.replace(/'/g, "''")}'
        ORDER BY column_index`,
      );

      // Get primary key info from constraints.
      const pkRows = await queryRows<{ constraint_column_names: string | null }>(
        `SELECT constraint_column_names::VARCHAR AS constraint_column_names
         FROM duckdb_constraints()
         WHERE schema_name = 'main'
           AND table_name = '${name.replace(/'/g, "''")}'
           AND constraint_type = 'PRIMARY KEY'
         LIMIT 1`,
      );
      const pkStr = pkRows[0]?.constraint_column_names ?? "";
      // DuckDB returns constraint_column_names as "[col1, col2]"
      const pkNames = pkStr
        ? pkStr
            .replace(/^\[/, "")
            .replace(/\]$/, "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      return rows.map((row, idx) => ({
        cid: idx,
        name: row.column_name,
        type: row.column_type,
        notNull: row.is_nullable === "NO" || row.is_nullable === "false" || row.is_nullable === false as unknown as string,
        defaultValue: row.is_generated ? null : (row.column_default ?? null),
        pk: pkNames.includes(row.column_name)
          ? pkNames.indexOf(row.column_name) + 1
          : 0,
        generated: row.is_generated && row.expression
          ? { expression: row.expression, storageType: "STORED" as const }
          : null,
      }));
    },

    async listForeignKeys(name) {
      const rows = await queryRows<{
        constraint_column_names: string | null;
        fk_table: string | null;
        fk_column_names: string | null;
      }>(
        `SELECT
          constraint_column_names::VARCHAR AS constraint_column_names,
          fk.table_name AS fk_table,
          fk.column_names::VARCHAR AS fk_column_names
         FROM duckdb_constraints() c
         JOIN (
           SELECT table_name, constraint_column_names AS column_names
           FROM duckdb_constraints()
           WHERE schema_name = 'main' AND constraint_type = 'UNIQUE'
           UNION ALL
           SELECT table_name, constraint_column_names AS column_names
           FROM duckdb_constraints()
           WHERE schema_name = 'main' AND constraint_type = 'PRIMARY KEY'
         ) fk ON c.fk_table = fk.table_name
         WHERE c.schema_name = 'main'
           AND c.table_name = '${name.replace(/'/g, "''")}'
           AND c.constraint_type = 'FOREIGN KEY'`,
      );

      // DuckDB constraint format for FK: constraint_column_names = "[from_col]",
      // fk_table = referenced table, fk_column_names = "[to_col]"
      return rows
        .map((row) => {
          const fromCols = (row.constraint_column_names ?? "")
            .replace(/^\[/, "").replace(/\]$/, "")
            .split(",").map((s) => s.trim()).filter(Boolean);
          const toCols = (row.fk_column_names ?? "")
            .replace(/^\[/, "").replace(/\]$/, "")
            .split(",").map((s) => s.trim()).filter(Boolean);
          if (!fromCols[0] || !row.fk_table || !toCols[0]) return null;
          return {
            from: fromCols[0],
            table: row.fk_table,
            to: toCols[0],
            onDelete: "NO ACTION",
            onUpdate: "NO ACTION",
          } satisfies ForeignKeyInfo;
        })
        .filter((r): r is ForeignKeyInfo => r !== null);
    },

    async getColumnConstraintInfo(tableName) {
      const cols = await engine.listColumns(tableName);

      // Unique columns from duckdb_constraints
      const uniqueRows = await queryRows<{ constraint_column_names: string | null }>(
        `SELECT constraint_column_names::VARCHAR AS constraint_column_names
         FROM duckdb_constraints()
         WHERE schema_name = 'main'
           AND table_name = '${tableName.replace(/'/g, "''")}'
           AND constraint_type = 'UNIQUE'`,
      );
      const uniqueNames = new Set(
        uniqueRows.flatMap((row) =>
          (row.constraint_column_names ?? "")
            .replace(/^\[/, "").replace(/\]$/, "")
            .split(",").map((s) => s.trim()).filter(Boolean),
        ),
      );

      return cols.map((col) => ({
        name: col.name,
        isPrimaryKey: col.pk > 0,
        // DuckDB identity columns have "nextval" in their default expression
        isAutoIncrement:
          col.defaultValue?.toLowerCase().includes("nextval") === true ||
          col.defaultValue?.toLowerCase().includes("identity") === true,
        isUnique: uniqueNames.has(col.name),
      }));
    },

    async createTable(name, columns) {
      const finalName = name.trim();
      if (!finalName) throw new Error("Table name cannot be empty.");
      const filtered = columns
        .filter((col) => col.name.trim())
        .map((col) => ({ ...col, name: col.name.trim(), type: (col.type || "INTEGER").trim() }));
      if (filtered.length === 0) throw new Error("A table must have at least one column.");
      await runRaw(renderDuckDbCreateTable(finalName, filtered));
    },

    async rebuildTable(spec) {
      const finalName = spec.newName.trim();
      if (!finalName) throw new Error("Table name cannot be empty.");
      const columns = spec.columns
        .filter((col) => col.name.trim())
        .map((col) => ({ ...col, name: col.name.trim(), type: (col.type || "INTEGER").trim() }));
      if (columns.length === 0) throw new Error("A table must have at least one column.");

      const renameMap = new Map<string, string>();
      for (const col of columns) {
        if (col.originalName && col.originalName !== col.name) {
          renameMap.set(col.originalName, col.name);
        }
      }

      const patchedColumns =
        renameMap.size > 0
          ? columns.map((col) => {
              if (!col.generated) return col;
              let expr = col.generated.expression;
              for (const [oldName, newName] of renameMap) {
                expr = expr.replace(
                  new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"),
                  newName,
                );
              }
              return expr === col.generated.expression
                ? col
                : { ...col, generated: { ...col.generated, expression: expr } };
            })
          : columns;

      const tmpName = `${spec.originalName}__tmp_rebuild_${++_rebuildCounter}`;
      const createSql = renderDuckDbCreateTable(tmpName, patchedColumns);
      const copyable = patchedColumns.filter((col) => col.originalName && !col.generated);
      const targetCols = copyable.map((col) => quoteIdent(col.name)).join(", ");
      const sourceCols = copyable.map((col) => quoteIdent(col.originalName!)).join(", ");
      try {
        await runRaw("BEGIN TRANSACTION");
        await runRaw(createSql);
        if (copyable.length > 0) {
          await runRaw(
            `INSERT INTO ${quoteIdent(tmpName)} (${targetCols}) SELECT ${sourceCols} FROM ${quoteIdent(spec.originalName)}`,
          );
        }
        await runRaw(`DROP TABLE ${quoteIdent(spec.originalName)} CASCADE`);
        await runRaw(`ALTER TABLE ${quoteIdent(tmpName)} RENAME TO ${quoteIdent(finalName)}`);
        await runRaw("COMMIT");
      } catch (err) {
        try {
          await runRaw("ROLLBACK");
        } catch {
          // ignore rollback failures
        }
        throw err;
      }
    },

    async dropEntity(name, kind) {
      const keyword =
        kind === "table" ? "TABLE" : kind === "view" ? "VIEW" : "INDEX";
      await runRaw(`DROP ${keyword} IF EXISTS ${quoteIdent(name)} CASCADE`);
    },

    async truncateTable(name) {
      // DuckDB uses DELETE FROM (no TRUNCATE keyword for in-memory)
      await runRaw(`DELETE FROM ${quoteIdent(name)}`);
    },

    async getDDL(name) {
      // Check if it's a table
      const tableRows = await queryRows<{ table_name: string }>(
        `SELECT table_name FROM duckdb_tables() WHERE schema_name = 'main' AND table_name = '${name.replace(/'/g, "''")}' LIMIT 1`,
      );
      if (tableRows.length > 0) {
        const [cols, fks] = await Promise.all([
          engine.listColumns(name),
          engine.listForeignKeys(name),
        ]);
        const colSql = cols.map((col) => {
          if (col.generated) {
            return `  ${quoteIdent(col.name)} ${col.type} GENERATED ALWAYS AS (${col.generated.expression}) STORED`;
          }
          const parts = [quoteIdent(col.name), col.type];
          if (col.notNull) parts.push("NOT NULL");
          if (col.defaultValue) parts.push(`DEFAULT ${col.defaultValue}`);
          return `  ${parts.join(" ")}`;
        });
        const pk = cols.filter((col) => col.pk > 0).sort((a, b) => a.pk - b.pk);
        if (pk.length > 0) {
          colSql.push(`  PRIMARY KEY (${pk.map((col) => quoteIdent(col.name)).join(", ")})`);
        }
        for (const fk of fks) {
          colSql.push(
            `  FOREIGN KEY (${quoteIdent(fk.from)}) REFERENCES ${quoteIdent(fk.table)}(${quoteIdent(fk.to)}) ON DELETE ${fk.onDelete ?? "NO ACTION"} ON UPDATE ${fk.onUpdate ?? "NO ACTION"}`,
          );
        }
        return `CREATE TABLE ${quoteIdent(name)} (\n${colSql.join(",\n")}\n);`;
      }

      // Check if it's a view
      const viewRows = await queryRows<{ sql: string | null }>(
        `SELECT sql FROM duckdb_views() WHERE schema_name = 'main' AND view_name = '${name.replace(/'/g, "''")}' LIMIT 1`,
      );
      if (viewRows.length > 0 && viewRows[0].sql) {
        return `${viewRows[0].sql};`;
      }

      // Check if it's an index
      const indexRows = await queryRows<{ sql: string | null }>(
        `SELECT sql FROM duckdb_indexes() WHERE schema_name = 'main' AND index_name = '${name.replace(/'/g, "''")}' LIMIT 1`,
      );
      if (indexRows.length > 0 && indexRows[0].sql) {
        return `${indexRows[0].sql};`;
      }

      return `-- DDL not available for "${name}"`;
    },

    async deleteRows(tableName, pkColumns, pkRows) {
      if (pkColumns.length === 0 || pkRows.length === 0) return 0;
      let deleted = 0;
      for (const row of pkRows) {
        const conditions = pkColumns
          .map((col, i) => {
            const val = row[i];
            if (val === null) return `${quoteIdent(col)} IS NULL`;
            if (typeof val === "string") return `${quoteIdent(col)} = '${val.replace(/'/g, "''")}'`;
            return `${quoteIdent(col)} = ${val}`;
          })
          .join(" AND ");
        const result = await runRaw(
          `DELETE FROM ${quoteIdent(tableName)} WHERE ${conditions}`,
        );
        deleted += result.numRows;
      }
      return deleted;
    },

    async updateRows(tableName, updates) {
      if (updates.length === 0) return 0;
      // Group updates by rowIndex
      const byRow = new Map<number, Map<string, unknown>>();
      for (const u of updates) {
        if (!byRow.has(u.rowIndex)) byRow.set(u.rowIndex, new Map());
        byRow.get(u.rowIndex)!.set(u.column, u.value);
      }

      // We need PK values: fetch them from the current result via the
      // stored result set. The engine doesn't have access to the UI state,
      // so we rely on the caller having supplied the rowIndex as the actual
      // PK value via a SELECT * query. For DuckDB, we use the rowid
      // workaround: DuckDB supports rowid in some contexts, but the safest
      // approach is PK-based. The playground's updateRows call supplies pk
      // column values derived from the result set rows — we update using
      // a SET + WHERE for each affected row.
      // NOTE: rowIndex here is used as a key in the update map. The
      // PostgresPlayground passes the actual pk values via pkRows, but
      // DuckDbPlayground will pass rowIndex-keyed updates where the
      // playground has already resolved the PK from the result set.
      let count = 0;
      for (const [, colMap] of byRow) {
        // colMap contains "column=value" pairs INCLUDING pk columns
        // The playground should include pk columns in the updates map.
        // We separate pk SET columns from pk WHERE columns.
        const allCols = Array.from(colMap.entries());

        const setClauses = allCols
          .filter(([, v]) => v !== undefined)
          .map(([col, val]) => {
            if (val === null) return `${quoteIdent(col)} = NULL`;
            if (typeof val === "string") return `${quoteIdent(col)} = '${val.replace(/'/g, "''")}'`;
            return `${quoteIdent(col)} = ${val}`;
          });
        if (setClauses.length === 0) continue;
        // This simplified path updates by matching all non-null values as
        // conditions when there's no dedicated PK. This is a best-effort
        // approach; the UI only enables editing when a PK is detected.
        const whereClauses = allCols
          .map(([col, val]) => {
            if (val === null) return `${quoteIdent(col)} IS NULL`;
            if (typeof val === "string") return `${quoteIdent(col)} = '${val.replace(/'/g, "''")}'`;
            return `${quoteIdent(col)} = ${val}`;
          });
        const result = await runRaw(
          `UPDATE ${quoteIdent(tableName)} SET ${setClauses.join(", ")} WHERE ${whereClauses.join(" AND ")}`,
        );
        count += result.numRows;
      }
      return count;
    },

    async insertRow(tableName, columnNames, values) {
      const cols = columnNames.map(quoteIdent).join(", ");
      const vals = values
        .map((v) => {
          if (v === null || v === undefined) return "NULL";
          if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
          if (typeof v === "boolean") return v ? "true" : "false";
          return String(v);
        })
        .join(", ");
      await runRaw(`INSERT INTO ${quoteIdent(tableName)} (${cols}) VALUES (${vals})`);
    },

    activeSample() {
      return sample;
    },
  };

  // Initialise with the requested sample.
  await recreateDatabase(sample);
  return engine;
}

// ─── Re-export stripSqlComments for consumers ─────────────────────────────────
export { stripSqlComments };
