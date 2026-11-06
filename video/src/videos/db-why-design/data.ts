import type { EntityColumn } from "../../editorial/erd";
import r from "./results.json";

// Every table, row, count and message the video shows, read from
// results.json: what PGlite 0.5.8 (PostgreSQL 18.3) returned when check.mjs
// ran the lessons' own SQL from fresh databases. The SQL printed on screen is
// the SQL in that file, split into lines, so a listing cannot drift from what
// ran. Pure (no Remotion, no DOM).
//
//   flat     what-is-database-design.mdx, "Watch a shortcut go wrong"
//   shop     what-is-database-design.mdx, "The schema shapes everything built
//            on it", and three refused rows of the video's own
//   library  what-is-database-design.mdx's library ER diagram, built as DDL
//            and read back from the catalog

export const VIDEO = "db-why-design";

/**
 * Whether public/images/db-why-design/ holds the three watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

/** A value as PGlite hands it back. */
export type Cell = string | number | null;
type Table = { fields: string[]; rows: Cell[][] };

/** A result's cells as strings, the way a SQL client prints them. */
const text = (t: Table) => t.rows.map((row) => row.map((v) => (v === null ? null : String(v))));

// ── Part 1. The flat table and the rushed update ─────────────────────────────

export const FLAT = {
  cols: r.flat.before.fields,
  rows: text(r.flat.before as Table),
  after: text(r.flat.after as Table),
  /** The UPDATE, as it ran, one line per listing line. */
  update: r.flat.update.sql.split("\n"),
  /** Rows the UPDATE changed: Postgres's "UPDATE 1". */
  updated: r.flat.update.affectedRows,
  /** The table's name, as the UPDATE names it. */
  table: r.flat.update.sql.match(/^UPDATE (\w+)/)![1],
  /** Ada's distinct emails afterwards. */
  adaEmails: r.flat.adaEmails,
};
/** What an "UPDATE n" reply means, in words. */
export const rowsChanged = (rows: number) => `(${rows} ${rows === 1 ? "row" : "rows"} changed)`;

/** Column indexes of the flat table, so the scenes name what they point at. */
export const F = {
  id: FLAT.cols.indexOf("order_id"),
  name: FLAT.cols.indexOf("customer_name"),
  email: FLAT.cols.indexOf("customer_email"),
  product: FLAT.cols.indexOf("product_name"),
  qty: FLAT.cols.indexOf("quantity"),
};
/** The row the update reached (101) and the one it missed (102). */
export const FIXED_ROW = FLAT.rows.findIndex((row) => row[F.id] === String(FLAT.update.at(-1)!.match(/\d+/)![0]));
export const MISSED_ROW = FLAT.rows.findIndex(
  (row, i) => i !== FIXED_ROW && row[F.name] === FLAT.rows[FIXED_ROW][F.name],
);
export const NEW_EMAIL = FLAT.after[FIXED_ROW][F.email] as string;
export const OLD_EMAIL = FLAT.rows[FIXED_ROW][F.email] as string;
/** The order the update was aimed at, as the listing prints it. */
export const FIXED_ORDER = FLAT.rows[FIXED_ROW][F.id] as string;
export const MISSED_ORDER = FLAT.rows[MISSED_ROW][F.id] as string;
export const ADA = FLAT.rows[FIXED_ROW][F.name] as string;

/** The lesson's GROUP BY over the flat table, after the update. */
export const GROUPED = { cols: r.flat.grouped.fields, rows: text(r.flat.grouped as Table) };
/** Which grouped rows are Ada's. */
export const GROUPED_ADA = GROUPED.rows.flatMap((row, i) => (row[0] === ADA ? [i] : []));

// ── Part 3. The clean shop ───────────────────────────────────────────────────

type Col = { column_name: string; data_type: string };
type Key = { table_name: string; column_name: string; constraint_type: string };

/** A column's badge: primary key, foreign key, unique (UK, as the lessons'
 *  ER diagrams mark `email UK`), or two at once. */
const badge = (pk: boolean, fk: boolean, unique: boolean): EntityColumn["key"] =>
  pk && fk ? "PK, FK" : pk ? "PK" : fk && unique ? "FK, UK" : fk ? "FK" : unique ? "UK" : undefined;

/** An entity box's columns, as the catalog lists them, keys marked. */
const entityColumns = (cols: Col[], keys: Key[], table: string): EntityColumn[] =>
  cols.map((c) => {
    const kinds = keys.filter((k) => k.table_name === table && k.column_name === c.column_name).map((k) => k.constraint_type);
    return {
      name: c.column_name,
      type: c.data_type,
      key: badge(kinds.includes("PRIMARY KEY"), kinds.includes("FOREIGN KEY"), kinds.includes("UNIQUE")),
    };
  });

export const SHOP = {
  customers: entityColumns(r.shop.columns.customers, r.shop.keys, "customers"),
  orders: entityColumns(r.shop.columns.orders, r.shop.keys, "orders"),
  items: entityColumns(r.shop.columns.order_items, r.shop.keys, "order_items"),
  products: entityColumns(r.shop.columns.products, r.shop.keys, "products"),
};

/** Which customers bought a notebook: the lesson's join, as it ran. */
export const NOTEBOOK = {
  cols: r.shop.notebook.fields,
  rows: text(r.shop.notebook as Table),
  /** The order lines behind that one name. */
  lines: text(r.shop.notebookLines as Table),
};

/**
 * Every order line in this shop, with its customer and product. The shop is
 * the lesson's second dataset, not Fig. 1's: the same names, but here Grace
 * Hopper's one order is a backpack, so she is rightly not in the answer.
 */
const LINES = text(r.shop.orderLines as Table);
/** What each customer outside the answer bought instead. */
export const OTHERS = [...new Set(LINES.map((l) => l[1] as string))]
  .filter((who) => !NOTEBOOK.rows.some((row) => row[0] === who))
  .map((who) => ({ who, bought: [...new Set(LINES.filter((l) => l[1] === who).map((l) => (l[2] as string).toLowerCase()))] }));

/** The free-text order the lesson sets against the clean schema. */
export const NOTE_TEXT = "Ada bought 2 notebooks and 5 pens";
/** The product's name as the products table stores it. */
export const NOTEBOOK_NAME = r.shop.notebook.sql.match(/products\.name = '([^']+)'/)![1];

export type Refusal = {
  sql: string;
  code: string;
  message: string;
  detail: string | null;
  constraint: string | null;
  table: string;
  /** The broken rule as the catalog defines it: "UNIQUE (email)". */
  def: string;
};
const REF = r.shop.refused as Record<"duplicate" | "zero" | "orphan", Refusal>;
/** The three bad rows, in the order the narration names them. */
export const REFUSED: readonly Refusal[] = [REF.duplicate, REF.zero, REF.orphan];

/** The rule a row broke, as the diagrams mark it: a badge (UK, FK) or the
 *  CHECK, and the column or condition, from the catalog's definition. */
export const ruleTag = ({ def, table }: Refusal): { badge: string; text: string } => {
  const unique = def.match(/^UNIQUE \((\w+)\)$/);
  if (unique) return { badge: "UK", text: `${table}.${unique[1]}` };
  const fk = def.match(/^FOREIGN KEY \((\w+)\)/);
  if (fk) return { badge: "FK", text: `${table}.${fk[1]}` };
  const check = def.match(/^CHECK \(\((.+)\)\)$/);
  if (check) return { badge: "CHECK", text: check[1] };
  throw new Error(`no tag for ${def}`);
};
/** What the tables hold after all three: exactly what they held. */
export const COUNTS_AFTER = r.shop.countsAfter;

// ── Part 2. The library ──────────────────────────────────────────────────────

export const LIBRARY = {
  books: entityColumns(r.library.columns.books, r.library.keys, "books"),
  copies: entityColumns(r.library.columns.book_copies, r.library.keys, "book_copies"),
  borrowers: entityColumns(r.library.columns.borrowers, r.library.keys, "borrowers"),
  loans: entityColumns(r.library.columns.loans, r.library.keys, "loans"),
};

// ── Part 3. The Mars Climate Orbiter ─────────────────────────────────────────

/** One pound-force second in newton-seconds, from the definitions (4.448);
 *  the Mishap Investigation Board's "factor of 4.45". */
export const LBF_S = r.units.lbfSecondInNewtonSeconds;
