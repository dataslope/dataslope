/**
 * Single-query SQL challenges over the rides dataset.
 *
 * The thread through them is that a row in `trips` is a request, not a
 * trip. A cancelled request has no `started_at`, no fare and no rating, and
 * most of these questions change their answer depending on whether it is
 * counted: a rider's first trip, a driver's last one, a streak of active
 * days, a pair who ride together. The rest lean on what NULL means on
 * purpose: `AVG` skipping the unrated trips, `COUNT(column)` counting only
 * the ones that started.
 *
 * Anything open-ended is measured as of 2024-06-03, the Monday after the
 * data ends. Every solution is executed against node:sqlite by
 * `__tests__/challengeSolutions`, so a wrong expectation fails CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { RIDES } from "./dataset-rides";
import type { Challenge } from "./types";

/** The day the trip log was exported. */
const AS_OF = "2024-06-03";

export const SQL_RIDES: Challenge[] = [
  sqlChallenge(
    {
      slug: "trips-by-hour-of-day",
      title: "Trips by Hour of Day",
      difficulty: "Beginner",
      topic: "Extracting date parts",
      dataset: RIDES,
      description:
        "Count ride requests by the hour they were made, and how many of them turned into trips.",
      solutionNote:
        "`strftime('%H', requested_at)` pulls the hour out of a timestamp as text, and `CAST(... AS INTEGER)` makes it the number 8 rather than the string '08'. `COUNT(started_at)` counts only non-NULL values, so it counts completed trips with no `CASE` at all, while `COUNT(*)` counts every request.",
    },
    {
      prompt: [
        "Dispatch wants to know when demand peaks. Group every request in `trips` by the hour of the day it was requested, from 0 to 23, and count how many `requests` came in and how many were `completed`.",
        "A cancelled request has no `started_at`. Hours with no requests at all are left out. Return `hour` as an integer and sort by it.",
      ],
      columns: [
        { name: "hour", type: "integer" },
        { name: "requests", type: "integer" },
        { name: "completed", type: "integer" },
      ],
      starter: `SELECT requested_at
FROM trips
`,
      solution: `SELECT CAST(strftime('%H', requested_at) AS INTEGER) AS hour,
       COUNT(*) AS requests,
       COUNT(started_at) AS completed
FROM trips
GROUP BY hour
ORDER BY hour`,
      tests: resultShape(
        ["hour", "requests", "completed"],
        16,
        "One row per hour that saw at least one request.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "average-driver-rating",
      title: "Average Driver Rating",
      difficulty: "Beginner",
      topic: "AVG and NULL",
      dataset: RIDES,
      description: "Average each driver's rating over the trips riders actually rated.",
      solutionNote:
        "`AVG` already skips NULLs, so `AVG(rating)` is the average over rated trips with no extra work, and `COUNT(rating)` counts them the same way. The mistake is trying to help: `COALESCE(rating, 0)` turns every unrated trip into a zero-star review and drags Lucia Ferraz from 4.80 to 3.43.",
    },
    {
      prompt: [
        "Riders can rate a trip from 1 to 5 once it ends, and many do not bother, so `rating` is NULL on plenty of completed trips (and on every cancelled one).",
        "For each driver with at least one completed trip, return the number of `completed_trips`, how many of those were rated as `rated_trips`, and `avg_rating` rounded to 2 decimal places. An unrated trip says nothing about the driver and must not pull the average down. Highest average first, ties by `driver_name`.",
      ],
      columns: [
        { name: "driver_name", type: "text" },
        { name: "completed_trips", type: "integer" },
        { name: "rated_trips", type: "integer" },
        { name: "avg_rating", type: "real" },
      ],
      starter: `SELECT d.driver_name, COUNT(*) AS completed_trips
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
WHERE t.started_at IS NOT NULL
GROUP BY d.driver_id, d.driver_name
`,
      solution: `SELECT d.driver_name,
       COUNT(*) AS completed_trips,
       COUNT(t.rating) AS rated_trips,
       ROUND(AVG(t.rating), 2) AS avg_rating
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
WHERE t.started_at IS NOT NULL
GROUP BY d.driver_id, d.driver_name
ORDER BY avg_rating DESC, d.driver_name`,
      tests: resultShape(
        ["driver_name", "completed_trips", "rated_trips", "avg_rating"],
        7,
        "Averages over rated trips only; Kenji Morita and Rafael Ortiz tie at 4.0.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "repeat-rider-driver-pairs",
      title: "Repeat Rider Pairings",
      difficulty: "Beginner",
      topic: "HAVING on pairs",
      dataset: RIDES,
      description:
        "Find riders who keep getting the same driver, counting completed trips only.",
      solutionNote:
        "Grouping by two columns makes each rider and driver pair its own group, and `HAVING` filters those groups after they are counted, which `WHERE` cannot do. The cancelled filter belongs in `WHERE`, before the count: Daniel Sato requested Lucia Ferraz three times, but one of those rides never started.",
    },
    {
      prompt: [
        "In a small city the same rider and driver meet again and again. Find every rider and driver pair with at least three completed trips together.",
        "Cancelled requests do not count: a trip that never started is not a ride together. Return the `rider_name`, the `driver_name` and the number of `trips`. Most trips first, then by `rider_name`, then `driver_name`.",
      ],
      columns: [
        { name: "rider_name", type: "text" },
        { name: "driver_name", type: "text" },
        { name: "trips", type: "integer" },
      ],
      starter: `SELECT r.rider_name, d.driver_name
FROM trips t
JOIN riders  r ON r.rider_id  = t.rider_id
JOIN drivers d ON d.driver_id = t.driver_id
`,
      solution: `SELECT r.rider_name, d.driver_name, COUNT(*) AS trips
FROM trips t
JOIN riders  r ON r.rider_id  = t.rider_id
JOIN drivers d ON d.driver_id = t.driver_id
WHERE t.started_at IS NOT NULL
GROUP BY t.rider_id, t.driver_id, r.rider_name, d.driver_name
HAVING COUNT(*) >= 3
ORDER BY trips DESC, r.rider_name, d.driver_name`,
      tests: resultShape(
        ["rider_name", "driver_name", "trips"],
        4,
        "Four pairs; three more reach three only if cancelled requests are counted.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "cancellation-rate-by-city",
      title: "Cancellation Rate by City",
      difficulty: "Intermediate",
      topic: "Counting NULLs",
      dataset: RIDES,
      description: "Compare how often ride requests are cancelled in each city.",
      solutionNote:
        "`COUNT(*)` counts rows and `COUNT(t.started_at)` counts non-NULL values, so their difference is the number of cancellations without a single `CASE`. The `100.0` keeps the division real: in integer arithmetic `100 * 2 / 12` is 16, and Bilbao's rate would lose its decimal.",
    },
    {
      prompt: [
        "A request that was cancelled never started, so its `started_at` is NULL. A trip belongs to the city its driver works in.",
        "For each `city`, return the number of `requests`, how many were `cancelled`, and `cancel_pct`: the cancelled share as a percentage, rounded to 1 decimal place. Highest rate first; break ties by `city`.",
      ],
      columns: [
        { name: "city", type: "text" },
        { name: "requests", type: "integer" },
        { name: "cancelled", type: "integer" },
        { name: "cancel_pct", type: "real" },
      ],
      starter: `SELECT d.city, COUNT(*) AS requests
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
GROUP BY d.city
`,
      solution: `SELECT d.city,
       COUNT(*) AS requests,
       COUNT(*) - COUNT(t.started_at) AS cancelled,
       ROUND(100.0 * (COUNT(*) - COUNT(t.started_at)) / COUNT(*), 1) AS cancel_pct
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
GROUP BY d.city
ORDER BY cancel_pct DESC, d.city`,
      tests: resultShape(
        ["city", "requests", "cancelled", "cancel_pct"],
        3,
        "Bilbao and Valencia tie at 16.7%, so the tie-break decides their order.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "weekly-driver-earnings",
      title: "Weekly Driver Earnings",
      difficulty: "Intermediate",
      topic: "Week bucketing",
      dataset: RIDES,
      description:
        "Total each driver's fares by the Monday-to-Sunday week the trips were requested in.",
      solutionNote:
        "Grouping by a computed week label is the whole trick: every timestamp in a week maps to the same Monday, so `GROUP BY driver, week_start` buckets them. `strftime('%W')` would give a week number instead, which restarts every January and cannot be checked against a calendar at a glance the way a date can.",
    },
    {
      prompt: [
        "Drivers are paid weekly, and a week runs Monday to Sunday. For each driver and week, count the completed `trips` and total their fares as `earnings`, rounded to 2 decimal places.",
        "Label each week by its Monday, as `week_start`. SQLite's date modifiers get there in one call: `date(requested_at, 'weekday 0', '-6 days')` moves forward to that week's Sunday (staying put on a Sunday) and then back six days. A trip belongs to the week it was requested in.",
        "Leave out cancelled requests, and leave out any week in which a driver completed nothing. Sort by `week_start`, then `driver_name`.",
      ],
      columns: [
        { name: "driver_name", type: "text" },
        { name: "week_start", type: "text" },
        { name: "trips", type: "integer" },
        { name: "earnings", type: "real" },
      ],
      starter: `SELECT d.driver_name, t.requested_at, t.fare
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
`,
      solution: `SELECT d.driver_name,
       date(t.requested_at, 'weekday 0', '-6 days') AS week_start,
       COUNT(*) AS trips,
       ROUND(SUM(t.fare), 2) AS earnings
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
WHERE t.started_at IS NOT NULL
GROUP BY d.driver_id, d.driver_name, week_start
ORDER BY week_start, d.driver_name`,
      tests: resultShape(
        ["driver_name", "week_start", "trips", "earnings"],
        21,
        "Twenty-one driver weeks with at least one completed trip.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "first-trip-per-rider",
      title: "First Trip per Rider",
      difficulty: "Intermediate",
      topic: "ROW_NUMBER",
      dataset: RIDES,
      description:
        "Find each rider's first completed trip, skipping requests that were cancelled.",
      solutionNote:
        "`ROW_NUMBER() OVER (PARTITION BY rider_id ORDER BY requested_at, trip_id)` numbers each rider's trips from 1, and keeping row 1 keeps the first. The cancelled filter has to run before the numbering, inside the subquery: filter afterwards and a rider whose first request was cancelled loses their row entirely instead of moving on to their next one.",
    },
    {
      prompt: [
        "Marketing wants to know how each rider's first real trip went. For every rider with at least one completed trip, return the first one: the `rider_name`, its `requested_at`, the `driver_name` and the `fare`.",
        "A cancelled request is not a first trip: Grace Lindqvist's first request was cancelled, and her first trip came six days later. A rider whose only request was cancelled does not appear. If two of a rider's trips share a request time, the lower `trip_id` comes first. Sort by `rider_name`.",
      ],
      columns: [
        { name: "rider_name", type: "text" },
        { name: "requested_at", type: "text" },
        { name: "driver_name", type: "text" },
        { name: "fare", type: "real" },
      ],
      starter: `SELECT r.rider_name, t.requested_at, t.fare
FROM trips t
JOIN riders r ON r.rider_id = t.rider_id
`,
      solution: `WITH numbered AS (
  SELECT t.*,
         ROW_NUMBER() OVER (
           PARTITION BY t.rider_id
           ORDER BY t.requested_at, t.trip_id
         ) AS nth
  FROM trips t
  WHERE t.started_at IS NOT NULL
)
SELECT r.rider_name, n.requested_at, d.driver_name, n.fare
FROM numbered n
JOIN riders  r ON r.rider_id  = n.rider_id
JOIN drivers d ON d.driver_id = n.driver_id
WHERE n.nth = 1
ORDER BY r.rider_name`,
      tests: resultShape(
        ["rider_name", "requested_at", "driver_name", "fare"],
        11,
        "Eleven riders have completed a trip; Jonas Weber has not.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "idle-drivers",
      title: "Idle Drivers",
      difficulty: "Intermediate",
      topic: "COALESCE for missing dates",
      dataset: RIDES,
      description:
        "Find drivers who have not completed a trip for a week or more, including one who never has.",
      solutionNote:
        "Put the completed-trip filter in the `LEFT JOIN`'s `ON` clause, so a driver with no completed trips still gets a row of NULLs rather than vanishing, and `COALESCE(last trip, joined_on)` then gives every driver a date to measure from. Counting cancelled requests would clear Kenji Morita: his last request was only six days ago, but his last actual trip was nine.",
    },
    {
      prompt: [
        `Operations checks in with drivers who have gone quiet. As of \`'${AS_OF}'\`, a driver is idle when their last completed trip was requested 7 or more days earlier. A driver who has never completed a trip is measured from the day they joined.`,
        "Only completed trips count: a request the rider cancelled is not work. Return the `driver_name`, `city`, `last_trip_on` (the date of their last completed trip, NULL if there is none) and `days_idle`, counted in whole days from that date. Longest idle first, ties by `driver_name`.",
      ],
      columns: [
        { name: "driver_name", type: "text" },
        { name: "city", type: "text" },
        { name: "last_trip_on", type: "text" },
        { name: "days_idle", type: "integer" },
      ],
      starter: `SELECT d.driver_name, d.city
FROM drivers d
`,
      solution: `SELECT d.driver_name, d.city,
       date(MAX(t.requested_at)) AS last_trip_on,
       CAST(julianday('${AS_OF}')
            - julianday(COALESCE(date(MAX(t.requested_at)), d.joined_on)) AS INTEGER) AS days_idle
FROM drivers d
LEFT JOIN trips t
  ON t.driver_id = d.driver_id AND t.started_at IS NOT NULL
GROUP BY d.driver_id, d.driver_name, d.city, d.joined_on
HAVING days_idle >= 7
ORDER BY days_idle DESC, d.driver_name`,
      tests: resultShape(
        ["driver_name", "city", "last_trip_on", "days_idle"],
        3,
        "Three drivers, one of whom joined and has not driven yet.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "top-driver-per-city",
      title: "Top Driver per City",
      difficulty: "Intermediate",
      topic: "DENSE_RANK",
      dataset: RIDES,
      description: "Find the busiest driver in each city, keeping everyone tied for first.",
      solutionNote:
        "`DENSE_RANK()` gives tied rows the same rank, so filtering on rank 1 keeps every driver level at the top. `ROW_NUMBER()` would keep one of Bilbao's two drivers and drop the other on no basis the data can defend, and `RANK()` would work here but leaves gaps in the numbering after a tie, which bites as soon as someone asks for the top two.",
    },
    {
      prompt: [
        "Each city is recognising its busiest driver by completed trips. When drivers tie for the most, all of them are recognised.",
        "Return the `city`, the `driver_name` and their completed `trips`. Sort by `city`, then `driver_name`.",
      ],
      columns: [
        { name: "city", type: "text" },
        { name: "driver_name", type: "text" },
        { name: "trips", type: "integer" },
      ],
      starter: `SELECT d.city, d.driver_name, COUNT(*) AS trips
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
WHERE t.started_at IS NOT NULL
GROUP BY d.driver_id, d.city, d.driver_name
`,
      solution: `WITH counts AS (
  SELECT d.city, d.driver_name, COUNT(*) AS trips
  FROM trips t
  JOIN drivers d ON d.driver_id = t.driver_id
  WHERE t.started_at IS NOT NULL
  GROUP BY d.driver_id, d.city, d.driver_name
), ranked AS (
  SELECT c.*,
         DENSE_RANK() OVER (PARTITION BY c.city ORDER BY c.trips DESC) AS place
  FROM counts c
)
SELECT city, driver_name, trips
FROM ranked
WHERE place = 1
ORDER BY city, driver_name`,
      tests: resultShape(
        ["city", "driver_name", "trips"],
        4,
        "Bilbao has a tie at five trips, so it has two winners.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "driver-active-streaks",
      title: "Driver Active Streaks",
      difficulty: "Advanced",
      topic: "Gaps and islands",
      dataset: RIDES,
      description:
        "Find runs of three or more consecutive days on which a driver completed a trip.",
      solutionNote:
        "Number each driver's active days in date order and subtract that number from the date: consecutive days rise together, so the difference stays constant along a run and jumps at every gap, which makes it a group key. It only works on distinct days. A second trip on May 22 would take a row number without moving the date, and split Tomas Reyna's five-day run in two.",
    },
    {
      prompt: [
        "A driver is active on a day when they completed at least one trip requested that day. Find every streak of 3 or more consecutive active days.",
        "Some drivers complete two trips in a day, and that is still one active day. A cancelled request is not activity, so it cannot bridge the gap between two active days.",
        "Return the `driver_name`, `streak_start`, `streak_end` and the streak's length in `days`. Sort by `driver_name`, then `streak_start`.",
      ],
      columns: [
        { name: "driver_name", type: "text" },
        { name: "streak_start", type: "text" },
        { name: "streak_end", type: "text" },
        { name: "days", type: "integer" },
      ],
      starter: `SELECT d.driver_name, date(t.requested_at) AS day
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
ORDER BY d.driver_name, day
`,
      solution: `WITH active_days AS (
  SELECT DISTINCT driver_id, date(requested_at) AS day
  FROM trips
  WHERE started_at IS NOT NULL
), islands AS (
  SELECT driver_id, day,
         julianday(day)
           - ROW_NUMBER() OVER (PARTITION BY driver_id ORDER BY day) AS island
  FROM active_days
)
SELECT d.driver_name,
       MIN(i.day) AS streak_start,
       MAX(i.day) AS streak_end,
       COUNT(*) AS days
FROM islands i
JOIN drivers d ON d.driver_id = i.driver_id
GROUP BY i.driver_id, d.driver_name, i.island
HAVING COUNT(*) >= 3
ORDER BY d.driver_name, streak_start`,
      tests: resultShape(
        ["driver_name", "streak_start", "streak_end", "days"],
        2,
        "Two real streaks; counting cancelled requests would invent two more.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "median-fare-by-city",
      title: "Median Fare by City",
      difficulty: "Advanced",
      topic: "Medians with window functions",
      dataset: RIDES,
      description: "Compute the median completed fare in each city without a median function.",
      solutionNote:
        "For `n` rows, positions `(n + 1) / 2` and `(n + 2) / 2` in integer division are the same row when `n` is odd and the two middle rows when it is even, so one `WHERE rn IN (...)` and an `AVG` cover both cases. Bilbao's two middle fares are both 13.40, and the `trip_id` tie-break keeps `ROW_NUMBER` deterministic even there.",
    },
    {
      prompt: [
        "A few long trips pull the average fare around, so finance wants the median: the middle fare once a city's completed trips are sorted by fare, or the mean of the two middle fares when there is an even number of them.",
        "SQLite has no `MEDIAN`. Number each city's fares in order with `ROW_NUMBER()` (ties broken by `trip_id`), count them with `COUNT(*) OVER`, and keep the middle row or rows.",
        "Return the `city`, the number of `completed_trips` and `median_fare` rounded to 2 decimal places. Sort by `city`.",
      ],
      columns: [
        { name: "city", type: "text" },
        { name: "completed_trips", type: "integer" },
        { name: "median_fare", type: "real" },
      ],
      starter: `SELECT d.city, t.fare
FROM trips t
JOIN drivers d ON d.driver_id = t.driver_id
WHERE t.started_at IS NOT NULL
ORDER BY d.city, t.fare
`,
      solution: `WITH ordered AS (
  SELECT d.city, t.fare,
         ROW_NUMBER() OVER (PARTITION BY d.city ORDER BY t.fare, t.trip_id) AS rn,
         COUNT(*) OVER (PARTITION BY d.city) AS n
  FROM trips t
  JOIN drivers d ON d.driver_id = t.driver_id
  WHERE t.started_at IS NOT NULL
)
SELECT city,
       MAX(n) AS completed_trips,
       ROUND(AVG(fare), 2) AS median_fare
FROM ordered
WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY city
ORDER BY city`,
      tests: resultShape(
        ["city", "completed_trips", "median_fare"],
        3,
        "Seville has an odd number of completed trips; Bilbao and Valencia have an even number.",
        true,
      ),
    },
  ),
];
