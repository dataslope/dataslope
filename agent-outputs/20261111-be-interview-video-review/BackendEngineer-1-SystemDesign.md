# BackendEngineer-1-SystemDesign (469.0 s, 7:49)

## Verdict
- A strong, coherent video. One design is carried through all five questions. Every number I checked is correct: 11.6/s per million a day, 115.7 and 11,574 and 34,722/s, 5 GB a day and 9.1 TB, 17.4 MB/s, 62^6 = 56.8 B keys over 15.6 years, `aMoY42`/`43`/`44` (re-encoded), 1 - 0.99^100 = 0.634, and Sydney to Ashburn at 157 ms. Layouts are clean, no text is under about 19px, and no figure is clipped. The scenes never clear to an empty page between questions.
- The one wrong thing on screen is the closing card. After the swap to ten times the traffic it reads "sized for its estimate: 350,000 redirects a second", but the design was sized for 35,000, and Part 2 opens by saying so.
- The answers hold up, but several stop one step before the follow-up an interviewer asks next:
  - who hands out the ID blocks;
  - what happens when a hashed key is taken, and the check-then-store race;
  - 301 or 302;
  - how to retry safely, and what callers do while the breaker is open;
  - how big the cache is. `check.mjs` computes this (5 GB) and nothing shows it.
- Two figures confuse:
  - The percentile histogram points at a p99 region that is visibly empty: about 115 requests drawn as 3px slivers, and 294 past the 320 ms edge.
  - The edge-caching "price" notes sit under the "To the origin" column.
- Pacing is mostly comfortable (2.0 to 2.7 words/s). The exception is the Question 3 core: q3-diagram, q3-path and q3-counter run at about 3.0 to 3.15 words/s, three new design decisions with 0.6 to 0.8 s gaps, and the 1.6 ms result is wiped about 2 s after it is said.

## Findings

### 1. [P1] confusion: the closing card says the design was sized for 350,000 a second
- When: 461-469 s, beat `next-10x` (element-463.jpeg, element-468.jpeg)
- What: Under "sized for its estimate", 35,000 cross-fades to a yellow-marked 350,000 on "ten times the traffic", and the card holds that way to the end. The label still says the design was sized for 350,000 redirects a second, which is what the next video challenges. Part 2's opening beat says "sized for about thirty-five thousand redirects a second at peak", and the q2 estimate was 35,000.
- Why it matters: the last thing on screen states the wrong capacity for the design the viewer just built.
- Cause: `video/src/videos/be-system-design/NextScene.tsx:141-157`. The swap replaces the number in place under the unchanged "sized for its estimate" label.
- Fix: Keep "sized for its estimate: 35,000 redirects a second" as it is. On `tenAt`, add a second row under it in yellow: "now: 350,000 a second (×10)". Alternatively, strike the 35,000 in red and write 350,000 beside it under a new label, "ten times the traffic".

### 2. [P2] confusion: the p99 region of the histogram shows nothing
- When: 182-203 s, beats `q2-tail`, `q2-fanout` (element-202.jpeg)
- What: The red shaded band "99th percentile 286 ms, one request in a hundred, or slower" is empty to the eye. Bars are scaled to the 7,744-request peak, so the tail bins (10 to 24 requests each) draw at the 3px minimum and read as a baseline. Of the 401 requests at or past the p99, only about 110 fall inside the drawn 0-320 ms domain. The other 294 (`40000 - sum(counts)`) are off the chart altogether.
- Why it matters: the narration says one request in a hundred lands there, and the picture shows no requests there at all. The point of the scene, a fat tail the mean hides, is asserted rather than seen.
- Cause: `video/src/videos/be-system-design/TailScene.tsx:49-50` (`hy` is linear in `c / peak`), `:87-97` (the 3px floor). `P.domain` stops at 320.
- Fix: Add a magnified inset over the 100-320 ms bins (y × 100) labelled "×100 vertical". Alternatively, annotate the band with a count: "about 400 requests at 286 ms or more, 294 of them past 320 ms". Extending the domain to the sample's maximum, with a broken axis, would also work.

### 3. [P2] answer: ID blocks are handed out by nobody
- When: 267.8-281 s, beat `q3-counter` (element-270.jpeg, element-292.jpeg)
- What: The red "counter" box between the app servers disappears once "Hand each server a block of IDs" is said, and the servers then show "1 to 1,000,000" and "1,000,001 to 2,000,000" with no source. The narration never says what hands out the blocks.
- Why it matters: "Who hands out the blocks, and isn't that a single point of failure?" is the interviewer's next question, and Question 4 then lists the system's SPOFs without this one.
- Cause: `video/src/videos/be-system-design/DiagramScene.tsx:84` (`counterOut = blockAt + 20` removes the counter); script beat `q3-counter`.
- Fix: Keep the counter, greyed and smaller, with a dashed arrow to each server labelled "once per 1,000,000". Extend the beat: "A small coordinator still hands out the blocks, but it's asked once per million IDs, and a server that dies just leaves a gap in the keys."

### 4. [P2] answer: the hash option stops at "already taken?"
- When: 231.4-238 s, beat `q3-hash` (element-237.jpeg)
- What: "long URL → hash → already taken? → store", with no branch for "yes". Three things are left out:
  - The hash is truncated to a few characters. With six, the key space is 18 B of 56.8 B full after five years, so about a third of new keys would collide.
  - Check-then-store races between two servers unless the write is conditional.
  - The hash's own trade-off goes unstated: the same long URL always gets the same key.
- Why it matters: "And if it is taken?" is the standard follow-up to this option, and the answer as given would fail under concurrency.
- Cause: `video/src/videos/be-system-design/KeyScene.tsx:175-179`; script beat `q3-hash`.
- Fix: Draw a "taken → add a salt, hash again" loop arrow back to "hash". Narration: "Or hash the long URL and keep the first seven characters. If that key is taken, salt it and hash again, and make the write put-if-absent, so two servers can't both claim it."

### 5. [P2] answer: 301 or 302 is never raised
- When: 203.9-216.7 s (`q3`) and 429.3-446.8 s (`q5-redirect`)
- What: The API is "takes the key and redirects", and the video never chooses a redirect. Later it reaches the same trade-off at the edge ("a click the edge answers ... can't count it", "a link you take down keeps working"), but a browser caching a permanent redirect causes exactly that, before any CDN is involved.
- Why it matters: "Permanent or temporary redirect?" is the most common URL-shortener follow-up. It is a decision (analytics and takedowns against load), not syntax, so it fits the series' brief.
- Cause: script beats `q3` and `q5-redirect` (`video/src/videos/be-system-design/script.ts`).
- Fix: Add one beat after `q3`, or fold it into `q5-redirect`: "Use a temporary redirect with a short cache lifetime. A permanent one is cached by the browser, so later clicks never reach you: you can't count them or take the link down." Show it as two short chips, "permanent: cached forever" in red and "temporary + short lifetime" in green.

### 6. [P2] answer: retries are the villain, but the video never says how to retry
- When: 337.4-374.9 s, beats `q4-retry`, `q4-states`, `q4-close` (element-375.jpeg)
- What: "Retries add load at the worst moment" and "Under retries, it never does" make retrying sound wrong in itself. Two things go unsaid:
  - Retry with exponential backoff and jitter, under a retry budget. The simulation's own `retryBudget` of 2 is what produces the 300.
  - While the breaker is open, callers fail fast or serve a fallback.
- Why it matters: "So should you never retry?" and "What does the user see while it's open?" are the two questions this answer invites.
- Cause: script beats `q4-retry`, `q4-close`; `video/src/videos/be-system-design/BreakerScene.tsx` has no line for either.
- Fix: Extend `q4-close`: "So retry with backoff and jitter, under a budget, and while the breaker is open, fail fast or serve a cached answer." Add a final green line under the chart: "retry: backoff + jitter · open: fail fast or fall back".

### 7. [P2] answer: the estimate says the cache decides the design, then never sizes it
- When: 148.9-157 s, beat `q2-verdict` (element-156.jpeg)
- What: The verdict is "decided by its read traffic, and by how much of it a cache can answer", and the screen adds a bare green "and a cache". The video never says how much memory that takes. `check.mjs` computes `dayInMemoryBytes` (5 GB), and no scene reads it.
- Why it matters: "How big is the cache?" is the follow-up an estimate like this is meant to set up. The answer here is small and quotable: the hot set fits in one machine's memory.
- Cause: `video/src/videos/be-system-design/EstimateScene.tsx:176` (the bare "and a cache"); `ESTIMATE.dayInMemoryBytes` is unused.
- Fix: Add to `q2-verdict`: "and a day of new links is five gigabytes, so the hot set fits in one machine's memory." On screen, change "and a cache" to "and a cache: a day of links ≈ 5 GB, fits in memory".

### 8. [P2] confusion: the edge-caching "price" sits under "To the origin"
- When: 435-455 s, beats `q5-redirect`, `q5-win` (element-441.jpeg, element-454.jpeg)
- What: The popular short link's redirect slides into the left "At the edge" column, and its fix, "so keep that time to live short", appears there too. But "The price" and its two red consequences are set in the right column under the blue "To the origin" heading, where they read as costs of going to the origin.
- Why it matters: the column layout says the opposite of the narration about where those costs come from.
- Cause: `video/src/videos/be-system-design/EdgeScene.tsx:169-178` (`x={COL_B}` for "The price" and both notes).
- Fix: Set "The price" and both notes in the left column under the redirect, with the timer line after them. Alternatively, put them full-width under both columns, above the "cheapest large win" line, and move that line down to about y 960.

### 9. [P2] spacing: the great-circle arc runs through the "edge" label
- When: 401-410 s, beat `q5-light` (element-409.jpeg)
- What: The arc leaves Sydney toward the upper right and crosses the green "edge" label through its "g" descender and final "e". The edge dot also sits on the arc's first pixels.
- Why it matters: it is a line through a label, a recurring defect in the earlier series, and it falls on the word the narration is pointing at.
- Cause: `video/src/videos/be-system-design/CdnScene.tsx:156` (label at `ux + 30, uy - 54`, in the arc's path) and `:144` (dot at `ux + 16, uy - 14`).
- Fix: Put the dot west of the user (`ux - 18, uy - 12`) and its label to the left with `align="right"` at `x = MAP_X + ux - 34, y = top + uy - 56`. Nothing is drawn there.

### 10. [P2] pacing: the core of Question 3 is the densest stretch, and its result is wiped quickly
- When: 238.4-291.5 s, beats `q3-diagram` (3.14 words/s, gap 0.8), `q3-path` (2.97, gap 0.8), `q3-counter` (3.15, gap 0.6), `q3-guess`
- What: Three decisions with their reasons arrive in 14 s (key-value store, cache, stateless tier behind a balancer). Then come a two-route latency walk, then the counter bottleneck and ID blocks, then enumeration, with 0.6 s between the last two distinct ideas. The "≈ 1.6 ms" miss result and the 0.5 ms labels appear around 265-266 s and are cleared at about 268 s, when `q3-counter` starts (tile 268).
- Why it matters: this is the answer to the headline question, and it is the fastest part of the video.
- Cause: script `pauseAfter` values; `video/src/videos/be-system-design/DiagramScene.tsx:92` (`pathOut = counterAt - 4`).
- Fix:
  - Set `q3-diagram` pauseAfter to 1.2 and `q3-path` pauseAfter to 1.2, and `q3-counter` pauseAfter from 0.6 to 1.0.
  - Split `q3-counter` before "Hand each server", with a 0.8 s pause.
  - Hold the path labels until "is a bottleneck" (`pathOut = bottleAt`).

### 11. [P3] answer: custom aliases and expiry are raised in Question 1 and never answered
- When: 42-48 s (`q1-func`), then nothing in Question 3
- What: "Custom aliases? Links that expire?" are listed as edges to ask about, and the design never comes back to them.
- Why it matters: an interviewer who hears them raised will ask how the design handles them.
- Cause: script beat `q3-guess` (or a new short beat after it).
- Fix: Add one sentence after `q3-guess`: "Custom aliases share the key space, so check them like a hash; expiry is a column the redirect checks, with old rows cleaned up later."

### 12. [P3] confusion: the example IDs belong to neither block
- When: 282-293 s, beat `q3-guess` (element-292.jpeg)
- What: On the left, 9,876,543,210 to 9,876,543,212 are encoded as the counted IDs, while the two servers beside them show blocks "1 to 1,000,000" and "1,000,001 to 2,000,000".
- Why it matters: a careful viewer sees IDs that no server could have issued.
- Cause: `video/src/videos/be-system-design/DiagramScene.tsx` (`sub(lo, hi)` called with 1 and 1,000,001); `KEY.counted` in `results.json`.
- Fix: Start the blocks at the example's range: "9,876,000,001 to 9,877,000,000" and the next million. Alternatively, draw the counted IDs from the first block's range.

### 13. [P3] confusion: a cache miss is drawn as an error
- When: 262-267 s, beat `q3-path` (element-262.jpeg, element-265.jpeg)
- What: On the miss, the cache turns red with a red cross on its arrow. During the cross-fade it passes through purple, an accent outside the series' meanings (element-262).
- Why it matters: red means the error or the trap, and a miss is the normal path for the first read of a link. Question 4 then uses the same red for components that really fail.
- Cause: `video/src/videos/be-system-design/DiagramScene.tsx:134` (`tones: [{ tone: "bad" }]`).
- Fix: Mark the miss with the yellow highlight (what the narration points at), or with a grey hollow cache. Keep red for Question 4.

### 14. [P3] confusion: "1,000 users" is compared with "1,000,000,000 redirects a day"
- When: 74-84 s, beat `q1-why` (element-084.jpeg)
- What: The two figures are in different units, and the 12 server boxes under the second are never explained.
- Why it matters: the comparison is meant to show one variable changing, and it changes the unit as well.
- Cause: `video/src/videos/be-system-design/ApproachScene.tsx:213-214`.
- Fix: Use "1,000 redirects a day" against "1,000,000,000 redirects a day" (and say "at a thousand redirects a day"), or drop the server counts.

### 15. [P3] explanation: "time to live" arrives without a gloss
- When: 420-429 s, beat `q5-use`, then `q5-redirect`
- What: "or get a short time to live at the edge" is the first use of the idea, and the redirect's whole trade-off then rests on it.
- Why it matters: the script itself notes the term is new to a beginner and leaves the expansion to Part 2, but this video is the one that leans on it.
- Cause: script beat `q5-use`.
- Fix: "or get a short time to live at the edge: how long the edge may keep its copy."

### 16. [P3] answer: CDN benefits for dynamic traffic are left out
- When: 410.6-428.7 s, beat `q5-use`
- What: "Dynamic, user-specific responses usually bypass it" is the page's line. But the 157 ms floor the video just drew is paid on each handshake round trip, and an edge that terminates the connection near the user saves those even for uncacheable responses.
- Why it matters: a sharper interviewer asks whether a CDN helps an API at all.
- Cause: script beat `q5-use`.
- Fix: Add after "bypass it": "though they still save the handshake round trips, because the connection ends at the edge."

### 17. [P3] spacing: a gap after "35,000" on the closing card
- When: 457-461 s, beat `next` (tile 459)
- What: "35,000" sits about one numeral's width from "redirects a second", because the inline grid reserves the width of the wider "350,000" before the swap.
- Why it matters: the gap looks like a layout error on the closing card.
- Cause: `video/src/videos/be-system-design/NextScene.tsx:146` (`inline-grid` sized to its widest child, left-aligned).
- Fix: Add `justifyItems: "end"` to the grid so the numerals stay right-aligned against the unit. This becomes moot if finding 1 is fixed with a second row.

### 18. [P3] other: the summary design drops the CDN, and headline punctuation is inconsistent
- When: 455-469 s (`next`), and the scene headlines throughout
- What:
  - "A first design" redraws the load balancers, app servers, caches and stores but not the CDN that Question 5 put in front of them.
  - Two scene headlines end in a period ("A percentile, never a mean.", "Don't bury a dependency that's already failing."). Four do not ("What each level costs", "The first diagram", "When to use one", "A first design").
  - Kickers alternate between a topic ("Single points of failure", "Back-of-the-envelope numbers") and the full question ("What is a CDN, and when do you use one?").
- Why it matters: small, but the closing picture omits a decision the video just argued for.
- Cause: `video/src/videos/be-system-design/NextScene.tsx` (`MiniDesign`); `TailScene.tsx` and `BreakerScene.tsx` headlines; `EdgeScene.tsx` kicker.
- Fix:
  - Add a small green "edge" box above the client in `MiniDesign`.
  - Drop the two headline periods.
  - Use the short topic form in every kicker ("Question 5 · CDNs").
