import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Relationships" (16:9), Unit 3 of Database Design with
 * PostgreSQL: one video for the unit's three lessons
 * (content/courses/database-design-postgresql/), told as one argument in
 * three parts, each leading into the next:
 *
 *   1. What a relationship is ("hook" to "many-in"), after
 *      what-are-relationships.mdx: entities don't live alone; relationships
 *      are the verbs, and a specific verb reads as a sentence ("places" over
 *      "has"); underneath, specific rows connect to specific rows, and the
 *      database keeps that link as a foreign key. It opens on Unit 2's bridge
 *      (the lines carry as much meaning as the boxes) and ends on the
 *      question a bare line leaves open: how many?
 *   2. Cardinality ("both" to "translate"), after cardinality.mdx: asked in
 *      both directions, one-to-many, the key on the many side; crow's-foot
 *      notation, each end read from the box outward (the maximum next to the
 *      box, the minimum farther out), the four ends with the lesson's own
 *      examples, feet at both ends for many-to-many; and the marks changing
 *      the schema, with the UNIQUE rule that turns many into at most one.
 *   3. Reading a diagram ("shop" to "next"), after reading-er-diagrams.mdx:
 *      the shop model read line by line as sentences, a sentence that sounds
 *      wrong as a design fault, and the foreign keys as the query's joins.
 *      It ends on Unit 4's opening: every line lands on one row because each
 *      row has a name nothing else shares, a key.
 *
 * Left on the page: the DDL, the composite key of order_items (Unit 4's
 * subject), the junction table's construction (Unit 5's), Chinook, and the
 * quizzes.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every row, id, count and error on screen is the output of
 * check.mjs, which builds each lesson's own tables in PGlite (PostgreSQL 18.3,
 * PGlite 0.5.8) and runs every statement the video shows into results.json,
 * which data.ts reads.
 *   - cardinality, "One customer can have many orders": Ada (1) and Grace
 *     (2); orders 101 and 102 store customer_id 1 and order 103 stores 2, so
 *     "Ada's row links to orders one oh one and one oh two. Grace's links to
 *     one oh three" and "orders one oh one and one oh two both store Ada's
 *     id". The lesson's count query gives Ada 2, Grace 1. These are the rows
 *     what-are-relationships draws in "A relationship connects rows".
 *   - "One order, how many customers? Exactly one": customer_id is a single
 *     NOT NULL column with a foreign key; check.mjs shows an order with no
 *     customer refused (23502) and one naming a missing customer refused
 *     (23503, "orders_customer_id_fkey").
 *   - The four ends and their examples are cardinality.mdx's: users ||--||
 *     profiles, employees ||--o| parking_passes, orders ||--|{ order_items,
 *     customers ||--o{ orders, students }o--o{ courses; its rule that a
 *     circle is optional (zero), a bar mandatory (one) and the foot many, and
 *     that the symbols combine minimum and maximum. Which symbol is which is
 *     components/crowsfoot.ts's reading: maximum next to the entity, minimum
 *     farther out.
 *   - "Uniqueness turns many into at-most-one": badge 10 is Ada's; inserting
 *     badge 11 for employee 1 fails with 23505, 'duplicate key value violates
 *     unique constraint "badges_employee_id_key"', DETAIL 'Key
 *     (employee_id)=(1) already exists.', and badges still holds one row.
 *     employees ||--o{ devices and ||--o| badges are the lesson's diagram.
 *   - reading-er-diagrams: its shop model and its three sentences; its
 *     query returns Ada, order 101, line 1 Notebook quantity 2 and line 2 Pen
 *     quantity 3, "two notebooks and three pens"; Postgres lists exactly the
 *     three foreign keys the diagram's lines stand for.
 *   - There are no historical or real-world claims to source.
 *
 * Written for Drew, the course's narrator: casual and curious, short spoken
 * sentences, contractions, questions the next sentence answers, numbers as
 * words ("one oh one"), an ellipsis where he'd hold, no symbols, no
 * parentheses, no audio tags and one capitalized stress.
 */
export const script: NarrationScript = {
  id: "db-relationships",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. What a relationship is ────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Entities never live alone. Customers matter because they place orders. And orders matter because they contain products.",
      pauseAfter: 0.4,
    },
    {
      id: "verbs",
      text: "So if entities are the nouns, relationships are the verbs. And a good one reads like a sentence. Customer places order says more than customer has order.",
    },
    {
      id: "rows",
      scene: true,
      text: "Zoom in, and that line is really rows linking to rows. Ada's row links to orders one oh one and one oh two. Grace's, to one oh three.",
      pauseAfter: 0.4,
    },
    { id: "key", text: "Postgres keeps each link as a key. Every order just carries its customer's id.", pauseAfter: 0.35 },
    {
      id: "idea",
      text: "The relationship is the idea... and the foreign key is how the database holds on to it.",
      pauseAfter: 0.5,
    },
    { id: "many-in", text: "But a bare line leaves a big question open. How many?" },

    // ── Part 2. Cardinality ───────────────────────────────────────────────
    {
      id: "both",
      scene: true,
      text: "That's cardinality, and you ask it both ways. One customer, how many orders? Zero, one, or many.",
      pauseAfter: 0.35,
    },
    { id: "other", text: "One order, how many customers? Exactly one.", pauseAfter: 0.4 },
    {
      id: "one-to-many",
      text: "That's one-to-many, and the key sits on the many side. Two orders, both storing Ada's id.",
    },
    {
      id: "ends",
      scene: true,
      text: "Crow's-foot notation draws those answers right onto the line. Every end gets two marks.",
      pauseAfter: 0.35,
    },
    // The key is new notation: a breath after each half, and a longer one to
    // read the finished Fig. 3 before the table of ends replaces it.
    { id: "max", text: "Next to the box is the most. A bar means one, and a crow's foot means many.", pauseAfter: 1.0 },
    { id: "min", text: "Farther out is the least. A circle means zero, and a bar means one.", pauseAfter: 1.6 },
    {
      id: "one",
      text: "Start at one box, and read the end at the other box. Two bars, exactly one. A profile belongs to one user.",
      pauseAfter: 0.7,
    },
    { id: "zero-or-one", text: "A bar and a circle, zero or one. An employee gets one parking pass, at most.", pauseAfter: 0.7 },
    { id: "one-or-many", text: "A foot and a bar, one or many. An order holds at least one item.", pauseAfter: 0.7 },
    { id: "zero-or-many", text: "A foot and a circle, zero or many. A customer might not have ordered yet.", pauseAfter: 0.7 },
    { id: "m2m", text: "And feet at both ends? That's many-to-many, like students and courses." },
    {
      id: "schema",
      scene: true,
      text: "And those marks change the schema. Many devices per employee? Then device rows can share an employee id.",
      // Holds Ada's two devices, both employee 1, before the badges replace them.
      pauseAfter: 0.9,
    },
    { id: "badge", text: "But one badge, at most? Then no employee id can show up twice.", pauseAfter: 0.35 },
    { id: "reject", text: "Give Ada a second badge... and Postgres says NO.", pauseAfter: 0.5 },
    { id: "translate", text: "It never sees your picture. You translate it, into keys and constraints." },

    // ── Part 3. Reading a diagram ─────────────────────────────────────────
    {
      id: "shop",
      scene: true,
      text: "So let's read one, properly. A little shop: customers, orders, products, and order items, which tie each order to its products. Read each line as a sentence.",
      pauseAfter: 0.4,
    },
    { id: "s1", text: "One customer places zero or many orders.", pauseAfter: 0.3 },
    { id: "s2", text: "One order contains one or many order items.", pauseAfter: 0.3 },
    { id: "s3", text: "One product appears in zero or many order items.", pauseAfter: 0.4 },
    { id: "wrong", text: "If a sentence sounds wrong to the business, the diagram needs work.", pauseAfter: 0.5 },
    {
      id: "joins",
      text: "Then follow the keys. Each one is a join, so the diagram maps out the query. Ada, her order, its lines, their products.",
      pauseAfter: 0.8,
    },
    { id: "result", text: "Two notebooks and three pens.", pauseAfter: 0.7 },
    {
      id: "next",
      text: "And each line lands on exactly one row, because every row has a name nothing else shares... a key.",
    },
  ],
};
