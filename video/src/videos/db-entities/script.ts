import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Entities and attributes" (16:9), Unit 2 of Database Design
 * with PostgreSQL: one video for the unit's three lessons, as one argument in
 * three parts.
 *
 *   1. Entities ("hook" to "attrs-in"), after thinking-in-entities.mdx: it
 *      opens on Unit 1's bridge (a design starts by naming the things the
 *      data is about), circles the nouns of "Customers place orders for
 *      products", tests them with "can there be many of these?", turns a
 *      status into a fact about an order, and maps an entity type to a table
 *      and one real thing to a row.
 *   2. Attributes and domains ("attributes" to "erd-in"), after
 *      attributes-and-domains.mdx: facts become columns, every column has a
 *      domain, plain text takes anything, a CHECK narrows it and Postgres
 *      refuses "banana", a domain is a claim about the world, one value per
 *      cell, and when a fact is an entity of its own.
 *   3. Entity-relationship diagrams ("chen" to "next"), after
 *      entity-relationship-diagrams.mdx: Chen's 1976 model, the three pieces,
 *      the PK and FK markers (the foreign key is what the line stands for),
 *      reading the customers-orders line, and what its two ends mean: each
 *      counts the box it touches, two bars exactly one, a circle and a
 *      crow's foot zero or many (components/crowsfoot.ts draws them so). It
 *      ends on Unit 3's question: the lines carry as much meaning as the
 *      boxes.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every row, type, key and message on screen is what PGlite 0.5.8
 * (PostgreSQL 18.3) returned for the lessons' own SQL, run by check.mjs into
 * results.json, which data.ts reads:
 *   - thinking-in-entities: customers holds 1 Ada and 2 Grace; products holds
 *     10 Notebook 8.50 and 11 Pen 1.25, and only products has a price.
 *   - attributes-and-domains: orders is id integer, status text, total_cents
 *     integer, placed_on date, with rows 1 pending 2599 2025-01-10 and
 *     2 paid 1200 2025-01-11. With status as plain text, the four spellings
 *     the lesson names (sent, shipped, SHIP, done) all go in, four distinct
 *     values; against the lesson's CHECK only "shipped" does. Status
 *     "banana" is refused by orders_status_check (SQLSTATE 23514), a total of
 *     -5 by orders_total_cents_check.
 *   - The VARCHAR(20) claim: char_length('Johann Sebastian Bach') is 21, and
 *     inserting it into a VARCHAR(20) column fails with "value too long for
 *     type character varying(20)" (22001). The name is the composer's as it
 *     is usually written (Encyclopaedia Britannica, "Johann Sebastian Bach").
 *   - The packed cell '555-1111, 555-2222': searching phone_numbers for
 *     '555-2222' returns no rows; one number per row, the same search returns
 *     one.
 *   - entity-relationship-diagrams: customers is id integer (primary key),
 *     name text, email text (unique, customers_email_key, marked UK as the
 *     lesson's first diagram marks it); orders is id integer (primary key), customer_id
 *     integer (foreign key to customers.id, NOT NULL), placed_on date, status
 *     text. The line's ends, tried: a customer with no orders goes in (zero),
 *     a second order for Ada goes in (many), an order with no customer is
 *     refused (exactly one).
 *   - Historical: Peter Pin-Shan Chen, "The Entity-Relationship Model:
 *     Toward a Unified View of Data", ACM Transactions on Database Systems
 *     1(1), March 1976, pp. 9 to 36 (doi:10.1145/320434.320440), as the
 *     lesson dates it. "Say what the data means before deciding how to store
 *     it" is the lesson's summary of the paper, whose abstract proposes a
 *     model that "incorporates some of the important semantic information
 *     about the real world".
 *   - The claims without a number are the lessons' own: nouns are candidate
 *     entities; can there be many of these; a status describes an order;
 *     constrain what you control (statuses, roles, codes) and be humble about
 *     what the outside world sends (names, addresses); atomic values; an
 *     address becomes an entity when a customer has many. What each type
 *     holds ("whole numbers", "any text at all", "calendar dates") is the
 *     video's own gloss on integer, text and date.
 *
 * Written for Drew, the course's narrator: casual and curious, short spoken
 * sentences, questions the next line answers, contractions, numbers as words,
 * an ellipsis where a speaker would hold, at most two capitalised stresses and
 * no audio tags. "ER" is never said as letters: it is spelled out.
 */
export const script: NarrationScript = {
  id: "db-entities",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. Entities ──────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A design starts by naming the things your data is about. So take one sentence. Customers place orders for products.",
      pauseAfter: 0.4,
    },
    {
      id: "nouns",
      text: "Circle the nouns... customers, orders, products. Each one's a candidate entity, a kind of thing worth tracking.",
      pauseAfter: 0.4,
    },
    { id: "many", text: "Here's a test. Can there be many of these? Lots of customers, orders, products.", pauseAfter: 0.35 },
    { id: "status", text: "An order's status, though? That just describes an order. It's a fact, not a thing." },
    {
      id: "type",
      scene: true,
      text: "Now, an entity is a TYPE of thing. The type becomes a table, and each real one, a row.",
      pauseAfter: 0.7,
    },
    // Long enough for customers to glide aside before products arrives.
    { id: "ada", text: "Customers is the table. Ada is one row, because she's one real customer.", pauseAfter: 0.9 },
    { id: "apart", text: "Products get their own table. A product has a price... and a customer doesn't.", pauseAfter: 0.5 },
    { id: "attrs-in", text: "So what do you need to remember about each one?" },

    // ── Part 2. Attributes and domains ────────────────────────────────────
    {
      id: "attributes",
      scene: true,
      text: "Those facts are attributes. An order has a status, a total, and the date it was placed. Each becomes a column.",
      pauseAfter: 0.35,
    },
    {
      id: "domain",
      text: "And every column has a domain, the values it's allowed to hold. An integer holds whole numbers, a date holds calendar dates, and text holds any text at all.",
    },
    {
      id: "loose",
      scene: true,
      text: "Say status is just text. Then anything goes in. Sent, shipped, ship in capitals, done... which ones mean the same?",
      pauseAfter: 1.0,
    },
    {
      id: "narrow",
      text: "So narrow it. Four statuses, and no total below zero. Of the spellings we tried, only shipped gets in.",
      pauseAfter: 0.4,
    },
    // Held past the scene gap, so the error and the name's source can be read.
    { id: "banana", text: "And the status banana? Refused, with the name of the rule it broke.", pauseAfter: 2.0 },
    {
      id: "claims",
      scene: true,
      text: "But every rule like that is a claim. Cap a name at twenty characters, and you're claiming no name is longer. Johann Sebastian Bach is twenty-one.",
      pauseAfter: 0.45,
    },
    {
      id: "control",
      text: "So be strict about what you control, like statuses. Go easy on what the world sends you, like names.",
    },
    {
      id: "atomic",
      scene: true,
      text: "Keep one value per cell, too. Pack two phone numbers into one, and searching for either finds nothing.",
      pauseAfter: 1.0,
    },
    {
      id: "entity-or",
      text: "And a fact with details of its own, or lots of copies, like saved addresses? That's an entity too.",
      pauseAfter: 0.7,
    },
    { id: "erd-in", text: "Boxes and facts. Time to draw them." },

    // ── Part 3. Entity-relationship diagrams ──────────────────────────────
    {
      id: "chen",
      scene: true,
      // Part 3 is its own take, so each take holds whole parts.
      take: true,
      text: "In nineteen seventy-six, Peter Chen proposed the entity-relationship model: say what the data means before deciding how to store it.",
    },
    {
      id: "pieces",
      scene: true,
      text: "An entity-relationship diagram has three pieces. Boxes are entities, the facts inside are attributes, and lines are relationships.",
      pauseAfter: 0.35,
    },
    {
      id: "keys",
      text: "PK marks the primary key, the column that identifies each row. FK marks a foreign key: each order's customer ID holds the ID of the customer who placed it. That's what the line stands for.",
      pauseAfter: 0.8,
    },
    {
      id: "line",
      text: "Now read the line. One customer places zero or many orders, and each order belongs to exactly one customer. Each end counts the box it touches: two bars for exactly one, a circle and a crow's foot for zero or many.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "But look how much that one line said. Entities never live alone... the lines between them carry as much meaning as the boxes.",
    },
  ],
};
