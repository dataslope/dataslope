// Every value the video shows, read from results.json: what PGlite 0.5.8
// (PostgreSQL 18.3) returned for the queries in check.mjs, which wrote it.
// The SQL printed on screen is the SQL in that file, split into lines, so the
// listing cannot drift from what ran. Pure (no Remotion, no DOM).
//
// The tables are the first four customers of the outer-joins lesson's initSql
// (content/courses/intro-sql-postgres/outer-joins.mdx) and every one of their
// orders from it, with the lesson's ids and amounts unchanged:
//
//   customers (id, name):          1 Ada, 2 Grace, 3 Linus, 4 Mae
//   orders (id, customer_id, amount): 101 1 42, 102 1 18, 103 2 99,
//                                     104 2 15, 130 1 57

import results from "./results.json";

export const VIDEO = "left-join-trap";

/**
 * Whether public/images/left-join-trap/ holds the two watercolors from
 * illustrations.json. Set it to true once `npm run illustrations --
 * left-join-trap` has written both WebPs; every frame is laid out with room
 * for them either way.
 */
export const ILLUSTRATIONS = false;

/** A value as PGlite hands it back: numeric arrives as a string. */
export type Value = string | number | boolean | null;

type Result = { fields: string[]; rows: Record<string, Value>[] };
const R = results.results as unknown as Record<keyof typeof results.sql, Result>;

/** A result as rows of cells, in the order of its fields. */
const cells = (r: Result): Value[][] => r.rows.map((row) => r.fields.map((f) => row[f]));

export const SQL_LINES = {
  left: results.sql.left.split("\n"),
  where: results.sql.where.split("\n"),
  on: results.sql.on.split("\n"),
};

export const CUSTOMERS = { fields: R.customers.fields, rows: cells(R.customers) };
export const ORDERS = { fields: R.orders.fields, rows: cells(R.orders) };
/** The plain LEFT JOIN, Fig. 2. */
export const LEFT = { fields: R.left.fields, rows: cells(R.left) };
/** The LEFT JOIN with `WHERE o.amount > 50`, Fig. 3. */
export const WHERE = { fields: R.where.fields, rows: cells(R.where) };
/** The LEFT JOIN with `AND o.amount > 50` in its ON clause, Fig. 4. */
export const ON = { fields: R.on.fields, rows: cells(R.on) };
/** The LEFT JOIN's rows with the WHERE condition's value on each, as
 *  `o.amount > 50 AS "o.amount > 50"` returned it: what WHERE tests. */
export const TESTED = { fields: R.test.fields, rows: cells(R.test) };

const nameOf = (row: Value[]) => row[0] as string;
const idOf = (row: Value[]) => row[1];

/** Customers no order points at: Linus and Mae. */
const ordered = new Set(ORDERS.rows.map((r) => r[1]));
export const NO_ORDERS = CUSTOMERS.rows.filter((r) => !ordered.has(r[0])).map((r) => r[1] as string);
/** Their ids, and the customer ids the orders do hold. */
export const NO_ORDER_IDS = CUSTOMERS.rows.filter((r) => !ordered.has(r[0])).map((r) => r[0] as number);
export const ORDER_CUSTOMER_IDS = [...ordered] as number[];

/** Customers in the LEFT JOIN that the WHERE result lost. */
const kept = new Set(WHERE.rows.map(nameOf));
export const VANISHED = [...new Set(LEFT.rows.map(nameOf))].filter((n) => !kept.has(n));

/** Row indexes in TESTED by the condition's value. */
const testOf = (row: Value[]) => row[3] as boolean | null;
export const TEST_TRUE = TESTED.rows.flatMap((r, i) => (testOf(r) === true ? [i] : []));
export const TEST_FALSE = TESTED.rows.flatMap((r, i) => (testOf(r) === false ? [i] : []));
export const TEST_NULL = TESTED.rows.flatMap((r, i) => (testOf(r) === null ? [i] : []));

/** Rows of a result whose order columns came back NULL. */
export const nullRows = (rows: Value[][]) => rows.flatMap((r, i) => (idOf(r) === null ? [i] : []));

/** Whether a plain JOIN with the same WHERE returned the same rows. */
export const WHERE_EQUALS_INNER: boolean = results.whereEqualsInner;

/** `NULL::numeric > 50` returned NULL. */
export const NULL_GT_50 = R.nullGt.rows[0].v;

// The narration states these; if new results disagree, fail loudly here
// rather than let the voice and the screen part ways.
const check = (ok: boolean, what: string) => {
  if (!ok) throw new Error(`left-join-trap: results.json no longer says ${what}`);
};
check(NO_ORDERS.join() === "Linus,Mae", "that Linus and Mae have no orders");
check(VANISHED.join() === "Linus,Mae", "that the WHERE loses Linus and Mae");
check(
  WHERE.rows.length === 2 && WHERE.rows[0][0] === "Ada" && WHERE.rows[1][0] === "Grace",
  "that Ada and Grace keep one order each",
);
check(LEFT.rows.length === 7 && ON.rows.length === 4, "seven rows, then two, then four");
check(TEST_NULL.every((i) => TESTED.rows[i][2] === null) && NULL_GT_50 === null, "that NULL > 50 is NULL");
check(
  JSON.stringify(TEST_TRUE.map((i) => TESTED.rows[i].slice(0, 3))) === JSON.stringify(WHERE.rows),
  "that WHERE keeps exactly the rows where the test is true",
);
check(WHERE_EQUALS_INNER, "that a plain JOIN returns the same rows");
check(
  JSON.stringify(nullRows(ON.rows).map((i) => ON.rows[i][0])) === JSON.stringify(VANISHED),
  "that ON brings Linus and Mae back with NULLs",
);
/** The WHERE line and the ON line sit at the same place in their listings. */
export const FILTER_LINE = SQL_LINES.where.findIndex((l) => l.startsWith("WHERE"));
check(
  SQL_LINES.where.length === SQL_LINES.on.length &&
    SQL_LINES.where.every((l, i) => i === FILTER_LINE || l === SQL_LINES.on[i]) &&
    JSON.stringify(SQL_LINES.where.filter((_, i) => i !== FILTER_LINE)) === JSON.stringify(SQL_LINES.left),
  "that the three queries differ only in the filter line",
);
/** The line holding LEFT JOIN, struck when it behaves as an inner join. */
export const JOIN_LINE = SQL_LINES.left.findIndex((l) => l.startsWith("LEFT JOIN"));
