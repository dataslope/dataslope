# MachineLearningEngineer-9-ServingLlms (7:46)

## Verdict
- A strong, well-built answer set. Every KV-cache number checks out against `results.json`, the page's block and my own arithmetic: 2 × 80 × 8 × 128 × 2 = 327,680 bytes = 320 KiB a token; 131,072 tokens = 40 GiB; 640 − 140 = 500 GB; 500e9 // 2,684,354,560 = 186; 500e9 // 42,949,672,960 = 11; 500e9 // 21,474,836,480 = 23; 4-bit weights 35 GB, 45 GB free on one GPU, 16 requests. The node bar, the 40 GiB bar and the one-GPU bar are drawn to scale with those numbers. Nothing said is wrong.
- The weakest answer is speculative decoding. The verify step (keep drafts up to the first rejection, add the large model's own token, drop the rest) is never said, and the picture shows it for 0.7 s. That is the follow-up an interviewer asks, and it is also what makes "about four tokens" from a 4-token draft add up.
- The KV whiteboard step shows "500 GB free" and "2.5 GiB each" but says 186. On a whiteboard 500 / 2.5 is 200. Nothing on screen explains the GiB/GB gap, or why the count is "at most". Under the bar, the caption keeps saying 2.5 GiB while the bar redraws with 40 GiB and 20 GiB cells.
- One figure says something misleading: "draft usually wrong: can lose" is attached to the 1-in-2 row and dims it, but 1.9 tokens a pass is still a gain unless the draft is expensive. One figure is visibly broken: four of the six attention arcs in question 2 stop 20 to 45 px short of their arrowheads.
- Pacing is comfortable throughout. Every gap between beats is at least 0.6 s, no new idea arrives above about 3.1 words/s, and every scene holds 1.3 s or more before its cut.

## Findings

### 1. [P2] answer: the speculative-decoding verify step is never said and is shown for 0.7 s
- When: 368.5-371 s, beat `q4-spec` (element-369.jpeg, element-370.jpeg, element-381.jpeg); 382-396 s, beat `q4-sim` (element-395.jpeg)
- What: the narration says the large model "verify them all in one forward pass" and moves on. On screen the third draft "word" turns red and is struck at 369.3 s, then at 370.0 s it is swapped in place for a green "tokens" ("its own token"). After that no red is left anywhere, the draft row still shows "word" in its blue dashed outline, and "fast" sits greyed with no label. Then q4-sim says a pass "yields about four tokens" from 4-token drafts, and the screen shows "about 4.1 tokens". A viewer who multiplies 4 × 0.9 = 3.6 cannot see how a 4-token draft gives more than 4.
- Why it matters: "What happens when the draft is wrong?" is the standard follow-up. The answer (accept up to the first rejection, the large model adds its own token, the rest is dropped, so every pass yields at least one token) is also why the numbers in q4-sim hold.
- Cause: `video/src/videos/mle-serving-llms/script.ts:396` (no clause for it); `QuantScene.tsx:269` (`swap` at `verifyAt + 46`, 22 frames after the strike at `verifyAt + 24`, line 272); `QuantScene.tsx:261` (the draft row never marks the rejected or dropped drafts); `QuantScene.tsx:305` (the simulation note does not say what a pass's tokens are).
- Fix: split `q4-spec` at "either way." and add a beat after it: "It keeps the drafted tokens up to the first one it rejects, drops the rest, and adds one token of its own." (105 characters). Cue the strike to "rejects", the drop to "drops the rest" and the swap to "one token of its own". Keep the rejection visible: the draft "word" keeps a red dashed outline and a strike, the draft "fast" goes grey with "dropped" under it. Simulation note: "Simulation, 4-token drafts: tokens per pass, the accepted drafts plus its own".

### 2. [P2] accuracy: "can lose" is pinned to the 1-in-2 row, which still gains
- When: 403-407 s, beat `q4-cost` (element-406.jpeg)
- What: on "can lose where the draft is usually wrong", the "Draft accepted 1 in 2" row dims and gains "· draft usually wrong: can lose" in red. A 1-in-2 draft is right half the time, not usually wrong, and at 1.9 tokens a pass it beats plain decoding unless four draft steps cost more than about 0.9 of a large-model step (1.94 / (1 + 4c) > 1 for c < 0.23; a draft a tenth the size gives about 1.4 times). The screen tells the viewer that 50% acceptance loses.
- Why it matters: a viewer would repeat it, and would turn down a working speculative setup on that basis.
- Cause: `QuantScene.tsx:313` and `:328` (`dim` on row 2 at `loseAt`); `QuantScene.tsx:345` (the red tag on row 2).
- Fix: leave the 1-in-2 row undimmed with no tag. Put the loss on the cost line, where the narration puts it: "The draft model costs time and memory of its own" and then, in red on "can lose", ", so a draft that is usually wrong can lose".

### 3. [P2] explanation: 186 from "500 GB free" and "2.5 GiB each" reads as 200, and "at most" is never explained
- When: 154-169 s, beat `q2-fit` (element-168.jpeg)
- What: the line under the node bar reads "500 GB free · 8K tokens a request: 2.5 GiB each", and the count is "At most 186 requests of 8K tokens". 500 / 2.5 = 200. The answer is 186 because 2.5 GiB is 2.68 GB, and nothing on screen or aloud says so. "At most" is said but not explained: the block subtracts only the weights, and the script's own header says activations and the runtime take their share.
- Why it matters: the narration calls this "the one to do on the whiteboard". A viewer who checks it gets a different number. They also get no answer for the interviewer's "is 186 realistic?"
- Cause: `KvScene.tsx:402` (the caption gives GiB only); `KvScene.tsx:407` (the count line).
- Fix: add `per8kGB` (2.68) to `check.mjs` and show "8K tokens a request: 2.5 GiB = 2.68 GB each". Under the count, add a soft line: "Weights only: activations and the runtime take a share too".

### 4. [P2] confusion: the bar's caption keeps "2.5 GiB each" while the bar shows 40 GiB and 20 GiB cells
- When: 171-180 s, beat `q2-long` (element-179.jpeg); 190-202 s, beat `q2-gqa` to `q3-in` (element-199.jpeg)
- What: the free part is refilled with 11 cells of a 128K context (40 GiB each), then with 23 cells of an 8K request with 64 KV heads (20 GiB each). Through both, the caption directly under those cells still reads "8K tokens a request: 2.5 GiB each". The scene's finished frame, held through `q3-in`, pairs 23 wide cells with a caption that describes the 186 narrow ones.
- Why it matters: it is the only label on the cells, and it describes cells that are no longer drawn.
- Cause: `KvScene.tsx:402`, one caption for all three fills (`cells`, lines 154-161).
- Fix: the caption follows the fill: "8K tokens a request: 2.5 GiB = 2.68 GB each" for 186, "128K tokens a request: 40 GiB each" for 11, "8K tokens, 64 KV heads: 20 GiB each" for 23 (add `per8kNoGqaGiB` to `check.mjs`). Cross-fade them on the same cues as the cells.

### 5. [P2] spacing: four of the six attention arcs stop short of their arrowheads
- When: 115-146 s, beats `q2` to `q2-model` (element-122.jpeg, element-141.jpeg)
- What: the arcs from "memory" back to "Serving", "a", "large" and "model" end 20 to 45 px above their arrowheads and to one side of them, so the heads float off the lines. Only the two shortest arcs ("is", "mostly") reach their heads.
- Why it matters: this is an obvious drawing defect, on screen for 30 s, in the figure that defines what the cache holds. It also breaks the house rule that arrowheads sit on the line's straight end.
- Cause: `KvScene.tsx:217`, `strokeDasharray={`${p * 0.96} 1`}`. The visible path stops at 96% of its length whatever that length is. On a 1,100 px arc that is about 44 px short, which cuts off the 20 px straight end and part of the curve.
- Fix: stop the stroke a head-length short (`(len − head + 1) / len`, with `len = lineLength(line)`), as `Flow` in `parts.tsx` does.

### 6. [P3] confusion: "How many requests fit?" flashes at mid-right and vanishes
- When: 157.2-159 s, beat `q2-fit` (element-158.jpeg)
- What: the beat's question appears as small grey text at x 1120, alone on the right half of an empty band, and fades 1.7 s later when "8 × 80 GB = 640 GB" draws at the left.
- Why it matters: it reads as a stray label. The question the step answers is gone before the answer arrives.
- Cause: `KvScene.tsx:338` (`x={barX + 1000}`, `out={gpusAt - 6}`).
- Fix: put it where the answer will be (x 120, y 806), and hold it until "At most 186 …" replaces it on "at most".

### 7. [P3] accuracy: the grouped-query sketch shares one key and value head among four query heads; this model shares among eight
- When: 182-202 s, beat `q2-gqa` (element-199.jpeg)
- What: four Q boxes join one "K, V". With 64 query heads and 8 KV heads, each KV head serves 8. The narration then says the cache "grows eight times", which a viewer reading the sketch would put at four.
- Why it matters: it is a small inconsistency between the sketch and the number said over it.
- Cause: `KvScene.tsx:433`, `:449` (`length: 4`).
- Fix: draw `gqaFactor` (8) Q boxes, narrower, and caption the group "8 query heads share one key and value head".

### 8. [P3] explanation: the batching simulation's 99% assumes a full queue, which the note leaves out
- When: 233-248 s, beat `q3-sim` (element-246.jpeg)
- What: the note reads "Simulation: 8 slots, 1,000 requests, answers 10 to 1,000 tokens, mostly short". In `check.mjs` all 1,000 requests wait from the start, so a free slot always has a request to take. At light traffic neither scheme fills its slots.
- Why it matters: "continuous batching keeps the GPU 99% busy" is the line a viewer would quote. The interviewer's follow-up is "at what load?"
- Cause: `BatchScene.tsx:271-275`.
- Fix: the note ends ", mostly short, all waiting at the start".

### 9. [P3] accuracy: the paged grid's last block is drawn part-full, but 2,000 tokens fill 125 blocks exactly
- When: 266-314 s, beats `q3-paged` to `q3-latency` (element-282.jpeg)
- What: 125 blocks of 16 hold exactly 2,000 tokens, yet the 125th block is drawn 9/16 full, a hand-typed fraction. The waste line ("at most 15 tokens") is the worst case, which is right. The drawing shows a part-full block that this request does not have.
- Cause: `BatchScene.tsx:133` (`lastFill = 9 / 16`).
- Fix: fill the frontier block token by token while the blocks are handed out, so the part-filled last block is seen as the answer grows, and let it end full. The fraction comes from `PAGING` (`usedTokens`, `blockTokens`), not a literal.
