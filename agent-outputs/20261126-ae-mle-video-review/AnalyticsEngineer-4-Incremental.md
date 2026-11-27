# AnalyticsEngineer-4-Incremental (8:18, 498.5 s)

Second review. The first pass is `agent-outputs/20261120-ae-interview-video-review/AnalyticsEngineer-4-Incremental.md`, and its fixes are in `.../fixes/AnalyticsEngineer-4-Incremental.md`.

## Verdict
- All fifteen earlier fixes hold on screen. The P1 holds in both words and picture. The narration says "What this merge never sees is a delete", then "To catch one, the source has to send each delete as a row, flagged, for the merge to act on. Otherwise, it takes a full refresh." The red note reads "This merge never sees a delete", with "Unless deletes arrive as flagged rows; otherwise, a full refresh" under it (element-405). The other fixes also hold:
  - The Q3 watermark reads 2024-01-25, to the right of 27 (element-210).
  - The lookback band covers 22 to 25 and reads "lookback, 3 batches here" (element-197).
  - "No key: append" sits under `config(materialized='incremental')` (element-250).
  - The microbatch and first-run dims are in place (element-197, element-220). Cy is no longer drawn inside the batch. Q7's chart shows only the incremental line (element-495). The other P3s also hold.
- The answers hold up. Every count on screen matches `results.json` and the narration, and each answer goes at least as far as the page.
- What the first pass missed is small. One answer stops a step short: Q7 says a full refresh "is also how a schema change gets applied" and stops before `on_schema_change`, which a dbt interviewer will raise. One label leaves a careful viewer guessing why the rebuild failed.
- Pacing is comfortable, with no result that clears early. The fastest beat is `idem-two` at 3.25 w/s, a summary of what is already drawn, followed by 1.6 s of air. I did not raise it.

## Findings

### 1. [P3] answer: "It's also how a schema change gets applied" stops before `on_schema_change`
- When: 447.7-455.4 s, beat `refresh-fix` (element-454.jpeg)
- What: The follow-up is "why are periodic full refreshes still needed?" Its last reason is "It's also how a schema change gets applied." The line on screen says the same in grey. dbt has a config for exactly this: `on_schema_change` (`append_new_columns`, `sync_all_columns`). It adds a new column on a normal incremental run, with no full refresh. But it never backfills the column in rows already loaded: those stay null until a full refresh. dbt's own docs say so.
- Why it matters: An interviewer will ask "Doesn't `on_schema_change` handle that?" right after this sentence. The precise answer is the reason a refresh is still needed: it can add the column without one, but only a refresh fills in the old rows. As it stands, a viewer would say schema changes need a full refresh, and get corrected.
- Cause: `video/src/videos/ae-incremental/script.ts:448` (the `refresh-fix` text ends there); `RefreshScene.tsx:276-280` (the note).
- Fix: Add a beat after `refresh-fix`, leaving its take untouched: "Without a refresh, the on schema change config can add a new column, but leaves it empty in the old rows." (105 characters). On screen, under the grey note, add a line: "Without one, `on_schema_change` can add a new column, but leaves it empty in old rows". Move the `refresh-fix` pauseAfter to the new beat.

### 2. [P3] confusion: The failed rebuild's error names a table the listing never reads
- When: 326.0-333.7 s, beat `idem-fail` (element-329.jpeg)
- What: The label reads "A rebuild whose CREATE fails, after the DROP". The listing above it, which has its `CREATE TABLE` line marked red, reads `FROM customer_events`. But the error under the label says `relation "customer_events_missing" does not exist`. check.mjs stages the failure by pointing the `CREATE` at a table that isn't there (`check.mjs:296`), and nothing on screen says so.
- Why it matters: A careful viewer reads the error against the listing, and the two don't match. The label never says how the failure was caused, so the mismatch looks like a mistake.
- Cause: `video/src/videos/ae-incremental/IdemScene.tsx:191-193`.
- Fix: On screen only. Reword the label to "A rebuild whose CREATE reads a missing table, after the DROP" (651 px at 22 px, so it ends at about x 771, clear of the tables at x 880).
