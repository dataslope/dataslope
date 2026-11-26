# MachineLearningEngineer-7-SystemDesign (10:56)

## Verdict
- The answers hold up as interview answers. Each worked question ends on the follow-up an interviewer presses on (point-in-time lookups for the feature store, comparing logged serving features for skew, comparing answers rather than the average for quantization, label maturity for fraud, exposure for cold start), and every number on screen matches `results.json` and the narration.
- No P1. The two P2s are both in the quick round: the data-validation figure passes the schema check on a column it labels "new", and the autoscaling figure's queue has already drained when the narration says the queue lets a spike wait.
- Pacing is comfortable: no beat above 3.2 words a second, no gap under 0.6 s, and every deep-dive result stays up for several seconds. The one short hold is distillation's "Only nine", up for under a second.
- The rest is polish: the corner map drops its "store" box for three questions and then gets it back, quantization's three benefits sit on the precision rows as if each row had its own, the fraud sketch's feature arrow seems to start from a single chip, and a few labels say a little more or less than the narration.

## Findings

### 1. [P2] accuracy: Schema passes a column the figure calls new
- When: 561.7-574 s, beat `r-validate` (element-573.jpeg)
- What: Under the batch, the `region` column is annotated "new, all null" in red. In the checks column "schema" keeps its green tick while ranges, distributions and completeness turn into red crosses. The narration says "a new null column".
- Why it matters: A new column is a schema change, and the page lists "a new null column" under "silent schema changes". Leaving schema as the one check that passes teaches that a schema check misses new columns.
- Cause: `video/src/videos/mle-system-design/RapidScene.tsx:107` (`{ t: "schema", at: schemaAt, fail: 0 }`), and the cross's cue at :147 only covers completeness (`i === 3`).
- Fix: Have schema fail with the null column (`fail: nullLit`), crossed on `nullAt + 8` like completeness. All four checks then catch something, which is the point of running all four.

### 2. [P2] confusion: The queue empties before the narration says it holds the spike
- When: 632-639 s, beat `r-scale` (element-634.jpeg, element-636.jpeg, element-639.jpeg)
- What: The load spike peaks at about 632.6 s, so the queue's dots peak (9 of them) at 634 s with no label and are gone by 636 s. "Request queue" fades in at 635.0 s under an empty lane, and "lets a spike wait instead of being dropped" (636.3-638.4 s) plays over an empty queue. The third replica finishes warming up at 636.5 s, after the spike has passed, so it is never seen doing any work.
- Why it matters: The figure is meant to show the queue absorbing a spike while a new replica warms up. As timed, the two never overlap, and the label lands on an empty lane.
- Cause: `video/src/videos/mle-system-design/RapidScene.tsx:348` (spike centred at 0.42 of the beat, about 5 s before "a request queue"), :368 and :383 (replica ready on `waitAt + 6`, after the queue has drained).
- Fix: Centre the spike at 0.60 of the beat (about 634.8 s) and widen it a little (0.12). Bring the third replica up on "instead of being dropped". The queue then fills from 634 s, is deepest (about 15 dots) under "Request queue" and "lets a spike wait", and drains once the new replica joins.

### 3. [P3] confusion: The corner map loses its store for three questions
- When: 201-405 s, beats `q5` to `q8-explore` (element-243.jpeg, element-302.jpeg, element-392.jpeg, against element-176.jpeg and element-461.jpeg)
- What: Questions 3 and 4 add a "store" box under "features" to the corner map. Questions 5 to 8 draw the map without it, and questions 9 to 11 bring it back.
- Why it matters: The map exists so the eleven questions read as one growing design. A part that appears, vanishes and comes back reads as a change of design.
- Cause: `video/src/videos/mle-system-design/ServingScene.tsx:151`, `QuantScene.tsx:109` and `LoopScene.tsx:80` omit the `store` prop that `FraudScene.tsx:107` and `RecScene.tsx:139` pass.
- Fix: Pass `store` to the MiniMap in those three scenes.

### 4. [P3] confusion: Quantization's benefits sit on the precision rows
- When: 299-305 s, beat `q7` (element-302.jpeg)
- What: "Smaller", "Less data through memory" and "Usually faster" are set at x 1460 on exactly the 32-bit, 8-bit and 4-bit rows, about 700 px from the bars, so the 32-bit row seems to end in "Smaller" and the 4-bit row in "Usually faster".
- Why it matters: The figure suggests that each precision has its own benefit, when all three come from using fewer bits.
- Cause: `video/src/videos/mle-system-design/QuantScene.tsx:240-249` (each benefit is placed at `rowTop(i)`).
- Fix: Group the three as one list under the bars, in the rows where 3 and 2 bits appear later (they fade out on "Take a small neural network", before those rows ink in), led by "Fewer bits:".

### 5. [P3] confusion: The fraud model's input arrow starts under one chip
- When: 422-462 s, beats `q9-serve` to `q9-watch` (element-441.jpeg)
- What: One blue arrow drops from just under "device and location" to the Model box. Nothing joins the other four feature chips to it.
- Why it matters: In a sketch, an arrow from one chip reads as "this feature feeds the model". All five do.
- Cause: `video/src/videos/mle-system-design/FraudScene.tsx:136`.
- Fix: Draw a blue bus line under the whole chip row, from "amount" to the end of "velocity", with the arrow dropping from it into the model.

### 6. [P3] explanation: "Batch suits a heavy model" has nothing on the batch side
- When: 55-60 s, beat `q1-choose` (element-060.jpeg, element-074.jpeg)
- What: On "batch suits a heavy model on a tight budget", the only new text is "Must compute inside the budget" under Online. The batch row shows "Lookup: fast" and never says what that buys.
- Why it matters: The part of the choice rule that is easy to miss (batch is the fast option, so it suits the heavy model) goes unstated on screen.
- Cause: `video/src/videos/mle-system-design/BatchScene.tsx:141-143`.
- Fix: Add "So it suits a heavy model" in soft ink under "Lookup: fast", inking in on the same phrase.

### 7. [P3] confusion: The teacher is labelled "large" after question 7 called it small
- When: 593.7-609 s, beat `r-distill` (element-608.jpeg)
- What: The teacher box reads "large: our digit network", the network question 7 introduced as "A small neural network, 17,024 weights".
- Why it matters: The same network appears as small in one figure and large in another. The narration's "large teacher" is general; the label applies it to this particular network.
- Cause: `video/src/videos/mle-system-design/RapidScene.tsx:260`.
- Fix: Change the sub to "here, our digit network", and the student's to "smaller".

### 8. [P3] pacing: "Only nine" is up for under a second
- When: 607.4-609.6 s, beats `r-distill` to `r-latency` (sheet-18, tile 608)
- What: The hard-label panel inks in on "the hard label says only nine" (607.4 s), its "Only nine" caption at about 608.7 s, and the body fades out by 609.6 s as `r-latency` starts.
- Why it matters: This contrast is what the distillation answer lands on, and its caption leaves before it can be read.
- Cause: `video/src/videos/mle-system-design/script.ts:548` (`pauseAfter: 0.6` on `r-distill`).
- Fix: `pauseAfter: 1.2`, which holds the finished panel for about 1.5 s. This is free and needs no re-voice.

### 9. [P3] confusion: "Some exposure" fills almost the whole new column
- When: 534-537 s, beat `q10-loop` (element-536.jpeg)
- What: On "give new items some exposure on purpose", six of the seven existing users' cells in the new-item column turn green.
- Why it matters: Showing the new item to nearly every user is not "some exposure", and it hides the point that exploration is a small, deliberate slice.
- Cause: `video/src/videos/mle-system-design/RecScene.tsx:101` (`v < 0.55`).
- Fix: Use `v < 0.35`, the same three users the item-metadata fallback guessed, so the exposure goes to the users the content says might want the item.
