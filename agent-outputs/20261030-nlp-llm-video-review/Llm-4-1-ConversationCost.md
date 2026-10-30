# Llm-4-1-ConversationCost (2:20)

## Verdict
- A well-built deep dive. Every number on screen and in the narration matches `measurements.json` and the lesson's own `conversation_cost`: 2,150, 550, 23,600, $0.1325, $0.3750, $1.1900, x2.8, x3.2, x3.5, $0.2563, 78%, $0.42. The staircase becomes an area, the area splits into a rectangle and a triangle, and four copies of the old triangle tile the new one. That chain of figures is clear, cued to the words, and nothing in it overlaps or falls under 19px.
- The biggest problem is that the last two scenes undercut each other. "Start a fresh one" is priced without the cache ($0.42 against $1.19) right after the cache scene struck $1.19 out and replaced it with $0.26. With the cache the video has just recommended, eight five-turn chats cost $0.24 and one forty-turn chat $0.26, so the saving the fresh scene shows mostly disappears.
- The cache scene's explanation is off by one step. The narration says caching "goes after the triangle", but the figure discounts everything sent last turn, system prompt included. The closing tip ("put whatever never changes first") only makes sense because the cache matches a prefix, and the video never says so.
- Pacing is comfortable through the staircase and the bills: gaps of 0.6 to 1.0 s, and every scene holds at least 1.3 s after its last word. The cache scene is the dense stretch: beats at 3.23 and 3.05 w/s bring in a new concept, a new unit and two new figures. The 20-turn setup for the doubling argument is on screen for under a second.

## Findings

### 1. [P1] accuracy: The fresh-chat comparison ignores the cache the previous scene just applied
- When: 122.8-131.6 s, beat `fresh` (frames element-121.jpeg, element-138.jpeg)
- What: The cache scene ends on "40 turns ~~$1.1900~~ $0.2563, 78% less" (element-121). The next scene says "start a fresh one. Eight five-turn chats cost forty-two cents. One forty-turn chat, a dollar nineteen," and Fig. 8 shows the struck-out $1.1900 again as the bill of one chat. Those are uncached prices. With `cached=True`, which the video has just recommended, eight five-turn chats cost 8 x $0.02989 = $0.2391 against $0.2563 for one forty-turn chat (`measurements.json`, bills[5].cached and bills[40].cached). The 2.8x saving shrinks to about 7%. The lesson's sentence ("a 40-turn conversation can cost more than eight separate 5-turn ones", estimating-cost.mdx:118-120) is about the uncached table. The lesson's other reason to start fresh, that it is "a cost decision as well as an accuracy one" (token-counts-in-practice.mdx:193-194), is not given.
- Why it matters: A viewer will take away that a fresh chat cuts the bill by nearly two thirds on top of caching. They also see a number the video has just struck out come back as current.
- Cause: `video/src/videos/llm-conversation-cost/FreshScene.tsx:91-92` and `:108-109` show `FRESH.one` and `FRESH.eight`. `measure.py:241-248` computes only the uncached pair. `FreshScene.tsx:74` titles Fig. 8 with no mention of the cache. `script.ts:153` gives no qualifier.
- Fix: Add the cached pair to `measure.py` (`8 * conversation_cost(MODEL, 5, cached=True)` against `bills[40]["cached"]`). Retitle Fig. 8 "Forty turns of chat, two ways, without a cache". Rewrite `fresh` as: "And when a chat runs long, start a fresh one. Without a cache, eight five-turn chats cost forty-two cents, and one forty-turn chat a dollar nineteen. With one, the gap nearly closes, but a fresh chat still keeps the model on what matters." Alternatively, move `FreshScene` before `CacheScene` in `Video.tsx:45-53`, so the uncached comparison comes before the cache is introduced.

### 2. [P2] accuracy: "Caching goes after the triangle" contradicts its own figure and the tip that follows
- When: 99.7-121.2 s, beats `cache`, `flat`, `stable` (frames element-105.jpeg, element-110.jpeg, element-121.jpeg)
- What: At "triangle" a dashed purple triangle is drawn from the top of the system prompt. Then the "sent last turn, 23,050 tokens" bracket spans from 0, which includes the system prompt, and the whole light-blue part of every bar from turn 2 on, rectangle included, shrinks to a twentieth and turns teal. Seconds later the narration says to put the system prompt first "where the cache can match it". That advice is about the rectangle, which the narration said the cache does not touch. The dashed triangle's right edge also runs 10px from the bracket for its whole height (element-105).
- Why it matters: The viewer hears one thing, sees another, and is then given a rule that only follows from what was seen.
- Cause: `script.ts:139` ("goes after the triangle"). `CacheScene.tsx:134-144` outlines only the triangle, while `kit.tsx:483` shrinks `t.resent`, which includes the system prompt, and `CacheScene.tsx:147` brackets from the baseline.
- Fix: `cache`: "Prompt caching goes after the repeat. You still send it all, but whatever you sent last turn, system prompt included, is read back at a twentieth of the price." In `CacheScene.tsx:135-144`, outline the whole "sent before" region (from `geo.base`, not `L`) cued on "repeat", or drop the overlay and let the bracket carry it.

### 3. [P2] explanation: "Put whatever never changes first" without the prefix rule, in a dense closing beat
- When: 117.3-121.2 s, beat `stable` at 3.05 w/s, scene cut at 122.5 s (frame element-121.jpeg)
- What: Fig. 7 ("One request, in order": system prompt, earlier turns, the reply and your message) builds and fills during one 12-word beat. The narration never says why order matters: a cache matches a request from its first token and stops at the first byte that changed. controlling-cost.mdx:74-79 makes exactly this point ("byte-identical" prefix, "Put stable content first"). Fig. 7 also carries 14 words the narrator does not read, on screen for about 5 s.
- Why it matters: "First" is the whole rule, and the video gives it no reason, so it reads as a tip to memorise.
- Cause: `script.ts:147`, and `CacheScene.tsx:185-221` (Fig. 7 cued inside the same beat).
- Fix: Insert a beat before `stable`: `{ id: "prefix", text: "The cache matches a request from its first token, up to the first thing that changed.", pauseAfter: 0.6 }`. Cue the Fig. 7 boxes on it (`n.beat("prefix").from + i * 5`). Shorten `stable` to "So put whatever never changes first." and give it `pauseAfter: 1.0`.

### 4. [P2] pacing: The cache beat brings in a concept, a price, a new unit and five visual events at 3.23 w/s
- When: 99.7-107.7 s, beat `cache` (26 words in 8.0 s) (frames element-105.jpeg, element-110.jpeg)
- What: In one beat Fig. 6 builds from nothing on a new axis (cents, not tokens, never mentioned), the dashed triangle appears, a flash runs along the bars, the "sent last turn" bracket opens, and the bars collapse to teal. Meanwhile the narrator defines prompt caching and the twentieth price. It is the densest beat in the video, and it carries its least familiar idea.
- Why it matters: The collapse is the payoff of the scene, and it lands while the viewer is still parsing what the new chart measures.
- Cause: `script.ts:139` (one beat). The `CacheScene.tsx:123-151` cues all fall inside it.
- Fix: Split it into `cache` ("Prompt caching goes after the repeat. Here are the same forty turns, in cents.", `pauseAfter: 0.7`) and `twentieth` ("You still send it all, but whatever you sent last turn is read back at a twentieth of the price.", `pauseAfter: 0.8`). Re-cue `lastAt`/`twentiethAt` to the second beat (`CacheScene.tsx:61-62`).

### 5. [P2] pacing: The 20-turn starting point of the doubling argument flashes for under a second
- When: 64.6-65.4 s, beat `double` (frames element-065.jpeg, element-076.jpeg)
- What: Until 64.6 s the chart is the forty-turn chat. At "Now" the right half is veiled and a "20 turns" bracket appears, but it is replaced by "40 turns" about 0.7 s later, at "double the turns". The narration never says the chat has been cut to twenty turns. The argument depends on the viewer knowing that the triangle being doubled is the 20-turn one.
- Why it matters: Without that setup, "four of the old one fit inside" lacks its "old one", and the veil looks like a rendering glitch.
- Cause: `StairsScene.tsx:469-472` (the "20 turns" bracket and label leave at `doubleAt - 4`, 14 frames after they open) and `script.ts:114`.
- Fix: `double`: "Take twenty turns, and double them. The rectangle just gets twice as long." Hold the 20-turn bracket until `longAt - 4` (`out={longAt - 4}`), and bring in the 40-turn bracket and label at `longAt` (`StairsScene.tsx:473-476`).

### 6. [P2] confusion: Light blue means "sent before", but the new part of the request is drawn light blue twice
- When: 117.3-122.5 s, beat `stable` (frame element-121.jpeg); also 15-17.4 s, beat `memory` (frame element-016.jpeg)
- What: In Fig. 7, "the reply and your message" (the uncached, new part) is filled with NEW at 34%. That is visually the same as SENT (NEW at 32%), the "sent before" color from Fig. 3 and from Fig. 6 a few seconds earlier. Directly above it, Fig. 6's legend shows "new this turn" as solid blue. In Fig. 2 every bubble, including "your next message", fills with SENT "from the top", before the legend defines that color as "sent before".
- Why it matters: The one box that should read "new, full price" reads as "sent before".
- Cause: `CacheScene.tsx:202-203` (`fill * 34` of NEW) against `kit.tsx:29` (SENT = NEW 32%), and `StairsScene.tsx:247`.
- Fix: Fill the uncached Fig. 7 box with solid `NEW` and white text (or at least 75% NEW). In Fig. 2, fill the last bubble with `NEW` instead of `SENT`, or fill all bubbles a neutral grey, since Fig. 2 comes before the two-color legend.

### 7. [P3] confusion: Fig. 6's "78% less" is the whole bill, set inside a chart of input only
- When: 112-122.5 s, beat `flat` (frame element-121.jpeg)
- What: Fig. 6 is titled "Input each turn pays for" and plots input cents. The figures "40 turns, $1.1900 struck, $0.2563, 78% less" inside it include $0.16 of replies. The plotted input falls from $1.03 to $0.096, which is 91%, so the picture shrinks far more than the label says. The red strike also marks a correct number (the uncached bill) as if it were wrong, and that number returns unstruck in the next scene (see 1).
- Why it matters: A viewer comparing the dashed staircase with the bars finds the area and the label out of step.
- Cause: `CacheScene.tsx:171-182`.
- Fix: Label it "40 turns, whole bill with replies" (`CacheScene.tsx:172`). Replace the `Strike` with a plain grey "$1.1900 →" before the teal $0.2563.

### 8. [P3] pacing: "your first message, 150" is on screen for about 1.3 s
- When: about 21.2-22.6 s, beat `first` (frame element-021.jpeg)
- What: The label and its leader arrive at "first message", the last words of the beat, and leave at `twoAt - 6`, 0.6 s into the pause. The number 150 is not spoken. It reappears later inside "the reply, 400, and your next message, 150".
- Why it matters: It is a new number with less than half the reading time it needs.
- Cause: `StairsScene.tsx:322-332` (in at `firstMsgAt - 2` / `firstMsgAt`, out at `twoAt - 6`); `script.ts:96` (`pauseAfter: 0.6`).
- Fix: Cue the label on `n.word("first", "your")` and raise `first`'s `pauseAfter` to 1.0. That gives about 2.2 s, and it still clears before the turn-two labels take the same spot.

### 9. [P3] confusion: The ratios appear twice at once, and Fig. 5 builds while three numbers are read
- When: 85.5-91.1 s, beat `ratios` at 3.08 w/s (frame element-089.jpeg)
- What: At "two point eight", x2.8 appears as an arrow beside Fig. 4 and as a dot on the new Fig. 5 scale at the same moment. The same happens for x3.2. Fig. 5 itself (a x2 to x4 number line) opens at the start of the beat. The viewer gets a new figure, three numbers and a duplicate of each in 5.6 s.
- Why it matters: The eye has to choose between two copies of the same number while the scale it belongs on is still being drawn.
- Cause: `BillsScene.tsx:143-156` (Fig. 4 arrows) and `:159-194` (Fig. 5), both cued on `ratioAt`; `script.ts:128`.
- Fix: Drop the Fig. 4 arrows (`BillsScene.tsx:143-156`), since Fig. 5 carries the same numbers on the scale that explains them. Split `ratios` after "three point two." with `pauseAfter: 0.6`.

### 10. [P3] explanation: Fig. 5's ends are never said, and "all rectangle" disagrees with Fig. 4's legend
- When: 91.9-99.4 s, beat `toward` (frame element-098.jpeg)
- What: The scale's floor and ceiling carry the argument: a bill that was all straight line would double, and one that was all triangle would quadruple. They appear only as the labels "all rectangle" and "all triangle", and the narration goes straight to "the more of the bill is triangle". Fig. 4's legend on the same screen calls the grey part "rectangle and replies".
- Why it matters: The step that connects the previous scene's x2 and x4 to the bills' x2.8 and x3.2 is left for the viewer to infer.
- Cause: `script.ts:131`; `BillsScene.tsx:171-173`.
- Fix: `toward`: "All rectangle, a bill would just double. All triangle, it would quadruple. The longer the chat, the more of it is triangle, so each doubling creeps toward four times." Relabel the x2 end "all rectangle and replies".

### 11. [P3] confusion: The "again and again" highlight sweeps the rectangle too
- When: about 62.5-64 s, beat `triangle` (frame element-063.jpeg)
- What: On "the chat itself, sent again and again", a blue wash ripples across each bar's full height. That includes the grey system-prompt rectangle, which the previous beat had just separated off as "the same every turn".
- Why it matters: The highlight points at more than the words name.
- Cause: `kit.tsx:524` (flash rect from `geo.base - shown` over the full `shown`), driven by `StairsScene.tsx:307`.
- Fix: When `triTint > 0`, give the flash rect the triangle's height only (`height = shown - SYSTEM * geo.k`, same `y`), as the `triTint` rect at `kit.tsx:522` already does.

### 12. [P3] spacing: Crowded right column in Fig. 6/7, and single-word "price" lines
- When: 116-122.5 s (frame element-121.jpeg); 51-77 s (frames element-058.jpeg, element-076.jpeg)
- What: Fig. 7 is fitted into Fig. 6's right column. Its "first" label sits at the plot's right edge, 40px under the ghost staircase's last step, on the same baseline (y ≈ 485) as "without the cache", so the row reads "without the cache ... first". "only the new slice pays full price" and "plus the replies, at the output price" each wrap and leave "price" alone on its line.
- Why it matters: It is a polish issue: an awkward reading line and two widowed words in an otherwise clean layout.
- Cause: `CacheScene.tsx:157-158` ("without the cache" at `lastTop + 46`), `:216-218` ("first"), `:166-168` (width 360); `StairsScene.tsx:385-387` (width 360).
- Fix: Move "without the cache" to `geo.x(30)`, `lastTop + 110`, so it sits under the dashed line, away from Fig. 7. Shorten the notes to "only the new slice pays in full" and "plus the replies, at the output rate", or widen both notes to 420.

### 13. [P3] accuracy: "A twentieth of the price" is said as if it were the general cache rate
- When: 99.7-107.7 s, beat `cache` (frame element-110.jpeg)
- What: The narration says what was sent last turn "is read back at a twentieth of the price" with no model named. The lesson's own price table runs from a tenth (Haiku) to a fortieth (Fable), and controlling-cost.mdx:64-66 says "a tenth of the input price, or ... a twentieth or a fortieth on some of the newest models". Only the Fig. 6 title and the "$0.10 a million, not $2.00" note tie it to Sonnet.
- Why it matters: A viewer may take 1/20 as the standard cache discount.
- Cause: `script.ts:139`.
- Fix: "...is read back, on Sonnet, at a twentieth of the price."
