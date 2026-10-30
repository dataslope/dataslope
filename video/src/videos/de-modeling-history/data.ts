import results from "./results.json" with { type: "json" };

// Every table, statement and number the video shows, read from
// results.json: what DuckDB v1.4.3 (DuckDB-Wasm 1.32.0, the engine the
// page's blocks run) returned for the statements in check.mjs, which wrote
// it, plus the one figure run on the site's Postgres 18 (the UUID index
// sizes). Each figure ran in a fresh database built by its own setup, and the
// SQL printed on screen is the SQL in that file, so a listing cannot drift
// from what ran. Pure (no Remotion, no DOM).

export const VIDEO = "de-modeling-history";

/**
 * Whether public/images/de-modeling-history/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

/** The hero, 1240x978 on disk: drawn at most half that on the 1080p layout. */
export const HERO = { id: "de-modeling-history-chameleon", w: 1240, h: 978 } as const;

type Value = string | number | boolean | null;
type Step = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type Figure = { setup: string; steps: Record<string, Step>; version: string };
const FIGURES = results.figures as unknown as Record<string, Figure>;

/** A value as a SQL client prints it. */
const shown = (v: Value): string => (v === null ? "null" : String(v));

export type Table = { cols: string[]; rows: string[][] };
/** A statement as it is printed, one string per line, with what it returned. */
export type Query = Table & { lines: string[] };

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  if (!s.ok) throw new Error(`${figure}.${id} failed: ${s.error}`);
  return s;
};

const table = (figure: string, id: string): Table => {
  const s = step(figure, id);
  return { cols: s.columns ?? [], rows: (s.rows ?? []).map((r) => r.map(shown)) };
};

const query = (figure: string, id: string): Query => ({ lines: step(figure, id).sql.split("\n"), ...table(figure, id) });

/** One cell of a result, by row and column name. */
const cell = (t: Table, row: number, col: string) => {
  const j = t.cols.indexOf(col);
  if (j < 0) throw new Error(`no column ${col} in ${t.cols.join(", ")}`);
  return t.rows[row][j];
};

/** How many rows a statement wrote (DuckDB's Count). */
const written = (figure: string, id: string) => Number(table(figure, id).rows[0][0]);

/** A DECIMAL product prints at the sum of its factors' scales ("110.0000");
 *  on screen it is money, at two places. */
const money = (v: string) => Number(v).toFixed(2);

export const ENGINE = { duckdb: results.engines.duckdb, postgres: results.engines.postgres };

// ── The hook and 1: customer 42's move, three ways ─────────────────────────

export const HISTORY = {
  /** Customer 42's two orders on the page: 101 in Boston, 102 in Austin. */
  orders: table("history", "orders"),
  t1Before: table("history", "t1Before"),
  t1Update: query("history", "t1Update"),
  t1After: table("history", "t1After"),
  t1Orders: query("history", "t1Orders"),
  t1ByCity: table("history", "t1ByCity"),
  /** The page's own two versions of customer 42. */
  t2Rows: table("history", "t2Rows"),
  t2Orders: query("history", "t2Orders"),
  t2ByCity: table("history", "t2ByCity"),
  t3Update: query("history", "t3Update"),
  t3After: table("history", "t3After"),
  t3Again: query("history", "t3Again"),
  t3Twice: table("history", "t3Twice"),
};

/** The move, as the page's table dates it. */
export const MOVE = {
  bostonFrom: cell(HISTORY.t2Rows, 0, "valid_from"),
  bostonTo: cell(HISTORY.t2Rows, 0, "valid_to"),
  austinFrom: cell(HISTORY.t2Rows, 1, "valid_from"),
  bostonKey: cell(HISTORY.t2Rows, 0, "customer_key"),
  austinKey: cell(HISTORY.t2Rows, 1, "customer_key"),
};

// ── 2. Type 2 in practice ───────────────────────────────────────────────────

export const TYPE2 = {
  before: table("type2", "before"),
  close: query("type2", "close"),
  insert: query("type2", "insert"),
  after: table("type2", "after"),
  /** The rebuilt table has the page's 24 rows. */
  rows: Number(table("type2", "samePage").rows[0][0]),
  pit: query("type2", "pit"),
  /** Orders the point-in-time join matched, against the orders there are. */
  matched: Number(table("type2", "pitAll").rows[0][0]),
  orders: Number(table("type2", "orders").rows[0][0]),
  current: query("type2", "current"),
  currentRows: Number(cell(table("type2", "currentAll"), 0, "current_rows")),
  customers: Number(cell(table("type2", "currentAll"), 0, "customers")),
  load: query("type2", "load"),
};
if (TYPE2.matched !== TYPE2.orders) throw new Error("the point-in-time join no longer matches every order once");

// ── 3. Type 0 ───────────────────────────────────────────────────────────────

export const TYPE0 = {
  first: query("type0", "first"),
  firstCount: written("type0", "first"),
  later: query("type0", "later"),
  laterCount: written("type0", "later"),
  rows: table("type0", "rows"),
};

// ── 4. Types 4 and 6 ────────────────────────────────────────────────────────

export const TYPES46 = {
  t4Main: table("types46", "t4MainRows"),
  t4History: table("types46", "t4HistoryRows"),
  mainRows: Number(cell(table("types46", "t4Counts"), 0, "main_rows")),
  historyRows: Number(cell(table("types46", "t4Counts"), 0, "history_rows")),
  t6Rows: table("types46", "t6Rows"),
  t6Orders: query("types46", "t6Orders"),
};

// ── 5. A late-arriving member ───────────────────────────────────────────────

export const LATE = {
  staged: table("late", "staged"),
  dimBefore: table("late", "dimBefore"),
  load: query("late", "load"),
  loaded: cell(table("late", "loadSum"), 0, "loaded"),
  stagedSum: cell(table("late", "loadSum"), 0, "staged"),
  placeholder: query("late", "placeholder"),
  /** The dimension with the placeholder in it, before 77 arrives. */
  dimMid: table("late", "dimMid"),
  facts: table("late", "facts"),
  report: table("late", "report"),
  arrive: query("late", "arrive"),
  reportAfter: table("late", "reportAfter"),
  dimAfter: table("late", "dimAfter"),
};

// ── 6. Snapshot or insert-only ──────────────────────────────────────────────

export const SNAP = {
  log: table("snap", "log"),
  snapshot: query("snap", "snapshot"),
  snapshotRows: table("snap", "snapshotRows"),
  paidThenCancelled: query("snap", "paidThenCancelled"),
  logRows: Number(cell(table("snap", "counts"), 0, "log_rows")),
  snapshotCount: Number(cell(table("snap", "counts"), 0, "snapshot_rows")),
};

// ── 7, 8. Bridge tables ─────────────────────────────────────────────────────

const weighted = table("bridge", "weighted");
export const BRIDGE = {
  orders: table("bridge", "orders"),
  rows: table("bridge", "rows"),
  total: cell(table("bridge", "total"), 0, "revenue"),
  fanout: query("bridge", "fanout"),
  fanoutTotal: cell(table("bridge", "fanoutTotal"), 0, "revenue"),
  weighted: { ...query("bridge", "weighted"), rows: weighted.rows.map((r) => [r[0], money(r[1])]) },
  weightedTotal: money(cell(table("bridge", "weightedTotal"), 0, "revenue")),
  usedBy: table("bridge", "usedBy"),
};

// ── The quick round ─────────────────────────────────────────────────────────

const uuidIndex = table("uuid", "index");
const uuidBytes = table("uuid", "bytes");
export const RAPID = {
  lines: table("rapid", "lines"),
  degenerate: query("rapid", "degenerate"),
  junk: Number(table("rapid", "junk").rows[0][0]),
  shipments: table("rapid", "shipments"),
  dates: table("rapid", "dates"),
  role: query("rapid", "role"),
  mini: Number(table("rapid", "mini").rows[0][0]),
  factless: table("rapid", "factless"),
  factlessCount: query("rapid", "factlessCount"),
  uuid: {
    /** Bytes per key, as Postgres stores them. */
    bigint: Number(cell(uuidBytes, 0, "bigint_bytes")),
    uuid: Number(cell(uuidBytes, 0, "uuid_bytes")),
    /** Primary-key index sizes over 100,000 rows, in bytes. */
    sequence: Number(cell(uuidIndex, 0, "sequence")),
    random: Number(cell(uuidIndex, 0, "random_uuid")),
    v7: Number(cell(uuidIndex, 0, "uuid_v7")),
    sample: table("uuid", "sample").rows[0][0],
    seqSample: table("uuid", "seqSample").rows[0][0],
  },
};
const ratio = RAPID.uuid.random / RAPID.uuid.sequence;
// The narration says "almost twice", and "in between" for version 7.
if (ratio < 1.75 || ratio >= 2) throw new Error(`random UUID index is ${ratio.toFixed(2)}x the sequence's; the narration says almost twice`);
if (!(RAPID.uuid.v7 > RAPID.uuid.sequence && RAPID.uuid.v7 < RAPID.uuid.random)) throw new Error("uuid v7 no longer lands in between");

/** Bytes as megabytes, to one decimal. */
export const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
