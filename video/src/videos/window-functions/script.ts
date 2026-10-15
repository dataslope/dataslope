import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Why window functions exist" (16:9), after
 * content/courses/intro-sql-postgres/why-window-functions.mdx, with the OVER
 * clause from the-over-clause.mdx and the running total from running-totals.mdx
 * beside it. The six rows are the lesson's own `regional_sales` table, North
 * and South over the first three days (queries.ts).
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each checked by running the printed SQL in PGlite 0.5.8
 * (PostgreSQL 18.3) with check.mjs, which asserts every one of them and writes
 * the result tables in results.json that the scenes print:
 *   - the table holds six sales, two regions, three days;
 *   - `GROUP BY region` returns two rows: North 355, South 395;
 *   - `SUM(amount) OVER (PARTITION BY region)` returns all six rows, each
 *     carrying its region's total: 355 on the three North rows, 395 on South;
 *   - the first North sale, 120, is 33.8% of North, "about a third";
 *   - with `ORDER BY day` inside the window the sum runs up to the current
 *     row (no region has two sales on one day, so the default frame equals a
 *     ROWS frame, which check.mjs compares): North 120, 215, 355, then South
 *     restarts at 175, 305, 395.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "window-functions",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    { id: "rows", text: "Here are six sales, from two regions, over three days.", pauseAfter: 0.3 },
    { id: "ask", text: "Say you want each region's total.", pauseAfter: 0.5 },
    {
      id: "group",
      text: "GROUP BY gets you there, by folding each region's rows into one.",
      pauseAfter: 0.3,
    },
    {
      id: "lost",
      text: "Six rows go in, and two come out. The single sales are gone, so you can no longer compare one sale with its region.",
      pauseAfter: 0.6,
    },
    {
      id: "over",
      text: "A window function adds up the same rows, but keeps every one of them.",
      pauseAfter: 0.3,
    },
    {
      id: "partition",
      text: "SUM of amount, OVER PARTITION BY region, adds up the rows that share this row's region, and writes the total beside each one.",
      pauseAfter: 0.3,
    },
    {
      id: "same",
      text: "Three hundred fifty-five, on all three North rows. Nothing collapsed.",
      pauseAfter: 0.6,
    },
    {
      id: "share",
      text: "With the total on every row, a share is one division away. The first North sale is about a third of its region.",
      pauseAfter: 0.5,
    },
    {
      id: "order",
      text: "Now put ORDER BY day inside the window, and each sum stops at the current row.",
      pauseAfter: 0.3,
    },
    {
      id: "running",
      text: "That is a running total. North climbs to three hundred fifty-five, then South starts over at one hundred seventy-five.",
      pauseAfter: 0.6,
    },
    {
      id: "rule",
      text: "So GROUP BY gives you one row per group. A window function gives you every row, with its group beside it.",
    },
  ],
};
