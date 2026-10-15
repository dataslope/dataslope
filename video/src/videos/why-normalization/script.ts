import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Why normalize?" (16:9), after the shop example in
 * content/courses/database-design-postgresql/why-normalization.mdx: the same
 * three orders (Ada twice, Grace once), the same rushed update to order one,
 * and the same three anomalies. The price column is left out so the video
 * stays on the customer's facts, which is why two tables are enough here
 * where the lesson splits into three.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each run in PGlite (Postgres 18.3 in WASM) from a fresh database per
 * figure; every table on screen is what it returned (data.ts):
 *   - in orders_flat, ada@old.test is stored on two rows, orders 1 and 2;
 *   - `UPDATE ... WHERE order_id = 1` reports UPDATE 1, and afterwards Ada's
 *     rows carry ada@new.test and ada@old.test, with no error or warning;
 *   - inserting Alan with only a name and an email fails: null value in
 *     column "order_id" violates the not-null constraint;
 *   - Grace has one order, order 3; deleting it leaves no row that mentions
 *     her name or her email;
 *   - after the split, ada@old.test is stored on one row of customers, and
 *     orders.customer_id is a foreign key to customers;
 *   - the update changes one row, the insert of Alan succeeds with no order,
 *     and deleting order 3 leaves Grace in customers;
 *   - joining orders to customers gives back exactly orders_flat; after
 *     the three changes the join shows ada@new.test on two rows, while
 *     customers stores it on one.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "why-normalization",
  leadIn: 0.5,
  tail: 2.6,
  beats: [
    { id: "hook", text: "A shop keeps every order in one wide table.", pauseAfter: 0.3 },
    {
      id: "copies",
      text: "Each row repeats the customer's details, so Ada's email is stored twice.",
      pauseAfter: 0.4,
    },
    { id: "traps", text: "One fact in two places invites three traps, called anomalies.", pauseAfter: 0.6 },
    {
      id: "update",
      text: "First, the update anomaly. Ada changes her email, and a rushed update fixes only order one.",
      pauseAfter: 0.3,
    },
    {
      id: "disagree",
      text: "Now the table holds two emails for Ada, and nothing says which is right.",
      pauseAfter: 0.6,
    },
    { id: "insert", text: "Second, the insertion anomaly. Alan signs up but hasn't ordered yet.", pauseAfter: 0.3 },
    { id: "refused", text: "Every row here is an order, so a row with no order ID is refused.", pauseAfter: 0.6 },
    { id: "delete", text: "Third, the deletion anomaly. Grace cancels her only order.", pauseAfter: 0.3 },
    {
      id: "gone",
      text: "Delete that row, and her name and email go with it. The shop has forgotten Grace.",
      pauseAfter: 0.6,
    },
    { id: "split", text: "Normalization fixes all three by splitting the table in two.", pauseAfter: 0.3 },
    { id: "customers", text: "Customers stores each customer once.", pauseAfter: 0.25 },
    {
      id: "fk",
      text: "Orders keeps only a customer ID, a foreign key pointing at that customer's row.",
      pauseAfter: 0.3,
    },
    { id: "home", text: "Every fact now lives in exactly one place.", pauseAfter: 0.5 },
    {
      id: "fixed",
      text: "Ada's new email is a one-row update. Alan can sign up before ordering. And deleting Grace's order leaves Grace.",
      pauseAfter: 0.6,
    },
    {
      id: "join",
      text: "Need the wide view back? A join rebuilds it. Ada's email repeats in the result, but it is stored only once.",
    },
  ],
};
