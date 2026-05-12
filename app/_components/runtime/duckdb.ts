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

type DuckDbModule = typeof import("@duckdb/duckdb-wasm");

let duckDbInitPromise: Promise<DuckDbModule> | null = null;

function loadDuckDbWasm(): Promise<DuckDbModule> {
  if (!duckDbInitPromise) {
    duckDbInitPromise = import("@duckdb/duckdb-wasm").then((mod) => mod);
  }
  return duckDbInitPromise;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function toSqlValue(value: unknown): SqlValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "bigint") return Number(value);
  return String(value);
}

interface ArrowTable {
  schema: {
    fields: Array<{ name: string; type: () => string }>;
  };
  numRows: number;
  getChildAt: (index: number) => {
    get: (index: number) => unknown;
  } | null;
}

function arrowTableToQueryExecResult(table: ArrowTable): QueryExecResult {
  const columns = table.schema.fields.map((f) => f.name);
  const columnTypes = table.schema.fields.map((f) => f.type());
  const values: SqlValue[][] = [];
  for (let r = 0; r < table.numRows; r++) {
    const row: SqlValue[] = [];
    for (let c = 0; c < columns.length; c++) {
      const col = table.getChildAt(c);
      const val = col ? col.get(r) : null;
      row.push(val === undefined || val === null ? null : toSqlValue(val));
    }
    values.push(row);
  }
  return { columns, values };
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

function splitStatements(sql: string): string[] {
  const cleaned = stripSqlComments(sql);
  if (!cleaned) return [];
  const parts: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let depth = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const prev = i > 0 ? cleaned[i - 1] : "";
    if (ch === "'" && !inDouble && prev !== "\\") {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle && prev !== "\\") {
      inDouble = !inDouble;
    }
    if (!inSingle && !inDouble) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      if (ch === ";" && depth === 0) {
        const trimmed = current.trim();
        if (trimmed) parts.push(trimmed);
        current = "";
        continue;
      }
    }
    current += ch;
  }
  const trimmed = current.trim();
  if (trimmed) parts.push(trimmed);
  return parts;
}

export interface DuckDbEngine {
  loadSampleDatabase: (id: string) => Promise<DuckDbSampleDatabase>;
  loadBlankDatabase: () => Promise<DuckDbSampleDatabase>;
  exec: (sql: string) => Promise<(QueryExecResult | null)[]>;
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
  dropEntity: (name: string, kind: "table" | "view" | "index") => Promise<void>;
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

const FK_ACTIONS_SET = new Set(["NO ACTION", "RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT"]);

function normalizeFkAction(action: string | undefined): string {
  const normalized = (action || "NO ACTION").trim().toUpperCase();
  return FK_ACTIONS_SET.has(normalized) ? normalized : "NO ACTION";
}

function renderDuckDbColumnDef(col: ColumnSpec): string {
  const name = quoteIdent(col.name);
  const type = (col.type || "VARCHAR").trim();
  if (col.generated) {
    return `${name} ${type} GENERATED ALWAYS AS (${col.generated.expression}) STORED`;
  }
  const parts = [name, type];
  if (col.autoIncrement) parts.push("GENERATED BY DEFAULT AS IDENTITY");
  if (col.notNull) parts.push("NOT NULL");
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

export async function createDuckDbEngine(
  initialSampleId: string,
): Promise<DuckDbEngine> {
  const duckdb = await loadDuckDbWasm();
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], { type: "text/javascript" }),
  );
  const worker = new Worker(workerUrl);
  const duckMod = duckdb as DuckDbModule;
  const logger = new duckMod.ConsoleLogger();
  const db = new duckMod.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  let sample: DuckDbSampleDatabase = findDuckDbSampleDatabase(initialSampleId);
  let conn = await db.connect();

  async function execRaw(sql: string): Promise<ArrowTable> {
    const result = await conn.query(sql);
    return result as unknown as ArrowTable;
  }

  async function queryRows<T extends Record<string, unknown>>(
    sql: string,
  ): Promise<T[]> {
    const table = await execRaw(sql);
    const cols = table.schema.fields.map((f) => f.name);
    const rows: T[] = [];
    for (let r = 0; r < table.numRows; r++) {
      const row: Record<string, unknown> = {};
      for (let c = 0; c < cols.length; c++) {
        const col = table.getChildAt(c);
        row[cols[c]] = col ? col.get(r) : null;
      }
      rows.push(row as T);
    }
    return rows;
  }

  async function rebuildConnection(): Promise<void> {
    try {
      await conn.close();
    } catch {
      // ignore
    }
    conn = await db.connect();
  }

  async function execParams(sql: string, params: unknown[]): Promise<void> {
    const stmt = await conn.prepare(sql);
    try {
      await stmt.query(...params);
    } finally {
      await stmt.close();
    }
  }

  async function buildDb(sql: string): Promise<void> {
    await rebuildConnection();
    if (sql.trim()) {
      const stmts = splitStatements(sql);
      for (const stmt of stmts) {
        await conn.query(stmt);
      }
    }
  }

  await buildDb(sample.sql);

  const engine: DuckDbEngine = {
    async loadSampleDatabase(id) {
      sample = findDuckDbSampleDatabase(id);
      await buildDb(sample.sql);
      return sample;
    },

    async loadBlankDatabase() {
      sample = DUCKDB_BLANK_DATABASE;
      await buildDb("");
      return sample;
    },

    async exec(sql) {
      const stmts = splitStatements(sql);
      const results: (QueryExecResult | null)[] = [];
      for (const stmt of stmts) {
        const table = await execRaw(stmt);
        if (table.schema.fields.length > 0) {
          results.push(arrowTableToQueryExecResult(table));
        } else {
          results.push(null);
        }
      }
      return results;
    },

    async execPaged(sql, pageSize, offset) {
      const base = sql.replace(/\s*;+\s*$/, "");
      let totalCount = 0;
      try {
        const countRows = await queryRows<{ count: string | number }>(
          `SELECT COUNT(*) AS count FROM (${base}) AS __dataslope_count`,
        );
        totalCount = Number(countRows[0]?.count ?? 0);
      } catch {
        totalCount = 0;
      }
      const raw = await engine.exec(
        `${base} LIMIT ${Math.max(1, pageSize)} OFFSET ${Math.max(0, offset)}`,
      );
      const result = raw.filter((r): r is QueryExecResult => r !== null);
      if (totalCount === 0) totalCount = result[0]?.values.length ?? 0;
      return { result, totalCount };
    },

    async listTables() {
      const rows = await queryRows<{ table_name: string }>(
        `SELECT table_name FROM duckdb_tables() ORDER BY table_name`,
      );
      return rows.map((row) => row.table_name);
    },

    async listViews() {
      const rows = await queryRows<{ view_name: string }>(
        `SELECT view_name FROM duckdb_views() ORDER BY view_name`,
      );
      return rows.map((row) => row.view_name);
    },

    async listIndexes() {
      const rows = await queryRows<{ index_name: string }>(
        `SELECT index_name FROM duckdb_indexes() ORDER BY index_name`,
      );
      return rows.map((row) => row.index_name);
    },

    async listColumns(name) {
      const safeName = name.replace(/'/g, "''");
      const rows = await queryRows<{
        column_name: string;
        column_type: string;
        is_nullable: string;
        column_default: string | null;
        generation_expression: string | null;
      }>(
        `SELECT column_name, column_type, is_nullable, column_default, generation_expression FROM duckdb_columns() WHERE table_name = '${safeName}' ORDER BY column_index`,
      );
      const pkRows = await queryRows<{ column_name: string }>(
        `SELECT column_name FROM duckdb_constraints() WHERE table_name = '${safeName}' AND constraint_type = 'PRIMARY KEY'`,
      );
      const pkCols = new Map<string, number>();
      pkRows.forEach((row, i) => pkCols.set(row.column_name, i + 1));

      return rows.map((row, i) => ({
        cid: i,
        name: row.column_name,
        type: row.column_type,
        notNull: row.is_nullable === "NO",
        defaultValue: row.generation_expression ? null : row.column_default,
        pk: pkCols.get(row.column_name) ?? 0,
        generated: row.generation_expression
          ? { expression: row.generation_expression, storageType: "STORED" as const }
          : null,
      }));
    },

    async listForeignKeys(name) {
      const safeName = name.replace(/'/g, "''");
      const rows = await queryRows<{
        column_name: string;
        referenced_table: string;
        referenced_column: string;
      }>(
        `SELECT column_name, referenced_table, referenced_column FROM duckdb_constraints() WHERE table_name = '${safeName}' AND constraint_type = 'FOREIGN KEY'`,
      );
      return rows.map((row) => ({
        from: row.column_name,
        table: row.referenced_table,
        to: row.referenced_column,
        onDelete: "NO ACTION",
        onUpdate: "NO ACTION",
      }));
    },

    async getColumnConstraintInfo(tableName) {
      const cols = await engine.listColumns(tableName);
      const safeName = tableName.replace(/'/g, "''");
      const uniqueRows = await queryRows<{ column_name: string }>(
        `SELECT column_name FROM duckdb_constraints() WHERE table_name = '${safeName}' AND constraint_type = 'UNIQUE'`,
      );
      const unique = new Set(uniqueRows.map((row) => row.column_name));
      return cols.map((col) => ({
        name: col.name,
        isPrimaryKey: col.pk > 0,
        isAutoIncrement: /identity/i.test(col.defaultValue ?? ""),
        isUnique: unique.has(col.name),
      }));
    },

    async createTable(name, columns) {
      const finalName = name.trim();
      if (!finalName) throw new Error("Table name cannot be empty.");
      const filteredCols = columns.filter((col) => col.name.trim()).map((col) => ({
        ...col,
        name: col.name.trim(),
        type: (col.type || "VARCHAR").trim(),
      }));
      if (filteredCols.length === 0) throw new Error("A table must have at least one column.");
      await conn.query(renderDuckDbCreateTable(finalName, filteredCols));
    },

    async rebuildTable(spec) {
      const finalName = spec.newName.trim();
      if (!finalName) throw new Error("Table name cannot be empty.");
      const columns = spec.columns.filter((col) => col.name.trim()).map((col) => ({
        ...col,
        name: col.name.trim(),
        type: (col.type || "VARCHAR").trim(),
      }));
      if (columns.length === 0) throw new Error("A table must have at least one column.");

      const renameMap = new Map<string, string>();
      for (const col of columns) {
        if (col.originalName && col.originalName !== col.name) {
          renameMap.set(col.originalName, col.name);
        }
      }

      const patchedColumns = renameMap.size > 0
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

      const copyable = patchedColumns.filter((col) => col.originalName && !col.generated);
      const targetCols = copyable.map((col) => quoteIdent(col.name)).join(", ");
      const sourceCols = copyable.map((col) => quoteIdent(col.originalName!)).join(", ");
      const tmpName = `${spec.originalName}__tmp_rebuild`;

      let needRollback = true;
      try {
        await conn.query("BEGIN TRANSACTION");
        const tmpSql = renderDuckDbCreateTable(tmpName, patchedColumns);
        await conn.query(tmpSql);
        if (copyable.length > 0) {
          await conn.query(
            `INSERT INTO ${quoteIdent(tmpName)} (${targetCols}) SELECT ${sourceCols} FROM ${quoteIdent(spec.originalName)}`,
          );
        }
        await conn.query(`DROP TABLE ${quoteIdent(spec.originalName)}`);
        await conn.query(`ALTER TABLE ${quoteIdent(tmpName)} RENAME TO ${quoteIdent(finalName)}`);
        needRollback = false;
        await conn.query("COMMIT");
      } catch (err) {
        if (needRollback) {
          try {
            await conn.query("ROLLBACK");
          } catch {
            // ignore
          }
        }
        throw err;
      }
    },

    async dropEntity(name, kind) {
      const keyword = kind === "table" ? "TABLE" : kind === "view" ? "VIEW" : "INDEX";
      await conn.query(`DROP ${keyword} IF EXISTS ${quoteIdent(name)}`);
    },

    async truncateTable(name) {
      await conn.query(`DELETE FROM ${quoteIdent(name)}`);
    },

    async getDDL(name) {
      const safeName = name.replace(/'/g, "''");
      const tableRows = await queryRows<{ table_name: string }>(
        `SELECT table_name FROM duckdb_tables() WHERE table_name = '${safeName}'`,
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
            `  FOREIGN KEY (${quoteIdent(fk.from)}) REFERENCES ${quoteIdent(fk.table)}(${quoteIdent(fk.to)}) ON DELETE ${normalizeFkAction(fk.onDelete)} ON UPDATE ${normalizeFkAction(fk.onUpdate)}`,
          );
        }
        return `CREATE TABLE ${quoteIdent(name)} (\n${colSql.join(",\n")}\n);`;
      }
      const viewRows = await queryRows<{ sql: string }>(
        `SELECT sql FROM duckdb_views() WHERE view_name = '${safeName}'`,
      );
      if (viewRows.length > 0 && viewRows[0].sql) {
        return `${viewRows[0].sql};`;
      }
      const idxRows = await queryRows<{ sql: string }>(
        `SELECT sql FROM duckdb_indexes() WHERE index_name = '${safeName}'`,
      );
      if (idxRows.length > 0 && idxRows[0].sql) {
        return `${idxRows[0].sql};`;
      }
      return "";
    },

    async deleteRows(tableName, pkColumns, pkRows) {
      if (pkColumns.length === 0) {
        throw new Error("Cannot delete rows without primary-key columns.");
      }
      if (pkRows.length === 0) return 0;
      let deleted = 0;
      for (const row of pkRows) {
        const where = pkColumns.map((col) => `${quoteIdent(col)} = ?`).join(" AND ");
        try {
          await execParams(
            `DELETE FROM ${quoteIdent(tableName)} WHERE ${where}`,
            [...row],
          );
          deleted += 1;
        } catch {
          // row may not exist
        }
      }
      return deleted;
    },

    async updateRows(tableName, updates) {
      let count = 0;
      for (const update of updates) {
        const pkCols = (await engine.listColumns(tableName))
          .filter((col) => col.pk > 0)
          .sort((a, b) => a.pk - b.pk)
          .map((col) => col.name);
        if (pkCols.length > 0) {
          const pkRow = pkCols.map(() => null);
          const where = pkCols.map((col) => `${quoteIdent(col)} = ?`).join(" AND ");
          await execParams(
            `UPDATE ${quoteIdent(tableName)} SET ${quoteIdent(update.column)} = ? WHERE ${where}`,
            [update.value, ...pkRow],
          );
        } else {
          // Without PK, use LIMIT/OFFSET on all columns as best-effort
          const allCols = (await engine.listColumns(tableName)).map((c) => c.name);
          if (allCols.length === 0) continue;
          const row = await queryRows<Record<string, unknown>>(
            `SELECT * FROM ${quoteIdent(tableName)} LIMIT 1 OFFSET ${update.rowIndex}`,
          );
          if (row.length === 0) continue;
          const where = allCols.map((col) => `${quoteIdent(col)} = ?`).join(" AND ");
          const vals = allCols.map((col) => row[0][col]);
          await execParams(
            `UPDATE ${quoteIdent(tableName)} SET ${quoteIdent(update.column)} = ? WHERE ${where}`,
            [update.value, ...vals],
          );
        }
        count += 1;
      }
      return count;
    },

    async insertRow(tableName, columnNames, values) {
      const cols = columnNames.map(quoteIdent).join(", ");
      const placeholders = values.map(() => "?").join(", ");
      await execParams(
        `INSERT INTO ${quoteIdent(tableName)} (${cols}) VALUES (${placeholders})`,
        values,
      );
    },

    activeSample() {
      return sample;
    },
  };

  return engine;
}
