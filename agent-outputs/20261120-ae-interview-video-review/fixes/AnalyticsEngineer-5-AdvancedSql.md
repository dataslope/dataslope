# AnalyticsEngineer-5-AdvancedSql: fixes

All 14 findings fixed (1 P1, 4 P2, 9 P3). New length **10:57.5** (657.5 s, was 10:50.6): two new beats and three longer pauses. 181 characters re-voiced, all for P3s.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 accuracy | fixed | `data.ts` now reads the tied pair's row numbers from the tie's own ROW_NUMBER run (`LATEST.tieRowNumber`, step `tie.rowNumber`), not from the order the `three` listing prints. The run kept c4@x.com, so the row_number column reads 2, 1, 3, 4: c4@x.com is 1 although the listing prints it second, which now shows the pick as arbitrary. RANK is unchanged (1, 1, 3, 4). `data.ts` throws if the run kept no row for customer 3 or the four numbers are not 1 to 4. |
| 2 | P2 spacing | fixed | `WindowScene.tsx`: the Q3 error box no longer passes `markAt`, so the inline-block highlight that stopped before "BY" is gone (and with it the yellow on red). The bare listing's red band on the window line still marks the cause. |
| 3 | P2 confusion | fixed | `RatioScene.tsx`: no strikes. On "keeps the numerator and the denominator" the aov column, title and values, fades to 30% under a paper wash while revenue and orders turn green. `LatestScene.tsx`: the strike through the "email" title is removed; the empty column and the red "The email that goes with it is gone" carry it. |
| 4 | P2 confusion | fixed | `RapidScene.tsx` (Q13): no swap to 0 and no green. The NULLIF result keeps its null, marked yellow, as its listing returns it. The note reads "`COALESCE(…, 0)` turns the null into 0", the 0 read from the COALESCE run. |
| 5 | P2 explanation | fixed | The top-N listing is now an excerpt of DA Part 4's statement: `ROW_NUMBER() OVER (PARTITION BY category` / `ORDER BY revenue DESC) AS rn` / `SELECT * FROM ranked WHERE rn <= 2`. `PARTITION BY category` is marked on "Rank inside each group", `ranked` on "in a subquery", `WHERE rn <= 2` on "keep N or fewer". The tables move down 68 px (the RANK table now ends at y = 906). The code throws if the window lines move. |
| 6 | P3 explanation | fixed | `LagScene.tsx`: December 2023's 385 and January 2024's 100 appear in the data blue beside their points on "falls two hundred eighty-five", January 2023's 145 on "Lag twelve compares it"; all read from `LAG.yoy`, all clear with the arcs. |
| 7 | P3 confusion | fixed | The breakdown is now the expression that ran (the page's block, `LAG.mom`): `revenue -` / `LAG(revenue)` "the value one period back" / `OVER (ORDER BY month)` "one row back, in month order", which also prepares "lag counts rows". The code throws if `LAG.mom` stops containing it. "No self join" is in ink, not the data blue. |
| 8 | P3 confusion | fixed | "-45, should be -100" now sits right of the bold arc's head, beside March 2024 (`px(mar24) + 26`, 150 px above the point), where no arc runs. The unused apex helpers are gone. |
| 9 | P3 confusion | fixed | `WindowScene.tsx`: "1. Group: one row per region" sits level with the GROUP BY line and "2. Window: summed over the groups" level with the SUM(SUM(amount)) line (`listingLineMid`), so the window is visibly written above the GROUP BY it runs after. |
| 10 | P3 confusion | fixed | `SpineScene.tsx`: "An empty last day: outside `MIN` to `MAX`". |
| 11 | P3 accuracy | fixed | `next` split at its first sentence. New beat `small`, re-voiced: "These tables held a few dozen rows at most." (43). The rest of `next` is cut from take 6, free. On screen: "These tables: a few dozen rows at most". The largest table on screen holds 24 rows. |
| 12 | P3 answer | fixed | `r-recursive` split before "Here it counts to five" (its first part cut from take 6, free). New beat `r-depth`, re-voiced: "Here it counts to five. You need one when the depth isn't known in advance: on an org chart, it walks twenty-four people down five levels." (138). On screen, in green above the org-chart note: "When the depth isn't known in advance". |
| 13 | P3 pacing | fixed | Timing only: `pauseAfter` 1.2 on `over-default` (was 0.8) and `frame-default` (was 0.7); 1.4 on the new `r-depth`. With the new sentence in front of "five levels", the org-chart table is now on screen about 5.5 s (from 10:01.4 to Question 18 at 10:07.1), up from about 2.5 s. |
| 14 | P3 spacing | fixed | "The tie, kept" is gone from beside the RANK table; the table's own label now reads "`RANK`: 5 rows, the tie kept", the clause inking on "five rows instead of four". Nothing passes x = 1824. |

One more change, from `check:motion`: after the re-timing, Question 16 held still for 3.0 s (9:25.5 to 9:28.5) between the question and its fact. The fact line now inks on "A common table expression" instead of "a named result", the first word of the definition.

## Voice

- **181 characters re-voiced** (budget 1,000; P3 181 of 300), each beat on its own with `--only`:
  - `r-depth` (138)
  - `small` (43)
- Free recuts from take 6 (`--recut`): `r-recursive` (split), `next` (split).
- Every other beat's mp3 is byte-identical to before (md5 checked); `takes/` is untouched.

## Facts

`check.mjs` was not rerun: every new number on screen (the tie's row numbers, 385, 100, 145, the COALESCE 0) is read from existing steps of `results.json` through `data.ts`. `results.json` is byte-identical to before, so every existing value came back identical.

## Checks (final code, through `out/entries/AnalyticsEngineer-5-AdvancedSql.tsx` and the queue)

- typecheck: no errors in `src/videos/ae-advanced-sql/` (or anywhere)
- lint (`eslint src/videos/ae-advanced-sql`): clean
- `check:cues`: pass
- `npm test`: 79 pass, 0 fail
- `check:frames` (`CHECK_SCALE=1`): pass (4 images, largest stretch 0.41; 15 arrows, 0.0° bend; spacing, sizes, tabular hyphens, cues all clean)
- `check:sync`: pass, 66 beats, worst +0.04 s (`window-why`); `r-depth` +0.01, `small` +0.03
- `check:mix`: pass, effects 28.9 LU under the narration, speech a median 29.0 dB above them
- `check:motion`: MOTION_RESULT
- Stills looked at: 118.5, 125.5, 156.5, 170.8, 324.5, 336.5, 351.0, 418.5, 503.0, 522.5, 560.5, 605.0, 650.0 s (`video/out/review/AnalyticsEngineer-5-AdvancedSql/`), and the Question 16 change in the motion preview.
- The WAVs and the preview the checks left in `video/out/` are deleted.
