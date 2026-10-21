import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "What design is for" (16:9), Unit 1 of Database Design with
 * PostgreSQL, the course's first video. One argument in three parts, after
 * content/courses/database-design-postgresql/what-is-database-design.mdx and
 * design-and-data-quality.mdx:
 *
 *   1. What a shortcut costs ("hook" to "what-in"): the flat orders table, the
 *      rushed update that leaves Ada with two emails, why that is the design's
 *      fault and not the SQL's (the update anomaly), and data outliving code.
 *   2. What design is ("what" to "buys-in"): the hard questions design
 *      answers, SQL as how the answers are written down, and the library's
 *      title against copy.
 *   3. What design buys ("ask" to "next"): the notebook question as a short
 *      join, the free-text order that makes it a project, three bad rows the
 *      schema refuses, the rule in the schema guarding the whole building,
 *      and a type as a rule (the Mars Climate Orbiter). It ends on Unit 2's
 *      first question: the things the data is about.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every table, row, count and error on screen is what PGlite 0.5.8
 * (PostgreSQL 18.3) returned when check.mjs ran the lessons' own SQL; data.ts
 * reads its results.json.
 *   - what-is-database-design, "Watch a shortcut go wrong" (its initSql and
 *     starterCode verbatim): orders 101 and 102 are Ada Lovelace's, both with
 *     ada@old.example; the UPDATE ... WHERE order_id = 101 changes one row
 *     ("misses the other"); the GROUP BY then returns Ada twice, with
 *     ada@new.example and ada@old.example, one row each ("two email
 *     addresses"). The update is legal SQL and raises nothing. The anomaly's
 *     name, and "data outlives code", are the lesson's.
 *   - "So what is database design?": the five questions are the lesson's
 *     list, shortened for the ear; "SQL syntax is how you express a design.
 *     It is not the design itself."
 *   - The library: the lesson's ER diagram (books, book_copies, borrowers,
 *     loans), built as DDL in check.mjs, every entity box read back from the
 *     catalog. "Three copies", "its own barcode", "loaned out separately" and
 *     "A loan is about a copy, not a title" are the lesson's.
 *   - "The schema shapes everything built on it" (initSql and starterCode
 *     verbatim): which customers bought a notebook returns one row, Ada
 *     Lovelace, ada@example.com (she bought notebooks in orders 101 and
 *     103, so DISTINCT folds them). The free-text note "Ada bought 2
 *     notebooks and 5 pens" is the lesson's.
 *   - design-and-data-quality opens on bad data that "starts as one missing
 *     email, one misspelled status, one order pointing to no customer". The
 *     video's three rows are its own, one per rule the shop schema already
 *     has: a second customer with ada@example.com (unique violation 23505 on
 *     customers_email_key, the same error the lesson's own Ana Rivera block
 *     returns), an order line with quantity 0 (check violation 23514,
 *     order_items_quantity_check) and an order for customer 99 (foreign key
 *     violation 23503, orders_customer_id_fkey). After all three the tables
 *     hold what they held. "Protects one door ... the whole building" is
 *     what-is-database-design's.
 *   - The Mars Climate Orbiter, after design-and-data-quality's "Types shape
 *     valid data", checked against the NASA Mishap Investigation Board's
 *     Phase I Report (10 November 1999, llis.nasa.gov/llis_lib/pdf/
 *     1009464main1_0641-mr.pdf): contact was lost on 23 September 1999; the
 *     root cause was "the failure to use metric units in the coding of a
 *     ground software file, 'Small Forces'"; its impulse data "was delivered
 *     in lb-sec instead of the specified and expected units of Newton-sec",
 *     so the small-force changes were "low by a factor of 4.45"; the
 *     periapsis came to 57 km, "too low for spacecraft survival". 4.45 is
 *     also check.mjs's 0.45359237 kg times 9.80665 m/s², 4.448.
 *
 * Written for Drew's voice, casual and curious: short spoken sentences, no
 * symbols or parentheses, numbers as words, contractions, questions the next
 * sentence answers, an ellipsis where a speaker would hold, one audio tag
 * and one capitalised stress.
 */
export const script: NarrationScript = {
  id: "db-why-design",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. What a shortcut costs ─────────────────────────────────────
    { id: "hook", scene: true, text: "A bad database design rarely feels bad on day one.", pauseAfter: 0.35 },
    {
      id: "table",
      text: "One table, every field in it, a few orders... and the first screen works.",
      pauseAfter: 0.45,
    },
    { id: "twice", text: "Ada's ordered twice, so her email's in there twice.", pauseAfter: 0.4 },
    {
      id: "change",
      text: "Then she changes it. A rushed update fixes order one-oh-one... and misses the other.",
      pauseAfter: 0.45,
    },
    {
      id: "confident",
      text: "Now the database says, with total confidence, that one person has two emails.",
    },
    {
      id: "legal",
      scene: true,
      text: "And nothing in that update was illegal. Postgres did exactly what it was told.",
      pauseAfter: 0.4,
    },
    {
      id: "design",
      text: "The problem is the design. Ada's email stopped being one fact and became copies, and every program has to keep them in step... by hand, forever.",
      pauseAfter: 0.45,
    },
    { id: "anomaly", text: "That's called an update anomaly.", pauseAfter: 0.4 },
    {
      id: "outlives",
      text: "And you can rewrite code tomorrow... but data outlives code.",
      pauseAfter: 0.6,
    },
    { id: "what-in", text: "So what is design, then?" },

    // ── Part 2. What design is ────────────────────────────────────────────
    {
      id: "what",
      scene: true,
      text: "It's answering the hard questions before your software answers them for you, inconsistently.",
      pauseAfter: 0.4,
    },
    {
      id: "questions",
      text: "Which things become tables? Which facts become columns? Which rows need an identity? Which tables point to which? And which values must be present, unique, or limited?",
      pauseAfter: 0.45,
    },
    { id: "sql", text: "SQL is just how you write the answers down. It isn't the design." },
    {
      id: "library",
      scene: true,
      text: "[curious] Take a library. Is a book the title in the catalog... or the copy on the shelf?",
      pauseAfter: 0.45,
    },
    {
      id: "copies",
      text: "Three copies of one title each have their own barcode, and get lent out separately.",
      pauseAfter: 0.4,
    },
    { id: "loan", text: "So a loan points at a copy, not a title.", pauseAfter: 0.4 },
    { id: "means", text: "No SQL manual can tell you that. It's about what your system MEANS.", pauseAfter: 0.6 },
    { id: "buys-in", text: "And answers like that pay off later." },

    // ── Part 3. What design buys ──────────────────────────────────────────
    { id: "ask", scene: true, text: "Say someone asks, which customers bought a notebook?", pauseAfter: 0.4 },
    {
      id: "walk",
      text: "With customers, orders, order items and products in their own tables, it's a short walk along links the design already drew.",
      pauseAfter: 0.35,
    },
    { id: "answer", text: "One name comes back. Ada Lovelace.", pauseAfter: 0.5 },
    {
      id: "sentence",
      text: "Store each order as a sentence, Ada bought two notebooks and five pens, and that question becomes a project.",
    },
    {
      id: "gate",
      scene: true,
      text: "Design also decides what gets in. Bad data starts small. A customer entered twice. A quantity of zero. An order for a customer who isn't there.",
      pauseAfter: 0.4,
    },
    { id: "refused", text: "Here, each one bounces, and Postgres names the rule it broke.", pauseAfter: 0.45 },
    {
      id: "building",
      text: "That rule lives in the schema, so it doesn't guard one app's front door. It guards the whole building.",
    },
    {
      id: "orbiter",
      scene: true,
      text: "Even a type is a rule. In nineteen ninety-nine, NASA lost the Mars Climate Orbiter because one program wrote pound-force seconds and another read newton-seconds.",
      pauseAfter: 0.4,
    },
    { id: "factor", text: "The numbers were just numbers. Nothing said which.", pauseAfter: 0.7 },
    { id: "next", text: "So where does a good design start? By naming the things your data is about." },
  ],
};
