/**
 * "Top Products by Month" — the multi-step SQL challenge.
 *
 * Three gated steps over one problem: monthly revenue per product, rank
 * within each month, then cut to the top three. Each step's solution is the
 * previous step's query with one idea added, which is the point of splitting
 * it — the learner never rewrites what already works, and the step they are
 * on is the only thing they have to hold in their head.
 */

import { RETAIL } from "./datasets";
import type { Challenge } from "./types";

/** Indent a block so it reads as a nested CTE body. */
const indent = (sql: string) =>
  sql
    .split("\n")
    .map((l) => "  " + l)
    .join("\n");

/** Step 1's accepted query, reused as the CTE the later steps build on. */
const MONTHLY = `SELECT strftime('%Y-%m-01', o.order_date) AS month,
       p.product_name,
       ROUND(SUM(i.quantity * i.unit_price), 2) AS revenue
FROM order_items i
JOIN orders   o ON o.order_id = i.order_id
JOIN products p ON p.product_id = i.product_id
WHERE o.status = 'completed'
GROUP BY 1, 2`;

const RANK_CTE = `WITH monthly AS (
${indent(MONTHLY)}
), ranked AS (
  SELECT month, product_name, revenue,
         RANK() OVER (PARTITION BY month
                      ORDER BY revenue DESC, product_name) AS revenue_rank
  FROM monthly
)`;

export const TOP_PRODUCTS_BY_MONTH: Challenge = {
  slug: "top-products-by-month",
  title: "Top Products by Month",
  difficulty: "Intermediate",
  catalog: { topic: "Window functions", langs: ["sqlite"] },
  languageLabel: "SQL",
  description:
    "Break a monthly revenue ranking into three gated steps: total revenue per product per month, rank within each month, then cut to the top three.",
  runtime: { kind: "sql", dialect: "sqlite", initSql: RETAIL.initSql },
  schema: RETAIL.schema,
  submitLabel: "Submit step",
  submissionColumns: ["step", "result", "lang", "when"],
  keyStrip: [
    "SELECT",
    "FROM",
    "JOIN",
    "WHERE",
    "GROUP BY",
    "OVER",
    "(",
    ")",
    ",",
    "*",
    "'",
  ],
  instructions: [],
  languages: [
    {
      id: "sql",
      label: "SQL · SQLite",
      shortLabel: "SQL",
      starterCode: "",
      solutionCode: "",
      tests: [],
    },
  ],
  solutionNote: [
    "The tiebreak is the part people miss. ",
    { code: "RANK()" },
    " gives tied rows the same number and skips the next one, so add the product name as a second sort key — and reach for ",
    { code: "ROW_NUMBER()" },
    " instead when every row must get a distinct rank.",
  ],
  steps: [
    {
      n: "01",
      title: "Monthly revenue",
      short: "Revenue",
      solutionNote: [
        "SQLite has no ",
        { code: "date_trunc" },
        ", so the month comes from ",
        { code: "strftime" },
        " — and because that returns text, it groups and sorts correctly only while the format stays ",
        { code: "YYYY-MM-DD" },
        ". Grouping by the two select expressions positionally (",
        { code: "GROUP BY 1, 2" },
        ") saves repeating them, at the cost of a query that breaks quietly if the select list is reordered.",
      ],
      instructions: [
        { kind: "heading", text: "Monthly revenue per product" },
        {
          kind: "prose",
          spans: [
            "Join the three tables and total revenue for every product in every calendar month. Revenue is quantity times unit price, summed, rounded to 2 decimal places. Count only orders whose status is ",
            { code: "'completed'" },
            ".",
          ],
        },
        {
          kind: "prose",
          spans: [
            "SQLite has no ",
            { code: "date_trunc" },
            ", so truncate the order date with ",
            { code: "strftime('%Y-%m-01', o.order_date)" },
            " to get the first of the month.",
          ],
        },
        { kind: "label", text: "Return these columns" },
        {
          kind: "columns",
          rows: [
            { name: "month", type: "text" },
            { name: "product_name", type: "text" },
            { name: "revenue", type: "real" },
          ],
        },
      ],
      starterCode: `SELECT
FROM order_items i
JOIN orders   o ON o.order_id = i.order_id
JOIN products p ON p.product_id = i.product_id
`,
      solutionCode: MONTHLY,
      tests: [
        {
          id: "columns",
          name: "Returns month, product_name and revenue",
          description: "In that order, with those names.",
          expectedColumns: ["month", "product_name", "revenue"],
        },
        {
          id: "rowcount",
          name: "One row per product per month",
          description: "Three months of completed orders.",
          expectedRowCount: 18,
        },
        {
          id: "matches",
          name: "Totals match the reference result",
          description:
            "Cancelled orders excluded, revenue rounded to 2 places.",
          matchesSolution: true,
        },
      ],
    },
    {
      n: "02",
      title: "Rank in month",
      short: "Rank",
      solutionNote: [
        "The tiebreak is the part people miss. ",
        { code: "RANK()" },
        " gives tied rows the same number and skips the next one, so without a second sort key two products with equal revenue come back in whatever order the engine chose — and the report changes between runs. Reach for ",
        { code: "ROW_NUMBER()" },
        " instead when every row must get a distinct rank.",
      ],
      instructions: [
        { kind: "heading", text: "Rank products within each month" },
        {
          kind: "prose",
          spans: [
            "Take the monthly totals from step 1 and add a rank column. Within each month, rank products by revenue with the highest first. Where two products tie on revenue, the one whose name comes first alphabetically takes the lower rank number.",
          ],
        },
        {
          kind: "prose",
          spans: [
            "Return one row per product per month — do not filter anything out yet, step 3 handles the cut.",
          ],
        },
        { kind: "label", text: "Return these columns" },
        {
          kind: "columns",
          rows: [
            { name: "month", type: "text" },
            { name: "product_name", type: "text" },
            { name: "revenue", type: "real" },
            { name: "revenue_rank", type: "integer" },
          ],
        },
      ],
      starterCode: `WITH monthly AS (
${indent(MONTHLY)}
)
SELECT month, product_name, revenue
FROM monthly
`,
      solutionCode: `WITH monthly AS (
${indent(MONTHLY)}
)
SELECT month, product_name, revenue,
       RANK() OVER (PARTITION BY month
                    ORDER BY revenue DESC, product_name) AS revenue_rank
FROM monthly`,
      tests: [
        {
          id: "columns",
          name: "Adds a revenue_rank column",
          expectedColumns: ["month", "product_name", "revenue", "revenue_rank"],
        },
        {
          id: "rowcount",
          name: "Still one row per product per month",
          description: "Ranking must not drop rows.",
          expectedRowCount: 18,
        },
        {
          id: "matches",
          name: "Ranks match the reference result",
          description:
            "Ranks restart at 1 each month, and ties break by product name.",
          matchesSolution: true,
        },
      ],
    },
    {
      n: "03",
      title: "Top three",
      short: "Top 3",
      solutionNote: [
        "Filtering on the rank has to happen outside the window: a window function is computed after ",
        { code: "WHERE" },
        ", so ",
        { code: "WHERE revenue_rank <= 3" },
        " in the same select cannot see it. Wrapping the ranked rows in a CTE and filtering the CTE is the standard way round it — what a database with ",
        { code: "QUALIFY" },
        " lets you write in one clause.",
      ],
      instructions: [
        { kind: "heading", text: "Keep the top three" },
        {
          kind: "prose",
          spans: [
            "Cut each month down to its three best-selling products, and order the report by month, then by rank.",
          ],
        },
        {
          kind: "prose",
          spans: [
            "Three months with three products each, so the finished report is nine rows.",
          ],
        },
      ],
      starterCode: `${RANK_CTE}
SELECT month, product_name, revenue, revenue_rank
FROM ranked
`,
      solutionCode: `${RANK_CTE}
SELECT month, product_name, revenue, revenue_rank
FROM ranked
WHERE revenue_rank <= 3
ORDER BY month, revenue_rank`,
      tests: [
        {
          id: "columns",
          name: "Returns the report's four columns",
          expectedColumns: ["month", "product_name", "revenue", "revenue_rank"],
        },
        {
          id: "rowcount",
          name: "Nine rows: three months, three products each",
          expectedRowCount: 9,
        },
        {
          id: "ordered",
          name: "Ordered by month, then rank",
          description: "The report reads top-to-bottom in reporting order.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
};
