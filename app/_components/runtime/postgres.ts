"use client";

import { PGlite } from "@electric-sql/pglite";
import type { QueryExecResult, SqlValue } from "sql.js";
import type {
  ColumnSpec,
  ColumnConstraintInfo,
  ForeignKeyInfo,
  TableRebuildSpec,
  TableColumnInfo,
} from "./sqlite";
import {
  findPostgresSampleDatabase,
  POSTGRES_BLANK_DATABASE,
  type PostgresSampleDatabase,
} from "./postgresSamples";

type PgliteResult = Awaited<ReturnType<PGlite["exec"]>>[number];

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

/** Map PostgreSQL type OIDs to human-readable type names. */
const PG_TYPE_NAMES: Record<number, string> = {
  16: "boolean",
  17: "bytea",
  18: "char",
  20: "bigint",
  21: "smallint",
  23: "integer",
  25: "text",
  26: "oid",
  114: "json",
  142: "xml",
  650: "cidr",
  700: "real",
  701: "double precision",
  790: "money",
  829: "macaddr",
  869: "inet",
  1042: "char",
  1043: "varchar",
  1082: "date",
  1083: "time",
  1114: "timestamp",
  1184: "timestamptz",
  1186: "interval",
  1266: "timetz",
  1560: "bit",
  1562: "varbit",
  1700: "numeric",
  2950: "uuid",
  3802: "jsonb",
};

let pgRebuildCounter = 0;

function pgTypeName(dataTypeID: number): string {
  return PG_TYPE_NAMES[dataTypeID] ?? "";
}

const FK_ACTIONS = new Set(["NO ACTION", "RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT"]);

function normalizeFkAction(action: string | undefined): string {
  const normalized = (action || "NO ACTION").trim().toUpperCase();
  return FK_ACTIONS.has(normalized) ? normalized : "NO ACTION";
}

function renderPgType(col: ColumnSpec): string {
  const type = (col.type || "text").trim();
  if (col.autoIncrement) {
    if (/^big(serial|int)$/i.test(type)) return "bigserial";
    if (/^small(serial|int)$/i.test(type)) return "smallserial";
    return "serial";
  }
  return type;
}

function renderPgColumnDef(col: ColumnSpec): string {
  const name = quoteIdent(col.name);
  const type = renderPgType(col);
  if (col.generated) {
    return `${name} ${type} GENERATED ALWAYS AS (${col.generated.expression}) STORED`;
  }
  const parts = [name, type];
  if (col.notNull) parts.push("NOT NULL");
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  if (col.defaultValue && !col.autoIncrement) parts.push(`DEFAULT ${col.defaultValue}`);
  return parts.join(" ");
}

function renderPgCreateTable(name: string, columns: ColumnSpec[]): string {
  const defs = columns.map((col) => `  ${renderPgColumnDef(col)}`);
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

function resultToQueryExecResult(result: PgliteResult): QueryExecResult & { columnTypes?: string[] } | null {
  if (result.fields.length === 0) return null;
  const columns = result.fields.map((field) => field.name);
  const columnTypes = result.fields.map((field) => pgTypeName(field.dataTypeID));
  return {
    columns,
    columnTypes,
    values: result.rows.map((row) =>
      columns.map((column) => toSqlValue((row as Record<string, unknown>)[column])),
    ),
  };
}

function rowsToQueryExecResult(
  columns: string[],
  rows: ReadonlyArray<Record<string, unknown>>,
): QueryExecResult[] {
  return [
    {
      columns,
      values: rows.map((row) => columns.map((column) => toSqlValue(row[column]))),
    },
  ];
}

export interface PostgresEngine {
  loadSampleDatabase: (id: string) => Promise<PostgresSampleDatabase>;
  loadBlankDatabase: () => Promise<PostgresSampleDatabase>;
  exec: (sql: string) => Promise<QueryExecResult[]>;
  execParams: (sql: string, params: unknown[]) => Promise<QueryExecResult[]>;
  execPaged: (
    sql: string,
    pageSize: number,
    offset: number,
  ) => Promise<{ result: QueryExecResult[]; totalCount: number }>;
  listTables: () => Promise<string[]>;
  listViews: () => Promise<string[]>;
  listIndexes: () => Promise<string[]>;
  listTriggers: () => Promise<string[]>;
  listColumns: (name: string) => Promise<TableColumnInfo[]>;
  listForeignKeys: (name: string) => Promise<ForeignKeyInfo[]>;
  getColumnConstraintInfo: (tableName: string) => Promise<ColumnConstraintInfo[]>;
  rebuildTable: (spec: TableRebuildSpec) => Promise<void>;
  dropEntity: (
    name: string,
    kind: "table" | "view" | "index" | "trigger",
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
  activeSample: () => PostgresSampleDatabase;
}

async function createFreshDatabase(sample: PostgresSampleDatabase): Promise<PGlite> {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(sample.sql);
  return db;
}

export async function createPostgresEngine(
  initialSampleId: string,
): Promise<PostgresEngine> {
  let sample = findPostgresSampleDatabase(initialSampleId);
  let db = await createFreshDatabase(sample);

  async function queryRows<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const result = await db.query<T>(sql, params);
    return result.rows;
  }

  const engine: PostgresEngine = {
    async loadSampleDatabase(id) {
      sample = findPostgresSampleDatabase(id);
      const next = await createFreshDatabase(sample);
      await db.close();
      db = next;
      return sample;
    },

    async loadBlankDatabase() {
      sample = POSTGRES_BLANK_DATABASE;
      const next = new PGlite();
      await next.waitReady;
      await db.close();
      db = next;
      return sample;
    },

    async exec(sql) {
      const results = await db.exec(sql);
      return results
        .map(resultToQueryExecResult)
        .filter((result): result is QueryExecResult => result !== null);
    },

    async execParams(sql, params) {
      const result = await db.query<Record<string, unknown>>(sql, params);
      const exec = resultToQueryExecResult({
        fields: result.fields,
        rows: result.rows,
        affectedRows: result.affectedRows,
      } as PgliteResult);
      return exec ? [exec] : [];
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
      const result = await engine.exec(
        `${base} LIMIT ${Math.max(1, pageSize)} OFFSET ${Math.max(0, offset)}`,
      );
      if (totalCount === 0) totalCount = result[0]?.values.length ?? 0;
      return { result, totalCount };
    },

    async listTables() {
      const rows = await queryRows<{ table_name: string }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      return rows.map((row) => row.table_name);
    },

    async listViews() {
      const rows = await queryRows<{ table_name: string }>(`
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      return rows.map((row) => row.table_name);
    },

    async listIndexes() {
      const rows = await queryRows<{ indexname: string }>(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY indexname
      `);
      return rows.map((row) => row.indexname);
    },

    async listTriggers() {
      const rows = await queryRows<{ trigger_name: string }>(`
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY trigger_name
      `);
      return rows.map((row) => row.trigger_name);
    },

    async listColumns(name) {
      const rows = await queryRows<{
        ordinal_position: number;
        column_name: string;
        formatted_type: string | null;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
        is_generated: string;
        generation_expression: string | null;
        pk_position: number | null;
      }>(
        `
        SELECT
          c.ordinal_position,
          c.column_name,
          COALESCE(pg_catalog.format_type(a.atttypid, a.atttypmod), c.data_type) AS formatted_type,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.is_generated,
          c.generation_expression,
          kcu.ordinal_position AS pk_position
        FROM information_schema.columns c
        JOIN pg_catalog.pg_namespace n
          ON n.nspname = c.table_schema
        JOIN pg_catalog.pg_class cls
          ON cls.relnamespace = n.oid
         AND cls.relname = c.table_name
        JOIN pg_catalog.pg_attribute a
          ON a.attrelid = cls.oid
         AND a.attname = c.column_name
         AND a.attnum > 0
        LEFT JOIN information_schema.table_constraints tc
          ON tc.table_schema = c.table_schema
         AND tc.table_name = c.table_name
         AND tc.constraint_type = 'PRIMARY KEY'
        LEFT JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_schema = tc.constraint_schema
         AND kcu.constraint_name = tc.constraint_name
         AND kcu.table_name = c.table_name
         AND kcu.column_name = c.column_name
        WHERE c.table_schema = 'public' AND c.table_name = $1
        ORDER BY c.ordinal_position
        `,
        [name],
      );
      return rows.map((row) => ({
        cid: Number(row.ordinal_position) - 1,
        name: row.column_name,
        type: row.formatted_type || row.data_type,
        notNull: row.is_nullable === "NO",
        defaultValue: row.is_generated === "ALWAYS" ? null : row.column_default,
        pk: row.pk_position ? Number(row.pk_position) : 0,
        generated:
          row.is_generated === "ALWAYS" && row.generation_expression != null
            ? {
                expression: row.generation_expression,
                // PostgreSQL only supports STORED generated columns.
                storageType: "STORED" as const,
              }
            : null,
      }));
    },

    async listForeignKeys(name) {
      const rows = await queryRows<{
        from_column: string;
        to_table: string;
        to_column: string;
        update_rule: string;
        delete_rule: string;
      }>(
        `
        SELECT
          kcu.column_name AS from_column,
          ccu.table_name AS to_table,
          ccu.column_name AS to_column,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.constraint_schema = tc.constraint_schema
        JOIN information_schema.referential_constraints rc
          ON rc.constraint_name = tc.constraint_name
         AND rc.constraint_schema = tc.constraint_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY kcu.ordinal_position
        `,
        [name],
      );
      return rows.map((row) => ({
        from: row.from_column,
        table: row.to_table,
        to: row.to_column,
        onDelete: row.delete_rule,
        onUpdate: row.update_rule,
      }));
    },

    async getColumnConstraintInfo(tableName) {
      const cols = await engine.listColumns(tableName);
      const uniqueRows = await queryRows<{ column_name: string }>(
        `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name
         AND kcu.constraint_schema = tc.constraint_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'UNIQUE'
        `,
        [tableName],
      );
      const unique = new Set(uniqueRows.map((row) => row.column_name));
      return cols.map((col) => ({
        name: col.name,
        isPrimaryKey: col.pk > 0,
        isAutoIncrement: /^nextval\('([^']+)'::regclass\)$/i.test(
          col.defaultValue ?? "",
        ),
        isUnique: unique.has(col.name),
      }));
    },

    async rebuildTable(spec) {
      const finalName = spec.newName.trim();
      if (!finalName) throw new Error("Table name cannot be empty.");
      const columns = spec.columns.filter((col) => col.name.trim()).map((col) => ({
        ...col,
        name: col.name.trim(),
        type: (col.type || "text").trim(),
      }));
      if (columns.length === 0) throw new Error("A table must have at least one column.");

      // Build rename map: originalName → new name for all renamed columns.
      const renameMap = new Map<string, string>();
      for (const col of columns) {
        if (col.originalName && col.originalName !== col.name) {
          renameMap.set(col.originalName, col.name);
        }
      }

      // Patch generated column expressions that reference a renamed column.
      // This prevents CREATE TABLE from failing with "column X does not exist"
      // when a column referenced inside a GENERATED ALWAYS AS expression is renamed.
      // `validatePgStructure` ensures all column names are valid unquoted identifiers
      // (/^[A-Za-z_][A-Za-z0-9_]*$/), so newName is always safe to use unquoted.
      const patchedColumns =
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

      const tmpName = `${spec.originalName}__tmp_rebuild_${++pgRebuildCounter}`;
      const createSql = renderPgCreateTable(tmpName, patchedColumns);
      const copyable = patchedColumns.filter((col) => col.originalName && !col.generated);
      const targetCols = copyable.map((col) => quoteIdent(col.name)).join(", ");
      const sourceCols = copyable.map((col) => quoteIdent(col.originalName!)).join(", ");
      try {
        await db.exec("BEGIN");
        await db.exec(createSql);
        if (copyable.length > 0) {
          await db.exec(
            `INSERT INTO ${quoteIdent(tmpName)} (${targetCols}) SELECT ${sourceCols} FROM ${quoteIdent(spec.originalName)}`,
          );
        }
        await db.exec(`DROP TABLE ${quoteIdent(spec.originalName)} CASCADE`);
        await db.exec(`ALTER TABLE ${quoteIdent(tmpName)} RENAME TO ${quoteIdent(finalName)}`);
        await db.exec("COMMIT");
      } catch (err) {
        try {
          await db.exec("ROLLBACK");
        } catch {
          // ignore rollback failures
        }
        throw err;
      }
    },

    async dropEntity(name, kind) {
      const keyword =
        kind === "table"
          ? "TABLE"
          : kind === "view"
            ? "VIEW"
            : kind === "index"
              ? "INDEX"
              : "TRIGGER";
      if (kind === "trigger") {
        const rows = await queryRows<{ event_object_table: string }>(
          `SELECT event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' AND trigger_name = $1 LIMIT 1`,
          [name],
        );
        const table = rows[0]?.event_object_table;
        if (!table) return;
        await db.exec(`DROP TRIGGER IF EXISTS ${quoteIdent(name)} ON ${quoteIdent(table)}`);
      } else {
        await db.exec(`DROP ${keyword} IF EXISTS ${quoteIdent(name)} CASCADE`);
      }
    },

    async truncateTable(name) {
      await db.exec(`TRUNCATE TABLE ${quoteIdent(name)} RESTART IDENTITY CASCADE`);
    },

    async getDDL(name) {
      const tableRows = await queryRows<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 AND table_type = 'BASE TABLE'`,
        [name],
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
      const viewRows = await queryRows<{ definition: string }>(
        `SELECT definition FROM pg_views WHERE schemaname = 'public' AND viewname = $1`,
        [name],
      );
      if (viewRows.length > 0 && viewRows[0].definition) {
        return `CREATE VIEW ${quoteIdent(name)} AS\n${viewRows[0].definition}`;
      }
      const indexRows = await queryRows<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
        [name],
      );
      if (indexRows.length > 0 && indexRows[0].indexdef) {
        return `${indexRows[0].indexdef};`;
      }
      const trigRows = await queryRows<{ triggerdef: string; funcdef: string }>(
        `SELECT
           pg_get_triggerdef(t.oid) AS triggerdef,
           pg_get_functiondef(p.oid) AS funcdef
         FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
         JOIN pg_proc p ON p.oid = t.tgfoid
         WHERE t.tgname = $1
           AND NOT t.tgisinternal
         LIMIT 1`,
        [name],
      );
      if (trigRows.length > 0) {
        const { funcdef, triggerdef } = trigRows[0];
        return `${funcdef}\n\n${triggerdef};`;
      }
      return "";
    },

    async deleteRows(tableName, pkColumns, pkRows) {
      let deleted = 0;
      for (const row of pkRows) {
        const where = pkColumns.map((column, i) => `${quoteIdent(column)} = $${i + 1}`).join(" AND ");
        const result = await db.query(`DELETE FROM ${quoteIdent(tableName)} WHERE ${where}`, [...row]);
        deleted += result.affectedRows ?? 0;
      }
      return deleted;
    },

    async updateRows(tableName, updates) {
      let count = 0;
      for (const update of updates) {
        await db.query(
          `UPDATE ${quoteIdent(tableName)}
           SET ${quoteIdent(update.column)} = $1
           WHERE ctid = (
             SELECT ctid FROM ${quoteIdent(tableName)} ORDER BY ctid LIMIT 1 OFFSET $2
           )`,
          [update.value, update.rowIndex],
        );
        count += 1;
      }
      return count;
    },

    async insertRow(tableName, columnNames, values) {
      const cols = columnNames.map(quoteIdent).join(", ");
      const params = values.map((_, i) => `$${i + 1}`).join(", ");
      await db.query(
        `INSERT INTO ${quoteIdent(tableName)} (${cols}) VALUES (${params})`,
        values,
      );
    },

    activeSample() {
      return sample;
    },
  };

  return engine;
}

export function resultFromRows(
  columns: string[],
  rows: ReadonlyArray<Record<string, unknown>>,
): QueryExecResult[] {
  return rowsToQueryExecResult(columns, rows);
}
