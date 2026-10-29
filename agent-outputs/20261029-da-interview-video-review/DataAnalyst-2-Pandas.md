# DataAnalyst-2-Pandas (9:07)

## Verdict
- A careful, accurate video. Every number on screen or in the narration matches `results.json` (pandas 3.0.2 in Pyodide), including:
  - 50 for both `loc[3, "amount"]` and `iloc[3, 1]`, and `KeyError: 0`;
  - the TypeError and ValueError texts;
  - the sums 160, 200 and 50, and 62.5%;
  - four rows against two;
  - `isna` counts of 1 and 2, and 0 for `== np.nan`;
  - 8,900 against 418 bytes, and 226 bytes.

  The tables are large and legible, and the cues land on their words.
- The biggest problems:
  - The Q5 table divides by a `transform("mean")` column, so the figure contradicts its own sum.
  - The Q12 demo drops the page's `.copy()` and shows, as the safe path, code that raises SettingWithCopyWarning on pandas 2.
  - A DataTable bug means only the first highlight on a cell ever draws, so three cued highlights never appear. The worst case is Q10, where yellow stays on ffill while bfill "borrows from the future".
  - Every console box is 22px too short.
- Pacing is comfortable: 2.0 to 2.9 w/s, with 0.55 to 0.8 s gaps. But three answers are cleared within about 1.5 s of finishing (Q3, Q7 and the Q8 fan-out), and Q8 shows an empty page while "Pass a list" is said.
- As interview answers they mostly hold up. They stop short of the follow-ups an interviewer presses on:
  - groupby itself returns a GroupBy object;
  - `|` and `~`;
  - `loc` slices include the end label;
  - why duplicate index labels hurt;
  - pivot_table's default is the mean;
  - "dense leaves no gaps", which is shown on data with no ties.

## Findings

### 1. [P1] confusion: Q5's share is computed from a column the table doesn't show
- When: 142.0-158.1 s, beat `gb-pct` (element-148.jpeg, element-157.jpeg)
- What:
  - The Q5 table keeps Q4's `transform("mean")` column (North 80.0, 80.0; South 100.0, 100.0; East 50.0) right beside the new `pct_of_region`.
  - The narration says "Divide the amount by the region total from transform", and the code under the table uses `transform("sum")`. But the only transform column on screen holds means.
  - Row 0 therefore reads amount 100, transform 80.0, share 62.5. The 160 the division actually uses appears only in the side note "100 ÷ 160 = 62.5%".
- Why it matters: A viewer reading across the row gets 100 / 80, or comes away thinking the share is taken against the group mean.
- Cause: `video/src/videos/da-pandas/GroupbyScene.tsx:71-77`. The scene builds one table for Q3 to Q5, and its fourth column is always `transform("mean")`. Nothing replaces it at Q5.
- Fix: At `q5At`, cross-fade to a second DataTable whose fourth column is `transform("sum")` with 160, 160, 200, 200, 50 (values from `GROUPBY.sum`). Mark row 0's 160 yellow together with its 100 at `percentAt - 6`.

### 2. [P1] answer: Q12's demo drops the page's `.copy()`, and on pandas 2 it is the warning Q11 teaches
- When: 315.2-336.0 s, beat `copy-view` (element-333.jpeg)
- What:
  - The code is `north = df[df["region"] == "North"]` then `north["amount"] = 0`, and the parent's 100 and 120 are marked green as the safe outcome.
  - The page's block is the same code with `.copy()` on the first line. The beat even ends "Call copy when you mean it", and a separate subset is exactly when you mean it.
  - On pandas 1.x and 2.x these two lines raise SettingWithCopyWarning.
  - Q11 has just called "filter, then set, in two steps" the bug. Q12 shows two steps as fine and never says what differs: here you want a separate subset, not to change `df`.
- Why it matters: A viewer can offer this code as the fix in an interview on pandas 2, where it triggers the very warning in question.
- Cause: `video/src/videos/da-pandas/CopyScene.tsx:196` renders `COPY.subset.lines`. That comes from check.mjs's `subset` step (`data.ts:178`), which omits `.copy()`.
- Fix:
  - Run and show the page's line, `north = df[df["region"] == "North"].copy()`.
  - Re-voice the end of `copy-view` as "When you want a separate subset, say so with copy. Then the parent never changes, in any version of pandas."

### 3. [P2] confusion: only the first highlight on a cell ever draws, so three cued highlights are missing
- When:
  - 40.2-44.4 s, `loc-same` (element-043.jpeg)
  - 187.8-189.6 s, `merge-index` (element-189.jpeg)
  - 267.4-277.0 s, `fill-trap` (element-276.jpeg)
- What:
  - Q1: on "Lock at label three and eye lock at row three", neither label 3 nor position 3 lights up. Only the 50 does, at 43.75 s.
  - Q7: after "they run zero to three", the relabelled 2 and 3 should turn green. They stay plain.
  - Q10: on "borrows from the future", the bfill 12.0s on 01-06 and 01-07 should turn red. They lose their yellow and get nothing in its place.
  - Meanwhile the ffill 10.0s stay yellow through the whole trap beat. So the only highlighted cells while the narrator says backward fill uses the future are the forward-filled ones.
- Why it matters: Yellow is "what the narration points at", and here it points at the wrong column. In Q1 and Q7 the moment that matters has no pointer at all.
- Cause:
  - `video/src/videos/da-pandas/parts.tsx:823` picks a cell's mark with `marks.find((m) => m.row === i && m.col === j)`, so a cell's first mark (which has an `out`) shadows any later one.
  - The shadowed marks are `LocScene.tsx:105-106`, `MergeScene.tsx:121` and `MissingScene.tsx:160`.
  - The ffill marks at `MissingScene.tsx:158` have no `out`.
- Fix:
  - In DataTable, pass the latest started mark: `marks.filter((m) => m.row === i && m.col === j && frame >= m.at - 2).at(-1) ?? marks.find(...)`.
  - Add `out: futureAt` to the ffill marks.

### 4. [P2] spacing: every console box is 22px short, so its last line hangs out of the bottom
- When: every Console in the video. Examples:
  - 43.6-46.7 s (the two 50s)
  - 239.4-246 s (0)
  - 441-449 s (the categories)
  - 491, 495-498 and 500-504 s
  - 513-525 s (the three-line CSV consoles)
  - 530-547 s ((4, 3) and 226)

  Frames: element-045.jpeg, element-241.jpeg, element-524.jpeg, element-546.jpeg.
- What: The pale box and its left rule end at the middle of the last line. The last line, and any highlight on it, sits below the box. It is clearest on the CSV consoles, where "1,South,80" and "South,80" straddle the box's bottom edge.
- Why it matters: Text spilling out of its frame is visible on every output in the video.
- Cause: `video/src/videos/da-pandas/parts.tsx:452-456` sets `height: lines.length * lineH` plus padding. Under the page's border-box sizing, the 2 x 11px of padding comes out of that height.
- Fix: Add `boxSizing: "content-box"` to that div, or set the height to `lines.length * lineH + 2 * Math.round(size * 0.5)`, which agrees with `consoleHeight` at line 494.

### 5. [P2] answer: Q2 ends on two broken snippets and never names `|` or `~`
- When: 77.1-97.1 s, beats `filter-parens` and `filter-and` (element-096.jpeg)
- What:
  - At "Leave them off" (79.4 s), the correct `mask = (...) & (...)`, `df.loc[mask]` and its result all exit.
  - The scene finishes on the bracketless line with its TypeError and the `and` line with its ValueError. No working line is left on screen.
  - "Or" and "not" are never mentioned, although the page's answer gives `&`, `|` and `~` together.
- Why it matters: The finished screen of a "how does it work" answer shows only what fails, and `|` and `~` are the obvious next questions.
- Cause: `video/src/videos/da-pandas/FilterScene.tsx:96-104` (`out={offAt - 2}` on the correct listing and its result), and the script's beat `filter-and`.
- Fix:
  - Bring the correct `mask = ...` listing back at `ambAt + 20`, under the ValueError box at y(TOP)+h(440), marked MARK_OK.
  - Extend `filter-and` with: "So: an ampersand for and, a pipe for or, a tilde for not, and brackets around every condition."

### 6. [P2] answer: Q3 never says what groupby itself returns, and the stages are not labelled
- When: 97.4-127.4 s, beats `gb-split` and `gb-returns` (element-117.jpeg)
- What:
  - The question asks "What does groupby return". The narration answers what groupby followed by `sum` or `agg` returns (a Series or a DataFrame).
  - On its own, `df.groupby("region")` returns a DataFrameGroupBy object, and nothing is computed until you aggregate. That is the literal answer and the usual follow-up, along with `as_index=False` or `reset_index()` to get region back as a column.
  - The figure also has no "split", "apply" or "combine" heads over its three columns, although the question names them.
- Why it matters: An interviewer who asks "what does groupby return" is often checking that the candidate knows it is lazy.
- Cause: `video/src/videos/da-pandas/script.ts`, beat `gb-returns`; `GroupbyScene.tsx:138-230` (no stage labels).
- Fix:
  - Open `gb-returns` with "On its own, groupby returns a GroupBy object; nothing is computed until you aggregate." Show `df.groupby("region")` with the type check.mjs prints for it.
  - Add label(21) heads "split", "apply" and "combine" at y(300) over PIECES_X, PIECES_X + 340 and RESULT_X, each on its word in `gb-split`.

### 7. [P2] pacing: three finished answers are cleared within about 1.5 s
- When:
  - Q3: 126.4-127.5 s (`gb-returns` to `gb-transform`). The agg DataFrame finishes inking at about 126.4 s and is gone at 127.5 s.
  - Q7: 187.8-189.6 s (`merge-index` to `merge-keys`). The 0-to-3 relabel lands at 187.8 s and is gone at 189.6 s.
  - Q8: 204.1-205.3 s (`merge-fan`). The red fan-out bands finish at about 204.1 s. The four-row table exits at 205.3 s, on "Merge on both", and is replaced by the two-row result, so the two are never seen together.
- Why it matters: The Series against DataFrame pair is Q3's whole answer, and the fan-out is Q8's whole trap. Each gets about a second as a finished picture.
- Cause:
  - `video/src/videos/da-pandas/GroupbyScene.tsx:233-254` (`out={q4At - 4}`)
  - `MergeScene.tsx:78` (`out1 = q8At - 4`)
  - `MergeScene.tsx:152-160` (`out={bothAt - 2}`)
  - `script.ts`: `pauseAfter` 0.7 on `gb-returns` and 0.8 on `merge-index`
- Fix:
  - Raise `pauseAfter` to 1.6 on `gb-returns` and on `merge-index`.
  - In Q8, keep the one-key table, dimmed (`dim={bothAt}`) instead of `out`, and draw the two-key listing and result below it at y(TOP)+h(430), so "four rows from two" and "two" stand side by side.

### 8. [P2] confusion: Q8 clears to an empty page while its answer is spoken
- When: 189.6-194.6 s, beat `merge-keys` (element-194.jpeg)
- What:
  - Q7's tables exit on "Question eight". For 5 s the page holds only the question card, including during "Pass a list" (193.3-194.6 s).
  - The list itself, `on=["product_id", "warehouse"]`, first appears at 205.4 s, 12 s after it is said.
- Why it matters: The one-line answer is spoken over a blank page and shown well after it was said.
- Cause: `video/src/videos/da-pandas/MergeScene.tsx:143-150` (stock and prices at `stockAt - 4`) and `MergeScene.tsx:161` (two-key listing at `bothAt + 2`).
- Fix:
  - Bring stock and prices in at `q8At + 10`.
  - Show the two-key listing at "Pass a list", at MID_X, y(TOP), with its `on=[...]` marked yellow and its result held back until `bothAt`.
  - Put the one-key listing and its four-row table below it at `aloneAt` (this pairs with the layout in finding 7).

### 9. [P2] answer: Q7 stops before saying why duplicate labels are a problem
- When: 175.6-189.6 s, beat `merge-index` (element-183.jpeg)
- What:
  - "Two rows answer to label zero" is shown with red bands, then "Pass ignore index". It never says what goes wrong.
  - `orders.loc[0]` returns two orders instead of one, and anything aligned on the index (assigning a Series, `join`) pairs the wrong rows.
  - `reset_index(drop=True)` after the fact is not mentioned.
- Why it matters: "Why reset the index?" is a why question, and the because-clause is the part an interviewer is listening for.
- Cause: `video/src/videos/da-pandas/script.ts`, beat `merge-index`.
- Fix:
  - After "label zero", add: "so lock zero returns two orders, and anything that lines up on the index pairs the wrong rows."
  - Show `pd.concat([jan, feb]).loc[0]` and its two-row result at RIGHT_X, run in check.mjs.

### 10. [P2] answer: Q1 leaves out the slicing difference
- When: 24.7-60.1 s, scene `loc`
- What:
  - The answer covers label against position and the KeyError on a filtered frame, which is everything the page says.
  - The classic follow-up is missing: a `loc` slice includes its end label and an `iloc` slice excludes its end position. `df.loc[0:2]` gives three rows; `df.iloc[0:2]` gives two.
- Why it matters: It is the most common loc/iloc follow-up, and it is a one-sentence answer.
- Cause: `video/src/videos/da-pandas/script.ts`, between `loc-same` and `loc-trap`.
- Fix:
  - Add a beat `loc-slice`: "Slices differ too. Lock zero to two includes label two: three rows. Eye lock zero to two stops before position two: two rows."
  - Run both in check.mjs and band rows 0-2 and then 0-1 on the fresh frame.

### 11. [P2] answer: Q17 never says pivot_table defaults to the mean
- When: 424.1-433.2 s, beat `reshape-table` (tiles at 425 s and 432 s)
- What:
  - "Pivot table aggregates, like a spreadsheet. North and A sum to thirty."
  - The code passes `aggfunc="sum"`, but the narration never says the default is the mean, which the page states. Without that argument, North and A would show 15.
- Why it matters: "What does it aggregate with by default?" is the natural follow-up, and a viewer who copies the call without `aggfunc` gets a different number.
- Cause: `video/src/videos/da-pandas/script.ts`, beat `reshape-table`.
- Fix:
  - Re-voice as "Pivot table aggregates, like a spreadsheet, with the mean by default. Ask for sum, and North and A make thirty; fill value puts a zero in the empty cell."
  - Mark the `aggfunc="sum"` line yellow on "Ask for sum".

### 12. [P2] confusion: the CSV answer shows test plumbing and never shows `read_csv`
- When: 512.2-525.0 s, beat `r-csv` (element-524.jpeg)
- What:
  - Both listings read `buf = io.StringIO(); df.to_csv(buf); buf.getvalue()`. That is harness code nobody writes to save a file, and it is never explained.
  - The narration opens "Read CSV and to CSV", but `pd.read_csv` never appears.
  - The `Unnamed: 0` table arrives at 520.7 s with no code that produced it.
- Why it matters: This is the "how do you read and write CSV" answer, and the code on screen is not the code a viewer would write.
- Cause: `video/src/videos/da-pandas/RapidScene.tsx:322-337`; `data.ts:234` carries no code for `readBack`.
- Fix: Pyodide has an in-memory filesystem, so the page's form runs as-is in check.mjs. Show it in three steps:
  - `df.to_csv("sales.csv")`, with the file's text in a console;
  - `pd.read_csv("sales.csv")`, with the `Unnamed: 0` table;
  - `df.to_csv("sales.csv", index=False)`, in green.

### 13. [P2] explanation: "dense leaves no gaps" is shown on data with no ties
- When: 450.3-456.1 s, beat `r-sort` (tile at 454 s)
- What:
  - The amounts are 120, 80, 200 and 50, all distinct. With no ties, dense ranking gives the same numbers as every other method.
  - The rank column (2, 3, 1, 4) shows nothing about gaps, and "gaps" is never defined.
- Why it matters: The claim is asserted with a visual that cannot support it.
- Cause: check.mjs's `sort` setup (`results.json` `sort`); `RapidScene.tsx:105-123`.
- Fix:
  - Use amounts [120, 80, 200, 120]. Show `rank(method="min", ascending=False)` (2, 4, 1, 2) beside `method="dense"` (2, 3, 1, 2).
  - Narrate: "Rank numbers them. Ties share a rank; min then skips a number, dense doesn't."

### 14. [P3] spacing: unnamed Series draw a blank header band, and the dtypes table sits beside the wrong line
- When: 230-245 s (element-241.jpeg) and 532-547 s (element-546.jpeg)
- What:
  - The `isna().sum()` result and the `df.dtypes` result both open with an empty header band of about 50px between the top rule and the hairline. It reads as a missing row.
  - The dtypes table's top rule is level with `df.shape`, not `df.dtypes`, so it reads as the output of `df.shape`.
- Cause: `video/src/videos/da-pandas/data.ts:70-77` gives an unnamed Series the header names `""`; `RapidScene.tsx:373` places `dg` at `c.T`.
- Fix:
  - When both header names are empty, render with `headH: 0` and no header hairline.
  - Place `dg` at `rowTop(1)`.

### 15. [P3] pacing: three beats carry several ideas with no internal pause
- When:
  - `copy-view`, 315.2-332.5 s: 17.3 s at 2.89 w/s, covering the question, the view, the copy, the pandas 3 rule, the demo and the advice.
  - `loc-trap`, 45.1-58.8 s: 13.7 s for filter, labels 2 and 4, iloc works, and loc fails.
  - `gb-returns`, 118.5-126.7 s: 3.07 w/s, carrying Q3's Series-or-DataFrame answer.
- Cause: `video/src/videos/da-pandas/script.ts`. Each is a single beat with `pauseAfter` only at its end.
- Fix:
  - Split `copy-view` after "A copy doesn't." (pauseAfter 0.6) and after "the parent is unchanged." (0.5).
  - Split `loc-trap` after "two and four." (0.5).
  - Re-voice `gb-returns` at about 2.5 w/s.

### 16. [P3] explanation: "copy on write" is used before it is defined, and ChainedAssignmentError looks like a crash
- When: 297.7-307.9 s, beat `copy-three` (tiles at 302 s and 303 s)
- What:
  - "Pandas three makes that explicit, with copy on write." The term is only explained 28 s later, in Q12 ("anything you take from a frame acts as a copy").
  - ChainedAssignmentError is drawn in the same red ErrorBox as KeyError and TypeError, although it is a warning: the line runs and `df` is simply unchanged.
- Cause: `video/src/videos/da-pandas/script.ts`, beat `copy-three`; `CopyScene.tsx:145-154`.
- Fix:
  - Re-voice as "...with copy on write: anything you take from a frame behaves as its own copy."
  - Add an INK_SOFT note under the box: "a warning: the line runs, df stays the same".

### 17. [P3] confusion: Q2's first mask is already the combined one
- When: 64.4-71.1 s, beat `filter-mask` (tiles at 65 s and 69 s)
- What:
  - From 64.4 s the listing is the full `(amount > 100) & (region == "North")`, and the mask column (from 68.4 s) shows the combined result.
  - So East 200 reads False while the narrator says "A comparison on a column gives a column of trues and falses". The combining comes later, at "with an ampersand" (71.1 s).
- Why it matters: A viewer checking the column against "amount over 100" sees 200 marked False.
- Cause: `video/src/videos/da-pandas/FilterScene.tsx:87-96`.
- Fix:
  - Show `df["amount"] > 100` first (True, False, False, True, True).
  - Swap the listing and the column to the combined mask at `ampAt`, so row 3 visibly flips to False.

### 18. [P3] explanation: numbers and names that arrive without context
- When: 168-175 s (Q6), 342-361 s (Q13), 363-373 s (Q14), 201-205 s (Q8)
- What:
  - Q14: 49.766, 59.790, 19.556 and the rest are never explained. The narration never says the lambda takes max minus min, the range.
  - Q13: "compiled code" is never named as C or NumPy, and no speed is given. The page says "typically 10-100x faster".
  - Q6: `pd.merge(orders, customers, ...)` uses two frames that are never shown, so the `name` column (Ava, Ben, Cy) comes from nowhere, and `how="left"` is never explained.
  - Q8: the `warehouse_x` and `warehouse_y` suffixes are unexplained.
- Cause: `video/src/videos/da-pandas/script.ts`, beats `vector-axis`, `vector-why`, `merge-what` and `merge-fan`.
- Fix:
  - `vector-axis`: "...each column: here, the range, max minus min."
  - `vector-why`: "...one call into compiled C."
  - Q6: show a 3-row `customers` table at RIGHT_X before the merge.
  - Q8: add a note "same name on both sides: _x and _y".

### 19. [P3] answer: small follow-ups the page gives and the video drops
- When: Q9 (241-255 s), Q15 (373-389 s), Q6 (163-175 s), `r-dupes` (488-494 s), `r-shape` (529-536 s)
- What:
  - Q9 says to choose by "why it's missing" but leaves out how much. The page's example is that dropping a column that is 60% null often isn't fine.
  - Q15 never says `DataFrame.map` was `applymap` before pandas 2.1. Interviewers on older stacks say applymap.
  - Q6 omits concat side by side (`axis=1`).
  - `r-dupes` never says that `subset=["email"]` is what finds the two repeats: compared on all columns, there are none here. `keep="last"` is also left out.
  - `r-shape` omits `df.info()`, the one call that gives all three.
- Cause: `video/src/videos/da-pandas/script.ts`, beats `missing-choose`, `vector-map`, `merge-what`, `r-dupes` and `r-shape`.
- Fix: Add one clause to each:
  - "...why it's missing, and how much"
  - "data frame map, formerly applymap"
  - "or side by side, with axis one"
  - "Duplicated, on the email column, flags two repeats"
  - "and info gives all three at once"

### 20. [P3] confusion: "the first true condition wins" is not shown
- When: 504.0-511.7 s, beat `r-case` (tile at 509 s)
- What:
  - At "first true condition wins", all five `size` cells turn yellow. Only 600 and 550 meet both conditions, and they are the rows that prove the rule.
  - `np.where` appears only as a grey 24px side note at the far right, with no code.
- Cause: `video/src/videos/da-pandas/RapidScene.tsx:291-305` (marks on every row, and `np.where` as a Note).
- Fix:
  - Mark only rows 2 and 4 at `winsAt`, with the note "≥ 500 and ≥ 100: the first wins, Large".
  - Show `np.where(df["amount"] >= 500, "Large", "Small")` as a one-line listing above `np.select`.
