# DataAnalyst-2-Pandas: fixes

Report: `agent-outputs/20261029-da-interview-video-review/DataAnalyst-2-Pandas.md` (2 P1, 11 P2, 7 P3). All 20 findings are fixed; two are fixed differently from the suggestion (noted in the table). Nothing outside `video/src/videos/da-pandas/` (except `parts.tsx`, which is untouched), `video/public/narration/da-pandas/` and `video/out/DataAnalyst-2-Pandas-*` was written. Nothing is committed.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P1 | Q5 share computed from a column the table doesn't show | Fixed (differently) | Q5 opens a `transform("sum")` column (160, 160, 200, 200, 50, from a new `groupby.transformSum` step) between the means and `pct_of_region`, and fades the `transform("mean")` column to pale grey on "question five". Row 0's 100 and 160 turn yellow together, then 62.5 green; the side note reads 100 ÷ 160 = 62.5% from the same step. This is an added column rather than a cross-faded second table: `DataTable` can't swap a header, and the added column also shows "the region total from transform" as it is said. |
| 2 | P1 | Q12 drops the page's `.copy()` | Fixed | `check.mjs` `subset` step is now the page's line, `north = df[df["region"] == "North"].copy()`. The re-run printed the same result as before: `north` amounts 0 and 0, the parent 100, 80, 120, 50 unchanged, and no warning (pandas 3.0.2). `copy-view` split three ways; its last sentence re-voiced as `copy-when`: "When you want a separate subset, say so with copy. Then the parent never changes, in any version of pandas." The `.copy()` line is marked yellow on "say so with copy", with the notes "a separate subset? say so: `.copy()`" and "df stays as it was in every version of pandas". Q12's notes moved right to make room for the longer line. |
| 3 | P2 | Only a cell's first highlight drew | Fixed (rest of it) | Central fix verified in stills (Q7's relabelled 2 and 3 turn green; Q10's bfill turns red). The ffill marks now lift on "borrows from the future" (`MissingScene`). |
| 4 | P2 | Console box 22px short | Moot (central) | Checked in stills: the `type()` console, both CSV consoles, 226 and (4, 3) sit inside their boxes. |
| 5 | P2 | Q2 ends on two broken snippets; no `\|` or `~` | Fixed | New beat `filter-ops`: "So use an ampersand for and, a pipe for or, a tilde for not, and brackets around every condition." `& and`, `\| or`, `~ not` ink in under the table on their words; the working `mask = (...) & (...)` listing comes back under the ValueError, green on "brackets around every condition", and the two kept rows turn green again. |
| 6 | P2 | Q3 never says what groupby returns; no stage labels | Fixed | New beat `gb-object`: "On its own, groupby returns a GroupBy object. Nothing is computed until you aggregate." On screen: `type(df.groupby("region"))` and its console, `<class 'pandas.api.typing.DataFrameGroupBy'>` (new `groupby.object` step), and "nothing computed until you aggregate". Italic heads "split", "apply", "combine" ink in over the pieces, the sums and the Series on their words. |
| 7 | P2 | Three finished answers cleared within ~1.5 s | Fixed | `gb-agg` (Q3's last beat) and `merge-ignore` (Q7's) hold 1.6 s. Q8 is relaid so the one-key listing and its four rows stay, dimmed, under the two-key result rather than leaving. |
| 8 | P2 | Q8 empty page while "Pass a list" is said | Fixed | Stock and prices ink in on "Question eight"; the two-key listing (whole line yellow, then green on "Merge on both") appears on "Pass a list"; its key columns in both tables turn yellow on "product and warehouse". The one-key listing and four-row table come in below on "product alone", and the two-row result fills in under the two-key listing on "Merge on both". `left_on=`/`right_on=` note beside it. |
| 9 | P2 | Q7 never says why duplicate labels hurt | Fixed | `merge-index` split; middle re-voiced as `merge-dup`: "Two rows answer to label zero, so lock zero returns two orders, and anything that lines up on the index pairs the wrong rows." `pd.concat([jan, feb]).loc[0]` and its two red-banded rows (new `merge.dupLabel` step) appear on "lock zero returns", with "anything aligned on the index / pairs the wrong rows"; they leave as the `ignore_index` listing takes their space. |
| 10 | P2 | Q1 leaves out slicing | Fixed | New beat `loc-slice`: "Slices differ too. Lock zero to two includes label two: three rows. Eye lock zero to two stops before position two: two rows." `df.loc[0:2]` / `df.iloc[0:2]` (new steps, 3 and 2 rows) with their counts; the fresh frame bands rows 0 to 2, then 0 to 1, in data blue, with label 2 yellow. |
| 11 | P2 | Q17 never says pivot_table defaults to the mean | Fixed | `reshape-table` split; first part re-voiced: "Pivot table aggregates, like a spreadsheet, with the mean by default. This call asks for the sum." The `aggfunc="sum",` line turns yellow on "asks for the sum"; note "with no `aggfunc`, the mean: North and A would be 15.0" (new `reshape.pivotMean` step). |
| 12 | P2 | CSV answer shows test plumbing, never `read_csv` | Fixed | `check.mjs` writes a real file in Pyodide's filesystem: `df.to_csv("sales.csv")` with the file's text in a console ("in sales.csv"), `pd.read_csv("sales.csv")` with the `Unnamed: 0` table, and `df.to_csv("sales.csv", index=False)` in green with its file. Values identical to before. |
| 13 | P2 | "dense leaves no gaps" shown on data with no ties | Fixed | Amounts are now 120, 80, 200, 120 (the finding's). One frame carries `min` (2, 4, 1, 2) and `dense` (2, 3, 1, 2) from two listed calls. `r-sort` split; new `r-rank`: "Rank numbers them, and ties share a rank. After a tie, min skips a number; dense doesn't." The tied ranks are marked on "ties share a rank", South's 4.0 and 3.0 on their words. |
| 14 | P3 | Unnamed Series draw a blank header; dtypes beside the wrong line | Fixed | `isna().sum()` and `df.dtypes` render with no header band; the dtypes table's first row is level with `df.dtypes` (and 40px clear of the memory listing). |
| 15 | P3 | Three beats with no internal pause | Fixed (by splitting) | `copy-view` split after "A copy doesn't." (0.6 s) and after "the parent is unchanged." (0.5 s); `loc-trap` after "two and four." (0.5 s); `gb-returns` split from `gb-agg` (0.5 s), and `gb-object` now comes before it. Cut free from the takes; `gb-returns` was not re-voiced slower, the pause is the fix. |
| 16 | P3 | "copy on write" undefined; ChainedAssignmentError looks like a crash | Fixed | `copy-three` split; re-voiced: "Pandas three makes that explicit, with copy on write: the filtered rows are their own copy." (kept short of Q12's "anything you take from a frame acts as a copy", which would have repeated it). Note under the box: "a warning: the line runs, and df stays as it was". |
| 17 | P3 | Q2's first mask is already the combined one | Fixed | `df["amount"] > 100` (new `filter.gt` step: True, False, False, True, True) is shown first; on "with an ampersand" the listing becomes the combined mask and row 3 swaps to False. |
| 18 | P3 | Numbers and names without context | Fixed | New `vector-range`: "Here the function is the range: max minus min." (the lambda line is marked on it). `vector-why` re-voiced "...one call into compiled C" (note "1 call, in compiled C"). Q6 shows `customers` where the merge result lands, until the result replaces it. Q8: "`warehouse` is on both sides, so the merge keeps `_x` and `_y`". No speed figure was added for Q13: the page's 10-100x is not something `check.mjs` measures. |
| 19 | P3 | Small follow-ups dropped | Fixed | `missing-choose`: "...why it's missing, and how much." `vector-cell`: "And data frame map, formerly applymap, works on every cell." (plus a note). `merge-what`: "...one on top of the other, or side by side with axis one." (plus `axis=1: side by side`). `r-dupes`: "Duplicated, on the email column, flags two repeats." with the email cells marked and "on every column instead: 0" (new `duplicates.countAll` step); `keep="last"` is an on-screen note only. New `r-info`: "Info gives all three at once." with a `df.info()` listing (run in `check.mjs`). |
| 20 | P3 | "first true condition wins" not shown | Fixed | `np.where(df["amount"] >= 500, "Large", "Small")` is its own listing above `np.select` (new `case.where` step). Only the two Large rows are marked on "first true condition wins", with "both conditions hold: the first wins, Large". |

## Voice

1,320 characters re-voiced, 15 beats, each `--only` on its own; 17 more beats cut free from the kept takes with `--recut` (every unchanged beat's alignment entry and MP3 is byte-identical to the committed ones).

- P1 (107): `copy-when`.
- P2 (619): `loc-slice` 125, `filter-ops` 97, `gb-object` 86, `merge-dup` 125, `reshape-table` 97, `r-rank` 89.
- P3 (594): `merge-what` 77, `missing-choose` 170, `copy-three` 91, `vector-why` 71, `vector-range` 46, `vector-cell` 59, `r-dupes` 51, `r-info` 29.

`missing-choose` is re-voiced whole: its text in the take says "Drop N A", so the unchanged second half could not be cut from it.

## Length and checks

- Length: 623.6 s (10:24), from 547.4 s (9:07); 81 beats.
- `tsc` and `eslint` for `da-pandas`: clean. `npm test`: 69 pass, 0 fail. `check:cues`: pass.
- `check:motion`: pass (0 still stretches of 2 s or more).
- `check:sync`: pass, worst +0.03 s (`vector-map`).
- `check:mix`: narration -19.8 LUFS, effects 26.5 LU under; closest 7.1 dB at 5:58.9.
- `check:frames`: pass (arrows, no hyphen in tabular figures, every cue names its occurrence).
- Stills: 46, at every changed moment, each looked at; the round-1 problems (a yellow mark lost on a yellow band, small operator glyphs, Q7's `.loc[0]` listing under the reset listing, two `QMono` notes at 18.5px, the dtypes table touching the memory listing) were fixed and re-stilled.

## results.json

Every existing value came back identical except `sort.sorted` and `sort.ranked`, which finding 13 changes (the tied amounts; `ranked` now carries `min` and `dense`). `subset.subset` and the four `csv` steps changed code only (`.copy()`; a file instead of a buffer); their values are identical. New steps: `loc.locSlice`, `loc.ilocSlice`, `filter.gt`, `groupby.object`, `groupby.transformSum`, `merge.dupLabel`, `reshape.pivotMean`, `sort.rankMin`, `duplicates.countAll`, `case.where`, `shape.info`. Run with the private Pyodide copy, as the brief says.

## Noticed, and shared changes recommended

- The pandas 2 behaviour in finding 2 (the old two lines warn SettingWithCopyWarning) can't be run here: the Pyodide copy has pandas 3.0.2 only. It is pandas' documented behaviour and the page's own reason for `.copy()`.
- The page's two `.copy()` lines differ (Q11's block uses `df.loc[...]`, Q12's `df[...]`); the video follows Q12's. Not edited.
- Q6's merge listing uses `orders`, which is only defined on screen in Q7 (`orders = pd.concat(..., ignore_index=True)`). Pre-existing; left.
- `da-pandas/parts.tsx` (not edited): (a) `Listing` marks can only band a whole line, so Q8 marks the whole `on=[...]` line where marking the list alone would be sharper; a character range on a mark would allow it. (b) `DataTable` with `headH: 0` still draws its header hairline 1px above the top rule; skipping it when `headH` is 0 would make the headerless Series exact.
