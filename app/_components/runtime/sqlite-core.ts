// SQLite engine wrapper for the SQL playground. Sits on top of
// `@sqlite.org/sqlite-wasm` (the official SQLite WASM build) and
// exposes the small surface that `SqlPlayground.tsx` actually needs:
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

import {
  execAll,
  exportDatabase,
  getRow,
  iterateStatements,
  loadSqlite3,
  openDatabase,
  type Database,
  type QueryExecResult,
  type SqlValue,
} from "./sqlite-wasm";
import { findSampleDatabase, type SqliteSampleDatabase, type SqliteSampleMetadata } from "./sqliteSamples";

export type { QueryExecResult } from "./sqlite-wasm";

/** Result of a SELECT-like statement with the per-column declared types
 *  attached.  `columnTypes` may contain empty strings for computed /
 *  expression columns that don't map back to a single declared SQLite
 *  column type — the UI falls back to value-based inference for those. */
export type QueryExecResultWithTypes = QueryExecResult & {
  columnTypes?: string[];
};

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
  /** For generated (computed) columns: the generation expression and
   *  storage type. `null` for ordinary columns. */
  generated: { expression: string; storageType: "VIRTUAL" | "STORED" } | null;
  /** Allowed labels for an enum-typed column (Postgres `enum`, DuckDB
   *  `ENUM(...)`), in declaration order. `null`/absent for non-enum
   *  columns and for SQLite (which has no native enum type). Drives the
   *  result grid's inline enum dropdown. */
  enumValues?: string[] | null;
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
  /** When set, this is a generated column. The `expression` is the
   *  raw SQL expression (without surrounding parens), and `storageType`
   *  is either `"VIRTUAL"` (default) or `"STORED"`. When present, most
   *  other column modifiers (NOT NULL, UNIQUE, DEFAULT, FK) are ignored
   *  by `renderColumnDef`. */
  generated?: { expression: string; storageType: "VIRTUAL" | "STORED" };
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
  /** Release the engine's resources. Implemented by the worker-backed
   *  engine (terminates the worker, which closes its OPFS access handles);
   *  the in-process engine used by /learn code blocks has no out-of-band
   *  resources, so the method is optional. */
  dispose?: () => void;
  /** Replace the active in-memory database with a fresh build of the
   *  given sample. Returns the active sample for convenience. */
  loadSampleDatabase: (id: string) => Promise<SqliteSampleMetadata>;
  /** Execute a (potentially multi-statement) SQL string against the
   *  active database. Throws on syntax / runtime errors. */
  exec: (sql: string) => Promise<QueryExecResult[]>;
  /**
   * Like `exec`, but returns one entry per SQL statement in the input.
   * – `QueryExecResult` for statements that produce a result set (SELECT,
   *   PRAGMA with output, …).  A zero-row SELECT still has column names.
   * – `null` for statements that ran successfully but returned no result set
   *   (INSERT, UPDATE, DELETE, CREATE TABLE, …).
   * Throws on syntax / runtime errors.
   */
  execAll: (sql: string) => Promise<(QueryExecResultWithTypes | null)[]>;
  /** Names of every user table in the active database. */
  listTables: () => Promise<string[]>;
  /** Names of every view in the active database. */
  listViews: () => Promise<string[]>;
  /** Names of every user-defined index in the active database. Built-in
   *  auto-indexes (created implicitly by `PRIMARY KEY` / `UNIQUE`) are
   *  excluded — they have no `CREATE INDEX` statement and aren't
   *  meaningful to the user. */
  listIndexes: () => Promise<string[]>;
  /** Names of every trigger in the active database. */
  listTriggers: () => Promise<string[]>;
  /** `SELECT * FROM "<name>" LIMIT <limit>` against the active
   *  database. Identifier is quoted to defend against names that
   *  collide with reserved words; sqlite-wasm does not expose a parameter
   *  binding for identifiers, so quoting is the only viable option. */
  previewTable: (name: string, limit?: number) => Promise<QueryExecResult[]>;
  /** `PRAGMA table_info(<name>)` — used by the sidebar context-menu
   *  "View Structure" action to render the column list of a table or
   *  view in the results pane. */
  describeTable: (name: string) => Promise<QueryExecResult[]>;
  /** `SELECT COUNT(*) FROM <name>` — used by the sidebar context-menu
   *  "Count Rows" action. */
  countRows: (name: string) => Promise<QueryExecResult[]>;
  /** `DROP TABLE`/`DROP VIEW`/`DROP INDEX`/`DROP TRIGGER` — used by
   *  the sidebar context-menu "Drop" action. The kind is restricted to
   *  a fixed allowlist so the resulting statement can never be coerced
   *  into something else. */
  dropEntity: (
    name: string,
    kind: "table" | "view" | "index" | "trigger",
  ) => Promise<void>;
  /** `DELETE FROM <name>` — clears every row of a table without
   *  dropping the schema. SQLite has no `TRUNCATE` keyword; an
   *  unqualified DELETE is the standard equivalent. */
  truncateTable: (name: string) => Promise<void>;
  /** Structured form of `PRAGMA table_info(<name>)`. */
  listColumns: (name: string) => Promise<TableColumnInfo[]>;
  /** Structured form of `PRAGMA foreign_key_list(<name>)`. */
  listForeignKeys: (name: string) => Promise<ForeignKeyInfo[]>;
  /** Apply the SQLite "rebuild table" pattern for the given spec:
   *  create a `<name>__new` with the new shape, copy over rows whose
   *  source column still exists (matched by `originalName`), drop the
   *  old table and rename the new one in place. Wrapped in a single
   *  transaction with foreign-key enforcement disabled so referencing
   *  tables aren't broken mid-flight. */
  rebuildTable: (spec: TableRebuildSpec) => Promise<void>;
  /** Returns the original DDL string (`CREATE TABLE …` / `CREATE VIEW
   *  …`) recorded in `sqlite_master.sql` for the given entity, plus
   *  the `CREATE INDEX` statements for any indexes defined on it.
   *  Returns an empty string when the entity has no recorded DDL
   *  (system tables, certain virtual tables). */
  getDDL: (name: string) => Promise<string>;
  /** The sample database currently loaded into memory. */
  activeSample: () => Promise<SqliteSampleMetadata>;
  /** Serialise the active database to a SQLite file image. The bytes
   *  are exactly what would land on disk if SQLite wrote the database
   *  to a `.sqlite` file, so the result can be downloaded as-is or
   *  re-opened by any SQLite-compatible tool. */
  exportDatabase: () => Promise<Uint8Array>;
  /** Delete a set of rows from `<tableName>` identified by the values
   *  of their primary-key columns. Each entry in `pkRows` is the
   *  ordered list of primary-key values that identifies one row, in
   *  the same order as `pkColumns`. Bound through prepared statements
   *  so user-supplied cell values can never be interpreted as SQL. */
  deleteRows: (
    tableName: string,
    pkColumns: string[],
    pkRows: ReadonlyArray<ReadonlyArray<unknown>>,
  ) => Promise<number>;
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
      /** When present, identifies the target row by primary-key value(s)
       *  instead of the rowid offset — robust to display reordering. */
      pk?: ReadonlyArray<{ column: string; value: unknown }>;
    }>,
  ) => Promise<number>;
  /** Replace the active in-memory database with a fresh empty database.
   *  Returns a synthetic SqliteSampleDatabase descriptor for the blank DB. */
  loadBlankDatabase: () => Promise<SqliteSampleMetadata>;
  /** Replace the active in-memory database with a database loaded from
   *  the given bytes (e.g., a user-uploaded .sqlite file). The filename
   *  parameter is used only for display purposes. Returns a synthetic
   *  SqliteSampleDatabase descriptor. */
  loadFromBytes: (bytes: Uint8Array, filename: string) => Promise<SqliteSampleMetadata>;
  /** Returns per-column constraint info for `<tableName>`, combining
   *  `PRAGMA table_info` (for primary key membership) with
   *  `PRAGMA index_list` / `PRAGMA index_info` (for UNIQUE constraints)
   *  and a DDL scan (for AUTOINCREMENT). Used by the result-table
   *  context menu to decide whether a row can be safely duplicated. */
  getColumnConstraintInfo: (tableName: string) => Promise<ColumnConstraintInfo[]>;
  /** Insert a single row into `<tableName>`. Column names and values
   *  are paired positionally and bound through sqlite-wasm's parameter API
   *  so no user-supplied value can be interpreted as SQL. Skipping
   *  auto-increment columns in `columnNames` lets SQLite assign the
   *  next value automatically (the usual behaviour when duplicating). */
  insertRow: (
    tableName: string,
    columnNames: string[],
    values: unknown[],
  ) => Promise<void>;
  /** Names of user-defined indexes on a specific table (excludes
   *  auto-indexes created by PRIMARY KEY / UNIQUE constraints). */
  listTableIndexes: (tableName: string) => Promise<string[]>;
  /** Names of triggers defined on a specific table. */
  listTableTriggers: (tableName: string) => Promise<string[]>;
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
  ) => Promise<{ result: QueryExecResultWithTypes[]; totalCount: number }>;
}

/** Options for opening the engine's database — used by Phase 3 to
 *  switch from in-memory storage to OPFS persistence. When `vfs` is
 *  provided (e.g. `"opfs-sahpool"`), the database is opened against
 *  that VFS and `filename` becomes the OPFS-relative path. */
export interface SqliteEngineOpenOptions {
  /** Database filename. Defaults to `":memory:"`. */
  filename?: string;
  /** Open-mode flags (sqlite-wasm OO1: `c` create, `w` write, `r`
   *  read-only, `t` trace). Defaults to `"c"`. */
  flags?: string;
  /** Optional SQLite VFS name. When set, the DB is OPFS-backed. */
  vfs?: string;
  /** When true, skip seeding the sample's schema/data. Used when the
   *  on-disk database already exists (Phase 3 persistence). */
  skipSeed?: boolean;
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

  // Generated columns use a completely different clause; all other
  // modifiers (NOT NULL, UNIQUE, DEFAULT, FK) are not applicable.
  if (col.generated) {
    const st = col.generated.storageType === "STORED" ? "STORED" : "VIRTUAL";
    parts.push(`GENERATED ALWAYS AS (${col.generated.expression}) ${st}`);
    return parts.join(" ");
  }

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

/**
 * Parse the `GENERATED ALWAYS AS (expr) [STORED|VIRTUAL]` clause for each
 * generated column from the table's CREATE TABLE DDL.
 *
 * SQLite stores the full DDL in `sqlite_master.sql` but `PRAGMA table_xinfo`
 * only tells us *which* columns are generated (via the `hidden` flag), not
 * the expression itself.  This helper bridges that gap by scanning the DDL
 * for each known generated column name and extracting its expression using a
 * parenthesis-depth counter (to correctly handle nested function calls).
 */
function parseGeneratedFromDDL(
  ddl: string,
  generatedColNames: string[],
): Map<string, { expression: string; storageType: "VIRTUAL" | "STORED" }> {
  const result = new Map<string, { expression: string; storageType: "VIRTUAL" | "STORED" }>();

  for (const colName of generatedColNames) {
    // Build a regex that matches the column name (quoted or unquoted) followed
    // eventually by `GENERATED ALWAYS AS (`.  We use a non-greedy `[\s\S]*?`
    // so we latch onto the first match for each column name.
    const escaped = colName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pat = new RegExp(
      `(?:"${escaped}"|\\b${escaped}\\b)[\\s\\S]*?GENERATED\\s+ALWAYS\\s+AS\\s*\\(`,
      "i",
    );
    const m = pat.exec(ddl);
    if (!m) continue;

    // Walk forward from the opening paren, counting depth.
    const start = m.index + m[0].length; // character after the opening "("
    let depth = 1;
    let pos = start;
    while (pos < ddl.length && depth > 0) {
      if (ddl[pos] === "(") depth += 1;
      else if (ddl[pos] === ")") depth -= 1;
      pos += 1;
    }
    const expression = ddl.slice(start, pos - 1).trim();

    // Look for STORED or VIRTUAL keyword immediately after the closing paren.
    const after = ddl.slice(pos).trimStart();
    const storageMatch = /^(STORED|VIRTUAL)\b/i.exec(after);
    const storageType: "VIRTUAL" | "STORED" = storageMatch
      ? (storageMatch[1].toUpperCase() as "VIRTUAL" | "STORED")
      : "VIRTUAL";

    result.set(colName, { expression, storageType });
  }

  return result;
}

/** Build a per-column declared-type list for a result set by looking
 *  the column names up in the database's schema.
 *
 *  sqlite-wasm does NOT export `sqlite3_column_decltype` (verified against
 *  the published 1.13.0 wasm — the export table only includes
 *  `column_blob/bytes/count/double/name/text/type`), so we can't read
 *  declared types directly from the prepared statement.  Instead we
 *  parse FROM/JOIN clauses out of the SQL and consult
 *  `PRAGMA table_info(<table>)` for every referenced table, keyed by
 *  column name.  Unknown columns (computed expressions, columns from
 *  CTEs, columns whose name doesn't match any referenced table) come
 *  back as the empty string so the consumer can fall back to
 *  value-based inference. */
function resolveDeclaredColumnTypes(
  db: Database,
  sql: string,
  columns: string[],
): string[] {
  const referenced = extractReferencedTables(sql);
  // Build a column-name → declared-type map by walking each referenced
  // table's `PRAGMA table_info`.  When two tables share a column name
  // with conflicting types, the first table referenced in the SQL wins,
  // which matches what a developer reading the query usually expects.
  const byColumn = new Map<string, string>();
  for (const table of referenced) {
    let info: QueryExecResult[];
    try {
      info = execAll(db, `PRAGMA table_info(${quoteIdent(table)})`);
    } catch {
      continue;
    }
    if (info.length === 0) continue;
    const cols = info[0];
    const nameIdx = cols.columns.indexOf("name");
    const typeIdx = cols.columns.indexOf("type");
    if (nameIdx < 0 || typeIdx < 0) continue;
    for (const row of cols.values) {
      const name = String(row[nameIdx] ?? "");
      const type = String(row[typeIdx] ?? "");
      if (name && !byColumn.has(name)) byColumn.set(name, type);
    }
  }
  return columns.map((c) => byColumn.get(c) ?? "");
}

/** Pull every table name referenced by a FROM/JOIN clause out of an SQL
 *  string.  Strips string literals and SQL comments first so identifiers
 *  inside them aren't misread as table references.  Quoted identifiers
 *  (`"users"`, `[users]`, `` `users` ``) are unquoted before being
 *  returned.  Not a full SQL parser — designed to be good enough for
 *  the common single-statement SELECTs the playground actually runs. */
function extractReferencedTables(sql: string): string[] {
  // Remove block comments, line comments, and string/identifier literals
  // before scanning for FROM/JOIN so e.g. `FROM` inside a string doesn't
  // produce a phantom table name.
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, (m) => m)
    .replace(/`(?:``|[^`])*`/g, (m) => m);
  const pattern =
    /\b(?:FROM|JOIN)\s+(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_][\w]*))/gi;
  const tables: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(stripped)) !== null) {
    const name = match[1] || match[2] || match[3] || match[4];
    if (!name) continue;
    // Skip SQL keywords that can follow JOIN (e.g. "JOIN LATERAL …") and
    // common aliases that look like tables but aren't.
    const upper = name.toUpperCase();
    if (upper === "LATERAL" || upper === "SELECT") continue;
    if (seen.has(name)) continue;
    seen.add(name);
    tables.push(name);
  }
  return tables;
}

/** Drop every user-created table, view, index, and trigger from the
 *  database, leaving the schema empty.  Used when loading a sample or
 *  blank database into a persistent (OPFS-backed) DB instead of
 *  closing and re-opening the file.  Foreign-key enforcement is
 *  disabled around the drops so cross-table references don't block. */
function dropAllUserObjects(db: Database): void {
  // Iterate kinds in a sensible drop order: triggers / views first
  // (they reference tables), then tables (auto-drops their auto-index),
  // then any remaining user indexes.
  db.exec("PRAGMA foreign_keys = OFF;");
  try {
    for (const kind of ["trigger", "view", "table", "index"] as const) {
      const stmt = db.prepare(
        `SELECT name FROM sqlite_master WHERE type = $t AND name NOT LIKE 'sqlite_%'`,
      );
      const names: string[] = [];
      try {
        stmt.bind({ $t: kind });
        while (stmt.step()) {
          const row = getRow(stmt);
          if (typeof row[0] === "string") names.push(row[0]);
        }
      } finally {
        stmt.finalize();
      }
      const keyword =
        kind === "trigger"
          ? "TRIGGER"
          : kind === "view"
            ? "VIEW"
            : kind === "index"
              ? "INDEX"
              : "TABLE";
      for (const name of names) {
        try {
          db.exec(`DROP ${keyword} IF EXISTS ${quoteIdent(name)}`);
        } catch {
          // Drops can race against schema dependencies; ignore and let
          // a later iteration pick up the leftovers.
        }
      }
    }
  } finally {
    db.exec("PRAGMA foreign_keys = ON;");
  }
}

/** Best-effort full-database copy from `src` -> `dst`.  Used by
 *  `loadFromBytes` when a persistent (OPFS) DB is active, since we
 *  cannot deserialise an arbitrary byte image directly into an
 *  OPFS-backed file. */
function copyDatabaseContents(src: Database, dst: Database): void {
  // Re-emit every CREATE statement from sqlite_master.
  const schemaRows = execAll(
    src,
    `SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'view' THEN 2 WHEN 'trigger' THEN 3 ELSE 4 END`,
  );
  dst.exec("PRAGMA foreign_keys = OFF;");
  dst.exec("BEGIN");
  try {
    if (schemaRows.length > 0) {
      for (const row of schemaRows[0].values) {
        const sql = String(row[2] ?? "");
        if (!sql) continue;
        try {
          dst.exec(sql);
        } catch {
          // Skip individual statements that fail (e.g. references to
          // missing modules); continue with the rest of the import.
        }
      }
    }
    // Copy table rows.
    const tableRows = execAll(
      src,
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
    );
    if (tableRows.length > 0) {
      for (const row of tableRows[0].values) {
        const name = String(row[0]);
        if (!name) continue;
        const q = quoteIdent(name);
        let data: QueryExecResult[];
        try {
          data = execAll(src, `SELECT * FROM ${q}`);
        } catch {
          continue;
        }
        if (data.length === 0 || data[0].values.length === 0) continue;
        const cols = data[0].columns.map(quoteIdent).join(", ");
        const placeholders = data[0].columns.map(() => "?").join(", ");
        const stmt = dst.prepare(
          `INSERT INTO ${q} (${cols}) VALUES (${placeholders})`,
        );
        try {
          for (const r of data[0].values) {
            stmt.bind(r as unknown as SqlValue[]);
            stmt.step();
            stmt.reset(true);
          }
        } finally {
          stmt.finalize();
        }
      }
    }
    dst.exec("COMMIT");
  } catch (err) {
    try {
      dst.exec("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    dst.exec("PRAGMA foreign_keys = ON;");
  }
}

export async function createSqliteEngineInProcess(
  initialSampleId: string,
  openOptions: SqliteEngineOpenOptions = {},
): Promise<{
  [K in keyof SqliteEngine]: Awaited<
    ReturnType<NonNullable<SqliteEngine[K]>>
  > extends infer R
    ? (...args: Parameters<NonNullable<SqliteEngine[K]>>) => R
    : never;
}> {
  const sqlite3 = await loadSqlite3();
  let db: Database | null = null;
  let active: SqliteSampleDatabase = findSampleDatabase(initialSampleId);

  // When a persistent (OPFS-backed) VFS is used, we open the database
  // file once and *re-use* it across sample switches.  Switching
  // samples in OPFS mode wipes the existing schema instead of opening
  // a fresh in-memory database, so the on-disk file always reflects
  // the active sample.
  const persistent =
    typeof openOptions.vfs === "string" && openOptions.vfs.length > 0;

  function openFresh(): Database {
    return openDatabase(sqlite3, {
      filename: openOptions.filename,
      flags: openOptions.flags,
      vfs: openOptions.vfs,
    });
  }

  /** Returns true when the OPFS-backed DB already contains user
   *  objects, meaning we should re-attach to an existing workspace
   *  rather than overwriting it with a fresh sample seed. */
  function hasUserObjects(d: Database): boolean {
    try {
      const rows = execAll(
        d,
        `SELECT 1 FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' LIMIT 1`,
      );
      return rows.length > 0 && rows[0].values.length > 0;
    } catch {
      return false;
    }
  }

  function build(sample: SqliteSampleDatabase, opts: { skipSeed?: boolean } = {}): void {
    let firstOpenOfPersistent = false;
    if (persistent) {
      // Open the persistent file lazily on the first build call, and
      // wipe its current schema on subsequent calls so a sample swap
      // doesn't accumulate stale tables.
      if (!db) {
        db = openFresh();
        firstOpenOfPersistent = true;
      } else {
        dropAllUserObjects(db);
      }
    } else {
      if (db) {
        try {
          db.close();
        } catch {
          // Ignore — closing a half-broken db shouldn't block the rebuild.
        }
      }
      db = openFresh();
    }
    // Enforce foreign-key constraints declared in the sample schema.
    // SQLite ships with this off by default for backwards compatibility,
    // so we opt in once per database build. The `rebuildTable` flow
    // toggles it off/on around its own work.
    db.exec("PRAGMA foreign_keys = ON;");
    // First-open detection: if we just opened a persistent (OPFS) DB
    // file that already contains user objects, do NOT reseed — the
    // user is re-attaching to a saved workspace. This is the core of
    // Phase 3's persistence behaviour.
    const shouldSkipSeed =
      opts.skipSeed === true ||
      (firstOpenOfPersistent && hasUserObjects(db));
    if (!shouldSkipSeed) {
      if (sample.schema) db.exec(sample.schema);
      sample.seed(db);
    }
    active = sample;
  }

  build(active, { skipSeed: openOptions.skipSeed });

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
    const res = execAll(require(), 
      `SELECT name FROM sqlite_master WHERE type = '${kind}' AND name NOT LIKE 'sqlite_%'${extra} ORDER BY name`,
    );
    if (res.length === 0) return [];
    return res[0].values.map((row) => String(row[0]));
  }

  return {
    loadSampleDatabase(id: string) {
      build(findSampleDatabase(id));
      const { seed: _seed, ...meta } = active;
      return meta;
    },
    exec(sql: string) {
      return execAll(require(), sql);
    },
    execAll(sql: string): (QueryExecResultWithTypes | null)[] {
      const db = require();
      const results: (QueryExecResultWithTypes | null)[] = [];
      for (const stmt of iterateStatements(db, sql)) {
        try {
          // sqlite-wasm 3.53.0-build1's `getColumnNames()` throws
          // "Column index 0 is out of range" when `columnCount === 0`,
          // so we must check `columnCount` directly first.
          if (stmt.columnCount === 0) {
            // Non-SELECT statement (INSERT, UPDATE, CREATE TABLE, …)
            while (stmt.step()) {
              // execute fully, discard any rows
            }
            results.push(null);
          } else {
            const columns = stmt.getColumnNames();
            // SELECT-like statement — collect rows (may be zero). Resolve
            // declared column types from PRAGMA table_info so the
            // ResultView shows real types even when no rows are returned
            // (otherwise value-based inference falls through to "NULL"
            // and the type strip reads as "null" for every column).
            // `iteratedSql` holds the slice of input that produced this
            // statement; it's what we need to scan for FROM/JOIN refs.
            const iteratedSql =
              typeof (stmt as unknown as { getSQL?: () => string }).getSQL ===
              "function"
                ? (stmt as unknown as { getSQL: () => string }).getSQL()
                : sql;
            const columnTypes = resolveDeclaredColumnTypes(
              db,
              iteratedSql,
              columns,
            );
            const values: QueryExecResult["values"] = [];
            while (stmt.step()) {
              values.push(getRow(stmt) as QueryExecResult["values"][number]);
            }
            results.push({ columns, columnTypes, values });
          }
        } finally {
          stmt.finalize();
        }
      }
      return results;
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
          const row = getRow(stmt);
          if (typeof row[0] === "string") names.push(row[0]);
        }
      } finally {
        stmt.finalize();
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
          const row = getRow(stmt);
          if (typeof row[0] === "string") names.push(row[0]);
        }
      } finally {
        stmt.finalize();
      }
      return names;
    },
    previewTable(name: string, limit = 200) {
      // The table name is a SQLite identifier — sqlite-wasm does not allow
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
      return execAll(require(), 
        `SELECT * FROM ${quoteIdent(name)} LIMIT ${safeLimit}`,
      );
    },
    describeTable(name: string) {
      // `PRAGMA table_info(<name>)` returns one row per column with
      // (cid, name, type, notnull, dflt_value, pk). Identifier is
      // quoted to defend against reserved-word collisions.
      return execAll(require(), `PRAGMA table_info(${quoteIdent(name)})`);
    },
    countRows(name: string) {
      return execAll(require(), 
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
      require().exec(`DROP ${k} IF EXISTS ${quoteIdent(name)}`);
    },
    truncateTable(name: string) {
      // SQLite has no `TRUNCATE` keyword. An unqualified DELETE is
      // optimised internally to drop all rows in one go.
      require().exec(`DELETE FROM ${quoteIdent(name)}`);
    },
    listColumns(name: string) {
      // PRAGMA table_xinfo returns one extra column compared to
      // PRAGMA table_info: `hidden` (0 = normal, 1 = hidden virtual-table
      // column, 2 = stored generated, 3 = virtual generated).
      const rows = execAll(require(), 
        `PRAGMA table_xinfo(${quoteIdent(name)})`,
      );
      if (rows.length === 0) return [];

      const generatedColNames: string[] = [];
      const columns: TableColumnInfo[] = rows[0].values.map((row) => {
        const hidden = Number(row[6]);
        const isGenerated = hidden === 2 || hidden === 3;
        const colName = String(row[1]);
        if (isGenerated) generatedColNames.push(colName);
        return {
          cid: Number(row[0]),
          name: colName,
          type: String(row[2] ?? ""),
          notNull: Number(row[3]) !== 0,
          // Generated columns never have a user-visible default value.
          defaultValue: isGenerated
            ? null
            : row[4] === null || row[4] === undefined
              ? null
              : String(row[4]),
          pk: Number(row[5]),
          generated: null,
        };
      });

      // If the table has generated columns, parse their expressions from the
      // DDL stored in sqlite_master.
      if (generatedColNames.length > 0) {
        const ddlStmt = require().prepare(
          `SELECT sql FROM sqlite_master WHERE name = $n AND type = 'table'`,
        );
        let ddl = "";
        try {
          ddlStmt.bind({ $n: name });
          if (ddlStmt.step()) {
            const row = getRow(ddlStmt);
            if (typeof row[0] === "string") ddl = row[0];
          }
        } finally {
          ddlStmt.finalize();
        }
        if (ddl) {
          const info = parseGeneratedFromDDL(ddl, generatedColNames);
          for (const col of columns) {
            if (generatedColNames.includes(col.name)) {
              col.generated = info.get(col.name) ?? {
                expression: "",
                storageType: "VIRTUAL",
              };
            }
          }
        }
      }

      return columns;
    },
    listForeignKeys(name: string) {
      const rows = execAll(require(), 
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
      // Generated columns are always excluded from INSERT…SELECT because
      // SQLite computes their values automatically from the expression.
      const existing = new Set(
        execAll(
          require(),
          `PRAGMA table_info(${quoteIdent(spec.originalName)})`,
        ).flatMap((r) => r.values.map((row) => String(row[1]))),
      );
      const sourceCols: string[] = [];
      const targetCols: string[] = [];
      for (const c of spec.columns) {
        if (c.generated) continue; // generated columns cannot be copied
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
            const row = getRow(stmt);
            if (typeof row[0] === "string") indexSqls.push(row[0]);
          }
        } finally {
          stmt.finalize();
        }
      }

      // Collect ALL trigger DDLs so we can drop them before the table
      // rebuild and recreate them afterward. SQLite validates trigger
      // bodies at schema-change time, so any trigger that references the
      // table being rebuilt (even if it is ON a different table) will
      // fail validation the moment that table is temporarily absent
      // between DROP TABLE and ALTER TABLE … RENAME TO. Dropping all
      // triggers up front — just like we do with views — avoids this.
      const triggerSqls: string[] = [];
      const triggerNames: string[] = [];
      {
        const stmt = d.prepare(
          `SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND sql IS NOT NULL ORDER BY name`,
        );
        try {
          while (stmt.step()) {
            const row = getRow(stmt);
            triggerNames.push(String(row[0]));
            if (typeof row[1] === "string") triggerSqls.push(row[1]);
          }
        } finally {
          stmt.finalize();
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

      // Collect all view DDLs so we can drop them before the table
      // rebuild and recreate them after. SQLite validates view
      // references at schema-change time, so leaving views in place
      // while the table is temporarily absent (between DROP TABLE and
      // ALTER TABLE ... RENAME TO) causes a spurious "no such table"
      // error on COMMIT.
      const viewSqls: string[] = [];
      const viewNames: string[] = [];
      {
        const stmt = d.prepare(
          `SELECT name, sql FROM sqlite_master WHERE type = 'view' AND sql IS NOT NULL ORDER BY name`,
        );
        try {
          while (stmt.step()) {
            const row = getRow(stmt);
            viewNames.push(String(row[0]));
            viewSqls.push(String(row[1]));
          }
        } finally {
          stmt.finalize();
        }
      }

      const tmpName = `${spec.newName}__new`;
      // Compose the multi-statement script. We toggle foreign keys off
      // explicitly inside the transaction so referencing tables stay
      // consistent during the rebuild.
      d.exec("PRAGMA foreign_keys = OFF;");
      d.exec("BEGIN");
      try {
        // Drop all views and all triggers before touching the table so
        // SQLite doesn't attempt to validate their SQL during the interim
        // state where the original table has been dropped but not yet
        // renamed back. This mirrors the same issue found for views:
        // triggers that reference the table (even if ON a different
        // table) are validated at schema-change time and will fail with
        // "no such table" if the target is temporarily absent.
        for (const name of viewNames) {
          d.exec(`DROP VIEW IF EXISTS ${quoteIdent(name)}`);
        }
        for (const name of triggerNames) {
          d.exec(`DROP TRIGGER IF EXISTS ${quoteIdent(name)}`);
        }
        d.exec(`CREATE TABLE ${quoteIdent(tmpName)} (${defs.join(", ")})`);
        if (sourceCols.length > 0) {
          d.exec(
            `INSERT INTO ${quoteIdent(tmpName)} (${targetCols.join(", ")}) SELECT ${sourceCols.join(", ")} FROM ${quoteIdent(spec.originalName)}`,
          );
        }
        d.exec(`DROP TABLE ${quoteIdent(spec.originalName)}`);
        d.exec(
          `ALTER TABLE ${quoteIdent(tmpName)} RENAME TO ${quoteIdent(spec.newName)}`,
        );
        // Recreate indexes with potentially patched DDL. If an index
        // references a column that was deleted in this rebuild it will
        // fail — skip it rather than aborting the whole save.
        for (const sql of indexSqls) {
          try {
            d.exec(patchDdl(sql));
          } catch {
            // Index references a deleted column — drop it silently.
          }
        }
        // Recreate all triggers with potentially patched DDL (handles
        // table/column renames when the rebuilt table is also renamed).
        // Skip any trigger that references a deleted column.
        for (const sql of triggerSqls) {
          try {
            d.exec(patchDdl(sql));
          } catch {
            // Trigger references a deleted column — drop it silently.
          }
        }
        // Recreate all views with patched DDL (handles table/column renames).
        // Skip any view that references a deleted column.
        for (const sql of viewSqls) {
          try {
            d.exec(patchDdl(sql));
          } catch {
            // View references a deleted column — drop it silently.
          }
        }
        d.exec("COMMIT");
      } catch (err) {
        try {
          d.exec("ROLLBACK");
        } catch {
          // ignore rollback failure
        }
        throw err;
      } finally {
        d.exec("PRAGMA foreign_keys = ON;");
      }
    },
    getDDL(name: string) {
      // `sqlite_master.sql` already stores the original CREATE
      // statement verbatim (minus a trailing semicolon). We use a
      // bound parameter for the entity name so this path is safe
      // against arbitrary identifier strings — sqlite-wasm *does* allow
      // value parameters, only identifier interpolation has to be
      // done by hand.
      const stmt = require().prepare(
        `SELECT sql FROM sqlite_master WHERE name = $name AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'view' THEN 0 ELSE 1 END, name`,
      );
      const parts: string[] = [];
      try {
        stmt.bind({ $name: name });
        while (stmt.step()) {
          const row = getRow(stmt);
          if (row.length > 0 && typeof row[0] === "string") {
            parts.push(row[0].trim());
          }
        }
      } finally {
        stmt.finalize();
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
          const row = getRow(idxStmt);
          if (row.length > 0 && typeof row[0] === "string") {
            parts.push(row[0].trim());
          }
        }
      } finally {
        idxStmt.finalize();
      }
      return parts.map((p) => (p.endsWith(";") ? p : `${p};`)).join("\n\n");
    },
    activeSample() {
      const { seed: _seed, ...meta } = active;
      return meta;
    },
    exportDatabase() {
      // sqlite-wasm's `Database.export()` returns a `Uint8Array` containing
      // the raw on-disk representation of the database, suitable for
      // saving as a `.sqlite` file or feeding to `new SQL.Database(...)`
      // to reopen later.
      return exportDatabase(sqlite3, require());
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
      // so each cell value is bound through sqlite-wasm's parameter API
      // (immune to SQL injection regardless of cell contents).
      const where = pkColumns.map((c) => `${quoteIdent(c)} = ?`).join(" AND ");
      const sql = `DELETE FROM ${quoteIdent(tableName)} WHERE ${where}`;
      const stmt = d.prepare(sql);
      let deleted = 0;
      try {
        d.exec("BEGIN");
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
          d.exec("COMMIT");
        } catch (err) {
          try {
            d.exec("ROLLBACK");
          } catch {
            // ignore rollback failure
          }
          throw err;
        }
      } finally {
        stmt.finalize();
      }
      return deleted;
    },
    updateRows(
      tableName: string,
      updates: ReadonlyArray<{
        rowIndex: number;
        column: string;
        value: unknown;
        pk?: ReadonlyArray<{ column: string; value: unknown }>;
      }>,
    ) {
      if (updates.length === 0) return 0;
      const d = require();
      // Each row is identified by its primary-key value(s) when available
      // (stable regardless of display order), falling back to the rowid
      // OFFSET on the table's natural scan order for PK-less tables.
      // We build one prepared statement per distinct (column, key-shape)
      // so repeated edits reuse the same stmt.
      const stmtCache = new Map<string, ReturnType<Database["prepare"]>>();
      let count = 0;
      try {
        d.exec("BEGIN");
        try {
          for (const upd of updates) {
            const usePk = !!(upd.pk && upd.pk.length > 0);
            const pkCols = usePk ? upd.pk!.map((p) => p.column) : [];
            const colKey = usePk
              ? `pk:${upd.column}:${pkCols.join(",")}`
              : `off:${upd.column}`;
            let stmt = stmtCache.get(colKey);
            if (!stmt) {
              const sql = usePk
                ? `UPDATE ${quoteIdent(tableName)} SET ${quoteIdent(upd.column)} = ?1 ` +
                  `WHERE ${pkCols.map((c, i) => `${quoteIdent(c)} = ?${i + 2}`).join(" AND ")}`
                : `UPDATE ${quoteIdent(tableName)} SET ${quoteIdent(upd.column)} = ?1 ` +
                  `WHERE rowid = (SELECT rowid FROM ${quoteIdent(tableName)} ORDER BY rowid LIMIT 1 OFFSET ?2)`;
              stmt = d.prepare(sql);
              stmtCache.set(colKey, stmt);
            }
            // SQLite stores booleans as 0/1 and sql.js can't bind a JS
            // boolean, so coerce booleans (e.g. from the boolean toggle).
            const toBind = (v: unknown): SqlValue =>
              typeof v === "boolean" ? (v ? 1 : 0) : (v as SqlValue);
            const binds: SqlValue[] = usePk
              ? [toBind(upd.value), ...upd.pk!.map((p) => toBind(p.value))]
              : [toBind(upd.value), upd.rowIndex];
            stmt.bind(binds);
            stmt.step();
            stmt.reset();
            count += 1;
          }
          d.exec("COMMIT");
        } catch (err) {
          try {
            d.exec("ROLLBACK");
          } catch {
            // ignore rollback failure
          }
          throw err;
        }
      } finally {
        for (const stmt of stmtCache.values()) {
          stmt.finalize();
        }
      }
      return count;
    },
    loadBlankDatabase() {
      if (persistent && db) {
        // Persistent mode: wipe the on-disk file rather than closing it
        // so the OPFS-backed VFS keeps tracking the same database file.
        dropAllUserObjects(db);
      } else {
        if (db) {
          try {
            db.close();
          } catch {
            // Ignore close errors.
          }
        }
        db = openFresh();
      }
      db!.exec("PRAGMA foreign_keys = ON;");
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
      const { seed: _seed, ...meta } = active;
      return meta;
    },
    loadFromBytes(bytes: Uint8Array, filename: string) {
      if (persistent && db) {
        // Persistent mode: open a transient in-memory DB from `bytes`
        // to validate, dump every CREATE/INSERT into the on-disk DB,
        // then close the transient one. We can't sqlite3_deserialize
        // into an OPFS-backed DB because the OPFS VFS requires the
        // file backing to remain in place.
        const transient = openDatabase(sqlite3, { bytes });
        try {
          transient.exec("PRAGMA foreign_keys = ON;");
          dropAllUserObjects(db);
          // Copy every CREATE statement + every row out via a small
          // backup loop. For most user uploads this is fine; for very
          // large databases the user should be using the export/import
          // flow instead.
          copyDatabaseContents(transient, db);
        } finally {
          transient.close();
        }
      } else {
        // In-memory mode: just open a fresh DB from the bytes.
        const next = openDatabase(sqlite3, { bytes });
        try {
          next.exec("PRAGMA foreign_keys = ON;");
        } catch (err) {
          try {
            next.close();
          } catch {
            /* ignore */
          }
          throw err;
        }
        if (db) {
          try {
            db.close();
          } catch {
            // Ignore close errors.
          }
        }
        db = next;
      }
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
      const { seed: _seed, ...meta } = imported;
      return meta;
    },
    getColumnConstraintInfo(tableName: string): ColumnConstraintInfo[] {
      const d = require();
      // Primary key membership comes from PRAGMA table_info.
      const tableInfoResult = execAll(d, 
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
          const row = getRow(ddlStmt);
          if (row.length > 0 && typeof row[0] === "string") {
            ddlText += row[0];
          }
        }
      } finally {
        ddlStmt.finalize();
      }
      const hasAutoIncrement = /\bautoincrement\b/i.test(ddlText);
      // Collect column names that have an explicit UNIQUE constraint
      // (origin = 'u' in index_list means it came from a UNIQUE clause,
      //  not from a PRIMARY KEY or a user-created index).
      const uniqueColNames = new Set<string>();
      const idxListResult = execAll(d, 
        `PRAGMA index_list(${quoteIdent(tableName)})`,
      );
      if (idxListResult.length > 0) {
        for (const row of idxListResult[0].values) {
          // index_list columns: seq, name, unique, origin, partial
          const isUnique = Number(row[2]) === 1;
          const origin = String(row[3]);
          if (isUnique && origin === "u") {
            const idxName = String(row[1]);
            const idxInfoResult = execAll(d, 
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
      const d = require();
      if (columnNames.length === 0) {
        d.exec(`INSERT INTO ${quoteIdent(tableName)} DEFAULT VALUES`);
        return;
      }
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
        stmt.finalize();
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
        const countResult = execAll(d, 
          `SELECT COUNT(*) FROM (${stripped})`,
        );
        if (countResult.length > 0 && countResult[0].values.length > 0) {
          totalCount = Number(countResult[0].values[0][0]) || 0;
        }
      } catch {
        // Count query failed; totalCount stays null and will be
        // derived from the page result length below.
      }
      // Fetch only the requested page by preparing the statement
      // directly.  We can't use `d.exec()` here because it doesn't
      // expose the prepared statement (which we need to read declared
      // column types via `sqlite3_column_decltype`).  Using prepare/
      // step also naturally preserves the column header even when the
      // page is empty, so the 0-row LIMIT 0 fallback below is no
      // longer necessary for that case.
      let stmt: ReturnType<Database["prepare"]> | null = null;
      try {
        stmt = d.prepare(
          `${stripped} LIMIT ${safeSize} OFFSET ${safeOffset}`,
        );
        if (stmt.columnCount === 0) {
          // Non-SELECT statement that somehow reached the lazy path —
          // drain and return an empty result so the UI shows success.
          while (stmt.step()) { /* drain */ }
          return { result: [], totalCount: totalCount ?? safeOffset };
        }
        const columns = stmt.getColumnNames();
        const columnTypes = resolveDeclaredColumnTypes(d, stripped, columns);
        const values: QueryExecResult["values"] = [];
        while (stmt.step()) {
          values.push(getRow(stmt) as QueryExecResult["values"][number]);
        }
        const rowCount =
          totalCount !== null
            ? totalCount
            : values.length + safeOffset;
        return {
          result: [{ columns, columnTypes, values }],
          totalCount: rowCount,
        };
      } finally {
        if (stmt) stmt.finalize();
      }
    },
  };
}
