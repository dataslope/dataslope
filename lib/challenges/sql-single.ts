/**
 * Single-query SQL challenges.
 *
 * Grouped in one module rather than fifty files: each is a dozen lines, and
 * reading them together is how an author notices that two challenges drill the
 * same idea. The dataset each one runs against is the shared seed from
 * `./datasets`, so adding a challenge here costs nothing to boot.
 *
 * Every solution below is executed against node:sqlite by
 * `__tests__/challengeSolutions`, and every check is evaluated with the same
 * grader the browser uses, so a wrong expectation fails CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { EVENTS, HR, RETAIL } from "./datasets";
import type { Challenge } from "./types";

export const SQL_SINGLE: Challenge[] = [
  // ─── Retail ────────────────────────────────────────────────────────
  sqlChallenge(
    {
      slug: "products-never-ordered",
      title: "Products Never Ordered",
      difficulty: "Beginner",
      topic: "Anti joins",
      dataset: RETAIL,
      description: "Find the catalogue entries that have never appeared on an order.",
      solutionNote: [
        "A ",
        { code: "LEFT JOIN" },
        " plus ",
        { code: "IS NULL" },
        " is the classic anti join: keep every product, then throw away the ones that found a match. ",
        { code: "NOT EXISTS" },
        " reads better to some eyes and optimises the same way.",
      ],
    },
    {
      prompt: [
        "Some products sit in the catalogue without ever selling. List the name of every product that has no row in `order_items` at all.",
        "Sort by product name.",
      ],
      columns: [{ name: "product_name", type: "text" }],
      starter: `SELECT p.product_name
FROM products p
-- Keep only the products with no matching order item.
ORDER BY p.product_name
`,
      solution: `SELECT p.product_name
FROM products p
LEFT JOIN order_items i ON i.product_id = p.product_id
WHERE i.product_id IS NULL
ORDER BY p.product_name`,
      tests: resultShape(["product_name"], 1, "Exactly the products with no sales."),
    },
  ),

  sqlChallenge(
    {
      slug: "revenue-by-category",
      title: "Revenue by Category",
      difficulty: "Beginner",
      topic: "Joins and aggregation",
      dataset: RETAIL,
      description: "Total completed revenue for each product category, biggest first.",
    },
    {
      prompt: [
        "Total the revenue each product category brought in. Revenue is quantity times unit price, summed, rounded to 2 decimal places.",
        "Count only orders whose status is `completed`, and sort by revenue with the biggest first.",
      ],
      columns: [
        { name: "category", type: "text" },
        { name: "revenue", type: "real" },
      ],
      starter: `SELECT p.category
FROM order_items i
JOIN orders   o ON o.order_id = i.order_id
JOIN products p ON p.product_id = i.product_id
`,
      solution: `SELECT p.category,
       ROUND(SUM(i.quantity * i.unit_price), 2) AS revenue
FROM order_items i
JOIN orders   o ON o.order_id = i.order_id
JOIN products p ON p.product_id = i.product_id
WHERE o.status = 'completed'
GROUP BY p.category
ORDER BY revenue DESC`,
      tests: resultShape(["category", "revenue"], 5, "Cancelled orders excluded."),
    },
  ),

  sqlChallenge(
    {
      slug: "orders-per-city",
      title: "Orders per City",
      difficulty: "Beginner",
      topic: "Grouping",
      dataset: RETAIL,
      description: "Count completed orders by the customer's city.",
    },
    {
      prompt: [
        "How many completed orders came from each city? Join orders to customers, count per city, and sort by the count with the busiest city first.",
        "Break ties alphabetically by city.",
      ],
      columns: [
        { name: "city", type: "text" },
        { name: "order_count", type: "integer" },
      ],
      starter: `SELECT c.city
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
`,
      solution: `SELECT c.city, COUNT(*) AS order_count
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.city
ORDER BY order_count DESC, c.city`,
      tests: resultShape(["city", "order_count"], 3, "Cancelled orders do not count."),
    },
  ),

  sqlChallenge(
    {
      slug: "average-order-value",
      title: "Average Order Value",
      difficulty: "Intermediate",
      topic: "Nested aggregation",
      dataset: RETAIL,
      description: "Average the per-order total: an aggregate over an aggregate.",
      solutionNote: [
        "You cannot average the item rows directly: that would weight big baskets by how many lines they have. Total each order first in a subquery, then average those totals.",
      ],
    },
    {
      prompt: [
        "What is the average value of a completed order? Total each order first, then average those totals; averaging the item rows directly gives a different (and wrong) answer.",
        "Round to 2 decimal places.",
      ],
      columns: [{ name: "average_order_value", type: "real" }],
      starter: `SELECT ROUND(AVG(order_total), 2) AS average_order_value
FROM (
  -- Total each completed order here.
  SELECT 0 AS order_total
)
`,
      solution: `SELECT ROUND(AVG(order_total), 2) AS average_order_value
FROM (
  SELECT o.order_id, SUM(i.quantity * i.unit_price) AS order_total
  FROM orders o
  JOIN order_items i ON i.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY o.order_id
)`,
      tests: resultShape(["average_order_value"], 1, "Averaged per order, not per line."),
    },
  ),

  sqlChallenge(
    {
      slug: "repeat-customers",
      title: "Repeat Customers",
      difficulty: "Intermediate",
      topic: "HAVING",
      dataset: RETAIL,
      description: "Customers with four or more completed orders.",
      solutionNote: [
        { code: "WHERE" },
        " filters rows before grouping; ",
        { code: "HAVING" },
        " filters the groups afterwards. A count is only known after grouping, so it belongs in ",
        { code: "HAVING" },
        ".",
      ],
    },
    {
      prompt: [
        "Which customers have placed at least four completed orders? Return their name and how many orders they placed.",
        "Sort by the count, biggest first, then by name.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "order_count", type: "integer" },
      ],
      starter: `SELECT c.full_name, COUNT(*) AS order_count
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.customer_id, c.full_name
`,
      solution: `SELECT c.full_name, COUNT(*) AS order_count
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.customer_id, c.full_name
HAVING COUNT(*) >= 4
ORDER BY order_count DESC, c.full_name`,
      tests: resultShape(["full_name", "order_count"], 2, "Four or more, completed only."),
    },
  ),

  sqlChallenge(
    {
      slug: "largest-order-per-customer",
      title: "Largest Order per Customer",
      difficulty: "Intermediate",
      topic: "Correlated subqueries",
      dataset: RETAIL,
      description: "Each customer's single biggest completed order.",
    },
    {
      prompt: [
        "For every customer, find their largest completed order: the customer's name, the order id, and the order's total rounded to 2 decimal places.",
        "Sort by customer name.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "order_id", type: "integer" },
        { name: "order_total", type: "real" },
      ],
      starter: `WITH totals AS (
  SELECT o.customer_id, o.order_id,
         ROUND(SUM(i.quantity * i.unit_price), 2) AS order_total
  FROM orders o
  JOIN order_items i ON i.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY o.customer_id, o.order_id
)
SELECT c.full_name, t.order_id, t.order_total
FROM totals t
JOIN customers c ON c.customer_id = t.customer_id
ORDER BY c.full_name
`,
      solution: `WITH totals AS (
  SELECT o.customer_id, o.order_id,
         ROUND(SUM(i.quantity * i.unit_price), 2) AS order_total
  FROM orders o
  JOIN order_items i ON i.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY o.customer_id, o.order_id
)
SELECT c.full_name, t.order_id, t.order_total
FROM totals t
JOIN customers c ON c.customer_id = t.customer_id
WHERE t.order_total = (
  SELECT MAX(t2.order_total) FROM totals t2 WHERE t2.customer_id = t.customer_id
)
ORDER BY c.full_name`,
      tests: resultShape(["full_name", "order_id", "order_total"], 5, "One row per customer."),
    },
  ),

  sqlChallenge(
    {
      slug: "cancelled-order-rate",
      title: "Cancelled Order Rate",
      difficulty: "Intermediate",
      topic: "Conditional aggregation",
      dataset: RETAIL,
      description: "What share of all orders were cancelled.",
      solutionNote: [
        "Summing a ",
        { code: "CASE" },
        " that yields 1 or 0 counts matching rows without a second pass over the table. Multiply by ",
        { code: "100.0" },
        " (not ",
        { code: "100" },
        ") or integer division will floor the answer to zero.",
      ],
    },
    {
      prompt: [
        "What percentage of all orders were cancelled? Count cancelled orders as a share of every order in the table, rounded to 1 decimal place.",
        "Do it in a single pass: no subquery needed.",
      ],
      columns: [{ name: "cancelled_pct", type: "real" }],
      starter: `SELECT ROUND(0, 1) AS cancelled_pct
FROM orders
`,
      solution: `SELECT ROUND(
         100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*),
         1
       ) AS cancelled_pct
FROM orders`,
      tests: resultShape(["cancelled_pct"], 1, "Cancelled as a share of all orders."),
    },
  ),

  sqlChallenge(
    {
      slug: "running-monthly-revenue",
      title: "Running Monthly Revenue",
      difficulty: "Advanced",
      topic: "Window frames",
      dataset: RETAIL,
      description: "Monthly revenue with a cumulative total beside it.",
      solutionNote: [
        "A window ",
        { code: "SUM" },
        " with ",
        { code: "ORDER BY" },
        " and no explicit frame defaults to everything up to the current row, which is exactly a running total.",
      ],
    },
    {
      prompt: [
        "Total completed revenue per calendar month, and add a running total alongside it so the last row shows revenue for the whole period.",
        "Truncate the order date with `strftime('%Y-%m-01', o.order_date)`. Round both money columns to 2 decimal places and sort by month.",
      ],
      columns: [
        { name: "month", type: "text" },
        { name: "revenue", type: "real" },
        { name: "running_total", type: "real" },
      ],
      starter: `WITH monthly AS (
  SELECT strftime('%Y-%m-01', o.order_date) AS month,
         ROUND(SUM(i.quantity * i.unit_price), 2) AS revenue
  FROM orders o
  JOIN order_items i ON i.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY 1
)
SELECT month, revenue
FROM monthly
ORDER BY month
`,
      solution: `WITH monthly AS (
  SELECT strftime('%Y-%m-01', o.order_date) AS month,
         ROUND(SUM(i.quantity * i.unit_price), 2) AS revenue
  FROM orders o
  JOIN order_items i ON i.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY 1
)
SELECT month, revenue,
       ROUND(SUM(revenue) OVER (ORDER BY month), 2) AS running_total
FROM monthly
ORDER BY month`,
      tests: resultShape(["month", "revenue", "running_total"], 3, "The running total accumulates by month."),
    },
  ),

  // ─── People ────────────────────────────────────────────────────────
  sqlChallenge(
    {
      slug: "highest-paid-per-department",
      title: "Highest Paid per Department",
      difficulty: "Intermediate",
      topic: "Correlated subqueries",
      dataset: HR,
      description: "The top earner in each department.",
    },
    {
      prompt: [
        "Who earns the most in each department? Return the department name, the employee's name and their salary.",
        "Sort by department name.",
      ],
      columns: [
        { name: "dept_name", type: "text" },
        { name: "full_name", type: "text" },
        { name: "salary", type: "integer" },
      ],
      starter: `SELECT d.dept_name, e.full_name, e.salary
FROM employees e
JOIN departments d ON d.dept_id = e.dept_id
ORDER BY d.dept_name
`,
      solution: `SELECT d.dept_name, e.full_name, e.salary
FROM employees e
JOIN departments d ON d.dept_id = e.dept_id
WHERE e.salary = (
  SELECT MAX(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id
)
ORDER BY d.dept_name`,
      tests: resultShape(["dept_name", "full_name", "salary"], 4, "One top earner per department."),
    },
  ),

  sqlChallenge(
    {
      slug: "employees-above-average",
      title: "Above the Average",
      difficulty: "Beginner",
      topic: "Scalar subqueries",
      dataset: HR,
      description: "Everyone paid more than the company-wide average.",
    },
    {
      prompt: [
        "List everyone whose salary is above the average salary across the whole company, highest first.",
        "The average is a single number, so it belongs in a scalar subquery.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "salary", type: "integer" },
      ],
      starter: `SELECT full_name, salary
FROM employees
ORDER BY salary DESC
`,
      solution: `SELECT full_name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC`,
      tests: resultShape(["full_name", "salary"], 6, "Strictly above the average."),
    },
  ),

  sqlChallenge(
    {
      slug: "manager-headcount",
      title: "Manager Headcount",
      difficulty: "Intermediate",
      topic: "Self joins",
      dataset: HR,
      description: "How many direct reports each manager has.",
      solutionNote: [
        "Joining a table to itself needs two aliases so each side can be named. Here ",
        { code: "e" },
        " is the report and ",
        { code: "m" },
        " is their manager.",
      ],
    },
    {
      prompt: [
        "How many direct reports does each manager have? Join `employees` to itself: one side is the report, the other their manager.",
        "Return the manager's name and the count, biggest first, ties broken by name.",
      ],
      columns: [
        { name: "manager", type: "text" },
        { name: "reports", type: "integer" },
      ],
      starter: `SELECT m.full_name AS manager
FROM employees e
-- Join employees to itself to reach each report's manager.
`,
      solution: `SELECT m.full_name AS manager, COUNT(*) AS reports
FROM employees e
JOIN employees m ON m.employee_id = e.manager_id
GROUP BY m.employee_id, m.full_name
ORDER BY reports DESC, manager`,
      tests: resultShape(["manager", "reports"], 5, "Direct reports only."),
    },
  ),

  sqlChallenge(
    {
      slug: "salary-bands",
      title: "Salary Bands",
      difficulty: "Beginner",
      topic: "CASE expressions",
      dataset: HR,
      description: "Bucket salaries into bands and count each one.",
    },
    {
      prompt: [
        "Bucket everyone into a salary band (`senior` at 150,000 and above, `mid` at 100,000 and above, `junior` below that) and count how many people are in each.",
        "Sort by headcount, biggest first, then by band name.",
      ],
      columns: [
        { name: "band", type: "text" },
        { name: "headcount", type: "integer" },
      ],
      starter: `SELECT CASE
         -- Name the band for each salary here.
         ELSE 'junior'
       END AS band,
       COUNT(*) AS headcount
FROM employees
GROUP BY band
`,
      solution: `SELECT CASE
         WHEN salary >= 150000 THEN 'senior'
         WHEN salary >= 100000 THEN 'mid'
         ELSE 'junior'
       END AS band,
       COUNT(*) AS headcount
FROM employees
GROUP BY band
ORDER BY headcount DESC, band`,
      tests: resultShape(["band", "headcount"], 3, "Three bands, everyone counted once."),
    },
  ),

  sqlChallenge(
    {
      slug: "longest-tenure",
      title: "Longest Tenure",
      difficulty: "Beginner",
      topic: "Sorting and limits",
      dataset: HR,
      description: "The three longest-serving employees.",
    },
    {
      prompt: [
        "Who are the three longest-serving employees? Return their name and hire date, earliest first.",
        "Dates are stored as `YYYY-MM-DD` text, which sorts correctly as text.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "hired_on", type: "text" },
      ],
      starter: `SELECT full_name, hired_on
FROM employees
`,
      solution: `SELECT full_name, hired_on
FROM employees
ORDER BY hired_on
LIMIT 3`,
      tests: resultShape(["full_name", "hired_on"], 3, "The three earliest hires, in order."),
    },
  ),

  sqlChallenge(
    {
      slug: "earning-more-than-manager",
      title: "Earning More Than the Manager",
      difficulty: "Intermediate",
      topic: "Self joins",
      dataset: HR,
      description: "Reports who out-earn the person they report to.",
    },
    {
      prompt: [
        "Find every employee who earns more than their own manager. Return the employee's name, the manager's name, and the employee's salary.",
        "Sort by the employee's name.",
      ],
      columns: [
        { name: "employee", type: "text" },
        { name: "manager", type: "text" },
        { name: "salary", type: "integer" },
      ],
      starter: `SELECT e.full_name AS employee, m.full_name AS manager, e.salary
FROM employees e
JOIN employees m ON m.employee_id = e.manager_id
ORDER BY e.full_name
`,
      solution: `SELECT e.full_name AS employee, m.full_name AS manager, e.salary
FROM employees e
JOIN employees m ON m.employee_id = e.manager_id
WHERE e.salary > m.salary
ORDER BY e.full_name`,
      tests: resultShape(["employee", "manager", "salary"], 1, "Strictly more than the manager."),
    },
  ),

  // ─── Events ────────────────────────────────────────────────────────
  sqlChallenge(
    {
      slug: "daily-active-users",
      title: "Daily Active Users",
      difficulty: "Beginner",
      topic: "Distinct counts",
      dataset: EVENTS,
      description: "How many distinct users were active each day.",
      solutionNote: [
        { code: "COUNT(*)" },
        " counts events; ",
        { code: "COUNT(DISTINCT user_id)" },
        " counts people. A user with four events on one day is one active user, not four.",
      ],
    },
    {
      prompt: [
        "How many distinct users were active on each day? `occurred_at` is a timestamp, so cut it down to a date with `date(occurred_at)`.",
        "Return one row per day, earliest first.",
      ],
      columns: [
        { name: "day", type: "text" },
        { name: "active_users", type: "integer" },
      ],
      starter: `SELECT date(occurred_at) AS day
FROM events
GROUP BY day
ORDER BY day
`,
      solution: `SELECT date(occurred_at) AS day, COUNT(DISTINCT user_id) AS active_users
FROM events
GROUP BY day
ORDER BY day`,
      tests: resultShape(["day", "active_users"], 5, "Distinct users, not event counts."),
    },
  ),

  sqlChallenge(
    {
      slug: "page-view-counts",
      title: "Page View Counts",
      difficulty: "Beginner",
      topic: "Filtering and grouping",
      dataset: EVENTS,
      description: "Which pages were viewed most.",
    },
    {
      prompt: [
        "Count the `view` events for each page; clicks and signups do not count.",
        "Sort by views with the most-viewed page first, breaking ties by page.",
      ],
      columns: [
        { name: "page", type: "text" },
        { name: "views", type: "integer" },
      ],
      starter: `SELECT page, COUNT(*) AS views
FROM events
GROUP BY page
ORDER BY views DESC, page
`,
      solution: `SELECT page, COUNT(*) AS views
FROM events
WHERE event_name = 'view'
GROUP BY page
ORDER BY views DESC, page`,
      tests: resultShape(["page", "views"], 3, "Only view events counted."),
    },
  ),

  sqlChallenge(
    {
      slug: "signup-conversion",
      title: "Signup Conversion",
      difficulty: "Intermediate",
      topic: "Conditional distinct counts",
      dataset: EVENTS,
      description: "What share of visitors signed up.",
    },
    {
      prompt: [
        "In one row, report how many distinct users signed up, how many distinct users appear at all, and the conversion rate as a percentage rounded to 1 decimal place.",
        "A `CASE` inside `COUNT(DISTINCT ...)` counts only the users that match, because a `CASE` with no `ELSE` yields NULL and `COUNT` skips NULLs.",
      ],
      columns: [
        { name: "signed_up", type: "integer" },
        { name: "visitors", type: "integer" },
        { name: "conversion_pct", type: "real" },
      ],
      starter: `SELECT COUNT(DISTINCT user_id) AS visitors
FROM events
`,
      solution: `SELECT COUNT(DISTINCT CASE WHEN event_name = 'signup' THEN user_id END) AS signed_up,
       COUNT(DISTINCT user_id) AS visitors,
       ROUND(
         100.0 * COUNT(DISTINCT CASE WHEN event_name = 'signup' THEN user_id END)
           / COUNT(DISTINCT user_id), 1
       ) AS conversion_pct
FROM events`,
      tests: resultShape(["signed_up", "visitors", "conversion_pct"], 1, "Distinct users on both sides."),
    },
  ),

  sqlChallenge(
    {
      slug: "first-touch-page",
      title: "First Touch Page",
      difficulty: "Intermediate",
      topic: "Window functions",
      dataset: EVENTS,
      description: "The first page each user ever landed on.",
      solutionNote: [
        { code: "ROW_NUMBER()" },
        " partitioned by user and ordered by time numbers each user's events from 1; keeping the 1s keeps each user's first event. ",
        { code: "MIN(occurred_at)" },
        " would give you the time but not the page it belongs to.",
      ],
    },
    {
      prompt: [
        "Which page did each user land on first? Number each user's events by time, then keep the first.",
        "Return the user id and that page, sorted by user id.",
      ],
      columns: [
        { name: "user_id", type: "integer" },
        { name: "first_page", type: "text" },
      ],
      starter: `WITH ranked AS (
  SELECT user_id, page, occurred_at
  FROM events
)
SELECT user_id, page AS first_page
FROM ranked
ORDER BY user_id
`,
      solution: `WITH ranked AS (
  SELECT user_id, page, occurred_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY occurred_at) AS rn
  FROM events
)
SELECT user_id, page AS first_page
FROM ranked
WHERE rn = 1
ORDER BY user_id`,
      tests: resultShape(["user_id", "first_page"], 6, "One row per user, their earliest event."),
    },
  ),

  sqlChallenge(
    {
      slug: "events-per-user",
      title: "Events per User",
      difficulty: "Beginner",
      topic: "Grouping",
      dataset: EVENTS,
      description: "How busy each user was.",
    },
    {
      prompt: [
        "Count every event each user produced. Return the user id and the count, busiest first, ties broken by user id.",
      ],
      columns: [
        { name: "user_id", type: "integer" },
        { name: "event_count", type: "integer" },
      ],
      starter: `SELECT user_id
FROM events
`,
      solution: `SELECT user_id, COUNT(*) AS event_count
FROM events
GROUP BY user_id
ORDER BY event_count DESC, user_id`,
      tests: resultShape(["user_id", "event_count"], 6, "Every event counted once."),
    },
  ),

  sqlChallenge(
    {
      slug: "clicked-without-signup",
      title: "Clicked but Never Signed Up",
      difficulty: "Intermediate",
      topic: "Anti joins",
      dataset: EVENTS,
      description: "Users who showed intent but never converted.",
      solutionNote: [
        "Watch out for ",
        { code: "NOT IN" },
        " against a subquery that can produce NULL: the whole predicate goes unknown and you get no rows back. ",
        { code: "NOT EXISTS" },
        " is immune to that.",
      ],
    },
    {
      prompt: [
        "Which users clicked something but never produced a `signup` event? Return their user ids, ascending, with no duplicates.",
      ],
      columns: [{ name: "user_id", type: "integer" }],
      starter: `SELECT DISTINCT user_id
FROM events
WHERE event_name = 'click'
ORDER BY user_id
`,
      solution: `SELECT DISTINCT user_id
FROM events
WHERE event_name = 'click'
  AND user_id NOT IN (SELECT user_id FROM events WHERE event_name = 'signup')
ORDER BY user_id`,
      tests: resultShape(["user_id"], 2, "Clicked, and never signed up."),
    },
  ),
];
