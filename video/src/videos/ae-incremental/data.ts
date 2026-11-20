import results from "./results.json" with { type: "json" };

// Every table, count, listing and error the ae-incremental video shows, read
// from results.json: what the site's Postgres (PGlite, PostgreSQL 18) returned
// for the statements in check.mjs, which wrote it, plus the full-rebuild model
// the dbt page draws (charts/incremental-vs-full-refresh.mjs), checked there
// against Data Engineer Part 10's results. dbt does not run here: its model is
// shown as dbt.mdx writes it, and the SQL that runs is the warehousing page's.
// Pure (no Remotion, no DOM).

export const VIDEO = "ae-incremental";

/**
 * Whether public/images/ae-incremental/ holds the watercolors from
 * illustrations.json. Phase 2 generates them; until then every frame is laid
 * out with room for them either way.
 */
export const ILLUSTRATIONS = true;

type Value = string | number | null;
type Ok = { sql: string; ok: true; columns: string[]; rows: Value[][] };
type Err = { sql: string; ok: false; error: string };
type Step = Ok | Err;
type Figure = { setup: string; version: string; steps: Record<string, Step> };

type FigKey =
  | "filter"
  | "late"
  | "strictAppend"
  | "atLeastMerge"
  | "overlapAppend"
  | "overlapMerge"
  | "overlapDeleteInsert"
  | "dupKey"
  | "rebuild"
  | "merge"
  | "refresh";

const R = results as unknown as {
  figures: Record<FigKey, Figure>;
  cost: {
    days: number;
    daily: number;
    seedRows: number;
    every: number;
    refreshDays: number[];
    fullAtEnd: number;
    ratio: number;
    lastRefresh: { day: number; rows: number };
    rebuildTotal: number;
    incrementalTotal: number;
    totalRatio: number;
    refreshTotal: number;
    refreshShare: number;
  };
  page: { dbtModel: string; watermark: string; merge: string };
  statements: Record<"STRICT" | "AT_LEAST" | "AT_LEAST_NEW" | "OVERLAP" | "APPEND" | "MERGE_KEY" | "DELETE_KEYS" | "FULL_REBUILD", string>;
  postgres: string[];
};

const ok = (fig: FigKey, id: string): Ok => {
  const s = R.figures[fig].steps[id];
  if (!s?.ok) throw new Error(`${fig}.${id} did not run`);
  return s;
};
const err = (fig: FigKey, id: string): Err => {
  const s = R.figures[fig].steps[id];
  if (!s || s.ok) throw new Error(`${fig}.${id} was meant to fail`);
  return s;
};
const one = (fig: FigKey, id: string, col?: string) => {
  const s = ok(fig, id);
  return Number(s.rows[0][col ? s.columns.indexOf(col) : 0]);
};
/** The first column of every row, as event ids. */
const ids = (fig: FigKey, id: string) => ok(fig, id).rows.map((r) => Number(r[0]));

/** A result as the table kit takes it: column names and rows of strings
 *  ("null" for a NULL). */
export type Result = { cols: string[]; rows: string[][] };
const asResult = (s: Ok): Result => ({ cols: s.columns, rows: s.rows.map((r) => r.map((v) => (v === null ? "null" : String(v)))) });

/** A listing, one string per line. */
export const lines = (sql: string) => sql.split("\n");

/** "6,040,000". */
export const thousands = (n: number) => n.toLocaleString("en-US");

/** The Postgres every figure ran on, for a small source note. */
export const POSTGRES = R.postgres[0];

// ── The full-rebuild model (hook, question 1, question 7) ───────────────────

/** charts/incremental-vs-full-refresh.mjs: 200,000 rows on day 0, 8,000 a
 *  day, a full refresh every 60 days; summed totals over the 730 runs. */
export const COST = R.cost;
/** Rows one run processes on day `d`, rebuilding everything. */
export const fullRows = (d: number) => COST.seedRows + COST.daily * d;
/** Rows one incremental run processes on day `d` (a refresh day rebuilds). */
export const incrementalRows = (d: number) => (d > 0 && d % COST.every === 0 ? fullRows(d) : COST.daily);

// ── The listings ────────────────────────────────────────────────────────────

/** dbt.mdx's incremental model, as the page writes it (config and guard). */
export const DBT_MODEL = lines(R.page.dbtModel);
/** The warehousing page's block: the SQL that model compiles to. */
export const WATERMARK_SQL = lines(R.page.watermark);
/** The page's MERGE, as written. */
export const PAGE_MERGE = lines(R.page.merge);
/** The filters and strategies, as check.mjs ran them. */
export const SQL = Object.fromEntries(Object.entries(R.statements).map(([k, v]) => [k, lines(v)])) as Record<keyof typeof R.statements, string[]>;

// ── 2. The filter ───────────────────────────────────────────────────────────

const counts = (fig: FigKey, id: string) => {
  const r = ok(fig, id).rows[0].map(Number);
  return { source: r[0], target: r[1], distinct: r[2] };
};

/** The page's block: 24 source events, 14 loaded through 2024-01-14; the
 *  filter returns 15 to 24 (10 rows); the watermark moves to 2024-01-24. */
export const FILTER = {
  before: counts("filter", "before"),
  watermarkBefore: String(ok("filter", "beforeWatermark").rows[0][0]),
  found: asResult(ok("filter", "watermark")),
  loaded: one("filter", "run"),
  after: counts("filter", "after"),
  watermarkAfter: String(ok("filter", "afterWatermark").rows[0][0]),
};

/** The video's own three arrivals after that run, and what each filter finds. */
export const LATE = {
  arrived: asResult(ok("late", "arrived")),
  /** `>`: 27 only. */
  strict: ids("late", "strict"),
  /** `>=`: 24, 25, 27; with the loaded ones skipped, 25 and 27. */
  atLeast: ids("late", "atLeast"),
  atLeastNew: ids("late", "atLeastNew"),
  /** A three-day overlap: 21 to 27 read, 25, 26 and 27 new. */
  overlap: ids("late", "overlap"),
  overlapNew: ids("late", "overlapNew"),
};

/** Each filter written each way, run, then retried: source rows, target rows
 *  and distinct ids after each, what the target lacks and what it holds twice. */
const strategy = (fig: FigKey) => ({
  read: one(fig, "batchRows"),
  first: counts(fig, "counts1"),
  retry: counts(fig, "counts2"),
  missing: ids(fig, "missing"),
  extra: ids(fig, "extra"),
  doubled: ok(fig, "dupes").rows.map((r) => ({ id: Number(r[0]), copies: Number(r[1]) })),
});
export const STRATEGY = {
  /** `>` appended: 25 of 27, missing 25 and 26. */
  strictAppend: strategy("strictAppend"),
  /** `>=` merged: 26 of 27, missing 26. */
  atLeastMerge: strategy("atLeastMerge"),
  /** The overlap appended (no key): 31 rows, then 38 on a retry. */
  overlapAppend: strategy("overlapAppend"),
  /** The overlap merged on event_id: 27, and 27. */
  overlapMerge: strategy("overlapMerge"),
  /** The overlap deleted then inserted on event_id: 27, and 27. */
  overlapDeleteInsert: strategy("overlapDeleteInsert"),
};

// ── 4. A duplicate key in the source ────────────────────────────────────────

export const DUP_KEY = {
  /** Event 27 twice in raw_events. */
  copies: one("dupKey", "sourceCopies", "copies"),
  /** The first merge inserts both: 28 rows, 27 distinct, no error. */
  first: counts("dupKey", "counts1"),
  doubled: ok("dupKey", "dupes1").rows.map((r) => ({ id: Number(r[0]), copies: Number(r[1]) })),
  /** Postgres's own error for the next merge. */
  error: err("dupKey", "merge2").error,
  /** The same error when 27 was in the target once. */
  errorOnce: err("dupKey", "merge3").error,
  /** The uniqueness test's query, and the duplicate it returns. */
  test: { sql: lines(ok("dupKey", "uniqueTest").sql), found: asResult(ok("dupKey", "uniqueTest")) },
};

// ── 5. The idempotent rebuild ───────────────────────────────────────────────

const steps = R.figures.rebuild.steps;
const fingerprint = (id: string) => String(ok("rebuild", id).rows[0][ok("rebuild", id).columns.indexOf("fingerprint")]);
export const REBUILD = {
  events: one("rebuild", "events", "events"),
  customers: one("rebuild", "events", "customers"),
  /** The page's block, statement by statement, as it prints. */
  block: ["begin1", "drop1", "create1", "commit1", "show1"].map((id) => `${steps[id].sql};`),
  first: asResult(ok("rebuild", "show1")),
  second: asResult(ok("rebuild", "show2")),
  /** One md5 over each result: equal, so the rerun is identical. */
  identical: fingerprint("print1") === fingerprint("print2"),
  /** A blind insert of the same SELECT: 12 rows, then 24. */
  blind: [one("rebuild", "blindCount1", "rows"), one("rebuild", "blindCount2", "rows")],
  /** The rebuild failing after its DROP, then ROLLBACK: the old table back. */
  failError: err("rebuild", "failCreate").error,
  rolledBack: fingerprint("afterFail") === fingerprint("print1"),
  rowsAfterFail: one("rebuild", "afterFail", "customers"),
};

// ── 6. MERGE ────────────────────────────────────────────────────────────────

export const MERGE = {
  before: asResult(ok("merge", "before")),
  staged: asResult(ok("merge", "staged")),
  /** Rows each run touched: 2 both times (an update and an insert, then two
   *  updates). */
  touched: [one("merge", "merge1"), one("merge", "merge2")],
  after: asResult(ok("merge", "after1")),
  afterRetry: asResult(ok("merge", "after2")),
  /** The same batch inserted blindly, twice: 7 rows. */
  blind: asResult(ok("merge", "blindAfter")),
};

// ── 7. Full refresh ─────────────────────────────────────────────────────────

export const REFRESH = {
  /** The strict run's table from question 2: 25 of 27. */
  afterStrict: counts("refresh", "afterStrict"),
  /** Event 3 deleted upstream; the next normal run finds nothing. */
  normalFinds: ok("refresh", "normal").rows.length,
  drift: counts("refresh", "drift"),
  missing: ids("refresh", "missing"),
  extra: ids("refresh", "extra"),
  /** --full-refresh: every source row, 26, and nothing missing or extra. */
  refreshed: counts("refresh", "refreshed"),
  clean: ok("refresh", "missingAfter").rows.length === 0 && ok("refresh", "extraAfter").rows.length === 0,
};
