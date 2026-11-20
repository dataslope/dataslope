# AnalyticsEngineer-4-Incremental: fixes

Review: `../AnalyticsEngineer-4-Incremental.md` (1 P1, 4 P2, 10 P3).

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P1 | "A merge can't delete" is false; how to catch deletes is missing | fixed | `merge-delete` was split at its sentence break. Its first sentence now reads "What this merge never sees is a delete." and was re-voiced alone. The second, `merge-delete-batch`, was cut from take-4 for free. A new beat, `merge-delete-flag`, says "To catch one, the source has to send each delete as a row, flagged, for the merge to act on. Otherwise, it takes a full refresh." On screen, the red note now reads "This merge never sees a delete", with a second line under it: "Unless deletes arrive as **flagged rows**; otherwise, a full refresh". The cues moved to the new beats (`MergeScene.tsx`). |
| 2 | P2 | Q3's watermark reads 2024-01-24 while the table holds 27 at Jan 25 | fixed | `FilterScene.tsx` gains `LATEST`, the latest arrival in `LATE.arrived` (27, 2024-01-25). While the rule is hidden, 20 frames before "Question three", it moves to that event's day, and its label switches to 2024-01-25. It reappears right of 27. |
| 3 | P2 | The microbatch lookback band cuts event 26 in half | fixed | `LOOKBACK = WINDOW_DAYS` (3, the width from the run's own SQL). The band now covers Jan 22 to Jan 25, with 26 fully inside it, and reads "lookback, 3 batches here". |
| 4 | P2 | "No key: append" shown under a config that sets `unique_key` | fixed | The config line swaps to `config(materialized='incremental')` on "rows are appended" and back on "Set the unique key", where the existing highlight lands on the restored `unique_key='event_id'` (`KeyScene.tsx`). |
| 5 | P2 | The blind-insert result clears about 1.8 s after it appears | fixed | idem-blind `pauseAfter` changed from 0.7 to 1.6 (timing only). "24 rows for 12 customers" now holds about 2.7 s. |
| 6 | P3 | Microbatch narration while both listings keep the hand-written filter | fixed | From "takes the filter out of your hands" until Question 3, these lines are dimmed: the guard, `WHERE`, the interval and `{% endif %}` in the model, and `WHERE` and the interval in the compiled SQL. |
| 7 | P3 | The compiled SQL keeps its `WHERE` on the first run | fixed | The compiled `WHERE` line dims at `skippedAt + 3`, in step with the model's guard. |
| 8 | P3 | The deleted row is drawn struck through inside the batch | fixed | The ghost Cy row and its strike are gone. Under `staged_customers`, in red: "Cy, deleted at the source: not in the batch". dim_customer's Cy row keeps its red band and "kept". |
| 9 | P3 | An unlabeled red line in Q7's chart ends beside "Last refresh" | fixed | `RefreshScene.tsx` no longer passes `fullAt`. Only the incremental line and its spikes are drawn, and the yellow-lit day-720 spike carries the label alone. |
| 10 | P3 | The uniqueness test's label crowds "and no error" | fixed | The test's label and table moved from x 1160 to 980 (`TEST_X`). They are about 100 px clear of the error box and 190 px clear of the count. |
| 11 | P3 | Why a change sequence avoids late rows is left implicit | fixed | On screen only: "Or: a change sequence that only grows, **stamped on arrival**, so nothing lands behind the watermark". It inks in on "only ever grows". |
| 12 | P3 | "Compiled" shows a different select list from the model | fixed | The compiled listing's select line is now the model's own, `SELECT *`. raw_events has exactly the page's two columns, so the rows and every count are unchanged. |
| 13 | P3 | The wider window keeps `'3 days'` highlighted | fixed | Both interval highlights now end at `wideAt` instead of `microAt`. |
| 14 | P3 | `{{ this }}` answer stops before "why not `ref()`?" | fixed | New beat `this-ref`: "It isn't a ref, because a model can't depend on itself." It was re-voiced alone. The note on the right inks on: "`{{ this }}` is `fct_events`, not `ref('fct_events')`: a model can't depend on itself". It ends at x 1757, inside the margin. |
| 15 | P3 | The window-width trade-off runs straight into the next idea | fixed | filter-width `pauseAfter` changed from 0.6 to 1.0 (timing only). |

Counts: 15 fixed, 0 partly, 0 moot, 0 not fixed.

## Voice

- **222 characters re-voiced**, against a budget of 1,000. Of these, 55 were for P3s (P3 budget: 300). Each beat was voiced alone with `--only`:
  - `merge-delete`: 39 characters, P1.
  - `merge-delete-flag`: 128 characters, P1.
  - `this-ref`: 55 characters, P3.
- **Free:** `merge-delete-batch` ("A row removed from the source never reaches the batch, so the target keeps it.") was cut from take-4 by `--recut`.
- An md5 diff of `public/narration/ae-incremental/` against the pre-fix files shows only `merge-delete.mp3` (new words) and the three new files. Every other MP3 is byte-identical. `takes/` is untouched.

## Length

481.4 s to **498.5 s (8:18.5)**. The difference, about 17 s:
- About 5 s for `this-ref`.
- About 10 s for `merge-delete-flag`, plus the split's own pauses.
- 1.3 s from the two `pauseAfter` changes.

## Data

`check.mjs` was not rerun and did not need to be: no new number appears on screen. The Q3 date (2024-01-25) is event 27's `event_at` from `LATE.arrived`. The lookback count is the overlap's own `INTERVAL '3 days'` from `SQL.OVERLAP`. `results.json`, `check.mjs` and `data.ts` are byte-identical to before (`cmp`), so every existing value is unchanged.

## Checks (final code, own entry, through the queue)

- **typecheck** (`tsc --noEmit`): no errors in `src/videos/ae-incremental/`.
- **eslint** `src/videos/ae-incremental`: clean.
- **check:cues**: every word cue names a phrase its beat says.
- **npm test**: 79 pass, 0 fail.
- **check:frames** (`CHECK_SCALE=1`): pass. Every ✓, no `[crowded]` or `[mixed]`.
- **check:sync**: 45 beats, worst +0.03 s (`merge-delete`), all within ±0.12 s.
- **check:mix**: pass. Effects 30.7 LU under the narration; median 31.0 dB below the speech.
- **check:motion**: pass. The longest still stretch is 2.8 s (`filter`, 1:34.5).

I looked at stills at every place I changed: 168, 179.8, 197.5, 207.5, 212.6, 221.6, 247, 263, 286.8, 312, 406.5 and 472 s (`out/review/AnalyticsEngineer-4-Incremental/`). The WAVs and the preview the checks left are deleted.
