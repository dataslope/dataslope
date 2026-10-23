# NLP and LLM course videos: review

**Reviewed:** the ten unit videos of
[the plan](20261023-0700-nlp-and-llm-course-video-plan.md), `Llm-1` to
`Llm-5` (Drew) and `Nlp-1` to `Nlp-5` (Hope), 60:18 in all, as built and
voiced.
**Result:** 167 findings: **9 P1**, 62 P2, 96 P3. Each video has its own
report in [`20261023-nlp-llm-video-review/`](20261023-nlp-llm-video-review/),
every finding with its time, beat, frame, cause (`file:line`) and a fix. Each
report also names up to three deep-dive candidates.

Severity is the October review's: **P1**, a viewer is likely to misunderstand
the point, or the frame has an obvious defect; **P2**, noticeable and hurts
the video; **P3**, polish.

## How it was reviewed

As [the October 21 review](20261021-0551-course-video-review.md) was, with its
tools adapted (`20261023-nlp-llm-video-scratch/review-tools/`): every
composition rendered at 1920x1080, one frame every 0.5 s; contact sheets of
one-second tiles labelled with the beat being spoken; a timeline per video
with each beat's words per second and the silence after it. One reviewer per
video read the script, timeline, scene code and source lessons, walked every
sheet and opened full frames for anything that looked off. Reviewers also
checked each builder's report against the frames.

## What went right

The October review's series-wide problems mostly did not come back, because
the builders started from them:

- **Breath between ideas.** Every video runs 130 to 145 words a minute with
  `COURSE_MIN_PAUSE` and 1.6 s at scene cuts; reviewers call the pace
  comfortable in nine of ten. No video has the October set's 50 to 77% of
  gaps under 0.45 s.
- **Numbers.** Every number on screen matched the narration and the lessons'
  own code in every review (each `measure.py` asserts the lesson blocks
  against the site's recorded output).
- **Legibility.** No text under 19px in any video; no clipping; figures
  numbered in every video.

## Series-wide problems

### 1. Four lessons in six minutes leaves mechanisms asserted

The commonest P2 across the set: a unit has time to state a mechanism but not
to show it working. Attention's scores appear without the dot product
(Llm-2), the four hallucination remedies are read as imperatives in 9.8 s
(Llm-3), "frequent here, rare elsewhere" is stated over a TF-IDF table where
every word ties at 0.18 (Nlp-4), the negation reset is never run on a
sentence (Nlp-4), the bigram-and-trigram "sweet spot" rests on a chart that
shows only the cost (Nlp-3), and Spärck Jones's weights of 2 and 7 are never
derived (Nlp-5). The deep dives below take the worst of these; the rest get a
clause, a ghost cell or a worked example in the fix pass.

### 2. A scale that argues against its caption

Three videos draw a proportion the wrong way round. Nlp-3's Fig. 5 squeezes
7,059 tail words into a sliver beside the top 20 (P1); Nlp-5's log rank axis
gives the top 100 words half the chart and the once-only words a stub (P1);
Llm-3's two non-linear charts are unmarked. Llm-4's threshold bar hatches only
the overflow when the whole request reprices (P1).

### 3. The screen runs ahead of the narration

A figure, counter or label lands seconds before the words that explain it:
Llm-1's 43,500 bill, Llm-5's Fig. 12 and its orphaned axis labels (P1),
Nlp-3's first bigram before its words, Nlp-5's Fig. 12, Nlp-1's Fig. 3
answering the hook unspoken.

### 4. Color that changes meaning

Red means "repeated word" then "used once" (Nlp-3); red marks a tokenizer the
narration calls "not wrong" (Nlp-2); red marks both decoy and answer (Llm-4);
adjacent figures reuse token colors for other things (Llm-3).

### 5. A lesson's wrong conclusion carried into the video

Llm-5 closes on the lesson's "a minute of triage? the cheap model wins". The
lesson's own figures say the opposite: Sonnet's three extra points avoid
30,000 errors a month for $1,567.50, about 5 cents each, far less than a
minute of anyone's time (P1). This is in addition to the lesson discrepancies
the builders already found; all are listed in the builder reports.

## The 9 P1 findings

| Video | When | Problem | Where |
| --- | --- | --- | --- |
| Llm-1 | 81.0-85.6 s | the joined word "strawberry" is drawn with its letters overlapping | `llm-tokens/StrawScene.tsx:69,165` |
| Llm-2 | 41.5-48 s | two notes print over the cube's "animal" axis label | `llm-meaning/EmbeddingScenes.tsx:626-633` |
| Llm-2 | attention scenes | no score is computed; "dot product" is never said; the √2 is hidden, so the query times trophy's key gives 1.02, not the 0.721 shown | `llm-meaning/AttentionScenes.tsx:478` |
| Llm-4 | 129.6-142.7 s | the 300,000-token bar hatches only the 28,000 past the threshold while the narration says the whole request pays double | `llm-cost/MarketScene.tsx:313-322` |
| Llm-5 | 307.4-323.6 s | "a minute of triage? the cheap model wins" contradicts Fig. 15's own numbers | `llm-benchmarks/script.ts:296-299`, `CostScene.tsx:147-149` |
| Llm-5 | 220.0-240.8 s | Fig. 12's axis labels float alone for 21 s | `llm-benchmarks/ExamplesScene.tsx:207-211` |
| Nlp-2 | 211.0-247.2 s | Fig. 8's code labels leave out the `.lower()` the rows under them had | `nlp-cleaning-text/PunctScene.tsx:156-157` |
| Nlp-3 | 99.1-125.0 s | the "long, thin tail" is the shortest thing in Fig. 5 | `nlp-counting-words/TailScene.tsx:24-25,77-79` |
| Nlp-5 | 45.6-58.6 s | the log rank axis inverts both "a few words" proportions | `nlp-history/ZipfScene.tsx:18,143,153-162` |

## Per video

| Video | Length | P1 | P2 | P3 | In short |
| --- | --- | --- | --- | --- | --- |
| [Llm-1 Tokens](20261023-nlp-llm-video-review/Llm-1-Tokens.md) | 5:23 | 1 | 6 | 10 | Accurate; colliding "strawberry"; four BPE merges in 0.7 s; the chat bill counts up early |
| [Llm-2 Meaning](20261023-nlp-llm-video-review/Llm-2-Meaning.md) | 6:32 | 2 | 9 | 9 | Embeddings and similarity land; attention has time but not mechanism |
| [Llm-3 Generation](20261023-nlp-llm-video-review/Llm-3-Generation.md) | 6:19 | 0 | 9 | 11 | Sampling clear; the second half compresses four ideas to a sentence each |
| [Llm-4 Cost](20261023-nlp-llm-video-review/Llm-4-Cost.md) | 5:02 | 1 | 5 | 8 | Every dollar right; the threshold bar draws the lesson's trap; levers 3 to 6 rushed |
| [Llm-5 Benchmarks](20261023-nlp-llm-video-review/Llm-5-Benchmarks.md) | 5:38 | 2 | 6 | 7 | The cost verdict is inverted; "noise" and "construct mismatch" asserted |
| [Nlp-1 WhyTextIsHard](20261023-nlp-llm-video-review/Nlp-1-WhyTextIsHard.md) | 5:17 | 0 | 7 | 8 | Clean; lowercasing shown as the fix for Apple/apple; drops struck on the wrong row |
| [Nlp-2 CleaningText](20261023-nlp-llm-video-review/Nlp-2-CleaningText.md) | 7:31 | 1 | 3 | 13 | Strong; Fig. 8's code labels; red on a tokenizer called "not wrong" |
| [Nlp-3 CountingWords](20261023-nlp-llm-video-review/Nlp-3-CountingWords.md) | 6:34 | 1 | 6 | 11 | Accurate; the tail drawn short; the sweet spot asserted |
| [Nlp-4 TextToFeatures](20261023-nlp-llm-video-review/Nlp-4-TextToFeatures.md) | 6:50 | 0 | 6 | 10 | Clean; TF-IDF's rule never visible; reset never exercised |
| [Nlp-5 History](20261023-nlp-llm-video-review/Nlp-5-History.md) | 5:12 | 1 | 5 | 9 | Well sourced; Zipf's log axis; the Turing booths joined by a tube |

## Deep dives

Every reviewer named up to three ideas its unit rushes and cannot slow down
for. Four were named by two reviewers each, or by one reviewer as the
video's biggest gap, and are the ones built:

| Deep dive | Narrator | Named by | Embeds at |
| --- | --- | --- | --- |
| **How one attention score is computed**: query and keys as arrows, the dot product, the √d scaling, softmax as exponentiate-and-divide, the blend, and the query turned toward the other noun | Drew | Llm-2 (first) | attention-intuition, "Query, key, value" |
| **Why a chat's bill grows faster than the chat**: the resent history as a staircase, the bill as its area, why each doubling of the turns heads toward four times the bill, and how a cache flattens it | Drew | Llm-1, Llm-4 | estimating-cost, "A conversation, with the resend" (and token-counts-in-practice) |
| **Zipf's law, read off a log-log plot**: Emma on linear axes, then log axes where the curve straightens; the 1/rank prediction against the real table; the top 100 words and the once-only words as plain shares | Hope | Nlp-3 (first), Nlp-5 (first) | frequency-distributions, "The long tail" |
| **Lemmatizing needs the part of speech**: why the noun default exists, how WordNet's lookup works, why "was" becomes "wa", and one sentence tagged, mapped and lemmatized beside Porter's stems | Hope | Nlp-2 (first); Nlp-1 and Nlp-3 trip over the same gap | stemming-and-lemmatization, "Lemmatization" |

Strong candidates not built now: reducing hallucination by changing the task
(Llm-3), how many test examples are enough and what an error costs (Llm-5),
what TF-IDF actually rewards (Nlp-4), and from Spärck Jones's weight to IDF
(Nlp-5).

## Next

1. **Fixes.** Each video's own builder takes its review report: every P1 and
   P2, and the P3s that are cheap. Beats whose words change are re-voiced on
   their own; no take is recorded again. Every check runs again after.
2. **Deep dives,** as above, about two minutes each, built alongside the
   fixes.
