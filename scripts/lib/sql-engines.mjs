/**
 * The site's SQL runtimes, in Node, behind the `SqlEngineLike` interface that
 * `app/_components/sqlChallengeHarness.ts` grades against.
 *
 * `<SqlCodeBlock>` and `<SqlChallengeCard>` are the largest unchecked group of
 * runnable content in the repo: 381 blocks and 73 cards. Nothing has ever
 * executed them outside a browser, so a dialect quirk or a renamed column in a
 * remote dataset ships silently, exactly as it did for Python before
 * check-code-blocks existed.
 *
 * Two of the three dialects need no new dependency, which is why they come
 * first: PGlite and sqlite-wasm both publish Node builds and are already
 * runtime dependencies of the site. DuckDB is loaded from a CDN by
 * `runtime/duckdb.ts` rather than installed, so covering it means adding
 * `@duckdb/duckdb-wasm` pinned to `DUCKDB_VERSION`; until then its blocks are
 * counted as unchecked rather than quietly dropped.
 *
 * ── On fidelity ────────────────────────────────────────────────────────────
 *
 * Each engine below answers the same question the browser does — "does this
 * SQL run, and does the card's own reference solution satisfy its own tests?"
 * — against the same database engine at the same major version. What it does
 * not reproduce is the UI: no result grid, no schema sidebar, no paging. Those
 * cannot make correct SQL fail.
 *
 * A fresh database per block is deliberate. The browser gives every block its
 * own engine instance, so `CREATE TABLE orders` in one lesson must not be
 * visible to the next; a shared connection would let a block pass because an
 * earlier one happened to set it up, which is the SQL version of the
 * `sys.modules` leak that made the Python sweep fail innocent cards.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Pinned in `app/_components/runtime/remoteDatasets.ts`; kept in step so a
 *  sweep reads the same bytes the reader's browser does. */
const DATASETS_REF = "f7f08485960fe4a774359a43d1eb50a84514daf2";
const DATASET_BASE = `https://raw.githubusercontent.com/dataslope/datasets/${DATASETS_REF}/`;
const CACHE = join(".dataset-cache", "sql");

/** `remoteInitSql` names a file in the datasets repo (e.g.
 *  `sqlite/chinook_sqlite.sql`), or is a full URL. Cached on disk so a re-run
 *  is offline, matching how the Python sweep treats its datasets. */
export async function fetchRemoteInitSql(pathOrUrl) {
  mkdirSync(CACHE, { recursive: true });
  const local = join(CACHE, pathOrUrl.replace(/[^\w.-]/g, "__"));
  if (existsSync(local)) return readFileSync(local, "utf8");
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : DATASET_BASE + pathOrUrl.replace(/^\/+/, "");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const text = await res.text();
  writeFileSync(local, text);
  return text;
}

/**
 * Mirrors `preparePostgresScriptForPglite` in
 * `app/_components/runtime/postgres.ts`.
 *
 * The Chinook release script is a psql dump: it opens with meta-commands
 * (`\c`, `\connect`) and `CREATE DATABASE`, neither of which a single-database
 * embedded PGlite can run. The browser strips them before seeding, so a sweep
 * that does not is testing a script no reader is ever given — it reported
 * `syntax error at or near "\"` against six perfectly good lessons.
 *
 * Both constructs are single-line in practice, which is why this is a line
 * filter there and here.
 */
export function preparePostgresScript(sql) {
  return sql
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("\\")) return false;
      if (/^(CREATE|DROP)\s+DATABASE\b/i.test(trimmed)) return false;
      return true;
    })
    .join("\n");
}

/**
 * Split on semicolons that are not inside a string, a quoted identifier, or a
 * comment.
 *
 * sqlite-wasm's `exec` takes one statement at a time, and `initSql` is
 * routinely several. Naive `sql.split(";")` breaks on the first row literal
 * containing a semicolon, which lesson data does contain.
 */
export function splitStatements(sql) {
  const out = [];
  let buf = "";
  for (let i = 0; i < sql.length; i += 1) {
    const c = sql[i];
    if (c === "'" || c === '"') {
      const quote = c;
      buf += c;
      i += 1;
      while (i < sql.length) {
        buf += sql[i];
        // '' and "" are the SQL escapes; a backslash is not special here.
        if (sql[i] === quote && sql[i + 1] === quote) {
          buf += sql[i + 1];
          i += 2;
          continue;
        }
        if (sql[i] === quote) break;
        i += 1;
      }
      continue;
    }
    if (c === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      const end = nl === -1 ? sql.length : nl;
      buf += sql.slice(i, end);
      i = end - 1;
      continue;
    }
    if (c === "/" && sql[i + 1] === "*") {
      const close = sql.indexOf("*/", i + 2);
      const end = close === -1 ? sql.length : close + 2;
      buf += sql.slice(i, end);
      i = end - 1;
      continue;
    }
    if (c === ";") {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** sqlite-wasm, in-process. */
async function createSqliteEngine() {
  const mod = await import("@sqlite.org/sqlite-wasm");
  const sqlite3 = await mod.default({ print: () => {}, printErr: () => {} });
  const db = new sqlite3.oo1.DB(":memory:");
  return {
    label: "SQLite",
    version: sqlite3.version.libVersion,
    async exec(sql) {
      const results = [];
      for (const stmt of splitStatements(sql)) {
        const columns = [];
        const values = db.exec({
          sql: stmt,
          rowMode: "array",
          returnValue: "resultRows",
          columnNames: columns,
        });
        results.push({ columns, values });
      }
      return results;
    },
    async destroy() {
      db.close();
    },
  };
}

/** PGlite: a real Postgres compiled to wasm, same as the site's playground. */
async function createPostgresEngine() {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create();
  return {
    label: "PostgreSQL",
    version: "17",
    async exec(sql) {
      // PGlite runs a multi-statement string itself and returns one result per
      // statement, which is what the browser adapter relies on too.
      const results = await db.exec(sql);
      return results.map((r) => ({
        columns: (r.fields ?? []).map((f) => f.name),
        // `rows` are objects; the harness compares positionally, so project
        // them through the field order rather than Object.values, which is
        // insertion-ordered and would silently reorder a duplicated name.
        values: (r.rows ?? []).map((row) => (r.fields ?? []).map((f) => row[f.name])),
      }));
    },
    async destroy() {
      await db.close();
    },
  };
}

/** Dialects this can execute today. `duckdb` is deliberately absent: see the
 *  module header. */
export const SUPPORTED_DIALECTS = ["sqlite", "postgres"];

/**
 * A fresh engine for one block or card.
 *
 * @param {"sqlite"|"postgres"} dialect
 * @returns {Promise<{exec:(sql:string)=>Promise<{columns:string[],values:unknown[][]}[]>,label:string,version:string,destroy:()=>Promise<void>}>}
 */
export async function createEngine(dialect) {
  if (dialect === "sqlite") return createSqliteEngine();
  if (dialect === "postgres") return createPostgresEngine();
  throw new Error(`sql-engines: no Node engine for dialect "${dialect}"`);
}
