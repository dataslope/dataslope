import results from "./results.json" with { type: "json" };

// Every listing, diff, console line and test result the video shows, read
// from results.json: what Pyodide 314.0.7 (Python 3.14) returned for the code
// in check.mjs, which wrote it. The function is the page's own listing
// (ai-assisted-coding.mdx, "How do you review code an assistant wrote?"),
// read out of the page by check.mjs; the tests, the report, the
// reproduction and the patches are the video's own. A listing printed on
// screen is the file that ran, so it cannot drift from what ran. Pure (no
// Remotion, no DOM).

export const VIDEO = "be-code-review";

/** Whether public/images/be-code-review/ holds the watercolors from
 *  illustrations.json. Phase 2 generates them; every frame is laid out with
 *  room for them either way. */
export const ILLUSTRATIONS = true;

export const RUNTIME: string = results.runtime;

/** One call of merge_intervals: the argument as Python prints it, and what
 *  came back (or the error), with anything it printed. */
export type Call = {
  arg: string;
  ok: boolean;
  repr?: string;
  value?: number[][];
  error?: string;
  stdout: string[];
};

/** One test function, run: its call, what it expected, what it got. */
export type TestRow = { name: string; call: string; expected: string; got: string; ok: boolean };
export type TestRun = { passed: number; failed: number; tests: TestRow[] };

const call = (c: unknown) => c as Call;
const run = (t: unknown) => t as TestRun;

/** The listings, one string per line, as written to intervals.py and
 *  test_intervals.py. */
export const LISTINGS = results.listings;

/** The function's length in lines (8), said in the plan beat. */
export const LINES: number = results.lines;

/** Each diff as difflib prints it (unified, one line of context), one string
 *  per line; "arrived" is the two new files, every line added. */
export const DIFFS = results.diffs;

/** The same changes with the whole function as context, the way the screen
 *  shows a change: each line keeps difflib's " ", "+" or "-". */
export const WHOLE = results.diffs.whole;

/** The opening: the assistant's two tests on its own code (2 passed). */
export const ARRIVED = run(results.arrived);

/** Question 1's loud card: a list's sort with pandas' inplace=True, and the
 *  TypeError it raises. */
export const LOUD = results.loud as { code: string[]; ok: boolean; error?: string };

/** Question 2, the debugging round, in the order the steps meet them. */
export const DEBUG = {
  /** The page's example, in order: [[1, 6], [8, 10]]. */
  example: call(results.debug.example),
  /** The report: the same three, out of order, give [[8, 6]]. */
  report: call(results.debug.report),
  /** Step 2: [[3, 4], [1, 2]] gives [[3, 2]]. */
  repro: call(results.debug.repro),
  /** How many inputs of one and of two intervals (ends 0 to 4) end before
   *  they start: none of 15, and 35 of 225. */
  search: results.debug.search,
  /** Step 3: the traced copy's two printed lines. */
  trace: call(results.debug.trace),
  /** Step 3: sorted first, [[1, 2], [3, 4]]. */
  hypothesis: call(results.debug.hypothesis),
  /** Step 4, the symptom patch: [] for both. */
  symptomReport: call(results.debug.symptomReport),
  symptomRepro: call(results.debug.symptomRepro),
  /** Step 4, the cause: sorted inside. */
  causeReport: call(results.debug.causeReport),
  causeRepro: call(results.debug.causeRepro),
  /** The two old tests, passing after the sort as before it. */
  causeTests: run(results.debug.causeTests),
  /** The old tests with the reproduction kept as a third, on the code before
   *  the fix (the third fails, getting [[3, 2]]) and after it (all pass). */
  keptBefore: run(results.debug.keptBefore),
  keptAfter: run(results.debug.keptAfter),
};

/** Question 3, the review. */
export const REVIEW = {
  touching: call(results.review.touching),
  contained: call(results.review.contained),
  empty: call(results.review.empty),
  single: call(results.review.single),
  /** The fixed function on every input above. */
  fixed: Object.fromEntries(Object.entries(results.review.fixed).map(([k, v]) => [k, call(v)])) as Record<
    "example" | "report" | "touching" | "contained" | "empty" | "single",
    Call
  >,
  /** The assistant's tests on the fix: the second fails, getting [[1, 3]]. */
  assistantTestsOnFix: run(results.review.assistantTestsOnFix),
  /** The reviewer's file on each version. Row 0 is the kept obvious test;
   *  rows 1 to 3 are the review's three. */
  onAssistant: run(results.review.reviewTestsOnAssistant),
  onSorted: run(results.review.reviewTestsOnSorted),
  onFix: run(results.review.reviewTestsOnFix),
};

/** The closing: Python's sort, its comparisons counted, on 1,000 intervals
 *  already in order (999, one pass) and on the same 1,000 shuffled. */
export const COST = results.cost as { n: number; inOrder: number; shuffled: number };
