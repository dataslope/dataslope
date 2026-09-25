/**
 * Single-query SQL challenges over the weather dataset.
 *
 * A weather record is a time series with holes in it, and these challenges
 * are about respecting both halves of that. The time series part is why so
 * many of them are window functions: a change from yesterday, a moving
 * average, a streak of dry days, a median. The holes are why the window
 * functions are not enough on their own. A window steps by rows, and a row is
 * a day only when no day is missing, so the prompts name the gaps and the
 * solutions check dates rather than trusting row order.
 *
 * The other hole is a failed rain gauge: a reading whose `precip_mm` is NULL.
 * It means "not measured", never "dry", and each challenge that touches rain
 * says which way it wants that treated.
 *
 * Every solution is executed against node:sqlite by
 * `__tests__/challengeSolutions`, so a wrong expectation fails CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { WEATHER } from "./dataset-weather";
import type { Challenge } from "./types";

export const SQL_WEATHER: Challenge[] = [
  sqlChallenge(
    {
      slug: "temperature-range-by-station",
      title: "Temperature Range by Station",
      difficulty: "Beginner",
      topic: "MIN and MAX",
      dataset: WEATHER,
      description: "Find each station's coldest night, hottest day and the spread between them.",
      solutionNote:
        "The range is the highest high minus the lowest low: two aggregates over two different columns. `MAX(max_temp_c - min_temp_c)` looks similar and answers another question, the biggest swing within a single day. The `ROUND` is not cosmetic either: 26.4 minus 9.8 is 16.599999999999998 in floating point.",
    },
    {
      prompt: [
        "For each station, find the lowest overnight temperature it recorded (`min_temp_c`), the highest daytime temperature (`max_temp_c`), and the range between the two over the whole fortnight, rounded to 1 decimal place.",
        "Only stations with readings appear. Widest range first; ties by `station_name`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "lowest_c", type: "real" },
        { name: "highest_c", type: "real" },
        { name: "range_c", type: "real" },
      ],
      starter: `SELECT s.station_name
FROM stations s
JOIN readings r ON r.station_id = s.station_id
GROUP BY s.station_id, s.station_name
`,
      solution: `SELECT s.station_name,
       MIN(r.min_temp_c) AS lowest_c,
       MAX(r.max_temp_c) AS highest_c,
       ROUND(MAX(r.max_temp_c) - MIN(r.min_temp_c), 1) AS range_c
FROM stations s
JOIN readings r ON r.station_id = s.station_id
GROUP BY s.station_id, s.station_name
ORDER BY range_c DESC, s.station_name`,
      tests: resultShape(
        ["station_name", "lowest_c", "highest_c", "range_c"],
        4,
        "Brackenridge has the widest range, from 0.0 up to 26.8.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "average-daily-rainfall",
      title: "Average Daily Rainfall",
      difficulty: "Beginner",
      topic: "NULL in averages",
      dataset: WEATHER,
      description: "Average each station's daily rainfall without counting a failed gauge as a dry day.",
      solutionNote:
        "`AVG` already skips NULLs, so `AVG(precip_mm)` divides by the measured days and is the answer as asked. The two tempting alternatives both treat a failure as a dry day: `SUM(precip_mm) / COUNT(*)` divides by every reading, and `AVG(COALESCE(precip_mm, 0))` invents a 0. At Kestrel Fell, whose gauge failed in the middle of a storm, that drags the average from 3.45 down to 3.20.",
    },
    {
      prompt: [
        "For each station, report how many days it sent a reading, on how many of those its rain gauge worked (a `precip_mm` that is not NULL, 0 mm included), and its average daily rainfall rounded to 2 decimal places.",
        "A NULL `precip_mm` means the gauge failed that day, not that it stayed dry. Average over the days that were measured, and do not count the failed days as 0 mm.",
        "Only stations with readings appear. Wettest first; ties by `station_name`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "days_reported", type: "integer" },
        { name: "days_measured", type: "integer" },
        { name: "avg_precip_mm", type: "real" },
      ],
      starter: `SELECT s.station_name, COUNT(*) AS days_reported
FROM stations s
JOIN readings r ON r.station_id = s.station_id
GROUP BY s.station_id, s.station_name
`,
      solution: `SELECT s.station_name,
       COUNT(*)           AS days_reported,
       COUNT(r.precip_mm) AS days_measured,
       ROUND(AVG(r.precip_mm), 2) AS avg_precip_mm
FROM stations s
JOIN readings r ON r.station_id = s.station_id
GROUP BY s.station_id, s.station_name
ORDER BY avg_precip_mm DESC, s.station_name`,
      tests: resultShape(
        ["station_name", "days_reported", "days_measured", "avg_precip_mm"],
        4,
        "Kestrel Fell averages 3.45 mm over its 13 measured days.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "first-frost",
      title: "First Frost",
      difficulty: "Beginner",
      topic: "Aggregating filtered rows",
      dataset: WEATHER,
      description: "Find the first night each station fell to freezing, and how many frosts it had.",
      solutionNote:
        "Filter to the frosty nights with `WHERE`, and `MIN(reading_date)` is then the first of them, because ISO dates sort as text in date order. Writing `< 0` instead of `<= 0` loses Brackenridge completely: its only frost was a low of exactly 0.0.",
    },
    {
      prompt: [
        "A frost is a night when the minimum temperature fell to 0 °C or below. For each station that had at least one, return the date of its first frost and how many frost nights it had.",
        "Stations that never froze do not appear. Sort by `first_frost`, then `station_name`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "first_frost", type: "text" },
        { name: "frost_days", type: "integer" },
      ],
      starter: `SELECT s.station_name, r.reading_date, r.min_temp_c
FROM readings r
JOIN stations s ON s.station_id = r.station_id
`,
      solution: `SELECT s.station_name,
       MIN(r.reading_date) AS first_frost,
       COUNT(*)            AS frost_days
FROM readings r
JOIN stations s ON s.station_id = r.station_id
WHERE r.min_temp_c <= 0
GROUP BY s.station_id, s.station_name
ORDER BY first_frost, s.station_name`,
      tests: resultShape(
        ["station_name", "first_frost", "frost_days"],
        2,
        "Kestrel Fell first froze on 12 September, Brackenridge on the 13th.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "day-over-day-temperature",
      title: "Day-over-Day Temperature",
      difficulty: "Intermediate",
      topic: "LAG across gaps",
      dataset: WEATHER,
      description: "Compare each day's high with the day before, without comparing across a missing day.",
      solutionNote:
        "`LAG` returns the previous row, not the previous day, so on 7 September it hands back the reading from the 5th. Fetching the previous row's date alongside its temperature, and using the change only when that date equals `date(reading_date, '-1 day')`, turns previous row back into yesterday.",
    },
    {
      prompt: [
        "For Harbour Mill, show each day's high (`max_temp_c`) and how much it changed from the previous day's high, rounded to 1 decimal place.",
        "A change only makes sense against the calendar day before. Harbour Mill sent no reading on one day, so the reading after that gap has nothing to compare with: its change is NULL, like the first day's. Do not compare it with the last reading before the gap.",
        "Return every Harbour Mill reading, oldest first.",
      ],
      columns: [
        { name: "reading_date", type: "text" },
        { name: "max_temp_c", type: "real" },
        { name: "change_c", type: "real" },
      ],
      starter: `SELECT r.reading_date, r.max_temp_c
FROM readings r
JOIN stations s ON s.station_id = r.station_id
WHERE s.station_name = 'Harbour Mill'
ORDER BY r.reading_date
`,
      solution: `WITH harbour AS (
  SELECT r.reading_date, r.max_temp_c,
         LAG(r.reading_date) OVER (ORDER BY r.reading_date) AS prev_date,
         LAG(r.max_temp_c)   OVER (ORDER BY r.reading_date) AS prev_max
  FROM readings r
  JOIN stations s ON s.station_id = r.station_id
  WHERE s.station_name = 'Harbour Mill'
)
SELECT reading_date, max_temp_c,
       CASE WHEN prev_date = date(reading_date, '-1 day')
            THEN ROUND(max_temp_c - prev_max, 1)
       END AS change_c
FROM harbour
ORDER BY reading_date`,
      tests: resultShape(
        ["reading_date", "max_temp_c", "change_c"],
        13,
        "Thirteen readings; the change on 7 September is NULL, not -1.2.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "three-day-moving-average",
      title: "Three-Day Moving Average",
      difficulty: "Intermediate",
      topic: "ROWS frames",
      dataset: WEATHER,
      description: "Smooth Kestrel Fell's daily highs with a three-day moving average.",
      solutionNote:
        "With an `ORDER BY` and no frame, `AVG(...) OVER` runs from the first row to the current one: a running average, not a moving one. `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` pins the window to three rows, and counting the rows in the same frame is a clean way to drop the first two days, whose windows are short. Three rows are three days here only because Kestrel Fell has no gaps; at Harbour Mill the same frame would quietly span four calendar days.",
    },
    {
      prompt: [
        "Kestrel Fell reported every day of the fortnight. For each day, average that day's high (`max_temp_c`) with the highs of the two days before it, rounded to 2 decimal places.",
        "The first two days do not have three days of history, so leave them out rather than averaging over fewer days.",
        "Use an explicit frame, `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`. Oldest first.",
      ],
      columns: [
        { name: "reading_date", type: "text" },
        { name: "max_temp_c", type: "real" },
        { name: "avg_3day_c", type: "real" },
      ],
      starter: `SELECT r.reading_date, r.max_temp_c
FROM readings r
JOIN stations s ON s.station_id = r.station_id
WHERE s.station_name = 'Kestrel Fell'
ORDER BY r.reading_date
`,
      solution: `WITH kestrel AS (
  SELECT r.reading_date, r.max_temp_c,
         AVG(r.max_temp_c) OVER w AS avg_3day,
         COUNT(*)          OVER w AS days_in_window
  FROM readings r
  JOIN stations s ON s.station_id = r.station_id
  WHERE s.station_name = 'Kestrel Fell'
  WINDOW w AS (ORDER BY r.reading_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
)
SELECT reading_date, max_temp_c, ROUND(avg_3day, 2) AS avg_3day_c
FROM kestrel
WHERE days_in_window = 3
ORDER BY reading_date`,
      tests: resultShape(
        ["reading_date", "max_temp_c", "avg_3day_c"],
        12,
        "Twelve days, from 4 to 15 September.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "wettest-station-per-region",
      title: "Wettest Station per Region",
      difficulty: "Intermediate",
      topic: "Top row per group",
      dataset: WEATHER,
      description: "Find the station that measured the most rain in each region.",
      solutionNote:
        "Aggregate first, rank second. The totals are a `GROUP BY`; wettest in its region is a comparison between those totals, which is what `RANK() OVER (PARTITION BY region ORDER BY total DESC)` makes. Keeping rank 1 returns one station per region, and both stations if a region ever ties, where `ORDER BY ... LIMIT 1` would return one station for the whole network.",
    },
    {
      prompt: [
        "Total the rainfall each station measured over the fortnight, then find the wettest station in each region. Sum what was measured: a failed gauge (NULL) adds nothing, and a station with no readings cannot be the wettest.",
        "If two stations in a region tie, return both. Return the region, the station and its total rounded to 1 decimal place, sorted by `region`, then `station_name`.",
      ],
      columns: [
        { name: "region", type: "text" },
        { name: "station_name", type: "text" },
        { name: "total_precip_mm", type: "real" },
      ],
      starter: `SELECT s.region, s.station_name, SUM(r.precip_mm) AS total_precip_mm
FROM stations s
JOIN readings r ON r.station_id = s.station_id
GROUP BY s.station_id, s.region, s.station_name
`,
      solution: `WITH totals AS (
  SELECT s.region, s.station_name, SUM(r.precip_mm) AS total
  FROM stations s
  JOIN readings r ON r.station_id = s.station_id
  GROUP BY s.station_id, s.region, s.station_name
),
ranked AS (
  SELECT *, RANK() OVER (PARTITION BY region ORDER BY total DESC) AS rk
  FROM totals
)
SELECT region, station_name, ROUND(total, 1) AS total_precip_mm
FROM ranked
WHERE rk = 1
ORDER BY region, station_name`,
      tests: resultShape(
        ["region", "station_name", "total_precip_mm"],
        2,
        "Harbour Mill on the coast, Kestrel Fell in the uplands.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "hottest-days-per-station",
      title: "Hottest Days per Station",
      difficulty: "Intermediate",
      topic: "DENSE_RANK",
      dataset: WEATHER,
      description: "List each station's three highest temperatures and every day that reached them.",
      solutionNote:
        "The three ranking functions only disagree on ties, and this question is about a tie. `ROW_NUMBER` would keep just one of Saltmarsh Point's 27.5 days; `RANK` would number its next temperature 3 rather than 2 and stop one short; `DENSE_RANK` numbers distinct temperatures, so ranks 1 to 3 are exactly the three highest values, however many days share them.",
    },
    {
      prompt: [
        "For each station, find its three highest distinct daily highs, and list every day that reached one of them. Saltmarsh Point hit its top temperature on two days, so both appear and its list runs to four rows.",
        "Number the temperatures 1 to 3 as `heat_rank`, hottest first, with tied days sharing a rank.",
        "Sort by `station_name`, then `heat_rank`, then `reading_date`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "reading_date", type: "text" },
        { name: "max_temp_c", type: "real" },
        { name: "heat_rank", type: "integer" },
      ],
      starter: `SELECT s.station_name, r.reading_date, r.max_temp_c
FROM readings r
JOIN stations s ON s.station_id = r.station_id
ORDER BY s.station_name, r.max_temp_c DESC
`,
      solution: `WITH ranked AS (
  SELECT s.station_name, r.reading_date, r.max_temp_c,
         DENSE_RANK() OVER (
           PARTITION BY r.station_id
           ORDER BY r.max_temp_c DESC
         ) AS heat_rank
  FROM readings r
  JOIN stations s ON s.station_id = r.station_id
)
SELECT station_name, reading_date, max_temp_c, heat_rank
FROM ranked
WHERE heat_rank <= 3
ORDER BY station_name, heat_rank, reading_date`,
      tests: resultShape(
        ["station_name", "reading_date", "max_temp_c", "heat_rank"],
        13,
        "Thirteen days: three per station, plus Saltmarsh Point's tie.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "heating-degree-days",
      title: "Heating Degree Days",
      difficulty: "Intermediate",
      topic: "Clamping before summing",
      dataset: WEATHER,
      description: "Add up how much heating each station's fortnight would have needed.",
      solutionNote:
        "Each day has to be clamped at zero before the sum. `SUM(18 - mean)` lets the warm days of the first week cancel out cold ones, and at Saltmarsh Point that shrinks 21.2 degree days to under 5. Given two or more arguments, SQLite's `MAX(0, 18 - mean)` is an ordinary scalar function rather than the aggregate, so it clamps each row inside the `SUM`.",
    },
    {
      prompt: [
        "Heating degree days measure how cold a period was, which is what a heating bill follows. A day's mean temperature is the average of its `min_temp_c` and `max_temp_c`. A day contributes 18 minus its mean when the mean is below 18 °C, and nothing when it is 18 or warmer.",
        "Sum the contributions per station, rounded to 2 decimal places. Only stations with readings appear. Highest first; ties by `station_name`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "heating_degree_days", type: "real" },
      ],
      starter: `SELECT s.station_name, r.reading_date,
       (r.min_temp_c + r.max_temp_c) / 2 AS mean_c
FROM stations s
JOIN readings r ON r.station_id = s.station_id
`,
      solution: `SELECT s.station_name,
       ROUND(SUM(MAX(0, 18 - (r.min_temp_c + r.max_temp_c) / 2)), 2) AS heating_degree_days
FROM stations s
JOIN readings r ON r.station_id = s.station_id
GROUP BY s.station_id, s.station_name
ORDER BY heating_degree_days DESC, s.station_name`,
      tests: resultShape(
        ["station_name", "heating_degree_days"],
        4,
        "Kestrel Fell needed the most heating, 77.05 degree days.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "longest-dry-streak",
      title: "Longest Dry Streak",
      difficulty: "Advanced",
      topic: "Gaps and islands",
      dataset: WEATHER,
      description: "Find each station's longest run of consecutive dry days.",
      solutionNote:
        "Number each station's dry days with `ROW_NUMBER()` and subtract that from the date: within a run of consecutive days both go up by one, so the difference stays constant and becomes the run's id. Subtracting from the calendar date, not from a row number over all readings, is what makes a missing day end a run (Harbour Mill's 2 to 7 September is two runs, not five dry days). And `precip_mm = 0` is not true for NULL, so Saltmarsh Point's failed gauge on the 13th splits its late run instead of stretching it to five days.",
    },
    {
      prompt: [
        "A dry day is one with a measured rainfall of exactly 0 mm. For each station with readings, find its longest run of dry days on consecutive calendar dates.",
        "Two things end a run besides rain: a date with no reading at all, and a reading whose gauge failed (`precip_mm` is NULL). Neither day is known to be dry.",
        "Return the run's first and last dates and its length in days. If a station has two runs of the same length, keep the earlier one. Sort by `station_name`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "streak_start", type: "text" },
        { name: "streak_end", type: "text" },
        { name: "days", type: "integer" },
      ],
      starter: `SELECT s.station_name, r.reading_date, r.precip_mm
FROM readings r
JOIN stations s ON s.station_id = r.station_id
ORDER BY s.station_name, r.reading_date
`,
      solution: `WITH dry AS (
  SELECT station_id, reading_date,
         julianday(reading_date)
           - ROW_NUMBER() OVER (PARTITION BY station_id ORDER BY reading_date) AS run_id
  FROM readings
  WHERE precip_mm = 0
),
runs AS (
  SELECT station_id, run_id,
         MIN(reading_date) AS streak_start,
         MAX(reading_date) AS streak_end,
         COUNT(*)          AS days
  FROM dry
  GROUP BY station_id, run_id
),
ranked AS (
  SELECT runs.*,
         ROW_NUMBER() OVER (
           PARTITION BY station_id
           ORDER BY days DESC, streak_start
         ) AS rn
  FROM runs
)
SELECT s.station_name, r.streak_start, r.streak_end, r.days
FROM ranked r
JOIN stations s ON s.station_id = r.station_id
WHERE r.rn = 1
ORDER BY s.station_name`,
      tests: resultShape(
        ["station_name", "streak_start", "streak_end", "days"],
        4,
        "Kestrel Fell and Brackenridge both stayed dry for five days from 2 September; Saltmarsh Point's best is three.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "median-daily-high",
      title: "Median Daily High",
      difficulty: "Advanced",
      topic: "Medians with window functions",
      dataset: WEATHER,
      description: "Compute each station's median daily high without a MEDIAN function.",
      solutionNote:
        "`ROW_NUMBER()` gives each high its position in the station's sorted list and `COUNT(*) OVER` the list's length n, so the middle positions are `(n + 1) / 2` and `(n + 2) / 2` in integer division: the same position twice when n is odd, the two middle ones when it is even. Averaging whatever sits at those positions covers both cases in one query. Taking only `(n + 1) / 2` is the usual slip, and it is wrong for every station with an even count.",
    },
    {
      prompt: [
        "SQLite has no `MEDIAN`. Compute each station's median `max_temp_c` with window functions: sort each station's highs and take the middle value, or the average of the two middle values when the station has an even number of readings.",
        "The stations have 12, 13 and 14 readings, so both cases occur. Return the number of readings and the median rounded to 2 decimal places, for stations with readings only. Highest median first; ties by `station_name`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "readings", type: "integer" },
        { name: "median_high_c", type: "real" },
      ],
      starter: `SELECT s.station_name, COUNT(*) AS readings
FROM readings r
JOIN stations s ON s.station_id = r.station_id
GROUP BY s.station_id, s.station_name
-- the median needs the position of each high in its sorted station list
`,
      solution: `WITH ordered AS (
  SELECT station_id, max_temp_c,
         ROW_NUMBER() OVER (PARTITION BY station_id ORDER BY max_temp_c) AS pos,
         COUNT(*)     OVER (PARTITION BY station_id)                     AS n
  FROM readings
)
SELECT s.station_name,
       o.n AS readings,
       ROUND(AVG(o.max_temp_c), 2) AS median_high_c
FROM ordered o
JOIN stations s ON s.station_id = o.station_id
WHERE o.pos IN ((o.n + 1) / 2, (o.n + 2) / 2)
GROUP BY o.station_id, s.station_name, o.n
ORDER BY median_high_c DESC, s.station_name`,
      tests: resultShape(
        ["station_name", "readings", "median_high_c"],
        4,
        "Saltmarsh Point's median high is 20.40, the average of its 7th and 8th highs.",
        true,
      ),
    },
  ),
];
