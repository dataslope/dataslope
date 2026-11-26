# AnalyticsEngineer-4-Incremental: fixes (second review)

Review: `../AnalyticsEngineer-4-Incremental.md` (0 P1, 0 P2, 2 P3). All fifteen fixes from the first review still hold on screen. I re-checked each in the current frames; the review lists where.

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P3 | "It's also how a schema change gets applied" stops before `on_schema_change` | fixed | New beat `refresh-schema` after `refresh-fix`: "Without a refresh, the on schema change config can add a new column, but leaves it empty in the old rows." The `refresh-fix` take is untouched. On screen, a grey line under the schema-change note: "Without one, `on_schema_change` can add a new column, but leaves it empty in old rows". The second half inks in on "leaves it empty in the old rows". `refresh-fix` pauseAfter is now 0.6. The new beat takes 1.0 (timing only), so the line holds about 2.8 s before the chart replaces it. |
| 2 | P3 | The failed rebuild's error names a table the listing never reads | fixed | On screen only. The label now reads "A rebuild whose CREATE reads a missing table, after the DROP" (`IdemScene.tsx`). It ends at x 772, clear of the "Run" table at x 880. |

Counts: 2 fixed, 0 partly, 0 moot, 0 not fixed.

## Voice

- **105 characters re-voiced**, against a budget of 400 (P3 budget 150). All 105 went to P3s.
  - `refresh-schema` (new, voiced alone with `--only`, 7.12 s): "Without a refresh, the on schema change config can add a new column, but leaves it empty in the old rows." No old words were replaced.
- Every existing MP3 in `public/narration/ae-incremental/` is byte-identical to the frozen copy. The only new file is `refresh-schema.mp3`. `takes/` is untouched.

## Images

None.

## Length

498.5 s (8:18.5) to **506.4 s (8:26.4)**: +7.1 s for the new beat, +0.6 s for its pauses, +0.3 s for the longer pause after it.

## Data

No new number. `results.json`, `data.ts`, `check.mjs` and `illustrations.json` are byte-identical to the frozen copy (`cmp`), so every existing value is unchanged. The `on_schema_change` fact is dbt's own documentation (incremental models, "What if the columns of my incremental model change?"). It is cited in `script.ts`'s header. The page names schema changes as a reason to refresh and stops there.

## Checks (final code, own entry, through the queues)

CHECKS

## Comparisons

`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-4-Incremental/`:

PNGS
