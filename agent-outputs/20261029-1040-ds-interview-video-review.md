# Data Scientist interview videos: review

**Reviewed:** the twelve Data Scientist interview prep videos of
[the plan](20261022-0445-data-scientist-interview-video-plan.md),
`DataScientist-0-Interview` to `DataScientist-11-LlmEvaluation` (Drew), 92 minutes
in all, as built and voiced in #715. They had been checked by their builders and by
`check:frames`, `check:motion`, `check:sync` and `check:mix`, but never had an
independent frame review.
**Result:** 219 findings: **8 P1**, 76 P2, 135 P3. Each video has its own report in
[`20261029-ds-interview-video-review/`](20261029-ds-interview-video-review/), every
finding with its time, beat, frame, cause (`file:line`) and a fix.

Severity is the October review's: **P1**, a viewer is likely to misunderstand or
learn something wrong, or the frame has an obvious defect; **P2**, noticeable and
hurts the video; **P3**, polish.

| Video | P1 | P2 | P3 |
| --- | --- | --- | --- |
| 0 Interview (overview) | 0 | 3 | 10 |
| 1 Statistics | 2 | 6 | 9 |
| 2 Probability | 1 | 6 | 12 |
| 3 ML evaluation | 1 | 11 | 12 |
| 4 ML models | 1 | 6 | 12 |
| 5 Deep learning | 0 | 5 | 14 |
| 6 Experiment design | 0 | 6 | 10 |
| 7 Experiments in practice | 0 | 9 | 13 |
| 8 Product sense | 1 | 6 | 11 |
| 9 Python & pandas | 0 | 5 | 11 |
| 10 SQL | 2 | 5 | 8 |
| 11 LLM evaluation | 0 | 8 | 13 |
| **Total** | **8** | **76** | **135** |

## How it was reviewed

As the [October 21](20261021-0551-course-video-review.md) and
[October 23](20261023-1030-nlp-llm-video-review.md) reviews were, with one reviewer
per video reading the timeline, script, scene code, `results.json` and the page in
`content/interview/data-scientist/`, and one change to the materials, made to cut
the cost of looking (`20261029-ds-interview-video-review/tools/`):

- **Frames once a second instead of twice.** 5,519 frames at 1080p, rendered in
  about seven minutes.
- **Contact sheets drop repeats.** A tile is kept only when the picture has changed
  since the last kept one (`sheets.py`), and its label says how long the picture
  holds and which beats start meanwhile. That kept 2,117 of the 5,519 frames: 182
  sheets, where one tile a second would have made about 460. Frames are compared
  small and blurred, because two renders of the same picture differ along every
  glyph edge, which at full size made every frame look new.
- **A cap on full frames.** Reviewers opened 7 to 19 full frames each, only for a
  scene's finished state or a tile that looked wrong.

The brief added a check the course reviews did not need: whether each answer is
right, answers what was asked, and would hold up in an interview. The twelve
reviewers used about 3.8 million tokens between them (210k to 360k each).

## What went right

- **Numbers.** Every reviewer checked every number said or shown against
  `results.json` and the page, and most recomputed the arithmetic by hand. Wrong
  numbers are rare: besides Statistics' chi-square wording and Product sense's
  band (both P1, below), there are a few smaller slips, such as Python & pandas'
  "hundreds of times faster" against the page's 10-100x, an on-screen 21.9% in
  Experiment design that belongs to either arm rather than one, and rounded
  terms in ML models that don't add up to the total shown.
- **The question cards** are read word for word in every video, and every bridge
  leads into how the next video opens.
- **Pacing.** The October problems did not come back: content beats run at about
  2.1 to 3.0 words a second, no gap between beats is under 0.55 s, and scene cuts
  get 1.6 s. Reviewers call the pace comfortable in all twelve.

## Series-wide problems

### 1. Answers stop one step before the follow-up

37 findings, in every video, are about the answer rather than the picture: the
answer is right, but it stops just before the question an interviewer asks next,
which the page usually answers. Examples: Q9 of Experiment design shows peeking's
false positives without saying why or what to do instead; ML evaluation's
cross-entropy item never says to use cross-entropy, or why; ML models' SHAP is
offered as the cure for impurity bias while permutation importance, computed in
`results.json`, is never shown; Deep learning names AdamW without saying why Adam
needs it; Experiments in practice shows Simpson's paradox without defining it;
Product sense's diagnosis of a drop stops at "internal or external". For an
interview video this is the most valuable class to fix, and nearly every fix is one
clause and a re-voiced beat.

### 2. Figures that contradict their own narration

Momentum swings wider than plain SGD while the narration says it "damps the
zigzag" (Deep learning). Ridge's paths collapse to zero on a shared axis, exactly
as lasso's do, under the label "keeps 10 of 10" (ML evaluation). The recalibrated
curve is drawn over the plain model, not the weighted one. The k-means centers
finish moving before the narration describes the move (ML models). DiD prints the
comparison city's +2.4 as "- 2.4" (Experiments in practice). Correct values are
struck through in Statistics and Probability, where a strike means a misreading
everywhere else, and Deep learning strikes the sigmoid but keeps its 0.802 output.

### 3. Colors against the series' meanings

`interview.tsx` fixes one meaning per color (red the trap, green the right answer,
yellow what the narration points at, blue data), and about ten of the twelve
videos break it somewhere. The worst is a P1: ML evaluation paints the rebalanced
PR-AUC of 0.94 green, endorsing the very evaluation the answer warns against.
Others: cross-entropy drawn in red, session breaks in error red (SQL), AdaBoost's
hardest point ringed in green, the observed data in red beside struck misreadings
(Statistics).

### 4. Mechanical defects a check could catch

- **Text on lines.** A line or ring through a key label in a finished figure, in
  five videos, three of them P1 (Statistics' z/t cutoffs, Probability's hats, ML
  models' tree).
- **Highlights on the wrong line.** SQL's four listing highlights land one line off
  (P1), from hard-coded indices.
- **Colors that never reach the page.** Statistics' cutoff labels set CSS `color`
  on SVG `<text>`, which only takes `fill`, so all three draw in black. SQL passes a
  24%-alpha band color as a text ink, so its integer-division fix is barely
  visible (both P1).
- **Under 19px.** Text below the house floor in seven videos, mostly ticks and code
  titles, and in SQL the listings themselves (14 to 18px).
- **`TABULAR` over whole spans.** Four videos show "p - value", "ROC - AUC" and
  "multiple - choice", which `style.ts` already warns about.
- **Blank pages.** Experiment design drops to an empty white page at seven scene
  changes, Deep learning at three and Product sense at one, because scenes clear
  on the bridge's last word instead of at the cut.

`check:frames` measures images, arrowheads and cues but no text. A pass that
reports text under 19px and text boxes crossed by a stroke would have caught most
of this class before review.

### 5. Openings that promise more than the video does

The plan beats of ML evaluation, Deep learning, SQL and LLM evaluation each claim
something the video does not deliver ("each a real model fitted in Python", "seven
get worked through with real arithmetic"), and the overview tells viewers every
page has runnable challenges (four of nine do).

## The eight P1s

**All eight are fixed** in the commit after this review, each checked against a
render of the moment it names. Statistics' `chi` beat is the only narration
re-voiced. Product sense's band is now labelled with its width (±2 standard
deviations, about ±5%) rather than re-narrated, since the "about three percent"
the narration says is the one-SD figure and is right. SQL's highlights now find
their line by its text (`lineOf` in `ds-sql/parts.tsx`), so they cannot drift
again.

| Video | When | Finding | Cause |
| --- | --- | --- | --- |
| 1 Statistics | 441-446 s | The narration says "the squared gaps sum to eleven point nine"; the formula on screen divides each by its expected count. | `ds-statistics/script.ts:211` |
| 1 Statistics | 403-416 s | The 1.96, 2.04 and 2.57 cutoff labels sit on each other's lines and render black. | `ds-statistics/ZtScene.tsx:49-60` |
| 2 Probability | 248-261 s | The mean line runs through bar 1's "37%" and the match's ring through its person number, on a frame held 8 s. | `ds-probability/ExpectScene.tsx:208-263` |
| 3 ML evaluation | 322-336 s | The rebalanced PR-AUC 0.94 is green, the right-answer color. | `ds-ml-evaluation/AucScene.tsx:168` |
| 4 ML models | 132-149 s | Dashed links cross "weighted: 0.11" and the Gini curve crosses "0.11, the lowest". | `ds-ml-models/TreeScene.tsx:319-322, 431` |
| 8 Product sense | 231-249 s | The "normal band" is mean ± 2 SD (about ±5%) but is labelled and narrated as "about ±3%", the one-SD figure. | `ds-product-sense/NoiseScene.tsx:118-137`, `check.mjs:80` |
| 10 SQL | 109-346 s | Four code highlights mark the line next to the clause the narration names. | `ds-sql/RateScene.tsx:86`, `SessionScene.tsx:179`, `RapidScene.tsx:191, 223` |
| 10 SQL | 131-146 s | The integer-division fix, 0.1200, is drawn in a 24%-alpha green and never becomes readable. | `ds-sql/RateScene.tsx:137, 144` |

I checked five of these against the code or a frame myself (both of Statistics',
Product sense's band, SQL's highlight at 232 s, ML evaluation's green); the other
three stand on their reviewers' frames and `file:line`
references.

## The P2s

**All 76 are fixed**, one fixer per video working to
[`tools/FIX-BRIEF.md`](20261029-ds-interview-video-review/tools/FIX-BRIEF.md);
each fixer's report, with every P2 by number and what changed, is in
[`20261029-ds-interview-video-review/fixes/`](20261029-ds-interview-video-review/fixes/).
A finding's suggested fix was a suggestion, and several fixers found a better
one. Every video passed typecheck, lint, `check:cues`, `npm test`,
`check:motion`, `check:sync` and `check:mix` on its final code, and the whole
package passed all four static checks together once every video was in.

| Video | P2s | Characters re-voiced | Length before → after |
| --- | --- | --- | --- |
| 0 Interview | 3 | 507 | 1:58 → 2:10 |
| 1 Statistics | 6 | 1,288 | 10:33 → 11:34 |
| 2 Probability | 6 | 757 | 7:44 → 8:22 |
| 3 ML evaluation | 11 | 997 | 8:33 → 9:31 |
| 4 ML models | 6 | 711 | 9:41 → 10:24 |
| 5 Deep learning | 5 | 845 | 9:55 → 10:29 |
| 6 Experiment design | 6 | 958 | 8:13 → 9:19 |
| 7 Experiments in practice | 9 | 1,240 | 7:24 → 8:21 |
| 8 Product sense | 6 | 828 | 7:23 → 8:11 |
| 9 Python & pandas | 5 | 466 | 6:51 → 7:28 |
| 10 SQL | 5 | 487 | 6:21 → 6:40 |
| 11 LLM evaluation | 8 | 611 | 7:17 → 7:57 |
| **Total** | **76** | **9,695** | **91:54 → 100:26** |

Every video stayed under its 1,500-character budget. Beats were split at
sentence breaks before any rewording, so only the changed sentences were
voiced; every other beat's audio was checked against the committed file and is
unchanged. The added 8.5 minutes is almost all answers carried one step
further.

Four calls a fixer made that change what the video claims, worth knowing:

- **ML evaluation's elastic net is fitted at `l1_ratio` 0.9, not 0.5.** At 0.5
  its "keeps both correlated features" rested on s1 = -0.24 and failed in 8 of
  30 bootstrap resamples; at 0.9 it keeps both in 37 of 50, and still zeroes
  age. The page names no mix.
- **Deep learning's momentum narration was changed, not its figure.** At beta
  0.9 the computed path swings wider than plain descent, so "damps the zigzag"
  became "swings in slow waves instead of flipping every step".
- **Python & pandas' timings are the committed run's** (409.5 ms and 0.9 ms):
  the machine was too loaded during the pass to time a million-row loop
  fairly. `data.ts` now refuses a re-run whose timings stop fitting the
  narration.
- **ML models now answers past the page**: permutation importance, which the
  page's SHAP answer does not mention, from numbers already in `results.json`.

## The P3s

**All 135 are done**: 132 fixed and 3 partly fixed, where the suggested fix did
not fit the frame or the voice budget (Probability's Poisson conditions,
Deep learning's page-check beat, Experiment design's plan card). Three were
shared with the Data Analyst videos and fixed once, centrally: listing
highlights start at the code rather than its indent (`da-pandas`, `da-sql`),
inline code in `QMono` no longer sets a double-width space, and the shared
`Axes` titles drop tabular figures. The rest were fixed per video, to
[`tools/P3-BRIEF.md`](20261029-ds-interview-video-review/tools/P3-BRIEF.md);
each fixer's report is in
[`20261029-ds-interview-video-review/p3/`](20261029-ds-interview-video-review/p3/).

| Video | P3s | Characters re-voiced | Length before → after |
| --- | --- | --- | --- |
| 0 Interview | 10 | 363 | 2:10 → 2:16 |
| 1 Statistics | 9 | 187 | 11:34 → 11:38 |
| 2 Probability | 12 | 905 | 8:22 → 8:51 |
| 3 ML evaluation | 12 | 491 | 9:31 → 10:00 |
| 4 ML models | 12 | 586 | 10:24 → 10:48 |
| 5 Deep learning | 14 | 902 | 10:29 → 10:58 |
| 6 Experiment design | 10 | 564 | 9:19 → 9:56 |
| 7 Experiments in practice | 13 | 645 | 8:21 → 8:52 |
| 8 Product sense | 11 | 424 | 8:11 → 8:36 |
| 9 Python & pandas | 11 | 511 | 7:28 → 7:50 |
| 10 SQL | 8 | 319 | 6:40 → 6:50 |
| 11 LLM evaluation | 13 | 493 | 7:57 → 8:16 |
| **Total** | **135** | **6,390** | **100:26 → 104:51** |

(A P3 already fixed in the P2 pass is counted with its video.) Every video
stayed under its 1,000-character budget, and every video passed the same
checks as the P2 pass on its final code; the whole package passed typecheck,
lint, `npm test` and `check:cues` together once all twelve were in.

This pass cut beats from the kept takes wherever their text was still in one,
with narrate's own `--recut` run on a scratch copy of a single take; every
untouched beat it re-cut came back byte-identical, so those pieces are a single
encode. Pieces whose text is in no take (a beat already re-voiced alone) were
cut from the beat's own file, one extra MP3 encode of the same speech (27 to
31 dB SNR against the committed file, same alignment and length). Four beats
split that way in the P2 pass (ML models' `tree-gini`, `tree-stop`, `ada`,
`adaboost`) could be re-cut from their takes the same way if that matters.

## What the fixers kept running into

The briefs kept the fixers out of the shared kit, so none of these were changed
in the fix passes. **All but the last are fixed** in the commits after the P3
pass, each in its own commit:

- **`narrate --recut` refused a whole video once any take was stale.** Every
  video whose beats were re-voiced alone after their take (most of this
  series, after #715's initialism pass) hit it, and the fixers wrote a
  `recut-take.mjs` per video to get round it. **Fixed** (`60cdd9af`): narrate
  finds each beat in the kept takes by its text (`locateBeats` in
  `src/narration/takes.ts`). A beat split at a sentence break is then cut from
  its take for free. `--recut` cuts every take that still matches the script,
  and never replaces a beat that was voiced alone. Run on all 59 voiced
  videos, it changes nothing in git.
- **SVG `<text>` takes `fill`, not CSS `color`**, so `label()` and `note()` on
  SVG text drew black. It caused Statistics' P1 and Probability's hat numbers.
  **Fixed** (`28028299`): `svgText()` in `style.ts` carries the color to
  `fill`, at 28 sites, and `svgText.test.ts` fails on SVG text styled without
  it.
- **`TABULAR` spread over whole spans** widened hyphens ("p - value", "ROC -
  AUC", "held - out") in most of the videos. **Fixed** (`447cd12c`): a `Num`
  wrapper puts tabular figures on the number only, and `tabular.test.ts`
  flags `TABULAR` over hyphenated literal text (it cannot see runtime values;
  the Data Analyst review found two). `Axes` sets negative ticks with U+2212.
- **`Axes` took plain strings** for its titles and ticks, so a superscript tick
  or a title that changes partway (CUPED's Y to Y_adj) had to be drawn locally.
  **Fixed** in the same commit: titles and tick formats take React nodes.
- **`QuestionCard` left one-word orphans.** **Fixed** (`2bb70ed8`): it wraps
  with `textWrap: "balance"` and keeps hyphenated words on one line.
- **`check:cues` missed cues behind a one-argument wrapper**
  (`const w = (p) => n.word("ai", p)`). **Fixed** (`9986f25b`): the scanner
  resolves both wrapper shapes, with tests.
- **`check.mjs` could not run as its header says** in a fresh container,
  because the repo root has no `node_modules`. **Documented** (`1c95dd1b`): the
  video README says the engines come from the repo root and need its `npm ci`.
- **`Drift` eased in over the whole scene**, so lengthening a scene slowed its
  opening and could fail `check:motion` on a card that did not change.
  **Fixed** (`b223fbec`): `drift()` in `motion.ts` reaches full speed in two
  seconds and then holds it, whatever the scene's length. `check:motion` is
  being re-run on all 21 interview videos after the change; every one finished
  so far passes.
- **The render queue's waits counted against a job's time limit**, so several
  checks were killed before they started. That queue was the review's scratch
  tooling, not part of the repository, so there is nothing to change here.

## Beyond the videos

- **`content/interview/data-scientist/sql.mdx:244`** said the default window frame
  for `SUM(x) OVER (ORDER BY day)` is `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT
  ROW`. With an `ORDER BY` the default is `RANGE`, which sums tied rows together;
  that difference is the usual follow-up. Found by the SQL reviewer, checked here.
  **Fixed**, along with the same sentence on the Data Engineer SQL page
  (`content/interview/data-engineer/sql.mdx`). The Data Analyst pages and the SQL
  course already said `RANGE`.

## Order of work

**Done:** every step below, in the commits after this review.

1. **The eight P1s.** Each is a few lines of scene code, and Statistics' chi-square
   needs one beat re-voiced.
2. **Shared fixes that clear findings in several videos at once:** `TABULAR` only on
   the number spans; `fill` on Statistics' SVG labels; SQL's highlights found by
   content (`lines.findIndex(...)`) rather than by index; the highlight indent in
   `da-pandas/parts.tsx`, which Python & pandas shares with Data Analyst Part 2; a
   19px sweep.
3. **The answer findings**, video by video, re-voicing only the beats whose words
   change, as the earlier fix passes did.
4. **Figures against their narration**, then the rest of the P2s.
5. **P3s** where a P2 fix already touches the scene.
6. **The page fix** in `sql.mdx`, outside the videos.

The Data Analyst series (nine videos, #715) has now had the same review:
[`20261029-2148-da-interview-video-review.md`](20261029-2148-da-interview-video-review.md).
