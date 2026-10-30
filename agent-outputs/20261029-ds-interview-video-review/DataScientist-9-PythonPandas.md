# DataScientist-9-PythonPandas (6:51, 411.5 s)

## Verdict
- Overall this is a strong, accurate video. Every frame, number and message on screen matches `results.json` (pandas 3.0.2 in Pyodide), and the hook's 4→6 rows and 265→375 revenue pays off cleanly at question 6. I found no wrong answer, no overlap, no clipping and no off-canvas element.
- The biggest problems are about the answers. Question 1 says "hundreds of times faster" where the page says 10-100x, and it leaves out the point an interviewer presses (`.apply` with a lambda is the same loop). In the rapid round, the `case_when` rule ("start it from the default") comes without its code, under a label that implies a `default` argument. Question 5 fits merge, join and concat into one beat with no code and no `how=`.
- Pacing is comfortable almost everywhere: 2.2 to 2.9 words/s, gaps of 0.6 s or more, and finished states held about 1.5 to 2 s before each cut. The rush is local. The join figure is on screen for about 3 s (its result for about 1 s), and "old values kept" for about 1 s.
- As interview answers, questions 2, 3, 4, 6, 7, 8 and 9 hold up as given. Questions 1 and 5 would draw follow-ups the video does not prepare for. Some code titles are set just under the 19px floor.

## Findings

### 1. [P2] accuracy: "hundreds of times faster" contradicts the page's 10-100x
- When: 62-66 s, beat `vector-time` (frames element-062.jpeg, element-066.jpeg)
- What: The narration says "That's hundreds of times faster", and a yellow-marked "hundreds of times faster" sits under bars of 410 ms against 0.9 ms. The page says "typically 10-100x faster". A grey 21px note says "a laptop will differ", but the spoken takeaway is "hundreds". The plan (section 9, "Facts") asked for "show the ratio and say where it was measured, or say 'many times faster' without a number".
- Why it matters: A viewer will quote "hundreds of times" in an interview, and for this operation on CPython that is an overclaim.
- Cause: `video/src/videos/ds-python-pandas/script.ts` beat `vector-time` text; `VectorScene.tsx:160-166` (the general claim as a marked note).
- Fix: Change the narration to "Here, in the browser, that's over four hundred times faster. On a laptop, expect ten to a hundred times." Change the note to "~450× here; 10-100× is typical".

### 2. [P2] explanation: `case_when` rule asserted, its code never shown, and the label implies a `default` argument
- When: 366-372 s, beat `r-case` (frames element-366.jpeg, element-371.jpeg)
- What: The narration says "Pandas has case when too. Start it from the default, or rows that match nothing keep their old value." The screen shows only a result table titled "`case_when`, with no default" (50, Medium, Large, 80, Large). `case_when` has no default parameter, and the right form (a Series of the default calling `.case_when`) never appears. The red marks and "old values kept" appear at about 370.8 s and fade by about 371.9 s, roughly 1 s.
- Why it matters: A viewer learns a rule they cannot apply, and the label sends them looking for a `default=` argument that does not exist.
- Cause: `RapidScene.tsx:139-153` draws only `QUICK.bare` under the misleading caption. `QUICK.caseWhen` (`data.ts:206`, `pd.Series("Small", index=df.index).case_when([...])`) is computed but never rendered. `r-case` has no pauseAfter (0.55 s gap).
- Fix: Show `QUICK.caseWhen.lines` as a 20px listing under the `np.select` result, captioned "start from the default". Recaption the bare table "started from `amount`: unmatched rows keep it". Add `pauseAfter: 1.0` to `r-case` so the red marks hold at least 2 s.

### 3. [P2] answer: question 1 skips the part an interviewer presses: `.apply` is a loop too, and why a loop is slow
- When: 37-69 s, beats `vector-loop`, `vector-time` (frames element-045.jpeg, element-066.jpeg)
- What: The only "why" given is "multiplying in Python" against "compiled code, in one call". The page's answer also says that `.apply` with a lambda is just as slow as a loop, and that a loop pays per-element interpreter overhead. Both are missing.
- Why it matters: "Isn't `apply` vectorized?" is the standard follow-up, and the video leaves the viewer believing the opposite is safe.
- Cause: `script.ts` beats `vector-loop` and `vector-time`; `VectorScene.tsx` has no element for it.
- Fix: After "The revenues are the same.", add "Every pass boxes two numbers into Python objects and dispatches the multiply at run time, and apply with a lambda does exactly the same, once per row." Add a Note under the loop listing, cued to "apply with a lambda": `df.apply(lambda r: …, axis=1)` with "still a loop" in red.

### 4. [P2] pacing: question 5's join is on screen about 3 s, and its result about 1 s
- When: 171.5-175 s, beat `merge-three` (frames element-173.jpeg, element-175.jpeg)
- What: Merge, join and concat share one 16.3 s beat. The join header, the `customers.set_index("customer_id")` table and "the same four rows" all appear between about 172 and 174 s. Everything is cleared at "And concat" (about 174.6 s), so the one figure that shows "matches on the index" is gone before it can be read.
- Why it matters: Join is the part of the question people get wrong, and it gets the least time.
- Cause: `MergeScene.tsx:41` (`outMatch = concatAt - 2`) and `MergeScene.tsx:121,141,143` (join marks at `indexAt + 10..14`). In `script.ts`, `merge-three` is a single beat.
- Fix: Split `merge-three` into `merge-key`, `merge-index` and `merge-stack`, each with `pauseAfter: 0.8`. Add one sentence to `merge-index`: "Here the customers' key becomes their index first." Hold `outMatch` until `n.beat("merge-index").to + 20`.

### 5. [P2] answer: question 5 shows no merge or join code and never names the join types
- When: 163.9-180.2 s, beat `merge-three` (frames element-169.jpeg, element-173.jpeg)
- What: Merge's result is titled just "result". The call (`orders.merge(customers, on="customer_id", how="left")`) is never shown in this scene, and neither is the join call. Merge's `how="inner"|"left"|"right"|"outer"`, which the page lists, is never mentioned, even though the result kept Di out (an inner-style outcome on this data).
- Why it matters: "Which join types does merge support, and which did you use?" is the obvious follow-up to "merge is like a SQL join".
- Cause: `MergeScene.tsx:132-134` titles the result "result". `COMBINE.merged.lines` and `COMBINE.joined.lines` (`data.ts:165-166`) are computed and never rendered.
- Fix: Put `COMBINE.merged.lines` as a 20px Listing under the merge header, and swap it for `COMBINE.joined.lines` at the join cue. Add to the narration: "how picks the join type: inner, left, right or outer, as in SQL."

### 6. [P3] spacing: code titles and one listing set under 19px
- When: 118-140 s, 172-180 s, 341-350 s (frames element-139.jpeg, element-173.jpeg, element-350.jpeg)
- What: The table titles `.agg("sum")`, `.transform("sum")`, `.apply(…nlargest(1)…)`, `customers.set_index("customer_id")` and `pd.concat([orders, march], ignore_index=True)` render at 21 × 0.88 = 18.5px. The `Series.map` listing is 18px. For question 3, these titles are the only code on screen.
- Why it matters: It breaks the house floor (README "Nothing under 19px"), and it is the code the viewer most needs to read.
- Cause: `ShapesScene.tsx:120,136,151` and `MergeScene.tsx:113,158` put `<Mono>` (0.88em) inside `TableName` (`label(21)`, `da-pandas/parts.tsx:857`); `RapidScene.tsx:59,71` use `size={18}`.
- Fix: Inside these titles, use a span with `fontFamily: MONO, fontSize: 21` instead of `<Mono>`. Change the map listing to `size={20}`, `width={960}`, and update the matching `listingHeight(…, 20)` on line 59.

### 7. [P3] confusion: apply's result index "East 4 / North 0 / South 3" is unexplained
- When: 134-140 s, beat `shapes-three` (frame element-139.jpeg)
- What: The apply table's first column reads "East 4", "North 0", "South 3", with a blank header. The 4, 0 and 3 are the original row labels from a MultiIndex, and nothing says so.
- Why it matters: A viewer checking the table against df has to guess what the second number is.
- Cause: `data.ts:56-62` flattens the MultiIndex into one label; `ShapesScene.tsx:155` passes no title for the index column.
- Fix: In `ShapesScene.tsx:155`, title the index column "region, row" (for example, `colsOf(AP, { "": { name: "region, row" } })` or the equivalent override).

### 8. [P3] explanation: "copy on write" is named but never explained
- When: 273.5-287 s, beat `copy-three` (frames element-274.jpeg, element-283.jpeg)
- What: "In pandas three, with copy on write, it never changes." The note reads "copy-on-write: df never changes". Neither the narration nor the screen says what copy-on-write is.
- Why it matters: "What changed in pandas 3?" is the natural follow-up, and the video gives the effect without the mechanism.
- Cause: `script.ts` beat `copy-three`; `CopyScene.tsx:172`.
- Fix: Narration: "In pandas three, copy on write makes every selection behave as a copy, so it never changes." Note: "copy-on-write: every selection acts as a copy".

### 9. [P3] answer: question 6 guards against the fan-out but never says how to fix it
- When: 200.8-213.3 s, beat `fanout-guard` (frame element-213.jpeg)
- What: The video shows `is_unique`, `validate=`, and a row-count check. It never says what to do when the key is not unique: deduplicate or aggregate the customer table first, deciding which of Oslo and Bergen is current.
- Why it matters: "And when validate raises, what do you do?" is the next question.
- Cause: `script.ts` beat `fanout-guard`; `FanoutScene.tsx:171-183`.
- Fix: Append "If it isn't unique, fix the lookup first: keep one row per customer before the merge." Add a step to `check.mjs` (`customers.drop_duplicates("customer_id", keep="last")`) and show it as a one-line listing under the error box.

### 10. [P3] accuracy: "Three hundred regions" said, "300 rows, four distinct regions" shown
- When: 377-383 s, beat `r-cat` (frame element-380.jpeg via sheet-12)
- What: The narration says "Three hundred regions drop from eight thousand nine hundred bytes to four hundred eighteen." The screen says "300 rows, four distinct regions". Heard alone, the line suggests 300 distinct values, where a category would save nothing.
- Why it matters: The saving depends entirely on low cardinality, which is the point of the question.
- Cause: `script.ts` beat `r-cat`.
- Fix: "Three hundred rows of four region names drop from eight thousand nine hundred bytes to four hundred eighteen."

### 11. [P3] answer: "concat matches nothing at all" oversimplifies
- When: 174.6-180 s, beat `merge-three` (frames element-175.jpeg, element-180.jpeg)
- What: The header reads "concat matches nothing: it stacks". But concat aligns columns by name (an unmatched column becomes NaN), and with `axis=1` it sets frames side by side on the index, as the page says.
- Why it matters: An interviewer asking "what happens if the columns differ?" gets the wrong expectation from this wording.
- Cause: `MergeScene.tsx:88`; `script.ts` beat `merge-three`.
- Fix: Header: "concat matches no key: it stacks, lining up columns by name". Narration: "And concat matches no key. It stacks frames, lining up their columns by name."

### 12. [P3] answer: `DataFrame.map` is not tied to its old name, `applymap`
- When: 343-351 s, beat `r-map` (frame element-350.jpeg)
- What: The page says "`DataFrame.map` (pandas 2.1+, formerly `applymap`)". The video does not mention `applymap`, which is the name most interviewers still use.
- Why it matters: A viewer asked about `applymap` will not connect it to what they just learned.
- Cause: `RapidScene.tsx:68-70`; `script.ts` beat `r-map`.
- Fix: Line: "`DataFrame.map` every cell (was `applymap`)". Narration: "Data frame map, once called apply map, works on every cell."

### 13. [P3] explanation: "No merge needed" without the merge it replaces
- When: 147-150 s, beat `pct` (frame element-150.jpeg via sheet-05)
- What: "No merge needed" is said and shown, but the alternative (aggregate the totals, then merge them back onto the rows) is never named, so the remark has nothing to refer to.
- Why it matters: The comparison is why transform is the right answer.
- Cause: `script.ts` beat `pct`; `ShapesScene.tsx:170-172`.
- Fix: Narration: "No need to sum by region and merge the totals back." Note: "no groupby-sum + merge".

### 14. [P3] spacing: line highlights cover the indentation
- When: 146-154 s, 205-214 s, 352-360 s (frames element-213.jpeg, element-139.jpeg via sheet-05, sheet-11)
- What: The blue mark on `validate="many_to_one")` starts at the listing's left padding, about 160px before the text. The same happens on the indented `df["amount"] / …` line in question 4 and on the chain's `.query`, `.assign` and `.groupby` lines.
- Why it matters: The highlight reads as covering empty space, not the code it points at.
- Cause: `video/src/videos/da-pandas/parts.tsx:356-361`: `left` is fixed at `g.padX - size*0.2` and `width` uses the full line length, including leading spaces.
- Fix: Count the leading spaces `k` and offset with `left: g.padX - size*0.2 + k*0.6*size`, `width: ((len - k)*0.6 + 0.4)em`. This is in the shared DA kit, so DA Part 2 benefits too.

### 15. [P3] confusion: colors used against the series meanings
- When: 309-331 s (reshape), 139-140 s (apply), 205-214 s (validate) (frames element-139.jpeg, element-213.jpeg, sheet-10)
- What: Reshape uses yellow as the series color for every q2 value while yellow also marks "(user, quarter)" and "`pivot_table` aggregates", so yellow means two things on one screen. "most flexible, and slowest" is in trap red, though apply is not wrong. The guard that fixes the fan-out (`validate=`) is marked blue, not green.
- Why it matters: The series teaches one meaning per color, and these break it.
- Cause: `ReshapeScene.tsx:67` (`colorOf` → `MARK` for q2); `ShapesScene.tsx:165` (`ACCENT_INK`); `FanoutScene.tsx:177` (`MARK_KEY`).
- Fix: Give q2 a second blue tint (for example, `color-mix(in srgb, ${BAR} 40%, transparent)`) and keep yellow for the narration marks. Set the apply note to `INK`. Use `MARK_OK` for the validate line.

### 16. [P3] spacing: the "SQL" column header sits about 24px right of its column
- When: 399-411 s, beat `next` (frame element-410.jpeg)
- What: "SQL" starts at about x=1116, while GROUP BY, JOIN and "a window function" start at about x=1090.
- Why it matters: The two-column bridge reads as slightly misaligned on the last frame of the video.
- Cause: `RapidScene.tsx:281` uses a 220px spacer after "pandas", while the rows use a 290px cell (`RapidScene.tsx:286`).
- Fix: Render the header as `<span style={{ display: "inline-block", width: 290 }}>pandas</span>SQL`, matching the rows.
