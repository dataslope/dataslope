# BackendEngineer-7-CodeReview (7:11, 430.8 s)

## Verdict
- A strong, honest video. Every value on screen matches `results.json` and the page (the 66% and 45%, [[8, 6]], [[3, 2]], the empty list, [[1, 3]], all three review tests red then green). Code appears only where reading it is the skill, and nothing is clipped, overlapping or under 19px.
- The biggest weakness is the answer, not the picture. Question 2 ends by calling the sort-only fix "right", with a green answer, while the function still merges [[1, 2], [2, 3]] and [[1, 10], [2, 3]] wrongly. The script's own argument (a bug report found one bug; a review before shipping finds all three) is never said aloud. The closing n log n line states the cost of the sort but never weighs it against the alternative.
- Two visuals contradict their own story. The review checklist ticks "does what was asked" green on code that does not do what was asked. The debugging round's payoff ("rerun", two ticks) is on screen for under a second.
- Pacing is mostly comfortable (2.2 to 3.0 words/s). The tight spots are the end of the debugging round (debug-ai at 3.29 w/s, debug-past at 3.02 w/s), where step 5's question is asked, then interrupted by the assistant aside, then answered after its text has gone.
- Color use is mostly disciplined. Green is used against its meaning three times: the half-open slots, the symptom patch's "+" line and the SQL injection string.

## Findings

### 1. [P2] answer: the debugging round calls a still-broken fix "right", and the review never says the round missed two bugs
- When: 236-282 s, beats `debug-cause`, `debug-explain`, `debug-past`; then 312-342 s, `review-diff`, `review-edges` (frames element-245.jpeg, element-257.jpeg, element-281.jpeg)
- What: After sorting, step 5 reads "Why is the fix right? the sort guarantees it" in green, all five steps are ticked, and "what else might share the flaw" is answered only with the two old tests. On screen, the "fixed" function still keeps `<` and `= end`, so it returns [[1, 2], [2, 3]] and [[1, 3]] for the review's two cases. Question 3 then says only "Besides the missing sort, the comparison is a strict less-than". The header's point (`script.ts`: "a review before it ships finds all three; a bug report found one") is never said.
- Why it matters: a viewer learns the debugging method leaves them with a "right" fix. An interviewer's first follow-up to "what else might share the flaw?" is "look at the lines next to it", and the video answers it with the tests only.
- Cause: `video/src/videos/be-code-review/script.ts:256-270` (debug-explain, debug-past) and `:284-292` (review-diff, review-edges); `DebugScene.tsx:395` (the green "the sort guarantees it").
- Fix: Narrow step 5's on-screen answer to "the sort guarantees the order the loop needs". End debug-past with: "Keep the reproduction as a third. And read the two lines beside the sort: the report found one bug, and there are two more." Open review-diff with: "The round found one bug, from a report, after it shipped. Read before it ships, the diff gives up all three."

### 2. [P2] confusion: "does what was asked, nothing else" is ticked green on code that does not do what was asked
- When: 313-342 s, beats `review-diff` to `review-edges` (frames element-325.jpeg, element-353.jpeg, element-401.jpeg)
- What: On "It touches one function and its tests, and nothing else", the first checklist row gets a green tick and keeps it to the end of the scene. The video then shows the code failing three cases of the job it was asked to do (merging intervals).
- Why it matters: green means the right answer in this series. Here it certifies the one claim the scene goes on to disprove, while narration only verified the scope half.
- Cause: `video/src/videos/be-code-review/ReviewScene.tsx:213` (`okAt: touchesAt + 8` on the combined label).
- Fix: Split the row into "does what was asked" (flagged with `badAt: breaksAt + 4`, beside the boundaries row) and "nothing else" (ticked at `touchesAt + 8`). Or relabel the ticked row "nothing beyond what was asked".

### 3. [P2] pacing: the round's payoff (rerun, all pass) is visible for under a second
- When: 243.5-245.8 s, beat `debug-cause` "All of them pass" (frames element-244.jpeg, element-245.jpeg)
- What: At 244 s the reproduction still reads "returns" with no value and the rerun row has no ticks. The ticks land at `allAt + 12` to `+18` frames. At 245.8 s the row is removed for step 5. The reproduction's green [[1, 2], [3, 4]] arrives with step 5 already being spoken.
- Why it matters: "the existing tests pass after the fix" is step 4's required evidence, and it is shown for about one second.
- Cause: `video/src/videos/be-code-review/DebugScene.tsx:380` (`out={step5 - 6}`), `:385` (verdicts at `allAt + 12 + i * 6`), `:301` (repro swap at `allAt + 4`).
- Fix: Raise debug-cause `pauseAfter` from 0.6 to 1.2. Bring the verdicts in at `allAt + 2 + i * 4` and the repro value at `allAt`. Keep the rerun row until `hereAt`, and drop the step-5 lines one row lower (`B + 56 + i * 56`).

### 4. [P2] confusion: step 5's third question is asked, interrupted and answered after it has gone, with the wrong step lit
- When: 250-282 s, beats `debug-explain`, `debug-ai`, `debug-past` (frames element-257.jpeg, element-267.jpeg, element-281.jpeg)
- What: "What else might share the flaw?" appears at about 250 s with no answer. It leaves at 258 s for the "ask an assistant" aside, and is answered at 269 s ("And what else shares the flaw?") with the question no longer on screen. Throughout that answer, the step list lights step 2, "Reproduce", not step 5.
- Why it matters: the method's last step is split around an aside, so the viewer loses which question the test grid answers.
- Cause: `video/src/videos/be-code-review/script.ts:261-270` (beat order); `DebugScene.tsx:398` (`out={aiAt - 6}` on all three step-5 lines); `DebugScene.tsx:273` (`relight={{ row: 1, at: noSubAt }}`, never handed back).
- Fix: Move `debug-ai` to sit between `debug-cause` and `debug-explain`, so step 5's three parts run straight into debug-past. Keep the third question's Note until the grid's `testsAt`, and relight row 4 at `pastAt`.

### 5. [P2] answer: the closing names the sort's cost but does not decide whether it is worth paying
- When: 416.7-428.2 s, beat `next` (frame element-429.jpeg)
- What: "one pass → n log n / what the fix costs", and "Reading code includes judging what it costs". No judgement follows. The alternative an interviewer will raise is not mentioned: state "input must be sorted" as a precondition (assert or document it) and let callers that already hold sorted data skip the sort. Also unmentioned: Python's sort is near linear on input that is already sorted, so the n log n is the worst case.
- Why it matters: the series argues decisions and trade-offs, and this is the one decision the worked example sets up.
- Cause: `video/src/videos/be-code-review/script.ts:319-321`.
- Fix: "The fix also added a sort: one pass becomes n log n at worst, and close to one pass when the input already arrives sorted. The alternative is to state the precondition and let callers sort. For a small helper, sorting inside is the safer default. Next: algorithms as reasoning."

### 6. [P3] accuracy: the contained-interval bug is labelled "boundary"
- When: 394-402 s, beat `review-where` (frame element-401.jpeg)
- What: Beside the `max(...)` line the label reads "boundary". [[1, 10], [2, 3]] is no edge case. The code assumes that an interval starting later also ends later, which sorting by start does not guarantee.
- Why it matters: "a boundary or an unstated assumption" is the takeaway, and the label files this bug in the less accurate box.
- Cause: `video/src/videos/be-code-review/ReviewScene.tsx:162` (`kinds = ["assumption", "boundary", "boundary"]`).
- Fix: `["assumption", "boundary", "assumption"]`. The narration still holds as written.

### 7. [P3] confusion: green used for things that are not the right answer
- When: 224-236 s (`debug-symptom`), 96-138 s (`bugs-errors` onward), 407-430 s (`review-past`, `next`) (frames element-235.jpeg, element-120.jpeg, element-415.jpeg)
- What: There are three cases.
  - The symptom patch, the fix the video calls wrong, is a full green "+" row.
  - The SQL-injection example `f"... WHERE id = {user_id}"` is all green (string highlighting). It is the only card in the grid whose flaw has no red.
  - The half-open booking slots are drawn green beside blue closed intervals, which reads as "half-open is the correct convention".
- Why it matters: it works against the series' one-meaning-per-color rule, each time on the element the viewer should distrust or treat as neutral.
- Cause: `DebugScene.tsx:253` (WHOLE.symptom drawn as a plain diff); `BugsScene.tsx:317` (Code highlighter on the f-string); `ReviewScene.tsx:449-450` (`color: OK`).
- Fix: Add a `MARK_BAD` mark on the symptom's `+` line at `patchAt + 6`. Add a red line "injectable" under the f-string, or set it in `ACCENT_INK`. Draw the half-open slots in `BAR` (blue), keeping the open circles.

### 8. [P3] other: the closing listing keeps a stale "+3 −3" diff tab
- When: 417-430 s, beat `next` (frame element-429.jpeg)
- What: The fixed function is shown plain, with no diff signs, under the tab "intervals.py +3 −3".
- Why it matters: a diff count on a listing that is no longer a diff.
- Cause: `video/src/videos/be-code-review/ReviewScene.tsx:353` (the fix's FileTab has no `out`).
- Fix: Give it `out={closeIn}` and add a plain `<FileTab name="intervals.py" at={closeIn} />`.

### 9. [P3] confusion: one boundary case shows "should be", the other does not
- When: 334-354 s, beats `review-edges`, `review-contain` (frame element-353.jpeg)
- What: The touching case reads in, "should be [[1, 3]]" in green, then "returns [[1, 2], [2, 3]]" in red. The contained case reads in, returns [[1, 3]], "the merge shrank it", and never shows the right answer [[1, 10]].
- Why it matters: the viewer has to work out the expected value for the case that is harder to see.
- Cause: `video/src/videos/be-code-review/ReviewScene.tsx:272-275` vs `:296-302`.
- Fix: Add `<Pair name="should be" value={REVIEW.fixed.contained.repr} ink={OK_INK} />` at `cTop + 190` on `shrankAt`, and move "returns" and "the merge shrank it" down one row (there is room above the 1080 edge: currently the last line sits at about 935).

### 10. [P3] pacing: an unread 20-word statistic in the reproduction step, with "fail" undefined
- When: 191-197 s, beat `debug-repro` (frame element-195.jpeg)
- What: "of every input with ends 0 to 4: one interval, 0 of 15 fail; two intervals, 35 of 225". It is on screen about 5 s while the narrator says something else, and "fail" is never defined (it means the result ends before it starts).
- Why it matters: at about 2 words/s this needs 10 s, and it supports "Two intervals are enough", which the narration already makes plain.
- Cause: `video/src/videos/be-code-review/DebugScene.tsx:326-331`.
- Fix: Shorten to "no single interval fails; 35 of 225 pairs do", or drop it.

### 11. [P3] answer: "no substitute for step two" is asserted without the reason, in the densest beat
- When: 258.3-269.0 s, beat `debug-ai`, 3.29 w/s, then `debug-past` at 3.02 w/s after a 0.6 s gap (frame element-267.jpeg)
- What: The video never says why an assistant cannot replace reproducing: its explanation is a hypothesis, and only a failing test shows the bug is real.
- Why it matters: "Why not just ask the assistant?" is the obvious follow-up in an AI-allowed round.
- Cause: `video/src/videos/be-code-review/script.ts:261-264`.
- Fix: "...It's no substitute for step two: what it tells you is a hypothesis, and only a failing test proves it." Raise `pauseAfter` to 0.8.

### 12. [P3] answer: "error paths" is flagged but never examined, and the empty-input case goes unsaid
- When: 326-342 s, beat `review-edges` (frame element-353.jpeg)
- What: The row "handles boundaries and error paths" goes red, but only the two boundary cases are discussed. `results.json` shows the empty list and a single interval come back correctly, which the Q1 card listed as a boundary to check ("the empty input"). Neither fact reaches the viewer.
- Why it matters: a reviewer who names the checks should be seen running them, including the ones that pass.
- Cause: `video/src/videos/be-code-review/script.ts:289-292`; `ReviewScene.tsx:215` (one row for two checks).
- Fix: Add to review-edges: "The empty list and a single interval come back fine." Relabel the row "handles the boundaries".

### 13. [P3] spacing: the page clears to the bare question card for about 2.5 s
- When: 55-58 s, beat `bugs-edge` "The usual suspects start at the edges" (frame element-057.jpeg)
- What: The survey bars and "Code that is almost right." fade on "The usual suspects", and the Boundaries card arrives only on "Boundaries", leaving an empty page in between.
- Why it matters: an empty page between ideas inside one question is one of the patterns this review is checking for.
- Cause: `video/src/videos/be-code-review/BugsScene.tsx:162` (`surveyOut = suspectsAt - 8`) vs `:237` (card at `boundAt - 4`).
- Fix: Use `surveyOut = boundAt - 10`, or bring the first card's rule and title in at `suspectsAt`.

### 14. [P3] other: the hook's headline drops its qualifier and reads as an overclaim
- When: 1-18 s, beat `hook` (frame element-017.jpeg)
- What: Narration says "Most of the code you'll be asked about in an interview, you didn't write". The headline says "Most of the code, you didn't write.", with a comma splice and the claim widened to all code.
- Why it matters: the headline is the only on-screen statement of the premise.
- Cause: `video/src/videos/be-code-review/HookScene.tsx:111`.
- Fix: `lead="The code you're asked about,"` `turn="someone else wrote."`, or `lead="Most interview code,"` `turn="you didn't write."`.

### 15. [P3] spacing: highlight padding opens visible gaps
- When: 152-157 s (`debug`), 83-138 s (`bugs-api` onward) (frames element-156.jpeg, element-120.jpeg)
- What: The quote marks stand apart from the highlighted words, as `“ read, debug and optimize ”`, because the `Mark` padding sits inside the quotes. "an invented package name:" is followed by a double-width gap before the highlighted clause.
- Why it matters: small typographic noise on two lines the narration points at.
- Cause: `video/src/videos/be-code-review/DebugScene.tsx:213`; `BugsScene.tsx:296-300`.
- Fix: Put the quote marks inside the `Mark` (`<Mark>“read, debug and optimize”</Mark>`). Drop the `{" "}` before the marked span in BugsScene, or give that Mark zero left padding.
