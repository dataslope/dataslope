# MachineLearningEngineer-1-Generalization: fixes

Review: `agent-outputs/20261126-ae-mle-video-review/MachineLearningEngineer-1-Generalization.md` (1 P1, 4 P2, 10 P3).

## Findings

| # | Sev | Finding | Status | What was done |
| --- | --- | --- | --- | --- |
| 1 | P1 | Confusion-matrix headers half a column to the left | fixed | Each centred header now gets its column's centre, not its left edge (`PrScene.tsx`). |
| 2 | P2 | Reweighting's recall jump without its precision | fixed | New table row "Precision at threshold 0.5: 84% → 5%" (red), and one new sentence, voiced alone: "That's the usual trade: precision falls from eighty-four percent to five." `imb-trap` was split around it, both halves cut from take-6 for free. `check.mjs` checks the new words and that the reweighted model flags over ten times as many at under a fifth of the precision. The table is tighter (rows h(76), top y(310)) so four rows and the three steps clear the foot of the page. |
| 3 | P2 | R² strikes through a true statement | fixed | No strike: "A share of variance explained" in ink, then ": only in sample, for least squares" in red, on "no share of variance explained" (`RapidScene.tsx`). |
| 4 | P2 | The split draw shown sits below its own 50% line | fixed | `check.mjs` records `split.shown`, chosen from the existing 200 repeats (nothing redrawn): the repeat whose fifty scores average closest to 50% with a winner closest to the winners' mean. That is repeat 124, averaging 50.0%, best 65.0%. `SplitScene.tsx` draws it. |
| 5 | P2 | Grouped folds' 50% clears a second after it is said | fixed | The two panels stay through "keep each user, session or patient inside one fold" and clear just before "with time series"; only their title gives way to the green conclusion, which moved up to y(280). The 50% now holds about 6.5 s, not 2.4. |
| 6 | P3 | Fold box edge through a label digit | fixed | The dashed box's top edge runs in the gap between rows (`HookScene.tsx` `DataBlock`). |
| 7 | P3 | "both near 7…" on a gridline | fixed | Raised to sit between the 10 and 20 gridlines (`FitScene.tsx`). |
| 8 | P3 | 54% crossed by the 50% gridline, reads "50% 54%" | fixed | At 0.1 the recall label sits level with its dot, 18px left of the dashed line, with the kit's paper `halo` (`PrScene.tsx`). |
| 9 | P3 | "every user on both sides" over a fold that splits five in six | fixed | ": users on both sides" (`CvScene.tsx`). |
| 10 | P3 | Filled highlight boxes; black on a tint | fixed | The "validate" fold boxes keep their yellow outline and text and lose the fill; 84% on the imbalance table takes the yellow ink. |
| 11 | P3 | Dart figure holds 1.6 s | fixed | `bias-dart` `pauseAfter` 0.7 → 1.4: the finished figure holds about 2.4 s. |
| 12 | P3 | reg-why's two mechanisms run together | fixed | Split at the sentence break into `reg-why` and `reg-why-l1` (both cut from take-2, free), 0.8 s between; the L1 cues moved to the new beat. |
| 13 | P3 | Doubled space around `k`; uneven step badges | fixed | The step text is one span beside the badge, so the flex gap no longer lands around `k`; the badges' numerals are tabular. |
| 14 | P3 | Time arrow's "past" crowds the histogram label | fixed | Both histograms 24 layout units lower (y(640), y(860)); "past" now has its own row. |
| 15 | P3 | "A refund flag…", "A total computed…" continue "such as" | fixed | Lowercase. |

15 of 15 fixed.

## Voice

73 characters voiced, one new beat, on `eleven_v4_turbo` (Drew); 0 of them for P3s. Everything else was cut from the kept takes for free.

- `imb-trap` (old): "The follow-up is what reweighting does. With balanced class weights, recall at point five jumps from twenty-four percent to eighty-four. But the model now calls the average transaction twenty-two percent likely to be fraud, when one percent is, and its pee-ar ay-you-see falls from point four six to point three two."
- Now three beats:
  - `imb-trap`: "The follow-up is what reweighting does. With balanced class weights, recall at point five jumps from twenty-four percent to eighty-four." (cut from take-6, free)
  - `imb-trade` (new, 73 characters, voiced alone): "That's the usual trade: precision falls from eighty-four percent to five."
  - `imb-cost`: "But the model now calls the average transaction twenty-two percent likely to be fraud, when one percent is, and its pee-ar ay-you-see falls from point four six to point three two." (cut from take-6, free)
- `reg-why` split, words unchanged: "L two pulls in proportion to the weight, so the pull fades as the weight shrinks." / `reg-why-l1`: "L one pulls just as hard all the way down, so a weight that isn't earning its keep lands on zero." (both cut from take-2, free).

The "usual trade" wording makes the existing "But the model now calls…" read as the further cost, so the sentence after it did not need re-voicing (a beat can only be split at a sentence edge, so "But" could not be dropped for free).

Timing only: `bias-dart` `pauseAfter` 0.7 → 1.4; `reg-why` `pauseAfter` 0.8 (new); `imb-trap` and `imb-trade` take the minimum pause.

## Images

None generated.

## Length

670.0 s (11:10) before, 677.8 s (11:18) after: the new sentence and its pause (+6.2 s), the reg-why breath (+0.9 s), the dart hold (+0.7 s).

## results.json

`check.mjs` rerun: "ok: every quoted phrase is on the page, and every measured number is said". Every existing value came back identical (compared key by key against the frozen pre-review copy); the only change is the new `split.shown`.

## Checks

CHECKS_PLACEHOLDER

## Comparisons

COMPARISONS_PLACEHOLDER
