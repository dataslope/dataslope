import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Normalization" (16:9), Unit 7 of Database Design with
 * PostgreSQL, registered as `DbDesign-7-Normalization`. One argument in five
 * parts, after the unit's five lessons
 * (content/courses/database-design-postgresql/):
 *
 *   1. Why normalize ("open" to "forms-in"), after why-normalization.mdx: the
 *      shop's orders_flat, which passes every constraint and still lets one
 *      fact disagree with itself; the update, insertion and deletion
 *      anomalies; and the cure, one home for every fact (customers, products,
 *      orders), with a join for the wide view. It opens on Unit 6's bridge:
 *      constraints stop bad values, not bad structure.
 *   2. First normal form ("cell" to "depend-in"), after first-normal-form.mdx:
 *      a phones cell holding a list, numbered phone columns, and the child
 *      table that fixes both.
 *   3. Second normal form ("pair" to "chain-in"), after second-normal-form.mdx:
 *      a composite key, the quantity that needs all of it and the product
 *      name that needs half, and the split into products.
 *   4. Third normal form ("chain" to "denorm-in"), after third-normal-form.mdx:
 *      a customer's city reached through customer_id, the same disease again,
 *      and Kent's "the key, the whole key, and nothing but the key".
 *   5. Denormalization ("summary" to "next"), after denormalization.mdx: a
 *      derived summary table, how it goes stale, and Northwind's two prices,
 *      which look like a copy and are two facts. It ends on Unit 8's question:
 *      a process for applying the rules, and for changing a live design.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every table, count, command tag and error on screen is what
 * check.mjs got back from PGlite 0.5.8 (PostgreSQL 18.3), running each
 * lesson's own DDL and rows from a fresh database (results.json, data.ts):
 *   - orders_flat's three rows satisfy its six constraints (a primary key and
 *     five NOT NULLs); ada@old.test is on orders 1 and 2, and Notebook's 8.00
 *     on orders 1 and 3;
 *   - `UPDATE ... WHERE order_id = 1` answers UPDATE 1, and the lesson's
 *     GROUP BY then lists Ada with ada@new.test and with ada@old.test;
 *   - inserting a product with no order (the video's 'Mug', 6.00) fails with
 *     23502, null value in column "order_id" ... violates not-null
 *     constraint; deleting order 3 leaves no row naming Grace;
 *   - split three ways (the lesson's erDiagram), Ada's email is on one row,
 *     the update, the mug and the delete each touch one row, Grace's email
 *     survives, and the join rebuilds the wide view;
 *   - "555-1000, 555-2200" = '555-2200' finds no row; a fourth phone in a
 *     three-column design fails with 42601, INSERT has more expressions than
 *     target columns; in student_phones the same search finds Ada, Linus has
 *     zero phones, and listing 555-1000 twice for Ada fails with 23505 on
 *     student_phones_student_id_phone_number_key;
 *   - in order_items_bad, quantity is 2 and 1 for product 10 on orders 100
 *     and 101; renaming product 10 to Field Notebook answers UPDATE 2, and
 *     after the split UPDATE 1;
 *   - in orders_bad, moving order 100 to Oxford answers UPDATE 1 and the
 *     GROUP BY lists Ada in London and in Oxford; in the 3NF design one
 *     UPDATE 1 shows Oxford on orders 100 and 101;
 *   - daily_sales_summary holds 2026-01-10, 2 orders, 32.50 and 2026-01-11,
 *     1 order, 12.00; after the video's own line item (105, order 3, 4.00)
 *     the summary still says 12.00 against a live 16.00;
 *   - Northwind (the lesson's remoteInitSql): 662 of 2,155 order lines carry
 *     a price other than the product's catalog price, 658 of them lower; the
 *     rows on screen are the first of the lesson's query.
 *   - History: William Kent, "A Simple Guide to Five Normal Forms in
 *     Relational Database Theory", Communications of the ACM 26(2), February
 *     1983, 120-125, says a non-key field "must provide a fact about the key,
 *     the whole key, and nothing but the key" (bkent.net/Doc/simple5.htm).
 *     "So help me Codd" is a later, unattributed addition (third-normal-form
 *     .mdx's "later wags"; Wikipedia, "Third normal form").
 *
 * Written for Drew: casual and curious, short spoken sentences, no symbols or
 * parentheses, numbers as words, contractions, questions the next sentence
 * answers, an ellipsis where a speaker would hold, two capitalised stresses
 * and no audio tags.
 */
export const script: NarrationScript = {
  id: "db-normalization",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. Why normalize ─────────────────────────────────────────────
    {
      id: "open",
      scene: true,
      text: "Here's a little shop's orders table. Every row has a key, nothing's null... every constraint passes.",
      pauseAfter: 0.4,
    },
    { id: "twice", text: "But look closer. Ada's email is stored twice, and so is the notebook's price.", pauseAfter: 0.5 },
    {
      id: "rushed",
      text: "So Ada changes her email, and a rushed update fixes only order one. Postgres says, update one. No complaints.",
      pauseAfter: 0.4,
    },
    {
      id: "disagree",
      text: "Now Ada has two emails. No constraint broke... the design let one fact live in two places.",
      pauseAfter: 0.6,
    },
    { id: "siblings", scene: true, text: "That's the update anomaly, and it has two siblings.", pauseAfter: 0.3 },
    {
      id: "insert",
      text: "Add a mug nobody's ordered yet? Refused, because every row here has to be an order.",
      pauseAfter: 0.5,
    },
    {
      id: "delete",
      text: "And when Grace cancels her only order, deleting it deletes Grace too.",
      pauseAfter: 0.6,
    },
    { id: "home", scene: true, text: "The cure is one rule. Every fact gets exactly one home.", pauseAfter: 0.35 },
    {
      id: "tables",
      text: "Customers get a table, products get a table, and each order just points at both.",
      pauseAfter: 0.4,
    },
    {
      id: "once",
      text: "Now Ada's email is one row to change, the mug can wait for its first order, and Grace outlives hers.",
      pauseAfter: 0.45,
    },
    { id: "join", text: "Need the wide view back? A join rebuilds it, any time.", pauseAfter: 0.6 },
    { id: "forms-in", text: "Normal forms get you there in steps, starting with what fits in a cell." },

    // ── Part 2. First normal form ─────────────────────────────────────────
    {
      id: "cell",
      scene: true,
      text: "First normal form means one value per cell. Here's Ada, with two phone numbers in one.",
      pauseAfter: 0.35,
    },
    {
      id: "search",
      text: "Ask who has five five five, two thousand... and Postgres finds nobody. It's buried in a string.",
      pauseAfter: 0.45,
    },
    {
      id: "columns",
      text: "Phone one, two and three instead? That's a repeating group, with a ceiling. A fourth number won't fit.",
      pauseAfter: 0.6,
    },
    {
      id: "child",
      scene: true,
      text: "The fix is a child table. Each number gets its own row, pointing back at its student.",
      pauseAfter: 0.35,
    },
    {
      id: "plain",
      text: "Now a search is a plain equals, Linus can have none at all, and a unique constraint stops Ada's number going in twice.",
      pauseAfter: 0.6,
    },
    { id: "depend-in", text: "So each cell holds one value. But what does each value depend on?" },

    // ── Part 3. Second normal form ────────────────────────────────────────
    {
      id: "pair",
      scene: true,
      text: "Second normal form is about keys with two parts, like this pair: order and product.",
      pauseAfter: 0.35,
    },
    {
      id: "whole",
      text: "Quantity needs the whole pair. Order one hundred took two notebooks, order one oh one took one.",
      pauseAfter: 0.4,
    },
    { id: "part", text: "But the product name only needs half. Product ten is Notebook on every order.", pauseAfter: 0.45 },
    {
      id: "partial",
      text: "That's a partial dependency. It copies the name onto every line, so a rename changes two rows.",
      pauseAfter: 0.5,
    },
    {
      id: "move",
      text: "So the name moves to products, and a rename is one row.",
      pauseAfter: 0.6,
    },
    { id: "chain-in", text: "Third normal form catches something sneakier." },

    // ── Part 4. Third normal form ─────────────────────────────────────────
    {
      id: "chain",
      scene: true,
      text: "These orders carry each customer's city. The key is the order ID... but a city isn't about an ORDER. It's about the customer.",
      pauseAfter: 0.4,
    },
    {
      id: "detour",
      text: "Order ID gives you customer ID, which gives you the city. A dependency with a detour: transitive.",
      pauseAfter: 0.45,
    },
    {
      id: "moves",
      text: "Same disease. Ada moves to Oxford, the update misses a row, and she lives in two cities.",
      pauseAfter: 0.45,
    },
    { id: "extract", text: "Give customers their own table, and she moves exactly once.", pauseAfter: 0.6 },
    {
      id: "oath",
      scene: true,
      text: "There's an old oath for this. Every non-key column depends on the key, the whole key, and nothing but the key.",
      pauseAfter: 0.4,
    },
    { id: "halves", text: "The whole key is second normal form. Nothing but the key is third.", pauseAfter: 0.4 },
    {
      id: "kent",
      text: "William Kent put it that way in nineteen eighty-three. Somebody later added... so help me Codd.",
      pauseAfter: 0.6,
    },
    { id: "denorm-in", text: "So should every table stay normalized forever? Almost." },

    // ── Part 5. Denormalization ───────────────────────────────────────────
    {
      id: "summary",
      scene: true,
      text: "Say a report keeps asking what sold each day. You could store the answer, in a summary table.",
      pauseAfter: 0.35,
    },
    {
      id: "days",
      text: "Two orders on January tenth, thirty-two fifty. One on the eleventh, twelve dollars.",
      pauseAfter: 0.4,
    },
    { id: "denorm", text: "That's denormalization. Duplicating on purpose, so a read gets simpler.", pauseAfter: 0.45 },
    {
      id: "stale",
      text: "But add four dollars to that last order, and the summary still says twelve. It's gone stale.",
      pauseAfter: 0.45,
    },
    {
      id: "sync",
      text: "So every copy needs a sync plan, and a clear source of truth.",
      pauseAfter: 0.6,
    },
    {
      id: "prices",
      scene: true,
      text: "And some copies aren't copies. Northwind stores a price on each product, and another on every order line.",
      pauseAfter: 0.35,
    },
    {
      id: "history",
      text: "Six hundred sixty-two lines disagree, and they're RIGHT. Prices rose, and each line kept what the customer paid.",
      pauseAfter: 0.45,
    },
    {
      id: "facts",
      text: "Two facts that share a name. A copy needs syncing. History needs nobody to ever fix it.",
      pauseAfter: 0.7,
    },
    {
      id: "rule",
      scene: true,
      text: "So, normalize first, denormalize on purpose, and keep every copy in sync.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "Knowing the rules is half of it. The other half is a process for using them, and for changing a design once it's live.",
    },
  ],
};
