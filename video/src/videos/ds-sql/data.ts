import results from "./results.json" with { type: "json" };

// Every table, statement and message the video shows, read from
// results.json: what DuckDB v1.4.3 (DuckDB-Wasm 1.32.0, the engine the
// page's blocks run) returned for the statements in check.mjs, which wrote
// it, plus the one figure run on the site's Postgres engine. Each figure ran
// in a fresh database built by its own setup, and the SQL printed on screen
// is the SQL in that file, so a listing cannot drift from what ran. Pure (no
// Remotion, no DOM).

export const VIDEO = "ds-sql";

/**
 * Whether public/images/ds-sql/ holds the watercolor from illustrations.json.
 * Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

type Value = string | number | boolean | null;
type Step = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type Figure = { setup: string; steps: Record<string, Step>; version: string };
const FIGURES = results.figures as unknown as Record<string, Figure>;

/** A value as a SQL client prints it. */
const shown = (v: Value): string => (v === null ? "null" : String(v));

export type Table = { cols: string[]; rows: string[][] };

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  return s;
};

/** A result, as rows of printed cells in its column order. */
const table = (figure: string, id: string): Table => {
  const s = step(figure, id);
  if (!s.ok || !s.columns || !s.rows) throw new Error(`${figure}.${id} is not a result: ${s.sql}`);
  return { cols: s.columns, rows: s.rows.map((r) => r.map(shown)) };
};

/** A statement as it is printed: its SQL, one string per line. */
export type Query = { lines: string[] };
const query = (figure: string, id: string): Query & Table => ({ lines: step(figure, id).sql.split("\n"), ...table(figure, id) });

/** A statement the engine refused: its SQL and its error, split into the
 *  kind ("Binder Error", "ERROR") and the message. */
const refused = (figure: string, id: string) => {
  const s = step(figure, id);
  if (s.ok || !s.error) throw new Error(`${figure}.${id} did not fail: ${s.sql}`);
  const [kind, ...rest] = s.error.split(": ");
  return { lines: s.sql.split("\n"), kind, message: rest.join(": ") };
};

/** One cell of a one-row result. */
const scalar = (figure: string, id: string, col: string) => {
  const t = table(figure, id);
  return t.rows[0][t.cols.indexOf(col)];
};

// ── 1, 2. Retention joins, and churn ────────────────────────────────────────

export const RETAIN = {
  /** The video's own months: January's six active users, February's four. */
  jan: table("retain", "jan"),
  feb: table("retain", "feb"),
  inner: query("retain", "inner"),
  left: query("retain", "left"),
  innerRate: query("retain", "innerRate"),
  leftRate: query("retain", "leftRate"),
  /** The page's churn query, as the page writes it. */
  churn: query("retain", "churn"),
  notExists: query("retain", "notExists"),
};

// ── 3. A safe rate ──────────────────────────────────────────────────────────

export const RATE = {
  /** The page's query on the first six of its 24 variants. */
  safe: query("rate", "firstSix"),
  noSessions: scalar("rate", "zeros", "no_sessions"),
  variants: table("rate", "page").rows.length,
  /** The same bare division in Postgres: the zero divisor fails it. */
  pgBare: refused("ratePg", "bare"),
  /** Postgres, on the two variants with sessions: integer division. */
  pgTruncated: query("ratePg", "truncated"),
  /** Postgres, with * 1.0 and NULLIF. */
  pgFixed: query("ratePg", "fixed"),
  pgVersion: (results.figures as unknown as Record<string, Figure>).ratePg.version,
};

// ── 4. Cohort retention ─────────────────────────────────────────────────────

/** "2024-01-01" as "Jan". */
const monthName = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" });

const rates = table("cohort", "rates");
const cohortOf = rates.cols.indexOf("cohort");
const offsetOf = rates.cols.indexOf("month_offset");
const pctOf = rates.cols.indexOf("pct");
const cohorts = [...new Set(rates.rows.map((r) => r[cohortOf]))];

export const COHORT = {
  events: scalar("cohort", "rows", "events"),
  users: scalar("cohort", "rows", "users"),
  sample: table("cohort", "sample"),
  /** The page's query on the video's own activity log. */
  page: query("cohort", "page"),
  /** Each cohort's shares of its month zero, as a grid: one row per cohort,
   *  a percentage per month offset (null past the data). */
  grid: cohorts.map((c) => ({
    name: monthName(c),
    cells: [0, 1, 2, 3].map((o) => {
      const row = rates.rows.find((r) => r[cohortOf] === c && Number(r[offsetOf]) === o);
      return row ? Number(row[pctOf]) : null;
    }),
  })),
};

// ── 5. Sessionization ───────────────────────────────────────────────────────

export const SESSION = {
  /** The page's query. */
  page: query("sessions", "page"),
  /** User 1's hits with the gap, the flag and the session number. */
  steps: table("sessions", "userOneSteps"),
  perUser: table("sessions", "perUser"),
};

// ── 6. Median and percentiles ───────────────────────────────────────────────

export const PCT = {
  /** The video's own twelve latencies, in milliseconds. */
  values: table("pct", "values").rows.map((r) => Number(r[0])),
  mean: Number(scalar("pct", "mean", "mean")),
  fasterThanMean: Number(scalar("pct", "slower", "faster_than_mean")),
  median: query("pct", "median"),
  p90: query("pct", "p90"),
};

// ── At speed ────────────────────────────────────────────────────────────────

export const RAPID = {
  having: query("having", "page"),
  inWhere: refused("having", "inWhere"),
  sales: Number(scalar("window", "rows", "n")),
  grouped: query("window", "grouped"),
  windowed: query("window", "windowed"),
  ranks: query("rank", "ranks"),
  dod: query("txns", "dod"),
  topN: query("window", "topN"),
  running: query("txns", "running"),
  latest: query("latest", "latest"),
  customers: Number(scalar("latest", "rows", "customers")),
  pivot: query("pivot", "pivot"),
  counts: query("count", "counts"),
};

export const RUNTIME = `DuckDB ${FIGURES.retain.version}`;
