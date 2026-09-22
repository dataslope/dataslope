/**
 * Single-query SQL challenges over the subscriptions dataset.
 *
 * Grouped by dataset rather than by difficulty: every challenge here reads
 * the same four tables, so an author adding one can see at a glance what the
 * others already ask, and a learner working through them keeps one schema in
 * their head.
 *
 * The theme running through them is NULL. `ended_on` is absent while a
 * subscription is live and `paid_on` is absent while an invoice is owed, so
 * these drill the things that make billing data awkward: `IS NULL` as a
 * business predicate, `COALESCE` for an open-ended date, outer joins that
 * must not drop the rows with nothing on the other side, and set operations
 * for "everyone except".
 *
 * Every solution is executed against node:sqlite by
 * `__tests__/challengeSolutions`, so a wrong expectation fails CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { SUBSCRIPTIONS } from "./datasets";
import type { Challenge } from "./types";

/** The day the billing book was exported, for anything open-ended. */
const AS_OF = "2024-03-31";

export const SQL_SUBSCRIPTIONS: Challenge[] = [
  sqlChallenge(
    {
      slug: "unpaid-invoices",
      title: "Unpaid Invoices",
      difficulty: "Beginner",
      topic: "NULL as a predicate",
      dataset: SUBSCRIPTIONS,
      description: "Find the invoices still owed, where being unpaid is an absent date.",
      solutionNote: [
        "There is no ",
        { code: "is_paid" },
        " column: an invoice is unpaid when it has no payment date, so the filter is ",
        { code: "paid_on IS NULL" },
        ". Writing ",
        { code: "paid_on = NULL" },
        " returns nothing at all — NULL is never equal to anything, not even itself.",
      ],
    },
    {
      prompt: [
        "Every invoice that has been paid carries the date it was paid. The ones still owed have nothing there.",
        "List the invoice id, the company that owes it and the amount, oldest invoice first.",
      ],
      columns: [
        { name: "invoice_id", type: "integer" },
        { name: "company", type: "text" },
        { name: "amount", type: "real" },
      ],
      starter: `SELECT i.invoice_id, a.company, i.amount
FROM invoices i
JOIN accounts a ON a.account_id = i.account_id
`,
      solution: `SELECT i.invoice_id, a.company, i.amount
FROM invoices i
JOIN accounts a ON a.account_id = i.account_id
WHERE i.paid_on IS NULL
ORDER BY i.invoice_id`,
      tests: resultShape(
        ["invoice_id", "company", "amount"],
        3,
        "Only the invoices with no payment date.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "active-subscriptions",
      title: "Active Subscriptions",
      difficulty: "Beginner",
      topic: "Open-ended records",
      dataset: SUBSCRIPTIONS,
      description: "List the subscriptions that are still running, with their plan.",
      solutionNote: [
        "An open-ended record is the other half of the same idea: a subscription with no ",
        { code: "ended_on" },
        " has not ended. Accounts appear more than once in this table over time, so the filter is what turns a history into a snapshot of today.",
      ],
    },
    {
      prompt: [
        "A subscription that has ended carries the date it ended. One that is still running does not.",
        "List the company, the plan it is on and the date it started, sorted by company.",
      ],
      columns: [
        { name: "company", type: "text" },
        { name: "plan_name", type: "text" },
        { name: "started_on", type: "text" },
      ],
      starter: `SELECT a.company, p.plan_name, s.started_on
FROM subscriptions s
JOIN accounts a ON a.account_id = s.account_id
JOIN plans    p ON p.plan_id    = s.plan_id
`,
      solution: `SELECT a.company, p.plan_name, s.started_on
FROM subscriptions s
JOIN accounts a ON a.account_id = s.account_id
JOIN plans    p ON p.plan_id    = s.plan_id
WHERE s.ended_on IS NULL
ORDER BY a.company`,
      tests: resultShape(
        ["company", "plan_name", "started_on"],
        7,
        "Seven accounts are still subscribed; the rest have ended.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "monthly-recurring-revenue",
      title: "Monthly Recurring Revenue",
      difficulty: "Beginner",
      topic: "Aggregating a join",
      dataset: SUBSCRIPTIONS,
      description: "Total what the active subscriptions bill every month.",
      solutionNote: [
        "MRR is not in any column: it is the price of each live subscription's plan, summed. The join to ",
        { code: "plans" },
        " is what brings the price within reach of the sum, and the ",
        { code: "IS NULL" },
        " filter is what keeps cancelled accounts out of the number you report to the board.",
      ],
    },
    {
      prompt: [
        "Monthly recurring revenue is what the company bills every month from subscriptions that are still running.",
        "Return one row: how many subscriptions are active, and what they add up to at their plan's monthly price. Round to 2 decimal places.",
      ],
      columns: [
        { name: "active_subscriptions", type: "integer" },
        { name: "mrr", type: "real" },
      ],
      starter: `SELECT
FROM subscriptions s
JOIN plans p ON p.plan_id = s.plan_id
`,
      solution: `SELECT COUNT(*) AS active_subscriptions,
       ROUND(SUM(p.monthly_price), 2) AS mrr
FROM subscriptions s
JOIN plans p ON p.plan_id = s.plan_id
WHERE s.ended_on IS NULL`,
      tests: resultShape(
        ["active_subscriptions", "mrr"],
        1,
        "Only live subscriptions count toward MRR.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "average-days-to-payment",
      title: "Average Days to Payment",
      difficulty: "Intermediate",
      topic: "Date arithmetic",
      dataset: SUBSCRIPTIONS,
      description: "Measure how long customers take to pay, in days.",
      solutionNote: [
        "SQLite stores dates as text, so subtracting them directly does nothing useful. ",
        { code: "julianday()" },
        " converts a date to a number of days, and the difference of two of those is a span. The ",
        { code: "IS NOT NULL" },
        " filter matters more than it looks: without it the unpaid invoices contribute NULL, and while ",
        { code: "AVG" },
        " skips them, saying so makes the intent readable.",
      ],
    },
    {
      prompt: [
        "For the invoices that have been paid, how long did payment take on average?",
        [
          "Dates here are text, so subtract them with ",
          { code: "julianday()" },
          ". Round the answer to 2 decimal places.",
        ],
      ],
      columns: [{ name: "avg_days", type: "real" }],
      starter: `SELECT
FROM invoices
`,
      solution: `SELECT ROUND(AVG(julianday(paid_on) - julianday(issued_on)), 2) AS avg_days
FROM invoices
WHERE paid_on IS NOT NULL`,
      tests: resultShape(
        ["avg_days"],
        1,
        "Averaged over paid invoices only.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "revenue-by-country",
      title: "Revenue by Country",
      difficulty: "Beginner",
      topic: "Grouping across a join",
      dataset: SUBSCRIPTIONS,
      description: "Total billed amounts by the account's country.",
      solutionNote: [
        "The column you group by lives in a different table from the column you sum, which is the ordinary shape of a reporting query: join first so both are in scope, then group. Note that this totals everything ",
        { code: "billed" },
        ", paid or not — a revenue number and a cash number are different questions.",
      ],
    },
    {
      prompt: [
        "Total the amount invoiced to each country, and count how many invoices that was.",
        "Biggest total first; break ties by country code. Round totals to 2 decimal places.",
      ],
      columns: [
        { name: "country", type: "text" },
        { name: "invoices", type: "integer" },
        { name: "billed", type: "real" },
      ],
      starter: `SELECT a.country
FROM invoices i
JOIN accounts a ON a.account_id = i.account_id
`,
      solution: `SELECT a.country,
       COUNT(*) AS invoices,
       ROUND(SUM(i.amount), 2) AS billed
FROM invoices i
JOIN accounts a ON a.account_id = i.account_id
GROUP BY a.country
ORDER BY billed DESC, a.country`,
      tests: resultShape(
        ["country", "invoices", "billed"],
        5,
        "Five countries have been invoiced.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "accounts-without-invoices",
      title: "Accounts Without Invoices",
      difficulty: "Intermediate",
      topic: "NOT EXISTS",
      dataset: SUBSCRIPTIONS,
      description: "Find accounts that have never been billed.",
      solutionNote: [
        { code: "NOT EXISTS" },
        " stops at the first matching row, so it does not care how many invoices an account has — only whether there are any. It also behaves correctly when the subquery can produce NULLs, which is where ",
        { code: "NOT IN" },
        " quietly returns nothing at all.",
      ],
    },
    {
      prompt: [
        "Some accounts signed up but have never been sent an invoice. Find them.",
        [
          "Use ",
          { code: "NOT EXISTS" },
          " with a correlated subquery. Return the company and its country, sorted by company.",
        ],
      ],
      columns: [
        { name: "company", type: "text" },
        { name: "country", type: "text" },
      ],
      starter: `SELECT a.company, a.country
FROM accounts a
`,
      solution: `SELECT a.company, a.country
FROM accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM invoices i WHERE i.account_id = a.account_id
)
ORDER BY a.company`,
      tests: resultShape(
        ["company", "country"],
        1,
        "One account has never been billed.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "plan-changes",
      title: "Plan Changes",
      difficulty: "Advanced",
      topic: "Self joins",
      dataset: SUBSCRIPTIONS,
      description:
        "Find accounts that switched plans, by matching each ended subscription to the one that started the next day.",
      solutionNote: [
        "Joining a table to itself is how you relate two rows of the same kind — here, the subscription that ended and the one that replaced it. The join condition does the real work: ",
        { code: "date(old.ended_on, '+1 day') = new.started_on" },
        " is what distinguishes a switch from a customer who left and came back months later.",
      ],
    },
    {
      prompt: [
        "An account changes plan by ending one subscription and starting another the very next day. A gap of more than a day is a customer who left and returned, which is a different thing.",
        [
          "Join ",
          { code: "subscriptions" },
          " to itself to find the switches. Return the company, the plan it came from, the plan it moved to, and the date of the change, oldest first.",
        ],
        [
          "SQLite can do date maths in the join: ",
          { code: "date(old_sub.ended_on, '+1 day')" },
          ".",
        ],
      ],
      columns: [
        { name: "company", type: "text" },
        { name: "from_plan", type: "text" },
        { name: "to_plan", type: "text" },
        { name: "changed_on", type: "text" },
      ],
      starter: `SELECT a.company
FROM subscriptions old_sub
JOIN subscriptions new_sub
  ON new_sub.account_id = old_sub.account_id
JOIN accounts a ON a.account_id = old_sub.account_id
`,
      solution: `SELECT a.company,
       old_plan.plan_name AS from_plan,
       new_plan.plan_name AS to_plan,
       new_sub.started_on AS changed_on
FROM subscriptions old_sub
JOIN subscriptions new_sub
  ON new_sub.account_id = old_sub.account_id
 AND new_sub.started_on = date(old_sub.ended_on, '+1 day')
JOIN accounts a     ON a.account_id = old_sub.account_id
JOIN plans old_plan ON old_plan.plan_id = old_sub.plan_id
JOIN plans new_plan ON new_plan.plan_id = new_sub.plan_id
ORDER BY changed_on`,
      tests: resultShape(
        ["company", "from_plan", "to_plan", "changed_on"],
        4,
        "Four accounts switched plans without a gap.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "subscription-lifespan",
      title: "Subscription Lifespan",
      difficulty: "Intermediate",
      topic: "COALESCE",
      dataset: SUBSCRIPTIONS,
      description:
        "Measure how long each subscription has run, treating the ones still open as running to the export date.",
      solutionNote: [
        "A subscription that has not ended has no end date, and subtracting NULL gives NULL — so the longest-running customers would vanish from a report that ignores it. ",
        { code: "COALESCE(ended_on, '" + AS_OF + "')" },
        " substitutes the as-of date for the missing one, which is the standard way to measure something still in progress.",
      ],
    },
    {
      prompt: [
        [
          "Measure how many days each subscription has run. A subscription that has not ended yet counts up to the export date, ",
          { code: "'" + AS_OF + "'" },
          ".",
        ],
        [
          "Show the date each one is measured through in a ",
          { code: "through" },
          " column. Longest first, ties by company, and only the top 5.",
        ],
      ],
      columns: [
        { name: "company", type: "text" },
        { name: "started_on", type: "text" },
        { name: "through", type: "text" },
        { name: "days", type: "integer" },
      ],
      starter: `SELECT a.company, s.started_on
FROM subscriptions s
JOIN accounts a ON a.account_id = s.account_id
`,
      solution: `SELECT a.company,
       s.started_on,
       COALESCE(s.ended_on, '${AS_OF}') AS through,
       CAST(julianday(COALESCE(s.ended_on, '${AS_OF}'))
            - julianday(s.started_on) AS INTEGER) AS days
FROM subscriptions s
JOIN accounts a ON a.account_id = s.account_id
ORDER BY days DESC, a.company
LIMIT 5`,
      tests: resultShape(
        ["company", "started_on", "through", "days"],
        5,
        "The five longest-running subscriptions, open ones included.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "churned-accounts",
      title: "Churned Accounts",
      difficulty: "Intermediate",
      topic: "Set operations",
      dataset: SUBSCRIPTIONS,
      description:
        "Find accounts with no live subscription, by subtracting one result set from another.",
      solutionNote: [
        { code: "EXCEPT" },
        " takes everything in the first result that is not in the second, and removes duplicates while it is at it. It reads as the question does — every account, minus the ones still subscribed — where the equivalent ",
        { code: "NOT EXISTS" },
        " makes you invert the condition in your head.",
      ],
    },
    {
      prompt: [
        "An account has churned when none of its subscriptions is still running. Some of these never had more than one; others switched plans and then left.",
        [
          "Answer it with ",
          { code: "EXCEPT" },
          ": every company, minus the companies that have a live subscription. Return one column, sorted.",
        ],
      ],
      columns: [{ name: "company", type: "text" }],
      starter: `SELECT company FROM accounts
`,
      solution: `SELECT company FROM accounts
EXCEPT
SELECT a.company
FROM accounts a
JOIN subscriptions s ON s.account_id = a.account_id
WHERE s.ended_on IS NULL
ORDER BY company`,
      tests: resultShape(
        ["company"],
        3,
        "Three of the ten accounts have nothing running.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "payment-rate-by-account",
      title: "Payment Rate by Account",
      difficulty: "Intermediate",
      topic: "Conditional aggregation",
      dataset: SUBSCRIPTIONS,
      description:
        "Score each account on how much of what it was billed has actually been paid.",
      solutionNote: [
        "Counting two different things over the same group is what ",
        { code: "SUM(CASE WHEN … THEN 1 ELSE 0 END)" },
        " is for — one pass, no self join, no subquery per account. The ",
        { code: "100.0" },
        " rather than ",
        { code: "100" },
        " is what stops integer division rounding every percentage to zero.",
      ],
    },
    {
      prompt: [
        "For each account that owes something, show how many invoices it has, how many are unpaid, and what percentage it has paid.",
        [
          "Round the percentage to 1 decimal place. Keep only accounts with at least one unpaid invoice, worst payer first, ties by company.",
        ],
      ],
      columns: [
        { name: "company", type: "text" },
        { name: "invoices", type: "integer" },
        { name: "unpaid", type: "integer" },
        { name: "paid_pct", type: "real" },
      ],
      starter: `SELECT a.company, COUNT(*) AS invoices
FROM invoices i
JOIN accounts a ON a.account_id = i.account_id
GROUP BY a.account_id, a.company
`,
      solution: `SELECT a.company,
       COUNT(*) AS invoices,
       SUM(CASE WHEN i.paid_on IS NULL THEN 1 ELSE 0 END) AS unpaid,
       ROUND(100.0 * SUM(CASE WHEN i.paid_on IS NOT NULL THEN 1 ELSE 0 END)
             / COUNT(*), 1) AS paid_pct
FROM invoices i
JOIN accounts a ON a.account_id = i.account_id
GROUP BY a.account_id, a.company
HAVING unpaid > 0
ORDER BY paid_pct, a.company`,
      tests: resultShape(
        ["company", "invoices", "unpaid", "paid_pct"],
        3,
        "Three accounts are carrying an unpaid invoice.",
        true,
      ),
    },
  ),
];
