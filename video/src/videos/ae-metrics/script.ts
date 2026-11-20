import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Metrics and the semantic layer" (16:9), Part 8 of the
 * Analytics Engineer interview prep videos
 * (agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
 * "8, Metrics and the semantic layer"), after
 * content/interview/analytics-engineer/metrics-and-semantic-layer.mdx, all 18
 * questions. Eight are worked through, numbered aloud and read in the page's
 * words; ten go quickly at the end, read the same way.
 *
 *   1. "What causes two dashboards to report different numbers for the same
 *      metric?" ("disagree"), first because the opening asks it.
 *   2. "What is a fan-out join (fan trap), and why is it dangerous?" ("fan";
 *      read "or fan trap").
 *   3. "How do you avoid double counting from a fan-out?" ("avoid").
 *   4. "What is a chasm trap, and how does it differ from a fan trap?"
 *      ("chasm").
 *   5. "What is a semantic layer (metrics layer)?" ("layer"; read "or metrics
 *      layer").
 *   6. "What are entities, dimensions, and measures in a semantic model?"
 *      ("entities").
 *   7. "Why can't you simply sum pre-aggregated distinct counts or ratios?"
 *      ("nonadd").
 *   8. "How does a semantic layer handle a ratio metric correctly?"
 *      ("ratio").
 *   Quick ("rapid-in"), each read "Question n." and the page's question:
 *   9 a single source of truth; 10 metric drift; 11 the dbt Semantic Layer /
 *   MetricFlow (read "or MetricFlow"); 12 LookML; 13 measure vs metric; 14
 *   what a metric definition contains; 15 additive, semi-additive and
 *   non-additive metrics; 16 governance; 17 cumulative or time-window
 *   metrics; 18 a wide, pre-joined mart against querying through a semantic
 *   layer.
 *   All 18 answered; none left out.
 *
 * Opening: the plan's bridge from Part 7 (every test passes and two
 * dashboards still disagree), on the page's own twelve orders: one dashboard
 * sums orders, the other the page's own fan-trap query. Close: the plan's
 * bridge into Part 9 (now the reader is a language model).
 *
 * On screen, beat by beat (what phase 2 builds; red the trap, green the
 * right answer, yellow what the narration points at, blue data):
 *   hook: the pelican; four test badges in a row, "pass" in neutral ink
 *     (unique, not_null on orders.order_id; not_null and relationships on
 *     order_items: passing is not the right answer here), then two
 *     dashboard tiles side by side, both titled "Revenue", one reading
 *     1,949.25 and one 4,555.25; the dials spot between them.
 *   hook-meaning: under the tiles, the two queries, small: SUM(amount) FROM
 *     orders, and the page's join, each aliased "revenue" as a dashboard
 *     would (check.mjs runs both as written); neither marked wrong.
 *   plan: eight numbered squares and ten smaller ones.
 *   disagree: QuestionCard 1. disagree-how: four causes as a ruled list,
 *     each inking in as it is read: filters (refunds, tax, cancelled),
 *     date logic (order date or ship date), grain, a fan trap.
 *     disagree-here: "a fan trap" lit (red), with an arrow to the second tile.
 *     disagree-cure: one shared definition box (the orders-grain sum, "SUM(amount)
 *     FROM orders", not labelled as the one true revenue) with two arrows down
 *     to the two tiles, which now both read 1,949.25 (green). (The
 *     rubber-stamp spot moved to Question 16's certification: the right
 *     side of this page has no clear 80px for it.) disagree-widen: two lines that
 *     start close and spread apart over time, unlabelled, no axis numbers
 *     (drawn: the page's claim, not data).
 *   fan: QuestionCard 2; orders (one) and order_items (many) as two ERD
 *     boxes, a one-to-many relation. fan-two: orders 1 and 2 (100.00, 50.00:
 *     150.00) and their four items; the join's four rows, order 1's 100.00
 *     three times in red; the sum 350.00 (red). fan-all: the page's query as
 *     written (comment lines kept), its result 4,555.25 (red), beside
 *     "24 rows" and the true 1,949.25; "2.34x". fan-danger: per order, the
 *     amount and its item count, the counted amount growing with the count
 *     (1x, 2x, 3x); nothing in the result set marked unusual. fan-tell: two
 *     row counts on the join's two sides, "12 orders in", "24 rows out"
 *     (yellow).
 *   avoid: QuestionCard 3. The page's fix listing (order_rev, item_qty), each
 *     CTE outlined by the table it reads. avoid-run: its result, 1,949.25
 *     and 38 (green). avoid-after: the joined rows again, COUNT(DISTINCT
 *     order_id) = 12 and SUM(qty) = 38 (green), SUM(o.amount) struck.
 *     avoid-layer: a small "semantic layer" box drawing the same two
 *     summaries itself.
 *   chasm: QuestionCard 4; customer in the middle, payments and refunds as
 *     two one-to-many relations into it (ERD kit). The coins spot beside
 *     payments. chasm-run: Ada's three payments (180.00) and two refunds
 *     (30.00), Ben's one payment greyed until chasm-left; the join's six
 *     rows, every payment beside every refund; paid 360.00, refunded 90.00
 *     (red). chasm-diff: two small diagrams side by side, a hairline between:
 *     fan trap, one many-side, one measure red; chasm trap, two many-sides,
 *     both red. chasm-fix: each branch totalled first, then joined: 180.00
 *     and 30.00 (green). chasm-left: Ben's row comes up, 40.00 paid and no
 *     refund; with JOIN he is missing (red), with LEFT JOIN he is there,
 *     40.00 and 0.00 (green).
 *   layer: QuestionCard 5. Three tiers: models at the bottom, the semantic
 *     layer in the middle, BI tools on top (three tool boxes). layer-once:
 *     "completed_revenue = SUM(amount) where status = 'completed'" in the
 *     layer, named as the page names it (one defined metric, not "revenue"
 *     itself: Part 9 shows other governed readings, such as net revenue);
 *     two requests arriving ("completed revenue by month", "... by
 *     region"), the layer
 *     emitting SQL for each, its join, aggregation and filter in yellow
 *     (drawn; check.mjs runs both statements on empty tables of that shape,
 *     so they are valid Postgres, and no number comes from them).
 *     layer-why: "what it means" and "how it's computed" separated by a
 *     hairline.
 *   entities: QuestionCard 6. Three labelled columns, entities, dimensions,
 *     measures, hairlines between, each filled as read. entities-run: the
 *     page's two tables as semantic models: orders (entity order, measure
 *     revenue), order_items (entity order, dimension item, measure units);
 *     the request "revenue and units by order", each measure summed on its
 *     own table, then joined; the twelve rows and the totals, 1,949.25 and
 *     38 (green).
 *   nonadd: QuestionCard 7. nonadd-distinct: the order_summary table (twelve
 *     orders, distinct products each), its sum 24 (red) against COUNT(DISTINCT
 *     item) = 7 (green); product A lit in its five orders. nonadd-users: a
 *     week of days, one user's dot on two of them, counted twice; "recount,
 *     or merge sketches". nonadd-ratio: the two days, 5 of 10 (50.0%) and
 *     20 of 1,000 (2.0%); their average 26.0% (red); 25 of 1,010, 2.5%
 *     (green). nonadd-store: two columns kept, conversions and sessions; a
 *     stored rate column struck.
 *   ratio: QuestionCard 8. The metric as numerator and denominator boxes,
 *     the division after both. ratio-week: a week's days summed into the two
 *     boxes, then one division. ratio-limit: two parts with different
 *     filters, joined by a red "≠".
 *   rapid-in: the RapidFire list, 9 to 18, each item lit as it is read.
 *     r-metricflow: the page's MetricFlow YAML (completed_revenue, its
 *     measure in yellow). r-lookml: two boxes, "view: dimensions, measures"
 *     and "explore: joins" (no code: the page shows none). r-measure: SUM(amount)
 *     against "completed revenue". r-additive: three rows (revenue, a
 *     balance, a ratio), ticks across dimensions and time. r-cumulative: a
 *     28-day window sliding along a day axis. r-governance: the five parts
 *     ticked, the rubber-stamp spot on "certification".
 *   next: the list complete; the pelican back; NextLine "Next: AI and the
 *     semantic layer".
 *
 * Facts. Every query ran on the site's Postgres (PGlite 0.5.16, PostgreSQL
 * 18.6) by check.mjs into results.json, which data.ts reads; check.mjs fails
 * if a value stops matching what the narration says. The page's tables and
 * queries are read from the page and run as written.
 *   - "hook", "fan": the page's twelve orders and twenty-four items. Orders
 *     alone: 1,949.25. The page's query: 4,555.25 over 24 joined rows, 2.34
 *     times. Unique and not_null on orders.order_id, not_null on
 *     order_items.order_id and relationships from items to orders all return
 *     0 rows ("every test passes"). Orders 1 and 2: 150.00, and 350.00 once
 *     joined, which Data Analyst Part 1 measured on the same rows
 *     (da-sql/results.json; check.mjs checks the two agree). Each order is
 *     counted once per item: its counted amount is its amount times its
 *     item count, for all twelve. "The tell is the row count": the page's
 *     join-fanout-rows chart ("Count your rows before and after a join,
 *     every time"), here 12 orders in and 24 rows out.
 *   - "disagree": the four causes, the cure and the widening gap are the
 *     page's (the last is its metric-definition-drift chart's claim, drawn
 *     without its numbers, which are illustrative).
 *   - "avoid": the page's fix as written: 1,949.25 and 38 units. After the
 *     join: COUNT(DISTINCT order_id) 12, SUM(qty) 38.
 *   - "chasm": the video's own customers (the page names payments and
 *     refunds but gives no rows): Ada's three payments, 180.00, and two
 *     refunds, 30.00; joined, six rows, 360.00 and 90.00; each branch
 *     totalled first, 180.00 and 30.00. Ben's 40.00 payment with no refund:
 *     the totals joined with inner joins return Ada alone; with left joins,
 *     Ben too, 40.00 and 0.00. The left-join point is the video's step past
 *     the page's "aggregate each branch separately, then combine".
 *   - "layer": the definition is the page's ("revenue is SUM(amount) where
 *     status = 'completed'", its YAML's completed_revenue), named "completed
 *     revenue" as the page's metric does, so it is not presented as the one
 *     correct revenue (Part 9 calls its governed metric net revenue). Not
 *     run (the page's tables have no status).
 *   - "r-drift": "one metric coming to mean different things in different
 *     places" is the page's definition put the way Part 9 uses the term (the
 *     same metric defined differently in two places).
 *   - "entities": revenue and units per order, each summed on its own table
 *     and then joined: twelve rows, 1,949.25 and 38. That is the page's fix,
 *     per order: the shape of SQL the page says a semantic layer generates,
 *     not MetricFlow's own output.
 *   - "nonadd": the page's items: distinct products per order sum to 24;
 *     COUNT(DISTINCT item) is 7; product A is in 5 orders. The ratio is Data
 *     Analyst Part 8's two days (da-ai-assisted: 5 of 10 sessions, 20 of
 *     1,000), run again here and checked against its results.json: the
 *     average of the two rates 26.0%, conversions over sessions 2.5%. The
 *     page states the rule for daily conversion rates but gives no rows.
 *     "Merge distinct-count sketches" is the page's ("merge a suitable
 *     distinct-count sketch"); the gloss is the video's.
 *   - "ratio": the page's answer, including its limit (incompatible filters
 *     or grains, an unavailable dimension).
 *   - Quick: the page's answers. MetricFlow's YAML is the page's, read from
 *     it by check.mjs. LookML is described, not shown, as on the page.
 *
 * The page's fan-trap block is wrong about itself: its comment says "True
 * revenue is 100 + 50 = 150, but this returns 350", and the prose says the
 * block shows "real revenue of 150 balloon to 350". On the twelve orders it
 * now holds, the query returns 4,555.25 against a true 1,949.25; 150 and 350
 * are orders 1 and 2 alone. The video follows the run (check.mjs records it
 * as pageNote), shows orders 1 and 2 as the zoom, and the twelve as the
 * whole.
 *
 * Written for Drew's ear: SQL, BI, API and YAML in plain caps (SQL and YAML
 * are said by the lexicon); BI expanded once, in question five; LookML as
 * written; MetricFlow glossed as the layer's query compiler and Looker as a
 * BI tool, where each first matters; SQL keywords as lowercase words ("count
 * distinct" is avoided: "count distinct order IDs" is read as words);
 * numbers as they are said, dollars without their cents where the screen
 * shows the cents; no sentence opens with "A" before an initialism.
 */
export const script: NarrationScript = {
  id: "ae-metrics",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every test passes. Two dashboards report revenue for the same twelve orders. One says nineteen hundred forty-nine dollars. The other says forty-five hundred fifty-five.",
      pauseAfter: 0.8,
    },
    {
      id: "hook-meaning",
      text: "Neither query errors, and neither looks wrong. Interviews probe exactly this: who defines a number, and the joins that quietly change it.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Nineteen questions on metrics and the semantic layer. Eight are worked through, most on the page's own orders in Postgres, and eleven come quickly at the end.",
      pauseAfter: 0.7,
    },

    // ── 1. Two dashboards, two numbers ────────────────────────────────────
    {
      id: "disagree",
      scene: true,
      text: "Question one. What causes two dashboards to report different numbers for the same metric? Two hand-written definitions.",
      pauseAfter: 0.5,
    },
    {
      id: "disagree-how",
      text: "One counts refunds, tax or cancelled orders, and the other doesn't. One goes by order date, the other by ship date. They aggregate at different grains. Or one of them hits a fan trap.",
      pauseAfter: 0.6,
    },
    { id: "disagree-here", text: "Here, it's the fan trap.", pauseAfter: 0.6 },
    {
      id: "disagree-cure",
      text: "The cure is one shared definition, in a semantic layer or a certified mart, so both dashboards run identical SQL.",
      pauseAfter: 0.6,
    },
    {
      id: "disagree-widen",
      text: "Left alone, the gap grows: each definition weighs a shift in traffic differently, so they drift apart just when everyone is looking.",
      pauseAfter: 0.8,
    },

    // ── 2, 3. The fan trap, and avoiding it ───────────────────────────────
    {
      id: "fan",
      scene: true,
      text: "Question two. What is a fan-out join, or fan trap, and why is it dangerous? You join a table to a one-to-many detail table, then sum a measure from the one side.",
      pauseAfter: 0.6,
    },
    {
      id: "fan-two",
      text: "Orders one and two are worth a hundred fifty dollars. Order one has three items, order two has one. Join the items, and order one's hundred dollars appears three times: three hundred fifty.",
      pauseAfter: 0.9,
    },
    {
      id: "fan-all",
      text: "Across all twelve orders, the join returns twenty-four rows, and nineteen hundred forty-nine dollars becomes forty-five hundred fifty-five, more than double.",
      pauseAfter: 0.7,
    },
    {
      id: "fan-danger",
      text: "That's the danger: nothing errors, and the result looks ordinary. Each order is counted once per item, so the bigger the baskets, the bigger the error.",
      pauseAfter: 0.6,
    },
    {
      id: "fan-tell",
      text: "The tell is the row count. Twelve orders went into the join, and twenty-four rows came out.",
      pauseAfter: 0.8,
    },
    {
      id: "avoid",
      scene: true,
      text: "Question three. How do you avoid double counting from a fan-out? Aggregate each grain before you join. Sum revenue from orders alone, units from the items alone, then put the two summaries together.",
      pauseAfter: 0.6,
    },
    { id: "avoid-run", text: "Back to nineteen hundred forty-nine dollars, and thirty-eight units.", pauseAfter: 0.7 },
    {
      id: "avoid-after",
      text: "If you must aggregate after the join, count distinct order IDs, twelve, and sum only measures that live on the item rows, like quantity.",
      pauseAfter: 0.6,
    },
    {
      id: "avoid-layer",
      text: "A semantic layer does this for you: it knows each measure's grain, and aggregates before the join fans out.",
      pauseAfter: 0.8,
    },

    // ── 4. The chasm trap ─────────────────────────────────────────────────
    {
      id: "chasm",
      scene: true,
      text: "Question four. What is a chasm trap, and how does it differ from a fan trap? Two independent one-to-many tables meet at one dimension: payments and refunds, both by customer.",
      pauseAfter: 0.6,
    },
    {
      id: "chasm-run",
      text: "Ada made three payments, a hundred eighty dollars, and got two refunds, thirty. Join all three, and every payment pairs with every refund: six rows. Payments sum to three hundred sixty, refunds to ninety.",
      pauseAfter: 1.5,
    },
    {
      id: "chasm-diff",
      text: "A fan trap inflates one measure. A chasm trap multiplies two many-sides together, so both inflate.",
      pauseAfter: 0.6,
    },
    {
      id: "chasm-fix",
      text: "Same fix: total each branch on its own, then join the totals. A hundred eighty, and thirty.",
      pauseAfter: 0.6,
    },
    {
      id: "chasm-left",
      text: "Join them to the customer with left joins, though. Ben paid forty dollars and was never refunded, and an inner join drops him.",
      pauseAfter: 0.8,
    },

    // ── 5, 6. The semantic layer, and what it is made of ──────────────────
    {
      id: "layer",
      scene: true,
      text: "Question five. What is a semantic layer, or metrics layer? A governed, central definition of metrics and dimensions, sitting between your models and the business intelligence, or BI, tools.",
      pauseAfter: 0.6,
    },
    {
      id: "layer-once",
      text: "Take the page's completed revenue: the sum of amount, where status is completed. It's defined once. Every tool asks the layer for completed revenue by month or by region, and the layer writes the SQL: the joins, the aggregation, the filter.",
      pauseAfter: 0.6,
    },
    {
      id: "layer-why",
      text: "It separates what a metric means from how each dashboard computes it.",
      pauseAfter: 0.8,
    },
    {
      id: "entities",
      scene: true,
      text: "Question six. What are entities, dimensions, and measures in a semantic model? Entities are the join keys, and they set the grain: an order, a customer. Dimensions are what you group and filter by: status, region, date. Measures are what you aggregate: an amount, a count.",
      pauseAfter: 0.6,
    },
    {
      id: "entities-dbt",
      text: "That triad is LookML's and the original MetricFlow spec's. In dbt's current spec, the measure is folded into a simple metric.",
      pauseAfter: 0.6,
    },
    {
      id: "entities-run",
      text: "Declared on the page's two tables, they tell the layer that revenue lives on orders and units on items. Ask for both by order, and it sums each at its own grain before it joins: nineteen hundred forty-nine dollars and thirty-eight units, with no fan trap.",
      pauseAfter: 0.8,
    },

    // ── 7, 8. Non-additive metrics, and ratio metrics ─────────────────────
    {
      id: "nonadd",
      scene: true,
      text: "Question seven. Why can't you simply sum pre-aggregated distinct counts or ratios? Because they're non-additive.",
      pauseAfter: 0.6,
    },
    {
      id: "nonadd-distinct",
      text: "Store the number of distinct products in each order, then add up those twelve counts: twenty-four. The items table holds seven products. Product A is in five orders, so it's counted five times.",
      pauseAfter: 0.7,
    },
    {
      id: "nonadd-users",
      text: "Daily active users summed into a month fail the same way: someone active on two days counts twice. Recount from the rows for the month, or merge distinct-count sketches, small summaries built to combine.",
      pauseAfter: 1.4,
    },
    {
      id: "nonadd-ratio",
      text: "Ratios break too. One day converts five of ten sessions, the next twenty of a thousand. Average the two rates, and you get twenty-six percent. Sum the conversions and the sessions, then divide: two point five percent.",
      pauseAfter: 0.7,
    },
    {
      id: "nonadd-store",
      text: "So store the numerator and the denominator, which do add up, and divide at the end.",
      pauseAfter: 0.8,
    },
    {
      id: "ratio",
      scene: true,
      text: "Question eight. How does a semantic layer handle a ratio metric correctly? It keeps the numerator and the denominator as two separate measures, and divides at query time, at whatever grain is asked for. Nothing is pre-divided.",
      pauseAfter: 0.6,
    },
    {
      id: "ratio-week",
      text: "Conversion by week sums the week's conversions and sessions first, then divides once, so there's no average of averages.",
      pauseAfter: 0.6,
    },
    {
      id: "ratio-limit",
      text: "What it can't do is rescue parts that don't match: a numerator and a denominator with different filters or grains, or a dimension one of them doesn't have.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "Eleven quick ones to finish.", pauseAfter: 0.5 },
    {
      id: "r-truth",
      text: "Question nine. Why does a single source of truth for metrics matter? Without one, every dashboard and notebook re-implements revenue slightly differently. One definition means one place to change it, the same answer everywhere, and versioned code instead of tribal knowledge.",
      pauseAfter: 1.2,
    },
    {
      id: "r-drift",
      text: "Question ten. What is metric drift, and how do you prevent it? It's one metric slowly coming to mean different things in different places, as copies of its logic spread and mutate. Define it once, under version control and review, and point every consumer at that.",
      pauseAfter: 1.2,
    },
    {
      id: "r-metricflow",
      text: "Question eleven. What is the dbt Semantic Layer, or MetricFlow?",
      pauseAfter: 0.4,
    },
    {
      id: "r-metricflow-yaml",
      text: "Entities, dimensions and metrics, declared in the YAML of the dbt model they describe.",
      pauseAfter: 0.4,
    },
    {
      id: "r-metricflow-sql",
      text: "MetricFlow, the layer's query compiler, turns a request for a metric by a dimension into warehouse SQL, and BI tools ask for it through an API.",
      pauseAfter: 1.2,
    },
    {
      id: "r-lookml",
      text: "Question twelve. What is LookML, and how does Looker's semantic layer work? LookML is the modeling language of Looker, a BI tool: dimensions and measures in views, joins in explores. Looker writes the SQL from what a user picks. It was an early, influential semantic layer.",
      pauseAfter: 1.2,
    },
    {
      id: "r-measure",
      take: true,
      text: "Question thirteen. What is the difference between a measure and a metric? A measure is a raw aggregate on one table, like the sum of amount. A metric is the business number built from measures, with filters, ratios or time logic, like completed revenue.",
      pauseAfter: 1.2,
    },
    {
      id: "r-contains",
      text: "Question fourteen. What does a metric definition contain? The aggregation, the entity and grain it lives on, the dimensions it can be sliced by, its filters, and its time grain. A ratio adds a numerator and a denominator.",
      pauseAfter: 1.2,
    },
    {
      id: "r-additive",
      text: "Question fifteen. What is the difference between additive, semi-additive, and non-additive metrics? Revenue sums across everything. An account balance sums across accounts but not across months: take the latest, or the average. Ratios and distinct counts never sum; recompute them from the rows.",
      pauseAfter: 1.2,
    },
    {
      id: "r-governance",
      text: "Question sixteen. What is governance in the metrics context? An owner for each metric, code review on every change, certification of the trusted ones, documented meaning and lineage, and access controls.",
      pauseAfter: 1.2,
    },
    {
      id: "r-cumulative",
      text: "Question seventeen. What is a cumulative or time-window metric, and why define it centrally? It aggregates over a trailing window, like rolling twenty-eight-day active users, or month-to-date revenue. Windows are easy to get subtly different by hand, so define the grain and the window once.",
      pauseAfter: 1.2,
    },
    {
      id: "r-wide",
      text: "Question eighteen. When is a wide, pre-joined mart preferable to querying through a semantic layer? For a heavy BI workload, or a tool that struggles with dynamic joins: reads are fast and predictable. It costs flexibility and storage, and its logic must still come from the governed definitions, or it becomes one more place to drift.",
      pauseAfter: 1.2,
    },
    {
      id: "r-where",
      text: "Question nineteen. Where else can a semantic layer live? In the warehouse itself: Snowflake's semantic views, or Databricks' metric views, which many ask-your-data assistants query. The trade-off is portability: a definition written for one engine doesn't move to another. Apache Ossie, begun as the Open Semantic Interchange, is a vendor-neutral spec for exchanging them.",
      pauseAfter: 1.2,
    },
    {
      id: "next",
      text: "All of these definitions were written for people reading dashboards. Now the reader is a language model. Next: AI and the semantic layer.",
    },
  ],
};
