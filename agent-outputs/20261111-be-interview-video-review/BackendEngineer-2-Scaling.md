# BackendEngineer-2-Scaling (10:43)

## Verdict
- A strong, coherent video. The corner minimap that lights the box each question is about makes the twelve answers read as one design growing, and most of the figures earn their place: the modulo grid against the hash ring, the cache hit-rate bars with their x2.4 and x4.3 loss multipliers, the TTL crossing chart, and the four rate limiters on one trace. Every number I checked matches `results.json` and the page.
- The worst defect is the Question 1 headroom chart. The curve is clamped into a flat line at 20x, so it looks like it levels off where the label says "off the top". The yellow "Headroom" band sits on the steep 90 to 99% stretch, but its caption says "run where the wait is still flat". The safe 50% reading is also drawn in the trap red.
- Two more figures contradict their own narration. In Q5 the promoted "new leader" is still labelled "read-only" and writes still flow into the dead leader. In Q6 the even hash distribution, the right answer, is repainted red to stand for one user's 50 links. Its bars are counts of a million keys, and the shard diagram above it shows four servers while the narration says eight.
- Pacing is comfortable: 2.3 to 2.9 words a second nearly everywhere, at least 0.6 s between beats, and every scene held 1.6 s before its cut. The exceptions are the hash-ring beat (3.08 w/s, and the ring's rule is never said aloud), the leaky bucket's refusals (on screen for about 2 s and never narrated), and two stretches where the lower page sits empty (Q3, and early Q4).
- As interview answers they hold up and are faithful to the page. Several still stop one step short of the follow-up an interviewer asks:
  - Q4: delete-after-commit can still race.
  - Q5: how to avoid losing writes on failover.
  - Q6: what adding a ninth shard costs.
  - Q1: when vertical is the right call.
  - Q12: "push works once per post" sits right under "one write per follower".

## Findings

### 1. [P1] confusion: the headroom chart flattens at 20x, shades the steep part as "Headroom", and paints the safe point red
- When: 58.6-76.9 s, beats `q1-headroom`, `q1-buy` (frames element-068.jpeg, element-075.jpeg)
- What: the M/M/1 curve rises to 20x at about 95% load, then runs as a horizontal line along the top of the chart to 99%, right beside the red "99x at 99%, off the top" arrow. It reads as a curve that levels off. On "Headroom" a yellow band fills 90% to 99% (the steep part, 9x to 99x), and under it the caption reads "Headroom: run where the wait is still flat". That flat region is the unshaded 0 to 70% on the left. The "1x at 50%" dot and its label are red, the series' trap color, though 50% is the healthy operating point the narration recommends.
- Why it matters: the chart's one job is to show where to run, and it highlights the opposite region under a label that names the flat one.
- Cause: `video/src/videos/be-scaling/ScaleScene.tsx:89` (`cy` clamps `Math.min(wait, C.max)`, so the path is drawn flat at 20 instead of being cut by the clip path at line 259); `:264` (the band is `cx(0.9)` to `cx(0.99)`); `:292-293` (every reading, 50% included, uses `ACCENT`/`ACCENT_INK`); `:311` (caption).
- Fix: drop the clamp from the path (use an unclamped `cy` for `path` and let the existing clipPath cut it at the frame), or end the path at wait = 20. Then either shade the flat run (0 to about 70%) green under "Headroom: run where the wait is still flat", or keep the 90 to 99% band but relabel it "the last tenth: 9x to 99x" and point "Headroom" at the gap between 50% and 90%. Draw the 50% dot and label in `INK`/blue, and keep red for 90% and 99% only.

### 2. [P2] confusion: the promoted follower is still "read-only", and writes still flow into the dead leader
- When: 262-287.5 s, from `q5` "a follower is promoted" through `q5-fix` (frames element-275.jpeg, element-286.jpeg)
- What: on "a follower is promoted" the top follower turns green and is renamed "new leader", but its sub-label stays "read-only". The blue "writes" arrow still points into the red "leader x" box, and the "reads" arrow still points at the new leader as if nothing changed. The figure stays on screen, dimmed, for the rest of the scene.
- Why it matters: the point of promotion is that the follower starts taking writes, and the figure says it doesn't.
- Cause: `video/src/videos/be-scaling/ReplicaScene.tsx:125` (`sub="read-only"` for every follower, promoted or not); `:91` (the writes `Flow` always ends at `LEADER.x`).
- Fix: `sub={i === 0 && promoted > 0.5 ? "takes writes" : "read-only"}`. On `promotedAt`, fade out the writes arrow into the dead leader and draw a second writes `Flow` into the new leader (e.g. `[[X0, lMid], [FOLLOW.x - 60, lMid], [FOLLOW.x - 60, fMid[0]], [FOLLOW.x - 8, fMid[0]]]`).

### 3. [P2] confusion: the even hash spread is repainted red to stand for one user's links, and four servers stand in for eight shards
- When: 319.4-332.2 s, beat `q6-cost` (frames element-331.jpeg)
- What: the eight green bars (about 125,000 keys each, "within 1% of an eighth") all turn red on "listing one user's links asks all eight". The bar heights are still counts of a million keys, and they now carry the trap color for a 50-link query. The good result reads as a failure, and nothing on screen shows the 50 links. The sharding diagram above, and the minimap, draw four servers, while the narration and the chart say eight shards.
- Why it matters: one chart now carries two meanings in two colors, and the count on screen disagrees with the count said.
- Cause: `video/src/videos/be-scaling/ShardScene.tsx:190` (`allLit` mixes every bar to `ACCENT`); `:95` and `:128` (`[0, 1, 2, 3]` servers).
- Fix: leave the bars green. On "asks all eight", draw a small red dot (or a count of the user's links per shard, from `results.json` userShards) on top of each bar, with the existing red caption. Draw eight server boxes (or label the four "8 shards on 4 servers").

### 4. [P2] answer: delete-after-commit is presented as race-free
- When: 217.8-235.0 s, beat `q4-ours` (frame element-246.jpeg)
- What: the narration and the green row present "mark it taken down -> commit -> delete the cached entry" as the right order, and the red row as the race. A read that missed before the commit can still write the old value back after the delete. That is the standard follow-up to "why is invalidation hard", and it is the real reason the TTL backstop matters. The script header knows this ("the TTL as a backstop bounds any race either way"), but the narration only says "The TTL stays as a backstop".
- Why it matters: a candidate who says "delete after commit, problem solved" invites exactly that follow-up and has no answer.
- Cause: `video/src/videos/be-scaling/script.ts:378` (`q4-ours` text).
- Fix: change the last sentence to "Even then, a slow read can race the delete, so the TTL stays as a backstop: it bounds how long a wrong value can live." Add "a slow read can still race it" in grey under the green row (`InvalidateScene.tsx` near line 196).

### 5. [P2] answer: replication stops at "loses the writes" with no remedy
- When: 275.2-287.5 s, beat `q5-fix` (frame element-286.jpeg)
- What: "with asynchronous replication, promoting a lagging follower loses the writes it never received", and the scene ends on red "w5 and w6 are lost". The follow-up ("so how do you avoid that?") gets no answer: synchronous or semi-synchronous replication to at least one follower, or a quorum, at the cost of write latency. That trade-off also sets up the video's own PACELC beat two questions later.
- Why it matters: the question asks "what does it buy you", and an interviewer will press on what it costs to make failover lossless.
- Cause: `video/src/videos/be-scaling/script.ts:401`.
- Fix: append "Wait for one follower to confirm each write, semi-synchronous, and failover loses nothing, at the cost of slower writes." Add a green row under "promoted: w5 and w6 are lost" (`ReplicaScene.tsx:226`): "semi-sync: one follower always has them".

### 6. [P2] answer: sharding by hash never connects back to consistent hashing
- When: 304.6-332.2 s, beats `q6-key`, `q6-cost`
- What: "Shard by a hash of the short key" spreads a million keys evenly, but the video never asks the standard follow-up: what happens at the ninth shard? With hash modulo 8, most keys move (Q2 just measured 74% for 3 to 4). Q2's hash ring is the answer, and the video doesn't say so.
- Why it matters: resharding is the follow-up interviewers ask most often on this question, and the video already has the evidence to answer it.
- Cause: `video/src/videos/be-scaling/script.ts:414` (`q6-key`).
- Fix: add after "an eighth each": "Place the shards on a hash ring, as in question two, so adding a ninth moves only about an eighth of the keys." Optionally add a one-line note under the hash chart.

### 7. [P2] explanation: the hash ring is named but its rule is never said, in a 3.08 w/s beat
- When: 124.5-131.3 s, beat `q2-ring` (frame element-131.jpeg)
- What: "On a hash ring, with a hundred points a server, only twenty-three percent move" introduces both the ring and virtual nodes in 6.8 s at 3.08 w/s. How a key finds its server is only in grey 20px text inside the ring, "a key goes to the next point clockwise", and the narration never says it. Why a hundred points a server (to even out the arcs) is never said either.
- Why it matters: "how does consistent hashing work" is the obvious follow-up to Q2, and the video shows the result without the mechanism.
- Cause: `video/src/videos/be-scaling/script.ts:337`; the label at `BalancerScene.tsx:345-349`.
- Fix: split the beat: "On a hash ring, each server owns a hundred points, and a key goes to the next point clockwise." (pause 0.6) "Add a fourth server, and only twenty-three percent of keys move, all of them to the new server." Cue the ring label to "next point clockwise".

### 8. [P2] answer: "which do you reach for?" never says when vertical is right
- When: 27.1-76.9 s, scene `q1` (frame element-075.jpeg)
- What: vertical is struck down on "ceiling" and "one machine", and the answer goes straight to horizontal. The interview answer is a decision: scale the stateless tier out, but scaling up is often the right first move, especially for the stateful database, until it hits the ceiling (which is what Q5 and Q6 then address). The video's own design keeps one store until Q6.
- Why it matters: "always horizontal" is the answer interviewers push back on, and the series is meant to argue trade-offs.
- Cause: `video/src/videos/be-scaling/script.ts:299` (`q1-ours`).
- Fix: before "These redirect servers already are", add "Vertical is still the first move for the database, which holds state, until it hits that ceiling." Undim the vertical column for that sentence.

### 9. [P2] answer: "push works once per post" contradicts "one write per follower" on the same screen
- When: 608.0-616.2 s, beat `q12-why` (frame element-615.jpeg)
- What: "push usually wins: it does the work once per post, not on every load", shown in green under "cost per post: one write per follower" and "200 followers: 200 writes". The argument the viewer needs is the ratio: push pays 200 writes once when someone posts, while pull pays 300 reads every time anyone loads, and loads vastly outnumber posts.
- Why it matters: a viewer repeating "push is once per post" to an interviewer has just contradicted the write-storm point.
- Cause: `video/src/videos/be-scaling/script.ts:529`; `FeedScene.tsx:238`.
- Fix: narrate "so push usually wins: it pays its writes once, when someone posts, and pull pays its reads on every load." On screen: "push pays once per post, pull on every load".

### 10. [P2] pacing: the leaky bucket's refusals and their reason are on screen for about 2 s and never said
- When: 497.2-499.3 s, end of `q9-leaky` (frame element-498.jpeg)
- What: on "a burst waits its turn" nine red cells appear in the leaky row, with the note "11 queued: one had drained by 61 s" (8 words). The whole four-row figure exits at `followAt - 2`, about 2 s later. The narration never says the leaky bucket refuses anything, or that its queue is full, so the red cells contradict "a burst waits its turn".
- Why it matters: the row's verdict is unreadable in the time given and unexplained by the voice.
- Cause: `video/src/videos/be-scaling/RateScene.tsx:118` (`rowsOut = followAt - 2`), `:210` and `:254` (both cued to `waitsAt`); `script.ts:483`.
- Fix: end `q9-leaky` with "and once its queue of ten is full, the rest are refused", cue the red cells and note to "the rest are refused", and give the beat `pauseAfter: 1.4` so the finished table holds about 3 s before the shared-bucket panel replaces it.

### 11. [P2] spacing: the page sits half or nearly empty while the cache-aside and invalidation mechanisms are explained
- When: 133-157 s, beats `q3`, `q3-props` (frame element-156.jpeg); 217.8-224 s, start of `q4-ours` (frame element-222.jpeg)
- What: Q3 explains cache-aside as two lines of text with arrows in the top third of the page, and the bottom half is blank for 24 s. There is no app, cache and database figure until the loss diagram at 172 s. In Q4 the chart and the two-copies panel clear on "A short link barely changes", and for about 6 s the page holds one line, "A short link barely changes: a long TTL,", under the heading.
- Why it matters: cache-aside is a flow between three boxes, and the one figure that draws those boxes (the app / cache / database diagram at 172 s) is used only for the failure case.
- Cause: `video/src/videos/be-scaling/CacheScene.tsx:83-110` (read and write paths as text rows); `InvalidateScene.tsx:65` (`phaseOut = barelyAt - 6` clears everything before the next content exists).
- Fix: Q3: bring the app / cache / database diagram (`D`, line 56) in on "On a read", and trace the read path on it (check, miss, read DB, write cache) as each step is said. Q4: move `phaseOut` to `takenAt - 6`, so the chart stays until "taken down for abuse" brings in the next row.

### 12. [P3] answer: "a store they all share" stops before the follow-up on atomicity and latency
- When: 499.3-513.7 s, beat `q9-shared` (frame element-512.jpeg)
- What: the shared bucket is the right answer. The next question is how: a read-then-write from four servers races, so the check and decrement must be atomic (an atomic increment or a script in the shared store), and every request now pays a network hop to that store.
- Why it matters: it is the natural follow-up to the follow-up, and the page's "where the count lives" framing invites it.
- Cause: `video/src/videos/be-scaling/script.ts:488`.
- Fix: append "and the check and the decrement must be one atomic operation there, or two servers both spend the last token."

### 13. [P3] accuracy: the consistency scale puts monotonic reads above read-your-writes
- When: 544-568.5 s, beat `r-consist` (frame element-567.jpeg)
- What: eventual, read-your-writes, monotonic reads and strong are evenly spaced on one line. That implies monotonic reads is the stronger of the two middle models, but they are independent session guarantees and neither implies the other.
- Why it matters: a viewer could repeat the ordering.
- Cause: `video/src/videos/be-scaling/RapidScene.tsx:119-120` (x at 0.36 and 0.68 of the scale).
- Fix: stack the two middle models one above the other at the same x (about 0.5), with a small "session guarantees" label.

### 14. [P3] other: "the page" is cited, but a standalone viewer has no page
- When: 202.5-217 s, beat `q4-model` (frame element-216.jpeg)
- What: "The page models a key read about once a second" and, on screen, "The page's model: ...". Nothing in the video says which page.
- Cause: `video/src/videos/be-scaling/script.ts:373`; `InvalidateScene.tsx:143`.
- Fix: "A simple model: a key read about once a second and changed every two minutes." On screen: "A simple model: ...".

### 15. [P3] confusion: request cells drawn along the time axis read as spread over 33 to 59 s
- When: 451-499 s, beats `q9-fixed` to `q9-leaky` (frame element-498.jpeg)
- What: the ten requests that all arrive at 59 s are drawn as a row of ten cells running left from the 60 s line, directly under an axis marked 0, 20, 40, 60 s. They cover the stretch the axis labels as 33 to 59 s.
- Cause: `video/src/videos/be-scaling/RateScene.tsx:25` (`Cells` lays each cell out horizontally from the minute line).
- Fix: drop the vertical dashed minute line through the rows and put a small "59 s" / "61 s" tag over each group of ten. Or stack each group of ten as two rows of five hugging the line, as the arrivals above the axis already do.

### 16. [P3] confusion: the modulo grid's "moved" encoding is unlabelled
- When: 113-132.9 s, beats `q2-mod`, `q2-ring` (frame element-131.jpeg)
- What: keys that stay are faded and moved keys stay saturated, but the legend lists only the four server colors. Under modulo, 74% of the squares stay saturated, so the grid looks unchanged, and "74% moved" is not legible from the picture.
- Cause: `video/src/videos/be-scaling/BalancerScene.tsx:57` (kept keys at `1 - 0.8 * dim` opacity); the legend has no entry for it.
- Fix: add a legend row "faded: stayed on its server", cued to `sevAt`.

### 17. [P3] confusion: the closing diagram's rate limiter contradicts Q9, and three of six app servers connect to nothing
- When: 631.1-643.2 s, beats `next`, `next-api` (frame element-641.jpeg)
- What: Q9 concluded that the count belongs in a store the app servers share. The grown design instead draws a single "rate limiter" gate in front of the load balancer. Only the first, third and sixth app boxes have arrows to the cache, queue and shards, and the narration says "every box in it talks to the others".
- Cause: `video/src/videos/be-scaling/FeedScene.tsx:272` (limiter node), and the three single `Flow`s from individual app rows.
- Fix: label the gate "rate limiter (shared count)". Draw the three outgoing arrows from a bracket that spans all six app boxes, not from one row each.

### 18. [P3] confusion: elbow connectors in the shared-bucket panel meet at one point
- When: 507-513.7 s, beat `q9-shared` (frame element-512.jpeg)
- What: server 1's horizontal run passes through the point where server 2's connector turns, and the same happens with servers 3 and 4. Server 2 appears to branch into two arrows.
- Cause: `video/src/videos/be-scaling/RateScene.tsx`, the shared-bucket `Flow` points (horizontal runs at one y for every server).
- Fix: give each connector its own horizontal y (stagger by 14 px), or run them straight down into the bucket's top edge at four x positions.

### 19. [P3] confusion: red question marks on every box in the hook
- When: 16-27 s, beats `hook-10x`, `plan` (frame element-026.jpeg)
- What: every box gets a red badge on "every box has to answer for it". Red means the trap or the error in this series, but these mark open questions, not faults. The "?" glyph is also faint white on pale pink.
- Cause: `video/src/videos/be-scaling/HookScene.tsx:37` (`background: ACCENT`).
- Fix: draw the badges in the yellow pointer color with an ink "?".
