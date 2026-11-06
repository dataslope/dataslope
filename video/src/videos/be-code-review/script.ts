import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Reading and reviewing code" (16:9), Part 7 of the Backend /
 * Software Engineer interview prep videos
 * (agent-outputs/20261106-backend-interview-video-plan.md), after
 * content/interview/backend-engineer/ai-assisted-coding.mdx. It answers the
 * three of the page's eleven questions the plan keeps here, all three worked
 * through and numbered aloud, on one piece of code. There is no quick round:
 * the part owns three questions, and each needs its figure.
 *
 *   1. "What kinds of bugs do AI assistants characteristically introduce?"
 *      ("bugs").
 *   2. "What happens in a code comprehension or debugging round?" ("debug").
 *   3. "How do you review code an assistant wrote?" ("review").
 *
 * The order is the video's own, not the page's: the debugging round comes
 * before the review, so the round finds one of the example's three bugs from
 * a report, and the review then finds the other two, plus the test that
 * agrees with them, in the diff as it arrived. The argument that leaves
 * behind: a review before it ships finds all three; a bug report found one.
 *
 * The worked example is the page's own: the eight-line merge_intervals it
 * says an assistant returned. It is the one video in the series with code on
 * screen, and the code is read, never typed: every listing appears whole, and
 * a highlight moves over it as the narration reads a line. Around it, the
 * video's own pieces, which the screen labels as such: the assistant's test
 * file (the page's "obvious test" and a second test asserting touching
 * intervals stay apart, for the page's "tests that agree with the bug"), the
 * bug report (the page's three intervals, out of order), the reproduction, a
 * traced copy, a symptom patch, and the reviewer's three tests.
 *
 * On screen, beat by beat (phase 2 builds these; every listing, diff and
 * result is read from results.json):
 *   - "hook": the lynx (the hero), and one listing arriving from three
 *     directions, labelled a colleague, a stranger, an assistant; three
 *     words under it, does / assumes / is wrong, each lit on its word.
 *   - "plan": the diff as it arrived, two new files (intervals.py, eight
 *     added lines; test_intervals.py, two tests), and a console under it
 *     reading "2 passed", in green, on "Both pass".
 *   - "bugs" to "bugs-past": two bars, 66% and 45%, with the survey named
 *     under them; then seven cards filling a grid, one per kind, each with a
 *     few tokens of code or an icon: `<` against `<=`; "sorted? unique? not
 *     null?"; a list's sort called with pandas' inplace=True and the
 *     TypeError it raises, then a parcel and an attacker's hand registering
 *     an invented package name ("bugs-api", the supply-chain risk);
 *     `except Exception: pass`; an f-string building SQL, a key, a missing
 *     check; a test ticking green over a red result; a diff with unrelated
 *     lines. On "bugs-past", the invented-API card's error lights (the one
 *     loud kind), the six quiet cards dim to gray, and three of them
 *     (boundaries, assumptions, tests that agree) lift out and move beside
 *     the eight lines.
 *   - "debug" to "debug-past": the five steps as a numbered column on the
 *     left, each lit as it is named, the listing on the right. "debug-report":
 *     a report card, [[8, 10], [1, 3], [2, 6]] in, [[8, 6]] out, the 8 and
 *     the 6 in red. "debug-read": the loop's comparison with merged[-1]
 *     highlighted. "debug-repro": [[3, 4], [1, 2]] in, [[3, 2]] out, as a
 *     test. "debug-trace": the traced copy (one print line added, as a diff)
 *     and its two printed lines, the second in red. "debug-hypo": the call
 *     with sorted() around the input, [[1, 2], [3, 4]] in green.
 *     "debug-symptom": the symptom patch as a diff, and the report's result,
 *     [], with an empty box. "debug-cause": the one-line diff that sorts
 *     inside the function; the report, the reproduction and both old tests,
 *     all green. "debug-explain": step five lit, its three parts as three
 *     short lines, the first two answered from the listing. "debug-ai": an
 *     assistant panel beside the listing with the two questions it is good
 *     for, and step two ringed. "debug-past": the two old tests, green before the fix and
 *     green after, side by side, and the reproduction added as a third.
 *   - "review" to "review-past": the five checks of the page as a checklist
 *     beside the diff as it arrived, each ticked or flagged as the narration
 *     reaches it. "review-edges": `<` highlighted; [[1, 2], [2, 3]] in, the
 *     same out, on a number line where the two share the point 2.
 *     "review-contain": `merged[-1][1] = end` highlighted; [[1, 10], [2, 3]]
 *     in, [[1, 3]] out, the lost 3-to-10 drawn in red on the number line.
 *     "review-tests": the assistant's second test highlighted, flagged in
 *     red. "review-fix": the three-line fix as a diff, then the reviewer's
 *     tests as a grid: three rows, two columns (the assistant's code: three
 *     red; the fix: three green). "review-where": the three bugs, labelled
 *     boundary, boundary, assumption. "review-past": two number lines,
 *     closed [1, 2] [2, 3] touching at a filled point, and half-open
 *     slots 9 to 10 and 10 to 11 meeting at an open one.
 *   - "next": the fixed listing, sorted() highlighted, "one pass" becoming
 *     "n log n", and the NextLine.
 *
 * Facts. check.mjs runs every listing in Pyodide 314.0.7 (Python 3.14), the
 * runtime the track's blocks run in, into results.json, which data.ts reads;
 * it reads the page's listing out of the page and fails if the code it runs
 * is not that listing, and it fails if a run stops showing what a beat below
 * says:
 *   - "plan": the function is 8 lines; the assistant's two tests pass on it.
 *   - "bugs-api", "bugs-past": the card's invented parameter, a list's
 *     sort(inplace=True), raises "TypeError: sort() got an unexpected
 *     keyword argument 'inplace'" as soon as it runs (the video's own call;
 *     no package name is invented on screen, since a real one could exist).
 *   - "debug-report": [[8, 10], [1, 3], [2, 6]] gives [[8, 6]]; in order,
 *     the page's [[1, 3], [2, 6], [8, 10]] gives [[1, 6], [8, 10]] (the
 *     page's own "handles … correctly").
 *   - "debug-repro": [[3, 4], [1, 2]] gives [[3, 2]]. Of the 225 inputs of
 *     two intervals with ends in 0 to 4, 35 end before they start; of the 15
 *     single intervals, none ("Two intervals are enough").
 *   - "debug-trace": the traced copy prints "[3, 4] -> [[3, 4]]" and then
 *     "[1, 2] -> [[3, 2]]".
 *   - "debug-hypo": the same function on sorted([[3, 4], [1, 2]]) gives
 *     [[1, 2], [3, 4]].
 *   - "debug-symptom": the patch that drops any interval ending before it
 *     starts gives [] for the report and [] for the reproduction.
 *   - "debug-cause", "debug-past": with sorted() inside, the report gives
 *     [[1, 6], [8, 10]], the reproduction [[1, 2], [3, 4]], and the two old
 *     tests pass, as they did before the fix.
 *   - "review-diff": the diff touches one function and its test file, and
 *     calls nothing but list methods; one loop over the input.
 *   - "review-edges", "review-contain": [[1, 2], [2, 3]] gives the same back;
 *     [[1, 10], [2, 3]] gives [[1, 3]]. The empty list and a single interval
 *     come back as they went in (checked, not said).
 *   - "review-tests": on the fixed code, the assistant's second test fails
 *     (it gets [[1, 3]]); its first passes.
 *   - "review-fix": the reviewer's three tests (unsorted, touching,
 *     contained) fail on the assistant's code, all three, and pass on the
 *     fix, all three. With only the debugging round's sort, one of the three
 *     passes (results.json; not said).
 * From the page, as it words them (check.mjs fails if the page stops saying
 * them): the survey's 66% and 45% (Stack Overflow, 2025 Developer Survey, AI
 * section, the page's footnote); the seven kinds of bug, and the
 * supply-chain risk of an invented package; Google's pilot's "read, debug
 * and optimize" and the "few hundred lines"; the five steps of the method,
 * and that an assistant "is not a substitute for step 2"; "Like a pull
 * request from a capable stranger" and the five checks; the three bugs, and
 * "Each is a boundary or an unstated assumption, which is where to look
 * first".
 * Past the page, argued rather than measured: that none of the seven kinds
 * stops code from running; that the reproduction should stay as a test,
 * because the old tests passed before and after the fix; that whether
 * touching intervals merge is a question of whether the end is inclusive
 * (the page's intervals are closed, written [start, end], so they share the
 * point; half-open slots would not); and that the sort takes the merge from
 * one pass to n log n (algorithms.mdx: merge sort, the basis of Python's
 * Timsort, is O(n log n)).
 *
 * Written for Drew's ear: initialisms as people write them (AI, SQL, API,
 * ASCII); SQL and ASCII are said as words (SQL through the lexicon, ASCII to
 * be added); "O of n squared" and "N plus one" spelled as said, with the N
 * plus one query defined where it is named; numbers as they are said; no
 * sentence opens on "A" before an initialism. No product name runs here:
 * Stack Overflow and Google are named as the sources the page cites.
 */
export const script: NarrationScript = {
  id: "be-code-review",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Most of the code you'll be asked about in an interview, you didn't write. A colleague wrote it, or a stranger did, or more and more often an assistant, in a few seconds. What's being tested is whether you can read it: what it does, what it assumes, and where it's wrong.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Three questions, answered on one piece of code: eight lines an assistant wrote to merge overlapping intervals, with two tests of its own. Both pass.",
      pauseAfter: 0.8,
    },

    // ── 1. The bugs assistants write ──────────────────────────────────────
    {
      id: "bugs",
      scene: true,
      text: "Question one. What kinds of bugs do AI assistants characteristically introduce? Code that is almost right.",
      pauseAfter: 0.6,
    },
    {
      id: "bugs-survey",
      text: "In Stack Overflow's twenty twenty-five developer survey, sixty-six percent of respondents named AI solutions that are almost right, but not quite, as their top frustration. Forty-five percent said debugging AI-generated code takes longer than expected.",
      pauseAfter: 0.7,
    },
    {
      id: "bugs-edge",
      text: "The usual suspects start at the edges. Boundaries: an off-by-one, a less-than where less-than-or-equal belongs, the empty input, the exact edge of a window.",
    },
    {
      id: "bugs-assume",
      text: "Unstated assumptions: input assumed sorted, unique, never null, or plain ASCII.",
    },
    {
      id: "bugs-api",
      text: "Invented APIs: a method, a parameter or a whole package that doesn't exist, or a real function called with the wrong signature. An invented package name is also a supply-chain risk, because an attacker can register it.",
      pauseAfter: 0.6,
    },
    {
      id: "bugs-errors",
      text: "Swallowed errors: a broad except that hides the failure the caller needed to see. And security: SQL built by string formatting, secrets pasted into the code, a missing authorization check.",
    },
    {
      id: "bugs-tests",
      text: "Two more live in the diff around the code. Tests that agree with the bug assert what the code does, not what it should do, so they pass and prove nothing. And scope creep slips renamed variables, reformatted files and unrelated edits in beside the change.",
      pauseAfter: 0.6,
    },
    {
      id: "bugs-past",
      text: "Notice which of them make a noise. An invented API fails as soon as its line runs, unless someone has registered the package. The other six run quietly and survive the happy path, so running the example proves very little. Three of them are in our eight lines.",
      pauseAfter: 0.8,
    },

    // ── 2. The debugging round ────────────────────────────────────────────
    {
      id: "debug",
      scene: true,
      text: "Question two. What happens in a code comprehension or debugging round? You're given unfamiliar code, often a few hundred lines, and told it's wrong, or slow. Google's pilot, which allows an approved assistant, frames the task as read, debug and optimize an existing codebase.",
      pauseAfter: 0.6,
    },
    {
      id: "debug-report",
      text: "Ours is eight lines, to fit the screen. The report: merging eight to ten, one to three and two to six returned one interval, from eight to six.",
      pauseAfter: 0.7,
    },
    {
      id: "debug-read",
      text: "Step one: read before you run. Find the entry point, the data flow, and the invariants the code relies on. This loop compares each interval only with the last one it merged, which is safe only if something about the order holds.",
      pauseAfter: 0.6,
    },
    {
      id: "debug-repro",
      text: "Step two: reproduce, with the smallest input that shows the failure, ideally as a test. Two intervals are enough. Three to four, then one to two, comes back as three to two.",
      pauseAfter: 0.7,
    },
    {
      id: "debug-trace",
      text: "Step three: form a hypothesis, and test it. Print the state where it might first go wrong, here after each interval, rather than change code and hope. After the first, it's right. After the second, it's wrong: one to two starts before the interval it was compared with.",
      pauseAfter: 0.6,
    },
    {
      id: "debug-hypo",
      text: "So the hypothesis: the loop assumes its input is sorted. Sort the input before the call, and the reproduction passes.",
      pauseAfter: 0.7,
    },
    {
      id: "debug-symptom",
      text: "Step four: fix the cause, not the symptom. Patch the symptom, by dropping any interval that ends before it starts, and the report's three intervals come back as an empty list, with no error at all.",
      pauseAfter: 0.8,
    },
    {
      id: "debug-cause",
      text: "The cause is the missing sort. Sort inside the function, then rerun the reproduction and the existing tests. All of them pass.",
      pauseAfter: 0.6,
    },
    {
      id: "debug-explain",
      text: "Step five: explain what was wrong, why the fix is right, and what else might share the flaw. Here, the loop relied on sorted input and nothing guaranteed it, so the fix supplies the order it relies on.",
      pauseAfter: 0.6,
    },
    {
      id: "debug-ai",
      text: "If the round allows an assistant, it's a fine tool for asking what a function does, or what could make it return this. It's no substitute for step two.",
      pauseAfter: 0.6,
    },
    {
      id: "debug-past",
      text: "And what else shares the flaw? Start with the tests. The two old ones passed before the fix and after it, so neither ever tested the order. Keep the reproduction as a third.",
      pauseAfter: 0.8,
    },

    // ── 3. Reviewing the diff ─────────────────────────────────────────────
    {
      id: "review",
      scene: true,
      text: "Question three. How do you review code an assistant wrote? Like a pull request from a capable stranger.",
      pauseAfter: 0.6,
    },
    {
      id: "review-list",
      text: "Check that it does what was asked, and nothing else. That every import, function and parameter it uses exists. That it handles the boundaries and the error paths. That it doesn't add an accidental O of n squared loop, or an N plus one query, one database call per row. And that its tests would fail without the change. Then run it.",
      pauseAfter: 0.7,
    },
    {
      id: "review-diff",
      text: "Go back to the diff as it arrived, before it shipped. It touches one function and its tests, and nothing else. It calls nothing that doesn't exist. It makes one pass over the input. So far, so good.",
      pauseAfter: 0.6,
    },
    {
      id: "review-edges",
      text: "The boundaries are where it breaks. Besides the missing sort, the comparison is a strict less-than. These are closed intervals, so one to two and two to three share the point two, and should merge. The code keeps them apart.",
      pauseAfter: 0.6,
    },
    {
      id: "review-contain",
      text: "And a merge sets the end to the new interval's end, even when that's smaller. One to ten, then two to three, becomes one to three. The merge shrank the interval it should have kept.",
      pauseAfter: 0.8,
    },
    {
      id: "review-tests",
      text: "Last check: would its tests fail without the change? Its second test asserts that one to two and two to three stay apart. That's the bug, written down as a requirement. On correct code, that test fails.",
      pauseAfter: 0.8,
    },
    {
      id: "review-fix",
      text: "Three changes fix it: sort the input, compare with less-than-or-equal, and keep the larger end. Then write the tests the review wanted: unsorted, touching and contained. On the assistant's code, all three fail. On the fix, all three pass.",
      pauseAfter: 0.7,
    },
    {
      id: "review-where",
      text: "Each bug is a boundary or an unstated assumption, which is where to look first. The obvious test touched none of them.",
      pauseAfter: 0.8,
    },
    {
      id: "review-past",
      text: "Then expect the follow-up: should touching intervals merge at all? Half-open booking slots, nine to ten and ten to eleven, don't overlap. So ask whether the end is inclusive, and write the answer down as a test.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "The fix also added a sort, which takes the merge from one pass to n log n. Reading code includes judging what it costs. Next: algorithms as reasoning.",
    },
  ],
};
