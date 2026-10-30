import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Data modeling II: history and special dimensions" (16:9),
 * Part 4 of the Data Engineer interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * the second half of content/interview/data-engineer/data-modeling.mdx. It
 * answers the fifteen questions the plan gives this video, by the page's
 * headings: nine worked through, numbered aloud, then six quick ones
 * (numbered 10 to 15 on screen only).
 *
 *   1. How do you preserve history when a dimension attribute changes (SCD)?
 *      ("scd"), with data-warehousing.mdx's "How do slowly changing
 *      dimensions preserve history? (recap)", the same question, which the
 *      plan moves here. The card drops the page's "(SCD)": the answer says it.
 *   2. How does SCD Type 2 work in practice? ("type2")
 *   3. What is SCD Type 0? ("type0")
 *   4. What are slowly-changing dimension types 4 and 6? ("type46")
 *   5. How do you handle late-arriving dimension members? ("late")
 *   6. What is a snapshot vs insert-only fact table strategy? ("snap"; read
 *      "versus", the card keeps "vs")
 *   7. What is a bridge table and when do you need one? ("bridge")
 *   8. How do you model a many-to-many relationship between facts and
 *      dimensions? ("mtm")
 *   9. What is a data vault, and when would you choose it over a star
 *      schema? ("vault")
 *   Quick ("rapid-in"): 10 degenerate dimension; 11 junk dimension; 12
 *   role-playing dimension; 13 mini-dimension; 14 factless fact table; 15 a
 *   surrogate key sequence vs a UUID.
 *   The page's other fifteen modeling questions are Part 3's.
 *
 * Reuse. The bridge table's diagram is DbDesign-5's junction table
 * (db-relationship-patterns/JunctionScene.tsx: three entities, two
 * one-to-many relations into the middle box), copied into BridgeScene.tsx and
 * re-cued; the tables, listings, marks and strikes are the Data Analyst SQL
 * kit (da-sql/parts.tsx, through ds-sql's re-export pattern); every schema is
 * drawn with the ERD kit (editorial/erd.tsx). No Data Analyst or Data
 * Scientist page asks these questions, so no scene is reused whole.
 *
 * The opening takes up Part 3's bridge (dimensions change, and the model has
 * to keep history) on the page's own customer 42, written fresh: one order,
 * one move, and the question of which city the order belongs to now. The
 * close bridges into Part 5: every table here is filled by a load job, and a
 * load job is code.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every statement and table on screen ran in DuckDB v1.4.3
 * (DuckDB-Wasm 1.32.0, the engine the page's blocks run), by check.mjs into
 * results.json, which data.ts reads; the UUID index sizes ran on the site's
 * Postgres 18.3 (PGlite, scripts/lib/sql-engines.mjs):
 *   - "scd", "type2", "type46": the page's own dim_customer and 24 orders.
 *     Customer 42 lives in Boston (key 1001, 2022-01-01 to 2024-03-14), then
 *     Austin (key 1087, from 2024-03-15). Order 101 (2023-05-10, 350.00) was
 *     placed in Boston, order 102 (2024-06-01, 200.00) in Austin. Type 1's
 *     UPDATE makes both orders Austin (Austin 550.00, Boston nothing); Type
 *     2's point-in-time join gives 101 Boston and 102 Austin; Type 3 holds
 *     Austin with previous Boston, and after a second move to Denver, Denver
 *     with previous Austin. The page's close-and-insert, run with the page's
 *     dates, rebuilds the page's table exactly (24 rows); all 24 orders match
 *     exactly one version ("all twenty-four"); 15 current rows, one per
 *     customer. Type 4 split: 15 current rows, 24 history rows. Type 6: 101
 *     reports Boston with current_city Austin.
 *   - "type0", the video's own two loads: the second insert, ON CONFLICT DO
 *     NOTHING, inserts 0 rows and 2022-01-01 stands (the page: "a simple
 *     insert-once strategy suffices").
 *   - "late", the video's own three staged orders: order 203 for customer 77,
 *     who is not yet in the dimension; the inner-join load keeps 2 rows,
 *     700.00 of 1,110.00; with placeholder key 2002 it keeps all three; the
 *     UPDATE to Tulsa leaves the fact row as it was.
 *   - "snap", the video's own two orders: six events in the log; the latest
 *     row per order is 501 shipped and 502 cancelled; only the log answers
 *     "paid, then cancelled" (502).
 *   - "bridge"/"mtm", the video's own three orders (100, 60 and 40, 200 in
 *     all) and three promotions, with the page's bridge and weight: summed
 *     through the bridge they report 340; weighted, 110, 70 and 20, which is
 *     200.
 *   - quick round, the video's own small tables: invoice lines grouped by
 *     order number; 3 x 2 x 2 = 12 junk rows; order 301 ordered on a Friday
 *     and shipped on a Monday from one date table; 5 x 4 = 20 mini-dimension
 *     rows; three attendance rows. The UUID item, in Postgres: an integer
 *     is 4 bytes, a bigint 8, a UUID 16; primary-key indexes over 100,000
 *     rows are 2.26 MB for a sequence, 4.42 MB for random UUIDs ("almost
 *     twice": 1.96) and 3.18 MB for Postgres 18's time-ordered uuidv7.
 *
 * Written for Drew's ear: SCD and UUID are expanded once, where first said;
 * every other initialism is in plain caps; numbers as they are said ("one oh
 * one", "ten oh one"). The narration never says SQL.
 */
export const script: NarrationScript = {
  id: "de-modeling-history",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Order one oh one was placed in May twenty twenty-three, by a customer in Boston. Ten months later, she moved to Austin. Ask the warehouse today which city that order came from, and the answer depends on how her customer row handled the move.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Dimensions change, and the model has to keep their history. That's this round: fifteen questions on history and the special dimensions. Nine get worked through, then six quick ones.",
      pauseAfter: 0.7,
    },

    // ── 1. Preserving history ─────────────────────────────────────────────
    {
      id: "scd",
      scene: true,
      text: "Question one. How do you preserve history when a dimension attribute changes? With a slowly changing dimension, an SCD. Three classic types.",
      pauseAfter: 0.5,
    },
    {
      id: "scd-t1",
      text: "Type one overwrites. Set her city to Austin, and both orders now say Austin, including the one placed in Boston. Its three hundred fifty dollars moved with her.",
      pauseAfter: 0.6,
    },
    {
      id: "scd-t2",
      text: "Type two adds a row instead. Boston's version gets an end date, Austin gets a new row, and each order joins to the version true on its date: one oh one in Boston, one oh two in Austin.",
      pauseAfter: 0.6,
    },
    {
      id: "scd-t3",
      text: "Type three keeps a previous value column: Austin, and before it Boston. That's one step of history. Move her again, to Denver, and Boston is gone.",
      pauseAfter: 0.6,
    },
    {
      id: "scd-end",
      text: "Type two is the standard whenever a report has to stay true to its dates. Type one still has a job: fixing a typo, where the old value was never true.",
      pauseAfter: 0.8,
    },

    // ── 2. Type 2 in practice ─────────────────────────────────────────────
    {
      id: "type2",
      scene: true,
      text: "Question two. How does SCD Type two work in practice? Two statements. First, close the current row: its end date becomes the day before the move, and its current flag goes false.",
      pauseAfter: 0.5,
    },
    {
      id: "type2-insert",
      text: "Then insert the new version, with a new surrogate key, valid from the day of the move to a far future date, flagged current.",
      pauseAfter: 0.6,
    },
    {
      id: "type2-join",
      text: "A fact finds its version by date: the order date falls between valid from and valid to. All twenty-four of the page's orders match exactly one version, because the ranges never overlap and never leave a gap.",
      pauseAfter: 0.6,
    },
    {
      id: "type2-load",
      text: "In practice that lookup runs once, at load time, and the fact stores the key it found: order one oh one keeps ten oh one for good. Today's view is just the rows where is current is true.",
      pauseAfter: 0.8,
    },

    // ── 3. Type 0 ─────────────────────────────────────────────────────────
    {
      id: "type0",
      scene: true,
      text: "Question three. What is SCD Type zero? A value that never changes once it's written, like the date a customer signed up. Load it once, and ignore whatever the source says later.",
      pauseAfter: 0.5,
    },
    {
      id: "type0-run",
      text: "Here a second load sends a different sign-up date, and the insert adds nothing: the first value stands.",
      pauseAfter: 0.5,
    },
    {
      id: "type0-mix",
      text: "Types are chosen per column, so one customer row can hold a Type zero sign-up date beside a Type two city.",
      pauseAfter: 0.8,
    },

    // ── 4. Types 4 and 6 ──────────────────────────────────────────────────
    {
      id: "type46",
      scene: true,
      text: "Question four. What are slowly changing dimension types four and six? Type four splits the table. The main dimension keeps only current values, fifteen rows, one per customer, and the history moves to a table of its own: twenty-four rows. Use it when history is large and rarely read.",
      pauseAfter: 0.6,
    },
    {
      id: "type6",
      text: "Type six is one, plus two, plus three. It versions rows like Type two, and every row also carries the current value, so order one oh one reports Boston as it was, and Austin as it is now, without a second join.",
      pauseAfter: 0.5,
    },
    {
      id: "type6-cost",
      text: "The price: every move rewrites that current column on all of the customer's old rows.",
      pauseAfter: 0.8,
    },

    // ── 5. Late-arriving members ──────────────────────────────────────────
    {
      id: "late",
      scene: true,
      text: "Question five. How do you handle late-arriving dimension members? Here an order for customer seventy-seven lands before customer seventy-seven does.",
      pauseAfter: 0.5,
    },
    {
      id: "late-drop",
      text: "Look up its key with an inner join, and the order simply vanishes: seven hundred dollars loaded, out of eleven hundred ten. No error, just a smaller total.",
      pauseAfter: 0.6,
    },
    {
      id: "late-fix",
      text: "Instead, insert a placeholder row for seventy-seven, its city unknown and flagged inferred, and load the order against that key.",
      pauseAfter: 0.5,
    },
    {
      id: "late-arrive",
      text: "When the real customer arrives, update the placeholder in place. The order already points at it, so it reports Tulsa, and the fact table is never touched.",
      pauseAfter: 0.5,
    },
    {
      id: "late-shared",
      text: "One shared unknown row, key minus one, works too, but then every one of those facts has to be re-keyed later.",
      pauseAfter: 0.8,
    },

    // ── 6. Snapshot or insert-only ────────────────────────────────────────
    {
      id: "snap",
      scene: true,
      text: "Question six. What is a snapshot versus insert-only fact table strategy? Insert-only appends a row for every change: six rows for two orders, the whole history.",
      pauseAfter: 0.5,
    },
    {
      id: "snap-one",
      text: "A snapshot keeps one row per order, its state now. That's easy to query, but order five oh two just says cancelled. Nothing says it was paid first.",
      pauseAfter: 0.6,
    },
    {
      id: "snap-log",
      text: "The log can answer that: five oh two was paid, then cancelled. And it can rebuild the snapshot, by keeping the latest row per order. The snapshot can't rebuild the log.",
      pauseAfter: 0.5,
    },
    {
      id: "snap-end",
      text: "So when history has to be auditable, keep the insert-only log as the record, and serve the snapshot from it.",
      pauseAfter: 0.8,
    },

    // ── 7, 8. Bridge tables and many-to-many ──────────────────────────────
    {
      id: "bridge",
      scene: true,
      text: "Question seven. What is a bridge table and when do you need one? When one fact relates to several members of a dimension, like an order that used two promotions at once. The fact table only has room for one promotion key.",
      pauseAfter: 0.5,
    },
    {
      id: "bridge-pairs",
      text: "So a bridge table sits between them, holding one row per order and promotion pair.",
      pauseAfter: 1.0,
    },
    {
      id: "mtm",
      text: "Question eight. How do you model a many-to-many relationship between facts and dimensions? With that bridge, and a weight.",
      pauseAfter: 0.5,
    },
    {
      id: "mtm-fan",
      text: "Join through the bridge and sum, and every order counts once per promotion: three orders worth two hundred dollars report three hundred forty.",
      pauseAfter: 0.6,
    },
    {
      id: "mtm-weight",
      text: "Give each pair a weight, summing to one per order, multiply before you sum, and the promotions share exactly two hundred.",
      pauseAfter: 0.5,
    },
    {
      id: "mtm-end",
      text: "The unweighted totals still say how much revenue each promotion touched. Just never add them up.",
      pauseAfter: 0.8,
    },

    // ── 9. Data vault ─────────────────────────────────────────────────────
    {
      id: "vault",
      scene: true,
      text: "Question nine. What is a data vault, and when would you choose it over a star schema? A vault splits the model three ways. Hubs hold the business keys. Links hold the relationships between hubs. Satellites hold the descriptive attributes, a new row for every change, stamped with when it loaded and which source sent it.",
      pauseAfter: 0.6,
    },
    {
      id: "vault-why",
      text: "Loading only ever inserts, and each source gets its own satellites, so teams add sources in parallel, and every value traces back to where it came from.",
      pauseAfter: 0.6,
    },
    {
      id: "vault-when",
      text: "Choose it for many changing sources and strict audit. Choose a star when the domain is stable and analysts query it directly. Often it's both: the vault stores the history, and stars built on top of it serve the reports.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "The last six are special cases, a sentence or two each.",
      pauseAfter: 0.5,
    },
    {
      id: "r-degen",
      text: "A degenerate dimension is a dimension with no table behind it, like an invoice number kept on the fact. You still group by it.",
    },
    {
      id: "r-junk",
      text: "A junk dimension gathers small flags, payment type, gift or not, web or store, into one table of every combination: twelve rows, and the fact carries one key instead of three.",
    },
    {
      id: "r-role",
      text: "A role-playing dimension is one table in several roles: the date dimension, joined once as the order date and once as the ship date.",
    },
    {
      id: "r-mini",
      text: "A mini-dimension moves fast-changing attributes, like age band and income tier, out of a big customer dimension into a small one, twenty rows here, with its own key on the fact. The big one stops growing a new version every time a band changes.",
    },
    {
      id: "r-factless",
      text: "A factless fact table has no measures at all: one row per event, like a student attending a class. Counting the rows is the measure.",
    },
    {
      id: "r-uuid",
      text: "And a surrogate key from a sequence is a small integer, handed out in order: compact and quick to join. A UUID, a universally unique identifier, is sixteen bytes any system can make without a shared counter, which matters when many sources insert at once.",
    },
    {
      id: "r-uuid-cost",
      text: "The cost shows in the index. In Postgres, a hundred thousand random UUIDs built a primary key index almost twice the size of the sequence's. Time-ordered version seven UUIDs land in between.",
      pauseAfter: 1.2,
    },
    {
      id: "next",
      text: "Every table here is filled by a load job: close a version, insert a placeholder, split a weight. Loading the model takes code. Next: Python for data engineering.",
    },
  ],
};
