/**
 * Multi-step SQL challenges over the weather dataset.
 *
 * Both are about the difference between the rows a table holds and the days
 * a calendar holds. The heatwave detector has to find three hot *days* in a
 * row, and Harbour Mill has three hot *rows* in a row with a missing day
 * between them. The data quality report has to find readings that are not
 * there at all, which no query over `readings` can see without a calendar to
 * compare against, and readings that are there with a hole in them.
 *
 * Shared constants carry each step's accepted query into the next step's
 * starter and CTE, so a fix in step 1 cannot leave step 3 quoting a version
 * that no longer exists. `__tests__/challengeSolutions` runs every step's
 * solution against node:sqlite.
 */

import { indentSql, sqlSteps } from "./authoring";
import { WEATHER } from "./dataset-weather";
import type { Challenge, SqlChallengeTest } from "./types";

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

// ─── Heatwave detector ───────────────────────────────────────────────

/** The threshold for a hot day, in °C. */
const HOT_C = "25";

const HOT_BODY = `SELECT s.station_name, r.reading_date, r.max_temp_c
FROM readings r
JOIN stations s ON s.station_id = r.station_id
WHERE r.max_temp_c >= ${HOT_C}`;

const HOT_DAYS = `${HOT_BODY}
ORDER BY s.station_name, r.reading_date`;

const STREAK_CTES = `WITH hot AS (
${indentSql(HOT_BODY)}
),
marked AS (
  SELECT station_name, reading_date, max_temp_c,
         CASE
           WHEN LAG(reading_date) OVER (PARTITION BY station_name ORDER BY reading_date)
                = date(reading_date, '-1 day')
           THEN 0
           ELSE 1
         END AS new_streak
  FROM hot
),
numbered AS (
  SELECT *,
         SUM(new_streak) OVER (PARTITION BY station_name ORDER BY reading_date) AS streak_no
  FROM marked
)`;

const STREAKS = `${STREAK_CTES}
SELECT station_name,
       MIN(reading_date) AS streak_start,
       MAX(reading_date) AS streak_end,
       COUNT(*)          AS days
FROM numbered
GROUP BY station_name, streak_no
ORDER BY station_name, streak_start`;

const HEATWAVE_DETECTOR = sqlSteps(
  {
    slug: "heatwave-detector",
    title: "Heatwave Detector",
    difficulty: "Advanced",
    topic: "Streaks with running sums",
    dataset: WEATHER,
    description:
      "Find the hot days, group them into runs of consecutive days, and report the runs long enough to be heatwaves.",
    solutionNote:
      "A heatwave is a fact about consecutive calendar days, and a table of readings only knows about rows. Harbour Mill was hot on 4, 5 and 7 September and sent nothing for the 6th: three hot rows in a row, but never three hot days in a row. Every step here exists to keep that difference visible, and the streak numbering in step 2 is where it is decided.",
  },
  [
    {
      title: "Find the hot days",
      short: "Hot days",
      solutionNote:
        "`>= 25` rather than `> 25` keeps Kestrel Fell's 25.0, which sits exactly on the threshold. It will not make a heatwave on its own, but a definition that says reached has to include it.",
      prompt: [
        "A hot day is one whose high (`max_temp_c`) reached 25.0 °C or more. List every hot day at every station, with its high.",
        "Sort by `station_name`, then `reading_date`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "reading_date", type: "text" },
        { name: "max_temp_c", type: "real" },
      ],
      starter: `SELECT s.station_name, r.reading_date, r.max_temp_c
FROM readings r
JOIN stations s ON s.station_id = r.station_id
ORDER BY s.station_name, r.reading_date
`,
      solution: HOT_DAYS,
      tests: checks(
        ["station_name", "reading_date", "max_temp_c"],
        11,
        "Eleven hot days",
        "Including the day that reached exactly 25.0.",
        "Hot days match the reference result",
      ),
    },
    {
      title: "Group them into streaks",
      short: "Streaks",
      solutionNote:
        "The running `SUM` turns a starts-a-new-streak flag into a streak number: it holds steady through a run and ticks up at every break, so grouping by it collapses each run into a row. Comparing the previous hot day's date with yesterday's date is what lets the missing 6 September at Harbour Mill end a streak; numbering the hot rows against all rows instead would treat the 5th and the 7th as neighbours.",
      prompt: [
        "Group each station's hot days into streaks of consecutive calendar days, and return each streak's first day, last day and length.",
        "Consecutive means the next calendar date, not the next reading. A date with no reading ends a streak, because nobody knows whether it was hot, and Harbour Mill has no reading for 6 September.",
        "One way: flag a hot day as starting a new streak unless the previous hot day at that station was the day before (`LAG` and `date(reading_date, '-1 day')`), then a running `SUM` of the flags numbers the streaks. Sort by `station_name`, then `streak_start`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "streak_start", type: "text" },
        { name: "streak_end", type: "text" },
        { name: "days", type: "integer" },
      ],
      starter: `WITH hot AS (
${indentSql(HOT_BODY)}
)
SELECT station_name, reading_date, max_temp_c
FROM hot
ORDER BY station_name, reading_date
`,
      solution: STREAKS,
      tests: checks(
        ["station_name", "streak_start", "streak_end", "days"],
        5,
        "Five streaks",
        "Harbour Mill's hot days are two streaks, because 6 September is missing.",
        "Streaks match the reference result",
      ),
    },
    {
      title: "Report the heatwaves",
      short: "Heatwaves",
      solutionNote:
        "With the streaks numbered, the heatwave rule is a `HAVING COUNT(*) >= 3` on the same grouping, and the peak is one more aggregate over it. Counting hot days per station without the streaks would have flagged Harbour Mill, whose three hot days were never three in a row.",
      prompt: [
        "A heatwave is a streak of at least three hot days. Return each heatwave with its dates, its length and `peak_c`, the highest `max_temp_c` reached during it.",
        "Sort by `streak_start`, then `station_name`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "streak_start", type: "text" },
        { name: "streak_end", type: "text" },
        { name: "days", type: "integer" },
        { name: "peak_c", type: "real" },
      ],
      starter: `${STREAKS}
`,
      solution: `${STREAK_CTES}
SELECT station_name,
       MIN(reading_date) AS streak_start,
       MAX(reading_date) AS streak_end,
       COUNT(*)          AS days,
       MAX(max_temp_c)   AS peak_c
FROM numbered
GROUP BY station_name, streak_no
HAVING COUNT(*) >= 3
ORDER BY streak_start, station_name`,
      tests: checks(
        ["station_name", "streak_start", "streak_end", "days", "peak_c"],
        2,
        "Two heatwaves",
        "Saltmarsh Point and Brackenridge; Harbour Mill's hot days are not consecutive.",
        "Heatwaves match the reference result",
      ),
    },
  ],
);

// ─── Station data quality ────────────────────────────────────────────

const PERIOD_START = "2024-09-02";
const PERIOD_END = "2024-09-15";

const EXPECTED_CTES = `WITH RECURSIVE days(day) AS (
  SELECT '${PERIOD_START}'
  UNION ALL
  SELECT date(day, '+1 day') FROM days WHERE day < '${PERIOD_END}'
),
expected AS (
  SELECT s.station_id, s.station_name, d.day
  FROM stations s
  JOIN days d ON d.day >= s.commissioned_on
)`;

const STATION_DATA_QUALITY = sqlSteps(
  {
    slug: "station-data-quality",
    title: "Station Data Quality",
    difficulty: "Intermediate",
    topic: "Date spines",
    dataset: WEATHER,
    description:
      "Work out which days each station owed, find the ones it missed, and score its coverage for temperature and rain separately.",
    solutionNote:
      "Missing data comes in two shapes: a row that is not there, and a row that is there with a hole in it. The first can only be seen against a calendar, which a recursive CTE builds because nothing in the table lists the days that are absent; the second needs `COUNT(column)` rather than `COUNT(*)`. A report that checks only one of them calls Saltmarsh Point and Kestrel Fell complete.",
  },
  [
    {
      title: "Expected days per station",
      short: "Expected",
      solutionNote:
        "A recursive CTE is how you get rows for dates that appear nowhere in the data: an anchor row, and a step that adds a day until the end date. Joining it to `stations` on `d.day >= commissioned_on`, instead of cross joining, is what stops Hollin Moss owing twelve days from before it existed.",
      prompt: [
        `The report covers ${PERIOD_START} to ${PERIOD_END}. Build that calendar with a recursive CTE, one row per date, and work out how many days each station was expected to report.`,
        "A station only owes readings from its `commissioned_on` date. Hollin Moss was commissioned on 14 September, so it owes two days, not fourteen.",
        "Every station appears, sorted by `station_name`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "expected_days", type: "integer" },
      ],
      starter: `WITH RECURSIVE days(day) AS (
  SELECT '${PERIOD_START}'
  -- add the recursive step that walks forward one day at a time to ${PERIOD_END}
)
SELECT s.station_name, COUNT(*) AS expected_days
FROM stations s
CROSS JOIN days d
GROUP BY s.station_id, s.station_name
ORDER BY s.station_name
`,
      solution: `${EXPECTED_CTES}
SELECT station_name, COUNT(*) AS expected_days
FROM expected
GROUP BY station_id, station_name
ORDER BY station_name`,
      tests: checks(
        ["station_name", "expected_days"],
        5,
        "All five stations",
        "Including Hollin Moss, which has not sent a reading yet.",
        "Expected days match the reference result",
      ),
    },
    {
      title: "Find the missing days",
      short: "Missing",
      solutionNote:
        "`NOT EXISTS` against `readings` is the anti join: keep the expected days for which no reading can be found. Harbour Mill and Brackenridge have holes in their series, and Hollin Moss has not reported at all, which is only visible because step 1 said it should have.",
      prompt: [
        "List every day a station was expected to report and did not: each expected station and date from step 1 with no matching row in `readings`.",
        "Return the station and the `missing_date`, sorted by `station_name`, then `missing_date`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "missing_date", type: "text" },
      ],
      starter: `${EXPECTED_CTES}
SELECT e.station_name, e.day AS missing_date
FROM expected e
ORDER BY e.station_name, e.day
`,
      solution: `${EXPECTED_CTES}
SELECT e.station_name, e.day AS missing_date
FROM expected e
WHERE NOT EXISTS (
  SELECT 1
  FROM readings r
  WHERE r.station_id = e.station_id
    AND r.reading_date = e.day
)
ORDER BY e.station_name, e.day`,
      tests: checks(
        ["station_name", "missing_date"],
        5,
        "Five missing station-days",
        "One at Harbour Mill, two at Brackenridge and two at Hollin Moss.",
        "Missing days match the reference result",
      ),
    },
    {
      title: "Score the coverage",
      short: "Coverage",
      solutionNote:
        "`LEFT JOIN` the expected days to `readings` and the two percentages are two counts over the same rows: `COUNT(r.reading_date)` counts days with any reading, `COUNT(r.precip_mm)` only days on which the gauge worked. Step 2 found nothing missing at Saltmarsh Point or Kestrel Fell, and their temperature record is complete, but each lost a day of rain.",
      prompt: [
        "Finish the report. For each station return its expected days, `temp_coverage_pct` (the share of expected days with a reading) and `rain_coverage_pct` (the share of expected days with a measured rainfall; a failed gauge leaves `precip_mm` NULL). Both are percentages rounded to 1 decimal place.",
        "Every station appears, including those with no gaps and Hollin Moss at 0.0. Sort by `rain_coverage_pct`, then `station_name`.",
      ],
      columns: [
        { name: "station_name", type: "text" },
        { name: "expected_days", type: "integer" },
        { name: "temp_coverage_pct", type: "real" },
        { name: "rain_coverage_pct", type: "real" },
      ],
      starter: `${EXPECTED_CTES}
SELECT e.station_name, COUNT(*) AS expected_days
FROM expected e
GROUP BY e.station_id, e.station_name
`,
      solution: `${EXPECTED_CTES}
SELECT e.station_name,
       COUNT(*) AS expected_days,
       ROUND(100.0 * COUNT(r.reading_date) / COUNT(*), 1) AS temp_coverage_pct,
       ROUND(100.0 * COUNT(r.precip_mm) / COUNT(*), 1)    AS rain_coverage_pct
FROM expected e
LEFT JOIN readings r
  ON r.station_id = e.station_id
 AND r.reading_date = e.day
GROUP BY e.station_id, e.station_name
ORDER BY rain_coverage_pct, e.station_name`,
      tests: checks(
        ["station_name", "expected_days", "temp_coverage_pct", "rain_coverage_pct"],
        5,
        "All five stations",
        "Stations with no gaps must not drop out of the report.",
        "Coverage matches the reference result",
      ),
    },
  ],
);

export const SQL_MULTI_WEATHER: Challenge[] = [HEATWAVE_DETECTOR, STATION_DATA_QUALITY];
