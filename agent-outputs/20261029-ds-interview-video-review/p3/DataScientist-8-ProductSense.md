# DataScientist-8-ProductSense: P3 fixes

Built on the committed P2 pass. Review:
`agent-outputs/20261029-ds-interview-video-review/DataScientist-8-ProductSense.md`.
P2 report: `agent-outputs/20261029-ds-interview-video-review/fixes/DataScientist-8-ProductSense.md`
(it fixed no P3s, so all eleven, #8 to #18, were open). Nothing committed. All
changes are in `video/src/videos/ds-product-sense/` and
`video/public/narration/ds-product-sense/`.

## P3s

| # | Finding | Result | What changed |
| --- | --- | --- | --- |
| 8 | Q3 never says why the distinction matters | fixed | `lead-gap` split into `lead-gap` / `lead-late` / `lead-steer`; `lead-late` re-voiced: "Month-three retention doesn't show it for twelve more weeks, and by then it's too late to act." The bracket label now reads "12 weeks later**, too late to act**", the second half in red on "too late to act". |
| 9 | Q5's primary metric measures opening, not cooking | fixed | `save-tree` split into `save-tree` / `save-primary` / `save-rest`; `save-primary` re-voiced: "So the primary metric is the share of saved recipes cooked within a week." The green chip reads "share of saved recipes cooked within a week", the note under the recipe list "cooked within a week", and the `weekAt` cue follows. The page's own wording ("downstream conversion from saves") covers it. |
| 10 | Q11 never states the decision | fixed | `impact-verdict` split into `impact-verdict` / `impact-cheap`; `impact-verdict` re-voiced: "Even the best case is under a fifth of it, so deprioritize it before anyone builds it." On screen, "→ deprioritize it before anyone builds it" lands on "deprioritize it", where the punchline was; "the cheapest experiment is the arithmetic" moves one row down. |
| 11 | Q11's range bar floats ~3 s before its axis | fixed | The axis and the light track now ease in from `rangeAt - 8`, so the bar lands on a drawn scale. The goal label still comes on "against a goal of twenty thousand". |
| 12 | A/B split drawn as alternation, and B is green | fixed | The deal follows a fixed shuffle (`DEAL`, ten each) instead of `i % 2`. Queued dots are grey (`INK_SOFT`) and take their arm's color as they land. Arm B, its box and its dots are orange (`WARM` / `WARM_INK`), not green. |
| 13 | "not the value" set in green | fixed | "the interaction" is now red (`ACCENT_INK`, what is wrong with the metric) and ", not the value" ink. |
| 14 | Labels on chart lines / away from what they label | fixed | Q3: "month-three retention" moved above its line (`at(ys, 0.255)`), off the 20% gridline. The "12 weeks later" bracket moved to `at(ys, 0.334)`, between the leading line and the 30% gridline. The reviewer's 0.325 would have put the label under the bracket across that gridline, and 0.334 is the one value that clears both the gridline and the leading line's low point (week 16). Ratio round: the two changes are now one line under the after-fraction, "saves −4%, users −20%", the second half on "a fifth of the users left". They were not put to the right of the rows as suggested, because "= 2.4" occupies that space at the middle of the two rows. The labels also use a true minus and no `TABULAR`, which had set them as "- 4%". |
| 15 | Two finished figures cleared ~1 s after completing | fixed | `pauseAfter` 0.7 → 1.3 on `rec-size` and `market-grade`. |
| 16 | The page empties during two transitions | fixed | Q9's card is moved out of the `Clear`, so it stays through "And last, the numbers you build on the spot" until the cut, as Q5's does. The hook's "Product sense is that judgment." headline has no `out`, so it stays until the cut. The suggested `out={end}` still left about 1 s of kicker alone, because `end` is the end of the beat and the cut comes 1.3 s later. |
| 17 | Ratio round names "the mix" but shows only the denominator | fixed | `r-ratio` split into `r-ratio` / `r-ratio-ex` / `r-ratio-rule`, with two new beats. `r-simpson` comes after the first sentence: "Shift the mix, and a rate can fall in every group yet rise overall. That's Simpson's paradox." (This follows the page's definition. The suggested "the mix underneath, which is Simpson's paradox" names any mix shift as the paradox.) `r-ratio-why` comes after the rule: "An average of ratios counts a group of ten as much as a group of ten thousand." On screen, a 22px line under the opening sentence reads "a rate can fall in every group yet rise overall: **Simpson's paradox**", and a 22px line under the rule reads "an average of ratios counts a group of 10 as much as a group of 10,000". Both build on their words. |
| 18 | Hook's last labels read as captions for the wrong things | fixed | "no code in this round" moved up to the made-up note's row, right-aligned to the tiles' right edge, so it no longer pairs with "the one that can say something is wrong". The steers-by label reads "**first:** the number a whole team steers by" and has a 23px leader down to square 1. |

None moot, none left.

## Voice

**424 characters re-voiced** (`narrate --dry-run`), under the 1,000 limit. Five
beats were each voiced on their own:

- `lead-late` (94)
- `save-primary` (73)
- `impact-verdict` (86)
- `r-simpson` (93, new)
- `r-ratio-why` (78, new)

**The splits cost nothing, and they were cut from the kept takes, not from the
beats' own files.** `narrate --recut` refuses this video: takes 3 to 5 no longer match the
script (take 3 says "D A U", and all three hold beats added or re-voiced
alone since). I used
`$S/DataScientist-8-ProductSense/tools/cut.mjs`, which does the same job as
the Interview fixer's `recut-take.mjs`. It runs `narrate.mjs --recut`
unchanged on a scratch root whose one take is the kept take, with a script
holding that take's beats as voiced, the splits included. Before writing
anything I validated it on take 2 and take 5 as voiced. Every beat in them came
back byte-identical to the committed MP3 and alignment entry, except
`impact-lift`, whose committed file is the P2 re-voice.

I then cut the splits:

- **Take 2:** `lead-gap`, `lead-steer`, `save-tree`, `save-rest`.
- **Take 5:** `impact-cheap`, `r-ratio`, `r-ratio-ex`, `r-ratio-rule`.

In the same runs, every beat the splits did not touch came back byte-identical
again. Only the named pieces were written. No cut warned of a missing pause.

## Length and checks

- **Length 8:11 → 8:36** (490.9 s → 516.0 s, 42 → 51 beats, `npm run cues`).
  The re-voiced beats run at 2.4 to 2.9 words a second, except `r-ratio-why`
  at 3.2, which is 17 mostly one-syllable words followed by a 0.9 s pause.
- Typecheck: `tsc --noEmit` exits 0 (no errors anywhere). `eslint
  src/videos/ds-product-sense`: clean.
- `npm test`: 59/59. `npm run check:cues`: nothing in this video. Its only
  failures are in `ds-deep-learning/AttnScene.tsx`, mid-edit by that fixer.
- `check:sync`: passes. All 51 beats start within ±0.12 s of their cue; the
  worst is +0.03 s (`guard`).
- `check:mix`: effects 28.0 LU under the narration; speech a median 28.8 dB
  above them (5th percentile 12.1 dB).
- `check:motion`: passes on the final code. Nothing holds still for 3 s; the longest still stretch is 2.0 s (four of them, at scene openings and the Q9 bridge). The first run failed; see Noticed.
- `check:frames`: not run. No arrow, illustration or ERD changed.
- Stills, each looked at:
  - Hook: 27.5, 30.9 (no-code row, first-square label and leader), 33.4
    (headline held to the cut).
  - Q3: 121 (bracket, "too late to act", lagging label).
  - Q5: 175, 181 (cooked, interaction colors).
  - Q8: 286.5, 287.5, 290, 303 (grey queue, shuffled deal, orange B).
  - Q9 bridge: 369.2 (card held).
  - Q10/Q11: 404, 406.6, 424.5, 438.8 (axis with the bar, decision line).
  - Ratio round: 484, 502.5 (Simpson line, change line, average line).

## Noticed

- **`check:motion` failed once on the final edits.** Q10's question card was
  read over a still page for 3.0 s. Nothing in the opening changed: the scene
  grew by about 4 s (the longer verdict, `impact-cheap`, and the 1.3 s pause),
  and the shared `Drift` eases in over the whole scene, so its start got
  slower. This is the same effect the P2 fixer reported. I gave the scene one
  `Drift` per question: Q10 from its cue to Q11's, and Q11 from there to the
  scene's end. The two halves only meet in the 0.3 s cross-fade between the
  two question cards. There, the fading Q10 card sits about 2% larger than the
  incoming Q11 card (still 406.6), which reads as part of the swap. Q10's
  content now ends its push at 2.5%, so the chain's right edge reaches
  x ≈ 1845 (still 404), still inside the frame. If the offset bothers anyone,
  the alternative is a small Q10-only drift nested inside the original
  whole-scene one.
- **Kit suggestion (repeated from P2, now hit twice in this video):** a `Drift`
  with a fixed ramp, independent of scene length, would stop any edit that
  lengthens a scene from failing `check:motion` on its opening card.
- **Kit suggestion:** a `--take` mode for `narrate --recut` that cuts one kept
  take whose text still matches, and leaves the rest alone. Every split in
  this video and in several others needed a scratch copy of the cutter, only
  because one other take had gone stale.
- No shared-kit change is needed for any of these P3s.
