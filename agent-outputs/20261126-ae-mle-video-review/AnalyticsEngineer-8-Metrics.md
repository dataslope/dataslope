# AnalyticsEngineer-8-Metrics (10:45, 645.4 s)

Second review. Read against `agent-outputs/20261120-ae-interview-video-review/AnalyticsEngineer-8-Metrics.md` and its fixer's report.

## Verdict
- All thirteen earlier fixes hold on screen. Question 9's three revenues are in ink and become a green "the layer's revenue" with no SQL crowned (element-426); Question 15 has no stray dots before its marks; `fan-test` closes the hook with the failing unique test and "8 orders repeat" (element-137); no label is struck anywhere (elements 175, 370, 405); Question 5's tiers and askers, Question 6's early model boxes, Question 4's per-side evidence, Question 7's dot legend and Question 8's bracket are all in place. Question 10's red drift chain was left on purpose by the first pass and is not re-raised.
- Every number on screen still matches `results.json` and the narration. I rechecked the distinct-product grid, the per-order units and the 8 repeating orders by hand from the page's rows.
- What the first pass missed is two answers that do not hold up when an interviewer presses. Question 17 calls month-to-date revenue a trailing window. It is not: month-to-date is a to-date window that runs from the 1st, and the figure only draws a sliding window. Question 4's LEFT JOIN table shows Ben "refunded 0.00", but a left join alone leaves that cell NULL. The 0.00 comes from a COALESCE that only `check.mjs` has.
- The rest is polish. Question 9's heading still says "Without one" over the unified boxes. Question 7's "Non-additive" sits alone over an empty half for 15 s. Question 7 also says "not a rate column" beside a table that has one.
- Pacing is unchanged and comfortable: no gap under 0.55 s, and only two beats over 3 w/s (`chasm-left` 3.10, `nonadd-store` 3.21).

## Findings

### 1. [P2] accuracy: Question 17 calls month-to-date revenue a trailing window, and draws only a trailing window
- When: 563.4-582.3 s, beat `r-cumulative` (element-575.jpeg, element-582.jpeg)
- What: "It aggregates over a trailing window, like rolling twenty-eight-day active users, or month-to-date revenue." The heading reads "A trailing window, not a single period", and the only shape drawn is a 28-day band sliding along the day axis. Both examples are listed under it.
- Why it matters: a trailing window and a to-date window are the two kinds of cumulative metric, and they give different answers. On the 5th of a month, month-to-date covers 5 days and a trailing 28 days covers 28. dbt's cumulative metrics name them separately (`window` against `grain_to_date`). A viewer who repeats "month-to-date is a trailing window" gets corrected by the first interviewer who has built one. The page has the same slip ("a trailing window (rolling 28-day active users, month-to-date revenue)"), so the video follows the facts here, not the page.
- Cause: `video/src/videos/ae-metrics/script.ts:479-483` (the `r-cumulative` text); `video/src/videos/ae-metrics/RapidScene.tsx:475-496` (one heading and one band for both).
- Fix: split `r-cumulative` at its sentence breaks and re-voice only the middle sentence: "It aggregates over a window, not a single period: a trailing one, like rolling twenty-eight-day active users, or one from the start of the month, like month-to-date revenue." On screen, set the heading to "A window, not a single period" and keep the sliding 28-day band labelled "trailing". On "month-to-date", add a second band under the axis, from a tick marked "the 1st" to the right end, labelled "month to date".

### 2. [P2] accuracy: Question 4's LEFT JOIN shows Ben "refunded 0.00", which a left join does not return
- When: 220.1-229 s, beat `chasm-left` (element-227.jpeg)
- What: the table titled "totals, `LEFT JOIN`" reads Ben 40.00 / 0.00, with "Ben kept, refunded 0.00" in green under it. The listing beside it shows only the two branch CTEs. The statement that produced the row (`check.mjs`, `chasm.fix`) wraps both columns in `COALESCE(…, 0.00)`, and the screen never shows that.
- Why it matters: Ben has no refunds row, so a plain left join gives his `refunded` as NULL. Then `paid - refunded` is NULL too, and he drops out of any net total. "What does Ben's refund come back as?" is the obvious follow-up to the left-join point, which is the video's own step past the page. As drawn, the green row teaches that LEFT JOIN alone gives 0.00.
- Cause: `video/src/videos/ae-metrics/ChasmScene.tsx:280-296` (the title and note say LEFT JOIN only); `video/src/videos/ae-metrics/check.mjs:127` (the COALESCE).
- Fix: add a soft second line under "Ben kept, refunded 0.00": "`COALESCE` turns his NULL into 0.00", on its own cue after the green note. Lengthen `chasm-left`'s `pauseAfter` (free) so the finished table holds long enough to read it. No new words: the narration does not claim a value, so the screen is enough to stop the misreading.

### 3. [P3] confusion: Question 9's heading still says "Without one" once all three boxes read "the layer's revenue"
- When: 422-428 s, beat `r-truth` (element-426.jpeg)
- What: on "the same answer everywhere" the three tool boxes turn green and read "the layer's revenue". The line above them still reads "Without one, each tool writes its own revenue" until the item clears.
- Why it matters: for the item's last 5 s the heading describes the state the picture has just left, right above the picture that contradicts it.
- Cause: `video/src/videos/ae-metrics/RapidScene.tsx:62-64`.
- Fix: on the same unify cue, fade the heading out, then fade in "With one, every tool asks the layer" in its place, with no overlap (the same two-step the boxes use).

### 4. [P3] spacing: Question 7's "Non-additive" sits alone over the empty right half for 15 s, then reads as the week chart's title
- When: 320.5-336 s, beats `nonadd`, `nonadd-distinct` (element-331.jpeg, element-349.jpeg)
- What: "Because they're non-additive" puts "Non-additive" at the top of the right half, over nothing. The product grid builds on the left for 15 s. When the daily-active-users week arrives under it, the word becomes that chart's heading, and the grid it was also about has none.
- Why it matters: the answer to the question looks like a stray label first and the title of one example second.
- Cause: `video/src/videos/ae-metrics/NonaddScene.tsx:140-142` (`x={WEEK_X}`).
- Fix: move "Non-additive" to the left, above the grid, where it heads both examples. Give the week its own heading, "Daily active users", on the words that name it, on the line its legend already uses.

### 5. [P3] confusion: "Not a rate column" stands beside a table that has a rate column, with nothing tying them
- When: 365.4-372 s, beat `nonadd-store` (element-370.jpeg)
- What: the `daily` table still shows `rate_pct` (50.0, 2.0). Its red marks came off on "Sum the conversions". "Store: conversions, sessions, not a rate column" then appears at the far right with no link to the column it rules out.
- Why it matters: a careful viewer sees the advice contradicted by the table next to it.
- Cause: `video/src/videos/ae-metrics/NonaddScene.tsx:274-281` (the rate cells' marks end at `sumBothAt`) and `:314-316`.
- Fix: on "not a rate column", mark the two `rate_pct` cells red again, so the note points at the column it means.
