import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Designing a schema" (16:9), Unit 8 of the Database Design
 * with PostgreSQL course: one video for the unit's six lessons, as one
 * argument in three parts.
 *
 *   1. A process (beats "open" to "loop"), after the-design-process.mdx: the
 *      eight steps, asked every time, and the loop back when an example
 *      breaks the design. It opens on Unit 7's bridge: knowing the rules is
 *      half of it, the other half is a process for applying them and for
 *      changing a live design.
 *   2. The store, built step by step ("reqs" to "review"), after
 *      case-study-ecommerce.mdx: its requirements, its four entities and
 *      their attributes, the foreign key instead of a copied email, the two
 *      different many-to-manys (product_categories holds only pairs,
 *      order_items holds facts of its own), keys, the CHECK on quantity, and
 *      the deliberate copy of the price charged. case-study-blog.mdx makes
 *      the same moves on a blog (author_id instead of an email, a junction
 *      table with a composite key), so it is told once, here.
 *   3. Changing a live schema ("change" to "next"), after
 *      why-schemas-change.mdx (requirements evolve; the kinds of change; why a
 *      live schema is risky to change), evolving-schemas-safely.mdx (add,
 *      backfill, verify, tighten; expand and contract on tasks.owner_id) and
 *      design-and-scale.mdx (one wide table against separate tables joined by
 *      keys; the four design choices it lists; a poor model is hard to
 *      rescue). It ends on Unit 9's question: where all this came from.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every row, total and error on screen is what PGlite 0.5.8
 * (PostgreSQL 18.3) returned for check.mjs, which runs the lessons' own
 * initSql and writes results.json (data.ts reads it):
 *   - the store's sample data (case-study-ecommerce, "Create an online store
 *     schema"): order 1 is Ana Rivera's, status paid; its lines are two
 *     Postgres Mugs at a unit_price of 10.00 and one Schema T-Shirt at
 *     24.00, while the mug's current_price is 12.00. Totaled from the lines
 *     it is 44.00, "forty-four dollars"; totaled from current_price it is
 *     48.00, "forty-eight", the lesson's "silently rewrite history";
 *   - a line with quantity 0 is refused: new row for relation "order_items"
 *     violates check constraint "order_items_quantity_check" (23514);
 *   - the same product twice on one order is refused: duplicate key value
 *     violates unique constraint "order_items_pkey" (23505);
 *   - tasks (evolving-schemas-safely, "Add a required column in safe steps"):
 *     two existing tasks, "Draft design" and "Review keys". Adding priority
 *     as NOT NULL in one step fails: column "priority" of relation "tasks"
 *     contains null values (23502). Added nullable, backfilled with 'normal'
 *     (UPDATE 2), checked (no row missing one), then SET NOT NULL, it holds;
 *   - the expand and contract of tasks.owner_id into task_assignees, which
 *     the lesson draws without SQL, is built in check.mjs as DDL: the
 *     expanded schema runs with both shapes, the backfill moves both owners
 *     across, and DROP COLUMN owner_id leaves tasks with id and title;
 *   - the claims without a number are the lessons' own: nouns hint at
 *     entities and verbs at relationships; the eight steps and the loop back
 *     from review; a relationship with attributes becomes a table; the copied
 *     unit_price is "a deliberate denormalization"; additive changes are
 *     safer; the task tracker's v1 to v5 (due date, projects, labels,
 *     history); the five things that depend on a live schema (data, code,
 *     reports and queries, tests, people's workflows); the backfill decides
 *     what old rows mean; design-and-scale's four choices and "a poor model
 *     is hard to rescue with operational tricks".
 *   - The bridge's one historical claim, a paper in 1970, is E. F. Codd, "A
 *     Relational Model of Data for Large Shared Data Banks", Communications
 *     of the ACM 13(6), June 1970, pp. 377 to 387 (doi:10.1145/362384.362685),
 *     which the-relational-revolution.mdx also names.
 *
 * Written for Drew's ear: casual and curious, short spoken sentences, no
 * symbols or parentheses, numbers as words, contractions, questions the next
 * sentence answers, an ellipsis where a speaker would hold, two capitalized
 * stresses and no audio tags. Table names are said as words ("order items").
 */
export const script: NarrationScript = {
  id: "db-designing-schemas",
  voice: "drew",
  // Room for the series intro (SeriesIntro, INTRO_SECONDS) before the first word.
  leadIn: 4.6,
  tail: 2.6,
  beats: [
    // ── Part 1. A process ─────────────────────────────────────────────────
    {
      id: "open",
      scene: true,
      text: "Knowing the rules of good design gets you halfway. The other half is a process... for applying them, and for changing a design once it's live.",
      pauseAfter: 0.4,
    },
    {
      id: "guess",
      text: "Say an online store wants a database. You could just start typing tables... but then your schema is a first guess.",
      pauseAfter: 0.35,
    },
    {
      id: "steps",
      text: "Instead, ask the same questions, in order. Gather requirements. Find the entities, and their facts. Work out how they relate. Pick keys, add constraints, normalize. Then test it with real rows.",
      pauseAfter: 0.3,
    },
    { id: "loop", text: "And when a row breaks it? Loop back, and revise." },

    // ── Part 2. The store, step by step ───────────────────────────────────
    {
      id: "reqs",
      scene: true,
      text: "Step one is plain sentences. A customer places orders. A product has a name and a price. Categories group products, and a product can sit in several.",
      pauseAfter: 0.3,
    },
    {
      id: "contains",
      text: "And an order contains products, each with a quantity... and the price charged.",
      pauseAfter: 0.35,
    },
    { id: "nouns", text: "The nouns are your entities. The verbs say how they connect." },
    {
      id: "entities",
      scene: true,
      text: "Step two makes each noun a table: customers, products, categories, orders.",
      pauseAfter: 0.3,
    },
    {
      id: "facts",
      text: "Step three puts each fact on the thing it describes. An email describes a customer. A price describes a product.",
      pauseAfter: 0.3,
    },
    {
      id: "pointer",
      text: "And an order doesn't copy the customer's email. It points at the customer's row, so each fact lives in one place.",
    },
    {
      id: "relate",
      scene: true,
      text: "Step four: how many connect to how many? One customer places many orders... and each order has exactly one customer.",
      pauseAfter: 0.35,
    },
    {
      id: "pairs",
      text: "Products and categories are many on both sides, so they meet in a table of pairs, product categories.",
      pauseAfter: 0.35,
    },
    {
      id: "hidden",
      text: "Orders and products are many to many, too. But that link has facts of its own: how many, and at what price.",
      pauseAfter: 0.3,
    },
    { id: "items", text: "So it becomes a real table, order items, one row per line on the receipt." },
    {
      id: "keys",
      scene: true,
      text: "Step five, keys. Order items is keyed by the pair, so the same product can't land on one order twice.",
      pauseAfter: 0.35,
    },
    {
      id: "rules",
      text: "Step six turns rules into constraints. A quantity has to be above zero, so a line for zero mugs... is refused by Postgres itself.",
    },
    {
      id: "copy",
      scene: true,
      text: "Step seven, normalize: every fact in one place. Except this design copies one fact, on purpose.",
      pauseAfter: 0.3,
    },
    {
      id: "then",
      text: "Products holds the price today. Order items holds the price charged, back then.",
      pauseAfter: 0.3,
    },
    { id: "mug", text: "Ana bought two mugs at ten dollars. The mug costs twelve now.", pauseAfter: 0.3 },
    {
      id: "history",
      text: "Total her order from its lines, and it's forty-four dollars, what she paid. Total it from today's prices, and it says forty-eight. History would quietly rewrite itself.",
      pauseAfter: 0.4,
    },
    { id: "review", text: "That's step eight: walk real rows through the design, and see what breaks." },

    // ── Part 3. Changing a live schema ────────────────────────────────────
    {
      id: "change",
      scene: true,
      text: "But a design is never done. A task tracker starts with just tasks. Then people want due dates. Then projects, labels, a history.",
      pauseAfter: 0.35,
    },
    { id: "kinds", text: "That's not failure. It's the product learning about the world.", pauseAfter: 0.4 },
    {
      id: "risky",
      text: "The catch? A live schema has rows, code, reports and tests leaning on its shape... and people's habits, too.",
    },
    {
      id: "priority",
      scene: true,
      text: "Say every task now needs a priority. Add it as required, in one step... and Postgres refuses.",
      pauseAfter: 0.35,
    },
    {
      id: "why",
      text: "The tasks already there have no priority, so the rule would be broken the moment it existed.",
      pauseAfter: 0.4,
    },
    {
      id: "safe",
      text: "So go in steps. Add the column empty. Backfill the old rows, here with normal. Check that none is missing. Then make it required.",
      pauseAfter: 0.4,
    },
    { id: "means", text: "That backfill is a design decision, by the way. It says what the old rows MEAN." },
    {
      id: "expand",
      scene: true,
      text: "Bigger changes work the same way. Say a task's one owner has to become a team of assignees.",
      pauseAfter: 0.3,
    },
    {
      id: "widen",
      text: "First, expand: add the new table beside the old column, so both shapes work.",
      pauseAfter: 0.3,
    },
    { id: "move", text: "Move the data across, then the code.", pauseAfter: 0.3 },
    { id: "contract", text: "Only once nothing reads the old column... contract, and remove it." },
    {
      id: "scale",
      scene: true,
      text: "And clear design keeps paying off as you grow. Cram the whole store into one wide table, and every rule gets tangled together.",
      pauseAfter: 0.35,
    },
    { id: "apart", text: "Kept apart and joined by keys, each table grows by its own rules.", pauseAfter: 0.35 },
    {
      id: "rescue",
      text: "A muddled model is hard to rescue later. A clear one is EASY to improve.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "And none of this was obvious, once. It started with one paper, in nineteen seventy.",
    },
  ],
};
