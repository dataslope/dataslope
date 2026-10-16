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
  /** Ada's distinct emails afterwards. */
  adaEmails: r.flat.adaEmails,
};
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

/** An entity box's columns, as the catalog lists them, keys marked. */
const entityColumns = (cols: Col[], keys: Key[], table: string) =>
  cols.map((c) => {
    const kinds = keys.filter((k) => k.table_name === table && k.column_name === c.column_name).map((k) => k.constraint_type);
    const pk = kinds.includes("PRIMARY KEY");
    const fk = kinds.includes("FOREIGN KEY");
    return {
      name: c.column_name,
      type: c.data_type,
      key: pk && fk ? ("PK, FK" as const) : pk ? ("PK" as const) : fk ? ("FK" as const) : undefined,
      unique: kinds.includes("UNIQUE"),
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
};
const REF = r.shop.refused as Record<"duplicate" | "zero" | "orphan", Refusal>;
/** The three bad rows, in the order the narration names them. */
export const REFUSED: readonly Refusal[] = [REF.duplicate, REF.zero, REF.orphan];
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
