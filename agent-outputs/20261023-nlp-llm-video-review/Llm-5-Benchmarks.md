# Llm-5-Benchmarks (0-338.1 s, whole video)

## Verdict
- The build is clean. Every figure is legible at 1080p, and every number said matches the number shown and the lessons (Figs. 1-15 all checked). Cues land on their words, and pacing is comfortable: 135 wpm, densest beat 3.86 w/s (`table`, in the hook), at least 0.55 s between beats, 1.6 s breaths at scene cuts. Nothing is rushed by speed alone.
- One substantive error: the cost scene closes on "A minute of triage? The cheap model wins" (taken from the lesson). Fig. 15's own numbers say the opposite: Sonnet's extra 3 points cost about 5 cents per avoided error.
- One obvious defect: Fig. 12's axis labels ("5 10 20 50 100") float alone at bottom right for the first 21 s of the examples scene.
- The weak spots are explanation, not tempo:
  - the saturation tell's bracket measures the wrong three points;
  - "noise near the ceiling" and "construct mismatch" are asserted, not shown;
  - "close after 30, pick on cost" has nothing on screen behind it;
  - SWE-bench is struck as contaminated and then endorsed with a green check.
- The builder's claims hold against the frames: scene list and figure contents, 1,626 / 155 / 219, 57.5-99.3%, $83-$8,250, 30 cards, no counter showing a false 0. Its passing checks did not catch the orphaned Fig. 12 labels.

## Deep-dive candidates
1. **How many examples are enough.** Lesson: evaluating-for-your-task, "How many examples".
   - Where the unit rushes it: 228.6-254.4 s (`howmany`, `sim`, `twenty`, `fifty`, `close`), 26 s from the question to "Pick on cost".
     - The 2,000 runs pour in over about 4 s (237-241 s).
     - The upsets (tied 155, behind 219) get only a footnote line.
     - Fig. 12 lands in the middle of a beat.
     - "Close after thirty" has no evidence on screen.
   - Why the unit can't slow down: Part 3 has five stops in 118 s, and the video already runs 5:38 against its 5:06 estimate. This idea alone needs about another minute.
   - What a 2-minute video would show:
     - One evaluation as 20 cards flipping right or wrong for each model (16 vs 13), then a rerun where the worse model wins (14 vs 15).
     - Runs stacking into the two histograms, with the overlap shaded and the upsets counted.
     - The same at 50 and 100 examples, with the histograms narrowing.
     - The lesson's suggested 80-vs-78 run, staying near a coin flip even at 100. That is what "still close after thirty, pick on cost" means.
2. **What an error costs.** Lesson: evaluating-for-your-task, "Comparing on cost as well as accuracy".
   - Where the unit rushes it: 298.6-323.6 s (`cost`, `cost-gaps`, `cost-error`), 25 s.
     - Accuracy and the bill sit side by side but are never combined.
     - The lesson's cost per correct answer (the code block's last column, and a concept check) is dropped.
     - The verdict comes out inverted (Finding 1).
   - Why the unit can't slow down: fixing the verdict fits in one beat. Turning percentage points into error counts and a break-even price needs its own arithmetic on screen.
   - What a 2-minute video would show:
     - A million tickets as a grid, with 9% vs 6% lit as errors (90,000 vs 60,000).
     - The 30,000-error difference against the $1,567 bill difference: about 5¢ per avoided error.
     - A "cost per error" slider running from 1¢ to a lost customer, with the winner flipping at 5¢ (Haiku to Sonnet) and at about 16.5¢ (Sonnet to Opus: 10,000 errors for $1,650). Fable never wins.
     - It ends on cost per correct answer.
3. **What a harness is, and how it moved one score 37 points.** Lesson: benchmark-pitfalls, "3. Selective reporting".
   - Where the unit rushes it: 156.0-180.4 s (`astra`, `astra-scores`, `astra-same`).
     - "Harness" is defined only in a subordinate clause.
     - Both harnesses are drawn as identical dashed boxes.
     - The reason for 62.7 vs 99.9 is one clause ("kept its hidden reasoning between moves").
     - ARC's own rule (it carries forward only the notes the model chooses to keep) is never said.
   - Why the unit can't slow down: the scene is already 33 s, and three other pitfalls share that part of the video.
   - What a 2-minute video would show:
     - One ARC-AGI-3 game played over a few moves, twice. After each move the standard harness clears everything but a short notes card; the vendor harness carries the whole reasoning trace forward.
     - Why the second run solves more and spends less: it does not re-derive what it already worked out.
     - A launch table quoting 99.9 beside rivals' standard-harness scores.
     - The same effect from a reasoning-effort setting (the lesson's other diagnostic).

## Findings

### 1. [P1] accuracy — "A minute of triage? The cheap model wins" contradicts Fig. 15
- When: 307.4-323.6 s, beats `cost-gaps` and `cost-error` (frames element-632.jpeg, element-648.jpeg).
- What: Fig. 15 shows Haiku at 91% for $83 a month and Sonnet at 94% for $1,650, on a million requests.
  - Haiku therefore makes 30,000 more errors a month to save $1,567. It is the better deal only if an error costs under about 5¢ ($1,567 / 30,000).
  - A minute of triage on 30,000 tickets is 500 staff-hours a month. The green tag "a minute of triage: the cheap model wins" is the wrong way round.
  - The Haiku-to-Sonnet step the verdict rests on (+3 points, 20x the bill) is also the only step left unannotated. Only Opus (+1 point, 2x) and Fable (+0, 2.5x) are marked.
- Why it matters: the scene's takeaway teaches a wrong rule of thumb, and the numbers that disprove it are on screen.
- Cause: `video/src/videos/llm-benchmarks/script.ts:296-299` (the `cost-error` text) and `CostScene.tsx:147-149` (the tag), both copied from `content/courses/how-llms-work/evaluating-for-your-task.mdx:182-184` (also echoed in the concept check at `:300`). `CostScene.tsx:130-141` adds a `Gain` annotation to the Opus and Fable rows only. This one is not in the builder's discrepancy list.
- Fix:
  - Add `Gain`s on the Sonnet row: "+3 points" and "20x the cost".
  - Add a line under the table, computed in `data.ts` from `TIERS`: "30,000 fewer errors for $1,567: about 5¢ each".
  - Re-voice `cost-error`: "So it comes down to what an error costs you. Under a nickel? The cheap model wins. A minute of someone's time? It doesn't."
  - Report the lesson line to its owner.

### 2. [P1] spacing — Fig. 12's axis labels sit alone on screen for 21 s
- When: 220.0-240.8 s, beats `own` through `sim` (frames element-440.jpeg, element-454.jpeg, element-470.jpeg).
- What: "5 10 20 50 100" floats at bottom right (y about 848) from the scene's first frame. It stays there under Fig. 10 and beside the filling Fig. 11 until Fig. 12's bars grow at "better one" (240.8 s).
- Why it matters: stray numbers with no chart look like a rendering bug. While Fig. 11 builds they read as a second axis of it.
- Cause: `ExamplesScene.tsx:207-211`. The tick `<text>` sits in an `<Svg>` with no opacity; only the bar's height is eased (`grow`, `:202`).
- Fix: give that `<Svg>` (or the `<text>`) `opacity={ease(frame, betterAt + i * 3, 10)}`, or the later cue from Finding 7.

### 3. [P2] confusion — the "within 3 points" bracket measures distance to the ceiling, not the spread between models
- When: 111.0-117.6 s, beat `sat-tell` (frames element-228.jpeg, element-233.jpeg).
- What: the narration (and benchmark-pitfalls:34) says "if every model in a row sits within three points [of every other]". On screen, the bracket runs from MMLU's bar end (92) to the ceiling (95).
  - MMLU's bar is a floor ("every frontier model above 92"), yet the figure is titled "Best published scores".
  - GPQA Diamond, whose leaders sit at about 95 (Fig. 2 showed 96.0 vs 95.4), fails the same tell but is not struck. A viewer is left asking why only MMLU goes.
- Why it matters: the one rule a viewer is meant to carry away is drawn as a different rule.
- Cause: `SaturationScene.tsx:131-137`. `Bracket x0={X(mmluFrontierAbove)} x1={X(mmluCeiling)}`, with the comment "the three points between the frontier and the ceiling". `:108` strikes MMLU only.
- Fix: draw three or four model ticks clustered in the MMLU row (for example, the launch table's 92.3 and 91.7 plus the quoted floor) and put the bracket across the ticks. Then either strike GPQA too or narrate "GPQA's row too".

### 4. [P2] explanation — "label errors" and why 0.6 is "noise" are asserted, not explained
- When: 58.9-71.2 s, beats `mmlu-gap` and `noise` (frames element-130.jpeg, element-142.jpeg, element-170.jpeg).
- What: "label errors cap that test near ninety-five" never says what a label error is (a wrong answer key). Nothing shows why six tenths of a point that near the cap is noise; the "2.7 to the ceiling" bracket is shown but never connected to that claim.
  - "Noise." is set at x 150-270, about 450 px left of the 0.6 bracket it judges.
  - The 1-4 pitfall marks then appear directly under it (`read-in`), so they read as a sub-list of "Noise."
- Why it matters: this is the video's first analytic idea, and it lands as a slogan.
- Cause: `script.ts:144-148`. `ScaleScene.tsx:161-163` places "Noise." at `X0 + 40`, and `:170-171` puts the marks at `X0 + 58`, `zy + 46`.
- Fix:
  - Re-voice: "...some of its answer keys are simply wrong, so about ninety-five is the most anyone can score."
  - Set "Noise." under the zoom, centred on the 0.6 bracket (about `zx(92)`, `zy + 50`).
  - Move the four marks to the free band under the ARC-AGI-3 track (about y 940).

### 5. [P2] explanation — "construct mismatch" is never defined, and opens on 7 s with no figure
- When: 182.0-189.2 s, beat `mismatch` (frames element-366.jpeg, element-376.jpeg).
- What: "Four, the deepest: construct mismatch. A benchmark measures the benchmark." "Construct" is never explained. The tagline drops the lesson's "measures *performance on* the benchmark; whether that transfers depends on whether your task resembles it", which leaves a tautology.
  - The screen holds only the headline, the Fig. 8 caption and the sorter illustration until the SWE-bench tag at about 189 s.
- Why it matters: the pitfall the narration calls "the deepest" gets the least explanation, under a term a learner will not know.
- Cause: `script.ts:215`. `MismatchScene.tsx:74` (headline) and `:82` (the first content is cued to `sweAt - 4`).
- Fix:
  - Re-voice: "Four, the deepest: construct mismatch. The skill a test measures isn't always the skill you need. A benchmark measures performance on the benchmark."
  - Cue the SWE-bench tag and an empty "your task?" box to "construct mismatch".

### 6. [P2] confusion — SWE-bench is struck as contaminated, then endorsed with a green check
- When: 134.1-140.4 s, beat `swe-drop` (element-280.jpeg), then 189.2-197.2 s, beat `transfer` (element-392.jpeg).
- What: Fig. 6 strikes "SWE-bench Verified", and the narration says it was "sank". Fifty seconds later, Fig. 8 says "SWE-bench predicts agentic coding" with a green check.
  - The lesson reconciles the two: the patch-and-test task shape is still the right one, while trust in any single public set fell. The video never says so.
  - "Sank" also overstates; the screen's own line is "OpenAI stopped reporting it".
- Why it matters: content from an earlier beat contradicts a later one, and nothing on screen resolves it.
- Cause: `script.ts:187-190` and `:217-220`. `MismatchScene.tsx:82-84`.
- Fix:
  - Re-voice `transfer`: "Tasks like SWE-bench predict agentic coding, because they look like the job."
  - Change the tag to "repo-patch tasks (SWE-bench)".
  - In `swe-drop`, replace "sank" with "is why OpenAI stopped reporting".

### 7. [P2] pacing — Fig. 12 arrives complete during the n = 20 beat
- When: 240.8-248.2 s, beats `twenty` and `fifty` (frames element-482.jpeg, element-484.jpeg, element-490.jpeg).
- What: at "better one" the Fig. 12 caption and all five bars with their percentages grow at once. At the same moment the "better one ahead in 1,626 of 2,000" counter runs, "about four in five" inks in, and so does "tied in 155, behind in 219". `twenty` is one of the densest beats (3.53 w/s).
  - 94.2% is on screen about 4 s before "With fifty examples" is said.
  - Fig. 12 is never introduced aloud.
- Why it matters: two new readouts and a new chart compete with the single sentence that carries the result.
- Cause: `ExamplesScene.tsx:198` (the caption at `betterAt - 2`), `:202` (the bars at `betterAt + i * 3`) and `:213` (the labels).
- Fix: at `twenty`, show only the counter and "about four in five". Cue Fig. 12's caption, bars and ticks to `fiftyAt - 8`, and light the n = 20 bar and then the n = 50 bar.

### 8. [P2] explanation — "Still close after 30? They probably are. Pick on cost." has no support on screen
- When: 249.0-254.4 s, beat `close` (frame element-510.jpeg).
- What: "30" is highlighted, but neither chart has a 30. Fig. 12 only shows that a 15-point gap is found reliably. The lesson's evidence for the claim (rerun with `true_b = 0.78`: small gaps need far more examples) is not shown.
- Why it matters: the practical rule appears to follow from the chart, and the chart doesn't support it.
- Cause: `ExamplesScene.tsx:233-239`; `script.ts:249-252`.
- Fix: run the lesson's 0.78 variant in `measure.py` and add it to Fig. 12 as a faint second series (near 50% at every size), cued to "look close". Otherwise, drop the "30" mark and say "if two still look close, they probably are".

### 9. [P3] explanation — "The harness is just a loop", but no loop is shown, and the stand-ins are unexplained
- When: 256.0-276.4 s, beats `harness` to `misses` (frames element-524.jpeg, element-554.jpeg).
- What: the figure is a results table; the loop itself (for each ticket: call the model, compare, count) never appears. "Two stand-in models" is never explained (they are keyword rules). The "cheap model" at 30% can blur with the real cheap tier (Haiku, 91%) shown 40 s later.
- Cause: `HarnessScene.tsx:62-65`; `script.ts:255-258`.
- Fix: add a five-line pseudo-loop beside the table, its arrow stepping row by row as the marks land. Label the column headers "cheap stand-in (keyword rules)" and "good stand-in".

### 10. [P3] explanation — Fig. 7 draws both harnesses identically
- When: 156.0-173.4 s, beats `astra` and `astra-scores` (frames element-326.jpeg, element-362.jpeg).
- What: both icons are the same dashed box around a "model" chip; only the stroke colour differs. What the standard harness carries between moves (the notes the model chooses to keep, per the lesson) is never shown or said, so "kept its hidden reasoning" has nothing to contrast with.
- Cause: `ReportingScene.tsx:105-133`.
- Fix: put a small "notes" slip inside the standard box and a long reasoning strip inside the vendor box, cued to "hidden reasoning". Add "keeps only its own notes" beside the standard harness's label.

### 11. [P3] explanation — the free-text properties have no subject
- When: 285.1-290.4 s, beat `props` (frame element-596.jpeg).
- What: "Does it name the three facts, and stay under the limit?" The screen never says which facts or what limit. The video never says the free text here is a summary (the lesson does). Card 1 reuses the ticket queue, which isn't free text at all.
- Cause: `script.ts:274-277`; `ScoringScene.tsx:104-105`.
- Fix: re-voice "Say it writes a summary: does it name the three facts it must, and stay under the length limit?" and title card 2 "a summary".

### 12. [P3] spacing — the HLE launch label touches its marker and sits on two gridlines
- When: 104.0-117.6 s, beats `sat-fast` and `sat-tell` (frame element-233.jpeg).
- What: the dashed launch marker at 10 runs down to the cap height of "launch, January 2025: every model under 10". The 25 and 50 gridlines pass through "January 2025" and "model".
- Cause: `SaturationScene.tsx:167-176` (marker `y2 = ry + 26`) and `:178` (label `top = ry + 22`, `left = X(10) - 10`); the gridlines are at `:81` (`y2 = ry(hle) + 60`).
- Fix: end the marker at `ry + 16`, start the label at `X(10) + 10`, and stop the gridlines at `ry(hle) + 20`, or give the label the `halo` style.

### 13. [P3] confusion — an unlabelled track sits at the bottom for 15 s
- When: 58.0-72.6 s, beats `read` to `arc-gap` (frames element-116.jpeg, element-130.jpeg).
- What: the ARC-AGI-3 track (line plus 0 / 50 / 100) draws at "scale" and gets its label at "Arc AGI three". During the whole MMLU explanation it reads as a second, unexplained axis.
- Cause: `ScaleScene.tsx:187` (`Track ... at={scaleAt}`).
- Fix: `at={arcAt - 8}`.

### 14. [P3] spacing — uneven gaps in "same model / same test / same week"
- When: 174.2-182.0 s, beat `astra-same` (frame element-362.jpeg).
- What: the gap from "same model" to the next check is about 52 px; from "same test" to the next check it is about 79 px.
- Cause: `ReportingScene.tsx:174-177` sets fixed 230 px slots for labels of different widths.
- Fix: lay the three items out in one flex row with `gap: 48`.

### 15. [P3] other — small alignment and consistency slips
- When: 217.0-220.0 s, beat `own-in` (frame element-438.jpeg), and the headlines throughout.
- What:
  - In Fig. 9, "find out yourself" sits about 6 px above the baseline of "construct mismatch" and "No?".
  - Headline size changes from scene to scene: 64 by default, 62 in Families, 56 in Mismatch.
- Cause: `MismatchScene.tsx:144` (`top: y(Q_Y[3]) - 18` against `- 22` for "No?" at `:140`) and `:74` (`size={56}`); `FamiliesScene.tsx:77` (`size={62}`).
- Fix:
  - Align the three items on one baseline (`top: y(Q_Y[3]) - 12` for the 26px label).
  - Keep 64 everywhere, or shorten the Mismatch italic to fit at 64.
