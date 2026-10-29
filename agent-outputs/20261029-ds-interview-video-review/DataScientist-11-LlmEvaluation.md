# DataScientist-11-LlmEvaluation (7:17, 436.8 s)

## Verdict
- Clean, legible and numerically sound. Every number on screen matches the page and `results.json`: 72% to 88%, p 0.23 unpaired against 0.017 McNemar, 0.82 chance agreement and kappa 0.44, the always-pass judge at kappa 0, 17.6% (176,471 complaints, 41,176 false alarms), the 64% chance from 20 tests and the 110-question bank. The full frames show no real overlaps. The worst layout problems are a few near-touches and odd hyphens.
- The biggest weakness is that three worked answers show their key step on screen without saying it, which is the step an interviewer asks you to walk through. Q4 shows 0.9 x 0.9 + 0.1 x 0.1 = 0.82 but the narration never says it. Q6 never names sensitivity or specificity and never explains the terms of the Rogan-Gladen formula. Q3 never gives the interval formula. Q6 also shows the 823,529 non-complaints before the correction that produces that number.
- Two lines tell the viewer something untrue about the video itself. "Seven get worked through with real arithmetic" is wrong (Q1, Q2 and Q5 have none). "The rest of the page is about the first of those" is also wrong, because Q5 and Q7 answer the second and third layers, which the highlight dims.
- Pacing is comfortable. The deep dives run at 2.4 to 3.0 words/s, and every gap is 0.55 s or more. Only the bridges are rushed: `measure-in` runs at 4.80 words/s and `close` at 3.32.
- As a series ending, the close works ("how sure are you, and how would you know?", then the practice and the bank). Its kicker still reads "Questions 8 and 9", though. Red is also used in several places for items that are not traps.

## Findings

### 1. [P2] explanation: Q6's correction is asserted, not derived, and the standard terms are never named
- When: 299-330 s, beats `prev` and `prev-fix` (frames element-305.jpeg, element-329.jpeg)
- What: The sample result is phrased as "catches 90% of real complaints" and "wrongly flags 5% of everything else". The words sensitivity and specificity never appear. The formula then appears as (0.20 + 0.95 - 1) / (0.90 + 0.95 - 1), but nothing says that 0.95 is 1 - 0.05 or what each term is. The narration says only "Correct for both errors". The labeled bar draws the false alarms (red) but leaves the blue "caught" segment (158,824) unlabeled, and it never draws the 17,647 missed complaints. So "both errors" is only half shown, and the forward equation (20% = 0.90 x 17.6% + 0.05 x 82.4%) that makes the inversion obvious is missing.
- Why it matters: An interviewer will ask where 17.6% comes from and will use the words sensitivity and specificity. The page names both and gives p_obs = sens·π + (1 - spec)(1 - π).
- Cause: `video/src/videos/ds-llm-evaluation/script.ts:164,169` (no terms, no derivation); `PrevScene.tsx:80-88` (the sample line), `:124` (unlabeled caught segment), `:146-156` (formula with no term labels).
- Fix: In `prev`, say "it catches ninety percent of real complaints, its sensitivity, and leaves ninety-five percent of the rest alone, its specificity". In `prev-fix`, add "Twenty percent is ninety percent of the true share plus five percent of everything else. Solve that for the true share." Label the blue segment "caught: 90% of 176,471 = 158,824". Set small labels under the formula's numbers: "observed", "specificity", "sensitivity".

### 2. [P2] confusion: 823,529 is shown before the correction that produces it
- When: about 311-316 s, beat `prev-fix` (frames element-313.jpeg, element-329.jpeg)
- What: At "five percent of the large majority that aren't complaints", the screen prints "5% of the 823,529 that aren't complaints". That count is 1,000,000 minus the corrected 176,471, and it only appears about 4 s later, at "Correct for both errors". The corrected bar then lands *above* the labeled bar, so the figure reads bottom-up against the order of the argument.
- Why it matters: A viewer cannot know 823,529 at that moment, so the figure looks circular. It assumes the answer in order to explain the bias.
- Cause: `PrevScene.tsx:139-144` prints `num(PREV.notComplaints)` at `majorityAt`, while the truth bar waits for `correctAt` (`:51`, `:91-116`). `ROW_TRUTH = 470` sits above `ROW_LABEL = 650` (`:14-15`).
- Fix: At `majorityAt`, show "5% of every ticket that isn't a complaint". Append "(823,529) = 41,176 false alarms" at `correctAt + 10`, once the truth bar is in. Swap `ROW_TRUTH`/`ROW_LABEL` (truth at 650, labels at 470) so the correction lands below the observed count.

### 3. [P2] explanation: Q4's chance agreement (0.82) is on screen only, never said or derived
- When: 193-213 s, beat `judge-kappa` (frames element-195.jpeg, element-210.jpeg)
- What: The screen shows "agreement by chance alone: 0.9 x 0.9 + 0.1 x 0.1 = 0.82". The narration says only "two raters who mostly say pass agree often by chance", then jumps to "point oh eight above chance, out of a possible point one eight". The viewer hears 0.08 and 0.18 but never hears the 0.82 they are measured from, or why it is 0.9² + 0.1².
- Why it matters: p_e is the whole trick of kappa, and the step an interviewer checks. The page spells it out.
- Cause: `script.ts:136`; `JudgeScene.tsx:168-172` (unspoken line).
- Fix: Replace the first sentence of `judge-kappa` with: "That sounds strong, but two raters who each say pass ninety percent of the time would agree eighty-two percent of the time by chance alone: point nine times point nine, plus point one times point one." Keep the rest of the beat, with `pauseAfter` 0.6 after this sentence.

### 4. [P2] answer: Q3 never gives the interval formula, so "how large" has no method
- When: 120.7-138.4 s, beat `size` (frames element-128.jpeg, element-172.jpeg)
- What: The chart shows intervals shrinking from n = 50 to 2,000, and the narration says only "large enough that the difference you care about beats the sampling error". The page's half-width, ±1.96√(p(1 - p)/n), never appears, and neither does the square-root rule a viewer could use to size their own set.
- Why it matters: The question is "how large". Without the formula, the viewer cannot answer the follow-up, "so how many items would you need for 3 points?"
- Cause: `script.ts:113`; `SizeScene.tsx:152-154` (only the axis caption).
- Fix: Add a Note under the caption at `rangeAt`: "half-width ≈ 1.96 √(p(1 − p) / n)". Add a sentence after "seventy-two to eighty-eight": "The half-width shrinks with the square root of n: four times the items only halves it."

### 5. [P2] accuracy: the plan says seven questions get "real arithmetic", but three have none
- When: 30-36 s, beat `plan` (frames element-031.jpeg, element-035.jpeg)
- What: Narrated and on screen: "9 questions: 7 worked through with real arithmetic, 2 in a sentence". Q1 (how interviews changed), Q2 (measuring quality) and Q5 (A/B testing) contain no arithmetic. Only Q3, Q4, Q6 and, lightly, Q7 do.
- Why it matters: The viewer is promised something the video does not do, in the first 30 seconds.
- Cause: `script.ts:77`; `HookScene.tsx:151-158`.
- Fix: Narration: "Seven get a full answer, four of them with real arithmetic, and two take a sentence each." Screen: "9 questions: 7 worked through, 2 in a sentence", with "4 with real arithmetic" as the marked span.

### 6. [P2] accuracy: "The rest of the page is about the first of those" is wrong, and it is rushed
- When: 71.5-75.4 s, beat `measure-in`, 4.80 words/s (frames element-073.jpeg, element-074.jpeg)
- What: The bridge lights "evaluating LLM features" and dims the other three layers. Q5 answers "experiments where the treatment is itself random", Q7 answers "checking code and analysis an assistant wrote", and the narration itself later says "the assistant's own work". The beat is also the fastest in the video (11 words in 2.3 s).
- Why it matters: It tells the viewer to expect only eval-set material, then dims the two layers that the video goes on to answer.
- Cause: `script.ts:93`; `ChangedScene.tsx:149` (`lit` on layer 0, `dim` on layers 1-3).
- Fix: "Most of what follows is about the first of those. Questions five and seven take the next two." Light layers 0-2 and dim only layer 3 ("rounds with AI allowed, or banned"). The longer line also brings the rate under 3 words/s.

### 7. [P2] confusion: in Q1, "ask the recruiter, round by round" sits beside the wrong layer
- When: 69-75 s, beats `changed-layer` and `measure-in` (frames element-069.jpeg, element-074.jpeg)
- What: The advice belongs to "rounds with AI allowed, or banned", the top layer. It is drawn beside "evaluating LLM features", the bottom layer, and both are lit yellow together at 73 s, so they read as one statement. Meanwhile "layered on top / mostly mid and senior", which describes the whole stack, sits beside the top row only. It also appears at 52 s, about 2 s before any layer exists (tile at 52 s).
- Why it matters: The screen pairs a piece of advice with the wrong item.
- Cause: `ChangedScene.tsx:159` (note at `layerTop(0) + 14`); `:153-158` (labels at `layerTop(3)`, cued to `topAt`).
- Fix: Move the recruiter note to `y={layerTop(3) + 14}`. Move "layered on top / mostly mid and senior" above the stack (`x={X0}`, `y={layerTop(3) - 70}`) and cue it to `layers[0].at`.

### 8. [P2] confusion: the series close still carries the "Questions 8 and 9" kicker
- When: 417.6-436.8 s, beat `close` (frames element-418.jpeg, element-433.jpeg)
- What: The last screen of the whole series has "Questions 8 and 9" above "How sure are you, and how would you know?" and the practice list. It is not part of question 8 or 9.
- Why it matters: The closing card of twelve videos is labeled as a quiz item, and it stays up for 19 s.
- Cause: `RapidScene.tsx:162` (`<Kicker at={from}>` with no `out`).
- Fix: `<Kicker at={from} out={roundAt - 6}>Questions 8 and 9</Kicker>`, followed by `<Kicker at={roundAt}>Data scientist interview prep</Kicker>`. That is the hook's kicker (`HookScene.tsx:70`), so the series ends where it began.

### 9. [P3] explanation: McNemar's test is named but not what it tests
- When: 158-166 s, beat `size-pair` (frames element-158.jpeg, element-164.jpeg)
- What: "only the thirty-five where they disagree carry information: twenty-five go to B, ten to A. McNemar's test on those gives point oh two." Nothing says the test asks whether a 25/10 split is unlikely if the two versions were equally good, which would split those items about evenly.
- Why it matters: "What does McNemar test?" is the obvious follow-up.
- Cause: `script.ts:118`; `SizeScene.tsx:200-206`.
- Fix: After "ten to A", add: "If the versions were equally good, those would split about evenly, like coin flips." Add "if equal: about 17 and 18" under "35 disagree: only these count".

### 10. [P3] accuracy: "point oh two" is said, but 0.017 is shown
- When: 164-173 s, beat `size-pair` (frame element-172.jpeg)
- What: The narration rounds to 0.02, while the screen shows "p = 0.017".
- Cause: `SizeScene.tsx:222` (`toFixed(3)`) against `script.ts:118`.
- Fix: Show `p = 0.02` (`toFixed(2)`), or say "point oh one seven".

### 11. [P3] accuracy: the 64% label drops "at least one" and the 5% level
- When: 360-376 s, beat `check-list` (frames element-363.jpeg, element-375.jpeg)
- What: The screen reads "20 segments, no correction: 64% chance of a false alarm". The narration says "at least one", and neither states that the 64% assumes 5% per test (1 - 0.95^20).
- Cause: `CheckScene.tsx:151`; `script.ts:183`.
- Fix: Screen: "64% chance of at least one false alarm (at 5% each)". Narration: "twenty segments compared at five percent each with no correction".

### 12. [P3] accuracy: "A judge can't beat the humans it imitates" overstates the page
- When: 223-232 s, beat `judge-bias` (frames element-224.jpeg, element-230.jpeg)
- What: The page says a judge "cannot be *expected* to beat" the humans it imitates. Said flatly, the claim is false: a judge can agree with an expert consensus more than a single noisy expert does.
- Cause: `script.ts:141`; `JudgeScene.tsx:260`.
- Fix: "Don't expect a judge to beat the humans it imitates." On screen: "don't expect it to beat the humans it imitates".

### 13. [P3] confusion: red is used for items that are not traps
- When: 21-36 s (plan: "what's new" label and chips); 52-75 s (Q1: every "layered on top" layer outlined red); 219-232 s (Q4: the judge and its same-family answer "A" in red); 424-436 s (close: the "110 multiple-choice questions" chip in red)
- What: In this series red means the trap, the wrong answer or the error. Here it marks things that are simply new or neutral, and the starred "A" in the model-family mechanism looks like the wrong answer.
- Cause: `HookScene.tsx:144,147` (`ACCENT_INK`); `ChangedScene.tsx:73,154`; `JudgeScene.tsx:238,241` (`ACCENT`); `RapidScene.tsx:178`.
- Fix: Draw "what's new" and the layers in `INK` outlines, keeping the yellow pointer for what is lit. Draw the judge/A pair in one accent hue with no series meaning (purple 500) and B in `INK_SOFT`. Give the bank chip `BLUE_INK` like the other two practice chips (the yellow `lit` still marks it).

### 14. [P3] other: an authoring note is printed on screen
- When: 220-232 s, beat `judge-bias` (frames element-221.jpeg, element-230.jpeg)
- What: "each drawn as a mechanism: the page gives no rates for them" sits mid-figure. It is not spoken, and to a viewer "the page" and "rates" mean nothing.
- Cause: `JudgeScene.tsx:252-254`.
- Fix: Delete the Note. The narration already presents the biases as things to test, not as measured rates.

### 15. [P3] confusion: the 100-cell grid cannot show "each marks 90% as a pass"
- When: 188-232 s, beats `judge` to `judge-bias` (frames element-188.jpeg, element-210.jpeg)
- What: The grid shows 85 "both pass", 5 "both fail" and 10 "they disagree", all in one red. A viewer counting cells sees 85 passes and cannot recover the stated 90/90 split (5 disagreements each way).
- Cause: `JudgeScene.tsx:111-116` (every `APART` cell gets the same `BAD` fill).
- Fix: Split the 10 cells into 5 "judge pass, expert fail" and 5 "expert pass, judge fail" (red, and red with a white diagonal), and extend the legend with "85 + 5 = 90 passes each".

### 16. [P3] spacing: hyphens render wide ("hand - labeled", "a t - test")
- When: 300-331 s, beat `prev` (frame element-329.jpeg); 357-376 s, beat `check-list` (frame element-375.jpeg)
- What: In these two prose lines the hyphen gets a figure-width advance, so it reads as a spaced dash.
- Cause: `PrevScene.tsx:81` and `CheckScene.tsx:146` spread `...TABULAR` (`tabular-nums`) over whole sentences.
- Fix: Drop `...TABULAR` from both lines. Their numbers never change, so they do not need tabular figures.

### 17. [P3] spacing: "updated under the same name" touches the red bar
- When: 261-287 s, beat `ab-pin` (frame element-286.jpeg)
- What: The descenders of the 19px label sit on the top edge of the red "after the update" bar.
- Cause: `AbScene.tsx:205` puts the label at `TL.y - 44`, while the bars start at `TL.y - 22` (`:188`, `:192`).
- Fix: `y={TL.y - 54}`.

### 18. [P3] spacing: "2. stratify" runs into its explanation
- When: 168-174 s, beat `size-strat` (frame element-172.jpeg)
- What: The yellow mark on "2. stratify" sits about 6px from "a small slice that regresses".
- Cause: `SizeScene.tsx:233` (`{"  "}` collapses to a single space).
- Fix: Replace it with `marginLeft: 16` on the span.

### 19. [P3] other: the on-screen line drops "number"
- When: 373-376 s, beat `check-list` (frame element-375.jpeg)
- What: The screen says "reproduce the headline another way", while the narration says "the headline number". Read alone, "the headline" sounds like a title.
- Cause: `CheckScene.tsx:160`.
- Fix: "reproduce the headline number another way".

### 20. [P3] pacing: the series' last message is the densest beat of the round
- When: 417.6-434.2 s, beat `close`, 3.32 words/s
- What: The closing question, three practice items and the bank arrive in one 55-word beat with no pause.
- Cause: `script.ts:205` (a single beat).
- Fix: End `close` at "how would you know?" with `pauseAfter: 0.8`, and move the practice sentence into its own beat `close-practice`. The chips are already cued to its words.

### 21. [P3] answer: each rapid answer drops a clause the page treats as part of the answer
- When: 381-417 s, beats `r-thumbs` and `r-contam`
- What: Thumbs-up omits "keep explicit feedback as a diagnostic, not the target". Contamination says "never train on it" but leaves out the page's "or few-shot prompts", the more common way a private eval set leaks.
- Cause: `script.ts:196,200`; `RapidScene.tsx:79`.
- Fix: Append "Keep the thumbs as a diagnostic, not the target" to `r-thumbs`. Change to "never train on it or paste it into prompts", in the narration and the chip.
