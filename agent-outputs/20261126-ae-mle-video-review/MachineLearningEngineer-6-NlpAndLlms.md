# MachineLearningEngineer-6-NlpAndLlms (11:35)

## Verdict
- A careful, well-measured video: every number said or shown matches `results.json`, every narrated claim checks out against the page, and the costs angle (vocabulary against length against the embedding table, the LoRA adapter against a full copy) is the ML engineer's. No P1 found.
- Two figures teach something the narration does not say: question 8's chart plots attention per token, so the "quadratic" cost is drawn as a straight line and "the rest of a layer only grows linearly" as a flat one; and question 5 draws the heads as eight slices of the token vector, the classic misreading of multi-head attention.
- Three answers stop one step before the follow-up an interviewer asks: tokenization never names byte-pair encoding or how its pieces are made, the RNN is "forgetful" with no word on vanishing gradients, and the sampling answer drops the page's newest paragraph (hosted reasoning models may refuse temperature and top-p), the one #746 follow-up the build missed.
- Question 4 clears its worked example two seconds after the output appears and then sits on two lines of text for about ten seconds while the simulation is described; question 13's note says word counts "stand in for an embedding model", which undercuts the point of its own demo.
- The rest is polish: arrows through a heading rule, orphaned labels after the LoRA merge, a stray state dot, Title Case flow labels, a number shown as 1.35 and said as 1.4.

## Findings

### 1. [P2] visual confusion: question 8's chart draws attention as linear and the rest of the layer as flat
- When: 335.7-360.1 s, beats `q8-when`, `q8-fix` (element-348.jpeg)
- What: the chart is "Multiply-adds per token, per layer (millions)": the rest of the layer is a flat line at 201 and attention a straight rising line, crossing at 24,576. The narration over it says "The rest of a layer only grows linearly, though", and the question is why attention's cost grows with the square.
- Why it matters: per token is right arithmetic but the wrong picture for this question. A viewer sees attention as a straight line (linear) and "the rest" as constant, the opposite of what was just said, and a screenshot of this chart teaches that attention is linear in length.
- Cause: `video/src/videos/mle-nlp-llms/CostScene.tsx:17, 57-68, 126-168` (plots `cost.curve`, per token); `check.mjs:172-176`.
- Fix: plot the whole sequence's multiply-adds per layer: attention 2n²d as a parabola, the rest 12nd² as a rising straight line, crossing at the same 24,576. Add the totals to `cost.curve` in `check.mjs` (new fields, existing values untouched), axis in trillions, labels unchanged.

### 2. [P2] accuracy: question 5 draws the heads as slices of the token vector
- When: 217.7-241.0 s, beats `q5-a`, `q5-cost` (element-238.jpeg)
- What: on "Give each head", the "512 wide" bar splits into eight 64-wide segments, "64" under the first, and each segment sits directly over its head's query, key and value.
- Why it matters: it reads as "head 3 sees dimensions 128 to 191 of the token", which is the common wrong answer to "does each head see only part of the embedding?". Each head projects the whole 512-wide vector into its own 64-wide query, key and value; the narration ("its own smaller query, key and value") is right and the picture contradicts it.
- Cause: `HeadsScene.tsx:65, 89-102` (`split` gaps the input bar into `seg(i)` pieces).
- Fix: keep the input bar whole, fan a thin line from it to every head (the whole vector reaching each projection), and move "64" to a left-column label on the q/k/v row ("64 each").

### 3. [P2] visual confusion: question 13's note says word counts stand in for an embedding model
- When: 532.0-551.5 s, beat `q13-miss` (element-549.jpeg)
- What: beside the ranked list, "Word counts stand in for an embedding model here". The narration concludes "Retrieval has to match meaning, which is what embeddings are for".
- Why it matters: the demo shows what word overlap misses so that embeddings can fix it. A note saying the word counts stand in for an embedding model reads as "an embedding model would miss too", the opposite of the conclusion.
- Cause: `RagScene.tsx:164-166`.
- Fix: "Scored by shared words, not by an embedding model".

### 4. [P2] answer: tokenization never names byte-pair encoding or how subword pieces are made
- When: 62.4-89.3 s, beats `q1-sub`, `q1-piece` (element-089.jpeg)
- What: "Subwords split the difference: frequent words stay whole, and rare ones break into known pieces", then o200k_base's split of "hallucination". The page names the schemes (byte-pair encoding, WordPiece, the unigram model); the video names none and never says where the known pieces come from.
- Why it matters: "Which algorithm, and how does it build its vocabulary?" is the first follow-up to this question. A viewer who learned "subwords split the difference" has nothing to say.
- Cause: `script.ts:358-363`; `TokenScene.tsx:322-330` (the Subwords column ends at the o200k_base note).
- Fix: a new beat after `q1-piece` (re-voice, about 150 characters): "Those pieces come from byte-pair encoding: start from single bytes, and keep merging the most frequent adjacent pair until the vocabulary is full." On screen, under the o200k_base note: "Byte-pair encoding", "merges the most frequent pair, again and again", "Also: WordPiece, unigram".

### 5. [P2] answer: the sampling answer drops the page's follow-up on hosted reasoning models
- When: 646.1-665.1 s, beat `r-random` (element-664.jpeg)
- What: temperature, top-k, top-p and "low for extraction, higher for brainstorming". The page's paragraph added in #746, "A hosted model may fix them: reasoning models in particular often reject a request that sets them, and there you steer with the prompt, a reasoning-effort setting, and structured outputs", is not in the video. The other three #746 follow-ups were added (`q6-modern`, `q9-rag`, `r-prompt-kinds`); this one was missed.
- Why it matters: "and if the API won't let you set temperature?" is the current follow-up, and the page gives the answer.
- Cause: `script.ts:554-558`; `RapidScene.tsx:222-279`.
- Fix: a new beat after `r-random` (re-voice, about 115 characters): "A hosted reasoning model may refuse them; there, steer with the prompt, the reasoning effort and structured outputs." On screen, under "Low for extraction…": "Hosted reasoning models may refuse them" and "Steer with the prompt, reasoning effort, structured outputs".

### 6. [P2] answer: the RNN is "forgetful over distance" with no reason given
- When: 295.4-313.1 s, beat `q7-a` (element-312.jpeg)
- What: "slow to train, and forgetful over distance", in red on screen as "Forgetful over distance". The page gives the mechanism, "(gradients vanish over many steps)".
- Why it matters: "why does it forget?" is the obvious press, and "vanishing gradients" is the expected two words.
- Cause: `script.ts:441-444`; `RnnScene.tsx:126-128`.
- Fix: split `q7-a` at its sentence break (the take has a 0.47 s pause there) and voice a short new beat between the halves (about 75 characters): "Its gradients shrink with every step back, so distant words barely count." On screen: "Forgetful over distance: gradients vanish".

### 7. [P2] pacing: question 4's worked example clears two seconds after its output, then the page sits nearly empty for ten seconds
- When: 181.0-193.0 s, beats `q4-a`, `q4-scale` (element-181.jpeg, element-190.jpeg)
- What: "the values, blended by the weights" inks in at 181.0 s and the whole worked example fades on "Why divide" at 183.0 s. Until "eighty-five percent" (193.2 s) the page holds the formula and two lines of text while the narration says "Simulate queries and keys of sixty-four random numbers: their dot products spread eight times wider than the numbers do".
- Why it matters: the result of the self-attention computation is on screen for two seconds, and the "eight times wider" claim, which is the whole argument for dividing, is asserted with nothing drawn.
- Cause: `AttnScene.tsx:128` (`Clear at={whyAt - 6}`); nothing is drawn for `spreadAt` (`AttnScene.tsx:225-227`).
- Fix: clear on "Simulate" instead, and draw the spread in the empty right column: a short bar for one number, a bar 8× as wide (`rawSd`) for a dot product of 64, shrinking back to `scaledSd` on "Divided by eight", cleared as the pair grid comes in.

### 8. [P2] spacing: word2vec's arrows rise through the heading rule
- When: 115.2-132.8 s, beat `q2-how` (element-131.jpeg)
- What: the four arrows from "river" to its neighbours rise to about 14 px under "word2vec: prediction", crossing the 1 px rule under the heading on the way.
- Why it matters: lines through a rule and against a heading, held for 17 seconds; the house asks for at least 28 px under a rule.
- Cause: `EmbedScene.tsx:89, 288-306` (`chipY = panelTop + h(110)`, `lift = h(40) + |j - CENTRE| × h(16)`).
- Fix: lower the sentence row and flatten the arcs so their tops sit at least 28 px under the rule.

### 9. [P3] answer: word2vec's two variants are not named
- When: 115.2-131.2 s, beat `q2-how` (element-131.jpeg)
- What: "given a word, predicts its neighbors" is skip-gram; the page names it and CBOW, "the reverse". Neither name is on screen or said.
- Why it matters: "skip-gram or CBOW?" is a standard press on word2vec.
- Cause: `EmbedScene.tsx:240-242`.
- Fix: heading "word2vec: prediction (skip-gram)" and a note under the window, "CBOW: the reverse, neighbors predict the word".

### 10. [P3] answer: "parameter-efficient fine-tuning" is answered with LoRA alone
- When: 452.2-506.5 s, beats `q12` to `rag-in` (element-504.jpeg)
- What: the question asks what PEFT is, "for example LoRA"; the page also names adapters and prefix tuning as the same idea. Only LoRA appears.
- Why it matters: "what other PEFT methods are there?" follows.
- Cause: `LoraScene.tsx` (nothing beyond LoRA).
- Fix: a note at the bottom of the left column: "Adapters and prefix tuning: other ways to train a sliver".

### 11. [P3] visual confusion: "rank 8" and "65,536" stay after the thin matrices merge away
- When: 492.5-506.5 s, beats `q12-serve`, `rag-in` (element-504.jpeg)
- What: on "merge", the two thin matrices fold into the square and fade with "trained", "+" and "×", but "rank 8" and "65,536" stay under the empty space where they were.
- Why it matters: two labels for a figure no longer drawn.
- Cause: `LoraScene.tsx:118-123` (no `out`).
- Fix: fade them with the pair (`out={mergeAt + 16}`).

### 12. [P3] visual confusion: on "attention", the banks link to words that are not in their sentences
- When: 160.9-163.5 s, beat `attn-in` (element-162.jpeg)
- What: gold lines run from "the savings bank" to "loan" and from "the river bank" to "stream".
- Why it matters: attention mixes in the other tokens of the same sentence; neither "loan" nor "stream" is in either sentence, so the lines suggest attention pulls a vector toward its neighbours in the embedding space. The script also says the turns add nothing on screen.
- Cause: `ContextScene.tsx:109-125`.
- Fix: remove the lines.

### 13. [P3] visual confusion: the hidden-state dot is unlabelled and ends as a stray dot
- When: 299.0-317.6 s, beats `q7-a`, `cost-in` (element-312.jpeg)
- What: a blue dot walks along above the RNN row, fading as it goes, and comes to rest, faint, above "fell", with no label.
- Why it matters: it is the hidden state thinning, the figure's point about forgetting, but unlabelled it reads as a rendering artifact.
- Cause: `RnnScene.tsx:119-122`.
- Fix: a "hidden state" label riding beside the dot.

### 14. [P3] spacing: the residual line runs along the stacked blocks' outlines
- When: 251.0-289.5 s, beats `q6-a` to `q6-modern` (element-288.jpeg)
- What: the lower residual leaves the input arrow 16 px above the dashed block's bottom and runs right between the two grey outlines of the blocks stacked behind, a few px from each.
- Why it matters: three near-parallel lines tangle at the foot of the diagram.
- Cause: `BlockScene.tsx:127-141` (each stack hint is a full rectangle, offset up and right, so its bottom edge sits inside the block).
- Fix: draw the stack hints as their top and right edges only, the parts that would show behind the front block.

### 15. [P3] polish: the joined vector shows two seams
- When: 229.0-242.0 s, beats `q5-a` to `tf-in` (element-238.jpeg)
- What: the purple "joined" bar has visible breaks after the first and before the last of its eight pieces, so it reads as three parts.
- Cause: `HeadsScene.tsx:147-154` (the end pieces keep `rx={4}` once joined, the middle ones go square).
- Fix: once joined, draw one bar.

### 16. [P3] house style: the RAG flow's labels are in Title Case
- When: 513.6-551.5 s, beats `q13-a`, `q13-miss` (element-549.jpeg)
- What: "Vector Search", "Top Passages".
- Cause: `RagScene.tsx:13`.
- Fix: "Vector search", "Top passages".

### 17. [P3] accuracy: "1.35" shown, "one point four" said
- When: 75.7-94.3 s, beat `q1-piece` (element-089.jpeg)
- What: the Subwords column reads "1.35 tokens a word on this page" while the narration says "one point four".
- Cause: `TokenScene.tsx:322-327`.
- Fix: show the value at one decimal, as said.

### 18. [P3] polish: question 11's stage notes and width key
- When: 429.0-452.2 s, beats `q11-a`, `lora-in` (element-450.jpeg)
- What: "Follow / instructions" and "Match human / preferences" are one phrase broken over two lines, the second half in the grey of a separate note; the key says "Each block's width: what the stage costs" though the widths are not to scale (pretraining 2.8× fine-tuning); and on "far cheaper" the fine-tuning block narrows under an underline that stays full width.
- Cause: `StagesScene.tsx:44-45, 67-69, 81`.
- Fix: "Follow instructions" and "Match human preferences" on one line each; key "…what the stage costs, not to scale"; the underline narrows with the block.
