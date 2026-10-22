import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Advanced SQL" (16:9), Part 4 of the Data Analyst interview
 * prep videos (agent-outputs/20261021-2314-data-analyst-interview-video-plan.md),
 * after content/interview/data-analyst/advanced-sql.mdx. It answers the
 * twenty questions the plan gives this page: twelve worked through on real
 * queries, numbered aloud, then eight at speed (numbered 13 to 20 on screen
 * only). The page's CTE question is answered in Part 1.
 *
 *   1. what a window function is; 2. PARTITION BY against ORDER BY ("window").
 *   3. ROW_NUMBER, RANK and DENSE_RANK; 4. the top N per group; 5. QUALIFY
 *      ("rank").
 *   6. ROWS against RANGE; 7. the default frame; 8. the LAST_VALUE gotcha
 *      ("frame").
 *   9. a running total; 10. a moving average ("running").
 *   11. the latest row per key; 12. a date spine ("latest").
 *   At speed ("rapid-in"): LAG and LEAD; NTILE; a window function in WHERE;
 *   recursive CTEs; bucketing timestamps; pivoting; unpivoting; PERCENT_RANK
 *   and CUME_DIST.
 *
 * The opening is written fresh rather than in Parts 1 to 3's words (asked for
 * on 2026-10-22, so the series doesn't feel mechanical): no "hide a trap", a
 * different hook figure, and a different line into the quick round.
 *
 * No series intro yet (decided 2026-10-21): the first scene opens at frame 0,
 * and adding the intro later needs no re-voicing.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every statement on screen ran in DuckDB v1.4.3 (DuckDB-Wasm 1.32.0,
 * the engine the page's blocks run), by check.mjs into results.json, which
 * data.ts reads:
 *   - "window", the video's own six sales (the page's first six transaction
 *     amounts, three days in each of two regions): GROUP BY gives North 425
 *     and South 640; SUM OVER (PARTITION BY region) keeps all six rows; RANK
 *     restarts per region, North's 250 and South's 320 both first.
 *   - "rank", the page's 24 scores: 88 three times and 85 four times; RANK
 *     goes 8, 8, 8, 11 and DENSE_RANK 8, 8, 8, 9. The video's own eight
 *     products, Emma and Ulysses tied at 310: ROW_NUMBER keeps four rows (Emma
 *     of the pair), RANK five; QUALIFY gives ROW_NUMBER's four.
 *   - "frame", the video's own four payments (the page's first four amounts,
 *     the middle two on one day): ROWS gives 100, 350, 425, 605; RANGE and
 *     the default frame give 100, 425, 425, 605; no ORDER BY gives 605 on
 *     every row. LAST_VALUE on the page's first four days returns each row's
 *     own amount, and 180 with the frame widened.
 *   - "running", the page's 24 days: the running total reaches 4,255; the
 *     trailing three-day average starts 100, 175, 141.67.
 *   - "latest", the video's own plan changes: user 1 has three rows, and
 *     only team is kept. The page's spine: sales on March 1, 3 and 4, so the
 *     2nd and the 5th come back as zeros.
 *   - at speed: LAG gives 150 for January 2; NTILE(4) makes four groups of
 *     six from the page's 24 customers, NTILE(5) 5, 5, 5, 5, 4; DuckDB's own
 *     error for a window in WHERE; the page's org chart has five levels;
 *     January's 24 days fall in four weeks; the page's pivot and its unpivot;
 *     PERCENT_RANK 0 to 1 and CUME_DIST 0.2 to 1 on five customers.
 *
 * Written for Drew's ear, as in Parts 1 to 3: SQL keywords are written as
 * words, "N tile" for NTILE, "cume dist" for CUME_DIST, "date trunc" for
 * DATE_TRUNC.
 */
export const script: NarrationScript = {
  id: "da-advanced-sql",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Clear the first SQL screen, and the follow-ups change. Rank these. Compare each day with the one before. Keep only the latest row for each customer. Nearly all of it comes down to one tool: the window function.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "There are twenty questions here. We'll work through twelve of them on real queries, then take the last eight at speed.",
      pauseAfter: 0.7,
    },
    { id: "window-in", text: "Start with what a window actually is." },

    // ── 1, 2. Windows, PARTITION BY and ORDER BY ──────────────────────────
    {
      id: "window",
      scene: true,
      text: "Question one. What is a window function, and how does the over clause work?",
      pauseAfter: 0.6,
    },
    {
      id: "window-group",
      text: "Group by collapses rows. Six sales by region become two totals: North four twenty-five, South six forty.",
      pauseAfter: 0.7,
    },
    {
      id: "window-over",
      text: "A window function keeps every row. Sum over, partitioned by region, writes each region's total beside its sales: six rows in, six rows out.",
      pauseAfter: 0.7,
    },
    {
      id: "window-parts",
      text: "Inside over, you can say three things: which rows share a window, their order inside it, and the frame around the current row.",
      pauseAfter: 0.8,
    },
    {
      id: "partition",
      text: "Question two. What does partition by do, versus order by? Partition by splits the rows into groups, and the window starts over in each one. Order by sets the order inside a group, which is what a ranking needs.",
      pauseAfter: 0.6,
    },
    {
      id: "partition-rank",
      text: "Rank, partitioned by region and ordered by amount, starts again at one for South. North's two fifty and South's three twenty both come first.",
      pauseAfter: 0.7,
    },
    { id: "rank-in", text: "Which brings us to ranking, and to ties." },

    // ── 3, 4, 5. Ranking, the top N, QUALIFY ──────────────────────────────
    {
      id: "rank",
      scene: true,
      text: "Question three. How do row number, rank, and dense rank differ?",
      pauseAfter: 0.6,
    },
    {
      id: "rank-ties",
      text: "Look where the scores tie. Three people have eighty-eight, and four have eighty-five.",
      pauseAfter: 0.6,
    },
    {
      id: "rank-three",
      text: "Row number gives every row its own number, so a tie is broken arbitrarily. Rank lets ties share a number, then skips: eight, eight, eight, then eleven. Dense rank shares without the gap: eight, then nine.",
      pauseAfter: 0.8,
    },
    {
      id: "topn",
      text: "Question four. How do you return the top N rows per group? Number the rows inside each category, then keep the first N. With row number, you get exactly two per category. Emma and Ulysses tie at three ten, and only one of them makes it.",
      pauseAfter: 0.6,
    },
    {
      id: "topn-rank",
      text: "Use rank instead, and both tied books come back: five rows.",
      pauseAfter: 0.7,
    },
    {
      id: "qualify",
      text: "Question five. What is qualify? It filters on a window function the way having filters on an aggregate, with no wrapping query. DuckDB, Snowflake and BigQuery support it.",
      pauseAfter: 0.7,
    },
    { id: "frame-in", text: "Now the part people most often get wrong: the frame." },

    // ── 6, 7, 8. Frames ───────────────────────────────────────────────────
    {
      id: "frame",
      scene: true,
      text: "Question six. What is a window frame, and how do rows and range differ?",
      pauseAfter: 0.6,
    },
    {
      id: "frame-def",
      text: "The frame is the slice of rows the function can see, counted from the current one. Here, two payments fall on the same day.",
      pauseAfter: 0.6,
    },
    {
      id: "frame-rows",
      text: "Rows counts physical rows, so the running total climbs one payment at a time: a hundred, three fifty, four twenty-five.",
      pauseAfter: 0.6,
    },
    {
      id: "frame-range",
      text: "Range goes by the order by value, so both payments on the second day come in together. Both get four twenty-five.",
      pauseAfter: 0.8,
    },
    {
      id: "default",
      text: "Question seven. What is the default frame? Add order by with no frame, and you get range, from the start to the current row. So sum over order by day is a running total, not the total. Leave out order by, and every row gets six oh five.",
      pauseAfter: 0.8,
    },
    {
      id: "last",
      text: "Question eight. What's the last value gotcha? With that default frame, the window ends at the current row, so last value just returns the row's own amount. Widen the frame to unbounded following, and every row gets the real last day: one eighty.",
      pauseAfter: 0.7,
    },
    { id: "running-in", text: "Two calculations every analyst gets asked to write." },

    // ── 9, 10. Running total and moving average ───────────────────────────
    {
      id: "running",
      scene: true,
      text: "Question nine. How do you compute a running total? An ordered sum, with the default frame: a hundred, three fifty, four twenty-five, six oh five, and on to four thousand two hundred fifty-five by the twenty-fourth.",
      pauseAfter: 0.7,
    },
    {
      id: "moving",
      text: "Question ten. How do you compute a moving average? Average over an explicit rows frame, the two rows before and the current one. The first two days have less behind them, so they average one value and then two. A centered average uses one preceding and one following.",
      pauseAfter: 0.7,
    },
    { id: "latest-in", text: "And two patterns that turn up in almost every take-home." },

    // ── 11, 12. The latest row, and a date spine ──────────────────────────
    {
      id: "latest",
      scene: true,
      text: "Question eleven. How do you keep only the latest row for each user? Number each user's rows from the newest, and keep row one. User one has three rows. Only the newest, team, survives.",
      pauseAfter: 0.7,
    },
    {
      id: "spine",
      text: "Question twelve. How do you fill gaps in a date series? Sales skip the second and the fifth, so those days are simply missing, and a chart draws straight over them.",
      pauseAfter: 0.6,
    },
    {
      id: "spine-fix",
      text: "Generate every day with generate series, left join the sales onto it, and turn the missing amounts into zeros with coalesce.",
      pauseAfter: 0.7,
    },

    // ── At speed ──────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "That's the heavy lifting done. Eight more, at speed.",
      pauseAfter: 0.6,
    },
    {
      id: "r-lag",
      text: "Lag reads a value from an earlier row, and lead from a later one. Day over day change is the amount minus its lag.",
    },
    {
      id: "r-ntile",
      text: "N tile splits ordered rows into equal buckets. Twenty-four customers make four quartiles of six. Split them five ways, and the first buckets each take an extra row.",
    },
    {
      id: "r-where",
      text: "Can a window function go in where? No. Windows are computed after where, group by and having, so DuckDB refuses. Filter in an outer query, or with qualify.",
    },
    {
      id: "r-recursive",
      text: "A recursive CTE is a common table expression that refers to itself. It starts from anchor rows and keeps joining back on itself until nothing new turns up. Here it walks an org chart from the CEO down five levels.",
    },
    {
      id: "r-bucket",
      text: "Date trunc snaps a timestamp to the start of its day, week or month. January's twenty-four days fall into four weeks.",
    },
    {
      id: "r-pivot",
      text: "To pivot, wrap a case in a sum for each new column: one row per region, with the quarters side by side.",
    },
    {
      id: "r-unpivot",
      text: "To unpivot, union all one select per column, and the wide table turns long again.",
    },
    {
      id: "r-percent",
      text: "And percent rank runs from zero for the first row to one for the last. Cume dist is the share of rows at or below this one, so it never reaches zero.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Results like these usually end up in a spreadsheet, and that's where the next round goes. Next: Excel and spreadsheets.",
    },
  ],
};
