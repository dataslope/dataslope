# AnalyticsEngineer-6-Warehousing: fixes

All 13 findings are fixed (1 P1, 5 P2, 7 P3). The new length is **9:53.3** (593.3 s, was 9:34.0). Three beats are new and two are free recuts, with **253 characters re-voiced**.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 accuracy | fixed | The "By month" label is now ink and soft ink, not green. When the narration says "each file is tiny", it adds in red ", still far under the usual 128 MB to 1 GB". That text is `TARGET_TEXT`, built in `data.ts` from de-warehousing's `small.target`. New beat `hurt-month`: "Even by month, each file is tiny. At this size, don't partition at all." On it, a green tick and "At this size, **one file**" appear right of the month files. The scene's chime moved to that line. |
| 2 | P2 answer | fixed | `compute-model` is split into `compute-model` (cut from take 5, free), `compute-suspend` (new) and `compute-bytes` (cut from take 5, free). `compute-suspend` says "Suspended when idle, about two, plus the wait before each suspend, so keep that wait short." In the "Suspended when idle" row, a lighter green tick now follows each busy minute, and the result reads "about 2 min, plus each wait". The wait is a stated model value, `computeModel.suspendWaitMinutes: 1`, in `check.mjs`. Its comment gives Snowflake's ten-minute default and the one-minute resume minimum. |
| 3 | P2 confusion | fixed | "9.8 MB in all" (`SMALL.day.bytes`) now sits under the day grid, level with the one file's "9.4 MB". The footer stripes are thinner: 2 px on each day file (was 5), 3 px on the one file (was 7) and 2 px on the month files (was 6). |
| 4 | P2 confusion | fixed | The App box and the row grid now ink in on "many small reads and writes". The request arrows follow 10 frames later, so every arrow has a source and a target. "Postgres" inks in under "App" when it is named. |
| 5 | P2 confusion | fixed | The Rows column beside the dictionary is gone. The codes are now one run under it, "Each row, a code: 0 0 0 1 …", so they can no longer be read as the dictionary's mapping. |
| 6 | P2 confusion | fixed | The reads stay up as a tally under the listing, added as each is said and none removed: "`SELECT *`: **9.4 MB**, the whole file" (red), "Units by region: **769 kB**, two thin columns" (green), "Revenue by region: **4.6 MB**, two columns again" (yellow), then "Bytes, not a count of columns". The units read is now in kB, which matches the bars and "under eight hundred kilobytes". |
| 7 | P3 answer | fixed | New beat `star-limit`: "And on BigQuery, a limit doesn't help: it bills the columns scanned, not the rows returned." On screen, under the tally: "`LIMIT` on BigQuery: **the same scan**" (red). |
| 8 | P3 spacing | fixed | The strike is gone. `SELECT *` gets a red `MARK_BAD` band instead. The right model now carries the same `{{ config(materialized='table') }}` line, and its select is `SELECT region, amount FROM {{ source('shop', 'sales') }}`, so the two listings differ only in the select list and both stay two lines. |
| 9 | P3 color | fixed | Lent slots are now filled in the yellow highlight with a yellow-ink outline, and "each query" is in ink. The caption is three lines: "A pool of slots, / units of compute, / lent to each query". |
| 10 | P3 confusion | fixed | The cylinder inks in on "Storage is separate" and the first cluster box 0.6 s later. Its wire to the data comes on "start compute that reads it". The box's subtitle reads "Loading, size M" and changes to "size L" as it grows on "scale query power". |
| 11 | P3 confusion | fixed | The rename is now to 'Home & Kitchen'. It is `NEW_NAME` in `check.mjs`, and the scene reads `OBT.rename.newName`. `check.mjs` was rerun. |
| 12 | P3 explanation | fixed | Redshift's line is now "Provisioned nodes, or Serverless capacity". The undefined initialism is dropped, and the script header is updated to match. |
| 13 | P3 pacing | fixed | Timing only: `cluster-def`'s `pauseAfter` changed from 0.7 to 1.3. "5 times the bytes" now holds about 2.9 s at full strength before the dim. |

## Voice

- **253 characters re-voiced** (budget 1,000; 91 of them for the P3). Three beats were voiced alone with `--only`:
  - `hurt-month` (71, P1)
  - `compute-suspend` (91, P2)
  - `star-limit` (91, P3)
- Free recuts with `--recut` from take 5: `compute-model` and `compute-bytes`. They are the unchanged sentences of the old `compute-model`.
- Every other beat's MP3 is byte-identical to before (md5 compared). `takes/ae-warehousing/` is untouched.

## Facts

`check.mjs` was rerun.

- **Changed, by finding 11:** `rename.star.sql` and `rename.obt.sql` (the new name).
- **Added:**
  - `rename.newName`
  - `computeModel.suspendWaitMinutes` (finding 2)
  - In `data.ts`: `SMALL.target` and `TARGET_TEXT`, from de-warehousing's results (finding 1).
- **Every other value in `results.json` came back identical.** That includes the rename's 1 and 199,786 rows and its 9 of 9 row groups, and every number the narration says.

## Checks

All checks were run on the final code, through `out/entries/AnalyticsEngineer-6-Warehousing.tsx` and the render queue.

- **tsc** (this folder only, through a scratch tsconfig) and **eslint** (`src/videos/ae-warehousing`): clean.
- **`npm run check:cues`**: pass.
- **`npm test`**: 79 pass, 0 fail.
- **`check:frames`** (`CHECK_SCALE=1`): pass.
  - 3 illustrations checked, largest stretch 0.40.
  - 18 arrows, up to 0.0° of bend.
  - No word-gap or mixed-size failures.
- **`check:motion`**: pass. Nothing holds still for 3 s.
- **`check:sync`**: pass. 55 beats, worst +0.04 s (`cols`); the new beats are `star-limit` +0.02, `hurt-month` +0.00 and `compute-suspend` −0.01.
- **`check:mix`**: run, no failure. The effects sit 30.0 LU under the narration, and the speech is a median 30.5 dB above them (5th percentile 16.2 dB).
- **Stills:** looked at in `out/review/AnalyticsEngineer-6-Warehousing/` and its `fix2/` subfolder, at every changed place. The times are 39.5, 50.5, 72, 108.5, 121.5, 124, 151.5, 189.5, 235.8, 243, 252, 336.5, 338.9, 353.5, 377.5, 394.8, 401.3, 443.5, 449.5, 457.5 and 509 s.
  - After the first round I raised the tally by about 20 px, so its last line clears the dbt listing by about 40 px, and thinned the month files' footers.
  - I shortened the Redshift line so it keeps a margin on the right edge like the left one.
- The WAVs and the preview the checks left in `out/` are deleted.
