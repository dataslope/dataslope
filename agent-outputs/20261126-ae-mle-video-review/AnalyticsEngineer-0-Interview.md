# AnalyticsEngineer-0-Interview (166.3 s, 2:46)

## Verdict
- Second review. All eight fixes from 2026-11-20 hold on screen. The captions "Data engineering" and "Analytics" stay through the probes (element-053). "The transformation layer" names the stack (element-007, element-020). "Still the core" and the stack arrive on the AI scene's first word (element-056). "Added on top" waits for "four more topics" (element-073, element-076). The series baseline and names ink on "This series" (element-115, element-121). The recruiter highlight clears on "Part nine covers" (element-113). Item 2's subline is complete (element-090). Probe heads now sit 30 to 31 px under their rules, measured on element-053.
- No wrong claim. The bars (22, 9, 21, 11, 19, 14, 26, 19, 6) sum to 147, and with the 1 answered here make 148. Concept checks are on 7 pages, challenges on 3, and the bank holds 110, all matching `results.json`. The four probes and the four AI topics follow the index and the AI page in order and wording, and each probe's "Parts" label fits the plan's question map.
- As an answer to "How has the Analytics Engineer interview changed with AI?" it still holds up: the core is unchanged, there are four added topics, the reason they matter, the advice to ask the recruiter, and Part 9 for depth.
- What the first pass missed is all P3 and all on screen. Item 1's subline names the failure without saying which side gives it. Part 9's column title, "AI layer", coins a term. The four probe topic lines start lowercase while every other standalone line in the video is capitalised. The arrow from the assistant floats 71 px below the speech bubble.
- Pacing is unchanged and comfortable (1.6 to 3.0 words/s, every gap 0.55 s or more). No text is under 20 px, and nothing overlaps or clips.

## Findings

### 1. [P3] explanation: item 1's subline names the confident wrong answers but not where they come from
- When: 80.4-114.6 s, beats `ai-sql` to `ai-more` (element-082.jpeg, element-113.jpeg).
- What: Item 1 reads "Text-to-SQL or a semantic layer" over "Confident wrong answers". The title names both sides, and the subline names a failure without saying which side produces it. The narration says text-to-SQL over raw tables does, and that a semantic layer prevents it. Only the narration says so. The other three sublines are each a complete summary of their topic, which is how the figure reads once the narration has moved on.
- Why it matters: this is the first and most quoted of the four added topics, and the one on-screen line that carries its content does not say which approach fails.
- Cause: `video/src/videos/ae-interview/AiScene.tsx:90`.
- Fix: `sub: "Confident wrong answers from raw tables"`, still cued on "confident wrong answers". At 24 px it ends near x 640, which is 150 px clear of the bracket at 790. No re-voice is needed.

### 2. [P3] explanation: Part 9's column is titled "AI layer", a term the series never uses
- When: 114.9-166.3 s, beats `series` to `next` (element-121.jpeg, element-143.jpeg, element-152.jpeg).
- What: Under the baseline, Part 9 is "AI layer". The part is "AI and the semantic layer" (`series.ts`), and the narration names it, as its bar rises, "the assistants that read them". "AI layer" is the full title with its middle dropped. It reads as a layer of its own, which the AI scene a few seconds earlier did not draw: there, the assistant reads through the metric definitions.
- Why it matters: it is the one column title that is not a shortening a viewer could recognise elsewhere, and it is a term an interviewer would not recognise.
- Cause: `video/src/videos/ae-interview/data.ts:90` (`title: "AI layer"`).
- Fix: `title: "AI assistants"`. That is what the narration says the part covers, and it fits one line of the 168 px column at 22 px, like the other one-line titles.

### 3. [P3] house rule: the probes' topic lines start lowercase
- When: 25.5-54.4 s, beats `probe-model` to `probe-tradeoffs` (element-053.jpeg).
- What: Under each probe head is a line of topics: "facts and dimensions · star schemas · …", "models · refs · …", "version control · …", "view, table or incremental · …". All four start lowercase. Every other line in the video that stands on its own starts with a capital: the AI scene's sublines ("Grain, incremental logic, duplicate metrics"), the hook's "Clean, tested, documented", and the practice line "Dimensional modeling, advanced SQL, data warehousing".
- Why it matters: it breaks the README's rule that a line standing on its own starts with a capital (the owner, 2026-11-11, repeated in the newest preferences), and it makes the overview inconsistent with itself.
- Cause: `video/src/videos/ae-interview/HookScene.tsx:104`, `:115`, `:128`, `:139` (each probe's first topic).
- Fix: capitalise the first topic of each line: "Facts and dimensions", "Models", "Version control", "View, table or incremental". The rest of each line stays lowercase, as in the AI scene.

### 4. [P3] spacing: the arrow from the assistant floats 71 px below the speech bubble
- When: 71.5-114.6 s, beat `ai-why` onward (element-090.jpeg, element-113.jpeg).
- What: Measured down the arrow's column (x 1252) on element-090: the bubble's body ends at y 297, the arrow runs from y 368 to its tip at 426, and the "Metric definitions" box starts at 439. The arrow sits 71 px below the bubble and 13 px above the box, so it reads as belonging to the box rather than leaving the assistant. The cause is that it starts 40 px under the image's frame, and the drawn bubble ends 30 px above that frame's bottom.
- Why it matters: the arrow is the figure's whole claim, that the assistant reads through the metric definitions. The owner's newest preferences ask that arrows meet the edges they connect.
- Cause: `video/src/videos/ae-interview/AiScene.tsx:251`, `[cx, bubbleTop + BUBBLE_H + 40]`.
- Fix: start it at `bubbleTop + BUBBLE_H - 16`, about 15 px under the drawn bubble (the bubble bobs 3 px). The arrow then runs about 114 px into the box, with the same tip.
