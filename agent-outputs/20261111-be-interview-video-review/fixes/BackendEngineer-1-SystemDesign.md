# BackendEngineer-1-SystemDesign: fixes

Folder `video/src/videos/be-system-design/`. Review report:
`agent-outputs/20261111-be-interview-video-review/BackendEngineer-1-SystemDesign.md`
(1 P1, 9 P2, 8 P3). I did not commit anything. The coordinator's checkpoints
(3 to 7) caught parts of this work as it went. Compare against `f7144056`
(the fix brief) to see the whole change.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | The closing card keeps "sized for its estimate / 35,000 redirects a second" as it is (blue, no swap). On "ten times the traffic", a separate row comes in under "✓ no single point of failure": "now ten times the traffic", then "350,000 redirects a second" marked yellow. Both numbers come from `sig(ESTIMATE.peakReadQps)` (`NextScene.tsx`). Still at 526 s. |
| 2 | P2 | fixed | On "one request in a hundred", every bin from 100 ms on grows to 100 times its height (`MAG`, `MAG_FROM` in `TailScene.tsx`). A dashed rule at 100 ms carries the gray note "from 100 ms on, drawn 100 times taller". The 120 to 320 ms plateau, and the red bins past the p99, are now visible bars about 30 to 70 px tall. A red line under "one request in a hundred, or slower" reads "401 requests, 294 of them past 320 ms, off the chart". check.mjs now computes `percentiles.tailCount` (401) and `percentiles.offChart` (294), and asserts that `offChart` plus the histogram's counts is the whole sample. Still at 201 s. |
| 3 | P2 answer | fixed | `q3-counter` is split at its sentence break: `q3-counter` (the bottleneck) and `q3-blocks` ("Hand each server a block…"), both cut free from take-3. There is one new beat, `q3-coord`: "The counter still hands out the blocks, but it's asked once per million IDs, and a server that dies just leaves a gap." The counter box no longer leaves. On the blocks its red, its ring, its cross and its inward red arrows go, and it stays as a plain box. On `q3-coord`, dashed gray arrows run from it out to each server. Three lines under "1,000,000 at a time" read "The counter hands them out, / asked once per 1,000,000 IDs / a dead server leaves a gap". check.mjs checks "once per million IDs" against `KEY.idBlock`. Stills at 298.5 and 313.5 s. |
| 4 | P2 answer | fixed | `q3-hash` is re-voiced: "Or hash the long URL and keep a few characters. If that key is taken, add a salt and hash again, and make the write conditional, so two servers can't both claim it." On screen, the first row is "long URL → hash → a few characters". The second row is "taken?" (yellow) → "add a salt, hash again". The third, in green, is "store only if absent: no two servers claim one key". A gray line adds the hash's own trade-off, "and the same long URL always gets the same key", as a screen-only note. I drew the retry as a second row rather than a loop arrow: the flex row has no fixed x positions to aim a loop at. Still at 260 s. |
| 5 | P2 answer | fixed | A new beat, `q3-temp`, follows `q3`: "Make that redirect temporary. Browsers keep a permanent one, so later clicks never reach you: you can't count them, or take the link down." A third column after the API cards, behind a hairline, reads "which kind", then "temporary (302)" in green and "permanent (301): browsers keep it" in red. Question 5's edge-cache price is unchanged and now follows from this. Still at 260 s. |
| 6 | P2 answer | fixed | A new beat, `q4-how`, follows `q4-close`: "So retry with backoff and jitter, under a small budget, and while the breaker is open, fail fast or serve a cached answer." Four green lines sit beside the time axis: "Retry with backoff and jitter, / under a small retry budget / While it's open: fail fast, / or serve a cached answer". Still at 426 s. |
| 7 | P2 answer | fixed | A new beat, `q2-cache`, follows `q2-verdict`: "Even a whole day of new links is five gigabytes, so the hot set fits in one machine's memory." Under "and a cache": "a whole day of new links: 5 GB, fits in one machine's memory", from `ESTIMATE.dayInMemoryBytes`, which no scene read before. check.mjs checks "five gigabytes" against that value. I wrote "Even a whole day" so the claim is an upper bound and not "the hot set is a day of links". Still at 163 s. |
| 8 | P2 | fixed | "The price" and its two red notes now sit in the left "At the edge" column, under the redirect that moved there, with the timer line ("so keep that time to live short") after them. The redirect now starts lower in the right column, so it clears the new right-column lines. The verdict moved down to `y(846)`. Stills at 504.5 and 511 s. |
| 9 | P2 | fixed | The edge dot is now west of the user (`ux - 18, uy - 12`). The "edge" label is right-aligned to its left (`MAP_X + ux - 34, top + uy - 56`). The arc no longer touches either (`CdnScene.tsx`). Still at 459.5 s. |
| 10 | P2 | fixed | `q3-diagram` `pauseAfter` is 1.2 (was 0.8). `q3-path` is 1.4 (was 0.8). `q3-counter` is split, with 0.8 s before `q3-blocks`, then 0.7 and 1.0. The sums beside the diagram ("≈ 1 ms", "≈ 1.6 ms") now hold until "One counter that every server asks" (`sumsOut = askAt - 4`; was `counterAt - 4`). That is about 3.5 s after "one point six milliseconds" (was about 1.5 s). The counter's own lines come in 8 frames later, so the two sets never cross-fade in one place. The 0.5 ms labels on the diagram hold until "is a bottleneck" (`pathOut = bottleAt`), as suggested. q3-counter now runs at 2.9 words/s and q3-blocks at 3.0. Stills at 286.5, 291.5 and 298.5 s. |
| 11 | P3 answer | fixed | A new beat, `q3-edges`, closes Question 3: "Custom aliases share the key space, stored only if free, and expiry is a column the redirect checks." In the left column, under "or use the hash": "Custom aliases: the same keys, / stored only if free" and "Expiry: a column / the redirect checks". I left out the suggested "old rows cleaned up later" to stay inside the P3 budget. Still at 333 s. |
| 12 | P3 | fixed | The servers' blocks now start at the example's range: "from 9,876,000,001" and "from 9,877,000,001". check.mjs computes them as `key.blocks` (block-aligned to the first counted ID), and asserts that the three counted IDs sit in the first server's block. I show only where each block starts: "9,876,000,001 to 9,877,000,000" at the box's 20px sub size is about 330 px, and the boxes are 280. The size, "1,000,000 at a time", is beside the diagram. The 280px boxes are unchanged, and Question 4 is untouched. Still at 313.5 s. |
| 13 | P3 | fixed | A miss now turns the cache gray, dashed and hollow (tone `quiet`, not `bad`), so there is no purple cross-fade. The red cross on its arrow is replaced by the word "miss" in ink beside the arrow, and its sound is a tap rather than a scratch. Red is left for Question 4. Still at 286.5 s. |
| 14 | P3 | partly | I replaced the 12 unexplained server boxes with words: "one server" under "1,000 users", and "many servers, caches" under "1,000,000,000 redirects a day". The units still differ ("users" against "redirects a day"), because the narration says "at a thousand users". Changing that means re-voicing the 143-character first sentence of `q1-why`, which the P3 budget did not cover. Still at 83 s. |
| 15 | P3 | fixed | `q5-use` is split at its last sentence (the first part is cut free from take-5). The new `q5-dyn` is re-voiced with the gloss: "…or get a short time to live: how long the edge may keep a copy." On screen, the right column's line reads "or get a short time to live: how long the edge may keep a copy". Still at 486 / 504.5 s. |
| 16 | P3 answer | fixed | Also in `q5-dyn`: "Even those save handshake round trips, since the connection ends at the edge." The right column adds, in green, "even those save handshake round trips at the edge". Still at 504.5 s. |
| 17 | P3 | moot | The inline grid that reserved the wider number is gone with finding 1. Each number is on its own line, so there is no gap. |
| 18 | P3 | fixed | `MiniDesign` now has the client → a green "edge" box → the left zone's load balancer. Both headline periods are dropped ("A percentile, never a mean", "Don't bury a dependency that's already failing"). The Hook's "Design a URL shortener." keeps its period, because it is the prompt being quoted. Kickers use the short form: "Question 3 · A URL shortener" and "Question 5 · CDNs". |

No finding was judged wrong. The page needed no correction. The new answers
(temporary redirect, salted rehash with a conditional write, counter as block
allocator, backoff with jitter and fail-fast, CDN connection termination) are
standard follow-ups the page does not spell out. Each is said as a design
choice, without a number that is not computed.

## Voice

**928 characters re-voiced** (the `narrate --dry-run` count). That is seven
beats, each voiced on its own:

- **P1 and P2, 637:** `q2-cache` (93), `q3-temp` (139), `q3-hash` (165),
  `q3-coord` (118), `q4-how` (122).
- **P3, 293:** `q3-edges` (100), `q5-dyn` (193).

Three beats were cut free with `--recut`: `q3-counter` and `q3-blocks` from
take-3, and `q5-use` from take-5. Against `f7144056`, `alignment.json`'s meta
is unchanged, and its only differing entries are those 10 beats. No other mp3
changed, and the takes are untouched. (The file's line diff is large because
narrate rewrites its formatting. The content check is per beat.)

## Facts

check.mjs was re-run from the repo root. **Every existing value in
`results.json` came back identical.** The only differences are additions:

- `key.blocks`: 9,876,000,001 to 9,877,000,000, and 9,877,000,001 to
  9,878,000,000.
- `percentiles.tailCount`: 401.
- `percentiles.offChart`: 294.
- `said` gained three entries: `q3-blocks` "a million at a time", which moved
  from `q3-counter`, plus `q3-coord` "once per million IDs" and `q2-cache`
  "five gigabytes".

`data.ts` types the new fields.

## Length and checks

- `npm run cues -- be-system-design`: 45 beats, 1279 words, **527.0 s
  (8:47.0)**, up from 469.0 s (7:49). The growth is the seven new beats and
  the longer pauses in Question 3.
- Typecheck and eslint for the folder: clean.
- `npm run check:cues`: passes.
- `npm test`: passes (0 failures).
CHECKS_PLACEHOLDER
- Stills, each looked at: 83, 163, 201, 233.5, 260, 286.5, 291.5, 298.5,
  313.5, 333, 426, 459.5, 486, 504.5, 511, 517.5 and 526 s. Two defects found
  in them are fixed:
  - "one small server" sat 10 px from its hairline. It is now "one server".
  - The redirect-kind column was 4 px off the cards' baseline.

## Noticed, left

- The edge scene's vertical hairline now runs to the bottom of the left column
  (the price notes and the timer), below the right column's last line. That is
  how it behaved before, when the price was on the right.
- No shared change is needed.
