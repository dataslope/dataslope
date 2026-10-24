# NLP and LLM course videos: fixes and deep dives

**Follows:** [the review](20261023-1030-nlp-llm-video-review.md) of the ten
unit videos (167 findings: 9 P1, 62 P2, 96 P3).
**Result:** 156 fixed, 11 partly fixed, none skipped. Every one of the
fourteen videos (ten units, four new deep dives) passes `check:frames`,
`check:motion`, `check:sync` and `check:mix`, and the package passes
`typecheck`, `lint`, `npm test` (59/59) and `check:cues`.
**Voice:** the fix pass re-voiced only new or reworded beats, each on its
own: 6,063 characters in all, under the 900-per-video cap everywhere. No take
was recorded again. Beat splits at sentence breaks were cut from the kept
takes with `narrate --recut` and cost nothing. The four deep dives took
7,075 characters, one take each.

## Per video

Each video's builder wrote a fix report, kept in
[`20261023-nlp-llm-video-scratch/fixes/`](20261023-nlp-llm-video-scratch/fixes/),
with every finding's outcome.

| Video | Findings | Result | Re-voiced | Length |
| --- | --- | --- | --- | --- |
| Llm-1 Tokens | 17 | 17 fixed | 309 chars, 3 beats | 5:23 → 5:38 |
| Llm-2 Meaning | 20 | 18 fixed, 2 partly | 785 chars, 9 beats | 6:32 → 6:47 |
| Llm-3 Generation | 20 | 20 fixed | 658 chars, 5 beats | 6:19 → 6:32 |
| Llm-4 Cost | 14 | 13 fixed, 1 partly | 545 chars, 6 beats | 5:02 → 5:29 |
| Llm-5 Benchmarks | 15 | 14 fixed, 1 partly | 833 chars, 7 beats | 5:38 → 5:58 |
| Nlp-1 WhyTextIsHard | 15 | 13 fixed, 2 partly | 572 chars, 6 beats | 5:17 → 5:52 |
| Nlp-2 CleaningText | 17 | 17 fixed | 478 chars, 6 beats | 7:31 → 7:41 |
| Nlp-3 CountingWords | 18 | 15 fixed, 3 partly | 862 chars, 8 beats | 6:34 → 6:56 |
| Nlp-4 TextToFeatures | 16 | 15 fixed, 1 partly | 540 chars, 8 beats | 6:50 → 7:27 |
| Nlp-5 History | 15 | 14 fixed, 1 partly | 481 chars, 4 beats | 5:12 → 5:20 |

The ten units now run 63:38, up from 60:18: the pauses after definitions,
and the sentences added to explain what the review found unexplained.

## The 9 P1s

All fixed. The ones worth knowing:

- **Llm-5: the cost verdict follows the numbers.** The lesson says "a minute
  of triage? the cheap model wins"; its own prices say Sonnet's three extra
  points avoid 30,000 errors a month for $1,567.50, about 5 cents each.
  `measure.py` now prices each step up the tiers per avoided error (5.2¢,
  then 16.5¢, then nothing for Fable), Fig. 15 shows it, and the re-voiced
  verdict says a minute of anyone's time costs more than that.
- **Llm-2: attention scores can be redone by hand.** The dot product is
  named and tied to cosine, and one score is worked on screen:
  1.0 × 1.0 + 0.1 × 0.2 = 1.02, ÷ √2 = 0.721. The lesson's hand-set example
  (0.722) is gone, so trophy has one weight on screen (0.461).
- **Llm-4:** the 300,000-token bar now reprices the whole request, not just
  the 28,000 tokens past the threshold.
- **Nlp-3 and Nlp-5: proportions on plain axes.** Nlp-3's Fig. 5 draws all
  7,079 ranks on a linear axis, so the tail runs the full width. Nlp-5 keeps
  its log-log plot for the law and adds plain 100% bars for the shares (the
  top 100 words are 60% of the book; 39% of the vocabulary appears once).
- **Nlp-2:** Fig. 8's recipes show the lowercased text they actually run on.
- **Llm-1, Llm-2, Llm-5:** the colliding "strawberry", the label under the
  cube, and the floating axis numbers.

## The deep dives

Four, chosen from the reviewers' candidates (the review summary says why):

| Composition | Title | Narrator | Length | Characters |
| --- | --- | --- | --- | --- |
| `Llm-2-1-AttentionScore` | How one attention score is computed | Drew | 2:27 | 1,846 |
| `Llm-4-1-ConversationCost` | Why a chat's bill grows faster than the chat | Drew | 2:20 | 1,792 |
| `Nlp-2-1-LemmasAndTags` | Lemmatizing needs the part of speech | Hope | 2:27 | 1,784 |
| `Nlp-3-1-ZipfsLaw` | Zipf's law, read off a log-log plot | Hope | 2:07 | 1,653 |

Each opens on its question with no series intro and ends on its takeaway with
no "Next" line, and sits after its unit in the Studio. Each `measure.py`
asserts the lesson's own blocks against the site's recorded output and the
unit video's numbers, so a viewer who watches both sees one story. All four
image batches sat at 0 done for over three hours (through the container
restart and the usage pause) and were made with the direct fallback.

In all, the fourteen videos run 73:00.

## Lesson errors found, not fixed

The builders and reviewers found places where a lesson's prose disagrees
with its own code, or with a source. The videos follow the code and the
sources; the lessons are unchanged, pending the user's decision.

**How Large Language Models Work**

| Lesson | Line | Problem |
| --- | --- | --- |
| evaluating-for-your-task.mdx | 182-184, 300 | "A minute of triage? the cheap model wins" contradicts its own table (about 5¢ per avoided error) |
| evaluating-for-your-task.mdx | 64, 199, 39 | "Twenty examples identify a 15-point gap almost always"; the line above prints 81.3% |
| evaluating-for-your-task.mdx | 171 | `$` printed before the padding (`91%$         83$`) |
| what-benchmarks-measure.mdx | 110-134, 202 | the headroom block's percentages grow near the ceiling, against the prose's "noise" point |
| embeddings.mdx | 128-135 | the position demo sums the vectors, so both sentences print the same `[1.5 1.8]` |
| embeddings.mdx | 6-7 | 11241 is " token" in r50k/p50k; in o200k_base it is 6602 |
| attention-intuition.mdx | 126, 130 | scores already divided by √2 are printed as "raw scores" |
| sampling.mdx | 143-144, 311 | a confident nucleus holds one token, not two (cat alone is 95.6%) |
| context-windows.mdx | 133-134 | "roughly 15,000-fold"; 125² is 15,625, and the lesson's own chart says about 15,600 |
| reasoning-models.mdx | 55-60 | words × 1.3 estimates 72 and 9 tokens; o200k_base counts 106 and 13 |
| token-counts-in-practice.mdx | 190 | ten turns cost "roughly five times" the conversation; its block prints 6.2x |
| token-counts-in-practice.mdx | 68-69 | JSON "roughly doubles" the cost; measured 2.7x, the block's estimate 4.3x |
| tokens.mdx | 130 (and token-counts-in-practice 268, 311) | code at "about three characters per token"; the lesson's sample measures 2.38 |
| tokens.mdx | 98-100 | Japanese or Thai at "two to three times as many tokens" is unchecked, and may be out of date for o200k_base |
| estimating-cost.mdx | 267 | a concept check says the first cache write costs more than input; the lesson's code charges no premium |
| pricing-structure.mdx | 94 | Flash-Lite's ratio printed "8x"; $2.50 / $0.30 is 8.33x |

**Natural Language Processing with Python**

| Lesson | Line | Problem |
| --- | --- | --- |
| the-nlp-pipeline.mdx | 278, 331-334, 481 | "reverse it and one survives": the block keeps all three "the"s |
| the-nlp-pipeline.mdx | 271-273 | "three operations"; the block runs two (no `isalpha()`) |
| stemming-and-lemmatization.mdx | 244-248 | "mice" and "feet" lemmatized; the block uses `pos="v"` and prints them unchanged |
| stemming-and-lemmatization.mdx | 38, 116-117 | the lemmatizer's result "is always a real word"; "was" gives "wa", and unknown words come back unchanged |
| tokenization.mdx | 155-161 | `split(".")` drawn as 4 fragments; Python returns 5 |
| stopwords.mdx | 335, 414 | subtracts "never", which is not on NLTK's list (197 words, not 196) |
| frequency-distributions.mdx | 344-347 | "'a' close behind"; the block prints "text" second, "a" tied third |
| frequency-distributions.mdx | 202 | "the" at about 7% is a Brown corpus figure (Emma: 3.2%) |
| ngrams.mdx | 297-299 | "by n=4 almost every window is unique"; half the 4-grams still repeat |
| interesting-discussions.mdx | 178, 183-184, 232-234 | the top word "twice the second" (to 5,239, the 5,201) and rank × freq "in the same ballpark" (5,239 to 19,752) |
| interesting-discussions.mdx | 327-328 | "the default configuration of every search engine" can't be verified as stated |
| interesting-discussions.mdx | 164-168 | Spärck Jones's 1972 weight is f(N) − f(n) + 1, not log(N/df) |
| interesting-discussions.mdx | 37-38 | "a few dozen" sentences; Hutchins counts just over 60 |
| rule-based-sentiment.mdx | 413, 478 | the reset's stated reason: "not great, but terrible" scores −2 with or without it |
| rule-based-sentiment.mdx | 235 | "phenomenal" scores 0, not +1: it is in neither word list |

One site issue as well: `lib/generated/block-outputs.json` trims the leading
spaces of the first stdout line of estimating-cost's block `f6a0ac7f`.

## Kit suggestions

Every builder copied the same pieces (`Kicker`, the two-ink `Headline`,
`Mark`, `Strike`, `Tag`, `Spot`, `Drift`) from earlier videos, and every
LLM and NLP video built its own token chip. Moving those into
`src/editorial/` is the obvious follow-up, along with a shared
`npm run stills` that bundles once and renders many frames (five builders
wrote their own).
