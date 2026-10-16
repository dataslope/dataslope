// Every table, statement, command tag and error the video shows, read from
// results.json: what PGlite 0.5.8 (PostgreSQL 18.3) returned when check.mjs
// ran each lesson's own DDL and rows from a fresh database. The SQL printed on
// screen is the SQL in that file, split into lines, so a listing cannot drift
// from what ran. Pure (no Remotion, no DOM).

import results from "./results.json";

export const VIDEO = "db-normalization";

/**
 * Whether public/images/db-normalization/ holds the four watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

/** A value as Postgres printed it; null is SQL NULL. */
export type Cell = string | null;
type Rows = readonly (readonly Cell[])[];

type Ok = { ok: true; fields: string[]; rows: Cell[][]; affected: number };
type Err = { ok: false; code: string; message: string; detail: string | null };
const R = results.results as unknown as Record<string, Ok | Err>;
const SQL = results.sql as Record<string, string>;

const ok = (k: string): Ok => {
  const r = R[k];
  if (!r || !r.ok) throw new Error(`results.json: ${k} did not succeed`);
  return r;
};
const failed = (k: string): Err => {
  const r = R[k];
  if (!r || r.ok) throw new Error(`results.json: ${k} was expected to fail`);
  return r;
};

/** A query's columns and rows. */
const table = (k: string) => ({ cols: ok(k).fields as readonly string[], rows: ok(k).rows as Rows });
/** A statement as it ran, one string per printed line. */
const lines = (k: string) => SQL[k].split("\n") as readonly string[];
/** The command tag psql prints for a statement that changed rows. */
const tag = (k: string) => `${SQL[k].trim().split(/\s/)[0].toUpperCase()}${SQL[k].startsWith("INSERT") ? " 0" : ""} ${ok(k).affected}`;
/** An error as psql prints it. */
const error = (k: string) => {
  const e = failed(k);
  return { code: e.code, message: e.message, detail: e.detail };
};

export const PG_VERSION = results.version.split(" on ")[0];

// ── Part 1. One wide table (why-normalization) ─────────────────────────────

export const FLAT = table("flat");
/** Column indexes, so the scenes name what they point at. */
export const F = { id: 0, name: 1, email: 2, product: 3, price: 4 } as const;
/** orders_flat's constraints: its primary key and one NOT NULL per column. */
export const FLAT_CONSTRAINTS = ok("flatConstraints").rows.length;
export const FLAT_NOT_NULL = ok("flatNotNull").rows.length;

export const UPDATE = { lines: lines("update"), tag: tag("update") };
/** The value the rushed update wrote, as Postgres then stored it. */
export const NEW_EMAIL = ok("flatAfterUpdate").rows[0][F.email] as string;
export const FLAT_AFTER = table("flatAfterUpdate");
/** The lesson's GROUP BY after the update: Ada once per email. */
export const EMAILS = table("emails");

export const INSERT_ERROR = error("insertProduct");
/** The refused row, as its DETAIL line spells it: (null, null, null, Mug, 6.00). */
export const FAILING_ROW: readonly Cell[] = (INSERT_ERROR.detail ?? "")
  .replace(/^Failing row contains \(|\)\.$/g, "")
  .split(", ")
  .map((v) => (v === "null" ? null : v));
export const DELETE = { lines: lines("deleteGrace"), tag: tag("deleteGrace") };
export const LOOKUP = { lines: lines("lookupGrace"), rows: ok("lookupGrace").rows.length };

// ── Part 1. The cure (why-normalization's erDiagram) ───────────────────────

export const CUSTOMERS = table("splitCustomers");
export const PRODUCTS = table("splitProducts");
export const ORDERS = table("splitOrders");
export const ADA_EMAIL_ROWS = Number(ok("adaEmailRows").rows[0][0]);
export const SPLIT_TAGS = {
  update: tag("splitUpdate"),
  insert: tag("splitInsertProduct"),
  delete: tag("splitDeleteGrace"),
};
/** The mug, inserted into products with no order at all. */
export const MUG: readonly Cell[] = SQL.splitInsertProduct.match(/VALUES \((.*)\)/)![1].split(", ").map((v) => v.replace(/'/g, ""));
export const GRACE_KEPT = ok("splitGraceKept").rows[0][0] as string;
export const JOINED = table("splitJoin");

// ── Part 2. First normal form ──────────────────────────────────────────────

export const LIST_CELL = table("listCell");
export const LIST_SEARCH = { lines: lines("listSearch"), rows: ok("listSearch").rows.length };
/** The number searched for, as the statement spells it. */
export const SOUGHT = SQL.listSearch.match(/'([^']+)'/)![1];
export const COLUMNS = table("columns");
export const FOURTH = {
  row: SQL.fourth.match(/\((.*)\)/)![1].split(", ").map((v) => v.replace(/'/g, "")) as readonly Cell[],
  ...error("fourth"),
};
export const CHILD_STUDENTS = table("childStudents");
export const CHILD_PHONES = table("childPhones");
export const CHILD_FOUND = ok("childSearch").rows.map((r) => r[0] as string);
export const CHILD_COUNTS = table("childCounts");
export const CHILD_TWICE = {
  row: SQL.childTwice.match(/\((.*)\)/)![1].split(", ").map((v) => v.replace(/'/g, "")) as readonly Cell[],
  ...error("childTwice"),
};

// ── Part 3. Second normal form ─────────────────────────────────────────────

export const ITEMS_BAD = table("itemsBad");
export const I = { order: 0, product: 1, name: 2, qty: 3 } as const;
export const RENAME_BAD = { lines: lines("itemsRename"), tag: tag("itemsRename") };
export const RENAMED = ok("itemsBadAfter").rows[0][I.name] as string;
export const ITEMS_PRODUCTS = table("itemsProducts");
export const ITEMS_GOOD = table("itemsGood");
export const RENAME_GOOD = { lines: lines("itemsGoodRename"), tag: tag("itemsGoodRename") };

// ── Part 4. Third normal form ──────────────────────────────────────────────

export const CITY_BAD = table("cityBad");
export const K = { order: 0, customer: 1, name: 2, city: 3 } as const;
export const CITY_UPDATE = { lines: lines("cityUpdate"), tag: tag("cityUpdate") };
export const NEW_CITY = SQL.cityUpdate.match(/'([^']+)'/)![1];
export const CITY_TWO = table("cityTwo");
export const CITY_CUSTOMERS = table("cityCustomers");
export const CITY_ORDERS = table("cityOrders");
export const CITY_GOOD = { lines: lines("cityGoodUpdate"), tag: tag("cityGoodUpdate") };
export const CITY_JOIN = table("cityJoin");

// ── Part 5. Denormalization ────────────────────────────────────────────────

export const SUM_ORDERS = table("sumOrders");
export const SUM_ITEMS = table("sumItems");
export const SUM_BUILD_TAG = tag("sumBuild");
export const SUMMARY = table("summary");
export const LATE = {
  lines: lines("sumLate"),
  tag: tag("sumLate"),
  row: SQL.sumLate.match(/\((.*)\)/)![1].split(", ") as readonly Cell[],
};
/** The summary against a live SUM after the late line: stored and live. */
export const STALE = table("sumStale");

export const NORTHWIND = table("northwind");
const counts = ok("northwindCounts").rows[0].map(Number);
export const NORTHWIND_COUNTS = { lines: counts[0], disagree: counts[1], lower: counts[2], products: counts[3] };
