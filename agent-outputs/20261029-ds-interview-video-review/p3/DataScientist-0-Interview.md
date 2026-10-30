# DataScientist-0-Interview: P3 fixes

Folder `video/src/videos/ds-interview/`. Review report:
`agent-outputs/20261029-ds-interview-video-review/DataScientist-0-Interview.md`.
P2 fix report: `.../fixes/DataScientist-0-Interview.md`. Not committed.

## P3s

| # | Status | What changed |
| --- | --- | --- |
| 4 | fixed | Re-voiced `next`: "The track opens with statistics and probability, and so does this series. Next: Statistics." The unsourced claim about how loops open is gone. The new line is sourced: the page's Topics list opens with Statistics, then Probability. On screen, Part 1 lights on "statistics and probability" and Part 2 on "and probability", so the highlight now follows the words. On "Next", Part 2 un-lights and dims with the rest; Part 1 stays lit. |
| 5 | fixed (finished) | P2 had already moved the recruiter line to INK. Now the loop scene's A and B arms are both data blue (`BAR` fill and border, `BLUE_INK` letter) and are told apart by their letters only. |
| 6 | fixed | Panel 1's scale now has end ticks with "0%" and "100%" under them, and a "pass rate" caption on its own row below. Panel 2's bars have "run 1", "run 2" and "run 3" under them. All of these are 20px `INK_SOFT` SVG text with `fill` set, and each fades in with its figure. |
| 7 | fixed | The interval `<line>` has `opacity={ciP}`, like its whiskers, so nothing is drawn before "a confidence interval". The stills at 55.6 s and 59.5 s show no dot. |
| 8 | fixed | "How would you predict this?" is on one line: a 420px box (`QUOTE_W`) with `whiteSpace: "nowrap"`. It keeps about 60px of clear space to the bell on its left and to the A box on its right. |
| 9 | already done in P2 | |
| 10 | fixed | Part 8's tile title is now "Product sense". The tiles already shorten titles ("Machine learning I" for "Machine learning I: training and evaluating"), and "Product sense" is the Part 8 video's own subject. Tile titles are also `nowrap`. All eleven titles sit on one line and all eleven counts share a baseline. This also covers the P2 fixer's note that "Machine learning II" could wrap: at full size it just fits, ending about 17px inside the tile's edge, and `nowrap` keeps it on one line if the font metrics ever shift. |
| 11 | fixed | The NextLine moved to `y(LINE_Y) + h(12)`. Its rule now clears the tiles by about 40px, and "Next: Statistics" lands about 88px above the bottom edge. The two practice lines now fade from `nextAt - 16` instead of `nextAt - 8`, so they are gone before the rule inks in across where they stood (stills at 131.1 s and 131.4 s). |
| 12 | fixed | Split `ai` at its first sentence: `ai` is now the headline only, and the rest became a new beat, `ai-eval`, which was re-voiced as "…an eval set of test prompts, a confidence interval on the share of them it passes, and a check that an LLM judge, a model grading the answers, agrees with human experts." Panel 1 now inks in on "a large language model", not "Evaluating a feature", so "LLM" appears on screen as its expansion is spoken. Its lines now read "an eval set of test prompts" and "does the LLM judge agree with experts?". |
| 13 | fixed (finished) | P2 split off the other three panels. The split for #12 separates the last two ideas, the headline and LLM evaluation, with a 0.6 s pause. Each of the four panels now has its own beat. |

None of these were judged wrong. The page agrees with the new wording. The index page says "eval-set design, confidence intervals on a pass rate, and whether an LLM judge agrees with human experts", and its Topics list opens with Statistics, then Probability.

## Voice

**363 characters re-voiced** (the `narrate --dry-run` count), each beat on its own:

- `ai-eval`: 272 (new beat, split from `ai`)
- `next`: 91

`ai`, now the headline sentence alone, cost nothing: it was cut from the kept whole-script take (`takes/ds-interview/take-1`). `narrate --recut` refuses this folder because four beats were re-voiced alone in P2. So I ran narrate's own `--recut`, unchanged, on a scratch root whose `script.ts` holds the take's original text split into the current beats plus `ai`/`ai-eval`. The tool is `$S/DataScientist-0-Interview/p3/tools/recut-take.mjs`, with the split in `take-beats.json`. To validate it, I compared the beats that have not changed since the take (`loop`, `probe-list`, `ai-check`, `series`, `next`): each came back byte-identical to the committed MP3 and alignment entry. Only `ai.mp3` and its entry were copied into the real folder.

**Not used:** the `split.mjs` workaround from P3-BRIEF. When I checked it as the brief says, re-cutting the untouched `ai-check` from its own file returned an identical alignment entry but a different MP3: 43,001 bytes became 42,819, and the decoded PCM differs. narrate's cutter decodes and re-encodes with libmp3lame, so a beat split from its own already-cut file is a second lossy generation. That is not true of a cut from the take. The coordinator may want to tell the fixers who use `split.mjs`. The loss is probably inaudible, but the brief's "reproduces the committed file" test fails for it.

## Length and checks

- `npm run cues -- ds-interview`: 11 beats, 303 words, **135.8 s** (2:16), up from 129.8 s. `ai-eval` runs 2.68 words/s, the headline `ai` 2.04, and `next` 2.03.
- `check.mjs` re-run: `results.json` byte-identical (bank 110, challenges on 4 of 9 pages, concept checks on 9 of 9). No new numbers. The "0%" and "100%" labels are the ends of the scale, not data.
- Typecheck for `src/videos/ds-interview/`: clean. eslint: clean.
- `npm run check:cues`: nothing in ds-interview. A local scan finds all 58 literal cues in the folder unique. The failures it lists are in ds-deep-learning, ds-probability and ds-ml-evaluation, which other fixers are editing.
- `npm test`: 57/59. The 2 failures are the two cue tests, and both name only those three folders, never ds-interview.
- `check:motion`: pass. It checked 2:16.0 and found 0 still stretches of 2 s or more.
- `check:sync`: pass. Every beat is within ±0.12 s; the worst is +0.02 s (`ai-check`). The re-voiced `ai-eval` is at +0.00 and `next` at −0.00, and the re-cut `ai` at +0.01.
- `check:mix`: run, with the same result as P2. Effects sit 32.3 LU under the narration. Where both sound, the speech is a median 28.7 dB above the effects (5th percentile 9.4 dB). The closest moment is 1:42.0 at 10.3 dB: the tile tap under "eleven videos". It is the same tap P2 measured at 12.3 dB at 1:35.9, shifted 6 s later, with its code and the `series` audio unchanged. It is a 50 ms reading between words.
- `check:frames`: not run. No arrow, illustration or ERD changed.
- Stills at every change, each looked at, cropped to the changed region:
  - 16.5 s: loop route, with the quote on one line and both arms blue.
  - 55.6 s and 59.5 s: panel 1 before its interval, with no dot.
  - 70 s: panel 1's scale and labels, on one row. "pass rate" sat 10px from "100%", so it moved to a row of its own.
  - 63.2 s and 71 s: the final panel 1, with the caption on its own row.
  - 80.5 s: panel 2's run labels.
  - 93.5 s: the whole AI scene.
  - 112 s: the tile strip, every title on one line.
  - 129.5 s: Parts 1 and 2 lit.
  - 130.9 s: the practice lines fading.
  - 131.1 s and 131.4 s: the practice lines handing over to the rule.
  - 133.5 s: "Next", with only Part 1 lit and the rule clear of the tiles.

## Files changed

`video/src/videos/ds-interview/{script.ts, data.ts, AiScene.tsx, LoopScene.tsx, SeriesScene.tsx}`; `video/public/narration/ds-interview/{ai.mp3, next.mp3, alignment.json}` and the new `ai-eval.mp3`.

## Shared-kit suggestions

- `narrate --recut` could take a `--from-take` mode, which re-cuts a kept take against its own recorded text split into the current beat ids, as `recut-take.mjs` does here. That keeps every split a first-generation cut even after other beats have been re-voiced alone.
- None of these P3s needed a shared-kit change.
