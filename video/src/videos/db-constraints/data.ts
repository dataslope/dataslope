// Every table, row, error and constraint name the video shows, read from
// results.json: what PGlite 0.5.8 (PostgreSQL 18.3) returned for the
// statements in check.mjs, which wrote it, one fresh database per figure.
// Nothing here is typed by hand except the column lists of the schema cards,
// which are the lessons' own DDL (the setup each figure ran, kept in
// results.json beside it). Pure (no Remotion, no DOM).

import results from "./results.json";

export const VIDEO = "db-constraints";

/**
 * Whether public/images/db-constraints/ holds the three watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

/** A value as the video prints it; null is SQL NULL. */
export type Cell = string | null;

type Raw = string | number | boolean | null;
type Step =
  | { sql: string; ok: true; command: string | null; affectedRows: number; fields: string[]; rows: Record<string, Raw>[] }
  | {
      sql: string;
      ok: false;
      error: {
        severity: string;
        code: string;
        message: string;
        detail: string | null;
        table: string | null;
        column: string | null;
        constraint: string | null;
      };
    };
type Figure = { setup: string; steps: Record<string, Step> };

const F = results.figures as unknown as Record<keyof typeof results.figures, Figure>;

const step = (fig: keyof typeof results.figures, k: string) => {
  const s = F[fig].steps[k];
  if (!s) throw new Error(`results.json has no ${fig}.${k}`);
  return s;
};

/** A statement Postgres accepted: its rows as cells, in field order. */
const okRows = (fig: keyof typeof results.figures, k: string): Cell[][] => {
  const s = step(fig, k);
  if (!s.ok) throw new Error(`${fig}.${k} failed in results.json: ${s.error.message}`);
  return s.rows.map((r) => s.fields.map((f) => (r[f] === null ? null : String(r[f]))));
};
const fields = (fig: keyof typeof results.figures, k: string) => {
  const s = step(fig, k);
  if (!s.ok) throw new Error(`${fig}.${k} failed in results.json`);
  return s.fields;
};

export type Refusal = {
  code: string;
  message: string;
  detail: string | null;
  constraint: string | null;
};
/** A statement Postgres refused, and what it said. */
const refused = (fig: keyof typeof results.figures, k: string): Refusal => {
  const s = step(fig, k);
  if (s.ok) throw new Error(`${fig}.${k} was accepted in results.json, but the video shows it refused`);
  return { code: s.error.code, message: s.error.message, detail: s.error.detail, constraint: s.error.constraint };
};
const accepted = (fig: keyof typeof results.figures, k: string) => {
  const s = step(fig, k);
  if (!s.ok) throw new Error(`${fig}.${k} was refused in results.json, but the video shows it stored`);
  return s;
};

/**
 * The cells of a failing row, from Postgres's own DETAIL line: "Failing row
 * contains (2, Broken price, -3.00)." Values are split on ", " (none of the
 * video's values holds one), and "null" is SQL NULL.
 */
const failingRow = (r: Refusal): Cell[] => {
  const m = r.detail?.match(/^Failing row contains \((.*)\)\.$/);
  if (!m) throw new Error(`No failing row in: ${r.detail}`);
  return m[1].split(", ").map((v) => (v === "null" ? null : v));
};

/** The one value a constraint-name pattern names: "products_price_check". */
export const constraintOf = (r: Refusal) => r.constraint ?? "";

// ── Part 1. A rule in the schema (what-are-constraints) ─────────────────────

export const PRICE = {
  cols: fields("price", "after"),
  /** What is stored afterwards: Notebook alone. */
  rows: okRows("price", "after"),
  refusal: refused("price", "bad"),
  failing: failingRow(refused("price", "bad")),
};

// ── Part 2. The type (choosing-data-types) ──────────────────────────────────

/** The type error names no failing row: the value never became one. */
export const TYPE = {
  cols: fields("type", "after"),
  rows: okRows("type", "after"),
  refusal: refused("type", "bad"),
  /** The attempted values, from the statement itself. */
  attempt: ["", "BOOK-1", "many"] as Cell[],
};
if (!step("type", "bad").sql.includes("'BOOK-1', 'many'")) throw new Error("check.mjs no longer sends 'many'");

const money = okRows("money", "text")[0];
const moneyCmp = step("money", "compare");
if (!moneyCmp.ok) throw new Error("money.compare failed");
export const MONEY = {
  /** 0.1 + 0.2 as double precision, every digit Postgres prints. */
  float: money[1] as string,
  /** The same sum as numeric. */
  exact: money[0] as string,
  floatEquals: moneyCmp.rows[0].float_equals_point_three as boolean,
  exactEquals: moneyCmp.rows[0].numeric_is_exact as boolean,
};

// ── Part 3. NOT NULL and DEFAULT (not-null-and-defaults) ────────────────────

export const NOT_NULL = {
  cols: fields("notNull", "after"),
  rows: okRows("notNull", "after"),
  refusal: refused("notNull", "missing"),
  failing: failingRow(refused("notNull", "missing")),
};
accepted("notNull", "fills");

// ── Part 4. UNIQUE (unique-constraints) ─────────────────────────────────────

export const UNIQUE = {
  cols: fields("unique", "after"),
  rows: okRows("unique", "after"),
  refusal: refused("unique", "dup"),
  attempt: ["", "ada@example.com", "ada_2"] as Cell[],
};
if (!step("unique", "dup").sql.includes("'ada@example.com', 'ada_2'")) throw new Error("check.mjs no longer sends ada_2");

accepted("pair", "otherCourse");
accepted("pair", "otherStudent");
export const PAIR = {
  cols: fields("pair", "after"),
  rows: okRows("pair", "after"),
  refusal: refused("pair", "dup"),
  attempt: ["1", "10"] as Cell[],
};

/** Ada's profile, then a second one for user 1, which UNIQUE refuses. */
export const ONE_TO_ONE = {
  cols: fields("oneToOne", "after"),
  rows: okRows("oneToOne", "after"),
  refusal: refused("oneToOne", "second"),
  attempt: ["", "1", "Ada again"] as Cell[],
};
if (!step("oneToOne", "second").sql.includes("(1, 'Ada again')")) throw new Error("check.mjs no longer sends 'Ada again'");

// ── Part 5. CHECK (check-constraints) ───────────────────────────────────────

export const STATUS = {
  cols: fields("status", "after"),
  rows: okRows("status", "after"),
  refusal: refused("status", "banana"),
  failing: failingRow(refused("status", "banana")),
};

export const DATES = {
  cols: ["id", "name", "start_date", "end_date"],
  refusal: refused("dates", "backwards"),
  failing: failingRow(refused("dates", "backwards")),
  /** Nothing is stored. */
  stored: okRows("dates", "after").length,
};

const unknown = step("checkOnly", "unknown");
if (!unknown.ok) throw new Error("checkOnly.unknown failed");
accepted("checkOnly", "noPrice");
export const CHECK_ONLY = {
  /** `NULL::numeric >= 0`: null, which a CHECK does not count as false. */
  test: unknown.rows[0].test as boolean | null,
  cols: fields("checkOnly", "after"),
  /** Notebook, then Pen with no price: stored. */
  rows: okRows("checkOnly", "after"),
};
export const CHECK_AND_NOT_NULL = {
  refusal: refused("checkAndNotNull", "noPrice"),
  failing: failingRow(refused("checkAndNotNull", "noPrice")),
};

// ── Part 6. The bridge (why-normalization's flat table) ─────────────────────

const update = accepted("flat", "update");
export const FLAT = {
  cols: fields("flat", "before"),
  before: okRows("flat", "before"),
  after: okRows("flat", "after"),
  /** The command tag: "UPDATE 1". */
  tag: `${update.command} ${update.affectedRows}`,
  /** How many emails Ada has afterwards. */
  emails: Number(okRows("flat", "emails")[0][0]),
};
