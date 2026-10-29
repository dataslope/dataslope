# DataScientist-9-PythonPandas: P3 fixes

Folder `video/src/videos/ds-python-pandas/`. Review:
`agent-outputs/20261029-ds-interview-video-review/DataScientist-9-PythonPandas.md`.
P2 fixes: `agent-outputs/20261029-ds-interview-video-review/fixes/DataScientist-9-PythonPandas.md`.
Nothing committed. Nothing outside the video's own folders touched (no `da-pandas`, no kit).

## P3s

| # | Finding | Status | What changed |
| --- | --- | --- | --- |
| 6 | Code titles and the `Series.map` listing under 19px | Fixed | The P2 pass did the two `MergeScene` titles. Now the three `ShapesScene` titles (`.agg("sum")`, `.transform("sum")`, `.apply(…nlargest(1)…)`) use the local `TitleCode` (21px mono) in place of `<Mono>` (18.5px), and the `Series.map` listing is 20px, 960 wide, with the table under it placed from `listingHeight(…, 20)`. |
| 7 | apply's "East 4 / North 0 / South 3" index unexplained | Fixed | The index column is titled "region, row" (the table is renamed before `geoOf`, so the column is wide enough for the title). |
| 8 | "copy on write" named, not explained | Fixed | `copy-three` split at its first sentence (the rest is `copy-error`); that sentence re-voiced: "In pandas three, copy on write makes every selection behave as a copy, so it never changes." Note: "copy-on-write: every selection acts as a copy". pandas' own warning text agrees ("the intermediate object … always behaves as a copy (due to Copy-on-Write)", in `results.json`). |
| 9 | Q6 guards against fan-out, never says how to fix it | Fixed | New beat `fanout-fix`: "If the key isn't unique, fix the customer table first: keep one row per customer, then merge." Two new `check.mjs` steps: `dedup` (`customers = customers.drop_duplicates("customer_id", keep="last")`: Lyon, Bergen, Porto) and `fixed` (the same merge with `validate="many_to_one"`: `(4, 265)`). On screen, under "after a merge", the `drop_duplicates` line as a 20px listing (marked green on "keep one row per customer") and "→ then merge: 4 rows, revenue 265" in green on "then merge". |
| 10 | "Three hundred regions" said, "300 rows, four distinct regions" shown | Fixed | `r-cat` split at its sentence break; the second sentence re-voiced as `r-cat-bytes`: "Three hundred rows of four region names drop from eight thousand nine hundred bytes to four hundred eighteen." |
| 11 | "concat matches nothing at all" oversimplifies | Fixed | `merge-stack` re-voiced: "And concat matches no key. It stacks frames, lining up columns by name: here, March's orders under the rest." Header: "`concat` matches no key: it stacks, lining up columns by name", the last clause fading in on its words. |
| 12 | `DataFrame.map` not tied to `applymap` | Fixed | `r-map` split at its last sentence; that sentence re-voiced as `r-map-cells`: "Data frame map, once called apply map, works on every cell." The line reads "`DataFrame.map` every cell (was `applymap`)", the parenthesis in the soft ink on "once called apply map". |
| 13 | "No merge needed" without the merge it replaces | Fixed | `pct` split in three at its sentence breaks; the middle sentence re-voiced as `pct-merge`: "No need to sum by region and merge the totals back." Note: "no need to sum by region and merge back". |
| 14 | Line highlights cover the indentation | Skipped | Fixed centrally in `da-pandas/parts.tsx` (commit `05b0cad8`), as instructed. |
| 15 | Colors against the series meanings | Fixed | Reshape: q2's marks are a deeper tint of the data blue (`BAR` at 42%, a local `MARK_Q2`) instead of yellow, so yellow is left to "(user, quarter)" and "`pivot_table` aggregates"; the long table's `sales` values are now in the ink, as the wide tables' already were, because the blue type did not read on the deeper blue. Shapes: "most flexible, and slowest" in `INK` (bold), not trap red. Fanout: the `validate="many_to_one"` line marked `MARK_OK`, not blue. |
| 16 | "SQL" header 24px right of its column | Fixed | "pandas" is now a 290px inline-block, the rows' cell width: "SQL", "GROUP BY", "JOIN" and "a window function" all start at x=1094-1095 (measured on the still). |

No P3 was moot: none of the scenes they describe was removed by the P2 pass.

## Voice

**511 characters re-voiced** (`narrate --dry-run` count), six beats, each on its own:
`pct-merge` (51), `merge-stack` (108), `fanout-fix` (93), `copy-three` (91),
`r-map-cells` (59), `r-cat-bytes` (109). Of those, `fanout-fix` is a new beat
and `merge-stack` a whole-beat re-voice; the other four are the changed
sentence split off its beat.

The splits cost nothing:

- `pct` → `pct` / `pct-merge` / `pct-north`, `copy-three` → `copy-three` / `copy-error`, and `r-map` → `r-map` / `r-map-cells` were first cut with `split.mjs` (from each beat's own file), then, on the coordinator's note, **re-cut from the kept takes** with `$S/DataScientist-9-PythonPandas/tools/recut-take.mjs` (after the coordinator's DS-0 tool: narrate's own `--recut`, unchanged, on a scratch root whose script is take *k*'s own text split into the current beats, with the voiced text for beats re-voiced since). The kept pieces `pct`, `pct-north` (take 2), `copy-error` (take 3) and `r-map` (take 4) come from those take cuts. Validation: every untouched beat in each re-cut take came back **byte for byte** identical to HEAD, MP3 and alignment entry (take 2: 11 beats, including the P2 pass's `merge-key`/`merge-index`; take 3: 9; take 4: 4).
- `r-cat` → `r-cat` / `r-cat-bytes` used `$S/DataScientist-9-PythonPandas/tools/split.mjs` (DS-4's tool, `ID` changed), because `r-cat` was re-voiced alone in an earlier pass and its text is in no take. Validation: re-cutting the untouched `vector-only` through it gave the identical alignment entry and the same length (175,738 samples), lag 0, with the audio one extra MP3 encode (31 dB SNR against the committed file), not byte-identical. `r-cat-bytes` was then re-voiced, so only `r-cat`'s first sentence carries that extra encode.

## Facts

`check.mjs` re-run (Pyodide 314.0.7 / pandas 3.0.2, `NODE_PATH=$S/DataScientist-1-Statistics/pyo/node_modules`). Every existing value in `results.json` came back identical except the two timings, which the busy machine measured at 777.1 ms and 1.96 ms; as in the P2 pass, `results.json` keeps the committed quiet-machine 409.5 ms and 0.9 ms (the numbers the video was voiced on). New: `fanout.dedup`, `fanout.fixed` = `(4, 265)`, read in `data.ts` as `FANOUT.dedup` / `FANOUT.fixed`.

## Length and checks

- Length: **469.6 s (7:50)**, was 448.2 s; 51 beats, 1,114 words, 142 wpm.
- `tsc` and `eslint` for the folder: clean.
- `check:cues`: no failure names `ds-python-pandas` (the failures listed are other fixers' videos mid-edit).
- `npm test`: 59/59 on the final code (an earlier run had two cue-test failures, both listing other fixers' videos mid-edit).
- `check:motion`: pass; one still stretch of 2.5 s (0:34.5-0:37.0, the question 1 card), the same as after the P2 pass.
- `check:sync`: pass, 51 beats, worst +0.05 s (`r-cat`, 7:08.1). Run after the take re-cuts.
- `check:mix`: effects 28.1 LU under the narration, speech a median 28.4 dB above them where both sound (5th percentile 13.6 dB). Closest moment 9.5 dB at 3:40.8: the existing pop on `marchAt + 6` in `merge-stack`, whose onset lands in a short dip in the re-voiced speech at "March's orders"; 50 ms later, as the pop decays, the speech is 17 dB above it and then 25 dB. Left as is; if it sounds present, move it to `marchAt + 10` or take it to -34.
- `check:frames`: not run (no arrow, illustration or ERD changed).
- Stills looked at: 158 (Q3 titles, "region, row", the apply note), 176 (Q4 note), 222 (concat header), 255 and 263.5 (green `validate`, the fix and its result), 335 (copy-on-write note), 383 (reshape blues, before and after the ink change), 406 (map listing, "was applymap"), 441 (category), 466 (bridge alignment).

## Shared-kit suggestions

None needed for these P3s. The two from the P2 pass stand: a `narrate --recut --only <ids>` that cuts named beats from whichever takes still match (what `recut-take.mjs` does by hand), and strict oldest-first slot hand-off in `out/render-slot.sh`.
