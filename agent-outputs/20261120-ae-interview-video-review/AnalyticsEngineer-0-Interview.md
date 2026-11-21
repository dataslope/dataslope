# AnalyticsEngineer-0-Interview (166.3 s, 2:46)

## Verdict
- A sound, well-paced overview with no wrong claim. Every number checks out against the pages and `results.json`: the bars (22, 9, 21, 11, 19, 14, 26, 19, 6) sum to 147, plus the 1 answered here for 148, which matches the pages' `###` headings page by page (32, 32, 20, 19, 19, 19, 7). Concept checks are on all 7 topic pages, challenges on 3 (dimensional modeling, advanced SQL, data warehousing) and the bank holds 110. The four probes follow the index's four bullets in order, and the parts each probe points at are right for the plan's question map.
- As an answer to "How has the Analytics Engineer interview changed with AI?" it holds up and matches the page: the core is unchanged, there are four added topics, the reason they matter (an assistant is only as reliable as the metric definitions under it), the advice to ask the recruiter about AI-allowed rounds, and Part 9 for depth.
- The one P2 is in the hook. The role's one-line definition, "between data engineering and analytics", is drawn as two captions that clear 1 to 2 s after they ink. Also missing: the page's bold term for what the role owns, "transformation layer", is never said or shown.
- The rest is layout polish. Three stretches show a heading over an empty page: the AI scene's first 1.5 s, "Added on top" over an empty column for 20 s, and the series headline alone for 9.5 s. There is also a highlight left on after the narration moves on, an AI-ready subline with no subject, and probe heads set 24 to 25 px under their rules, where the house minimum is 28.
- Pacing is comfortable: 1.6 to 3.0 words/s, every gap 0.55 s or more, and every scene held at least 1.3 s finished before its cut. No text is under 20 px, and nothing overlaps or clips.

## Findings

### 1. [P2] pacing: the role's definition, "Data engineering" and "Analytics", clears 1 to 2 s after it inks
- When: 18.5-21.0 s, beat `hook-more` (element-020.jpeg, then element-021.jpeg).
- What: On "The role sits between data engineering and analytics", the captions "Data engineering" (under Raw tables, at 18.5 s) and "Analytics" (under Dashboard, at 19.6 s) ink in. At 20.7 s both fade with the hook's other words, before the row slides up. "Analytics" is readable for about 1.1 s and "Data engineering" for about 2.2 s. By the time the probes begin there is nothing on screen that says which end is which.
- Why it matters: this is the page's first sentence and the answer to "what is an analytics engineer?", and it is shown for about a second.
- Cause: `video/src/videos/ae-interview/HookScene.tsx:294`, `* (1 - ease(frame, wordsOut, 10))` on the two captions (`wordsOut` = `probeFrom - 14`, line 147).
- Fix: drop the `wordsOut` factor from the two captions, so they ride up with the row and stay through the probes. After the slide they sit at about y 313-343, 90 px clear of the first probe head (y ≈ 436) and nowhere near the stack or the platypus.

### 2. [P3] explanation: the layer the role owns is never named, and the page's term "transformation layer" never appears
- When: 6.6-21 s, beats `hook` and `hook-more` (element-007.jpeg, element-020.jpeg).
- What: The middle of the row is three boxes, "Staging", "Intermediate" and "Marts", from 6.6 s. The narration says "a layer of models, and an analytics engineer owns it", and the platypus appears under the stack. Nothing names the stack as the layer, and "transformation layer", the term the page sets in bold ("you own the **transformation layer**"), is in neither the narration nor the frame. The layer names themselves are not said until 42 s.
- Why it matters: "I own the transformation layer" is how a candidate answers "what does an analytics engineer do?", and the video draws the idea without giving its name.
- Cause: `video/src/videos/ae-interview/HookScene.tsx:208-222` (the stack has no label).
- Fix: Add a label, "The transformation layer", centred over the stack, 20 px above its top. Use `label(24, INK_SOFT)`, ink it on "a layer of models", and fade it with the other hook words at `wordsOut`. After the slide it would sit level with the kicker, so it should not stay. No re-voice is needed.

### 3. [P3] confusion: the AI scene opens on an empty page while "AI has added to that core" points back at what just cleared
- When: 54.4-55.9 s, beat `ai` (element-055.jpeg).
- What: The cut leaves only the kicker "How AI has changed the interview" for 1.5 s. Meanwhile the narration refers to "that core", meaning the four probes that have just gone. "Still the core" and the stack wait for "that core" (55.96 s).
- Why it matters: it is a scene clearing to an empty page, which recurred in earlier series, and it happens at the moment the narration refers back to what was cleared.
- Cause: `video/src/videos/ae-interview/AiScene.tsx:145` ("Still the core" at `coreAt - 2`) and `:235` (the stack at `coreAt + i * 4`).
- Fix: Ink "Still the core" and the three model boxes on the scene's first word, `n.word("ai", "AI has added")` (54.67 s), and keep the tap sounds with them. The serif line "Modeling, dbt, SQL" still builds word by word on "Modeling", "dbt" and "SQL".

### 4. [P3] spacing: "Added on top" heads an empty column for 20 s
- When: 57.0-77.6 s, beats `ai` to `ai-four` (element-074.jpeg).
- What: "Added on top" inks under the hairline on "not replaced it" (57 s). The first topic does not arrive until `ai-sql` (77.6 s). Through the whole of `ai-why`, the left two thirds of the frame below the hairline are blank under a heading that announces a list.
- Why it matters: a heading over nothing for 20 s reads as if something failed to load, and the label's own highlight only comes on "four more topics" (75.9 s).
- Cause: `video/src/videos/ae-interview/AiScene.tsx:170`, `opacity: ease(frame, replacedAt + 4, 12)`.
- Fix: ink "Added on top" at `fourAt - 8` (the start of "So expect four more topics") and move its `Mark` to `fourAt + 6`. The hairline stays on "not replaced it" and closes the core block on its own.

### 5. [P3] spacing: the series scene holds a headline over an empty three quarters of the page for 9.5 s
- When: 114.6-124.0 s, beats `series` and the start of `series-parts` (element-122.jpeg).
- What: "Decisions, and how they fail." and "Code only as evidence" sit in the top quarter, with nothing below them until "nine videos" (124.0 s), when the baseline and the part names ink in.
- Why it matters: most of the frame is empty for 9.5 s while the narration describes the series, and the series is exactly what the chart below shows.
- Cause: `video/src/videos/ae-interview/SeriesScene.tsx:103` (`nameAt = nineAt + 2 + i * 3`) and `:138` (the baseline at `nineAt`).
- Fix: ink the baseline and the nine part names on `n.word("series", "This series")` (114.87 s), keeping the 3-frame stagger. The bars still rise one by one on `series-list` and the total still lands on "hundred and forty-seven".

### 6. [P3] confusion: "Ask the recruiter, round by round." stays highlighted after the narration moves on to Part 9
- When: 110.7-114.6 s, beat `ai-more` (element-113.jpeg).
- What: The yellow highlight on "Ask the recruiter, round by round." stays on through "Part nine covers all four in depth" and the bracket that draws as it is said. Yellow means what the narration points at.
- Why it matters: for the last 4 s of the scene the pointer is on the wrong element, competing with the bracket and "Part 9".
- Cause: `video/src/videos/ae-interview/AiScene.tsx:228`, `<Mark at={askAt + 2}>` has no `out`.
- Fix: `out={moreAt - 4}`.

### 7. [P3] explanation: the AI-ready subline has no subject
- When: 89.4-114.6 s, beat `ai-ready` onward (element-113.jpeg).
- What: Item 2 reads "AI-ready modeling" over "Written for a reader that is a language model". The narration says what is written ("documentation, tests and access rules"), but the screen keeps only the participle, so the line does not say what is written for the model. The other three sublines are complete noun phrases.
- Why it matters: those three things are the content of the topic, and they are the part a viewer would repeat.
- Cause: `video/src/videos/ae-interview/AiScene.tsx:95`.
- Fix: Use `sub: "Docs, tests and access rules, for a language model"` and cue it on "documentation" (`n.word("ai-ready", "documentation")`). At 24 px it ends near x ≈ 760, inside the bracket at 790. If it does not fit, use "Docs, tests, access rules for a language model".

### 8. [P3] spacing: each probe head sits 24 to 25 px under its hairline
- When: 30.8-54.4 s, beats `probe-dbt` to `probe-tradeoffs` (element-053.jpeg).
- What: Measured on element-053, the rules are at y 548, 686 and 825. The heads under them start at 574, 712 and 850, a gap of 24 to 25 px. The README asks for at least 28 px between a horizontal rule and the text under it. The topics line above each rule clears it by 35 px, so each head sits closer to the rule than the text it follows does.
- Why it matters: it breaks a stated house rule, and the rows look slightly top-heavy.
- Cause: `video/src/videos/ae-interview/HookScene.tsx:327`, `top: top + 18`, against the rule at `top + step` (line 356).
- Fix: change it to `top + 22`. That gives 29 px under each rule and 31 px over the next one. The platypus and the last rule are unaffected.
