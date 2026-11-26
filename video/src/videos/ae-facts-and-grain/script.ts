import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Facts, dimensions and grain" (16:9), Part 1 of the Analytics
 * Engineer interview prep videos
 * (agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
 * "1, Facts, dimensions and grain"), after
 * content/interview/analytics-engineer/dimensional-modeling.mdx. It answers
 * the 22 questions the plan gives this video, by the page's headings: nine
 * worked through, then thirteen in a rapid round, every one read aloud as
 * "Question n." and the question (the brief's rule for this series; "vs" is
 * read "versus", "3NF" is read "third normal form", and the card keeps the
 * page's spelling). The page's other ten questions are Part 2's (the SCD
 * types, late arrivals, the mini-dimension, the slowly changing measure),
 * Part 3's (the layers) and Part 6's (one big table).
 *
 *   1. What are fact and dimension tables? ("facts")
 *   2. What is the grain, and why pin it down first? ("grain")
 *   3. Star vs snowflake? ("star")
 *   4. What is a surrogate key, and why prefer it over a natural key? ("sk")
 *   5. What are the trade-offs of using a hash surrogate key vs. a sequence
 *      integer? ("hash")
 *   6. What is the difference between additive, semi-additive, and
 *      non-additive measures? ("additive")
 *   7. Why should you avoid storing percentages or ratios directly in fact
 *      tables? ("ratio")
 *   8. What is a role-playing dimension? ("role")
 *   9. What is a bridge table, and when do you need one? ("bridge")
 *   Rapid ("rapid-in"): 10 What are the three types of fact tables?; 11 When
 *   would you choose a periodic snapshot over a transaction fact?; 12 What is
 *   a factless fact table?; 13 What is a degenerate dimension?; 14 What is a
 *   junk dimension?; 15 What is the purpose of a date dimension, and what
 *   columns does it typically include?; 16 What is a conformed dimension?;
 *   17 What is the difference between a confirmed vs. a conformed
 *   dimension?; 18 What does "drilling across" mean in dimensional
 *   modeling?; 19 What is the difference between a fact's grain and its
 *   level of aggregation?; 20 How would you model a many-to-many
 *   relationship between customers and accounts in a bank data warehouse?;
 *   21 What is normalization in 3NF, and why does dimensional modeling
 *   deliberately avoid it for dimensions?; 22 How does Kimball's approach
 *   differ from Inmon's?
 *
 * Opening: the plan's 0 to 1 join, "every model from its grain", written
 * fresh: the grain as the one sentence a model starts from. Bridge: the plan's
 * 1 to 2, the star is drawn, then a customer moves; Question 4 already gave
 * customer 42 two rows, and the bridge says why that matters.
 *
 * On screen, beat by beat (QuestionCard for each deep dive, RapidFire for the
 * round; every table and listing is the da-sql kit, every schema the ERD kit;
 * red the trap, green the right answer, yellow what the narration points at):
 *   - "hook", "plan": the sparrow beside one line in the serif, "One row per
 *     order line.", which the hook underlines on "grain"; under it the plan
 *     as two counts, "9 worked through" and "13 quick ones".
 *   - "facts" to "facts-test": the page's star as an ERD, fact_orders in the
 *     middle (order_id, order_date_sk, product_sk, amount; its first four
 *     rows beneath), dim_date and dim_product one relation each. "dims"
 *     lights the two dimensions and writes "how much" under the fact and "by
 *     what" under the dimensions. "facts-test" sorts three column names into
 *     two columns under a hairline: amount under "Add it up: a measure, on
 *     the fact"; full_date and category under "Group by it: an attribute, on
 *     a dimension".
 *   - "grain" to "grain-why": the order-line fact (order 1001, three lines),
 *     the grain sentence as its title. "grain-test" marks quantity and
 *     amount green, shipping_fee's three 5.00 in yellow, then SUM = 15.00 in
 *     red. "grain-fix": one row at order grain, 5.00 (green), and beside it
 *     the split by amount, 2.46, 0.69 and 1.85, which sum to 5.00.
 *   - "star" to "star-pick": the challenge's dim_product, twelve rows, the
 *     three Books rows in yellow; "snow" splits it into dim_product_sf and
 *     dim_category (six rows), and two listings side by side, the
 *     challenge's solutionSql with one JOIN and the snowflaked read with two,
 *     the second JOIN in yellow, over one result: the same six rows,
 *     Electronics 1,345.74 to Books 137.75. "star-pick" writes the verdict,
 *     "Default: a star" in green, "Snowflake: huge or shared" under it.
 *   - "sk" to "sk-why": the page's dim_customer, customer 42's two rows
 *     (1001 East, 1002 West) with valid_from and valid_to; customer_sk
 *     labelled "surrogate", customer_id "natural". "sk-versions" draws orders
 *     5001 and 5002 with an arrow each to the key it carries. "sk-why" lists
 *     the three ways a natural key fails (changes, reused, two sources with a
 *     42) and lights customer_id as the lookup column.
 *   - "hash" to "hash-pick": the page's two key queries as listings, md5 on
 *     the left, row_number on the right. The md5 of 42 written out under the
 *     left one, with "dev, prod, rebuild" beside it; "hash-versions" adds that
 *     a versioned dimension hashes the ID with valid_from, and a fact still
 *     finds its version by date (a review's fix, 2026-11-20: "no lookup"
 *     holds only at one row per customer). "hash-size": two bars,
 *     the primary-key index over 100,000 keys, integer 2.3 MB and md5 7.8 MB.
 *     "hash-trap": the integer keys on Monday (1 Initech, 2 Umbrella, 3 Acme
 *     Corp) and Tuesday (12 Massive Dyn takes 1, Acme becomes 4), order 5002
 *     still holding key 3, and its row read back as Umbrella, 850.00, in red.
 *     "hash-pick": two short verdict lines and "test: unique" as a badge.
 *   - "additive" to "nonadd": Ada's and Ben's month-end balances (3 x 2);
 *     the March column summed, 1,600.00 (green), the three month-ends
 *     summed, 4,800.00 (red, "never existed"), then the closing balances,
 *     900.00 and 700.00. "nonadd": Monday 3, Tuesday 3, and "both days: 4"
 *     with "not 3 + 3 = 6" beside it (a review's fix, 2026-11-26: neither
 *     sum is struck, since both are right as arithmetic).
 *   - "ratio" to "ratio-fix": the two orders (gross_revenue,
 *     cost_of_goods_sold, margin_pct); sum 60.0 and average 30.0 in red, the
 *     ratio of sums 14.0 in green, with "order 2: 90% of revenue" beside it.
 *   - "role" to "role-view": the page's role-playing listing, its three JOIN
 *     dim_date lines lit in turn, the ERD with three relations from
 *     fact_orders to one dim_date box labelled order, ship, delivery; order
 *     101's row (2024-03-01, 2024-03-03, 2024-03-07). "role-why": one table,
 *     one calendar for every role (the reason to keep it once; a review's
 *     fix, 2026-11-20). "role-span": "order to delivery: 6.7 days on
 *     average, 9 at most", which the roles answer together. "role-view": the
 *     dim_ship_date view listing, its renamed columns in yellow.
 *   - "bridge" to "bridge-touched": the ERD fact_orders, bridge, dim_promotion;
 *     order 201's two bridge rows, 0.6 and 0.4. "bridge-fan": three totals
 *     stacked, 12 orders 4,900.00, joined and summed 11,505.00 (red);
 *     "bridge-weight" adds the weighted 4,900.00 (green). "bridge-touched":
 *     per promotion, touched against allocated, the touched column under a
 *     "never add these" note.
 *   - "rapid-in" to "r-kimball": RapidFire, items 10 to 22, each with one
 *     small figure on the right: the three fact types as three labelled rows
 *     (the loan's two milestones, 7 and 9 days); Ben's February row, 0
 *     transactions and 500.00; the coverage counts, 11 rows against 3
 *     products; SO-1001 58.00 and SO-1002 35.00; the eight-row flags table;
 *     the 2024-07-04 row of the date dimension, is_holiday in yellow, "366
 *     rows"; dim_date between two fact boxes; the word "conformed" with
 *     "confirmed" struck; two facts each rolled up, then a full outer join;
 *     24 orders into 6 categories, and "r-agg-why", the mart joined back to
 *     the orders counting each category's total once per order (the page's
 *     "double-counting when joining at the wrong level"); the bank bridge with 0.50, 0.50, 1.00 and
 *     the balances 2,400.00 (red) and 900.00 plus 500.00 (green); product
 *     with category folded in; two arrows, bottom-up and top-down.
 *   - "next": the star again, customer 42's two rows lit, NextLine.
 *
 * Facts. Every table, listing and number ran in Postgres (PGlite 0.5.16,
 * PostgreSQL 18.6, the engine of the page's <SqlCodeBlock dialect="postgres">
 * blocks), by check.mjs into results.json, which data.ts reads:
 *   - "facts": the page's star block (24 orders, 6 dates, 6 products); its
 *     read returns 24 rows.
 *   - "grain-test" to "grain-fix" reuse de-dimensional-modeling's order 1001
 *     (the same question there): three lines, a 5.00 fee on each, SUM 15.00;
 *     at order grain, 5.00; split by amount, 2.46 + 0.69 + 1.85 = 5.00 (the
 *     split is this video's own step). check.mjs re-runs the statements and
 *     stops if they differ from the Data Engineer video's results.json.
 *   - "star", "snow": the page's challenge tables: 12 products in 6
 *     categories, 3 Books rows; the solutionSql and the video's snowflaked
 *     read return the same six rows (EXCEPT ALL both ways: 0).
 *   - "sk", "sk-versions": the page's SCD Type 2 block: customer 42 is 1001
 *     (East) and 1002 (West); by the page's point-in-time join, order 5001
 *     carries 1001 and 5002 carries 1002. "sk-why" quotes the page
 *     ("stable across source changes ... decoupled from business
 *     identifiers"); the two-sources case is the usual reading of the last.
 *   - "hash": the page's md5 query on its own customers: md5 of 42 is
 *     a1d0c6e83f027327d8461063f4ac58a6, and the same before and after the
 *     rebuild. "hash-size": 100,000 keys each, primary-key index 2,260,992
 *     bytes for bigint, 7,815,168 for md5 text (3.46 times; "under a third"
 *     the other way round); an md5 value is 32 characters, 36 bytes stored,
 *     against 8. "hash-trap": the page's own row_number() query, rerun after
 *     customer 12 arrives: Acme Corp goes from 3 to 4, and order 5002, loaded
 *     with key 3, reads back as Umbrella. The page calls the integer
 *     "dependent on a single ordering pass"; this is that, made concrete.
 *     "hash-pick": "hashes are common in dbt pipelines" and "Hashes can
 *     collide (rare but possible)" are the page's.
 *   - "additive" to "nonadd" reuse de-dimensional-modeling's balances and
 *     visits (the same question there), re-run and compared: 1,600.00
 *     across accounts on March 31, 4,800.00 over the three month-ends,
 *     closing 900.00 and 700.00; three users each day, four in all.
 *   - "ratio": the video's own two orders (the page's column names):
 *     margins summed 60.0, averaged 30.0, from the parts 14.0; order 2 is
 *     900.00 of 1,000.00 of revenue.
 *   - "role": the page's role-playing block: order 101 ordered 2024-03-01,
 *     shipped 2024-03-03, delivered 2024-03-07; order to delivery averages
 *     6.7 days (5 to 9). The view is the video's own.
 *   - "bridge": the page's bridge block: 12 orders, 24 bridge rows, 4,900.00
 *     in all; summed through the bridge unweighted, 11,505.00; weighted,
 *     4,900.00; every order's weights sum to 1 (two of them through a 0.0
 *     row the page includes). Per promotion, touched against allocated, e.g.
 *     Referral Credit 2,430.00 against 680.75.
 *   - Rapid: "r-types" and "r-periodic" reuse the Data Engineer video's
 *     account (Ben: no transaction in February, balance 500.00) and loan
 *     application (7 and 9 days); "r-factless" runs COUNT(*) and
 *     COUNT(DISTINCT) on the video's own coverage rows: 11 product-days, 3
 *     products (the page counted rows until 2026-11-20, and now counts
 *     distinct products); "r-degen" the page's query on three of the video's own
 *     lines; "r-junk" the page's three flags, 8 combinations; "r-date" a 2024
 *     date dimension, 366 rows, holidays from a list; "r-agg" the challenge's
 *     solution, 24 orders into 6 rows; "r-bank" the video's own joint account
 *     (1,000.00, half each) and Ada's own (400.00): the bank holds 1,400.00,
 *     the unweighted bridge says 2,400.00, weighted Ada 900.00 and Ben 500.00.
 *   - Quoted from the page, not measured: the definitions; "the Business
 *     Intelligence (BI) default"; "Prefer star unless a dimension is huge or
 *     genuinely shared"; the date dimension's typical columns; drilling
 *     across by "outer-joining the result sets on the conformed dimension
 *     keys"; Kimball and Inmon.
 *
 * Written for Drew's ear: BI expanded once ("business intelligence, or
 * BI"); MD5 and ID in plain caps, read letter by letter; dbt in lower case,
 * read letter by letter, glossed once ("the tool these models are usually
 * built with", the plan's "usually with dbt"); Postgres, Kimball and Inmon
 * as words; 3NF said "third normal form"; SQL keywords as lower
 * case words ("row number", "outer join"); numbers as they are said; no
 * sentence opens "A" before an initialism.
 */
export const script: NarrationScript = {
  id: "ae-facts-and-grain",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  takeChars: 1950,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every model starts with one sentence: what one row means. One row per order line, or one row per account per month. That sentence is the grain, and the rest of the model is built on it.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Twenty-two questions on facts, dimensions and grain. Nine are worked through on real tables in Postgres, and thirteen quick ones close the round.",
      pauseAfter: 0.7,
    },

    // ── 1. Facts and dimensions ───────────────────────────────────────────
    {
      id: "facts",
      scene: true,
      text: "Question one. What are fact and dimension tables? A fact table records events at a declared grain, here one row per order: a key for the order's date, a key for its product, and the amount.",
      pauseAfter: 0.6,
    },
    {
      id: "dims",
      text: "Dimension tables hold what you slice by: each date, each product's category. The fact answers how much. The dimensions answer by what.",
      pauseAfter: 0.7,
    },
    {
      id: "facts-test",
      text: "So for any new column, ask whether you'd aggregate it or group by it. Aggregate it, and it's a measure on the fact. Group by it, and it belongs on a dimension.",
      pauseAfter: 0.8,
    },

    // ── 2. The grain ──────────────────────────────────────────────────────
    {
      id: "grain",
      scene: true,
      text: "Question two. What is the grain, and why pin it down first? The grain is what one row represents. Say it before any column: one row per order line.",
      pauseAfter: 0.6,
    },
    {
      id: "grain-test",
      text: "Then every column has to make sense at that grain. Quantity and amount do. A shipping fee doesn't: it's charged once per order, so an order with three lines carries its five dollars three times, and the sum says fifteen.",
      pauseAfter: 0.7,
    },
    {
      id: "grain-fix",
      text: "Move it to a fact at order grain, or split it across the lines so the shares add back to five.",
      pauseAfter: 1.0,
    },
    {
      id: "grain-why",
      text: "Nothing errors. The total is simply wrong, and a declared grain catches it before anyone sums.",
      pauseAfter: 0.8,
    },

    // ── 3. Star and snowflake ─────────────────────────────────────────────
    {
      id: "star",
      scene: true,
      text: "Question three. Star versus snowflake? In a star, each dimension is one flat table. These twelve products carry their category as text, so Books is written three times.",
      pauseAfter: 0.6,
    },
    {
      id: "snow",
      text: "Snowflake it, and category moves to a table of its own, each name stored once. Revenue by category now takes two joins instead of one, and the same six rows come back.",
      pauseAfter: 0.7,
    },
    {
      id: "star-pick",
      text: "So the star is the default for business intelligence, or BI, tools: fewer joins to get wrong, and the repeated text costs little. Snowflake a dimension only when it's huge, or genuinely shared.",
      pauseAfter: 0.8,
    },

    // ── 4. Surrogate keys ─────────────────────────────────────────────────
    {
      id: "sk",
      scene: true,
      text: "Question four. What is a surrogate key, and why prefer it over a natural key? A natural key comes from the source, like customer ID forty-two. A surrogate key is one the warehouse makes up, and it means nothing.",
      pauseAfter: 0.6,
    },
    {
      id: "sk-versions",
      text: "That's what lets customer forty-two have two rows: ten oh one while Acme Corp was in the East, ten oh two once it moved West. Each order matches the version it was placed under.",
      pauseAfter: 0.7,
    },
    {
      id: "sk-why",
      text: "Natural keys also change, get reused, or clash when two sources each have a customer forty-two. The natural key stays on the row, so each load can look up which surrogate a new fact gets.",
      pauseAfter: 0.8,
    },

    // ── 5. Hash or integer ────────────────────────────────────────────────
    {
      id: "hash",
      scene: true,
      text: "Question five. What are the trade-offs of using a hash surrogate key versus a sequence integer? A hash of the natural key is deterministic. The MD5 of forty-two is the same string in development, in production, and in tomorrow's rebuild, so a fact can compute it without a lookup.",
      pauseAfter: 0.6,
    },
    {
      id: "hash-versions",
      text: "For a versioned dimension, hash the ID together with the version's start date, and a fact still finds its version by date.",
      pauseAfter: 0.6,
    },
    {
      id: "hash-size",
      text: "Integers are compact: a hundred thousand integer keys built an index under a third the size of the same number of hashes.",
      pauseAfter: 1.4,
    },
    {
      id: "hash-trap",
      text: "But an integer has to be handed out once, by one counter, and kept. Number the rows with row number on every rebuild, and a new customer with a lower ID shifts every key after it. On Monday, Acme was key three. On Tuesday, three is Umbrella, and Monday's order reads as theirs.",
      pauseAfter: 0.7,
    },
    {
      id: "hash-pick",
      text: "So hashes suit projects that rebuild often, in many environments, and they're common in dbt, the tool these models are usually built with. They can collide, rarely, so test the key for uniqueness either way.",
      pauseAfter: 0.8,
    },

    // ── 6. Additive, semi-additive, non-additive ──────────────────────────
    {
      id: "additive",
      scene: true,
      text: "Question six. What is the difference between additive, semi-additive, and non-additive measures? Revenue is additive: it sums across every dimension.",
      pauseAfter: 0.5,
    },
    {
      id: "semi",
      text: "A balance is semi-additive. Across accounts on one day, it sums fine: sixteen hundred dollars at the end of March. Across time, it doesn't: the quarter's three month-ends add up to forty-eight hundred, money nobody ever had.",
      pauseAfter: 0.6,
    },
    { id: "semi-fix", text: "Over time, take the closing balance, or the average.", pauseAfter: 0.7 },
    {
      id: "nonadd",
      text: "Non-additive measures, like ratios and distinct counts, sum across nothing. Three users on Monday and three on Tuesday were four people. Recount them from the rows at the grain.",
      pauseAfter: 0.8,
    },

    // ── 7. Ratios in a fact ───────────────────────────────────────────────
    {
      id: "ratio",
      scene: true,
      text: "Question seven. Why should you avoid storing percentages or ratios directly in fact tables? Because every roll-up gets them wrong. Take two orders, with margins of fifty and ten percent.",
      pauseAfter: 0.6,
    },
    {
      id: "ratio-sum",
      text: "Sum them, and the margin is sixty percent. Average them, and it's thirty. The real margin is fourteen, because the ten percent order carries nine-tenths of the revenue.",
      pauseAfter: 0.7,
    },
    {
      id: "ratio-fix",
      text: "So store the additive parts, gross revenue and cost of goods sold, and divide after summing.",
    },
    { id: "ratio-weight", text: "A ratio of sums weights each order by its revenue." },
    { id: "ratio-forgot", text: "A stored percentage has forgotten that weight.", pauseAfter: 0.8 },

    // ── 8. Role-playing dimensions ────────────────────────────────────────
    {
      id: "role",
      scene: true,
      text: "Question eight. What is a role-playing dimension? One physical table used several times by one fact, in different roles. Each order here has three date keys: ordered, shipped and delivered.",
      pauseAfter: 0.6,
    },
    {
      id: "role-join",
      text: "So the date dimension is joined three times, under three aliases. Order one oh one was placed on March first, shipped on the third, and delivered on the seventh.",
      pauseAfter: 0.6,
    },
    {
      id: "role-why",
      text: "One table means one calendar: every role reads the same holidays and fiscal periods.",
      pauseAfter: 0.6,
    },
    {
      id: "role-span",
      text: "Together, the roles answer what no single role can: order to delivery took six point seven days on average, nine at most.",
      pauseAfter: 0.6,
    },
    {
      id: "role-view",
      text: "For BI tools, give each role its own view, with columns named for it, like ship date, so nobody filters on the wrong date.",
      pauseAfter: 0.8,
    },

    // ── 9. Bridge tables ──────────────────────────────────────────────────
    {
      id: "bridge",
      scene: true,
      text: "Question nine. What is a bridge table, and when do you need one? When one fact row relates to several members of a dimension, like an order with two promotions. The fact only has room for one promotion key.",
      pauseAfter: 0.6,
    },
    {
      id: "bridge-pairs",
      text: "So a bridge table holds one row per order and promotion, twenty-four pairs for twelve orders, each with a weight.",
      pauseAfter: 0.6,
    },
    {
      id: "bridge-fan",
      text: "Join through it and sum the amount, and every order counts once per promotion. Twelve orders worth forty-nine hundred dollars report eleven thousand five hundred five, and nothing looks wrong.",
      pauseAfter: 0.7,
    },
    {
      id: "bridge-weight",
      text: "Multiply by the weight first. Each order's weights add up to one, so the promotions share exactly forty-nine hundred.",
      pauseAfter: 0.6,
    },
    {
      id: "bridge-touched",
      text: "The unweighted sums still answer one question, how much revenue each promotion touched. Just never total them.",
      pauseAfter: 0.8,
    },

    // ── Rapid round ───────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Thirteen quick ones, a sentence or two each.",
      pauseAfter: 0.6,
    },
    {
      id: "r-types",
      text: "Question ten. What are the three types of fact tables? Transaction: one row per event, like a deposit. Periodic snapshot: one row per entity per period, like a month-end balance. Accumulating snapshot: one row per process, like a loan application, updated in place as each milestone lands.",
      pauseAfter: 1.6,
    },
    {
      id: "r-periodic",
      text: "Question eleven. When would you choose a periodic snapshot over a transaction fact? When the question is where things stood. Ben made no transaction in February, and his February balance, five hundred dollars, is still a row.",
      pauseAfter: 1.4,
    },
    {
      id: "r-factless",
      text: "Question twelve. What is a factless fact table? Keys and no measures: which products were on promotion in which store, each day. Count rows to answer it, but count what's asked. Store five promoted three products last week, in eleven rows.",
      pauseAfter: 0.8,
    },
    {
      id: "r-degen",
      text: "Question thirteen. What is a degenerate dimension? A key with no table behind it, like an order number on the order-line fact. It has nothing to describe, so it stays on the fact, and you still group by it.",
      pauseAfter: 1.4,
    },
    {
      id: "r-junk",
      text: "Question fourteen. What is a junk dimension? Small flags, is promo, is gift wrap and is expedited, gathered into one table of every combination: eight rows, and one key on the fact instead of three flags.",
      pauseAfter: 0.8,
    },
    {
      id: "r-date",
      text: "Question fifteen. What is the purpose of a date dimension, and what columns does it typically include? One row per day, three hundred sixty-six for 2024, with year, quarter, month, week and weekend worked out once. The columns that matter most are the ones no function knows: holidays and the fiscal calendar.",
      pauseAfter: 1.4,
    },
    {
      id: "r-conformed",
      text: "Question sixteen. What is a conformed dimension? One dimension shared by several facts, with the same keys and the same meanings, so their numbers line up.",
      pauseAfter: 0.8,
    },
    {
      id: "r-confirmed",
      scene: true,
      text: "Question seventeen. What is the difference between a confirmed versus a conformed dimension? It's a vocabulary check: conformed is the term, and confirmed isn't one.",
      pauseAfter: 1.4,
    },
    {
      id: "r-drill",
      text: "Question eighteen. What does drilling across mean in dimensional modeling? Combining metrics from two facts, like sales and returns. Roll each fact up to the conformed dimension on its own, then full outer join the results on its key. Joined row to row, the facts would multiply.",
      pauseAfter: 1.4,
    },
    {
      id: "r-agg",
      text: "Question nineteen. What is the difference between a fact's grain and its level of aggregation? The grain is the finest detail a fact stores: one row per order. Aggregation is how far a mart rolls it up, here twenty-four orders into six categories. That mart's own grain is one row per category, and the fact keeps every order.",
      pauseAfter: 0.6,
    },
    {
      id: "r-agg-why",
      text: "Join the mart back to the orders, and each category's total is counted once per order.",
      pauseAfter: 1.4,
    },
    {
      id: "r-bank",
      text: "Question twenty. How would you model a many-to-many relationship between customers and accounts in a bank data warehouse? A bridge between customers and the balance fact, with each owner's share. Unweighted, a joint account counts twice. Weighted, the customers add back to the bank's total.",
      pauseAfter: 1.6,
    },
    {
      id: "r-3nf",
      text: "Question twenty-one. What is normalization in third normal form, and why does dimensional modeling deliberately avoid it for dimensions? In third normal form, every column depends on the key, the whole key, and nothing but the key, so each fact is stored once. Dimensions break it on purpose, folding category into product, to save joins. The copies stay consistent, because one pipeline writes them.",
      pauseAfter: 1.4,
    },
    {
      id: "r-kimball",
      text: "Question twenty-two. How does Kimball's approach differ from Inmon's? Kimball is bottom-up: a star per business process, joined by conformed dimensions, so value comes fast. Inmon is top-down: a normalized enterprise warehouse first, then marts cut from it. It's more consistent, and slower to start.",
      pauseAfter: 1.2,
    },
    {
      id: "next",
      scene: true,
      text: "Every dimension here held still, except one: customer forty-two already has two rows, because Acme Corp moved. Next: dimensions that change.",
    },
  ],
};
