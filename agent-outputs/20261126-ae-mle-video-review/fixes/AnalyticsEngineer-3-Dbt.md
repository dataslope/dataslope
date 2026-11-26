# AnalyticsEngineer-3-Dbt: fixes (second review)

I changed only my own paths: `video/src/videos/ae-dbt/` (`check.mjs`,
`results.json`, `data.ts`, `script.ts`, `RapidScene.tsx`, `SubsetScene.tsx`)
and one new beat in `video/public/narration/ae-dbt/`. I did not touch the
takes, the page or any shared code, and I committed nothing.

Every fix from the 2026-11-20 pass still holds on screen (see the review's
verdict). The review found 4 new findings: 0 P1, 2 P2 (both answer findings)
and 2 P3. All 4 are fixed.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P2 answer | Q18 never says what a plain `ref` gets; "nobody moves until they choose to" is wrong by default | fixed | New beat `r-version-latest`, voiced on its own after `r-version`: "A ref with no version gets the latest version, which defaults to the highest number. So set latest version to one until consumers have moved." On screen, inked on its words: "No version: `ref('dim_customer')` → `latest_version`", then "By default the highest: v2, for everyone at once" in red (the trap), then "`latest_version: 1` until consumers have moved" in green. The old line now reads "Breaking changes go in v2; pinned consumers move when they choose to", which is what pinning guarantees, and it opens on a capital. v2's box no longer turns the data blue. `r-version`'s 1.4 s pause moved to the new beat, and `r-version` went back to 0.8 s. The fact is dbt's documented behavior, not the page's (the page stops at pinning): the docs' "Model versions" page says "By default, the `ref` resolves to the latest version" and "If not specified explicitly, the `latest_version` would be `2`, because it's numerically greatest". The script header now says so, as it already does for `--target`. The page is not wrong, only short, so I left `content/` alone. |
| 2 | P2 answer | Q20 answers "how does it relate to dbt Core?" without the licence | fixed | On screen only. `r-v2` was voiced on its own with no take to cut from, so a word changed in it re-voices all 470 characters, and a beat after it would put the licence after the YAML point. The `dbt` row now reads "The main distribution, under dbt's own license", and a new `dbt OSS` row reads "Its Apache 2.0 subset". Both ink in on "the main distribution is now just called dbt", about 3 s before the `dbt Core` row, and they stay up about 20 s. `check.mjs` now quotes the page's two licence sentences in full and reads "Apache 2.0" out of the second into `dbtV2.ossLicense`. The SQL and YAML lines below moved down one row. |
| 3 | P3 | Q15's lit lineage is up for about 1.5 s | fixed | The dashboard and its two edges light on "question four's change" (544.8 s) and the two models on "reached" (546.1 s). Before, everything lit on "reached". `r-exposures`'s `pauseAfter` went from 0.8 to 1.4 (timing only). The lit path now holds from about 545 s to 548.8 s. |
| 4 | P3 | Q8's "Question 4's count of what a change rebuilds" sits under the wrong selector | fixed | It moved to `x = READ_X + 420`, under `--select fct_orders+` and "The fact, and the dashboard it reaches". It ends at about x = 1814. |

## Voice

- Characters re-voiced: **141** of the 400 budget, all for P2 finding 1: one
  new beat, `r-version-latest`, voiced on its own (`out/voice-slot.sh npm run
  narrate -- ae-dbt --only r-version-latest`, 9.60 s). The dry run showed
  only that beat to pay for. Nothing was re-voiced for a P3, and no `--force`.
  - Old words: none. `r-version` ("…so a breaking change rolls out without
    forcing everyone across at once.") is unchanged and keeps its audio.
  - New words: "A ref with no version gets the latest version, which defaults
    to the highest number. So set latest version to one until consumers have
    moved."
- Timing only (free): `r-version` `pauseAfter` 1.4 → 0.8; `r-version-latest`
  1.4; `r-exposures` 0.8 → 1.4.

## Images

None generated.

## Length

669.7 s → **680.7 s** (11:10 → 11:21). The new beat and its pause add
10.4 s, and the longer pause after Q15 adds 0.6 s.

## results.json

Every existing value came back identical: I diffed the rerun against a copy
saved first, key by key. One value was added, `dbtV2.ossLicense` ("Apache
2.0"). `check.mjs` also quotes two more page sentences in full ("…ships
under dbt's own product license." and "**dbt OSS** is the subset built
entirely from Apache 2.0 code."), so an edit to the page fails there first.

## Checks

All run on the final code, through `out/entries/AnalyticsEngineer-3-Dbt.tsx`
and the queues.

| Check | Result |
| --- | --- |
| typecheck (`tsc --noEmit`, errors naming `ae-dbt`) | pass, none |
| lint (`eslint src/videos/ae-dbt`) | pass |
| `check:cues` | pass: every word cue names a phrase its beat says |
| `npm test` | pass, 79 of 79 |
| `check:frames` (`CHECK_SCALE=1`) | **not run**: it waited in the render queue behind the other agents' jobs until its background job hit the 2-hour limit and was stopped, before it started (its log is empty). Per the harness, a job stopped at the longest timeout is not restarted, so the coordinator needs to run it. What it would check on the changed screens, I looked at by eye in the stills: no text under 19px (the new lines are 22 and 24px, code at 19px minimum), nothing past the page edge (the longest new line ends at x = 1814), no line through a label, no new arrows. |
| `check:motion` | pass: nothing holds still for 3 s; longest 2.8 s (r-macros, unchanged) |
| `check:sync` | pass: 50 beats, worst +0.05 s (`r-seeds`, unchanged); `r-version-latest` −0.01 s |
| `check:mix` | pass: effects 29.4 LU under the narration, speech a median 28.5 dB above them, closest 12.9 dB |

Stills at every changed place, looked at, in
`$S/after/AnalyticsEngineer-3-Dbt/`: 375.5 (Q8 caption), 545.5, 546.5 and
548.3 (Q15 lit path holding), 603.0, 606.5, 609.5 and 613.8 (Q18 lines
inking on their words), 640.0 and 664.5 (Q20 rows). I deleted the preview
`check:motion` left and the three WAVs `check:mix` left in `video/out/`.

## Comparisons

In `$S/compare/AnalyticsEngineer-3-Dbt/`
(`S` = `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad`):

- `01-q18-now-says-what-an-unpinned-ref-gets.png`
- `02-q20-now-gives-the-licence-half-of-how-v2-relates.png`
- `03-q15-s-lit-lineage-holds-about-3-5-s-not-1-5.png`
- `04-q8-s-caption-sits-under-the-selector-it-describe.png`
