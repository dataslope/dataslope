/**
 * Multi-step SQL challenges over the support dataset.
 *
 * Both are reports a support lead looks at every Monday, and both are built
 * the way their trap requires. The SLA report has to classify every ticket,
 * answered or not, before it can compute a rate, because the worst breaches
 * are the tickets nobody has answered. The backlog report has to generate its
 * days before it counts anything, because the peak of the queue sits on a
 * weekend when no ticket moved at all.
 *
 * Shared constants carry each step's accepted query into the next step's
 * starter and CTE, so a fix in step 1 cannot leave step 3 quoting a version
 * that no longer exists. `__tests__/challengeSolutions` runs every step's
 * solution against node:sqlite.
 */

import { indentSql, sqlSteps } from "./authoring";
import { SUPPORT } from "./dataset-support";
import type { Challenge } from "./types";

/** When the ticket export was taken; anything still open runs to here. */
const AS_OF = "2024-03-22 18:00:00";

// ─── First-response SLA ──────────────────────────────────────────────

const DUE_BODY = `SELECT t.ticket_id, t.agent_id, t.priority, t.first_response_at,
       datetime(t.opened_at, '+' || s.first_response_hours || ' hours') AS respond_by
FROM tickets t
JOIN sla_targets s ON s.priority = t.priority`;

const DUE = `${DUE_BODY}
ORDER BY t.ticket_id`;

const DUE_CTE = `WITH due AS (
${indentSql(DUE_BODY)}
)`;

const STATUS_BODY = `SELECT d.ticket_id,
       COALESCE(a.full_name, 'Unassigned') AS agent,
       d.priority,
       CASE
         WHEN d.first_response_at <= d.respond_by THEN 'met'
         WHEN d.first_response_at >  d.respond_by THEN 'breached'
         WHEN d.respond_by < '${AS_OF}' THEN 'breached'
         ELSE 'waiting'
       END AS sla_status
FROM due d
LEFT JOIN agents a ON a.agent_id = d.agent_id`;

const STATUS = `${DUE_CTE}
${STATUS_BODY}
ORDER BY d.ticket_id`;

const STATUS_CTE = `${DUE_CTE}, graded AS (
${indentSql(STATUS_BODY)}
)`;

const FIRST_RESPONSE_SLA = sqlSteps(
  {
    slug: "first-response-sla",
    title: "First Response SLA",
    difficulty: "Intermediate",
    topic: "Classifying against deadlines",
    dataset: SUPPORT,
    description:
      "Grade every ticket against its first-response deadline, answered or not, and report each agent's breach rate.",
    solutionNote:
      "An SLA is a promise with a deadline, and the tickets that break it worst are the ones with no response at all. A report measured from response times alone can only see the tickets somebody answered; building the deadline first and classifying every ticket against it is what brings the unanswered queue into the breach rate.",
  },
  [
    {
      title: "Every ticket's deadline",
      short: "Deadlines",
      solutionNote:
        "Adding hours with a `datetime()` modifier keeps the deadline in the same text format as every other timestamp in the table, and that format compares correctly as text, so the next step can put the two side by side with `<=`. Keeping the unanswered tickets now matters later: they are the ones most likely to breach.",
      prompt: [
        "Each priority promises a first response within `first_response_hours` (in `sla_targets`). For every ticket, work out `respond_by`: `opened_at` plus that many hours, built with `datetime(opened_at, '+' || first_response_hours || ' hours')`.",
        "Show it next to `first_response_at`, which is NULL for tickets nobody has answered yet. Keep those.",
        "All 29 tickets, sorted by `ticket_id`.",
      ],
      columns: [
        { name: "ticket_id", type: "integer" },
        { name: "agent_id", type: "integer" },
        { name: "priority", type: "text" },
        { name: "first_response_at", type: "text" },
        { name: "respond_by", type: "text" },
      ],
      starter: `SELECT t.ticket_id, t.agent_id, t.priority, t.first_response_at
FROM tickets t
ORDER BY t.ticket_id
`,
      solution: DUE,
      tests: [
        {
          id: "columns",
          name: "Returns ticket_id, agent_id, priority, first_response_at and respond_by",
          expectedColumns: [
            "ticket_id",
            "agent_id",
            "priority",
            "first_response_at",
            "respond_by",
          ],
        },
        {
          id: "rowcount",
          name: "All twenty-nine tickets",
          description: "Unanswered tickets stay in: they are the ones most likely to breach.",
          expectedRowCount: 29,
        },
        {
          id: "ordered",
          name: "Deadlines match the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Grade every ticket",
      short: "Status",
      solutionNote:
        "A `CASE` takes the first branch whose condition is true, and a comparison with a NULL `first_response_at` is never true, so the unanswered tickets fall through the first two branches to the ones written for them. `LEFT JOIN agents` with `COALESCE` keeps the three unassigned tickets and gives them a name the report can group on.",
      prompt: [
        `Give each ticket an \`sla_status\`: \`met\` if the first response came at or before \`respond_by\`, and \`breached\` if it came after. A ticket with no response yet is \`breached\` if its deadline had already passed at the export time, \`'${AS_OF}'\`, and \`waiting\` if it had not.`,
        "Show the agent's `full_name` as `agent`, or `Unassigned` when the ticket has no agent. All 29 tickets, sorted by `ticket_id`.",
      ],
      columns: [
        { name: "ticket_id", type: "integer" },
        { name: "agent", type: "text" },
        { name: "priority", type: "text" },
        { name: "sla_status", type: "text" },
      ],
      starter: `${DUE_CTE}
SELECT d.ticket_id, a.full_name AS agent, d.priority
FROM due d
JOIN agents a ON a.agent_id = d.agent_id
ORDER BY d.ticket_id
`,
      solution: STATUS,
      tests: [
        {
          id: "columns",
          name: "Returns ticket_id, agent, priority and sla_status",
          expectedColumns: ["ticket_id", "agent", "priority", "sla_status"],
        },
        {
          id: "rowcount",
          name: "Still twenty-nine tickets",
          description: "The three unassigned tickets need an outer join to stay in.",
          expectedRowCount: 29,
        },
        {
          id: "ordered",
          name: "Statuses match the reference result",
          description:
            "Answered exactly at the deadline is met; unanswered past it is breached, and unanswered before it is waiting.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Breach rate per agent",
      short: "Rates",
      solutionNote:
        "Dividing by the decided tickets rather than all of them keeps a ticket that is still on the clock from counting as a success, and `100.0` keeps the division out of integer arithmetic. The Unassigned row is the point of the report: its two breaches are tickets nobody has answered, which a report built from response times could never show.",
      prompt: [
        "Summarise per `agent`, with `Unassigned` as a row of its own: `decided`, the tickets whose outcome is known (met or breached); `breached`; and `breach_pct`, breached as a percentage of decided, rounded to 1 decimal place.",
        "A `waiting` ticket has neither met nor missed its deadline yet, so it belongs in neither count. An agent who holds no tickets at all has nothing to rate and gets no row.",
        "Worst rate first, ties by `agent`.",
      ],
      columns: [
        { name: "agent", type: "text" },
        { name: "decided", type: "integer" },
        { name: "breached", type: "integer" },
        { name: "breach_pct", type: "real" },
      ],
      starter: `${STATUS_CTE}
SELECT agent, COUNT(*) AS decided
FROM graded
GROUP BY agent
`,
      solution: `${STATUS_CTE}
SELECT agent,
       COUNT(*) FILTER (WHERE sla_status <> 'waiting') AS decided,
       COUNT(*) FILTER (WHERE sla_status = 'breached') AS breached,
       ROUND(100.0 * COUNT(*) FILTER (WHERE sla_status = 'breached')
             / COUNT(*) FILTER (WHERE sla_status <> 'waiting'), 1) AS breach_pct
FROM graded
GROUP BY agent
ORDER BY breach_pct DESC, agent`,
      tests: [
        {
          id: "columns",
          name: "Returns agent, decided, breached and breach_pct",
          expectedColumns: ["agent", "decided", "breached", "breach_pct"],
        },
        {
          id: "rowcount",
          name: "Four agents and the unassigned queue",
          expectedRowCount: 5,
        },
        {
          id: "ordered",
          name: "Rates match the reference result",
          description: "The waiting ticket counts as neither met nor breached.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

// ─── Daily backlog ───────────────────────────────────────────────────

const DAYS_CTE = `WITH RECURSIVE days(day) AS (
  SELECT '2024-03-04'
  UNION ALL
  SELECT date(day, '+1 day') FROM days WHERE day < '2024-03-22'
)`;

const DAYS = `${DAYS_CTE}
SELECT day FROM days ORDER BY day`;

const BACKLOG_BODY = `SELECT d.day, COUNT(t.ticket_id) AS open_tickets
FROM days d
LEFT JOIN tickets t
  ON t.opened_at < datetime(d.day, '+1 day')
 AND (t.resolved_at IS NULL OR t.resolved_at >= datetime(d.day, '+1 day'))
GROUP BY d.day`;

const BACKLOG = `${DAYS_CTE}
${BACKLOG_BODY}
ORDER BY d.day`;

const BACKLOG_CTE = `${DAYS_CTE}, backlog AS (
${indentSql(BACKLOG_BODY)}
)`;

const DAILY_BACKLOG = sqlSteps(
  {
    slug: "daily-backlog",
    title: "Daily Backlog",
    difficulty: "Advanced",
    topic: "Date spines",
    dataset: SUPPORT,
    description:
      "Chart the open-ticket queue at the end of every day and find when it peaked, quiet days included.",
    solutionNote:
      "A backlog is a state, not an event: it exists on every day, including the days on which no ticket moved. Generate the days first, join each ticket to every day its open interval covers, and only then look for the peak. Skip the spine and the two quiet weekend days at the top of the queue disappear from the report.",
  },
  [
    {
      title: "One row per day",
      short: "Days",
      solutionNote:
        "A recursive CTE is a seed row plus a rule for the next row, repeated until the rule's `WHERE` stops producing any. The dates are generated rather than read from `tickets` because the tickets only know about days on which something happened, and a backlog carries over the days on which nothing did.",
      prompt: [
        "A backlog chart needs a row for every day, including days when nothing happened. Generate every date from `'2024-03-04'` to `'2024-03-22'` with a recursive CTE, adding one day at a time with `date(day, '+1 day')`.",
        "Return the single column `day`, in order.",
      ],
      columns: [{ name: "day", type: "text" }],
      starter: `WITH RECURSIVE days(day) AS (
  SELECT '2024-03-04'
  -- Add one day at a time until 2024-03-22.
)
SELECT day FROM days ORDER BY day
`,
      solution: DAYS,
      tests: [
        {
          id: "columns",
          name: "Returns day",
          expectedColumns: ["day"],
        },
        {
          id: "rowcount",
          name: "Nineteen days",
          description: "From Monday 4 March to Friday 22 March, both included.",
          expectedRowCount: 19,
        },
        {
          id: "ordered",
          name: "Every date, in order",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Open at the end of each day",
      short: "Backlog",
      solutionNote:
        "The join condition is an interval test, not an equality: a ticket belongs to every day its open interval spans, so one ticket joins many days. `resolved_at IS NULL OR ...` is the part that is easy to lose, because a bare `resolved_at >= midnight` is NULL for an open ticket and drops exactly the tickets a backlog is made of.",
      prompt: [
        "A ticket is in the backlog at the end of a day if it was opened before the following midnight and not resolved before it: `opened_at` earlier than `datetime(day, '+1 day')`, and `resolved_at` either NULL or at or after that midnight.",
        "Use `resolved_at` as `tickets` records it, the final resolution, even for a ticket that was reopened on the way.",
        "Left-join the tickets onto the days so every day appears, and count them as `open_tickets`. Sort by `day`.",
      ],
      columns: [
        { name: "day", type: "text" },
        { name: "open_tickets", type: "integer" },
      ],
      starter: `${DAYS_CTE}
SELECT d.day
FROM days d
ORDER BY d.day
`,
      solution: BACKLOG,
      tests: [
        {
          id: "columns",
          name: "Returns day and open_tickets",
          expectedColumns: ["day", "open_tickets"],
        },
        {
          id: "rowcount",
          name: "Still nineteen days",
          expectedRowCount: 19,
        },
        {
          id: "ordered",
          name: "Backlog matches the reference result",
          description: "Tickets still open at the export count on every day since they were opened.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Find the peak",
      short: "Peak",
      solutionNote:
        "Comparing with `MAX` rather than taking the first row of a sort is what keeps ties: the queue peaked on Friday 15 March and stayed there all weekend. That Saturday and Sunday opened and resolved nothing, so a report grouped by ticket dates has no rows for them at all; only the date spine puts them in the answer.",
      prompt: [
        "Which days ended with the largest backlog? Return every day tied at the maximum, with `opened` and `resolved`: the number of tickets opened and resolved on that date.",
        "Sort by `day`.",
      ],
      columns: [
        { name: "day", type: "text" },
        { name: "open_tickets", type: "integer" },
        { name: "opened", type: "integer" },
        { name: "resolved", type: "integer" },
      ],
      starter: `${BACKLOG_CTE}
SELECT day, open_tickets
FROM backlog
ORDER BY day
`,
      solution: `${BACKLOG_CTE}
SELECT b.day, b.open_tickets,
       (SELECT COUNT(*) FROM tickets t WHERE date(t.opened_at)   = b.day) AS opened,
       (SELECT COUNT(*) FROM tickets t WHERE date(t.resolved_at) = b.day) AS resolved
FROM backlog b
WHERE b.open_tickets = (SELECT MAX(open_tickets) FROM backlog)
ORDER BY b.day`,
      tests: [
        {
          id: "columns",
          name: "Returns day, open_tickets, opened and resolved",
          expectedColumns: ["day", "open_tickets", "opened", "resolved"],
        },
        {
          id: "rowcount",
          name: "Three days tie at the peak",
          description: "Two of them saw no ticket opened or resolved at all.",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "The peak matches the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

export const SQL_MULTI_SUPPORT: Challenge[] = [FIRST_RESPONSE_SLA, DAILY_BACKLOG];
