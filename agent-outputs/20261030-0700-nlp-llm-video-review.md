# NLP and LLM course videos: review of the deep dives

**Reviewed:** the four deep dives built in the
[October 23 fix pass](20261023-1530-nlp-llm-video-fixes.md) and never reviewed
since: `Llm-2-1-AttentionScore`, `Llm-4-1-ConversationCost` (Drew),
`Nlp-2-1-LemmasAndTags` and `Nlp-3-1-ZipfsLaw` (Hope), 9:21 in all.
**Result:** 48 findings: **2 P1**, 17 P2, 29 P3. Each video has its own report in
[`20261030-nlp-llm-video-review/`](20261030-nlp-llm-video-review/), every
finding with its time, beat, frame, cause (`file:line`) and a fix.
**Fixed:** all 48, in the commits after this review (see [The fixes](#the-fixes)),
with three lesson corrections and one in the unit video the deep dive follows.

## Why only the deep dives

The ten unit videos (`Llm-1` to `Llm-5`, `Nlp-1` to `Nlp-5`) had a full review
on October 23 ([167 findings](20261023-1030-nlp-llm-video-review.md)), a fix pass
that fixed 156 and partly fixed 11, and a
[follow-up](20261024-1400-nlp-llm-lesson-fixes-and-followups.md) that closed the
11. Reviewing them again would cost as much as a first review for what would be
mostly a regression check. They got the automated checks instead, which have
grown since October: `check:frames` on all fourteen videos passes (51
illustrations, none stretched; 112 arrows, every head on a straight end; no
hyphen set in tabular figures; every word cue names its occurrence), and
`npm test` (69/69), which fails on SVG text drawn black, passes across the
package.

## How it was reviewed

As the interview reviews were, with their tools pointed at `Llm-*` and `Nlp-*`
(`20261030-nlp-llm-video-review/tools/`): frames once a second, contact sheets
that drop repeats (301 of 562 frames kept, 28 sheets), and a cap on full frames.
One reviewer per video read the timeline, script, scene code,
`measurements.json` and the lesson(s) it follows. The four reviewers used about
1.07 million tokens between them.

| Video | Length | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| Llm-2-1 Attention score | 2:27 | 1 | 5 | 8 |
| Llm-4-1 Conversation cost | 2:20 | 1 | 5 | 7 |
| Nlp-2-1 Lemmas and tags | 2:27 | 0 | 2 | 7 |
| Nlp-3-1 Zipf's law | 2:07 | 0 | 5 | 7 |
| **Total** | **9:21** | **2** | **17** | **29** |

## What went right

Every number on screen and in the narration matches the video's
`measurements.json` and the lesson's own code, in all four. No overlap, clipping
or text under 19px beyond one 16px superscript. Each figure is built in step
with the words, and each scene holds its finished state before the cut.

## The two P1s

Both are claims the video's own figures contradict. I checked both against the
measurements.

| Video | When | Finding | Cause |
| --- | --- | --- | --- |
| Attention score | 110-112 s | "So it lands nearest trophy's value": the blended vector (4.85, 3.21) is 4.44 from the value of `it` and 6.07 from trophy's, and Fig. 9 draws it that way while a ring pulses on "nearest". Trophy only pulls hardest; the lesson and the unit video say "pulled toward". | `llm-attention-score/script.ts:148`, `BlendScene.tsx:112` |
| Conversation cost | 123-132 s | "Start a fresh one" prices eight five-turn chats ($0.42) against one forty-turn chat ($1.19) without the cache, right after the cache scene struck $1.19 out. With the cache the video recommends, the pair is $0.239 against $0.256: the 2.8x saving becomes about 7%. | `llm-conversation-cost/FreshScene.tsx:91-109`, `measure.py:241-248` |

## What recurred

The same pattern as the interview reviews, in a course register: an
explanation that stops one step before the point the lesson makes.

- **Lemmas and tags** never shows the sentence lemmatized *without* tags, the
  before-and-after the lesson prints, and leaves Penn Treebank tags, "J" and
  WordNet unexplained in a video meant to stand alone.
- **Attention score** asserts why scores are scaled over a static table, and
  never says the lesson keeps only three tokens or why a token scores itself.
- **Conversation cost** says caching "goes after the triangle" while its
  figure discounts the system prompt too, and gives "put whatever never changes
  first" without the prefix rule that makes it true.
- **Zipf's law** uses two different lines as "the prediction" (Fig. 2's fit and
  Fig. 3's one-over-rank from the top word), draws "slope minus one" as a 3:1
  triangle, says log axes are bad at shares without saying what they suggest,
  and brings in IDF in its last four seconds, unexpanded.

Pacing is the other thread: each video has one stretch where a new idea
arrives at 3.2 to 3.5 words a second (Zipf's law and its slope, the cache
beat, the divide step, `alone`).

## The fixes

**All 48 fixed**, one fixer per video working through its report in order (P1,
then P2s, then P3s), to
[`tools/FIX-BRIEF.md`](20261030-nlp-llm-video-review/tools/FIX-BRIEF.md). Each
fixer's report is in
[`20261030-nlp-llm-video-review/fixes/`](20261030-nlp-llm-video-review/fixes/).

| Video | Findings | Characters re-voiced | Length before → after |
| --- | --- | --- | --- |
| Llm-2-1 Attention score | 14 fixed | 991 | 2:27 → 3:03 |
| Llm-4-1 Conversation cost | 13 fixed | 685 | 2:20 → 2:57 |
| Nlp-2-1 Lemmas and tags | 9 fixed | 604 | 2:27 → 2:51 |
| Nlp-3-1 Zipf's law | 12 fixed | 611 | 2:07 → 2:26 |
| **Total** | **48** | **2,891** | **9:21 → 11:17** |

Every video stayed under its 1,200-character budget and passed typecheck, lint,
`npm test`, `check:cues`, `check:motion`, `check:sync`, `check:mix` and
`check:frames` on its final code. Beats were split at sentence breaks and cut
from the kept takes before any rewording; every untouched beat is
byte-identical to its committed file.

**Numbers.** Each `measure.py` ran in a scratch environment with the versions
the site runs (NLTK 3.9.4, NumPy 2.4.6, the NLTK data packages), and
reproduced its committed file before any change. Every existing value came back
identical; the new ones are additions: Attention score's distance from the new
vector to each value (with an assertion that the nearest is the pronoun's own,
so the P1 cannot return) and the weights without the scaling; Conversation
cost's cached fresh-chat pair (asserted within 10%). The two NLP files now
record Python 3.13.17.

**Illustrations.** Zipf's law's sieve and balance were redrawn so red means
dropped throughout (blue pebbles kept, red grit falling through).

**Lessons, corrected to match** (`8bf1cc0f`, `ddc7fe81`):

- `pos-tagging`: without a part of speech, "were" and "had" survive unchanged
  too, not only "running" and "eaten".
- `estimating-cost`: the "40 turns cost more than eight 5-turn chats" point
  holds without a cache; cached, the gap nearly closes, and the reason left
  to start fresh is accuracy.
- `attention-intuition`: a decoder scores itself and every earlier token,
  never a later one (the lesson's own caption said so; its description,
  explanation, callout, cost section and concept check said "every other
  token"), so about $n^2/2$ comparisons.

**The unit video.** `Llm-2-Meaning` made the same claim in its Scene 10
("Every token scores every token, itself included. Ten tokens make a hundred
scores."). Corrected: ten tokens make 55 scores and twenty make 210, nearly
four times, computed in `measure.py` from a causal mask; Fig. 16 draws only the
scored half, and the head grids, the attention column of the transformer
block and one headline drop the later links too. 189 characters re-voiced,
6:48 → 6:53, every check passing
([`fixes/Llm-2-Meaning.md`](20261030-nlp-llm-video-review/fixes/Llm-2-Meaning.md)).

