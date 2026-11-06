# DataEngineer-8-Streaming: fixes

Folder `video/src/videos/de-streaming/`. Report:
`agent-outputs/20261105-de-interview-video-review/DataEngineer-8-Streaming.md` (2 P1, 9 P2,
10 P3). Compare against `4bff3bc`, the last commit before this pass.

All 21 findings fixed. Two differ from the suggested fix, both on the evidence:
the second consumer clears the lag in **20 s, not 18** (finding 1), and the event-time
figure's moving markers keep their full height and stop at the labels instead of being
shortened (finding 3).

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed, number changed | The figure is now a topic of two partitions ("the log: a topic of 2 partitions · partition 0", "partition 1"), both read by one consumer that "can't keep up". At "A second consumer" a green "consumer 2" box pops in; at "one of the two partitions" partition 1's arrow moves to it, "can't keep up" folds away, and both lanes' read ends catch up to their latest offsets. "on one partition, it would sit idle" under consumer 2. The chart is titled "lag in messages, both partitions", its label "a second consumer takes partition 1", and it ends "cleared in 20 s". `bp-fix` re-voiced: "A second consumer takes over one of the two partitions, and the lag clears in twenty seconds. With one partition, it would sit idle." **Why 20, not 18:** `check.mjs` now also runs the same seeded arrivals on two partitions (each message to one by a seeded fair coin, `default_rng(13)`, so the existing draws are untouched). Before second 60 one consumer drains both at 80 a second, never idle while either has a message, and the sum equals the old single queue second for second (asserted). At the minute the partitions hold 547 and 596; from then each has its own 80 a second, and the busier one takes 20 s. The pooled queue at 160 a second said 18 because it lets spare capacity on the emptier partition drain the other, which two consumers on two partitions cannot do. New values: `backpressure.partitions` 2, `atJoinByPartition` [547, 596], `lagTwoPartitions` (the line drawn), `drainedAtByPartition` 80, `drainSecondsByPartition` 20. |
| 2 | P1 | fixed | The struck note is now the wrong alternative, "from offset 0" (soft ink, red strike, on "not from the start"). |
| 3 | P2 | fixed, differently | The dashed window dividers stop 30px short of the axis on the tick side, both bands, so they no longer cross any tick label. The "now" line and the watermark bars keep their full height (a playhead across its band reads better than a stub at the axis with its triangle 90px away), but they are now drawn under the labels, and every tick label sits on an 8px paper halo and every window count on a tile of its band's own fill. A marker passing behind a label stops at it: checked at now 10.1 s (through "10 s"), 13.5 s and 17.2 s, and with the delay-3 watermark at 10 s and 12 s. |
| 4 | P2 | fixed | "↑ consumer 1 resumes here" sits under partition 1, its arrow on offset 3 (the first uncommitted), clear of both commit bars and of the reassignment arrow. The lanes moved apart (rows 325/440/555 from 340/440/540) so the gap under partition 1 is about 52px; group A's box grew to y 730 to keep consumer 4 inside it. |
| 5 | P2 | fixed | A tumbling box with no width returns nothing, as the hopping boxes already did. Still at 440 s: an empty page under the question card. |
| 6 | P2 | fixed | `group-def` split; its second sentence re-voiced as `group-split`: "Each partition goes to exactly one of them, so they split the work, instead of each reading everything." Screen: "each partition goes to exactly one consumer in the group: the work is split, not copied". |
| 7 | P2 | fixed | At "then four" the producer reads `hash(key) mod 4` (the 4 in red). At "a user's new clicks" one new ava click flies into partition 3 at offset 0 (red ring), her offsets 3 and 4 in partition 1 ring yellow, and a note under partition 3 says "ava's new click: partition 3, read before her old ones in partition 1" (both partitions from `PARTITIONS`). The waffle's key is beside it, not under it (the red line already holds that row): "1 square: 100 keys / red: moved / blue: stayed", 100 from `MOVED.keys`. |
| 8 | P2 | fixed | `wm-three` split at "with four clicks" (0.8 s pause), a new beat `wm-ben` (re-voiced, 0.8 s pause): "That's when ben's click from second thirteen arrives: thirteen minus three is ten, the window's end.", then `wm-dee` (cut free). The sweep now reaches 13.5 s on "with four clicks" (about 4.3 s for 13.5 s of processing time, was 2.5 s), holds through `wm-ben`, and goes on to dee's arrival on "Then dee's click arrives". ben's two dots ring yellow, and the rule's row gains "ben's click from 13 s: 13 − 3 = 10, the window's end" (values from `STREAM` and the trace). The closing note now appears with the sweep, not ahead of it. |
| 9 | P2 answer | fixed | New beat `idem-persist`: "Keep those ids in the sink, in the same transaction as the row, so they survive a crash." The box is now "processed ids, a table in the sink" over "5, 6, 7", and under the skips: "written in **one transaction with the row**, / so the ids survive a crash". |
| 10 | P2 answer | fixed | New beat `eos-join`: "A database joins by storing the consumed offsets with its output, in one transaction. An email or an API call can't, so it needs an idempotency key. And consumers downstream must read only committed messages." Each outside box gains a green second line on its words: "an idempotency key" (email, API call), "joins: offsets + output, one transaction" (database); inside the Kafka box, "consumers downstream: read committed messages only". |
| 11 | P2 | fixed | "It runs alongside time-based retention." dropped from `r-compact` (cut free) and replaced by a new beat `r-compact-age`: "Compaction alone has no age limit; a topic can add one, but a state snapshot usually doesn't." Screen: "compact: no age limit · compact + delete: both · a state snapshot: compact only". **The page is wrong here** ("It complements normal time-based retention rather than replacing it"): `cleanup.policy` is per topic, and `compact` alone keeps the latest value per key with no age limit. Not edited. |
| 12 | P3 answer | fixed | New beat `bp-retain` between the two halves of `bp-def` (both cut free): "As long as the lag stays inside the retention period." Screen: "and nothing is dropped, within retention". |
| 13 | P3 | fixed | The push-back loop and its label are soft ink; "never silently dropped" is green; the three firing flags are blue (results, so data). |
| 14 | P3 | fixed | The five grey cells are dealt into the three lanes at the split (two, two, one), numbered from 0 on "counting up from zero", and clear as the first click leaves the producer. |
| 15 | P3 | fixed, on screen | Under partition 2 at "never across them": "in order of arrival: dee's click from 8 s sits after ben's from 13 s". In Q8, dee's note adds "· the click that sat after ben's from 13 s in partition 2". Both derived from the stream. No narration clause (budget). |
| 16 | P3 | fixed, two by voice | `sem-retain` (split from `sem-least`, re-voiced): "…a message deleted by retention before anyone read it", screen "can't save a message retention deleted before it was read". `late-side` (split from `late-fix`, re-voiced): "…a side output, a separate stream, not into silence", screen ", a separate stream". Rebalances are glossed on screen only, "+ longer rebalances (partitions reassigned)": Q3 draws one 40 s later, and re-voicing `parts-cap` would have taken the P3 voice past 400. |
| 17 | P3 | fixed | "stream to stream" above the clicks/purchases timelines, "stream to table" above "click · ava", each on its words. |
| 18 | P3 | fixed | The poison message moves into the consumer (behind it), then drops to the dead-letter queue, with a red arrow from the consumer's bottom edge to the queue. |
| 19 | P3 | fixed | A blue arrow from the idempotent producer to the input topic; "via an idempotent producer too" under "output messages". |
| 20 | P3 answer | fixed | `win-slide` split; its first sentence re-voiced: "Hopping windows, which Flink calls sliding, are fixed but overlap." (`win-hop` cut free). Screen: "hopping" over ""sliding" in Flink". |
| 21 | P3 | fixed | `group-def` split after "read one topic together", with a 0.6 s pause (and finding 6's shorter second half). |

## Voice

**1,015 characters re-voiced**, ten beats each on its own: 724 for P1 and P2
(`eos-join` 208, `bp-fix` 132, `group-split` 103, `wm-ben` 100, `r-compact-age` 93,
`idem-persist` 88) and 291 for P3 (`sem-retain` 98, `late-side` 74, `win-slide` 66,
`bp-retain` 53). Cut free from the kept takes (`--recut`): `group-def`, `sem-least`,
`wm-three`, `wm-dee`, `late-fix`, `late-upsert`, `win-hop`, `bp-def`, `bp-push`,
`bp-rising`, `r-compact`. The other 43 beats' alignment entries and audio are
byte-identical to `4bff3bc`.

## Length and checks

- 620.1 s (10:20), 64 beats; was 567.5 s, 53 beats.
- Typecheck and lint clean for the folder; `check:cues` clean; `npm test` 75/75.
- `check:frames` passes (26 arrows within 10°, no hyphen in tabular figures).
- `check:motion` passes: one still of 2.0 s (3:44.8, the idempotency scene), nothing
  for 3 s.
- `check:sync` passes: 64 beats, worst +0.03 s.
- `check:mix` passes: effects 30.5 LU under the narration, speech a median 29.9 dB above
  them where both sound.
- Stills at every changed moment in all nine scenes, each looked at; three collisions they
  showed were fixed and re-checked (the lag formula against "consumer lag", the Q6 crash
  note against the overwrite note, the Q7 producer note across the transaction's border).

## Facts

`check.mjs` ran from the repository root as its header says. Every existing value in
`results.json` came back identical; the five new `backpressure` values are listed under
finding 1. Every new number on screen comes from `results.json` or from the stream in it
(`STREAM`, `PARTITIONS`, `MOVED`, `WATERMARK`).

## Noticed

Nothing new outside the findings. No shared change needed.
