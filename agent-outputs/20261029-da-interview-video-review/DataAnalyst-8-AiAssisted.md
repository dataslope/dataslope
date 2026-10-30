# DataAnalyst-8-AiAssisted (5:26, 325.7 s)

## Verdict
- Clean and legible, and the numbers on screen are right. 405.50 against 840.50, 51.8%, 26% against 2.5%, 10,000 to 14,000 rows and the 110-question bank all match `results.json` and the page. The full frames show no overlaps. The one layout defect is a SQL line in question 3 that runs about 50 px past its panel. Two listings (17 and 18 px) and one label (18 px) are under the 19 px floor. The `TABULAR` hyphen bug is back in "Hand - label".
- Two narrated sentences teach something wrong. "The assistant missed more than half the month" is about revenue: the bug drops one day, which in this data holds 51.8% of it. And "Then fan-out, the business rules it couldn't know, and invented columns. Those fail loudly." groups fan-out with the loud failures, which contradicts question 2 and the page.
- As in the Data Scientist series, most answers stop one step before the follow-up. Question 2 names the filter and NULL checks without an example. Averaging ratios is shown without the reason it is wrong. The half-open range comes without why it beats ending at 23:59:59. Question 4 says "test it" but never says how. Question 8 drops the semantic model the page puts in bold. Question 6 marks the right practice ("didn't" use AI for definitions and conclusions) with red crosses.
- Pacing is comfortable. Every beat runs at 2.0 to 3.25 words/s, every gap is 0.55 s or more, and every scene holds its finished state before the cut. The only blank stretch is about 1.5 s between the two worked mistakes.
- As a series ending, the opening picks up Part 7's bridge ("Knowing which drafts to trust is the last round" leads into "The assistant writes it. Can you check it?"). The video ends on the 110-question bank, as the plan asked. The last line is a footer, though, with no takeaway that ties the nine videos together.

## Findings

### 1. [P1] accuracy: "missed more than half the month" means half the revenue, and only one day was dropped
- When: 139.5-144.7 s, beat `mistakes-totals` (frames element-141.jpeg, element-143.jpeg)
- What: Narrated: "The assistant missed more than half the month, and nothing in the query looks wrong." On screen: "the assistant misses 51.8% of January". The BETWEEN filter drops only the rest of January 31 (orders 7 and 8, 435.00 of 840.50). The page says "more than half of January's revenue". This toy data happens to put its two biggest orders on the 31st.
- Why it matters: A viewer will repeat "BETWEEN misses half the month". An interviewer knows it drops one day, so the candidate's whole answer sounds wrong.
- Cause: `video/src/videos/da-ai-assisted/script.ts:138`; the cue `MistakesScene.tsx:42` ("more than half the month"); the note text `MistakesScene.tsx:148`.
- Fix: Narrate "The assistant missed more than half of January's revenue, all of it from the last day, and nothing in the query looks wrong." Move the cue at :42 to "more than half of January's revenue". Change the note to "the assistant misses 51.8% of January's revenue: orders 7 and 8, both on the 31st".

### 2. [P1] accuracy: "Those fail loudly" puts fan-out and missing business rules among the loud failures
- When: 160.7-169.9 s, beat `mistakes-rest` (frames element-165.jpeg, element-169.jpeg)
- What: Narrated: "Then fan-out, the business rules it couldn't know, and invented columns. Those fail loudly. The silent ones are the danger." Heard as one list, "Those" covers all three items. On the page only invented columns and wrong-dialect functions fail loudly; fan-out and missing rules are among "the silent ones above". The screen attaches "(they fail loudly)" to invented columns only, so picture and sound disagree. Nothing on screen says which mistakes are silent: the date boundary and averaging ratios are gone by then, and "the silent ones are the danger" points at nothing.
- Why it matters: It teaches the reverse of question 2, where 14,000 rows from 10,000 orders is exactly a silent fan-out.
- Cause: `script.ts:148`; `MistakesScene.tsx:166-179` (the list holds only the last three items and marks none as silent).
- Fix: Narrate "Then fan-out, and the business rules it couldn't know, like test accounts and internal traffic. Those run without an error too. Invented columns and wrong-dialect functions fail loudly, so they're the harmless kind. The silent ones are the danger." The cues "fan-out", "the business rules", "invented columns", "fail loudly" and "The silent ones" all survive. On screen, add two rows at the top of the right-hand list, "date boundaries" and "averaging ratios", so the first two mistakes are still visible. Add a red "(silent)" after fan-out and after business rules, keep the grey "(they fail loudly)" on invented columns, and draw "the silent ones are the danger" as a bracket over the four silent rows.

### 3. [P2] spacing: the page's query runs out of its listing panel
- When: about 124-146 s, beats `mistakes-between` and `mistakes-totals` (frames element-126.jpeg, element-143.jpeg)
- What: The half-open line `WHERE order_ts >= '2026-01-01' AND order_ts < '2026-02-01'` ends at about x = 1812, but the tinted panel and its rules end at about 1765. The closing `'2026-02-01'` and its green mark sit outside the panel. The BETWEEN line's red mark stops within a few pixels of the edge.
- Why it matters: Text spilling out of its box is visible on the most important figure in the video.
- Cause: `MistakesScene.tsx:122-127`. The listing is 640 px wide at `LIST_X` 1120, but its longest line is 63 characters at `LIST_SIZE` 18 (`:15`), about 680 px plus padding. The SQL comes from `check.mjs:96-104`.
- Fix: In `check.mjs:96-104`, break each FILTER's WHERE after its first condition (`WHERE order_ts >= '2026-01-01'` / `  AND order_ts < '2026-02-01'`, and the same for the BETWEEN). This changes whitespace only, and the longest line drops to about 40 characters. Then set `LIST_SIZE` to 20, which also clears the 19 px floor (finding 4). Move the marks to the new line numbers (BETWEEN on lines 2-3, half-open on lines 6-7). The totals table and its note move down about 70 px, and there is room below.

### 4. [P2] spacing: two listings and a label sit under the 19 px floor while half the frame is empty
- When: 121-146 s (the page's query, 18 px); 271-283 s, beat `r-prompt` (the page's prompt, 17 px mono, nine lines); 286-298 s, beat `r-bi` ("a question in plain words (an example)", 18 px). Frames element-143.jpeg, element-277.jpeg, element-297.jpeg.
- What: The prompt is the whole content of question 7 and the narration walks it line by line, yet it is set in 17 px mono. Everything below y = 640 stays empty for the whole rapid round.
- Why it matters: It breaks the house rule, and on a phone the prompt is unreadable.
- Cause: `MistakesScene.tsx:15` (`LIST_SIZE = 18`); `RapidScene.tsx:51` (`size = 17`) with `width={820}` at `:60`; `RapidScene.tsx:125` (`label(18, …)`).
- Fix: Fix the query as in finding 3. For the prompt, set `size = 21` and `width = 980`. The longest line, `Tables: orders(…)`, is 74 characters (about 935 px), the panel runs from x 760 to 1740, and nine lines at 36 px end near y 700. The note at `:75` follows automatically. Set the BI label at `:125` to `label(20, …)` and shorten it to "a question in plain words", so it stays clear of the second layer box at x 1140.

### 5. [P2] spacing: the tabular-hyphen bug is back: "Hand - label"
- When: 305-325.7 s, beats `r-llm` and `close` (frames element-305.jpeg, element-322.jpeg)
- What: Step 2 reads "Hand - label 100 to 200, and measure its accuracy", with a digit-wide hyphen. It stays on screen through the close, about 20 s.
- Why it matters: This is a case the series-wide fix missed, and it sits on the last frame of the series.
- Cause: `RapidScene.tsx:180` spreads `...TABULAR` over the whole step text. The `npm test` guard does not catch it because the text arrives from the `steps` array (`:166`) rather than as a literal.
- Fix: Remove `...TABULAR` from the span at `:180`. The step number already sits in its own `label` span, and "100 to 200" does not need tabular figures.

### 6. [P2] explanation: question 2 names the filter, NULL and reconcile checks without an example
- When: 87.6-104.0 s, beats `check-filters` and `check-trust` (frames element-088.jpeg, element-104.jpeg)
- What: "Read each filter against the business definition, and look for null traps" takes 4.4 s and introduces two checks. "Null traps" is never said to mean anything, and neither is a "total you trust". The page gives each one an example: does revenue exclude refunds, cancelled orders and test accounts, and in which time zone; `NOT IN` against a column with NULLs, `COUNT(col)` where `COUNT(*)` was meant; the finance report or last month's dashboard. Only step 2 (fan-out) and step 7 (over 100%) get an example on screen. The right half of the frame beside steps 3 to 6 (x 1100-1820, y 520-830) stays empty.
- Why it matters: "What's a NULL trap?" and "reconcile to what?" are the obvious follow-ups, and the video leaves the viewer with only the labels.
- Cause: `script.ts:110,115`; `CheckScene.tsx:61-67` (steps 3 to 5 have no example notes, unlike steps 2 and 7 at `:121-144`).
- Fix: Change `check-filters` to "Read each filter against the business definition: does revenue drop refunds and test accounts? And look for null traps, like NOT IN against a column with nulls." In `check-trust`, add "to a total you trust, like the finance report". On screen, add two notes at `FIG_X`, beside steps 3 and 4: "revenue: refunds? test accounts? time zone?" and `NOT IN (…)` "with a NULL in the list returns no rows", each cued to its phrase.

### 7. [P2] explanation: averaging ratios is shown but never explained, and the second rate has no unit
- When: 145.5-160.0 s, beat `mistakes-ratios` (frames element-156.jpeg, element-169.jpeg)
- What: The narration gives 26% and 2.5 ("Divide all conversions by all sessions, and it's two point five") but not the reason. The page's reason is that averaging lets a 10-session day count as much as a 1,000-session day. On screen, `avg_of_rates` 26 and `overall_rate` 2.5 carry no percent sign, while the table above calls its column `rate_pct`.
- Why it matters: "Why is 26% wrong?" is the follow-up. The viewer has only the two numbers, one of them heard without a unit.
- Cause: `script.ts:143`; `MistakesScene.tsx:160-163`; the column aliases in `check.mjs` (`avg_of_rates`, `overall_rate`).
- Fix: Narrate "Average the two rates, and you get twenty-six percent, because a ten-session day counts as much as a thousand-session one. Divide all conversions by all sessions, and it's two point five percent." Rename the aliases to `avg_of_rates_pct` and `overall_rate_pct`. Add a note beside the 26, cued to "counts as much": "10 sessions weigh the same as 1,000".

### 8. [P2] answer: the half-open range is given without why it beats ending at 23:59:59
- When: 129.4-144.7 s, beat `mistakes-totals` (frame element-143.jpeg)
- What: The fix is stated ("up to but not including the first of February"), but not why it is the fix. The page's concept check says it "is correct for any timestamp precision". The standard interview counter is "why not `BETWEEN '2026-01-01' AND '2026-01-31 23:59:59'`?" That version still drops an order at 23:59:59.5.
- Why it matters: The viewer has the right query but not the defence an interviewer will ask for.
- Cause: `script.ts:138`.
- Fix: After "gives eight forty fifty", add "and it stays right at any timestamp precision, where ending at eleven fifty-nine fifty-nine would still lose the last second." Under the listing, add the note "half-open: correct at any precision".

### 9. [P2] answer: question 4 says "test it or cut it" but never says how to test a cause
- When: 190.7-212.7 s, beats `hallucinate-example` and `hallucinate-rule` (frames element-199.jpeg, element-212.jpeg)
- What: The example ends with "The because is a guess", the screen says "test it or cut it", and the rule says "cut any cause you haven't tested". The page's concept check says how: check it against timing, segments and other evidence. The page also says never let the model compute the numbers, and have a scheduled summary quote values from the query results. Neither appears.
- Why it matters: "How would you test whether the launch caused it?" is the natural next question, and the answer stops right before it.
- Cause: `script.ts:166,171`; `HallucinateScene.tsx:123-125`.
- Fix: Change the end of `hallucinate-example` to "The because is a guess until you check it: did the drop start at the launch, and is it in the segments the competitor reached?" Extend the red note at `:124` to "the "because" is a guess: check timing and segments, or cut it". In `hallucinate-rule`, add "and never let it compute the numbers itself".

### 10. [P2] answer: question 8 drops the semantic model
- When: 283.8-298.3 s, beat `r-bi` (frames element-291.jpeg, element-297.jpeg)
- What: The page puts three things in bold: "well-defined metrics, clean and documented tables, and a semantic model that says how tables join". The video draws and says only the first two. It also leaves out the page's reason, that "an assistant pointed at messy raw tables produces confidently wrong numbers at scale".
- Why it matters: "Semantic layer" or "semantic model" is the term an interviewer listens for on this question.
- Cause: `script.ts:221`; `RapidScene.tsx:92-95` (two layers).
- Fix: Narrate "…on top of defined metrics, clean, documented tables, and a semantic model that says how they join. Pointed at messy raw tables, it's confidently wrong at scale. So the analyst's job moves to building and checking those." Add a third layer, `{ at: n.word("r-bi", "a semantic model"), text: "a semantic model: how tables join" }`, and shift the two notes at `:149` and `:152` down one `c.h(76)`.

### 11. [P2] confusion: question 6 marks the right practice with red crosses
- When: 257-268 s, beats `takehome-answer` and `takehome-hide` (frames element-257.jpeg, element-266.jpeg)
- What: The column headed "didn't", in red, lists "the metric definitions" and "the conclusions" with red crosses. Not handing those to the AI is the recommended behaviour. In this series red means the trap or the wrong answer, and the same red cross means "never do this" in question 5 on the frame just before. "how you checked it" holds only "the checks from question 2", which never names a check.
- Why it matters: A viewer reading the picture sees "metric definitions: wrong", which is the opposite of the point.
- Cause: `PrivacyScene.tsx:98` (`ok: false`), `:146` (`ACCENT_INK` header), `:148` (`Cross` for `!ok`); the item text at `:99`.
- Fix: Retitle the column "kept for yourself", in `INK`, and mark its items with a tick in `INK_SOFT` (or a plain dash) instead of `Cross`. Keep red only for "hid it, then couldn't explain a line". Replace "the checks from question 2" with two items: "reconciled the total" and "traced three rows by hand".

### 12. [P3] confusion: the page clears for about 1.5 s between the two worked mistakes, and no mistake is named on screen
- When: 145.5-147.5 s, beat `mistakes-ratios` (frame element-147.jpeg)
- What: Everything from the date boundary exits at "Next, averaging ratios", and the `daily` table waits for "One day converts". In between, only the question card is on screen. Neither worked example ever carries a title, so "date boundary" and "averaging ratios" are heard but never seen.
- Why it matters: An empty page mid-answer, plus no visual index of the five mistakes, which finding 2 also needs.
- Cause: `MistakesScene.tsx:55` (`outA = ratiosAt - 4`); `:153-156` (table cued at `daysAt - 4`); `:93` (the only subtitle exits at `outA`).
- Fix: Put a running label at `y(TOP) - h(92)`: "1 · date boundaries" from `sameAt`, swapped to "2 · averaging ratios" at `ratiosAt - 2`. Cue the `daily` TableName and header at `ratiosAt + 4`, so the next figure starts arriving as the last one leaves.

### 13. [P3] confusion: the half-open filter is typed in about 8 s before it is introduced
- When: 124-132 s, beat `mistakes-between` (frame element-126.jpeg)
- What: The whole two-FILTER listing types in from "between the first and the thirty-first". `order_ts < '2026-02-01'` and `half_open_total` are readable while the narration is still on the bug, and "A half-open range" only comes at about 132 s.
- Why it matters: The fix sits on screen, unexplained, while the viewer is meant to be looking at the bug.
- Cause: `MistakesScene.tsx:122-134` (the `Listing` has no `lineAt`, so every line follows `betweenAt - 4`).
- Fix: Pass `lineAt` so that the lines holding the second FILTER wait for `halfOpenAt - 4`, as the hook's listing does at `HookScene.tsx:78`.

### 14. [P3] spacing: the strike-through rises off the words into an overline
- When: 196-213 s, beats `hallucinate-example` and `hallucinate-rule` (frame element-212.jpeg)
- What: The red strike through "because of the competitor's launch" starts at mid-height on "because" and climbs to the tops of the ascenders over "launch", where it reads as an overline. It also starts on the green highlight's edge.
- Why it matters: The strike stops reading as "struck" over the second half of the phrase.
- Cause: `video/src/videos/da-sql/parts.tsx:199`. `rotate(-2deg)` is a fixed angle, and over this 680 px phrase at 44 px it rises about 24 px. It is used at `HallucinateScene.tsx:117`.
- Fix: Add an `angle` prop to `Strike` (default -2), and pass `angle={-0.6}` at `HallucinateScene.tsx:117`.

### 15. [P3] other: production notes on screen ("the video's own example", "the page's example", "the page's prompt")
- When: 148-170 s (element-169.jpeg), 191-213 s (element-212.jpeg), 271-283 s (element-277.jpeg)
- What: Small grey notes describe where an example came from, not what it shows. None is spoken. "the video's own example" (19 px) beside the `daily` table reads as filler.
- Why it matters: It is unspoken text that competes for the eye, against the plan's "no on-screen text that is not spoken".
- Cause: `MistakesScene.tsx:157-159`; `HallucinateScene.tsx:114`; `RapidScene.tsx:58`.
- Fix: Delete the note at `MistakesScene.tsx:157-159`. Shorten `HallucinateScene.tsx:114` to "Weekly summary, drafted by a model". Change "the page's prompt" to "a prompt".

### 16. [P3] other: the hook's query is never picked up again
- When: 5-29 s, beats `hook` and `plan` (element-024.jpeg); 118 s, beat `mistakes-between` (element-121.jpeg)
- What: The opening marks the BETWEEN line "right?" and leaves it unanswered. Question 3 then shows a different query (the page's two-FILTER version) and never says this is the same bug.
- Why it matters: The question the video opens on is not visibly closed.
- Cause: `script.ts:133`.
- Fix: Open `mistakes-between` with "Remember the opening query. The assistant filtered January as between the first and the thirty-first." The cue at `MistakesScene.tsx:36` survives.

### 17. [P3] confusion: in question 8 the arrow sends the question into "defined metrics"
- When: 287-298 s, beat `r-bi` (frame element-297.jpeg)
- What: A short arrow runs from the "Which region grew fastest?" box straight into "defined metrics". The narration says the tool answers on top of those layers, but the figure shows neither the tool nor the answer, so the arrow reads as "the question becomes a metric".
- Why it matters: The figure shows a different relationship from the one the narration describes.
- Cause: `RapidScene.tsx:127` (`ElbowArrow` to `layerX - 8`); the note "what it has to stand on" sits below the stack at `:149`.
- Fix: Delete the arrow. Move "what it has to stand on to answer correctly" above the stack (`y={T - c.h(40)}`), cued to `metricsAt - 2`, so the layers read as the tool's foundation.

### 18. [P3] answer: question 9 leaves out the repeatability check and the uncertainty in the report
- When: 298.9-314.5 s, beat `r-llm` (frames element-309.jpeg, element-322.jpeg)
- What: "keep the settings the same for every batch" leaves out the page's check that rerunning a sample gives the same labels. "hand-label a hundred or two to measure it" leaves out reporting which categories it confuses and carrying that uncertainty into the findings.
- Why it matters: "How would you know it's consistent?" is the follow-up.
- Cause: `script.ts:225`; `RapidScene.tsx:166-167`.
- Fix: Narrate "…keep the settings the same for every batch, rerun a sample to confirm the labels repeat, …". Step 3 on screen becomes "Same settings every batch; a rerun gives the same labels".

### 19. [P3] other: the series ends on a footer with no takeaway
- When: 315.4-325.7 s, beat `close` (frame element-322.jpeg)
- What: The last words of nine videos are "That's the whole data analyst track. To practice, the question bank has a hundred and ten more…". That is accurate (110 counted in `multiple-choice-questions.mdx`) and what the plan asked for. It is set as a small italic footer under question 9's list, and nothing ties the series together.
- Why it matters: The closing moment of the series carries less than the bridges between parts did.
- Cause: `script.ts:230`; `RapidScene.tsx:244-250`.
- Fix: Add one sentence before the track line, and set it above the hairline at `body(34)`: "Whoever wrote the query, the interview asks the same two things: what one row means, and how you know the number is right." The cues at `:204-205` survive.
