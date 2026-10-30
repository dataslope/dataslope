# Data Analyst interview videos: review

**Reviewed:** the nine Data Analyst interview prep videos, `DataAnalyst-0-Interview`
to `DataAnalyst-8-AiAssisted` (Drew), 65 minutes in all, as built and voiced in
#715. Like the Data Scientist set before
[its review](20261029-1040-ds-interview-video-review.md), they had been checked by
their builders and by `check:frames`, `check:motion`, `check:sync` and
`check:mix`, but never had an independent frame review.
**Result:** 165 findings: **8 P1**, 66 P2, 91 P3. Each video has its own report in
[`20261029-da-interview-video-review/`](20261029-da-interview-video-review/), every
finding with its time, beat, frame, cause (`file:line`) and a fix.
**Fixed:** 163 of the 165 findings in the commits after this review (six of
them in shared code), and the other two partly (see [The fixes](#the-fixes)).

Severity is the same as in the October reviews: **P1**, a viewer is likely to
misunderstand or learn something wrong, or the frame has an obvious defect;
**P2**, noticeable and hurts the video; **P3**, polish.

| Video | Length | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| 0 Interview (overview) | 1:41 | 0 | 2 | 13 |
| 1 SQL | 8:02 | 0 | 7 | 10 |
| 2 Pandas | 9:07 | 2 | 11 | 7 |
| 3 Statistics & communication | 8:17 | 1 | 5 | 13 |
| 4 Advanced SQL | 6:36 | 1 | 9 | 8 |
| 5 Spreadsheets | 7:21 | 0 | 9 | 9 |
| 6 Visualization | 9:47 | 2 | 6 | 12 |
| 7 A/B testing | 9:06 | 0 | 8 | 11 |
| 8 AI-assisted analysis | 5:26 | 2 | 9 | 8 |
| **Total** | **65:23** | **8** | **66** | **91** |

## How it was reviewed

With the Data Scientist review's method and tools, unchanged
(`20261029-da-interview-video-review/tools/`): one reviewer per video, reading the
timeline, script, scene code, `results.json` and the page in
`content/interview/data-analyst/`.

- **Frames once a second.** 3,926 frames at 1080p.
- **Contact sheets that drop repeats** kept 1,438 of them, on 123 sheets.
- **A cap on full frames.** Reviewers opened a full frame only for a scene's
  finished state or a tile that looked wrong.

The brief also listed what the Data Scientist passes had already fixed in the
shared kit, so that a reviewer who saw one of those defects anyway would report
it as a fix that missed a case. Two of those fixes had (below).

## What went right

- **Numbers.** Every reviewer checked every number said or shown against
  `results.json` and the page, and most re-derived them by hand. Three are wrong
  or misleading, all P1 (below): the variance in Statistics & communication, the
  "about 8x" in Visualization and "half the month" in AI-assisted analysis.
- **Layout.** Large tables and figures, consistent placement, and almost no
  overlap or clipping: one SQL line runs out of its panel in AI-assisted
  analysis, and a note runs into a neighbouring label in A/B testing and in
  Visualization.
- **Pacing.** Comfortable in all nine: content beats at about 2.0 to 3.0 words a
  second, no gap between beats under 0.55 s, 1.6 s at scene changes. The densest
  beats (3.2 to 3.5 words a second) are the ones packing two definitions into a
  sentence, such as `pvalue-not` in A/B testing and `r-percent` in Advanced SQL.
- **The worked answers are drawn, not listed.** Spreadsheets builds each answer as
  a live sheet with range outlines and a formula bar. Visualization draws each
  chart wrong and then right. Both reviewers singled this out.

## Series-wide problems

### 1. Answers stop one step before the follow-up

41 findings, in every video, are about the answer, not the picture. They are
the same kind as in the Data Scientist set: the answer is right, but it stops
just before the question an interviewer asks next, and the page usually answers
that question. Examples:

- A/B testing defines the p-value without ever saying what to do with 0.0003, so
  0.05 first appears unexplained in the next question.
- It shows peeking on one A/A run but never says why each look raises the false
  positive rate.
- Its ratio-metric answer names the trap but not the fix (sum, then divide).
- Advanced SQL never gives `ROW_NUMBER` a tiebreaker.
- SQL never says when to pick a CTE over a subquery.
- Pandas never says that pivot_table defaults to the mean.
- Spreadsheets offers IFNA as the fix while the stray-space key it hides is still
  on screen.
- Visualization never says "use a colorblind-safe palette".
- AI-assisted analysis says "test it" without saying how.

As before, this is the most valuable class to fix, and nearly every fix is one
clause in a re-voiced beat.

### 2. Figures that contradict their own narration

- **Visualization** puts a green tick on "right axis from zero" in its dual-axis
  answer. That is one of two equally arbitrary axes, and the narration says so
  seconds later (P1).
- **Pandas** computes Q5's share from a `transform("sum")` column the table
  doesn't show. The only transform column on screen holds means (P1).
- **A/B testing** never shows the area its p-value definition is about. Its
  Type I/II figure shades a left tail the narration never mentions.
- **Spreadsheets** sets "the fourth argument: FALSE" under two XLOOKUPs whose
  fourth argument is "Not found", and heads the approximate formula "exact".
- **Advanced SQL** defines the window frame with no frame drawn.
- **Statistics & communication** strikes through two correct statements, as two
  of the Data Scientist videos did.

### 3. Colors against the series' meanings

`interview.tsx` gives each color one meaning: red is the trap, green the right
answer, yellow what the narration points at, blue data. Eight of the nine videos
break it somewhere:

- Visualization's green tick on an arbitrary axis (P1), and its July bar in trap
  red.
- A/B testing fills the significant dots green in the question that warns
  against treating significance as a win.
- AI-assisted analysis marks the right practice with red crosses.
- SQL paints every null error red, including correct ones.
- A/B testing prints its p-value in trap red.

### 4. Shared code: two series fixes missed cases, and four new bugs

The fixes made in the Data Scientist passes held up in the other places they
reach, with two exceptions:

- **Double-width spaces in inline code.** The `QMono` fix missed `Mono`, the
  other inline-code component, in the overview's `GROUP BY`. **Fixed** during the
  review (`7f0a798c`), because it was a one-line change in shared code. Two raw
  `fontFamily: MONO` spans in Spreadsheets
  (`da-spreadsheets/RapidScene.tsx:182`, `PivotScene.tsx:192`) are still open.
- **`TABULAR` over hyphenated text.** It is back in Spreadsheets, where every
  sheet cell spreads it ("P - 101", "2024 - 01", `da-spreadsheets/parts.tsx:237`),
  and in AI-assisted analysis ("Hand - label", `da-ai-assisted/RapidScene.tsx:180`).
  The `npm test` guard reads only literal text, and both strings arrive as values.

The new bugs are all in the shared `parts.tsx` of `da-sql` and `da-pandas`, so
they reach several videos each:

- **`DataTable` draws only a cell's first mark.** Five highlights that the
  narration cues never appear: three in Pandas and two in Advanced SQL. The worst
  is Pandas Q10, where yellow stays on ffill while bfill "borrows from the
  future" (`da-pandas/parts.tsx` ~823, `da-sql/parts.tsx` ~778).
- **The console box is 22px short**, so its last line hangs below it, in every
  console in Pandas. Padding comes out of an explicit height under border-box
  sizing (`da-pandas/parts.tsx:452-456`). Data Scientist's Python & pandas
  imports the component but never draws one.
- **The SQL highlighter lacks the frame keywords**: `QUALIFY`, `ROWS`, `RANGE`,
  `BETWEEN`, `UNBOUNDED`, `PRECEDING`, `FOLLOWING`, `CURRENT`, `ROW`,
  `RECURSIVE` (`da-sql/parts.tsx:243-248`).

- **`Strike` climbs on a long phrase.** Its fixed `rotate(-2deg)` rises about
  24px over AI-assisted analysis's 680px phrase, where it reads as an overline
  (`da-sql/parts.tsx:199`). An angle that shrinks with length would fix it
  everywhere.

**All fixed** in shared code before the per-video pass (`b59eed8f`): every mark
on a cell draws, in cue order; the console box is `consoleHeight()` tall; the
highlighter knows the frame keywords; `Strike` tilts less over a long phrase;
and `check:frames` now fails on a hyphen set in tabular figures in the drawn
page, values included (`PageAudit`, `src/editorial/audit.tsx`), which caught both
missed cases before they were fixed. SQL nulls went soft grey italic in the
same commit (SQL's P3 9).

And as in the Data Scientist set, **text under 19px** in five videos:
Visualization sets every axis tick and category label at 15 to 18px, and Advanced
SQL, Spreadsheets, A/B testing and AI-assisted analysis each have a listing or a
set of labels below the floor.

### 5. Blank pages and late pictures

Every video passes through an empty or near-empty page somewhere:

- At a scene change: about 1 s in the overview, SQL, Advanced SQL and A/B
  testing, 1.5 s in AI-assisted analysis, and 2 to 4 s in Statistics &
  communication, Spreadsheets and Visualization. The cause is
  the one found in the Data Scientist set: a scene clears on its bridge's last
  word, or opens on a cue that comes after the cut.
- While a rule is explained over a near-empty page: 11 s in Visualization's
  Question 7, 23 s in A/B testing's Q10, and Pandas Q8 shows an empty page while
  "Pass a list" is said.

### 6. Openings and cards that say more than the video

- **The overview** repeats the Data Scientist overview's claim that every page
  has runnable challenges. Four of eight have one, and the 110 questions are a
  separate page.
- **SQL's hook** promises ten traps, but four of its ten questions have none.
- **Visualization** promises all seventeen questions "twice, the wrong way and
  the right way", which it doesn't deliver.
- **Two question cards don't match what is read:** Advanced SQL's Question 7
  ("and why does it matter?" is never read or answered) and Visualization's
  Question 7.

## The eight P1s

**All eight are fixed**, each checked on a still of the moment it names. Before
the fixes I checked four against the code myself (the variance, the 8x, the ROWS
ordering and "half the month"); the other four stood on their reviewers' frames
and `file:line` references.

| Video | When | Finding | Cause |
| --- | --- | --- | --- |
| 2 Pandas | 142-158 s | Q5's share divides by a region total from `transform("sum")`, but the only transform column on screen holds Q4's means. | `da-pandas/GroupbyScene.tsx:71-77` |
| 2 Pandas | 315-336 s | Q12's demo drops the page's `.copy()` and marks the result green as the safe path. On pandas 2 this is the SettingWithCopyWarning that Q11 teaches. | `da-pandas/CopyScene.tsx:196`, `data.ts:178` |
| 3 Statistics & communication | 428-443 s | Variance is defined as "the average squared distance from the mean" and drawn with deviations whose squares average 200, then reported as 250. The n - 1 is a grey footnote. | `da-statistics-communication/script.ts:300-302`, `RapidScene.tsx:115-135` |
| 4 Advanced SQL | 172-206 s | The ROWS demo orders by a `day` that ties, so its 350 and 425 depend on engine order. That is the opposite of the page's advice: a unique ordering plus an explicit ROWS frame. | `da-advanced-sql/check.mjs:197`, `script.ts:165-178` |
| 6 Visualization | 347-371 s | "top left 20%, bottom right 2%: about 8x" is 10x as printed, and the shares come from a model in the chart spec, not a measurement. | `da-visualization/DashScene.tsx:120-124`, `script.ts:239-241` |
| 6 Visualization | 283-309 s | Question 9 gives a green tick to "right axis from zero", one of the two arbitrary axes. The fitted panel doesn't show the rise it is crossed out for. | `da-visualization/DualScene.tsx:133-144` |
| 8 AI-assisted analysis | 140-145 s | "The assistant missed more than half the month": the BETWEEN bug drops one day, which here holds 51.8% of the revenue. | `da-ai-assisted/script.ts:138`, `MistakesScene.tsx:42, 148` |
| 8 AI-assisted analysis | 161-170 s | "Then fan-out, the business rules it couldn't know, and invented columns. Those fail loudly." groups fan-out with the loud failures, the reverse of question 2. | `da-ai-assisted/script.ts:148`, `MistakesScene.tsx:166-179` |

## The fixes

**Done**, in the order the review proposed: the shared-code bugs first, then one
fixer per video working through its report in order (P1s, then the answer
findings, then the other P2s, then the P3s), to
[`tools/FIX-BRIEF.md`](20261029-da-interview-video-review/tools/FIX-BRIEF.md).
Each fixer's report, with every finding by number and what changed, is in
[`20261029-da-interview-video-review/fixes/`](20261029-da-interview-video-review/fixes/).

| Video | Findings | Characters re-voiced | Length before → after |
| --- | --- | --- | --- |
| 0 Interview | 15: 14 fixed, 1 done centrally | 1,529 | 1:41 → 2:20 |
| 1 SQL | 17: 16 fixed, 1 done centrally | 1,905 | 8:02 → 9:37 |
| 2 Pandas | 20 fixed (one half done centrally) | 1,320 | 9:07 → 10:24 |
| 3 Statistics & communication | 19 fixed | 2,091 | 8:17 → 10:09 |
| 4 Advanced SQL | 18: 16 fixed, 2 done centrally | 1,178 | 6:36 → 7:54 |
| 5 Spreadsheets | 18: 17 fixed, 1 done centrally | 476 | 7:21 → 7:52 |
| 6 Visualization | 20: 19 fixed, 1 partly | 1,173 | 9:47 → 10:39 |
| 7 A/B testing | 19 fixed | 1,646 | 9:06 → 10:31 |
| 8 AI-assisted analysis | 19: 17 fixed, 1 partly, 1 done centrally | 1,973 | 5:26 → 6:35 |
| **Total** | **165** | **13,291** | **65:23 → 76:01** |

Every video stayed under its 2,500-character budget, and every video passed
typecheck, lint, `npm test`, `check:cues`, `check:motion`, `check:sync`,
`check:mix` and `check:frames` on its final code; the whole package passed
typecheck, lint, `npm test` (69/69), `check:cues` and the site's prose check
together once all nine were in. Beats were split at sentence breaks before any
rewording and cut from the kept takes with `narrate --recut`, so every beat a
fixer did not mean to change is byte-identical to its committed file. Most of the
added 11 minutes is answers carried one step further.

**Values.** Every number still comes from a video's `check.mjs`. Every existing
value in each `results.json` came back identical, except where a finding was
about that value: Advanced SQL's `moving_avg_3` is now `DECIMAL` (the same
numbers, two decimals), Pandas' sort ranks (the data now has a tie, so dense and
min rank differ), Statistics & communication's normal areas (exact, not
simulated) and its population samples (20 means, the first three unchanged), and
Visualization's encoding row, renamed "Color saturation" after the page chart.

**Left partly done:**

- **Visualization, P3 14:** the page's "design for the audience" line for
  Question 11 is not said.
- **AI-assisted analysis, P3 18:** Question 9 now says to rerun a sample to
  confirm the labels repeat, but not to report which categories the model
  confuses; the beat already runs 18 s.

**Shared changes made after the pass**, from the fixers' notes (`179f70dc`):
`Ink` multiplies a caller's opacity into its own fade-out instead of letting it
win, so a dimmed element passed an `out` fades rather than snapping off (13 call
sites in nine videos, nothing ending later than before); a header-less
`DataTable` drops its stray hairline; and the highlighter colors `DAY`, so
`INTERVAL 1 DAY` reads as one phrase. One suggestion is not done: a character
range on a listing mark, so Pandas' Q8 could mark just its `on=[...]` list.

**What the fixers ran into.** Several kept takes letter-space initialisms ("A I",
"N A", "S K U", "M D E") from before the acronym rule, so a sentence holding one
cannot be cut from the take for free and had to be voiced. Three fact runners
needed engines the repo root has not installed: Spreadsheets' HyperFormula
(fetched with `npm pack` into scratch, nothing installed), and two `check.mjs`
files that import `charts/_theme.mjs`, which loads Observable Plot and linkedom
at import time although neither is called (stubbed with a resolver hook).
