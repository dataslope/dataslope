/**
 * Multi-step SQL challenges over the flights dataset.
 *
 * Both are reports an operations desk would actually build, and both end on a
 * question the obvious query gets subtly wrong. The punctuality league has to
 * count cancelled flights against a route, which an average of delays cannot
 * do because a cancelled flight's delay is NULL. The connection finder has to
 * choose the best connection per trip, and "shortest wait at the hub" and
 * "earliest arrival" are different answers on the one trip where it matters.
 *
 * Shared constants carry each step's accepted query into the next step's
 * starter and CTE, so a fix in step 1 cannot leave step 3 quoting a version
 * that no longer exists. `__tests__/challengeSolutions` runs every step's
 * solution against node:sqlite.
 */

import { indentSql, sqlSteps } from "./authoring";
import { FLIGHTS } from "./dataset-flights";
import type { Challenge, SqlChallengeTest } from "./types";

/** Whole minutes between two timestamps, rounded before the cast. */
function minutes(from: string, to: string): string {
  return `CAST(ROUND((julianday(${to}) - julianday(${from})) * 1440) AS INTEGER)`;
}

/** Columns, row count and values, with the row-count check explained. */
function checks(
  columns: string[],
  rows: number,
  rowName: string,
  rowDescription: string,
  matchName: string,
): SqlChallengeTest[] {
  return [
    {
      id: "columns",
      name: `Returns ${columns.join(", ")}`,
      description: "With those names, in that order.",
      expectedColumns: columns,
    },
    {
      id: "rowcount",
      name: rowName,
      description: rowDescription,
      expectedRowCount: rows,
    },
    {
      id: "matches",
      name: matchName,
      matchesSolution: true,
      ordered: true,
    },
  ];
}

// ─── Punctuality league ──────────────────────────────────────────────

const ARR_DELAY = minutes("scheduled_arr", "actual_arr");

const DELAYS = `SELECT flight_no, origin, destination,
       ${ARR_DELAY} AS arr_delay_min
FROM flights
ORDER BY scheduled_dep`;

const STATUS = `CASE
         WHEN actual_arr IS NULL THEN 'cancelled'
         WHEN ${ARR_DELAY} <= 15 THEN 'on time'
         ELSE 'late'
       END`;

const LABELLED_BODY = `SELECT flight_no, origin, destination,
       ${ARR_DELAY} AS arr_delay_min,
       ${STATUS} AS status
FROM flights`;

const LABELLED = `${LABELLED_BODY}
ORDER BY scheduled_dep`;

const LABELLED_CTE = `WITH labelled AS (
${indentSql(LABELLED_BODY)}
)`;

const PUNCTUALITY_LEAGUE = sqlSteps(
  {
    slug: "punctuality-league",
    title: "Punctuality League",
    difficulty: "Intermediate",
    topic: "Rates with RANK",
    dataset: FLIGHTS,
    description:
      "Label every flight on time, late or cancelled, then rank the routes by how reliably they arrive.",
    solutionNote:
      "The league only works if a cancellation counts against a route. Any average over the flights that arrived skips cancelled flights entirely, because their delay is NULL: an on-time share computed that way gives Tollmere to Bramwick 3 out of 3 and a share of first place despite losing a flight. Labelling every scheduled flight and dividing by all of them makes a cancellation cost exactly what a late arrival costs.",
  },
  [
    {
      title: "Arrival delay per flight",
      short: "Delays",
      solutionNote:
        "NULL is the honest delay for a flight that never arrived: no number of minutes describes it. Keeping the row now, rather than filtering it out, is what lets step 3 count it against its route. Rounding before the `CAST` matters too: HL303's 16 minutes is 15.9999997 in raw `julianday` arithmetic.",
      prompt: [
        "Start with how late each flight arrived: `actual_arr` minus `scheduled_arr`, in whole minutes. `julianday()` arithmetic is not exact, so `ROUND` the difference before casting it to an integer. Early arrivals are negative.",
        "Keep all 25 flights. A cancelled flight has no arrival, so its delay is NULL; do not drop it, because the league needs it later. Sort by `scheduled_dep`.",
      ],
      columns: [
        { name: "flight_no", type: "text" },
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "arr_delay_min", type: "integer" },
      ],
      starter: `SELECT flight_no, origin, destination
FROM flights
ORDER BY scheduled_dep
`,
      solution: DELAYS,
      tests: checks(
        ["flight_no", "origin", "destination", "arr_delay_min"],
        25,
        "All twenty-five flights",
        "The three cancelled flights stay, with a NULL delay.",
        "Delays match the reference result",
      ),
    },
    {
      title: "Label each flight",
      short: "Labels",
      solutionNote:
        "Test for the cancellation first. `CASE` takes the first branch that is true, and `NULL <= 15` is not true, so without a branch of its own a cancelled flight falls through to `ELSE` and is labelled late. HL104 is the boundary: exactly 15 minutes late, and on time.",
      prompt: [
        "Add a `status` column: `'cancelled'` when the flight has no actual arrival, `'on time'` when it arrived no more than 15 minutes after schedule (early counts as on time), and `'late'` otherwise.",
        "Compare the whole-minute delay, not the raw difference. Keep every row and every column from step 1.",
      ],
      columns: [
        { name: "flight_no", type: "text" },
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "arr_delay_min", type: "integer" },
        { name: "status", type: "text" },
      ],
      starter: `${DELAYS}
`,
      solution: LABELLED,
      tests: checks(
        ["flight_no", "origin", "destination", "arr_delay_min", "status"],
        25,
        "Still twenty-five flights",
        "Labelling must not drop anything.",
        "Every flight has the right status",
      ),
    },
    {
      title: "Rank the routes",
      short: "League",
      solutionNote:
        "Dividing by every scheduled flight, not just the ones that arrived, is the decision that makes this a punctuality league rather than a delay average. `RANK()` over the share then handles the ties: three routes are perfect and share first place, and the next route is fourth, not second.",
      prompt: [
        "Now the league table: one row per route with its scheduled `flights`, how many arrived `on_time`, and `on_time_pct`, the on-time share of all scheduled flights as a percentage rounded to 1 decimal place. A cancellation counts against a route just as a late arrival does.",
        "`position` is the route's place by on-time share, highest first. Routes with the same share share a position and the next one skips ahead (1, 1, 1, 4), which is what `RANK()` does.",
        "Sort by `position`, then `origin`, then `destination`.",
      ],
      columns: [
        { name: "position", type: "integer" },
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "flights", type: "integer" },
        { name: "on_time", type: "integer" },
        { name: "on_time_pct", type: "real" },
      ],
      starter: `${LABELLED_CTE}
SELECT origin, destination, status
FROM labelled
`,
      solution: `${LABELLED_CTE},
routes AS (
  SELECT origin, destination,
         COUNT(*)                AS flights,
         SUM(status = 'on time') AS on_time
  FROM labelled
  GROUP BY origin, destination
)
SELECT RANK() OVER (ORDER BY 1.0 * on_time / flights DESC) AS position,
       origin, destination, flights, on_time,
       ROUND(100.0 * on_time / flights, 1) AS on_time_pct
FROM routes
ORDER BY position, origin, destination`,
      tests: checks(
        ["position", "origin", "destination", "flights", "on_time", "on_time_pct"],
        11,
        "One row per route",
        "Eleven routes, including the ones that lost a flight.",
        "The league matches the reference result",
      ),
    },
  ],
);

// ─── Hub connections ─────────────────────────────────────────────────

const LAYOVER = minutes("i.scheduled_arr", "o.scheduled_dep");

const CONNECTIONS_BODY = `SELECT i.flight_no AS inbound, o.flight_no AS outbound,
       i.origin, o.destination,
       i.scheduled_dep AS departs, o.scheduled_arr AS arrives,
       ${LAYOVER} AS layover_min
FROM flights i
JOIN flights o
  ON o.origin = i.destination
 AND o.destination <> i.origin
WHERE i.destination = 'BRK'
  AND i.actual_arr IS NOT NULL
  AND o.actual_dep IS NOT NULL
  AND ${LAYOVER} BETWEEN 40 AND 180`;

const CONNECTIONS = `${CONNECTIONS_BODY}
ORDER BY i.scheduled_arr, layover_min`;

const CONNECTIONS_CTE = `WITH connections AS (
${indentSql(CONNECTIONS_BODY)}
)`;

const HUB_CONNECTIONS = sqlSteps(
  {
    slug: "hub-connections",
    title: "Hub Connections",
    difficulty: "Advanced",
    topic: "Joins on a time window",
    dataset: FLIGHTS,
    description:
      "Pair arrivals and departures at the Bramwick hub into connections, then pick the best one for each trip.",
    solutionNote:
      "A connection is a self join of `flights` on a time window: an arrival and a departure at the same airport, a band of minutes apart. Everything after that is choosing, and the choice depends on what best means. The shortest wait and the earliest arrival are different questions, and for Tollmere to Caverhithe they have different answers.",
  },
  [
    {
      title: "Every connection at the hub",
      short: "Pairs",
      solutionNote:
        "Joining `flights` to itself pairs every inbound flight with every outbound one, and the conditions cut that down to what a passenger could actually do. Filter on the rounded minutes: HL201 into HL202 is exactly 40 minutes and belongs in the list. Leaving the cancelled flights in would add eight connections that nobody could have made that day.",
      prompt: [
        "A passenger landing at Bramwick (`BRK`) can connect to a later departure from it. Pair every flight that lands at BRK with every flight that leaves BRK between 40 and 180 minutes later, both ends included, measured from the inbound's `scheduled_arr` to the outbound's `scheduled_dep` in whole minutes.",
        "Leave out cancelled flights on either side, and leave out an onward flight that goes back where the passenger came from: Tollmere to Bramwick to Tollmere is not a connection.",
        "Return both flight numbers, the trip's `origin` and final `destination`, when it `departs` the origin and `arrives` at the destination (both scheduled), and the `layover_min`. Sort by the inbound flight's scheduled arrival, then by layover.",
      ],
      columns: [
        { name: "inbound", type: "text" },
        { name: "outbound", type: "text" },
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "departs", type: "text" },
        { name: "arrives", type: "text" },
        { name: "layover_min", type: "integer" },
      ],
      starter: `SELECT i.flight_no AS inbound, o.flight_no AS outbound
FROM flights i
JOIN flights o ON o.origin = i.destination
WHERE i.destination = 'BRK'
`,
      solution: CONNECTIONS,
      tests: checks(
        ["inbound", "outbound", "origin", "destination", "departs", "arrives", "layover_min"],
        15,
        "Fifteen connections",
        "Cancelled flights, round trips and waits outside 40 to 180 minutes are all excluded.",
        "Connections match the reference result",
      ),
    },
    {
      title: "Options per trip",
      short: "Options",
      solutionNote:
        "Wrapping step 1 in a CTE keeps the connection rules in one place, and this step is an ordinary `GROUP BY` over its rows. Notice what `MIN(layover_min)` cannot tell you: which flights produced that layover. Step 3 needs the whole row.",
      prompt: [
        "Summarise step 1 by trip: for each `origin` and `destination`, how many connections there are and the shortest layover among them.",
        "Sort by `origin`, then `destination`.",
      ],
      columns: [
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "options", type: "integer" },
        { name: "shortest_layover_min", type: "integer" },
      ],
      starter: `${CONNECTIONS_CTE}
SELECT origin, destination, layover_min
FROM connections
`,
      solution: `${CONNECTIONS_CTE}
SELECT origin, destination,
       COUNT(*)         AS options,
       MIN(layover_min) AS shortest_layover_min
FROM connections
GROUP BY origin, destination
ORDER BY origin, destination`,
      tests: checks(
        ["origin", "destination", "options", "shortest_layover_min"],
        11,
        "Eleven trips",
        "One row per origin and final destination.",
        "Options match the reference result",
      ),
    },
    {
      title: "Best connection per trip",
      short: "Best",
      solutionNote:
        "`ROW_NUMBER()` partitioned by trip and ordered by `arrives`, then `departs DESC`, puts the best connection first in each trip, and keeping row 1 keeps its flight numbers. Picking the shortest layover from step 2 would have chosen HL102 then HL103 for Tollmere to Caverhithe, which lands 40 minutes after HL401 then HL302.",
      prompt: [
        "For each trip, pick the one connection that gets the passenger to their destination earliest. If two arrive at the same time, prefer the one that leaves the origin later, so less of the day is spent travelling.",
        "This is not always the shortest layover from step 2. For Tollmere to Caverhithe, taking an earlier first flight and waiting longer at Bramwick gets you there sooner.",
        "Return the trip, both flight numbers, `departs`, `arrives` and `layover_min`. Sort by `origin`, then `destination`.",
      ],
      columns: [
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "inbound", type: "text" },
        { name: "outbound", type: "text" },
        { name: "departs", type: "text" },
        { name: "arrives", type: "text" },
        { name: "layover_min", type: "integer" },
      ],
      starter: `${CONNECTIONS_CTE}
SELECT origin, destination, inbound, outbound, departs, arrives, layover_min
FROM connections
ORDER BY origin, destination
`,
      solution: `${CONNECTIONS_CTE},
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY origin, destination
           ORDER BY arrives, departs DESC
         ) AS rn
  FROM connections
)
SELECT origin, destination, inbound, outbound, departs, arrives, layover_min
FROM ranked
WHERE rn = 1
ORDER BY origin, destination`,
      tests: checks(
        ["origin", "destination", "inbound", "outbound", "departs", "arrives", "layover_min"],
        11,
        "One connection per trip",
        "Each of the eleven trips keeps exactly one connection.",
        "The best connections match the reference result",
      ),
    },
  ],
);

export const SQL_MULTI_FLIGHTS: Challenge[] = [PUNCTUALITY_LEAGUE, HUB_CONNECTIONS];
