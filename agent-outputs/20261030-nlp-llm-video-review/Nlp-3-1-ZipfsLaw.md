# Nlp-3-1-ZipfsLaw (2:07)

## Verdict
- A clean, well-built deep dive: every number on screen matches measurements.json and the lesson's own Emma output. The plain-to-log morph and the zoom out to 7,079 ranks work. No overlaps, clipping or text under 19px, and every scene's payoff holds 2.5 s or more before its cut.
- The biggest problem is that two figures disagree about what "the law" predicts. Fig. 2's dashed Zipf line (18,720 / rank) passes near "she" at rank 10. Fig. 3's "predicted" bars, in the same grey dashed style, start from "to" (5,239 / rank), so "she" comes out at "4.5× the prediction". The video never says it switched anchors.
- Three explanations stop one step short. "Slope of minus one" is shown with a triangle whose legs are 3.2:1 on screen. "Log axes are bad at shares" never says what share the log axis falsely suggests. IDF arrives in the last 4 s, never expanded, and without "across documents".
- Pacing is brisk: 149 wpm overall, nine of nineteen beats above 3 w/s. The definitional run (`law` 3.40, `slope` 3.01) and `predict` (3.48) are the tightest. Gaps are never under 0.6 s.

## Findings

### 1. [P2] accuracy: Fig. 3's "prediction" is a different line from Fig. 2's Zipf line, so "4.5×" blames the wrong word
- When: 39-79 s, beats `straight` to `rough` (frames element-054.jpeg, element-079.jpeg)
- What: Fig. 2 draws Zipf's law as a grey dashed line, count = 18,720 / rank, fitted to ranks 1 to 1,000. It runs far above "to" at rank 1 (18,720 against 5,239) and just under "she" at rank 10 (1,872 against 2,340, 1.25×). Fig. 3 then labels grey dashed bars "predicted", and those are 5,239 / rank, anchored on "to". The narration says she "comes in at more than four times its prediction", and the screen shows "4.5× the prediction". So the same name and the same style stand for two lines a factor of 3.6 apart. Nothing on screen or in the narration says the prediction starts from the top word.
- Why it matters: the viewer learns that the law misses the tenth word fourfold. The line they just watched fit says the opposite: the top words crowd together (to, the and and nearly tie) and "to" is the outlier, so anything predicted from it comes out low.
- Cause: `video/src/videos/nlp-zipfs-law/PredictScene.tsx:51` and `:59` size the ghost bars from `EMMA.predict` (law = count(1) / rank, from measure.py). `CurveScene.tsx:151` draws `EMMA.lineC / rank`. The Fig. 3 title at `PredictScene.tsx:78` says only "against one over the rank". The narration is at `script.ts:115` and `:125`.
- Fix: name the anchor, and make the 4.5× a consequence of the flat top.
  - `predict`: "So the law makes a prediction. Start from the top word: the second should turn up half as often, and the tenth a tenth as often."
  - `rough`: "And the tenth, she, comes in at more than four times that. The top words crowd together, so the law is rough at the very top."
  - Retitle Fig. 3 "Emma's top ten, against one over the rank from the top word", and change the legend to "predicted from to".

### 2. [P2] confusion: "slope of minus one" is drawn as a 3:1 triangle
- When: 42-55 s, beats `law` and `slope` (frames element-043.jpeg, element-054.jpeg)
- What: the "10× the rank" leg is 363 px (x 612 to 975) and the "a tenth the count" leg is 113 px (y 510 to 623). The dashed line labelled "slope −1" visibly drops about one pixel for every three across. Neither the narration nor a label says the slope is counted in decades. A viewer who reads slope as rise over run on screen sees about −0.3, and "−1.14" looks no steeper than "−1".
- Why it matters: the scene's key number contradicts the geometry drawn to explain it.
- Cause: the axes have different scales per decade.
  - x: `CurveScene.tsx:13-14` puts 4 decades in 1,450 px (362 px a decade).
  - y: `:20-22` and `:94-95` put 4.3 decades in 490 px at 1080p (114 px a decade).
  - The legs are drawn at `:157-159` and `:277-278`, the label at `:391-395`, and the line is said at `script.ts:109`.
- Fix: a square plot does not fit the page, so count steps instead.
  - Draw faint decade gridlines across the plot (`LOG_TICKS` on both axes, about 10% `INK`, with `logTicksO`), so each leg visibly spans one grid step.
  - Label the legs "one step along: 10× the rank" and "one step down: a tenth the count".
  - Say "That's a slope of minus one: one step down for every step along."

### 3. [P2] explanation: "log axes are bad at shares" never says what the half-width suggests
- When: 80-98 s, beats `warn`, `plain` and `top100` (frames element-090.jpeg, element-105.jpeg)
- What: the narration gives three numbers for the same hundred words in a row: half the width on the log axis, 1.4% on the plain axis, then 60% of the book. It calls the log axis bad, but never says that half the width reads as "half the vocabulary". Then "Count what they fill, though ... sixty percent" lands nearer the log axis's half than the plain axis's 1.4%. A viewer can leave thinking the log axis was nearly right. The on-screen "the same 100 ranks: 1.4%" also drops the "of the vocabulary" that the narration says.
- Why it matters: the scene exists to make this point (the script header says so), and as cut it can teach the reverse.
- Cause: `script.ts:131-142`; `SharesScene.tsx:121-123` and `:151-153`; the Fig. 5 title at `:169`.
- Fix:
  - `warn`: "... the top hundred words fill half the width, as if they were half the vocabulary."
  - `plain`: "On a plain one, they're one point four percent of it."
  - `top100`: "That's the vocabulary. Count the text they fill instead, and those hundred words are sixty percent of the book."
  - On screen: "the same 100 ranks: 1.4% of the vocabulary". Retitle Fig. 5 "Emma's words, as plain shares of the text".

### 4. [P2] explanation: IDF is never expanded, and "rarer" drops "across documents"
- When: 120-126.6 s, beat `idf` (frame element-125.jpeg)
- What: the video's last beat brings in a new initialism at 3.28 w/s: "IDF gives a word more weight the rarer it is". The screen says "IDF: rarer weighs more". IDF weights a word by how few documents contain it. The lesson says "how rare it is across documents", and TF-IDF only gets its own page in Unit 4. Every count in this video is within one book, though, so "rarer" reads as rarer in Emma, which would give the 2,739 words used once the most weight.
- Why it matters: the takeaway line introduces an undefined term and sets up a wrong idea of what it measures.
- Cause: `script.ts:156`; `WhyScene.tsx:113-115`.
- Fix: "And it's why IDF, inverse document frequency, gives a word more weight the fewer documents it turns up in." Tag: "IDF: rare across documents, weighs more". Let the beat run about 5.5 s, which the 2.6 s tail can absorb.

### 5. [P2] pacing: the law, its slope and a fitted slope in 13 s
- When: 40.6-53.5 s, beats `law` (3.40 w/s, gap 0.8) and `slope` (3.01 w/s); also `predict` at 55.1-62.6 s (3.48 w/s, the densest beat)
- What: `law` defines the law and draws the decade triangle. `slope` then brings in slope −1 and, in the same breath, a least-squares slope over 1,000 ranks ("come out at minus one point one"), without saying that a line was fitted. `predict` states two predictions in 7.5 s.
- Why it matters: these are the video's definitions, and they get its fastest delivery.
- Cause: `script.ts:102-117` (beat texts, with `pauseAfter` 0.8, 0.9 and 0.7).
- Fix:
  - Split `slope` into "That's a slope of minus one." (`pauseAfter` 1.0) and "Fit a line to Emma's top thousand words, and its slope comes out at minus one point one."
  - Raise `law`'s `pauseAfter` to 1.2.
  - Split `predict` after "prediction." with `pauseAfter` 0.8.
  - Re-cue `thousandAt` and `pointAt` (`CurveScene.tsx:91-92`) to the new beat.

### 6. [P3] confusion: the "10× the rank" leg is drawn first, floating in mid-air
- When: 43.3-45.7 s, beat `law` (frame element-043.jpeg)
- What: on "ten times further" a horizontal rule appears at count about 187, starting from nothing at rank 10 and meeting the dashed line only at rank 100. Only 2.4 s later does the vertical leg connect it to the line at rank 10.
- Cause: `CurveScene.tsx:159` puts the corner D at `[A[0], C[1]]`, and `:277` draws the run from D.
- Fix: start the run on the line. Either put the right angle at `[C[0], A[1]]` (run from A, then drop to C), or keep this corner and draw both legs as one path from A (down, then across), starting on "ten times further".

### 7. [P3] explanation: "−1.14" on screen, "minus one point one" said, and "first thousand words"
- When: 50.4-55 s, beat `slope` (frame element-054.jpeg)
- What: the tag reads "slope −1.14" and the narration says "minus one point one". "Emma's first thousand words" can be heard as the book's first thousand words of text. The tag says ranks 1 to 1,000.
- Cause: `CurveScene.tsx:406` (`toFixed(2)`); `script.ts:109`.
- Fix: use `toFixed(1)` ("−1.1"), or say "minus one point one four"; and say "top thousand words".

### 8. [P3] confusion: "top 100" switches from red to blue, and the sieve's red is what it keeps
- When: 85-106 s and 107-126 s (frames element-105.jpeg, element-125.jpeg)
- What:
  - In Fig. 4 the top 100 are red bands. Directly below, Fig. 5's "the top 100 words: 60%" is blue.
  - In Fig. 6, red strikes out the stopwords that get dropped and blue marks the words kept. The sieve beside it keeps three red pebbles and lets yellow sand through, so its red is the opposite of the grid's.
- Cause: the Fig. 4 bands are at `SharesScene.tsx:115-116` and `:146` (`POINT`), and the Fig. 5 bar at `:175` (`DATA`). The sieve prompt is in `illustrations.json` ("three big round red pebbles").
- Fix: draw Fig. 4's bands in `DATA_WASH` with a `DATA` edge (log) and in `DATA` (plain), and keep red for the near tie and the 4.5×. Regenerate the sieve with blue pebbles kept and red grit falling through.

### 9. [P3] confusion: Fig. 3 details: "the second word, the," and a bracket that spans 3.5×
- When: 64.4-66 s, beat `real`; 74.1-79 s, beat `rough` (frames element-073.jpeg, element-079.jpeg)
- What:
  - "the second word, the," is hard to parse by ear. Row 2's word cell is never marked; only its counts are.
  - The red bracket under "she" runs from the end of the predicted bar to the end of Emma's bar. That is the excess (1,816, 3.5× the prediction), but the label beside it says "4.5× the prediction".
- Cause: `PredictScene.tsx:126` (no `Mark` on the word cell); `:183` (bracket from `tenthLawX` to `tenthEmmaX`) with the label at `:184-185`.
- Fix: `Mark` row 2's word on the "second word" cue. Replace the bracket with tick marks on she's bar at each multiple of the predicted length (1× to 4×), so 4.5 can be counted.

### 10. [P3] explanation: "words" means different things on different labels
- When: 23-29 s, beat `tail`; Figs. 1, 5 and 6 titles (frames element-027.jpeg, element-105.jpeg)
- What: "more than half the words: 53%" means 53% of the 7,079 different words. Fig. 5 carefully separates "all 161,600 words in the book" from "its 7,079 different words", so the earlier label reads as tokens. The figure titles' "Emma's words" can also read as the heroine's dialogue, which is not helped by the grid holding the word "emma".
- Cause: `CurveScene.tsx:378`; titles at `CurveScene.tsx:203`, `SharesScene.tsx:169` and `WhyScene.tsx:63` (`FigLabel` takes a string, so no italics).
- Fix: "more than half the different words: 53%". Retitle with "the novel's words" (for example "The novel's words, ranked by count, on plain axes"), or let `FigLabel` take a node and italicize *Emma*.

### 11. [P3] spacing: "woodhouse" touches its chip, and Fig. 1's "rank" label is shifted left
- When: 107-126 s (frame element-125.jpeg); 1-30 s (frames element-012.jpeg, element-027.jpeg)
- What: "woodhouse" fills its 120 px chip with about 4 px to spare on each side, so it sits on the border. In Fig. 1 the "rank" axis label ends at x 1602, about 100 px short of the axis end at 1700, because the invisible ", log scale" suffix still takes up width.
- Cause: `WhyScene.tsx:15-17` (`CHIP_W` 120, `COL` 128) with `fontSize` 20 at `:90`; `CurveScene.tsx:304-306` (suffix span at opacity 0 inside a right-aligned `Tag`).
- Fix: `CHIP_W` 126 and `COL` 132 (the grid then ends at x 1410, still left of the divider at 1426). Render the suffix only when `t > 0`, or absolutely position it so it takes no width.

### 12. [P3] spacing: Fig. 4 leaves the bottom 40% of the frame empty for 14 s
- When: 80.5-94.5 s, beats `warn` and `plain` (frame element-090.jpeg)
- What: two 40 px strips and their ticks occupy y 410 to 680. Everything below is blank until Fig. 5 arrives on `top100`.
- Cause: `SharesScene.tsx:16` (`STRIP_H` 40) and `:53-54` (`aTop` y(424), `bTop` y(560)); Fig. 5 enters at `:169`.
- Fix: while Fig. 4 is alone, give it room: `STRIP_H` 64 and `bTop` y(600). Shrink and lift it on `countAt` as it does now, with `lift` about 110 px instead of 52 so it lands where it does now.
