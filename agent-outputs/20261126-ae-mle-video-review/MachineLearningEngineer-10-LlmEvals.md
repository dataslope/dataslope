# MachineLearningEngineer-10-LlmEvals (9:15)

## Verdict
- The six answers follow the page and every number on screen matches `results.json` (70/30 and 65/35, the 35% lower bound, recall@5 2/3 and MRR 0.44, 0.45 and 55%, 60/90/77%, 99.8/41/17%, 110). No wrong fact found.
- Three answers stop one step before the obvious follow-up: what else an online loss can mean (the guardrails the video has just named), what agreement makes a judge good enough, and how a tool is made idempotent.
- Two visible defects in otherwise clean figures: the dot riding the agent loop runs across the code in the call box and the result label, and question 2's fixes ink in on top of the fading bar chart.
- Two results leave about a second after they land ("A path you'd never allow", "A claim you can't check"); the rest of the pacing is fine (no beat gap under 0.5 s, nothing under 19px).
- Polish: an orphaned judge chip floats beside "Public benchmarks" for 30 s, the idempotency chips arrive out of order, the hook's "more bad ones" is drawn as fewer, and the numbered discs are green.

## Findings

### 1. [P2] Answer: "fix the eval set" is given as the only reading of an online loss
- When: 94.5-103.2 s, beat `q1-agree` (element-100.jpeg, element-110.jpeg)
- What: "When a change wins offline and loses online, fix the eval set: it's measuring something users don't care about." Ten seconds earlier the video named the guardrails (latency, cost, refusal rate). A change that wins on quality offline can lose online because it is slower or dearer, and then the eval set was right.
- Why it matters: the first thing an interviewer asks back is "or did it get slower?". This line is the video's own reasoning, not the page's (script.ts header, q1), and as worded it blames the eval set unconditionally.
- Cause: `video/src/videos/mle-llm-evals/script.ts:341` (the beat's second sentence); `LayersScene.tsx:280-288` draws only the two ends.
- Fix: split `q1-agree` after "The layers have to agree." and voice the second sentence with the condition: "When a change wins offline and loses online, and the guardrails held, fix the eval set: ...". On screen, a grey "Guardrails held" under the red "Wins offline, loses online", on its words.

### 2. [P2] Answer: calibrate the judge, but against what bar?
- When: 185.3-196.3 s, beat `q2-cal` (element-194.jpeg, element-202.jpeg)
- What: the answer to "When can you trust an LLM as a judge?" ends at "report the judge's agreement with them, corrected for chance with Cohen's kappa". It never says what agreement is enough, which is the question an interviewer asks next.
- Why it matters: the standard bar is the experts' agreement with each other, and it is the finding of the paper the scene cites (Zheng et al.: GPT-4's agreement with humans matched humans' agreement with each other). Without it "trust it after you've measured it" has no threshold.
- Cause: `script.ts:379-383`; `JudgeScene.tsx:271-283`.
- Fix: a new beat after `q2-cal`, "It's ready when it agrees with them about as well as they agree with each other.", and a line under the calibration note, "The bar: judge–expert agreement ≈ expert–expert agreement"; the judge box moves down a row to make room.

### 3. [P2] Answer: idempotent tools, without how
- When: 358.8-367.1 s, beat `q4-idem` (element-363.jpeg, element-366.jpeg)
- What: "Filing the same ticket twice should still leave one ticket" states the property, and the chips `file_ticket`, `file_ticket retry` → "One ticket" show it, but nothing says how the second call knows it is a repeat.
- Why it matters: "how?" is the follow-up, and the answer (a client-supplied idempotency key the tool deduplicates on) is one clause.
- Cause: `script.ts:449`; `AgentScene.tsx:332-348`.
- Fix: split `q4-idem` at its sentence break and voice the second sentence as "Give each call an idempotency key, so filing the same ticket twice still leaves one ticket."; both chips carry `key="7f3"`, inked on "idempotency key".

### 4. [P2] Visual: the dot riding the loop crosses the code and the labels
- When: 330.5-333.8 s, beat `q4-loop` (element-333.jpeg)
- What: the dot rides a ring through the box centres, so three times it passes over `file_ticket({"priority": "high"})` (its paper ring blanks "pr"), across "Ticket 4127 filed", and over "Model" and "Application".
- Why it matters: a moving blot over the one line of code in the scene, while the narration is on the loop.
- Cause: `video/src/videos/mle-llm-evals/AgentScene.tsx:207-214` (`ring` runs through the boxes) and `:287` (drawn wherever it is).
- Fix: hide the dot while it is inside a box, so it enters each box and leaves from the other side, riding only the arrows.

### 5. [P2] Visual: question 2's fixes ink in over the fading chart
- When: 170.4-171.5 s, beat `q2-fix` (element-171.jpeg)
- What: "Score both orders; count a win only when they agree" inks in green on top of "A shown first" and the A 70% bar while they are still fading out.
- Why it matters: two figures superimposed for half a second, in green over blue, right as the fix is said.
- Cause: `JudgeScene.tsx:223` clears at `fixes[0].at - 6`, and `:266` inks the fix at `fixes[0].at`; the clear takes 14 frames.
- Fix: start the clear in the pause after `q2-read` so it is finished before "score" is said, and lengthen that pause (0.8 → 1.3 s) so the finished case still holds as long as it did.

### 6. [P2] Pacing: "A path you'd never allow" holds for about a second and a half
- When: 442.0-443.8 s, beat `q5-traj` (element-443.jpeg)
- What: the red step, its cross and the label land on "never allow" at 442.0 s; the whole column clears at 443.8 s for `q5-repeat`.
- Why it matters: it is the point of the trajectory check (an outcome check alone passes it), and it goes before it can be read.
- Cause: `script.ts:484` (`pauseAfter: 0.7`); `AgentEvalScene.tsx:91` clears 6 frames before `q5-repeat`.
- Fix: `pauseAfter` 0.7 → 1.6.

### 7. [P3] Pacing: "A claim you can't check" leaves after 1.7 s
- When: 271.3-273.1 s, beat `q3-faith` (element-272.jpeg)
- What: the faithfulness example's conclusion inks in at 271.3 s and the column clears for the follow-up at 273.1 s.
- Cause: `script.ts:416` (`pauseAfter: 0.7`).
- Fix: `pauseAfter` 0.7 → 1.3.

### 8. [P3] Visual: an orphaned judge chip floats beside "Public benchmarks"
- When: 79-111 s, beats `q1-ci` to `q1-bench` (element-095.jpeg, element-110.jpeg)
- What: after `q1-human`, "Rubric LLM judge" stays alone at the far right of rung 2's row, 900 px from its rung, with nothing pointing at it; in the finished ladder it sits under "Public benchmarks" and reads as part of that note.
- Cause: `LayersScene.tsx:206-219` (no `out`; it returns to plain and stays).
- Fix: let it go with rung 3's notes, and pop it back, lit, on "lean on an LLM judge" in `q2-in`, which is what it stays for.

### 9. [P3] Layout: the idempotency chips arrive out of order and jump
- When: 362.2-363.4 s, beat `q4-idem` (element-363.jpeg)
- What: the "retry" chip inks in first, in the first slot, then the first call's chip appears and pushes it right.
- Cause: `AgentScene.tsx:335-340`: the retry chip is cued on "run twice", the first chip on "Filing the same ticket", which comes later, and a chip that has not started takes no space.
- Fix: cue the first call on "a retried step" and the retry on "run twice", in reading order (done with finding 3).

### 10. [P3] Visual: "and more bad ones" is drawn as fewer
- When: 13.1-25.1 s, beat `hook-hard` (element-022.jpeg)
- What: the narration says the assistant has many good answers "and more bad ones"; the panel shows two good answers and one bad one.
- Cause: `HookScene.tsx:163-174`.
- Fix: three wrong answers under the two good ones, the extra two inked after "more bad ones", with the rows below moved down to make room.

### 11. [P3] Color: the numbered discs are green
- When: 23-111 s, beats `hook-hard` ("Six questions") and `q1` to `q2-in` (the ladder) (element-025.jpeg, element-095.jpeg)
- What: the six question discs and the five rung numbers are green tints; green means the right answer in this series, and a counter is not one.
- Cause: `HookScene.tsx:185`, `LayersScene.tsx:168` (`tone="green"`).
- Fix: the Disc's own grey tint, with rung discs still lit yellow when said.
