# DataEngineer-1-SqlPatterns: fixes

Folder `video/src/videos/de-sql-patterns/`. Review report:
`agent-outputs/20261105-de-interview-video-review/DataEngineer-1-SqlPatterns.md`
(2 P1, 3 P2, 11 P3). Nothing committed by me. The coordinator's checkpoint
`1bd4fe3` caught this work part-way through. Compare against `4bff3bc` for the
whole change.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | `r-percent` is split into three beats. The first (`r-percent`, "Percent rank is rank minus one, over rows minus one.") and the third (`r-percent-vals`, "For ten, twenty, twenty, thirty, the twenties get a third, and three quarters.") are cut free from take-5. Only the middle one is re-voiced: `r-percent-cume`, "Cume dist is the share of rows at or before this one, ties included." The note now reads `cume_dist = rows at or before it (ties included) / rows`. The "the 20s: rank 2 of 4, and 3 of 4 rows at or below" note comes in at `valuesAt + 4` (was `quartersAt + 8`), and `r-percent-vals` has `pauseAfter: 1.6`, so the derivation is up from 593.7 s to the next item at 600.0 s, about 6 s (it was about 1 s). Stills at 592.9 and 599.3 s. |
| 2 | P1 | fixed | `r-dupes` is split at its sentence break. The first sentence is cut free. The second is re-voiced as `r-dupes-copies`: "To get the extra copies as whole rows, the ones you'd delete, number them and keep the numbers over one." It has `pauseAfter: 1.0`. The note is now two lines: "`rn > 1`: the extra copies, as whole rows", then, in soft ink, "the ones to delete; each first copy stays". The cues moved to the new beat. Still at 483.3 s. |
| 3 | P2 answer | fixed | A new beat, `r-lag-delta`, follows `r-lag`: "Leave it null in a delta, or day one reads as a jump of a hundred." The `prev` 0 is now marked yellow (`MARK`), not green. The first `delta` cell (100) is marked `MARK_BAD` on "a jump of a hundred". A red (`ACCENT_INK`) note under the table reads "in a delta, the 0 makes day one a jump of 100: leave it null there". Both numbers come from the result's cells. The listing stays the page's query, because the point is the trap in it. Still at 529.5 s. |
| 4 | P2 | fixed | `frame-def` is now two beats, each re-voiced with `pauseAfter: 0.8`: "The frame is the set of rows the function sees." (2.9 w/s, was 3.62) and `frame-def-run`, "For a running total, that's every row up to the current one." (3.0 w/s). The ROWS listing now comes in at `setAt - 2`, on the definition, not at `frame-rows`. Its `SUM(amount) OVER` line is marked on "For a running total", then its `ROWS BETWEEN` line on "every row up to the current one". The bracket's first step moved to that phrase as well. The definition note is `INK` at 25px, balanced over two lines. A second, softer note, "a running total: every row up to this one", comes in on the same cue. The result table still arrives at `frame-rows`. Stills at 201.5 and 207.6 s: the right half now holds the function the frame belongs to. |
| 5 | P2 | fixed | Deleted the first mark (`ROW_NUMBER() OVER (` at `numberAt + 4`). That mark found the same line as `login_date - ROW_NUMBER`, which the second mark already covers at `subtractAt + 2`, once the line is typed. A still at 335 s shows no band over the empty lines. |
| 6 | P3 | fixed | `r-pivot` is split. "To pivot, … grouped by the row. DuckDB also has a pivot clause." is cut free. `r-pivot-dyn` is re-voiced: "If the values aren't known in advance, the case version takes dynamic sequel. DuckDB's pivot finds them itself." The note is now two lines: "unknown values: the `CASE` version needs dynamic SQL", then "`PIVOT` with no `IN` list finds them itself" (the clause on screen has no `IN` list). Still at 558.6 s. |
| 7 | P3 answer | fixed | `frame-pick` is split. "Reach for range when…" is cut free as `frame-pick-range`. `frame-pick` is re-voiced: "Rows is predictable once the order by breaks ties, like this ID." By then the RANGE listing (`ORDER BY day`) has replaced the ROWS one, so the tiebreaker goes in the note: "`ROWS`: physical rows, predictable once `ORDER BY day, id` breaks ties", with `id` highlighted on "like this ID". This replaces the suggested mark on `, id` inside the listing. Still at 233 s. |
| 8 | P3 | fixed | check.mjs now runs the refusal itself, as the written query's own condition moved into WHERE: `WHERE SUM(amount) > 400`, on da-sql's orders. The setup is copied verbatim, and data.ts asserts it equals da-sql's. Same error: "Binder Error: WHERE clause cannot contain aggregates!". data.ts reads `WHERE.aggregate` from this video's results, and asserts that the `WHERE` line is the written query's `HAVING` line. "Put a sum in WHERE instead" is now literally true. No narration change. Still at 178 s. |
| 9 | P3 | fixed | Dropped `color: MARK_OK` from the `dr` marks, so DENSE_RANK's ties are yellow like the other two. Still at 57 s. |
| 10 | P3 | fixed | `latest-tie`'s `pauseAfter` is 1.8 (was 0.8), and `tieOut = q3At - 4`. The tie figure is read for about 1.8 s after the last word, then leaves just before "Question three". Stills at 96.8 s (tie and notes up) and 99.5 s (question 3 over the subquery only). |
| 11 | P3 | fixed | The EXCEPT note now reads: "A set difference: a row goes only if an equal row is on the right." / "The guest order's `NULL` equals no customer's id." The scene's doc comment is reworded to match. Still at 416 s. |
| 12 | P3 | fixed | Recursive: `recursive-stop`'s `pauseAfter` is 3.0 (was 2.2). `WHERE t.depth < 10` now inks on "never runs dry" (+4), not on "cap the depth", and "on a three-node loop, it stops at depth 10" comes in at `capAt - 2`, not `capAt + 6`. Both are up about 4 s before the cut. Still at 462.8 s. CTE: `r-cte` has `pauseAfter: 1.0`. The note gains a second line: "(none passes the page's 1000)". 700, 1000 and the 0 that passes now come from the SQL and result in results.json (`RAPID.threshold`, `pageThreshold`, `pagePasses`). The 700 had been typed by hand. I did not re-voice this one, to stay inside the P3 budget. Still at 497.2 s. |
| 13 | P3 answer | fixed | A new beat, `moving-short`, follows `moving-rows`: "And the first six rows have short windows: return null until the window holds seven." Under the page's listing: "the first 6 rows have short frames: null them", then the CASE as it ran, `CASE WHEN COUNT(*) OVER w = 7   -- w: the frame above` / `THEN AVG(daily_value) OVER w END AS avg_7`. check.mjs runs it as `moving.full`. data.ts takes the two lines from that SQL and the 6 from the result's nulls. It asserts that 6 equals the ROWS frame's rows with n < 7, and that the 13th still averages 152.1. The note leaves with the listing at question 8. Still at 271.6 s. |
| 14 | P3 | fixed | Under the spine listing, on "seven rows are seven days again": "then the same frame, over these rows:" and `ROUND(AVG(daily_value) OVER (ORDER BY day` / `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1) AS avg_7`. The two lines are taken from `spine.filledAvg`'s own SQL, the query that produced the 95.0, and data.ts throws if they stop being the ROWS frame. Still at 318.5 s. |
| 15 | P3 answer | fixed | A new beat, `rank-use`, follows `rank-three`: "So dense rank finds the second-highest score, rank keeps ties in a top N, and row number keeps exactly one per key." One line under the table and notes inks in clause by clause: "`DENSE_RANK` for the second-highest score · `RANK` for a top N with ties · `ROW_NUMBER` for exactly one per key". It leaves with question 1. Still at 66.4 s. |
| 16 | P3 | fixed | The fragment is now a full sentence under the three questions, at the questions' left edge: "Questions like these fill the SQL round of a data engineering interview." (26px, `INK_SOFT`), cued to "Questions like these". Still at 18.5 s. |

No finding was judged wrong. Two places where the page itself is weak, left
as they are (not edited, per the brief):

- The page's LAG query computes its delta with `LAG(revenue, 1, 0)`, so its
  own first delta is a false jump. The video now says so.
- The page's spine block fails in DuckDB as written. This was already known
  and stated in script.ts.

## Voice

**719 characters re-voiced** (the `narrate --dry-run` count), nine beats,
each voiced on its own:

- **P1 and P2, 345:** `r-percent-cume` 68, `r-dupes-copies` 104,
  `r-lag-delta` 66, `frame-def` 47, `frame-def-run` 60.
- **P3, 374:** `rank-use` 115, `frame-pick` 64, `moving-short` 84,
  `r-pivot-dyn` 111.

Five beats were cut free from the kept takes with `--recut`: `r-dupes`,
`r-pivot`, `r-percent` and `r-percent-vals` (take-5), and `frame-pick-range`
(take-2). Checked against `4bff3bc`, `alignment.json`'s meta is unchanged.
Its only differing entries are those 14 beats. No other mp3 changed, and the
takes are untouched.

## Length and checks

- `npm run cues -- de-sql-patterns`: 71 beats, 1542 words, **634.6 s
  (10:34.6)**, up from 590.3 s (9:50.3). The growth: the three new beats
  (about 22 s with their pauses), the split pauses, and the longer holds on
  latest-tie, recursive-stop, r-dupes-copies, r-cte and r-percent-vals.
- Typecheck and eslint for `src/videos/de-sql-patterns/`: clean.
- `npm run check:cues`: nothing in de-sql-patterns. The failures it lists are
  in de-orchestration.
- `npm test`: 73 of 75 pass. Both failures are cue tests naming
  de-distributed and de-modeling-history, other folders mid-edit.
- `check:sync`: pass. 71 beats, worst +0.05 s (`order`), every beat within
  ±0.12 s.
- `check:mix`: pass. The effects sit 29.1 LU under the narration. Where both sound (15.1 s), speech is a median 27.8 dB above the effects (5th percentile 14.7 dB). The closest is 10.3 dB, at 2:44.3.
- `check:motion`: pass. 10:34.8 checked, 0 stretches still for 2 s or more. Its bundle predates the last edit (`textWrap: balance` on one note), which changes no motion.
- `check:frames`: pass, on the final code. 2 illustrations, largest stretch 0.87. 2 arrows within 10°. No hyphen in tabular figures. Every word cue names its occurrence.
- Stills, each looked at, cropped to the change: 18.5, 57, 66.4, 96.8, 99.5,
  178, 201.5, 207.6, 233, 271.6, 318.5, 335, 416, 462.8, 483.3, 497.2,
  529.5, 558.6, 592.9 and 599.3 s. 207.6 and 318.5 were taken again after
  two late touches (the balanced definition note, the spine line's trailing
  comma).

## Facts

`check.mjs` was re-run from the repository root (DuckDB v1.4.3). **Every
existing value in `results.json` came back identical**, setups included,
compared step by step against the pre-fix file. New: `where.whereAggregate`
(the refusal at 400) and `moving.full` (the CASE, which nulls exactly six
rows and gives the 13th 152.142…, rounding to 152.1 as before). The two
errors check.mjs reports are the ones the video shows (the WHERE refusal, and
the page's spine block).

## Noticed, left

- The "the 13th's seven-day average" table draws its full three-row frame on
  `moving-rows` and fills rows 2 and 3 later, so it shows two empty ruled rows
  for about 20 s (visible at 271.6 s). This is how it was built, not a
  finding, and I left it.
- No shared change is needed for any of these fixes.
