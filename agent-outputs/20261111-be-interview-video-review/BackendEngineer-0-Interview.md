# BackendEngineer-0-Interview (170.4 s, 2:50)

## Verdict
- A clean, well-paced overview. Every number checks out against the pages and `results.json`: the bar total of 125 (5+12+16+16+16+15+3+35+7), Karat's 400 leaders, 71% and 62%, the bank of 110, and challenges on 3 pages. No overlaps or clipping, and no text under 20px. The scenes never clear to an empty page while the narrator talks.
- The one real defect is in the AI scene. The two AI-allowed formats are shown twice and given different parts. At 47-56 s, "Read, debug and speed up unfamiliar code" sits above "Part 9: the AI-allowed round". At 90 s+, the same round comes back as a "live round" labelled Part 7. A viewer will not know which video answers the code comprehension round.
- As an answer to "How have coding interviews changed since AI assistants became standard?" it holds up: two kinds of round, why take-homes lost their signal, a caveated survey, where the time went, and "ask the recruiter". It stops one step short on preparation: it says "prepare for both" and then gives only the AI-off half.
- Pacing is comfortable (mostly 1.9 to 2.9 words/s, with gaps of 0.55 s or more). The only dense beat is `ai-allowed` at 3.73 words/s, which carries the scene's key idea.
- The rest is polish: a take-home placed under the "AI allowed" head, a highlight on Part 5 left lit through the practice beat, a survey label with no subject, a garbled "three add challenges", and a headline fragment ("The ground,") held for 8 s.

## Findings

### 1. [P2] confusion: the code comprehension round is labelled Part 9 and then Part 7, and both AI-allowed formats are shown twice
- When: 44-56 s, beats `ai-allowed-who`/`ai-banned` (element-054.jpeg); then 88-115 s, beat `ai-moved` onward (element-113.jpeg).
- What: Under "AI allowed", two rows are drawn: "Extend a multi-file project, assistant built in" and "Read, debug and speed up unfamiliar code". Under both sits one blue line, "Part 9: the AI-allowed round". At 56 s both rows are cleared. Thirty seconds later the same two formats ink in again as "live rounds where the interviewer watches you reason": "Extend a multi-file project" labelled Part 9, and "Read and debug unfamiliar code" labelled **Part 7**. The page puts "What happens in a code comprehension or debugging round?" in Part 7 (plan, part 7), so the first label is the wrong one. The repeat itself also blurs the argument: formats first presented as AI-allowed come back as the consequence of take-homes losing signal, with no hint that they are the same rounds.
- Why it matters: the viewer is sent to the wrong video for one of the two formats, and cannot tell whether the "live rounds" are AI-allowed or not.
- Cause: `video/src/videos/be-interview/AiScene.tsx:333-346` (one "Part 9" line under both allowed rows), against `AiScene.tsx:431` (the same round as "Part 7").
- Fix: Replace the single line at 333-346 with a part label per row. "Part 9" goes on the multi-file row and "Part 7" on the read/debug row, in the same `label(22, BLUE_INK)` style the `Moved` blocks use (`AiScene.tsx:128`). Then link the repeat in the narration: start `ai-moved` with "So the time has moved to live rounds, including those two, where the interviewer watches you reason: …".

### 2. [P3] answer: "Prepare for both" gives only the AI-off half
- When: 105.6-114.2 s, beat `ai-ask` (element-113.jpeg).
- What: The narration is "Ask the recruiter… and prepare for both. Algorithm practice still matters where it isn't." The page's answer has two halves and a second place where practice matters: "algorithm practice still matters for AI-off rounds **and phone screens**, and **the habits on this page matter for AI-on ones**." The screen gives the AI-off half ("algorithm practice still matters: Part 8") and nothing under "AI allowed". Separately, `ai-why` names only take-homes, where the page says "take-home projects **and automated code tests**", which is the online assessment most backend candidates meet first.
- Why it matters: "so how do you prepare for the AI-allowed round?" is the obvious follow-up, and the video sets it up and then leaves it unanswered.
- Cause: `video/src/videos/be-interview/script.ts`, beats `ai-ask` and `ai-why`. The `AiScene.tsx:301-313` caption under "AI allowed" never gains a Part 9 pointer for preparation.
- Fix: Change `ai-ask` to "…and prepare for both. Algorithm practice still matters where it isn't, and in phone screens; where it is, practise driving the assistant: Part 9." Change `ai-why` to "…an assistant can finish a take-home or an automated test, and nobody sees how." On screen, extend the take-home line to "An assistant can finish a take-home or an online test," (`AiScene.tsx:366`; at 26px there is room before the hairline at x≈960).

### 3. [P3] confusion: the take-home sits under the "AI allowed" head
- When: 56-82 s, beats `ai-why` to `ai-survey-data` (element-080.jpeg).
- What: The fork and its two heads stay up while the panel replaces the rows. The envelope and "An assistant can finish a take-home" therefore sit squarely under "AI allowed", and the survey under "AI banned". That reads as if take-homes were an AI-allowed format.
- Why it matters: it gives a structural meaning to placement that the narration does not intend.
- Cause: `video/src/videos/be-interview/AiScene.tsx:269-300` (heads at full opacity throughout) with the panel at `AiScene.tsx:351-409`.
- Fix: Multiply each head's and caption's opacity by `1 - 0.6 * panel` (the `panel` value from line 206), so the fork recedes while the "why" panel is up and returns at `ai-moved`.

### 4. [P3] confusion: Part 5's highlight stays lit through the practice beat
- When: 150.6-161 s, beat `practice` (element-160.jpeg).
- What: "Part 5 Concurrency" keeps its yellow highlight (yellow means what the narration points at) for the whole practice line about concept checks and the bank. Nothing in that line concerns Part 5.
- Why it matters: it is a pointer at the wrong element for 10 s.
- Cause: `video/src/videos/be-interview/SeriesScene.tsx:96`, `during(frame, concurrencyAt - 2, designAt, 10)`, which holds it until "was design" in the `next` beat.
- Fix: End it at `n.beat("practice").from - 4` in place of `designAt`.

### 5. [P3] pacing: the scene's key idea is spoken at 3.73 words/s
- When: 33.2-37.0 s, beat `ai-allowed` (gap 0.55 s into `ai-allowed-who`).
- What: "Some rounds hand you an assistant and grade how you drive and check it." This is 14 words in 3.8 s, and it is the definition the whole AI-allowed column rests on. It runs straight into another 28-word beat.
- Why it matters: "drive and check it" is the grading criterion Part 9 builds on, and it goes by fastest.
- Cause: `video/src/videos/be-interview/script.ts`, beat `ai-allowed` has no `pauseAfter`.
- Fix: Add `pauseAfter: 0.8` and re-voice that beat. If it still lands above 3 words/s, trim it to "Some rounds hand you an assistant, and grade how you drive it."

### 6. [P3] explanation: the first survey label has no subject, and the two bars have different bases
- When: 72-82 s, beat `ai-survey-data` (element-080.jpeg).
- What: The labels read "say AI makes technical skills harder to assess" and "of organizations still banned AI in technical interviews", each followed by a bar and then its percentage. The first is a fragment until it is joined to "71%", which sits at the far end of the bar. It also never says the 71% is of *leaders* while the 62% is of *organizations*.
- Why it matters: it is a small stumble on the one sourced statistic in the series.
- Cause: `video/src/videos/be-interview/AiScene.tsx:404`.
- Fix: Change the label to "of leaders say AI makes technical skills harder to assess". At 24px this fits within the 1703px right edge the second label already reaches.

### 7. [P3] other: "three add challenges" is hard to parse by ear
- When: 150.6-160.3 s, beat `practice` (2.89 words/s).
- What: "Every topic page has concept checks, three add challenges that run in the browser, and a bank…" Heard aloud, "three add challenges" sounds like a slip. The beat also carries three facts at close to 3 words/s.
- Why it matters: it is the one garbled sentence in the narration.
- Cause: `video/src/videos/be-interview/script.ts`, beat `practice`. The cue in `SeriesScene.tsx:84` keys on "three add challenges".
- Fix: Change the line to "Every topic page has concept checks, three of them add challenges that run in the browser, and…". Move the cue to "three of them add challenges".

### 8. [P3] other: "The ground," stands alone as the headline for 8 s
- When: 12-20 s, beat `probe` (tiles 12-19 s on sheet-00/01).
- What: The headline inks "The ground," and holds it, comma included, until "Backend roles add" at about 20 s. On its own it is a cryptic fragment over the first four rows.
- Why it matters: the headline is the first thing a viewer reads, and for 8 s it does not say what the list is.
- Cause: `video/src/videos/be-interview/HookScene.tsx:163` (`lead="The ground,"`, `turnAt={addAt}`).
- Fix: Use `lead="What every round tests,"` (the turn "and what backend adds." still follows), or keep the words and set `turnAt` to `liveAt` so the fragment lasts about 3 s instead of 8.
