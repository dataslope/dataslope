import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "The NULL trap" (16:9), after
 * content/courses/intro-sql-postgres/working-with-null.mdx: its customers
 * table (the first four rows of the lesson's own initSql, so Ada, Grace,
 * Linus and Mae keep the SERIAL ids 1 to 4), its three-valued logic and its
 * rule that `WHERE` keeps only the rows where the condition is true, carried
 * one step further, to `NOT IN` over a subquery that yields a `NULL`.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each run in PGlite 0.5.8 (PostgreSQL 18.3); every table on screen is
 * what it returned (data.ts):
 *   - with orders for customers 1 and 3 and one order whose customer_id is
 *     NULL, `WHERE id NOT IN (SELECT customer_id FROM orders)` returns zero
 *     rows, and raises no error;
 *   - Grace (2) and Mae (4) have no order: a LEFT JOIN finds exactly them;
 *   - `2 <> 1` is true, `2 <> 2` false, `2 <> NULL` NULL (unknown);
 *   - `WHERE true` keeps its row; `WHERE false` and `WHERE 2 <> NULL` keep
 *     none;
 *   - `2 NOT IN (1, 3, NULL)` and `2 <> 1 AND 2 <> 3 AND 2 <> NULL` are both
 *     NULL; the PostgreSQL manual calls the value-list `NOT IN` "a shorthand
 *     notation" for exactly that chain of `<>` joined by AND;
 *   - `true AND NULL` is NULL and `false AND NULL` is false, so an AND chain
 *     holding an unknown is false or unknown, never true;
 *   - per customer the chain gives Ada false, Grace unknown, Linus false and
 *     Mae unknown, and `id NOT IN (subquery)` gives the same four values;
 *   - `NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`
 *     returns Grace and Mae, and its EXISTS is true or false for every
 *     customer, never NULL;
 *   - adding `WHERE customer_id IS NOT NULL` to the subquery also returns
 *     Grace and Mae.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "sql-null-trap",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "Which customers have never placed an order? This query looks right.",
      pauseAfter: 0.35,
    },
    {
      id: "expect",
      text: "Grace and Mae never ordered, so we expect two names. Postgres returns no rows, and raises no error.",
      pauseAfter: 0.4,
    },
    {
      id: "culprit",
      text: "The cause is one guest order with no account. Its customer id is NULL.",
      pauseAfter: 0.6,
    },
    {
      id: "three",
      text: "SQL logic has three values. True, false, and unknown.",
      pauseAfter: 0.3,
    },
    {
      id: "compare",
      text: "Any comparison with NULL is unknown. Is two different from NULL? Nobody knows.",
      pauseAfter: 0.3,
    },
    {
      id: "where",
      text: "And WHERE keeps a row only when its condition is true. False and unknown are both dropped.",
      pauseAfter: 0.6,
    },
    {
      id: "expand",
      text: "Now, NOT IN is shorthand. For Grace, it means two is not one, and two is not three, and two is not NULL.",
      pauseAfter: 0.3,
    },
    {
      id: "chain",
      text: "True, and true, and unknown. With one unknown in an AND chain, the result can never be true.",
      pauseAfter: 0.4,
    },
    {
      id: "every",
      text: "Ada and Linus come out false, because they placed orders. Grace and Mae come out unknown. Not one row is true.",
      pauseAfter: 0.6,
    },
    {
      id: "exists",
      text: "One fix is NOT EXISTS, which only ever answers yes or no.",
      pauseAfter: 0.3,
    },
    {
      id: "filter",
      text: "The other is to filter the NULLs out of the subquery. Both return Grace and Mae.",
      pauseAfter: 0.6,
    },
    {
      id: "rule",
      text: "So when a query returns fewer rows than you expect, ask what happened to the unknowns.",
    },
  ],
};
