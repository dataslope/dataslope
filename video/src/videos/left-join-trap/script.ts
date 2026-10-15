import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "The LEFT JOIN trap" (16:9), after
 * content/courses/intro-sql-postgres/outer-joins.mdx (and
 * understanding-joins.mdx): its customers and orders tables, cut to the first
 * four customers (Ada, Grace, Linus and Mae, ids 1 to 4) and every one of
 * their orders, with the lesson's ids and amounts unchanged. Its rule that a
 * LEFT JOIN keeps every left row and fills NULLs where nothing matches is
 * carried one step further, to a WHERE on a right-table column.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each run in PGlite 0.5.8 (PostgreSQL 18.3); every table on screen is
 * what it returned (data.ts):
 *   - Linus (3) and Mae (4) have no orders; Ada has orders 101, 102 and 130
 *     (42, 18 and 57), Grace 103 and 104 (99 and 15);
 *   - the LEFT JOIN returns seven rows, all four customers, with order_id and
 *     amount NULL for Linus and Mae;
 *   - adding `WHERE o.amount > 50` returns two rows, Ada's 130 and Grace's
 *     103: one order each, and no Linus or Mae;
 *   - `o.amount > 50` is false on 101, 102 and 104, true on 130 and 103, and
 *     NULL on Linus's and Mae's rows; `NULL::numeric > 50` is NULL;
 *   - `WHERE NULL` and `WHERE false` keep no row, `WHERE true` keeps it;
 *   - a plain `JOIN` with the same WHERE returns the same two rows;
 *   - moving the test into ON (`ON o.customer_id = c.id AND o.amount > 50`)
 *     returns four rows: Ada 130, Grace 103, and Linus and Mae with NULLs;
 *   - seven rows, then two, then four.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "left-join-trap",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "A LEFT JOIN promises to keep every row of its left table. One small filter can quietly break that promise.",
      pauseAfter: 0.45,
    },
    {
      id: "tables",
      text: "Here are four customers and their orders. Linus and Mae have never ordered.",
      pauseAfter: 0.45,
    },
    {
      id: "left",
      scene: true,
      text: "A LEFT JOIN keeps all four customers. Where no order matches, the order columns come back NULL.",
      pauseAfter: 0.6,
    },
    {
      id: "filter",
      scene: true,
      text: "Now say we only want orders over fifty. So we add a WHERE clause on the amount.",
      pauseAfter: 0.35,
    },
    {
      id: "vanish",
      text: "Ada and Grace keep one order each. But Linus and Mae have vanished.",
      pauseAfter: 0.5,
    },
    {
      id: "why",
      text: "Their amount is NULL, and NULL greater than fifty is not true. It is unknown. WHERE keeps only the rows where its condition is true.",
      pauseAfter: 0.4,
    },
    {
      id: "inner",
      text: "So this LEFT JOIN now returns exactly what an inner join would.",
      pauseAfter: 0.6,
    },
    { id: "fix", scene: true, text: "The fix is to move the condition into the ON clause.", pauseAfter: 0.3 },
    {
      id: "on",
      text: "There, it only decides which orders count as a match. All four customers come back, with NULLs where nothing matched.",
      pauseAfter: 0.6,
    },
    { id: "compare", scene: true, text: "Same data, three answers. Seven rows, then two, then four.", pauseAfter: 0.5 },
    {
      id: "rule",
      text: "So to keep every row on the left, filter the right table in ON, not in WHERE.",
    },
  ],
};
