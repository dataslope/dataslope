# Llm-4-Cost (0-301.9 s, whole video)

## Verdict
- Solid, clean unit. I checked every number on screen against the narration and the lesson code: all five Fig. 2 relationships, the ten rows of Fig. 5, Fig. 6, the request costs ($0.0054 / $27 / $2,700 / 100x), the bills ($0.1325 / $0.3750 / $1.1900, x2.8 / x3.2), the thinking multiples (11.0x, 26.0x), the month ($864, $720, $1,759.50), routing ($4,050 / $101.25 / $3,948.75) and caching ($1.19 to $0.26, 78%). All of them agree. The builder's per-scene claims match the frames, the 13 figures are numbered in order, and nothing is under 19px or clipped.
- The one real defect is in Fig. 6 (P1). It hatches only the 28,000 tokens past the 272,000 line, while the narration says "the whole request pays double". That draws exactly the wrong answer the lesson's concept check rules out.
- The explanation gaps are all in mechanisms. Fig. 3 shows "11 tokens, 1 pass" against "7 tokens, 7 passes" but leaves out the lesson's reason a one-token pass is nearly as costly as an 11-token pass (moving weights). Fig. 9's bars are dollars, but nothing on screen says so. The resend's "roughly triples" is stated, never derived.
- Pacing is comfortable overall: 135 wpm, with a 1.6 s breath at every scene change. It is rushed in two places. The "gap" beat runs at 4.2 words/s, and levers 3 to 6 (268.9-288.5 s) get about 5 s each with no figure.

## Deep-dive candidates
1. **Why output costs more than input** (pricing-structure, "Why output costs more than input").
   - Where the unit rushes it: 53.9-68.2 s, beats `parallel`, `serial`, `gap` (`gap` at 4.21 words/s).
   - What the unit leaves out: it shows passes, but a pass is only "the cost" once you know each pass streams every weight from memory whether it carries 1 token or 11. The lesson's "the hardware spends most of its time moving weights around" is the missing step.
   - Why the unit can't just slow down: the step needs its own picture and vocabulary (memory versus compute, utilization, batching across users), and here it is one of five price-sheet ideas in a cost unit.
   - What a 2-minute video would show: a chip with its memory and compute units. Prefill streams the weights once and keeps the compute busy on 11 tokens. Decode streams the same weights for 1 token while the compute idles, shown with a utilization meter. Providers batch many users' decode steps to win some of that back. It ends on why the market settles near 5x, and why that ratio is stable.
2. **The conversation resend and its quadratic bill** (estimating-cost, "A conversation, with the resend").
   - Where the unit rushes it: 165.0-191.7 s (`resend` to `triple`), and again at 258.2-268.1 s (`cache`).
   - What the unit leaves out: "Double the turns, and the bill roughly triples" is asserted with two arrows. It is never said that the bill is the area under the staircase, or that the ratio tends to 4x.
   - What a 2-minute video would show:
     - Shade the area under Fig. 8's staircase as the bill.
     - Split it into a triangle (the growing history) and a rectangle (the system prompt and the replies, which grow linearly).
     - Show why 10 to 20 turns is x2.8, 20 to 40 is x3.2, and the ratio heads toward x4.
     - Set one 40-turn chat against eight 5-turn chats (lesson lines 118-120).
     - Turn caching on and collapse the staircase to its thin new slices ($1.19 to $0.26).
3. **Prompt caching: what is kept, and how to keep it** (pricing-structure, "Why cached input is so cheap", plus controlling-cost, "2. Cache the stable prefix").
   - Where the unit covers it: 69.8-96.7 s and 258.2-268.1 s, two pieces 160 s apart.
   - What the unit leaves out:
     - what the provider actually stores;
     - the cache-write premium on turn 1;
     - expiry after minutes;
     - the practical fixes: volatile content last, `sort_keys` JSON;
     - how "the model keeps no memory" (168 s) fits with "the provider can keep what it computed" (72 s).
   - What a 2-minute video would show:
     - a prompt drawn as a row of blocks, with the first request storing its processed state;
     - a byte-identical second request hitting the cache;
     - a timestamp at position 0 invalidating everything after it, then the same timestamp moved to the end and hitting;
     - `json.dumps` with and without `sort_keys` giving different bytes;
     - the turn price on Sonnet, $0.10 against $0.005.

## Findings

### 1. [P1] accuracy — Fig. 6 hatches only the overflow, though the whole request is repriced
- When: 129.6-142.7 s, beat `oversized` (frames element-266.jpeg, element-273.jpeg).
- What: the "GPT-6.1 Sol, a 300,000-token prompt" bar is plain blue up to the dashed "line at 272,000". Only the last 28,000 tokens are hatched in the accent red. Under it: "$1.20, the whole request at 2x". The narration says "the whole request pays double for its input".
- Why it matters: the picture says "only the part past the line costs more". That is the wrong option in pricing-structure's concept check ("Only the 28,000 tokens past the line are billed at the higher rate"), and the eye trusts the bar over the caption.
- Cause: `video/src/videos/llm-cost/MarketScene.tsx:313-322`. The hatched `HBar` spans `axX(threshold)` to `axX(tokens)`, and the base bar (`:312`) never changes.
- Fix: on `dollarAt - 4`, flood the whole bar with the hatch (or recolor it). Better still, grow a second whole-width bar under it labelled "$1.20, every token at 2x". Keep the dashed line only as the trigger mark.

### 2. [P2] explanation — Fig. 3 shows passes but not why a pass costs the same for 1 token as for 11
- When: 53.9-68.2 s, beats `parallel`, `serial`, `gap` (element-138.jpeg).
- What: the screen ends on "11 tokens, 1 pass" against "7 tokens, 7 passes", and then "Five times the price: a real gap in the work." Read literally, that is about 11x the passes per token, not 5x. More to the point, a 1-token pass does about 1/11 the arithmetic of an 11-token pass. "One pass per token" only explains the price once the viewer knows each pass is dominated by moving the weights, the lesson's line 47-48, which the video drops. The conclusion arrives in the fastest beat of the video (`gap`, 4.21 words/s).
- Why it matters: the scene's whole claim is "it's the computation", and the visual alone doesn't support it.
- Cause: `video/src/videos/llm-cost/script.ts:125-131` (no sentence on weights or utilization); `WhyScene.tsx:134-138` and `:155-170` (pass counts and a caption, no cost per pass).
- Fix: add a beat after `serial`, e.g. "Each pass streams every weight from memory, whether it carries one token or eleven, so the hardware mostly waits." Under each side, show a small "hardware busy" meter, full on the left and nearly empty on the right. Give `serial` a `pauseAfter` of 1.0.

### 3. [P2] confusion — Fig. 9's bars are dollars, but nothing says so and they reuse Fig. 1's token encoding
- When: 193.3-213.6 s, beats `think`, `budget`, `invisible` (element-425.jpeg).
- What: the legend reads "2,000 in" and "400-token answer", in the same blue and orange (and the same hatch for thinking) that Fig. 1 used for token counts, where 2,000 was five times as long as 400. Here the two bars are the same width, because the bars are cost. The title "One Claude Sonnet 5.5 request, as its thinking grows" and the missing axis don't say so. Elsewhere in the video, cost bars are dark grey (Figs. 7, 10, 12, 13).
- Why it matters: a viewer comparing with Fig. 1 sees the 2,000-token input apparently shrink to the 400-token answer's size, and can't tell what the bar length measures.
- Cause: `video/src/videos/llm-cost/ThinkScene.tsx:67` (`px` is dollars), with no unit at `:91` or `:93-111`.
- Fix: retitle it "Cost of one Claude Sonnet 5.5 request, as its thinking grows". Add "bar length = cost" at the right end of the legend line, and change the legend items to "input, $0.004" and "answer, $0.004". A single-sentence narration aside would also land the 5x point again: "the 400-token answer costs as much as the 2,000-token prompt".

### 4. [P2] confusion — "a tenth" labels the wrong part of the full-price bar
- When: 79.3-98.3 s, beat `twentieth` onward (element-174.jpeg).
- What: a thin black tick sits 90 px into the 900 px "full price" bar. The white label "a tenth" is set to the right of the tick, on the 810 px remainder, so the row reads "full price · a tenth ········ $0.10". The tenth is the sliver left of the tick, and it carries no label.
- Why it matters: viewers will read the full price as "a tenth", in the same beat that introduces "a twentieth".
- Cause: `video/src/videos/llm-cost/CacheScene.tsx:229-231` (note at the tick x + 12, white text inside the bar).
- Fix: shade the first tenth (x 380-470) a lighter tint and put "a tenth of the work" above the bar, centred over the sliver, in `INK_SOFT`. Or move the label below the bar, left-aligned to the tick.

### 5. [P2] pacing / explanation — Levers 3 to 6 get about 5 s each, no figure, and "reasoning effort" is never connected to anything
- When: 268.9-288.5 s, beats `output`, `effort`, `batch`, `prompt` (element-539.jpeg, element-600.jpeg).
- What: four levers are read back to back, with 0.6-0.7 s gaps. The right half shows the watercolor for 33 s. Lever 4, "Lower reasoning effort, to the lowest level that passes", introduces a setting the video never named before; Fig. 9 talked about "thinking tokens". Lever 6's exception (retrieval) is dropped.
- Why it matters: this is a list read rapid-fire. The one lever with a dramatic number already on hand (26x, from Fig. 9) gets no visual, and "reasoning effort" is new jargon.
- Cause: `video/src/videos/llm-cost/LeversScene.tsx:98` (Figs. 12-13 leave on "Third") and `:176` (the Spot fills the right half to the end); `script.ts:235-238`.
- Fix: on `effort`, bring back a mini Fig. 9 (two bars, 26.0x falling to 1.0x) in the right half. Change the line to "Fourth, turn reasoning effort, the thinking budget, down to the lowest level that passes". Give `output` and `effort` a `pauseAfter` of 0.9.

### 6. [P2] explanation — "Double the turns, and the bill roughly triples" is asserted, never derived
- When: 180.2-191.7 s, beats `turns`, `triple` (element-385.jpeg).
- What: the bars darken to turn 10, then 20, then 40 as each bill is read, but the narration never says that the bill is the sum of those bars, nor why that sum grows faster than the turn count. The lesson's "that is the quadratic term" is missing. "Roughly triples" holds for 10 to 40 turns. The ratio grows toward 4x, so a viewer who takes it as a rule will underestimate longer chats.
- Why it matters: this is the lesson's headline idea ("where estimates go wrong"), and the video gives it a result without a reason.
- Cause: `video/src/videos/llm-cost/script.ts:188-194`; `ResendScene.tsx:70` (the darkening carries the whole argument silently).
- Fix: before `turns`, add "The bill adds up every one of these bars." Then end with "Double the turns, and the bill roughly triples, and keeps getting worse." Fill the area under the lit bars, not only darken them. Deep-dive 2 covers the rest.

### 7. [P3] spacing — Fig. 6 header "Input Output" runs together
- When: 122-142.7 s, beat `threshold` onward (element-273.jpeg).
- What: "Input" ends at x 1726 and "Output" begins about 6 px later, so the header reads as one word. In the rows below, "5x 5x" and "2x 1.5x" are similarly tight.
- Why it matters: it breaks the house rule of room between neighbours, and the two columns are hard to tell apart at a glance.
- Cause: `video/src/videos/llm-cost/MarketScene.tsx:259-264, :293-300` (right edges at 1726 and 1800 for 20-22 px labels).
- Fix: move "Threshold" to a right edge of 1630, "Input" to 1712 and "Output" to 1800, or relabel the columns "In" and "Out".

### 8. [P3] spacing — Fig. 7's 100x bracket is drawn on top of the table's bottom rule
- When: 162.5-165.0 s, beat `apart` (element-328.jpeg).
- What: the red bracket's horizontal stroke lies exactly on the grey rule under the Haiku row. "basically nothing" sits just below the same line.
- Why it matters: two lines merge into one, and the bracket reads as a recolored rule.
- Cause: `video/src/videos/llm-cost/RequestScene.tsx:185` (`y = rowY(4) - 22`) equals `:173` for the last row (`ry + h(90) - 22`).
- Fix: set the bracket's `y` to `rowY(tiers.length) - 4`, and move the "100x" line down by the same 18 px.

### 9. [P3] spacing — "everything already paid for" runs into "x3.2"
- When: 189.0-193.3 s, beat `triple` (element-385.jpeg).
- What: the bracket label ends at x ≈1361, and the red "x3.2" starts about 40 px later on the same baseline. It reads as "already paid for x3.2".
- Why it matters: this is a false reading at the moment the multiplier is the point.
- Cause: `video/src/videos/llm-cost/ResendScene.tsx:153` (note at `slotX(40) + 43`, width 180) and `:180` (multipliers right-aligned at `ARROW_X - 16` = 1462).
- Fix: put the multipliers on the right of their arrows (`x = ARROW_X + 16`, left-aligned), or move "everything already paid for" up to sit level with the 20k gridline.

### 10. [P3] confusion — "one changed byte, every turn" next to turns that have no timestamp
- When: 92.0-98.3 s, beat `prefix` (element-195.jpeg).
- What: only turn 3 gets the "Session started 2026-08-03T14:22:01Z" box, captioned "one changed byte, every turn". Turn 2 above it still reads "read back from the cache".
- Why it matters: if the timestamp leads every turn, turn 2 couldn't be cached either. A careful viewer sees a contradiction.
- Cause: `video/src/videos/llm-cost/CacheScene.tsx:172-174` (caption text); the stamp is drawn on row 3 only (`:146-171`).
- Fix: change the caption to "a timestamp that changes each turn". Or say it is a second scenario: label row 3 "with a timestamp at the top" and dim rows 1 and 2 when it lands.

### 11. [P3] explanation — "The model keeps no memory" is never squared with the cache that keeps what it computed
- When: 72.3 s (`reuse`: "the provider can keep what it computed"), 168.4 s (`stateless`: "keeps no memory between turns"), 258.2 s (`cache`: the same 40-turn chat cached).
- What: the three statements sit side by side, and nothing says the chat is still resent in full, with the provider recognising the prefix and reading its stored state back.
- Why it matters: viewers will ask which is true. Lever 2 then quietly depends on both.
- Cause: `video/src/videos/llm-cost/script.ts:135, :185, :232`.
- Fix: extend `cache` with "You still resend it all; the provider just recognises the prefix and reads it back."

### 12. [P3] confusion — Fig. 2 promises "five numbers, per million tokens" and shows none
- When: 22.9-47.4 s, beats `sheet`, `rows` (element-082.jpeg).
- What: the headline and the narration say "five numbers", but the table holds only relationships ("The baseline", "5 times input…"). The first actual price per million appears 75 s later, in Fig. 5.
- Why it matters: a viewer waiting for the numbers is told about five numbers and sees words.
- Cause: `video/src/videos/llm-cost/SheetScene.tsx:89-91` (headline) and `:102-137` (relationship column only).
- Fix: change the narration to "five prices, each per million tokens, and they always relate the same way". Or add Sonnet's own figures as a muted fifth column ($2.00, $10.00, $0.10, "a bit over $2", $1.00 / $5.00).

### 13. [P3] confusion — Fig. 10 uses red for both the decoy and the answer
- When: 219.7-241.5 s, beats `guess`, `answer` (element-470.jpeg).
- What: code review's "$0.12000" (the line that only looks big) stays red-on-yellow after the turn, beside document summaries' red bar and red "$864.00" (the line that is big).
- Why it matters: the same color means "looks big" and "is big" in one frame.
- Cause: `video/src/videos/llm-cost/MonthScene.tsx:147-148` (`POINT_INK` for the dearest per-request cost) and `:158-163`.
- Fix: on `answer`, fade code review's per-request figure back to `INK` (an `out` on its `Marked`), leaving red only on the dominant row.

### 14. [P3] other — the levers watercolor fades in over the half-faded Figs. 12-13
- When: 268.9-269.5 s, beat `output` (element-538.jpeg).
- What: the illustration is fully opaque while "Claude Haiku 5.5", "$2,025.00" and the Fig. 13 bars still show through at about 30%.
- Why it matters: for half a second, ghosted figures sit visibly under the art.
- Cause: `video/src/videos/llm-cost/LeversScene.tsx:98` (`figsOut = thirdAt - 6`, a 12-frame fade) against `:176` (the Spot enters at `thirdAt - 4`).
- Fix: start the Spot at `figsOut + 12`, or start the figures' fade 8 frames earlier.
