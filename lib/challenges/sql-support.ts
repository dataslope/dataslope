/**
 * Single-query SQL challenges over the support dataset.
 *
 * Every question here is about time, and most of them turn on a timestamp
 * that is not there. An unanswered ticket has no `first_response_at` and an
 * open one has no `resolved_at`, and a comparison with either is NULL rather
 * than false, so the query that forgets them returns a tidy, plausible,
 * flattering answer. The rest is the toolkit for working with timestamps
 * stored as ISO text: `strftime` to pull a field out, `datetime` modifiers to
 * build a deadline, `unixepoch` for exact differences, and `LAG` / `LEAD` to
 * read an event log as intervals.
 *
 * The export time, `'2024-03-22 18:00:00'`, stands in for "now" wherever a
 * ticket is still open. Every solution is executed against node:sqlite by
 * `__tests__/challengeSolutions`, so a wrong expectation fails CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { SUPPORT } from "./dataset-support";
import type { Challenge } from "./types";

/** When the ticket export was taken; anything still open runs to here. */
const AS_OF = "2024-03-22 18:00:00";

export const SQL_SUPPORT: Challenge[] = [
  sqlChallenge(
    {
      slug: "unassigned-queue",
      title: "Unassigned Queue",
      difficulty: "Beginner",
      topic: "Sorting by a lookup",
      dataset: SUPPORT,
      description:
        "List the open tickets nobody owns, most urgent first.",
      solutionNote:
        "Missing values are found with `IS NULL`; `agent_id = NULL` is never true. The sort is the other half: text sorts alphabetically whatever it means, so an order that carries meaning has to come from somewhere that encodes it, here the response target joined in from `sla_targets`.",
    },
    {
      prompt: [
        "Some tickets are sitting in the queue with nobody assigned: their `agent_id` is NULL. List the ones that are also still open (`resolved_at` is NULL), with the customer's `company`, the `priority` and when each was opened.",
        "Most urgent first. `priority` is text, and sorting it alphabetically would put `high` first and `urgent` last, with `low` ahead of `normal`. Sort by the priority's `first_response_hours` in `sla_targets` instead, shortest first, and oldest ticket first within a priority.",
      ],
      columns: [
        { name: "ticket_id", type: "integer" },
        { name: "company", type: "text" },
        { name: "priority", type: "text" },
        { name: "opened_at", type: "text" },
      ],
      starter: `SELECT t.ticket_id, c.company, t.priority, t.opened_at
FROM tickets t
JOIN customers c ON c.customer_id = t.customer_id
`,
      solution: `SELECT t.ticket_id, c.company, t.priority, t.opened_at
FROM tickets t
JOIN customers   c ON c.customer_id = t.customer_id
JOIN sla_targets s ON s.priority    = t.priority
WHERE t.agent_id IS NULL
  AND t.resolved_at IS NULL
ORDER BY s.first_response_hours, t.opened_at`,
      tests: resultShape(
        ["ticket_id", "company", "priority", "opened_at"],
        3,
        "The high-priority ticket comes first and the low one last, whatever the alphabet says.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "first-response-by-plan",
      title: "First Response by Plan",
      difficulty: "Beginner",
      topic: "Aggregates and NULL",
      dataset: SUPPORT,
      description:
        "Average how long each plan's customers wait for a first reply, leaving out the tickets nobody has answered.",
      solutionNote:
        "Aggregates skip NULLs, and that does real work twice here: `COUNT(first_response_at)` counts only answered tickets where `COUNT(*)` counts them all, and `AVG` leaves out the unanswered ones because their difference is NULL. Dividing by `3600.0` rather than `3600` keeps the hours fractional instead of truncating them to whole hours.",
    },
    {
      prompt: [
        "Are paying customers answered faster? For each `plan`, count the tickets, count how many have had a first response, and average the time to first response in hours, rounded to 2 decimal places.",
        "`unixepoch()` turns a timestamp into seconds, so `(unixepoch(first_response_at) - unixepoch(opened_at)) / 3600.0` is the wait in hours. A ticket nobody has answered has no response time: leave it out of the average, though it still counts in `tickets`.",
        "Slowest plan first.",
      ],
      columns: [
        { name: "plan", type: "text" },
        { name: "tickets", type: "integer" },
        { name: "answered", type: "integer" },
        { name: "avg_response_hours", type: "real" },
      ],
      starter: `SELECT c.plan, COUNT(*) AS tickets
FROM tickets t
JOIN customers c ON c.customer_id = t.customer_id
GROUP BY c.plan
`,
      solution: `SELECT c.plan,
       COUNT(*) AS tickets,
       COUNT(t.first_response_at) AS answered,
       ROUND(AVG((unixepoch(t.first_response_at) - unixepoch(t.opened_at)) / 3600.0), 2)
         AS avg_response_hours
FROM tickets t
JOIN customers c ON c.customer_id = t.customer_id
GROUP BY c.plan
ORDER BY avg_response_hours DESC`,
      tests: resultShape(
        ["plan", "tickets", "answered", "avg_response_hours"],
        3,
        "Unanswered tickets count in tickets but not in answered or the average.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "tickets-by-hour",
      title: "Tickets by Hour",
      difficulty: "Beginner",
      topic: "Extracting date parts",
      dataset: SUPPORT,
      description: "Find out which hours of the day bring in the most tickets.",
      solutionNote:
        "`strftime` pulls one field out of a timestamp, and grouping by it folds nineteen days into a single 24-hour profile. Nine and ten o'clock tie at the top, which is why the sort needs `hour` as a second key: without one, tied rows come out in whatever order the engine produces.",
    },
    {
      prompt: [
        "When do tickets arrive? Count the tickets opened in each hour of the day, across all dates.",
        "`strftime('%H', opened_at)` extracts the hour as two-digit text; cast it to an integer for the `hour` column. Only hours with at least one ticket appear.",
        "Busiest hour first, ties by `hour`.",
      ],
      columns: [
        { name: "hour", type: "integer" },
        { name: "tickets", type: "integer" },
      ],
      starter: `SELECT COUNT(*) AS tickets
FROM tickets
`,
      solution: `SELECT CAST(strftime('%H', opened_at) AS INTEGER) AS hour,
       COUNT(*) AS tickets
FROM tickets
GROUP BY hour
ORDER BY tickets DESC, hour`,
      tests: resultShape(
        ["hour", "tickets"],
        10,
        "Ten different hours; the two busiest tie and are ordered by hour.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "resolution-sla-breaches",
      title: "Resolution SLA Breaches",
      difficulty: "Intermediate",
      topic: "Deadlines from a lookup",
      dataset: SUPPORT,
      description:
        "Find every ticket that missed its resolution deadline, including the ones still open past it.",
      solutionNote:
        `\`COALESCE(resolved_at, '${AS_OF}')\` gives an open ticket the only end it has so far, so one comparison covers both cases. Written as \`resolved_at > deadline\`, the open ticket that is already days past its deadline compares against NULL and silently drops out, and it is the breach a team most needs to see.`,
    },
    {
      prompt: [
        `Each priority has a resolution target, \`resolution_hours\` in \`sla_targets\`. A ticket breaches it when it is resolved later than \`opened_at\` plus that many hours, or when it is still open and that deadline had already passed at the export time, \`'${AS_OF}'\`.`,
        "Build the deadline with `datetime(opened_at, '+' || resolution_hours || ' hours')`. Timestamps in this format compare correctly as text, so no more arithmetic is needed after that. A ticket resolved exactly at its deadline has met it.",
        "List the breaches with their `deadline` and `resolved_at` (NULL for the open ones). Sort by `ticket_id`.",
      ],
      columns: [
        { name: "ticket_id", type: "integer" },
        { name: "priority", type: "text" },
        { name: "deadline", type: "text" },
        { name: "resolved_at", type: "text" },
      ],
      starter: `SELECT t.ticket_id, t.priority, t.resolved_at
FROM tickets t
JOIN sla_targets s ON s.priority = t.priority
ORDER BY t.ticket_id
`,
      solution: `SELECT t.ticket_id, t.priority,
       datetime(t.opened_at, '+' || s.resolution_hours || ' hours') AS deadline,
       t.resolved_at
FROM tickets t
JOIN sla_targets s ON s.priority = t.priority
WHERE COALESCE(t.resolved_at, '${AS_OF}')
      > datetime(t.opened_at, '+' || s.resolution_hours || ' hours')
ORDER BY t.ticket_id`,
      tests: resultShape(
        ["ticket_id", "priority", "deadline", "resolved_at"],
        10,
        "Resolved exactly at the deadline is on time; still open past it is a breach.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "open-tickets-per-agent",
      title: "Open Tickets per Agent",
      difficulty: "Intermediate",
      topic: "Filtering inside a join",
      dataset: SUPPORT,
      description:
        "Show every agent's open workload, including the agents with nothing open.",
      solutionNote:
        "A condition in `WHERE` runs after the outer join, so `WHERE t.resolved_at IS NULL` keeps the agent with no tickets at all (their invented row is NULL everywhere) but drops Wren and Yusuf, whose tickets are all resolved. In the `ON` clause the same condition only decides which tickets to attach, and every agent survives with whatever matched, including nothing.",
    },
    {
      prompt: [
        "How many open tickets does each agent hold right now, and when was the oldest of them opened? Open means `resolved_at` is NULL.",
        "Every agent appears, including the ones holding nothing open (0 tickets, NULL `oldest_open`), so think about where the open-ticket condition belongs.",
        "Busiest first, ties by `full_name`.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "open_tickets", type: "integer" },
        { name: "oldest_open", type: "text" },
      ],
      starter: `SELECT a.full_name, COUNT(t.ticket_id) AS open_tickets
FROM agents a
LEFT JOIN tickets t ON t.agent_id = a.agent_id
GROUP BY a.agent_id, a.full_name
`,
      solution: `SELECT a.full_name,
       COUNT(t.ticket_id) AS open_tickets,
       MIN(t.opened_at) AS oldest_open
FROM agents a
LEFT JOIN tickets t ON t.agent_id = a.agent_id
                   AND t.resolved_at IS NULL
GROUP BY a.agent_id, a.full_name
ORDER BY open_tickets DESC, a.full_name`,
      tests: resultShape(
        ["full_name", "open_tickets", "oldest_open"],
        5,
        "All five agents, including the three with nothing open.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "reopened-tickets",
      title: "Reopened Tickets",
      difficulty: "Intermediate",
      topic: "LAG",
      dataset: SUPPORT,
      description:
        "Read the status log to find the tickets that came back after being resolved.",
      solutionNote:
        "`LAG` reads the previous row of the same partition, which turns \"what happened just before this event\" into a column you can filter on. The filter has to go in an outer query: a `WHERE` beside the window function runs first, and would remove the `resolved` rows before `LAG` could look back at them.",
    },
    {
      prompt: [
        "`ticket_events` logs each status change after a ticket is opened: `pending` when the agent is waiting on the customer, `open` when work resumes, `resolved` when it is closed. The `tickets` table cannot answer this question, because it keeps only the final `resolved_at`.",
        "A reopen is an `open` event that comes straight after a `resolved` one for the same ticket; an `open` after `pending` is just the customer replying. Use `LAG` over each ticket's events in `changed_at` order to see the status before each change.",
        "Return each reopened ticket with the customer's `company`, `closed_at` (when the `resolved` event happened) and `reopened_at`. Sort by `reopened_at`.",
      ],
      columns: [
        { name: "ticket_id", type: "integer" },
        { name: "company", type: "text" },
        { name: "closed_at", type: "text" },
        { name: "reopened_at", type: "text" },
      ],
      starter: `SELECT e.ticket_id, e.status, e.changed_at
FROM ticket_events e
ORDER BY e.ticket_id, e.changed_at
`,
      solution: `WITH history AS (
  SELECT e.ticket_id, e.status, e.changed_at,
         LAG(e.status)     OVER w AS previous_status,
         LAG(e.changed_at) OVER w AS previous_at
  FROM ticket_events e
  WINDOW w AS (PARTITION BY e.ticket_id ORDER BY e.changed_at, e.event_id)
)
SELECT h.ticket_id, c.company,
       h.previous_at AS closed_at,
       h.changed_at  AS reopened_at
FROM history h
JOIN tickets   t ON t.ticket_id   = h.ticket_id
JOIN customers c ON c.customer_id = t.customer_id
WHERE h.status = 'open'
  AND h.previous_status = 'resolved'
ORDER BY h.changed_at`,
      tests: resultShape(
        ["ticket_id", "company", "closed_at", "reopened_at"],
        2,
        "Two reopens; an open that follows pending is a customer reply, not a reopen.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "repeat-contacts",
      title: "Repeat Contacts",
      difficulty: "Intermediate",
      topic: "Gaps between events",
      dataset: SUPPORT,
      description:
        "Find the tickets a customer opened within a week of their previous one.",
      solutionNote:
        "Partitioned by customer and ordered by time, `LAG` puts each customer's previous ticket on the same row, so the gap is a subtraction. Everly Bakes' third ticket lands exactly 168 hours after its second and Brightwell Dental's second misses by five minutes, which is why the boundary is `<=` and measured in exact seconds rather than in rounded days.",
    },
    {
      prompt: [
        "A repeat contact is a ticket opened within 7 days of the same customer's previous ticket. Customers who keep coming back are often customers whose first problem was never really fixed.",
        "Find each ticket's previous ticket from the same customer with `LAG` over that customer's tickets in `opened_at` order. Keep the tickets opened at most 7 days (168 hours) after it; exactly 7 days still counts. `unixepoch()` differences are whole seconds, so the comparison is exact.",
        "Return the `company`, the ticket, the previous ticket and `hours_apart` rounded to 2 decimal places. Sort by `ticket_id`.",
      ],
      columns: [
        { name: "company", type: "text" },
        { name: "ticket_id", type: "integer" },
        { name: "previous_ticket_id", type: "integer" },
        { name: "hours_apart", type: "real" },
      ],
      starter: `SELECT c.company, t.ticket_id, t.opened_at
FROM tickets t
JOIN customers c ON c.customer_id = t.customer_id
ORDER BY c.company, t.opened_at
`,
      solution: `WITH ordered AS (
  SELECT t.ticket_id, t.customer_id, t.opened_at,
         LAG(t.ticket_id) OVER w AS previous_ticket_id,
         LAG(t.opened_at) OVER w AS previous_opened_at
  FROM tickets t
  WINDOW w AS (PARTITION BY t.customer_id ORDER BY t.opened_at)
)
SELECT c.company, o.ticket_id, o.previous_ticket_id,
       ROUND((unixepoch(o.opened_at) - unixepoch(o.previous_opened_at)) / 3600.0, 2)
         AS hours_apart
FROM ordered o
JOIN customers c ON c.customer_id = o.customer_id
WHERE unixepoch(o.opened_at) - unixepoch(o.previous_opened_at) <= 7 * 24 * 3600
ORDER BY o.ticket_id`,
      tests: resultShape(
        ["company", "ticket_id", "previous_ticket_id", "hours_apart"],
        6,
        "A gap of exactly 168 hours is a repeat; 168 hours and five minutes is not.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "weekly-channel-volume",
      title: "Weekly Channel Volume",
      difficulty: "Intermediate",
      topic: "Week bucketing",
      dataset: SUPPORT,
      description:
        "Count each week's tickets by channel, with weeks that start on Monday.",
      solutionNote:
        "The `weekday 1` modifier moves a date forward to the next Monday, or leaves it alone if it already is one, so stepping back six days first is what lands every day on its own week's Monday; `date(opened_at, 'weekday 1')` alone files a Wednesday under the following week. After that the pivot is conditional counting, one `COUNT(*) FILTER (WHERE channel = ...)` per column over the same group.",
    },
    {
      prompt: [
        "Report ticket volume per week, split by channel: one row per week, a column each for `email`, `chat` and `phone`, and a `total`.",
        "Weeks start on Monday. `date(opened_at, '-6 days', 'weekday 1')` gives the Monday on or before a timestamp: step back six days, then forward to the next Monday. Label each row with that Monday as `week_start`.",
        "Weekend tickets belong to the week that began on the Monday before them. Sort by `week_start`.",
      ],
      columns: [
        { name: "week_start", type: "text" },
        { name: "email", type: "integer" },
        { name: "chat", type: "integer" },
        { name: "phone", type: "integer" },
        { name: "total", type: "integer" },
      ],
      starter: `SELECT channel, COUNT(*) AS tickets
FROM tickets
GROUP BY channel
`,
      solution: `SELECT date(opened_at, '-6 days', 'weekday 1') AS week_start,
       COUNT(*) FILTER (WHERE channel = 'email') AS email,
       COUNT(*) FILTER (WHERE channel = 'chat')  AS chat,
       COUNT(*) FILTER (WHERE channel = 'phone') AS phone,
       COUNT(*) AS total
FROM tickets
GROUP BY week_start
ORDER BY week_start`,
      tests: resultShape(
        ["week_start", "email", "chat", "phone", "total"],
        3,
        "The Saturday and Sunday tickets belong to the week of 2024-03-04.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "median-resolution-time",
      title: "Median Resolution Time",
      difficulty: "Advanced",
      topic: "Medians with window functions",
      dataset: SUPPORT,
      description:
        "Compute the median time to resolve a ticket for each priority, without a median function.",
      solutionNote:
        "With `n` sorted values the middle sits at positions `(n + 1) / 2` and `(n + 2) / 2` under integer division: one position when `n` is odd, the two middle ones when it is even, so a single `AVG` over those rows handles both. For high priority the median is 46.08 hours against a mean of 53.78, which is pulled up mostly by one ticket that sat over a weekend for 113 hours.",
    },
    {
      prompt: [
        "How long does it take to resolve a ticket? A mean is dragged about by one ticket stuck over a weekend, so report the median resolution time in hours for each priority, over resolved tickets only.",
        "SQLite has no `median()`. Number each priority's resolution times in order with `ROW_NUMBER()`, count them with `COUNT(*) OVER`, and take the middle value, or the average of the middle two when the count is even.",
        "Return the `priority`, the number of `resolved` tickets and `median_hours` rounded to 2 decimal places. Sort from the tightest resolution target to the loosest, using `resolution_hours` in `sla_targets`.",
      ],
      columns: [
        { name: "priority", type: "text" },
        { name: "resolved", type: "integer" },
        { name: "median_hours", type: "real" },
      ],
      starter: `-- This is the mean, not the median: replace it with the middle value.
SELECT t.priority,
       COUNT(*) AS resolved,
       ROUND(AVG((unixepoch(t.resolved_at) - unixepoch(t.opened_at)) / 3600.0), 2) AS median_hours
FROM tickets t
WHERE t.resolved_at IS NOT NULL
GROUP BY t.priority
`,
      solution: `WITH durations AS (
  SELECT t.priority,
         (unixepoch(t.resolved_at) - unixepoch(t.opened_at)) / 3600.0 AS hours
  FROM tickets t
  WHERE t.resolved_at IS NOT NULL
), ranked AS (
  SELECT priority, hours,
         ROW_NUMBER() OVER (PARTITION BY priority ORDER BY hours) AS rn,
         COUNT(*)     OVER (PARTITION BY priority)                AS n
  FROM durations
)
SELECT r.priority, r.n AS resolved, ROUND(AVG(r.hours), 2) AS median_hours
FROM ranked r
JOIN sla_targets s ON s.priority = r.priority
WHERE r.rn IN ((r.n + 1) / 2, (r.n + 2) / 2)
GROUP BY r.priority, r.n, s.resolution_hours
ORDER BY s.resolution_hours`,
      tests: resultShape(
        ["priority", "resolved", "median_hours"],
        4,
        "The middle value, or the mean of the middle two when the count is even.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "time-waiting-on-customer",
      title: "Time Waiting on Customer",
      difficulty: "Advanced",
      topic: "Intervals with LEAD",
      dataset: SUPPORT,
      description:
        "Total how long each ticket has spent pending on the customer, from a log of status changes.",
      solutionNote:
        `\`LEAD\` puts the next event's timestamp on each row, which turns a log of instants into a list of intervals; the pending ones are then a filter and a sum. A ticket's last event has no next row, so \`COALESCE(next_at, '${AS_OF}')\` closes the spell of the ticket that is still waiting, which would otherwise end up with no total at all.`,
    },
    {
      prompt: [
        "While a ticket is `pending`, the team is waiting on the customer, and that time is usually taken out of the team's own numbers. Work out how long each ticket has spent pending.",
        `A pending spell starts at a \`pending\` event in \`ticket_events\` and ends at that ticket's next event, whatever it is. A ticket still pending at the export time, \`'${AS_OF}'\`, has a spell that runs until then. Some tickets went pending more than once: add their spells together.`,
        "Return the tickets that were ever pending, with the `company`, the number of `pending_spells`, and `hours_pending` rounded to 2 decimal places. Longest first, ties by `ticket_id`.",
      ],
      columns: [
        { name: "ticket_id", type: "integer" },
        { name: "company", type: "text" },
        { name: "pending_spells", type: "integer" },
        { name: "hours_pending", type: "real" },
      ],
      starter: `SELECT e.ticket_id, e.status, e.changed_at
FROM ticket_events e
WHERE e.status = 'pending'
ORDER BY e.ticket_id, e.changed_at
`,
      solution: `WITH spells AS (
  SELECT e.ticket_id, e.status, e.changed_at,
         LEAD(e.changed_at) OVER (
           PARTITION BY e.ticket_id ORDER BY e.changed_at, e.event_id
         ) AS next_at
  FROM ticket_events e
)
SELECT sp.ticket_id, c.company,
       COUNT(*) AS pending_spells,
       ROUND(SUM(unixepoch(COALESCE(sp.next_at, '${AS_OF}'))
                 - unixepoch(sp.changed_at)) / 3600.0, 2) AS hours_pending
FROM spells sp
JOIN tickets   t ON t.ticket_id   = sp.ticket_id
JOIN customers c ON c.customer_id = t.customer_id
WHERE sp.status = 'pending'
GROUP BY sp.ticket_id, c.company
ORDER BY hours_pending DESC, sp.ticket_id`,
      tests: resultShape(
        ["ticket_id", "company", "pending_spells", "hours_pending"],
        4,
        "Two spells add up, and a spell still open runs to the export time.",
        true,
      ),
    },
  ),
];
