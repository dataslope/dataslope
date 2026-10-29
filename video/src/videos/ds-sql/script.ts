import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "SQL" (16:9), Part 10 of the Data Scientist interview prep
 * videos (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md),
 * after content/interview/data-scientist/sql.mdx. It answers the page's
 * fifteen questions: six worked through on real queries, numbered aloud, then
 * nine at speed (numbered 7 to 15 on screen only), since Data Analyst Parts 1
 * and 4 take those nine apart in depth.
 *
 *   1. INNER or LEFT JOIN for retention; 2. churn as an anti-join ("join").
 *   3. a rate that can't divide by zero, and integer division ("rate").
 *   4. cohort retention ("cohort").
 *   5. sessionization ("session").
 *   6. the median and percentiles ("pct").
 *   At speed ("rapid-in"): WHERE and HAVING; window functions and GROUP BY;
 *   ROW_NUMBER, RANK and DENSE_RANK; day-over-day change; the top N per
 *   group; a running total; the latest row per key; pivoting; COUNT(*),
 *   COUNT(col) and COUNT(DISTINCT col).
 *
 * The opening is written fresh (the series rule since 2026-10-22): it shows
 * the finished cohort chart first and promises each of its pieces, a shape no
 * other video's opening uses. It says why the rows get shorter (newer cohorts
 * have had fewer months), so the chart's outline is not read as churn.
 *
 * No series intro yet: the first scene opens at frame 0.
 *
 * Facts. Every statement on screen ran in DuckDB v1.4.3 (DuckDB-Wasm 1.32.0,
 * the engine the page's blocks run), by check.mjs into results.json, which
 * data.ts reads; the one Postgres figure ran on the site's Postgres 18 engine
 * (scripts/lib/sql-engines.mjs):
 *   - "join", the video's own months: six users active in January, three of
 *     them (2, 3, 5) back in February plus a new 7. INNER JOIN keeps three
 *     rows and counts retention 1.0; LEFT JOIN keeps six and counts 0.5. The
 *     page's churn query returns 1, 4 and 6, and NOT EXISTS the same three.
 *   - "rate", the page's funnel: four of 24 variants have no sessions. In
 *     Postgres the bare division fails ("division by zero") and 120 / 1000
 *     is 0; with * 1.0 and NULLIF, A is 0.1200 and C and F null, shown where
 *     the error was. DuckDB's bare division already returns null for C and F
 *     (and 0.12 for 120 / 1000), which the narration says, so NULLIF is the
 *     portable habit rather than DuckDB's need.
 *   - "cohort", the video's own activity log, labelled as such: 46 events
 *     from 23 users. The page's query gives January's cohort 8, 6, 4 and 3
 *     users; as shares of month zero, 100, 75, 50 and 38 percent.
 *   - "session", the page's hits: user 1's six hits have gaps of 10, 15, 95,
 *     15 and 205 minutes, so three sessions; the five users' 24 hits make 12.
 *   - "pct", the video's own twelve latencies, labelled as such: mean 407.1
 *     ms, faster than it are 10 of 12; PERCENTILE_CONT(0.5) 165 and
 *     PERCENTILE_DISC(0.5) 150; the p90 836 (CONT) and 900 (DISC).
 *   - at speed: DuckDB's own error for COUNT(*) in WHERE; the page's 24 sales
 *     in four region totals; the video's own four scores for the tie (1, 2,
 *     2, 4 and 1, 2, 2, 3, the page's own example numbers); the page's
 *     transactions (change 150 on January 2; running total 100, 350, 425,
 *     605), and the same running total on the video's own three rows, two on
 *     January 2, where the default RANGE frame gives both 425 (an explicit
 *     ROWS frame gives 350, then 425); the page's sales, top two per region; the page's challenge
 *     orders, twelve customers; the video's own traffic for the pivot; the
 *     video's own eight page views (8, 6, 4).
 *
 * Written for Drew's ear: SQL keywords as words ("null if", "not exists",
 * "percentile cont"), numbers as they are said, initialisms in plain caps
 * and expanded the first time (LLM), and no sentence opening "A" before one.
 */
export const script: NarrationScript = {
  id: "ds-sql",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every product team keeps a chart like this one. Each row is the users who first showed up in one month.",
    },
    {
      id: "hook-cells",
      text: "Each cell is the share of them still active a month later, then two, then three, so every row fades as it goes right. And each newer row is shorter: it has had fewer months to measure.",
    },
    {
      id: "hook-sql",
      text: "Building it is a classic data science SQL question, and each of its pieces gets asked on its own.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "The page asks fifteen questions. Six get a real query here. The other nine come quickly at the end, since the data analyst videos take them apart in depth.",
      pauseAfter: 0.7,
    },
    { id: "join-in", text: "The first piece: who came back at all." },

    // ── 1, 2. Retention joins, and churn ──────────────────────────────────
    {
      id: "join",
      scene: true,
      text: "Question one. Inner join or left join: which does a retention query need? Here are January's six active users, and February's four.",
      pauseAfter: 0.6,
    },
    {
      id: "join-inner",
      text: "An inner join keeps only the users found in both months: three rows. Count February's matches over those rows, and retention comes out at a hundred percent. The users who left were dropped before anything was counted.",
      pauseAfter: 0.7,
    },
    {
      id: "join-left",
      text: "A left join keeps all six January users and writes null where February has no match. Three out of six came back: fifty percent.",
      pauseAfter: 0.7,
    },
    {
      id: "churn",
      text: "Question two. How do you find users active one month but not the next? Those nulls are the answer. Keep the left join, and filter where February's user ID is null: users one, four and six. Not exists returns the same three.",
      pauseAfter: 0.7,
    },
    { id: "rate-in", text: "Retention is a rate, and every rate has a denominator that can be zero." },

    // ── 3. A safe rate ────────────────────────────────────────────────────
    {
      id: "rate",
      scene: true,
      text: "Question three. How do you compute a rate without dividing by zero? Four variants in the page's funnel had no sessions at all. In Postgres, dividing by that zero is an error, and the whole query fails.",
      pauseAfter: 0.6,
    },
    {
      id: "rate-nullif",
      text: "Wrap the denominator in null if. It turns a zero into a null, so variant C gets a null rate: an honest blank. DuckDB returns null there anyway, but the habit keeps the query safe on every engine. And don't patch it with coalesce to zero. No sessions means no rate, not a rate of zero.",
      pauseAfter: 0.7,
    },
    {
      id: "rate-int",
      text: "Then watch integer division. In Postgres, a hundred twenty conversions over a thousand sessions is zero. Multiply by one point oh first, and it's point one two.",
      pauseAfter: 0.7,
    },
    { id: "cohort-in", text: "Now, the chart from the start." },

    // ── 4. Cohort retention ───────────────────────────────────────────────
    {
      id: "cohort",
      scene: true,
      text: "Question four. How do you write a cohort retention query? Here's an activity log, made up for this video. Take each user's earliest month: that's their cohort. Then label every event with the months since that cohort.",
      pauseAfter: 0.6,
    },
    {
      id: "cohort-count",
      text: "Count distinct users by cohort and month offset. January's cohort starts with eight users, then six, four, and three.",
      pauseAfter: 0.6,
    },
    {
      id: "cohort-rate",
      text: "Divide each count by the cohort's month zero, and the counts become shares: a hundred, seventy-five, fifty, thirty-eight percent.",
    },
    {
      id: "cohort-stair",
      text: "Shares fall along each row, and the newest cohorts are the shortest: they've had the fewest months.",
      pauseAfter: 0.8,
    },
    { id: "session-in", text: "Months are coarse. Product teams also measure the smallest unit of use: one visit." },

    // ── 5. Sessionization ─────────────────────────────────────────────────
    {
      id: "session",
      scene: true,
      text: "Question five. What is sessionization, and how do you do it in SQL? It groups one user's events into visits. A new session starts when the gap since their last event passes thirty minutes. User one has six hits in a day.",
      pauseAfter: 0.6,
    },
    {
      id: "session-lag",
      text: "Lag brings each row the timestamp before it. Flag a one where that gap is over thirty minutes, or where there's no earlier hit at all.",
      pauseAfter: 0.6,
    },
    {
      id: "session-sum",
      text: "Then a running sum of the flags is the session number. Gaps of ninety-five and two hundred five minutes start new sessions, so user one's six hits make three. Across all five users, twenty-four hits make twelve sessions.",
      pauseAfter: 0.7,
    },
    { id: "pct-in", text: "One more before the quick round: what counts as typical." },

    // ── 6. Median and percentiles ─────────────────────────────────────────
    {
      id: "pct",
      scene: true,
      text: "Question six. How do you compute a median or a percentile in SQL? Here are twelve request times, made up for this video. Their average is four hundred seven milliseconds, slower than ten of the twelve requests.",
      pauseAfter: 0.6,
    },
    {
      id: "pct-median",
      text: "Percentile cont interpolates: the median is one sixty-five, halfway between the sixth and seventh values. Percentile disc returns a value that really occurred: one fifty.",
      pauseAfter: 0.7,
    },
    {
      id: "pct-tail",
      text: "That's why latency is reported as a percentile. The ninetieth percentile is eight hundred thirty-six milliseconds: nine requests in ten finish within it, and the slow tail stays in view instead of being averaged away.",
      pauseAfter: 0.8,
    },

    // ── At speed ──────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "The remaining nine are everyday patterns. Here they are, back to back.",
      pauseAfter: 0.6,
    },
    {
      id: "r-having",
      text: "Where filters rows before grouping, and having filters groups after. Put count in where, and DuckDB refuses: the aggregate doesn't exist yet.",
    },
    {
      id: "r-window",
      text: "Group by turns twenty-four sales into four region totals. A window function keeps all twenty-four rows and writes the total beside each one.",
    },
    {
      id: "r-rank",
      text: "On a tie, row number still counts one, two, three, four. Rank shares and then skips: one, two, two, four. Dense rank shares without the gap.",
    },
    {
      id: "r-dod",
      text: "For a day-over-day change, lag puts yesterday's amount on today's row, and you subtract. No self join needed.",
    },
    {
      id: "r-topn",
      text: "For the top N per group, number the rows inside each region by amount, then keep row numbers two or lower in an outer query.",
    },
    {
      id: "r-running",
      text: "A running total is an ordered sum: one hundred, three fifty, four twenty-five, six oh five. With no frame written, each sum covers the first row through this one, and rows tied on the day share one total.",
      // Time to read the tie, which lands on the beat's last words.
      pauseAfter: 1.2,
    },
    {
      id: "r-latest",
      text: "To keep the latest row per key, order each customer's orders newest first and keep row one: twelve customers, twelve rows.",
    },
    {
      id: "r-pivot",
      text: "Pivoting is conditional aggregation: a sum over case when the device is mobile, another for desktop, grouped by region.",
    },
    {
      id: "r-count",
      text: "And count star counts rows, count of a column skips its nulls, and count distinct counts unique values: eight views, six signed in, four people. That's volume against reach.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Every query here measured what users did. The newest round asks you to measure what a large language model, an LLM, writes. Next: LLM evaluation.",
    },
  ],
};
