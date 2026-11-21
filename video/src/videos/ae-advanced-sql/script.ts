import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Advanced SQL" (16:9), Part 5 of the Analytics Engineer
 * interview prep videos (composition AnalyticsEngineer-5-AdvancedSql;
 * agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
 * "5, Advanced SQL"), after
 * content/interview/analytics-engineer/advanced-sql.mdx. It answers the
 * page's nineteen questions other than "How do you select new rows since the
 * last load (incremental filtering)?", which Part 4 answers with the dbt and
 * warehousing pages' versions. Twelve are worked through on real queries,
 * numbered aloud and read in the page's words; seven go quickly at the end,
 * also read aloud ("Question thirteen." and the question). By the page's
 * headings ("vs" read "versus", the card keeps the page's spelling):
 *
 *   1. What is a window function, and how does it differ from GROUP BY?
 *      ("window")
 *   2. What are the three parts of an OVER clause? ("over")
 *   3. What is the difference between a window function and an aggregate in
 *      one query? ("mix")
 *   4. How do you deduplicate to the latest record per key? ("latest")
 *   5. What does QUALIFY do, and how does it relate to WHERE and HAVING?
 *      ("qualify")
 *   6. How do you compute a running total, and what does the frame control?
 *      ("running")
 *   7. What is the difference between ROWS and RANGE frames? ("frame")
 *   8. How do you compute a period-over-period change? ("lag")
 *   9. What is a date spine, and why generate one? ("spine")
 *   10. How do you generate a series of dates in Postgres? ("series")
 *       Answered together with 9, as the plan pairs them, on one scene; each
 *       is still read aloud under its own number.
 *   11. When is COUNT(DISTINCT ...) a problem, and what do you do about it?
 *       ("distinct")
 *   12. Why compute ratios from summed components instead of averaging
 *       per-row ratios? ("ratio")
 *   Quick ("rapid-in"): 13. How do you avoid a divide-by-zero error?
 *   ("r-zero"); 14. Explain ROW_NUMBER vs RANK vs DENSE_RANK. ("r-rank");
 *   15. How do you find the top-N rows per group? ("r-topn"); 16. What is a
 *   CTE, and when do you prefer it over a subquery? ("r-cte"); 17. What is a
 *   recursive CTE, and when do you need one? ("r-recursive"); 18. How do you
 *   pivot rows into columns? ("r-pivot"); 19. How do you unpivot columns into
 *   rows? ("r-unpivot"). Question 17's answer runs on into "r-depth" (when
 *   you need one: a depth not known in advance).
 *
 * Why these twelve go deep: each has a mechanism or a trap an interviewer
 * follows up on (the error a grouped window raises, the tie that RANK keeps
 * twice, the frame nobody wrote, LAG counting rows rather than months, the
 * COUNT(*) that says one on an empty day, the distinct counts that sum to
 * nearly twice the people, the average of ratios that is off by two and a
 * half times). The ranking trio and the top N are answered quickly because
 * question 4 has already shown ROW_NUMBER against RANK on a tie.
 *
 * Opening and bridge, per the plan's "How the videos join up": it opens on
 * 4 → 5 ("the SQL inside the models: windows, deduplication, spines") without
 * naming Part 4, so it stands alone, and closes on 5 → 6 ("where that SQL
 * runs, and what it costs to scan"): "Next: warehouses and what they cost."
 *
 * On screen, beat by beat (what phase 2 builds; the series' colors: red the
 * trap, green the right answer, yellow what the narration points at, blue
 * data). Every listing is the SQL in check.mjs, shown with its result:
 *   hook: the giraffe (the hero) beside a short listing, a model's body: SELECT ...
 *     FROM ... ; three questions ink in beside it, one per clause of the
 *     beat ("which row survives", "what a total includes", "which days go
 *     missing"). plan: twelve numbered squares and seven smaller ones.
 *     window-in and frame-in are one-line turns: no new figure, the next
 *     scene's question card follows.
 *   window: QuestionCard 1. window-group: DA Part 4's six sales (two
 *     regions, three days each), a GROUP BY listing, its two rows (North
 *     425, South 640) as the six rows fold into them. window-over: the six
 *     rows return with a fourth column, total, from SUM(amount) OVER
 *     (PARTITION BY region): 425 three times, 640 three times; "6 rows in, 6
 *     out". window-why: three words fade in over the new column: running
 *     total, rank, share.
 *   over: QuestionCard 2; the page's SyntaxBreakdown, SUM(amount) OVER (
 *     PARTITION BY region ORDER BY day ROWS 6 PRECEDING ), each part
 *     underlined and labelled in the page's words as over-parts names it.
 *     over-run: the same six rows with three new columns from one listing:
 *     OVER () 1,065 on every row; OVER (PARTITION BY region) 425 and 640;
 *     OVER (PARTITION BY region ORDER BY day) 100, 350, 425 then 180, 500,
 *     640, the restart at South in yellow. over-default: the third column's
 *     OVER (...) with an empty slot after ORDER BY day, a dashed box where
 *     the frame would be: "start of partition to current row".
 *   mix: QuestionCard 3. mix-run: the share listing (GROUP BY region,
 *     SUM(SUM(amount)) OVER (), and the percentage), its two rows: North 425,
 *     1,065, 39.9; South 640, 1,065, 60.1, the inner SUM and the window
 *     marked "1: group", "2: window". mix-trap: the outer SUM struck out,
 *     and Postgres's error under it in red: "column "sales.amount" must
 *     appear in the GROUP BY clause or be used in an aggregate function".
 *   latest: QuestionCard 4. latest-how: the page's customer_updates, 24
 *     rows, customer 3's three rows numbered 1, 2, 3 by recency, row 1 kept
 *     (green); the page's listing; "24 rows in, 12 out". latest-where: the
 *     same window moved into WHERE, Postgres's error in red: "window
 *     functions are not allowed in WHERE". latest-max: GROUP BY with MAX:
 *     twelve times, no email (an empty email column, a red note beside).
 *     latest-tie: customer 3's rows again with the video's own fourth row,
 *     c4@x.com at the same 2024-05-18 16:45:00; under RANK both get 1 and
 *     the count reads 13 (red); under ROW_NUMBER, 12, the pair numbered as
 *     the run numbered it (c4@x.com 1, though the listing prints it second)
 *     and "which of the pair is 1?"; the keys spot (two identical keys) beside the
 *     pair. latest-break: "ORDER BY updated_at DESC, <tiebreaker>" with the
 *     slot in yellow. latest-on: DISTINCT ON in one line, its twelve
 *     rows ticked against the first twelve, and the page's engines: Postgres
 *     and DuckDB have it, the big cloud warehouses don't.
 *   qualify: QuestionCard 5; the page's second SyntaxBreakdown (WHERE
 *     status = 'paid' "filters raw rows", HAVING SUM(amount) > 0 "filters
 *     aggregated groups", QUALIFY rn = 1 "filters on the window result"),
 *     then the logical order as a row of four steps, WHERE, GROUP BY and
 *     HAVING, windows, QUALIFY, inked left to right on qualify-order.
 *     qualify-run: the page's QUALIFY snippet; Postgres's "syntax error at
 *     or near "ROW_NUMBER"" in red, small, then the same snippet labelled
 *     DuckDB with its twelve rows, identical to the subquery's (green).
 *     qualify-who: the engines as badges: Snowflake, BigQuery, Databricks,
 *     DuckDB; Postgres apart, "wrap it in a subquery".
 *   running: QuestionCard 6; the page's daily table (24 days) and its
 *     running-total listing, the total climbing beside the rows to 411.
 *     running-move: the frame clause swapped for ROWS BETWEEN 6 PRECEDING
 *     AND CURRENT ROW, n_rows beside it, the first six (1 to 6) in red.
 *   frame: QuestionCard 7; the page's chart (charts/window-frame-rows-range:
 *     fourteen rows, ROWS frames stopping at the current row, the RANGE frame
 *     running on through its peers) as the definition, then DA Part 4's four
 *     payments, two on January 2. frame-rows: 100, 350, 425 climbing one
 *     row at a time (blue). frame-range: both January 2 rows read 425
 *     (yellow). frame-default: the frame clause deleted, the result
 *     unchanged from RANGE, both 425s now red: "the total including the
 *     rest of the day". frame-pick: "ROWS + a unique ORDER BY" (green) and
 *     "RANGE: a span of values" beside it.
 *   lag: QuestionCard 8; a SyntaxBreakdown of the expression the page's block
 *     runs (revenue - LAG(revenue) OVER (ORDER BY month): one series, so no
 *     PARTITION BY); the page's 24 months as a
 *     line chart, the first month's change "null". lag-season: January
 *     2024's two arrows, one back a month to December's 385 (-285, red),
 *     one back twelve rows to January 2023's 145 (-45). lag-gap: March 2023
 *     erased from the line; the twelve-back arrows slide one month, eight of
 *     them red; March 2024's arrow lands on February 2023 ("-45, should be
 *     -100").
 *   spine: QuestionCard 9, the calendar spot beside it; May 1 to 15 as
 *     fifteen day cells, the page's
 *     logins as dots on ten of them; the GROUP BY result, ten rows, with the
 *     five missing days as gaps a line chart bridges (red). spine-join: the
 *     spine as a column of fifteen dates, the left join drawn, zeros in the
 *     five gaps (green). spine-count: COUNT(*) against COUNT(DISTINCT
 *     l.user_id) side by side: 1 against 0 on the five empty days (the 1s
 *     red).
 *   series: QuestionCard 10, the page's SyntaxBreakdown of generate_series
 *     (start, end, step); pg_typeof's answer, "timestamp with time zone",
 *     then CAST(g AS DATE) in yellow. series-bounds: the spine's bounds
 *     taken from MIN and MAX of the data, then an empty May 16 outside them
 *     (red), then bounds "from the report's range" (green).
 *   distinct: QuestionCard 11; the ten days' distinct users (2, 2, 2, 2, 2,
 *     3, 2, 2, 3, 3) summing to 23 (red) against COUNT(DISTINCT user_id)
 *     over the range, 12 (green). distinct-why: user 101's five days lit
 *     across the strip, then the other five returning users: "6 users, 11
 *     extra counts". distinct-fix: an arrow from the logins to "month",
 *     straight, and the daily table's arrow to it struck. distinct-approx:
 *     "approx_count_distinct (HyperLogLog)"; DuckDB's run on a million
 *     distinct IDs: exact 1,000,000 against approx 962,761.
 *   ratio: QuestionCard 12; the video's own two days: 1 order for 200.00,
 *     10,000 orders for 500,000.00, each day's order value (200.00, 50.00);
 *     their average, 125.00 (red). ratio-sum: SUM(revenue) /
 *     NULLIF(SUM(orders), 0): 50.01 (green). ratio-store: a model's two
 *     columns, revenue and orders, kept; the ratio column faded out.
 *   rapid-in: the RapidFire list, 13 to 19.
 *     r-zero: the video's own three days; gross_revenue / order_count, and
 *     Postgres's "ERROR: division by zero" (red); with NULLIF, 150.00, null,
 *     150.00, the null kept; a note that COALESCE turns it into 0.
 *     r-rank: DA Part 4's four books (Dune 420, Emma 310, Ulysses 310,
 *     Beloved 150) with three columns: 1 2 3 4; 1 2 2 4; 1 2 2 3, the 4 and
 *     the 3 in yellow; the books spot beside the list.
 *     r-topn: DA Part 4's eight products, its listing's window lines and its
 *     filter: ROW_NUMBER <= 2 keeps four rows
 *     (Emma, not Ulysses); RANK <= 2 keeps five.
 *     r-cte: the page's SyntaxBreakdown (WITH recent AS (SELECT ...) SELECT
 *     * FROM recent), run on the page's updates since May: six rows.
 *     r-recursive: the page's nums CTE, anchor and recursive halves marked,
 *     its result 1 to 5; DA Part 4's org chart beside it: 24 people, five
 *     levels (1, 3, 6, 11, 3).
 *     r-pivot: DA Part 4's 24 sales by region and quarter, pivoted to four
 *     rows by CASE WHEN; the FILTER form's identical result; a PIVOT clause
 *     with "Snowflake, BigQuery, SQL Server, DuckDB" and Postgres's syntax
 *     error, small.
 *     r-unpivot: the four-row pivot turned back into eight rows by the
 *     page's CROSS JOIN LATERAL (VALUES ...).
 *   next: the RapidFire list complete; NextLine "Next: warehouses and what
 *     they cost". ("small", "These tables held a few dozen rows at most": the
 *     largest table on screen holds 24 rows; the million IDs behind DuckDB's
 *     estimate are a count, not a table shown.)
 *
 * Facts. Every statement ran, by check.mjs into results.json, which data.ts
 * reads: in Postgres (PGlite 0.5.16, PostgreSQL 18.6, the engine the page's
 * blocks run), each figure in a fresh database; QUALIFY and
 * approx_count_distinct in DuckDB-Wasm 1.32.0 (DuckDB v1.4.3), where
 * Postgres can't. Every error is the engine's own text.
 *   - "window", "over", "mix": Data Analyst Part 4's six sales
 *     (da-advanced-sql, the question is the same as its Question 1): GROUP BY
 *     North 425 and South 640, and SUM OVER (PARTITION BY region), imported
 *     from its results.json. Run here on the same setup: OVER () 1,065 on
 *     every row; PARTITION BY region ORDER BY day 100, 350, 425 and 180,
 *     500, 640; the share listing North 39.9, South 60.1 of 1,065; the
 *     window without its outer SUM refused ("column "sales.amount" must
 *     appear in the GROUP BY clause or be used in an aggregate function").
 *     "Windows run after group by" is the page's own line.
 *   - "latest": the page's customer_updates, 24 rows, 12 customers; the
 *     page's block keeps 12 (customer 3's c3@x.com, 2024-05-18 16:45:00);
 *     the window in WHERE refused ("window functions are not allowed in
 *     WHERE"); GROUP BY with MAX gives the same twelve times and no email;
 *     DISTINCT ON the same twelve rows. The video's own tie, a second row
 *     for customer 3 at 2024-05-18 16:45:00 (c4@x.com): RANK keeps 13 rows,
 *     ROW_NUMBER 12 (it kept c4 in this run; which one is the engine's
 *     choice: the screen numbers the pair as this run did, c4 first).
 *   - "qualify": the page's QUALIFY snippet, refused by Postgres ("syntax
 *     error at or near "ROW_NUMBER""), and run as written (with an ORDER BY
 *     added to print in key order) in DuckDB on the page's table: the same
 *     twelve rows as the subquery, in DuckDB and in Postgres. The logical
 *     order and the engines that support it (Snowflake, BigQuery, Databricks,
 *     DuckDB) are the page's.
 *   - "running": the page's daily block as written: 10, 30, 35, ... 411 on
 *     January 24. ROWS BETWEEN 6 PRECEDING: the first six rows hold 1 to 6
 *     rows (COUNT(*) OVER the same window).
 *   - "frame": Data Analyst Part 4's four payments (the question is its
 *     Question 6), imported from its results.json: ROWS 100, 350, 425, 605;
 *     RANGE and the default frame 100, 425, 425, 605. "The total including
 *     the rest of the day" is the caption of the page's own chart,
 *     charts/window-frame-rows-range.mjs. On the page's daily table no two
 *     days tie, so the default frame gives the same 411 (run here).
 *   - "lag": the page's monthly block as written: the first change null;
 *     January 2024 -285 against December 2023's 385; LAG(revenue, 12): -45
 *     against January 2023's 145. The video's own gap, March 2023 deleted
 *     (23 months): LAG(revenue, 12) compares August 2023 to March 2024 with
 *     the month thirteen back (eight months), March 2024 with February 2023,
 *     -45 instead of -100.
 *   - "spine", "series": the page's logins (its second challenge), May 1 to
 *     15: GROUP BY gives 10 rows; the challenge's solution 15, with 0 on
 *     May 2, 6, 9, 12 and 13; with COUNT(*) instead, those five read 1.
 *     generate_series over DATE bounds returns "timestamp with time zone"
 *     (pg_typeof), which the page's CAST turns back into dates. The bounds
 *     point is reasoning, not a run: the page's query takes its bounds from
 *     MIN and MAX of the data.
 *   - "distinct": the same logins: the ten days' distinct users sum to 23;
 *     COUNT(DISTINCT user_id) over the range is 12; 6 users are active on
 *     more than one day, 11 extra counts between them. DuckDB's
 *     approx_count_distinct on a million distinct values (range(1000000)):
 *     962,761 ("about four percent low"). HyperLogLog is the page's word.
 *   - "ratio": the video's own two days, sized as the page's "a 1-order day
 *     and a 10,000-order day": 200.00 for 1 order, 500,000.00 for 10,000;
 *     the average of the two order values 125.00; SUM over SUM 50.01 ("just
 *     over fifty dollars").
 *   - quick round: the video's own three days for the page's NULLIF query
 *     (Postgres's "division by zero" without it; 150.00, null, 150.00 with
 *     it; COALESCE gives 0); DA Part 4's books, run here for the ranking
 *     trio (1 2 3 4, 1 2 2 4, 1 2 2 3); its top N imported (ROW_NUMBER 4
 *     rows, RANK 5); the page's CTE shape on the page's updates since May 1
 *     (6 rows) and its nums CTE (1 to 5); DA Part 4's org chart imported (24
 *     people, five levels); DA Part 4's pivot sales, the CASE WHEN and
 *     FILTER forms here (identical, four rows), its CASE WHEN pivot imported,
 *     the PIVOT clause refused by Postgres, and the page's lateral VALUES
 *     unpivot (eight rows). The engines with PIVOT and UNPIVOT are the
 *     page's.
 *
 * Reuse, per the plan: Data Analyst Part 4 (da-advanced-sql) asks five of
 * these questions in near-identical words (window functions, ROWS against
 * RANGE, the ranking trio, the top N, pivoting), so its six sales, four
 * payments, eight products, pivot sales and org chart are used, imported from
 * its results.json where it already ran the statement, and their setups
 * copied verbatim into check.mjs where this video asks something new of them.
 * Its RankScene, FrameScene and RapidScene are candidates to copy and
 * re-cue. Data Engineer Part 1 (de-sql-patterns) asks the latest row, QUALIFY
 * and the frame; this video takes the Analytics Engineer page's own
 * customer_updates instead, because this page has that table and the page
 * and the video should show the same rows. The narration never refers to
 * either video.
 *
 * Written for Drew's ear: SQL is written SQL (the lexicon says "sequel");
 * dbt, CTE and ID read letter by letter, CTE expanded on its first use
 * (question 16), no sentence opening "A" before an initialism. SQL keywords
 * are lowercase words in the narration ("group by", "row number", "null
 * if", "count star", "generate series"); the screen keeps their capitals.
 * Snowflake, BigQuery and Databricks are glossed once as cloud warehouses,
 * DuckDB once as an analytics database. Years in digits, other numbers as
 * they are said ("four twenty-five", "ten sixty-five").
 */
export const script: NarrationScript = {
  id: "ae-advanced-sql",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Open any model in a dbt project, and inside it is a select statement. The SQL round asks what that statement does to rows: which one survives a duplicate, what a running total includes, and which days quietly go missing.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Nineteen questions. Twelve are worked through on real queries, and seven come quickly at the end.",
      pauseAfter: 0.6,
    },
    { id: "window-in", text: "Most of them start with a window." },

    // ── 1, 2, 3. Windows, OVER, and a window over an aggregate ────────────
    {
      id: "window",
      scene: true,
      text: "Question one. What is a window function, and how does it differ from group by?",
      pauseAfter: 0.6,
    },
    {
      id: "window-group",
      text: "Group by collapses rows. Six sales in two regions become two totals: North four twenty-five, South six forty.",
      pauseAfter: 0.6,
    },
    {
      id: "window-over",
      text: "A window function keeps every row and adds a column. Sum over, partitioned by region, writes each region's total beside its own sales: six rows in, six out.",
      pauseAfter: 0.7,
    },
    {
      id: "window-why",
      text: "That's how a detail row gets its running total, its rank, or its share of the whole.",
      pauseAfter: 0.8,
    },
    {
      id: "over",
      text: "Question two. What are the three parts of an over clause?",
      pauseAfter: 0.5,
    },
    {
      id: "over-parts",
      text: "Partition by splits rows into independent groups. Order by sets their order inside each group. And the frame bounds which rows feed the calculation.",
      pauseAfter: 0.8,
    },
    {
      id: "over-run",
      text: "Stack them on one sum. With nothing inside over, every row sees all six: ten sixty-five. Partitioned, each region's own total. Ordered by day, a running total that starts again for South.",
      pauseAfter: 0.7,
    },
    {
      id: "over-default",
      text: "Nobody wrote that frame. With order by, the default runs from the start of the partition to the current row, and question seven shows what it does with ties.",
      pauseAfter: 1.2,
    },
    {
      id: "mix",
      text: "Question three. What is the difference between a window function and an aggregate in one query?",
      pauseAfter: 0.5,
    },
    {
      id: "mix-run",
      text: "The aggregate collapses, the window keeps, and one query can do both, because windows run after group by. Group by region, then sum the sums over everything: ten sixty-five on both rows, and North's share is thirty-nine point nine percent.",
      pauseAfter: 0.7,
    },
    {
      id: "mix-trap",
      text: "Drop the outer sum, and Postgres refuses: after grouping, there's no single amount left to add up.",
      pauseAfter: 1.0,
    },

    // ── 4, 5. The latest record per key, and QUALIFY ──────────────────────
    {
      id: "latest",
      scene: true,
      text: "Question four. How do you deduplicate to the latest record per key?",
      pauseAfter: 0.5,
    },
    {
      id: "latest-how",
      text: "Number each customer's rows from the newest with row number, and keep row one. The page's table holds twenty-four updates from twelve customers, and twelve rows come out.",
      pauseAfter: 0.6,
    },
    {
      id: "latest-where",
      text: "The filter goes in a wrapping query, because where can't see a window function. Postgres says so.",
      pauseAfter: 0.6,
    },
    {
      id: "latest-max",
      text: "Group by with max finds each customer's latest time, but loses the email that goes with it.",
      pauseAfter: 0.7,
    },
    {
      id: "latest-tie",
      text: "The follow-up is a tie. Give customer three a second update at the very same second. Rank numbers both of them one, so thirteen rows come back. Row number keeps one, but which one is the engine's choice.",
      pauseAfter: 0.6,
    },
    {
      id: "latest-break",
      text: "Add a tiebreaker to the order by, like a load sequence number, so every run keeps the same row.",
      pauseAfter: 0.7,
    },
    {
      id: "latest-on",
      text: "Postgres's distinct on does the same in one line, but the big cloud warehouses don't have it.",
      pauseAfter: 0.8,
    },
    {
      id: "qualify",
      text: "Question five. What does qualify do, and how does it relate to where and having?",
      pauseAfter: 0.5,
    },
    {
      id: "qualify-order",
      text: "Where filters raw rows. Having filters groups. Qualify filters on a window function's result, so it runs last: where, then group by and having, then the windows, then qualify.",
      pauseAfter: 0.7,
    },
    {
      id: "qualify-run",
      text: "So the wrapping query goes. Postgres has no qualify, so this runs in DuckDB, an analytics database, and keeps the same twelve rows.",
      pauseAfter: 0.6,
    },
    {
      id: "qualify-who",
      text: "The cloud data platforms Snowflake, BigQuery and Databricks support it too. On Postgres, keep the subquery.",
      pauseAfter: 0.8,
    },
    { id: "frame-in", text: "Back to the frame, the part of over that decides what a total includes." },

    // ── 6, 7. The running total, and ROWS against RANGE ───────────────────
    {
      id: "running",
      scene: true,
      text: "Question six. How do you compute a running total, and what does the frame control?",
      pauseAfter: 0.5,
    },
    {
      id: "running-sum",
      text: "Sum over, ordered by day, with rows between unbounded preceding and the current row: everything from the start up to here. On the page's twenty-four days, it climbs from ten to four hundred eleven.",
      pauseAfter: 0.7,
    },
    {
      id: "running-move",
      text: "Average over six preceding and the current row instead, and it's a seven-row trailing average. The first six windows hold fewer than seven rows, so flag them or leave them out.",
      pauseAfter: 0.8,
    },
    {
      id: "frame",
      text: "Question seven. What is the difference between rows and range frames?",
      pauseAfter: 0.5,
    },
    {
      id: "frame-def",
      text: "Rows counts physical rows. Range counts values of the order by, so rows that tie come in together. Here, two payments land on the same day.",
      pauseAfter: 0.6,
    },
    {
      id: "frame-rows",
      text: "With rows, the running total climbs one payment at a time: a hundred, three fifty, four twenty-five.",
      pauseAfter: 0.6,
    },
    {
      id: "frame-range",
      text: "With range, both payments on January second count at once, and both read four twenty-five.",
      pauseAfter: 0.6,
    },
    {
      id: "frame-default",
      text: "Leave the frame out, and you get range. On a date with several events, that's the total including the rest of the day, not the total so far.",
      pauseAfter: 1.2,
    },
    {
      id: "frame-pick",
      text: "So write rows, with an order by that breaks ties, for a running total. Save range for a span of values, like the last seven days.",
      pauseAfter: 0.8,
    },

    // ── 8. Period over period ─────────────────────────────────────────────
    {
      id: "lag",
      scene: true,
      text: "Question eight. How do you compute a period-over-period change?",
      pauseAfter: 0.5,
    },
    {
      id: "lag-how",
      text: "Lag pulls the previous row's value onto the current one, so the change is revenue minus lag, with no self join. The first month has nothing before it, so its change is null.",
      pauseAfter: 0.7,
    },
    {
      id: "lag-season",
      text: "Month over month, January 2024 falls two hundred eighty-five from December's peak. Lag twelve compares it with January a year earlier instead: down forty-five.",
      pauseAfter: 0.7,
    },
    {
      id: "lag-gap",
      text: "But lag counts rows, not months. Take out March 2023, and eight comparisons land on the wrong month: March 2024 against February 2023. Put the months on a spine first.",
      pauseAfter: 0.8,
    },

    // ── 9, 10. A date spine, and generating dates ─────────────────────────
    {
      id: "spine",
      scene: true,
      text: "Question nine. What is a date spine, and why generate one?",
      pauseAfter: 0.5,
    },
    {
      id: "spine-gap",
      text: "It's one row per calendar day, whatever the data holds. The page's logins run from May first to fifteenth, and five of those days have none. Grouped by day, they give ten rows: the empty days aren't zero, they're missing, and a chart draws straight across them.",
      pauseAfter: 0.7,
    },
    {
      id: "spine-join",
      text: "Left join the logins onto the spine, and all fifteen days are there, with zero on the empty five.",
      pauseAfter: 0.6,
    },
    {
      id: "spine-count",
      text: "Then count the right thing. Count star counts the spine's own row, so every empty day says one. Count the logins' user ID, and it's zero.",
      pauseAfter: 0.8,
    },
    {
      id: "series",
      text: "Question ten. How do you generate a series of dates in Postgres?",
      pauseAfter: 0.5,
    },
    {
      id: "series-how",
      text: "Generate series, from a start, to an end, by an interval of one day. From date bounds it returns timestamps with a time zone, so cast each one back to a date.",
      pauseAfter: 0.6,
    },
    {
      id: "series-bounds",
      text: "The page takes the bounds from the data's first and last login. For a report, take them from the report's range, or empty days at either end still vanish.",
      pauseAfter: 0.8,
    },

    // ── 11. COUNT(DISTINCT) ───────────────────────────────────────────────
    {
      id: "distinct",
      scene: true,
      text: "Question eleven. When is count distinct a problem, and what do you do about it?",
      pauseAfter: 0.5,
    },
    {
      id: "distinct-add",
      text: "When you add it up. On the same logins, each day's active users sum to twenty-three. Only twelve people logged in.",
      pauseAfter: 0.7,
    },
    {
      id: "distinct-why",
      text: "Six of them came back on other days, and the sum counts them again each time.",
      pauseAfter: 0.6,
    },
    {
      id: "distinct-fix",
      text: "So a monthly count is recounted from the login rows, never summed from a daily table.",
      pauseAfter: 0.7,
    },
    {
      id: "distinct-approx",
      text: "It's also expensive at scale, because the engine tracks every value it has seen. Warehouses offer an approximate count distinct, built on HyperLogLog. DuckDB's, on a million distinct IDs, came back about four percent low: cheaper, and not exact.",
      pauseAfter: 0.8,
    },

    // ── 12. Ratios from summed components ─────────────────────────────────
    {
      id: "ratio",
      scene: true,
      text: "Question twelve. Why compute ratios from summed components instead of averaging per-row ratios?",
      pauseAfter: 0.5,
    },
    {
      id: "ratio-avg",
      text: "Because an average of ratios weighs every row the same. One day has a single order for two hundred dollars. The next has ten thousand orders worth five hundred thousand. Average the two days' order values, and you get a hundred twenty-five dollars.",
      pauseAfter: 0.7,
    },
    {
      id: "ratio-sum",
      text: "Sum the revenue, sum the orders, then divide: just over fifty dollars, which is what the average order really was.",
      pauseAfter: 0.7,
    },
    {
      id: "ratio-store",
      text: "So a model keeps the numerator and the denominator, and divides at whatever grain the report asks for.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Seven quick ones to finish.",
      pauseAfter: 0.5,
    },
    {
      id: "r-zero",
      text: "Question thirteen. How do you avoid a divide-by-zero error? Wrap the denominator in null if, so a zero becomes null: a day with no orders gives null instead of stopping the query, and coalesce can turn that into zero.",
      pauseAfter: 0.7,
    },
    {
      id: "r-rank",
      text: "Question fourteen. Explain row number versus rank versus dense rank. On four books with a tie, row number goes one, two, three, four; rank shares two, then skips to four; dense rank shares two, then three. Row number picks one per key; the others make leaderboards.",
      pauseAfter: 0.7,
    },
    {
      id: "r-topn",
      text: "Question fifteen. How do you find the top-N rows per group? Rank inside each group in a subquery, and keep N or fewer. Row number keeps exactly two per category; rank keeps the tied pair of books, five rows instead of four.",
      pauseAfter: 0.7,
    },
    {
      id: "r-cte",
      text: "Question sixteen. What is a CTE, and when do you prefer it over a subquery? A common table expression is a named result, declared up front and used like a table. Prefer it when steps are reused or nested, so they read top to bottom; it helps the reader, but doesn't promise the step runs once, or faster.",
      pauseAfter: 0.7,
    },
    {
      id: "r-recursive",
      text: "Question seventeen. What is a recursive CTE, and when do you need one? It refers to itself. An anchor query seeds it, and a recursive one adds rows from the last pass until a pass adds none.",
      pauseAfter: 0.6,
    },
    {
      id: "r-depth",
      text: "Here it counts to five. You need one when the depth isn't known in advance: on an org chart, it walks twenty-four people down five levels.",
      pauseAfter: 1.4,
    },
    {
      id: "r-pivot",
      text: "Question eighteen. How do you pivot rows into columns? Sum a case expression for each new column, grouped by the row. Snowflake and BigQuery have a pivot clause and Postgres doesn't; the case form runs everywhere, and spells out each output column.",
      pauseAfter: 0.7,
    },
    {
      id: "r-unpivot",
      text: "Question nineteen. How do you unpivot columns into rows? Union all one select per column, or in Postgres, one lateral values list: four regions with two quarter columns become eight rows. Sources often arrive wide, and models want them long.",
      pauseAfter: 1.0,
    },
    { id: "small", text: "These tables held a few dozen rows at most." },
    {
      id: "next",
      text: "In a warehouse, the same SQL scans real tables, and someone pays for the scan. Next: warehouses and what they cost.",
    },
  ],
};
