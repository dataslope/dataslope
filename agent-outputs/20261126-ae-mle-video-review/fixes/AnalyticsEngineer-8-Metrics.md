# AnalyticsEngineer-8-Metrics: fixes (second review)

All 5 findings fixed (2 P2, 3 P3). All 13 fixes from the first review were checked on screen and still hold. New length **10:51.8** (651.8 s, was 10:45.4): one sentence re-voiced (173 characters) and one pause lengthened.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 accuracy | fixed | Question 17 no longer calls month-to-date a trailing window. `r-cumulative` is split into three beats. The question and the closing sentence are cut from the kept take for free, and only the middle sentence is re-voiced. The heading now reads "A window, not a single period". The sliding band is labelled "trailing 28 days" and the axis ends at "today". On "one from the start of the month", a second band grows under the axis from a tick marked "the 1st" to today, labelled "month to date". The page has the same slip ("a trailing window (rolling 28-day active users, month-to-date revenue)"). I followed the facts (dbt's cumulative metrics: `window` against `grain_to_date`) and did not edit `content/`. |
| 2 | P2 accuracy | fixed | Under "Ben kept, refunded 0.00" in Question 4, a soft line now reads "`COALESCE` turns his `NULL` into 0.00", cued after "an inner join drops him". `check.mjs` already ran the COALESCE; the screen had never shown it. `chasm-left`'s `pauseAfter` went from 0.8 to 2.4 (timing only, no words), so the finished table holds about 2 s after the last word. |
| 3 | P3 | fixed | Question 9's heading changes with the boxes. On "the same answer everywhere", "Without one, each tool writes its own revenue" fades out, then "With one, every tool asks the layer" fades in. The two never overprint (same grid-cell technique as the boxes). |
| 4 | P3 | fixed | "Non-additive" now sits at the left, under the question and over the product grid, instead of alone over the empty right half from 321 to 336 s. The week chart gets its own heading, "Daily active users", on the words that name it, on the line its legend already uses. |
| 5 | P3 | fixed | On "not a rate column", the two `rate_pct` cells of the `daily` table turn red again. The advice now points at the column it rules out. |

A fix for a check, not a finding: the first `check:motion` run failed on one stretch, 412.5 to 415.5 s (3.0 s still, over `r-truth`). The quick-round list was already built and item 9 lit on "Why does", and nothing moved until "Without one". I did not change the Question 9 panel. The list now builds on "Question nine" instead of on "Eleven quick ones", and item 9 lights on "source of truth for metrics", about 0.9 s later than before. The pause after the headline is now about 1.3 s, and the one after item 9 lights about 2.4 s.

Housekeeping, not findings: the script header describes the two windows and has a "Second review" note. `NonaddScene`'s doc comment no longer says the stored rate is struck (no strikes since the first review).

## Voice

- **173 characters re-voiced** (budget 400; none spent on P3s). Beat `r-cumulative-window`, voiced alone with `--only` (11.12 s):
  - old: "It aggregates over a trailing window, like rolling twenty-eight-day active users, or month-to-date revenue."
  - new: "It aggregates over a window, not a single period: a trailing one, like rolling twenty-eight-day active users, or one from the start of the month, like month-to-date revenue."
- Cut free from take-5 with `--recut`: `r-cumulative` ("Question seventeen. What is a cumulative or time-window metric, and why define it centrally?") and `r-cumulative-once` ("Windows are easy to get subtly different by hand, so define the grain and the window once.").
- Timing only, free: `chasm-left` `pauseAfter` 0.8 to 2.4. The three new beats use `pauseAfter` 0.55, 0.55 and 1.2. The old beat had 1.2 at its end.
- Every other beat is unchanged. Against the pre-review commit (`5b6be27d`), `alignment.json` differs only in `r-cumulative`, `r-cumulative-window` and `r-cumulative-once`, and the only mp3 changes are `r-cumulative.mp3` (re-cut, shorter) and the two new files. `takes/ae-metrics` is untouched.

## Images

None generated.

## Facts

`check.mjs` was rerun ("every value matches the script"). `results.json` is byte-identical to the pre-review copy (`cmp`). No new number was added: the two windows are drawn as shapes, with no values.

## Checks

All on the final code, through `out/entries/AnalyticsEngineer-8-Metrics.tsx` and the queues.

| Check | Result |
| --- | --- |
| `tsc --noEmit` (errors in `ae-metrics`) | none |
| `eslint src/videos/ae-metrics` | clean (exit 0) |
| `check:cues` | pass ("every word cue names a phrase its beat says, and says which one") |
| `npm test` | 79 of 79 pass |
| `check:sync` | pass: 54 beats within ±0.12 s of their cues, worst +0.03 s (`avoid`); `r-cumulative` +0.00, `r-cumulative-window` +0.03, `r-cumulative-once` +0.01 |
| `check:mix` | pass: effects 29.0 LU under the narration, median 30.0 dB below the voice |
| `check:frames` (`CHECK_SCALE=1`) | PENDING |
| `check:motion` | PENDING |

Stills were rendered and looked at for every change: 226.5, 229.6, 322, 331, 350, 371.6, 427.6, 575, 580, 584 and 589.5 s, in `video/out/review/AnalyticsEngineer-8-Metrics/` and copied to `$S/after/AnalyticsEngineer-8-Metrics/`. After the first look, the "1st" tick was moved so it no longer runs up through the trailing band; it now drops from the axis only. The 589.5 still shows that version.

## Comparisons

In `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-8-Metrics/`. The before frames are the review's one-a-second frames.

- `01-month-to-date-is-a-to-date-window-not-a-trailing.png` (finding 1, with the narration before and after)
- `02-a-left-join-alone-leaves-ben-s-refund-null.png` (finding 2)
- `03-question-9-s-heading-follows-the-unified-boxes.png` (finding 3)
- `04-non-additive-no-longer-stands-alone-over-an-empt.png` (finding 4, at 331 s)
- `04-the-week-gets-its-own-heading.png` (finding 4, at 350 s)
- `05-not-a-rate-column-points-at-the-rate-column.png` (finding 5)
