import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "SQL I: window functions and query patterns" (16:9), Part 1
 * of the Data Engineer interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * content/interview/data-engineer/sql.mdx. It answers 22 of the page's 32
 * questions; the other ten (slow queries, indexes, covering indexes,
 * partition pruning, large joins, isolation levels, EXPLAIN, correlated
 * subqueries, clustered indexes, materialized views) are Part 2's. Eleven are
 * worked through on real queries and numbered aloud, the other eleven come at
 * speed (numbered 12 to 22 on screen only). In the page's words:
 *
 *   1. What's the difference between RANK, DENSE_RANK, and ROW_NUMBER?
 *   2. How do you keep only the latest row per key (deduplication)?
 *   3. What is QUALIFY, and which engines support it? ("rank" scene)
 *   4. What is the logical order of SQL clause execution?
 *   5. What is the difference between WHERE and HAVING? ("order")
 *   6. What is a window frame, and what is the difference between ROWS and
 *      RANGE? ("frame")
 *   7. How do you compute a 7-day moving average?
 *   8. How do you detect and fill gaps in a time series? ("moving")
 *   9. What is the gaps-and-islands problem? ("islands")
 *   10. How do you write a query that returns only rows that exist in one
 *       table but not another? ("anti")
 *   11. How do you write a recursive CTE? ("recursive")
 *   At speed ("rapid-in"): 12 finding duplicate rows; 13 a CTE against a
 *   subquery; 14 UNION and UNION ALL; 15 LAG and LEAD; 16 a running total;
 *   17 pivoting; 18 INNER, LEFT, RIGHT and FULL OUTER joins; 19 NTILE;
 *   20 PERCENT_RANK and CUME_DIST; 21 COALESCE; 22 CROSS JOIN.
 *
 * The plan proposed the ranking trio for the quick round "if not taken by
 * deep dive 1"; it is taken, as question 1, because question 2's answer turns
 * on it (ROW_NUMBER, not RANK, for a tie), so 11 deep and 11 quick.
 *
 * Reused (the user asked for it; never edited in place):
 *   - Question 4 and 5's scene is da-sql's OrderScene, copied and re-cued, on
 *     da-sql's results (the DA page's 24 orders: 11 over 100, 4 regions, 2
 *     kept by HAVING > 400; DuckDB's "WHERE clause cannot contain
 *     aggregates!"), with the SUM-in-WHERE error from da-sql's WhereScene.
 *   - Question 6's scene is da-advanced-sql's FrameScene, its first part,
 *     on its four payments (ROWS 100, 350, 425; RANGE 425 for both).
 *   - Question 10's scene is da-sql's AntiScene, on its customers and orders
 *     (NOT IN returns nothing; NOT EXISTS and the left join find Di), with
 *     EXCEPT added, run here on the same tables.
 *   - Question 1 to 3's scene is laid out after da-advanced-sql's RankScene.
 *   - At speed: duplicates, UNION, the four joins and CROSS JOIN are
 *     da-sql's figures and results; NTILE is da-advanced-sql's; the running
 *     total's tie and the pivot are ds-sql's.
 *   - The table, listing and error kit through ds-sql/parts.tsx's pattern
 *     (da-sql/parts.tsx and da-advanced-sql/parts.tsx), and da-sql's
 *     stopwatch spot in the quick round.
 *
 * The opening is written fresh: one strip of thirteen days (user 1's logins
 * in the page's daily_logins), which the moving average, the spine and the
 * islands come back to. It promises eleven on real queries and eleven at
 * speed, which is what the video does.
 *
 * Facts. Every statement on screen ran in DuckDB v1.4.3 (DuckDB-Wasm 1.32.0,
 * the engine the page's blocks run): check.mjs here into results.json, or
 * the reused videos' own check.mjs into theirs; data.ts reads both.
 *   - The page's players: the four 80s are rows 13 to 16; RANK 13, 13, 13,
 *     13, then 17; DENSE_RANK 10, then 11.
 *   - The page's events: 24 events from 10 users, ten rows kept by the
 *     subquery and by the page's QUALIFY alike. The video's own tie, a
 *     second event for user 3 at 2024-01-12 10:30: RANK keeps both (11 rows),
 *     ROW_NUMBER one (10).
 *   - QUALIFY's engines are the page's own list.
 *   - The video's own daily metric on user 1's nine login days (January 1
 *     to 13, the 4th and the 7th to the 9th missing): on the 13th, ROWS 6
 *     PRECEDING reaches back to the 3rd (eleven days) and averages 152.1;
 *     RANGE of six days holds four rows and averages 166.3 ("one sixty-six");
 *     over the spine, with the four gaps as zeros, ROWS 6 PRECEDING covers the
 *     7th to the 13th and averages 95.0.
 *   - The page's spine query fails in DuckDB as the page writes it
 *     (generate_series in SELECT returns one list, and the ::date cast
 *     refuses it); the spine on screen is generate_series as a table.
 *   - The page's logins: user 1's islands run 3, 2 and 4 days. The video's
 *     own second login on January 2 merges the first two into a false
 *     January 1 to 6 island of 4 rows; SELECT DISTINCT first restores them.
 *   - EXCEPT on da-sql's anti-join tables returns customer 4 (Di), where NOT
 *     IN returned nothing.
 *   - The video's own seven employees: the page's recursive CTE finds 1, 2
 *     and 4 people at depths 1 to 3, and a capped walk of a three-node loop
 *     stops at depth 10.
 *   - At speed: the page's orders, totals over the video's own threshold of
 *     700 (none passes the page's 1000): users 1, 2 and 6 either way; the
 *     page's LAG query on the DA advanced page's first four amounts; the page's
 *     own 10, 20, 20, 30 (PERCENT_RANK 0.33 and CUME_DIST 0.75 for the 20s);
 *     the page's COALESCE on the video's own three users; DuckDB's PIVOT on
 *     ds-sql's traffic.
 *
 * Written for Drew's ear: SQL is said "sequel" (the series rule), keywords
 * that read as words stay in capitals (WHERE, HAVING, NOT IN), the rest as
 * they are said ("row number", "N tile", "cume dist", "null if"), CTE
 * expanded once, numbers as they are said, no sentence opening "A" before
 * an initialism.
 */
export const script: NarrationScript = {
  id: "de-sql-patterns",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Here are one user's logins over the first thirteen days of January. Four days have no login, and the other nine fall into three streaks.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-ask",
      text: "Which days are missing? How long is each streak? Which login is the latest? Questions like these fill the sequel round of a data engineering interview.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "This video answers twenty-two of them. Eleven get worked through on real queries in DuckDB. The other eleven come quickly, at the end.",
      pauseAfter: 0.7,
    },
    { id: "rank-in", text: "Most of them start by numbering rows." },

    // ── 1, 2, 3. Ranking, the latest row, QUALIFY ─────────────────────────
    {
      id: "rank",
      scene: true,
      text: "Question one. What's the difference between rank, dense rank, and row number?",
      pauseAfter: 0.6,
    },
    {
      id: "rank-ties",
      text: "Here are the page's twenty-four players, ordered by score. Four of them tie at eighty.",
      pauseAfter: 0.6,
    },
    {
      id: "rank-three",
      text: "Row number gives each row its own number, so the tie is broken arbitrarily. Rank lets them share thirteen, then skips to seventeen. Dense rank shares ten, then goes on to eleven, with no gap.",
      pauseAfter: 0.8,
    },
    {
      id: "latest",
      text: "Question two. How do you keep only the latest row per key? Number each user's events from the newest, and keep number one.",
      pauseAfter: 0.6,
    },
    { id: "latest-count", text: "Twenty-four events go in, and ten rows come out: one per user.", pauseAfter: 0.7 },
    {
      id: "latest-tie",
      text: "Use row number, not rank. Give user three two events at the same moment, and rank numbers both of them one, so user three comes back twice. Row number keeps exactly one, though which one is arbitrary without a tiebreaker.",
      pauseAfter: 0.8,
    },
    {
      id: "qualify",
      text: "Question three. What is qualify, and which engines support it? It filters on a window function after it's computed, the way having filters an aggregate. The subquery goes, and the same ten rows come back.",
      pauseAfter: 0.6,
    },
    {
      id: "qualify-where",
      text: "DuckDB, BigQuery, Snowflake and Databricks support it. Postgres and my sequel don't, so there you keep the subquery.",
      pauseAfter: 0.7,
    },
    { id: "order-in", text: "So why can't that filter just go in WHERE? Because of the order a query runs in." },

    // ── 4, 5. The order a query runs in, WHERE and HAVING ─────────────────
    {
      id: "order",
      scene: true,
      text: "Question four. What is the logical order of sequel clause execution?",
      pauseAfter: 0.6,
    },
    {
      id: "order-list",
      text: "Not the order you write it. From and joins first, then WHERE, GROUP BY and HAVING. Then SELECT, which is where window functions are computed, with qualify right after. Then DISTINCT, ORDER BY and LIMIT.",
      pauseAfter: 0.7,
    },
    {
      id: "order-why",
      text: "So WHERE can't see a row number, or any name made up in SELECT: neither exists yet. ORDER BY runs later, so it can.",
      pauseAfter: 0.8,
    },
    {
      id: "where",
      text: "Question five. What is the difference between WHERE and HAVING? Watch twenty-four orders go through. WHERE keeps the eleven over a hundred dollars, row by row. GROUP BY makes four regions. HAVING keeps the two over four hundred.",
      pauseAfter: 0.7,
    },
    {
      id: "where-try",
      text: "Put a sum in WHERE instead, and DuckDB refuses: the aggregate doesn't exist yet.",
      pauseAfter: 0.7,
    },
    {
      id: "where-early",
      text: "So filter rows in WHERE whenever you can, and there are fewer rows to group. Keep HAVING for conditions on an aggregate.",
      pauseAfter: 0.6,
    },
    { id: "frame-in", text: "Window functions have one more setting that trips people up: the frame." },

    // ── 6. Window frames ──────────────────────────────────────────────────
    {
      id: "frame",
      scene: true,
      text: "Question six. What is a window frame, and what is the difference between rows and range?",
      pauseAfter: 0.6,
    },
    {
      id: "frame-def",
      text: "The frame is the set of rows the function sees for the current one.",
      // A definition, read quickly in the take: time to take it in.
      pauseAfter: 0.8,
    },
    { id: "frame-peers", text: "Here, two payments land on the same day.", pauseAfter: 0.6 },
    {
      id: "frame-rows",
      text: "Rows counts physical rows, so the running total climbs one payment at a time: a hundred, three fifty, four twenty-five.",
      pauseAfter: 0.6,
    },
    {
      id: "frame-range",
      text: "Range goes by the order by value, so both payments on the second come in together, and both get four twenty-five.",
      pauseAfter: 0.7,
    },
    {
      id: "frame-pick",
      text: "Rows is the predictable one. Reach for range when tied values belong together, or when the frame is a span of time.",
      pauseAfter: 0.6,
    },
    { id: "moving-in", text: "That last case is the next question." },

    // ── 7, 8. A seven-day moving average, and a date spine ────────────────
    {
      id: "moving",
      scene: true,
      text: "Question seven. How do you compute a seven-day moving average? The usual answer averages over rows between six preceding and the current row.",
      pauseAfter: 0.6,
    },
    {
      id: "moving-rows",
      text: "That's seven rows. Here's a metric on the thirteen days from the start, with the same four days missing. On the thirteenth, seven rows reach back to the third: eleven days.",
      pauseAfter: 0.7,
    },
    {
      id: "moving-range",
      text: "Range with an interval of six days counts the calendar instead. Its frame holds the four days that exist since the seventh, and averages one sixty-six, not one fifty-two.",
      pauseAfter: 0.7,
    },
    {
      id: "moving-zero",
      text: "But range skips the missing days. If a missing day means zero, put the days back first.",
      pauseAfter: 0.6,
    },
    {
      id: "spine",
      text: "Question eight. How do you detect and fill gaps in a time series? Generate every date in the range, a date spine, and left join the data onto it.",
      pauseAfter: 0.6,
    },
    {
      id: "spine-fill",
      text: "Days with no match come back null: those are the gaps. Coalesce turns them into zeros.",
      pauseAfter: 0.7,
    },
    {
      id: "spine-avg",
      text: "Now seven rows are seven days again, and the thirteenth averages ninety-five, with three zero days counted in. No generate series? Join a calendar table instead.",
      pauseAfter: 0.7,
    },
    { id: "islands-in", text: "Those thirteen days hold one more classic." },

    // ── 9. Gaps and islands ───────────────────────────────────────────────
    {
      id: "islands",
      scene: true,
      text: "Question nine. What is the gaps-and-islands problem? It's finding runs of consecutive rows, the islands, between the breaks, the gaps.",
      pauseAfter: 0.6,
    },
    {
      id: "islands-key",
      text: "Number each user's logins by date, then subtract that number, in days, from the date. Inside a run, the date and the number both go up by one, so the difference holds still.",
      pauseAfter: 0.7,
    },
    {
      id: "islands-group",
      text: "That difference is the island's key. Group by it, and each streak comes out with its start, its end, and its length: three days, two, then four.",
      pauseAfter: 0.7,
    },
    {
      id: "islands-dupe",
      text: "One catch: a second login on the same day bumps the number, but not the date. Add one on the second, and two streaks merge into one that isn't real. Deduplicate the days first.",
      pauseAfter: 0.7,
    },
    { id: "anti-in", text: "Islands find rows that are there. The next question hunts for rows that aren't." },

    // ── 10. Rows in one table but not another ─────────────────────────────
    {
      id: "anti",
      scene: true,
      text: "Question ten. How do you write a query that returns only rows that exist in one table but not another? Say, customers with no orders. Most people write NOT IN, and here it returns nothing.",
      pauseAfter: 0.7,
    },
    {
      id: "anti-why",
      text: "One guest order has no customer ID. NOT IN means not equal to every one of them, and not equal to null is unknown, so no customer passes.",
      pauseAfter: 0.8,
    },
    {
      id: "anti-fix",
      text: "Use NOT EXISTS, or a left join where the order comes back null. Both find Di.",
      // Time to see both fixes return Di before EXCEPT takes their place.
      pauseAfter: 1.2,
    },
    {
      id: "anti-except",
      text: "EXCEPT works too. It compares the two sides as sets, so the null can't block it, and it returns Di's ID, four. Join back for her name.",
      pauseAfter: 0.7,
    },
    { id: "recursive-in", text: "The last deep one walks a table that points at itself." },

    // ── 11. A recursive CTE ───────────────────────────────────────────────
    {
      id: "recursive",
      scene: true,
      text: "Question eleven. How do you write a recursive CTE? First, a CTE is a common table expression: a named query, written with WITH.",
      pauseAfter: 0.6,
    },
    {
      id: "recursive-anchor",
      text: "The recursive kind has two halves, joined with union all. The anchor is the base case: the employee with no manager.",
      pauseAfter: 0.6,
    },
    {
      id: "recursive-step",
      text: "The recursive half joins employees to the rows found so far, so each pass adds the next level down: Ana's two reports, then their four.",
      pauseAfter: 0.6,
    },
    {
      id: "recursive-stop",
      text: "A pass that adds nothing ends it: seven people, three levels. If the data has a loop, it never runs dry, so cap the depth.",
      // The cap and its run arrive on the last words: time to read them.
      pauseAfter: 2.2,
    },

    // ── At speed ──────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Eleven down. The other eleven are one-liners, so here they come.",
      pauseAfter: 0.6,
    },
    {
      id: "r-dupes",
      text: "To find duplicate rows, group by the columns that should be unique, and keep the counts over one. To see every copy, number them, and keep the numbers over one.",
    },
    {
      id: "r-cte",
      text: "A subquery nests a step inside the query. Written as a CTE, the step gets a name up front, reads top to bottom, and can be used twice. Here, both find the same three users.",
    },
    {
      id: "r-union",
      text: "UNION stacks two results and removes duplicates, which costs a sort or a hash. UNION ALL keeps every row, so prefer it unless you need the dedup.",
    },
    {
      id: "r-lag",
      text: "Lag reads a value from an earlier row, and lead from a later one. Revenue minus lag is the change since yesterday, with no self join. At the edges there's no row to read: null, unless you pass a default, like this zero.",
      pauseAfter: 0.7,
    },
    {
      id: "r-running",
      text: "A running total is a sum ordered by date, framed from the first row to this one, per user. Leave the frame out, and the default is range, so rows tied on a date share one total.",
      pauseAfter: 0.9,
    },
    {
      id: "r-pivot",
      text: "To pivot, sum a case expression for each new column, grouped by the row. DuckDB also has a pivot clause. If the values aren't known in advance, it takes dynamic sequel.",
    },
    {
      id: "r-joins",
      text: "An inner join keeps only matches: six rows. Left keeps every customer, so Di comes back with nulls. Right keeps every order, the stray one too. Full keeps both: eight.",
      pauseAfter: 0.7,
    },
    {
      id: "r-ntile",
      text: "N tile deals ordered rows into N buckets: twenty-four customers make four quartiles of six. When it can't split evenly, the first buckets get the extra rows.",
    },
    {
      id: "r-percent",
      text: "Percent rank is rank minus one, over rows minus one. Cume dist is the share of rows at or tied with this one. For ten, twenty, twenty, thirty, the twenties get a third, and three quarters.",
      pauseAfter: 0.8,
    },
    {
      id: "r-coalesce",
      text: "Coalesce returns its first argument that isn't null: the phone, else the email, else no contact. Null if goes the other way, turning a zero divisor into a null.",
    },
    {
      id: "r-cross",
      text: "And a cross join pairs every row with every row: three products by four regions make twelve. Use it on purpose, for a planning grid or a date-by-segment spine.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Every table here held a few dozen rows. The same queries get harder when the table is too big to scan. Next: sequel performance.",
    },
  ],
};
