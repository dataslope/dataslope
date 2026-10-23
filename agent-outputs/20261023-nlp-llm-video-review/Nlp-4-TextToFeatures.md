# Nlp-4-TextToFeatures (0-410.4 s, whole video)

## Verdict
- The build is clean. I found no overlaps, clipping or text under 20px, the margins are consistent, and every number I re-derived matches the lessons: the bag rows, the binary vector, ln 3 = 1.10, 1/6 × 1.10 = 0.18, scikit-learn's 1.00/1.69 and 0.51/0.43, and every sentiment trace. The builder's scene-by-scene claims hold against the frames.
- Pacing is mostly comfortable: 136 wpm, a 1.3 s hold before each cut, and few beats over 3 w/s. The problem is coverage. Four lessons go into 6:50, and the dense spots are exactly where the mechanism matters: `sklearn` (12 s), `reset` (7 s) and the IDF log (one clause).
- The biggest weaknesses are conclusions asserted without a supporting visual. TF-IDF's "frequent here, rare elsewhere" is stated over a table where every content word scores the same 0.18. The "No meaning" panel draws six empty boxes. The negation reset is described but never shown on a sentence.
- One narration line contradicts the figure before it. "Sentiment keeps its stopwords" (about 80 s) comes ten seconds after Fig. 3 showed the sentiment pipeline drop "the" and "was".
- The rest is polish: empty headline slots at three scene openings, Fig. 7 sitting left of Fig. 6, "Fig. 12 Fig. 10's table", and a menu drawn as a fixed chain of arrows.

## Deep-dive candidates
1. **What TF-IDF actually rewards** (tf-idf.mdx, "The intuition before the formula" / "Step 3: putting them together").
   - Where the unit rushes it: 209.3-274.1 s, beats `idf` to `rule`. The log is "then take the natural log", with no reason given. The lesson's three-document corpus gives every non-"the" word a count of 1, so all 12 scores tie at 0.18, and "frequent here" is never visible.
   - Why the unit can't slow down: it is tied to the lesson's corpus, and its TF-IDF part is already 88 s.
   - What 2 minutes would show:
     - A tf × idf plane with "the" (high tf, idf 0), "cat" (low tf, high idf) and a word used twice in one document only (2/6 × 1.10 = 0.37), so the product is visibly area.
     - The log compressing 1-in-10,000 from 10,000 to about 9.2 (the lesson's callout).
     - "on" tying "cat" at N = 3, then separating once a fourth document uses "on".
2. **Scikit-learn's `TfidfVectorizer()` is not the textbook formula** (tf-idf.mdx, callout "Why the logarithm, and the zero-division guard").
   - Where the unit rushes it: 275.7-288.1 s, beat `sklearn`. In 12 s it shows two idf formulas, a value table and a five-bar chart. The 0.51 against 0.43 depends on raw counts and unit-length rows, which only a 20px footnote mentions, and the figure dims about 3 s later.
   - Why the unit can't slow down: it is a caution aside on the way into Part 4.
   - What 2 minutes would show: the same three documents, changing one default at a time.
     - Smoothing, 1+N over 1+df, and why: an unseen word would divide by zero.
     - The outer +1, which keeps "the" off zero.
     - Raw counts instead of shares, so "the" counts 2.
     - L2 row scaling, drawn as a vector's length, landing on 0.51 against 0.43.
     - Then `smooth_idf=False` and `norm=None` getting back close to the lesson's table.
3. **Negation scope: where the flag stops** (rule-based-sentiment.mdx, "Adding negation handling").
   - Where the unit rushes it: 330.2-360.7 s, beats `flag`, `reset`, `fixed`, `mixed`. The reset rule is read at 3.05 w/s and never exercised. The "mixed" example that follows contains "but" but no negation, so the reset does nothing there.
   - Why the unit can't slow down: Part 4 already has 65 s for lexicon, naive counter and fix.
   - What 2 minutes would show:
     - A token-by-token trace with a visible flag lamp.
     - "Not really, it was good": +1 with the reset, −1 without (both in `measurements.json`, `resetCheck`).
     - "Not great, but terrible" scoring −2 either way. This is the builder's finding that the lesson's stated reason is wrong.
     - Cases the rule misses ("not only good but great", "never been better"), and the link to bigrams.

## Findings

### 1. [P2] explanation: "frequent here, rare elsewhere" is asserted over a table where every word ties
- **When:** 254.2-274.1 s, beats `tie` and `rule` (element-520.jpeg, element-549.jpeg).
- **What:** the headline turns into "Frequent here, rare elsewhere." over Fig. 12. Every non-zero cell in all three rows is the same 0.18, because every content word appears once in a six-word document. Nothing on screen is rewarded for being frequent here; only the rare-elsewhere half (the zeroed "the") is shown.
- **Why it matters:** this is TF-IDF's whole rule, and the viewer gets it as a slogan, not from the figure.
- **Cause:** the lesson's corpus (`data.ts` `CORPUS`/`TFIDF`). `video/src/videos/nlp-text-to-features/MorphScene.tsx:144` changes the headline with no figure change except pulses (`glow`, :125-129).
- **Fix:**
  - In the `rule` beat, draw a ghost cell beside Doc 1's cat: "if cat appeared twice: 2/6 × 1.10 = 0.37".
  - Add half a sentence to `rule`: "a word used twice here would score twice as much".

### 2. [P2] confusion/pacing: scikit-learn's 0.51 arrives unexplained and dims about 3 s later
- **When:** 284.5-289.7 s, beats `sklearn` and `decide-in` (element-576.jpeg, element-591.jpeg).
- **What it shows:**
  - The table gives "the" an idf of 1.00. The chart beside it shows 0.51 for "the", with no axis title, under a figure titled "two idf formulas".
  - Why "the" stays on top (raw counts, so it counts 2; rows scaled to length one) appears only in a 20px unread footnote, visible at full opacity from about 285.8 s.
  - The whole figure fades to 45% from 289.0 s. The red "the" bar, the scene's point, is at full contrast for about 2 s.
- **Why it matters:** a viewer can't connect 1.00 to 0.51, so "it even stays on top" reads as a contradiction.
- **Cause:**
  - `DefaultScene.tsx:99`: the title says "two idf formulas".
  - :164-168: the chart heading has no measure.
  - :213-215: the footnote is cued at `theseAt + 16`.
  - :60: `back` dims everything at `decide-in`'s first frame.
- **Fix:**
  - Add to `sklearn`: "It also counts raw words and scales each row to length one, so the scores point five one."
  - Set `pauseAfter: 1.4` on `sklearn`.
  - Retitle Fig. 13 "One corpus, two tf-idf recipes" and head the chart "Doc 1, tf-idf score".
  - Start `back` at `n.word("decide-in", "makes a call")`.

### 3. [P2] accuracy: "Sentiment keeps its stopwords" contradicts Fig. 3
- **When:** 79.5-82.3 s, beat `tasks` (element-160.jpeg, compare element-145.jpeg).
- **What:** ten seconds earlier, Fig. 3's sentiment pipeline dropped "the" and "was" and kept only "not" and "but" ("keeps the negations"). The table cell being marked says "no, keep negation", but the narration says it keeps its stopwords.
- **Why it matters:** the viewer gets two different sentiment pipelines in a row. The lesson's advice is "do not strip stopwords naively" (keep negations), not "keep them all".
- **Cause:** `script.ts:137`. Cue `TasksScene.tsx:54` (`"keeps its stopwords"`).
- **Fix:** narrate "Sentiment keeps its negations." and re-cue :54 to `"keeps its negations"`.

### 4. [P2] explanation: the reset rule is never shown on a sentence
- **When:** 339.6-360.7 s, beats `reset` and `mixed` (element-686.jpeg, element-722.jpeg).
- **What it shows:**
  - During `reset` (3.05 w/s, 0.7 s gap after), only the "Flag off" chips swell. The lower 40% of the frame holds just "it is not good".
  - None of the three traces needs a reset. The last one ("good but … awful") contains "but" with no negation before it, so it suggests the reset did something when it did not.
  - The flag's on/off state is never drawn on any trace.
- **Why it matters:** "so a not can't reach into the next clause" is asserted, not demonstrated.
- **Cause:** `FlagScene.tsx:27`: `ROWS` has no reset case. :82-105 only bumps the chips.
- **Fix:**
  - Add a trace row "Not really, it was good" (`measurements.json` `resetCheck`: +1 with the reset, −1 without), cued in `reset`, with a small "flag" lamp under the tokens that lights at "not" and goes out at the comma.
  - Set `pauseAfter: 1.0` on `reset`.

### 5. [P2] explanation: the "No meaning" panel is six empty boxes
- **When:** 177.4-183.8 s, beat `meaning` (element-358.jpeg, element-367.jpeg).
- **What:** under "great" and "excellent" sit two columns of three blank cells, with no values and no row labels. The claim "the bag knows nothing about meaning" has no data behind it, unlike the computed Order panel beside it.
- **Why it matters:** the lesson's point is that near-synonyms share no column, so two same-meaning reviews look unrelated. The panel doesn't show that.
- **Cause:** `BlindScene.tsx:180-193` and `ColumnCell` :218-237, which draw outlines only.
- **Fix:** two rows, "a great film" and "an excellent film", over the columns great / excellent / film: 1 0 1 and 0 1 1. Only "film" overlaps.

### 6. [P2] explanation: IDF's log is unexplained, and "smoothing" appears before it is defined
- **When:** 209.3-221.6 s, beat `idf` (element-440.jpeg, element-469.jpeg).
- **What:**
  - "then take the natural log" gives no reason. The lesson's callout gives one: 1 in 10,000 would otherwise weigh 10,000; the log makes it about 9.2.
  - The ln gloss on screen reads "the natural log, with no smoothing". "Smoothing" is not explained until `sklearn`, 60 s later, and only as "smooths it and adds one".
- **Why it matters:** the formula's only non-obvious part is presented as a rule to memorise.
- **Cause:** `script.ts:226`; `IdfScene.tsx:146`.
- **Fix:**
  - Append to `idf`: "the log keeps a very rare word from swamping the rest."
  - Change the gloss to "the natural log".

### 7. [P3] pacing: empty headline slots at scene openings and swaps
- **When:** three places.
  - 192.1-199.0 s, beat `counts` (element-386.jpeg to element-397.jpeg): no headline for about 6.5 s.
  - 15.4-17.8 s, beat `menu` (element-032.jpeg).
  - 318.0-320.0 s, at the "It is not good... positive" payoff (element-636.jpeg to element-639.jpeg).
  - Also 209.3-216.3 s (`idf`): only the headline and the balance are up while TF-IDF is named.
- **Why it matters:** the page looks unfinished at moments the narration is setting up.
- **Cause:**
  - `CountsScene.tsx:56`: Headline at `rawAt - 6`.
  - `MenuScene.tsx:105`: `out={choiceAt - 6}`, while the next headline enters at `menuAt - 2` (:108).
  - `LexiconScene.tsx:74`: `out={verdictAt[2] - 6}`, while the next enters at `seesAt - 2` (:82).
- **Fix:**
  - CountsScene: put the first half up at `start - 4` ("By raw count,").
  - MenuScene: `out={menuAt - 8}`.
  - LexiconScene: `out={seesAt - 8}`, so each swap is a cross-fade.
  - IdfScene: write "tf × idf" under the headline at `n.word("idf", "TF-IDF")`.

### 8. [P3] confusion: Fig. 2 draws the "menu" as a fixed recipe
- **When:** 20.4-41.8 s, beats `steps` and `test` (element-082.jpeg).
- **What:** the four optional steps are chained left to right by arrows after "tokenize", which is a recipe. Nothing is ever chosen or skipped, and Fig. 3's two pipelines never refer back to it.
- **Why it matters:** the headline "A menu, not a recipe." is the one thing the figure doesn't show.
- **Cause:** `MenuScene.tsx:155-163`: an arrow between every pair of cards.
- **Fix:** drop the arrows between the dashed cards and hang them as options under "tokenize". Alternatively, light the cards each pipeline takes at `topic` and `sentiment` in TwoPipelinesScene.

### 9. [P3] explanation: columns for words the document doesn't contain, with no word on where they come from
- **When:** 6.0-41.8 s, Fig. 1 (element-028.jpeg), and 151.8-163.0 s, Fig. 8 (element-324.jpeg).
- **What:**
  - Fig. 1 ("One document … as a row of numbers") has columns "and, dog, log, played" at 0, about 100 s before "vocabulary" is defined.
  - Fig. 8 has "meeting" and "report" columns that the spam doesn't use, never mentioned.
- **Why it matters:** a careful viewer wonders where those columns came from.
- **Cause:** `MenuScene.tsx:123-140`, using the 3-document `BOW.vocab`; `BinaryScene.tsx:83-92`.
- **Fix:**
  - Fig. 1 title: "One document, as words and as counts over a shared vocabulary".
  - Fig. 8: add a 20px note "the lesson's five-word vocabulary".

### 10. [P3] explanation: two claims lose the lesson's one-clause reason
- **When:**
  - 82.9-87.0 s, `author` (3.15 w/s).
  - 149.7-161.9 s, `binary`/`vectors`.
- **What:**
  - Authorship, "the most counterintuitive case" in the lesson, gets 4 s with no why: an author's rate of "the", "of", "that" is a fingerprint.
  - Binary gets "sometimes all that matters is whether a word is there" with no when: short texts, less swayed by length. The lesson calls the shown 3 "a strong spam signal", so the binary vector looks strictly worse.
- **Cause:** `script.ts:142` and :182.
- **Fix:**
  - `author`: "…the stopwords are the signal itself: how often someone writes the, of and that is a fingerprint."
  - `binary`: "…whether a word is there, as in short texts."

### 11. [P3] confusion: Doc 1's row shows mixed units for about 6 s
- **When:** 245.0-251.0 s, beats `tf` and `flip` (element-500.jpeg).
- **What:** Doc 1's "cat" reads 0.18 beside raw counts 1, 1, 1 for sat/on/mat and 2 in the other rows. Taken at face value, cat scores lower than sat.
- **Cause:** `MorphScene.tsx:116-120`. `turnAt` converts cat at `catScoreAt - 4` and the rest at `ledAt - 4`.
- **Fix:** dim the not-yet-converted counts to 40% from `catScoreAt - 4` until they morph.

### 12. [P3] accuracy: the narration paraphrases Fig. 10's documents without the word it is about to count
- **When:** 192.4-202.9 s, beat `counts`.
- **What:** you hear "a cat on a mat, a dog in a park, a comet in the sky" while the screen shows "the cat sat on the mat …". The next clause is "the word the leads every row, with two".
- **Cause:** `script.ts:215`.
- **Fix:** read them as written ("the cat sat on the mat, the dog ran in the park, the comet streaked across the sky"), which adds about 1 s.

### 13. [P3] other: figures read right to left in BagScene
- **When:** 119.0-149.4 s (element-297.jpeg).
- **What:** Fig. 7 sits on the left and Fig. 6 on the right.
- **Cause:** `BagScene.tsx:101` and `:140`. Fig. 6 slides right (`slide`, :70) and Fig. 7 builds at `X0`.
- **Fix:** slide the bag left (to `X0`) instead of right, and build Fig. 7 at x ≈ 800. The documents and matrix are about 905px wide, so they end near x 1705.

### 14. [P3] other: "Fig. 12 Fig. 10's table, as TF-IDF"
- **When:** 236-275 s (element-549.jpeg).
- **Cause:** `MorphScene.tsx:147`.
- **Fix:** title "The same table, as TF-IDF".

### 15. [P3] confusion: Fig. 18's context row conflates two limits
- **When:** 372.8-381.1 s, beat `context` (element-818.jpeg).
- **What:** "unpredictable" is in neither list, so the rule system can't exhibit the context problem. The next row then scores the brakes sentence 0, neutral, for missing words. The context row also has no score, unlike its neighbours.
- **Cause:** `LimitsScene.tsx` context row. The example word is outside `POSITIVE`/`NEGATIVE`.
- **Fix:** show what happens if "unpredictable" is added to the negative list: the thriller sentence then scores −1, computed in `measure.py`. Put that score in the row's sum column.

### 16. [P3] spacing: Fig. 3 row labels on two left edges
- **When:** 55-73 s (element-145.jpeg).
- **What:** "dropped" is right-aligned at about x 320, beside the chips. "Topic pipeline", "Sentiment pipeline" and "word pairs" sit at x 120.
- **Cause:** `TwoPipelinesScene.tsx:142` places it at `ROW_X - 120`; "word pairs" uses `X0` (:183).
- **Fix:** place "dropped" at `X0`.
