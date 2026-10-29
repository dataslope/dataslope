# DataScientist-10-Sql: P2 fixes

Folder `video/src/videos/ds-sql/`, built on the P1 commit (`lineOf` highlights, readable 0.1200). Nothing outside the folder, its narration and its takes was edited; `da-sql/parts.tsx` and `da-advanced-sql/parts.tsx` are untouched, and so is `sql.mdx`.

## P2s

| # | Finding | Status | What changed |
| --- | --- | --- | --- |
| 3 | Churn query sits on the left join's output (and the session step table beside the page's query) | fixed | The churn listing's `WHERE` line now inks in on "filter where February's user ID is null", so until then the table under it is the left join its first three lines describe. On that word the matched rows (2, 3, 5) close up in place, and on "users one, four and six" the table cross-fades into the query's own one-column result (1, 4, 6) in the same spot, its green bands carrying straight on. The separate table on the right is gone; "churned" and the `NOT EXISTS` note sit beside the result. Session: the step table is named "user 1, step by step", and the page's query starts level with that name. |
| 4 | `NULLIF` shown on the engine that does not need it | fixed | Postgres now shows the fix where the error was: at "Wrap the denominator" its listing becomes the `NULLIF` query (`NULLIF` line green) and the error box gives way to its six-row result, C and F null and marked green, with the struck `COALESCE` beside it. The right panel is just the page's funnel as data (no engine, no listing) until the narration names DuckDB; then DuckDB's bare `conversions / sessions` on C and F appears, null with no `NULLIF`, under "In DuckDB, with no NULLIF" and over "null already: NULLIF is the habit that travels". During `rate-int` the funnel's A row marks 120 and 1000 as they are said. New `check.mjs` steps: `rate.funnel`, `rate.duckBare`. No narration change. |
| 5 | "An ordered sum with no frame" is wrong, and "frame" is never defined | fixed | `r-running` re-voiced: "A running total is an ordered sum: one hundred, three fifty, four twenty-five, six oh five. With no frame written, each sum covers the first row through this one, and rows tied on the day share one total." On screen: "the frame by default: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`", and the same query on the video's own three rows, two on 2024-01-02, both rows getting 425 (marked as "tied" and "share one total" are said). New `check.mjs` figure `ties`: `running` (100, 425, 425) is shown; `rows` (an explicit `ROWS` frame gives 350, then 425) verifies the claim and is not shown. `pauseAfter: 1.2` holds the tie on screen. |
| 6 | The staircase outline is a different staircase from the one narrated | fixed | `hook` split at sentence breaks into `hook` / `hook-cells` / `hook-sql` (recut, free); `hook-cells` re-voiced: "…then two, then three, so every row fades as it goes right. And each newer row is shorter: it has had fewer months to measure." The outline is now cued to "each newer row is shorter", and "not reached yet" appears in the blank cells on "fewer months to measure". `cohort-rate` split; its last sentence, now `cohort-stair`, re-voiced from "That's the staircase." to "Shares fall along each row, and the newest cohorts are the shortest: they've had the fewest months." The outline and the same blank-cell note are cued to it. |
| 7 | Code under 19px | fixed | Session listing 14 → 19px: the axis moves up 30 and the listing starts level with the step table's name, ending about y=972. Cohort listing 16 → 19px at width 1000, its note moved 24px clear of the border. Rapid listings 18 → 19px, with the boxes widened so every 19px line and its highlight fits: having and latest 740, top N 620 (table at +640), pivot 870. The DuckDB 18px listing is gone and its replacement is 19px. Axis ticks, "30 min" and "session N" labels 18 → 19px. |

**P3s fixed on the way:**
- #11, first half: "`NOT EXISTS` : the same three" loses its detached colon (the note is rebuilt as one span).
- #12: the cohort note is 24px clear of the listing border, and the top-N highlight no longer runs into its border (both from the #7 widening).
- #14, hook half: the hook split puts a 0.55 s pause after "in one month." and after the cells sentence.

The cohort listing's three highlights now find their lines by text (`lineOf`), as the P1 fix did elsewhere. The struck `COALESCE` uses `top="0.68em"`, because the shared `Strike`'s 0.55em sits high on monospace text. That was already the case before this pass.

Not fixed: P3 #8, #9, #10, #11 (second half), #13, #14 (`r-topn`) and #15.

## Voice

- **487 characters re-voiced**: `hook-cells` 184, `cohort-stair` 99, `r-running` 204. Each was voiced alone with `narrate --only`.
- The splits (`hook` → `hook` / `hook-cells` / `hook-sql`; `cohort-rate` → `cohort-rate` / `cohort-stair`) were cut from the kept takes with `narrate --recut` before any text changed, and every unchanged beat came out byte-identical.
- **New length: 400.3 s** (was 381.0), 37 beats, 143 wpm (`npm run cues -- ds-sql`).

## Checks

- Typecheck (ds-sql lines only): clean.
- ESLint `src/videos/ds-sql`: clean.
- `npm run check:cues` and `npm test`: nothing names ds-sql. The only failures (cue-scan tests 7 and 40, `check:cues`) are 22 cues in `ds-ml-evaluation`, another fixer's video mid-edit.
- `check:motion`: passes (6:41 checked). Nothing holds still for 3 s; four holds of 2 to 2.5 s, at 0:44.5 (`join`), 2:30.5 (`cohort-in` into `cohort`), 3:18.0 and 3:22.5 (`session`).
- `check:sync`: passes. All 37 beats are within ±0.12 s; the worst is +0.04 s (`r-window`), and the three re-voiced beats are at +0.01, +0.00 and −0.01 s.
- `check:mix`: passes. Narration −19.8 LUFS, effects 28.7 LU under it. The closest moment is 9.8 dB at 0:38.3: the existing pop on "The first piece", which only moved later with the timeline.
- `check:frames`: not run (no arrow, illustration or ERD changed).
- Stills, each looked at, at 20, 85.5, 87.5, 88.9, 93.8, 113.5, 121.5, 129, 133, 141, 147.5, 166, 192, 240.5, 286.5, 303, 341, 357.5, 366 and 374 s.

## Noticed

- **`check.mjs` cannot run as its header says.** The repo root has no `node_modules`. I ran it in place with packed copies of `@duckdb/duckdb-wasm` 1.32.0, `apache-arrow` 17.0.0 (and its deps), `web-worker` 1.5.0 and `@electric-sql/pglite` 0.5.8 in `$S/DataScientist-10-Sql/deps/` (`npm pack`, no install). They are reached through `NODE_PATH` plus an ESM resolver hook (`$S/DataScientist-10-Sql/hook.mjs`), because `scripts/lib/sql-engines.mjs` imports PGlite as ESM, which `NODE_PATH` does not reach. Every pre-existing step in `results.json` came back identical; only the new steps were added.
- **Left from the P1 fix:** during `rate-int` the Postgres listing still reads `conversions / sessions` while its results become 0.1200. The P1 fix put a green "`conversions * 1.0 / …`" note beside the table rather than swapping the listing. I left that choice alone.
- **Page:** `sql.mdx:244` still calls the default frame `ROWS`; the video now says and shows `RANGE`, which `check.mjs`'s `ties` figure confirms. The page was not edited.
- **Kit suggestions:**
  - `DataTable` cannot close a column. "Drop the `feb` column" had to be a cross-fade into a second table; a closing counterpart to `Col.at` would make it one animation.
  - The shared `Strike` sits high on monospace text at its default 0.55em.
