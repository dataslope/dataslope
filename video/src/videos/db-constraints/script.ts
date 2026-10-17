import type { NarrationScript } from "../../narration/types";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Constraints" (16:9), Unit 6 of Database Design with
 * PostgreSQL: one video for the unit's five lessons, told as one argument in
 * six parts. The ideas only (why each constraint exists and what it stops,
 * shown with Postgres's own refusals); the DDL stays on the page.
 *
 *   1. Why constraints ("hook" to "types-in"), after what-are-constraints:
 *      many writers, one schema; a rule the database checks on every write;
 *      the error as the mistake caught at the door. It opens on Unit 5's
 *      bridge (keys guard the links; what guards what goes in them?).
 *   2. The first constraint ("type" to "null-in"), after choosing-data-types:
 *      a type is a domain; INTEGER refuses 'many'; NUMERIC is exact where a
 *      float is not.
 *   3. Required or optional ("null" to "unique-in"), after
 *      not-null-and-defaults: NULL is no value; must every row know this?;
 *      a default fills an omitted value, NOT NULL refuses a missing one.
 *   4. No repeats ("unique" to "check-in"), after unique-constraints: one
 *      email, one account; UNIQUE beside the primary key; a pair; UNIQUE on
 *      a foreign key makes one to one.
 *   5. Rules about values ("check" to "layers"), after check-constraints and
 *      choosing-data-types' "Types work with constraints": a true or false
 *      test per row; 'banana'; two columns compared; NULL slips past a
 *      CHECK, so a required price takes a type, a CHECK and NOT NULL.
 *   6. The bridge ("limits" to "next"): why-normalization's flat table, where
 *      every write passes every rule and Ada ends up with two emails.
 *      "Next: normalization."
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every statement, row, error message and constraint name on screen
 * was run in PGlite 0.5.8 (PostgreSQL 18.3 in WASM) by check.mjs, from a
 * fresh database per figure built from the lesson's own SQL, into
 * results.json, which data.ts reads:
 *   - what-are-constraints: 'Broken price' at -3.00 is refused, check
 *     constraint "products_price_check", and only Notebook (4.50) is stored.
 *   - choosing-data-types: 'many' into an INTEGER quantity is refused,
 *     invalid input syntax for type integer; 0.1 + 0.2 as double precision is
 *     0.30000000000000004 and "= 0.3" is false, as NUMERIC it is 0.3 and true.
 *   - not-null-and-defaults: omitting status stores 'active' (row 1, Ada);
 *     omitting email is refused, null value in column "email", failing row
 *     (2, null, active).
 *   - unique-constraints: 'ada@example.com' again (as 'ada_2') is refused,
 *     "accounts_email_key"; (1, 10) again is refused,
 *     "enrollments_student_id_course_id_key", while the video's own (1, 20)
 *     and (2, 10) are accepted; a second profile for user 1 is refused,
 *     "profiles_user_id_key" (the lesson's one-to-one ERD, run).
 *   - check-constraints: 'banana' is refused, "products_status_check";
 *     'Backwards conference' (2026-06-10 to 2026-06-08) is refused,
 *     "events_check"; with a CHECK alone, NULL >= 0 is null (unknown) and a
 *     product with no price is stored; with NOT NULL beside it, refused.
 *   - why-normalization (the bridge): the update of order 1 reports
 *     UPDATE 1, every constraint holds, and Ada's rows then hold two emails.
 *   - The writers (web app, mobile app, an import job, someone writing SQL by
 *     hand) are what-are-constraints' own list.
 *   - There are no historical claims: the choosing-data-types story of the
 *     Vancouver Stock Exchange's index is left on the page.
 *
 * Written for Drew's ear: casual, curious, short spoken sentences, no
 * symbols, numbers as words, contractions, questions the next sentence
 * answers, an ellipsis where a speaker would hold, two capitalized stresses
 * ("INTO", "TWO") and no audio tag. SQL keywords are spoken as words, in
 * lower case ("not null"), so the voice doesn't lean on them.
 */
export const script: NarrationScript = {
  id: "db-constraints",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  tail: 2.6,
  beats: [
    // ── Part 1. Why constraints ───────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Keys guard the links between your tables. But what guards what goes INTO them?",
      pauseAfter: 0.4,
    },
    { id: "bad", text: "Say a product gets saved at minus three dollars. That's not a sale... that's a mistake.", pauseAfter: 0.35 },
    { id: "app", text: "Your app could catch that. But a database rarely has just one writer.", pauseAfter: 0.3 },
    {
      id: "writers",
      text: "The web app, the mobile app, a nightly import, someone typing queries by hand. Each one has to remember the rule.",
      pauseAfter: 0.35,
    },
    { id: "forgets", text: "And it only takes one that forgets." },
    {
      id: "schema",
      scene: true,
      text: "So put the rule in the schema. That's a constraint: a rule the database checks on every write, whoever's writing.",
      pauseAfter: 0.35,
    },
    {
      id: "reject",
      text: "Price has to be zero or more. Try minus three... and Postgres refuses, naming the rule you broke.",
      pauseAfter: 0.35,
    },
    { id: "stored", text: "The bad row never lands. The notebook's still the only product.", pauseAfter: 0.4 },
    {
      id: "door",
      text: "That error isn't a failure. It's the mistake caught at the door, while it's still cheap to fix.",
      pauseAfter: 0.5,
    },
    { id: "types-in", text: "And every column has a rule before you add a single one." },

    // ── Part 2. The first constraint ──────────────────────────────────────
    {
      id: "type",
      scene: true,
      text: "Its type. Say quantity is an integer, and someone sends the word many.",
      pauseAfter: 0.3,
    },
    { id: "nan", text: "Refused. It isn't too big, or too small... it just isn't a number.", pauseAfter: 0.35 },
    {
      id: "domain",
      text: "A type decides which values can exist at all. So pick it from what the value means.",
      pauseAfter: 0.4,
    },
    { id: "money-in", text: "And for money, that choice matters more than you'd think." },
    {
      id: "money",
      scene: true,
      text: "Add ten cents and twenty cents as floats, then ask Postgres if that's thirty cents.",
      pauseAfter: 0.4,
    },
    {
      id: "false",
      text: "False! A float is approximate, so you get point three, a long run of zeros, and a four.",
      pauseAfter: 0.35,
    },
    { id: "exact", text: "Numeric is exact, so there the answer's true. That's the honest type for a price.", pauseAfter: 0.5 },
    { id: "null-in", text: "So the value's the right kind. But does it have to be there at all?" },

    // ── Part 3. Required or optional ──────────────────────────────────────
    {
      id: "null",
      scene: true,
      text: "In a database, a missing value is null. Not zero, not an empty string... no value at all.",
      pauseAfter: 0.35,
    },
    { id: "ask", text: "So for every column, ask: does every row have to know this?", pauseAfter: 0.4 },
    {
      id: "default",
      text: "An account's status has a safe fallback, so it gets a default. Leave it out, and the row comes back active.",
      pauseAfter: 0.35,
    },
    {
      id: "email",
      text: "But an account with no email makes no sense. So email is marked not null, and an insert without one is refused.",
      pauseAfter: 0.5,
    },
    { id: "unique-in", text: "Now every account has an email. But could two of them share one?" },

    // ── Part 4. No repeats ────────────────────────────────────────────────
    {
      id: "unique",
      scene: true,
      text: "Ada signs up. Then a second account tries her email, with a new username.",
      pauseAfter: 0.3,
    },
    { id: "dup", text: "Duplicate key, refused. One email, one account.", pauseAfter: 0.4 },
    {
      id: "many",
      text: "The primary key already keeps rows distinct. Unique guards everything else that can't repeat.",
      pauseAfter: 0.4,
    },
    { id: "pair-in", text: "It even works on pairs." },
    {
      id: "pair",
      scene: true,
      text: "A student takes many courses, and a course has many students. So both IDs repeat... but each pair only once.",
      pauseAfter: 0.35,
    },
    { id: "again", text: "Enroll student one in course ten a second time, and it bounces.", pauseAfter: 0.4 },
    {
      id: "oneone",
      text: "Put unique on a foreign key, and each user gets at most one profile. That's one to one.",
      pauseAfter: 0.5,
    },
    { id: "check-in", text: "That covers missing and repeated. What about values that are just wrong?" },

    // ── Part 5. Rules about values ────────────────────────────────────────
    {
      id: "check",
      scene: true,
      text: "That's a check: a true or false test that every row has to pass. Price zero or more was one.",
      pauseAfter: 0.3,
    },
    { id: "banana", text: "Status has to be draft, active, or archived. So banana? Nope.", pauseAfter: 0.4 },
    {
      id: "dates",
      text: "It can compare columns, too. An event can't end before it starts, so this backwards conference never gets in.",
      pauseAfter: 0.5,
    },
    {
      id: "unknown",
      scene: true,
      text: "One catch, though. A check only refuses false. Leave the price out, and the test comes back unknown... so the row slips through.",
      pauseAfter: 0.4,
    },
    {
      id: "layers",
      text: "That's why a required price gets three rules. Numeric for its type, a check for its range, and not null, so it's actually there.",
    },

    // ── Part 6. The bridge ────────────────────────────────────────────────
    { id: "limits", scene: true, text: "But some mistakes pass every rule.", pauseAfter: 0.3 },
    {
      id: "twice",
      text: "Copy a customer's email onto every one of her orders, then update just one.",
      pauseAfter: 0.35,
    },
    { id: "valid", text: "Every value is valid... and the table now gives Ada TWO emails.", pauseAfter: 0.7 },
    {
      id: "next",
      text: "Constraints stop bad values, not bad structure. One fact stored twice can still disagree with itself.",
    },
  ],
};
