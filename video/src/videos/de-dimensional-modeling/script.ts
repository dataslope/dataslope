import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Data modeling I: dimensional modeling" (16:9), Part 3 of the
 * Data Engineer interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * the first half of content/interview/data-engineer/data-modeling.mdx. It
 * answers the fifteen questions the plan gives this video: ten worked
 * through, numbered aloud, then five quick ones (numbered 11 to 15 on screen
 * only). The other fifteen modeling questions (slowly changing dimensions and
 * the special dimensions) are Part 4's; "keys-next" points ahead to it.
 *
 *   1. What are fact and dimension tables? ("facts")
 *   2. Star vs snowflake schema? ("star"), with Data warehousing's "What is a
 *      star schema, and why is it warehouse-friendly?" ("star-why"), moved
 *      here by the plan's table.
 *   3. What is the "grain" of a table, and why define it first? ("grain")
 *   4. What does "grain mismatch" mean, and how do you fix it? ("mismatch")
 *   5. Normalization vs denormalization, what's the trade-off? ("norm")
 *   6. What is 1NF, 2NF, and 3NF? ("nf")
 *   7. What is OLTP vs OLAP, and how does schema design differ? ("oltp")
 *   8. What is a surrogate key, and why prefer it over a natural key? ("keys")
 *   9. What are the three types of fact tables? ("types")
 *   10. What is the difference between additive, semi-additive, and
 *       non-additive measures? ("additive")
 *   Quick ("rapid-in"): 11 a conformed dimension; 12 a wide against a narrow
 *   table; 13 a bus matrix against a data mart; 14 a date dimension against
 *   date functions; 15 a measure against a metric.
 *
 * Read aloud, "vs" is "versus" (as DS Part 8 reads "Precision versus
 * recall"), and 1NF, 2NF and 3NF are "first, second, and third normal form":
 * the card keeps the page's spelling. OLTP and OLAP are expanded once, in
 * Question 7, the first place they are said.
 *
 * Opening: Part 2's bridge, "a fast query starts with tables shaped for it",
 * and the hero, a starfish with a block at its center and one on each arm,
 * which is a star schema. Bridge: dimensions change, and the model has to keep
 * history. Next: modeling history.
 *
 * Reused, per the series rule:
 *   - Question 5 is why-normalization's shop (WhyNormalization, and Unit 7's
 *     opening): orders 1 and 2 are Ada's, order 3 is Grace's, the rushed
 *     update fixes only order 1. Its statements are re-run in DuckDB here.
 *   - Question 6 shows db-normalization's three tables (Unit 7: a phones cell
 *     holding a list, order_items_bad, orders_bad), read from its
 *     results.json, and its "the key, the whole key, and nothing but the key"
 *     scene, copied into NfScene and re-cued.
 *   - Question 8 follows db-keys (Unit 4: a natural key is a value the thing
 *     already has, a surrogate key a number the database makes up), carried
 *     into the warehouse with the page's own Type 2 dimension.
 *   - Every schema is drawn with the ERD kit (editorial/erd.tsx); every table
 *     and listing is da-sql's kit, as ds-sql takes it.
 *
 * Facts. Every number below ran in DuckDB 1.4.3 (DuckDB-Wasm, the engine the
 * page's blocks run in), by check.mjs into results.json, which data.ts reads:
 *   - "versions": the page's Type 2 block: customer 42 is customer_key 1001
 *     in Boston and 1087 in Austin; by the page's point-in-time join, order
 *     101 (2023-05-10) resolves to 1001 and order 102 (2024-06-01) to 1087.
 *   - "grain-test": the video's own order 1001, three lines with a 5.00
 *     shipping fee on each: SUM(shipping_fee) is 15.00.
 *   - "mismatch-join": the video's own five sales and two days of budget
 *     (150.00 and 120.00, 270.00 in all): the join sums the budget to 690.00;
 *     rolled up to days first, 270.00, with sales 190.00 either way. (The
 *     page's own block holds one sale per day and region, so its naive join
 *     sums the budget correctly, 5,748.00 both ways, and cannot show the
 *     double count its prose describes.)
 *   - "denorm": why-normalization's update in DuckDB: one row changed, and
 *     Ada then has two distinct emails.
 *   - "accum": the video's own loan application 7: applied 2024-03-04,
 *     approved 2024-03-11 (seven days), funded 2024-03-20 (nine days later).
 *   - "semi": the video's own month-end balances, built from Ada's and Ben's
 *     transactions: 1,600.00 across both accounts on March 31; 4,800.00
 *     summed over the quarter's three month-ends; the last value per account,
 *     900.00 and 700.00, is 1,600.00 again.
 *   - "nonadd": three users on Monday, three on Tuesday, four over both.
 *   - "r-date": the page's date-dimension block: revenue without holidays,
 *     Q1 1,260.00, Q2 840.00, Q3 265.00, Q4 250.00.
 *   - "r-metric": over the same page's 24 orders, average order value is
 *     186.04 (4,465.00 over 24); without the 8 holiday orders, 163.44.
 *   - Quoted from the page, not measured: the definitions; "denormalization
 *     buys read speed at the cost of storage and the risk of copies
 *     disagreeing"; "OLTP schemas are typically designed to 3NF"; snowflake
 *     "when dimensions are large or shared"; "modern cloud warehouses with
 *     columnar storage ... tolerate wide tables well".
 *
 * Written for Drew's ear: SQL is never said (it would be "sequel"); OLTP and
 * OLAP are in plain caps; BI is said as "dashboard tools"; numbers as they are
 * said; no sentence opens "A" right before an initialism.
 */
export const script: NarrationScript = {
  id: "de-dimensional-modeling",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A fast query starts with tables shaped for it. In a warehouse, the usual shape is a star: one long table of events in the middle, and around it, small tables that say who, what, where and when.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Fifteen questions on that shape, which is called dimensional modeling. Ten are worked through with their tables drawn, and five quick ones close the round.",
      pauseAfter: 0.7,
    },

    // ── 1, 2. Facts, dimensions, the star and the snowflake ───────────────
    {
      id: "facts",
      scene: true,
      text: "Question one. What are fact and dimension tables? A fact table records events at a fixed grain, here one row per order line. It holds the numbers you add up, quantity and amount, and a key to each dimension.",
      pauseAfter: 0.6,
    },
    {
      id: "dims",
      text: "The dimension tables hold the context you filter and group by: the date, the product, the store, the customer.",
      pauseAfter: 1.0,
    },
    {
      id: "star",
      text: "Question two. Star versus snowflake schema? This is a star: every dimension sits one join from the fact. Each is denormalized, so the product row carries its category and department as plain text.",
      pauseAfter: 0.6,
    },
    {
      id: "snow",
      text: "Snowflake it, and category and department move out into tables of their own. Each department's name is stored once, but revenue by department now takes three joins instead of one.",
      pauseAfter: 0.8,
    },
    {
      id: "star-why",
      text: "And why is a star warehouse-friendly? Filters land on the small dimensions, the one large fact table is scanned a column at a time, and dashboard tools map straight onto it. So the star is the default. Snowflake a dimension when it's very large, or shared.",
      pauseAfter: 0.8,
    },

    // ── 3. The grain ──────────────────────────────────────────────────────
    {
      id: "grain",
      scene: true,
      text: "Question three. What is the grain of a table, and why define it first? The grain is what one row means. Declare it before any column: here, one row per order line.",
      pauseAfter: 0.6,
    },
    {
      id: "grain-test",
      text: "Then every column has to make sense at that grain. Quantity and amount do. The shipping fee doesn't: it belongs to the whole order. So an order with three lines carries its five dollar fee three times, and a sum says fifteen.",
      pauseAfter: 0.7,
    },
    {
      id: "grain-fix",
      text: "It belongs in a fact at order grain, one row per order. Declaring the grain first is what catches that.",
      pauseAfter: 0.8,
    },

    // ── 4. Grain mismatch ─────────────────────────────────────────────────
    {
      id: "mismatch",
      scene: true,
      text: "Question four. What does grain mismatch mean, and how do you fix it? It's the same trap between two fact tables. Sales are recorded per transaction. The budget is one row per day and region.",
      pauseAfter: 0.5,
    },
    {
      id: "mismatch-join",
      text: "Join them on day and region, and each day's budget repeats once per sale. Two days of budget, two hundred seventy dollars, add up to six hundred ninety.",
      pauseAfter: 0.8,
    },
    {
      id: "mismatch-fix",
      text: "The fix: roll the finer table up to the coarser grain first, then join. Sales become one row per day, and the budget is two hundred seventy again.",
      pauseAfter: 0.8,
    },

    // ── 5. Normalization against denormalization ──────────────────────────
    {
      id: "norm",
      scene: true,
      text: "Question five. Normalization versus denormalization: what's the trade-off? Normalizing stores each fact once. Ada's email lives in one customers row, and every order reaches it through a join.",
      pauseAfter: 0.6,
    },
    {
      id: "denorm",
      text: "Denormalizing copies it onto each order: no join, so reads are faster. The price is storage, and copies that can disagree. A rushed update fixes one row, and now Ada has two emails.",
      pauseAfter: 0.8,
    },
    {
      id: "norm-where",
      text: "So normalize where writes are frequent and must stay consistent. Denormalize where reads dominate, like a warehouse.",
      pauseAfter: 0.8,
    },

    // ── 6. The normal forms ───────────────────────────────────────────────
    {
      id: "nf",
      scene: true,
      text: "Question six. What is first, second, and third normal form? First: one value per cell. Two phone numbers in one cell break it.",
      // The take ran straight into "Second": a longer hold leaves a pause check:sync can find.
      pauseAfter: 0.9,
    },
    {
      id: "nf-2",
      text: "Second: every column depends on the whole key. Key order lines by order and product, and the product's name depends on only half of it.",
      pauseAfter: 0.6,
    },
    {
      id: "nf-3",
      text: "Third: nothing but the key. A customer's city on an order row depends on the customer, not the order. That's a transitive dependency.",
      pauseAfter: 0.7,
    },
    {
      id: "nf-star",
      text: "App databases are usually designed to third normal form. A star's dimension breaks it on purpose: department depends on category, not on the product's key. Snowflaking puts it back.",
      pauseAfter: 0.8,
    },

    // ── 7. OLTP against OLAP ──────────────────────────────────────────────
    {
      id: "oltp",
      scene: true,
      text: "Question seven. What is OLTP versus OLAP, and how does schema design differ? OLTP, online transaction processing, runs the app: many short reads and writes, an order at a time. It's normalized to third normal form, so each write touches one row and holds few locks.",
      pauseAfter: 0.6,
    },
    {
      id: "olap",
      text: "OLAP, online analytical processing, answers questions about the history: fewer queries, each scanning a lot of rows. It's denormalized into stars, with wide tables that are mostly appended to.",
      pauseAfter: 0.7,
    },
    {
      id: "oltp-move",
      text: "Reshaping data from the first into the second is a large part of a data engineer's job.",
      pauseAfter: 0.8,
    },

    // ── 8. Surrogate keys ─────────────────────────────────────────────────
    {
      id: "keys",
      scene: true,
      text: "Question eight. What is a surrogate key, and why prefer it over a natural key? A natural key comes from the business: an email, a product code. Those change, get reused, and can be long strings that slow every join.",
      pauseAfter: 0.6,
    },
    {
      id: "surrogate",
      text: "A surrogate key is a number the warehouse makes up. It means nothing, so nothing upstream can change it, and it's small.",
      pauseAfter: 0.6,
    },
    {
      id: "versions",
      text: "It also lets one customer have two rows. Customer forty-two moved from Boston to Austin. The page's dimension keeps both, as keys ten oh one and ten eighty-seven, and each order points at the version that was true when it was placed.",
      pauseAfter: 0.6,
    },
    {
      id: "keys-next",
      text: "Keeping versions like that is called a slowly changing dimension, and it's where modeling history begins.",
      pauseAfter: 0.8,
    },

    // ── 9. The three types of fact table ──────────────────────────────────
    {
      id: "types",
      scene: true,
      text: "Question nine. What are the three types of fact tables? A transaction fact has one row per event: each deposit and withdrawal on Ada's account.",
      pauseAfter: 0.5,
    },
    {
      id: "periodic",
      text: "A periodic snapshot has one row per account per period: her balance at the end of every month.",
      pauseAfter: 0.5,
    },
    {
      id: "accum",
      text: "And an accumulating snapshot has one row per process, like a loan application, with a date for each stage. The row is updated as the application moves: approved after seven days, funded nine days later.",
      pauseAfter: 0.6,
    },
    {
      id: "types-pick",
      text: "Pick by the question: what happened, where things stood, or how long each step took.",
      pauseAfter: 0.8,
    },

    // ── 10. Additive, semi-additive, non-additive ─────────────────────────
    {
      id: "additive",
      scene: true,
      text: "Question ten. What is the difference between additive, semi-additive, and non-additive measures? An amount is additive: it sums across every dimension.",
      pauseAfter: 0.5,
    },
    {
      id: "semi",
      text: "A balance is semi-additive. Summed across accounts on one day, it's right: sixteen hundred dollars at the end of March. Summed across months, it's nonsense: the quarter's three month-ends add to forty-eight hundred, money that never existed.",
      pauseAfter: 0.6,
    },
    {
      id: "semi-fix",
      text: "Over time, take the last value in each period, or the average.",
      pauseAfter: 0.7,
    },
    {
      id: "nonadd",
      text: "Non-additive measures, like ratios and distinct counts, don't sum at all. Three users on Monday and three on Tuesday are four people, not six. Store the parts, and compute the ratio in the query.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Five quick ones to finish, most of them about one model shared by many teams.",
      pauseAfter: 0.6,
    },
    {
      id: "r-conformed",
      text: "A conformed dimension is one dimension that several fact tables share, with the same keys and the same values. Sales and inventory both use one date dimension, so you can drill across them and the days line up.",
      pauseAfter: 0.6,
    },
    {
      id: "r-wide",
      text: "A wide table puts one entity on each row, with every attribute a column: fast, and easy in a dashboard, but each new attribute is a new column. A narrow table keeps few columns and joins to the rest: flexible, at the cost of joins. Columnar warehouses handle wide tables well.",
      pauseAfter: 0.6,
    },
    {
      id: "r-bus",
      text: "A bus matrix is a plan: business processes down the side, conformed dimensions across the top, and a tick where a process uses one. A data mart is what gets built: the slice of the warehouse for one domain, like sales. The shared dimensions let two marts be combined.",
      pauseAfter: 0.6,
    },
    {
      id: "r-date",
      text: "Why a date dimension, rather than date functions? Fiscal quarters and holidays are business rules. Store them once, in a table, and every query just filters and groups. On the page's orders, revenue by fiscal quarter without holidays is one join and no date math.",
      pauseAfter: 0.6,
    },
    {
      id: "r-metric",
      text: "A measure is a raw column on a fact table, like revenue. A metric is a business definition built from measures, like average order value: revenue over orders. Define each metric once, in one shared place. On the page's orders, it's a hundred eighty-six dollars with holidays and a hundred sixty-three without, and two teams could each report one.",
      pauseAfter: 1.2,
    },
    {
      id: "next",
      text: "Every answer here treated a dimension as fixed. But customers move and products get renamed, so the model has to keep history. Next: modeling history.",
    },
  ],
};
