# DataEngineer-3-DimensionalModeling: fixes

I edited my folder `video/src/videos/de-dimensional-modeling/` and its narration
(`video/public/narration/de-dimensional-modeling/`), and nothing else. I added no
shared code and edited no other video's `parts.tsx`. The takes are untouched,
and the page was not edited.

The review had 19 findings: 0 P1, 5 P2 and 14 P3. All 19 are fixed, except
finding 13, which is fixed on screen only.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 3 | P2 answer | The non-additive remedy fits ratios, but the example is a distinct count | fixed | `nonadd` was split after "not six" and recut for free. New beat `nonadd-fix` (voiced alone): "So recount distinct users from the detail rows for each period. For a ratio, store both parts and divide in the query." Two green remedies now sit beside the visitors, one under the other: "distinct counts: recount / from the detail rows" and "ratios: store both parts, / divide in the query". Each line inks on its own words. |
| 4 | P2 answer | Q5 recommends denormalizing without saying why a warehouse can afford it | fixed | New beat `norm-why` (voiced alone): "A warehouse can afford the copies: one pipeline rebuilds them from the normalized source, and nobody edits a row by hand." A line under the right-hand verdict reads "its copies: rebuilt by one pipeline, never edited by hand", building on "one pipeline rebuilds them" and "nobody edits a row by hand". To make room above the page's bottom edge, the two closing verdicts are now one line each and sit 24 design px higher. |
| 1 | P2 | "pick by the question:" heads a line that is not one of the picks | fixed | I deleted the label, the reviewer's first option (`TypesScene.tsx`). Each green pick already sits beside its own table, and the blue "updated in place, stage by stage" now stands alone. |
| 2 | P2 | Q6 colors the star's deliberate break as the trap and snowflaking as the answer | fixed | "Third normal form, 3NF" and its underline are now blue, like 1NF and 2NF. `department` in the star's `dim_product` is marked yellow (`note`, what the narration points at) instead of red. "not 3NF, on purpose" is ink. "Snowflaking puts it back," is ink, followed on its own line by "at the cost of joins." in soft ink, so neither choice reads as the verdict. The "third normal form" in "App databases:" is blue (finding 15). |
| 5 | P2 | The bridge says no answer handled a changing dimension, but Q8 did | fixed | `next` was split. Its first sentence was re-voiced alone as "Apart from question eight, every answer here treated a dimension as fixed." The rest, "But customers move … Next: modeling history.", is the new beat `next-history`, cut for free from the take. On screen: "Apart from Question 8," inks on its words and "every answer treated a dimension as fixed." on "every answer here". I used a shorter line than the suggested one ("keeping history like that is the next video"), because the take's own next sentence already says the model has to keep history. |
| 9 | P3 answer | The normal forms lack "non-key" and don't build on each other | fixed | `nf-2` and `nf-3` were each split at the first sentence. The examples (`nf-2-eg`, `nf-3-eg`) are recut for free, and the definitions were re-voiced alone: "Second: first, plus every non-key column depends on the whole key." and "Third: second, plus nothing but the key." Under each oath phrase, a 20px line inks on "first, plus" and "second, plus": "**1NF +** non-key columns need the whole key" and "**2NF +** no non-key column depends on another". I left out "which only matters when the key has two columns": the 2NF table on screen is keyed by two columns, the narration says so, and the P3 budget was spent. |
| 10 | P3 answer | The grain answer gives one home for the fee, not the other | fixed | `grain-fix` was split into `grain-fix` and `grain-first`, both recut for free. Between them is the new beat `grain-split` (voiced alone): "Or, to report it by product, split it across the lines, so the shares add back to five." Under `fact_orders`: "Or, by product: split it across the lines, / shares that add back to **5.00**". The 5.00 is `lines.orders`' value, read through `data.ts`. "Declared first, the grain catches it." moved down to make room. |
| 11 | P3 answer | The surrogate-key answer leaves out its lookup cost | fixed | New beat `lookup` (voiced alone): "The natural key stays as a column, so each load can look up which surrogate a new order gets." On it, the two `42` cells change from red to yellow, and under the fact table a note reads "each load: `customer_id` + date → a new order's key". The slowly-changing-dimension line moved 10 design px down to clear the new note. |
| 13 | P3 answer | The date example's fiscal quarters are just calendar quarters | partly | **On screen only**; the narration is unchanged because the P3 budget was spent (396 of 400). New `check.mjs` step `datePage.fiscalDiffers` counts the page's dates whose `fiscal_quarter` is not `'Q' \|\| quarter(calendar_date)`, and returns 0. A note beside the result, on "without holidays", reads "No date function knows / the 8 holidays." with "(Here, the fiscal quarters match the calendar.)" under it. The 8 is the existing `HOLIDAYS` value. `DateDim` throws if the step ever returns anything but 0. `r-date`'s `pauseAfter` went from 0.6 to 1.2, so the note stays up about 1.7 s before item 15. Still to do: the narration change the review suggests ("…no function knows which days were holidays, or where a fiscal year starts"), about 110 characters. |
| 19 | P3 answer | "One shared place" is never named | fixed | `r-metric` was split in three. The first and last pieces (`r-metric`, `r-metric-teams`) are recut for free, and the middle one was re-voiced alone as `r-metric-once`: "Define each metric once, in a semantic layer every dashboard reads." On screen: "Define each metric once, in the semantic layer." |
| 6 | P3 | The page waits while a term is defined | fixed | **Q3:** "**The grain** is what one row means." now inks at its sentence. "Grain: one row per order line  declared first" sits under it and inks on "Declare it". The figure below moved 38 design px down; its lowest line is now at about 900 px. **Q7:** the OLTP subtitle inks at `oltpAt + 10`, and the OLAP one at `olapAt + 10` for the same reason. **Q1:** two notes in the empty right column, "**Fact table:** events, and the numbers you add up" on "the numbers you add up" and "**Dimensions:** the context you filter and group by" on "hold the context". They leave with Q1's card, before "A star:" takes that spot. |
| 7 | P3 | "form" orphaned | fixed | "App databases:" now breaks after the colon, and "third normal form" sits on its own line. |
| 8 | P3 | The non-additive verdict sits under the balance table; "not 6" is struck | fixed | "not 6" has no strike. The verdicts left the left column. "don't sum at all" sits under the "non-additive" kind label, as "sums across every dimension" sits under "additive". The two remedies (finding 3) sit right of the visitors at x = 1360. The suggested spot under the "both" row is at about 1,027 px, too close to the page's bottom edge for two lines. |
| 12 | P3 | 4,800 has no visible derivation | fixed | New `check.mjs` step `account.monthEnds` gives each month-end's total across both accounts: 1,500.00, 1,700.00 and 1,600.00. Its sum is checked against `overTime`, both in `check.mjs` and in the scene. The verdict now reads "the quarter's month-ends, 1,500.00 + 1,700.00 + 1,600.00 = ~~4,800.00~~", each term from `MONTH_ENDS` in `data.ts`. |
| 14 | P3 | The bus matrix highlights two shared dimensions out of three | fixed | `shared` is derived from `USES`: every dimension both Sales and Inventory tick. That gives Date, Product and Store. |
| 15 | P3 | Green and blue used off their meanings | fixed | The appended fact rows are drawn in blue (`BAR`), solid at 3px, where they were green. "mostly appended to" is bold ink. "third normal form" in Q6 is blue, matching Q7. |
| 16 | P3 | "each fact stored once"; `email` against `customer_email` | fixed | `norm` was split in three: the question, `norm-once` and `norm-ada`. The question and `norm-ada` are recut for free, and `norm-once` was re-voiced alone as "Normalizing stores each piece of data once." The subtitle reads "each piece of data stored once". The `.replace("customer_email", "email")` is gone, so the update shows `SET customer_email = 'ada@new.test'`, which still fits inside the right margin. |
| 17 | P3 | The narrow model's crow's feet say "many" | fixed | Both relations end `zero-or-one`. |
| 18 | P3 | Two definition beats with short gaps | fixed | `pauseAfter: 0.8` on `keys`, `surrogate`, `types` and `periodic` (timing only). `surrogate` and `periodic` keep their 3.0 words/s audio, but each now has 0.8 s on both sides. |

## Voice

- **709 characters re-voiced** (narrate's count), in 9 beats, each voiced
  alone with `narrate --only`:
  - **P2, 313 characters:** `nonadd-fix` 118, `norm-why` 121, `next` 74.
  - **P3, 396 characters:** `grain-split` 87, `norm-once` 43, `nf-2` 66, `nf-3` 40, `lookup` 93, `r-metric-once` 67.
- **Splits were cut free from the kept takes** with `narrate --recut`:
  - `grain-fix`/`grain-first`
  - `norm`/`norm-ada`
  - `nf-2-eg`
  - `nf-3-eg`
  - `nonadd`
  - `r-metric`/`r-metric-teams`
  - `next-history`
- **Untouched beats are unchanged.** Against the pre-fix commit `4bff3bc`, all
  35 beats I did not split or re-voice are identical in `alignment.json`. Only
  the split and re-voiced beats' mp3 files differ, and `takes/` is unchanged.
- **New beats read at 1.9 to 3.0 words/s.** `nf-2` and `nf-3` are the slowest,
  at 1.97 and 1.93.

## Length and checks

**New length: 569.3 s (9:29), was 527.5 s (8:48).** That is 54 beats, 1,368
words, 144 wpm (`npm run cues -- de-dimensional-modeling`).

All checks ran on the final code, through my entry and the queue.

- **Typecheck** (lines naming the folder) and **ESLint** on the folder: clean.
- **`npm run check:cues`**: passes for every video. An earlier run had failures
  in other DE folders, none in mine.
- **`npm test`**: 75/75 pass. An earlier run had two failures, both naming
  `de-distributed` and `de-orchestration`.
- **`check:motion`**: passes. 9:29.5 checked, with no still stretch of 2 s or more.
- **`check:sync`**: passes. All 54 beats start within ±0.12 s of their cues; the worst is +0.04 s (`lookup`), and every re-voiced beat is within ±0.04 s.
- **`check:mix`**: passes (exit 0). Narration is at −19.7 LUFS and the effects 28.5 LU under it. Where both sound, the median gap is 28.2 dB. The closest moment is 10.7 dB at 3:57.1, the existing tap on "depends on only half of it".
- **`check:frames`**: passes:
  - 1 illustration, largest stretch 0.90.
  - 6 arrows, 0° of bend under any head.
  - Every ERD end sits on a straight stretch.
  - No hyphen is set in tabular figures.
  - Every cue names its occurrence.
- **Stills**: 22 stills, each looked at: 44, 100, 131.4 (twice), 197.5, 215.3,
  232.5, 262.3 (twice), 272, 303.9, 350.2, 356.5, 395, 423.5, 449.3, 489.5,
  507.5, 526.5, 543, 552 and 566.5 s. After the first round I made three
  changes and re-rendered 131.4, 262.3 and 356.5:
  - The Q6 "2NF + no non-key column depends on another" line came within 14 px
    of the table, so both "builds" lines went to 20px.
  - The snowflake note had a ragged wrap, so it now breaks after "back,".
  - The slowly-changing-dimension line came close to the new lookup note, so it
    moved down.

## Facts

Unchanged, `check.mjs` reproduced `results.json` byte for byte. After my edits,
**every existing value came back identical**. There are two new steps:

- **`account.monthEnds`** (finding 12): 2024-01-31 1,500.00, 2024-02-29
  1,700.00, 2024-03-31 1,600.00. It is checked to add up to `overTime`.
- **`datePage.fiscalDiffers`** (finding 13): 0, checked.

`data.ts` exports them as `MONTH_ENDS` and `FISCAL_DIFFERS`.

## Noticed

- **One green may need a second look.** Question 7's "reshape" arrow and its
  label are still green. It is the answer to "what does the data engineer do
  between them", so I left it, but a stricter reading of the color meanings
  might make it ink.
- **The page.**
  - Its date-dimension example cannot show what its prose claims, a fiscal
    calendar that differs from the calendar: every `fiscal_quarter` equals the
    calendar quarter (checked).
  - Its measure/metric answer names "the semantic/BI layer or documented SQL".
    The video now says "a semantic layer".
  - I did not edit the page.
- **A brief gap before the metric figure fills in.** In quick question 15,
  "Define each metric once, in the semantic layer." still appears about 0.6 s
  before the two teams' numbers fill the gap above it. It did the same before,
  because the narration has always said "define once" before the numbers. I
  left it.
- **No shared change is needed** for any of these fixes.
