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

498.5 s (8:18.5) to **506.4 s (8:26.4)**, 7.9 s longer:
- 7.1 s for the new beat.
- 0.9 s more pause. Before, `refresh-fix` had 0.7 s after it. Now it has 0.6 s, and the new beat has 1.0 s after it.

## Data

No new number. `results.json`, `data.ts`, `check.mjs` and `illustrations.json` are byte-identical to the frozen copy (`cmp`), so every existing value is unchanged. The `on_schema_change` fact is dbt's own documentation (incremental models, "What if the columns of my incremental model change?"). It is cited in `script.ts`'s header. The page names schema changes as a reason to refresh and stops there.

## Checks (final code, own entry, through the queues)

- **typecheck** (`tsc --noEmit`, filtered to `src/videos/ae-incremental/`): no errors.
- **eslint** `src/videos/ae-incremental`: clean.
- **check:cues**: "every word cue names a phrase its beat says, and says which one".
- **npm test**: 79 pass, 0 fail.
- **check:frames** (`CHECK_SCALE=1`): pass (exit 0). All ticks: illustrations, arrows, spacing, one size and family per line, cue occurrences.
  - The log also carries 92 `[overlap]` audit lines, all of one kind: "day" and "730" against "day 730", in frames 195-870. That is the hook's yellow-lit `day 730` axis tick (`CostChart`), which is untouched here; they are not counted as failures.
- **check:sync**: 46 beats, worst +0.03 s (`merge-delete`). `refresh-schema` is at +0.03. All within ±0.12 s.
- **check:mix**: narration -19.7 LUFS; effects 30.7 LU under it; speech a median 31.1 dB above the effects.
- **check:motion**: pass. 8:26.5 checked; the one still stretch over 2 s is 2.8 s at 1:34.5 (`filter`, unchanged); nothing holds still for 3 s.
- I looked at stills of the final code at both places I changed. They are in `$S/after/AnalyticsEngineer-4-Incremental/`:
  - 332 s: the new label, clear of the tables.
  - 455 s and 460.5 s: the new line inking in.
  - 463.6 s: the line finished, the whole phase still at full strength.
  - 465.5 s: the phase cleared, and the chart arriving.
- The WAVs and the preview the checks left are deleted.

## Comparisons

`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-4-Incremental/`:

- `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-4-Incremental/01-schema-changes-the-on-schema-change-follow-up-is.png` (finding 1: the new on_schema_change line, with the narration before and after)
- `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-4-Incremental/02-the-failed-rebuild-s-label-says-why-it-fails.png` (finding 2: the reworded label)

The before frames are the one-a-second review frames at 455 s and 332 s. Those beats' times are unchanged.
