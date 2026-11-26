import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Testing and data quality" (16:9), Part 7 of the Analytics
 * Engineer interview prep videos
 * (agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
 * "7, Testing and data quality"), after
 * content/interview/analytics-engineer/testing-and-data-quality.mdx (all 19
 * questions) and dbt.mdx's seven test questions, each answered with the
 * testing page's question it repeats. Ten are worked through, numbered aloud
 * and read in the page's words; nine go quickly at the end, read the same way.
 *
 *   1. "What does it mean that a dbt test "asserts"?" ("asserts"), with
 *      dbt.mdx's "How do dbt tests work?" (the card shows it as a second line).
 *   2. "What does a failing uniqueness test actually surface?" ("surface").
 *   3. "What are dbt's four built-in generic tests?" ("builtins"), with
 *      dbt.mdx's "What are dbt's four built-in generic tests, and what does
 *      each check?".
 *   4. "Generic vs singular tests, what is the difference?" ("singular"; read
 *      "versus"), with dbt.mdx's "What are generic (schema) tests vs.
 *      singular tests?".
 *   5. "How do you test the uniqueness of a compound key?" ("compound").
 *   6. "What is source freshness, and how is it different from a test?"
 *      ("fresh"), with dbt.mdx's "What is source freshness, and how do you
 *      configure it?" and "What does `dbt source freshness` check, and how is
 *      it different from a dbt test?".
 *   7. "How does CI for analytics typically work?" ("ci"), with dbt.mdx's "How
 *      does CI for dbt typically work?".
 *   8. "How do you respond to a failing test in CI vs in production?"
 *      ("prod"; read "versus").
 *   9. "What is the difference between testing and data observability?"
 *      ("observe").
 *   10. "How do you test that a metric is correct, not just non-null?"
 *       ("metric").
 *   Quick ("rapid-in"), each read "Question n." and the page's question:
 *   11 source vs model test; 12 where tests live; 13 a data contract, with
 *   dbt.mdx's "What is a dbt model contract?"; 14 severity, warn vs error;
 *   15 alert fatigue; 16 dbt_utils and dbt_expectations; 17 unit vs data
 *   tests; 18 store_failures; 19 fixing upstream.
 *   Counted: 19 + 7 = 26 headings, all answered; none left out.
 *
 * Opening: the plan's bridge from Part 6 (a cheap model that is wrong costs
 * more), written fresh on the page's own duplicated orders. Close: the
 * plan's bridge into Part 8 (every test passes and two dashboards still
 * disagree).
 *
 * On screen, beat by beat (what phase 2 builds; the interview kit's colors:
 * red the trap, green the right answer, yellow what the narration points at,
 * blue data). Every test is shown as the query it runs, beside the rows it
 * returns; a passing test is an empty result under "0 rows: pass". That
 * badge is green only where passing is the right outcome (asserts-zero);
 * where tests pass on data that is wrong (stale, short, or overcounted:
 * fresh-valid, observe-run, metric), it stays in neutral ink, so green never
 * marks the trap.
 *   hook: the page's 24-row fct_orders as a tall table, the woodpecker
 *     beside it. "cheap to build" and "quick to query" as two small badges;
 *     on "wrong", orders 2, 11 and 19 lit in pairs (red). hook-quiet: "335.00
 *     too high" under the amount column (3,569.50 against 3,234.50); on
 *     "agrees", three small dashboard tiles all reading 3,569.50.
 *   hook-job: the table recedes; four words in a row, "tests", "contracts",
 *     "freshness", "checks on every change", hairlines between.
 *   plan: ten numbered squares and nine smaller ones; under them, in the
 *     soft ink, "19 questions · 7 more on the dbt page, answered with them".
 *   asserts: QuestionCard 1, dbt.mdx's "How do dbt tests work?" as its second
 *     line. An assumption ("order_id is unique") turning into a query box.
 *     asserts-zero: the query's result empty, "0 rows: pass" (green); then
 *     rows in it, "rows: fail" (red), the run's status turning red.
 *     asserts-never: the table beside the query, untouched (its row count,
 *     24, unchanged), and a pipeline arrow stopped short of a dashboard.
 *   surface: QuestionCard 2. The page's query (GROUP BY order_id HAVING
 *     COUNT(*) > 1), "roughly what unique compiles to", HAVING in yellow.
 *     surface-run: its result, three rows: 2, 11 and 19, n = 2 each (red),
 *     each linked back to its pair in the table. surface-fix: the table
 *     still 24 rows; an arrow from the pairs back up toward "the source".
 *   builtins: QuestionCard 3. The page's YAML for fct_orders, each test
 *     name in yellow as it is read. builtins-run: the video's own eight
 *     rows; beside them four small query panes, one per test, each pane's
 *     result holding exactly one row. builtins-each: each failing row lit in
 *     the table as its test is named (order 3's two rows, the null id, the
 *     'returned', customer 99), one at a time. builtins-pair: the null row
 *     ringed under unique's pane, which shows only order 3; then unique and
 *     not_null bracketed together, "= a valid primary key" (green).
 *   singular: QuestionCard 4. The four tests as one template, "column" as a
 *     slot filled by order_id, status, customer_id; "your own: a macro".
 *     singular-sql: the page's tests/assert_no_negative_amounts.sql, its
 *     result one row, order 7, -25.00 (red), lit in the same eight rows.
 *     singular-pick: two columns, "generic: reusable rules", "singular:
 *     bespoke checks", a hairline between; an arrow from singular to generic
 *     over three model names.
 *   compound: QuestionCard 5. The video's own order lines, seven rows,
 *     (order_id, line_number) as the key. compound-wrong: unique on order_id
 *     alone, its result orders 1 and 3 with n = 3 (red: the wrong test);
 *     order 1's three lines then labelled "false alarm: three lines" in
 *     neutral ink, nothing struck.
 *     compound-pair: the page's dbt_utils YAML; the grouped query's result,
 *     one row, (3, 2), n = 2 (red), lit in the table. compound-grain: "one
 *     row per (order_id, line_number)" as the table's caption (green).
 *   fresh: QuestionCard 6; two columns, "a test: what the rows say", "freshness:
 *     when they arrived", a hairline between; the clock spot. fresh-clock: the
 *     page's freshness YAML (warn_after 6 hours, error_after 12), then a time
 *     axis from 01:00 to 14:00, the newest row at 01:00, warn and error zones;
 *     checks at 04:00 (3 h, pass, green), 09:00 (8 h, warn, yellow), 14:00 (13
 *     h, error, red). fresh-valid: the four tests on the same rows, four
 *     empty results, "0 rows: pass" each, in neutral ink. fresh-two: "dbt source freshness" ahead
 *     of a "dbt build" arrow; a dotted line of arrival times creeping later
 *     toward the warn line (drawn, no data).
 *   ci: QuestionCard 7. A pull request box, an arrow to "dbt build --select
 *     state:modified+" (the page's command). ci-state: the page's DAG
 *     (raw.orders, raw.customers, stg_orders, stg_customers, dim_customer,
 *     fct_orders); a "production manifest" beside it; stg_customers marked
 *     changed, then it and its two descendants lit (yellow), "3 of 4 models";
 *     stg_orders grey. ci-defer: the stg_orders edge into fct_orders labelled
 *     "--defer: read from production". ci-slim: a merge button, blocked (red)
 *     by a failing test badge.
 *   prod: QuestionCard 8. Two columns, "CI" and "production". prod-sev: the
 *     same DAG built in order, a test on stg_customers failing (error, red):
 *     everything downstream skipped (grey), the mart labelled "keeps
 *     yesterday's rows"; the pager spot on "pages". A warn badge beside it,
 *     "triage later". prod-cause: three steps, "read the failing rows",
 *     "data or assumption?", "fix the cause"; "loosen the test" struck.
 *   observe: QuestionCard 9. observe-run: two days of loads as two bars, 30
 *     and 20 ("-33.3%", red), and four test badges under each day, all "0
 *     rows: pass" in neutral ink, the same on both days. observe-watch: four monitor
 *     lines (volume, freshness, schema, distribution), volume's line
 *     dropping out of its band. observe-both: "row-count bound
 *     (dbt_expectations)" added under the tests, dashed; two columns,
 *     "tests: the expected", "observability: the unexpected".
 *   metric: QuestionCard 10. The video's own daily_revenue model, one day,
 *     350.00; not_null and a range of 0 to 1,000, both "0 rows: pass" in
 *     neutral ink.
 *     metric-recon: the ledger spot; the reconciliation query (the tolerance
 *     in yellow) and its result, 2026-03-02, 350.00 against 150.00 (red).
 *     metric-why: the model's SQL, the join line in red; order 1 (100.00)
 *     drawn three times beside items A, B, C, order 2 (50.00) once.
 *     metric-unit: a unit test as given and expected: one mocked order of
 *     100.00 with three items; expected 100.00, actual 300.00 (red).
 *   rapid-in: the RapidFire list, 11 to 19, each item lit as it is read.
 *     r-contract: the page's contract YAML (enforced, data_type), beside a
 *     model whose output column is renamed, "build fails" (red). r-severity:
 *     the page's severity YAML; a dial from 1 failing row (warn) to 100
 *     (error). r-packages: the two package names over a list of the page's
 *     tests. r-unit: given rows, model, expected rows. r-store: a red check
 *     turning into a small table of failing rows. r-upstream: one source
 *     feeding three models, a patch on one model (red), the fix at the
 *     source (green) reaching all three.
 *   next: the list complete; NextLine "Next: metrics and the semantic layer".
 *
 * Facts. Every query ran on the site's Postgres (PGlite 0.5.16, PostgreSQL
 * 18.6) by check.mjs into results.json, which data.ts reads; check.mjs fails
 * if a value stops matching what the narration says. dbt does not run here:
 * what runs is the SQL each test compiles to, roughly, as the page shows for
 * unique (check.mjs's header says how each is written).
 *   - "hook", "surface": the page's own block, read from the page and run as
 *     written: 24 rows, 21 orders; the test returns orders 2, 11 and 19, n =
 *     2 each. Every row summed is 3,569.50; one row per order, 3,234.50: 335.00
 *     too high. The table still has 24 rows after the test. "dbt hasn't
 *     removed them": the page's concept check ("dbt tests assert; they never
 *     modify data. The duplicates remain until you fix the source").
 *   - "builtins": the page's YAML (unique and not_null on order_id,
 *     accepted_values with its four statuses, relationships to dim_customer),
 *     on the video's own eight rows. unique returns order 3 (n = 2); not_null
 *     the row with no order_id; accepted_values order 5 ('returned');
 *     relationships order 6 (customer 99). unique keeps dbt's own null filter
 *     (default__test_unique: `where <column> is not null` before its group
 *     by, in dbt-core and dbt-adapters alike), so the null id never reaches
 *     it; with a second null key added (check.mjs's uniqueTwoNulls) it still
 *     returns only order 3: "even two of them would pass". "unique +
 *     not_null on a key assert a valid primary key" is the page's.
 *   - "singular": the page's tests/assert_no_negative_amounts.sql, its ref()
 *     compiled to fct_orders, on the same rows: order 7, -25.00. "Your own
 *     generic tests are macros": the page ("custom ones you define as
 *     macros"). The advice to promote a copied singular test is the video's,
 *     from the page's "generic tests for reusable rules".
 *   - "compound": the video's own seven order lines. unique on order_id
 *     alone returns orders 1 and 3 (n = 3 each); grouped by order_id and
 *     line_number, only (3, 2), n = 2. The page's YAML and "one row per
 *     (order_id, line_number)".
 *   - "fresh": the page's thresholds (warn after 6 hours, error after 12)
 *     on the video's own five raw orders, the newest loaded at 01:00 on 2
 *     March 2026; checks pinned to 04:00, 09:00 and 14:00 give 3 h pass, 8 h
 *     warn, 13 h error. The four tests on the same rows return 0 rows each.
 *     "Runs before the models build": both pages ("a pre-transformation
 *     timeliness check"); two thresholds for the drift: the page ("the
 *     interesting signal is usually the drift rather than the outage").
 *   - "ci": dbt.mdx's lineage figure, parsed by check.mjs: four models; a
 *     change to stg_customers selects stg_customers, dim_customer and
 *     fct_orders (3 of 4), and stg_orders is not selected. The command and
 *     the production manifest are the page's. "ci-defer" is the video's: the
 *     page's command has no --defer, but fct_orders reads stg_orders, which
 *     this run does not build, so its ref() resolves to production's only
 *     with --defer (dbt's slim-CI command, and what dbt Cloud CI jobs do).
 *   - "prod": the page's answer. "The marts keep yesterday's rows": dbt.mdx's
 *     dbt build ("runs the model, then immediately tests it before moving to
 *     downstream nodes") with the page's "an error should halt downstream
 *     builds"; a model that is not rebuilt keeps its last build.
 *   - "observe": the video's own loads, 30 orders on 2 March and 20 on 3
 *     March (33.3% fewer); the four tests return 0 rows on both days. The
 *     four monitored signals, the tool names and "row-count bounds" (a
 *     dbt_expectations test) are the page's.
 *   - "metric": the video's own daily_revenue, built with a join that fans
 *     out, on the metrics page's first two fan-trap orders (100.00 with items
 *     A, B and C; 50.00 with item D): 350.00. not_null and a range of 0 to
 *     1,000 (the video's own bounds) return 0 rows; the reconciliation
 *     against finance's 150.00 at a 1% tolerance (the video's own) returns
 *     the day. Data Analyst Part 1 measured the same two orders at 350.00
 *     (da-sql/results.json), and check.mjs checks the two agree. The unit
 *     test: the model's SQL on one mocked order of 100.00 with three items
 *     returns 300.00, against the expected 100.00.
 *   - Quick: the page's answers. "Warn at one failing row and error at a
 *     hundred" is the page's example ("warn at 1 failure, error at 100");
 *     unit tests are dbt 1.8 and later (the page; on screen only).
 *
 * Written for Drew's ear: dbt, SQL, YAML and ID in plain caps (SQL and YAML
 * are said by the lexicon); CI expanded once, in question seven; test names
 * as words ("not null", "accepted values", "store failures", "dbt utils");
 * SQL keywords as lowercase words ("group by", "coalesce"); numbers as they
 * are said; no sentence opens with "A" before an initialism.
 */
export const script: NarrationScript = {
  id: "ae-testing",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "This orders table is cheap to build and quick to query. It's also wrong: twenty-four rows, and three of the order IDs appear twice.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-quiet",
      text: "Nothing errors. Revenue is three hundred thirty-five dollars too high, and every dashboard that reads the table agrees on it.",
      pauseAfter: 0.7,
    },
    {
      id: "hook-job",
      text: "An analytics engineer is the last line of defense before a dashboard, so interviews probe how you catch that first: tests, contracts, freshness, and checks on every change.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Nineteen questions. Ten are worked through, most on real rows in Postgres, and nine come quickly at the end.",
      pauseAfter: 0.7,
    },

    // ── 1, 2. What a test asserts, and what a failing one surfaces ────────
    {
      id: "asserts",
      scene: true,
      text: "Question one. What does it mean that a dbt test asserts? A test writes an assumption down as a query for the rows that break it.",
      pauseAfter: 0.6,
    },
    {
      id: "asserts-zero",
      text: "Zero rows back, and the test passes. Any rows back are the failures, and the run fails with them.",
      pauseAfter: 0.8,
    },
    {
      id: "asserts-never",
      text: "It never changes the data. It stops the pipeline loudly, instead of letting bad rows reach a dashboard quietly.",
      pauseAfter: 0.8,
    },
    {
      id: "surface",
      text: "Question two. What does a failing uniqueness test actually surface? The rows that break it. A unique test on the order ID compiles to roughly this: group by the key, and keep any key that appears more than once.",
      pauseAfter: 0.6,
    },
    {
      id: "surface-run",
      text: "On the page's twenty-four rows, it returns three: orders two, eleven and nineteen, twice each.",
      pauseAfter: 0.8,
    },
    {
      id: "surface-fix",
      text: "Those rows are the work. dbt hasn't removed them, and they stay until whatever sent them twice is fixed.",
      pauseAfter: 0.8,
    },

    // ── 3, 4. The four built-in tests, and singular tests ─────────────────
    {
      id: "builtins",
      scene: true,
      text: "Question three. What are dbt's four built-in generic tests? Here they are in YAML, on an orders model: unique and not null on the order ID, accepted values on the status, and relationships from each customer ID to the customer dimension.",
      pauseAfter: 0.6,
    },
    {
      id: "builtins-run",
      text: "Each one compiles to a query for its own failures. Here are eight rows, with a problem planted for each test, and every query returns exactly the one it should.",
      pauseAfter: 0.6,
    },
    {
      id: "builtins-each",
      text: "Order three, which is there twice. The row with no ID. A status of returned, which isn't on the list. And customer ninety-nine, who isn't in the dimension.",
      pauseAfter: 0.7,
    },
    {
      id: "builtins-pair",
      text: "Notice that unique let the missing ID through: it skips nulls, so even two of them would pass.",
      pauseAfter: 0.6,
    },
    {
      id: "builtins-key",
      text: "That's why unique and not null go together on a key. Together, they say it's a valid primary key.",
      pauseAfter: 0.8,
    },
    {
      id: "singular",
      text: "Question four. Generic versus singular tests: what is the difference? Those four are generic: written once, with the column as a parameter, and attached to any column in YAML. Your own generic tests are macros.",
      pauseAfter: 0.6,
    },
    {
      id: "singular-sql",
      text: "A singular test is one SQL file for one rule: return every order with a negative amount. Here it returns order seven, at minus twenty-five dollars.",
      pauseAfter: 0.7,
    },
    {
      id: "singular-pick",
      text: "So generic for rules you reuse, singular for bespoke business checks. A singular test you find yourself copying into other models wants to become a generic one.",
      pauseAfter: 0.8,
    },

    // ── 5. A compound key ─────────────────────────────────────────────────
    {
      id: "compound",
      scene: true,
      text: "Question five. How do you test the uniqueness of a compound key? Order lines have one row per order and line number, so an order ID repeats by design.",
      pauseAfter: 0.6,
    },
    {
      id: "compound-wrong",
      text: "A unique test on the order ID alone fails on orders one and three. Order one is fine: it just has three lines.",
      pauseAfter: 0.6,
    },
    {
      id: "compound-pair",
      text: "Test the pair, with dbt utils' unique combination of columns, or a singular test that groups by both. It returns only order three's line two, the real duplicate.",
      pauseAfter: 0.7,
    },
    { id: "compound-grain", text: "The test is the grain, written down: one row per order and line number.", pauseAfter: 0.8 },

    // ── 6. Source freshness ───────────────────────────────────────────────
    {
      id: "fresh",
      scene: true,
      text: "Question six. What is source freshness, and how is it different from a test? A test checks what the data says. Freshness checks the clock: how old the newest row is, read from a loaded-at column.",
      pauseAfter: 0.6,
    },
    {
      id: "fresh-clock",
      text: "This source warns after six hours and errors after twelve. Its newest row landed at one in the morning. Checked at nine, it's eight hours old: a warning. At two in the afternoon, thirteen: an error.",
      pauseAfter: 0.7,
    },
    {
      id: "fresh-valid",
      text: "And all four tests pass on it. The rows that are there are valid; they're just old.",
      pauseAfter: 0.8,
    },
    {
      id: "fresh-two",
      text: "So dbt source freshness runs before the models build. It has two thresholds because a feed slipping later each day is the usual signal, and the warning catches the slip before the outage.",
      pauseAfter: 0.8,
    },

    // ── 7, 8. CI, and a failure in CI or in production ────────────────────
    {
      id: "ci",
      scene: true,
      text: "Question seven. How does CI for analytics typically work? On every pull request, continuous integration runs dbt build on the models that changed, and everything downstream of them.",
      pauseAfter: 0.6,
    },
    {
      id: "ci-state",
      text: "It finds the changes by comparing the project with production's manifest, its record of what's deployed. Change the customer staging model here, and three of the four models are built and tested. Orders staging is left alone.",
      pauseAfter: 0.6,
    },
    {
      id: "ci-defer",
      text: "With the defer flag, the orders fact table reads it from production instead.",
      pauseAfter: 0.7,
    },
    {
      id: "ci-slim",
      text: "That's slim CI: fast feedback without rebuilding every model, and a failing test blocks the merge.",
      pauseAfter: 0.8,
    },
    {
      id: "prod",
      text: "Question eight. How do you respond to a failing test in CI versus in production? In CI, the merge is blocked: fix the model or the test before it ships.",
      pauseAfter: 0.6,
    },
    {
      id: "prod-sev",
      text: "In production, go by severity. An error halts everything downstream and pages the owner, so the marts keep yesterday's rows instead of taking bad ones. A warning is triaged later.",
      pauseAfter: 0.7,
    },
    {
      id: "prod-cause",
      text: "Either way, read the failing rows, decide whether the data or the assumption is wrong, and fix the cause. Never loosen the test just to make it pass.",
      pauseAfter: 0.8,
    },

    // ── 9. Testing and observability ──────────────────────────────────────
    {
      id: "observe",
      scene: true,
      text: "Question nine. What is the difference between testing and data observability? Tests assert rules you wrote in advance.",
      pauseAfter: 0.5,
    },
    {
      id: "observe-run",
      text: "Here a day's load drops from thirty orders to twenty. A third of the data is gone, and every test still returns zero rows: the rows that did arrive are fine.",
      pauseAfter: 0.7,
    },
    {
      id: "observe-watch",
      text: "Observability watches volume, freshness, schema and distribution against what's normal, and flags the surprise. Tools like Monte Carlo or Elementary add that layer.",
      pauseAfter: 0.6,
    },
    {
      id: "observe-both",
      text: "A row-count bound would catch this drop, once someone thinks to write it. Tests catch what you expected; monitoring catches what you didn't.",
      pauseAfter: 0.8,
    },

    // ── 10. Testing that a metric is correct ──────────────────────────────
    {
      id: "metric",
      scene: true,
      text: "Question ten. How do you test that a metric is correct, not just non-null? Here's a daily revenue model. Not null passes: the number exists. A range test passes too: three hundred fifty dollars is plausible.",
      pauseAfter: 0.6,
    },
    {
      id: "metric-recon",
      text: "So reconcile it with an independent source. A singular test compares the day with finance's ledger, within one percent, and returns it: three hundred fifty against a hundred fifty.",
      pauseAfter: 0.7,
    },
    {
      id: "metric-why",
      text: "The model joined each order to its items, so an order with three items counted three times.",
      pauseAfter: 0.9,
    },
    {
      id: "metric-unit",
      text: "And a unit test would have caught it before it shipped:",
      pauseAfter: 0.5,
    },
    {
      id: "metric-unit-run",
      text: "one mocked order of a hundred dollars, with three items, comes out at three hundred.",
      pauseAfter: 2.4,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "Nine quick ones to finish.", pauseAfter: 0.5 },
    {
      id: "r-source",
      text: "Question eleven. What is the difference between a source test and a model test? A source test checks raw data as it lands, and points straight at ingestion. A model test guards your own logic. Do both.",
      pauseAfter: 1.4,
    },
    {
      id: "r-where",
      text: "Question twelve. Where should tests live, at staging or in marts? Both. Staging tests catch upstream problems early; mart tests guard the grain and the metrics. Test only at the end, and a bug travels far before it's caught.",
      pauseAfter: 0.7,
    },
    {
      id: "r-contract",
      text: "Question thirteen. What is a data contract in dbt? An enforced declaration of a model's column names, types and constraints. If the SQL produces a different shape, the build fails, before any consumer sees it.",
      pauseAfter: 1.4,
    },
    {
      id: "r-severity",
      text: "Question fourteen. What is test severity, and when do you use warn versus error? Error, the default, fails the run: use it for invariants like a unique key. Warn logs and carries on, for soft signals. Thresholds can warn at one failing row and error at a hundred.",
      pauseAfter: 1.4,
    },
    {
      id: "r-fatigue",
      text: "Question fifteen. How do you avoid alert fatigue from noisy tests? Choose those severities deliberately, use the thresholds, and fix or delete tests that fail for known reasons. A suite that cries wolf gets ignored.",
      pauseAfter: 1.4,
    },
    {
      id: "r-packages",
      text: "Question sixteen. What extra tests do dbt utils and dbt expectations add? Accepted ranges, expressions that must hold, compound keys, row-count bounds and distribution checks: the sanity checks the four built-ins leave out.",
      pauseAfter: 0.7,
    },
    {
      id: "r-unit",
      text: "Question seventeen. What are dbt unit tests, and how do they differ from data tests? A unit test runs a model's logic on mocked rows and compares an expected output, so it runs in CI with no real data. Data tests check the real data in the warehouse.",
      pauseAfter: 0.7,
    },
    {
      id: "r-store",
      text: "Question eighteen. What is store failures, and why enable it? It writes the failing rows to a table instead of just counting them, so a red check becomes a dataset you can query.",
      pauseAfter: 1.4,
    },
    {
      id: "r-upstream",
      text: "Question nineteen. Why prefer fixing data upstream over patching it in a downstream model? A coalesce in one model hides the defect, has to be copied into every consumer, and anything reading the source still gets bad data. Fix it once, at the source.",
      pauseAfter: 1.6,
    },
    {
      id: "next",
      text: "Tests check each model against what you expected of it. They can all pass while two dashboards disagree about revenue. Next: metrics and the semantic layer.",
    },
  ],
};
