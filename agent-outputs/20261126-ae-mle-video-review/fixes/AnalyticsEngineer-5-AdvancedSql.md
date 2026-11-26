# AnalyticsEngineer-5-AdvancedSql: fixes (second review)

Review: `agent-outputs/20261126-ae-mle-video-review/AnalyticsEngineer-5-AdvancedSql.md` (1 P2, 2 P3). All three are fixed. All of the fixes are timing or layout: nothing was re-voiced and no image was drawn. New length **10:57.9** (657.9 s, was 657.5 s), because one pause is 0.4 s longer.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 pacing | fixed | `LatestScene.tsx`: the `WHERE` error now inks on "where can't see a window function" (`cantAt + 16`, just after the red band reaches the `WHERE` line). Before, it inked on "Postgres says so", the last three words of the beat. Its scratch sound moves with it. The box is 660 px wide (was 640), so the message fits on one line. `script.ts`: `pauseAfter` 1.0 on `latest-where` (was 0.6). The error now holds about 4 s (from about 147.5 s until the cut at about 151.4 s), up from about 1.6 s. |
| 2 | P3 spacing | fixed | `WindowScene.tsx`: Q3's error box is 664 px wide (was 680). Its first line breaks before "GROUP", and "GROUP BY clause or be used in an aggregate function" fits on the second line. |
| 3 | P3 confusion | fixed | `DistinctScene.tsx`: the grey "101: 5 days" under "= 23" is removed, along with the `days101` count it used. User 101's IDs still light first, and "6 came back on other days: 11 extra counts" carries the point. |

## Voice

- **0 characters re-voiced** (budget 400). No beat was recut or recorded. `public/narration/ae-advanced-sql/` and `takes/ae-advanced-sql/` are untouched.

## Images

None generated.

## Facts

`check.mjs` was not rerun: no number changed. `results.json` is byte-identical to the commit before this review (`git diff 5b6be27d` is empty for it), so every existing value came back identical.

## Checks (final code, through `out/entries/AnalyticsEngineer-5-AdvancedSql.tsx` and the queues)

CHECKS_PLACEHOLDER

## Comparisons

In `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-5-AdvancedSql/`:

- `01-the-where-error-now-appears-with-the-reason-not-.png` (finding 1: the timing, at 2:27.8 before and after)
- `01-the-where-error-fits-on-one-line.png` (finding 1: the width, 2:30.8 before, 2:31.2 after)
- `02-q3-s-error-no-longer-splits-group-by.png` (finding 2)
- `03-no-stray-101-5-days-under-the-sum.png` (finding 3)
