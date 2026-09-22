/**
 * Multi-step SQL challenges.
 *
 * The step rail is the point of these: one report, built in three passes, each
 * gated behind the last. A step's starter is the previous step's accepted
 * query, so the learner is never retyping what already works — they add one
 * idea and submit again.
 *
 * That shape is why the CTE bodies below are shared constants rather than
 * copied strings. Step 2's starter and step 3's CTE are literally step 1's
 * solution; keeping them as one value means a fix to step 1 cannot leave the
 * later steps quoting a query that no longer exists.
 *
 * Every step's solution runs against node:sqlite in
 * `__tests__/challengeSolutions`, so an expectation that disagrees with the
 * seed data fails CI.
 */

import { indentSql, sqlSteps } from "./authoring";
import { EVENTS, HR, RETAIL } from "./datasets";
import type { Challenge } from "./types";

// ─── Department pay gap ──────────────────────────────────────────────

const DEPT_AVG = `SELECT d.dept_name,
       COUNT(*) AS headcount,
       ROUND(AVG(e.salary), 2) AS avg_salary
FROM employees e
JOIN departments d ON d.dept_id = e.dept_id
GROUP BY d.dept_id, d.dept_name
ORDER BY d.dept_name`;

const DEPT_RANK = `SELECT d.dept_name,
       e.full_name,
       e.salary,
       RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS pay_rank
FROM employees e
JOIN departments d ON d.dept_id = e.dept_id
ORDER BY d.dept_name, pay_rank`;

const DEPT_GAP_CTE = `WITH averages AS (
  SELECT dept_id, ROUND(AVG(salary), 2) AS avg_salary
  FROM employees
  GROUP BY dept_id
), ranked AS (
  SELECT dept_id, full_name, salary,
         RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS pay_rank
  FROM employees
)`;

const DEPARTMENT_PAY_GAP = sqlSteps(
  {
    slug: "department-pay-gap",
    title: "Department Pay Gap",
    difficulty: "Intermediate",
    topic: "Window functions",
    dataset: HR,
    description:
      "Build a pay report in three passes: department averages, a salary rank inside each department, then how far each department's top earner sits above its average.",
    solutionNote: [
      "Two different aggregations over the same table — one per department, one per employee — is what CTEs are for. Computing the average with a window function instead (",
      { code: "AVG(salary) OVER (PARTITION BY dept_id)" },
      ") gets the same answer in one pass, and is worth writing out once you have this version working.",
    ],
  },
  [
    {
      title: "Department averages",
      short: "Averages",
      solutionNote: [
        "Grouping by ",
        { code: "d.dept_id, d.dept_name" },
        " rather than the name alone is the habit worth keeping: the id is what guarantees one row per department, and the name only rides along so it can be selected. Two departments sharing a name would collapse into one row otherwise.",
      ],
      prompt: [
        "Start with the shape of each department: how many people are in it and what they earn on average.",
        [
          "Round the average to 2 decimal places, and sort by department name so the report is stable.",
        ],
      ],
      columns: [
        { name: "dept_name", type: "text" },
        { name: "headcount", type: "integer" },
        { name: "avg_salary", type: "real" },
      ],
      starter: `SELECT d.dept_name
FROM employees e
JOIN departments d ON d.dept_id = e.dept_id
`,
      solution: DEPT_AVG,
      tests: [
        {
          id: "columns",
          name: "Returns dept_name, headcount and avg_salary",
          description: "In that order, with those names.",
          expectedColumns: ["dept_name", "headcount", "avg_salary"],
        },
        {
          id: "rowcount",
          name: "One row per department",
          description: "Four departments, all of them staffed.",
          expectedRowCount: 4,
        },
        {
          id: "matches",
          name: "Counts and averages match the reference result",
          matchesSolution: true,
        },
      ],
    },
    {
      title: "Rank inside the department",
      short: "Rank",
      solutionNote: [
        { code: "PARTITION BY" },
        " is what restarts the numbering at each department; without it you get one ranking across the whole company. Which ranking function you want depends on ties: ",
        { code: "RANK" },
        " gives equal rows the same number and skips the next, ",
        { code: "DENSE_RANK" },
        " does not skip, and ",
        { code: "ROW_NUMBER" },
        " refuses to tie at all.",
      ],
      prompt: [
        [
          "Now go back to individual employees and number them by pay within their own department — highest paid is ",
          { code: "pay_rank" },
          " 1, and the numbering restarts for every department.",
        ],
        "Keep all fourteen employees. Sort by department name, then by rank.",
      ],
      columns: [
        { name: "dept_name", type: "text" },
        { name: "full_name", type: "text" },
        { name: "salary", type: "integer" },
        { name: "pay_rank", type: "integer" },
      ],
      starter: `SELECT d.dept_name,
       e.full_name,
       e.salary
FROM employees e
JOIN departments d ON d.dept_id = e.dept_id
ORDER BY d.dept_name
`,
      solution: DEPT_RANK,
      tests: [
        {
          id: "columns",
          name: "Adds a pay_rank column",
          expectedColumns: ["dept_name", "full_name", "salary", "pay_rank"],
        },
        {
          id: "rowcount",
          name: "Still every employee",
          description: "Ranking must not drop anyone.",
          expectedRowCount: 14,
        },
        {
          id: "ordered",
          name: "Ranks restart in each department",
          description: "Read top to bottom: department, then rank.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Gap above the average",
      short: "Gap",
      solutionNote: [
        "Two different aggregations of the same table — one row per department, one per employee — is exactly what CTEs are for. Computing the average with a window function instead (",
        { code: "AVG(salary) OVER (PARTITION BY dept_id)" },
        ") gets the same answer in one pass, and is worth writing once this version works.",
      ],
      prompt: [
        "Put the two together. Keep only each department's top earner, attach that department's average salary, and add the difference between the two.",
        [
          "Sort by ",
          { code: "above_average" },
          " descending, so the widest gap leads the report.",
        ],
      ],
      columns: [
        { name: "dept_name", type: "text" },
        { name: "full_name", type: "text" },
        { name: "salary", type: "integer" },
        { name: "avg_salary", type: "real" },
        { name: "above_average", type: "real" },
      ],
      starter: `${DEPT_GAP_CTE}
SELECT d.dept_name, r.full_name, r.salary, a.avg_salary
FROM ranked r
JOIN averages a   ON a.dept_id = r.dept_id
JOIN departments d ON d.dept_id = r.dept_id
`,
      solution: `${DEPT_GAP_CTE}
SELECT d.dept_name, r.full_name, r.salary, a.avg_salary,
       ROUND(r.salary - a.avg_salary, 2) AS above_average
FROM ranked r
JOIN averages a   ON a.dept_id = r.dept_id
JOIN departments d ON d.dept_id = r.dept_id
WHERE r.pay_rank = 1
ORDER BY above_average DESC`,
      tests: [
        {
          id: "columns",
          name: "Returns the report's five columns",
          expectedColumns: [
            "dept_name",
            "full_name",
            "salary",
            "avg_salary",
            "above_average",
          ],
        },
        {
          id: "rowcount",
          name: "One row per department",
          description: "Only the top earner survives the cut.",
          expectedRowCount: 4,
        },
        {
          id: "ordered",
          name: "Widest gap first",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

// ─── Signup funnel ───────────────────────────────────────────────────

const FUNNEL_FLAGS = `SELECT user_id,
       MAX(CASE WHEN event_name = 'view'   THEN 1 ELSE 0 END) AS viewed,
       MAX(CASE WHEN event_name = 'click'  THEN 1 ELSE 0 END) AS clicked,
       MAX(CASE WHEN event_name = 'signup' THEN 1 ELSE 0 END) AS signed_up
FROM events
GROUP BY user_id
ORDER BY user_id`;

/** Step 1's query without its ORDER BY, so it nests cleanly as a CTE. */
const FUNNEL_FLAGS_CTE = FUNNEL_FLAGS.replace("\nORDER BY user_id", "");

const FUNNEL_TOTALS_BODY = `SELECT SUM(viewed) AS viewers, SUM(clicked) AS clickers, SUM(signed_up) AS signups
FROM per_user`;

const FUNNEL_TOTALS = `WITH per_user AS (
${indentSql(FUNNEL_FLAGS_CTE)}
)
${FUNNEL_TOTALS_BODY}`;

const FUNNEL_STAGES_CTE = `WITH per_user AS (
${indentSql(FUNNEL_FLAGS_CTE)}
), totals AS (
${indentSql(FUNNEL_TOTALS_BODY)}
)`;

const SIGNUP_FUNNEL = sqlSteps(
  {
    slug: "signup-funnel",
    title: "Signup Funnel",
    difficulty: "Intermediate",
    topic: "Conditional aggregation",
    dataset: EVENTS,
    description:
      "Turn a flat event log into a three-stage funnel: flag what each visitor did, total the stages, then report each stage as a share of everyone who looked.",
    solutionNote: [
      { code: "MAX(CASE WHEN … THEN 1 ELSE 0 END)" },
      " is the standard way to collapse an event log into one row per actor: the ",
      { code: "MAX" },
      ' turns "any row matched" into a 1. Summing those flags then counts distinct users per stage without a single ',
      { code: "COUNT(DISTINCT …)" },
      ".",
    ],
  },
  [
    {
      title: "Flag each visitor",
      short: "Flags",
      solutionNote: [
        { code: "MAX(CASE WHEN … THEN 1 ELSE 0 END)" },
        " is the standard way to collapse an event log into one row per actor: the ",
        { code: "MAX" },
        ' turns "any row matched" into a 1, so a visitor who viewed five pages still scores a single 1 rather than a 5.',
      ],
      prompt: [
        [
          "The ",
          { code: "events" },
          " table has one row per action. Collapse it to one row per visitor, with a 1 or a 0 for each of the three things they might have done: viewed a page, clicked, signed up.",
        ],
        "A visitor who viewed five pages still gets a single 1. Sort by user id.",
      ],
      columns: [
        { name: "user_id", type: "integer" },
        { name: "viewed", type: "integer" },
        { name: "clicked", type: "integer" },
        { name: "signed_up", type: "integer" },
      ],
      starter: `SELECT user_id
FROM events
GROUP BY user_id
ORDER BY user_id
`,
      solution: FUNNEL_FLAGS,
      tests: [
        {
          id: "columns",
          name: "Returns user_id, viewed, clicked and signed_up",
          expectedColumns: ["user_id", "viewed", "clicked", "signed_up"],
        },
        {
          id: "rowcount",
          name: "One row per visitor",
          description: "Six visitors appear in the log.",
          expectedRowCount: 6,
        },
        {
          id: "matches",
          name: "Flags match the reference result",
          description: "Each flag is 1 or 0, never a count.",
          matchesSolution: true,
        },
      ],
    },
    {
      title: "Total the stages",
      short: "Totals",
      solutionNote: [
        "Because each flag is already 1 or 0, a plain ",
        { code: "SUM" },
        " counts visitors rather than events — no ",
        { code: "COUNT(DISTINCT …)" },
        " anywhere, and no second pass over the log. That is the payoff for the shape step 1 put the data into.",
      ],
      prompt: [
        "Now add the flags up. One row, three numbers: how many visitors viewed, how many clicked, how many signed up.",
        "Because each flag is 1 or 0, a plain sum counts visitors rather than events.",
      ],
      columns: [
        { name: "viewers", type: "integer" },
        { name: "clickers", type: "integer" },
        { name: "signups", type: "integer" },
      ],
      starter: `WITH per_user AS (
${indentSql(FUNNEL_FLAGS_CTE)}
)
SELECT
FROM per_user
`,
      solution: FUNNEL_TOTALS,
      tests: [
        {
          id: "columns",
          name: "Returns viewers, clickers and signups",
          expectedColumns: ["viewers", "clickers", "signups"],
        },
        {
          id: "rowcount",
          name: "A single summary row",
          expectedRowCount: 1,
        },
        {
          id: "matches",
          name: "Totals match the reference result",
          matchesSolution: true,
        },
      ],
    },
    {
      title: "Report the funnel",
      short: "Funnel",
      solutionNote: [
        { code: "UNION ALL" },
        " pivots one wide row into three tall ones, which is what turns three numbers into something that reads as a funnel. The ",
        { code: "ord" },
        " column is not decoration: ",
        { code: "UNION ALL" },
        " makes no promise about row order, so without an explicit sort key the stages can come back shuffled.",
      ],
      prompt: [
        "Three numbers side by side are hard to read as a funnel. Pivot them into three rows — one per stage — with the stage name, the number of visitors, and that stage as a percentage of everyone who viewed.",
        [
          "Stack the three stages with ",
          { code: "UNION ALL" },
          ", round the percentage to 1 decimal place, and make sure the rows come out in funnel order: viewed, clicked, signed_up.",
        ],
      ],
      columns: [
        { name: "stage", type: "text" },
        { name: "users", type: "integer" },
        { name: "pct_of_viewers", type: "real" },
      ],
      starter: `${FUNNEL_STAGES_CTE}
SELECT 'viewed' AS stage, viewers AS users, 100.0 AS pct_of_viewers
FROM totals
`,
      solution: `${FUNNEL_STAGES_CTE}
SELECT stage, users, pct_of_viewers
FROM (
  SELECT 1 AS ord, 'viewed'    AS stage, viewers  AS users,
         ROUND(100.0 * viewers  / viewers, 1) AS pct_of_viewers FROM totals
  UNION ALL
  SELECT 2, 'clicked',   clickers,
         ROUND(100.0 * clickers / viewers, 1) FROM totals
  UNION ALL
  SELECT 3, 'signed_up', signups,
         ROUND(100.0 * signups  / viewers, 1) FROM totals
)
ORDER BY ord`,
      tests: [
        {
          id: "columns",
          name: "Returns stage, users and pct_of_viewers",
          expectedColumns: ["stage", "users", "pct_of_viewers"],
        },
        {
          id: "rowcount",
          name: "Three rows, one per stage",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Stages read in funnel order",
          description: "viewed, then clicked, then signed_up.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

// ─── Monthly order growth ────────────────────────────────────────────

const GROWTH_MONTHLY = `SELECT strftime('%Y-%m', o.order_date) AS month,
       COUNT(DISTINCT o.order_id) AS orders,
       ROUND(SUM(i.quantity * i.unit_price), 2) AS revenue
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY month
ORDER BY month`;

const GROWTH_MONTHLY_CTE = GROWTH_MONTHLY.replace("\nORDER BY month", "");

const GROWTH_LAG_BODY = `SELECT month, orders, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue
FROM monthly`;

const GROWTH_LAG = `WITH monthly AS (
${indentSql(GROWTH_MONTHLY_CTE)}
)
${GROWTH_LAG_BODY}
ORDER BY month`;

const GROWTH_PCT_CTE = `WITH monthly AS (
${indentSql(GROWTH_MONTHLY_CTE)}
), with_prev AS (
${indentSql(GROWTH_LAG_BODY)}
)`;

const MONTHLY_ORDER_GROWTH = sqlSteps(
  {
    slug: "monthly-order-growth",
    title: "Monthly Order Growth",
    difficulty: "Intermediate",
    topic: "Window functions",
    dataset: RETAIL,
    description:
      "Compare each month to the one before it: monthly totals, then the previous month alongside, then the growth rate.",
    solutionNote: [
      { code: "LAG()" },
      " reaches backwards inside a window, which is why the first month's ",
      { code: "prev_revenue" },
      " is NULL rather than zero — there is no earlier row to read. Filtering that row out in the last step is deliberate: a growth rate against nothing is not 0%, it is undefined.",
    ],
  },
  [
    {
      title: "Monthly totals",
      short: "Totals",
      solutionNote: [
        "The join to ",
        { code: "order_items" },
        " multiplies each order by its line count, so a plain ",
        { code: "COUNT(*)" },
        " would report line items and call them orders. ",
        { code: "COUNT(DISTINCT o.order_id)" },
        " is what survives the fan-out, and it is the single most common way a revenue report ends up wrong.",
      ],
      prompt: [
        [
          "Total the completed orders by calendar month. SQLite has no ",
          { code: "date_trunc" },
          ", so group by ",
          { code: "strftime('%Y-%m', o.order_date)" },
          ".",
        ],
        [
          "Revenue is quantity times unit price, summed and rounded to 2 places. Because the join to ",
          { code: "order_items" },
          " multiplies order rows, count orders with ",
          { code: "COUNT(DISTINCT o.order_id)" },
          ".",
        ],
      ],
      columns: [
        { name: "month", type: "text" },
        { name: "orders", type: "integer" },
        { name: "revenue", type: "real" },
      ],
      starter: `SELECT
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
WHERE o.status = 'completed'
`,
      solution: GROWTH_MONTHLY,
      tests: [
        {
          id: "columns",
          name: "Returns month, orders and revenue",
          expectedColumns: ["month", "orders", "revenue"],
        },
        {
          id: "rowcount",
          name: "Three months of completed orders",
          expectedRowCount: 3,
        },
        {
          id: "matches",
          name: "Totals match the reference result",
          description: "Cancelled orders excluded; orders counted once each.",
          matchesSolution: true,
        },
      ],
    },
    {
      title: "Bring the previous month alongside",
      short: "Previous",
      solutionNote: [
        { code: "LAG()" },
        " reaches backwards inside a window, which is why it needs an ",
        { code: "ORDER BY" },
        " to know what backwards means. The earliest month's value is NULL because there is genuinely no earlier row, not zero, which would claim the shop took nothing that month.",
      ],
      prompt: [
        [
          "Add a ",
          { code: "prev_revenue" },
          " column holding the revenue of the month before. ",
          { code: "LAG()" },
          " over the months in date order does it without a self join.",
        ],
        "The earliest month has nothing before it, so its value is NULL. Leave it that way — step 3 deals with it.",
      ],
      columns: [
        { name: "month", type: "text" },
        { name: "orders", type: "integer" },
        { name: "revenue", type: "real" },
        { name: "prev_revenue", type: "real" },
      ],
      starter: `WITH monthly AS (
${indentSql(GROWTH_MONTHLY_CTE)}
)
SELECT month, orders, revenue
FROM monthly
ORDER BY month
`,
      solution: GROWTH_LAG,
      tests: [
        {
          id: "columns",
          name: "Adds a prev_revenue column",
          expectedColumns: ["month", "orders", "revenue", "prev_revenue"],
        },
        {
          id: "rowcount",
          name: "Still three months",
          description: "Looking backwards must not drop the first row.",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Each row carries the month before it",
          description: "The earliest month's prev_revenue is NULL.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Growth rate",
      short: "Growth",
      solutionNote: [
        "Dropping the first month is the judgement call. A growth rate against a month that does not exist is undefined rather than 0%, and reporting it as 0% would draw a flat line where the data simply starts.",
      ],
      prompt: [
        [
          "Finish the report: month, revenue, prev_revenue, and ",
          { code: "growth_pct" },
          " — the change from the previous month as a percentage of it, rounded to 1 decimal place.",
        ],
        "Drop the earliest month, which has nothing to compare against. Sort by month.",
      ],
      columns: [
        { name: "month", type: "text" },
        { name: "revenue", type: "real" },
        { name: "prev_revenue", type: "real" },
        { name: "growth_pct", type: "real" },
      ],
      starter: `${GROWTH_PCT_CTE}
SELECT month, revenue, prev_revenue
FROM with_prev
ORDER BY month
`,
      solution: `${GROWTH_PCT_CTE}
SELECT month, revenue, prev_revenue,
       ROUND(100.0 * (revenue - prev_revenue) / prev_revenue, 1) AS growth_pct
FROM with_prev
WHERE prev_revenue IS NOT NULL
ORDER BY month`,
      tests: [
        {
          id: "columns",
          name: "Returns the report's four columns",
          expectedColumns: ["month", "revenue", "prev_revenue", "growth_pct"],
        },
        {
          id: "rowcount",
          name: "Two comparable months",
          description: "The first month has no predecessor and is dropped.",
          expectedRowCount: 2,
        },
        {
          id: "ordered",
          name: "Growth rates match the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

// ─── Customer revenue Pareto ─────────────────────────────────────────

const PARETO_TOTALS = `SELECT c.full_name,
       COUNT(DISTINCT o.order_id) AS orders,
       ROUND(SUM(i.quantity * i.unit_price), 2) AS revenue
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
JOIN customers  c ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.customer_id, c.full_name
ORDER BY revenue DESC`;

const PARETO_TOTALS_CTE = PARETO_TOTALS.replace("\nORDER BY revenue DESC", "");

const PARETO_SHARE_BODY = `SELECT full_name, orders, revenue,
       ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) AS pct_of_total
FROM per_customer`;

const PARETO_SHARE = `WITH per_customer AS (
${indentSql(PARETO_TOTALS_CTE)}
)
${PARETO_SHARE_BODY}
ORDER BY revenue DESC`;

const PARETO_TIER_CTE = `WITH per_customer AS (
${indentSql(PARETO_TOTALS_CTE)}
), shares AS (
  SELECT full_name, revenue,
         ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) AS pct_of_total,
         ROUND(100.0 * SUM(revenue) OVER (ORDER BY revenue DESC, full_name)
                     / SUM(revenue) OVER (), 1) AS cumulative_pct
  FROM per_customer
)`;

const CUSTOMER_REVENUE_PARETO = sqlSteps(
  {
    slug: "customer-revenue-pareto",
    title: "Customer Revenue Pareto",
    difficulty: "Advanced",
    topic: "Window frames",
    dataset: RETAIL,
    description:
      "Find the customers who make up the bulk of revenue: totals per customer, each one's share, then a running share that splits the list into core and tail.",
    solutionNote: [
      "The trick is two windows in one query. ",
      { code: "SUM(revenue) OVER ()" },
      " with an empty window is the grand total on every row; add an ",
      { code: "ORDER BY" },
      " to the same window and it becomes a running total, because an ordered window defaults to a frame of everything up to the current row. Divide one by the other and you have the Pareto curve.",
    ],
  },
  [
    {
      title: "Revenue per customer",
      short: "Revenue",
      solutionNote: [
        "Grouping by customer id and name together is what keeps two customers who share a name apart. Counting orders with ",
        { code: "COUNT(DISTINCT o.order_id)" },
        " matters for the same reason it does in the monthly report: the item join has already multiplied the rows.",
      ],
      prompt: [
        "Total what each customer has spent across their completed orders, and how many orders that was.",
        "Revenue is quantity times unit price, summed and rounded to 2 places. Sort by revenue, biggest spender first.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "orders", type: "integer" },
        { name: "revenue", type: "real" },
      ],
      starter: `SELECT c.full_name
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
JOIN customers  c ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
`,
      solution: PARETO_TOTALS,
      tests: [
        {
          id: "columns",
          name: "Returns full_name, orders and revenue",
          expectedColumns: ["full_name", "orders", "revenue"],
        },
        {
          id: "rowcount",
          name: "One row per customer",
          description: "All five customers have completed orders.",
          expectedRowCount: 5,
        },
        {
          id: "ordered",
          name: "Biggest spender first",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Share of total revenue",
      short: "Share",
      solutionNote: [
        { code: "SUM(revenue) OVER ()" },
        " with no partition and no order is the grand total, repeated on every row. That is what lets a share be computed in the same pass that produced the totals, with no self join and no second query.",
      ],
      prompt: [
        [
          "Add ",
          { code: "pct_of_total" },
          ": each customer's revenue as a percentage of revenue from everyone, rounded to 1 decimal place.",
        ],
        [
          "You need the grand total on every row. A window function with an empty frame — ",
          { code: "SUM(revenue) OVER ()" },
          " — gives you exactly that, with no second pass over the table.",
        ],
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "orders", type: "integer" },
        { name: "revenue", type: "real" },
        { name: "pct_of_total", type: "real" },
      ],
      starter: `WITH per_customer AS (
${indentSql(PARETO_TOTALS_CTE)}
)
SELECT full_name, orders, revenue
FROM per_customer
ORDER BY revenue DESC
`,
      solution: PARETO_SHARE,
      tests: [
        {
          id: "columns",
          name: "Adds a pct_of_total column",
          expectedColumns: ["full_name", "orders", "revenue", "pct_of_total"],
        },
        {
          id: "rowcount",
          name: "Still one row per customer",
          expectedRowCount: 5,
        },
        {
          id: "ordered",
          name: "Shares match the reference result",
          description: "The five percentages add up to 100.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Core and tail",
      short: "Tiers",
      solutionNote: [
        "The same window function, now ordered, becomes a running total: an ordered window defaults to a frame covering everything from the start up to the current row. Divide the running total by the grand total and you have the Pareto curve. Adding ",
        { code: "full_name" },
        " as a second sort key keeps that running total deterministic when two customers tie.",
      ],
      prompt: [
        [
          "Add a running share — ",
          { code: "cumulative_pct" },
          ", the percentage of revenue accounted for by this customer and everyone above them — and label each row ",
          { code: "'core'" },
          " while that running share is at or below 80, ",
          { code: "'tail'" },
          " after it passes.",
        ],
        [
          "Same window function as step 2, but ordered: ",
          { code: "SUM(revenue) OVER (ORDER BY revenue DESC, full_name)" },
          ". Drop the ",
          { code: "orders" },
          " column — the finished report is name, revenue, share, running share, tier.",
        ],
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "revenue", type: "real" },
        { name: "pct_of_total", type: "real" },
        { name: "cumulative_pct", type: "real" },
        { name: "tier", type: "text" },
      ],
      starter: `${PARETO_TIER_CTE}
SELECT full_name, revenue, pct_of_total, cumulative_pct
FROM shares
ORDER BY revenue DESC
`,
      solution: `${PARETO_TIER_CTE}
SELECT full_name, revenue, pct_of_total, cumulative_pct,
       CASE WHEN cumulative_pct <= 80 THEN 'core' ELSE 'tail' END AS tier
FROM shares
ORDER BY revenue DESC`,
      tests: [
        {
          id: "columns",
          name: "Returns the report's five columns",
          expectedColumns: [
            "full_name",
            "revenue",
            "pct_of_total",
            "cumulative_pct",
            "tier",
          ],
        },
        {
          id: "rowcount",
          name: "Still one row per customer",
          description: "Tiering labels rows, it does not filter them.",
          expectedRowCount: 5,
        },
        {
          id: "ordered",
          name: "The running share reaches 100 on the last row",
          description: "Three customers land in core, two in the tail.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

export const SQL_MULTI: Challenge[] = [
  DEPARTMENT_PAY_GAP,
  SIGNUP_FUNNEL,
  MONTHLY_ORDER_GROWTH,
  CUSTOMER_REVENUE_PARETO,
];
