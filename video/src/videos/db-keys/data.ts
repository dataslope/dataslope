import results from "./results.json" with { type: "json" };

// Every table, statement and message the video shows, read from
// results.json: what PGlite 0.5.8 (PostgreSQL 18.3) returned for the
// statements in check.mjs, which wrote it. Each figure ran in a fresh
// database built by its own setup, and the SQL printed on screen is the SQL
// in that file, so a listing cannot drift from what ran. Pure (no Remotion,
// no DOM).

export const VIDEO = "db-keys";

/**
 * Whether public/images/db-keys/ holds the three watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = false;

export type Value = string | number | boolean | null;

type PgError = {
  severity: string;
  code: string;
  message: string;
  detail: string | null;
  constraint: string | null;
};
type Step = {
  sql: string;
  ok: boolean;
  fields?: string[];
  rows?: Record<string, Value>[];
  affectedRows?: number;
  error?: PgError;
};
type Figure = { setup: string; steps: Step[] };
const FIGURES = results.figures as unknown as Record<string, Figure>;

/** A value as a SQL client prints it. */
export const shown = (v: Value): string => (v === null ? "null" : String(v));

export type Table = { cols: string[]; rows: string[][] };

const step = (figure: string, i: number): Step => {
  const s = FIGURES[figure]?.steps[i];
  if (!s) throw new Error(`results.json has no step ${i} in ${figure}`);
  return s;
};

/** A SELECT's result, as rows of printed cells in its field order. */
const table = (figure: string, i: number): Table => {
  const s = step(figure, i);
  if (!s.ok || !s.fields || !s.rows) throw new Error(`${figure} step ${i} is not a result: ${s.sql}`);
  return { cols: s.fields, rows: s.rows.map((r) => s.fields!.map((f) => shown(r[f]))) };
};

/** The row a one-row INSERT's VALUES spells out, as printed cells. */
const valuesOf = (sql: string): string[] => {
  const m = /VALUES\s*\(([^)]*)\)/i.exec(sql);
  if (!m) throw new Error(`No VALUES in ${sql}`);
  return m[1].split(",").map((v) => v.trim().replace(/^'(.*)'$/, "$1"));
};

/** The row a not-null DETAIL line spells out: "Failing row contains (…)." */
const failingRow = (detail: string): string[] => {
  const m = /Failing row contains \((.*)\)\./.exec(detail);
  if (!m) throw new Error(`No failing row in ${detail}`);
  return m[1].split(",").map((v) => v.trim());
};

/** A refused statement: its SQL, split into lines, and Postgres's error. */
const refused = (figure: string, i: number) => {
  const s = step(figure, i);
  if (s.ok || !s.error) throw new Error(`${figure} step ${i} did not fail: ${s.sql}`);
  return { lines: s.sql.split("\n"), ...s.error, detail: s.error.detail ?? "" };
};

/** A statement that went through, and the command tag Postgres answers
 *  with ("INSERT 0 1", "UPDATE 1", "DELETE 1"). */
const accepted = (figure: string, i: number) => {
  const s = step(figure, i);
  if (!s.ok) throw new Error(`${figure} step ${i} failed: ${s.sql}`);
  const verb = s.sql.trim().split(/\s+/)[0].toUpperCase();
  const n = s.affectedRows ?? 0;
  return { lines: s.sql.split("\n"), tag: verb === "INSERT" ? `INSERT 0 ${n}` : `${verb} ${n}`, changed: n };
};

// ── Part 1. Primary keys (primary-keys.mdx) ─────────────────────────────────

/** Two identical Taylors in a table with no key, and the order for one. */
export const NOKEY = {
  insert: accepted("nokey", 0),
  insertAgain: accepted("nokey", 1),
  customers: table("nokey", 2),
  orders: table("nokey", 4),
  /** The order joined on the name: how many customers it matches. */
  matches: table("nokey", 5).rows.length,
};

/** The lesson's two Taylors with ids, and the order that names one. */
export const TAYLORS = {
  customers: table("taylors", 0),
  orders: table("taylors", 1),
  matches: table("taylors", 2).rows.length,
  /** The id the order names. */
  owner: table("taylors", 1).rows[0][1],
};

/** "A duplicate primary key is rejected", and a row with no key. */
export const DUPLICATE = {
  before: table("duplicate", 2),
  same: refused("duplicate", 0),
  none: refused("duplicate", 1),
  after: table("duplicate", 2),
  /** The rows the two refused inserts tried: Grace as customer 1, and
   *  Grace with no id, as the not-null DETAIL line prints her. */
  tried: [valuesOf(step("duplicate", 0).sql), failingRow(step("duplicate", 1).error!.detail!)],
};

/** The roster keyed on (student_id, course_id). */
export const ROSTER = {
  rows: table("composite", 4),
  again: refused("composite", 3),
  /** The refused row's key, as the statement gives it. */
  againKey: valuesOf(step("composite", 3).sql).slice(0, 2),
};

// ── Part 2. Natural or surrogate (natural-vs-surrogate-keys.mdx) ────────────

export const COUNTRIES = table("countries", 0);

/** GENERATED ALWAYS AS IDENTITY: the ids Postgres made up. */
export const IDENTITY = {
  rows: table("identity", 1),
  slim: table("identity", 3),
  again: refused("identity", 2),
};

/** Email as the key: the change Postgres refuses. */
export const NATURAL = {
  users: table("natural", 0),
  orders: table("natural", 1),
  change: refused("natural", 2),
  after: table("natural", 3),
};

/** user_id 10 as the key: the same change goes through. */
export const SURROGATE = {
  users: table("surrogate", 0),
  orders: table("surrogate", 1),
  change: accepted("surrogate", 2),
  after: table("surrogate", 3),
  ordersAfter: table("surrogate", 4),
};

/**
 * The 1938 wallet card, from the Social Security Administration's history
 * page "Social Security Cards Issued by Woolworth"
 * (https://www.ssa.gov/history/ssn/misused.html): not a database fact, so
 * not from PGlite. The number itself is never shown.
 */
export const WALLET = {
  year: 1938,
  town: "Lockport, New York",
  peakYear: 1943,
  /** People using the one number in its peak year. */
  peak: 5755,
  /** People who reported it as theirs, in all. */
  total: 40000,
  source: "Social Security Administration",
};

// ── Part 3. Foreign keys (foreign-keys.mdx) ─────────────────────────────────

export const ORPHAN = {
  customers: table("orphan", 0),
  ok: accepted("orphan", 1),
  bad: refused("orphan", 2),
  orders: table("orphan", 3),
  /** The two rows the inserts tried, as their VALUES give them. */
  tried: [valuesOf(step("orphan", 1).sql), valuesOf(step("orphan", 2).sql)],
};

// ── Part 4. Referential integrity (referential-integrity.mdx) ───────────────

export const RESTRICT = {
  accounts: table("restrict", 0),
  invoices: table("restrict", 1),
  del: refused("restrict", 2),
  accountsAfter: table("restrict", 3),
  invoicesAfter: table("restrict", 4),
};

export const CASCADE = {
  posts: table("cascade", 0),
  comments: table("cascade", 1),
  del: accepted("cascade", 2),
  postsAfter: table("cascade", 3),
  commentsAfter: table("cascade", 4),
};

export const SETNULL = {
  employees: table("setnull", 0),
  tickets: table("setnull", 1),
  del: accepted("setnull", 2),
  ticketsAfter: table("setnull", 3),
  /** The same delete when the column is NOT NULL. */
  notNull: refused("setnullNotNull", 0),
};

/** Rows of `before` whose first cell no longer appears in `after`. */
export const goneRows = (before: Table, after: Table) => {
  const kept = new Set(after.rows.map((r) => r[0]));
  return before.rows.flatMap((r, i) => (kept.has(r[0]) ? [] : [i]));
};

export const VERSION = (results.version as string).split(" on ")[0];
