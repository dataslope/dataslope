# AnalyticsEngineer-7-Testing: fixes (second review)

Video `ae-testing`, from the review in
`agent-outputs/20261126-ae-mle-video-review/AnalyticsEngineer-7-Testing.md`.
Length 593.0 s (9:53) before, **593.7 s (9:54) after** (`D/tools/timeline.mjs`).

All thirteen fixes from the first pass (2026-11-20) were checked on screen and hold. They are listed in the review's verdict.

## Findings

| # | Sev | Status | What changed |
| - | --- | ------ | ------------ |
| 1 | P3 explanation | fixed | A caption over the severity dial reads "Thresholds: `warn_if`, `error_if`, at the default `error` severity". The dial moved down 20 px to make room. The caption sits about 42 px under the listing and about 60 px over "warn at 1". The page's `severity: warn` YAML no longer reads as a config that errors at 100, which dbt never does on a warn-severity test. `RapidScene.tsx` (`Severity`). |
| 2 | P3 pacing | fixed | `r-contract` pauseAfter goes from 0.7 to 1.4. The contract figure and its last line, "Before any consumer sees it", now stay up about 0.8 s after the words, where they used to clear as the narrator finished. Timing only. Everything after it moves 0.7 s later. |
| 3 | P3 color | fixed | "All can pass" in the closing is in `INK`, not green, per the script's rule that green never marks tests passing on wrong data. |
| 4 | P3 spacing | fixed | Question 9's bars scale to `h(150)`, where they scaled to `h(170)`. The "30" now starts about 44 px under the column heading, where it started 24 px under it. The base, the values and the -33.3% are unchanged. |
| 5 | P3 explanation | fixed | Question 6's `raw.orders` name and rows ink in on "how old the newest row is" (235.5 s), where they came in on "loaded-at column" (238.0 s). The newest row's band and its note still wait for "loaded-at column". |

## Voice

**0 characters re-voiced** (budget 400). No finding was about the words: every answer holds as voiced, so nothing was split, recut or voiced. Every mp3 and `alignment.json` is untouched.

## Images

None generated.

## Facts

None of the five fixes touches `check.mjs` or `data.ts`. `check.mjs` was run again anyway. It reports "every value matches the script", and **`results.json` came back byte-identical** (md5 `9f4c5756…` before and after).

## Checks (final code, through `out/entries/AnalyticsEngineer-7-Testing.tsx` and the queues)

- tsc: no errors in `src/videos/ae-testing/` (exit 0). eslint `src/videos/ae-testing`: clean (exit 0).
- `check:cues`: passes ("every word cue names a phrase its beat says").
- `npm test`: 79 pass, 0 fail.
- `CHECK_SCALE=1 check:frames`: CHECK_FRAMES
- `check:motion`: CHECK_MOTION
- `check:sync` / `check:mix`: not run, because nothing was re-voiced and no audio changed.

Stills looked at (after): 236.5, 238.5, 388, 481.4, 482.1, 501.5 and 590.7 s.

## Comparisons

In `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-7-Testing/`. The before frames are the one-a-second review frames, each within 0.5 s of the matching moment.

- `01-the-severity-dial-now-names-warn-if-and-error-if.png`
- `02-question-13-s-last-line-stays-up-after-it-is-sai.png`
- `03-passing-tests-are-no-longer-green-in-the-closing.png`
- `04-question-9-s-bars-clear-the-column-heading.png`
- `05-question-6-s-rows-arrive-while-freshness-is-defi.png`
