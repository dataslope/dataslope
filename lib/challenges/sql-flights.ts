/**
 * Single-query SQL challenges over the flights dataset.
 *
 * Every question here is about the distance between a timetable and the day
 * that actually happened. The schedule says 25 flights; three of them never
 * left, and each cancellation is a row that is still there with its actual
 * times NULL. So the recurring lesson is to decide, for each question, whether
 * a cancelled flight belongs in it: it counts towards what was scheduled, never
 * towards what was flown, and its fares are refunds rather than revenue.
 *
 * The other thread is time arithmetic. Timestamps are text, `julianday()`
 * turns them into fractional days, and a fraction of a day is rarely exact in
 * floating point, so every delay is rounded to whole minutes before it is
 * compared or cast.
 *
 * Every solution is executed against node:sqlite by
 * `__tests__/challengeSolutions`, so a wrong expectation fails CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { FLIGHTS } from "./dataset-flights";
import type { Challenge } from "./types";

/** Whole minutes between two timestamps, rounded before the cast. */
function minutes(from: string, to: string): string {
  return `CAST(ROUND((julianday(${to}) - julianday(${from})) * 1440) AS INTEGER)`;
}

export const SQL_FLIGHTS: Challenge[] = [
  sqlChallenge(
    {
      slug: "flight-delay-minutes",
      title: "Flight Delay Minutes",
      difficulty: "Beginner",
      topic: "Timestamp arithmetic",
      dataset: FLIGHTS,
      description: "Work out how many minutes late, or early, each flight left.",
      solutionNote:
        "A difference of two `julianday()` values is a fraction of a day, and fractions of a day are rarely exact in floating point: HL103's 27 minutes comes out as 26.9999997. `CAST` on its own truncates that to 26, which is why the `ROUND` comes first. `(unixepoch(actual_dep) - unixepoch(scheduled_dep)) / 60` avoids the problem by working in whole seconds.",
    },
    {
      prompt: [
        "For every flight that actually took off, work out its departure delay: `actual_dep` minus `scheduled_dep`, in whole minutes. A flight that left early has a negative delay.",
        "`julianday()` turns a timestamp into a number of days, so multiply the difference by 1440 (minutes in a day) and `ROUND` it before casting to an integer.",
        "Cancelled flights have no `actual_dep`; leave them out. Most delayed first, ties by `flight_no`.",
      ],
      columns: [
        { name: "flight_no", type: "text" },
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "dep_delay_min", type: "integer" },
      ],
      starter: `SELECT flight_no, origin, destination
FROM flights
-- work out the delay, and leave out the cancelled flights
`,
      solution: `SELECT flight_no, origin, destination,
       ${minutes("scheduled_dep", "actual_dep")} AS dep_delay_min
FROM flights
WHERE actual_dep IS NOT NULL
ORDER BY dep_delay_min DESC, flight_no`,
      tests: resultShape(
        ["flight_no", "origin", "destination", "dep_delay_min"],
        22,
        "Twenty-two flights took off; HL202 left 55 minutes late and HL101 two minutes early.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "departures-by-hour",
      title: "Departures by Hour",
      difficulty: "Beginner",
      topic: "Extracting date parts",
      dataset: FLIGHTS,
      description: "Count how many flights actually took off in each hour of the day.",
      solutionNote:
        "`strftime` on a NULL timestamp returns NULL, and `GROUP BY` puts every NULL in one group, so without the `WHERE` the three cancelled flights turn up as a row with no hour. Grouping on the actual time rather than the timetable also moves HL301 into hour 6: it was due at 07:00 and left at 06:58.",
    },
    {
      prompt: [
        "Count the flights that actually took off in each hour of the day, going by the hour of `actual_dep`: a take-off at 06:47 counts in hour 6.",
        "`strftime('%H', actual_dep)` extracts the hour as text such as `'06'`; cast it to an integer.",
        "Cancelled flights never took off, so leave them out rather than letting them form a group of their own. Only hours with at least one take-off appear. Sort by hour.",
      ],
      columns: [
        { name: "dep_hour", type: "integer" },
        { name: "departures", type: "integer" },
      ],
      starter: `SELECT flight_no, actual_dep
FROM flights
-- turn actual_dep into an hour, then count the flights in each hour
`,
      solution: `SELECT CAST(strftime('%H', actual_dep) AS INTEGER) AS dep_hour,
       COUNT(*) AS departures
FROM flights
WHERE actual_dep IS NOT NULL
GROUP BY dep_hour
ORDER BY dep_hour`,
      tests: resultShape(
        ["dep_hour", "departures"],
        12,
        "Twelve hours saw a take-off; hour 6 had four and hour 17 none.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "scheduled-vs-operated",
      title: "Scheduled vs Operated",
      difficulty: "Beginner",
      topic: "COUNT(*) vs COUNT(column)",
      dataset: FLIGHTS,
      description: "Compare how many flights each route had in the timetable with how many actually flew.",
      solutionNote:
        "`COUNT(*)` counts rows and `COUNT(actual_dep)` counts non-NULL values, so one `GROUP BY` gives both numbers and their difference is the cancellations. A `WHERE actual_dep IS NOT NULL` would get `operated` right and quietly turn `scheduled` into the same number, because the cancelled rows would be gone before either count saw them.",
    },
    {
      prompt: [
        "For every route (an `origin` and `destination` pair), count the flights it had in the timetable and how many of them actually operated.",
        "A cancelled flight keeps its row but has no `actual_dep`. Both numbers can come from a single `GROUP BY`: `COUNT(*)` counts rows, while `COUNT(column)` counts only the rows where that column is not NULL.",
        "Sort by `origin`, then `destination`.",
      ],
      columns: [
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "scheduled", type: "integer" },
        { name: "operated", type: "integer" },
      ],
      starter: `SELECT origin, destination, COUNT(*) AS scheduled
FROM flights
GROUP BY origin, destination
`,
      solution: `SELECT origin, destination,
       COUNT(*)          AS scheduled,
       COUNT(actual_dep) AS operated
FROM flights
GROUP BY origin, destination
ORDER BY origin, destination`,
      tests: resultShape(
        ["origin", "destination", "scheduled", "operated"],
        11,
        "Eleven routes; BRK to TLM had five flights scheduled and four flown.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "busiest-airports",
      title: "Busiest Airports",
      difficulty: "Intermediate",
      topic: "UNION ALL",
      dataset: FLIGHTS,
      description: "Rank every airport by take-offs plus landings, including the ones with no traffic.",
      solutionNote:
        "Stacking both ends of every flight with `UNION ALL` turns departures plus arrivals into one column you can group on. It has to be `UNION ALL`: plain `UNION` removes duplicate rows, and one departure from Bramwick looks exactly like the next, so every airport would be left with at most one of each. The outer join from `airports` keeps Marrow Heath, and `COALESCE` turns its empty sums into 0.",
    },
    {
      prompt: [
        "An airport's movements are its take-offs plus its landings. Every flight is a departure at its `origin` and an arrival at its `destination`, so each flight counts once at each end.",
        "Count only what happened: a departure needs an `actual_dep` and an arrival an `actual_arr`.",
        "Return every airport in `airports` with its departures, arrivals and total movements. Greyvale has arrivals but no departures and Marrow Heath has no traffic at all; both must appear, with 0 where there is nothing to count.",
        "Busiest first; ties by `airport_code`.",
      ],
      columns: [
        { name: "airport_code", type: "text" },
        { name: "departures", type: "integer" },
        { name: "arrivals", type: "integer" },
        { name: "movements", type: "integer" },
      ],
      starter: `SELECT a.airport_code, COUNT(f.flight_id) AS departures
FROM airports a
LEFT JOIN flights f ON f.origin = a.airport_code
GROUP BY a.airport_code
`,
      solution: `WITH movements AS (
  SELECT origin AS airport_code, 1 AS departures, 0 AS arrivals
  FROM flights
  WHERE actual_dep IS NOT NULL
  UNION ALL
  SELECT destination, 0, 1
  FROM flights
  WHERE actual_arr IS NOT NULL
)
SELECT a.airport_code,
       COALESCE(SUM(m.departures), 0) AS departures,
       COALESCE(SUM(m.arrivals), 0)   AS arrivals,
       COUNT(m.airport_code)          AS movements
FROM airports a
LEFT JOIN movements m ON m.airport_code = a.airport_code
GROUP BY a.airport_code
ORDER BY movements DESC, a.airport_code`,
      tests: resultShape(
        ["airport_code", "departures", "arrivals", "movements"],
        7,
        "Bramwick handled 20 movements, Greyvale 1 and Marrow Heath 0.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "routes-flown-both-ways",
      title: "Routes Flown Both Ways",
      difficulty: "Intermediate",
      topic: "Self joins",
      dataset: FLIGHTS,
      description: "Find the airport pairs the timetable serves in both directions.",
      solutionNote:
        "Collapse the flights into routes first, then join the routes to themselves with origin and destination swapped. Joining raw flights instead pairs every flight one way with every flight back, so Bramwick and Tollmere would report 20 pairings rather than 5 and 4. The `airport_a < airport_b` condition is what stops each pair appearing twice, once from each end.",
    },
    {
      prompt: [
        "Some routes are flown both ways (Bramwick to Tollmere and back) and some only one way. Find every pair of airports with at least one scheduled flight in each direction. Cancelled flights count: this is a question about the timetable.",
        "Report each pair once, with the alphabetically earlier code as `airport_a`, and count the scheduled flights each way.",
        "Sort by `airport_a`, then `airport_b`.",
      ],
      columns: [
        { name: "airport_a", type: "text" },
        { name: "airport_b", type: "text" },
        { name: "a_to_b", type: "integer" },
        { name: "b_to_a", type: "integer" },
      ],
      starter: `SELECT origin, destination, COUNT(*) AS flights
FROM flights
GROUP BY origin, destination
`,
      solution: `WITH routes AS (
  SELECT origin, destination, COUNT(*) AS flights
  FROM flights
  GROUP BY origin, destination
)
SELECT r.origin      AS airport_a,
       r.destination AS airport_b,
       r.flights     AS a_to_b,
       back.flights  AS b_to_a
FROM routes r
JOIN routes back
  ON back.origin = r.destination
 AND back.destination = r.origin
WHERE r.origin < r.destination
ORDER BY airport_a, airport_b`,
      tests: resultShape(
        ["airport_a", "airport_b", "a_to_b", "b_to_a"],
        4,
        "Four pairs; the three one-way routes have no return leg.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "route-load-factor",
      title: "Route Load Factor",
      difficulty: "Intermediate",
      topic: "Aggregating before joining",
      dataset: FLIGHTS,
      description: "Work out what share of the seats flown on each route were sold.",
      solutionNote:
        "Count bookings per flight first, then add the flights up per route. Joining `bookings` straight onto the flights and summing `seats` repeats each flight's capacity once per booking, so a flight with three passengers contributes its seats three times, and an inner join drops the empty flights (HL102 and HL203) along with the seats they flew.",
    },
    {
      prompt: [
        "A route's load factor is the seats booked on it divided by the seats flown on it. Seats flown is the sum of `seats` of the aircraft on each operated flight; seats booked is the number of `bookings` on those flights (one row is one seat).",
        "Only operated flights count, on both sides of the ratio. Two flights carried nobody, and their seats still count as flown.",
        "Return `load_factor_pct` as a percentage rounded to 1 decimal place. Highest first; ties by `origin`, then `destination`.",
      ],
      columns: [
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "seats_flown", type: "integer" },
        { name: "seats_booked", type: "integer" },
        { name: "load_factor_pct", type: "real" },
      ],
      starter: `SELECT f.flight_id, f.origin, f.destination, a.seats
FROM flights f
JOIN aircraft a ON a.tail_number = f.tail_number
WHERE f.actual_dep IS NOT NULL
-- count the bookings on each flight, then add the flights up per route
`,
      solution: `WITH per_flight AS (
  SELECT f.flight_id, f.origin, f.destination, a.seats,
         COUNT(b.booking_id) AS booked
  FROM flights f
  JOIN aircraft a      ON a.tail_number = f.tail_number
  LEFT JOIN bookings b ON b.flight_id = f.flight_id
  WHERE f.actual_dep IS NOT NULL
  GROUP BY f.flight_id, f.origin, f.destination, a.seats
)
SELECT origin, destination,
       SUM(seats)  AS seats_flown,
       SUM(booked) AS seats_booked,
       ROUND(100.0 * SUM(booked) / SUM(seats), 1) AS load_factor_pct
FROM per_flight
GROUP BY origin, destination
ORDER BY load_factor_pct DESC, origin, destination`,
      tests: resultShape(
        ["origin", "destination", "seats_flown", "seats_booked", "load_factor_pct"],
        11,
        "Eleven routes; BRK to CVH leads at 33.3%, 5 of 15 seats.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "worst-arrival-per-route",
      title: "Worst Arrival per Route",
      difficulty: "Intermediate",
      topic: "ROW_NUMBER per group",
      dataset: FLIGHTS,
      description: "Find the latest arrival on each route, and which flight it was.",
      solutionNote:
        "`MAX(delay)` per route says how late the worst arrival was but not which flight it was. `ROW_NUMBER()` partitioned by route and ordered by delay numbers each route's flights from worst to best, and keeping row 1 keeps the whole row. The second sort key decides Elmwater to Bramwick, where both flights landed exactly 4 minutes early.",
    },
    {
      prompt: [
        "For each route, find the operated flight that arrived latest against its schedule and how late it was: `actual_arr` minus `scheduled_arr` in whole minutes, rounded. On a route where every flight was early, that is the least early one, with a negative delay.",
        "If two flights on a route share the worst delay, keep the one with the earlier `scheduled_dep`. Cancelled flights never arrived and cannot be the answer.",
        "Sort by `arr_delay_min` from worst to best, then by `origin` and `destination`.",
      ],
      columns: [
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "flight_no", type: "text" },
        { name: "arr_delay_min", type: "integer" },
      ],
      starter: `SELECT origin, destination, flight_no,
       ${minutes("scheduled_arr", "actual_arr")} AS arr_delay_min
FROM flights
WHERE actual_arr IS NOT NULL
-- keep only the worst arrival on each route
`,
      solution: `WITH delays AS (
  SELECT origin, destination, flight_no, scheduled_dep,
         ${minutes("scheduled_arr", "actual_arr")} AS arr_delay_min
  FROM flights
  WHERE actual_arr IS NOT NULL
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY origin, destination
           ORDER BY arr_delay_min DESC, scheduled_dep
         ) AS rn
  FROM delays
)
SELECT origin, destination, flight_no, arr_delay_min
FROM ranked
WHERE rn = 1
ORDER BY arr_delay_min DESC, origin, destination`,
      tests: resultShape(
        ["origin", "destination", "flight_no", "arr_delay_min"],
        11,
        "One flight per route; ELW to BRK keeps HL201, the earlier of two flights that landed 4 minutes early.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "top-revenue-routes",
      title: "Top Revenue Routes",
      difficulty: "Intermediate",
      topic: "Ties at the top",
      dataset: FLIGHTS,
      description: "Find the route that earned the most from fares, without losing a tie.",
      solutionNote:
        "`ORDER BY revenue DESC LIMIT 1` answers a different question: it returns one of the top routes and silently drops the rest. Comparing each route with `MAX(revenue)`, or keeping `RANK() = 1`, returns every route that shares the top. Here the tie only exists once HL105's refunded fare is left out; counted, it puts Bramwick to Tollmere ahead on its own.",
    },
    {
      prompt: [
        "Which route earned the most? A route's revenue is the sum of `fare` over the bookings on its flights.",
        "A cancelled flight earns nothing, because its fares are refunded, so count only bookings on flights that operated.",
        "Return every route tied for the highest revenue, not just one of them, with the revenue rounded to 2 decimal places. Sort by `origin`, then `destination`.",
      ],
      columns: [
        { name: "origin", type: "text" },
        { name: "destination", type: "text" },
        { name: "revenue", type: "real" },
      ],
      starter: `SELECT f.origin, f.destination, SUM(b.fare) AS revenue
FROM flights f
JOIN bookings b ON b.flight_id = f.flight_id
GROUP BY f.origin, f.destination
-- keep only the route(s) with the highest revenue
`,
      solution: `WITH route_revenue AS (
  SELECT f.origin, f.destination, SUM(b.fare) AS revenue
  FROM flights f
  JOIN bookings b ON b.flight_id = f.flight_id
  WHERE f.actual_dep IS NOT NULL
  GROUP BY f.origin, f.destination
)
SELECT origin, destination, ROUND(revenue, 2) AS revenue
FROM route_revenue
WHERE revenue = (SELECT MAX(revenue) FROM route_revenue)
ORDER BY origin, destination`,
      tests: resultShape(
        ["origin", "destination", "revenue"],
        2,
        "Two routes tie at 612.00.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "whole-fleet-flyers",
      title: "Whole-Fleet Flyers",
      difficulty: "Advanced",
      topic: "Relational division",
      dataset: FLIGHTS,
      description: "Find the passengers who have flown on every aircraft in the fleet.",
      solutionNote:
        "This is relational division: keep the passengers for whom no aircraft exists that they have not flown on. The double `NOT EXISTS` says exactly that and cannot be fooled by a passenger who flew one aircraft twice. Counting works too if it compares `COUNT(DISTINCT tail_number)` over operated flights with the size of the fleet: `COUNT(*)` would admit Greta Nakamura (four flights, three aircraft), and forgetting the cancellations would admit Hamid Rostami, whose only booking on HL-03 was the cancelled HL307.",
    },
    {
      prompt: [
        "Harbourline gives a badge to anyone who has flown on every aircraft it owns. Which passengers have earned it?",
        "A passenger has flown on an aircraft if they hold a booking on a flight that aircraft operated. A booking on a cancelled flight does not count, because nobody flew.",
        "Some passengers made four bookings across only three aircraft, so counting bookings is not enough. Return `full_name`, sorted alphabetically.",
      ],
      columns: [{ name: "full_name", type: "text" }],
      starter: `SELECT p.full_name
FROM passengers p
-- keep a passenger only if no aircraft is missing from the flights they took
ORDER BY p.full_name
`,
      solution: `SELECT p.full_name
FROM passengers p
WHERE NOT EXISTS (
  SELECT 1
  FROM aircraft a
  WHERE NOT EXISTS (
    SELECT 1
    FROM bookings b
    JOIN flights f ON f.flight_id = b.flight_id
    WHERE b.passenger_id = p.passenger_id
      AND f.tail_number  = a.tail_number
      AND f.actual_dep IS NOT NULL
  )
)
ORDER BY p.full_name`,
      tests: resultShape(
        ["full_name"],
        2,
        "Two passengers flew all four aircraft.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "aircraft-ground-time",
      title: "Aircraft Ground Time",
      difficulty: "Advanced",
      topic: "Filtering before a window",
      dataset: FLIGHTS,
      description: "Measure how long each aircraft sat on the ground between one flight and the next.",
      solutionNote:
        "`LAG(actual_arr)` over each aircraft's flights finds the landing before each take-off, but only if the cancelled flights are gone before the window runs. A `WHERE` in the same `SELECT` as the window is applied first, which is what you want here; filter in an outer query instead and HL107's previous row is the cancelled HL106, whose NULL arrival makes the turn NULL, so HL-01's 232 minutes at Bramwick vanish from its longest turn.",
    },
    {
      prompt: [
        "A turn is the time an aircraft spends on the ground between two flights: from one flight's `actual_arr` to the same aircraft's next `actual_dep`, in whole minutes.",
        "Only flights that operated count. When a flight was cancelled the aircraft stayed where it was, so its next turn runs from its last real landing to its next real take-off. An aircraft's first flight of the day has no turn before it.",
        "For each aircraft, return how many turns it made, its shortest turn and its longest. Sort by `tail_number`.",
      ],
      columns: [
        { name: "tail_number", type: "text" },
        { name: "turns", type: "integer" },
        { name: "shortest_turn_min", type: "integer" },
        { name: "longest_turn_min", type: "integer" },
      ],
      starter: `SELECT tail_number, flight_no, scheduled_dep, actual_dep, actual_arr
FROM flights
ORDER BY tail_number, scheduled_dep
`,
      solution: `WITH flown AS (
  SELECT tail_number, actual_dep,
         LAG(actual_arr) OVER (
           PARTITION BY tail_number
           ORDER BY scheduled_dep
         ) AS prev_arr
  FROM flights
  WHERE actual_dep IS NOT NULL
),
turns AS (
  SELECT tail_number,
         ${minutes("prev_arr", "actual_dep")} AS ground_min
  FROM flown
  WHERE prev_arr IS NOT NULL
)
SELECT tail_number,
       COUNT(*)        AS turns,
       MIN(ground_min) AS shortest_turn_min,
       MAX(ground_min) AS longest_turn_min
FROM turns
GROUP BY tail_number
ORDER BY tail_number`,
      tests: resultShape(
        ["tail_number", "turns", "shortest_turn_min", "longest_turn_min"],
        4,
        "HL-01 made four turns, the longest 232 minutes.",
        true,
      ),
    },
  ),
];
