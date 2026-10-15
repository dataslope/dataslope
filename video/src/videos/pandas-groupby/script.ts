import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "pandas groupby: split, apply, combine" (16:9), after
 * content/courses/data-analysis-python-pandas/groupby-operations.mdx, whose
 * own seven-row frame ("The basic shape": a dept and a salary per employee)
 * is the table on screen, and aggregation-basics.mdx, which it builds on.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each checked by running pandas 3.0.5 (measure.py, whose output is
 * measurements.json; every number on screen comes from data.ts, which imports
 * it):
 *   - the frame has seven rows and three departments;
 *   - groupby splits it into Eng (rows 0, 2, 4), Ops (3, 6) and Sales (1, 5):
 *     three rows for engineering, two each for ops and sales;
 *   - summed, Eng comes to 388, Ops to 172 and Sales to 205;
 *   - `.agg("sum")` returns three rows, one per department;
 *   - `.transform("sum")` returns seven, indexed 0 to 6 like the frame, each
 *     row holding its own department's total;
 *   - salary over that total is each row's share of its department: 140 of
 *     388 is 36.1%, "thirty-six percent"; every department's shares add to 1.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "pandas-groupby",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "Here are seven employees, each with a department and a salary. How much does each department pay in all?",
      pauseAfter: 0.4,
    },
    { id: "steps", text: "In pandas, that is a groupby, and a groupby is three steps.", pauseAfter: 0.35 },
    {
      id: "split",
      text: "First, split. The rows break apart into one piece per department. Engineering gets three rows. Ops and sales get two each.",
      pauseAfter: 0.35,
    },
    {
      id: "apply",
      text: "Second, apply. A function runs on each piece by itself. Here it is a sum, so engineering comes to three hundred and eighty-eight.",
      pauseAfter: 0.35,
    },
    {
      id: "combine",
      text: "Third, combine. The answers are stacked into one new result, with a row per department. Seven rows went in. Three came out.",
      pauseAfter: 0.6,
    },
    { id: "miss", text: "Now the part most people miss. Agg gives you one row per group.", pauseAfter: 0.3 },
    {
      id: "transform",
      text: "Transform runs the same sum, then hands each total back to every row of its group. Seven rows in, seven rows out, in the original order.",
      pauseAfter: 0.4,
    },
    {
      id: "share",
      text: "The totals now line up with the salaries, so you can divide one by the other. That gives each row's share of its group.",
      pauseAfter: 0.3,
    },
    {
      id: "example",
      text: "The hundred and forty is thirty-six percent of what engineering pays.",
      pauseAfter: 0.6,
    },
    {
      id: "rule",
      text: "So use agg when you want a summary, and transform when you want the answer back on every row.",
    },
  ],
};
