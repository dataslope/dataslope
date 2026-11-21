# AnalyticsEngineer-7-Testing (9:40, 580.2 s)

## Verdict
- A careful, honest video. Every number on screen matches `results.json` and the page (24 rows and 21 orders, 3,569.50 against 3,234.50, orders 2, 11 and 19, order 3 / the null / 'returned' / customer 99 / order 7 at -25.00, (3, 2), 3 h / 8 h / 13 h, 3 of 4 models, 30 then 20 and -33.3%, 350.00 against 150.00, 300.00 against 100.00). Nothing is clipped or overlapping, and color meanings hold almost everywhere.
- The worst defect is a picture that teaches the wrong mechanism. Question 1's pipeline puts the dashboard directly under the tested `fct_orders` and says "No bad rows reach it". `dbt build` materializes a model before it tests it, so a dashboard reading that table sees the duplicates. Question 8 later gets this right (the marts downstream keep yesterday's rows), which makes Question 1 inconsistent with it.
- Two answers stop one step short of the follow-up an interviewer asks. "A single null isn't a duplicate" implies two nulls would be caught, but dbt's `unique` test filters nulls out (`where col is not null`). Slim CI never mentions defer, though the figure builds `fct_orders` without its unchanged parent `stg_orders`.
- Pacing is comfortable (147 wpm, most beats 2.3 to 3.1 w/s, no gap under 0.55 s). It tightens at the end of Question 10 (`metric-unit` at 3.47 w/s, with the unit test's verdict held about 2 s before the cut). In the quick round, several answers' last line ("Do both", "error at 100", "gets ignored", "you can query", "Fixed once, for all three") is on screen 1.0 to 1.6 s before it clears.
- The rest is polish: a green label bracketing two red results, the finance ledger's correct value marked red, a few cramped gaps, two charts without an axis title, and chips 32 px from the frame edge.

## Findings

### 1. [P1] accuracy: Question 1's pipeline shows a failing test keeping bad rows away from a dashboard that reads the tested table
- When: 53-93 s, beats `asserts-zero` to `surface-fix` (element-061.jpeg, element-084.jpeg, element-092.jpeg)
- What: The diagram shows `fct_orders` in a box, then a line cut by the red stop bar ("run fails", "Stopped, loudly"), then a dashed "Dashboard" box with "No bad rows reach it". The test is on `fct_orders` itself. `dbt build` runs the model and then its tests, so by the time `unique` fails, `fct_orders` already holds the 24 rows. A failing test makes dbt skip the downstream nodes. Anything that reads `fct_orders` directly still gets the duplicates, and the hook's dashboards do exactly that ("every dashboard that reads the table").
- Why it matters: a viewer learns that a test on a model protects that model's own readers. "Did the bad data still land in the table?" is the standard follow-up, and the video's own Question 8 answers it the right way (the marts downstream keep yesterday's rows).
- Cause: `video/src/videos/ae-testing/AssertsScene.tsx:218-233` (dashboard box straight under the model, "No bad rows reach it").
- Fix: Put a downstream mart between the stop bar and the dashboard. Draw `fct_revenue` as a skipped box with a gray "skipped" chip, then the dashboard under it, and keep "No bad rows reach it". Give the `fct_orders` box the subtitle "built, then tested", so the order of events is on screen. No narration change: "It stops the pipeline loudly, instead of letting bad rows reach a dashboard quietly" holds once the dashboard reads the mart.

### 2. [P2] accuracy: "a single null isn't a duplicate" gives the wrong reason `unique` lets the null through
- When: 134-147 s, beat `builtins-pair` (element-145.jpeg)
- What: Narration: "Notice that unique let the missing ID through: a single null isn't a duplicate." On screen, `unique` is `GROUP BY order_id HAVING COUNT(*) > 1`, which in Postgres would return a group of two nulls. dbt's real `unique` test (`default__test_unique`, the same in dbt-core 1.7 and dbt-adapters main) has `where {{ column_name }} is not null` before the `group by`. It skips nulls entirely, so any number of null keys pass.
- Why it matters: "And if there were two null IDs?" is the natural follow-up. A viewer would answer "unique catches them", which is wrong, and it is the actual reason the two tests are paired.
- Cause: `video/src/videos/ae-testing/script.ts` (`builtins-pair`); `check.mjs:94` (`COMPILED.unique` without the null filter); `BuiltinsScene.tsx:114` (pane lines from `GROUP BY`), `:257` ("Not here: the null row").
- Fix: Add `WHERE order_id IS NOT NULL` to `COMPILED.unique` in `check.mjs` (the result stays [[3, 2]]) and show it in the pane (`linesFrom(sql, "WHERE", "HAVING")`). Split `builtins-pair` after its first sentence and re-voice only that sentence: "Notice that unique let the missing ID through: it skips nulls, so even two of them would pass." Change the note to "Not here: unique skips nulls". Recut the rest from the take.

### 3. [P2] answer: slim CI never mentions defer, though the figure builds `fct_orders` without `stg_orders`
- When: 284-306 s, beats `ci-state`, `ci-slim` (element-305.jpeg)
- What: "Change the customer staging model here, and three of the four models are built and tested. Orders staging is left alone." `fct_orders` is one of the three, and it reads `stg_orders`, which this CI run does not build. In a CI schema, that `ref()` resolves only with `--defer` (dbt Cloud CI jobs defer automatically). The page's command omits it, and the video copies the omission.
- Why it matters: "Where does `fct_orders` get `stg_orders` from in CI?" is the first follow-up to state:modified+, and the answer stops one step before it.
- Cause: `video/src/videos/ae-testing/script.ts` (`ci-state`); `CiScene.tsx:231-243`.
- Fix: A new beat after `ci-state`, `ci-defer`: "With the defer flag, the orders fact table reads production's copy instead." On screen, label the `stg_orders` to `fct_orders` edge "`--defer`: read from production", and draw that edge in the off gray.

### 4. [P2] confusion: "0 rows: pass" in green sits beside the very table that fails the test
- When: 48.0-50.9 s, beat `asserts-zero` (element-050.jpeg)
- What: On "Zero rows back, and the test passes", the result pane is empty under a green "0 rows: pass". The 24-row table with orders 2, 11 and 19 twice is already on screen beside it. The query, as drawn, returns three rows on that table.
- Why it matters: for three seconds, the figure claims the test passed on data it fails. It is the series' "green marks the trap" problem in a weaker form.
- Cause: `video/src/videos/ae-testing/AssertsScene.tsx:198-212` (table and name in at `queryAt + 6`).
- Fix: Bring the table's name and rows in on "Any rows back" (`anyAt`), with the failures, so the pass state is shown as the rule on the query alone. Move the table's sprinkle to the same cue.

### 5. [P2] pacing: the unit test is built at 3.47 w/s and held about 2 s
- When: 408.5-423.6 s, beats `metric-why` (3.14 w/s), `metric-unit` (3.47 w/s) (element-422.jpeg)
- What: `metric-unit` is the fastest beat in the video, and it brings a new concept (a unit test as given, actual and expected). Its row builds from 417 s to 421 s, and "unit test: fail" lands about 2 s before the cut to the quick round.
- Why it matters: the result the question builds to (300.00 against an expected 100.00) is the shortest-lived figure in the video.
- Cause: `video/src/videos/ae-testing/script.ts` (`metric-why` pauseAfter 0.6, `metric-unit` 0.8, under the 1.6 s scene gap).
- Fix: Split `metric-unit` at its colon ("And a unit test would have caught it before it shipped:" / "one mocked order of a hundred dollars, with three items, comes out at three hundred.") with `--recut`, at no voice cost, and a 0.5 s pause between. Set `metric-why` pauseAfter to 0.9 and the last beat to 2.4.

### 6. [P2] pacing: quick-round answers clear about a second after their key line lands
- When: `r-source` "Do both" 439.0-440.1 s (about 1.1 s); `r-severity` "error at 100" 488.9-490.3 s (1.4 s); `r-fatigue` "gets ignored" 503.5-504.8 s; `r-store` "you can query" 548.8-550.1 s; `r-upstream` "Fixed once, for all three" 565.9-567.3 s (element-439.jpeg, element-489.jpeg, element-565.jpeg)
- What: Each quick answer's body fades out 10 frames before the next "Question n". The answer's conclusion lands on its beat's last words, with 0.7 s of pause after them.
- Why it matters: "Do both" is the whole answer to Question 11, and it is up for about a second. The brief lists this as a recurring defect.
- Cause: `video/src/videos/ae-testing/script.ts` (pauseAfter 0.7 on those beats, 1.0 on `r-upstream`); `RapidScene.tsx` bodies end at the next item's cue (the kit's `RapidFire`).
- Fix: Set pauseAfter to 1.4 on `r-source`, `r-severity`, `r-fatigue` and `r-store`, and to 1.6 on `r-upstream`. This is timing only.

### 7. [P3] confusion: a green "= a valid primary key" brackets two red "1 row: fail" results
- When: 143-147 s, beat `builtins-pair` (element-145.jpeg)
- What: The bracket encloses the `unique` and `not_null` result panes, both failing, and labels them green "= a valid primary key".
- Why it matters: read quickly, it says this data has a valid key, when both tests just failed on it.
- Cause: `video/src/videos/ae-testing/BuiltinsScene.tsx:262-264`.
- Fix: Label it "Both passing: a valid primary key".

### 8. [P3] confusion: finance's 150.00, the correct figure, is marked red
- When: 405-414 s, beat `metric-recon` (element-407.jpeg)
- What: In the reconciliation's result, both 350.00 (the model, wrong) and 150.00 (the ledger, right) carry the red mark.
- Why it matters: red means the error in this series. The ledger value is the truth the model is checked against.
- Cause: `video/src/videos/ae-testing/MetricScene.tsx:190`.
- Fix: Mark the finance cell with `MARK_GREEN`.

### 9. [P3] spacing: "Make it generic" sits about 170 px from the arrowhead that points at it
- When: 182-185 s, beat `singular-pick` (element-184.jpeg)
- What: The arrow from the three copied model names ends at x ≈ 440. The label it points to ends at x ≈ 265.
- Cause: `video/src/videos/ae-testing/BuiltinsScene.tsx:339` (`COL_X[0] + 330`).
- Fix: End the arrow 18 px right of the label (`COL_X[0] + 190`).

### 10. [P3] spacing: two groups sit about 20 px apart in Questions 3 and 5
- When: 113-147 s (`builtins-run` on), 210-223 s (`compound-pair`) (element-121.jpeg, element-221.jpeg)
- What: In Question 3, `accepted_values`' "1 row: fail" badge sits about 20 px under the `not_null` result's bottom rule, closer to it than to its own table. In Question 5, "Or a singular test, grouped by both" starts about 20 px under the YAML listing above it. The house rule is at least 40 px between groups.
- Cause: `BuiltinsScene.tsx:125` (pane spacing ignores the badge above each result); `CompoundScene.tsx:96` (`pairTop = y(570)`).
- Fix: Space the panes by `max(listing, result + 24)` and lift the figure 30 px (`FIG_Y` 300). Set `pairTop` to `y(600)`.

### 11. [P3] confusion: the production manifest is "compared" with `fct_orders` alone
- When: 288-306 s, beat `ci-state` (element-305.jpeg)
- What: The dashed line runs from "Production manifest" to `fct_orders`'s box. State comparison is between the whole project and the manifest.
- Cause: `video/src/videos/ae-testing/CiScene.tsx:231-234`.
- Fix: Draw a dashed gray bracket down the right of the whole DAG, and run the "compared" line from the manifest to its middle.

### 12. [P3] explanation: two charts without an axis title
- When: 349-382 s, `observe-run` on (element-380.jpeg); 262-271 s, `fresh-two` (element-270.jpeg)
- What: Question 9's bars read 30 and 20 over "2 March" and "3 March", with no unit (orders loaded). Question 6's sketch has "6 h" and "12 h" on an untitled y axis: it is the data's age at each day's check.
- Cause: `ObserveScene.tsx:136-146`; `FreshScene.tsx:271-281`.
- Fix: Add "Orders loaded" over the bars, and "Age at each check" over the sketch's y axis.

### 13. [P3] spacing: the "COALESCE patch" chips end 32 px from the right edge
- When: 556-567 s, beat `r-upstream` (element-563.jpeg)
- Cause: `video/src/videos/ae-testing/RapidScene.tsx:431` (`mx = BX + 400`).
- Fix: Set `mx` to `BX + 340`, which puts the chips' right edge at about 1810.
