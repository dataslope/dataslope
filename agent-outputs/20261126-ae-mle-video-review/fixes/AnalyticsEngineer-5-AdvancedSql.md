# AnalyticsEngineer-5-AdvancedSql: fixes (second review)

Review: `agent-outputs/20261126-ae-mle-video-review/AnalyticsEngineer-5-AdvancedSql.md` (1 P2, 2 P3). All three are fixed. All of the fixes are timing or layout: nothing was re-voiced and no image was drawn. New length **10:57.9** (657.9 s, was 657.5 s), because one pause is 0.4 s longer.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 pacing | fixed | `LatestScene.tsx`: the `WHERE` error now inks on "where can't see a window function" (`cantAt + 16`, just after the red band reaches the `WHERE` line). Before, it inked on "Postgres says so", the last three words of the beat. Its scratch sound moves with it. On "Postgres says so" the box nods once, a 0.6 s swell to 103.5% (`pulse` from the kit's `da-sql/parts`, already used by the hook). The narration points at the box there, and without the nod the longer hold left about 3 s without motion. The box is 660 px wide (was 640), so the message fits on one line. `script.ts`: `pauseAfter` 1.0 on `latest-where` (was 0.6). The error now holds about 4 s (from about 147.5 s until the cut at about 151.4 s), up from about 1.6 s. |
| 2 | P3 spacing | fixed | `WindowScene.tsx`: Q3's error box is 664 px wide (was 680). Its first line breaks before "GROUP", and "GROUP BY clause or be used in an aggregate function" fits on the second line. |
| 3 | P3 confusion | fixed | `DistinctScene.tsx`: the grey "101: 5 days" under "= 23" is removed, along with the `days101` count it used. User 101's IDs still light first, and "6 came back on other days: 11 extra counts" carries the point. |

## Voice

- **0 characters re-voiced** (budget 400). No beat was recut or recorded. `public/narration/ae-advanced-sql/` and `takes/ae-advanced-sql/` are untouched.

## Images

None generated.

## Facts

`check.mjs` was not rerun: no number changed. `results.json` is byte-identical to the commit before this review (`git diff 5b6be27d` is empty for it), so every existing value came back identical.

## Checks (final code, through `out/entries/AnalyticsEngineer-5-AdvancedSql.tsx` and the queues)

- typecheck: no errors in `src/videos/ae-advanced-sql/`
- lint (`eslint src/videos/ae-advanced-sql`): clean
- `check:cues`: pass
- `npm test`: 79 pass, 0 fail
- `check:frames` (`CHECK_SCALE=1`): pass (4 images, largest stretch 0.41; 15 arrows, 0.0° bend; spacing, sizes, tabular hyphens and cues all clean)
- `check:motion`: pass (exit 0, "nothing holds still for 3 s", over 10:58.0). It lists two 2.0 s stretches, 8:48.0 to 8:50.0 (`r-rank`) and 9:25.8 to 9:27.8 (`r-cte`). Both are in the quick round, which this review did not touch, and both are under the limit. Nothing is listed around `latest-where`. My first `check:motion` run, on the code before the nod, waited its whole 2 h timeout for a render slot and never started. The run reported here is on the final code.
- `check:sync`, `check:mix`: not run, because nothing was re-voiced (the brief asks for them only after a re-voice).
- Stills looked at (`$S/after/AnalyticsEngineer-5-AdvancedSql/`): 125, 147.8, 149.5 (mid-nod), 151.2 and 438.4 s.
- The preview `check:motion` left in `video/out/` is deleted.

## Comparisons

In `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-5-AdvancedSql/`:

- `01-the-where-error-now-appears-with-the-reason-not-.png` (finding 1: the timing, at 2:27.8 before and after)
- `01-the-where-error-fits-on-one-line.png` (finding 1: the width, 2:30.8 before, 2:31.2 after)
- `02-q3-s-error-no-longer-splits-group-by.png` (finding 2)
- `03-no-stray-101-5-days-under-the-sum.png` (finding 3)
