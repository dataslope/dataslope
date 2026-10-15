// The SQL this video prints, line for line. Pure (no imports), so check.mjs
// runs exactly these statements in PGlite and data.ts sets exactly these
// lines on screen: the code a viewer reads is the code that was run.

/**
 * Six rows of the lesson's own `regional_sales` table
 * (content/courses/intro-sql-postgres/running-totals.mdx): North and South,
 * the first three days of March, with the lesson's ids and amounts. check.mjs
 * builds the lesson's full 24-row table too and confirms these six match it.
 */
export const SETUP = `CREATE TABLE sales (
  id     INTEGER PRIMARY KEY,
  region TEXT,
  day    DATE,
  amount NUMERIC
);
INSERT INTO sales (id, region, day, amount) VALUES
  (1,'North','2025-03-01',120), (2,'North','2025-03-02',95),
  (3,'North','2025-03-03',140), (7,'South','2025-03-01',175),
  (8,'South','2025-03-02',130), (9,'South','2025-03-03',90);`;

/** Fig. 1: the table as it stands. */
export const ROWS_SQL = ["SELECT region, day, amount", "FROM sales", "ORDER BY region, day;"] as const;

/** Fig. 2: the aggregate, which folds each region into one row. */
export const GROUP_SQL = [
  "SELECT region, SUM(amount) AS total",
  "FROM sales",
  "GROUP BY region",
  "ORDER BY region;",
] as const;

/** Fig. 3: the same SUM as a window function. */
export const OVER_SQL = [
  "SELECT region, day, amount,",
  "  SUM(amount) OVER (",
  "    PARTITION BY region",
  "  ) AS region_total",
  "FROM sales",
  "ORDER BY region, day;",
] as const;

/** Fig. 4: a share of the region and a running total, beside every row. */
export const PAYOFF_SQL = [
  "SELECT region, day, amount,",
  "  ROUND(100 * amount / SUM(amount)",
  "    OVER (PARTITION BY region), 1) AS pct,",
  "  SUM(amount) OVER (",
  "    PARTITION BY region ORDER BY day",
  "  ) AS running_total",
  "FROM sales",
  "ORDER BY region, day;",
] as const;

export const QUERIES = {
  rows: ROWS_SQL,
  group: GROUP_SQL,
  over: OVER_SQL,
  payoff: PAYOFF_SQL,
} as const;
export type QueryName = keyof typeof QUERIES;
