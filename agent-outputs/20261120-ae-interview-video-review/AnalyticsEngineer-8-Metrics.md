# AnalyticsEngineer-8-Metrics (10:33, 633.4 s)

## Verdict
- A solid, evidence-led video. Every number on screen matches `results.json` and the narration (1,949.25 and 4,555.25, 24 joined rows, 2.34 times, 150.00 to 350.00, 38 units, 12 distinct orders, 180.00/30.00 against 360.00/90.00, Ben's 40.00, 24 against 7 products, 26.0% against 2.5%), and the eight worked answers hold up against the revised page, often one step past it (the left-join point in Question 4, the ratio's limits in Question 8). The page's definition is named "completed revenue" everywhere it appears (Question 5, Question 11's YAML, Question 13).
- The one serious problem is in the quick round. Question 9's three hand-written revenues are colored so that plain `SUM(amount)` is the right one and the net-of-tax and net-of-refunds versions are red, and the "one definition" they all become is green `SUM(amount)`. That tells the viewer gross revenue is correct and net revenue is a mistake, which Part 9 (net revenue is the governed metric) directly contradicts.
- The opening's hook ("Every test passes") is never closed: the video shows how to spot a fan-out (the row count) but not the test that would have failed, which is the obvious interview follow-up.
- Visual defects are local: stray green and red dots stand where Question 15's ticks and crosses will be drawn for 6 to 14 s, and four labels are struck through (Q3, Q7, Q8 twice), against the series' "no line through a label" rule.
- Pacing is comfortable (every beat 1.9 to 3.2 w/s, no gap under 0.55 s). The remaining findings are polish: unlabelled tiers and lines, two arrows that leave from the wrong place, a near-empty frame in Questions 4 and 6, and blue used on two notes that are not data.

## Findings

### 1. [P1] accuracy: Question 9 colors gross `SUM(amount)` as the right revenue and net revenue as wrong, then makes it the one definition
- When: 404-418 s, beat `r-truth` (element-415.jpeg, element-416.jpeg)
- What: "Without one, each tool writes its own revenue" shows three boxes: Dashboard `SUM(amount)` in ink, Notebook `SUM(amount - tax)` in red, Dashboard `SUM(amount - refunds)` in red. Red is the series' color for the trap or the wrong answer. At the beat's end all three crossfade to a green `SUM(amount)` (green, the right answer), and during the crossfade the old and new text overprint ("SUMSUM(amount)ax)").
- Why it matters: the point of the question is that every tool re-implements revenue differently and no copy is the reference. The colors instead teach that subtracting refunds is a mistake and gross revenue is the answer. Part 9 makes net revenue (completed orders, test accounts out) the governed metric and treats "completed revenue" as a duplicate; a viewer who watches both is told opposite things. The brief for this video is explicit that no reading of revenue is presented as the one correct revenue.
- Cause: `video/src/videos/ae-metrics/RapidScene.tsx:69` (`color: i ? ACCENT_INK : INK`), `:71` (the unified text is `tools[0].sql`, in `OK_INK`), `:565` (`unifyAt={n.beat("r-truth").to}`, so the change lands as the item fades).
- Fix: draw all three expressions in ink: three different answers, none marked right. On "the same answer everywhere", fade each expression out and then, without overlap, fade in the same line in all three boxes, "the layer's revenue" in green (no SQL, so no reading of revenue is crowned), with the boxes toning to green. Question 10's drift chain keeps its red: there red marks the copies that changed from their source, which is the trap that question is about.

### 2. [P2] spacing: Stray dots stand where Question 15's ticks and crosses will be drawn
- When: 514.5-530 s, beat `r-additive` (element-516.jpeg, element-519.jpeg, element-522.jpeg)
- What: as soon as Question 15's panel opens, six small dots (green for the ticks, pairs of red for the crosses) sit in an otherwise empty right half. Each stays until its mark is drawn: about 6 s for the revenue row, about 9 s for the balance row's cross and about 14 s for the ratio row.
- Why it matters: they read as rendering debris in an empty panel for the whole question read-out.
- Cause: `video/src/videos/ae-metrics/RapidScene.tsx:397-398`. The `Tick` and `Cross` paths have round line caps and a dash of length `ease(...) = 0`, which still paints a cap. Questions 14 and 16 hide the same component inside an `Ink` that is transparent before its cue; Question 15 places them in bare divs.
- Fix: give each mark's wrapper `opacity: ease(frame, at, 4)` on its own cue (`r.at + 4`, `r.bAt + 4`), as Question 19 already does for its cross (`RapidScene.tsx:248`).

### 3. [P2] answer: The opening's "every test passes" is never answered with the test that would fail
- When: 0.6-11.8 s, beat `hook`, and 120.1-126.2 s, beat `fan-tell` (element-032.jpeg, element-126.jpeg)
- What: the video opens on four passing tests (unique and not_null on `orders.order_id`, not_null and relationships on `order_items.order_id`) beside the two disagreeing dashboards, and Question 2 ends on "The tell is the row count. Twelve orders went into the join, and twenty-four rows came out." It never says why every test passed (each one checked an input table) or which test catches a fan-out (one on the grain of what the join produces).
- Why it matters: "so what test would have caught it?" is the first thing an interviewer asks after the hook's premise, and the series' Part 7 is about testing. The video stops one step short.
- Cause: `video/src/videos/ae-metrics/script.ts:242-246` (fan-tell is the scene's last beat); `FanScene.tsx:333-353`.
- Fix: a new beat after `fan-tell`, voiced alone: "Every test passed because each one checked an input table. Run a unique test on order ID against the joined rows, and it fails: eight orders repeat." Add the check to `check.mjs` (the joined rows grouped by `order_id`, `HAVING COUNT(*) > 1`: 8 rows) and show it under "24 rows out" in the hook's test style: `unique` with a red "fail" badge, then "on the joined rows: 8 orders repeat".

### 4. [P2] confusion: Four labels are struck through
- When: 151-164 s, beat `avoid-after` (element-163.jpeg); 354-360 s, beat `nonadd-store` (element-359.jpeg); 372-395 s, beats `ratio` and `ratio-week` (element-394.jpeg)
- What: a red line is drawn through `SUM(o.amount)` ("repeats per item"), through `rate` under "Store", and through "a stored, pre-divided rate" and "an average of daily rates". The line crosses the glyphs at x-height, so each label is harder to read exactly when it carries the point.
- Why it matters: lines through labels recur across this review series and the series rule is no line through a label. Red already says "not this".
- Cause: `video/src/videos/ae-metrics/AvoidScene.tsx:167-169`, `NonaddScene.tsx:311-315`, `RatioScene.tsx:154-163` (each uses `Strike`).
- Fix: say it in words, in red, with no line: "not `SUM(o.amount)`: it repeats per item"; "not the rate"; "never a stored, pre-divided rate" and "never an average of daily rates".

### 5. [P3] confusion: Question 5's tiers are unnamed and the two requests are not tied to their SQL
- When: 217.7-253 s, beats `layer`, `layer-once` (element-252.jpeg)
- What: the narration says the layer sits "between your models and the BI tools", but the rows of boxes are not labelled as either. Two yellow arrows leave Dashboard and Spreadsheet on "by month" and "by region", while the requests and their SQL appear on the right with nothing linking them to those two tools.
- Why it matters: the viewer has to infer which tool asked which question and which row is "the models".
- Cause: `video/src/videos/ae-metrics/LayerScene.tsx:97-135`.
- Fix: soft labels "BI tools" and "models" to the right of the top and bottom rows (the space beside "defined once" is free), and name each request's asker: "Dashboard: completed revenue by month", "Spreadsheet: completed revenue by region".

### 6. [P3] confusion: The "gap grows" lines are unlabelled, under two tiles that already agree
- When: 65.8-75.6 s, beat `disagree-widen` (element-074.jpeg)
- What: two blue lines with a yellow gap between them, no legend, directly under the two green tiles that now both read 1,949.25.
- Why it matters: the viewer cannot tell what the lines are, and the nearest numbers say the gap is already closed.
- Cause: `video/src/videos/ae-metrics/DisagreeScene.tsx:183-198`.
- Fix: label the line ends "definition A" and "definition B" (soft ink, inside the frame), and set the heading to "Left alone, two definitions drift apart" so it is read as the counterfactual.

### 7. [P3] explanation: "counted by one" is cryptic
- When: 42.6-75.6 s, beat `disagree-how` (element-066.jpeg)
- What: the first cause reads "Filters / refunds, tax or cancelled orders, counted by one".
- Why it matters: "counted by one" reads as arithmetic, not "one dashboard counts them and the other doesn't".
- Cause: `video/src/videos/ae-metrics/DisagreeScene.tsx:43`.
- Fix: "refunds, tax, cancelled orders: one counts them".

### 8. [P3] confusion: Question 8's week flows into the two measures from between Wednesday and Thursday
- When: 376.3-395 s, beat `ratio-week` (element-394.jpeg)
- What: the two blue arrows start beside Wed and Thu, so they read as Wednesday feeding the numerator and Thursday the denominator.
- Why it matters: the point is that the whole week is summed into both.
- Cause: `video/src/videos/ae-metrics/RatioScene.tsx:142-148`.
- Fix: a blue bracket down the right of Mon to Sun, with both arrows leaving its middle.

### 9. [P3] explanation: Question 7's week chart never says what a dot is
- When: 324.4-339 s, beat `nonadd-users` (element-337.jpeg)
- What: dots over Mon to Sun under the heading "Non-additive"; nothing says a dot is a user active that day.
- Why it matters: "counted twice" only makes sense once the dot is known to be a person.
- Cause: `video/src/videos/ae-metrics/NonaddScene.tsx:221-242`.
- Fix: on "Daily active users", a soft line above the chart: "daily active users: a dot is a user".

### 10. [P3] spacing: Question 6 leaves the lower half of the frame empty for 30 s
- When: 253.3-284.2 s, beats `entities`, `entities-dbt` (element-271.jpeg, element-277.jpeg)
- What: the three columns fill the top band; nothing appears below them until `entities-run`.
- Why it matters: the definitions are read with nothing to anchor them, while the page's two tables, which the scene draws later, would show each role on a real column.
- Cause: `video/src/videos/ae-metrics/EntitiesScene.tsx:195-219` (the model boxes start at `declaredAt`).
- Fix: bring the two semantic-model boxes in with the columns, each role row on its definition's cue (entity order, dimension item, the two measures), and keep `entities-run` for lighting them and running the join.

### 11. [P3] spacing: Question 4 clears its evidence and leaves the lower 60% empty for 8 s
- When: 193.5-201.5 s, beats `chasm-diff`, `chasm-fix` (element-194.jpeg, element-197.jpeg)
- What: on "A fan trap inflates one measure" Ada's tables and the red 360.00 / 90.00 vanish; for about a second only "Fan trap" and one box are on the page, and the comparison then fills only the top band.
- Why it matters: "both inflate" refers to numbers that have just left the screen.
- Cause: `video/src/videos/ae-metrics/ChasmScene.tsx:79-80` (`phaseOut = fanOneAt + 2`), `:206-232`.
- Fix: put the evidence under each side's caption: under the fan trap "4,555.25 from 1,949.25", under the chasm trap "360.00 from 180.00, 90.00 from 30.00" (red), on their sentences.

### 12. [P3] confusion: Blue used on two notes that are not data
- When: 274.5-302 s, beat `entities-dbt` (element-301.jpeg); 497.3-513 s, beat `r-contains` (element-513.jpeg)
- What: "In dbt today: inside a simple metric" and "A ratio adds a numerator and a denominator" are set in the data blue.
- Why it matters: one meaning per color; these are statements, not data.
- Cause: `video/src/videos/ae-metrics/EntitiesScene.tsx:191`, `RapidScene.tsx:358`.
- Fix: ink (or soft ink) for both.

### 13. [P3] explanation: Question 13's metric example is a name only
- When: 477.8-497 s, beat `r-measure` (element-496.jpeg)
- What: "Measure: `SUM(amount)`" against "Metric: built from measures, with filters, ratios or time logic: completed revenue". The screen never shows completed revenue being built from that measure.
- Why it matters: the difference is the filter on top of the measure; showing it makes the answer visible.
- Cause: `video/src/videos/ae-metrics/RapidScene.tsx:329-331`.
- Fix: under "completed revenue", the soft mono line "`SUM(amount)` where status = 'completed'", with `SUM(amount)` in the same blue as the measure column.
