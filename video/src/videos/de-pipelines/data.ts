import results from "./results.json" with { type: "json" };

// Every table, count and error the video shows, read from results.json: what
// DuckDB-Wasm 1.32.0 (DuckDB v1.4.3, the engine of the page's one
// <SqlCodeBlock dialect="duckdb">) returned for check.mjs, which wrote it.
// The idempotency figure loads the page's own events table; the orders in the
// upsert, CDC and schema figures are the video's own. Pure (no Remotion, no
// DOM).

export const VIDEO = "de-pipelines";

/** Whether public/images/de-pipelines/ holds the watercolor from illustrations.json. */
export const ILLUSTRATIONS = true;

type Ok = { sql: string; ok: true; columns: string[]; rows: (string | number | null)[][] };
type Err = { sql: string; ok: false; error: string };
type Step = Ok | Err;
type Figure = { setup: string; version: string; steps: Record<string, Step> };

type FigKey = "idempotency" | "upsert" | "cdc" | "parquet" | "source";
const R = results as unknown as Record<FigKey, Figure> & { duckdb: string[] };

const ok = (fig: FigKey, id: string): Ok => {
  const s = R[fig].steps[id];
  if (!s?.ok) throw new Error(`${fig}.${id} did not run`);
  return s;
};
const err = (fig: FigKey, id: string): Err => {
  const s = R[fig].steps[id];
  if (!s || s.ok) throw new Error(`${fig}.${id} was meant to fail`);
  return s;
};
const one = (fig: FigKey, id: string) => Number(ok(fig, id).rows[0][0]);

/** A result as the table kit takes it: column names and rows of strings
 *  ("null" for a NULL, which the table sets soft and italic). */
export type Result = { cols: string[]; rows: string[][] };
const asResult = (s: Ok): Result => ({ cols: s.columns, rows: s.rows.map((r) => r.map((v) => (v === null ? "null" : String(v)))) });

export const DUCKDB = R.duckdb[0];

/** The statements the idempotency figure prints, as the page writes them. */
export const BLIND = ok("idempotency", "blind1").sql;
export const DELETE_DAY = ok("idempotency", "over1Delete").sql;

/** June 1's events after each run: a blind INSERT twice, then the page's
 *  delete-then-insert twice, then a transaction whose insert failed. */
export const IDEM = {
  /** The page's 24 events, per day. */
  perDay: asResult(ok("idempotency", "perDay")),
  blind: [one("idempotency", "blindCount1"), one("idempotency", "blindCount2")],
  over: [one("idempotency", "overCount1"), one("idempotency", "overCount2")],
  rolledBack: one("idempotency", "txCount"),
  txError: err("idempotency", "txInsertFails").error,
  /** The page's ON CONFLICT upsert, run twice, then a MERGE: orders in the table. */
  upsert: [one("upsert", "count1"), one("upsert", "count2"), one("upsert", "count3")],
};

/** The CDC figure: the table before, the changes, the table after, the poll. */
export const CDC = {
  before: asResult(ok("cdc", "before")),
  after: asResult(ok("cdc", "after")),
  poll: asResult(ok("cdc", "poll")),
  pollSql: ok("cdc", "poll").sql,
  update: ok("cdc", "update2").sql,
  insert: ok("cdc", "insert4").sql,
  delete: ok("cdc", "delete3").sql,
};

/** Three daily Parquet files and what reading them together gives. */
export const EVO = {
  /** Each file's columns, from DESCRIBE. */
  files: (["day1", "day2", "day3"] as const).map((d) => ok("parquet", d).rows.map((r) => String(r[0]))),
  plain: asResult(ok("parquet", "plain")),
  plainSql: ok("parquet", "plain").sql,
  plainReversed: err("parquet", "plainReversed").error,
  byName: asResult(ok("parquet", "byName")),
  byNameSql: ok("parquet", "byName").sql,
  renamed: asResult(ok("parquet", "renamed")),
  renamedSql: ok("parquet", "renamed").sql,
};

/** A source gains a column: SELECT * fails, named columns load. */
export const SRC = {
  starSql: err("source", "star").sql,
  starError: err("source", "star").error,
  raw: asResult(ok("source", "raw")),
  namedSql: ok("source", "named").sql,
  named: one("source", "named"),
  clean: asResult(ok("source", "clean")),
};

/** "Binder Error: table …" split into its kind and its message, as the
 *  error box prints them. */
export const splitError = (e: string) => {
  const i = e.indexOf(": ");
  return { kind: e.slice(0, i), message: e.slice(i + 2) };
};
