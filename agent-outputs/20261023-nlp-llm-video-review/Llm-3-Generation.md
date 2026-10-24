# Llm-3-Generation (whole video, 0-378.8 s)

## Verdict
- Accurate and well cued overall. Every number I checked on screen matches the narration and the lessons (64.8/21.6/11.8/1.8%, 3.0x, 99.6%, 4.8%, top-p 52.8/78.2/95.2%, 1 of 6 and 6 of 6, risk 0/2/3/4, 193,700/6,300, 5,000,000, 125x/15,625x, 106+13=119, 65% and +0). Nothing is under 20 px, and no text collides with other text in a finished frame. The builder's report holds up against the frames, scene by scene. The one claim that overstates is "check:motion pass": it passes only because `Drift` moves the page. Fig. 20's caption sits over an empty page for 6 s (finding 4).
- The biggest weakness is compression in the second half. The four hallucination fixes, the "permission, not a recommendation" rule, and reasoning models' training and where they help each get one sentence. The lesson's reason or example is missing in each case.
- Four visuals or lines can mislead: Fig. 10's red-cross row together with the voiced "they don't land on the wrong answers" (the lesson says "not preferentially"); the bill's "reads / writes / thinks" chips sitting under the output-price bar; a 500,000-token document shown right after a 200,000-token window; and two charts on non-linear axes that are not marked.
- Pacing: 145 wpm, but pauses of 0.5-0.9 s inside scenes and 1.6 s at every cut keep the sampling half listenable. The rate spikes at `picker` (3.70 w/s), `overthink` (3.85 w/s, the fastest beat) and `works` (four remedies in 9.8 s). The real problem is the content per minute: four lessons in 6:19, about 90 s each. Speech rate alone is not the issue.

## Deep-dive candidates
1. **Reducing hallucination by changing the task.** Lesson: why-models-hallucinate, sections "What actually reduces it" and "Why 'just tell me if you don't know' fails".
   - Where the unit rushes it: 181.8-204.6 s, beats `hedge-why`, `works`, `exit`. The hedging argument gets 6.8 s. The four fixes are read as bare imperatives in 9.8 s, with no reason and no example. The lesson gives each fix a reason ("the fact is now in the context rather than in the weights", "a query you can run beats a number you must trust", "a schema removes the freedom to invent a field").
   - Why the unit cannot slow down: each fix needs its own before/after prompt to land. That would add more than a minute to a video that already covers four lessons.
   - What a 2-minute video would show: one leading question ("What did the 2019 Chen study find?") asked five ways, with next-token bars at the answer slot each time.
     - Plain question: an invented citation wins.
     - With "tell me if you don't know": hedge words rise on right and wrong answers alike. A 2x2 of hedged/unhedged against right/wrong stays proportional.
     - With the source pasted in: the true name is now in the context, and its bar jumps.
     - With a schema: there is no free field left to invent.
     - With a NOT_FOUND exit: NOT_FOUND becomes the likeliest token when the source lacks the fact. This ties back to the unit's sampling half.
2. **Lost in the middle, and what to do with a big window.** Lesson: context-windows, "Filling the window is not free" (the attention-quality half) and the "Retrieval versus long context" callout.
   - Where the unit rushes it: 257.2-270.8 s, beats `middle` and `permission`, 15 s in all. The U curve is shown, but the lesson's practical rule is dropped: "put the important material at the beginning or the end", and "three relevant chapters beat an 800-page manual". Retrieval is never mentioned, so "permission, not a recommendation" arrives without a reason or an action.
   - What a 2-minute video would show:
     - The same fact placed at the start, middle and end of a long document, building the U curve point by point.
     - The whole manual against three chapters on two counts: tokens billed over ten turns (millions against hundreds of thousands) and recall (68% mid-context against a short context).
     - Retrieval sending about 3,000 tokens.
     - The rule: retrieve, then put the key material first or last.
3. **What training changed in reasoning models, and when to pay for thinking.** Lesson: reasoning-models, "The mechanism" and "Where it helps and where it does not".
   - Where the unit rushes it: at 303.2-318.9 s (`same`, then `rl` at 3.03 w/s), reinforcement learning against verifiable rewards is one sentence. At 337.6-350.7 s (`where` 3.04 w/s, `overthink` 3.85 w/s), helps / can't help / can hurt go by in 13 s.
   - What a 2-minute video would show:
     - One math problem sampled many times. The traces whose final answer passes the check are rewarded, and traces that contain a "check" step pass more often. A bar of "traces with a self-check" rises over training rounds.
     - A factual question, where no check exists, so more thinking has nothing to work with.
     - The overthinking example.
     - Routing by task: low effort for extraction and classification, high effort for math and code.

## Findings

### 1. [P2] accuracy — Fig. 10's cross row reads both ways, and the voiced claim is stronger than the lesson's
- When: 181.8-188.6 s, beat `hedge-why` (element-369.jpeg, element-377.jpeg).
- What: A red ✗ sits beside "Hedges that land on the **wrong answers**." ("wrong answers" in red), under "Fig. 10 What the instruction changes". The narration says "they don't land on the wrong answers". The lesson says the hedges "do not land *preferentially* on the wrong answers": they fall on right and wrong answers alike.
- Why it matters: a red ✗ beside a statement can be read as "this bad thing happens". The voiced line invites the opposite inference too, that hedges sit on the right answers. The point that hedges carry no information gets lost.
- Cause: `video/src/videos/llm-generation/FixScene.tsx:104-108` (✗ badge and phrasing); `script.ts:206`.
- Fix: on screen, "✗ Hedges that single out the wrong answers." Re-voice `hedge-why` alone (`narrate --only hedge-why`) as "You'll get more hedges... but they land on right and wrong answers alike, because nothing inside knows which ones are wrong."

### 2. [P2] confusion — A 500,000-token document right after a 200,000-token window; "cache" never explained
- When: 242.5-255.6 s, beat `costs` (element-494.jpeg, element-512.jpeg), 12 s after `fill` set up a 200,000-token window.
- What: Fig. 12 has just shown a 180,000-token document nearly filling a 200,000-token window. Fig. 14 then resends "One 500,000-token document" ten times. Nothing says that windows of a million tokens exist (the lesson does say so). "Unless a cache steps in" is shown and voiced with no hint of what a cache does.
- Why it matters: a careful viewer stops at "how does 500k fit in 200k?" and misses the per-turn billing point.
- Cause: `CostScene.tsx:53` (Fig. 14 title), `:97-99` (cache note); `script.ts:240`.
- Fix: title Fig. 14 "One 500,000-token document in a 1,000,000-token window, resent every turn". Under "unless a cache steps in", add a 20 px line: "a cache bills re-sent tokens at a discount (Unit 4)".

### 3. [P2] confusion — The "reads / writes / thinks · all billed" chips sit under the output-price bar
- When: 369.0-378.8 s, beat `next` (element-740.jpeg, element-755.jpeg).
- What: The three chips and "all billed" appear directly under "You pay output prices for", on the same line as "119 tokens at the output rate". The "reads" chip is blue, like "13 tokens, the answer" in the "You read" row just above.
- Why it matters: two meanings get merged. "You read" means the person reads the answer; "the model reads" means input tokens. The layout also implies that input is billed at the output rate.
- Cause: `BillScene.tsx:138-151` (chips at `y={payY + bh + 34}`, `x={B0 + k * 150}`, "reads" colored `BAR`).
- Fix: give the chips their own row between Fig. 21 and the `NextLine` (about y 800). Color "reads" in a neutral input hue (gray 500). Label the row "all on the bill", away from "output rate".

### 4. [P2] spacing — Fig. 20's caption sits over an empty page for 6 s
- When: 352.5-358.7 s, beat `bill` (element-708.jpeg, element-714.jpeg).
- What: The headline and the "Fig. 20 That answer, counted in o200k_base tokens" caption stand alone through "thinking tokens are output tokens, billed whether you see them or not". The bars arrive only on "read thirteen". `Drift` is the only motion, which is why check:motion passed.
- Why it matters: the scene's main claim plays over a blank figure.
- Cause: `BillScene.tsx:72` (caption at `start`); `:75-98` (rows cued to `readAt` and `payAt`).
- Fix: draw the pay bar (106 thinking + 13 answer) on `n.word("bill", "output tokens")`, show "106 thinking tokens, hidden" on "see them", and bring in the "You read" row on "read thirteen". Alternatively, cue the caption to `readAt - 6`.

### 5. [P2] explanation — Two charts on non-linear axes, neither marked
- When: 281.4-294.4 s, `square-num` (element-579.jpeg); 326.4-352 s, `returns` (element-701.jpeg).
- What:
  - Fig. 17 plots both axes on log10 scales (1x, 10x, ... 10,000x; 8k, 32k, 128k, 1M at even steps). The squared work therefore shows as a straight line that is simply steeper. Nothing says "log". The narration says "grows with the square" while the screen shows two straight lines.
  - Fig. 19 places 0, 250, 500, 1k ... 16k at equal spacing, which is a doubling axis that starts at 0. This is also unmarked.
  - Separately, Fig. 17's "linear reference" was meant to be dashed but renders solid.
- Why it matters: a viewer reading the axes as linear concludes that "squared" looks linear, which is the opposite of the point.
- Cause: `SquareScene.tsx:50-51` (log10 x and y), `:124-139` (tick labels and axis title, no scale note), `:121` (`strokeDasharray="7 5"` with `pathLength={1}` makes one dash longer than the whole path); `ReturnsScene.tsx:12-15`.
- Fix:
  - Axis titles "Context length, in tokens (log scale)" and a y note "Work (log scale)", plus a 20 px note: "on log axes, a square is a line twice as steep".
  - Dasharray `"0.012 0.009"` so the reference reads as dashed.
  - Fig. 19 axis title "Thinking tokens (each step doubles)".

### 6. [P2] explanation — "A bigger window is permission, not a recommendation" with no reason or action
- When: 267.2-270.8 s, beat `permission` (element-541.jpeg).
- What: The aphorism becomes the headline over the U curve and the scene cuts 1.6 s later. The lesson's next sentence is dropped (three relevant chapters beat an 800-page manual, on cost and on accuracy), and so is its rule (important material at the beginning or the end).
- Why it matters: the viewer gets a slogan without its meaning or anything to do about it.
- Cause: `script.ts:249`; `MiddleScene.tsx:70`.
- Fix: re-voice `permission` as "So a bigger window is permission, not a recommendation. Paste the three chapters that matter, and put the key facts first or last." On screen, add two 22 px tags at the curve's ends, "put key facts here", cued to "first or last".

### 7. [P2] pacing — Four remedies in 9.8 s, two of them never explained
- When: 189.5-199.3 s, beat `works` (element-386.jpeg to element-398.jpeg).
- What: "Paste in the source. Ask for something you can check. Constrain the shape. And give it an exit." Each item appears as it is named, about every 2.4 s. "Constrain the shape" and "Ask for something you can check" carry no example. NOT_FOUND gets the `exit` beat; the other three get nothing.
- Why it matters: the practical payoff of the hallucination part arrives as a list the viewer cannot apply.
- Cause: `script.ts:211`; `FixScene.tsx:70-77`, `:120-132`.
- Fix: under each item, add a 22 px gloss from the lesson, cued to that item and held until the cut (about 12-20 s, enough at 2 words/s):
  - "the fact is in the context, not the weights"
  - "a query you can run beats a number you must trust"
  - "a schema leaves no field to invent"
  - Then give `works` a pauseAfter of 1.0. Fuller treatment: deep dive 1.

### 8. [P2] pacing — `picker` is a new idea at 3.70 w/s, and its result is on screen for about 2 s
- When: 37.6-45.1 s, beat `picker` (element-088.jpeg, element-091.jpeg).
- What: The beat carries two ideas: "the picking isn't done by the model", and it is why one prompt gives different answers. The three draws (dog, cat, cat) appear on its last two words (about 44.5 s), and the scene cuts at 46.4 s. That the 21.6% token won the first draw is never pointed out.
- Why it matters: this is where randomness enters the unit, and its evidence flashes past.
- Cause: `ScoreScene.tsx:239-257` (draws cued at `diffAt`, "different answers"); `script.ts:131-134` (pauseAfter 0.8, leaving the 1.6 s scene gap as the only hold).
- Fix: cue the draws to `codeAt + 12 + k * 10` so they land during the sentence. Raise `picker`'s pauseAfter to 1.4, so the finished figure holds about 3 s (the README's longer-pauseAfter route). Add a 20 px note under the dog chip: "21.6%, drawn anyway".

### 9. [P2] pacing — `overthink` is the fastest beat (3.85 w/s), a new failure mode, and the last line before a cut
- When: 346.3-350.7 s (element-694.jpeg, element-701.jpeg).
- What: "And on an easy problem, more thinking can even talk it out of a right first answer." is 17 words in 4.4 s. "Can hurt / an easy problem, talked out of a right first answer" lands about 3.5 s before the cut.
- Why it matters: a counter-intuitive claim (more compute can lower accuracy) is delivered fastest of anything in the video.
- Cause: `script.ts:290-292`; `ReturnsScene.tsx:134-139`.
- Fix: re-voice it alone, shortened to "On an easy problem, more thinking can even talk it out of a right answer." (14 words), with pauseAfter 1.0.

### 10. [P3] confusion — "Above 1, the gaps shrink." shows while the dial is still below 1
- When: 65.7-67.0 s, beat `high` (element-132.jpeg: T = 0.6, cat 80.2%, note already up).
- Cause: `TempScene.tsx:56` (a single 54-frame sweep from 0 to 1.5 starting at `aboveAt`), `:211` (note at `aboveAt + 2`).
- Fix: delay the note to `aboveAt + 32`, once T has passed 1. Alternatively, split the stop: `{at: aboveAt, t: 1, dur: 14}`, then `{at: aboveAt + 14, t: 1.5, dur: 30}`.

### 11. [P3] spacing — The T = 0 note wraps with a widowed "token."
- When: 60.1-65.0 s, beat `greedy` (element-128.jpeg: "At 0, always the top / token. Greedy decoding.").
- Cause: `TempScene.tsx:205-209` (`width: 570`, with `textWrap: balance` measuring the still-hidden span).
- Fix: put "Greedy decoding." on its own line (`display: "block"`), or set the width to 680.

### 12. [P3] spacing — Fig. 4's "Sure" row overruns the figure and squeezes its label
- When: 89-96 s, beat `adapt` (element-191.jpeg).
- What: The Sure bar ends about 11 px right of the Torn bar and of Fig. 3, 8 px from "keeps 1 of 6". Its five dropped tokens render as three grey cells.
- Cause: `TopPScene.tsx:58-64`. With `paddingLeft: 12` on every cell of a one-kept row and `boxSizing: border-box`, cells narrower than 12 px grow.
- Fix: `paddingLeft: nuc.kept.length === 1 && i === 0 ? 12 : 0`.

### 13. [P3] other — Fig. 8's "Journal" slot does not match the example above it
- When: 147.5-157.3 s, beat `shape` (element-315.jpeg).
- What: "Names / Year / Journal" fill in as "the shape is right", but the Chen continuation on screen has no journal, and its year comes from the prompt.
- Cause: `PlausibleScene.tsx:16`.
- Fix: caption Fig. 8 "The pattern of a citation, from millions of examples". Or make the third slot "Finding", to match "found a 23% improvement".

### 14. [P3] confusion — The same colors mean different things in adjacent figures
- When:
  - 103-117 s (element-233.jpeg): Fig. 6's "one answer" and "another" branches are teal and purple, the colors of tokens a and b in Fig. 5 beside it.
  - 231-242 s (element-483.jpeg): Fig. 13's chat turns use Fig. 12's Document blue, while Fig. 12's legend makes History teal.
  - 275-294 s (element-579.jpeg): Fig. 16's blue and red grids sit next to Fig. 17's blue for "the text" and red for "the work".
- Cause: `RunsScene.tsx:161,170`; `WindowScene.tsx:178-185`; `SquareScene.tsx:99`.
- Fix: draw Fig. 6's branches in gray 600 (the labels carry the meaning); draw Fig. 13's turns in teal; fill both Fig. 16 grids in red (both are "work").

### 15. [P3] confusion — Two highlighted items in Fig. 11 at once
- When: 205.3-212 s, beat `ctx-in` (element-423.jpeg). Item 4 keeps its yellow mark from `exit` while item 1 is marked for "Pasting in the source".
- Cause: `FixScene.tsx:127` (item 4's `Marked` has no `out`).
- Fix: `<Marked at={eitherAt - 2} out={pastingAt - 4}>`.

### 16. [P3] confusion — A turn headline is set over the previous scene's figures
- When: 290.2-294.4 s, beat `reason-in` (element-586.jpeg). "Reasoning models spend tokens on purpose." sits over the attention-cost grids and chart, under the kicker "Context windows".
- Cause: `SquareScene.tsx:68`.
- Fix: dim Figs. 16-17 to 0.45 from `reasonAt`, as FixScene does with `dimLeft` (`FixScene.tsx:78,96`).

### 17. [P3] explanation — Unglossed jargon and a word mismatch
- What:
  - Fig. 5's label "seed 0" is never explained.
  - Fig. 20's label "o200k_base" is never explained.
  - "The sampler" (`hall-in`, 112.2 s) replaces the earlier "picker" without saying they are the same thing.
  - "Reasoning effort" (Fig. 21) is used as a setting that was never introduced.
  - "Three close scores" (`runs`, 96.6 s) is voiced while Fig. 5 shows probabilities (36.7/33.2/30.1%).
- Cause: `RunsScene.tsx:84`; `BillScene.tsx:72,105`; `script.ts:163,171`.
- Fix:
  - Fig. 5: "Five runs of eight picks, one fixed random seed (the lesson's block)".
  - Fig. 20: "That answer, in the course tokenizer's tokens".
  - Fig. 21: "Reasoning effort, the setting reasoning models expose".
  - Fig. 5's legend: add "from scores 1.0, 0.9, 0.8".

### 18. [P3] other — "On purpose" reads as a dial label
- When: 367-378.8 s (element-755.jpeg). "on purpose" sits past the "high" end of the effort dial.
- Cause: `BillScene.tsx:133-135`.
- Fix: append it to the red label ("the lowest that passes your tests, set on purpose"), or put it under the knob.

### 19. [P3] spacing — Trimmed turns slide across the "removed" slots
- When: 236.5-238 s, beat `edge` (element-474.jpeg).
- What: Turns 5-6 slide over the dashed slots while fading, and turn 14 enters past the window frame. Afterwards, six dropped turns have left four slots.
- Cause: `WindowScene.tsx:74,160-166,194-198`.
- Fix: key turns 5-6's `vanish` to `shift` (fully gone by `pos = FRAME_FROM - 0.5`). Draw six dashed slots, or caption them "trimmed turns".

### 20. [P3] spacing — Fig. 14 is empty for its first 4 s
- When: 242.7-246.8 s, beat `costs` (element-488.jpeg, element-490.jpeg). Only the headline, the caption and the suitcase are on screen while "You pay for every input token" plays.
- Cause: `CostScene.tsx:37` (the first block lands on "every turn").
- Fix: land block 1 on `n.word("costs", "every input token")` and space the rest out to "ten turns".
