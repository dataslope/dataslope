# DataScientist-10-Sql: P3 fixes

Folder `video/src/videos/ds-sql/`, built on the committed P2 pass. Nothing outside the folder, its narration and its takes was edited: not `da-sql/parts.tsx`, `da-advanced-sql/parts.tsx`, the kit or `sql.mdx`. `results.json` and `check.mjs` are unchanged. The two new on-screen numbers were already in `results.json` (`latest.rows.orders` = 24, and the `cohort.rates` query), so `check.mjs` was not re-run.

## P3s

| # | Finding | Status | What changed |
| --- | --- | --- | --- |
| 8 | p90 strip: leftover rings, and a count that disagrees with its label | fixed | The median's rings (black on 180, green on 150) now fade with the median marker at "That's why latency". The p90 `DISC` ring on the 900 dot is gone; 900 stays in the table. The note now reads "9 in 10 finish within it (here, 10 of the 12)", with the 10 counted from `PCT.values` ≤ p90. |
| 9 | Follow-ups left out | fixed | `r-rank` re-voiced: "…one, two, three, four, and which tied row comes first is arbitrary." On screen, under the table: "`ROW_NUMBER` on a tie: Ben or Cy could be 2" (the names and the 2 come from the data). The rule sentence of `session` re-voiced: "…passes a threshold, commonly thirty minutes." The rule bar is now labelled "a common threshold: 30 min". Cohort: the query's last `SELECT` (`ROUND(100.0 * retained / FIRST_VALUE(retained) OVER (…)) AS pct FROM counts`, from `cohort.rates`) sits under the grid, and its `FIRST_VALUE` line is marked on "the cohort's month zero". Churn: the `NOT EXISTS` listing (`RETAIN.notExists`) is printed under "`NOT EXISTS`: the same three", with its `WHERE NOT EXISTS (` line in green. |
| 10 | Session breaks drawn in error red | fixed | The rule bar, the 95 and 205 arcs and the rings on the hits that open a session are now yellow (`ds("yellow", 500/600)`), matching the table's yellow `is_new` marks. Their labels are in ink. |
| 11 | Detached colon, wide mono spaces | already done | Colon fixed in the P2 pass; `QMono` spacing fixed centrally (`05b0cad8`). |
| 12 | Text touching box edges | already done | Fixed in the P2 pass, as part of the #7 widening. |
| 13 | Three rapid answers end without their point | fixed | `r-having`: the `HAVING` listing now stays up with its 4-row result beside it, and its `HAVING` line is green. The `COUNT`-in-`WHERE` version is printed below it, its `WHERE` line turning red as DuckDB refuses, with the error under it. `r-latest`: the note reads "24 orders in, 12 rows out: one per customer". `r-count`: the note reads "8 views: volume; 4 people: reach". All the numbers come from `results.json`. |
| 14 | Two densest beats | fixed | The hook half was done in P2. `r-topn` now has `pauseAfter: 0.8`, which costs no voice. |
| 15 | The opening promise covers less than half the video | fixed | `hook-sql` re-voiced: "Building it is a classic data science SQL question. Its pieces, and the patterns around them, get asked on their own." The headline turn changes from "built one question at a time." to "and the queries around it.", cued to "the patterns around them". |

**Also fixed in the scenes I touched:** SVG `<text>` takes its color from `fill`, as the P3 brief warns. The session scene's "session N" labels were meant to be green and its axis ticks soft, but both drew black, so they now set `fill`. The percentile scene's axis ticks get the same fix.

## Voice

- **319 characters re-voiced:** `hook-sql` 117, `session-rule` 101, `r-rank` 101. Each was voiced alone with `narrate --only`.
- **Splits, at no cost.** `session` became `session` / `session-rule` / `session-user`, and `r-rank` became `r-rank` / `r-rank-skip`. Both were cut from the kept takes (take 3 and take 4), not from the beats' own files. Plain `narrate --recut` refuses this video because three beats were re-voiced alone in P2. So I used `$S/DataScientist-10-Sql/tools/recut-take.mjs`, which runs narrate's own `--recut`, unchanged, on a scratch root. That root's script is one take's own beat texts, split into the current beats. Before any text changed, it re-cut every untouched beat of takes 3 and 4 byte-identical to the committed files, both MP3 and alignment entry. The one exception was `r-running`, which was re-voiced alone in P2 and is no longer in the take. Only after that did I change the two pieces' texts and re-voice them.
- **New length: 410.4 s** (was 400.3), 40 beats, 142 wpm (`npm run cues -- ds-sql`).

## Checks

| Check | Result |
| --- | --- |
| Typecheck (ds-sql lines only) | clean |
| ESLint `src/videos/ds-sql` | clean |
| `npm run check:cues` | passes |
| `npm test` | 59 of 59 pass |
| `check:motion` | passes. It checked 6:50.5. Nothing holds still for 3 s; there are two 2.5 s holds, at 0:46.5 (`join`) and 1:39.3 (`rate-in`). |
| `check:sync` | passes. All 40 beats start within ±0.12 s of their cues; the worst is +0.04 s (`rapid-in`). The re-voiced beats are at +0.01, +0.01 and +0.00 s. |
| `check:mix` | passes. Narration is −19.7 LUFS and the effects sit 28.6 LU under it. The closest moment is 12.3 dB, at 4:20.6. |
| `check:frames` | not run: no arrow, illustration or ERD changed |

I looked at stills at every changed place: 28, 96, 100, 186, 193 (twice), 218, 229, 244, 284, 290 (twice), 307.5 (twice), 326 (twice), 351, 375 and 400 s. Three things were corrected after the first look:
- The having listing went back to 740 wide, because its `HAVING` line overran 700.
- The row-number tie marks were dropped, because they were yellow on the yellow tie bands.
- The p90 count was reworded.

## Noticed, left

- **"the slow tail" label.** It is still drawn black. Its SVG `<text>` sets only CSS `color`, while its bracket is red. Giving the label `fill` would make it red, and the series keeps red for the trap, so I left it as it was rather than decide its color here.
- **`FROM counts` in the cohort snippet.** It names the third CTE of the same query, which is never on screen; the earlier listing ends at the counting `SELECT`. The snippet's job is the `FIRST_VALUE` line, and the narration ("Count distinct users…") names the counts, so I left it.
- **No shared-kit change is needed for these P3s.**
