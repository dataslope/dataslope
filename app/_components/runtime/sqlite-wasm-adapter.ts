/**
 * Thin adapter that exposes the small subset of the sql.js `Database` /
 * `Statement` API surface that `sqlite-core.ts` and `sqliteSamples.ts`
 * actually use, on top of `@sqlite.org/sqlite-wasm`'s OO1 `Database`
 * class.
 *
 * Why an adapter and not a full rewrite?
 *
 *   - The bulk of `sqlite-core.ts` (~1.4 kLOC) is dialect-agnostic SQL
 *     execution against a sync `Database` handle. Both sql.js and
 *     sqlite-wasm expose nearly identical synchronous OO APIs, so a
 *     small wrapper saves us from rewriting every query.
 *   - `sqliteSamples.ts` uses `db.prepare(sql)` + `stmt.run(row)` +
 *     `stmt.free()` for bulk insert. Keeping that surface stable means
 *     all three samples (and any new ones) work unchanged after the
 *     migration.
 *
 * Method mapping (sql.js -> sqlite-wasm):
 *   db.run(sql)                  -> db.exec(sql)
 *   db.exec(sql)                 -> manual iterate via db.prepare()
 *   db.prepare(sql)              -> db.prepare(sql)  (with shim)
 *   db.iterateStatements(sql)    -> generator over db.prepare-by-tail
 *   db.export()                  -> sqlite3.capi.sqlite3_js_db_export()
 *   new SQL.Database()           -> new sqlite3.oo1.DB(":memory:")
 *   new SQL.Database(bytes)      -> open + sqlite3_deserialize
 *   stmt.bind(arr|obj)           -> stmt.bind(...)
 *   stmt.step()                  -> stmt.step()
 *   stmt.get()                   -> stmt.get([])
 *   stmt.getColumnNames()        -> stmt.getColumnNames()
 *   stmt.run(row)                -> stmt.bind(row).step(); stmt.reset()
 *   stmt.reset()                 -> stmt.reset()
 *   stmt.free()                  -> stmt.finalize()
 *   stmt.getSQL()                -> stmt.getSQL?.()
 *
 * One subtle compatibility quirk: sqlite-wasm returns `bigint` for
 * integers outside the safe JS number range. The existing UI code does
 * not expect BigInt, so the adapter coerces:
 *   - BigInt within MIN/MAX_SAFE_INTEGER -> Number
 *   - BigInt outside that range          -> String
 *
 * Boolean bindings are also coerced to 0/1 to mirror sql.js semantics.
 */

import type {
  Database as WasmDatabase,
  PreparedStatement as WasmStmt,
  SqlValue as WasmSqlValue,
  Sqlite3Static,
} from "@sqlite.org/sqlite-wasm";

/** Subset of sql.js's `SqlValue` that the playground consumes. */
export type SqlValue = string | number | null | Uint8Array;

export interface QueryExecResult {
  columns: string[];
  values: SqlValue[][];
}

/** Bound parameter sets — array (positional / 1-based `?N`) or object
 *  (named `$key` / `:key` / `@key`).  Booleans coerce to 0/1, undefined
 *  to NULL, bigints to number / string as documented above. */
export type BindParams =
  | ReadonlyArray<unknown>
  | Readonly<Record<string, unknown>>;

/** sql.js-shaped statement. */
export interface SqlJsLikeStmt {
  bind(params?: BindParams): SqlJsLikeStmt;
  step(): boolean;
  get(): SqlValue[];
  getColumnNames(): string[];
  /** Convenience: bind one row of values, step once, reset. Mirrors
   *  sql.js's `Statement.run()` used by the sample bulk-insert helper. */
  run(params?: BindParams): void;
  reset(): SqlJsLikeStmt;
  free(): void;
  /** SQL text recorded when the statement was prepared. */
  getSQL(): string;
}

/** sql.js-shaped database. */
export interface SqlJsLikeDB {
  /** Execute one or more statements, ignoring any returned rows. */
  run(sql: string, params?: BindParams): void;
  /** Execute one or more statements and return one result set per
   *  result-producing statement (matches sql.js semantics). */
  exec(sql: string): QueryExecResult[];
  /** Prepare a single statement; trailing statements are ignored. */
  prepare(sql: string): SqlJsLikeStmt;
  /** Iterate over each statement in a multi-statement script. Yields
   *  one statement at a time; the caller must `free()` each. */
  iterateStatements(sql: string): IterableIterator<SqlJsLikeStmt>;
  /** Serialise the database to a `.sqlite` file image. */
  export(): Uint8Array;
  /** Close the database and release all resources. */
  close(): void;
  /** Direct access to the underlying sqlite-wasm DB (for advanced ops
   *  such as `sqlite3_wal_checkpoint`). */
  readonly raw: WasmDatabase;
}

/** Normalise a single bound value: booleans -> 0/1, undefined -> null,
 *  bigint -> number (or string when out of safe range). */
function normalizeBindValue(v: unknown): WasmSqlValue {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "bigint") {
    if (
      v >= BigInt(Number.MIN_SAFE_INTEGER) &&
      v <= BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      return Number(v);
    }
    return v.toString();
  }
  // Anything else passes through; sqlite-wasm will throw on truly
  // unsupported types.
  return v as WasmSqlValue;
}

/** Normalise a returned value coming out of sqlite-wasm: bigint ->
 *  number / string. Everything else passes through. */
function normalizeOutValue(v: unknown): SqlValue {
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
  return v as SqlValue;
}

function normalizeBindParams(params: BindParams): BindParams {
  if (Array.isArray(params)) {
    return params.map(normalizeBindValue);
  }
  const obj: Record<string, WasmSqlValue> = {};
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    obj[k] = normalizeBindValue(v);
  }
  return obj;
}

class StmtWrapper implements SqlJsLikeStmt {
  private readonly inner: WasmStmt;
  private readonly sqlText: string;
  private finalized = false;

  constructor(inner: WasmStmt, sqlText: string) {
    this.inner = inner;
    this.sqlText = sqlText;
  }

  bind(params?: BindParams): SqlJsLikeStmt {
    // sqlite-wasm's reset() does not clear bindings unless `true` is
    // passed; sql.js's bind() resets bindings first.  Pass `true` so
    // re-binding behaves identically across both engines.
    try {
      this.inner.reset(true);
    } catch {
      /* freshly-prepared stmt: reset may throw; ignore */
    }
    if (params === undefined) return this;
    if (Array.isArray(params) && params.length === 0) return this;
    this.inner.bind(
      normalizeBindParams(params) as unknown as Parameters<WasmStmt["bind"]>[0],
    );
    return this;
  }

  step(): boolean {
    return this.inner.step();
  }

  get(): SqlValue[] {
    const row = this.inner.get([]) as unknown[];
    return row.map(normalizeOutValue);
  }

  getColumnNames(): string[] {
    return this.inner.getColumnNames();
  }

  run(params?: BindParams): void {
    if (params !== undefined) {
      this.bind(params);
    }
    this.inner.step();
    this.inner.reset();
  }

  reset(): SqlJsLikeStmt {
    this.inner.reset();
    return this;
  }

  free(): void {
    if (this.finalized) return;
    this.finalized = true;
    try {
      this.inner.finalize();
    } catch {
      /* destructors do not throw */
    }
  }

  getSQL(): string {
    return this.sqlText;
  }
}

/** Split a multi-statement SQL string by walking forward through
 *  string-literal, identifier, and comment scopes to find unescaped
 *  semicolons that terminate a statement at the top level.
 *
 *  This is good enough for the SQL the playground accepts (BEGIN /
 *  COMMIT / CREATE / SELECT / PRAGMA / triggers with BEGIN…END
 *  bodies). Trigger bodies use `BEGIN ... END;` — we *do* descend into
 *  them by tracking BEGIN/END nesting so the internal `;` characters
 *  don't split the trigger prematurely.
 *
 *  Returned statements have any leading whitespace trimmed but
 *  trailing semicolon retained so the engine can prepare them as-is.
 */
function splitSqlStatements(sql: string): string[] {
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
    // String literal
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
    // Quoted identifier
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
    if (c === "[") {
      i++;
      while (i < n && sql[i] !== "]") i++;
      if (i < n) i++;
      continue;
    }
    // BEGIN / END keyword tracking for trigger bodies.
    // Match whole words only (preceding/following char must be non-word).
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

class DbWrapper implements SqlJsLikeDB {
  readonly raw: WasmDatabase;
  private readonly sqlite3: Sqlite3Static;
  private closed = false;

  constructor(sqlite3: Sqlite3Static, raw: WasmDatabase) {
    this.sqlite3 = sqlite3;
    this.raw = raw;
  }

  run(sql: string, params?: BindParams): void {
    if (params !== undefined) {
      // Need a prepared statement to bind params; ignore returned rows.
      const stmt = this.prepare(sql);
      try {
        stmt.bind(params);
        stmt.step();
      } finally {
        stmt.free();
      }
      return;
    }
    this.raw.exec(sql);
  }

  exec(sql: string): QueryExecResult[] {
    const out: QueryExecResult[] = [];
    for (const stmt of this.iterateStatements(sql)) {
      try {
        const columns = stmt.getColumnNames();
        if (columns.length === 0) {
          while (stmt.step()) {
            /* drain */
          }
          // sql.js's db.exec() omits non-result-producing statements
          // from the returned array entirely. Mirror that behaviour.
          continue;
        }
        const values: SqlValue[][] = [];
        while (stmt.step()) {
          values.push(stmt.get());
        }
        out.push({ columns, values });
      } finally {
        stmt.free();
      }
    }
    return out;
  }

  prepare(sql: string): SqlJsLikeStmt {
    const stmt = this.raw.prepare(sql);
    return new StmtWrapper(stmt, sql);
  }

  *iterateStatements(sql: string): IterableIterator<SqlJsLikeStmt> {
    // Walk the multi-statement script by preparing each segment
    // individually.  We can't use sqlite3.capi.sqlite3_prepare_v2 with
    // tail-pointer tracking from JS cleanly, so we pre-split the SQL
    // and prepare each segment via the OO API.
    const segments = splitSqlStatements(sql);
    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;
      let inner: WasmStmt;
      try {
        inner = this.raw.prepare(segment);
      } catch (err) {
        // Skip a final trailing semicolon-only segment (no actual SQL).
        // SQLite reports a "syntax error" for an empty statement.
        if (trimmed === ";") continue;
        throw err;
      }
      yield new StmtWrapper(inner, segment);
    }
  }

  export(): Uint8Array {
    if (this.closed || !this.raw.pointer) {
      throw new Error("Database is closed");
    }
    const capi = this.sqlite3.capi as unknown as {
      sqlite3_js_db_export?: (dbPtr: number) => Uint8Array;
    };
    if (typeof capi.sqlite3_js_db_export !== "function") {
      throw new Error(
        "sqlite-wasm build is missing sqlite3_js_db_export — cannot export database",
      );
    }
    return capi.sqlite3_js_db_export(this.raw.pointer);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.raw.close();
    } catch {
      /* ignore */
    }
  }
}

// ---------------------------------------------------------------------------
// sqlite-wasm module loader (memoised, fetched from CDN at runtime)
// ---------------------------------------------------------------------------
//
// We load `@sqlite.org/sqlite-wasm` from jsDelivr instead of bundling it.
// Two reasons:
//   1. The package's `index.mjs` constructs a worker URL with
//      `new Worker(new URL(proxyUri, import.meta.url))` where `proxyUri`
//      is dynamic. Turbopack rejects unresolvable dynamic worker URLs at
//      build time even though the code path is never reached unless the
//      regular OPFS VFS is initialised (we use SAH Pool, which does not
//      need that proxy).
//   2. The pattern mirrors how `@duckdb/duckdb-wasm` and `parquet-wasm`
//      are already loaded in this repo, keeping bundle size small.
//
// The version is pinned via the `@sqlite.org/sqlite-wasm` dependency in
// package.json (we still install the package to keep TypeScript types
// available); `SQLITE_WASM_VERSION` below must be kept in sync.

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
      // We deliberately suppress the noisy `print` callback (otherwise
      // the worker spams "OPFS verified working" on every page load).
      const sqlite3 = await init({
        print: () => {},
        printErr: (msg: string) => {
          // Surface actual errors so they're not silently swallowed
          // during development.
          if (typeof console !== "undefined") console.warn(msg);
        },
      });
      return sqlite3;
    })();
  }
  return sqlite3Promise;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Open a new database. When `vfs` is provided (e.g. `"opfs-sahpool"`),
 * the underlying `oo1.DB` is constructed with that VFS so the file is
 * persisted to OPFS. When `bytes` is provided, the database is
 * deserialised from the given .sqlite bytes after open.
 */
export function openDatabase(
  sqlite3: Sqlite3Static,
  options: {
    filename?: string;
    flags?: string;
    vfs?: string;
    bytes?: Uint8Array;
  } = {},
): SqlJsLikeDB {
  const {
    filename = ":memory:",
    flags = "c",
    vfs,
    bytes,
  } = options;

  const DB = sqlite3.oo1.DB;
  const inner = new DB({ filename, flags, vfs });

  if (bytes !== undefined) {
    deserializeIntoDb(sqlite3, inner, bytes);
  }

  return new DbWrapper(sqlite3, inner);
}

/**
 * Replace the contents of the main schema of an open in-memory database
 * with a sqlite-file-format byte image, using the SQLITE_DESERIALIZE_*
 * mechanism. The bytes are copied into WASM-managed memory (so the JS
 * `Uint8Array` can be garbage-collected after this returns).
 */
function deserializeIntoDb(
  sqlite3: Sqlite3Static,
  db: WasmDatabase,
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
  try {
    wasm.heap8u().set(bytes, ptr);
    const flags =
      capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_RESIZEABLE;
    const rc = capi.sqlite3_deserialize(
      db.pointer!,
      "main",
      ptr,
      len,
      len,
      flags,
    );
    if (rc !== 0) {
      // FREEONCLOSE only takes ownership on rc === 0; free manually.
      wasm.dealloc(ptr);
      throw new Error(`sqlite3_deserialize failed: rc=${rc}`);
    }
    // ptr is now owned by SQLite (FREEONCLOSE).
  } catch (err) {
    // If we threw before sqlite3_deserialize succeeded, the alloc is
    // already freed above; rethrow.
    throw err;
  }
}
