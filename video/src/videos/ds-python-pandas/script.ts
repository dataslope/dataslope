import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Python & pandas" (16:9), Part 9 of the Data Scientist
 * interview prep videos (agent-outputs/20261022-0445-data-scientist-interview-
 * video-plan.md), after content/interview/data-scientist/python-and-pandas.mdx.
 * It answers all fourteen of the page's questions: nine worked on real
 * frames, numbered aloud, then five quickly (numbered 10 to 14 on screen
 * only).
 *
 *   1. vectorization against a Python loop ("vector").
 *   2. split-apply-combine, and what groupby returns ("split").
 *   3. agg, transform and apply; 4. a percentage of each group's total
 *      ("shapes").
 *   5. merge, join and concat ("merge").
 *   6. the merge that blows up the row count ("fanout").
 *   7. missing data ("missing").
 *   8. SettingWithCopyWarning ("copy").
 *   9. wide to long and back ("reshape").
 *   Quickly ("rapid-in"): map, apply and DataFrame.map; method chaining; a
 *   vectorized CASE; the category dtype; datetimes.
 *
 * DA Part 2 (da-pandas) answers most of these for the analyst track. This
 * video keeps its numbers where the question is the same (the share of a
 * region, the chained assignment, the category's bytes) and is otherwise
 * written and drawn fresh: a different opening (the merge that runs and is
 * wrong, settled at question 6), a different line into the quick round, and a
 * different bridge out.
 *
 * No series intro yet: the first scene opens at frame 0, and adding the intro
 * later needs no re-voicing. Every animation is cued to a word below.
 *
 * Facts. Every snippet on screen ran in Pyodide 314.0.7 with pandas 3.0.2 (the
 * runtime the page's blocks run in), by check.mjs into results.json, which
 * data.ts reads:
 *   - the opening and "fanout", the video's own frames: four orders totalling
 *     265, and a customer table where customer 2 has two rows (Oslo and
 *     Bergen). The left merge has six rows totalling 375; is_unique is False;
 *     validate="many_to_one" raises MergeError.
 *   - "vector", the page's frame (prices 1 to 5, quantities 5 to 1, revenues
 *     5, 8, 9, 8, 5), then the same product on a million rows of the video's
 *     own: the loop took 410 to 460 ms and the vectorized line 0.9 to 1.8 ms
 *     over several runs, in WebAssembly. Both move from run to run, so the
 *     script says "several hundred milliseconds", "about one" and "hundreds
 *     of times", and the bars print whatever the last run measured (data.ts
 *     refuses a run that no longer fits those words). On a laptop the video
 *     gives the page's "typically 10-100x". And .apply with a lambda gives
 *     the same revenues, a Python call per row.
 *   - "split", the page's six rows: East 50, North 240, South 150; groupby
 *     alone is a DataFrameGroupBy; one column gives a Series, named
 *     aggregates a DataFrame.
 *   - "shapes", the page's (and DA Part 2's) five rows: agg gives three rows,
 *     transform five; apply with nlargest gives each region's largest order
 *     (East 50, North 100, South 120); North's 100 is 62.5% of 160.
 *   - "merge", the page's orders and customers (Ava, Ben, Ben, Cy), joined on
 *     the index the same way; March's two orders are the video's own.
 *   - "missing", the page's frame: one region and two amounts missing;
 *     NaN == NaN is False; the mean fill is 90.
 *   - "copy", DA Part 2's frame: the chained assignment leaves it unchanged
 *     and warns ChainedAssignmentError; .loc sets both North amounts to 0.
 *   - "reshape", the page's two users by two quarters: four rows, and back.
 *   - quickly: the page's map, chaining and CASE blocks (tax East 4.0, North
 *     14.4, South 5.6; Small, Medium, Large, Small, Large); case_when keeps a
 *     row's old value unless started from the default; DA Part 2's 300
 *     regions take 8,900 bytes as strings and 418 as a category; the video's
 *     own five dates resample by week to 180, 170 and 70.
 *
 * Written for Drew's ear, as in the Data Analyst series: "ag" for agg, "lock"
 * for loc, "is NA" for isna, "data type" for dtype, "DT" for the dt
 * accessor. Initialisms are written in plain caps, never letter-spaced, so
 * Drew reads each as one unit (the series rule from 2026-10-22).
 */
export const script: NarrationScript = {
  id: "ds-python-pandas",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "This merge runs without a single warning. Four orders go in, and six come out. Revenue was two hundred sixty-five. Now it's three hundred seventy-five, and nothing on the screen says why.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "The pandas round is full of code like that: it runs, and it's wrong. There are fourteen questions. Nine are worked on real frames, in pandas three, and five go quickly at the end. The merge comes back at question six.",
      pauseAfter: 0.7,
    },
    { id: "vector-in", text: "First, why nobody wants to see a loop." },

    // ── 1. Vectorization ──────────────────────────────────────────────────
    {
      id: "vector",
      scene: true,
      text: "Question one. Why is vectorization preferred over Python loops?",
      pauseAfter: 0.6,
    },
    {
      id: "vector-loop",
      text: "Here are five prices and quantities. The loop walks the rows one at a time, multiplying in Python. The vectorized line hands both whole columns to NumPy, which multiplies them in compiled code, in one call. The revenues are the same.",
      pauseAfter: 0.7,
    },
    {
      id: "vector-time",
      text: "On a million rows, timed in WebAssembly, the way this page runs Python, the loop takes several hundred milliseconds. The vectorized line takes about one millisecond.",
    },
    {
      id: "vector-ratio",
      text: "In the browser, that's hundreds of times faster. On a laptop, expect ten to a hundred times.",
    },
    {
      id: "vector-why",
      text: "A loop pays interpreter overhead on every row: each number becomes a Python object, and its type is checked before every multiply. Apply with a lambda pays the same. It's still a loop.",
      pauseAfter: 0.6,
    },
    {
      id: "vector-only",
      text: "Write a loop only when no vectorized version exists.",
      pauseAfter: 0.8,
    },
    { id: "split-in", text: "Next, the pattern under every groupby." },

    // ── 2. Split-apply-combine ────────────────────────────────────────────
    {
      id: "split",
      scene: true,
      text: "Question two. What is split, apply, combine, and what does groupby return?",
      pauseAfter: 0.6,
    },
    {
      id: "split-steps",
      text: "Split sorts the rows into one group per region. Apply runs a function on each group, here a sum. Combine puts the answers together: East fifty, North two forty, South one fifty.",
      pauseAfter: 0.7,
    },
    {
      id: "split-returns",
      text: "On its own, groupby returns a data frame group by object, and nothing is aggregated yet. Sum one column, and you get a Series, indexed by region. Name several aggregates in ag, and you get a data frame. Either way, the regions are the index until you reset it.",
      pauseAfter: 0.8,
    },

    // ── 3, 4. agg, transform, apply; a percentage of each group ───────────
    {
      id: "shapes",
      scene: true,
      text: "Question three. When do you use ag, transform, or apply on a groupby?",
      pauseAfter: 0.6,
    },
    {
      id: "shapes-three",
      text: "Ag reduces each group to one value: three regions, three rows. Transform hands each group's answer back to every row: five rows in, five out. Apply is the fallback for anything else. Here it returns the largest order in each region, a row per group. It's the most flexible of the three, and the slowest.",
      pauseAfter: 0.8,
    },
    {
      id: "pct",
      text: "Question four. How do you compute a percentage of total within each group? Divide each amount by its region's total from transform. No merge needed. North's hundred is sixty-two and a half percent of one sixty.",
      pauseAfter: 0.7,
    },
    { id: "merge-in", text: "Then, putting frames together." },

    // ── 5. merge, join and concat ─────────────────────────────────────────
    {
      id: "merge",
      scene: true,
      text: "Question five. When do you use merge, join, or concat?",
      pauseAfter: 0.6,
    },
    {
      id: "merge-key",
      text: "Merge matches rows on key columns, the way a SQL join does: each order picks up its customer's name.",
    },
    {
      id: "merge-how",
      text: "Its how argument picks the join type: inner, left, right or outer. Here it's left, so every order is kept.",
      pauseAfter: 0.8,
    },
    {
      id: "merge-index",
      text: "Join does the same, but matches on the index.",
    },
    {
      id: "merge-set",
      text: "Here the customers' key becomes their index first, and the same four rows come back.",
      pauseAfter: 0.8,
    },
    {
      id: "merge-stack",
      text: "And concat matches nothing at all. It stacks frames, here March's orders under the rest.",
      pauseAfter: 0.8,
    },

    // ── 6. The merge that blows up ────────────────────────────────────────
    {
      id: "fanout",
      scene: true,
      text: "Question six. How can a merge silently blow up your row count?",
      pauseAfter: 0.6,
    },
    {
      id: "fanout-why",
      text: "Back to the opening. Customer two has two rows in the customer table, Oslo and Bergen, so each of their orders matches twice. Four rows become six, and the eighty and the thirty are each counted twice.",
      pauseAfter: 0.8,
    },
    {
      id: "fanout-guard",
      text: "So check that the key is unique before you merge. Or pass validate equals many to one, and pandas raises a merge error instead of fanning out. Afterwards, compare the row count with what you expected.",
      pauseAfter: 0.7,
    },
    { id: "missing-in", text: "Now, the values that aren't there at all." },

    // ── 7. Missing data ───────────────────────────────────────────────────
    {
      id: "missing",
      scene: true,
      text: "Question seven. How do you detect and handle missing data?",
      pauseAfter: 0.6,
    },
    {
      id: "missing-detect",
      text: "Detect it with is NA, where NA stands for not available. Summed, it counts the gaps: one region, two amounts. Never test with equals. A missing number is stored as not a number, and that isn't equal even to itself.",
      pauseAfter: 0.8,
    },
    {
      id: "missing-handle",
      text: "Then drop the rows or fill them, depending on why they're missing. The page fills with the mean, ninety. A few gaps are routine. A column that's sixty percent empty is a modeling decision, not a line of code.",
      pauseAfter: 0.7,
    },

    // ── 8. SettingWithCopyWarning ─────────────────────────────────────────
    {
      id: "copy",
      scene: true,
      text: "Question eight. What is the setting with copy warning, and how do you avoid it?",
      pauseAfter: 0.6,
    },
    {
      id: "copy-chain",
      text: "It warns about chained assignment: select the North rows, then set their amount, in two steps. The second step writes to the selection, which may be a copy, so the original may not change.",
      pauseAfter: 0.7,
    },
    {
      id: "copy-three",
      text: "In pandas three, with copy on write, it never changes. The frame stays as it was, and the warning is now called chained assignment error. Older versions said setting with copy, and interviewers still ask about it.",
      pauseAfter: 0.8,
    },
    {
      id: "copy-fix",
      text: "Write in one step, with lock, the mask and the column, and both North amounts become zero. When you want a separate subset, take a copy on purpose.",
      pauseAfter: 0.7,
    },
    { id: "reshape-in", text: "Last before the quick round: turning a frame on its side." },

    // ── 9. Wide and long ──────────────────────────────────────────────────
    {
      id: "reshape",
      scene: true,
      text: "Question nine. How do you reshape between wide and long formats?",
      pauseAfter: 0.6,
    },
    {
      id: "reshape-melt",
      text: "Melt goes wide to long. Each quarter's column turns into rows, with a quarter column to name it and a sales column to hold the value. Two users by two quarters: four rows.",
      pauseAfter: 0.7,
    },
    {
      id: "reshape-back",
      text: "Pivot goes back, long to wide, and needs every user and quarter pair to be unique. When pairs repeat, pivot table aggregates them instead.",
      pauseAfter: 0.8,
    },

    // ── Quickly ───────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Nine done. For the last five, a sentence and a line of code apiece.",
      pauseAfter: 0.6,
    },
    {
      id: "r-map",
      text: "Series map works value by value on one column, from a function or a lookup. Apply works along an axis, a row or a column at a time. Data frame map works on every cell.",
    },
    {
      id: "r-chain",
      text: "Method chaining writes the steps top to bottom, query, assign, group, sum, with no throwaway variables in between.",
    },
    {
      id: "r-case",
      text: "For a CASE, use NumPy select, with a list of conditions and a default. Pandas has case when too. Start it from the default, or rows that match nothing keep their old value.",
      pauseAfter: 1.0,
    },
    {
      id: "r-cat",
      text: "The category data type stores each distinct string once, and a small code per row. Three hundred regions drop from eight thousand nine hundred bytes to four hundred eighteen.",
    },
    {
      id: "r-dates",
      text: "And for dates, to datetime parses them, the DT accessor, short for datetime, reaches their parts, and resample groups them by time. By week, a hundred eighty, one seventy, and seventy.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Nearly all of this translates straight into SQL. Groupby becomes group by, merge becomes a join, and transform becomes a window function. Next: SQL.",
    },
  ],
};
