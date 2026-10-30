# DataAnalyst-6-Visualization: fixes

All 20 findings are fixed (2 P1, 6 P2, 12 P3). One part of finding 14 is left: the audience line for Question 11. Every check passes on the final code. The work is in `video/src/videos/da-visualization/` and `video/public/narration/da-visualization/`. The coordinator's automatic snapshots have already committed it (latest: `2c4214ca`).

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | The model's shares are no longer printed or spoken. The grid is shaded only, and its note says "darker: more attention, in a simple model, not a measurement", then "attention falls faster **down** the page than across it". `dash-attn` was re-voiced: "In a simple model of reading order, attention falls faster down the page than across it, so a slot at the top left is worth several at the bottom right." This is the spec's own claim (`charts/` not touched). The "about 8×" line and the per-cell percentages are gone. `results.json` still holds `dashboard.ratio`, but nothing draws it. |
| 2 | P1 | fixed | Both arbitrary axes now get a red cross. Fitted panel: "its noise looks as big as revenue's climb". From zero: "flat, and a crossover the axes invented", with a dashed red ring on the crossover, whose position is computed from the drawn lines. On "Index both series", the from-zero panel cross-fades into the page's fix: "Indexed: both start at 100", one axis, a green tick "one axis, nothing to tune", and "or two aligned panels, one axis each". The indexed series are new in `check.mjs` (`dual.indexed`). New beat `dual-axes` and re-voiced `dual-index`. `dual-show` and `dual-fix` were recut from the take for free. |
| 3 | P2 | fixed | The solid dots are drawn at r 8, so they fuse into one mass. From "from a blob" they shrink to r 4 and fade to 0.10 together. The red cross now lands about 0.4 s after "over four thousand points", while the dots are still solid. The green tick lands on "two clusters" over the faint dots. A note "piled up? lower the opacity" is cued to its words. |
| 4 | P2 answer | fixed | New beat `line-choose`: "When both are honest, choose: bars compare each week with its neighbour, and a line carries the shape, which matters more the longer the series." A four-line note beside the top row is cued phrase by phrase. |
| 5 | P2 answer | fixed | New beat `access-safe`: "Use a colorblind-safe pair, like blue and orange instead of red and green, and keep the contrast high." The third panel is redrawn in blue 700 and orange 500, which also differ in lightness. Its title builds "Blue and orange" → ", labeled" → ", in grayscale". The direct labels moved to the right of the line ends, clear of the title. |
| 6 | P2 | fixed | The bare red cross stays beside the chart, like the ticks. "a trend through no order" now sits under the chart's own labels. `line-wrong`'s `pauseAfter` went from 0.8 to 1.5 s. |
| 7 | P2 | fixed | `parts.tsx`: `tickText`, `YTicks`, `BarSet`, `LineSet`, `XTicks` and `Pie` all default to 19 px. Every override in the folder (15, 16, 17 and 18 px) is now 19 px or the default. A grep finds nothing under 19 px in the folder. |
| 8 | P2 | fixed | Question 7's bars draw on "That rule is for bars" and its line on "by position, not length", so "Here's a year of scores" describes charts already on screen. Question 3's pie draws on "For a few slices". |
| 9 | P3 | fixed | `DualScene`'s fade-to-white wrapper (`clearAt`) is removed. The page holds until the 6-frame cross-fade (still at 369.5 s). |
| 10 | P3 | fixed | The quarter-width verdict reads "noise: bumps that aren't real". `bins-narrow` was re-voiced: "Bins a quarter wide add spikes that are only noise." `bins-report` was re-voiced: "Report the shape that holds across sensible widths." The header is now "the same 1,000 values, three bin widths". A soft line was added: "Sturges sets the bin count from the sample size; Freedman–Diaconis, the width from the IQR". `bins`, `bins-one` and `bins-rule` were recut for free. |
| 11 | P3 | fixed | Both lines are labeled at their ends in both panels, "from 4,000, +6%" and "from 40, +35%", each at its series' cue. |
| 12 | P3 | fixed | The July bar stays data blue, with a yellow highlight ring. "−12%" is in ink with a `Mark`. The steps now share one left edge. |
| 13 | P3 answer | fixed | New beat `other-fix`: "The fixes: show the whole range, keep the axis upright, and leave a gap where data is missing." The decade's "0% net change" is marked on "show the whole range". The green gapped line draws on "leave a gap", with a green tick "a gap, not a zero". |
| 14 | P3 answer | partly | The key metric tile widens across two slots on "biggest and top left". The rest of row 0 slides along, its last slot fades, and the label grows. A yellow ring marks the tile on "where eyes land". New beat `report-use`: "Dashboards drive day-to-day decisions; reports drive deeper analysis." Each card gains a bold line to match. Not done: the page's "design for the audience" line for Question 11, which the suggested fix didn't ask for. It would cost about 75 more characters. |
| 15 | P3 | fixed | `check.mjs` row key is now "Color saturation", the page chart's own term (the report suggested "Color shade"). `choose-rank` was re-voiced: "...and color saturation last...". The note reads "color saturation: about 3× the error of position". `choose-under` was recut for free. |
| 16 | P3 | fixed | New `plan-drawn`: "We'll draw seventeen of them, most twice, the wrong way and the right way, and finish with five short ones." The screen reads "17 drawn, most twice: wrong, then right". `plan` was recut for free. |
| 17 | P3 | fixed | `cap`'s `pauseAfter` went from 0.7 to 1.5 s. The third panel's title gains ", in grayscale" only at "check the chart in grayscale". |
| 18 | P3 | fixed | A "Visits per day" title arrives on "loses nothing", after the legend has gone. |
| 19 | P3 | fixed | The panels are titled "As bars, from 92" and "As a line, from 92". The rules moved into the verdicts: "bars are length: a 3.6% rise, the last bar 2.55 times as tall" and "lines are position: a slope you can read". "either way, label the axis" is centered under both panels. The redundant "axis from 92" note is removed. |
| 20 | P3 | fixed | The card now reads "So is a non-zero baseline always wrong?", word for word as read. |

## Voice

- **1,173 characters re-voiced**, 11 beats, each on its own (`--only`):
  - **P1 (434):** `dash-attn` 176, `dual-axes` 155, `dual-index` 103.
  - **P2 answers (246):** `line-choose` 144, `access-safe` 102.
  - **P3 (493):** `plan-drawn` 107, `choose-rank` 121, `bins-narrow` 51, `bins-report` 51, `other-fix` 94, `report-use` 69.
- **Recut free from the kept takes** (`--recut`): `plan`, `choose-under`, `bins`, `bins-one`, `bins-rule`, `dual-show`, `dual-fix`, `dash-keep`.
- **Untouched beats:** compared with `8de9f413`, the only narration files that differ are the 19 beats above and `alignment.json`. Every other beat mp3 is byte-identical, and the takes are untouched.
- **Timing only:** `line-wrong` 1.5 s and `cap` 1.5 s.

## Length and checks

- **New length:** 10:38.6 (638.6 s, 69 beats, 146 wpm), up from 9:47.
- **Typecheck and lint** (`tsc`, `eslint src/videos/da-visualization`): clean.
- **`check:cues`:** clean.
- **`npm test`:** 69 of 69 pass.
- **`check:motion`:** pass, 10:38.8 checked, 0 still stretches.
- **`check:sync`:** pass, 69 beats, worst +0.04 s (`dash-attn`).
- **`check:mix`:**
  - Effects 26.8 LU under the narration.
  - Speech a median 27.6 dB above the effects; 5th percentile 12.6 dB; closest 13.4 dB at 3:35.3.
- **`check:frames`:** pass, including no hyphen in tabular figures.
- **Stills:** 26 in all, one at every changed moment. Each was looked at, cropped to the changed region. Two defects were found and fixed:
  - The report cards were too tall.
  - "Mobile" collided with the third accessibility panel's title.

## results.json

`check.mjs` needs `@observablehq/plot` and `linkedom` only because `charts/_theme.mjs` imports them; it never calls them. I stubbed both with a resolver hook in `$S/DataAnalyst-6-Visualization/stub/`. With the stub, the original `check.mjs` reproduces the committed `results.json` byte for byte.

After the changes, every existing value comes back identical except `encodings.rows[4].key`, which went from "Color" to "Color saturation" (finding 15). One block is new: `dual.indexed`, the two series divided by their first value times 100. Its range is a 100 to 270.8 and b 92.4 to 112.2.

## Noticed, left alone

- **Log scale:** the red verdict "the small one: flat along the floor" sits over an orange line that visibly climbs to about 1,465 by period 12. Not in the report. Something like "the small one: hugs the floor until the end" would be more exact.
- **Dashboard:** the right half of the page is empty while `dash-attn` and `dash-keep` play (about 17 s), until the panel-creep chart draws.
- **"Panels over 24 months" chart:** its 41 and 6 are also hand-typed example data from the page's chart (`dashboard-metric-creep`). The narration says "this one", so they are presented as an example, not a statistic.
- **No shared change needed.**
