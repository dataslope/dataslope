# AnalyticsEngineer-6-Warehousing: fixes (second review)

All 3 findings are fixed: 1 P2 and 2 P3. One sentence is new, **102 characters re-voiced**. The new length is **10:02.0** (602.0 s). It was 9:53.3 (593.3 s).

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 answer | fixed | `compute-def` is split at its sentence break into `compute-def` and `compute-vendors`, both cut free from take 5. A new beat, `compute-size`, sits between them: "Each size up doubles that rate, so a bigger warehouse costs no more only if it finishes twice as fast." Under Snowflake's "Credits per second while running" two soft lines ink in on its words: "Each size up doubles the rate:" and "the same bill only at twice the speed". The column rules are longer, and the model badge, rows and lever line moved down 36 design px (`SIZE_Y`, `RULE_H`, `BADGE_Y`, `ROW_Y`, `LEVER_Y` in `ComputeScene.tsx`). The fact is recorded in the `script.ts` header as beyond the page, from Snowflake's warehouse credit table (each size doubles the credits per hour). It is said as a word and no vendor number is drawn, so the video's "no vendor number on screen" rule holds. |
| 2 | P3 confusion | fixed | On "transformed there", one ink-soft outline (no fill, 8 px radius) is drawn round the column strips and the Transform box together, labelled "Inside the warehouse" in its top-right corner. The Load arrow now ends inside the warehouse's edge, and the T sits inside it (ELT), not after it. `T_BOX` moved 10 px left so "The analytics engineer's part" clears the new edge (`OltpScene.tsx`, `WH`). |
| 3 | P3 color | fixed | Q9's busy ticks and "2 min" are now ink, not `BAR` and `BLUE_INK`. Blue in that panel is now only the bytes scanned in the "Billed by bytes" row (`ComputeScene.tsx`). |

The 13 fixes from the first pass were each checked on screen, and all hold. That includes the P1 on partition grain: the month files are in ink, the target line is red and "At this size, one file" is green.

## Voice

- **102 characters re-voiced** (budget 400, none of it for P3s). One beat was voiced alone with `out/voice-slot.sh npm run narrate -- ae-warehousing --only compute-size`. It came back at 7.60 s.
  - Old (part of `compute-def`): "… Snowflake bills credits per second while a warehouse runs. BigQuery bills the bytes scanned, on demand, or reserved slots. Redshift bills its provisioned nodes."
  - New: `compute-def` "… Snowflake bills credits per second while a warehouse runs." + `compute-size` "Each size up doubles that rate, so a bigger warehouse costs no more only if it finishes twice as fast." + `compute-vendors` "BigQuery bills the bytes scanned, on demand, or reserved slots. Redshift bills its provisioned nodes."
- Free recuts with `--recut` from take 5: `compute-def` (now shorter) and `compute-vendors`. Pauses after them: `compute-def` 0.55 s, `compute-size` 0.6 s, `compute-vendors` 0.7 s, the old beat's own.
- Every other beat's MP3 is byte-identical to the frozen copy (md5 compared). `takes/ae-warehousing/` is unchanged.

## Images

None generated.

## Facts

`check.mjs` was not changed or rerun. `results.json` is byte-identical to the frozen copy, and no new number was added.

## Checks

All checks were run on the final code, through `out/entries/AnalyticsEngineer-6-Warehousing.tsx` and the queues.

- **tsc**: no error in `src/videos/ae-warehousing/`.
- **eslint** (`src/videos/ae-warehousing`): clean.
- **`npm run check:cues`**: pass. Every word cue names a phrase its beat says, including the new `compute-size` and `compute-vendors` cues.
- **`npm test`**: 79 pass, 0 fail.
- **`check:frames`** (`CHECK_SCALE=1`): pass.
  - 3 illustrations, largest stretch 0.40.
  - 18 arrows, up to 0.0° of bend.
  - No word-gap, mixed-size or cue-occurrence failure.
- **`check:motion`**: pass. 10:02.3 checked, 0 stretches still for 2 s or more.
- **`check:sync`**: pass. 57 beats, worst +0.04 s (`cols`). The new and recut beats are `compute-def` −0.01, `compute-size` −0.00 and `compute-vendors` −0.00.
- **`check:mix`**: run, no failure. The effects sit 30.0 LU under the narration. The speech is a median 30.5 dB above them, with the 5th percentile at 16.0 dB.
- **Stills:** in `video/out/review/AnalyticsEngineer-6-Warehousing/`, at 140, 143.5, 151.5, 420.5, 424, 427, 434.5, 440 and 466 s, and all were looked at.
  - The size lines ink in on their words and clear the model badge by about 30 px.
  - The warehouse edge clears the Load label, the OLAP lines above and the heavy-query box below.
  - Nothing is under 21 px.
- The WAVs and the preview the checks left in `out/` are deleted.

## Comparisons

In `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-6-Warehousing/`:

- `01-q9-now-says-that-size-sets-the-rate.png`: 7:37.0 before, 7:46.0 after, with the narration diff.
- `02-q3-the-transform-is-drawn-inside-the-warehouse.png`: 2:31.0 before, 2:31.5 after.
- `03-q9-the-busy-minutes-are-in-ink-not-data-blue.png`: the same frames as 01, with boxes on the busy row and the bytes row.
