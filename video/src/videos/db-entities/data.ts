// Every table, column, key and message the video shows, read from
// results.json: what PGlite 0.5.8 (PostgreSQL 18.3) returned for the lessons'
// own SQL, run by check.mjs, which wrote it. The SQL printed on screen is the
// SQL in that file, split into lines, so a listing cannot drift from what
// ran. Pure (no Remotion, no DOM).

import results from "./results.json";

export const VIDEO = "db-entities";

/**
 * Whether public/images/db-entities/ holds the watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = false;

/** A value as PGlite hands it back: numeric and date arrive as strings. */
type Value = string | number | boolean | null;
type Ok = { ok: true; fields: string[]; rows: Record<string, Value>[] };
type Failed = { ok: false; message: string; detail: string | null; code: string | null; constraint: string | null };
type Run = Ok | Failed;
type Column = { column_name: string; data_type: string; is_nullable: string; character_maximum_length: number | null };
type Constraint = { name: string; kind: string; def: string; cols: string[]; ref_table: string; ref_cols: string[] };

const F = results.figures;

/** A table cell as the kit sets it: text, or null for SQL NULL. */
export type Cell = string | null;
const cell = (v: Value): Cell => (v === null ? null : String(v));
/** A result as rows of cells, in the order of its fields. */
const cells = (r: Run): Cell[][] => {
  if (!r.ok) throw new Error(`expected rows, got: ${r.message}`);
  return r.rows.map((row) => r.fields.map((f) => cell(row[f])));
};
const fields = (r: Run) => {
  if (!r.ok) throw new Error(`expected rows, got: ${r.message}`);
  return r.fields;
};
const failure = (r: Run): Failed => {
  if (r.ok) throw new Error("expected Postgres to refuse this statement");
  return r;
};
/** Lines of a statement, from the first that starts with `from` to the
 *  first that starts with `to`, with their shared indent removed. */
const slice = (sql: string, from: string, to: string) => {
  const lines = sql.split("\n");
  const a = lines.findIndex((l) => l.trim().startsWith(from));
  const b = lines.findIndex((l, i) => i >= a && l.trim().startsWith(to));
  const picked = lines.slice(a, b + 1);
  const indent = Math.min(...picked.map((l) => l.length - l.trimStart().length));
  return picked.map((l) => l.slice(indent));
};

// ── Part 1. Separate entities, separate tables (thinking-in-entities) ──────

export const CUSTOMERS = { cols: fields(F.entities.results.customers as Run), rows: cells(F.entities.results.customers as Run) };
export const PRODUCTS = { cols: fields(F.entities.results.products as Run), rows: cells(F.entities.results.products as Run) };
/** Ada's row in customers. */
export const ADA_ROW = CUSTOMERS.rows.findIndex((r) => r[1] === "Ada");
/** The column products has and customers doesn't. */
export const PRICE_COL = PRODUCTS.cols.findIndex((c) => !CUSTOMERS.cols.includes(c));
export const PRICE_NAME = PRODUCTS.cols[PRICE_COL];

// ── Part 2. Attributes and their domains (attributes-and-domains) ──────────

const orderColumns = F.orders.columns as Column[];
const orderChecks = (F.orders.constraints as Constraint[]).filter((c) => c.kind === "c");
const orderPk = (F.orders.constraints as Constraint[]).find((c) => c.kind === "p")!;
/** The orders entity, column by column, as the catalog stores it. */
export const ORDER_COLUMNS = orderColumns.map((c) => ({
  name: c.column_name,
  type: c.data_type,
  key: orderPk.cols.includes(c.column_name) ? ("PK" as const) : undefined,
}));
/** What each stored type lets a column hold, in words. */
export const TYPE_HOLDS: Record<string, string> = {
  integer: "whole numbers",
  text: "any text at all",
  date: "calendar dates",
};
export const ORDER_ROWS = { cols: fields(F.orders.results.rows as Run), rows: cells(F.orders.results.rows as Run) };

/** The statuses status's CHECK allows, read from the constraint Postgres stored. */
const statusCheck = orderChecks.find((c) => c.cols.includes("status"))!;
export const ALLOWED = [...statusCheck.def.matchAll(/'([^']*)'::text/g)].map((m) => m[1]);
export const CHECK_NAMES = orderChecks.map((c) => c.name);

/** The two CHECK clauses as the DDL prints them (status's, then the total's). */
export const CHECK_SQL = slice(F.orders.ddl, "status", "CHECK (total_cents").map((l, i, all) =>
  // The listing stops at the total's CHECK, so the comma that led on to the next column goes.
  i === all.length - 1 ? l.replace(/,$/, "") : l,
);

/** Status as plain text: the four spellings went in, each its own value. */
export const LOOSE = {
  cols: fields(F.loose.results.rows as Run),
  rows: cells(F.loose.results.rows as Run),
  distinct: Number((F.loose.results.distinct as Ok).rows[0].n),
  /** Each spelling against the narrow domain: true when it got in. */
  accepted: (F.loose.results.narrow as (Run & { status: string })[]).map((r) => r.ok),
};
/** Rows of LOOSE by what the narrow domain did with them. */
export const LOOSE_IN = LOOSE.accepted.flatMap((a, i) => (a ? [i] : []));
export const LOOSE_OUT = LOOSE.accepted.flatMap((a, i) => (a ? [] : [i]));

export const BANANA = {
  sql: F.orders.sql.banana as string,
  error: failure(F.orders.results.banana as Run),
};
/** The failing row in the DETAIL line, the status column's index in it. */
export const STATUS_COL = ORDER_ROWS.cols.indexOf("status");

// The VARCHAR(20) claim.
const nameColumn = (F.name.columns as Column[]).find((c) => c.column_name === "name")!;
export const NAME = {
  /** `name VARCHAR(20) NOT NULL`, as the DDL prints it. */
  sql: slice(F.name.setup, "name", "name")[0].replace(/\s+/g, " "),
  limit: nameColumn.character_maximum_length!,
  value: F.name.name as string,
  length: Number((F.name.results.length as Ok).rows[0].n),
  error: failure(F.name.results.insert as Run),
};

// One value per cell.
export const PACKED = {
  cols: fields(F.phones.results.packed as Run),
  rows: cells(F.phones.results.packed as Run),
  search: F.phones.sql.search as string,
  found: (F.phones.results.search as Ok).rows.length,
};
export const PHONES_COL = PACKED.cols.indexOf("phone_numbers");

// ── Part 3. The ER diagram (entity-relationship-diagrams) ───────────────────

type Key = "PK" | "FK" | "PK, FK";
const erdColumns = F.erd.columns as Record<"customers" | "orders", Column[]>;
const erdConstraints = F.erd.constraints as Record<"customers" | "orders", Constraint[]>;
const keyOf = (table: "customers" | "orders", col: string): Key | undefined => {
  const cs = erdConstraints[table];
  const pk = cs.some((c) => c.kind === "p" && c.cols.includes(col));
  const fk = cs.some((c) => c.kind === "f" && c.cols.includes(col));
  return pk && fk ? "PK, FK" : pk ? "PK" : fk ? "FK" : undefined;
};
const erdEntity = (table: "customers" | "orders") =>
  erdColumns[table].map((c) => ({ name: c.column_name, type: c.data_type, key: keyOf(table, c.column_name) }));

export const ERD = {
  customers: erdEntity("customers"),
  orders: erdEntity("orders"),
  /** orders' foreign key, and the table and column it points at. */
  fk: (() => {
    const f = erdConstraints.orders.find((c) => c.kind === "f")!;
    return { col: f.cols[0], table: f.ref_table, refCol: f.ref_cols[0] };
  })(),
};
