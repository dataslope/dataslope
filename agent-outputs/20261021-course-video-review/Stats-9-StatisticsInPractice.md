# Stats-9-StatisticsInPractice (0-291 s, whole video)

## Verdict
- A solid, well-built capstone. Every figure is real data, cues land on their words, nothing is under 19px, and scene holds meet the 1.3 s rule. The defects are mostly about **explanation**: several key moves are asserted without being shown.
- Biggest problems:
  - The peeking chart's "planned 8,000" sits directly under the "3,841 users in each arm" it is meant to follow, so the two numbers contradict each other on one screen.
  - The video never reaches a verdict on its own A/B test, and it skips the lesson's actual rule for one (the whole interval above the "worth it" line).
  - The huge-test interval is drawn sitting on the zero line while its label says it "clears zero".
- Unexplained items: "forking paths" (the series taught this as p-hacking), "Cohen's h = 0.07" and the unrecorded traits that are somehow measured.
- Pacing is mostly comfortable (2.1-3.1 w/s). Two spots run fast:
  - Part 1's error bars are up for about 3 s and never explained.
  - The 13.4 s `sin` beat carries the video's central claim at 3.05 w/s, with a 0.35 s gap before `lie`.
- Small polish items: `note()` text renders hyphens figure-wide ("p - value", "Sign - ups"), plus a few crowded labels and empty-chart stretches.

## Findings

### 1. [P1] accuracy: "planned 8,000" contradicts the 3,841 per arm shown above it
- When: 183.0-206.8 s, beats `peek`, `wander`, `stop`, `result-in` (element-388.jpeg, element-410.jpeg)
- What: The size panel stays on screen at 45% opacity, reading "3,841 users in each arm". Directly under it, Fig. 3 runs to "planned" at 8,000, with "visitors so far: 8,000". Then the narrator says "So set the number, and look once, at the end." In the lesson's chart (`charts/ab-test-peeking.mjs`, `a.slice(0, n)` and `sqrt(2 / n)`), n counts **per arm**. So the counter's "visitors" means 8,000 per arm, or 16,000 visitors in total. Either way it is not the number set one beat earlier.
- Why it matters: the scene's lesson ("set the number, look once") points at a planned line that disagrees with the number the viewer was just given.
- Cause: `video/src/videos/statistics-in-practice/PeekScene.tsx:72,93` keeps the size panel visible (`sizeDim` only goes to 0.45). `:13` sets `X.hi = PEEKING.planned`. `:138-141` labels the counter "visitors so far".
- Fix:
  - Fade the size panel fully out at `hereAt` (`sizeDim = 1 - ease(frame, hereAt - 6, 14)`).
  - Relabel the counter "visitors per arm so far" and the planned note "planned: 8,000 per arm".
  - Make `peek` say "Here's another test, with both arms identical".

### 2. [P2] confusion: the "huge test" interval is drawn on the zero line it supposedly clears
- When: 257.0-269.6 s, beats `tiny`, `permit` (element-536.jpeg)
- What: The 0.005-0.035 interval is widened to an 8 px minimum, centred on 0.02. Its left tick lands at about x=272, exactly on the dashed "no difference" line. The label beside it says "it clears zero too".
- Why it matters: "the whole interval sits above zero" was set up 15 s earlier as the visual test for significance. Here the picture fails that test while the words say it passes.
- Cause: `DecideScene.tsx:22-31` (`Interval` widens symmetrically about `mid`) and `:129` (`min={8}`).
- Fix: when widened, anchor the left end at `Math.max(c - min/2, sx(X, 0) + 6)`. Better, add a small zoom inset under the row (0 to 0.05 points) showing the interval clear of zero.

### 3. [P2] explanation: the test the video follows end to end never gets a verdict, and the lesson's decision rule is missing
- When: 249.9-269.6 s, beats `matter`, `tiny`, `permit` (element-536.jpeg)
- What: For "This test", "Big enough to matter?" is answered only with "a call about money, not math". The lesson (ab-testing.mdx, "Decide: ship or don't ship") gives the rule: the whole CI should clear the line you'd care about. The video has that line already: the test was sized to catch 10% to 12%, a 2-point lift. The interval (0.95 to 3.15) straddles it, but this is never shown. The viewer leaves without knowing whether to ship the button.
- Why it matters: the capstone stops one step short of the decision it promised ("Then decide, on two questions").
- Cause: `DecideScene.tsx:167-170` (the only answer shown); Fig. 5 has no "worth it" line.
- Fix: draw a dashed "worth it: +2 points, the lift we sized for" line at `sx(X, 2)`, and extend `matter`: "...money, not math. Here the interval runs from one point to three, across the two we sized for."

### 4. [P2] explanation: "Cohen's h = 0.07" appears unexplained and contradicts the scale the series taught
- When: 237.6-242.4 s, beat `four` (element-482.jpeg)
- What: The effect-size row arrives with the words "an effect size" and is never glossed. Unit 7's video taught Cohen's d with "zero point two small" (`interpreting-results/script.ts:127,137`). By that scale 0.07 reads as trivial, yet the same screen calls the lift "about a fifth more sales".
- Why it matters: it is a new symbol whose only point of reference tells the viewer the opposite of the narration.
- Cause: `ResultScene.tsx:116` (`extra: ""`).
- Fix: set `extra` to "like Cohen's d, for rates: small". Or narrate: "and an effect size, Cohen's h, small here because conversion rates are small."

### 5. [P2] explanation: traits "nobody recorded" are plotted with measured gaps
- When: 142.2-158.3 s, beats `traits`, `coin` (element-300.jpeg, element-316.jpeg)
- What: Motivation and Health literacy are labelled "never recorded", yet each gets a precise gap (0.79, 0.66), and the coin is shown shrinking them. Nothing says this is a simulation in which the hidden traits are visible.
- Why it matters: a careful viewer asks how an unrecorded trait can be measured, and the strongest argument for randomizing ("even the two nobody measured") then rests on something that looks impossible.
- Cause: `RandomizeScene.tsx:78` (the Fig. 2 title doesn't say it's simulated) and `:151-157`.
- Fix: retitle Fig. 2 "Simulated users: how far apart the two groups sit, on ten traits". In `traits` (script.ts:152), say "...and two a real test never sees, like motivation."

### 6. [P2] explanation: "forking paths" is a term the series never introduced
- When: 122.6-130.2 s, beat `metric` (element-260.jpeg)
- What: "Track ten and cheer whichever one moves, and you're back to forking paths." No video narration in the series says "forking paths". Unit 8 taught this exact trap as "p-hacking" (`testing-hypotheses/script.ts:248`).
- Why it matters: a callback to a term the viewer never heard lands as jargon.
- Cause: `script.ts:142`.
- Fix: "...and you're back to p-hacking."

### 7. [P2] pacing: the "wobble" error bars appear and vanish in about 3 s, and their point is never said
- When: 31.5-34.5 s, end of `few` into `median` (gap 0.35 s) (element-063.jpeg to element-069.jpeg)
- What: 95% intervals appear on all four averages, captioned "how far each average could wobble". They are gone by "median", along with their caption (6 words). The narration never states the takeaway: Friday's interval is the widest and overlaps every other day.
- Why it matters: this is the evidence for "not a finding", and it is shown more briefly than it takes to read.
- Cause: `LookScene.tsx:75` (`whisk` out at `medianAt - 6`) and `:237` (note out at `medianAt - 6`).
- Fix:
  - Extend `few` (script.ts:97): "...A group that small wobbles a lot: its range overlaps every other day."
  - Raise its `pauseAfter` to 0.9.
  - Hold the bars until `sundayAt` rather than `medianAt`.

### 8. [P2] pacing / explanation: the central claim of Part 1 is rushed and only asserted
- When: 65.3-83.2 s, beats `sin` (13.4 s, 41 words, 3.05 w/s) then `lie` after a 0.35 s gap (element-156.jpeg, element-172.jpeg)
- What: One beat holds the wall, the trap, the crossing, "picked for looking best" and "tilted its way before it runs". Then "a p-value... is a lie" follows 0.35 s later. Nothing explains *why* it is tilted: Friday was the best of four noisy groups, so part of its lead is luck that the test counts as evidence.
- Why it matters: this is the video's thesis, delivered at its fastest rate with the reasoning skipped.
- Cause: `script.ts:116-119`; visuals in `WallScene.tsx:263-280`.
- Fix: split `sin` into two beats.
  - `trap`: "Keep a wall between them. The trap is crossing it, by testing a lead on the data that suggested it." `pauseAfter: 0.6`.
  - `tilt`: "Friday was picked because it looked best of four, so some of its lead is luck, and the test counts that luck as evidence." `pauseAfter: 0.6`.
  - Re-cue `pickedAt` / `tiltedAt` to the new beat.

### 9. [P3] other: hyphens in `note()` text render figure-wide ("p - value")
- When: 64.8-110 s "with a p - value, an effect size and an interval." (element-156.jpeg); 126-135 s "Sign - ups" chip (element-260.jpeg); 240-242.4 s "Never the p - value alone." (element-482.jpeg)
- What: Inter's tabular-figures feature gives the hyphen a digit-wide advance, so hyphenated words look split. It is most visible on the scene's takeaway line, "Never the p-value alone."
- Why it matters: it reads as a typo on the key line.
- Cause: `video/src/editorial/style.ts:66` (`note()` sets `fontVariantNumeric: "tabular-nums lining-nums"` for all text). This is shared kit, so it likely affects other videos too.
- Fix: make `note()` `lining-nums` only, and add `tabular-nums` just on numeric spans (counters, axis ticks). Or override per span with `fontVariantNumeric: "lining-nums"` at `WallScene.tsx:259`, `ResultScene.tsx:296` and `DesignScene.tsx:191`.

### 10. [P3] accuracy: "every gap shrinks to noise" while Age sits over the "under 0.1: balanced" line
- When: 154.0-172.0 s, beats `coin`, `cause` (element-316.jpeg, element-333.jpeg)
- What: Age's randomized gap is 0.102, drawn on the dashed line labelled "under 0.1: balanced". By the chart's own label, Age is not balanced. The lesson's caption does count it ("under randomization 1 do").
- Why it matters: a careful viewer sees one trait fail the stated rule while the narrator says all passed.
- Cause: `RandomizeScene.tsx:121-123` (the label) and `:178` (rings only the unrecorded rows).
- Fix: add a note at Age's blue dot, "0.10: chance, too". Or relabel the line "0.1: the usual balance line".

### 11. [P3] confusion: "Friday stands out" is measured against the lowest day while Sunday is 0.3 behind
- When: 18.4-26.6 s, beat `days` (element-047.jpeg)
- What: The narration contrasts Friday (16.99%) with Saturday (15.32%). The panel shows Sunday at 16.69%, nearly level. The panel's axis starts at 13%, which enlarges every gap.
- Why it matters: "stands out" isn't what the screen shows, and the later median reversal looks less surprising than intended.
- Cause: `script.ts:92`; `LookScene.tsx:17` (`X2.lo = 13`).
- Fix: "Friday tips best, at seventeen percent... though Sunday is only a whisker behind." This also sets up the median swap.

### 12. [P3] confusion: the 71% bill is drawn past the axis end, unlabelled at first
- When: 13.5-19.5 s, beat `bills` (element-036.jpeg)
- What: In the "All 244" strip, the 71% bill sits at x=1264, past the 45% axis end. It has no label, so it reads as roughly 47%. The "71%" note only appears after the split.
- Why it matters: it is a misplotted point with no cue that it is pinned.
- Cause: `LookScene.tsx:22,147` (`OFF_END`) and `:165` (note `at={splitAt + 16}`, placed at the Sunday row).
- Fix: show the 71% note from `countAt + 8`, beside the pinned dot in the "All" strip, and let it follow the dot into its row. Draw a small axis break (//) at `X.x1`.

### 13. [P3] spacing: labels crowd the "planned" band in Fig. 3
- When: 199.0-206.8 s, beats `stop`, `result-in` (element-410.jpeg)
- What: "no effect anywhere in this data" ends about 3 px from the yellow planned band. "planned" and "the one look" start inside the band, at x=1656 against a band edge of 1667.
- Why it matters: three labels pile up at the figure's most important spot.
- Cause: `PeekScene.tsx:186` (right edge `X.x1 - 10`), `:193` (band from `X.x1 - 7`, 34 wide), and `:196,211` (labels at `X.x1 + 16`).
- Fix: move the "no effect" note to `y={py(0.5) + 12}` or `x={X.x1 - 44}`, and start the planned labels at `X.x1 + 36`.

### 14. [P3] spacing: WallScene's "tilted before it runs" touches the X, and the right-hand notes don't align
- When: 76.5-87.7 s, beats `sin`, `lie` (element-156.jpeg)
- What: The X's lower-right arm ends at about (988, 458). The label starts at (990, 458), so they touch. Separately, "tested once" starts at x=1458 and "on data nobody has seen" at x=1416, giving two ragged left edges in one column.
- Why it matters: it looks cramped and misaligned in a scene held for 20 s.
- Cause: `WallScene.tsx:274` (Cross size 56 at `CARD_TO.y + 32`) against `:278` (`left: 990, top: CARD_TO.y + 60`); `:248` versus `:251`.
- Fix: put the label at `top: y(CARD_TO.y) + 74, left: 1004`, and set both notes to `left: 1458`.

### 15. [P3] pacing: empty or stale stretches while the narrator talks
- When:
  - 135.5-142.5 s, `who` (element-280.jpeg): Fig. 2 shows an axis and ten row labels with no data for about 7 s. From 139.5 s the headline "and the groups differ" sits over the empty chart.
  - 168.3-172.0 s, `size-in`: the dimmed old chart, no headline, while the narrator announces "Two more decisions".
  - 172.0-174.3 s (element-346.jpeg): "How many users?" alone on the page.
- Why it matters: the screen lags the words. The "two more decisions" are never shown as decisions.
- Cause:
  - `RandomizeScene.tsx:55` (dots cued to `apartAt`).
  - `RandomizeScene.tsx:58,73` (headline out at `decisionsAt - 4`).
  - `PeekScene.tsx:94-97` (cued to "ten percent").
- Fix:
  - Cue `selfAt` from `differAt - 4`.
  - In `size-in`, bring back DesignScene's six-step timeline with "3 Sample size" and "4 Run to plan" lit.
  - Cue "To catch" from `sizeFrom + 4`.

### 16. [P3] other: the Friday lead is carried for 60 s and then dropped
- When: 41-110 s, from `lead` to `ab-in` (element-208.jpeg, element-218.jpeg)
- What: "Does Friday tip more?" is set up, carried across the wall and "tested once" on the 73 locked bills, but no outcome is shown. The video then moves to a checkout button.
- Why it matters: viewers expect the opening question to be answered.
- Cause: `HoldoutScene.tsx:151-157` (the check mark with no result).
- Fix: if `measure.py` can compute Friday on the held-out 73, show it under the box. If not, close the thread in `once` (script.ts:129): "...and whatever it says, that's the answer."

### 17. [P3] explanation: the closing callback has no units, and its answer is left out
- When: 269.6-291 s, beats `began` to `last` (element-561.jpeg)
- What: "B ahead by 3.62" has no axis or units. The course's first example's point, that both groups were drawn from the same Normal(50, 10), so yes, it was luck, is never restated.
- Why it matters: a last-video callback lands only if the viewer remembers the original. A clause would close the loop.
- Cause: `CloseScene.tsx:126`.
- Fix: add a soft note under the strips, "both drawn from the same process", or extend `began`: "...Could this just be luck? Back then, it was."
