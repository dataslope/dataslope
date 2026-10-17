// Every row, query, reply and error the video shows, read from results.json:
// what PGlite 0.5.8 (PostgreSQL 18.3) returned for the statements in
// check.mjs, which wrote it. The SQL printed on screen is the SQL in that
// file, split into lines, so a listing cannot drift from what ran. Pure (no
// Remotion, no DOM).
//
// The tables are the-relational-revolution lesson's own (24 customers, 30
// orders); the video draws customers 1 to 3 and their six orders:
//
//   customers (id, name):           1 Ada, 2 Grace, 3 Linus
//   orders (id, customer_id, total): 101 1 15.00, 102 2 44.00, 103 3 73.00,
//                                    125 1 31.00, 126 2 60.00, 127 3 89.00

import results from "./results.json";

export const VIDEO = "db-relational-history";

/**
 * Whether public/images/db-relational-history/ holds the four watercolors
 * from illustrations.json. Every frame is laid out with room for them either
 * way.
 */
export const ILLUSTRATIONS = true;

type Value = string | number | null;
type Result = { fields: string[]; rows: Record<string, Value>[] };
const R = results.results as unknown as Record<string, Result>;

export type Customer = { id: number; name: string };
export type Order = { id: number; customerId: number; total: string };

export const CUSTOMERS: readonly Customer[] = R.customers.rows.map((r) => ({ id: Number(r.id), name: String(r.name) }));
export const ORDERS: readonly Order[] = R.orders.rows.map((r) => ({
  id: Number(r.id),
  customerId: Number(r.customer_id),
  total: String(r.total),
}));
/** The whole of the lesson's tables, of which the video draws a few rows. */
export const COUNTS = {
  customers: Number(R.counts.rows[0].customers),
  orders: Number(R.counts.rows[0].orders),
};

/** Ada: the customer the lesson's query asks about. */
export const ADA = CUSTOMERS.find((c) => c.name === "Ada")!;
/** Each customer's orders, in id order: the tree's children. */
export const ORDERS_OF = (customerId: number) => ORDERS.filter((o) => o.customerId === customerId);

/** Where each drawn order sits on disk (its ctid), before and after CLUSTER
 *  rewrote the table, in the order a scan meets them. */
export type Placed = { id: number; ctid: string };
const placed = (r: Result): Placed[] => r.rows.map((x) => ({ id: Number(x.id), ctid: String(x.ctid) }));
export const ON_DISK = { before: placed(R.before), after: placed(R.after) };

/** The query as the video sets it (check.mjs's LISTING), and its answer
 *  before and after the reorganization: the same rows, in the same order. */
export const LISTING = results.sql.listing.split("\n");
export type AnswerRow = { orderId: number; total: string };
const answer = (r: Result): AnswerRow[] => r.rows.map((x) => ({ orderId: Number(x.order_id), total: String(x.total) }));
export const ANSWER = { before: answer(R.listing), after: answer(R.listingAgain), fields: R.listing.fields };
export const SAME_ANSWER = results.sameAnswer && results.sameOrder && results.listingMatches;

/** `SELECT version();` and the first part of its reply. */
export const VERSION_SQL = results.sql.version;
export const VERSION = results.version;
/** "PostgreSQL 18.3": the reply up to the first parenthesis. */
export const VERSION_SHORT = VERSION.split(" (")[0];
/** "(PGlite 0.5.8) on wasm32-unknown-emscripten": the rest of the reply's first clause. */
export const VERSION_REST = VERSION.slice(VERSION_SHORT.length + 1).split(",")[0];

/** The row that breaks a declared rule, and Postgres's refusal. */
export const BAD_SQL = results.sql.bad;
export const BAD = results.badError!;
/** The orders table still holds the lesson's rows afterwards. */
export const ORDERS_AFTER_BAD = Number(R.countAfterBad.rows[0].orders);
