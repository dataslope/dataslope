// Every value the video shows, copied from what PGlite 0.5.8 (PostgreSQL
// 18.3) returned for the queries below. Pure (no Remotion, no DOM).
//
// The customers are the first four rows of the lesson's own initSql
// (content/courses/intro-sql-postgres/working-with-null.mdx), so SERIAL gives
// them ids 1 to 4; their phone column is left off screen. The orders table is
// this video's: orders for customers 1 and 3, and one guest order whose
// customer_id is NULL.
//
//   CREATE TABLE orders (id SERIAL PRIMARY KEY, customer_id INT);
//   INSERT INTO orders (customer_id) VALUES (1), (3), (NULL);

export const VIDEO = "sql-null-trap";

/**
 * Whether public/images/sql-null-trap/ holds the two watercolors from
 * illustrations.json. Set it to true once `npm run illustrations --
 * sql-null-trap` has written both WebPs; every frame is laid out with room
 * for them either way.
 */
export const ILLUSTRATIONS = true;

/** A SQL boolean as Postgres returns it: NULL is the unknown. */
export type Truth = boolean | null;

/** `SELECT id, name FROM customers ORDER BY id;` */
export const CUSTOMERS = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Grace" },
  { id: 3, name: "Linus" },
  { id: 4, name: "Mae" },
] as const;

/** `SELECT customer_id FROM orders;`, the subquery's rows in the order
 *  Postgres returned them. */
export const ORDER_CUSTOMER_IDS: readonly (number | null)[] = [1, 3, null];

/** The trap, Fig. 1. It returned no rows (fields: name) and no error. */
export const TRAP_SQL = [
  "SELECT name",
  "FROM customers",
  "WHERE id NOT IN (",
  "  SELECT customer_id FROM orders",
  ");",
] as const;
export const TRAP_ROWS: readonly string[] = [];

/** `SELECT 2 <> 1, 2 <> 2, 2 <> NULL;` returned true, false, NULL. */
export const COMPARISONS: readonly { expr: string; value: Truth }[] = [
  { expr: "2 <> 1", value: true },
  { expr: "2 <> 2", value: false },
  { expr: "2 <> NULL", value: null },
];

/** `SELECT 'kept' WHERE <condition>`: rows returned for each value. */
export const WHERE_ROWS = { true: 1, false: 0, unknown: 0 } as const;

/**
 * Every customer through the chain:
 *   SELECT id, name, id <> 1, id <> 3, id <> NULL::int,
 *     (id <> 1 AND id <> 3 AND id <> NULL::int),
 *     id NOT IN (SELECT customer_id FROM orders)
 *   FROM customers ORDER BY id;
 * The chain and NOT IN agreed on every row.
 */
export const CHAIN: readonly {
  id: number;
  name: string;
  terms: readonly Truth[];
  result: Truth;
}[] = [
  { id: 1, name: "Ada", terms: [false, true, null], result: false },
  { id: 2, name: "Grace", terms: [true, true, null], result: null },
  { id: 3, name: "Linus", terms: [true, false, null], result: false },
  { id: 4, name: "Mae", terms: [true, true, null], result: null },
];
export const GRACE = CHAIN[1];

/** The two fixes, Fig. 5, and the rows each returned (fields: name). */
export const EXISTS_SQL = [
  "SELECT name",
  "FROM customers c",
  "WHERE NOT EXISTS (",
  "  SELECT 1 FROM orders o",
  "  WHERE o.customer_id = c.id",
  ");",
] as const;
export const FILTER_SQL = [
  "SELECT name",
  "FROM customers",
  "WHERE id NOT IN (",
  "  SELECT customer_id FROM orders",
  "  WHERE customer_id IS NOT NULL",
  ");",
] as const;
export const FIX_ROWS: readonly string[] = ["Grace", "Mae"];
