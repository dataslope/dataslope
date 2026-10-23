# Llm-1-Tokens (0-323.1 s, whole video)

## Verdict
- A clean, accurate unit. The builder's claims hold up against the frames: all 16 figures are present and cued as described, and every number on screen matches `measurements.json` and the lessons (Fig. 15 bars check out to 2,100..6,600 under the 7,000 line, 89/33 JSON/CSV, 0.8 × 1.3 = 1.04). Layout is mostly generous and legible.
- One P1 defect: the joined word "strawberry" in Fig. 5 is drawn with its letters colliding ("tr", "wb") for 4.6 s. That is the word the scene is teaching.
- In three places the screen runs ahead of the narration or contradicts it. Four BPE merges flash by unnarrated in 0.7 s. The 43,500 bill is up 3.9 s before it is said. On "every key", all 89 JSON cells light up as if every token were a key.
- Some things are asserted but never shown. JSON's repeated keys get no visual. The byte groups in Fig. 11 disagree with the romanized words beside them. The leading-space dot is explained only in a legend nobody reads aloud.
- Pacing is comfortable overall (137 wpm, 1.6 s scene gaps, about 1.3 s holds). The tight spots are `loop` (3.42 w/s, with two figures building at once), `space` (3.62 w/s, the fastest beat, on a subtle idea) and FormatScene, which packs five ideas into 43 s.

## Deep-dive candidates
1. **What tokens explain: letters, digits, reversal.** Lesson: tokens.mdx, "What this explains" (Counting letters, Arithmetic being uneven, Reversal and anagrams being hard).
   - **Where the unit rushes it:** the unit gives it 13 s, `space` (96.2-101.4 s, 3.62 w/s) plus `letters` (102.2-110.4 s). Arithmetic and reversal never appear.
   - **Why the unit cannot slow down:** StrawScene is already 40 s, and the unit still has the rate, BPE and costs to cover.
   - **What a 2-minute video would show:** the ids for "strawberry", " strawberry", "Strawberry" and " Strawberry" side by side: one word, several unrelated ids. Then the R question, with the model holding only those ids. Then a six-digit multiplication whose digits tokenize into uneven chunks, so the columns never line up. Then reversing "strawberry", which needs the letters it never received. Close on the lesson's "words recognized by shape" image.
2. **Replaying the merges on new text.** Lesson: building-a-tokenizer.mdx, "The algorithm" ("to tokenize new text, split it into characters and replay the merges in order") and "The full training loop".
   - **Where the unit rushes it:** merges 7-10 land in 0.7 s (193.3-194.0 s, `after`). The l-o versus o-w tie (both 7) is never explained (`order`, 174.6 s). "The merges are replayed in order" (`list`, 202.1-209.5 s) is only a pulse running down Fig. 10.
   - **Why the unit cannot slow down:** the BPE scene is already 82.6 s, a quarter of the unit.
   - **What a 2-minute video would show:** merges 7-10 one at a time. Then unseen words ("lowest", "newer", "widest") tokenized by replaying the list step by step: lowest becomes low + est`</w>`, the learned suffix generalizing, while unseen roots stay in pieces. State the tie-break rule along the way.
3. **Why a chat costs more than its length.** Lesson: token-counts-in-practice.mdx, "Estimating a conversation".
   - **Where the unit rushes it:** `chat` and `turns` (291.4-309.0 s). All ten bars land in 1.5 s (298.5-300.0 s). The bars are solid, so "resends the whole history" is never drawn. The lesson's quadratic growth and prompt caching are absent.
   - **Why the unit cannot slow down:** it is the last scene before the bridge, and the unit is already 5:23.
   - **What a 2-minute video would show:** stacked bars (system prompt, earlier turns, the new message) growing turn by turn, with the running sum building up as area. Then extend to 20 turns: on the lesson's numbers the conversation is 12,000 tokens long and the bill is 137,000, 11.4 times its length, so the multiplier keeps climbing. End on what prompt caching and starting a fresh conversation change.

## Findings

### 1. [P1] spacing: joined "strawberry" drawn with overlapping letters
- **When:** 81.0-85.6 s, beat `straw` (element-162.jpeg, element-170.jpeg).
- **What:** before the split, Fig. 5 shows "strawberry" as three spans, and "st"/"raw" and "raw"/"berry" overlap by 5-8 px. The "t" touches the "r", and the "w" touches the "b".
- **Why it matters:** this is the word the scene is about, held for 4.6 s, and it reads as a rendering bug.
- **Cause:** the spans are placed at 18 px per character but drawn wider. `StrawScene.tsx:69` places each span at `0.6 * WORD.size` = 18 px per character. `StrawScene.tsx:165` draws them at `WORD.size * 1.15` = 34.5 px, whose advance is 20.7 px.
- **Fix:** use `0.6 * WORD.size * 1.15` in `joinedX`, or draw the unsplit word as a single span until `split >= 0.5`.

### 2. [P2] pacing: four BPE merges land unnarrated in 0.7 s
- **When:** 193.3-194.4 s, beat `after` (element-387.jpeg, element-389.jpeg).
- **What:** n+e, ne+w, new+est`</w>` and low+e all fuse, and four rows join Fig. 10 within 21 frames, while Drew says only "After ten merges". The odd "lowe" tile is never mentioned.
- **Why it matters:** the first six merges were walked through one by one, so a viewer who has been following the method suddenly cannot.
- **Cause:** `BpeScene.tsx:154`: `mergeCue` puts merges 7-10 at `afterAt`, +7, +14 and +21 frames.
- **Fix:** add a sentence before `after` ("Then N and E, then W, then newest whole, and low takes the E.") and cue each merge to its word. Alternatively, space the four at least 20 frames apart and add `pauseAfter: 0.9` to the new beat.

### 3. [P2] confusion: "every key" lights every JSON token, and the keys are never shown
- **When:** 263.5-266.5 s, beat `json` (element-530.jpeg).
- **What:** Fig. 13 draws JSON and CSV as anonymous cells. On "every key" (264.8 s) all 89 JSON cells flash red. The text "customer_id", "region", "amount" never appears.
- **Why it matters:** the visual says every token is a key, and the stated cause ("repeats every key on every record") has nothing on screen to support it.
- **Cause:** `FormatScene.tsx:232`: `focus={pulse(frame, keyAt, 30)}` is applied to the whole block. `FormatScene.tsx:233-243` gives only counts.
- **Fix:** draw both texts with `TokenRun`, using `formats.json.text` and `formats.csv.text` from measurements. Light only the key tokens: 9 occurrences in JSON, 3 in the CSV header.

### 4. [P2] confusion: the 43,500 bill is up before it is said, and before the 7,000 line
- **When:** 298.5-303.9 s, beat `turns` (element-600.jpeg, element-606.jpeg).
- **What:** the bars land 5 frames apart from "ten turns", so the counter reaches 43,500 at about 300.0 s. Drew says "seven thousand" at 300.8 s and "forty-three thousand" at 303.9 s. The viewer reads the bill while hearing the length.
- **Why it matters:** the order on screen (bill, then length) reverses the argument (length, then bill).
- **Cause:** `ChatScene.tsx:55`: `barAt = tenAt - 6 + i * 5`. `ChatScene.tsx:60, 166`: the counter equals the cumulative total of the bars shown.
- **Fix:** keep the counter at opacity 0 until `fortyAt - 4` and count it up over the "forty-three thousand five hundred" phrase. Stretch the bars to `i * 9` frames so they finish on "seven thousand".

### 5. [P2] explanation: byte groups disagree with the romanized words
- **When:** 221-248 s, beats `bytes`, `hello` and `azul` (element-494.jpeg).
- **What:** "Japanese / konnichiwa" (10 letters) sits beside 15 squares in groups of three. "Hindi / namaste" (7 letters) sits beside 18 squares in six groups. The scripts are not drawn, nothing says a group is one character, and "UTF-8" appears in the key without being spoken.
- **Why it matters:** a viewer counting letters against bytes gets nonsense, which undercuts "a Japanese or Hindi character is three".
- **Cause:** `BytesScene.tsx:100` shows only the romanization. The grouping from `CHAR_GAP` (`BytesScene.tsx:23`) is unlabelled.
- **Fix:** under each romanization add "5 characters × 3 bytes", "6 characters × 3 bytes" and "4 characters × 3 bytes" (English "5 letters × 1 byte"), cued on `threeAt`. Alternatively, add "a gap: next character" to the key at `BytesScene.tsx:158-175`.

### 6. [P2] pacing: the leading-space token gets the fastest beat in the video
- **When:** 96.2-101.4 s, beat `space`, 3.62 w/s (element-200.jpeg, element-203.jpeg).
- **What:** "Put a space in front, the way it sits inside a sentence, and the whole word is one id" is a subtle idea delivered at the video's top rate. The "·" in the "·strawberry" chip is explained only by Fig. 4's small legend ("· marks a leading space"), which is never read aloud.
- **Why it matters:** viewers miss that the dot is the space, and with it why the id changes.
- **Cause:** `script.ts:152-156` (one long sentence, `pauseAfter: 0.8`). `StrawScene.tsx:136-140` (the legend only).
- **Fix:**
  - Split the beat into "Put a space in front, the way it sits inside a sentence." and "And the whole word is one id." with `pauseAfter: 0.6` between them.
  - Add a label "· is the space" beside the chip at `StrawScene.tsx:206`, cued on `spaceAt`.

### 7. [P2] pacing: the generation loop is drawn twice at once, on a 3.4 w/s beat
- **When:** 28.0-33.8 s, beat `loop`, 3.42 w/s, gap 0.55 s (element-058.jpeg, element-061.jpeg).
- **What:** Fig. 2's rows (the → cat, then the cat) and Fig. 3's ring arcs both draw on "token", "adds" and "runs again", on opposite sides of the screen.
- **Why it matters:** this is the core mechanism of the unit. The eye has to choose a figure while the sentence races by.
- **Cause:** `LoopScene.tsx:87-88` (rows on `loopFrom`, `tokenAt`, `longerAt`) and `LoopScene.tsx:200, 212` (ring arcs on the same cues).
- **Fix:** let the ring draw alone during `loop`, and start Fig. 2's rows on `again` ("The" at `theAt`). Raise `loop`'s `pauseAfter` to 0.8.

### 8. [P3] spacing: the end marker is set under 19 px
- **When:** 154-220 s, beats `split` to `counts-in` (element-403.jpeg).
- **What:** in Fig. 10's pair column, `</w>` renders at about 17 px, and the dashed marker tiles in Fig. 8 at about 18.7 px.
- **Why it matters:** it breaks the 19 px floor on a symbol the narration explains.
- **Cause:** `BpeScene.tsx:61` (`size * 0.72`), `:96` (marker at size 26, so 18.7 px), `:363, :365` (`Sym size={24}`, so 17.3 px).
- **Fix:** use `fontSize: Math.max(20, size * 0.72)` at `:61`.

### 9. [P3] explanation: the pair count is truncated, and the tie is never explained
- **When:** 160-174 s, beats `count`, `merge` and `order` (element-333.jpeg).
- **What:** Fig. 9 ("Neighbouring pairs, counted") shows five pairs. s t (5) and t `</w>` (5) tie with the three 5s shown but are missing. l o and o w both count 7, yet "L and O first" gets no reason.
- **Why it matters:** a careful viewer redoing the count by hand will stumble on both points.
- **Cause:** `BpeScene.tsx:305-334` (the lesson's `most_common(5)`, unlabelled).
- **Fix:**
  - Retitle the figure "Neighbouring pairs, the top five of 14".
  - Add a note under merge 1 at `BpeScene.tsx:341-372`: "tied with o w: the first counted wins".

### 10. [P3] confusion: Fig. 4 gives away Fig. 5's reveal
- **When:** 74-101 s, beats `token` to `space` (element-170.jpeg).
- **What:** the vocabulary table shows st 302, raw 1618, berry 19772 and ·strawberry 101830 ("a whole word") from 74 s, before "Take strawberry" (80.8 s) and "the whole word is one id" (96.2 s). Fig. 5 then repeats all four.
- **Why it matters:** the "space" payoff is already on screen, and the same ids appear twice side by side.
- **Cause:** `data.ts:40-44` (`VOCAB_ROWS` built from the strawberry pieces) and `StrawScene.tsx:100-135`.
- **Fix:** fill Fig. 4 with entries the unit already measured (·cat 9059, ·dog 6446, ·man 873, ·first 1577) plus one piece. Alternatively, keep the strawberry rows at opacity 0 until `pieceSaid[k]` and `oneIdAt`.

### 11. [P3] other: figure numbers run right to left, and the price sum sits under the wrong figure
- **When:** 268-291 s, beats `models` and `price` (element-580.jpeg).
- **What:** Fig. 14 is on the left and Fig. 13 on the right. "0.8 × 1.3 = 1.04" sits under the JSON/CSV cells, but it belongs with Anthropic's 30% on the left.
- **Why it matters:** the arithmetic reads as if it were about JSON against CSV.
- **Cause:** `FormatScene.tsx:195` (Fig. 14 at `X0`), `:231` (Fig. 13 at `RX`), `:247` (the equation at `RX`, `EQ_Y`).
- **Fix:** fade Fig. 13 out on `cheaperAt` and give the equation its own label line ("The price check"). Alternatively, put Fig. 14 in the right column and let the equation follow the Anthropic note on the left.

### 12. [P3] spacing: the yarn's two leader lines start in empty space
- **When:** 61.5-72 s, beats `same` and `token-in` (element-141.jpeg).
- **What:** the lines to "a well known fact" and "an invented citation" start about 90 px below the ball, beside "the token that means done". The second line runs under the yarn's tail.
- **Why it matters:** "out of the same machinery" needs the lines to visibly leave the ball.
- **Cause:** `LoopScene.tsx:273-277` (start points at `y(470) + 312`).
- **Fix:** start both lines at the ball's lower rim, around `[RX + 130, y(470) + 230]` and `[RX + 190, y(470) + 240]`.

### 13. [P3] explanation: "o200k_base" goes unexplained for most of the video
- **When:** 19.5-268 s (element-054.jpeg, element-170.jpeg, element-274.jpeg).
- **What:** "o200k_base" appears in Figs. 1, 4, 7 and 11. Drew never says it. He says "GPT-4o's tokenizer" at 81 s, but the screen only ties the two together in Fig. 14 at 268 s. Fig. 1's "this one has two hundred thousand" also has no named model.
- **Why it matters:** an unexplained code name sits in four figure titles.
- **Cause:** `ModelScene.tsx:154`, `StrawScene.tsx:95`, `RateScene.tsx:98`, `BytesScene.tsx:79` (the name only), against `FormatScene.tsx:215`.
- **Fix:** title Fig. 4 "Five entries of o200k_base, GPT-4o's vocabulary". Make Fig. 1's note "o200k_base (GPT-4o's tokenizer) has 200,000 tokens in all".

### 14. [P3] spacing: the bridge figure is squeezed while the dimmed chart keeps the stage
- **When:** 310-323.1 s, beats `number` and `next` (element-645.jpeg).
- **What:** Fig. 16 (berry 19772, ·cherry 60225), the unit's last idea, sits in a 500 px column. The faded Fig. 15 still fills two thirds of the frame.
- **Why it matters:** the closing question has the least room of anything in the video.
- **Cause:** `ChatScene.tsx:79` (`Dim to={0.35}` rather than an exit) and `ChatScene.tsx:176-188` (Fig. 16 at `RX = 1300`).
- **Fix:** replace `Dim` with `Out` at `eachAt - 4`. Set Fig. 16 at `X0` with art about 300 px tall and ids at 48 px, and move `NextLine` under it.

### 15. [P3] explanation: "newer tokenizers often do better" is ambiguous
- **When:** 121.9-129.6 s, beat `newer` (element-274.jpeg).
- **What:** "better" is never defined. The 5.3 characters a token on screen, against the "about 4" of the rule just stated, is never read aloud or tied to "fewer tokens".
- **Why it matters:** a viewer told "about four" sees 5.3 and cannot tell which number to trust.
- **Cause:** `script.ts:170` and `RateScene.tsx:120`.
- **Fix:** have Drew say "Newer tokenizers often pack more text into each token." Add a note under 5.3: "more than four: fewer tokens than the rule predicts".

### 16. [P3] other: the FormatScene headline does not fit its first figure
- **When:** 248.3-267.5 s, beats `formats` and `json` (element-514.jpeg).
- **What:** "Same content, different counts." sits over Fig. 12, which compares different content (prose against Python).
- **Why it matters:** the headline contradicts the figure under it, while the narration says "What the text is matters too".
- **Cause:** `FormatScene.tsx:162`.
- **Fix:** open on "Different text, different rates." and swap the headline to "Same content, different counts." at `recordsAt`.

### 17. [P3] explanation: "token" is used for a minute before it is defined
- **When:** 4.6-67.8 s, beats `hook` to `token-in` (element-020.jpeg).
- **What:** the hook says "takes a sequence of tokens", but Fig. 1 reads a single "the". Every chip until 72 s is a whole word, so "token = word" is the natural reading, and "Not one word" (13.6 s) can be heard as confirming it. The video is also embedded on its own in the what-a-language-model-is lesson.
- **Why it matters:** the unit's first claim leans on an undefined term.
- **Cause:** `script.ts:106` and `ModelScene.tsx` (a one-token input).
- **Fix:** add a gloss to the hook: "It takes a sequence of tokens, chunks of text, often whole words, and gives back…". Optionally, give Fig. 1 a two-token input.
