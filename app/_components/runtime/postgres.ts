"use client";

// PGlite and PGliteWorker are loaded from the jsDelivr CDN at runtime
// (same pattern as SQLite, DuckDB, Pyodide) to keep the large WASM payload
// off this app's own origin and avoid Turbopack build-time issues.
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
import { topoSortByForeignKeys } from "../sql/utils/exportOrder";
import { defaultGeneratesUniqueValue } from "../sql/utils/duplicateRow";
import { fetchDatasetText } from "./remoteDatasets";
import {
  toDateOnlyString,
  toPgArrayLiteral,
  toTimestampString,
} from "./valueFormat";

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

function isPlainObject(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function toSqlValue(value: unknown): SqlValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (value instanceof Date) return toTimestampString(value, true) ?? value.toISOString();
  // Booleans stay booleans: the grid renders `true`/`false` and the exporters
  // pick the right literal per format (see SqlValue).
  if (typeof value === "boolean") return value;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "bigint") return Number(value);
  // Array columns render as the Postgres array literal `{1,2,3}`, so a
  // displayed value pastes straight back into SQL and an edited cell
  // round-trips through the implicit text -> array cast on UPDATE.
  if (Array.isArray(value)) return toPgArrayLiteral(value);
  // Composite/record columns arrive as plain objects; JSON keeps them
  // readable. (json/jsonb columns are parsed to their raw text upstream —
  // see the worker's type parsers — so they never reach this branch.)
  if (isPlainObject(value)) {
    try {
      return JSON.stringify(value, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      );
    } catch {
      return String(value);
    }
  }
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
  // Array types (OID of the element type's array). Without these, array
  // columns fall back to a misleading "text" label in the result header.
  1000: "boolean[]",
  1005: "smallint[]",
  1007: "integer[]",
  1016: "bigint[]",
  1009: "text[]",
  1014: "char[]",
  1015: "varchar[]",
  1021: "real[]",
  1022: "double precision[]",
  1231: "numeric[]",
  1115: "timestamp[]",
  1185: "timestamptz[]",
  1182: "date[]",
  1183: "time[]",
  1187: "interval[]",
  2951: "uuid[]",
  199: "json[]",
  3807: "jsonb[]",
  1041: "inet[]",
  1561: "bit[]",
};

let pgRebuildCounter = 0;

/** `serial` / `bigserial` / `smallserial` when a column is an integer whose
 *  default reads from a sequence it owns — i.e. it was declared `serial`.
 *  Re-emitting the shorthand is what makes a dump replayable: writing
 *  `integer DEFAULT nextval('t_id_seq'::regclass)` on its own fails on import
 *  with `relation "t_id_seq" does not exist`. Returns null for anything else,
 *  including a default pointing at a standalone sequence the column does not
 *  own (that one needs a real CREATE SEQUENCE). */
function serialTypeFor(
  colType: string,
  colDefault: string | null,
  ownedSequence: string | null,
): string | null {
  if (!colDefault || !ownedSequence) return null;
  if (!/^nextval\('.*'::regclass\)$/.test(colDefault.trim())) return null;
  switch (colType) {
    case "integer":
      return "serial";
    case "bigint":
      return "bigserial";
    case "smallint":
      return "smallserial";
    default:
      return null;
  }
}

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
  // PGlite returns `date` (OID 1082) as a JS Date at UTC midnight; render
  // as plain `YYYY-MM-DD` (timestamps keep their time component).
  const columnIsDate = result.fields.map((field) => field.dataTypeID === 1082);
  // `timestamp without time zone` (OID 1114) also arrives as a Date, but must
  // not gain the `+00` suffix that `timestamptz` (1184) carries.
  const columnIsNaiveTimestamp = result.fields.map(
    (field) => field.dataTypeID === 1114,
  );
  return {
    columns,
    columnTypes,
    values: result.rows.map((row) =>
      columns.map((column, i) => {
        const value = (row as Record<string, unknown>)[column];
        if (columnIsDate[i]) return toDateOnlyString(value) ?? toSqlValue(value);
        if (columnIsNaiveTimestamp[i]) {
          return toTimestampString(value, false) ?? toSqlValue(value);
        }
        return toSqlValue(value);
      }),
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

/** Schema objects the sidebar lists and can drop. `function` covers
 *  procedures too; its `name` carries the argument list (`f(integer)`) so
 *  overloads stay addressable. */
export type PgEntityKind =
  | "table"
  | "view"
  | "index"
  | "trigger"
  | "sequence"
  | "function";

/** The non-table objects a SQL dump has to carry. Each `sql` is a complete,
 *  terminated statement, ready to concatenate. */
export interface PgSchemaDumpObjects {
  /** Standalone sequences (those a `serial` column owns are reconstructed
   *  from the column instead, so they are excluded here). */
  sequences: { name: string; sql: string }[];
  /** `setval` calls restoring each sequence's position, table data included,
   *  so the first insert after a restore doesn't collide with existing keys. */
  sequenceSetvals: string[];
  /** Indexes not backed by a constraint (those come with the constraint). */
  indexes: { name: string; sql: string }[];
  functions: { name: string; sql: string }[];
  views: { name: string; sql: string }[];
  triggers: { name: string; sql: string }[];
  /** Tables with a `GENERATED ALWAYS AS IDENTITY` column. Their INSERTs need
   *  `OVERRIDING SYSTEM VALUE`, or the restore fails with "cannot insert a
   *  non-DEFAULT value into column". */
  identityAlwaysTables: string[];
}

export interface PostgresEngine {
  loadSampleDatabase: (id: string) => Promise<PostgresSampleDatabase>;
  loadBlankDatabase: () => Promise<PostgresSampleDatabase>;
  exec: (sql: string) => Promise<(QueryExecResult | null)[]>;
  /** `exec` plus each statement's affected-row count (null when the statement
   *  reports none), so the UI can say "5 rows affected" after a write instead
   *  of only "statement executed successfully". */
  execWithCounts: (
    sql: string,
  ) => Promise<{
    sets: (QueryExecResult | null)[];
    affectedRows: (number | null)[];
  }>;
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
  listSequences: (schema?: string) => Promise<string[]>;
  /** User-defined functions and procedures, as `name(arg types)` so overloads
   *  stay distinguishable (and the label is what DROP FUNCTION needs). */
  listFunctions: (schema?: string) => Promise<string[]>;
  listColumns: (name: string, schema?: string) => Promise<TableColumnInfo[]>;
  listForeignKeys: (name: string, schema?: string) => Promise<ForeignKeyInfo[]>;
  getColumnConstraintInfo: (tableName: string, schema?: string) => Promise<ColumnConstraintInfo[]>;
  createTable: (name: string, columns: ColumnSpec[], schema?: string) => Promise<void>;
  rebuildTable: (spec: TableRebuildSpec, schema?: string) => Promise<void>;
  dropEntity: (
    name: string,
    kind: PgEntityKind,
    schema?: string,
  ) => Promise<void>;
  truncateTable: (name: string, schema?: string) => Promise<void>;
  getDDL: (name: string, schema?: string) => Promise<string>;
  /** Every non-table object in `schema`, in the order a dump must replay
   *  them. Drives the SQL-dump export, which previously emitted tables only. */
  getSchemaDumpObjects: (schema?: string) => Promise<PgSchemaDumpObjects>;
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
      /** Identify the row by primary-key value(s) instead of ctid offset. */
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
  activeSample: () => PostgresSampleDatabase;
  /** Import a SQL dump into a fresh sandbox worker; swap over only when it
   *  executes cleanly, else the existing database stays intact. */
  importSqlDump: (sql: string) => Promise<PostgresSampleDatabase>;
  /** Full-fidelity PGDATA tarball (PGlite's `dumpDataDir`). Deliberately
   *  uncompressed: the cloud bundle codec gzips the container once. */
  dumpDataDir: () => Promise<Blob>;
  /** Boot a fresh sandbox worker from a PGDATA tarball; swap over only when
   *  it comes up healthy. Restored database runs in-memory this session. */
  importDataDir: (tarball: Blob) => Promise<PostgresSampleDatabase>;
  close: () => Promise<void>;
}

async function createFreshWorker(
  opts: { dataDir?: string; loadDataDir?: Blob } = {},
): Promise<PGlite> {
  // Unique `id` is required: instances sharing a worker URL share one
  // leader-election lock, so an unclosed PGliteWorker from a previous visit
  // would stay leader and silently proxy SQL to the old database
  // ("relation already exists"). `dataDir` (opfs-ahp:// scheme) enables
  // OPFS persistence; `loadDataDir` boots from a PGDATA tarball instead of
  // initdb (Blobs are structured-cloneable, surviving the postMessage hop).
  const { PGliteWorker } = await loadPGliteWorkerModule();
  return new PGliteWorker(
    new Worker(new URL("./postgres-worker.ts", import.meta.url)),
    {
      id: `pglite-${crypto.randomUUID()}`,
      ...(opts.dataDir ? { dataDir: opts.dataDir } : {}),
      ...(opts.loadDataDir ? { loadDataDir: opts.loadDataDir } : {}),
    },
  ) as unknown as PGlite;
}

/** Prepare a server-authored SQL script for PGlite: drop psql
 *  meta-commands and CREATE/DROP DATABASE lines, which can never succeed
 *  in a single-database embedded build. */
export function preparePostgresScriptForPglite(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("\\")) return false; // psql meta-command (\c, \connect, …)
      if (/^(CREATE|DROP)\s+DATABASE\b/i.test(trimmed)) return false;
      return true;
    })
    .join("\n");
}

/** Advance dollar-quote state across one line. `tag` is the open tag (`$$`,
 *  `$fn$`, …) or null outside a dollar-quoted string. */
function trackDollarQuotes(line: string, tag: string | null): string | null {
  let i = 0;
  let open = tag;
  while (i < line.length) {
    if (open === null) {
      const m = /\$[A-Za-z_][A-Za-z_0-9]*\$|\$\$/.exec(line.slice(i));
      if (!m) return null;
      open = m[0];
      i += m.index + m[0].length;
    } else {
      const at = line.indexOf(open, i);
      if (at === -1) return open;
      i = at + open.length;
      open = null;
    }
  }
  return open;
}

/** Drop a script's own transaction-control statements. The workspace import
 *  path wraps the whole dump in one transaction so a failure can't leave a
 *  half-replaced database; a `COMMIT;` inside the script would end that
 *  transaction early and defeat it.
 *
 *  Only statements standing alone on their line *outside a dollar-quoted
 *  string* are removed. That exception is the whole point: `BEGIN` and `END;`
 *  are how every plpgsql body is written, and stripping those would corrupt
 *  each function the dump defines. */
export function stripTransactionControl(sql: string): string {
  const out: string[] = [];
  let tag: string | null = null;
  for (const line of sql.split("\n")) {
    if (
      tag === null &&
      /^\s*(BEGIN|COMMIT|END|ROLLBACK|START\s+TRANSACTION)(\s+(WORK|TRANSACTION))?\s*;\s*$/i.test(
        line,
      )
    ) {
      continue;
    }
    tag = trackDollarQuotes(line, tag);
    out.push(line);
  }
  return out.join("\n");
}

/** Resolve `sample`'s seed SQL (inline or remote). Resolve BEFORE tearing
 *  anything down so a failed download leaves the current database intact. */
async function resolveSampleSql(sample: PostgresSampleDatabase): Promise<string> {
  if (sample.remoteSql) {
    return preparePostgresScriptForPglite(await fetchDatasetText(sample.remoteSql));
  }
  return sample.sql ?? "";
}

/** True when the cluster already has a user table in `public`, i.e. an
 *  existing OPFS workspace that must NOT be re-seeded. */
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
  /** OPFS dataDir (e.g. `"opfs-ahp://workspaces/ws_x/postgres"`);
   *  omitted = in-memory. */
  dataDir?: string;
  /** Force a clean rebuild even when the workspace was populated. */
  forceSeed?: boolean;
}

async function createFreshDatabase(
  sample: PostgresSampleDatabase,
  opts: CreateDbOptions = {},
): Promise<PGlite> {
  const db = await createFreshWorker({ dataDir: opts.dataDir });
  await db.waitReady;
  // Skip the seed when an OPFS cluster already has user tables — the user
  // is re-attaching to a saved workspace.
  if (opts.dataDir && !opts.forceSeed && (await pgHasUserTables(db))) {
    return db;
  }
  const sql = await resolveSampleSql(sample);
  if (sql) await db.exec(sql);
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

  /** With a workspace active, a fresh dataDir would orphan the OPFS files,
   *  so the existing cluster is wiped and re-seeded in place; otherwise a
   *  brand-new in-memory PGlite is spun up per sample. */
  async function rebuildForSample(target: PostgresSampleDatabase): Promise<PGlite> {
    if (dataDir) {
      // Resolve the seed SQL before wiping so a failed download can't
      // leave the workspace empty.
      const sql = await resolveSampleSql(target);
      // In-place reset; extensions stay intact.
      try {
        await db.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
      } catch {
        // Bulk reset failed; fall through to best-effort per-table drops.
      }
      if (sql) await db.exec(sql);
      return db;
    }
    const next = await createFreshDatabase(target, { dataDir, forceSeed: true });
    await db.close();
    return next;
  }

  /** `CREATE TABLE` reconstructed from `pg_catalog`, not from
   *  `information_schema`. It is what both "View DDL" and the SQL-dump export
   *  emit, so it has to be replayable: `serial` columns keep their sequence,
   *  identity columns keep their `GENERATED … AS IDENTITY` clause, and UNIQUE
   *  / CHECK / EXCLUDE constraints are carried over verbatim from
   *  `pg_get_constraintdef` instead of being silently dropped. */
  async function buildTableDdl(name: string, schema: string): Promise<string> {
    const qualified = `${quoteIdent(schema)}.${quoteIdent(name)}`;
    const cols = await queryRows<{
      attname: string;
      coltype: string;
      attnotnull: boolean;
      coldefault: string | null;
      attidentity: string;
      attgenerated: string;
      owned_sequence: string | null;
    }>(
      `
      SELECT
        a.attname,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS coltype,
        a.attnotnull,
        pg_catalog.pg_get_expr(ad.adbin, ad.adrelid) AS coldefault,
        a.attidentity,
        a.attgenerated,
        (
          SELECT s.relname
          FROM pg_catalog.pg_depend d
          JOIN pg_catalog.pg_class s ON s.oid = d.objid AND s.relkind = 'S'
          WHERE d.refobjid = a.attrelid
            AND d.refobjsubid = a.attnum
            AND d.classid = 'pg_class'::regclass
            AND d.deptype IN ('a', 'i')
          LIMIT 1
        ) AS owned_sequence
      FROM pg_catalog.pg_attribute a
      LEFT JOIN pg_catalog.pg_attrdef ad
        ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
      WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum
      `,
      [qualified],
    );
    // `pg_get_constraintdef` renders PRIMARY KEY / UNIQUE / CHECK / FOREIGN KEY
    // / EXCLUDE exactly as Postgres would; PK first so the DDL reads naturally.
    const constraints = await queryRows<{ conname: string; condef: string }>(
      `
      SELECT conname, pg_catalog.pg_get_constraintdef(oid) AS condef
      FROM pg_catalog.pg_constraint
      WHERE conrelid = $1::regclass AND contype IN ('p', 'u', 'c', 'f', 'x')
      ORDER BY CASE contype
                 WHEN 'p' THEN 0 WHEN 'u' THEN 1 WHEN 'c' THEN 2
                 WHEN 'f' THEN 3 ELSE 4 END,
               conname
      `,
      [qualified],
    );

    const defs = cols.map((col) => {
      const parts = [quoteIdent(col.attname)];
      const serialType = serialTypeFor(col.coltype, col.coldefault, col.owned_sequence);
      if (serialType) {
        // `serial` implies the sequence, its default and NOT NULL, so the
        // dump stays self-contained without a separate CREATE SEQUENCE.
        parts.push(serialType);
        return `  ${parts.join(" ")}`;
      }
      parts.push(col.coltype);
      if (col.attgenerated === "s" && col.coldefault) {
        parts.push(`GENERATED ALWAYS AS (${col.coldefault}) STORED`);
        return `  ${parts.join(" ")}`;
      }
      if (col.attidentity === "a" || col.attidentity === "d") {
        parts.push(
          `GENERATED ${col.attidentity === "a" ? "ALWAYS" : "BY DEFAULT"} AS IDENTITY`,
        );
      } else if (col.coldefault) {
        parts.push(`DEFAULT ${col.coldefault}`);
      }
      if (col.attnotnull) parts.push("NOT NULL");
      return `  ${parts.join(" ")}`;
    });
    for (const c of constraints) {
      defs.push(`  CONSTRAINT ${quoteIdent(c.conname)} ${c.condef}`);
    }
    return `CREATE TABLE ${qualified} (\n${defs.join(",\n")}\n);`;
  }

  const engine: PostgresEngine = {
    async loadSampleDatabase(id) {
      // Rebuild before adopting so a failed download/seed changes nothing.
      const target = findPostgresSampleDatabase(id);
      db = await rebuildForSample(target);
      sample = target;
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

    async execWithCounts(sql) {
      const results = await db.exec(sql);
      return {
        sets: results.map(resultToQueryExecResult),
        affectedRows: results.map((r) =>
          typeof r.affectedRows === "number" ? r.affectedRows : null,
        ),
      };
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

    async listSequences(schema = "public") {
      const rows = await queryRows<{ sequencename: string }>(
        `
        SELECT sequencename
        FROM pg_catalog.pg_sequences
        WHERE schemaname = $1
        ORDER BY sequencename
        `,
        [schema],
      );
      return rows.map((row) => row.sequencename);
    },

    async listFunctions(schema = "public") {
      const rows = await queryRows<{ label: string }>(
        `
        SELECT p.proname || '(' ||
               pg_catalog.pg_get_function_identity_arguments(p.oid) || ')'
               AS label
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = $1 AND p.prokind IN ('f', 'p')
        ORDER BY p.proname, label
        `,
        [schema],
      );
      return rows.map((row) => row.label);
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
        is_identity: string;
        udt_name: string;
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
          c.is_identity,
          c.udt_name,
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
      // Single-column UNIQUE constraints, so the structure editor can offer
      // only legal foreign-key targets.
      const uniqueRows = await queryRows<{ column_name: string }>(
        `
        SELECT a.attname AS column_name
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_class cls ON cls.oid = con.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = cls.relnamespace
        JOIN pg_catalog.pg_attribute a
          ON a.attrelid = cls.oid AND a.attnum = con.conkey[1]
        WHERE n.nspname = $2
          AND cls.relname = $1
          AND con.contype = 'u'
          AND array_length(con.conkey, 1) = 1
        `,
        [name, schema],
      );
      const uniqueColumns = new Set(uniqueRows.map((r) => r.column_name));
      // Enum labels for USER-DEFINED columns (drives the grid's dropdown);
      // one query per schema, only when an enum column is present.
      const enumByType = new Map<string, string[]>();
      if (rows.some((r) => r.data_type === "USER-DEFINED")) {
        const enumRows = await queryRows<{
          typname: string;
          enumlabel: string;
        }>(
          `
          SELECT t.typname, e.enumlabel
          FROM pg_catalog.pg_type t
          JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
          JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = $1
          ORDER BY t.typname, e.enumsortorder
          `,
          [schema],
        );
        for (const r of enumRows) {
          const list = enumByType.get(r.typname);
          if (list) list.push(r.enumlabel);
          else enumByType.set(r.typname, [r.enumlabel]);
        }
      }
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
        enumValues:
          row.data_type === "USER-DEFINED"
            ? (enumByType.get(row.udt_name) ?? null)
            : null,
        unique: uniqueColumns.has(row.column_name),
        identity: row.is_identity === "YES",
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
      return cols.map((col) => {
        // serial/bigserial columns carry a nextval() default; IDENTITY
        // columns carry none but are assigned all the same.
        const isAutoIncrement =
          col.identity === true ||
          /^nextval\('([^']+)'::regclass\)$/i.test(col.defaultValue ?? "");
        return {
          name: col.name,
          isPrimaryKey: col.pk > 0,
          isAutoIncrement,
          isUnique: unique.has(col.name),
          autoPopulated:
            isAutoIncrement || defaultGeneratesUniqueValue(col.defaultValue),
          type: col.type,
          notNull: col.notNull,
          defaultValue: col.defaultValue,
        };
      });
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

      // Patch generated-column expressions referencing a renamed column so
      // CREATE TABLE doesn't fail. validatePgStructure guarantees names are
      // valid unquoted identifiers, so newName is safe unquoted.
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
      // SERIAL columns get auto-created `<table>_<col>_seq` sequences that
      // keep the tmpName prefix after RENAME TO; rename them too so the
      // final schema has no __tmp_rebuild artifacts.
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
        // Auto-named constraints (`<tmpName>_pkey`, …) also keep the temp
        // prefix after RENAME TO; rename them (which also renames their
        // backing indexes).
        const likePattern = `${tmpName.replace(/([%_\\])/g, "\\$1")}%`;
        const tmpConstraints = await db.query<{ conname: string }>(
          `SELECT conname FROM pg_constraint
           WHERE conrelid = $1::regclass AND conname LIKE $2`,
          [`${schemaPrefix}${quoteIdent(finalName)}`, likePattern],
        );
        for (const { conname } of tmpConstraints.rows) {
          const renamed = conname.replace(tmpName, finalName);
          if (renamed === conname) continue;
          await db.exec(
            `ALTER TABLE ${schemaPrefix}${quoteIdent(finalName)} RENAME CONSTRAINT ${quoteIdent(conname)} TO ${quoteIdent(renamed)}`,
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
      if (kind === "function") {
        // `name` is `fn(arg types)`; the identifier and the argument list are
        // quoted separately so an overload can be dropped unambiguously.
        const openParen = name.indexOf("(");
        const fnName = openParen >= 0 ? name.slice(0, openParen) : name;
        const args = openParen >= 0 ? name.slice(openParen) : "()";
        await db.exec(
          `DROP FUNCTION IF EXISTS ${quoteIdent(schema)}.${quoteIdent(fnName)}${args} CASCADE`,
        );
        return;
      }
      const keyword =
        kind === "table"
          ? "TABLE"
          : kind === "view"
            ? "VIEW"
            : kind === "index"
              ? "INDEX"
              : kind === "sequence"
                ? "SEQUENCE"
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
        return buildTableDdl(name, schema);
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
      // `name` for a function carries its argument list, so it is matched
      // against the same `proname(args)` label `listFunctions` produces.
      if (name.includes("(")) {
        const fnRows = await queryRows<{ funcdef: string }>(
          `SELECT pg_catalog.pg_get_functiondef(p.oid) AS funcdef
           FROM pg_catalog.pg_proc p
           JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = $2
             AND p.proname || '(' ||
                 pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' = $1
           LIMIT 1`,
          [name, schema],
        );
        if (fnRows.length > 0 && fnRows[0].funcdef) {
          return `${fnRows[0].funcdef.trimEnd()};`;
        }
      }
      const seqRows = await queryRows<{
        start_value: string;
        increment_by: string;
        min_value: string;
        max_value: string;
        cache_size: string;
        cycle: boolean;
        data_type: string;
        last_value: string | null;
      }>(
        `SELECT start_value::text, increment_by::text, min_value::text,
                max_value::text, cache_size::text, cycle, data_type::text,
                last_value::text
         FROM pg_catalog.pg_sequences
         WHERE schemaname = $2 AND sequencename = $1`,
        [name, schema],
      );
      if (seqRows.length > 0) {
        const s = seqRows[0];
        return (
          `CREATE SEQUENCE ${quoteIdent(schema)}.${quoteIdent(name)}\n` +
          `  AS ${s.data_type}\n` +
          `  START WITH ${s.start_value}\n` +
          `  INCREMENT BY ${s.increment_by}\n` +
          `  MINVALUE ${s.min_value}\n` +
          `  MAXVALUE ${s.max_value}\n` +
          `  CACHE ${s.cache_size}${s.cycle ? "\n  CYCLE" : ""};` +
          (s.last_value != null
            ? `\n-- current value: ${s.last_value}`
            : "")
        );
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

    async getSchemaDumpObjects(schema = "public") {
      // Sequences owned by a serial column are rebuilt from the column's
      // `serial` type (see serialTypeFor), so only standalone ones are
      // emitted — but every sequence still needs its position restored.
      const sequences = await queryRows<{
        name: string;
        owned: boolean;
        start_value: string;
        increment: string;
        min_value: string;
        max_value: string;
        cache_size: string;
        cycle: boolean;
        data_type: string;
      }>(
        `
        SELECT
          c.relname AS name,
          EXISTS (
            SELECT 1 FROM pg_catalog.pg_depend d
            WHERE d.objid = c.oid
              AND d.classid = 'pg_class'::regclass
              AND d.refobjsubid > 0
              AND d.deptype IN ('a', 'i')
          ) AS owned,
          s.seqstart::text AS start_value,
          s.seqincrement::text AS increment,
          s.seqmin::text AS min_value,
          s.seqmax::text AS max_value,
          s.seqcache::text AS cache_size,
          s.seqcycle AS cycle,
          pg_catalog.format_type(s.seqtypid, NULL) AS data_type
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_sequence s ON s.seqrelid = c.oid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind = 'S'
        ORDER BY c.relname
        `,
        [schema],
      );

      const setvals: string[] = [];
      for (const seq of sequences) {
        const qualified = `${quoteIdent(schema)}.${quoteIdent(seq.name)}`;
        try {
          const [state] = await queryRows<{
            last_value: string | null;
            is_called: boolean;
          }>(`SELECT last_value::text AS last_value, is_called FROM ${qualified}`);
          if (state?.last_value != null) {
            setvals.push(
              `SELECT pg_catalog.setval('${schema.replace(/'/g, "''")}.${seq.name.replace(/'/g, "''")}', ${state.last_value}, ${state.is_called ? "true" : "false"});`,
            );
          }
        } catch {
          // An unreadable sequence just loses its position, not the dump.
        }
      }

      const indexes = await queryRows<{ name: string; sql: string }>(
        `
        SELECT c.relname AS name, pg_catalog.pg_get_indexdef(i.indexrelid) AS sql
        FROM pg_catalog.pg_index i
        JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1
          -- Constraint-backed indexes arrive with their CONSTRAINT clause in
          -- the CREATE TABLE; emitting them again would fail as a duplicate.
          AND NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_constraint con
            WHERE con.conindid = i.indexrelid
          )
        ORDER BY c.relname
        `,
        [schema],
      );

      const functions = await queryRows<{ name: string; sql: string }>(
        `
        SELECT p.proname AS name, pg_catalog.pg_get_functiondef(p.oid) AS sql
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = $1
          -- Aggregates and window functions have no functiondef.
          AND p.prokind IN ('f', 'p')
        ORDER BY p.proname
        `,
        [schema],
      );

      // Views are emitted in dependency order: a view built on another view
      // fails to create otherwise.
      const viewRows = await queryRows<{
        name: string;
        definition: string;
        depends_on: string[] | null;
      }>(
        `
        SELECT
          c.relname AS name,
          pg_catalog.pg_get_viewdef(c.oid, true) AS definition,
          ARRAY(
            SELECT DISTINCT dc.relname
            FROM pg_catalog.pg_depend d
            JOIN pg_catalog.pg_rewrite r ON r.oid = d.objid
            JOIN pg_catalog.pg_class dc ON dc.oid = d.refobjid
            JOIN pg_catalog.pg_namespace dn ON dn.oid = dc.relnamespace
            WHERE r.ev_class = c.oid
              AND dc.relkind = 'v'
              AND dc.oid <> c.oid
              AND dn.nspname = $1
          ) AS depends_on
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind = 'v'
        ORDER BY c.relname
        `,
        [schema],
      );
      const viewDeps = new Map(
        viewRows.map((v) => [v.name, v.depends_on ?? []]),
      );
      const views = topoSortByForeignKeys(
        viewRows.map((v) => v.name),
        (v) => viewDeps.get(v) ?? [],
      ).map((name) => {
        // `pg_get_viewdef` already terminates its output with `;`.
        const def = viewRows
          .find((v) => v.name === name)!
          .definition.trim()
          .replace(/;+$/, "");
        return {
          name,
          sql: `CREATE VIEW ${quoteIdent(schema)}.${quoteIdent(name)} AS\n${def};`,
        };
      });

      const triggers = await queryRows<{ name: string; sql: string }>(
        `
        SELECT t.tgname AS name, pg_catalog.pg_get_triggerdef(t.oid) || ';' AS sql
        FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND NOT t.tgisinternal
        ORDER BY t.tgname
        `,
        [schema],
      );

      const identityAlways = await queryRows<{ relname: string }>(
        `
        SELECT DISTINCT c.relname
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind = 'r' AND a.attidentity = 'a'
        `,
        [schema],
      );

      return {
        sequences: sequences
          .filter((s) => !s.owned)
          .map((s) => ({
            name: s.name,
            sql:
              `CREATE SEQUENCE ${quoteIdent(schema)}.${quoteIdent(s.name)}\n` +
              `  AS ${s.data_type}\n` +
              `  START WITH ${s.start_value}\n` +
              `  INCREMENT BY ${s.increment}\n` +
              `  MINVALUE ${s.min_value}\n` +
              `  MAXVALUE ${s.max_value}\n` +
              `  CACHE ${s.cache_size}${s.cycle ? "\n  CYCLE" : ""};`,
          })),
        sequenceSetvals: setvals,
        indexes: indexes.map((i) => ({ name: i.name, sql: `${i.sql};` })),
        // `pg_get_functiondef` returns the body unterminated — without the
        // added `;` the next statement in the dump is a syntax error.
        functions: functions.map((f) => ({
          name: f.name,
          sql: `${f.sql.trimEnd()};`,
        })),
        views,
        triggers,
        identityAlwaysTables: identityAlways.map((r) => r.relname),
      };
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
        if (update.pk && update.pk.length > 0) {
          // PK identification: stable even after an edit moves the ctid.
          const where = update.pk
            .map((p, i) => `${quoteIdent(p.column)} = $${i + 2}`)
            .join(" AND ");
          await db.query(
            `UPDATE ${qualifiedTable}
             SET ${quoteIdent(update.column)} = $1
             WHERE ${where}`,
            [update.value, ...update.pk.map((p) => p.value)],
          );
        } else {
          // PK-less fallback: locate the row by ctid (heap) order position.
          await db.query(
            `UPDATE ${qualifiedTable}
             SET ${quoteIdent(update.column)} = $1
             WHERE ctid = (
               SELECT ctid FROM ${qualifiedTable} ORDER BY ctid LIMIT 1 OFFSET $2
             )`,
            [update.value, update.rowIndex],
          );
        }
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
      // Strip `\connect` / CREATE DATABASE lines that can't run in PGlite.
      const script = preparePostgresScriptForPglite(sql);

      if (dataDir) {
        // A workspace-backed session must import into the *persistent*
        // cluster. Swapping in a fresh in-memory worker (what the in-memory
        // path below does) left the OPFS data directory holding the previous
        // database, so a reload silently restored that one instead — the live
        // database and the snapshot disagreed from the moment of import.
        //
        // One transaction, so a dump that fails half-way leaves the previous
        // database exactly as it was: DDL is transactional in Postgres.
        try {
          await db.exec(
            `BEGIN;\nDROP SCHEMA IF EXISTS public CASCADE;\nCREATE SCHEMA public;\n${stripTransactionControl(script)}\nCOMMIT;`,
          );
        } catch (err) {
          try {
            await db.exec("ROLLBACK");
          } catch {
            /* already rolled back */
          }
          throw err;
        }
        sample = POSTGRES_BLANK_DATABASE;
        return sample;
      }

      const next = await createFreshWorker();
      await next.waitReady;
      try {
        await next.exec(script);
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

    async dumpDataDir() {
      return db.dumpDataDir("none");
    },

    async importDataDir(tarball) {
      const next = await createFreshWorker({ loadDataDir: tarball });
      try {
        await next.waitReady;
        // Probe before adopting: a corrupted/mismatched tarball surfaces
        // here, not on the user's next query.
        await next.query("SELECT 1");
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
