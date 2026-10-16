import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Keys and integrity" (16:9), Unit 4 of Database Design with
 * PostgreSQL: one video for the whole unit, in four parts, each after one
 * lesson in content/courses/database-design-postgresql/:
 *
 *   1. Primary keys ("hook" to "kinds-in"), after primary-keys.mdx: the two
 *      Taylor Kims, the key's two guarantees, the roster's composite key, and
 *      why a key should almost never change.
 *   2. Natural or surrogate ("kinds" to "fk-in"), after
 *      natural-vs-surrogate-keys.mdx: the two kinds, the 1938 wallet card, a
 *      natural key that has to change, and email kept unique but not the key.
 *   3. Foreign keys ("fk" to "ri-in"), after foreign-keys.mdx: the column
 *      that holds another table's key, parent and child, the many side, no
 *      copied details, and the order for a customer who doesn't exist.
 *   4. Referential integrity ("delete" to "next"), after
 *      referential-integrity.mdx: RESTRICT, CASCADE and SET NULL, how to
 *      choose, and ON UPDATE.
 *
 * It opens on Unit 3's bridge (a line between two rows needs a name nothing
 * else shares: "how do you say WHICH row?") and ends on Unit 5's: with keys,
 * every shape a relationship takes can be built. DDL syntax, practice and
 * quizzes stay on the page.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every statement on screen ran in PGlite 0.5.8 (PostgreSQL 18.3 in
 * WASM) from a fresh database per figure, by check.mjs into results.json,
 * which data.ts reads; every error is Postgres's own text:
 *   - "nokey": with no key, two identical ('Taylor Kim', 'Portland') rows
 *     both go in (INSERT 0 1, twice: "it'll store the same row twice"), and
 *     the coffee-beans order joined on the name matches 2 customers ("can't
 *     tell").
 *   - "taylors": the lesson's customers 101 and 102, both Taylor Kim in
 *     Portland; the order holding 101 joined on the key matches 1.
 *   - "duplicate", the lesson's block: Grace as customer 1 fails with 23505,
 *     duplicate key value violates unique constraint "customers_pkey", Key
 *     (customer_id)=(1) already exists ("Key one already exists"); Grace with
 *     no id fails with 23502, not-null ("refused again"); Ada stays alone.
 *   - "composite": (7, 42), (7, 43) and (8, 42) go in ("student seven takes
 *     two courses, and course forty-two has two students"); (7, 42) again
 *     fails, Key (student_id, course_id)=(7, 42) already exists.
 *   - "countries": the lesson's natural key, 'JP' for Japan.
 *   - "identity", the lesson's GENERATED ALWAYS AS IDENTITY block: Ada
 *     Lovelace and Grace Hopper come back as customer_id 1 and 2 ("a number
 *     the database makes up").
 *   - "natural": with email as the key and an order holding
 *     ada@old.example, changing it fails with 23503, Key
 *     (email)=(ada@old.example) is still referenced from table "orders"
 *     ("Postgres refuses: her order still points at the old one").
 *   - "surrogate": keyed on user_id 10 (the lesson's users.user_id = 10),
 *     with email UNIQUE, the same change is UPDATE 1 and the order still
 *     holds 10 ("the change just goes through").
 *   - "orphan", the lesson's block: order 101 for customer 1 is INSERT 0 1;
 *     order 102 for customer 99 fails with 23503 on
 *     "orders_customer_id_fkey", Key (customer_id)=(99) is not present in
 *     table "customers".
 *   - "restrict", the lesson's block: deleting account 1 (Ada Co, invoice
 *     100 for 250.00) fails with 23001, violates RESTRICT setting of foreign
 *     key constraint "invoices_account_id_fkey"; both rows stay.
 *   - "cascade", the lesson's challenge: DELETE 1 on post 1 removes comments
 *     10 and 11 and leaves 12 ("BOTH its comments go too").
 *   - "setnull": deleting employee 3, Sam, keeps ticket 500 with
 *     assigned_employee_id NULL ("assigned to no one"). Sam and ticket 500
 *     are the video's own rows: the lesson describes this case ("a support
 *     ticket whose assigned employee left") without giving any.
 *   - Run and not shown: "setnullNotNull" (on a NOT NULL column the same
 *     delete fails with 23502, the lesson's quick check), "drafts" (the
 *     lesson's CASCADE half) and "noaction" (plain REFERENCES refuses the
 *     delete too).
 *   - Without a number: the CASCADE, SET NULL and RESTRICT examples in the
 *     closing scene are the lesson's own (comments on a deleted draft, items
 *     in a temporary cart; a support ticket whose employee left; invoices,
 *     payments, orders that keep their customer).
 *
 * History, part 2: the Social Security Administration's history page
 * "Social Security Cards Issued by Woolworth"
 * (https://www.ssa.gov/history/ssn/misused.html), and Snopes' summary of it
 * (https://www.snopes.com/business/taxes/woolworth.asp): in 1938 the E. H.
 * Ferree company of Lockport, New York put a sample card in its wallets,
 * printed with the real number of Hilda Schrader Whitcher, a secretary at
 * the company; at the peak, in 1943, 5,755 people were using it ("by
 * nineteen forty-three, over five thousand"); SSA voided the number and gave
 * her a new one ("the permanent one got cancelled"). The sample was a
 * printed specimen (half size, in red, marked "specimen"), not a real card,
 * so the video says "a sample card" carrying "a real person's number".
 *
 * Written for Drew's ear: casual and curious, short spoken sentences, no
 * symbols or parentheses, numbers as words ("one oh one"), contractions,
 * questions the next sentence answers, an ellipsis where he'd hold, two
 * capitalised stresses (WHICH, BOTH) and no audio tags. SQL keywords are
 * said as words: "restrict", "cascade", "set null".
 */
export const script: NarrationScript = {
  id: "db-keys",
  voice: "drew",
  // Room for the series intro (SeriesIntro, INTRO_SECONDS) before the first word.
  leadIn: 4.6,
  tail: 2.6,
  beats: [
    // ── Part 1. Primary keys ──────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every line between two tables ends on a row. So how do you say WHICH row?",
      pauseAfter: 0.35,
    },
    {
      id: "taylors",
      text: "Two customers named Taylor Kim, both in Portland. An order for coffee beans says Taylor Kim. Which one?",
      pauseAfter: 0.6,
    },
    { id: "blink", text: "With no key, Postgres can't tell. It'll store the same row twice.", pauseAfter: 0.35 },
    { id: "ids", text: "A primary key fixes that: customer one oh one, and customer one oh two." },

    {
      id: "rules",
      scene: true,
      text: "And Postgres holds a key to two rules: unique, and never null.",
      pauseAfter: 0.3,
    },
    {
      id: "dup",
      text: "Customer one is Ada. Add Grace as customer one too, and it's refused. Key one already exists.",
      pauseAfter: 0.4,
    },
    {
      id: "null",
      text: "Leave the ID off? Refused again. No pointer can mean maybe this one, maybe that one.",
    },

    {
      id: "roster",
      scene: true,
      text: "A key can be two columns. In a roster, student seven takes two courses, and course forty-two has two students.",
      pauseAfter: 0.3,
    },
    {
      id: "pair",
      text: "Neither ID is unique, but the pair is: seven in forty-two, only once.",
      pauseAfter: 0.4,
    },
    { id: "stable", text: "And a key should almost never change, because other tables point at it.", pauseAfter: 0.3 },
    { id: "kinds-in", text: "So what should a key be?" },

    // ── Part 2. Natural or surrogate ──────────────────────────────────────
    {
      id: "kinds",
      scene: true,
      text: "A natural key is a value the thing already has, like a country code. See J P, and you know it's Japan.",
      pauseAfter: 0.35,
    },
    {
      id: "surrogate",
      text: "A surrogate key is a number the database makes up, just to name the row. It means nothing... on purpose.",
    },

    {
      id: "wallet",
      scene: true,
      text: "Why bother? In nineteen thirty-eight, a wallet maker in Lockport, New York, put a sample Social Security card in every wallet.",
      pauseAfter: 0.3,
    },
    {
      id: "real",
      text: "It carried a real person's number, and buyers adopted it. By nineteen forty-three, over five thousand people were using it.",
      pauseAfter: 0.4,
    },
    {
      id: "broke",
      text: "One unique number, shared by thousands, and the permanent one got cancelled. A natural key bets on promises you don't control.",
    },

    {
      id: "email",
      scene: true,
      text: "It goes wrong quietly, too. Make email the key, and when Ada changes hers, Postgres refuses: her order still points at the old one.",
      pauseAfter: 0.4,
    },
    {
      id: "user-ten",
      text: "Make her user ten instead, and the change just goes through. Keep email unique, just not the key.",
      pauseAfter: 0.3,
    },
    { id: "fk-in", text: "So a key names a row. Now, let's point at one." },

    // ── Part 3. Foreign keys ──────────────────────────────────────────────
    {
      id: "fk",
      scene: true,
      text: "An order belongs to a customer, so it stores the customer's key, in customer ID. That's a foreign key.",
      pauseAfter: 0.3,
    },
    {
      id: "parent",
      text: "The table it points at is the parent. The one holding the pointer is the child.",
      pauseAfter: 0.3,
    },
    { id: "many", text: "It lives on the many side, and it copies nothing else. Just the ID." },

    {
      id: "defend",
      scene: true,
      text: "Postgres checks that line. An order for customer one goes right in.",
      pauseAfter: 0.35,
    },
    {
      id: "ninety",
      text: "Customer ninety-nine doesn't exist, so that order's rejected. It would've been an orphan, a child whose parent isn't there.",
      pauseAfter: 0.4,
    },
    { id: "ri-in", text: "But what happens when a parent leaves?" },

    // ── Part 4. Referential integrity ─────────────────────────────────────
    {
      id: "delete",
      scene: true,
      text: "Referential integrity means every pointer points at something real. So deleting a parent forces a choice.",
      pauseAfter: 0.35,
    },
    {
      id: "restrict",
      text: "Restrict blocks it. Ada Co still has an invoice, so the account stays.",
      pauseAfter: 0.35,
    },
    {
      id: "cascade",
      text: "Cascade takes the children along. Delete the spam post, and BOTH its comments go too.",
      pauseAfter: 0.35,
    },
    {
      id: "setnull",
      text: "And set null keeps the child but clears the pointer. Sam leaves, and his ticket stays, assigned to no one.",
    },

    {
      id: "choose",
      scene: true,
      text: "So which? Ask what the child means without its parent. Nothing? Cascade. Can it stand alone? Set null. A record you must keep? Restrict.",
      pauseAfter: 0.4,
    },
    {
      id: "update",
      text: "Changing a parent's key asks the same question... one more reason to pick a key that never changes.",
      pauseAfter: 0.7,
    },
    { id: "next", text: "And with keys to point with, you can build every shape a relationship takes." },
  ],
};
