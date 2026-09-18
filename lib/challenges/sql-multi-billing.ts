/**
 * Multi-step SQL challenges over the subscriptions dataset.
 *
 * Each of these is a report a finance or growth team would actually ask for,
 * built in three passes: get the rows, classify them, then summarise. That is
 * the order a person writes the query in anyway — the step rail just refuses
 * to let you skip to the summary before the rows are right.
 *
 * Shared constants carry each step's accepted query into the next step's
 * starter and CTE, so a fix in step 1 cannot leave step 3 quoting a version
 * that no longer exists. `__tests__/challengeSolutions` runs every step's
 * solution against node:sqlite.
 */

import { indentSql, sqlSteps } from "./authoring";
import { SUBSCRIPTIONS } from "./datasets";
import type { Challenge } from "./types";

/** The day the billing book was exported; anything open-ended runs to here. */
const AS_OF = "2024-03-31";

// ─── Invoice aging ───────────────────────────────────────────────────

const AGED_DAYS = `julianday('${AS_OF}') - julianday(i.issued_on)`;

const AGING_OPEN = `SELECT i.invoice_id, a.company, i.amount,
       CAST(${AGED_DAYS} AS INTEGER) AS days_outstanding
FROM invoices i
JOIN accounts a ON a.account_id = i.account_id
WHERE i.paid_on IS NULL
ORDER BY days_outstanding DESC, i.invoice_id`;

const AGING_BUCKET = `CASE
         WHEN ${AGED_DAYS} <= 30 THEN '0-30'
         WHEN ${AGED_DAYS} <= 60 THEN '31-60'
         ELSE '60+'
       END`;

const AGING_TAGGED = `SELECT i.invoice_id, a.company, i.amount,
       CAST(${AGED_DAYS} AS INTEGER) AS days_outstanding,
       ${AGING_BUCKET} AS bucket
FROM invoices i
JOIN accounts a ON a.account_id = i.account_id
WHERE i.paid_on IS NULL
ORDER BY days_outstanding DESC, i.invoice_id`;

const AGING_CTE = `WITH aged AS (
  SELECT i.invoice_id, i.amount,
         ${AGING_BUCKET.split("\n").join("\n  ")} AS bucket
  FROM invoices i
  WHERE i.paid_on IS NULL
)`;

const INVOICE_AGING = sqlSteps(
  {
    slug: "invoice-aging",
    title: "Invoice Aging",
    difficulty: "Intermediate",
    topic: "Bucketing",
    dataset: SUBSCRIPTIONS,
    description:
      "Build the aging report collections teams live on: what is still owed, how long it has been owed, and how much sits in each age band.",
    solutionNote: [
      "An aging report is three ideas stacked: filter to what is open, measure how old it is, then bucket the measurement. Buckets are where judgement lives — the boundaries are a business decision, not a technical one, and writing them as a ",
      { code: "CASE" },
      " keeps them in one visible place instead of scattered across three queries.",
    ],
  },
  [
    {
      title: "What is still owed",
      short: "Open",
      prompt: [
        [
          "Start with the open invoices — the ones with no payment date — and measure how long each has been outstanding as of ",
          { code: "'" + AS_OF + "'" },
          ".",
        ],
        [
          "Dates are text, so subtract them with ",
          { code: "julianday()" },
          " and return a whole number of days. Oldest debt first.",
        ],
      ],
      columns: [
        { name: "invoice_id", type: "integer" },
        { name: "company", type: "text" },
        { name: "amount", type: "real" },
        { name: "days_outstanding", type: "integer" },
      ],
      starter: `SELECT i.invoice_id, a.company, i.amount
FROM invoices i
JOIN accounts a ON a.account_id = i.account_id
`,
      solution: AGING_OPEN,
      tests: [
        {
          id: "columns",
          name: "Returns invoice_id, company, amount and days_outstanding",
          expectedColumns: ["invoice_id", "company", "amount", "days_outstanding"],
        },
        {
          id: "rowcount",
          name: "Three invoices are still open",
          description: "Paid invoices are not part of an aging report.",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Oldest debt first",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Put each one in a band",
      short: "Bands",
      prompt: [
        [
          "Add a ",
          { code: "bucket" },
          " column: ",
          { code: "'0-30'" },
          " for 30 days or fewer, ",
          { code: "'31-60'" },
          " up to 60, and ",
          { code: "'60+'" },
          " beyond that.",
        ],
        [
          "Keep every open invoice and every column from step 1 — this step labels the rows, it does not filter them.",
        ],
      ],
      columns: [
        { name: "invoice_id", type: "integer" },
        { name: "company", type: "text" },
        { name: "amount", type: "real" },
        { name: "days_outstanding", type: "integer" },
        { name: "bucket", type: "text" },
      ],
      starter: `${AGING_OPEN}
`,
      solution: AGING_TAGGED,
      tests: [
        {
          id: "columns",
          name: "Adds a bucket column",
          expectedColumns: [
            "invoice_id",
            "company",
            "amount",
            "days_outstanding",
            "bucket",
          ],
        },
        {
          id: "rowcount",
          name: "Still three invoices",
          description: "Labelling must not drop anything.",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Every invoice lands in the right band",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Total each band",
      short: "Summary",
      prompt: [
        "Now the report itself: one row per band, with how many invoices are in it and how much they add up to. Round the total to 2 decimal places.",
        [
          "Sort by band name. Bands with nothing in them simply do not appear — a ",
          { code: "GROUP BY" },
          " can only return what the data contains.",
        ],
      ],
      columns: [
        { name: "bucket", type: "text" },
        { name: "invoices", type: "integer" },
        { name: "owed", type: "real" },
      ],
      starter: `${AGING_CTE}
SELECT bucket, amount
FROM aged
`,
      solution: `${AGING_CTE}
SELECT bucket, COUNT(*) AS invoices, ROUND(SUM(amount), 2) AS owed
FROM aged
GROUP BY bucket
ORDER BY bucket`,
      tests: [
        {
          id: "columns",
          name: "Returns bucket, invoices and owed",
          expectedColumns: ["bucket", "invoices", "owed"],
        },
        {
          id: "rowcount",
          name: "Two bands have invoices in them",
          description: "Nothing is more than 60 days old, so that band is absent.",
          expectedRowCount: 2,
        },
        {
          id: "ordered",
          name: "Totals match the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

// ─── Retention by plan ───────────────────────────────────────────────

const SPANS = `SELECT s.subscription_id, p.plan_name,
       CAST(julianday(COALESCE(s.ended_on, '${AS_OF}'))
            - julianday(s.started_on) AS INTEGER) AS days,
       CASE WHEN s.ended_on IS NULL THEN 0 ELSE 1 END AS churned
FROM subscriptions s
JOIN plans p ON p.plan_id = s.plan_id
ORDER BY s.subscription_id`;

const SPANS_CTE_BODY = SPANS.replace("\nORDER BY s.subscription_id", "");

const SPANS_CTE = `WITH spans AS (
${indentSql(SPANS_CTE_BODY)}
)`;

const RETENTION_BY_PLAN = sqlSteps(
  {
    slug: "retention-by-plan",
    title: "Retention by Plan",
    difficulty: "Advanced",
    topic: "COALESCE and flags",
    dataset: SUBSCRIPTIONS,
    description:
      "Work out which plans keep customers: measure every subscription's life, average it by plan, then add the churn rate.",
    solutionNote: [
      "Two tricks carry the whole report. ",
      { code: "COALESCE(ended_on, '" + AS_OF + "')" },
      " lets a subscription that has not ended still have a length, so your best customers are not silently excluded. And turning \"has it ended\" into a 1-or-0 column means the churn rate is just ",
      { code: "AVG" },
      " of that flag — no second query, no self join.",
    ],
  },
  [
    {
      title: "Measure every subscription",
      short: "Spans",
      prompt: [
        [
          "For each subscription, work out how many days it has run and whether it has ended. A subscription still running counts up to ",
          { code: "'" + AS_OF + "'" },
          ".",
        ],
        [
          "Make ",
          { code: "churned" },
          " a 1 or a 0 rather than a date — step 3 will average it. Sort by subscription id.",
        ],
      ],
      columns: [
        { name: "subscription_id", type: "integer" },
        { name: "plan_name", type: "text" },
        { name: "days", type: "integer" },
        { name: "churned", type: "integer" },
      ],
      starter: `SELECT s.subscription_id, p.plan_name
FROM subscriptions s
JOIN plans p ON p.plan_id = s.plan_id
`,
      solution: SPANS,
      tests: [
        {
          id: "columns",
          name: "Returns subscription_id, plan_name, days and churned",
          expectedColumns: ["subscription_id", "plan_name", "days", "churned"],
        },
        {
          id: "rowcount",
          name: "All fourteen subscriptions",
          description: "The open ones must not drop out for lacking an end date.",
          expectedRowCount: 14,
        },
        {
          id: "ordered",
          name: "Lengths and flags match the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Average by plan",
      short: "Average",
      prompt: [
        "Roll the subscriptions up to their plans: how many there have been, and how long they last on average. Round the average to 1 decimal place.",
        "Longest-lived plan first.",
      ],
      columns: [
        { name: "plan_name", type: "text" },
        { name: "subscriptions", type: "integer" },
        { name: "avg_days", type: "real" },
      ],
      starter: `${SPANS_CTE}
SELECT plan_name, days
FROM spans
`,
      solution: `${SPANS_CTE}
SELECT plan_name, COUNT(*) AS subscriptions, ROUND(AVG(days), 1) AS avg_days
FROM spans
GROUP BY plan_name
ORDER BY avg_days DESC`,
      tests: [
        {
          id: "columns",
          name: "Returns plan_name, subscriptions and avg_days",
          expectedColumns: ["plan_name", "subscriptions", "avg_days"],
        },
        {
          id: "rowcount",
          name: "One row per plan",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Longest-lived plan first",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Add the churn rate",
      short: "Churn",
      prompt: [
        [
          "Add ",
          { code: "churn_pct" },
          ": the percentage of each plan's subscriptions that have ended, to 1 decimal place.",
        ],
        [
          "Because ",
          { code: "churned" },
          " is a 1 or a 0, summing it counts the churned ones. Worst churn first, ties by plan name.",
        ],
      ],
      columns: [
        { name: "plan_name", type: "text" },
        { name: "subscriptions", type: "integer" },
        { name: "avg_days", type: "real" },
        { name: "churn_pct", type: "real" },
      ],
      starter: `${SPANS_CTE}
SELECT plan_name, COUNT(*) AS subscriptions, ROUND(AVG(days), 1) AS avg_days
FROM spans
GROUP BY plan_name
ORDER BY avg_days DESC
`,
      solution: `${SPANS_CTE}
SELECT plan_name,
       COUNT(*) AS subscriptions,
       ROUND(AVG(days), 1) AS avg_days,
       ROUND(100.0 * SUM(churned) / COUNT(*), 1) AS churn_pct
FROM spans
GROUP BY plan_name
ORDER BY churn_pct DESC, plan_name`,
      tests: [
        {
          id: "columns",
          name: "Adds a churn_pct column",
          expectedColumns: ["plan_name", "subscriptions", "avg_days", "churn_pct"],
        },
        {
          id: "rowcount",
          name: "Still one row per plan",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Worst churn first",
          description: "The cheapest plan loses the most customers.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

// ─── Plan mix ────────────────────────────────────────────────────────

const ACTIVE_BY_PLAN = `SELECT p.plan_name, COUNT(*) AS active
FROM subscriptions s
JOIN plans p ON p.plan_id = s.plan_id
WHERE s.ended_on IS NULL
GROUP BY p.plan_id, p.plan_name
ORDER BY active DESC, p.plan_name`;

const ACTIVE_CTE = `WITH active AS (
  SELECT p.plan_name, p.monthly_price, COUNT(*) AS active
  FROM subscriptions s
  JOIN plans p ON p.plan_id = s.plan_id
  WHERE s.ended_on IS NULL
  GROUP BY p.plan_id, p.plan_name, p.monthly_price
)`;

const PLAN_MIX = sqlSteps(
  {
    slug: "plan-mix",
    title: "Plan Mix",
    difficulty: "Intermediate",
    topic: "Window totals",
    dataset: SUBSCRIPTIONS,
    description:
      "Compare customer count against revenue per plan, and watch the ranking flip.",
    solutionNote: [
      "The lesson is in the last step: the plan with the most customers is not the plan with the most revenue. Getting both shares in one query needs the grand total on every row, which is what ",
      { code: "SUM(x) OVER ()" },
      " — a window with no partition and no order — gives you, without a second pass or a subquery.",
    ],
  },
  [
    {
      title: "Customers per plan",
      short: "Count",
      prompt: [
        "Count how many live subscriptions each plan has. A subscription that has ended is not on a plan any more.",
        "Most popular plan first, ties by name.",
      ],
      columns: [
        { name: "plan_name", type: "text" },
        { name: "active", type: "integer" },
      ],
      starter: `SELECT p.plan_name
FROM subscriptions s
JOIN plans p ON p.plan_id = s.plan_id
`,
      solution: ACTIVE_BY_PLAN,
      tests: [
        {
          id: "columns",
          name: "Returns plan_name and active",
          expectedColumns: ["plan_name", "active"],
        },
        {
          id: "rowcount",
          name: "All three plans have customers",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Most popular first",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Share of customers",
      short: "Share",
      prompt: [
        [
          "Add ",
          { code: "pct_of_accounts" },
          ": each plan's share of all live subscriptions, to 1 decimal place.",
        ],
        [
          "You need the total on every row. ",
          { code: "SUM(active) OVER ()" },
          " — an empty window — is exactly that, and it costs no extra pass over the data.",
        ],
      ],
      columns: [
        { name: "plan_name", type: "text" },
        { name: "active", type: "integer" },
        { name: "pct_of_accounts", type: "real" },
      ],
      starter: `${ACTIVE_CTE}
SELECT plan_name, active
FROM active
ORDER BY active DESC, plan_name
`,
      solution: `${ACTIVE_CTE}
SELECT plan_name, active,
       ROUND(100.0 * active / SUM(active) OVER (), 1) AS pct_of_accounts
FROM active
ORDER BY active DESC, plan_name`,
      tests: [
        {
          id: "columns",
          name: "Adds a pct_of_accounts column",
          expectedColumns: ["plan_name", "active", "pct_of_accounts"],
        },
        {
          id: "rowcount",
          name: "Still one row per plan",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Shares match the reference result",
          description: "The three add up to 100.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Share of revenue",
      short: "Revenue",
      prompt: [
        [
          "Now add what each plan actually earns: ",
          { code: "mrr" },
          " is its live subscriptions times its monthly price, and ",
          { code: "pct_of_mrr" },
          " is that as a share of all revenue.",
        ],
        [
          "Round money to 2 places and percentages to 1. Sort by ",
          { code: "mrr" },
          " descending — and notice that it is not the same order as step 2.",
        ],
      ],
      columns: [
        { name: "plan_name", type: "text" },
        { name: "active", type: "integer" },
        { name: "pct_of_accounts", type: "real" },
        { name: "mrr", type: "real" },
        { name: "pct_of_mrr", type: "real" },
      ],
      starter: `${ACTIVE_CTE}
SELECT plan_name, active,
       ROUND(100.0 * active / SUM(active) OVER (), 1) AS pct_of_accounts
FROM active
ORDER BY active DESC, plan_name
`,
      solution: `${ACTIVE_CTE}
SELECT plan_name, active,
       ROUND(100.0 * active / SUM(active) OVER (), 1) AS pct_of_accounts,
       ROUND(active * monthly_price, 2) AS mrr,
       ROUND(100.0 * active * monthly_price
             / SUM(active * monthly_price) OVER (), 1) AS pct_of_mrr
FROM active
ORDER BY mrr DESC`,
      tests: [
        {
          id: "columns",
          name: "Returns the report's five columns",
          expectedColumns: [
            "plan_name",
            "active",
            "pct_of_accounts",
            "mrr",
            "pct_of_mrr",
          ],
        },
        {
          id: "rowcount",
          name: "Still one row per plan",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Highest-earning plan first",
          description:
            "Business has the fewest customers of the top two and the most revenue.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

export const SQL_MULTI_BILLING: Challenge[] = [
  INVOICE_AGING,
  RETENTION_BY_PLAN,
  PLAN_MIX,
];
