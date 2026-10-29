# DataScientist-2-Probability: P3 fixes

Every P3 left after the P2 pass is fixed (#8 to #19), one of them partly (#14: the Poisson's steady rate is on screen but not said, and the empty lower half of the frame under `pois-which` is left). 905 characters were re-voiced, against a budget of 1,000. The video now runs **8:51 (531.4 s)**, up from 8:22 (502.1 s). Every check that has run passes. `check:motion` failed once on a 3.0 s hold over `test-in`; that is fixed, and the re-run passes. Nothing is committed.

- **Folder:** `video/src/videos/ds-probability/`
- **Review:** `agent-outputs/20261029-ds-interview-video-review/DataScientist-2-Probability.md`
- **P2 report:** `agent-outputs/20261029-ds-interview-video-review/fixes/DataScientist-2-Probability.md` (it had done #8 partly and #10's Q5 half)

## P3s

| # | Finding | Result | What changed |
| --- | --- | --- | --- |
| 8 | Bayes' labels scatter where the base rate enters | fixed | The P2 pass had placed "the base rate" under P(A), put "where intuition breaks" on its own line and renamed the prior "prior: the base rate". This pass did the other two: "*A* = disease, *B* = positive" now appears on "given a disease", and "you know P(positive \| disease)" is ink with the same yellow wash P(B \| A) carries in the theorem, instead of data blue. |
| 9 | Legend swatch grey; "15%" label leaves the dashed line | fixed | The ■ of "churned" is data blue. The dashed line's label now reads "15% if independent" and stays until Q4 clears, instead of leaving at "These break at". |
| 10 | Colors against the series' meanings | fixed | Q5's lines were put in ink in the P2 pass. Now the Poisson dots and their legend dot are blue 700 against the binomial's blue 200 bars: a second data series, not the green answer. |
| 11 | The definition is never filled in with the die | fixed | **New beat `cond-plug`:** "On the die, that's one sixth over one half: one in three." Under the definition, aligned on its "=", a line inks in: "= 1/6 over 1/2 = 1/3", with 1/3 washed green on "one in three". `check.mjs` now writes `cond.pSixAndEven` (1/6) and `cond.pEven` (1/2). |
| 12 | Variance has no formula; linearity's tool unnamed; 2.25 under the line | fixed | **Screen:** "Var(X) = E[(X − E[X])²] = E[X²] − E[X]²" inks in under the beam on "expected squared distance". The two 2.25 labels sit inside their bars, so the dashed variance line crosses no figure.<br>**Q7:** `linear-hats` was split in three, and only the middle sentence was re-voiced: "Each person is an indicator: one if they get their own hat, zero if not, with a one in ten chance. The matches depend on each other, and still, on average, exactly one does." On screen, "each person is an indicator: 1 if they get their own hat, 0 if not" appears over the hats, and "even when the parts depend on each other" is washed yellow on "depend on each other". |
| 13 | Binomial and Poisson panels look alike, with no parameters | fixed | Each count's parameters sit in the empty top corner of its panel: "*p* = 0.3", "*n* = 10, *p* = 0.3" and "λ = 3" (all from `results.json`). Bernoulli gains "mean *p*", and the binomial gains "variance *np*(1 − *p*)" under "mean *np*". The normal's note is now the panel's width, so it no longer runs to the exponential's caption. |
| 14 | Q10's figure mislabelled, conditions incomplete | partly | **Narration:** `pois-which` was split; its first sentence was re-voiced with "a fixed number of **independent** trials". `pois-limit` was split after "And the two meet."; the rest was re-voiced as the rule: "With many trials and a small chance, the count is almost exactly a Poisson with a rate of n times p: a thousand trials at point three percent give a rate of three."<br>**Screen:** "independent" is washed yellow as it is said. The Poisson's line reads "events at a steady rate, with no natural ceiling". The strip is captioned "40 of 1,000 impressions, each clicked or not" with one box clicked, not three. The limit chart has the y title "probability" and two new lines: "many trials, small chance: λ = *np*", then "1,000 × 0.003 = 3".<br>**Not done:** the Poisson's constant rate is on screen only, since voicing it as well would have taken the budget to about 1,010 characters. The empty lower part of the frame under `pois-which` is left as it was. |
| 15 | "Specificity" never named | fixed | `test-words` was split after "measured only on the sick."; the second sentence was re-voiced: "To read a positive, you also need the specificity, the ninety-five percent of healthy people it clears, and the base rate." The label under the healthy branch now reads "specificity, on the healthy: 95% cleared", with "false-positive rate = 1 − specificity = 5%" below it. The 5% on the branch is washed on "the specificity". `check.mjs` now writes `test.specificity` (0.95) and `test.fpRate` (0.05). |
| 16 | The hook strikes out its own answer at 20 s | fixed | "Most people say no." is no longer struck. It swells briefly on "usually wrong" and stays open until question 12. |
| 17 | A person touches the room's border | fixed | Each person's x is clamped to 32 px inside the room's right wall. Only the odd rows' last column moves, and it now clears the wall. |
| 18 | "Two definitions left" and "a sentence each" misdescribe the last round | fixed | `plan` was split after "There are fourteen questions here."; the rest was re-voiced as "Twelve get worked through with numbers, and the last two are quick." The note under cards 13 and 14 reads "**2** quick ones", matching "**12** worked through with numbers". `rapid-in` was re-voiced: "That's every puzzle. Two quick ones left." The headline matches, and its apostrophe is now curly ("That’s"). |
| 19 | The bet's bars show products without their parts | fixed | `r-bet` was split after "loses three otherwise."; the second sentence was re-voiced: "A fifth of ten is two dollars, and four fifths of minus three is minus two forty: it loses forty cents a play, though its likeliest outcome is losing three." The bars are labelled "1/5 × $10 = +$2.00" and "4/5 × −$3 = −$2.40". The weight and payoff appear as they are said, and the product when its bar lands. `check.mjs` now writes `bet.pWinFrac` (1/5) and `bet.pLoseFrac` (4/5). |

## Voice

905 characters were re-voiced, each beat on its own with `narrate --only`:

| Beat | Characters | For |
| --- | --- | --- |
| `plan-last` | 67 | #18 |
| `cond-plug` (new) | 57 | #11 |
| `test-need` | 122 | #15 |
| `linear-each` | 173 | #12 |
| `pois-which` | 126 | #14 |
| `pois-np` | 163 | #14 |
| `rapid-in` | 41 | #18 |
| `r-bet-ev` | 156 | #19 |

**Splits.** Six beats were split at sentence breaks, keeping their voiced text, before any wording changed:

- `plan` / `plan-last`
- `test-words` / `test-need`
- `linear-hats` / `linear-each` / `linear-sim`
- `pois-which` / `pois-ceiling`
- `pois-limit` / `pois-np`
- `r-bet` / `r-bet-ev`

`narrate --recut` refuses this video, because takes 1 to 4 no longer match the script (P2 re-voiced beats alone). Following the coordinator's note, the seven kept pieces were cut from the **kept takes**, not from the beats' own files. They are `plan`, `test-words`, `linear-hats`, `linear-sim`, `pois-ceiling`, `pois-limit` and `r-bet`.

The tool is `$S/DataScientist-2-Probability/tools/recut-takes.mjs`. For each `take-n`, it runs `narrate.mjs --recut` unchanged on a scratch root. The scratch script is the take's own text split into the current beats; any stretch that has since been re-voiced becomes a placeholder beat.

- **Check:** across all five takes, every one of the 44 untouched beats came back byte for byte identical to its committed MP3, with an identical alignment entry.
- **First pass:** I had cut the pieces from each beat's own file with `split.mjs`. That cut kept the alignment and the sample count identical, but it is a second encode (about 30 dB SNR at offset 0). It was replaced.
- **Result:** the take cuts are first-generation. Their alignment matches the `split.mjs` cuts exactly, except `pois-ceiling`, whose cut point sits 5 ms later.

## Length and checks

The video now runs **531.4 s (8:51)**, up from 502.1 s (8:22). It has 64 beats and 1,264 words, at 143 words a minute.

| Check | Result |
| --- | --- |
| `check.mjs` (Pyodide 314.0.7, via `NODE_PATH` to the private copy) | Every existing value in `results.json` came back identical. The only additions are the six new keys named above. |
| Typecheck | Nothing in this folder, on the final code. |
| `eslint src/videos/ds-probability` | Clean. |
| `npm run check:cues` | Passes. |
| `npm test` | 59/59. |
| `check:sync` | Passes. All 64 beats are within ±0.12 s; the worst is +0.05 s (`linear-var`). |
| `check:mix` | Passes. The effects sit 28.2 LU under the narration, a median 27.6 dB below it. The closest moment is 9.3 dB at 4:39.7, which is the existing "exactly one does" pop, not a cue I added. |
| `check:motion` | **Passes** on the re-run (8:51.5 checked): nothing holds still for 3 s, and seven holds of 2 s or more total 16.0 s. The first run had failed one hold, 1:45.8 to 1:48.8 (3.0 s, over `test-in`): the cond scene is longer now, so its slow push (`Drift`) had almost stopped by the bridge. Fixed with two cues on that beat: "P(disease \| positive)" in the "you want" line is washed green on "that test" and swells on "with numbers". Stills at 106.4 s and 107.3 s checked. |
| `check:frames` | Not run: no arrow, illustration or ERD changed. |

**Stills:** I took 16 stills at every place I changed and looked at each one. They caught one problem: in the new Q1 line, the green wash on "1/3" touched its "=". I added a 0.32em margin, and the re-shot still at 68.8 s shows it clear.

## Noticed, and kit suggestions

- **Queued jobs can time out before they run.** My first still and `check:motion` job sat in the render queue for its whole 2-hour `timeout` and was killed without running. The queue was 25 deep at the time. I relaunched it detached, with a longer limit. A queue-aware limit would help, one that counts only the time a job holds a slot, not the time it waits.
- **Kit suggestion: a `--from-takes` option for `narrate --recut`.** It would re-cut the beats that still sit in a kept take, even when other beats of that take were re-voiced since. That is what `recut-takes.mjs` does, and it reproduced every untouched beat here byte for byte.
- **No shared-kit change is needed** for these P3s; every fix is in this folder.
