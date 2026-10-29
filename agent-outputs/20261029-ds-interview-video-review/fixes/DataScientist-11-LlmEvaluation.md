# DataScientist-11-LlmEvaluation: P2 fixes

Report: `agent-outputs/20261029-ds-interview-video-review/DataScientist-11-LlmEvaluation.md`.
Folder: `video/src/videos/ds-llm-evaluation/`. Nothing committed.

## P2s

| # | Finding | Status | What changed |
| --- | --- | --- | --- |
| 1 | Q6's correction asserted, not derived; sensitivity and specificity never named | fixed | New beat `prev-terms`: "So its sensitivity is ninety percent, and its specificity, the share of the rest it leaves alone, is ninety-five percent." New beat `prev-sum` (between the split halves of `prev-fix`): "The twenty percent is ninety percent of the true share, plus five percent of everything else." On screen: the sample line adds "(sensitivity 0.90)" and "(specificity 0.95)" on those words; the forward equation `0.20 = 0.90 × share + 0.05 × (1 − share)` appears on `prev-sum`, its terms named "observed", "caught", "false alarms"; then "so share = (0.20 + 0.95 − 1)/(0.90 + 0.95 − 1) = 17.6%" with each number named (observed, specificity above; sensitivity, specificity below), and "the Rogan-Gladen estimator" beside it. The blue segment is now labeled "caught: 90% of 176,471 = 158,824". The 17,647 missed complaints are carried by the equation (0.90 × share) rather than drawn as a segment. |
| 2 | 823,529 shown before the correction produces it; truth bar lands above the observed bar | fixed | At `majorityAt` the red note reads "5% of every ticket that isn't a complaint"; "(823,529) = 41,176 false alarms" is appended at `correctAt + 10`, with the truth bar in. Rows swapped: observed bar on top (`ROW_LABEL = 470`), corrected bar below (`ROW_TRUTH = 650`), formula row under both, so the figure reads top-down in the order of the argument. |
| 3 | Q4's chance agreement (0.82) on screen only, never said | fixed | `judge-kappa` split after its first sentence (`judge-chance` + `judge-kappa`, recut free); new beat `judge-pe` between them: "Here, chance alone gives eighty-two percent: both pass, point nine times point nine, plus both fail, point one times point one." (`pauseAfter` 0.6). The screen line now reads "agreement by chance alone: 0.82 = 0.9 × 0.9 (both pass) + 0.1 × 0.1 (both fail)", each part cued to its words. |
| 4 | Q3 never gives the interval formula | fixed | New beat `size-root` after `size`: "The interval narrows with the square root of n, so four times the items only halves it." New line under "a 3-point change can't show": "half-width = 1.96 √(p(1 − p) / n)" and a marked "4× the items, half the width". |
| 5 | Plan says seven questions get "real arithmetic" | fixed | `plan` split before its last sentence; `plan-seven` re-voiced: "Seven get worked through, four of them with real arithmetic, and two take a sentence each." Screen: "9 questions: **7 worked through** (4 of them with real arithmetic), 2 in a sentence". |
| 6 | "The rest of the page is about the first of those" is wrong and rushed | fixed | `measure-in` re-voiced: "Most of what follows is about the first of those. Questions five and seven take the next two." (about 3.0 words/s, was 4.80). Layers 0-2 now light (layer 0 on "the first of those", layers 1-2 on "Questions five and seven"); only the rounds layer dims. Each lit layer is named on the right: "most of what follows", "question 5", "question 7". |
| 7 | "Ask the recruiter" beside the wrong layer; "layered on top" beside the top row only, 2 s before any layer | fixed | The recruiter note sits beside the top layer, "rounds with AI allowed, or banned" (and dims with it at the bridge). "layered on top, mostly at mid and senior levels" is one line above the stack, cued to the first layer. |
| 8 | Series close carries the "Questions 8 and 9" kicker | fixed | `<Kicker at={from} out={roundAt - 6}>Questions 8 and 9</Kicker>`, then `<Kicker at={roundAt}>Data scientist interview prep</Kicker>`, the hook's kicker, so the series ends where it began. |

P3s fixed on the way (same edits, no extra voice):

- **#20** (close is the densest beat): `close` split at "how would you know?" with `pauseAfter: 0.8`; the practice sentence is its own beat `close-practice`, cut from the kept take. Timing only.
- **#16, half**: Q6's sample line, rewritten for #1, no longer spreads `TABULAR` ("hand-labeled" renders with a normal hyphen). CheckScene's "t-test" line is untouched.
- **#13, part**: Q1's layers are outlined in `INK_SOFT` and the "layered on top" label is soft ink, no longer red, since they were rebuilt for #6/#7. Hook's "what's new", the judge/A pair and the bank chip still use red.

## Voice

**611 characters re-voiced** (`narrate --dry-run` count), six beats each voiced alone on `eleven_v4_turbo`:
`plan-seven` (90), `measure-in` (93), `size-root` (87), `judge-pe` (127), `prev-terms` (121), `prev-sum` (93).

Free, by splitting at sentence breaks and `narrate --recut` from the kept takes before any text changed: `plan` / `plan-seven`, `judge-chance` / `judge-kappa`, `prev-fix` / `prev-correct` / `prev-rg`, `close` / `close-practice`.

Note for whoever recuts later: the new beats grew the script past the old take plan (it now plans 5 takes, against 4 kept), so `narrate --recut` on this video will report no matching take. That is the normal consequence of voicing beats alone; every beat has its own audio and `alignment.json` entry.

## Length and checks

- **Length:** 477.3 s (7:57), was 436.8 s (7:17); 36 beats.
- `check.mjs`: re-run (private Pyodide copy via `NODE_PATH`), `results.json` byte-identical. Every number on screen comes from `data.ts`; the two derived values (0.05 = 1 − specificity, and 90%/5% labels) are computed from `PREV`, not typed.
- Typecheck: no errors in `src/videos/ds-llm-evaluation/`. ESLint: clean.
- `npm run check:cues`: no failures in this folder.
- `npm test`: 59 pass, 0 fail.
- `check:motion`: passed, nothing still for 3 s (7:57.5 checked; 7 stretches of 2.0 to 2.8 s, all on a question card being read or a finished scene before its cut, none at a moment changed here).
- `check:sync`: passed, all 36 beats within ±0.12 s, worst +0.04 s (`check-list`); the six beats voiced alone sit at −0.01 to +0.02 s.
- `check:mix`: passed, effects 29.7 LU under the narration, speech a median 28.0 dB above them where both sound (5th percentile 12.7 dB).
- `check:frames`: not run (no arrow, illustration or ERD changed).
- Stills looked at, at every place changed: 37.2 s (plan line), 53.5 / 71.8 / 79.3 s (Q1 layers, recruiter note, lights), 150.5 / 184 s (half-width line), 218.6 / 234 s (chance agreement), 338.8 / 347.5 / 354 / 359.2 / 360 / 368.5 s (Q6 build: terms, observed bar, forward equation, correction, named formula), 459 / 476 s (close kicker). The first pass showed the formula's names colliding ("observedspecificity"); the operators between named numbers were widened and the re-render is clean.

## Noticed

- Beats voiced alone carry about 0.5 s of trailing silence in their alignment (the final punctuation's end time runs to the end of the file), so each adds a little more pause than its `pauseAfter`. Harmless, and `check:sync` measures starts, not ends.
- `check.mjs` needs `pyodide`, which is not in the repo's `node_modules` in this container; a private copy under `$S/<Id>/pyo/` with `NODE_PATH` runs it unchanged.
- P3s left: #9 (what McNemar tests), #10 (0.017 shown, "point oh two" said), #11 (64% label), #12 ("can't beat"), #14 (authoring note on screen), #15 (grid's 90/90 split), #16's CheckScene half, #17, #18, #19, #21, and the rest of #13. #9, #11, #12 and #21 need re-voiced words; the rest are scene-only.
