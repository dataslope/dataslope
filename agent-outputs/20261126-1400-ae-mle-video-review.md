# Machine Learning Engineer and Analytics Engineer interview videos: review

**Reviewed:** the eleven Machine Learning Engineer interview prep videos,
`MachineLearningEngineer-0-Interview` to `-10-LlmEvals` (their first
independent review; built and voiced 2026-11-20), and the ten Analytics
Engineer videos, `AnalyticsEngineer-0-Interview` to `-9-AiSemanticLayer`
(their second; the first was
[`20261120-2300-ae-interview-video-review.md`](20261120-2300-ae-interview-video-review.md)).
All narrated by Drew.

**Result:** 171 findings, **3 P1**, 64 P2, 104 P3, and **every one is fixed**.
2,063 characters were re-voiced, out of 166,649 narrated, all of them new or
corrected sentences; no image was regenerated. Each video has its own review
and fixer's report in
[`20261126-ae-mle-video-review/`](20261126-ae-mle-video-review/) and its
`fixes/`. Every finding gives its time, beat, frame, cause (`file:line`) and
fix. Each fix that changes what is seen or heard has an annotated
before/after comparison (168 in all; see "Comparisons" below).

Severity is the same as in the earlier reviews: **P1** a viewer is likely to
learn something wrong, or the frame has an obvious defect; **P2** noticeable,
hurts the video; **P3** polish.

| Video | Length before → after | P1 | P2 | P3 | Re-voiced (characters) |
| --- | --- | --- | --- | --- | --- |
| MLE 0 The interview, now | 3:06 → 3:22 | 0 | 2 | 4 | 238 |
| MLE 1 Generalization and evaluation | 11:10 → 11:18 | 1 | 4 | 10 | 73 |
| MLE 2 Models and how they learn | 11:23 → 11:27 | 0 | 8 | 10 | 81 |
| MLE 3 Coding for machine learning | 8:58 → 8:59 | 1 | 7 | 5 | 82 |
| MLE 4 Statistics and probability | 10:42 → 11:00 | 1 | 6 | 10 | 174 |
| MLE 5 Deep learning | 11:41 → 11:52 | 0 | 4 | 8 | 120 |
| MLE 6 NLP and LLMs | 11:35 → 12:01 | 0 | 8 | 10 | 355 |
| MLE 7 ML system design | 10:56 → 10:57 | 0 | 2 | 7 | 0 |
| MLE 8 Shipping and monitoring models | 10:32 → 10:32 | 0 | 2 | 3 | 0 |
| MLE 9 Serving LLMs | 7:46 → 7:55 | 0 | 5 | 4 | 106 |
| MLE 10 Evaluating LLM systems | 9:15 → 9:29 | 0 | 6 | 5 | 313 |
| **Machine Learning Engineer** | **1:47:03 → 1:48:51** | **3** | **54** | **76** | **1,542** |
| AE 0 The interview, now | 2:46 → 2:46 | 0 | 0 | 4 | 0 |
| AE 1 Facts, dimensions and grain | 11:45 → 11:46 | 0 | 1 | 3 | 0 |
| AE 2 Dimensions that change | 8:05 → 8:05 | 0 | 1 | 3 | 0 |
| AE 3 How dbt builds a project | 11:10 → 11:21 | 0 | 2 | 2 | 141 |
| AE 4 Incremental models | 8:19 → 8:26 | 0 | 0 | 2 | 105 |
| AE 5 Advanced SQL | 10:58 → 10:58 | 0 | 1 | 2 | 0 |
| AE 6 Warehouses and what they cost | 9:53 → 10:02 | 0 | 1 | 2 | 102 |
| AE 7 Testing and data quality | 9:53 → 9:54 | 0 | 0 | 5 | 0 |
| AE 8 Metrics and the semantic layer | 10:45 → 10:52 | 0 | 2 | 3 | 173 |
| AE 9 AI and the semantic layer | 8:35 → 8:36 | 0 | 2 | 2 | 0 |
| **Analytics Engineer** | **1:32:08 → 1:32:45** | **0** | **10** | **28** | **521** |

## How it was reviewed

The Analytics Engineer review's method
([`20261120-ae-interview-video-review/tools/`](20261120-ae-interview-video-review/tools/)),
with one agent per video reviewing first (read-only, report written), then
fixing every finding, then making the comparisons. The brief is
[`tools/BRIEF.md`](20261126-ae-mle-video-review/tools/BRIEF.md).

- **A frozen copy of the package** (a sparse git worktree of `video/` and
  `app/` at `ecc4cadb`) rendered every "before": frames once a second for all
  21 videos (11,957 frames), contact sheets with repeats dropped (4,728
  tiles), and any before still a comparison needed afterwards.
- **Re-voice only what is necessary**, the owner's instruction: only a
  sentence whose words were wrong, misleading or missing what an
  interviewer presses on, never for style or pacing (pacing was fixed with
  pauses and cues, free). Every changed sentence was split into its own beat
  first, so the rest of its beat was cut from the kept take for free.
  Budgets were 800 characters a Machine Learning Engineer video (400 for the
  overview) and 400 an Analytics Engineer one (250); the largest spend was
  355.
- **Images** only where a finding needed one, on GPT Image 2.6 at quality low
  with a transparent background. None did.
- **Comparisons**: `tools/compare.py` draws each fix as the frame before (red
  numbered boxes) beside the same moment after (green), with what changed and
  the narration before and after; `tools/review_page.py` and
  `review_page.html` collect all 168 into one page by video, with filters by
  series and severity. The images themselves are not committed (36 MB).

## The three P1s

- **MLE 1:** the confusion matrix's "flagged" and "not flagged" headers sat
  half a column to the left of their columns (a centred label given each
  column's left edge), so the matrix read shifted.
- **MLE 3:** after the norm guard was added, the new item's score read
  "0 / 0 = 0" in green: a false equation in the right-answer color.
- **MLE 4:** the video read p = 0.62 as "Nothing there", aloud and on screen,
  the misreading its own question 9 warns against 70 s later. The two words
  were cut from the take (free) and the label reads "no evidence of a gap".

## Wrong things taught, at P2

Not P1 because the narration around them was right, but each would be
repeated in an interview:

- **MLE 2:** the learning-rate range test was read at its minimum; the usual
  reading is a rate where the loss still falls steeply, about a tenth of
  where it turns up.
- **MLE 3:** "roughly thirty times slower" over a bar labelled ×38.
- **MLE 5:** the 2 × 2 max-pooling grid kept the largest magnitude with its
  sign, so four of sixteen cells were wrong.
- **MLE 6:** attention's cost was plotted per token, which drew attention
  as a straight line and the rest of the layer as flat, the opposite of the
  narration; the multi-head figure drew heads as 64-wide slices of the token
  vector.
- **MLE 7:** a new all-null column passed the schema check in green.
- **MLE 9:** 500 GB free at 2.5 GiB a request read as 200 requests; it is at
  most 186 (GiB against GB), now explained.
- **AE 2:** question 5's recommended load joined a Type 2 dimension on the
  customer ID alone, the join question 2 calls the trap; the drawn table had
  quietly dropped the second version that would have broken it.
- **AE 3:** "nobody moves until they choose to" for a new model version; an
  unpinned `ref` follows `latest_version`, which defaults to the highest.
- **AE 8:** month-to-date revenue called a trailing window; it is a window
  from the start of the month (dbt's `grain_to_date`).
- **AE 9:** "last week" in the time-grain slot; it is a filter, the grain is
  "week".

## Series-wide patterns

1. **Answers one step short**, as in every earlier series, fixed with one
   sentence each: when not to use an LLM and why it is asked (MLE 0), the
   precision cost of class weights (MLE 1), gradient checkpointing (MLE 5),
   BPE, vanishing gradients and hosted reasoning models (MLE 6), the
   speculative-decoding verify step (MLE 9), guardrails, a judge's
   calibration bar and the idempotency key (MLE 10), what `on_schema_change`
   leaves empty (AE 4), that warehouse size sets the rate (AE 6).
2. **Figures that contradict their own narration or data**: MLE 6's cost
   chart, MLE 5's pooling grid, MLE 1's one split drawn below its own
   average line, MLE 7's spike that had drained before the queue was named,
   MLE 8's "no user exposed" left beside the canary.
3. **Colors against their meanings**: green on a false equation (MLE 3), on
   numbered discs and sampled units (MLE 10, MLE 4), on "All can pass" for
   tests passing on wrong data (AE 7); data blue on things that are not data
   (AE 6).
4. **Correct statements struck through**: R² as a share of variance (MLE 1),
   two right sums (AE 1).
5. **Results that leave too soon**, in most videos; fixed with pauses, free.

The Analytics Engineer series' first review held: every one of its fixes (126
findings, one fixed in part) was confirmed on screen, and this pass found 38
smaller things, none P1.

## Checks after the fixes

With all 21 in: typecheck, lint, `npm test` (79/79) and `check:cues` pass for
the package; no beat is stale (every beat is timed from its recorded audio).
Every video's fixer passed `check:frames` (`CHECK_SCALE=1`) and
`check:motion` on its final code, and `check:sync` and `check:mix` wherever
it re-voiced (worst beat +0.07 s; effects 28 to 31 LU under the voice).
Every `check.mjs` passes; every existing `results.json` value came back
identical except MLE 4's pooled null, re-binned over ±3 points so its tails
reach zero (p unchanged, 0.619). New values were added through `check.mjs`
only (MLE 1, 2, 6, 9; AE 2, 3). Nothing outside the 21 video folders, their
narration and this review changed: no shared kit, no `content/`, no other
video, no images.

## Process notes

- **The render queue starved.** Two render slots shared by twenty agents,
  each taking whichever slot came free first, left some jobs waiting past
  their two-hour limit (several checks and stills were killed and re-queued).
  The queues are now first come first served (`tools/fifo.py`), and the
  shared type-check is incremental (85 s to seconds after the first run).
  A later review on this machine should start with them.
- Two agents wrote a backup to the same scratch file name; neither lost
  anything (both re-took the file from git), but per-agent scratch folders
  would avoid it.

## Left

- **A page has the AE 8 slip.**
  `content/interview/analytics-engineer/metrics-and-semantic-layer.mdx:253`
  says a cumulative metric "aggregates over a trailing window (rolling
  28-day active users, month-to-date revenue)"; month-to-date is a
  to-date window. The video now says so; the page was out of this review's
  scope.
- **Shared kit:** a combining hat on an italic letter (`<I>θ̂</I>`) renders
  to the right of the letter in the serif. MLE 4 draws its hats as shapes
  instead; other videos that use the combining form may show it.
- **AE 9's `t2s-past`** still runs at 4.4 words a second, as the first
  review left it; slowing it is a re-voice.
- **Not rendered.** No MP4 was made. Every one of the 21 videos changed, so
  `npm run render:all` re-renders all 21 (and `render:series` the two
  tracks).
