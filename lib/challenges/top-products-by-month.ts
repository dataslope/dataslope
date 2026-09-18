/**
 * "Top Products by Month" — the multi-step SQL challenge.
 *
 * Three gated steps over one problem: monthly revenue per product, rank
 * within each month, then cut to the top three. Authored mid-problem (step 1
 * passed, step 2 open with two of three checks passing) because that is the
 * state the workspace design is specified against.
 *
 * Results are authored rather than executed. When the workspace gets a real
 * runtime, `output`, `tests` and `submissions` become its outputs; the rest
 * of this file is the problem itself and does not change.
 */

import type { Challenge, SchemaTable, TableColumn } from "./types";

const ORDER_SCHEMA: SchemaTable[] = [
  {
    name: "orders",
    rows: "18,402",
    columns: [
      { name: "order_id", type: "integer", key: "pk" },
      { name: "customer_id", type: "integer" },
      { name: "order_date", type: "date" },
      { name: "status", type: "text" },
    ],
  },
  {
    name: "order_items",
    rows: "61,155",
    columns: [
      { name: "order_id", type: "integer", key: "fk" },
      { name: "product_id", type: "integer", key: "fk" },
      { name: "quantity", type: "integer" },
      { name: "unit_price", type: "numeric" },
    ],
  },
  {
    name: "products",
    rows: "92",
    columns: [
      { name: "product_id", type: "integer", key: "pk" },
      { name: "product_name", type: "text" },
      { name: "category", type: "text" },
      { name: "unit_cost", type: "numeric" },
    ],
  },
];

const STEP_1_SQL = `SELECT date_trunc('month', o.order_date) AS month,
       p.product_name,
       SUM(i.quantity * i.unit_price) AS revenue
FROM order_items i
JOIN orders   o USING (order_id)
JOIN products p USING (product_id)
GROUP BY 1, 2;`;

const STEP_2_SQL = `WITH monthly AS (
  SELECT date_trunc('month', o.order_date) AS month,
         p.product_name,
         SUM(i.quantity * i.unit_price) AS revenue
  FROM order_items i
  JOIN orders   o USING (order_id)
  JOIN products p USING (product_id)
  WHERE o.status = 'completed'
  GROUP BY 1, 2
)
SELECT month, product_name, revenue,
       RANK() OVER (PARTITION BY month ORDER BY revenue DESC)
         AS revenue_rank
FROM monthly;`;

const RESULT_COLUMNS: TableColumn[] = [
  { key: "month", label: "month" },
  { key: "product", label: "product_name" },
  { key: "revenue", label: "revenue", align: "right" },
  { key: "rank", label: "revenue_rank", align: "right" },
];

const RESULT_ROWS = [
  { month: "2024-01-01", product: "Cold Brew Concentrate", revenue: "48210.00", rank: "1" },
  { month: "2024-01-01", product: "Oat Milk 1L", revenue: "39880.50", rank: "2" },
  { month: "2024-01-01", product: "Espresso Beans 250g", revenue: "31405.75", rank: "3" },
  { month: "2024-01-01", product: "Paper Cups 12oz", revenue: "12040.00", rank: "4" },
  { month: "2024-02-01", product: "Cold Brew Concentrate", revenue: "51033.20", rank: "1" },
  { month: "2024-02-01", product: "Espresso Beans 250g", revenue: "40118.00", rank: "2" },
  { month: "2024-02-01", product: "Oat Milk 1L", revenue: "40118.00", rank: "3" },
  { month: "2024-02-01", product: "Syrup Vanilla 750ml", revenue: "18760.40", rank: "4" },
];

export const TOP_PRODUCTS_BY_MONTH: Challenge = {
  slug: "top-products-by-month",
  title: "Top Products by Month",
  difficulty: "Intermediate",
  catalog: {
    topic: "Window functions",
    // The workspace runs on sqlite, so the row says SQLite. The list mock
    // said PostgreSQL + DuckDB; the page it links to wins.
    langs: ["sqlite"],
    status: "attempted",
    acceptance: 58,
  },
  languageLabel: "SQL",
  description:
    "Break a monthly revenue ranking into three gated steps: total revenue per product per month, rank within each month, then cut to the top three.",
  submitLabel: "Submit step",
  steps: [
    {
      n: "01",
      title: "Monthly revenue",
      short: "Revenue",
      state: "passed",
      source: STEP_1_SQL,
      sourceMuted: true,
      instructions: [
        { kind: "banner", text: "Passed on your second submission" },
        { kind: "heading", text: "Monthly revenue per product" },
        {
          kind: "prose",
          spans: [
            "Join the three tables and total revenue for every product in every calendar month. Revenue is quantity times unit price, summed. Truncate order dates to the first of the month so months group cleanly.",
          ],
        },
        {
          kind: "prose",
          spans: [
            "Your accepted query returned 1,284 rows across 14 months. Step 2 builds on it.",
          ],
        },
      ],
    },
    {
      n: "02",
      title: "Rank in month",
      short: "Rank",
      state: "active",
      source: STEP_2_SQL,
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
            "Return one row per product per month. Do not filter anything out yet, step 3 handles the cut.",
          ],
        },
        { kind: "label", text: "Return these columns" },
        {
          kind: "columns",
          rows: [
            { name: "month", type: "date" },
            { name: "product_name", type: "text" },
            { name: "revenue", type: "numeric" },
            { name: "revenue_rank", type: "integer" },
          ],
        },
        { kind: "label", text: "Expected, first rows" },
        {
          kind: "table",
          columns: [
            { key: "month", label: "month" },
            { key: "product", label: "product_name" },
            { key: "revenue", label: "revenue", align: "right" },
            { key: "rank", label: "rank", align: "right" },
          ],
          rows: RESULT_ROWS.slice(0, 3),
        },
      ],
    },
    {
      n: "03",
      title: "Top three",
      short: "Top 3",
      state: "locked",
      instructions: [
        {
          kind: "locked",
          title: "Keep the top three",
          text: "Opens once step 2 passes. You will cut each month down to its three best products and format the output for the report.",
          backTo: 2,
          backLabel: "Back to step 2",
        },
      ],
    },
  ],
  instructions: [],
  languages: [
    {
      id: "sql",
      label: "SQL · sqlite",
      shortLabel: "SQL",
      runMeta: "sqlite · 0.42s · 1,067 rows",
      runTime: "0.42s",
      source: STEP_2_SQL,
    },
  ],
  schema: ORDER_SCHEMA,
  output: {
    kind: "table",
    columns: RESULT_COLUMNS,
    rows: RESULT_ROWS,
    footer: "Showing 8 of 1,067 rows",
  },
  tests: [
    {
      name: "Ranks restart at 1 in every month",
      detail: "14 months checked, each has exactly one rank = 1",
      pass: true,
    },
    {
      name: "Ties break by product name, ascending",
      detail: "3 tied pairs checked in 2024-02 and 2024-09",
      pass: true,
    },
    {
      name: "Row count matches your step 1 result",
      detail: "expected 1284 rows, got 1067",
      pass: false,
    },
  ],
  testsSummary: "2 of 3 checks passed",
  testsSubtitle: "Step 2 is not accepted yet",
  testsBadge: "2/3",
  solution: {
    spans: [
      "The tiebreak is the part people miss. ",
      { code: "RANK()" },
      " gives tied rows the same number and skips the next one, so add product name as a second sort key and use ",
      { code: "ROW_NUMBER()" },
      " when every row needs a distinct rank.",
    ],
    label: "Reference solution",
    language: "sql",
    source: `SELECT month, product_name, revenue,
       ROW_NUMBER() OVER (
         PARTITION BY month
         ORDER BY revenue DESC, product_name ASC
       ) AS revenue_rank
FROM monthly;`,
  },
  submissions: [
    { step: "Step 2", result: "Wrong answer", ok: false, lang: "SQL · sqlite", when: "2 min ago" },
    { step: "Step 2", result: "Runtime error", ok: false, lang: "SQL · sqlite", when: "9 min ago" },
    { step: "Step 1", result: "Accepted", ok: true, lang: "SQL · sqlite", when: "24 min ago" },
    { step: "Step 1", result: "Wrong answer", ok: false, lang: "SQL · sqlite", when: "38 min ago" },
  ],
  submissionColumns: ["step", "result", "lang", "when"],
  keyStrip: ["SELECT", "FROM", "JOIN", "WHERE", "GROUP BY", "OVER", "(", ")", ",", "*", "'"],
};
