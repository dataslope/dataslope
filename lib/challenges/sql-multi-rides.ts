/**
 * Multi-step SQL challenges over the rides dataset.
 *
 * Both are builds where the first step decides what counts, and every later
 * step inherits that decision. Driver payouts count completed trips toward a
 * weekly bonus, and a cancelled request in the wrong week pays out a bonus
 * nobody earned. Rider retention dates each rider from their first completed
 * trip, and its final table has to show the week in which a whole cohort
 * stayed away, which a table built from activity alone has no row for.
 *
 * `__tests__/challengeSolutions` runs every step's solution against
 * node:sqlite.
 */

import { indentSql, sqlSteps } from "./authoring";
import { RIDES } from "./dataset-rides";
import type { Challenge } from "./types";

/** The Monday a timestamp's week starts on. */
const WEEK_OF = (col: string) => `date(${col}, 'weekday 0', '-6 days')`;
/** A completed week of this many trips earns the bonus. */
const BONUS_TRIPS = 5;
/** The flat weekly bonus. */
const BONUS = "25.00";

// ─── Driver payouts ──────────────────────────────────────────────────

const SHARES_BODY = `SELECT t.trip_id, d.driver_name,
       ${WEEK_OF("t.requested_at")} AS week_start,
       t.fare, tr.commission_rate,
       ROUND(t.fare * (1 - tr.commission_rate), 2) AS driver_share
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
JOIN tiers  tr ON tr.tier = d.tier
WHERE t.started_at IS NOT NULL`;

const SHARES = `${SHARES_BODY}
ORDER BY t.trip_id`;

const SHARES_CTE = `WITH shares AS (
${indentSql(SHARES_BODY)}
)`;

const WEEKLY_BODY = `SELECT driver_name, week_start,
       COUNT(*) AS trips,
       ROUND(SUM(fare), 2) AS fares,
       ROUND(SUM(driver_share), 2) AS driver_share
FROM shares
GROUP BY driver_name, week_start`;

const WEEKLY = `${SHARES_CTE}
${WEEKLY_BODY}
ORDER BY week_start, driver_name`;

const WEEKLY_CTE = `${SHARES_CTE}, weekly AS (
${indentSql(WEEKLY_BODY)}
)`;

const BONUS_CASE = `CASE WHEN trips >= ${BONUS_TRIPS} THEN ${BONUS} ELSE 0.0 END`;

const DRIVER_PAYOUTS = sqlSteps(
  {
    slug: "driver-weekly-payouts",
    title: "Driver Weekly Payouts",
    difficulty: "Intermediate",
    topic: "Lookup tables and thresholds",
    dataset: RIDES,
    description:
      "Turn fares into weekly driver payouts: commission by tier, then a bonus for busy weeks.",
    solutionNote:
      "The bonus threshold counts trips, and only completed trips are trips. Amara Diallo was sent five requests in the week of May 13, but one was cancelled; a payout built from requests pays her a 25.00 bonus she did not earn. Filtering to completed trips in step 1 is a decision every later step inherits.",
  },
  [
    {
      title: "Each trip's driver share",
      short: "Share",
      solutionNote:
        "A lookup table joins like any other: `drivers.tier` to `tiers.tier` brings the rate alongside the fare. Rounding each share to the cent here, where the money is actually split, means the weekly totals in the next step add up exactly what was paid out.",
      prompt: [
        "The company keeps a commission on every completed trip, and the rate depends on the driver's tier: look it up in `tiers` through `drivers.tier`. The driver keeps the rest of the fare.",
        "For every completed trip, return the `trip_id`, the `driver_name`, the trip's `week_start`, the `fare`, the `commission_rate` and the `driver_share`, rounded to 2 decimal places. `week_start` is the Monday of the week the trip was requested in: `date(requested_at, 'weekday 0', '-6 days')`. Sort by `trip_id`.",
      ],
      columns: [
        { name: "trip_id", type: "integer" },
        { name: "driver_name", type: "text" },
        { name: "week_start", type: "text" },
        { name: "fare", type: "real" },
        { name: "commission_rate", type: "real" },
        { name: "driver_share", type: "real" },
      ],
      starter: `SELECT t.trip_id, d.driver_name, t.fare
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
ORDER BY t.trip_id
`,
      solution: SHARES,
      tests: [
        {
          id: "columns",
          name: "Returns trip_id, driver_name, week_start, fare, commission_rate and driver_share",
          expectedColumns: [
            "trip_id",
            "driver_name",
            "week_start",
            "fare",
            "commission_rate",
            "driver_share",
          ],
        },
        {
          id: "rowcount",
          name: "Thirty-nine completed trips",
          description: "Cancelled requests have no fare to split and are left out.",
          expectedRowCount: 39,
        },
        {
          id: "ordered",
          name: "Shares match the reference result",
          description: "Pro drivers pay 20% commission and standard drivers 25%.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Weekly totals",
      short: "Weekly",
      solutionNote:
        "Because step 1 already carries a `week_start` label, the weekly roll-up is a plain `GROUP BY` on two columns. Building the label once and reusing it means every step puts a trip in the same week, instead of each re-deriving the rule and hoping they agree.",
      prompt: [
        "Roll the shares up to one row per driver per week: the number of completed `trips`, the total `fares` and the total `driver_share`, both totals rounded to 2 decimal places.",
        "Sort by `week_start`, then `driver_name`.",
      ],
      columns: [
        { name: "driver_name", type: "text" },
        { name: "week_start", type: "text" },
        { name: "trips", type: "integer" },
        { name: "fares", type: "real" },
        { name: "driver_share", type: "real" },
      ],
      starter: `${SHARES_CTE}
SELECT driver_name, week_start
FROM shares
`,
      solution: WEEKLY,
      tests: [
        {
          id: "columns",
          name: "Returns driver_name, week_start, trips, fares and driver_share",
          expectedColumns: ["driver_name", "week_start", "trips", "fares", "driver_share"],
        },
        {
          id: "rowcount",
          name: "Twenty-one driver weeks",
          expectedRowCount: 21,
        },
        {
          id: "ordered",
          name: "Weekly totals match the reference result",
          description: "Each total adds up that week's per-trip shares.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Bonus and payout",
      short: "Payout",
      solutionNote:
        "A `CASE` on the weekly count is the whole rule, and it can only be right because the count underneath it is. `>= 5` is the reading of at least five; with the weekly table already built, the threshold is one expression and the payout one addition.",
      prompt: [
        `A driver who completes at least ${BONUS_TRIPS} trips in a week earns a ${BONUS} bonus on top of their share. Add a \`bonus\` column (${BONUS} or 0.0) and the \`payout\`, share plus bonus, rounded to 2 decimal places.`,
        "The threshold is completed trips. Amara Diallo was sent five requests in the week of May 13, but one was cancelled, so that week earns no bonus.",
        "Return `driver_name`, `week_start`, `trips`, `driver_share`, `bonus` and `payout` for every driver week, sorted by `week_start`, then `driver_name`.",
      ],
      columns: [
        { name: "driver_name", type: "text" },
        { name: "week_start", type: "text" },
        { name: "trips", type: "integer" },
        { name: "driver_share", type: "real" },
        { name: "bonus", type: "real" },
        { name: "payout", type: "real" },
      ],
      starter: `${WEEKLY_CTE}
SELECT driver_name, week_start, trips, driver_share
FROM weekly
ORDER BY week_start, driver_name
`,
      solution: `${WEEKLY_CTE}
SELECT driver_name, week_start, trips, driver_share,
       ${BONUS_CASE} AS bonus,
       ROUND(driver_share + ${BONUS_CASE}, 2) AS payout
FROM weekly
ORDER BY week_start, driver_name`,
      tests: [
        {
          id: "columns",
          name: "Returns driver_name, week_start, trips, driver_share, bonus and payout",
          expectedColumns: [
            "driver_name",
            "week_start",
            "trips",
            "driver_share",
            "bonus",
            "payout",
          ],
        },
        {
          id: "rowcount",
          name: "Still twenty-one driver weeks",
          expectedRowCount: 21,
        },
        {
          id: "ordered",
          name: "Payouts match the reference result",
          description: "Only Tomas Reyna's six-trip week earns the bonus.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

// ─── Rider retention ─────────────────────────────────────────────────

const COHORTS_BODY = `SELECT r.rider_id, r.rider_name,
       MIN(${WEEK_OF("t.requested_at")}) AS cohort_week
FROM riders r
JOIN trips t ON t.rider_id = r.rider_id
WHERE t.started_at IS NOT NULL
GROUP BY r.rider_id, r.rider_name`;

const COHORTS = `${COHORTS_BODY}
ORDER BY cohort_week, r.rider_name`;

const COHORTS_CTE = `WITH cohorts AS (
${indentSql(COHORTS_BODY)}
)`;

const ACTIVITY_BODY = `SELECT DISTINCT c.rider_name, c.cohort_week,
       ${WEEK_OF("t.requested_at")} AS active_week,
       CAST((julianday(${WEEK_OF("t.requested_at")})
             - julianday(c.cohort_week)) / 7 AS INTEGER) AS week_offset
FROM cohorts c
JOIN trips t ON t.rider_id = c.rider_id
WHERE t.started_at IS NOT NULL`;

const ACTIVITY = `${COHORTS_CTE}
${ACTIVITY_BODY}
ORDER BY c.cohort_week, c.rider_name, active_week`;

const ACTIVITY_CTE = `${COHORTS_CTE}, activity AS (
${indentSql(ACTIVITY_BODY)}
)`;

const RIDER_RETENTION = sqlSteps(
  {
    slug: "rider-retention-cohorts",
    title: "Rider Retention Cohorts",
    difficulty: "Advanced",
    topic: "Cohort retention",
    dataset: RIDES,
    description:
      "Group riders by the week of their first trip and track what share of each cohort rides again.",
    solutionNote:
      "A retention table is a grid, and the cells that matter most are the empty ones. Built from activity alone, a week in which nobody from a cohort came back has no row to hold its 0%, so the table stops short exactly where retention collapsed. Generating the grid of cohorts against weeks first and counting into it with a `LEFT JOIN` is what keeps the zeros.",
  },
  [
    {
      title: "Find each rider's cohort",
      short: "Cohorts",
      solutionNote:
        "The first week is `MIN` of the week label, since ISO dates compare in date order. Filtering to completed trips before taking the minimum is what puts Grace Lindqvist in the right cohort; without it, her cancelled request would already have set her start a week early.",
      prompt: [
        "A rider's cohort is the week, starting on Monday, of their first completed trip. A trip's week is `date(requested_at, 'weekday 0', '-6 days')`.",
        "A cancelled request does not start anyone's history: Grace Lindqvist's first request was cancelled the week before her first trip. Riders who have never completed a trip have no cohort and are left out.",
        "Return `rider_id`, `rider_name` and `cohort_week`, sorted by `cohort_week`, then `rider_name`.",
      ],
      columns: [
        { name: "rider_id", type: "integer" },
        { name: "rider_name", type: "text" },
        { name: "cohort_week", type: "text" },
      ],
      starter: `SELECT r.rider_id, r.rider_name
FROM riders r
JOIN trips t ON t.rider_id = r.rider_id
GROUP BY r.rider_id, r.rider_name
`,
      solution: COHORTS,
      tests: [
        {
          id: "columns",
          name: "Returns rider_id, rider_name and cohort_week",
          expectedColumns: ["rider_id", "rider_name", "cohort_week"],
        },
        {
          id: "rowcount",
          name: "Eleven riders with a cohort",
          description: "Jonas Weber never completed a trip, so he has none.",
          expectedRowCount: 11,
        },
        {
          id: "ordered",
          name: "Cohorts match the reference result",
          description: "Grace Lindqvist belongs to the cohort of May 20, not May 13.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Weeks each rider was active",
      short: "Activity",
      solutionNote:
        "`SELECT DISTINCT` collapses a busy week to one row per rider, which is what makes the next step's count a count of riders rather than of trips. Week starts are exactly seven days apart, so the difference in `julianday` divided by 7 is a whole number of weeks.",
      prompt: [
        "Now list the weeks in which each rider completed at least one trip, with `week_offset`: how many weeks after their cohort week that was, 0 for the cohort week itself.",
        "A rider who took three trips in a week was active that week once. Return `rider_name`, `cohort_week`, `active_week` and `week_offset`, sorted by `cohort_week`, then `rider_name`, then `active_week`.",
      ],
      columns: [
        { name: "rider_name", type: "text" },
        { name: "cohort_week", type: "text" },
        { name: "active_week", type: "text" },
        { name: "week_offset", type: "integer" },
      ],
      starter: `${COHORTS_CTE}
SELECT c.rider_name, c.cohort_week
FROM cohorts c
JOIN trips t ON t.rider_id = c.rider_id
WHERE t.started_at IS NOT NULL
`,
      solution: ACTIVITY,
      tests: [
        {
          id: "columns",
          name: "Returns rider_name, cohort_week, active_week and week_offset",
          expectedColumns: ["rider_name", "cohort_week", "active_week", "week_offset"],
        },
        {
          id: "rowcount",
          name: "Twenty-four active rider weeks",
          description: "One row per rider per active week, however many trips that week held.",
          expectedRowCount: 24,
        },
        {
          id: "ordered",
          name: "Activity matches the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "The retention table",
      short: "Retention",
      solutionNote:
        "The grid comes from a join on an inequality, every cohort against every week on or after it, and the counting happens through a `LEFT JOIN` into it. Counting a column from the joined side rather than `*` is what lets an empty cell come out as 0: `COUNT(*)` counts the grid row itself and reports one rider where there were none.",
      prompt: [
        "Build the retention table. For each cohort, and each week from its cohort week to the last week in the data (the week of May 27), return the `cohort_size`, the number of its riders active that week as `active_riders`, and `retention_pct`: active riders as a percentage of the cohort, rounded to 1 decimal place.",
        "A week in which none of a cohort rode still belongs in the table, at 0 riders and 0.0%. Grouping the activity from step 2 only produces rows for weeks when somebody rode, so start from a grid of every cohort against every week on or after it, then count into that.",
        "Return `cohort_week`, `week_offset`, `cohort_size`, `active_riders` and `retention_pct`, sorted by `cohort_week`, then `week_offset`.",
      ],
      columns: [
        { name: "cohort_week", type: "text" },
        { name: "week_offset", type: "integer" },
        { name: "cohort_size", type: "integer" },
        { name: "active_riders", type: "integer" },
        { name: "retention_pct", type: "real" },
      ],
      starter: `${ACTIVITY_CTE}
SELECT cohort_week, week_offset, COUNT(*) AS active_riders
FROM activity
GROUP BY cohort_week, week_offset
`,
      solution: `${ACTIVITY_CTE}, sizes AS (
  SELECT cohort_week, COUNT(*) AS cohort_size
  FROM cohorts
  GROUP BY cohort_week
), weeks AS (
  SELECT DISTINCT active_week AS week FROM activity
), grid AS (
  SELECT s.cohort_week, s.cohort_size, w.week
  FROM sizes s
  JOIN weeks w ON w.week >= s.cohort_week
)
SELECT g.cohort_week,
       CAST((julianday(g.week) - julianday(g.cohort_week)) / 7 AS INTEGER) AS week_offset,
       g.cohort_size,
       COUNT(a.rider_name) AS active_riders,
       ROUND(100.0 * COUNT(a.rider_name) / g.cohort_size, 1) AS retention_pct
FROM grid g
LEFT JOIN activity a
  ON a.cohort_week = g.cohort_week AND a.active_week = g.week
GROUP BY g.cohort_week, g.week, g.cohort_size
ORDER BY g.cohort_week, week_offset`,
      tests: [
        {
          id: "columns",
          name: "Returns cohort_week, week_offset, cohort_size, active_riders and retention_pct",
          expectedColumns: [
            "cohort_week",
            "week_offset",
            "cohort_size",
            "active_riders",
            "retention_pct",
          ],
        },
        {
          id: "rowcount",
          name: "Ten cells in the table",
          description:
            "Including the week in which nobody from the May 20 cohort came back.",
          expectedRowCount: 10,
        },
        {
          id: "ordered",
          name: "Retention matches the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

export const SQL_MULTI_RIDES: Challenge[] = [DRIVER_PAYOUTS, RIDER_RETENTION];
