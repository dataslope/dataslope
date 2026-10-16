import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Relationship patterns" (16:9), Unit 5 of Database Design
 * with PostgreSQL, registered in Root.tsx as `DbDesign-5-RelationshipPatterns`.
 * One argument in five parts, after the unit's five lessons
 * (content/courses/database-design-postgresql/):
 *
 *   0. The shapes ("shapes" to "first-in"): opens on Unit 4's bridge, that
 *      with keys every shape a relationship takes can be built, and names
 *      the four.
 *   1. One to many ("many" to "cross-in"), after one-to-many.mdx: reading
 *      the line's ends, the list-in-a-cell that fails, the foreign key on the
 *      many side, and the repetition that is the relationship.
 *   2. Many to many ("cross" to "named"), after many-to-many.mdx: links that
 *      cross, the one slot that cannot hold them from either side, and the
 *      third table that resolves them into two one-to-manys.
 *   3. Junction tables ("pair" to "one-in"), after junction-tables.mdx: the
 *      pair as the primary key, its challenge's duplicate insert refused, and
 *      a grade as a fact about the pairing.
 *   4. One to one ("wide" to "self-in"), after one-to-one.mdx: the optional
 *      profile split off, the foreign key on the dependent side, and UNIQUE
 *      as what makes it one to one.
 *   5. Self-reference ("self" to "next"), after
 *      self-referencing-relationships.mdx: the manager who is an employee,
 *      the hierarchy in one column, the self-join, and what the foreign key
 *      does not check. It ends on Unit 6's bridge: keys guard the links,
 *      constraints guard what goes in them.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every row, count, key and error is what PGlite 0.5.8 (PostgreSQL
 * 18.3) returned when check.mjs ran each lesson's own initSql and
 * starterCode, read out of the MDX, into results.json, which data.ts reads:
 *   - one-to-many, "Customers and their orders": 24 customers, 30 orders;
 *     Ada (id 1) placed orders 1 and 25, "one and twenty-five", so the
 *     lesson's bad idea would store "1, 25" in one cell, and her next order
 *     (id 31) would make it "1, 25, 31"; orders 1 and 25 both store
 *     customer_id 1, "Ada's shows up twice"; the lesson's join returns Ada
 *     on its first two rows.
 *   - many-to-many, "Resolving students and courses": Ada takes Math (10)
 *     and History (11), Grace Math and Art (12), Linus History and Biology
 *     (13); 48 enrollments, one per pairing.
 *   - junction-tables: the challenge "Enroll Linus in Math" (3, 10) inserts
 *     one row, taking the table from 48 to 49, "row forty-nine"; the same
 *     insert again fails with 23505, duplicate key value violates unique
 *     constraint "enrollments_pkey", Key (student_id, course_id)=(3, 10)
 *     already exists. Grades: Ada B in Math, C in History; Grace C in Math.
 *   - one-to-one, "A unique foreign key enforces one-to-one": 24 users, 15
 *     profiles, 9 users with none, Linus (id 3) among them; a second profile
 *     for Ada fails with 23505 on "user_profiles_user_id_key", Key
 *     (user_id)=(1) already exists, and the same insert into a copy of the
 *     table without UNIQUE succeeds, leaving Ada two profiles.
 *   - self-referencing-relationships, "Employees and their managers": Ada
 *     (CEO) has manager_id NULL; Grace and Linus report to Ada, Mina to
 *     Grace; the longest chain is Ada, Grace, Priya, Zara, Chidi (an
 *     intern), five levels; the lesson's LEFT JOIN keeps Ada with a NULL
 *     manager; UPDATE employees SET manager_id = 1 WHERE id = 1 is accepted
 *     (UPDATE 1), and the self-join then gives Ada as her own manager.
 *   - The claims without a number are the lessons' own: the one side's
 *     exactly-one and the many side's zero-or-many ends; a list in a cell is
 *     hard to validate and needs the parent edited for every new order; the
 *     repetition "is the relationship itself"; one foreign key forces one
 *     side to be one; the junction table "names the relationship itself";
 *     relationship attributes belong on the junction row; the foreign key
 *     goes on the dependent or optional side; a self foreign key proves the
 *     parent exists but does not stop a row pointing at itself.
 *   - There are no historical or real-world claims to source.
 *
 * Written for Drew (casual, curious and fun, the voice CPointers uses):
 * short spoken sentences, no symbols or parentheses, numbers as words,
 * contractions, questions the next sentence answers, an ellipsis where a
 * speaker would hold, one capitalised stress and no audio tag. Column names
 * are said as words ("customer ID").
 */
export const script: NarrationScript = {
  id: "db-relationship-patterns",
  voice: "drew",
  // Room for the series intro (SeriesIntro, INTRO_SECONDS) before the first word.
  leadIn: 4.6,
  tail: 2.6,
  beats: [
    // ── 0. The shapes ─────────────────────────────────────────────────────
    {
      id: "shapes",
      scene: true,
      text: "With keys, one row can point at another. And those links only come in a few shapes.",
      pauseAfter: 0.35,
    },
    {
      id: "names",
      text: "One to many. Many to many. One to one. And the odd one out... a table that points at itself.",
      pauseAfter: 0.35,
    },

    // ── 1. One to many ────────────────────────────────────────────────────
    {
      id: "many",
      scene: true,
      text: "A customer can place lots of orders, but each order belongs to just one customer.",
      pauseAfter: 0.35,
    },
    {
      id: "ends",
      text: "Two bars by customers mean exactly one. A crow's foot and a circle by orders mean zero or many.",
      pauseAfter: 0.35,
    },
    { id: "where-in", text: "So which table holds the link?" },
    {
      id: "list",
      scene: true,
      text: "Not customers. Ada's orders, one and twenty-five, would have to share one cell.",
      pauseAfter: 0.35,
    },
    {
      id: "cell",
      text: "Nothing can check a list like that, and every new order means editing Ada's row.",
      pauseAfter: 0.35,
    },
    {
      id: "fk",
      text: "So the foreign key goes on the many side. Each order stores one customer ID, and Ada's shows up twice.",
      pauseAfter: 0.35,
    },
    { id: "repeat", text: "That repetition isn't duplication. It IS the relationship.", pauseAfter: 0.6 },
    { id: "cross-in", text: "But what if both sides can have many?" },

    // ── 2. Many to many ───────────────────────────────────────────────────
    {
      id: "cross",
      scene: true,
      text: "A student takes lots of courses, and a course has lots of students. Ada takes Math and History. Grace takes Math and Art.",
      pauseAfter: 0.35,
    },
    { id: "tangle", text: "The links cross, because neither side is the parent.", pauseAfter: 0.4 },
    {
      id: "slot",
      text: "Give students a course ID, and Ada's row has room for one. Math fits... so where does History go?",
      pauseAfter: 0.35,
    },
    { id: "flip", text: "Flip it, and Math has room for one student. Where does Grace go?", pauseAfter: 0.4 },
    { id: "one-side", text: "One foreign key always forces one side to be one." },
    {
      id: "pairing",
      scene: true,
      text: "So give every pairing its own row, in a third table: enrollments.",
      pauseAfter: 0.35,
    },
    {
      id: "rows",
      text: "Ada in Math is a row, Ada in History another, each with two foreign keys.",
      pauseAfter: 0.35,
    },
    {
      id: "two",
      text: "So the tangle becomes two plain one-to-manys.",
      pauseAfter: 0.35,
    },
    { id: "named", text: "That's a junction table. It's not a hack... it gives the relationship a name." },

    // ── 3. Junction tables ────────────────────────────────────────────────
    {
      id: "pair",
      scene: true,
      text: "And the pair of keys is the row's identity: student and course, together, make the primary key.",
      pauseAfter: 0.35,
    },
    {
      id: "once",
      text: "Enroll Linus in Math, and that's row forty-nine. Try it again? Postgres says no: that key already exists.",
    },
    {
      id: "grade",
      scene: true,
      text: "The row can hold facts of its own, too, like a grade. Not on students, though: Ada got a B in Math and a C in History.",
      pauseAfter: 0.35,
    },
    { id: "course", text: "Not on courses either: Math gave Ada a B, and Grace a C.", pauseAfter: 0.4 },
    {
      id: "belongs",
      text: "It belongs to Ada in Math, on the pairing's own row.",
      pauseAfter: 0.35,
    },
    { id: "one-in", text: "The next shape splits one thing in two." },

    // ── 4. One to one ─────────────────────────────────────────────────────
    {
      id: "wide",
      scene: true,
      text: "Say a users table starts collecting profile details, like a display name and a bio.",
      pauseAfter: 0.35,
    },
    {
      id: "empty",
      text: "Lots of users, like Linus, never fill them in.",
      pauseAfter: 0.35,
    },
    {
      id: "split",
      text: "So the profile moves to its own table. Each user has zero or one, and each profile belongs to exactly one user.",
      pauseAfter: 0.35,
    },
    { id: "side", text: "The foreign key goes on the profile, the side that can't exist alone." },
    {
      id: "unique",
      scene: true,
      text: "But a foreign key alone won't keep it to one. It'll happily take a second profile for Ada.",
      pauseAfter: 0.35,
    },
    {
      id: "unique-fix",
      text: "Make that user ID unique, and the second one bounces. That's what makes it one to one.",
      pauseAfter: 0.5,
    },
    { id: "self-in", text: "The last shape needs only one table." },

    // ── 5. Self-reference ─────────────────────────────────────────────────
    {
      id: "self",
      scene: true,
      text: "An employee has a manager, and the manager's an employee too. So the foreign key points back into its own table.",
      pauseAfter: 0.35,
    },
    {
      id: "tree",
      text: "Ada's the CEO, with no manager. Grace reports to Ada, and Mina reports to Grace.",
      pauseAfter: 0.35,
    },
    {
      id: "deep",
      text: "Each row stores only its own manager, and the chain runs as deep as it needs: five levels here, down to an intern.",
    },
    {
      id: "alias",
      scene: true,
      text: "To read it, join the table to itself, as employee and as manager. A left join keeps Ada, with no manager.",
      pauseAfter: 0.45,
    },
    {
      id: "guard",
      text: "But a foreign key only checks that the manager exists. So what if Ada manages... Ada?",
      pauseAfter: 0.35,
    },
    { id: "accepted", text: "Postgres takes it. One row updated.", pauseAfter: 0.7 },
    { id: "next", text: "Keys guard the links between tables. To guard what goes in them, you need constraints." },
  ],
};
