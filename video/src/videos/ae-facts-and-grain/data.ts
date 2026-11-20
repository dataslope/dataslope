import results from "./results.json" with { type: "json" };

// Every table, listing and number the video shows, read from results.json:
// what Postgres (PGlite, PostgreSQL 18, the engine the page's blocks run in)
// returned when check.mjs ran each statement from a fresh database. The SQL
// printed on screen is the SQL in that file, split into lines, so a listing
// cannot drift from what ran. Questions 2, 6, 10 and 11 re-run Data Engineer
// Part 3's tables (de-dimensional-modeling), and check.mjs stops if the two
// runs disagree, so the two series show the same rows. Pure (no Remotion, no
// DOM).

export const VIDEO = "ae-facts-and-grain";

/**
 * Whether public/images/ae-facts-and-grain/ holds the watercolors from
 * illustrations.json. Phase 2 generates them and turns this on; every frame
 * is laid out with room for them either way.
 */
export const ILLUSTRATIONS = false;

/** The hero's prompt id in illustrations.json. */
export const HERO_ID = "ae-facts-and-grain-sparrow";

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
export const cell = (t: Table, row: number, col: string) => {
  const j = t.cols.indexOf(col);
  if (j < 0) throw new Error(`no column ${col} in ${t.cols.join(", ")}`);
  return t.rows[row][j];
};

/** The first row's value in `col` (or the first column). */
const value = (figure: string, id: string, col?: string) => {
  const t = table(figure, id);
  return col ? cell(t, 0, col) : t.rows[0][0];
};

/** "4,900.00" from "4900.00" or "4900.0000": money at two places, with
 *  thousands separators. A DECIMAL product prints at the sum of its
 *  factors' scales, so the weighted sums need this. */
export const money = (v: string) =>
  Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "2.26 MB" from a byte count (decimal megabytes). */
export const megabytes = (bytes: string | number) => `${(Number(bytes) / 1e6).toFixed(2)} MB`;

// ── 1. Facts and dimensions: the page's star ────────────────────────────────

export const STAR = {
  /** The fact's first four rows: order_id, order_date_sk, product_sk, amount. */
  facts: table("star", "facts"),
  /** 24 orders, 6 dates, 6 products. */
  counts: table("star", "counts"),
  /** The page's star read and its 24 rows. */
  read: query("star", "page"),
};

// ── 2. The grain (Data Engineer Part 3's order 1001) ────────────────────────

export const GRAIN = {
  lines: table("lines", "rows"),
  /** quantity, amount, shipping_fee summed: the fee says 15.00. */
  totals: table("lines", "totals"),
  /** At order grain: one row, 5.00. */
  orderGrain: table("lines", "orders"),
  /** Split across the lines by amount: 2.46, 0.69, 1.85. */
  split: table("lines", "split"),
};

// ── 3. Star and snowflake: the challenge's products ─────────────────────────

export const SNOW = {
  /** Twelve products, category as text (three Books rows). */
  products: table("challenge", "products"),
  booksRows: Number(value("challenge", "booksRows")),
  /** The snowflaked pair: dim_category (six rows) and dim_product_sf. */
  categories: table("challenge", "categories"),
  productsSf: table("challenge", "productsSf"),
  /** The challenge's solutionSql: one join. */
  star: query("challenge", "solution"),
  /** The snowflaked read: two joins, the same six rows. */
  snow: query("challenge", "snow"),
  /** Rows one read returns that the other does not: 0. */
  differ: Number(value("challenge", "differ")),
};

// ── 4. Surrogate keys: the page's customer 42 ───────────────────────────────

export const KEYS = {
  /** 1001 East, 1002 West. */
  versions: table("keys", "versions"),
  /** 5001 (2022) carries 1001, 5002 (2024) carries 1002. */
  orders: query("keys", "orders"),
  /** 24 rows, 15 customers. */
  repeats: table("keys", "repeats"),
};

// ── 5. Hash or integer ──────────────────────────────────────────────────────

export const HASH = {
  /** The page's md5 query on customer 42. */
  hash: query("keys", "hash"),
  md5: value("keys", "hash", "customer_sk"),
  seqBefore: query("hashSeq", "seqBefore"),
  hashBefore: query("hashSeq", "hashBefore"),
  /** Monday's order, loaded with Acme's key that day (3). */
  factMonday: table("hashSeq", "factMonday"),
  /** Tuesday's keys, after customer 12 arrives: Acme is 4. */
  seqAfter: table("hashSeq", "seqAfter"),
  /** Monday's order read through Tuesday's dimension: Umbrella. */
  misread: query("hashSeq", "misread"),
  hashAfter: table("hashSeq", "hashAfter"),
  /** bigint 8 bytes, md5 text 36 bytes (32 characters). */
  bytes: table("keySize", "bytes"),
  /** Primary-key index over 100,000 keys, in bytes. */
  index: {
    integer: Number(value("keySize", "index", "integer_index")),
    md5: Number(value("keySize", "index", "md5_index")),
    ratio: value("keySize", "index", "ratio"),
  },
};

// ── 6. Additivity (Data Engineer Part 3's account and visits) ───────────────

export const ADDITIVE = {
  balance: table("account", "balance"),
  /** March 31 across both accounts: 1,600.00. */
  acrossAccounts: value("account", "acrossAccounts"),
  /** The quarter's three month-ends summed: 4,800.00. */
  overTime: value("account", "overTime"),
  monthEnds: table("account", "monthEnds"),
  /** Each account's closing balance: 900.00 and 700.00. */
  closing: table("account", "closing"),
  closingTotal: value("account", "closingTotal"),
  visitsPerDay: table("visits", "perDay"),
  visitsBoth: value("visits", "both"),
};

// ── 7. Ratios ───────────────────────────────────────────────────────────────

export const RATIO = {
  rows: table("ratio", "rows"),
  summed: value("ratio", "summed"),
  averaged: value("ratio", "averaged"),
  fromParts: query("ratio", "fromParts"),
};

// ── 8. Role-playing: the page's three date keys ─────────────────────────────

export const ROLE = {
  facts: table("role", "facts"),
  read: query("role", "page"),
  /** Order to delivery: 6.7 days on average, 5 to 9. */
  days: table("role", "days"),
  view: query("role", "view"),
  viewRead: query("role", "viewRead"),
};

// ── 9. The page's bridge ────────────────────────────────────────────────────

export const BRIDGE = {
  /** 12 orders, 24 bridge rows, 6 promotions. */
  counts: table("bridge", "counts"),
  order201: table("bridge", "order201"),
  bridge201: table("bridge", "bridge201"),
  read: query("bridge", "page"),
  /** 4,900.00. */
  total: value("bridge", "total"),
  /** Unweighted through the bridge: 11,505.00. */
  fanout: query("bridge", "fanout"),
  /** Weighted: 4,900.00 again. */
  weighted: query("bridge", "weighted"),
  /** Per promotion, touched (unweighted) against allocated (weighted). */
  byPromotion: table("bridge", "byPromotion"),
};

// ── Rapid round ─────────────────────────────────────────────────────────────

export const RAPID = {
  /** 10: the loan application's milestones, 7 and 9 days. */
  loan: table("account", "funded"),
  loanStages: table("account", "stages"),
  /** 11: Ben, no February transaction, February balance 500.00. */
  benFebruary: table("account", "benFebruary"),
  /** 12: the page's factless query (11) against distinct products (3). */
  factlessPage: query("factless", "page"),
  factlessDistinct: query("factless", "distinct"),
  factlessByProduct: table("factless", "store5"),
  /** 13: the page's degenerate-dimension query on three lines. */
  degenerate: query("degenerate", "page"),
  /** 14: the junk dimension over the page's three flags: eight rows. */
  junk: table("junk", "rows"),
  /** 15: a 2024 date dimension, 366 rows, and its July 4 row. */
  dateCount: table("dateDim", "count"),
  dateRow: table("dateDim", "row"),
  /** 19: the challenge's mart, 24 orders into six categories. */
  mart: query("challenge", "solution"),
  /** 20: the bank: 1,400.00 held, 2,400.00 unweighted, Ada 900.00 and Ben
   *  500.00 weighted. */
  bank: value("bank", "bank"),
  bankUnweighted: table("bank", "unweighted"),
  bankUnweightedTotal: value("bank", "unweightedTotal"),
  bankWeighted: table("bank", "weighted"),
  bankWeightedTotal: value("bank", "weightedTotal"),
};
