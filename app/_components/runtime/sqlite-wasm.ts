/**
 * Thin runtime + helpers around `@sqlite.org/sqlite-wasm`.
 *
 * Consumers (`sqlite-core.ts`, `sqliteSamples.ts`) use the underlying
 * `Database` and `PreparedStatement` classes from sqlite-wasm directly;
 * this module only adds the small bits that aren't part of the OO API:
 *
 *   - `loadSqlite3()`         memoised, CDN-hosted module init
 *   - `openDatabase()`        construct an `oo1.DB` (in-memory or
 *                             VFS-backed) and optionally deserialise
 *                             a `.sqlite` byte image into it
 *   - `iterateStatements()`   generator: yields a `PreparedStatement`
 *                             per top-level statement in a multi-stmt
 *                             SQL script (replacement for sql.js's
 *                             `db.iterateStatements`)
 *   - `execAll()`             returns one `QueryExecResult` per
 *                             result-producing statement (replacement
 *                             for sql.js's `db.exec(sql)`)
 *   - `getRow()`              read the current row as an array, with
 *                             BigInt → Number/string coercion
 *   - `exportDatabase()`      serialise the DB to a `.sqlite` image
 *
 * The reason we load sqlite-wasm from a CDN at runtime (rather than
 * bundling it) is that its `index.mjs` contains
 * `new Worker(new URL(dynamicProxyUri, import.meta.url))`, which
 * Turbopack rejects at build time even though the code path is
 * unreachable when using the SAH Pool VFS that we actually use. This
 * mirrors the same pattern already used for `@duckdb/duckdb-wasm` and
 * `parquet-wasm` in this repo.
 */

import type {
  BindingSpec,
  Database,
  PreparedStatement,
  Sqlite3Static,
} from "@sqlite.org/sqlite-wasm";

export type { Database, PreparedStatement, Sqlite3Static, BindingSpec };

// ---------------------------------------------------------------------------
// Value types (kept compatible with the surface the existing UI expects).
// ---------------------------------------------------------------------------

/** Per-cell value coming out of a result row. We narrow sqlite-wasm's
 *  `SqlValue` so the rest of the playground never sees `bigint` or
 *  `Int8Array` / `ArrayBuffer` instances. */
export type SqlValue = string | number | null | Uint8Array;

/** Shape of one result set returned by `execAll`. Matches the legacy
 *  sql.js result shape so downstream UI code (ResultView, importers,
 *  etc.) does not need to change. */
export interface QueryExecResult {
  columns: string[];
  values: SqlValue[][];
}

// ---------------------------------------------------------------------------
// sqlite-wasm module loader (memoised, CDN-hosted)
// ---------------------------------------------------------------------------

// IMPORTANT: keep this constant in sync with the
// `@sqlite.org/sqlite-wasm` version pinned in package.json. The npm
// install only ships the TypeScript declarations to us; the actual
// runtime is fetched from jsDelivr.
const SQLITE_WASM_VERSION = "3.53.0-build1";
const SQLITE_WASM_CDN = `https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@${SQLITE_WASM_VERSION}/dist/index.mjs`;

type Sqlite3InitFn = (config?: {
  print?: (msg: string) => void;
  printErr?: (msg: string) => void;
}) => Promise<Sqlite3Static>;

let sqlite3Promise: Promise<Sqlite3Static> | null = null;

/** Loads `@sqlite.org/sqlite-wasm` once per worker / process. */
export function loadSqlite3(): Promise<Sqlite3Static> {
  if (!sqlite3Promise) {
    sqlite3Promise = (async () => {
      // The magic comments tell webpack/turbopack to leave this URL
      // alone instead of trying to resolve it at build time.
      const mod = (await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ SQLITE_WASM_CDN
      )) as { default?: Sqlite3InitFn };
      const init = mod.default;
      if (typeof init !== "function") {
        throw new Error(
          "Failed to load @sqlite.org/sqlite-wasm: no default export",
        );
      }
      const sqlite3 = await init({
        print: () => {},
        printErr: (msg: string) => {
          if (typeof console !== "undefined") console.warn(msg);
        },
      });
      return sqlite3;
    })();
  }
  return sqlite3Promise;
}

// ---------------------------------------------------------------------------
// Database construction helpers
// ---------------------------------------------------------------------------

export interface OpenDatabaseOptions {
  /** Database filename. Defaults to `":memory:"`. For a VFS-backed
   *  open this is the OPFS-relative path (e.g. `/workspaces/ws_1/sqlite.db`). */
  filename?: string;
  /** Open-mode flags (`c` create, `w` write, `r` read-only, `t` trace).
   *  Defaults to `"c"`. */
  flags?: string;
  /** Optional SQLite VFS name. When provided (e.g. `"opfs-sahpool"`),
   *  the database is persisted by that VFS. */
  vfs?: string;
  /** Optional `.sqlite` byte image to deserialise into the freshly
   *  opened database. Only valid for in-memory databases. */
  bytes?: Uint8Array;
}

/** Open a fresh `oo1.DB`, optionally seeded from a `.sqlite` byte
 *  image. The caller owns the returned `Database` and must `close()`
 *  it when finished. */
export function openDatabase(
  sqlite3: Sqlite3Static,
  options: OpenDatabaseOptions = {},
): Database {
  const { filename = ":memory:", flags = "c", vfs, bytes } = options;
  const DB = sqlite3.oo1.DB;
  const db = new DB({ filename, flags, vfs });
  if (bytes !== undefined) {
    deserializeIntoDb(sqlite3, db, bytes);
  }
  return db;
}

/** Replace the contents of `db`'s `main` schema with the given
 *  `.sqlite` byte image, using SQLITE_DESERIALIZE_*. The bytes are
 *  copied into WASM-managed memory and freed by SQLite when the DB is
 *  closed. */
function deserializeIntoDb(
  sqlite3: Sqlite3Static,
  db: Database,
  bytes: Uint8Array,
): void {
  const capi = sqlite3.capi as unknown as {
    sqlite3_deserialize: (
      dbPtr: number,
      schema: string,
      data: number,
      szDb: number,
      szBuf: number,
      flags: number,
    ) => number;
    SQLITE_DESERIALIZE_FREEONCLOSE: number;
    SQLITE_DESERIALIZE_RESIZEABLE: number;
  };
  const wasm = sqlite3.wasm as unknown as {
    alloc: (n: number) => number;
    heap8u: () => Uint8Array;
    dealloc: (ptr: number) => void;
  };
  if (typeof capi.sqlite3_deserialize !== "function") {
    throw new Error(
      "sqlite-wasm build is missing sqlite3_deserialize — cannot import database",
    );
  }
  const len = bytes.byteLength;
  const ptr = wasm.alloc(len);
  wasm.heap8u().set(bytes, ptr);
  const flags =
    capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_RESIZEABLE;
  const rc = capi.sqlite3_deserialize(db.pointer!, "main", ptr, len, len, flags);
  if (rc !== 0) {
    // FREEONCLOSE only takes ownership on rc === 0; free manually.
    wasm.dealloc(ptr);
    throw new Error(`sqlite3_deserialize failed: rc=${rc}`);
  }
}

/** Serialise `db`'s main schema to a `.sqlite` byte image. */
export function exportDatabase(sqlite3: Sqlite3Static, db: Database): Uint8Array {
  if (!db.pointer) throw new Error("Database is closed");
  const capi = sqlite3.capi as unknown as {
    sqlite3_js_db_export?: (dbPtr: number) => Uint8Array;
  };
  if (typeof capi.sqlite3_js_db_export !== "function") {
    throw new Error(
      "sqlite-wasm build is missing sqlite3_js_db_export — cannot export database",
    );
  }
  return capi.sqlite3_js_db_export(db.pointer);
}

// ---------------------------------------------------------------------------
// Value coercion
// ---------------------------------------------------------------------------

/** Coerce a single sqlite-wasm cell value to a `SqlValue`:
 *  - `undefined` → `null`
 *  - `bigint` within safe-integer range → `number`
 *  - `bigint` outside safe range → decimal string
 *  - `Int8Array` / `ArrayBuffer` → `Uint8Array`
 *  - everything else passes through.
 *
 * The coercion is required because sqlite-wasm enables BigInt support
 * by default, but the rest of the playground (ResultView, exporters,
 * etc.) assumes plain numbers/strings. */
export function coerceValue(v: unknown): SqlValue {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") {
    if (
      v >= BigInt(Number.MIN_SAFE_INTEGER) &&
      v <= BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      return Number(v);
    }
    return v.toString();
  }
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (v instanceof Int8Array) {
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  return v as SqlValue;
}

/** Read the current row of `stmt` as a fresh `SqlValue[]`. Requires
 *  that the most recent `stmt.step()` returned `true`. */
export function getRow(stmt: PreparedStatement): SqlValue[] {
  const row = stmt.get([]) as unknown[];
  // Reuse-and-mutate: sqlite-wasm fills the array we hand it; map
  // produces a new array with coerced values.
  return row.map(coerceValue);
}

// ---------------------------------------------------------------------------
// Multi-statement helpers
// ---------------------------------------------------------------------------

/**
 * Split a multi-statement SQL script into individual statements, with
 * awareness of string literals, identifiers, single- and block-style
 * comments, and `BEGIN ... END` trigger bodies (whose internal `;`
 * does not terminate the outer CREATE TRIGGER statement).
 *
 * This is good enough for everything the playground accepts
 * (CREATE/INSERT/SELECT/PRAGMA/CREATE TRIGGER). Each returned segment
 * retains its trailing semicolon so the prepared-statement engine can
 * consume it as-is.
 */
export function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  const n = sql.length;
  let i = 0;
  let start = 0;
  let beginDepth = 0;
  while (i < n) {
    const c = sql[i];
    // Line comment
    if (c === "-" && sql[i + 1] === "-") {
      i += 2;
      while (i < n && sql[i] !== "\n") i++;
      continue;
    }
    // Block comment
    if (c === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      if (i < n) i += 2;
      continue;
    }
    // String literal — '' is the escape sequence inside.
    if (c === "'") {
      i++;
      while (i < n) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    // Quoted identifier — "" or `` is the escape sequence inside.
    if (c === '"' || c === "`") {
      const q = c;
      i++;
      while (i < n) {
        if (sql[i] === q) {
          if (sql[i + 1] === q) {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    // Bracketed identifier (T-SQL style, accepted by SQLite).
    if (c === "[") {
      i++;
      while (i < n && sql[i] !== "]") i++;
      if (i < n) i++;
      continue;
    }
    // BEGIN / END keyword tracking. Match whole words only.
    if (
      (c === "B" || c === "b") &&
      /\bbegin\b/i.test(sql.slice(i, i + 5)) &&
      !/\w/.test(sql[i - 1] ?? " ")
    ) {
      beginDepth++;
      i += 5;
      continue;
    }
    if (
      (c === "E" || c === "e") &&
      /\bend\b/i.test(sql.slice(i, i + 3)) &&
      !/\w/.test(sql[i - 1] ?? " ") &&
      !/\w/.test(sql[i + 3] ?? " ")
    ) {
      if (beginDepth > 0) beginDepth--;
      i += 3;
      continue;
    }
    if (c === ";" && beginDepth === 0) {
      const seg = sql.slice(start, i + 1);
      if (seg.trim().length > 0) out.push(seg);
      i++;
      start = i;
      continue;
    }
    i++;
  }
  const tail = sql.slice(start);
  if (tail.trim().length > 0) out.push(tail);
  return out;
}

/**
 * Walk a multi-statement script one prepared statement at a time. The
 * generator yields each statement; the *caller* must `finalize()` it
 * before requesting the next one (mirrors the lifetime contract that
 * sql.js's `iterateStatements` had). A `for ... of` consumer should
 * wrap the yielded statement in `try { ... } finally { stmt.finalize(); }`.
 */
export function* iterateStatements(
  db: Database,
  sql: string,
): Generator<PreparedStatement> {
  for (const segment of splitSqlStatements(sql)) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    let stmt: PreparedStatement;
    try {
      stmt = db.prepare(segment);
    } catch (err) {
      // A trailing bare-semicolon segment is not a real statement; skip
      // silently so authors don't need to strip trailing whitespace.
      if (trimmed === ";") continue;
      throw err;
    }
    yield stmt;
  }
}

/**
 * Execute every statement in `sql` and return one `QueryExecResult`
 * for each *result-producing* statement (statements with zero columns
 * are dropped from the output, matching sql.js's `db.exec` semantics).
 */
export function execAll(db: Database, sql: string): QueryExecResult[] {
  const out: QueryExecResult[] = [];
  for (const stmt of iterateStatements(db, sql)) {
    try {
      const columns = stmt.getColumnNames();
      if (columns.length === 0) {
        while (stmt.step()) {
          /* drain */
        }
        continue;
      }
      const values: SqlValue[][] = [];
      while (stmt.step()) values.push(getRow(stmt));
      out.push({ columns, values });
    } finally {
      stmt.finalize();
    }
  }
  return out;
}
