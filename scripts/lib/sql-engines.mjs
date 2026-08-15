/**
 * The site's SQL runtimes, in Node, behind the `SqlEngineLike` interface that
 * `app/_components/sqlChallengeHarness.ts` grades against. Each engine runs
 * the same database at the same major version the browser serves; the DuckDB
 * devDependency must stay pinned *exactly* to the `DUCKDB_VERSION` in
 * `runtime/duckdb.ts` (a caret range would drift onto a build no reader
 * gets). The UI (result grid, sidebar, paging) is not reproduced — it cannot
 * make correct SQL fail.
 *
 * A fresh database per block is deliberate: the browser gives every block its
 * own engine instance, and a shared connection would let a block pass because
 * an earlier one set up its tables.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { fetchDatasetBytes } from "./datasets.mjs";

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
 * `app/_components/runtime/postgres.ts`: strip the psql meta-commands and
 * `CREATE DATABASE` a single-database embedded PGlite cannot run, as the
 * browser does before seeding. Both constructs are single-line in practice,
 * hence the line filter.
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
 * Split on semicolons that are not inside a string, quoted identifier, or
 * comment — lesson data contains row literals with semicolons, so a naive
 * split breaks.
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

/** Every http(s) URL a block's SQL reads from, so DuckDB can be handed the
 *  bytes before the query runs. */
export function remoteUrlsIn(sql) {
  return [...new Set((sql ?? "").match(/https?:\/\/[^\s'")]+/g) ?? [])];
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

/**
 * DuckDB-Wasm, the same version `runtime/duckdb.ts` loads from jsDelivr.
 *
 * Node plumbing quirks: the worker must come from the `web-worker` package —
 * duckdb-wasm drives a Web Worker, and a raw `node:worker_threads` worker
 * makes `instantiate()` hang forever with no error. duckdb's own
 * `createWorker()` is unusable here (it fetches the URL, ruling out
 * `file://`, then `fileURLToPath`s it, ruling out `http://`). Bundle
 * selection still goes through duckdb's `selectBundle`.
 */
async function createDuckDbEngine() {
  const require = createRequire(import.meta.url);
  const duckdb = require("@duckdb/duckdb-wasm");
  const { default: Worker } = await import("web-worker");
  const dist = join(dirname(require.resolve("@duckdb/duckdb-wasm")), "..", "dist");

  const bundle = await duckdb.selectBundle({
    mvp: {
      mainModule: join(dist, "duckdb-mvp.wasm"),
      mainWorker: join(dist, "duckdb-node-mvp.worker.cjs"),
    },
    eh: {
      mainModule: join(dist, "duckdb-eh.wasm"),
      mainWorker: join(dist, "duckdb-node-eh.worker.cjs"),
    },
  });

  const worker = new Worker(pathToFileURL(bundle.mainWorker).href, { type: "module" });
  const db = new duckdb.AsyncDuckDB({ log: () => {} }, worker);
  await db.instantiate(bundle.mainModule);
  const conn = await db.connect();
  /** url -> the local name its bytes were registered under. */
  const staged = new Map();

  return {
    label: "DuckDB",
    /**
     * Stage the files a block reads over HTTP. In the browser duckdb uses
     * httpfs; here it cannot, and registering bytes under the URL as a
     * filename fails too (duckdb treats the `https://` prefix as a protocol
     * before consulting registered files). So bytes are registered under a
     * plain name and `exec` rewrites references — the same substitution
     * `datasets={[{ path, stageAs }]}` performs for Python and R blocks.
     */
    async registerUrls(urls) {
      for (const url of urls) {
        if (staged.has(url)) continue;
        try {
          const bytes = await fetchDatasetBytes(url);
          const name = url.split("/").pop() || `staged-${staged.size}`;
          // A fresh copy: registerFileBuffer transfers the buffer, and a view
          // over a Node Buffer is rejected as "unsupported type".
          await db.registerFileBuffer(name, Uint8Array.from(bytes));
          staged.set(url, name);
        } catch {
          // Left unstaged; the query then fails on its own and is reported as
          // a normal failure rather than silently skipped.
        }
      }
    },

    async exec(sql) {
      const results = [];
      let text = sql;
      for (const [url, name] of staged) text = text.split(url).join(name);
      // duckdb's `query` takes one statement, and lesson `initSql` is
      // routinely several.
      for (const stmt of splitStatements(text)) {
        const table = await conn.query(stmt);
        const columns = table.schema.fields.map((f) => f.name);
        const values = table.toArray().map((row) => {
          const obj = row.toJSON();
          // Positional through the schema's field order: the harness compares
          // by index, and Object.values would reorder a duplicated name.
          return columns.map((c) => {
            const v = obj[c];
            // Unwrap Arrow wrapper types; BigInt is already comparable in the
            // harness's valueEquals.
            return typeof v === "bigint" ? v : (v?.valueOf?.() ?? v);
          });
        });
        results.push({ columns, values });
      }
      return results;
    },
    async destroy() {
      await conn.close();
      await db.terminate();
      await worker.terminate();
    },
  };
}

/** Every dialect the content uses. */
export const SUPPORTED_DIALECTS = ["sqlite", "postgres", "duckdb"];

/**
 * A fresh engine for one block or card.
 *
 * @param {"sqlite"|"postgres"|"duckdb"} dialect
 * @returns {Promise<{exec:(sql:string)=>Promise<{columns:string[],values:unknown[][]}[]>,label:string,version:string,destroy:()=>Promise<void>}>}
 */
export async function createEngine(dialect) {
  if (dialect === "sqlite") return createSqliteEngine();
  if (dialect === "postgres") return createPostgresEngine();
  if (dialect === "duckdb") return createDuckDbEngine();
  throw new Error(`sql-engines: no Node engine for dialect "${dialect}"`);
}
