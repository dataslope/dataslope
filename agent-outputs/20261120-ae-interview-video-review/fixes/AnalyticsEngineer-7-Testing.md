# AnalyticsEngineer-7-Testing: fixes

Video `ae-testing`, from the review in
`agent-outputs/20261120-ae-interview-video-review/AnalyticsEngineer-7-Testing.md`.
Length 580.2 s before, **593.0 s (9:53) after** (`npm run cues -- ae-testing`).

## Findings

| # | Sev | Status | What changed |
| - | --- | ------ | ------------ |
| 1 | P1 accuracy | fixed | Question 1's pipeline now runs `fct_orders` ("built, then tested") → the stop bar ("run fails", "Stopped, loudly") → `fct_revenue`, dashed gray with a "skipped" chip → Dashboard, "No bad rows reach it". The dashboard reads the mart a failing test keeps from building, not the tested table, which `dbt build` has already rebuilt. This matches Question 8. Question 2's `raw.orders` and the fix path are unchanged. No narration change. |
| 2 | P2 accuracy | fixed | `check.mjs`: `COMPILED.unique` gains dbt's own `WHERE order_id IS NOT NULL` (from `default__test_unique`), and a new step `uniqueTwoNulls` runs it with a second null key added. It still returns only order 3, with a matching `expect`. The unique pane shows the WHERE line, highlighted on "it skips nulls". `builtins-pair` is split. Its first sentence is re-voiced: "Notice that unique let the missing ID through: it skips nulls, so even two of them would pass." The rest becomes `builtins-key`, recut from the take. The note reads "Not here: `unique` skips nulls". |
| 3 | P2 answer | fixed | New beat `ci-defer`, voiced: "With the defer flag, the orders fact table reads it from production instead." On screen, "`--defer`: read from production" sits over the `stg_orders` → `fct_orders` edge. The script header records that this is the video's addition: the page's command has no `--defer`. |
| 4 | P2 | fixed | Question 1's table and its name ink in on "Any rows back", with the failures. "0 rows: pass" is now shown on the query alone, never beside rows that fail it. |
| 5 | P2 pacing | fixed | `metric-unit` split at its colon (both halves recut, free): "And a unit test would have caught it before it shipped:" (pauseAfter 0.5) / "one mocked order …" as `metric-unit-run` (pauseAfter 2.4). `metric-why` pauseAfter goes from 0.6 to 0.9. The unit test's finished row now holds about 3.4 s before the cut, where it was about 2. |
| 6 | P2 pacing | fixed | pauseAfter goes from 0.7 to 1.4 on `r-source`, `r-severity`, `r-fatigue` and `r-store`, and from 1.0 to 1.6 on `r-upstream`. "Do both", "error at 100", "gets ignored", "you can query" and "Fixed once, for all three" now stay up about 2 s after they are said, where they stayed 1.0 to 1.6 s. Timing only. |
| 7 | P3 | fixed | The bracket's label reads "Both passing: a valid primary key". |
| 8 | P3 | fixed | Finance's 150.00 carries `MARK_GREEN`. The model's 350.00 stays red. |
| 9 | P3 | fixed | The "Make it generic" arrow ends about 25 px from its label (`COL_X[0] + 190`). |
| 10 | P3 | fixed | Question 3's panes are spaced by `max(listing, result + 16)`, and the figure is lifted (`FIG_Y` 330 to 285) to absorb that and the WHERE line. Each badge now sits about 45 px under the result above it, where it sat 20 px, and the last listing still ends at y ≈ 985, where it ended at 975. Question 5's singular block moves down to `y(600)`, about 55 px under the YAML. |
| 11 | P3 | fixed | A solid gray bracket now runs down the right of the whole DAG, and the dashed "compared" line joins its middle to the production manifest, which moved to x 1420 to give "compared" room. "Slim CI" and the merge button sit under the manifest. |
| 12 | P3 | fixed | "Orders loaded" sits beside Question 9's bars. The freshness sketch's y ticks read "6 h old" and "12 h old" (the sketch's left edge moved 20 px to fit them). |
| 13 | P3 | fixed | The upstream models moved to `BX + 340`. The COALESCE chips now end about 95 px from the edge, where they ended 32 px from it. |

## Voice

There are **170 characters re-voiced** (budget 1,000). Each beat was voiced on its own with `--only`:

- P2: `builtins-pair` (94), `ci-defer` (76). No P3 needed voice.

These were cut free from the kept takes with `--recut`: `builtins-key` (take 2), `metric-unit` and `metric-unit-run` (take 4). The recut wrote only those three files. Every other beat's mp3 is byte-identical (md5 compared before and after).

## Facts

`check.mjs` was run again, and it reports "every value matches the script". **Every existing value in `results.json` came back identical.** The diff is only `builtins.steps.unique.sql` (the null filter, which is the finding) and the new step `builtins.steps.uniqueTwoNulls` (rows [[3, 2]]).

## Checks (on the final code, through `out/entries/AnalyticsEngineer-7-Testing.tsx` and the queue)

CHECKS_PLACEHOLDER

Stills looked at: 49, 52, 61.8, 62, 91.5, 121, 140.5, 148.4, 185.5, 223.5, 272, 305.3, 313, 388, 415, 431.5, 449, 574 and 578.5 s. They show:

- the pass state without the table, and the table arriving with the failures;
- the new pipeline in Questions 1 and 2;
- the WHERE line and its highlight, "skips nulls" and the bracket label;
- the generic arrow, and Question 5's spacing;
- the "h old" ticks;
- the defer label, the project bracket and "Slim CI";
- "Orders loaded" and the green ledger value;
- the held unit test and "Do both";
- the chips' margin.

After the first set, the pipeline was compressed (its note had reached y ≈ 1003) and Question 3 was lifted (its last listing had reached y ≈ 1017). After the second, "compared" was given room before the manifest (it was 6 px from the box). Each change was checked on a new still.
