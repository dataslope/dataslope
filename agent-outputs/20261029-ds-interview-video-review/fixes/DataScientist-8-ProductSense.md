# DataScientist-8-ProductSense: P2 fixes

Built on the P1 commit (`53eda7cd`, the noise band's label). Review:
`agent-outputs/20261029-ds-interview-video-review/DataScientist-8-ProductSense.md`.
Nothing committed. All changes are in `video/src/videos/ds-product-sense/` and
`video/public/narration/ds-product-sense/`.

## P2s

| # | Finding | Result | What changed |
| --- | --- | --- | --- |
| 2 | Q11 multiplies reach by a lift in ambiguous units | fixed | The lift is now absolute in both the narration and on screen. New beat `impact-lift` (split from `impact`): "Similar launches turned one to three in every hundred of those users into new weekly cooks." The line reads "120,000 weekly users reach its screen × **1 to 3 in 100** become new weekly cooks (similar launches)". The 1 and 3 are `perHundredLo/Hi` from `check.mjs`, which now notes that the lift is in points, not relative. |
| 3 | Q6 stops at "internal or external" | fixed | New step 5, "Size it, fix it, confirm", lit on new beat `drop-act`: "That finds the cause. Then size it, fix it, and confirm: Android lost a fifth of its users, so roll back five point two, and watch Android climb back." Under the platform bars, three chips land on their words: "size: Android −20%" (`DROP.byPlatform.Android.change`), "fix: roll back 5.2" (green, highlighted) and "confirm: Android climbs back". Step 4's two chips leave when step 5 takes their row, the same way step 1's chips leave at step 2. Step 1's missing half is fixed too. New beat `drop-check` says "Rule them out: compare the same week last year, and check whether related metrics moved with it.", and a line under the fakes reads "rule them out: the same week last year, related metrics". |
| 4 | Q9's alternatives are names with no meaning | fixed | `cant-instead` re-voiced (its last sentence split off as `cant-trade` and cut from the take): "Then randomize whole regions, or switch the change on and off by time slot. Or compare against a baseline. Difference-in-differences takes how much the treated regions moved, minus how much the untreated ones did. A synthetic control weights untreated regions into a stand-in for the treated one. An interrupted time series looks for a break in the trend at the change." On screen the chips now read "randomize whole regions" and "or switch by time slot". Each method chip gets a 23px gloss as its explanation is spoken: "treated regions' change − untreated regions'", "untreated regions weighted into a stand-in", "a break in the trend at the change". The column moved from x 1000 to 880 to make room. `pauseAfter` 0.7 on the re-voiced beat. |
| 5 | Q10 grades "the sanity check" but never does one | fixed | New beat `market-sanity` before `market-grade`: "Then sanity-check it: five hundred thousand searches from five hundred thousand users is one search a day each. Plausible." Under the result box: "**sanity check:** 500,000 searches ÷ 500,000 users = 1 search a day each, plausible", with the numbers in blue and "plausible" in green. It is built from `MARKET.daily`, `MARKET.users` and the new `MARKET.perUserDaily` from `check.mjs`. |
| 6 | Q2's connector points at "sessions ▲" | fixed | The dashed line now runs from the "unsubscribes" chip to "people quietly leave" (ending above the word, with the control point lowered so the line clears the "revenue" chip). The chip is drawn in ink like the other guardrails and turns red at "people quietly leave", when it is lit. |
| 7 | Tracked all-caps row labels in the Save tree | fixed | The labels now read "Primary", "Secondary", "Guardrails" and "Not this", at 22px weight 700 with no letter-spacing. |

**P3s:** none fixed. None of the eleven (#8 to #18) is fixed as a side effect of these edits, so all are left.

**One change the checks forced.** The new beats make the Q6 scene about 60 s long
(was 41 s) and the Q8/9 scene about 90 s (was 75 s). The shared `Drift` eases in over
the whole scene, so it now starts more slowly, and `check:motion` flagged both
question cards as read over a still page (3.3 s and 3.0 s). Two cues now come
earlier, and nothing else changed. The DAU line draws on "eight percent drop"
and its label appears on "daily active users" (both were on "DAU", about 1.5 s
later). The user dots queue up one by one on "a new recommendation algorithm"
(was "Make it an A B test").

## Voice

**828 characters re-voiced** (`narrate --dry-run`, under the 1,500 limit). Five
beats were each voiced on their own: `drop-check` (96, new), `drop-act` (150,
new), `cant-instead` (369), `market-sanity` (122, new) and `impact-lift` (91).

The splits cost nothing. `impact` became `impact` / `impact-lift` /
`impact-range`, and `cant-instead` became `cant-instead` / `cant-trade`. Both
split at sentence breaks and were cut from the kept takes with `narrate --recut`.

**Watch out for this before any recut of this video.** Take 3 was recorded
saying "D A U". The `drop` beat was later re-voiced alone as "DAU", so take 3 no
longer matches the script and `--recut` refuses the whole video. For the recut
only, I set the `drop` text back to "D A U". Afterwards I restored `drop.mp3` and
its `alignment.json` entry from HEAD (`git show`) and set the script text back
to "DAU". I checked that every beat except the split and re-voiced ones is
byte-identical to HEAD, both its MP3 and its alignment entry.

## Length and checks

- **Length 7:23 → 8:11** (443.4 s → 490.9 s, 42 beats, `npm run cues`). The
  new beats run at 2.3 to 2.8 words a second.
- Typecheck for the folder: no errors. `eslint src/videos/ds-product-sense`: clean.
- `npm test`: 59/59 pass on the final code. `npm run check:cues`: no failure
  in this video. Earlier runs did fail, but only in other fixers' videos that
  were mid-edit (`ds-ml-evaluation`, `ds-llm-evaluation`, `ds-probability`).
- `check:motion`: passes on the final code. Nothing holds still for 3 s; the
  longest still stretch is 2.8 s.
- `check:sync`: passes. All 42 beats start within ±0.12 s of their cue; the
  worst is +0.04 s (`market`).
- `check:mix`: effects 27.8 LU under the narration; speech a median 28.8 dB above
  them (5th percentile 13.0 dB).
- `check:frames`: not run. No arrow, illustration or ERD changed (the Q2
  connector is a plain dashed path with no head, as before).
- Stills, each looked at: 72, 80 (Q2 chip before and after, connector), 175 (Save
  tree), 185.5, 202, 227, 240 (Q6: DAU line, rule-out line, step 4, step 5),
  277.8 (Q8 user queue), 335, 356 (Q9 glosses), 394, 399 (Q10 sanity check),
  417, 429 (Q11 line).

## Noticed

- **`check.mjs` cannot run as its header says.** The repo root has no
  `node_modules`, so `pyodide` does not resolve. I fetched the locked
  `pyodide@314.0.7` tarball with `npm pack` into my scratch folder (its
  integrity matches `package-lock.json`), unpacked it, and ran
  `NODE_PATH=<scratch>/node_modules NODE_USE_ENV_PROXY=1 node video/src/videos/ds-product-sense/check.mjs`
  from the root. Nothing was installed into the repo. The rerun reproduced
  every existing value in `results.json` exactly; the only change is the three
  new keys (`market.perUserDaily`, `impact.perHundredLo`, `impact.perHundredHi`).
  The other fixers will hit the same problem.
- `DropScene`'s existing "92,000 (-8%)" label sets `TABULAR` on the whole span,
  so its hyphen-minus renders spaced out as "( - 8%)", the series-wide pattern
  `style.ts` warns about. It is not a reviewed finding, so I left it. My new
  chip uses a true minus and no `TABULAR`.
- A queued job running stills plus three checks in one slot hit Bash's default
  30-minute background limit while it waited in the queue, and `check:mix` was
  killed after rendering. I re-ran it with a 2-hour timeout and it passed.
  Fixers who chain several checks in one slot should set a long `timeout`.
- **Kit suggestion:** for a scene that grows, `Drift`'s cosine ease-in is
  slower at the start, so lengthening a scene can fail `check:motion` on its
  opening card even when nothing in the opening changed. A drift with a fixed
  ramp (for example, linear after a 1 s ease-in) would make scene length
  irrelevant to the motion check.
