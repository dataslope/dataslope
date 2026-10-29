# DataAnalyst-0-Interview (1:41)

## Verdict
- A clean, legible opener. Its four scenes (three loop cards, four probe rows, four AI rows with a switch, the eight-video grid) build in step with the narration. Nothing overlaps or clips, and the smallest type is the 20px "Part N" label. The numbers check out: 156 is the sum of `data.ts` and matches each topic script's own count (10+14, 17+13, 14, 20, 18, 22, 19, 9), and the bank does hold 110 `<MultipleChoice>` blocks with 110 `[o]` answers.
- The practice claim is wrong in the same way as in the Data Scientist overview. "Every page has practice of its own: concept checks, runnable challenges, and a bank of 110…" is set on screen as "On every page: … runnable challenges · **110 multiple-choice questions**". Only 4 of the 8 topic pages (SQL, Pandas, Advanced SQL, A/B testing) have a challenge, and the 110 questions are one separate page.
- The AI scene cuts each of the page's four points down to a label. It drops the part an interviewer follows up on: what "responsibly" means (what you paste, disclosure, hallucinated insights), why checking now beats writing, and that BI tools only answer *correctly* on clean metrics. It also swaps the page's "checking beats writing" for an invented "as likely … as".
- Pacing is comfortable: 1.96 to 2.71 words/s, 1.6 s between scenes, and each scene's last element is up at least 2.8 s before its cut. The only timing slips are in the AI scene, where the yellow highlight stays on row 1 for 19 s and row 2 arrives 2 s after its sentence starts.
- As an opener it never says how the videos map onto the pages: each question is answered once, so a card's count is not its page's count. A few terms go unexplained ("grain", "windows", "loop"). The rest is polish: red used against the series' meanings, a double-width space in `GROUP BY` (the QMono fix missed this `Mono`), a ragged count baseline and a wrapped example line.

## Findings

### 1. [P2] accuracy: the practice line says every page has runnable challenges, and puts the 110-question bank "on every page"
- When: 84.3-91.4 s, beat `practice`, and on screen until the end at 100.7 s (frames element-090.jpeg, element-099.jpeg)
- What: Narration: "And every page has practice of its own: concept checks, runnable challenges, and a bank of a hundred and ten multiple-choice questions." On screen, one line: "On every page: concept checks · runnable challenges · **110 multiple-choice questions**". In `content/interview/data-analyst/`, `ChallengeCard`/`SqlChallengeCard` appear only on sql (2), pandas (1), advanced-sql (2) and ab-testing-and-metrics (1). statistics-and-communication, excel-and-spreadsheets, data-visualization and ai-assisted-analysis have none, and excel and data-visualization have no runnable code at all. The 110 questions are `multiple-choice-questions.mdx`, a page of their own. The index itself says "(where it fits) runnable challenges". Only the concept checks are on every page (each has at least one `<MultipleChoice>`).
- Why it matters: it promises practice that half the pages lack, and the bold 110 under "On every page:" reads as 110 questions on each page.
- Cause: `video/src/videos/da-interview/script.ts:55` (beat `practice`); `video/src/videos/da-interview/SeriesScene.tsx:119-124` (one line headed "On every page:").
- Fix: narration: "And every page has concept checks of its own, four add runnable challenges, and a bank of a hundred and ten multiple-choice questions covers the whole track." On screen: line 1 "Every page: concept checks · four pages: runnable challenges", then a second line at `practiceY + h(44)`, "A bank of 110 multiple-choice questions, across the track", cued to "a bank". Move the NextLine to `practiceY + h(114)`. Re-voice `practice` only and update its four cues.

### 2. [P2] answer: the AI scene reduces the page's four changes to labels and drops what an interviewer presses on
- When: 47.8-66.3 s, beat `ai` (frames element-054.jpeg, element-067.jpeg)
- What: The page's four points against the video's:
  - "Checking beats writing… because a plausible query is now cheap to produce" becomes "You're now as likely to check a query an assistant wrote as to write one", a frequency claim the page does not make. The reason is gone.
  - "Responsible use. What you would paste into an AI tool, how you disclose using one, and how you keep hallucinated insights out of a report" becomes "You'll be asked how you use these tools responsibly", and on screen just "Using these tools responsibly". The video says the question is coming but not what a good answer contains.
  - "Natural-language questions only get *correct* answers on top of clean, well-defined metrics, which is increasingly the analyst's job to provide" becomes "BI tools answer questions in plain language, but only on top of clean metrics". That says they will not answer otherwise, when the trap is that they answer wrongly. The analyst's job is dropped.
  - "The live SQL screen is usually AI-off, so fluency still matters" loses "so fluency still matters".
- Why it matters: "how do you use AI responsibly?" is a question this scene says the viewer will be asked, and it leaves them with nothing to say. The BI line, as worded, is wrong.
- Cause: `video/src/videos/da-interview/script.ts:44` (beat `ai`); `video/src/videos/da-interview/AiScene.tsx:55-58` (row texts).
- Fix: narration: "AI, artificial intelligence, has changed some of it. Checking now matters more than writing: expect a query an assistant wrote, and the question, is it right? You'll be asked how you use these tools responsibly: what you'd paste into one, how you say you used it, and how you keep an invented insight out of a report. BI tools now answer questions in plain language, but only correctly on top of clean, well-defined metrics, and defining those is becoming the analyst's job. And the live SQL round is usually AI-off, so fluency still matters. Ask the recruiter about each round." Split it into beats `ai`, `ai-use`, `ai-bi` and `ai-off`, each with `pauseAfter: 0.5`. Rows 1-3 become "Checking a query an assistant wrote, more than writing one", "Responsible use: what you paste in, disclosing it, no invented insights" and "BI tools that answer in plain language, correctly only on clean metrics". All stay under 1,250px at 34px. Row 4 keeps its text so the switch at `X0 + 640` still clears it.

### 3. [P3] explanation: "156 questions in all" never says each question is answered once, so a card's count is not its page's
- When: 76.2-78.0 s, beat `series`, and the counts on screen 71-100 s (frames element-077.jpeg, element-099.jpeg)
- What: The narration says "one video per topic page… a hundred and fifty-six questions in all", and each card gives a count. Those counts are the plan's after de-duplication, not the pages': the SQL page asks 32 `###` questions (card: 24), Statistics & communication 31 (card: 14), A/B testing 17 (card: 19, since it takes Statistics' Type I/II and power questions). The pages total 180. No video in the series says this aloud: Part 3 opens "There are fourteen questions to be ready for."
- Why it matters: the videos are meant to sit on their pages, and a viewer on the Statistics page will look for 17 answers that are in other parts. The overview is the one place that explains how the series works.
- Cause: `video/src/videos/da-interview/script.ts:50`; `video/src/videos/da-interview/data.ts:10-19`.
- Fix: add to the `series` narration, after "in all": "each answered once, in the video of the page it belongs to". Add the same as a 22px `INK_SOFT` line under "156 questions in all" (`SeriesScene.tsx:94-105`), cued to "answered once".

### 4. [P3] accuracy: "Four things, under all three." says more than the page
- When: 17.2-20.0 s, beat `probe`, and the headline until 43.5 s (frame element-042.jpeg)
- What: Narration "Under all three, interviewers check four things", headline turn "under all three." The page heading is only "What interviewers probe". No part of the loop checks all four: a SQL screen does not test a BI tool, and a spreadsheet question does not test SQL fluency.
- Why it matters: it is the same overstatement the Data Scientist overview made ("scored in every round"), on a smaller scale.
- Cause: `video/src/videos/da-interview/ProbeScene.tsx:40` (turn "under all three."); `video/src/videos/da-interview/script.ts:38`.
- Fix: turn "across the loop."; narration "Across the three, interviewers probe four things." Re-voice `probe` only (it is re-voiced anyway for finding 8). The cue `"four things"` is unchanged.

### 5. [P3] confusion: red used against the series' meanings, and green for "AI on"
- When: 21-43.5 s, beat `probe` (frame element-042.jpeg); 63.4-68.5 s, beat `ai` (frame element-067.jpeg)
- What: The four probe rows are numbered in red circles, the red that elsewhere means the trap or the wrong answer. In the AI scene, the switch knob is green on "AI on" and turns red as it throws to "AI off". Red, the error color, marks the usual and correct state of a live SQL round, and green suggests AI-on is the right answer. The advice "ask the recruiter about each round" is also set in red.
- Why it matters: one meaning per color is a series rule, and all three uses here are neutral.
- Cause: `video/src/videos/da-interview/ProbeScene.tsx:65,70` (`ACCENT_INK` border and numeral); `video/src/videos/da-interview/AiScene.tsx:31` (knob mixes `OK` into `ACCENT`); `video/src/videos/da-interview/AiScene.tsx:101` (`note(28, ACCENT_INK)`).
- Fix: number the circles in `BLUE_INK`, as the loop cards' "Part N" labels already are. Draw the knob in `INK_SOFT` at both ends, with no color mix. Set the recruiter line in `INK` and wrap it in a `<Mark at={askAt + 4}>` (yellow is what the narration points at).

### 6. [P3] confusion: the AI scene's highlight stays on row 1 for 19 s, and row 2 arrives 2 s late
- When: 49.0-68.5 s, beat `ai` (frames element-054.jpeg, element-067.jpeg)
- What: The yellow `Mark` sweeps under row 1 at 49.0 s and is never lifted. It stays through "responsibly", the BI sentence and the switch, so the highlight points at row 1 while the narration is on row 4. Row 2 is cued to "responsibly" (54.0 s), but its sentence starts at "You'll be asked" (52.0 s), so for 2 s the narrator reads a point the screen does not show yet.
- Why it matters: yellow is meant to follow the narration, and here it points at the wrong line for most of the scene.
- Cause: `video/src/videos/da-interview/AiScene.tsx:91` (`<Mark at={checkAt + 6}>` with no `out`); `video/src/videos/da-interview/AiScene.tsx:56` (cue `"responsibly"`).
- Fix: `<Mark at={checkAt + 6} out={rows[1].at}>`. Cue row 2 on `n.word("ai", "You'll be asked")`, or on the new `ai-use` beat's start if finding 2 is taken.

### 7. [P3] spacing: `GROUP BY` sets a double-width space (the QMono fix missed this `Mono`)
- When: 21.3-43.5 s, beat `probe` (frame element-042.jpeg)
- What: In "joins, GROUP  BY, WHERE and HAVING, CASE, windows", the gap between `GROUP` and `BY` is about twice the sans spaces around it. It reads as a typo.
- Why it matters: this is one of the already-fixed series defects, so the fix missed a case.
- Cause: `video/src/videos/da-interview/ProbeScene.tsx:25` uses `Mono`, re-exported from `video/src/videos/da-sql/parts.tsx:138-142`, which has no `wordSpacing`. Commit 05b0cad8 added `wordSpacing: "-0.3em"` only to `QMono` (`video/src/editorial/interview.tsx:40-44`).
- Fix: add `wordSpacing: "-0.3em"` to `Mono` in `da-sql/parts.tsx:139`. That also covers every other Data Analyst scene that sets multi-word code with it, so check those stills too. Otherwise use `QMono` at `ProbeScene.tsx:25`.

### 8. [P3] explanation: "grain" and "windows" go unexplained, and the SQL fluency list is never read
- When: 21.1-28.0 s, beat `probe` (frame element-042.jpeg)
- What: The narration says only "SQL fluency." and then, 1.2 s later, "Framing: the right grain…". The row's detail ("joins, GROUP BY, WHERE and HAVING, CASE, windows") is never spoken, and "windows" is shorthand for the page's "basic window functions". "The right grain" is said and shown with no gloss. For a newcomer this is the least familiar term in the video.
- Why it matters: this is the video a newcomer watches first, and the screen holds 8 unspoken words beside a term it never defines.
- Cause: `video/src/videos/da-interview/script.ts:38`; `video/src/videos/da-interview/ProbeScene.tsx:25-26`.
- Fix: narration: "SQL fluency: joins, GROUP BY, WHERE against HAVING, CASE, and window functions. Framing: the right grain, meaning what one row stands for, nulls handled, nothing counted twice after a join." On screen, "windows" becomes "window functions" and the Framing detail "the right grain (what one row is), nulls handled, nothing counted twice after a join". That is about 1,110px at 28px, ending near x = 1,690, inside the right margin.

### 9. [P3] confusion: two "Part N" counters in one video, and "loop" is never said
- When: 5.1-17 s, beat `loop` (frame element-016.jpeg); 71-100 s, beats `series` to `next` (frame element-099.jpeg)
- What: The loop cards are labelled "Part 1 of the loop" to "Part 3 of the loop", and the series cards "Part 1" to "Part 8". Loop Part 2 is "Spreadsheets and statistics" and video Part 2 is Pandas. The narration says "three parts" but never "loop", so the on-screen word is never introduced.
- Why it matters: the plan dropped figure numbers so that one thing never has two counters. Here two things share one counter.
- Cause: `video/src/videos/da-interview/LoopScene.tsx:39` (`` `Part ${i + 1} of the loop` ``).
- Fix: label the loop cards "1 of 3", "2 of 3" and "3 of 3", and keep "Part N" for the videos only.

### 10. [P3] spacing: the spreadsheets card's example line wraps on a dangling article
- When: 9.6-17 s, beat `loop` (frame element-016.jpeg)
- What: "a pivot table, a lookup, a median, a" ends line 1, and "p-value" sits alone on line 2.
- Why it matters: it is the only ragged break in the scene.
- Cause: `video/src/videos/da-interview/LoopScene.tsx:87` (one 24px run in a 456px text column).
- Fix: two divs, one per half of the title: "a pivot table, a lookup" and "a median, a p&#8209;value".

### 11. [P3] spacing: Statistics & communication's count drops below its row
- When: 71-100 s, beats `series` to `next` (frame element-099.jpeg)
- What: In row 1, "Statistics & communication" wraps to two lines, so "14 questions" sits at about y = 445 while the other three counts sit at y = 412. Row 2 wraps on every card and stays level.
- Why it matters: one ragged baseline in an otherwise regular grid.
- Cause: `video/src/videos/da-interview/SeriesScene.tsx:83-87` (title and count in one top-anchored block).
- Fix: move the count into its own div, anchored at `bottom: h(36)`, `left: ART + 32`, so every count in a row shares a baseline.

### 12. [P3] other: the AI headline reads as a fragment and differs from the narration
- When: 43.8-68.5 s, beat `ai` (frame element-067.jpeg)
- What: The headline reads "AI, artificial intelligence, changed some of it." The narration says "has changed". On screen the appositive spelling-out (written for Drew's ear, per the script header) makes the headline read as a broken sentence. The kicker above already reads "What AI has changed".
- Why it matters: on-screen text that differs from what is said, in the largest type on the page.
- Cause: `video/src/videos/da-interview/AiScene.tsx:73`.
- Fix: `lead="AI has changed"`, `turn="some of it."`. Keep the spelling-out in the narration only.

### 13. [P3] other: the bridge's "the same screen" points back 90 seconds
- When: 93.3-95.6 s, beat `next` (frame element-099.jpeg)
- What: "Almost every interview opens with the same screen. Next: SQL." "The same screen" refers to "a SQL screen" in the first beat, 90 s earlier, so it reads as "the same screen as what?" The opening order is also the plan's, not the page's: the page says only to "expect a take-home or live SQL screen". Part 1 does open on this claim, so the hand-off itself works.
- Why it matters: the closing line is the one a viewer carries into Part 1, and its referent is lost.
- Cause: `video/src/videos/da-interview/script.ts:58`.
- Fix: "Almost every interview has a SQL screen, and the series starts there. Next: SQL." Otherwise use the plan's own wording: "Almost every loop opens with SQL. Next: the SQL screen." The cues `"the same screen"` (`SeriesScene.tsx:41`) and `"Next"` move with the wording.

### 14. [P3] spacing: the AI scene leaves the right of the frame empty for 25 s
- When: 43.5-68.5 s, beat `ai` (frame element-067.jpeg)
- What: Four left-aligned lines and a small switch. Everything right of x ≈ 1,120 is blank for the whole scene. The loop and probe scenes have no spot illustration either, so the first watercolor art appears at 71 s.
- Why it matters: the frame has room for the scene's image, and the series' style puts one there.
- Cause: `video/src/videos/da-interview/AiScene.tsx:71-108` (no illustration).
- Fix: add `<Hero video="da-ai-assisted" id="da-ai-assisted-owl" at={from + 10} left={1360} top={y(300)} width={420} height={420} />` (the owl is already used on card 8; import `Hero` from `./parts`). The rows end near x = 1,120 today and near x = 1,290 with finding 2's wording, so both clear it.

### 15. [P3] pacing: the series scene opens on its kicker alone for about a second
- When: 68.5-69.4 s, beat `series` (tile at 69 s, element-069.jpeg)
- What: After the cross-fade, the page shows only "The series" in 22px until the headline inks in on "follows the track".
- Why it matters: a near-empty page while the narrator talks. The other three scenes start their headline 2 to 4 frames after their beat starts.
- Cause: `video/src/videos/da-interview/SeriesScene.tsx:59` (`at={followsAt - 2}`).
- Fix: `at={from + 2}`, keeping `turnAt={pageAt}`.
