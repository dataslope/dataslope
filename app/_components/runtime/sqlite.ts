// SQLite engine wrapper for the SQL playground. Sits on top of sql.js
// (the sqlite3 wasm build maintained by the sql.js project) and exposes
// the small surface that `SqlPlayground.tsx` actually needs:
//
//   - `init()`                  — load the wasm + create a Database
//   - `loadSampleDatabase(id)`  — tear down and rebuild against a sample
//   - `exec(sql)`               — run user-authored SQL, returning the
//                                  raw `QueryExecResult[]` shape that
//                                  the UI renders directly
//   - `listTables()` / `listViews()` / `previewTable(name, limit)` —
//                                  used to populate the sidebar tree
//                                  and the table-preview pane
//
// Initialisation is memoised so navigating away and back doesn't
// re-download the wasm module.

import type {
  Database,
  QueryExecResult,
  SqlJsStatic,
  SqlValue,
} from "sql.js";
import { findSampleDatabase, type SqliteSampleDatabase } from "./sqliteSamples";

export type { QueryExecResult } from "sql.js";

/** Description of a single column inside a table, derived from
 *  `PRAGMA table_info(...)`. Exposed to the UI so the schema sidebar
 *  doesn't have to re-parse `QueryExecResult`. */
export interface TableColumnInfo {
  /** Column ordinal (`cid` from PRAGMA). */
  cid: number;
  /** Column name as declared in the CREATE TABLE statement. */
  name: string;
  /** Declared type, e.g. `INTEGER`, `TEXT`. May be empty for
   *  type-less columns. */
  type: string;
  /** True when the column has a `NOT NULL` constraint. */
  notNull: boolean;
  /** Default value as recorded in `sqlite_master` (string form), or
   *  `null` when no default was declared. */
  defaultValue: string | null;
  /** Position within the primary key (1-indexed). 0 means "not a
   *  primary key column". */
  pk: number;
}

/** Unique / primary-key constraint info for a single column, used to
 *  determine whether a row can be safely duplicated. */
export interface ColumnConstraintInfo {
  /** Column name as declared in the CREATE TABLE statement. */
  name: string;
  /** True when this column is part of the primary key. */
  isPrimaryKey: boolean;
  /** True when this column is an INTEGER PRIMARY KEY AUTOINCREMENT —
   *  its value is assigned automatically by SQLite so it can be
   *  omitted from an INSERT when duplicating a row. */
  isAutoIncrement: boolean;
  /** True when this column has an explicit UNIQUE constraint (separate
   *  from the primary key). */
  isUnique: boolean;
}

/** Description of one column-level foreign-key relationship, derived
 *  from `PRAGMA foreign_key_list(...)`. */
export interface ForeignKeyInfo {
  /** Source column on this table. */
  from: string;
  /** Referenced table. */
  table: string;
  /** Referenced column. */
  to: string;
  /** ON DELETE action (e.g. "CASCADE", "SET NULL", "NO ACTION"). */
  onDelete: string;
  /** ON UPDATE action (e.g. "CASCADE", "SET NULL", "NO ACTION"). */
  onUpdate: string;
}

/** Specification of a single column passed to `rebuildTable`. */
export interface ColumnSpec {
  /** New column name. */
  name: string;
  /** SQLite type affinity (INTEGER / REAL / TEXT / BLOB / NUMERIC). */
  type: string;
  /** When true, render `NOT NULL` in the CREATE TABLE statement. */
  notNull?: boolean;
  /** When true, this column is part of the primary key. */
  primaryKey?: boolean;
  /** When true (only valid for a single-column INTEGER PRIMARY KEY),
   *  add `AUTOINCREMENT`. */
  autoIncrement?: boolean;
  /** When true, render `UNIQUE` in the column definition. */
  unique?: boolean;
  /** Default value (raw SQL literal, e.g. `'foo'` or `42`). When
   *  empty/undefined no default is rendered. */
  defaultValue?: string;
  /** Optional column-level foreign key. */
  foreignKey?: { table: string; column: string; onDelete?: string; onUpdate?: string };
  /** When set, the column existed under this name on the original
   *  table. Used by `rebuildTable` to copy data from `originalName`
   *  into `name` even after a rename. */
  originalName?: string;
}

/** Spec passed to `rebuildTable` describing the desired post-rebuild
 *  shape of a table. */
export interface TableRebuildSpec {
  /** Current name of the table being modified. */
  originalName: string;
  /** Desired name after the rebuild (may equal `originalName`). */
  newName: string;
  /** Ordered list of columns the rebuilt table should have. */
  columns: ColumnSpec[];
}

export interface SqliteEngine {
  /** Replace the active in-memory database with a fresh build of the
   *  given sample. Returns the active sample for convenience. */
  loadSampleDatabase: (id: string) => SqliteSampleDatabase;
  /** Execute a (potentially multi-statement) SQL string against the
   *  active database. Throws on syntax / runtime errors. */
  exec: (sql: string) => QueryExecResult[];
  /** Names of every user table in the active database. */
  listTables: () => string[];
  /** Names of every view in the active database. */
  listViews: () => string[];
  /** Names of every user-defined index in the active database. Built-in
   *  auto-indexes (created implicitly by `PRIMARY KEY` / `UNIQUE`) are
   *  excluded — they have no `CREATE INDEX` statement and aren't
   *  meaningful to the user. */
  listIndexes: () => string[];
  /** Names of every trigger in the active database. */
  listTriggers: () => string[];
  /** `SELECT * FROM "<name>" LIMIT <limit>` against the active
   *  database. Identifier is quoted to defend against names that
   *  collide with reserved words; sql.js does not expose a parameter
   *  binding for identifiers, so quoting is the only viable option. */
  previewTable: (name: string, limit?: number) => QueryExecResult[];
  /** `PRAGMA table_info(<name>)` — used by the sidebar context-menu
   *  "View Structure" action to render the column list of a table or
   *  view in the results pane. */
  describeTable: (name: string) => QueryExecResult[];
  /** `SELECT COUNT(*) FROM <name>` — used by the sidebar context-menu
   *  "Count Rows" action. */
  countRows: (name: string) => QueryExecResult[];
  /** `DROP TABLE`/`DROP VIEW`/`DROP INDEX`/`DROP TRIGGER` — used by
   *  the sidebar context-menu "Drop" action. The kind is restricted to
   *  a fixed allowlist so the resulting statement can never be coerced
   *  into something else. */
  dropEntity: (
    name: string,
    kind: "table" | "view" | "index" | "trigger",
  ) => void;
  /** `DELETE FROM <name>` — clears every row of a table without
   *  dropping the schema. SQLite has no `TRUNCATE` keyword; an
   *  unqualified DELETE is the standard equivalent. */
  truncateTable: (name: string) => void;
  /** Structured form of `PRAGMA table_info(<name>)`. */
  listColumns: (name: string) => TableColumnInfo[];
  /** Structured form of `PRAGMA foreign_key_list(<name>)`. */
  listForeignKeys: (name: string) => ForeignKeyInfo[];
  /** Apply the SQLite "rebuild table" pattern for the given spec:
   *  create a `<name>__new` with the new shape, copy over rows whose
   *  source column still exists (matched by `originalName`), drop the
   *  old table and rename the new one in place. Wrapped in a single
   *  transaction with foreign-key enforcement disabled so referencing
   *  tables aren't broken mid-flight. */
  rebuildTable: (spec: TableRebuildSpec) => void;
  /** Returns the original DDL string (`CREATE TABLE …` / `CREATE VIEW
   *  …`) recorded in `sqlite_master.sql` for the given entity, plus
   *  the `CREATE INDEX` statements for any indexes defined on it.
   *  Returns an empty string when the entity has no recorded DDL
   *  (system tables, certain virtual tables). */
  getDDL: (name: string) => string;
  /** The sample database currently loaded into memory. */
  activeSample: () => SqliteSampleDatabase;
  /** Serialise the active database to a SQLite file image. The bytes
   *  are exactly what would land on disk if SQLite wrote the database
   *  to a `.sqlite` file, so the result can be downloaded as-is or
   *  re-opened by any SQLite-compatible tool. */
  exportDatabase: () => Uint8Array;
  /** Delete a set of rows from `<tableName>` identified by the values
   *  of their primary-key columns. Each entry in `pkRows` is the
   *  ordered list of primary-key values that identifies one row, in
   *  the same order as `pkColumns`. Bound through prepared statements
   *  so user-supplied cell values can never be interpreted as SQL. */
  deleteRows: (
    tableName: string,
    pkColumns: string[],
    pkRows: ReadonlyArray<ReadonlyArray<unknown>>,
  ) => number;
  /** Update individual cells in `<tableName>`. Each entry in `updates`
   *  identifies a row by its 0-based index in the table's natural scan
   *  order (via `rowid OFFSET rowIndex`) and sets one column to a new
   *  value. Because this is a single-user in-memory playground, using
   *  the row position is safe and avoids requiring a primary key.
   *  All updates run inside a single transaction; any failure rolls back
   *  the entire batch. Returns the number of UPDATE statements executed. */
  updateRows: (
    tableName: string,
    updates: ReadonlyArray<{
      rowIndex: number;
      column: string;
      value: unknown;
    }>,
  ) => number;
  /** Replace the active in-memory database with a fresh empty database.
   *  Returns a synthetic SqliteSampleDatabase descriptor for the blank DB. */
  loadBlankDatabase: () => SqliteSampleDatabase;
  /** Replace the active in-memory database with a database loaded from
   *  the given bytes (e.g., a user-uploaded .sqlite file). The filename
   *  parameter is used only for display purposes. Returns a synthetic
   *  SqliteSampleDatabase descriptor. */
  loadFromBytes: (bytes: Uint8Array, filename: string) => SqliteSampleDatabase;
  /** Returns per-column constraint info for `<tableName>`, combining
   *  `PRAGMA table_info` (for primary key membership) with
   *  `PRAGMA index_list` / `PRAGMA index_info` (for UNIQUE constraints)
   *  and a DDL scan (for AUTOINCREMENT). Used by the result-table
   *  context menu to decide whether a row can be safely duplicated. */
  getColumnConstraintInfo: (tableName: string) => ColumnConstraintInfo[];
  /** Insert a single row into `<tableName>`. Column names and values
   *  are paired positionally and bound through sql.js's parameter API
   *  so no user-supplied value can be interpreted as SQL. Skipping
   *  auto-increment columns in `columnNames` lets SQLite assign the
   *  next value automatically (the usual behaviour when duplicating). */
  insertRow: (
    tableName: string,
    columnNames: string[],
    values: unknown[],
  ) => void;
  /** Names of user-defined indexes on a specific table (excludes
   *  auto-indexes created by PRIMARY KEY / UNIQUE constraints). */
  listTableIndexes: (tableName: string) => string[];
  /** Names of triggers defined on a specific table. */
  listTableTriggers: (tableName: string) => string[];
  /** Execute a single SELECT (or WITH…SELECT) statement with server-side
   *  pagination. Returns the rows for one page together with the total
   *  row count so the UI can render "Rows 1–50 of 12,345" without ever
   *  materialising the full result set in JavaScript memory.
   *
   *  - `sql`      The trimmed SQL string.  Any trailing semicolons are
   *               stripped automatically before the query is wrapped.
   *  - `pageSize` Number of rows to return (≥ 1).
   *  - `offset`   0-based index of the first row to return.
   *
   *  The count is obtained via `SELECT COUNT(*) FROM (<sql>)` and the
   *  page via `<sql> LIMIT <pageSize> OFFSET <offset>`.  If the count
   *  query fails (e.g. due to an unusual expression list) `totalCount`
   *  falls back to the number of rows returned by the page query. */
  execPaged: (
    sql: string,
    pageSize: number,
    offset: number,
  ) => { result: QueryExecResult[]; totalCount: number };
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    // Dynamic import so the bundler treats sql.js as a client-only
    // chunk; its emscripten preamble references `fs`/`path`, which
    // Next/Turbopack cannot statically resolve in the SSR pass.
    sqlJsPromise = import("sql.js").then((mod) => {
      const init = (mod.default ?? mod) as (
        cfg?: { locateFile?: (file: string) => string },
      ) => Promise<SqlJsStatic>;
      return init({
        // Mirrors the pattern used by the C# runtime (`/_dotnet/...`)
        // and the Java runtime (`/app/tools.jar`): static wasm assets
        // live under public/_sqljs/ so they're served from the same
        // origin (no CORS surprises) and shipped with the deploy.
        locateFile: (file: string) => `/_sqljs/${file}`,
      });
    });
  }
  return sqlJsPromise;
}

/** Treat any identifier whose value isn't a safe `[A-Za-z_][A-Za-z0-9_]*`
 *  as untrusted and escape embedded double-quotes per the SQL standard.
 *  The names we feed in come straight out of `sqlite_master`, so this
 *  is mostly defensive — but defensive is what we want when building
 *  SQL by string concatenation. */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

const SAFE_TYPE = /^[A-Za-z_][A-Za-z0-9_ ()]*$/;

/** Render one `ColumnSpec` into a column definition for use inside
 *  `CREATE TABLE (...)`. Inline foreign keys are emitted via
 *  `REFERENCES`. The output never trusts free-form identifiers — table
 *  / column names are quoted, and the `type` keyword is checked
 *  against a conservative allowlist before being inlined. */
function renderColumnDef(col: ColumnSpec): string {
  const parts: string[] = [quoteIdent(col.name)];
  const type = col.type && SAFE_TYPE.test(col.type) ? col.type : "TEXT";
  parts.push(type);
  // For multi-column primary keys we emit a table-level constraint
  // separately; here we only handle the single-column form so we can
  // attach `AUTOINCREMENT`.
  if (col.primaryKey && col.autoIncrement) {
    parts.push("PRIMARY KEY AUTOINCREMENT");
  }
  if (col.notNull) parts.push("NOT NULL");
  if (col.unique) parts.push("UNIQUE");
  if (col.defaultValue !== undefined && col.defaultValue !== "") {
    // The default value goes in raw so callers can use SQL literals
    // (`'foo'`, `42`, `CURRENT_TIMESTAMP`). Surround simple bare
    // identifiers / literals in single quotes when they don't already
    // look like a SQL expression to keep the most common case ergonomic.
    const v = col.defaultValue.trim();
    parts.push(`DEFAULT ${v}`);
  }
  if (col.foreignKey && col.foreignKey.table && col.foreignKey.column) {
    let fkClause = `REFERENCES ${quoteIdent(col.foreignKey.table)}(${quoteIdent(col.foreignKey.column)})`;
    const onDelete = col.foreignKey.onDelete?.trim().toUpperCase();
    const onUpdate = col.foreignKey.onUpdate?.trim().toUpperCase();
    const validActions = new Set(["NO ACTION", "RESTRICT", "SET NULL", "SET DEFAULT", "CASCADE"]);
    if (onDelete && validActions.has(onDelete) && onDelete !== "NO ACTION") {
      fkClause += ` ON DELETE ${onDelete}`;
    }
    if (onUpdate && validActions.has(onUpdate) && onUpdate !== "NO ACTION") {
      fkClause += ` ON UPDATE ${onUpdate}`;
    }
    parts.push(fkClause);
  }
  return parts.join(" ");
}

export async function createSqliteEngine(
  initialSampleId: string,
): Promise<SqliteEngine> {
  const SQL = await loadSqlJs();
  let db: Database | null = null;
  let active: SqliteSampleDatabase = findSampleDatabase(initialSampleId);

  function build(sample: SqliteSampleDatabase): void {
    if (db) {
      try {
        db.close();
      } catch {
        // Ignore — closing a half-broken db shouldn't block the rebuild.
      }
    }
    db = new SQL.Database();
    // Enforce foreign-key constraints declared in the sample schema.
    // SQLite ships with this off by default for backwards compatibility,
    // so we opt in once per database build. The `rebuildTable` flow
    // toggles it off/on around its own work.
    db.run("PRAGMA foreign_keys = ON;");
    db.run(sample.schema);
    sample.seed(db);
    active = sample;
  }

  build(active);

  function require(): Database {
    if (!db) throw new Error("SQLite database is not initialised");
    return db;
  }

  function listFromMaster(
    type: "table" | "view" | "index" | "trigger",
  ): string[] {
    // Defensive allowlist even though the TS signature narrows the
    // input — keeps the implementation robust if the function is ever
    // re-exported or called from looser-typed code.
    const kind =
      type === "view"
        ? "view"
        : type === "index"
          ? "index"
          : type === "trigger"
            ? "trigger"
            : "table";
    // Indexes carry an extra filter: skip auto-indexes (those whose
    // `sql` is NULL — they were created implicitly by PRIMARY KEY /
    // UNIQUE constraints and have no user-visible DDL).
    const extra = kind === "index" ? " AND sql IS NOT NULL" : "";
    const res = require().exec(
      `SELECT name FROM sqlite_master WHERE type = '${kind}' AND name NOT LIKE 'sqlite_%'${extra} ORDER BY name`,
    );
    if (res.length === 0) return [];
    return res[0].values.map((row) => String(row[0]));
  }

  return {
    loadSampleDatabase(id: string) {
      build(findSampleDatabase(id));
      return active;
    },
    exec(sql: string) {
      return require().exec(sql);
    },
    listTables() {
      return listFromMaster("table");
    },
    listViews() {
      return listFromMaster("view");
    },
    listIndexes() {
      return listFromMaster("index");
    },
    listTriggers() {
      return listFromMaster("trigger");
    },
    listTableIndexes(tableName: string) {
      const stmt = require().prepare(
        `SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = $n AND sql IS NOT NULL ORDER BY name`,
      );
      const names: string[] = [];
      try {
        stmt.bind({ $n: tableName });
        while (stmt.step()) {
          const row = stmt.get();
          if (typeof row[0] === "string") names.push(row[0]);
        }
      } finally {
        stmt.free();
      }
      return names;
    },
    listTableTriggers(tableName: string) {
      const stmt = require().prepare(
        `SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = $n ORDER BY name`,
      );
      const names: string[] = [];
      try {
        stmt.bind({ $n: tableName });
        while (stmt.step()) {
          const row = stmt.get();
          if (typeof row[0] === "string") names.push(row[0]);
        }
      } finally {
        stmt.free();
      }
      return names;
    },
    previewTable(name: string, limit = 200) {
      // The table name is a SQLite identifier — sql.js does not allow
      // parameter binding for identifiers, so we quote it instead. The
      // `limit` is coerced into a finite integer in [1, 10_000] before
      // being interpolated, which makes the value safe to embed: any
      // non-numeric input (NaN, Infinity, strings, …) collapses to a
      // fixed integer literal, so no user-controlled SQL can be
      // injected via this path.
      const n = Number(limit);
      const safeLimit = Number.isFinite(n)
        ? Math.max(1, Math.min(10_000, Math.floor(n)))
        : 200;
      return require().exec(
        `SELECT * FROM ${quoteIdent(name)} LIMIT ${safeLimit}`,
      );
    },
    describeTable(name: string) {
      // `PRAGMA table_info(<name>)` returns one row per column with
      // (cid, name, type, notnull, dflt_value, pk). Identifier is
      // quoted to defend against reserved-word collisions.
      return require().exec(`PRAGMA table_info(${quoteIdent(name)})`);
    },
    countRows(name: string) {
      return require().exec(
        `SELECT COUNT(*) AS row_count FROM ${quoteIdent(name)}`,
      );
    },
    dropEntity(name: string, kind: "table" | "view" | "index" | "trigger") {
      // Restrict `kind` to the fixed allowlist defensively even though
      // the TS signature narrows the input — callers may forward
      // looser-typed values from UI events.
      const k =
        kind === "view"
          ? "VIEW"
          : kind === "index"
            ? "INDEX"
            : kind === "trigger"
              ? "TRIGGER"
              : "TABLE";
      require().run(`DROP ${k} IF EXISTS ${quoteIdent(name)}`);
    },
    truncateTable(name: string) {
      // SQLite has no `TRUNCATE` keyword. An unqualified DELETE is
      // optimised internally to drop all rows in one go.
      require().run(`DELETE FROM ${quoteIdent(name)}`);
    },
    listColumns(name: string) {
      const rows = require().exec(
        `PRAGMA table_info(${quoteIdent(name)})`,
      );
      if (rows.length === 0) return [];
      return rows[0].values.map((row) => ({
        cid: Number(row[0]),
        name: String(row[1]),
        type: String(row[2] ?? ""),
        notNull: Number(row[3]) !== 0,
        defaultValue: row[4] === null || row[4] === undefined
          ? null
          : String(row[4]),
        pk: Number(row[5]),
      }));
    },
    listForeignKeys(name: string) {
      const rows = require().exec(
        `PRAGMA foreign_key_list(${quoteIdent(name)})`,
      );
      if (rows.length === 0) return [];
      return rows[0].values.map((row) => ({
        // Columns: id, seq, table, from, to, on_update, on_delete, match
        from: String(row[3]),
        table: String(row[2]),
        to: String(row[4]),
        onUpdate: String(row[5] ?? "NO ACTION"),
        onDelete: String(row[6] ?? "NO ACTION"),
      }));
    },
    rebuildTable(spec: TableRebuildSpec) {
      const d = require();
      if (spec.columns.length === 0) {
        throw new Error("A table must have at least one column.");
      }
      // Sanity-check column names: must be non-empty and unique
      // (case-insensitively, matching SQLite's identifier comparison).
      const seen = new Set<string>();
      for (const col of spec.columns) {
        const trimmed = col.name.trim();
        if (!trimmed) throw new Error("Column names cannot be empty.");
        const key = trimmed.toLowerCase();
        if (seen.has(key)) {
          throw new Error(`Duplicate column name: ${trimmed}.`);
        }
        seen.add(key);
      }

      const pkCols = spec.columns.filter((c) => c.primaryKey);
      const useTablePk =
        pkCols.length > 1 ||
        (pkCols.length === 1 && !pkCols[0].autoIncrement);

      const defs: string[] = spec.columns.map((c) => {
        // For multi-column PKs we drop the per-column AUTOINCREMENT
        // so we can emit a single table-level PRIMARY KEY clause.
        if (useTablePk) {
          return renderColumnDef({ ...c, primaryKey: false, autoIncrement: false });
        }
        return renderColumnDef(c);
      });
      if (useTablePk) {
        defs.push(
          `PRIMARY KEY (${pkCols.map((c) => quoteIdent(c.name)).join(", ")})`,
        );
      }

      // Build the column copy list: any column whose `originalName`
      // existed in the prior table maps over directly. New columns are
      // omitted so SQLite uses their declared default (or NULL).
      const existing = new Set(
        require()
          .exec(`PRAGMA table_info(${quoteIdent(spec.originalName)})`)
          .flatMap((r) => r.values.map((row) => String(row[1]))),
      );
      const sourceCols: string[] = [];
      const targetCols: string[] = [];
      for (const c of spec.columns) {
        const src = c.originalName ?? c.name;
        if (existing.has(src)) {
          sourceCols.push(quoteIdent(src));
          targetCols.push(quoteIdent(c.name));
        }
      }

      // Build a rename map (originalName → newName) so we can patch
      // index/trigger DDL after the rename if a column was renamed.
      const renameMap = new Map<string, string>();
      for (const c of spec.columns) {
        if (c.originalName && c.originalName !== c.name) {
          renameMap.set(c.originalName, c.name);
        }
      }

      // Collect index DDLs attached to the original table so we can
      // recreate them after the rename.  We exclude auto-indexes (sql IS NULL)
      // because they are recreated automatically by PRIMARY KEY / UNIQUE.
      const indexSqls: string[] = [];
      {
        const stmt = d.prepare(
          `SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = $n AND sql IS NOT NULL ORDER BY name`,
        );
        try {
          stmt.bind({ $n: spec.originalName });
          while (stmt.step()) {
            const row = stmt.get();
            if (typeof row[0] === "string") indexSqls.push(row[0]);
          }
        } finally {
          stmt.free();
        }
      }

      // Collect trigger DDLs attached to the original table.
      const triggerSqls: string[] = [];
      {
        const stmt = d.prepare(
          `SELECT sql FROM sqlite_master WHERE type = 'trigger' AND tbl_name = $n AND sql IS NOT NULL ORDER BY name`,
        );
        try {
          stmt.bind({ $n: spec.originalName });
          while (stmt.step()) {
            const row = stmt.get();
            if (typeof row[0] === "string") triggerSqls.push(row[0]);
          }
        } finally {
          stmt.free();
        }
      }

      // If the table is being renamed (or if columns are renamed), patch
      // the collected DDL strings to use the new names.
      // NOTE: This is a best-effort word-boundary replacement. It handles
      // the common case of unquoted identifiers but may not cover all edge
      // cases (e.g. identifiers inside string literals or comments).
      function patchDdl(sql: string): string {
        let patched = sql;
        // Replace old table name with new one when the table is renamed.
        if (spec.originalName !== spec.newName) {
          // Use case-sensitive replacement (SQLite identifiers are
          // case-sensitive when quoted).
          const escaped = spec.originalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          patched = patched.replace(
            new RegExp(`\\b${escaped}\\b`, "g"),
            spec.newName,
          );
        }
        // Patch renamed columns (best-effort — simple word-boundary replacement).
        for (const [oldCol, newCol] of renameMap) {
          const escaped = oldCol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          patched = patched.replace(
            new RegExp(`\\b${escaped}\\b`, "g"),
            newCol,
          );
        }
        return patched;
      }

      const tmpName = `${spec.newName}__new`;
      // Compose the multi-statement script. We toggle foreign keys off
      // explicitly inside the transaction so referencing tables stay
      // consistent during the rebuild.
      d.run("PRAGMA foreign_keys = OFF;");
      d.run("BEGIN");
      try {
        d.run(`CREATE TABLE ${quoteIdent(tmpName)} (${defs.join(", ")})`);
        if (sourceCols.length > 0) {
          d.run(
            `INSERT INTO ${quoteIdent(tmpName)} (${targetCols.join(", ")}) SELECT ${sourceCols.join(", ")} FROM ${quoteIdent(spec.originalName)}`,
          );
        }
        d.run(`DROP TABLE ${quoteIdent(spec.originalName)}`);
        d.run(
          `ALTER TABLE ${quoteIdent(tmpName)} RENAME TO ${quoteIdent(spec.newName)}`,
        );
        // Recreate indexes with potentially patched DDL.
        for (const sql of indexSqls) {
          d.run(patchDdl(sql));
        }
        // Recreate triggers with potentially patched DDL.
        for (const sql of triggerSqls) {
          d.run(patchDdl(sql));
        }
        d.run("COMMIT");
      } catch (err) {
        try {
          d.run("ROLLBACK");
        } catch {
          // ignore rollback failure
        }
        throw err;
      } finally {
        d.run("PRAGMA foreign_keys = ON;");
      }
    },
    getDDL(name: string) {
      // `sqlite_master.sql` already stores the original CREATE
      // statement verbatim (minus a trailing semicolon). We use a
      // bound parameter for the entity name so this path is safe
      // against arbitrary identifier strings — sql.js *does* allow
      // value parameters, only identifier interpolation has to be
      // done by hand.
      const stmt = require().prepare(
        `SELECT sql FROM sqlite_master WHERE name = $name AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'view' THEN 0 ELSE 1 END, name`,
      );
      const parts: string[] = [];
      try {
        stmt.bind({ $name: name });
        while (stmt.step()) {
          const row = stmt.get();
          if (row.length > 0 && typeof row[0] === "string") {
            parts.push(row[0].trim());
          }
        }
      } finally {
        stmt.free();
      }
      // Indexes attached to the table also live in sqlite_master, but
      // their `name` column is the index name rather than the table
      // name. Pull them in via `tbl_name` so the DDL view matches
      // what a `.schema <table>` dump would show in the sqlite3 CLI.
      const idxStmt = require().prepare(
        `SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = $name AND sql IS NOT NULL ORDER BY name`,
      );
      try {
        idxStmt.bind({ $name: name });
        while (idxStmt.step()) {
          const row = idxStmt.get();
          if (row.length > 0 && typeof row[0] === "string") {
            parts.push(row[0].trim());
          }
        }
      } finally {
        idxStmt.free();
      }
      return parts.map((p) => (p.endsWith(";") ? p : `${p};`)).join("\n\n");
    },
    activeSample() {
      return active;
    },
    exportDatabase() {
      // sql.js's `Database.export()` returns a `Uint8Array` containing
      // the raw on-disk representation of the database, suitable for
      // saving as a `.sqlite` file or feeding to `new SQL.Database(...)`
      // to reopen later.
      return require().export();
    },
    deleteRows(
      tableName: string,
      pkColumns: string[],
      pkRows: ReadonlyArray<ReadonlyArray<unknown>>,
    ) {
      if (pkColumns.length === 0) {
        throw new Error(
          "Cannot delete rows without primary-key columns to identify them.",
        );
      }
      if (pkRows.length === 0) return 0;
      const d = require();
      // Build one prepared DELETE statement and reuse it across rows
      // so each cell value is bound through sql.js's parameter API
      // (immune to SQL injection regardless of cell contents).
      const where = pkColumns.map((c) => `${quoteIdent(c)} = ?`).join(" AND ");
      const sql = `DELETE FROM ${quoteIdent(tableName)} WHERE ${where}`;
      const stmt = d.prepare(sql);
      let deleted = 0;
      try {
        d.run("BEGIN");
        try {
          for (const row of pkRows) {
            if (row.length !== pkColumns.length) {
              throw new Error(
                "Primary-key value count does not match primary-key column count.",
              );
            }
            stmt.bind(row as SqlValue[]);
            // DELETE returns no rows; step() drives the statement to
            // completion so the change is applied.
            stmt.step();
            stmt.reset();
            deleted += 1;
          }
          d.run("COMMIT");
        } catch (err) {
          try {
            d.run("ROLLBACK");
          } catch {
            // ignore rollback failure
          }
          throw err;
        }
      } finally {
        stmt.free();
      }
      return deleted;
    },
    updateRows(
      tableName: string,
      updates: ReadonlyArray<{
        rowIndex: number;
        column: string;
        value: unknown;
      }>,
    ) {
      if (updates.length === 0) return 0;
      const d = require();
      // Each row is identified by its rowid, fetched via OFFSET on the
      // table's natural scan order. This is safe for a single-user
      // in-memory playground and removes any requirement for a PK.
      // We build one prepared statement per distinct target column so
      // repeated edits to the same column can reuse the same stmt.
      const stmtCache = new Map<string, ReturnType<Database["prepare"]>>();
      let count = 0;
      try {
        d.run("BEGIN");
        try {
          for (const upd of updates) {
            const colKey = upd.column;
            let stmt = stmtCache.get(colKey);
            if (!stmt) {
              // Subquery resolves the rowid for the Nth row (0-based).
              const sql =
                `UPDATE ${quoteIdent(tableName)} SET ${quoteIdent(upd.column)} = ?1 ` +
                `WHERE rowid = (SELECT rowid FROM ${quoteIdent(tableName)} ORDER BY rowid LIMIT 1 OFFSET ?2)`;
              stmt = d.prepare(sql);
              stmtCache.set(colKey, stmt);
            }
            stmt.bind([upd.value as SqlValue, upd.rowIndex]);
            stmt.step();
            stmt.reset();
            count += 1;
          }
          d.run("COMMIT");
        } catch (err) {
          try {
            d.run("ROLLBACK");
          } catch {
            // ignore rollback failure
          }
          throw err;
        }
      } finally {
        for (const stmt of stmtCache.values()) {
          stmt.free();
        }
      }
      return count;
    },
    loadBlankDatabase() {
      if (db) {
        try {
          db.close();
        } catch {
          // Ignore close errors.
        }
      }
      db = new SQL.Database();
      db.run("PRAGMA foreign_keys = ON;");
      const blank: SqliteSampleDatabase = {
        id: "__blank__",
        label: "Blank Database",
        filename: "blank.sqlite",
        description: "Empty database",
        schema: "",
        seed: () => {},
        defaultTabs: [{ title: "Query 1", code: "" }],
      };
      active = blank;
      return active;
    },
    loadFromBytes(bytes: Uint8Array, filename: string) {
      if (db) {
        try {
          db.close();
        } catch {
          // Ignore close errors.
        }
      }
      db = new SQL.Database(bytes);
      db.run("PRAGMA foreign_keys = ON;");
      // Derive a stable-ish id from the filename so the UI can
      // distinguish this from the blank placeholder.
      const basename = filename
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 40);
      const id = `__imported_${basename}__`;
      const imported: SqliteSampleDatabase = {
        id,
        label: filename,
        filename,
        description: "Imported database",
        schema: "",
        seed: () => {},
        defaultTabs: [{ title: "Query 1", code: "" }],
      };
      active = imported;
      return imported;
    },
    getColumnConstraintInfo(tableName: string): ColumnConstraintInfo[] {
      const d = require();
      // Primary key membership comes from PRAGMA table_info.
      const tableInfoResult = d.exec(
        `PRAGMA table_info(${quoteIdent(tableName)})`,
      );
      const cols: Array<{ name: string; pk: number }> =
        tableInfoResult.length > 0
          ? tableInfoResult[0].values.map((row) => ({
              name: String(row[1]),
              pk: Number(row[5]),
            }))
          : [];
      // AUTOINCREMENT is only detectable from the original DDL.
      const ddlStmt = d.prepare(
        `SELECT sql FROM sqlite_master WHERE name = $name AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'view' THEN 0 ELSE 1 END, name`,
      );
      let ddlText = "";
      try {
        ddlStmt.bind({ $name: tableName });
        while (ddlStmt.step()) {
          const row = ddlStmt.get();
          if (row.length > 0 && typeof row[0] === "string") {
            ddlText += row[0];
          }
        }
      } finally {
        ddlStmt.free();
      }
      const hasAutoIncrement = /\bautoincrement\b/i.test(ddlText);
      // Collect column names that have an explicit UNIQUE constraint
      // (origin = 'u' in index_list means it came from a UNIQUE clause,
      //  not from a PRIMARY KEY or a user-created index).
      const uniqueColNames = new Set<string>();
      const idxListResult = d.exec(
        `PRAGMA index_list(${quoteIdent(tableName)})`,
      );
      if (idxListResult.length > 0) {
        for (const row of idxListResult[0].values) {
          // index_list columns: seq, name, unique, origin, partial
          const isUnique = Number(row[2]) === 1;
          const origin = String(row[3]);
          if (isUnique && origin === "u") {
            const idxName = String(row[1]);
            const idxInfoResult = d.exec(
              `PRAGMA index_info(${quoteIdent(idxName)})`,
            );
            if (idxInfoResult.length > 0) {
              for (const iRow of idxInfoResult[0].values) {
                // index_info columns: seqno, cid, name
                uniqueColNames.add(String(iRow[2]));
              }
            }
          }
        }
      }
      return cols.map((c) => ({
        name: c.name,
        isPrimaryKey: c.pk > 0,
        // AUTOINCREMENT can only apply when there is exactly one PK
        // column (SQLite forbids AUTOINCREMENT on composite PKs). Guard
        // with pkCount so a composite-PK table whose first member
        // happens to have pk=1 isn't mistakenly marked auto-increment.
        isAutoIncrement:
          hasAutoIncrement &&
          c.pk === 1 &&
          cols.filter((col) => col.pk > 0).length === 1,
        isUnique: uniqueColNames.has(c.name),
      }));
    },
    insertRow(
      tableName: string,
      columnNames: string[],
      values: unknown[],
    ): void {
      if (columnNames.length !== values.length) {
        throw new Error("Column count must match value count.");
      }
      if (columnNames.length === 0) {
        throw new Error("Cannot insert a row with no columns.");
      }
      const d = require();
      const cols = columnNames.map(quoteIdent).join(", ");
      const placeholders = columnNames
        .map((_, i) => `?${i + 1}`)
        .join(", ");
      const sql = `INSERT INTO ${quoteIdent(tableName)} (${cols}) VALUES (${placeholders})`;
      const stmt = d.prepare(sql);
      try {
        stmt.bind(values as SqlValue[]);
        stmt.step();
      } finally {
        stmt.free();
      }
    },
    execPaged(sql: string, pageSize: number, offset: number) {
      const d = require();
      // Strip trailing semicolons so we can safely append LIMIT/OFFSET
      // and wrap the query in a COUNT(*) subquery.
      const stripped = sql.replace(/\s*;+\s*$/, "");
      const safeSize = Math.max(1, Math.floor(pageSize));
      const safeOffset = Math.max(0, Math.floor(offset));
      // Determine total row count via a COUNT(*) wrapper.  If this
      // fails for any reason (e.g. an unsupported expression list in
      // the query), fall back to the length of the page result.
      let totalCount: number | null = null;
      try {
        const countResult = d.exec(
          `SELECT COUNT(*) FROM (${stripped})`,
        );
        if (countResult.length > 0 && countResult[0].values.length > 0) {
          totalCount = Number(countResult[0].values[0][0]) || 0;
        }
      } catch {
        // Count query failed; totalCount stays null and will be
        // derived from the page result length below.
      }
      // Fetch only the requested page by appending LIMIT/OFFSET.  This
      // preserves any top-level ORDER BY because the LIMIT clause
      // applies after ORDER BY in SQLite's evaluation order.
      const result = d.exec(
        `${stripped} LIMIT ${safeSize} OFFSET ${safeOffset}`,
      );
      const rowCount =
        totalCount !== null
          ? totalCount
          : result.length > 0
            ? result[0].values.length + safeOffset
            : 0;
      return { result, totalCount: rowCount };
    },
  };
}
