import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Pandas" (16:9), Part 2 of the Data Analyst interview prep
 * videos (agent-outputs/20261021-2314-data-analyst-interview-video-plan.md),
 * after content/interview/data-analyst/pandas.mdx. It answers all thirty of
 * the page's questions: seventeen that hide a trap, numbered aloud, then a
 * rapid-fire round of thirteen (numbered 18 to 30 on screen only).
 *
 *   1. loc against iloc ("loc"); 2. boolean filtering ("filter").
 *   3. groupby and split-apply-combine; 4. transform against agg; 5. a share
 *      of a group's total ("groupby").
 *   6. merge, concat and join; 7. stacking and resetting the index; 8.
 *      merging on several keys ("merge").
 *   9. missing data; 10. ffill and bfill ("missing").
 *   11. SettingWithCopyWarning and chained assignment; 12. views and copies
 *      ("copy").
 *   13. vectorization against apply; 14. apply by row or column; 15. map,
 *      apply and DataFrame.map ("vector").
 *   16. wide to long; 17. pivot against pivot_table ("reshape").
 *   Rapid fire ("rapid-in"): categorical dtype; sorting and ranking;
 *   value_counts; datetimes; resample; method chaining; duplicates; renaming
 *   columns; selecting by dtype; a CASE-like column; CSV and Excel; query;
 *   shape, dtypes and memory.
 *
 * No series intro yet (decided 2026-10-21), as in Part 1: the first scene
 * opens at frame 0, and adding the intro later needs no re-voicing.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every snippet on screen ran in Pyodide 314.0.7 with pandas 3.0.2
 * (the runtime the page's blocks run in), by check.mjs into results.json,
 * which data.ts reads; every error and warning is pandas' own text:
 *   - "loc", the page's five-row frame: loc[3, "amount"] and iloc[3, 1] are
 *     both 50; the North rows keep labels 2 and 4; north.iloc[0] is North,
 *     120; north.loc[0] raises KeyError: 0.
 *   - "filter", the page's boolean-filter frame: the mask keeps rows 0 and 4
 *     (120, 150); without brackets, & runs on 100 and the region column first
 *     and raises a TypeError; `and` raises "The truth value of a Series is
 *     ambiguous".
 *   - "groupby", the page's percentage-of-group frame (North 100 and 60,
 *     South 80 and 120, East 50), used for all three questions so the scene
 *     keeps one table: sums North 160, South 200, East 50; two named
 *     aggregates give a DataFrame; transform gives five rows; 100 is 62.5%
 *     of North's 160.
 *   - "merge", the video's own: January and February stacked are labelled
 *     0, 1, 0, 1, and 0 to 3 with ignore_index; stock and prices keyed by
 *     product and warehouse give four rows merged on product alone, two on
 *     both.
 *   - "missing", the page's frame: isna().sum() is region 1, amount 2;
 *     == np.nan finds 0; dropna on amount keeps two rows; fillna(0) keeps
 *     four. The daily price with gaps is the video's own.
 *   - "copy", the page's view-and-copy frame: under pandas 3 the chained
 *     assignment leaves the frame unchanged and warns ChainedAssignmentError;
 *     .loc in one step sets both North amounts to 0; a subset set to 0 leaves
 *     the parent as it was, with no warning.
 *   - "vector", the page's frame: * 0.9 and apply give the same five values;
 *     apply calls the function 1,000,000 times on a million rows (the
 *     video's own; calls, not seconds, so nothing depends on the machine).
 *   - "reshape": melt turns two customers by two quarters into four rows;
 *     pivot raises "Index contains duplicate entries, cannot reshape" on the
 *     video's own rows, where North and A appear twice; pivot_table sums them
 *     to 30 and fills the empty South and A with 0.
 *   - rapid fire, the page's blocks: 300 regions take 8,900 bytes as strings
 *     and 418 as a category; North is half of value_counts(normalize=True);
 *     January resamples to 300 (the video's own dates); two duplicate emails;
 *     select_dtypes("number") gives amount and score; to_csv without
 *     index=False reads back with an "Unnamed: 0" column.
 *
 * Written for Drew's ear, as in Part 1. Method names are written as they are
 * said: "lock" and "eye lock" for loc and iloc, "ag" for agg, "is N A" for
 * isna, "not a number" for NaN, "D types" for dtypes.
 */
export const script: NarrationScript = {
  id: "da-pandas",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "When the screen isn't SQL, it's pandas. The same ideas come back as a data frame, and so do the questions. There are thirty you should be ready for.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Seventeen of them hide a trap, so we'll take those slowly. The other thirteen get one answer each, in a rapid-fire round.",
      pauseAfter: 0.7,
    },
    { id: "loc-in", text: "Most screens start by asking you to pick out some rows." },

    // ── 1. loc and iloc ───────────────────────────────────────────────────
    {
      id: "loc",
      scene: true,
      text: "Question one. What's the difference between lock and eye lock?",
      pauseAfter: 0.6,
    },
    {
      id: "loc-rule",
      text: "Lock picks by label, the names on the index and the columns. Eye lock picks by position, counting from zero.",
      pauseAfter: 0.8,
    },
    {
      id: "loc-same",
      text: "On a fresh frame they agree. Lock at label three and eye lock at row three both find fifty.",
      pauseAfter: 0.7,
    },
    {
      id: "loc-trap",
      text: "Now keep only the North rows. Their labels are two and four. Eye lock zero still works: it's the first row, a hundred and twenty. Lock zero fails with a key error, because no row is labelled zero.",
      pauseAfter: 0.8,
    },

    // ── 2. Boolean filtering ──────────────────────────────────────────────
    {
      id: "filter",
      scene: true,
      text: "Question two. How does boolean filtering work?",
      pauseAfter: 0.6,
    },
    {
      id: "filter-mask",
      text: "A comparison on a column gives a column of trues and falses, called a mask. Combine two masks with an ampersand, and pass it to lock. The two North orders over a hundred come back.",
      pauseAfter: 0.8,
    },
    {
      id: "filter-parens",
      text: "The trap is the brackets. Leave them off, and the ampersand runs first, on a hundred and the region column, so Python stops with a type error.",
      pauseAfter: 0.6,
    },
    {
      id: "filter-and",
      text: "And the word and fails too: the truth value of a Series is ambiguous.",
      pauseAfter: 0.6,
    },
    { id: "groupby-in", text: "Then comes the one every pandas screen asks." },

    // ── 3, 4, 5. groupby ──────────────────────────────────────────────────
    {
      id: "groupby",
      scene: true,
      text: "Question three. What does groupby return, and what is split, apply, combine?",
      pauseAfter: 0.6,
    },
    {
      id: "gb-split",
      text: "Groupby splits the rows by a key, one piece per region. Apply runs a function on each piece, here a sum. Combine stacks the answers: East fifty, North one sixty, South two hundred.",
      pauseAfter: 0.8,
    },
    {
      id: "gb-returns",
      text: "Group one column and sum it, and you get a Series, indexed by region. Name two aggregates in ag, and you get a data frame.",
      pauseAfter: 0.7,
    },
    {
      id: "gb-transform",
      text: "Question four. What's the difference between transform and ag? Ag gives one row per group. Transform gives one row per original row, each holding its group's answer. Five rows in, five rows out.",
      pauseAfter: 0.8,
    },
    {
      id: "gb-pct",
      text: "Which makes question five easy. What's each order's share of its region? Divide the amount by the region total from transform. North's hundred is sixty-two and a half percent of one sixty.",
      pauseAfter: 0.7,
    },
    { id: "merge-in", text: "Next, putting frames together." },

    // ── 6, 7, 8. merge, concat and join ───────────────────────────────────
    {
      id: "merge",
      scene: true,
      text: "Question six. When do you use merge, concat, or join?",
      pauseAfter: 0.6,
    },
    {
      id: "merge-what",
      text: "Concat stacks frames, one on top of the other. Merge is a SQL join on key columns, like each order and its customer. And join is a merge on the index.",
      pauseAfter: 0.8,
    },
    {
      id: "merge-index",
      text: "Question seven. Why reset the index when you stack? Look at the labels: zero, one, zero, one. Two rows answer to label zero. Pass ignore index, and they run zero to three.",
      pauseAfter: 0.8,
    },
    {
      id: "merge-keys",
      text: "Question eight. How do you merge on several keys? Pass a list. Stock and prices are both keyed by product and warehouse together.",
      pauseAfter: 0.6,
    },
    {
      id: "merge-fan",
      text: "Merge on product alone, and every warehouse meets every warehouse: four rows from two. Merge on both, and it's two. If the names differ, use left on and right on.",
      pauseAfter: 0.7,
    },
    { id: "missing-in", text: "Rows that multiply are one trap. Values that are missing are the next." },

    // ── 9, 10. Missing data ───────────────────────────────────────────────
    {
      id: "missing",
      scene: true,
      text: "Question nine. How do you handle missing data?",
      pauseAfter: 0.6,
    },
    {
      id: "missing-find",
      text: "First, find it. Is N A, summed, counts the gaps in each column: one region, two amounts.",
      pauseAfter: 0.7,
    },
    {
      id: "missing-equals",
      text: "Not with equals. Not a number isn't equal to anything, not even itself, so comparing with equals finds zero.",
      pauseAfter: 0.8,
    },
    {
      id: "missing-choose",
      text: "Then drop or fill, depending on why it's missing. Drop N A on amount keeps two rows. Fill N A with zero keeps all four, but only if missing really means zero.",
      pauseAfter: 0.8,
    },
    {
      id: "fill",
      text: "Question ten. What do forward fill and backward fill do? Forward fill carries the last price forward. Backward fill pulls the next one back.",
      pauseAfter: 0.7,
    },
    {
      id: "fill-trap",
      text: "So backward fill borrows from the future. Fine for a chart. Wrong for anything you'd compute as the day happens.",
      pauseAfter: 0.6,
    },
    { id: "copy-in", text: "The next one is the warning everybody has seen." },

    // ── 11, 12. Chained assignment, views and copies ──────────────────────
    {
      id: "copy",
      scene: true,
      text: "Question eleven. Why do you get a setting with copy warning, and how do you avoid it?",
      pauseAfter: 0.6,
    },
    {
      id: "copy-chain",
      text: "It comes from chained assignment: filter the North rows, then set their amount, in two steps. The second step writes to the filtered result, not to the frame you started with.",
      pauseAfter: 0.8,
    },
    {
      id: "copy-three",
      text: "Pandas three makes that explicit, with copy on write. The frame doesn't change, and the warning is now chained assignment error. Older pandas said setting with copy, and interviewers still ask about it.",
      pauseAfter: 0.8,
    },
    {
      id: "copy-fix",
      text: "The fix is one step: lock, with the mask and the column. Now both North amounts are zero.",
      pauseAfter: 0.7,
    },
    {
      id: "copy-view",
      text: "Question twelve. What's the difference between a view and a copy? A view shares memory with its parent. A copy doesn't. In pandas three, anything you take from a frame acts as a copy. Set the subset to zero, and the parent is unchanged. Call copy when you mean it.",
      pauseAfter: 0.7,
    },
    { id: "vector-in", text: "Now, speed." },

    // ── 13, 14, 15. Vectorization, apply and map ──────────────────────────
    {
      id: "vector",
      scene: true,
      text: "Question thirteen. Why is vectorization preferred over apply with a lambda?",
      pauseAfter: 0.6,
    },
    {
      id: "vector-why",
      text: "Multiply the column by point nine, and that's one call into compiled code. Apply calls your Python function once for every value. A million rows, a million calls.",
      pauseAfter: 0.8,
    },
    {
      id: "vector-same",
      text: "Same answer, very different cost. Use apply only when there's no vectorized way.",
      pauseAfter: 0.7,
    },
    {
      id: "vector-axis",
      text: "Question fourteen. How do you apply a function to each row or column? Apply with axis zero runs it on each column. Axis one runs it on each row.",
      pauseAfter: 0.7,
    },
    {
      id: "vector-map",
      text: "Question fifteen. Map, apply, or data frame map? Series map works value by value on one column, from a function or a lookup. Apply works along an axis. And data frame map works on every cell.",
      pauseAfter: 0.7,
    },
    { id: "reshape-in", text: "The last of the slow ones changes a frame's shape." },

    // ── 16, 17. Reshaping ─────────────────────────────────────────────────
    {
      id: "reshape",
      scene: true,
      text: "Question sixteen. How do you reshape from wide to long?",
      pauseAfter: 0.6,
    },
    {
      id: "reshape-melt",
      text: "Melt. Each quarter's column turns into rows, with a quarter column and a sales column. Two customers by two quarters is four rows.",
      pauseAfter: 0.8,
    },
    {
      id: "reshape-pivot",
      text: "Question seventeen. Pivot or pivot table? Pivot only reshapes, so every region and category pair must be unique. Here North and A appear twice, and pivot stops: index contains duplicate entries.",
      pauseAfter: 0.8,
    },
    {
      id: "reshape-table",
      text: "Pivot table aggregates, like a spreadsheet. North and A sum to thirty, and fill value puts a zero in the empty cell.",
      pauseAfter: 0.7,
    },

    // ── Rapid fire ────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "That's the seventeen traps. Now, thirteen questions, one answer each.",
      pauseAfter: 0.6,
    },
    {
      id: "r-cat",
      text: "A categorical stores each distinct string once, and a small code for every row. Three hundred regions drop from eight thousand nine hundred bytes to four hundred eighteen.",
    },
    { id: "r-sort", text: "Sort values orders the rows. Rank numbers them, and dense leaves no gaps." },
    { id: "r-counts", text: "Value counts counts each value. Normalize turns the counts into shares: North is half." },
    {
      id: "r-dates",
      text: "To datetime parses the dates. Then the D T accessor gives you the year, the month, or the day's name.",
    },
    { id: "r-resample", text: "Resample is a groupby for time. By month end, January sums to three hundred." },
    {
      id: "r-chain",
      text: "Method chaining writes the steps top to bottom: query, assign, group, sum, rename. No temporary variables.",
    },
    { id: "r-dupes", text: "Duplicated flags the repeats, two here. Drop duplicates keeps the first of each." },
    { id: "r-rename", text: "Rename takes a mapping from old names to new ones." },
    { id: "r-dtypes", text: "Select D types picks columns by type. Number gives amount and score." },
    {
      id: "r-case",
      text: "For a CASE, use NumPy where for one condition, or NumPy select for several. The first true condition wins.",
    },
    {
      id: "r-csv",
      text: "Read CSV and to CSV. Pass index equals false, or the index comes back as an unnamed column. Excel works the same way.",
    },
    { id: "r-query", text: "Query filters with a string, and an at sign brings in a variable." },
    {
      id: "r-shape",
      text: "And shape gives the rows and columns, D types gives each column's type, and memory usage gives the bytes.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "A number from pandas is only half an answer. The other half is what it means. Next: statistics and communication.",
    },
  ],
};
