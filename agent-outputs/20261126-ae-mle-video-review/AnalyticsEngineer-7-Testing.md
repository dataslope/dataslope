# AnalyticsEngineer-7-Testing (9:53, 593.0 s)

Second review. The first pass is `agent-outputs/20261120-ae-interview-video-review/AnalyticsEngineer-7-Testing.md`, and its fixer's report is in that folder's `fixes/`.

## Verdict
- All thirteen earlier fixes hold on screen. Question 1's pipeline now reads `fct_orders` "built, then tested", then the stop bar, then `fct_revenue` "skipped", then the dashboard (element-060, -091). `unique` shows dbt's `WHERE order_id IS NOT NULL`, highlighted on "it skips nulls", beside "Not here: `unique` skips nulls" (element-146). `--defer: read from production` labels the `stg_orders` edge (element-313). "0 rows: pass" appears on the query alone, and the table arrives with the failures (sheet 02, 49 s and 51 s). The unit test's verdict holds about 2.5 s before the cut, and "Do both" holds about 1.8 s (448.4 to 450.2 s). The other fixes hold too: the bracket label, the green ledger value, the generic arrow, the Question 3 and 5 gaps, the project bracket, both axis titles and the chip margin.
- Every answer is right. On a second read against the page and dbt's behaviour, no answer stops short of a follow-up in a way that needs new words. Nothing needs re-voicing.
- What is left is small. One quick-round figure puts a `severity: warn` YAML right above a dial that errors at 100, which dbt would never do with that config, and it never names `warn_if` / `error_if`. One quick answer's last line leaves as soon as it is said. The closing card colors passing tests green, which the script's own rule forbids. One gap is cramped, and Question 6 runs about 6 s on a nearly empty page.

## Findings

### 1. [P3] explanation: the severity dial sits under a `severity: warn` YAML and never names `warn_if` / `error_if`
- When: 496.4-500.0 s, beat `r-severity` (element-500.jpeg)
- What: The page's YAML is a `not_null` with `severity: warn`, with the mark on that line. Directly under it, the dial reads "warn at 1" and "error at 100". Read as one picture, it shows a warn-severity test that errors at 100. dbt skips `error_if` entirely when `severity` is `warn`, so you get the dial's behaviour only on an `error`-severity test (the default) with `warn_if` and `error_if` set. Neither config key appears on screen or in the narration. The page names both.
- Why it matters: "How do you set those thresholds?" is the obvious follow-up. The figure gives no key to answer with, and the layout points at the one config that cannot produce the result.
- Cause: `video/src/videos/ae-testing/RapidScene.tsx:212-233` (the listing, then the dial, with no caption).
- Fix: Add a caption over the dial when it draws: "Thresholds: `warn_if`, `error_if`, at the default `error` severity". Move the dial down 20 px so the caption keeps 40 px from the listing above and from the "warn at 1" label below. No narration change: "Thresholds can warn at one failing row and error at a hundred" is right.

### 2. [P3] pacing: Question 13's last line clears as soon as it is said
- When: 479.6-481.5 s, beat `r-contract` (element-480.jpeg)
- What: "Before any consumer sees it" inks in on "before any consumer sees it" (479.6 to 481.4 s). "sees it" is cued 8 frames later. The body fades about 0.1 s after the narrator finishes the phrase, so "sees it" is up about 1.6 s. This is the same defect the first pass fixed on five other quick answers with `pauseAfter` 1.4. `r-contract` was left at 0.7.
- Why it matters: That line is why a contract matters (the failure happens at build time, ahead of consumers). It is the part of the answer that leaves fastest.
- Cause: `video/src/videos/ae-testing/script.ts:471` (`r-contract` pauseAfter 0.7).
- Fix: Set `r-contract` pauseAfter to 1.4. Timing only.

### 3. [P3] color: "All can pass" is green in the closing, on tests that pass while the numbers are wrong
- When: 583-593 s, beat `next` (element-590.jpeg)
- What: "All can pass" is set in the green ink, over a red "while two dashboards disagree". The script header's rule is that green never marks tests passing on wrong data, and it keeps neutral ink for exactly this in `fresh-valid`, `observe-run` and `metric`.
- Why it matters: It is the last figure in the video, and it breaks the color meaning the video kept for nine minutes.
- Cause: `video/src/videos/ae-testing/RapidScene.tsx:575` (`OK_INK`).
- Fix: Set it in `INK`.

### 4. [P3] spacing: Question 9's bar label sits 24 px under the column heading
- When: 357-390 s, from `observe-run` on (element-388.jpeg)
- What: "Rules you wrote in advance: they catch the expected" ends at y ≈ 336. The "30" over the 2 March bar starts at y ≈ 360. That is 24 px between two groups, where the house rule is at least 40.
- Cause: `video/src/videos/ae-testing/ObserveScene.tsx:85` (`barH` scales to `h(170)`).
- Fix: Scale the bars to `h(150)`, which lowers the "30" by 20 px. The base and both values stay the same.

### 5. [P3] lack of explanation: Question 6 defines freshness on a nearly empty page for about 6 s
- When: 231-238.5 s, beat `fresh` (element-237.jpeg)
- What: After the question card, two lines of small text ("A test / What the rows say", "Freshness / When they arrived: the newest row's age") and the clock are the whole page. That lasts through "A test checks what the data says. Freshness checks the clock: how old the newest row is". The `raw.orders` rows, which show what "the newest row" means, only start on "loaded-at column", the beat's last two words, at 238.0 s.
- Cause: `video/src/videos/ae-testing/FreshScene.tsx:153-166` (table, name and note cued from `loadedAt`).
- Fix: Bring the `raw.orders` name and rows in on "how old the newest row is" (`oldAt`, 235.5 s). Keep the newest row's band and its note on "loaded-at column". The table then has about 2.5 s more on screen, and the definition is spoken over the rows it describes.
