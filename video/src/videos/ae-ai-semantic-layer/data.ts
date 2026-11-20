import results from "./results.json" with { type: "json" };

// Every table, listing, count and amount the video shows, read from
// results.json: what the site's Postgres (PGlite, PostgreSQL 18) returned for
// the statements in check.mjs, which wrote it, and the page's own block and
// YAML, which check.mjs read out of the page. Scenes read these; they never
// retype a number. Pure (no Remotion, no DOM).

export const VIDEO = "ae-ai-semantic-layer";

/** The dolphin and the small spots in illustrations.json, generated into
 *  public/images/ae-ai-semantic-layer/ (the padlock, the golden cards and
 *  the magnifier are placed; the easel and the hourglass are not). */
export const ILLUSTRATIONS = true;

/** The Postgres the statements ran on ("PostgreSQL 18.6 (PGlite …)"). */
export const ENGINE: string = results.version;

/** A cell as Postgres printed it: a numeric at its scale ("1190.00"), an
 *  integer, a boolean. */
export type Cell = string | number | boolean | null;
export type Table = { columns: string[]; rows: Cell[][] };

const lines = (sql: string): string[] => sql.split("\n");

// ── 1. Three readings of "revenue" (the page's block, run as written) ───────

const R = results.readings;
export const READINGS = {
  /** The page's starter query, line by line, comment included. */
  query: lines(R.query),
  customers: R.customers as unknown as Table,
  orders: R.orders as unknown as Table,
  /** One row: every_order, completed_orders, governed_net_revenue. */
  result: R.result as unknown as Table,
  every: R.every,
  completed: R.completed,
  governed: R.governed,
  /** every / governed, to one place: 3.3 ("more than three times"). */
  ratio: R.ratio,
  orderCount: R.orderCount,
  customerCount: R.customerCount,
  testAccounts: R.testAccounts,
} as const;

// ── 2. The governed metric, as a layer would compile it ─────────────────────

/** The video's own SQL for net_revenue (labelled on screen as the SQL a
 *  layer writes, never as a product's output), and what it returned. */
export const COMPILED = { lines: lines(results.compiled.sql), netRevenue: results.compiled.netRevenue } as const;

// ── 3. The YAML, its tests, and its description as an input ─────────────────

const Y = results.ready;
export const READY = {
  /** The page's YAML, line by line. */
  yaml: lines(Y.yaml),
  /** The accepted_values list, and the statuses fct_orders really holds. */
  accepted: Y.accepted,
  statuses: Y.statuses,
  /** Failing rows per test (0 each), and the SQL each compiles to. */
  tests: Y.tests,
  /** The description's last sentence, and the three words cut from it. */
  description: Y.description,
  cut: Y.cut,
  /** Net revenue the description encodes as written (440), and without the
   *  cut (1190). */
  asWritten: Y.asWritten.netRevenue,
  withoutCut: Y.withoutCut.netRevenue,
} as const;

// ── 4. Three answers, scored three ways ─────────────────────────────────────

export type Candidate = {
  id: string;
  label: string;
  /** The query, line by line. */
  lines: string[];
  /** Its one value as printed ("440.00"), or null if it failed. */
  value: string | null;
  sameText: boolean;
  runs: boolean;
  sameResult: boolean;
};
export const EVAL = {
  question: results.eval.question,
  candidates: results.eval.candidates.map(
    (c): Candidate => ({
      id: c.id,
      label: c.label,
      lines: lines(c.sql),
      value: c.result ? String(c.result[0][0]) : null,
      sameText: c.sameText,
      runs: c.runs,
      sameResult: c.sameResult,
    }),
  ),
  /** A (the reference) and C (completed only) again, on the same orders with
   *  the test account's deleted: both 440.00, so C would pass there. */
  withoutTest: results.eval.withoutTest,
} as const;

// ── 5. The model an assistant wrote, and the reviewed one ───────────────────

const V = results.review;
export const REVIEW = {
  /** The dbt models, line by line, as the screen prints them. */
  asWritten: lines(V.asWritten),
  reviewed: lines(V.reviewed),
  lookbackDays: V.lookbackDays,
  /** Five orders built first (October 30 to November 3); the newest date
   *  loaded; the late order and its date; all seven orders. */
  firstBuilt: V.firstBuilt,
  newestLoaded: V.newestLoaded,
  lateId: V.lateId,
  lateDate: V.lateDate,
  daysLate: V.daysLate,
  allOrders: V.allOrders,
  /** The assistant's filter: selects order 6 only; 6 rows; misses 7. */
  strict: V.strict,
  /** The lookback, appended: selects 3 to 7, three of them re-read; 10
   *  rows, 7 orders; 3, 4 and 5 twice. */
  append: V.append,
  /** The lookback, merged on order_id (and deleted then inserted): 7 rows. */
  merge: { rows: V.merge.rows, orders: V.merge.orders },
  deleteInsert: V.deleteInsert,
  /** The seven orders and their dates, as the raw table was loaded (read out
   *  of the statements check.mjs ran): five first, then 6 and the late 7. */
  orders: [...V.raw.matchAll(/\((\d+), DATE '(\d{4}-\d{2}-\d{2})', [\d.]+\)/g)].map((m) => ({ id: Number(m[1]), date: m[2] })),
} as const;

// ── The close ───────────────────────────────────────────────────────────────

/** The track's practice: concept checks on every topic page (7), runnable
 *  challenges on 3, and the bank of 110. */
export const PRACTICE = results.practice;
