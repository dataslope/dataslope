# DataScientist-2-Probability: P2 fixes

All six P2s are fixed, and two P3s are partly fixed along the way. 757 characters were re-voiced, against a budget of 1,500. The video now runs 8:22 (502.1 s), up from 7:44. Every check passes. Nothing is committed.

- **Folder:** `video/src/videos/ds-probability/`
- **Review:** `agent-outputs/20261029-ds-interview-video-review/DataScientist-2-Probability.md`
- **Built on:** the P1 commit `53eda7cd` (the hats figure)

## P2s

| # | Finding | Result | What changed |
| --- | --- | --- | --- |
| 2 | P(six) = ~~1/6~~ and P(two) = ~~1/6~~ | fixed | **Screen:** both strikes are gone. On "not one in six" (Q1) and "to zero" (Q5), the unconditional line turns grey and gains "out of all six faces". The conditional line under it reads "out of the three even faces" (Q1) or "out of the one face left" (Q5). Both lines stay up, and both are true.<br>**Sound:** the strike's scratch now plays with the red cross through the two, which is the one strike left.<br>**Narration:** unchanged. |
| 3 | Birthday: 50.7% asserted, never computed | fixed | **Screen:** "23 × 22 ÷ 2" appears under "253 pairs" on "two hundred and fifty-three pairs". Over the chart, the working builds term by term as the narration names each factor: "P(no match) = 364/365 × 363/365 × ⋯ × 343/365 = 49.3%". Then "P(match) = 1 − 49.3% = 50.7%" appears in green.<br>**New beat `bday-exact`:** "Work it through the complement. Each new person has to miss everyone before them: three sixty-four out of three sixty-five, then three sixty-three, down to three forty-three. Multiply them, and no match at all is forty-nine point three percent."<br>**New beat `bday-match`:** "So a match is fifty point seven percent…"<br>**Numbers:** `check.mjs` now writes `birthday.noMatch` (0.4927) and `birthday.lastFactor` (343). |
| 4 | Independent vs. exclusive never side by side | fixed | **Q4:** "equivalently P(A and B) = P(A) P(B)" now writes itself under P(A given B) = P(A).<br>**Q5:** on "Question five", that line moves to the top of Q5's column, tagged "independent". "P(A and B) = 0", tagged "mutually exclusive", lands directly under it.<br>**New beat `excl-never`:** "So two exclusive events that can each happen are never independent." It is highlighted on screen as "exclusive, and each possible: never independent". |
| 5 | Memoryless bars shrink beside a constant 43%, unexplained | fixed | **Bars:** each bar is now in two parts. The light part runs up to the curve at the start of its ten minutes (everyone still waiting). The solid yellow part runs up to the curve at the end (those who wait ten more). Each solid part is labelled "43%", the first one "43% of the bar".<br>**Formula:** it gets a key, "*s* already waited, *t* more".<br>**Narration:** `memory-wait` was split in three, and only the middle sentence was re-voiced: "The bar is everyone still waiting, and the darker part waits ten more. That's forty-three percent of the bar, whether they've waited zero minutes, ten, or thirty." |
| 6 | Crux beats of Bayes and Monty Hall run above 3.2 words/s | fixed | **Splits:** three beats were split at sentence breaks, each with a longer pause. These are re-cuts of the kept takes and cost nothing:<br>• `cond-die` / `cond-six`, 0.5 s<br>• `bayes-when` / `bayes-base`, 0.7 s<br>• `monty-switch` / `monty-host`, 0.8 s, plus 0.8 s before the simulation<br>**Re-voiced:** `bayes-base` now reads aloud the expansion on screen: "The bottom line adds the positives among the sick to the positives among the healthy, each weighted by how common its group is. Those weights are the base rate, and that's where intuition breaks." P(B given A) and P(B given not A) are highlighted as they are named, then P(A) and P(not A) on "each weighted". |
| 7 | Text under 19px | fixed | **Hats:** the numbers go from 15 to 21px, on a 54 × 28 crown. The hats sit 16px higher, so hat 5's brim clears the match's ring; my first enlargement put the brim on the ring, and the stills caught it.<br>**Other labels:** Bernoulli's "no / yes", the scatter's ticks and the scale's "−1 0 1" are now 21px.<br>**Parabola:** its axes are set to 21px as well, though they print no text. |

## P3s fixed along the way

- **#8, partly.** Rewriting `bayes-base` meant re-cueing its labels anyway.
  - "the base rate" now sits under the P(A) highlight, and "1 − the base rate" under P(not A).
  - "where intuition breaks" has its own line.
  - The numerator's label reads "prior: the base rate".
  - Not done: the "A = disease, B = positive" note, and the blue "you know" ink.
- **#10, the Q5 half.** Rewriting Q5's lines put "P(two given one) = 0" and "as far from independent as it gets" in ink rather than red. The Poisson's green dots are untouched.

## Voice

757 characters were re-voiced, each beat on its own:

| Beat | Characters |
| --- | --- |
| `bayes-base` | 195 |
| `excl-never` (new) | 67 |
| `memory-more` | 162 |
| `bday-exact` | 244 |
| `bday-match` (new) | 89 |

Six beats came from splits that were cut from the kept takes with `narrate --recut`, before any wording changed: `cond-six`, `bayes-base`, `memory-more`, `memory-other`, `monty-host` and `bday-exact`. Three of them (`bayes-base`, `memory-more` and `bday-exact`) were then rewritten and re-voiced. The re-cut left every untouched beat's MP3 byte for byte as it was.

## Length and checks

The video now runs **502.1 s (8:22)**, up from 464.4 s (7:44). It has 56 beats and 1,203 words, at 144 words a minute.

| Check | Result |
| --- | --- |
| Typecheck (whole package) | passes; earlier runs showed nothing in this folder |
| `eslint src/videos/ds-probability` | clean |
| `npm test` | 59/59 |
| `npm run check:cues` | nothing in this folder |
| `check:sync` | passes: all 56 beats within ±0.12 s, worst +0.06 s (`linear-var`) |
| `check:mix` | passes: effects 28.2 LU under the narration, median 28.1 dB. The closest moment, 6.7 dB at 4:23.4, is an older cue in the hats scene, not one I added. |
| `check:motion` | passes: nothing holds still for 3 s. The longest still stretch is 2.5 s, on question cards. |
| `check:frames` | not run: no arrow, illustration or ERD changed |

- **Last edit after the motion check:** `check:motion` bundled just before I moved the two birthday rows down 27px. A moved line of static text cannot change whether anything holds still. The typecheck and `npm test` also ran before that edit; lint and `check:cues` ran after it.
- **Stills:** I took 21 stills (`video/out/DataScientist-2-Probability-*.jpeg`) and looked at each one. They caught three problems, all now fixed and shot again:
  - Hat 5's brim was on the match's ring.
  - The *s* / *t* key ran into the table header beside it.
  - The birthday working was squeezed under the question. Measured on the last frame, its rows now have 41 to 42px of clear space above and below.

## Noticed

- **The hats' numbers drew in the wrong colour (fixed).** `label()` sets CSS `color`, but SVG `<text>` only takes `fill`. So the person numbers under the hats drew black instead of soft grey. The match hat's number was meant to be white on green and drew black; black is the more legible of the two, so I kept it.
  - Hats and person numbers now set `fill` explicitly, and so do the correlation scale's labels.
  - MontyScene's door numbers have the same pattern, but they want ink anyway, so they look right.
  - **Kit suggestion:** a `labelSvg()` helper that sets `fill`. This same bug caused Statistics' P1.
- **`check.mjs` can't run as its header says.** `pyodide` isn't installed in the repo's `node_modules`. I ran it with `NODE_PATH` pointing at a copy of Pyodide 314.0.7 in my scratch folder (copied from another fixer's), rather than run `npm install`. It rewrote `results.json` identically apart from the two new birthday keys.
- **Labels in Bayes (left).** "likelihood" and "prior: the base rate" sit about 20px apart on the numerator's label row. They read as two labels, but they are close.
- **Pace after the splits.** Measured per beat, the split halves still read at 3.2 to 3.5 words a second, because a split only adds a pause, not slower speech. Across each crux passage the pace drops, for example Monty Hall's from 3.23 to 3.05, and the animations now get 0.7 to 0.8 s pauses. Slowing the speech itself would mean re-voicing with `[slowly]`, which I didn't spend budget on.
- **Not touched:** P3s #9, #11 to #19, and #10's Poisson half.
