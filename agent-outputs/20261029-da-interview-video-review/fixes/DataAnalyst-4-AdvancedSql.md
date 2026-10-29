# DataAnalyst-4-AdvancedSql: fixes

Report: `agent-outputs/20261029-da-interview-video-review/DataAnalyst-4-AdvancedSql.md` (1 P1, 9 P2, 8 P3). All 18 findings are dealt with: 16 fixed here and 2 already done centrally (5 and 16), both confirmed in stills.

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P1 | ROWS demo ordered by a tying column | fixed | `check.mjs` `frame.rows` is now `OVER (ORDER BY day, id ROWS BETWEEN …)`, outer `ORDER BY day, id`. `frame-rows` was re-voiced as "…so with id breaking the tie, the running total climbs…": the listing's `ORDER BY day, id` line is marked on those words, and "`id` breaks the tie: payment 2, then 3" (ids read from the data) sits beside the result. New beat `default-ties`: "Tied days share one total. For a total that moves one row at a time, write rows and a unique order yourself." Both 425s are marked, with "tied days share one total" and a green "row by row: `ROWS` and a unique `ORDER BY`" beside them. New beat `running-safe`, "The default frame is safe here because each day appears once.", with the same words as a note under Question 9's listing. |
| 2 | P2 | Q7 card not read | fixed | `default` is split, and its first beat, re-voiced, reads the whole card: "Question seven. What is the default frame, and why does it matter?" The answer follows: `default-range` (cut free from the take), `default-ties` (new) and `default-whole` (cut free). |
| 3 | P2 | 17px text | fixed | The spine listing is 19px: it moved to x 720, width 630, and its result to x 1380. The chart's axis labels are `label(19, …)`. The recursive CTE listing is 19px (width 620 still fits its 49-character line). |
| 4 | P2 | Frame defined with no frame drawn | fixed | The bracket's first step is now at "the slice of rows", spanning rows 1 to 2 with the dot on row 2. The ROWS steps take over at "a hundred". |
| 5 | P2 | Two highlight cues never render | moot (central) | Confirmed in stills. At 83.5 s South's 1 is green. At 202.6 s both 425s are marked on "Both get four twenty-five". The `bothAt` marks now leave as the default frame's listing arrives, so `default-ties` can mark the same cells again visibly. |
| 6 | P2 | "then keep WHERE rn = 1" under a query that can't take it | fixed | On "keep row one" the listing becomes `LATEST.kept` (the CTE form, already in `results.json`). Its `ORDER BY updated_at DESC` line stays marked, and `WHERE rn = 1` turns green. The note now reads "keep `rn = 1` in an outer query, or with `QUALIFY`". |
| 7 | P2 | `ROW_NUMBER` answers never mention a tiebreaker | fixed | New beat `topn-tie`: "Which one is arbitrary, unless you add a tiebreaker to the order by, such as product." The `ORDER BY revenue DESC` line is marked, with the note "which one is arbitrary, unless `ORDER BY` breaks the tie". New beat `latest-tie`: "A tie on the timestamp needs a tiebreaker too. Group by with max finds the newest date, but loses the plan that goes with it." Two notes carry it on screen. |
| 8 | P2 | ROWS counts rows, not days | fixed | New beat `moving-days`: "Rows counts rows, not days. If a day can be missing, use range with an interval, or fill in the dates first: question twelve." The bracket moves to a three-row frame (Jan 4 to 6, dot on 213.33, the trailing value). The note reads "rows, not days. If a day can be missing:" over `RANGE BETWEEN INTERVAL 2 DAY PRECEDING AND CURRENT ROW`, a clause read from a new `check.mjs` step (`spine.rangeDays`) that ran on the spine's gappy sales. |
| 9 | P2 | Q8 drops `FIRST_VALUE` and `NTH_VALUE` | fixed | New beat `last-first`: "First value is safe, since the default frame starts at the first row. And enth value is null until the frame reaches row N." The left `LAST_VALUE` listing and table give way to a new `check.mjs` step, `last.firstNth`. `first` is 100.00 on every row (marked green); `third` is null, null, then 75.00 (marked as the words come). |
| 10 | P2 | `r-percent` rushed, no formula | fixed | Split at the sentence. `r-percent` was re-voiced as "And percent rank is rank minus one, over rows minus one: zero for the first row, one for the last." (`pauseAfter` 0.5). `r-cume` is the old second sentence, cut free from the take. A 22px note "`pct_rank` = (rank − 1) / (rows − 1)" sits beside the table, and the 0 and 1 marks land on their words. |
| 11 | P3 | Colors against meanings | fixed | All of these are now yellow (`MARK`): RANK's 11, the LAG `change` marks, the NTILE(5) extra-row cells and CUME_DIST's 0.2. "skips" is weight 650 in ink. |
| 12 | P3 | Centered bracket beside trailing averages; "centred"; mixed decimals | fixed | The centered bracket step is dropped. The column holds the trailing average, so the centered frame stays a clause note. The note is spelled "centered". `moving_avg_3` is `ROUND(…, 2)::DECIMAL(8,2)`, so it prints 100.00, 175.00, 141.67. The listing gains a line (`AS moving_avg_3` on its own) to stay inside 820px at 19px. |
| 13 | P3 | Rapid tables summarize queries not shown | fixed | The NTILE tables are titled "`NTILE(4)`: customers per bucket" and "`NTILE(5)`: customers per bucket" (the second table moved 40px right to make room). The recursive figure's listing is now `check.mjs` `recursive.levels`, rewritten as the full CTE ending `SELECT depth, COUNT(*) AS people FROM org GROUP BY depth ORDER BY depth`, so the table beside it is that listing's own result. |
| 14 | P3 | Gap chart squeezed, labels in line with the note | fixed (another way) | The suggested lift (base 640, top 470) would have run the Mar 1 to Mar 3 line into the `without` listing's box. The chart moved instead into the empty middle-right, under where the spine listing appears (x 790 to 1290, 500px wide against 340 before, base y(800)). Its labels are now about 150px below and 360px right of the red note, and the right half is no longer empty during `spine`. |
| 15 | P3 | Scene changes through an empty page | fixed | Window, Rank and Frame now start their clear at `n.beat(next).from - 8 - 30` (a 36-frame ease), so the finished page holds through the bridge and the scene gap and fades into the cut. Stills at 87.9/88.7/89.6, 168.3/169.0 and 263.4/264.2 s show the old page fading as the next kicker inks in. No full blank second is left. The kicker alone for about 1.4 s before the card text is the series' card timing and was left. |
| 16 | P3 | Frame keywords plain | moot (central) | Keywords render purple in every listing still. `DAY` (in `INTERVAL 1 DAY` and `INTERVAL 2 DAY`) is still plain ink. That needs a shared change (below). |
| 17 | P3 | Rapid answers miss their one-line follow-ups | fixed | New voiced beats: `qualify-where` "Postgres and SQL Server don't, so there you wrap the query.", `spine-calendar` "Engines without generate series use a calendar table instead.", `r-lag-null` "The first row gets null, unless you pass lag a default." and `r-bucket-last` "Weeks start on Monday here, and the last one holds only three days." Each has its note or marks. On screen only: item 15 is now "A window in `WHERE` or `HAVING`", with the note "windows run after `WHERE` and `HAVING`…", because the narration already says "computed after where, group by and having". LAG also gets the note "the row before, not the day before". |
| 18 | P3 | Rank marks vanish on the tie bands | fixed | The tie bands now leave on "Row number gives every row" (they had stayed until `denseAt`), so the yellow marks on 8, 8, 8, 11 sit on white. Checked at 110 s. |

## Voice

- **1,178 characters re-voiced**, 13 beats, each voiced alone with `narrate --only`. P1 and answer findings took 941 characters: `frame-rows` 145, `default` 66, `default-ties` 108, `running-safe` 61, `topn-tie` 85, `latest-tie` 125, `moving-days` 125, `last-first` 123 and `r-percent` 98 (`default` and `r-percent` are finding 2 and finding 10). P3 took 242: `qualify-where` 59, `spine-calendar` 61, `r-lag-null` 55 and `r-bucket-last` 67.
- **Cut free from the kept takes with `--recut`:** `default-range`, `default-whole` and `r-cume`. After the recut, every other beat's `alignment.json` entry was byte-identical to HEAD; only those three were added.
- `pauseAfter` moves (free): `qualify`, `last`, `running`, `moving`, `latest` and `spine-fix` went to 0.6, and each new beat after them carries the old pause.
- "enth value" is the spoken form of `NTH_VALUE`, noted in the script header beside "N tile" and "cume dist".

## Length and checks

- **New length: 473.6 s (7:53.6), was 395.7 s**, 53 beats, 145 wpm (`npm run cues -- da-advanced-sql`). The added 78 s is ten new sentences, all of them answers.
- Typecheck (`da-advanced-sql` lines): clean. ESLint `src/videos/da-advanced-sql`: clean.
- `npm run check:cues`: nothing for `da-advanced-sql`. Its failures are all `da-pandas` and `da-statistics-communication`, which other fixers are editing.
- `npm test`: 67 pass, 2 fail. Both failures (cue-scan test 7 and scenes test 45) name only `da-pandas` and `da-statistics-communication`. The acronyms test passes.
- `check:motion`: passes. 7:53.8 checked, nothing still for 2 s or more.
- `check:sync`: SYNC_RESULT
- `check:mix`: MIX_RESULT
- `check:frames`: passes. 2 illustrations (largest stretch 0.92), no hyphen in tabular figures, no ambiguous cue.
- Stills, each looked at: 83.5, 87.4, 87.9, 88.7, 89.6, 110, 115.8, 139.5, 162.5, 168.3, 169.0, 180, 189.5, 194.5, 202.6, 218.5, 227.5, 231.8, 248.5, 258, 263.4, 264.2, 282.5, 300, 311, 330, 340.5, 352, 361, 365.5, 366.6, 383.5, 394.5, 406.5, 421.5, 435, 456.5 and 462.5 s.

## `results.json`

Every existing value came back identical except `running.both`'s `moving_avg_3`, which finding 12 is about. It changed from DOUBLE to DECIMAL: the same 24 numbers, now printed at scale 2 ("100.00" for 100, "141.67" for 141.67), checked row by row. The SQL text changed for three steps:

- `frame.rows` (finding 1). **No value moved**: DuckDB had already put payment 2 before payment 3, so the new deterministic order gives the same 100, 350, 425, 605 on the same ids.
- `running.both` (finding 12).
- `recursive.levels` (finding 13). Its values are unchanged: 1, 3, 6, 11, 3.

New steps: `last.firstNth` (100.00 ×4; null, null, 75.00, 75.00) and `spine.rangeDays` (100, 175, 162.5, 132.5, 167.5; only its frame clause is shown). DuckDB is still v1.4.3. I ran `check.mjs` with `NODE_PATH=$S/DataScientist-10-Sql/deps/node_modules node --import $S/DataScientist-10-Sql/hook.mjs`.

## Noticed

- **Shared change recommended:** add `DAY` (and `DAYS`) to `KEYWORDS` in `da-sql/parts.tsx`, so `INTERVAL 1 DAY` and `INTERVAL 2 DAY` color as one keyword phrase.
- **Page:** nothing wrong found. The page's Q8 heading names `FIRST_VALUE` and `NTH_VALUE`, but its body only covers `LAST_VALUE`. The video now answers the other two from `check.mjs`.
- `parts.tsx` was not touched (`colsOf`, `geoOf` and `rowsAt` are unchanged), and nor was `da-sql/parts.tsx`. `RAPID.org` and `RUNNING.centered` are still exported but no longer drawn. The `check.mjs` steps behind them are kept, so no existing value is dropped.
- The "back, as 0" note still sets `TABULAR` over a short phrase (no hyphen, so `check:frames` passes). I left it.
