import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "SQL" (16:9), Part 1 of the Data Analyst interview prep
 * videos (agent-outputs/20261021-2314-data-analyst-interview-video-plan.md),
 * after content/interview/data-analyst/sql.mdx. It answers all 24 of the
 * page's questions that are this video's to answer: ten questions that hide a
 * trap, taken slowly and numbered aloud, then a rapid-fire round of fourteen
 * (numbered 11 to 24 on screen only). The
 * page's window-function, running-total, pivot and top-N questions are
 * answered in Part 4, Advanced SQL, and its two CTE questions here, once.
 *
 *   1. WHERE against HAVING ("where"); 2. the order a query runs in
 *      ("order").
 *   3. The four joins ("joins"), and the left join that turns inner
 *      ("trap").
 *   4. Why a join makes a sum too large ("fanout").
 *   5. NULLs in comparisons and aggregates; 6. COUNT(*), COUNT(1) and
 *      COUNT(col) ("nulls").
 *   7. Customers who never ordered: the anti-join, and NOT IN ("anti").
 *   8. DISTINCT, and the bug it hides ("distinct").
 *   9. CTEs against subqueries; 10. correlated against uncorrelated ("cte").
 *   Rapid fire ("rapid"): self join; UNION and UNION ALL; EXCEPT; CASE;
 *   NULL in a CASE; COALESCE and NULLIF; dates; strings; clustered and
 *   non-clustered indexes; indexes and writes; ROLLUP and GROUP BY ALL;
 *   finding duplicates; deleting them but keeping one; CROSS JOIN.
 *
 * No series intro yet (decided 2026-10-21): the first scene opens at frame
 * 0. Adding <SeriesIntro> later means `leadIn: INTRO_LEAD_IN` here and the
 * intro as the opening scene in Video.tsx; nothing needs re-voicing.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every statement on screen ran in DuckDB v1.4.3 (DuckDB-Wasm 1.32.0,
 * the engine and version the page's blocks run), from a fresh database per
 * figure, by check.mjs into results.json, which data.ts reads; every error is
 * DuckDB's own text:
 *   - "where", on the page's 24 orders: region revenue East 840.75, North
 *     798.75, South 541.50, West 418.00; SUM in WHERE fails with "Binder
 *     Error: WHERE clause cannot contain aggregates!"; HAVING SUM(amount) >
 *     600 keeps East and North ("two regions come back"). The pipeline: 24
 *     rows, 11 with amount >= 100 ("the eleven over a hundred dollars"),
 *     four regions, and HAVING > 400 keeps East 700.50 and North 475.75
 *     ("the two over four hundred"). The thresholds are the video's own.
 *     DuckDB lets WHERE use a plain SELECT alias (plainAlias), which
 *     standard SQL and Postgres refuse, hence "in most databases".
 *   - "joins", the page's second challenge's first four customers and all
 *     six of their orders (Di never ordered), plus order 125 for a customer
 *     25 who isn't in the table, the video's own row: INNER 6 rows, LEFT 7
 *     (Di with nulls), RIGHT 7 (order 125 with no name), FULL 8.
 *   - "trap", the same customers and orders: LEFT JOIN with WHERE o.amount
 *     > 50 returns Ava, Ben and Cy; with the filter in ON, Di comes back
 *     with a null amount.
 *   - "fanout", the first two orders of the Analytics Engineer track's
 *     fan-trap block (100.00 with items A, B, C; 50.00 with D): 150.00 on
 *     their own, 350.00 summed after the join, 150.00 and 4 items with the
 *     item counts aggregated in a CTE first.
 *   - "nulls", six discounts of the video's own (10, null, 5, null, 0,
 *     15): discount = NULL matches 0 rows, IS NULL 2; COUNT(*) 6,
 *     COUNT(discount) 4; AVG 7.5 over the four, 5 with COALESCE(discount, 0).
 *   - "anti", the "joins" customers and orders plus order 107, a guest
 *     checkout with no customer id (the video's own): NOT IN returns zero
 *     rows and no error; NOT EXISTS and the left join where the order is
 *     null both return Di.
 *   - "distinct", the fan-out's orders plus a third that also costs 50.00
 *     (the video's own), each with its items: the join gives 5 rows,
 *     DISTINCT order_id, amount gives 3, SUM(DISTINCT amount) gives 150.00,
 *     and the real total is 200.00.
 *   - "cte", the page's orders for its first three customers: averages Ava
 *     80, Ben 55, Cy 50; orders 101, 103 and 104 beat their own customer's
 *     average (correlated, and the CTE gives the same three); against the
 *     overall average, 61.67, only 101 and 103 do (uncorrelated).
 *   - "rapid": the self join pairs Gina and Bob with Mona and Sara with
 *     Gina (the page's employees' names, the video's own hierarchy); UNION
 *     3 cities, UNION ALL 4; EXCEPT leaves product 3; CASE sizes 620.00
 *     Large, 120.00 Medium, 50.25 Small (the page's thresholds); WHEN score
 *     = NULL sends Ben's null to "Below A", IS NULL to "Unknown"; COALESCE
 *     gives 0 for a null discount and NULLIF a null rate for zero
 *     sessions; ROLLUP over the page's challenge table gives 17 rows (12
 *     region and category pairs, 4 subtotals, 1 total); the duplicate
 *     search finds two emails twice, and the ROW_NUMBER delete removes 2
 *     rows; 3 products by 4 regions give 12 rows, and 1,000 by 1,000 give
 *     1,000,000.
 *
 * Written for Drew's ear: casual and curious, short spoken sentences, no
 * symbols or parentheses, numbers as words, contractions, questions the next
 * sentence answers, no audio tags. SQL keywords that read as words stay in
 * capitals (WHERE, HAVING, NOT IN); the rest are written as they are said
 * ("coalesce", "null if", "roll up", "count star").
 */
export const script: NarrationScript = {
  id: "da-sql",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Almost every data analyst interview opens with a SQL screen. And the questions repeat. There are twenty-four you should be ready for.",
      pauseAfter: 0.6,
    },
    { id: "plan", text: "Ten of them need a picture, so we'll take those slowly." },
    {
      id: "plan-rapid",
      text: "The other fourteen get one answer each, in a rapid-fire round.",
      pauseAfter: 0.7,
    },
    { id: "where-in", text: "Let's start where most screens start: two ways to filter." },

    // ── 1. WHERE and HAVING ───────────────────────────────────────────────
    {
      id: "where",
      scene: true,
      text: "Question one. What's the difference between WHERE and HAVING?",
      pauseAfter: 0.6,
    },
    {
      id: "where-rows",
      text: "WHERE filters rows, before anything is grouped. HAVING filters groups, after.",
      pauseAfter: 0.8,
    },
    {
      id: "where-try",
      text: "So ask for the regions with revenue over six hundred, and put the sum in WHERE. DuckDB refuses. WHERE clause cannot contain aggregates.",
      pauseAfter: 0.6,
    },
    { id: "where-why", text: "The sum doesn't exist yet when WHERE runs.", pauseAfter: 0.8 },
    { id: "where-fix", text: "Move it to HAVING, and two regions come back: East and North.", pauseAfter: 0.6 },
    { id: "where-keep", text: "Keep row filters in WHERE, though: they shrink the table before grouping." },

    { id: "order", scene: true, text: "Question two follows from it." },
    { id: "order-q", text: "In what order does a query run, logically?", pauseAfter: 0.6 },
    {
      id: "order-list",
      text: "Not the order you write it. From and joins first, then WHERE, GROUP BY and HAVING. Only then SELECT, DISTINCT, ORDER BY and LIMIT.",
      pauseAfter: 0.6,
    },
    {
      id: "order-logical",
      text: "That's the logical order. The engine can do the work differently, but the answer has to match.",
      pauseAfter: 0.8,
    },
    {
      id: "order-demo",
      text: "Watch twenty-four orders go through. WHERE keeps the eleven over a hundred dollars. GROUP BY makes four regions. HAVING keeps the two over four hundred.",
      pauseAfter: 0.8,
    },
    {
      id: "order-alias",
      text: "That's also why, in most databases, WHERE can't use a name you made up in SELECT, but ORDER BY can.",
      pauseAfter: 0.6,
    },
    { id: "joins-in", text: "Next, the question every screen asks." },

    // ── 2. Joins ──────────────────────────────────────────────────────────
    {
      id: "joins",
      scene: true,
      text: "Question three. Inner, left, right and full join. What's the difference?",
      pauseAfter: 0.6,
    },
    {
      id: "joins-match",
      text: "Here are four customers and seven orders, and each line is a match. Di never ordered. And order one twenty-five points at a customer who isn't here.",
      pauseAfter: 0.7,
    },
    { id: "joins-inner", text: "An inner join keeps only the matches. Six rows.", pauseAfter: 0.7 },
    { id: "joins-left", text: "A left join keeps every customer, so Di comes back, with nulls where her order would be.", pauseAfter: 0.7 },
    {
      id: "joins-right",
      text: "A right join keeps every order, the stray one too. And a full join keeps both. Eight rows.",
      pauseAfter: 0.8,
    },
    {
      id: "joins-tell",
      text: "The classic tell: list every customer, including the ones who never ordered. That's a left join.",
      pauseAfter: 0.6,
    },

    {
      id: "trap",
      scene: true,
      text: "But a left join can quietly turn into an inner one.",
      pauseAfter: 0.6,
    },
    { id: "trap-where", text: "Ask for every customer and their orders over fifty dollars, and put that filter in WHERE." },
    { id: "trap-gone", text: "Di disappears.", pauseAfter: 0.7 },
    {
      id: "trap-why",
      text: "Her amount is null, and null over fifty isn't true, so WHERE drops her.",
      pauseAfter: 0.8,
    },
    { id: "trap-on", text: "Put the filter in the join's on clause instead, and Di stays, with a null.", pauseAfter: 0.7 },
    {
      id: "trap-when",
      text: "If you only want the big orders, WHERE is fine. To keep every customer, filter in ON.",
      pauseAfter: 0.6,
    },
    { id: "fanout-in", text: "Joins have one more trap, and this one inflates your totals." },

    // ── 3. Fan-out ────────────────────────────────────────────────────────
    {
      id: "fanout",
      scene: true,
      text: "Question four. Why can a join make a sum too large?",
      pauseAfter: 0.6,
    },
    {
      id: "fanout-tables",
      text: "Two orders, worth a hundred and fifty dollars. Order one has three items. Order two has one.",
      pauseAfter: 0.6,
    },
    {
      id: "fanout-join",
      text: "Join the items, and order one shows up three times. Sum the amount now, and you get three hundred fifty.",
      pauseAfter: 0.9,
    },
    {
      id: "fanout-fix",
      text: "The fix is the grain: what one row stands for. We want revenue and an item count, so count the items per order first, in a CTE, a common table expression, then join. One row per order, and the total's back to one fifty.",
      pauseAfter: 0.7,
    },

    // ── 4. NULLs ──────────────────────────────────────────────────────────
    {
      id: "nulls",
      scene: true,
      text: "Question five. How do nulls behave? A null means unknown.",
      pauseAfter: 0.6,
    },
    {
      id: "nulls-equals",
      text: "So discount equals null is never true, not even for a null. Zero rows. Write IS NULL, and you find both.",
      pauseAfter: 0.8,
    },
    { id: "nulls-avg", text: "Aggregates skip nulls. The average is seven and a half, over the other four." },
    {
      id: "nulls-coalesce",
      text: "If a missing discount really means zero, say so with coalesce, and it drops to five.",
      pauseAfter: 0.8,
    },
    {
      id: "nulls-count",
      text: "Question six. Count star, count of one, or count of a column? Count star and count of one both count all six rows. Count of discount counts only the four that have one.",
      pauseAfter: 0.8,
    },
    {
      id: "nulls-faster",
      text: "Count of one isn't any faster: engines treat the two the same. And count distinct counts the different values, nulls left out.",
      pauseAfter: 0.6,
    },
    { id: "anti-in", text: "Nulls also break the most popular answer to the next question." },

    // ── 5. The anti-join ──────────────────────────────────────────────────
    {
      id: "anti",
      scene: true,
      text: "Question seven. Which customers have never ordered?",
      pauseAfter: 0.6,
    },
    {
      id: "anti-notin",
      text: "Most people write NOT IN. Here it returns nothing. No error. Just nothing.",
      pauseAfter: 0.8,
    },
    {
      id: "anti-why",
      text: "One guest order has no customer ID. NOT IN means not equal to every one of them, and not equal to null is unknown, so no customer ever passes.",
      pauseAfter: 0.8,
    },
    {
      id: "anti-fix",
      text: "Use NOT EXISTS, or a left join where the order comes back null. Both find Di.",
      pauseAfter: 0.7,
    },
    {
      id: "anti-safe",
      text: "That WHERE is safe: IS NULL is the one test that keeps the unmatched rows. Or keep NOT IN, and filter the nulls out of its subquery.",
      pauseAfter: 0.6,
    },
    { id: "distinct-in", text: "Now, a fix people reach for that hides a bug." },

    // ── 6. DISTINCT ───────────────────────────────────────────────────────
    {
      id: "distinct",
      scene: true,
      text: "Question eight. When should you be careful with DISTINCT?",
      pauseAfter: 0.6,
    },
    {
      id: "distinct-rows",
      text: "Three orders, joined to their items, give five rows. Too many. So someone adds DISTINCT, and the three orders look right again.",
      pauseAfter: 0.7,
    },
    { id: "distinct-sum", text: "Now they want the total, so they write sum of distinct amount, and get one fifty." },
    {
      id: "distinct-why",
      text: "Orders two and three both cost fifty, and DISTINCT kept that amount once.",
      pauseAfter: 0.8,
    },
    {
      id: "distinct-truth",
      text: "The real total is two hundred. Before you reach for DISTINCT, find out why the duplicates are there.",
      pauseAfter: 0.7,
    },
    {
      id: "distinct-hid",
      text: "DISTINCT hid the join's duplicates instead of fixing them. Aggregate the items first, as in question four.",
      pauseAfter: 0.6,
    },
    { id: "cte-in", text: "And the tool that fixes most of these is naming a step." },

    // ── 7. CTEs and subqueries ────────────────────────────────────────────
    {
      id: "cte",
      scene: true,
      text: "Question nine. Should you use a CTE or a subquery?",
      pauseAfter: 0.6,
    },
    { id: "cte-what", text: "Think of a CTE as a named step, written once at the top, with WITH.", pauseAfter: 0.6 },
    {
      id: "cte-rule",
      text: "Use a subquery for a one-off filter. Use a CTE when you need a step twice, chain several, or walk a hierarchy, which only a recursive CTE can.",
      pauseAfter: 0.7,
    },
    {
      id: "cte-correlated",
      text: "Question ten. What's a correlated subquery? One that reads the outer row. Take orders above their own customer's average. The subquery runs again for every order.",
      pauseAfter: 0.6,
    },
    { id: "cte-slow", text: "On a big table, that gets slow.", pauseAfter: 0.7 },
    {
      id: "cte-result",
      text: "Ava averages eighty, Ben fifty-five, Cy fifty. Three orders beat their own customer's average.",
      pauseAfter: 0.7,
    },
    {
      id: "cte-plain",
      text: "An uncorrelated subquery runs once. Against everyone's average, about sixty-two, only two orders do.",
      pauseAfter: 0.8,
    },
    { id: "cte-back", text: "Back to question nine." },
    {
      id: "cte-same",
      text: "And a CTE gets the same three by working out each average once, then joining. Easier to read, and easier to check.",
      pauseAfter: 0.7,
    },

    // ── Rapid fire ────────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "That's the ten." },
    { id: "rapid-fourteen", text: "Now, fourteen questions, one answer each.", pauseAfter: 0.6 },
    {
      id: "r-self",
      text: "A self join? A table joined to itself, like each employee and their manager, both from employees.",
    },
    { id: "r-union", text: "UNION drops duplicate rows. UNION ALL keeps every one, and it's faster." },
    { id: "r-union-why", text: "It skips the duplicate check." },
    {
      id: "r-except",
      text: "EXCEPT returns what's in the first query but not the second. Four products expected, three received. Product three is missing.",
    },
    { id: "r-case", text: "CASE returns its first true branch. Six twenty is large, one twenty is medium, fifty is small." },
    {
      id: "r-casenull",
      text: "Null inside a CASE: when score equals null never matches, so Ben falls through. Write when score IS NULL, first.",
    },
    {
      id: "r-coalesce",
      text: "Coalesce returns the first value that isn't null. Null if turns a value into null, like a zero you're about to divide by.",
    },
    { id: "r-divide", text: "In most databases, dividing by zero is an error. Dividing by null just gives null." },
    {
      id: "r-dates",
      text: "Dates: extract a part, truncate to the month, or add an interval. The names change between databases. The ideas don't.",
    },
    {
      id: "r-strings",
      text: "Strings: trim, upper and lower, substring, length, joining two together, and LIKE, where a percent sign matches anything.",
    },
    { id: "r-index", text: "A clustered index sets the order rows are stored in, so a table gets one.", pauseAfter: 0.4 },
    { id: "r-index-many", text: "A non-clustered index is a separate lookup, and you can have many." },
    { id: "r-writes", text: "And every index speeds up reads but slows down writes, because each insert has to update it too." },
    {
      id: "r-rollup",
      text: "Roll up adds subtotals and a grand total: twelve region and category rows, four subtotals and one total make seventeen.",
      pauseAfter: 0.6,
    },
    { id: "r-groupall", text: "Where it's supported, GROUP BY ALL groups by every selected column you didn't aggregate." },
    { id: "r-dupes", text: "To find duplicates, group by the column, and keep the counts over one." },
    {
      id: "r-dedupe",
      text: "To delete them but keep one, number the copies of each email with row number, oldest first, and delete every copy numbered over one.",
      pauseAfter: 0.8,
    },
    {
      id: "r-cross",
      text: "And a cross join pairs every row with every row. Two tables of a thousand make a million.",
      pauseAfter: 0.9,
    },
    { id: "next", text: "Every one of these comes back when the table is a data frame. Next: pandas." },
  ],
};
