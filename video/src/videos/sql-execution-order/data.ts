import { categorical } from "../../theme/brand";

export const VIDEO = "sql-execution-order";

/** The orders table the trace runs on. Small enough to show every row, and
 *  chosen so every clause visibly does something: WHERE drops three rows,
 *  HAVING drops one group, LIMIT drops one result. */
export const ORDERS = [
  { id: 1, customer: "ana", amount: 40 },
  { id: 2, customer: "ben", amount: 15 },
  { id: 3, customer: "ana", amount: 25 },
  { id: 4, customer: "cy", amount: 90 },
  { id: 5, customer: "ben", amount: 60 },
  { id: 6, customer: "dee", amount: 12 },
  { id: 7, customer: "cy", amount: 35 },
  { id: 8, customer: "dee", amount: 30 },
  { id: 9, customer: "ben", amount: 45 },
  { id: 10, customer: "ana", amount: 18 },
] as const;

export const CUSTOMERS = ["ana", "ben", "cy", "dee"] as const;
export type Customer = (typeof CUSTOMERS)[number];

export const customerColor = (c: Customer) => categorical[CUSTOMERS.indexOf(c)];

export const WHERE_MIN = 20; // WHERE amount > 20
export const HAVING_MIN = 50; // HAVING SUM(amount) > 50

export const kept = ORDERS.filter((o) => o.amount > WHERE_MIN);

export const totals = CUSTOMERS.map((customer) => ({
  customer,
  total: kept
    .filter((o) => o.customer === customer)
    .reduce((sum, o) => sum + o.amount, 0),
}));

/** After HAVING, in group order. */
export const groupsKept = totals.filter((g) => g.total > HAVING_MIN);
/** After ORDER BY total DESC. */
export const sorted = [...groupsKept].sort((a, b) => b.total - a.total);
export const LIMIT = 2;

/**
 * The query, one clause per line, in the order it is written. `step` is its
 * place in PostgreSQL's logical order (the lesson's numbering, which counts
 * window functions as 6 and DISTINCT as 7 even though this query has
 * neither).
 */
export const QUERY = [
  { key: "select", step: 5, sql: "SELECT customer, SUM(amount) AS total" },
  { key: "from", step: 1, sql: "FROM orders" },
  { key: "where", step: 2, sql: `WHERE amount > ${WHERE_MIN}` },
  { key: "group-by", step: 3, sql: "GROUP BY customer" },
  { key: "having", step: 4, sql: `HAVING SUM(amount) > ${HAVING_MIN}` },
  { key: "order-by", step: 8, sql: "ORDER BY total DESC" },
  { key: "limit", step: 9, sql: `LIMIT ${LIMIT};` },
] as const;

export type ClauseKey = (typeof QUERY)[number]["key"];

/** The two steps of the full order this query does not use. */
export const GHOST_STEPS = [
  { key: "window", step: 6, label: "window functions" },
  { key: "distinct", step: 7, label: "DISTINCT" },
] as const;

/** All nine steps in execution order, for the step strips and the rule. */
export const STEPS = [
  { step: 1, label: "FROM" },
  { step: 2, label: "WHERE" },
  { step: 3, label: "GROUP BY" },
  { step: 4, label: "HAVING" },
  { step: 5, label: "SELECT" },
  { step: 6, label: "window" },
  { step: 7, label: "DISTINCT" },
  { step: 8, label: "ORDER BY" },
  { step: 9, label: "LIMIT" },
] as const;
