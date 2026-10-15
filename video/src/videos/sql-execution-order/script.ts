import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "SQL doesn't run in the order you write it", after
 * content/courses/intro-sql-postgres/query-execution-order.mdx.
 *
 * Every animation in this video is cued to a word below (see Video.tsx), so
 * edit freely: a cue whose word disappears throws in the Studio rather than
 * silently drifting. Facts checked against PostgreSQL (via PGlite) with the
 * exact data in data.ts: the query returns cy 125 and ben 105, and both
 * `WHERE total > 50` and `HAVING total > 50` fail with
 * `column "total" does not exist`.
 *
 * Written to be spoken: no symbols, no parentheses, numbers as a reader
 * would say them. "SQL" and "Postgres" are best pinned in an ElevenLabs
 * pronunciation dictionary rather than respelled here, so captions stay
 * readable.
 */
export const script: NarrationScript = {
  id: "sql-execution-order",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    { id: "hook", text: "Here's a SQL fact that trips up almost everyone.", pauseAfter: 0.5 },
    { id: "written", text: "You write a query starting with SELECT." },
    { id: "not-there", text: "But Postgres doesn't start there.", pauseAfter: 0.45 },
    {
      id: "reorder",
      text: "Logically, it starts with FROM. SELECT doesn't run until step five, and LIMIT runs last.",
      pauseAfter: 0.5,
    },
    { id: "trace-intro", text: "Watch each step hand its result to the next." },
    { id: "from", text: "FROM gathers the rows: ten orders." },
    { id: "where", text: "WHERE filters single rows. Anything twenty or under is gone." },
    { id: "group-by", text: "GROUP BY sorts what's left into one group per customer." },
    {
      id: "having",
      text: "HAVING filters whole groups. Dee only adds up to thirty, under fifty, so Dee is out.",
    },
    {
      id: "select",
      text: "Only now does SELECT run. It adds up each group and names the result total.",
    },
    { id: "order-by", text: "ORDER BY sorts by total,", pauseAfter: 0.15 },
    { id: "limit", text: "and LIMIT keeps the top two.", pauseAfter: 0.7 },
    { id: "error-setup", text: "Now the classic error. Try filtering on total in WHERE,", pauseAfter: 0.15 },
    { id: "error", text: "and Postgres says column total does not exist.", pauseAfter: 0.45 },
    {
      id: "why",
      text: "And at that point, it's right. WHERE runs at step two, and total isn't named until step five.",
      pauseAfter: 0.5,
    },
    {
      id: "fix",
      text: "Since total is a sum, the filter belongs in HAVING, with the sum written out in full.",
    },
    {
      id: "order-ok",
      text: "ORDER BY total works fine, though, because ORDER BY runs after SELECT.",
      pauseAfter: 0.5,
    },
    {
      id: "rule",
      text: "So you don't have to memorize where an alias works. Just read it off the order.",
      pauseAfter: 0.5,
    },
    {
      id: "outro",
      text: "Read your query from FROM down, not from SELECT across. The full order has two more steps, window functions and DISTINCT, and the Dataslope lesson covers both.",
    },
  ],
};
