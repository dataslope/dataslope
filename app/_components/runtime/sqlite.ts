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
    const res = require().exec(
      `SELECT name FROM sqlite_master WHERE type = '${type}' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
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
      // `limit` is a bound parameter; the table name is quoted because
      // SQLite does not allow parameter binding for identifiers.
      const safeLimit = Math.max(1, Math.min(10_000, Math.floor(limit)));
      return require().exec(
        `SELECT * FROM ${quoteIdent(name)} LIMIT ${safeLimit}`,
      );
    },
    activeSample() {
      return active;
    },
  };
}
