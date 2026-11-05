# DataEngineer-5-Python (10:31, 630.8 s)

## Verdict
- A strong, accurate video. Every number spoken matches the screen and `results.json` (62.6 MB, 149 KB, 160.3 MB, 16.6 / 33.6 MB, 7.5 / 54.2 MB, 5.53 ms / 22.8 ns, 49,995,000, 1/3/7/15 s, 225/150). I found no overlap, no clipped or off-canvas element, and no text under 19px in 27 full frames and all 271 tiles. Questions 1, 2, 6 and 12 are the best figures: measured memory, the reused hash figure, and "keyed, but adding", which goes past the page.
- The biggest problems are answer depth, not correctness. Question 6 says "one comparison, at any size" with no average-case caveat. Question 5 leaves out the iterator protocol (`__iter__`, `__next__`, `StopIteration`) that the page's own answer gives, and never explains the `iter(rows) is rows` test it shows. Question 4's mean-of-means demo only works because the last chunk is half size, and the video never says so. Question 14 coerces "1,200" to NaN as if it were bad data. Question 11 raises the double-charged payment and never gives the fix.
- Pacing is comfortable: 2.0 to 3.1 words/s, every gap 0.55 s or more, and each bridge beat holds a finished scene about 3 s before the cut. The rush is local. Question 2's payoff (150 KB) is never said and is on screen about 3.5 s. Question 3's lazy-pipeline proof is up about 3.7 s. Question 7's dict listing is up about 6 s under a 3.1 words/s beat.
- Polish: the hook's strike climbs into an overline (the shared kit's tilt fix misses `<Code>`). The pitfalls are struck 0.33 s after they appear. Three in-scene question changes clear to an almost empty page for 1.2 to 1.6 s. Questions 5, 10 and 12 leave the lower half of the frame empty for 8 to 20 s.
- As interview answers, questions 1 to 3 and 7 to 13 hold up and the rapid round is sound. Questions 4, 5, 6, 11 and 14 would each draw a follow-up the video does not prepare.

## Findings

### 1. [P2] answer: question 6 says "one comparison, at any size" with no average-case or collision caveat
- When: 248.6-258.7 s, beat `hash-jump` ("one comparison" at 256.3 s, "at any size" at 257.3 s) (frames element-257.jpeg, element-263.jpeg)
- What: The narration says "Python goes straight there: one comparison, at any size", and a green "comparisons 1" counter backs it. The page says "average get/set/membership is O(1)". Nothing mentions collisions, probing, the O(n) worst case, or that keys must be hashable (the page's question 7 condition).
- Why it matters: "Is it always O(1)?" is the standard follow-up, and the viewer has been taught to answer yes.
- Cause: `video/src/videos/de-python/script.ts:239` (beat `hash-jump` text).
- Fix: Change the end of `hash-jump` to "…and Python goes straight there: on average one comparison, at any size. Collisions can add a few probes, so the worst case is order n." Add a 22px `Source` note under the bucket row (HashScene.tsx, after line 281): "average case; keys must be hashable".

### 2. [P2] answer: question 5 skips the iterator protocol, and `iter(rows) is rows` is never explained
- When: 192.8-227.0 s, beats `iter-def`, `iter-twice` (the notes appear at 212.3 s) (frames element-203.jpeg, element-227.jpeg)
- What: The definition is behavioural only ("hands out a fresh iterator", "keeps its place … used up"). The page's answer names `__iter__`, `__next__` and `StopIteration`, and the video says none of them. Under each console it shows "`iter(rows) is rows`: False" and "`iter(rows) is rows`: True" (the True in red), which is the actual test that separates the two. The narration never says what that line means. `results.json` also measured `next(rows)` raising `StopIteration` (`data.ts:195`, `ITER.stop`), but it is never drawn.
- Why it matters: "What methods make something an iterator?" is the obvious follow-up. The one line that answers it is shown without being read.
- Cause: `script.ts:211` (`iter-def`) and `script.ts:216` (`iter-twice`). `IterScene.tsx:183-205` adds the notes with no narration cue. `ITER.stop` is unused.
- Fix: Rewrite `iter-def` as "An iterable, like a list or a dict, has an iter method that hands out a fresh iterator each time you loop. An iterator has next: it keeps its place, and at the end it raises StopIteration." Add to `iter-twice`: "Ask a generator for its iterator, and it hands back itself: that's the test on screen." Draw `ITER.stop` as an `ErrorBox` under the iterator's row, cued to "raises StopIteration".

### 3. [P2] explanation: the mean-of-means demo only works because of an unequal last chunk, which is never mentioned
- When: 173.5-182.5 s, beat `csv-mean` (frames element-179.jpeg, element-182.jpeg)
- What: Question 4 reads the whole file in ten equal chunks of 100,000, where the mean of the chunk means is exact. The demo quietly switches to "on the first 250,000 rows, chunks of 100,000". That gives chunks of 100k, 100k and 50k, and the means come out 5.0061 against 5.0039. The narration says "the mean of the chunks' means is off" as a general rule, with no reason given.
- Why it matters: A viewer who tries the full file gets the right answer and decides the video is wrong. An interviewer will ask when it does work: with equal chunks, it does.
- Cause: `script.ts:197` (`csv-mean`). `FileScene.tsx:318` shows the row count but not the chunk sizes. The steps are `meanOfMeans` and `meanFolded` in `results.json` (`nrows=250_000`).
- Fix: Narrate "A mean doesn't. Here the last chunk holds only fifty thousand rows, so averaging the three means counts each of its rows double, and the answer is off. Carry the sum and the count, and divide at the end." Change line 318 to "first 250,000 rows: chunks of 100,000, 100,000 and 50,000".

### 4. [P2] answer: question 14 throws away "1,200" as malformed and stops at "count them"
- When: 544.1-556.3 s, beat `parse-num` (frames element-550.jpeg, element-565.jpeg)
- What: `pd.to_numeric(amounts, errors="coerce")` turns "n/a" and "1,200" into NaN, and the screen says "count them: 2 didn't parse". "1,200" is a valid amount with a thousands separator, and the defensive move is to normalize it first. The code that does the counting (`.isna().sum()`) is not shown either. The page also says to route bad values to a dead-letter list, which this beat drops.
- Why it matters: The viewer learns that coercing a real 1,200 to NaN is a correct cleaning step, which an interviewer will challenge at once.
- Cause: `script.ts:420` (`parse-num`). `CleanScene.tsx:252-260` shows the count without its code. The `numeric` / `badCount` steps are in `check.mjs`.
- Fix: Add a step in `check.mjs`, `pd.to_numeric(amounts.str.replace(",", ""), errors="coerce")`, which leaves one NaN, and show it as a third column of the table. Narrate: "Normalize what you can first: strip that thousands comma, and twelve hundred survives. Then count what's left and send it to a reject list, so it doesn't vanish into an average." Put `amounts.isna().sum()` beside "count them".

### 5. [P2] pacing: question 2's answer (160 MB against 150 KB) is half unsaid and on screen about 3.5 s
- When: 89.2-98.4 s, beat `pipe-swap` (generator bar at 94.1 s, gone by 98.4 s) (frames element-095.jpeg, element-098.jpeg)
- What: The narration says "a hundred sixty megabytes" for the lists, then only "one row passes through all three before the next is read". The generators' "150 KB" bar grows at 94.1 s, its number prints at 94.5 s, and both bars fade at the first word of `pipe-trade` (98.0 s). That contrast is the whole answer to question 2, and its second half is never spoken.
- Why it matters: The one number that answers the question is gone before most viewers have read it, and nobody says it.
- Cause: `script.ts:153` (`pipe-swap`, pauseAfter 0.7). `GenScene.tsx:278-293` (bars `out={placeAt - 4}`).
- Fix: End `pipe-swap` with "…before the next is read: about a hundred fifty kilobytes, the same as one stage." Set `pauseAfter: 1.2`. The bars can't stay longer, because the `pipe-trade` listing takes their place.

### 6. [P2] answer: question 11 raises the double-charged payment and never gives the fix
- When: 446.1-458.9 s, beat `retry-not` ("a retried payment can charge twice" at 456.8 s) (frame element-459.jpeg)
- What: The scene ends on a red "a retried payment can charge twice", and the next line is "Safe to repeat has a name." Question 12 then answers with a dict upsert for transforms, never comes back to the payment, and never mentions an idempotency key. The scene also never names "thundering herd", which the page uses, even though it draws one. The demo error reads "ValueError: 400 Bad Request: no such column", which mixes an HTTP status with a SQL error.
- Why it matters: "So how do you retry a payment safely?" is the follow-up the video itself invites, and the viewer has no answer.
- Cause: `script.ts:358` (`retry-not`), `script.ts:349` (`retry-herd`), `check.mjs:437` (the message).
- Fix: End `retry-not` with "…a retried payment can charge twice, unless each request carries an idempotency key, so the server charges once however often it arrives." Add a green Note under line 200: "send an idempotency key". In `retry-herd`, say "they all come back together, a thundering herd, at one, three, seven and fifteen seconds". Change the error to `ValueError("400 Bad Request: amount must be positive")`.

### 7. [P3] spacing: the hook's strike on `lines = f.readlines()` climbs off the words into an overline (the kit's tilt fix misses `<Code>`)
- When: 15.5-29.6 s, beats `hook-fit`, `plan` (frame element-016.jpeg)
- What: The red strike crosses "lines" at mid-height, then rises about 13px. Over "readlines()" it runs above the glyphs.
- Why it matters: This is the defect the Data Analyst review had fixed in the shared kit, and it is on screen for 14 s of the opening.
- Cause: `video/src/videos/da-pandas/parts.tsx:181-188`: `textOf` reads `props.children`. `<Code line=…>` has no children, so it measures "", and `Strike` (`parts.tsx:196-205`) applies the 2° maximum tilt to a ~380px phrase. Used at `HookScene.tsx:227`. The same pattern is at `ds-python-pandas/HookScene.tsx:147`.
- Fix: In `textOf`, return `node.props.line` when it is a string, before falling back to `props.children`.

### 8. [P3] confusion: each pitfall is struck 0.33 s after it appears, so its code is only ever read through a red line
- When: 606.4-619.1 s, beat `r-pitfalls` (frame element-618.jpeg)
- What: `x in a_list in a loop`, `s += row in a loop`, `df.iterrows()`, `pd.concat row by row` and `f.read() of a whole file` each get a strike 10 frames after they fade in. The line crosses the x-height of the mono glyphs, so "a_list" reads as "a_tist" and "row" is half covered.
- Why it matters: The viewer has to read code through a line in the one round built for skimming.
- Cause: `RapidScene.tsx:200` (`<Strike at={it.at + 10}>`).
- Fix: Set the bad item in `ACCENT_INK` (so it reads as wrong at once) and strike it at `it.at + 36`, with the fix fading in at `it.at + 40`.

### 9. [P3] pacing: question 3's lazy-pipeline proof is up about 3.7 s and never read; "149 KB" is left orphaned
- When: 140.6-148.4 s, beat `file-loop` (frames element-146.jpeg)
- What: The memory bars (read 16.6 MB, readlines 33.6 MB, for loop 149 KB) leave at 142.7 s, 2 s after the 149 KB bar arrives. A bare green "149 KB" then floats between the for-loop listing and an unrelated console. The 8-line `read_lines` listing arrives at 142.8 s and its console at 144.2 to 145.0 s ("pipeline built" before "opening events.csv"), and all of it is cleared at 148.0 s. The narration never points out that order, which is the proof. Separately, an "eight megabyte file" whose `read()` holds 17 MB is left unexplained, and "Don't call read" is broader than the page, which also recommends fixed-size chunks (`f.read(size)`) for files without lines.
- Why it matters: The evidence for "nothing is read until the last one asks" is too brief and goes unremarked.
- Cause: `script.ts:172,177` (`file-read`, `file-loop`, pauseAfter 0.8). `FileScene.tsx:176` (the lone note), `FileScene.tsx:181-200` (bars `out={chainAt - 4}`), `FileScene.tsx:207-229` (listing and console), `FileScene.tsx:85` (`out3`).
- Fix: Add to `file-loop`: "…until the last one asks: pipeline built prints before the file is even opened." Set `pauseAfter: 1.4`. Prefix the note with its label ("peak 149 KB"). Say "Don't call read with no size, or read lines", and add "with no line breaks, read a fixed block at a time".

### 10. [P3] pacing: question 7's "keep the latest" dict loop gets about 6 s, and it loops over a pandas frame
- When: 300.0-307.8 s, beat `dedup-dict` (3.12 words/s) (frame element-306.jpeg)
- What: A five-line loop with a compound condition (`if r["id"] not in latest or r["ts"] > latest[r["id"]]["ts"]`) arrives at 301.9 s, its output at 305.0 s, and both clear at 307.8 s. The plain-Python answer iterates `df.to_dict("records")` beside a pandas `df` table with an index column, one question before the pandas question.
- Why it matters: It is the second half of question 7's answer, and it blurs the plain-Python and pandas answers.
- Cause: `script.ts:267` (pauseAfter 0.7). `DedupScene.tsx:184-204` (both `out={q8At - 4}`). The step `latestDict` in `check.mjs` uses `df`.
- Fix: Set `pauseAfter: 1.6` on `dedup-dict`. In `check.mjs`, loop over a plain list, `rows = [{"id": 1, "ts": 10, "value": "a"}, …]`, and draw it as a records table without an index.

### 11. [P3] confusion: question 9 keeps the first join's 3-row output beside a 4-row orders table
- When: 363.0-377.0 s, beat `join-miss` (frame element-373.jpeg)
- What: Once order 13 (user 3) is appended, the build listing and the `joined` listing are dimmed or removed. The original output (orders 10, 11, 12) stays at full strength at the top right, beside an orders table that now has four rows. "hash join O(n + m)" and "every pair O(n × m)" are also cleared, so the finished scene no longer shows the cost. The narration never says that n and m are the two sides' row counts, or why the dict goes on the smaller side (it is the side held in memory).
- Why it matters: A stale result next to changed data reads as the join of these four orders.
- Cause: `JoinScene.tsx:147-155` (the probe console has no `dim` or `out`). `JoinScene.tsx:158-166` (`out={outBuild}`). `script.ts:296,301`.
- Fix: Add `dim={outBuild}` to the probe console. Keep the complexity notes (drop their `out`). Say "Build a dict from the smaller side, the one that has to fit in memory" and "order n plus m, for n orders and m users".

### 12. [P3] accuracy: question 13 says "without letting one row crash the job" over code that would crash
- When: 511.3-521.4 s, beat `clean-page` ("convert types" at 514.3 s) (frame element-520.jpeg)
- What: The highlight walks the page's `clean()`, which has no `try`. `int(rid)` or `int(age)` on a non-number would raise and stop the job. The crash-proof version (`try` / `except ValueError` / `rejects.append`) only arrives at 530.8 s.
- Why it matters: The claim is made over the wrong code, and a viewer could copy the page's function believing it is safe.
- Cause: `script.ts:400`. `CleanScene.tsx:136` (the mark on `"id": int(rid)` at `convertAt`).
- Fix: Change `clean-page` to "Strip whitespace, check the field count, and convert types. Bob's missing age becomes none; bad row is dropped." Move "so one bad row can't crash the job" into `clean-reject`, cued to the `except ValueError` mark (`CleanScene.tsx:214`).

### 13. [P3] confusion: question 6's set row reads "0 comparisons" just after "1 comparison", and its timings are up 2.6 s
- When: 263.4-266.0 s and 276-281 s, beats `hash-time`, `hash-loop` (frames element-263.jpeg, element-282.jpeg)
- What: The jump figure counts a set hit as "comparisons 1". The dedup bars then show "set, 10,000 keys | 0" (misses compare nothing) beside "one hash lookup per record", and nothing reconciles the two. "set 22.8 ns" arrives at 263.4 s and the whole figure fades at 266.0 s. Its caption, "(the course video List or set?)", reads as the narrator asking a question.
- Why it matters: Two counts of the same operation disagree on screen, and the payoff timing gets under 3 s.
- Cause: `HashScene.tsx:312,323,335` (bar title and set bar). `HashScene.tsx:281` (caption). `script.ts:243` (`hash-time`, pauseAfter 0.7) with `outMech = loopAt - 4` (`HashScene.tsx:109`).
- Fix: Retitle the bars "equality comparisons, deduplicating distinct keys", and label the set row "0: every key is new, so no bucket holds a match". Set `hash-time` `pauseAfter: 1.3`. Recaption "a million numbers, timed in CPython 3.13 for the course video 'List or set'".

### 14. [P3] confusion: question 12's "add to them" is struck but set in green, and "upsert" is never defined
- When: 490.9-505.7 s, beat `idem-add` (frame element-502.jpeg)
- What: The closing rule reads "set values; ~~add to them~~" all in green ink, with the struck practice in the right-answer color. `idem-upsert` says "The page's upsert sets each ID's status" without ever saying what an upsert is. The data-engineering form of the answer (overwrite a whole date partition, or MERGE on a key) is not mentioned.
- Why it matters: Green on the wrong practice goes against the series' color meanings, and "upsert" is a term the viewer may need to define in the interview.
- Cause: `IdemScene.tsx:146-150` (the whole Note is `OK_INK`). `script.ts:381`.
- Fix: Wrap the struck phrase in `<span style={{ color: ACCENT_INK }}>`. Say "Write by key instead: an upsert updates the row if the key exists and inserts it if not." Add to `idem-add`: "In a warehouse, that's overwriting the day's partition rather than appending to it."

### 15. [P3] confusion: the rapid round's pandas bar compares unequal work, in the wrong answer's red
- When: 581.4-591.1 s, beat `r-pandas` (frame element-590.jpeg)
- What: "the same 1,000,000 rows": `pd.read_csv` 54.2 MB in red against `for line in f` 149 KB in green. The 54.2 MB is a read plus a groupby (`FILE.whole`). The 149 KB loop only counts lines (`n += 1`). It is drawn in red right after "Reach for pandas when the data fits".
- Why it matters: It overstates the gap and colors the recommended tool as the wrong one.
- Cause: `RapidScene.tsx:121-143`.
- Fix: Compare like with like: the chunked group-sum from question 4 (`FILE.chunks.peak`, 7.5 MB), or a streamed dict group-sum measured in `check.mjs`. Draw the pandas bar in `BAR` blue (data), not `ACCENT`.

### 16. [P3] other: three in-scene question changes clear to an almost empty page
- When: 75.7-76.9 s (Q1 to Q2), 148.0-149.3 s (Q3 to Q4), 538.5-540.1 s (Q13 to Q14) (frame element-076.jpeg; tiles 76 s, 148 s, 539 s)
- What: The previous question's figure and card leave at "Question two / four / fourteen", and the new card's text only writes in on "How do…". For 1.2 to 1.6 s the page shows only the red kicker.
- Why it matters: The Data Scientist review flagged this pattern, and it reads as a dropped frame between questions.
- Cause: `GenScene.tsx:123` (`out1 = q2At - 4`), `FileScene.tsx:85` (`out3`), `CleanScene.tsx:77` (`out13`), together with `QuestionCard` `textAt` 1.2 s later.
- Fix: Keep the old card's exit at `qNAt - 4`, but exit the old figure at the new card's `textAt` (`q2TextAt`, `q4TextAt`, `q14TextAt`), so the page is never empty.

### 17. [P3] spacing: the lower half of the frame stays empty through three core explanations
- When: 192-205 s (Q5 definitions), 383-391 s (Q10 call counts), 469-490 s (Q12 definition and first two rows) (frames element-203.jpeg, element-389.jpeg)
- What: Q5's definitions are two rows of four 54px squares at y 440-490, with nothing below y 500 for 12 s. Q10 shows two bars in the top third for 8 s. Q12 opens with two short text lines, and its outputs sit 330px to the right of their code.
- Why it matters: Key definitions are drawn small while most of the page sits unused.
- Cause: `IterScene.tsx:139-167` (`Pass` blocks at `defTop + h(96)`), `BatchScene.tsx:83-95`, `IdemScene.tsx:14-15` (`OUT_X = 1180`, `ROW = 138`).
- Fix: In Q5, draw the `Pass` blocks at 2x size and put each pass on its own row (two loops over the iterable, one over the iterator), filling y 440-760. In Q10, bring the `batched()` listing in on `perRowAt` beside the bars. In Q12, set `OUT_X` to 1000.

### 18. [P3] explanation: question 10 highlights `it = iter(iterable)` but never says why it is needed
- When: 391.0-393 s, beat `batch-slice` (tile 392 s)
- What: The yellow mark lands on `it = iter(iterable)` at "Pull n items at a time from the iterator". Without that line, `islice` on a list restarts from the front every time and the loop never ends. This ties straight back to question 5.
- Why it matters: "Why call iter() first?" is the follow-up to this exact snippet.
- Cause: `script.ts:325`. `BatchScene.tsx:115`.
- Fix: Add to `batch-slice`: "Take an iterator first: i-slice on a list starts at the front every time, and the loop never ends."

### 19. [P3] accuracy: question 8 says a tie is settled by "arrival order", which the default sort does not guarantee
- When: 325.1-333.7 s, beat `latest-tie` (frame element-333.jpeg)
- What: The screen says "add a tiebreaker column to the sort, or the row kept depends on arrival order", and the narration says the same. `sort_values` on one column defaults to `kind="quicksort"`, which is not stable, so with ties the kept row is not even guaranteed to be the later arrival.
- Why it matters: The fix is right, but the stated risk understates it.
- Cause: `script.ts:282`. The note in `DedupScene.tsx` cued to `arrivalAt`.
- Fix: Narrate "…add a tiebreaker to the sort, like an ingestion sequence number, or the row you keep is arbitrary." Change the note to "or the row kept is arbitrary".

### 20. [P3] explanation: question 4 relies on `Counter.update` adding, and never says so
- When: 154.0-165 s, beat `csv-chunks` ("fold it into a counter" at 163.2 s) (frame element-182.jpeg)
- What: `totals.update(part.to_dict())` is right only because `Counter.update` adds counts. A plain dict's `update` would keep just the last chunk's sums.
- Why it matters: Swapping in a dict is the classic bug in this pattern, and an interviewer may ask why a Counter.
- Cause: `script.ts:187`.
- Fix: Add "A Counter's update adds; a plain dict's would keep only the last chunk." Set `pauseAfter: 0.9` (the beat already runs at 3.03 words/s).

### 21. [P3] other: the hook's headline slot is empty for 3.4 s
- When: 21.9-25.3 s, beat `plan` (tiles 22-25 s)
- What: "A model is a drawing until code loads it." leaves at "That's what the Python round checks". "Bigger than memory, safe to run twice." only appears at "without running out of memory", so the kicker sits alone over the figure.
- Why it matters: It is a visible hole at the top of the page while the narration states the video's thesis.
- Cause: `HookScene.tsx:102-103` (second Headline `at={memoryAt - 4}`).
- Fix: Bring the second Headline in at `checksAt + 4`.
