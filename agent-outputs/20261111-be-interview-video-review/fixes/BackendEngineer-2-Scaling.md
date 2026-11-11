# BackendEngineer-2-Scaling: fixes

Folder `video/src/videos/be-scaling/`. Review report:
`agent-outputs/20261111-be-interview-video-review/BackendEngineer-2-Scaling.md`
(1 P1, 10 P2, 8 P3). Nothing committed by me (the coordinator's WIP
checkpoints picked the work up as it went).

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | `ScaleScene.tsx`: `cy` is no longer clamped, so the M/M/1 curve leaves the top of the frame still climbing and the existing clip path cuts it (no flat run at 20x). The yellow 90 to 99% band is gone; on "Headroom" a pale green band (`OK` 14% on paper) fills the flat run, 0 to 70% load, under the unchanged caption "Headroom: run where the wait is still flat". The 50% dot and "1× at 50%" are green (`OK` / `OK_INK`); 90% and 99% stay red. Still at 83.5 s. |
| 2 | P2 | fixed | `ReplicaScene.tsx`: the promoted follower's sub-label reads "takes writes"; the writes arrow into the dead leader fades on "a follower is promoted" and a new writes arrow draws round the dead leader (up at x = 260) into the new leader. Still at 323 s. |
| 3 | P2 | fixed | `ShardScene.tsx`: the hash bars stay green throughout. On "asks all eight" each of the user's 50 links lands as a red dot stacked on the shard that holds it (new `results.json` `shards.userPerShard` = 11, 10, 3, 6, 5, 5, 5, 5, from `check.mjs`), under "one user's 50 links, a dot each: all 8 shards". The partition/shard figure now splits the table into eight pieces on eight servers (numbered 1 to 8, heading "the pieces on 8 separate servers"), and the corner map (`parts.tsx` `MiniMap`) draws eight shards instead of four. Still at 377 s. |
| 4 | P2 answer | fixed | `q4-ours` split at its last sentence (the rest recut free); new beat `q4-backstop`: "Even then, a slow read can race the delete, so the TTL stays as a backstop: it bounds how long a wrong value lives." On screen, grey under the green row: "even so, a slow read can still race the delete"; the backstop line now ends ": it bounds how long a wrong value lives". Still at 259 s. |
| 5 | P2 answer | fixed | New beat `q5-sync`: "Semi-synchronous replication fixes that: each write waits until one follower has it, so promoting that follower loses nothing, but every write is slower." On screen under "promoted: w5 and w6 are lost": "Semi-synchronous" (highlighted), "a write waits for one follower", "promote that one: nothing lost" (green), "the price: every write is slower" (grey). |
| 6 | P2 answer | fixed | New beat `q6-ring`: "Add a ninth shard and modulo moves eighty-nine percent of the keys; a hash ring, as in question two, moves thirteen percent." Both numbers are new `check.mjs` output (`results.json` `reshard`: the same million keys, 8 to 9 shards, 88.9% by modulo, 13.3% on a ring of 100 points a shard, every mover to the new shard, asserted), and `check.mjs` fails if the words stop matching. On screen beside the bars: "add a ninth shard:", "modulo moves 89%" (red), "a hash ring moves 13%" (green). The suggested "about an eighth" was replaced by the measured figure (the ideal is a ninth, 11%; 100 points give 13%). |
| 7 | P2 | fixed | New beat `q2-clock` after `q2-ring` (which keeps its words): "Each key belongs to the next point clockwise, so a new server's points take only the keys just before them." The ring's label is now ink, highlighted, and cued to "the next point clockwise"; under the ring, "a new point takes only the keys just before it". The mechanism is now said, on its own beat, at 2.6 words/s. "Why a hundred points" is not said aloud (budget); the heading "Hash ring, 100 points a server" stays. |
| 8 | P2 answer | fixed | New beat `q1-db` closing the scene: "Vertical still has its place: the database holds the state, so it usually scales up first, until it nears that ceiling." The dimmed vertical column comes back to full on it, its box renamed "database", with "still the first move for a database" in green under it, and the corner map lights the store. Placed after `q1-buy` rather than before `q1-ours`, because `q1-ours` ("These redirect servers already are") answers `q1-horiz`'s "stateless" and cannot be separated from it. |
| 9 | P2 answer | fixed | `q12-why` split at "push usually wins:" (recut free); new beat `q12-pays`: "it pays its writes once, when someone posts, and pull pays its reads on every load." On screen: "push pays once per post, pull on every load". |
| 10 | P2 | fixed | New beat `q9-full`: "Once its queue of ten is full, the rest are refused.", `pauseAfter: 1.4`. The leaky row's nine red cells (and only those) now come in on "the rest are refused" (a `noAt` cue on `Cells`), with a third note, "queue full: the other 9 refused" (9 = trace length minus `leaky.accepted`). The four-row table now holds about 3 s finished before the shared-bucket panel. Still at 549 s. Script header's "(shown on screen, not said)" updated. |
| 11 | P2 | fixed | **Q3:** the app / cache / database boxes come in on "On a read", under the steps (slid 560 px left), and the read path is traced on them as each step is said: app→cache arrow highlighted on "checks the cache", the cache box turns yellow "cache: miss" on "On a miss", app→database then database→cache arrows on "reads the database, writes the value", a return arrow out of the app on "returns it", the database arrow again on the write, and the cache box dashed with "entry invalidated" on "invalidates". On "Simulate" the traces fade and the boxes slide to their old place at the right, where the dead-cache figure plays as before. Stills at 157, 163, 190 s. **Q4:** the TTL chart, its note, its crossing label and its rule now leave on "taken down for abuse" (`takenAt - 12`), not on "A short link barely changes"; the left column still clears there (it sits where the new line goes). The near-empty stretch drops from about 6 s to the 1 to 2 s ramp before the next row. |
| 12 | P3 answer | fixed | New beat `q9-atomic`: "There, the check and the spend must be one atomic step, or two servers both take the last token." On screen under "10 pass": "check and spend in one atomic step, or two servers take the last token". Still at 572 s. |
| 13 | P3 | fixed | `RapidScene.tsx`: eventual and strong stay at the ends; read-your-writes and monotonic reads share one blue point at the middle, labelled "session guarantees", stacked one above the other under it with their notes, so neither reads as stronger. Still at 627 s. |
| 14 | P3 | fixed | `q4-model` split; its first sentence re-voiced as "Take a simple model: a key read about once a second and changed every two minutes." (the rest, now `q4-cross`, recut free). On screen: "A simple model: a key read once a second, changed every two minutes". `check.mjs`'s three numbers moved from `q4-model` to `q4-cross`. |
| 15 | P3 | fixed | Each group of ten requests is drawn as a block of two rows of five against the minute line (`GROUP_COLS`), so the block spans about 14 s of axis instead of 27 and reads as "just before / just after the minute"; the minute line through the rows is kept (it is the fixed window's reset) and extended past the taller blocks. Gauges moved right to 860 to stay beside them. Still at 549 s. |
| 16 | P3 | fixed | `BalancerScene.tsx`: a fifth legend row, a faded swatch with "faded: did not move", cued to "seventy-four percent". Still at 147 s. |
| 17 | P3 | fixed | `FeedScene.tsx`: the limiter is "rate limiter / shared count". Every app box has a short stub into one vertical bracket spanning all six, and the arrows to the cache, queue and shards leave the bracket. Still at 703 s. |
| 18 | P3 | fixed | `RateScene.tsx`: the four connectors drop into the bucket at x = 1236, 1336, 1440, 1544, so no horizontal run reaches another connector's corner. Still at 572 s. |
| 19 | P3 | fixed | `HookScene.tsx`: the question-mark badges are yellow (`ds("yellow", 500)`) with an ink "?". |

No finding was judged wrong. The page (`system-design.mdx`) agrees with each
answer fix; the semi-synchronous remedy, the delete-after-commit race and the
atomic shared counter are standard follow-ups the page's answers imply rather
than state.

## Facts

`check.mjs` re-run from the repo root. New values: `shards.userPerShard`
(the seeded user's 50 links per shard, same draw as `userShards`) and a new
`reshard` block (8 to 9 shards over the same million keys: `shareMod`
0.888881, `shareRing` 0.13346, ring movers all to the new shard, asserted).
New `said` checks: `q6-ring` ("Add a ninth shard", "eighty-nine percent",
"thirteen percent") and `q9-full` ("queue of ten"). **Every existing value in
`results.json` came back identical**; the only other difference is the
`said` list, which gained entries and moved three `q4-model` checks to
`q4-cross`.

## Voice

**931 characters re-voiced** (the `narrate --dry-run` count), each beat on
its own, no new take, no `--force`:

- **P2s, 753:** `q1-db` 119, `q2-clock` 107, `q4-backstop` 115,
  `q5-sync` 153, `q6-ring` 124, `q9-full` 52, `q12-pays` 83 (all new).
- **P3s, 178:** `q4-model` 82 (re-voiced), `q9-atomic` 96 (new).

Free, recut from the kept takes (`--recut`): `q4-ours` (its last sentence
split off), `q4-cross` (split from `q4-model`), `q12-why` (split at the
colon). Against the pre-fix commit `ca54feec`, `alignment.json`'s `meta`
and every other beat's entry are identical (per-beat comparison), every
other MP3 is unchanged, and `takes/be-scaling/` is untouched.

## Length and checks

CHECKS_PLACEHOLDER

## Noticed

- The Q3 diagram during the cache-aside beat is the existing dead-cache
  figure moved, not a new one, so the read path and the failure case are
  now visibly the same three boxes.
- Nothing shared needed changing; `MiniMap` is this folder's own
  `parts.tsx`.
