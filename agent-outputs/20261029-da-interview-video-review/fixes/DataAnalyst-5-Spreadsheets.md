# DataAnalyst-5-Spreadsheets: fixes

Report: `agent-outputs/20261029-da-interview-video-review/DataAnalyst-5-Spreadsheets.md` (0 P1, 9 P2, 9 P3). Folder `video/src/videos/da-spreadsheets`. Nothing committed; the coordinator's WIP snapshot (`2808545b`) already holds part of it.

## Findings

Worked in the brief's order: answers (3, 15, 16, 17), the other P2s (1, 2, 4, 5, 6, 7, 9), the other P3s (10 to 14, 18).

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 | fixed | The bridge note now reads "VLOOKUP's fourth argument: FALSE" and the two XLOOKUP bars and their notes fade out as `approx-in` starts (`out`, not `dim`). `approx-leave` (re-voiced) says "Leave off false, and V lookup falls back to approximate." A note under the TRUE bar, on "falls back to approximate": "left off: VLOOKUP and MATCH mean approximate, XLOOKUP means exact". |
| 2 | P2 | fixed | At "A mixed reference" the tax sheet and its "F2 and F3 are empty" note fade out and the cross-tab F1:I4 draws in their place from `PIVOT.grid`: regions in F, months in row 1. F2:F4 tint `LOCK` on "locks the region's column", G1:I1 on "the month's row"; G2 is outlined (with its value) on the first, I4 on the second, and the I4 bar types on "the month's row". The other seven values fill in on "fills the whole grid". `refs-mixed` `pauseAfter` 0.7 → 1.4, so the full grid and both bars hold about 1.5 s before Question 8. |
| 3 | P2 | fixed | `iferror-trap` split; new beat `iferror-space` (voiced): "But the stray space is a missing key too, so it stays hidden: trim it first." The IFNA cell of the stray-space row turns red on it, a red note reads "the stray space is #N/A too: IFNA still hides it", and "fix the cause first: trim the key, fix the column" now stays to the end (moved to `lg.top + h(150)`), with "trim the key" highlighted on "trim it first". |
| 4 | P2 | fixed | INDEX/MATCH's robustness is drawn. On "points at ranges" the category column closes again (the sheet as the price formula was written), the price bar types the pre-insert `=INDEX(C2:C5,MATCH("P-102",A2:A5,0))` (`L.indexMatchPrice`) with C2:C5 marked and the purple box on the price column C. On "after the insert" the column opens again and the box rides with the prices to D; on "moves with the data" the bar's text is rewritten in place to `D2:D5` (`A.indexMatchPrice`), and the note changes from "written before the insert: C2:C5, the prices" to "after it, Excel rewrites the range: D2:D5, still the prices". 9.00 on "still costs nine". (`Sheet` and `RangeBox` in this folder's `parts.tsx` take an insert `replay`.) |
| 5 | P2 | fixed | New beat `index-second` (voiced): "Mug is second, and the zero asks for an exact match." On it, a step bar `=MATCH("Mug",B2:B5,0) → 2` (new `lookups.matchMug`, from `check.mjs`), MATCH's positions 1 to 4 beside B2:B5 with the 2 in teal, the mug's name cell highlighted, the `0` highlighted in both bars, and "0: exact match, like VLOOKUP's FALSE". On "Index returns what sits": "INDEX takes position 2 of A2:A5: P-102". |
| 6 | P2 | fixed | The slot over the TRUE bar reads "approximate (TRUE): the largest value not above the key", on "Approximate assumes". "exact (FALSE): a precise hit, or #N/A" sits under the FALSE bar (`pg.top + h(150)`, on "Instead of NA" + 6); "unsorted?" moved to `pg.top + h(200)`. |
| 7 | P2 | fixed | `pauseAfter: 1.5` on `r-split`, `r-dates` and `r-named`. The TEXTJOIN note is cued at `joinAt + 12` (was "skips the blanks"), the named-range note at `meansAt + 6` (was `pointsAt + 8`). `r-named` was not split: the cut would fall at a comma, not a sentence break, and the pause plus the earlier cue already give its note about 4 s. |
| 8 | P2 | moot | Done centrally (sheet cells and the bar's result set `TABULAR` on numbers only); seen right in every still ("P-101", "2024-01"). |
| 9 | P2 | fixed | Gutter, column letters and the bar's cell name `label(19)`; the bar's "fx" floors at 19px (it was `size * 0.85`, 16 to 19px, also under the floor). The rapid round's orders and conditional-formatting sheets `size={19}`, `rowH c.h(34)`, columns 4px wider; the long-formula rule `> 54 ? 20 : 21`. |
| 10 | P3 | fixed | The hook's red dashed box and "the sum, pointed at the months" now stay to `tenAt - 8` (about 2.9 s readable, was about 1 s), and the formula bar dims on "the wrong column" so 290 stops reading as the answer. (Out at `tenAt`, as suggested, crossfaded into "1 to 10: worked on these two sheets" right under it; `tenAt - 8` clears first.) |
| 11 | P3 | fixed | Question 8's sheet header and its P-102 row come in on the question's text, so the page is not bare for 4.3 s; Question 10's revenue column comes in at `q10At + 6`. |
| 12 | P3 | fixed | At the insert both Q3 bars are rewritten in place (new `FormulaBar` `rewrite` prop: same box, text crossfades) to `A2:D5`, marked; the first one's result turns to Kitchen on "comes back as kitchen". Question 8's four bars keep the `products!` prefix (`c.formula`), so they read `products!A2:C5`; the bars were moved to `BAR_X 790`, `BAR_W 1030`, size 21 to fit it. |
| 13 | P3 | fixed | The active-cell outline in Question 7 is `ds("gray", 500)`; the Question 9 takeaway is ink at weight 650 with a highlighter `Mark` on "it belongs in SQL", on those words. |
| 14 | P3 | fixed | Both spans use `<Mono>` (PivotScene's `SUM(CASE WHEN …)`, RapidScene's `> 150`). |
| 15 | P3 | fixed | `r-dupes` split; `r-dupes-both` (voiced): "It flags both copies, so check them before Remove Duplicates, which keeps the first." Both TRUE flags turn red on it; a third column C, "later copy", `=COUNTIF($A$2:A2,A2)>1` (new `text.later`, from `check.mjs`: FALSE FALSE TRUE FALSE), fills in on "keeps the first" with only the repeat green, and notes read "both copies flag; Remove Duplicates keeps the first" and "$A$2:A2 stops at its own row, so only the later copy flags". `pauseAfter` 0.9 → 1.8, so it holds at full strength before the bridge dims it. |
| 16 | P3 | fixed | "typed as text: it sits left, where numbers sit right" beside the cell, then `=ISTEXT(D4) → TRUE` (existing `conditions.textCell`) and `=VALUE(D4) → 150` (new `conditions.textValue`) under the 1220 line. `risks` `pauseAfter` 0.8 → 1.8 to read them. |
| 17 | P3 | fixed | `xlookup` split; `xlookup-newer` (voiced): "It's the newer lookup, in Excel three sixty-five and twenty twenty-one or later; older versions don't have it." Notes: "the newer lookup: Excel 365 and 2021 or later", then "older versions don't have it". |
| 18 | P3 | fixed | `r-clean` split; `r-clean-keys` (voiced): "Tidy the keys before you look up, or they won't match." The note reads "tidy the keys first, or lookups miss". The TEXTJOIN bar marks `TRUE` as the result lands, and its note reads "TRUE skips the empty "": no double space". |

## Voice

- **476 characters re-voiced**, each beat on its own, no new take: P2 228 (`index-second` 52, `approx-leave` 100, `iferror-space` 76), P3 249 (`xlookup-newer` 110, `r-clean-keys` 55, `r-dupes-both` 84).
- Splits cost nothing. `index`, `xlookup`, `approx-trap`, `iferror-trap`, `r-clean` and `r-dupes` were split at sentence breaks from **their own committed MP3s**, with the Data Scientist fixers' `split.mjs` (narrate.mjs's own cutter, no API call), because the kept takes say "S K U" and "N A" where the script now says "SKU" and "NA", so `--recut` cannot find those beats. The four pieces whose words then changed were re-voiced with `--only`.
- Checked against the committed `alignment.json`: all 32 beats not split are byte-identical (and no other MP3 changed).

## Facts

- `check.mjs` needs HyperFormula 3.5.0, which no private copy had. Without `npm install`, its four tarballs (`hyperformula@3.5.0`, `chevrotain@6.5.0`, `regexp-to-ast@0.4.0`, `tiny-emitter@2.1.0`) were fetched with `npm pack` and unpacked into `$S/DataAnalyst-5-Spreadsheets/hf/node_modules`. Run: `HYPERFORMULA_DIR=$S/DataAnalyst-5-Spreadsheets/hf node video/src/videos/da-spreadsheets/check.mjs`.
- Unchanged, it reproduced `results.json` byte for byte. With the three additions (`lookups.matchMug` = 2, appended last so every `calc` ref above it stays; `conditions.textValue` = 150; `text.later` = FALSE, FALSE, TRUE, FALSE), **every existing value came back identical**; only the new keys were added.
- `LookupScene` throws if MATCH's position stops pointing at the mug, or if the leftward lookup's result changes with the insert.

## Length and checks

- New length **7:52.4** (472.4 s, 50 beats; was 7:20.6, 38 beats).
- Typecheck and lint: clean for the folder. `check:cues`: no failure in this folder. `npm test`: 68 of 69; the one failure is `da-pandas/LocScene.tsx:63` (another video's cue).
- CHECKS_PLACEHOLDER
- Stills looked at, at every change: 13, 14.5, 15.8, 16.5 (hook); 100, 113.5, 117.5 (Q3 rewrite); 127.5, 131.8, 138.5, 141.8, 145.5, 149.5, 151.8 (Q4); 160, 164, 176, 181.5 (Q5, bridge); 196, 204.5, 214.5, 223.5, 226.5 (Q6); 250, 254.5, 255.6, 259, 263, 264.8, 266 (Q7); 268.5, 291, 300.5, 307.5 (Q8); 340.5, 343.5, 360, 364 (Q9, Q10); 375, 398.5, 408.8, 437, 445.5, 452.5, 459.8, 463, 466 (rapid round), in `video/out/DataAnalyst-5-Spreadsheets-stills/`.

## Noticed

- Fixed on the way: the formula bar's "fx" was 16 to 19px at every bar size under 22 (not in the report).
- The page says XLOOKUP needs "Excel 365 / 2021+"; the narration now says so. Nothing on the page disagreed with the facts.
- No shared change needed. `FormulaBar`'s new `rewrite` prop and the `Sheet`/`RangeBox` insert `replay` live in this folder's `parts.tsx`, which only this video imports.
