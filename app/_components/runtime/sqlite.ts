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

/** Description of one column-level foreign-key relationship, derived
 *  from `PRAGMA foreign_key_list(...)`. */
export interface ForeignKeyInfo {
  /** Source column on this table. */
  from: string;
  /** Referenced table. */
  table: string;
  /** Referenced column. */
  to: string;
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
  foreignKey?: { table: string; column: string };
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
  /** `DROP TABLE`/`DROP VIEW` — used by the sidebar context-menu
   *  "Drop" action. The kind is restricted to a fixed allowlist so the
   *  resulting statement can never be coerced into something else. */
  dropEntity: (name: string, kind: "table" | "view") => void;
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
    parts.push(
      `REFERENCES ${quoteIdent(col.foreignKey.table)}(${quoteIdent(col.foreignKey.column)})`,
    );
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

  function listFromMaster(type: "table" | "view"): string[] {
    // Defensive allowlist even though the TS signature narrows the
    // input — keeps the implementation robust if the function is ever
    // re-exported or called from looser-typed code.
    const kind = type === "view" ? "view" : "table";
    const res = require().exec(
      `SELECT name FROM sqlite_master WHERE type = '${kind}' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
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
    dropEntity(name: string, kind: "table" | "view") {
      // Restrict `kind` to the fixed allowlist defensively even though
      // the TS signature narrows the input — callers may forward
      // looser-typed values from UI events.
      const k = kind === "view" ? "VIEW" : "TABLE";
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
  };
}
