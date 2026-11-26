# MachineLearningEngineer-0-Interview (186.0 s, 3:06)

## Verdict
- No wrong claim and no wrong number. The pages' `###` counts (34, 15, 18, 19, 19, 31, 20, 11) sum to the 167 said and shown. The bars (13, 19, 15, 17, 18, 23, 20, 31, 4, 6) sum to 166, plus the 1 answered here. Concept checks are on all 8 topic pages, 5 challenges on 3, and the bank holds 110, all matching `results.json`. The three rounds and four probes follow the index, and the four additions follow the LLM page nearly word for word.
- As an answer to "How has the ML Engineer interview changed with LLMs?", two of the four additions stop one step before the obvious follow-up. "When not to use an LLM" is the only item with no line under it, and it drops the page's own reason ("the question that separates candidates who have shipped from those who have only prototyped"). It also gives no case, so "so when wouldn't you?" goes unanswered. "Inference economics" says "which lever buys what" and names no lever. The index names them (batching, quantization, speculative decoding) and says where the memory goes (the KV cache).
- Layout is clean: nothing under 20 px, no overlap or clipping, and every scene is held at least 1.3 s finished before its cut. The rest is polish. The LLM scene sits on a headline and one line for 2.7 s while "four things" is said. The MLOps row points only at Part 8, though its latency-and-cost topic is Part 7's. Each probe row's topics sit 15 px above the next rule but 34 px under their own. And the hook has a double-width gap before "Fix it."
- Pacing is comfortable: 1.7 to 3.0 words/s, every gap between beats 0.55 s or more, and the list text inks word by word as it is said.

## Findings

### 1. [P2] answer: "When not to use an LLM" carries no case and drops the page's reason
- When: 112.7-124.6 s, beats `llm-not` and `llm-ask` (element-115.jpeg, element-122.jpeg).
- What: Item 4 inks as "When not to use an LLM" with "Part 10" and nothing under it. The other three items each have a line of topics. The narration says only "And judgment about when not to use an LLM at all." The page's answer continues "which is the question that separates candidates who have shipped from those who have only prototyped". The track's own answer to the follow-up (llm-systems-and-evals.mdx, "When should you not use an LLM?") gives the cases: tabular prediction, strict latency or cost budgets, a task a regular expression solves. Neither part reaches the video.
- Why it matters: a viewer who repeats "and when not to use an LLM" is asked "when wouldn't you?" next, and the video leaves them with nothing to say. It also drops the clause that says why interviewers ask it.
- Cause: `video/src/videos/mle-interview/script.ts:191` (the beat stops at the item's name), and `LlmScene.tsx:136` (item 4's topics are `[]`).
- Fix: keep `llm-not` as voiced. After it, add one new beat, `llm-not-when`: "It's the question that separates candidates who've shipped from those who've only prototyped. Often a smaller model or a rule does better: tabular prediction, a strict latency or cost budget, a task a regular expression solves." Give item 4 a topics line, inked phrase by phrase on that beat: "tabular prediction, a strict latency or cost budget, a task a regular expression solves". About 230 characters voiced.

### 2. [P2] answer: "Inference economics" names no lever and not where the memory goes
- When: 94.7-124.6 s, beat `llm-econ` onward (element-099.jpeg, element-122.jpeg).
- What: Item 2's line reads "why generation is slow, where the GPU memory goes, which lever buys what", and the narration says the same. The index's version of this item names both answers: "where GPU memory goes (the KV cache), and what batching, quantization, and speculative decoding buy".
- Why it matters: "which lever?" is the follow-up, and the screen holds the phrase for 25 s without the three words that answer it.
- Cause: `video/src/videos/mle-interview/LlmScene.tsx:126-130`.
- Fix: screen only, in the index's words. Change the topics to "why generation is slow", "where GPU memory goes (the KV cache)" and "what batching, quantization and speculative decoding buy". Cue them to the same spoken phrases as now. At 24 px the line ends near x 1610, clear of the right edge, and the part tag is on the line above. No re-voice: the narration's "which lever buys what" is the LLM page's own wording, and the screen names the levers as it is said.

### 3. [P3] confusion: the LLM scene sits on a headline and one line while "four things" is said
- When: 82.3-85.0 s, end of beat `llm` (element-083.jpeg, element-084.jpeg).
- What: The four "still asked" rows condense into the line under the headline at "What LLMs added" (82.0 s). Item 1 does not arrive until "Application design" (85.1 s). For 2.7 s, the frame below y 270 is blank while the narration announces four things. The rows have to clear at that word: left up under "LLMs added four things.", the four rows would read as the four additions.
- Why it matters: this is a scene clearing to a near-empty page, while the narration names exactly what could be shown.
- Cause: `video/src/videos/mle-interview/LlmScene.tsx:65` (each item, numeral and name included, settles only on its own beat).
- Fix: ink the four numbered names into their slots on "four things" (`n.word("llm", "four things")`, 4 frames apart), after the rows have gone. Each name keeps its highlight, its part tag and its topics on its own beat, so every beat still lands something new.

### 4. [P3] accuracy: the MLOps row points only at Part 8, but its latency and cost are Part 7's
- When: 57.3-73.0 s, beat `rounds-ops` onward (element-071.jpeg).
- What: The row "MLOps: reproducibility, versioning data and models, CI/CD, latency and cost" carries "Part 8". Latency and cost trade-offs are Part 7's material: serving latency, throughput against latency, GPU against CPU, request batching and autoscaling (the plan's Part 7 list). Part 7 also answers 3 of the MLOps page's 20 questions (batch against online inference, the feature store, training-serving skew).
- Why it matters: the tags are the map of the series. A viewer who goes to Part 8 for latency and cost will not find them there.
- Cause: `video/src/videos/mle-interview/data.ts:139`, `parts: [8]`.
- Fix: `parts: [7, 8]`, so the tag reads "Parts 7 and 8". `check.mjs` already checks that every part a row points at exists.

### 5. [P3] spacing: each probe row's topics sit 15 px above the next rule, 34 px under their own
- When: 35.4-73.0 s, beats `rounds-probe` to `rounds-more` (element-071.jpeg).
- What: Measured on element-071, the rules are at y 322, 447, 571 and 696. Each name starts 34 to 35 px under its rule ("ML fundamentals" at 357). Each topics line ends 15 to 17 px above the next rule (430 against 447, 555 against 571). Each row's text therefore sits closer to the rule of the row below than to its own.
- Why it matters: the rows read top-light, and each topics line looks attached to the next rule.
- Cause: `video/src/videos/mle-interview/RoundsScene.tsx:33-34`, `NAME_DY = 28`, `TOPICS_DY = 78`.
- Fix: `NAME_DY = 22`, `TOPICS_DY = 72`. That gives 29 px under each rule (the house minimum is 28) and 23 px above the next. The 27 px between a name and its topics is unchanged.

### 6. [P3] spacing: "and too expensive." and "Fix it." are 35 px apart, about two word spaces
- When: 15.2-26.0 s, beats `hook-now` and `hook-both` (element-020.jpeg).
- What: The second line of the third prompt reads "and too expensive.   Fix it." Measured, the gap is 35 px. A word space in the 56 px serif is about 14 px, and the line above it sets its words at that space.
- Why it matters: it reads as a typo, or a pause that the other prompts do not have.
- Cause: `video/src/videos/mle-interview/HookScene.tsx:98`. The flex row's `gap: "0.26em"` adds to the two highlighters' own margins (0.14 em each), which already give one space.
- Fix: `gap: 0`. The two `Mark` margins then leave 0.28 em (about 16 px), one space.
