"use client";

// PGlite and PGliteWorker are loaded from the jsDelivr CDN at runtime
// (same pattern as SQLite, DuckDB, Pyodide) to keep the large WASM payload
// off Vercel's bandwidth budget and avoid Turbopack build-time issues.
// CDN URLs and version are defined in cdn.ts.

import type { PGlite } from "@electric-sql/pglite";
import type { PGliteWorker as PGliteWorkerType } from "@electric-sql/pglite/worker";
import type { QueryExecResult, SqlValue } from "./sqlite-wasm";
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
import { PGLITE_WORKER_CDN } from "./cdn";

let _pgliteWorkerModulePromise: Promise<{ PGliteWorker: typeof PGliteWorkerType }> | null = null;

function loadPGliteWorkerModule(): Promise<{ PGliteWorker: typeof PGliteWorkerType }> {
  if (!_pgliteWorkerModulePromise) {
    _pgliteWorkerModulePromise = import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ PGLITE_WORKER_CDN
    ) as Promise<{ PGliteWorker: typeof PGliteWorkerType }>;
  }
  return _pgliteWorkerModulePromise;
}

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

function renderPgCreateTable(
  schema: string,
  name: string,
  columns: ColumnSpec[],
): string {
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
  return `CREATE TABLE ${quoteIdent(schema)}.${quoteIdent(name)} (\n${defs.join(",\n")}\n)`;
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
  listTriggers: (schema?: string) => Promise<string[]>;
  listColumns: (name: string, schema?: string) => Promise<TableColumnInfo[]>;
  listForeignKeys: (name: string, schema?: string) => Promise<ForeignKeyInfo[]>;
  getColumnConstraintInfo: (tableName: string, schema?: string) => Promise<ColumnConstraintInfo[]>;
  createTable: (name: string, columns: ColumnSpec[], schema?: string) => Promise<void>;
  rebuildTable: (spec: TableRebuildSpec, schema?: string) => Promise<void>;
  dropEntity: (
    name: string,
    kind: "table" | "view" | "index" | "trigger",
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
    updates: ReadonlyArray<{ rowIndex: number; column: string; value: unknown }>,
    schema?: string,
  ) => Promise<number>;
  insertRow: (
    tableName: string,
    columnNames: string[],
    values: unknown[],
    schema?: string,
  ) => Promise<void>;
  activeSample: () => PostgresSampleDatabase;
  /** Try to import a SQL dump into a fresh sandbox worker. If the SQL
   *  executes cleanly, swap the engine over to it. If it throws, the
   *  sandbox is discarded and the existing database stays intact. */
  importSqlDump: (sql: string) => Promise<PostgresSampleDatabase>;
  close: () => Promise<void>;
}

async function createFreshWorker(opts: { dataDir?: string } = {}): Promise<PGlite> {
  // Pass a unique `id` so this PGliteWorker instance gets its own leader-
  // election lock and BroadcastChannel. Without a unique id every instance
  // with the same worker URL shares the same lock, meaning an unclosed
  // PGliteWorker from a previous page visit stays leader while the new one
  // becomes a follower — so SQL is silently proxied to the old (already-
  // populated) database, causing "relation already exists" errors.
  //
  // When `dataDir` is provided (Phase 4 OPFS persistence), it is forwarded
  // to the worker's `init` callback which passes it to `new PGlite(opts)`.
  // PGlite recognises the `opfs-ahp://` scheme and uses the OPFS Access
  // Handle Pool VFS to persist data across reloads.
  const { PGliteWorker } = await loadPGliteWorkerModule();
  return new PGliteWorker(
    new Worker(new URL("./postgres-worker.ts", import.meta.url)),
    {
      id: `pglite-${crypto.randomUUID()}`,
      ...(opts.dataDir ? { dataDir: opts.dataDir } : {}),
    },
  ) as unknown as PGlite;
}

/** True when the connected PGlite cluster already has at least one
 *  user table in the `public` schema — i.e. it is an existing OPFS
 *  workspace we should *not* re-seed. */
async function pgHasUserTables(db: PGlite): Promise<boolean> {
  try {
    const res = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pg_tables WHERE schemaname = 'public'`,
    );
    return Number(res.rows[0]?.count ?? "0") > 0;
  } catch {
    return false;
  }
}

interface CreateDbOptions {
  /** OPFS dataDir (e.g. `"opfs-ahp://workspaces/ws_x/postgres"`).
   *  When omitted, PGlite runs in-memory. */
  dataDir?: string;
  /** When true, never run the sample seed (used by `loadSampleDatabase`
   *  to force a clean rebuild even when the workspace was previously
   *  populated). */
  forceSeed?: boolean;
}

async function createFreshDatabase(
  sample: PostgresSampleDatabase,
  opts: CreateDbOptions = {},
): Promise<PGlite> {
  const db = await createFreshWorker({ dataDir: opts.dataDir });
  await db.waitReady;
  // First-open detection for OPFS-backed databases: skip the sample
  // seed when the cluster already has user tables, so a returning user
  // re-attaches to their saved workspace rather than overwriting it.
  if (opts.dataDir && !opts.forceSeed && (await pgHasUserTables(db))) {
    return db;
  }
  if (sample.sql) await db.exec(sample.sql);
  return db;
}

export async function createPostgresEngine(
  initialSampleId: string,
  workspaceId?: string | null,
): Promise<PostgresEngine> {
  let sample = findPostgresSampleDatabase(initialSampleId);
  const dataDir = workspaceId
    ? `opfs-ahp://workspaces/${workspaceId}/postgres`
    : undefined;
  let db = await createFreshDatabase(sample, { dataDir });

  async function queryRows<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const result = await db.query<T>(sql, params);
    return result.rows;
  }

  /** When a workspace is active we cannot point PGlite at a fresh
   *  dataDir on sample switch (that would orphan the OPFS files), so
   *  we drop all user objects in the existing cluster and re-run the
   *  sample seed against it. When no workspace is active we keep the
   *  legacy "spin up a brand-new in-memory PGlite per sample" path. */
  async function rebuildForSample(target: PostgresSampleDatabase): Promise<PGlite> {
    if (dataDir) {
      // In-place reset of the persistent cluster. PGlite supports
      // `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` to wipe
      // every user object in one statement; we keep extensions intact.
      try {
        await db.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
      } catch {
        // If the bulk reset fails (e.g. permissions on a system extension),
        // fall through to per-table drops as a best-effort fallback.
      }
      if (target.sql) await db.exec(target.sql);
      return db;
    }
    const next = await createFreshDatabase(target, { dataDir, forceSeed: true });
    await db.close();
    return next;
  }

  const engine: PostgresEngine = {
    async loadSampleDatabase(id) {
      sample = findPostgresSampleDatabase(id);
      db = await rebuildForSample(sample);
      return sample;
    },

    async loadBlankDatabase() {
      sample = POSTGRES_BLANK_DATABASE;
      if (dataDir) {
        try {
          await db.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
        } catch {
          /* best-effort */
        }
        return sample;
      }
      const next = await createFreshWorker();
      await next.waitReady;
      await db.close();
      db = next;
      return sample;
    },

    async exec(sql) {
      const results = await db.exec(sql);
      return results.map(resultToQueryExecResult);
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
      const raw = await engine.exec(
        `${base} LIMIT ${Math.max(1, pageSize)} OFFSET ${Math.max(0, offset)}`,
      );
      const result = raw.filter((r): r is QueryExecResult => r !== null);
      if (totalCount === 0) totalCount = result[0]?.values.length ?? 0;
      return { result, totalCount };
    },

    async listSchemas(includeSystem = false) {
      let rows: { nspname: string }[];
      if (includeSystem) {
        rows = await queryRows<{ nspname: string }>(`
          SELECT nspname
          FROM pg_catalog.pg_namespace
          ORDER BY nspname
        `);
      } else {
        rows = await queryRows<{ nspname: string }>(`
          SELECT nspname
          FROM pg_catalog.pg_namespace
          WHERE nspname NOT LIKE 'pg\\_%'
            AND nspname <> 'information_schema'
          ORDER BY nspname
        `);
      }
      return rows.map((row) => row.nspname);
    },

    async createSchema(name) {
      await db.exec(`CREATE SCHEMA ${quoteIdent(name)}`);
    },

    async listTables(schema = "public") {
      const rows = await queryRows<{ table_name: string }>(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1 AND table_type = 'BASE TABLE'
        ORDER BY table_name
        `,
        [schema],
      );
      return rows.map((row) => row.table_name);
    },

    async listViews(schema = "public") {
      const rows = await queryRows<{ table_name: string }>(
        `
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = $1
        ORDER BY table_name
        `,
        [schema],
      );
      return rows.map((row) => row.table_name);
    },

    async listIndexes(schema = "public") {
      const rows = await queryRows<{ indexname: string }>(
        `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = $1
        ORDER BY indexname
        `,
        [schema],
      );
      return rows.map((row) => row.indexname);
    },

    async listTriggers(schema = "public") {
      const rows = await queryRows<{ trigger_name: string }>(
        `
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE trigger_schema = $1
        ORDER BY trigger_name
        `,
        [schema],
      );
      return rows.map((row) => row.trigger_name);
    },

    async listColumns(name, schema = "public") {
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
        WHERE c.table_schema = $2 AND c.table_name = $1
        ORDER BY c.ordinal_position
        `,
        [name, schema],
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

    async listForeignKeys(name, schema = "public") {
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
        WHERE tc.table_schema = $2
          AND tc.table_name = $1
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY kcu.ordinal_position
        `,
        [name, schema],
      );
      return rows.map((row) => ({
        from: row.from_column,
        table: row.to_table,
        to: row.to_column,
        onDelete: row.delete_rule,
        onUpdate: row.update_rule,
      }));
    },

    async getColumnConstraintInfo(tableName, schema = "public") {
      const cols = await engine.listColumns(tableName, schema);
      const uniqueRows = await queryRows<{ column_name: string }>(
        `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name
         AND kcu.constraint_schema = tc.constraint_schema
        WHERE tc.table_schema = $2
          AND tc.table_name = $1
          AND tc.constraint_type = 'UNIQUE'
        `,
        [tableName, schema],
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

    async createTable(name, columns, schema = "public") {
      const finalName = name.trim();
      if (!finalName) throw new Error("Table name cannot be empty.");
      const filteredCols = columns.filter((col) => col.name.trim()).map((col) => ({
        ...col,
        name: col.name.trim(),
        type: (col.type || "text").trim(),
      }));
      if (filteredCols.length === 0) throw new Error("A table must have at least one column.");
      const createSql = renderPgCreateTable(schema, finalName, filteredCols);
      await db.exec(createSql);
    },

    async rebuildTable(spec, schema = "public") {
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
      const schemaPrefix = `${quoteIdent(schema)}.`;
      const createSql = renderPgCreateTable(schema, tmpName, patchedColumns);
      const copyable = patchedColumns.filter((col) => col.originalName && !col.generated);
      const targetCols = copyable.map((col) => quoteIdent(col.name)).join(", ");
      const sourceCols = copyable.map((col) => quoteIdent(col.originalName!)).join(", ");
      // Columns whose CREATE TABLE used SERIAL/BIGSERIAL/SMALLSERIAL —
      // Postgres auto-creates sequences for those, named
      // `<tableName>_<columnName>_seq`. After we rename the table from
      // tmpName to finalName, the sequences keep the tmpName prefix and
      // the column DEFAULTs still reference them by name. Collect the
      // pairs so we can rename the sequences too, leaving the final
      // schema clean of __tmp_rebuild artifacts.
      const serialRenames = patchedColumns
        .filter((col) => col.autoIncrement && !col.generated)
        .map((col) => ({
          oldSeq: `${tmpName}_${col.name}_seq`,
          newSeq: `${finalName}_${col.name}_seq`,
        }));
      try {
        await db.exec("BEGIN");
        await db.exec(createSql);
        if (copyable.length > 0) {
          await db.exec(
            `INSERT INTO ${schemaPrefix}${quoteIdent(tmpName)} (${targetCols}) SELECT ${sourceCols} FROM ${schemaPrefix}${quoteIdent(spec.originalName)}`,
          );
        }
        await db.exec(`DROP TABLE ${schemaPrefix}${quoteIdent(spec.originalName)} CASCADE`);
        await db.exec(`ALTER TABLE ${schemaPrefix}${quoteIdent(tmpName)} RENAME TO ${quoteIdent(finalName)}`);
        for (const { oldSeq, newSeq } of serialRenames) {
          if (oldSeq === newSeq) continue;
          await db.exec(
            `ALTER SEQUENCE ${schemaPrefix}${quoteIdent(oldSeq)} RENAME TO ${quoteIdent(newSeq)}`,
          );
        }
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

    async dropEntity(name, kind, schema = "public") {
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
          `SELECT event_object_table FROM information_schema.triggers WHERE trigger_schema = $2 AND trigger_name = $1 LIMIT 1`,
          [name, schema],
        );
        const table = rows[0]?.event_object_table;
        if (!table) return;
        await db.exec(`DROP TRIGGER IF EXISTS ${quoteIdent(name)} ON ${quoteIdent(schema)}.${quoteIdent(table)}`);
      } else {
        await db.exec(`DROP ${keyword} IF EXISTS ${quoteIdent(schema)}.${quoteIdent(name)} CASCADE`);
      }
    },

    async truncateTable(name, schema = "public") {
      await db.exec(`TRUNCATE TABLE ${quoteIdent(schema)}.${quoteIdent(name)} RESTART IDENTITY CASCADE`);
    },

    async getDDL(name, schema = "public") {
      const tableRows = await queryRows<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $2 AND table_name = $1 AND table_type = 'BASE TABLE'`,
        [name, schema],
      );
      if (tableRows.length > 0) {
        const [cols, fks] = await Promise.all([
          engine.listColumns(name, schema),
          engine.listForeignKeys(name, schema),
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
        return `CREATE TABLE ${quoteIdent(schema)}.${quoteIdent(name)} (\n${colSql.join(",\n")}\n);`;
      }
      const viewRows = await queryRows<{ definition: string }>(
        `SELECT definition FROM pg_views WHERE schemaname = $2 AND viewname = $1`,
        [name, schema],
      );
      if (viewRows.length > 0 && viewRows[0].definition) {
        return `CREATE VIEW ${quoteIdent(schema)}.${quoteIdent(name)} AS\n${viewRows[0].definition}`;
      }
      const indexRows = await queryRows<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE schemaname = $2 AND indexname = $1`,
        [name, schema],
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
         JOIN pg_namespace n ON n.oid = c.relnamespace
         JOIN pg_proc p ON p.oid = t.tgfoid
         WHERE t.tgname = $1
           AND n.nspname = $2
           AND NOT t.tgisinternal
         LIMIT 1`,
        [name, schema],
      );
      if (trigRows.length > 0) {
        const { funcdef, triggerdef } = trigRows[0];
        return `${funcdef}\n\n${triggerdef};`;
      }
      return "";
    },

    async deleteRows(tableName, pkColumns, pkRows, schema = "public") {
      let deleted = 0;
      const qualifiedTable = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;
      for (const row of pkRows) {
        const where = pkColumns.map((column, i) => `${quoteIdent(column)} = $${i + 1}`).join(" AND ");
        const result = await db.query(`DELETE FROM ${qualifiedTable} WHERE ${where}`, [...row]);
        deleted += result.affectedRows ?? 0;
      }
      return deleted;
    },

    async updateRows(tableName, updates, schema = "public") {
      let count = 0;
      const qualifiedTable = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;
      for (const update of updates) {
        await db.query(
          `UPDATE ${qualifiedTable}
           SET ${quoteIdent(update.column)} = $1
           WHERE ctid = (
             SELECT ctid FROM ${qualifiedTable} ORDER BY ctid LIMIT 1 OFFSET $2
           )`,
          [update.value, update.rowIndex],
        );
        count += 1;
      }
      return count;
    },

    async insertRow(tableName, columnNames, values, schema = "public") {
      const qualified = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;
      if (columnNames.length === 0) {
        await db.exec(`INSERT INTO ${qualified} DEFAULT VALUES`);
        return;
      }
      const cols = columnNames.map(quoteIdent).join(", ");
      const params = values.map((_, i) => `$${i + 1}`).join(", ");
      await db.query(
        `INSERT INTO ${qualified} (${cols}) VALUES (${params})`,
        values,
      );
    },

    activeSample() {
      return sample;
    },

    async importSqlDump(sql) {
      const next = await createFreshWorker();
      await next.waitReady;
      try {
        await next.exec(sql);
      } catch (err) {
        try {
          await next.close();
        } catch {
          /* ignore */
        }
        throw err;
      }
      try {
        await db.close();
      } catch {
        /* ignore */
      }
      db = next;
      sample = POSTGRES_BLANK_DATABASE;
      return sample;
    },

    async close() {
      await db.close();
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
