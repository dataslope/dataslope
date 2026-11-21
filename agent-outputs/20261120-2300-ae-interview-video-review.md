# Analytics Engineer interview videos: review

**Reviewed:** the ten Analytics Engineer interview prep videos,
`AnalyticsEngineer-0-Interview` to `AnalyticsEngineer-9-AiSemanticLayer`
(Drew), 1:30:02 as built on 2026-11-20. Their builders checked them with
`check:frames`, `check:motion`, `check:sync` and `check:mix`; this is their
first independent review, made the same day.

**Result:** 126 findings: **7 P1**, 41 P2, 78 P3. Every one is fixed except
one P3 fixed in part. Each video has its own report in
[`20261120-ae-interview-video-review/`](20261120-ae-interview-video-review/),
and its fixer's report in that folder's `fixes/`. Every finding gives its
time, beat, frame, cause (`file:line`) and a fix.

Severity is the same as in the earlier reviews:
- **P1:** a viewer is likely to misunderstand or learn something wrong, or the
  frame has an obvious defect.
- **P2:** noticeable, and it hurts the video.
- **P3:** polish.

| Video | Length before → after | P1 | P2 | P3 | Fixed | Re-voiced (characters) |
| --- | --- | --- | --- | --- | --- | --- |
| 0 The interview, now | 2:46 → 2:46 | 0 | 1 | 7 | 8 | 0 |
| 1 Facts, dimensions and grain | 11:15 → 11:45 | 0 | 5 | 9 | 14 | 463 |
| 2 Dimensions that change | 8:03 → 8:04 | 1 | 3 | 6 | 10 | 122 |
| 3 How dbt builds a project | 10:59 → 11:10 | 0 | 7 | 7 | 14 | 130 |
| 4 Incremental models | 8:01 → 8:18 | 1 | 4 | 10 | 15 | 222 |
| 5 Advanced SQL | 10:51 → 10:58 | 1 | 4 | 9 | 14 | 181 |
| 6 Warehouses and what they cost | 9:34 → 9:53 | 1 | 5 | 7 | 13 | 253 |
| 7 Testing and data quality | 9:40 → 9:53 | 1 | 5 | 7 | 13 | 170 |
| 8 Metrics and the semantic layer | 10:33 → 10:45 | 1 | 3 | 9 | 13 | 148 |
| 9 AI and the semantic layer | 8:20 → 8:35 | 1 | 4 | 7 | 11, 1 in part | 305 |
| **Total** | **1:30:02 → 1:32:08** | **7** | **41** | **78** | **125, 1 in part** | **1,994** |

## How it was reviewed

The Backend review's method and tools, adapted for this series and this
machine ([`tools/`](20261120-ae-interview-video-review/tools/), with
[`BRIEF.md`](20261120-ae-interview-video-review/tools/BRIEF.md) as each
agent's brief):

- **Frames once a second**, rendered through each video's private entry
  (5,407 frames, under a minute a video on four cores).
- **Contact sheets that drop repeats**: 2,020 of the frames kept.
- **One agent per video**, not its builder, reviewing first (read-only, the
  report written) and then fixing every finding, P1s first, with at most
  1,000 characters re-voiced a video (600 for the overview). Splitting
  beats at sentence breaks and cutting the unchanged halves from the kept
  takes kept the total to 1,994 characters across the ten.

## The seven P1s

None is a wrong measurement: every number on screen matched `results.json`
and the pages. Each is a statement or a figure a viewer would carry into an
interview:

- **Part 2:** the bridge said every table is rebuilt each day, "the snapshot
  first", against the video's own answer that a snapshot can't be rebuilt
  from its source. Now "updated each day".
- **Part 4:** "What a merge can't do is delete". `MERGE` has a delete action,
  in the Postgres 18 these videos run on too. Now: what this merge never sees
  is a delete, and deletes arrive as flagged rows or need a full refresh.
  (The coordinator's own spot-check had already caught Part 4's overlap band
  drawn over six days instead of three.)
- **Part 5:** the tie table gave row number 1 to the row the run did not keep.
- **Part 6:** twelve 780 kB month files marked green as the right partition
  grain (the target is 128 MB to 1 GB a file). Now: at this size, don't
  partition at all.
- **Part 7:** the dashboard drawn under the tested table with "No bad rows
  reach it", though `dbt build` builds a model before it tests it. Now the
  dashboard sits behind a downstream model that is skipped.
- **Part 8:** gross `SUM(amount)` marked as the correct revenue and the net
  readings red, against Part 9's governed net revenue. Now no reading is
  marked correct; the layer's definition is.
- **Part 9:** a padlock under the private staging model, beside the stopped
  arrow, saying "private locks the assistant out", the misconception the
  page's revision corrects (it restricts `ref()`, not queries).

## Series-wide patterns

### 1. Answers that stop one step short

As in every earlier series, the commonest answer finding. Fixed with a
clause or a beat, among them: a hash of the natural key can't tell a Type 2
customer's versions apart (Part 1); a role-playing dimension is one calendar
for every role (Part 1); targets live in a profile (Part 3); a microbatch
lookback the width of the overlap (Part 4); a recursive CTE is for depth not
known in advance (Part 5); `LIMIT` does not cut a BigQuery scan (Part 6);
slim CI defers to production for unbuilt parents (Part 7); "every test
passes" answered with the test that fails on the joined rows (Part 8); a
wrong query can match a golden answer by luck (Part 9).

### 2. Colors against their meanings

Green for things that are not the right answer (Part 6's month files, Part
8's gross revenue); red for things that are true (Part 1's touched sums, the
correct ledger value in Part 7); strikes through correct values and column
titles (Parts 5 and 8).

### 3. Results that leave too soon

Most videos had a result or a quick-round answer on screen for one to two
seconds before the next arrived. Fixed with pauses and earlier cues, free.

### 4. A wording the coordinator introduced

Part 7's "a single null isn't a duplicate" was the coordinator's own edit to
the script, and the wrong reason: dbt's `unique` test filters nulls out
entirely. The video and the testing page now show the filter.

## Checks after the fixes

With all ten in: typecheck, lint, `npm test` (79/79) and `check:cues` pass
for the package; every video's fixer passed `check:frames`, `check:motion`,
`check:sync` and `check:mix` on its final code; every `check.mjs` passes on
the final pages, every existing value identical. The site's own checks pass
on the pages changed (`check:prose`, `check:mcq`, `check:mdx`,
`check:diagrams`, `check:mermaid-code`).

## Left

- **Part 9, finding 6 (P3), in part:** its fastest beat is split with a
  pause, but its first sentence keeps the take's speed; slowing it is a
  re-voice.
- **Part 1 is 9,694 characters**, 194 over the series' 9,500 guideline
  after its five answer fixes; no check enforces the guideline.
- **Shared kit, suggested by several builders:** `badgeStyle` and
  `outlineBadgeStyle` set no font family, so a badge inside serif text comes
  out in the serif (each video wraps them in Inter locally); a shared YAML
  listing and an outlined diagram box with a title would save copying.
