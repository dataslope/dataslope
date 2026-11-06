# DataEngineer-8-Streaming (9:27, 567.5 s)

## Verdict
- A strong, coherent video. Twelve deep dives run on one stream of twelve clicks the viewer already knows, so Q1 to Q12 build on each other. Every number on screen matches `results.json` and the narration: 74%, 54/96, 1,096/1,000, 4/5/3, 13.5 s, 12, 7.8 s, 1,143, 18 s, 4 of 8. No text is under 19px.
- Two P1s. Q12's fix (a second consumer clears the lag in 18 s) is drawn on a single partition, which contradicts Q3's rule that parallelism stops at the partition count. Q4 strikes through a true statement ("not from offset 0").
- Visual defects cluster in the time scene: window dividers, the "now" marker and the watermark bars run through tick and count labels. Two more: three stray blue bars open the windows scene, and the "resumes here" label is crowded by the arrow in Q4.
- Pacing is comfortable (mostly 2.0 to 2.7 w/s, 0.6 s gaps) except the watermark run. There, 13.5 s of processing time sweeps past in about 2.5 s while wm-three (2.84 w/s) reads five numbers.
- The answers mostly hold up in an interview. Several stop one step before the obvious follow-up: where the "seen" ids live, how an outside database "joins" the transaction, compaction against retention, and lag that outgrows retention. Q3's "never read twice" is contradicted by Q4 a few seconds later.

## Findings

### 1. [P1] accuracy: Q12's second consumer drains a single partition, contradicting Q3
- When: 479.2-488.8 s, beat `bp-fix` (frames element-480.jpeg, element-489.jpeg)
- What: the figure is one producer, one lane labelled "the log: a partition" and one consumer. The narration says "A second consumer, on a partition of its own, clears it in eighteen seconds", and the chart labels the jump "a second consumer: 160 a second". In Kafka a second consumer in the same group gets nothing from a one-partition topic, which is exactly what Q3 showed ("Add a fourth, and it sits idle"). Adding a new partition does not move the 1,143 messages already queued in the old one, so they still drain through one consumer at 80 a second against about 50 a second of new traffic, which takes roughly 38 s, not 18 s. The model in `check.mjs` simply doubles capacity to 160.
- Why it matters: a viewer will answer "just add a consumer" in an interview, and the video's own Q3 says that is wrong for this topic.
- Cause: `video/src/videos/de-streaming/PressureScene.tsx:112` (one lane, "the log: a partition"), `:210-218` ("a second consumer: 160 a second", "cleared in 18 s"); `video/src/videos/de-streaming/check.mjs:176` (`cap = 80 if t < JOIN else 160`, one pooled queue); `script.ts:336` (`bp-fix`).
- Fix: draw two lanes from the start, labelled "the topic: 2 partitions, both read by one consumer", and have the second consumer take partition 1 in a rebalance at `secondAt`. Narrate: "The topic has two partitions, both on one consumer. A second consumer takes one of them in a rebalance, and the lag clears in eighteen seconds. With one partition it would sit idle, so rising lag means more partitions and consumers, or faster processing." Keep the model as it is: it is now the right model.

### 2. [P1] confusion: a true statement struck through in Q4
- When: 155-161.3 s, beats `commit-def`, `commit-when` (frames element-155.jpeg, element-160.jpeg)
- What: left of partition 1, the note "not from offset 0" gets a red strike as Drew says "not from the start". Striking a correct statement reads as "wrong", so the screen says the opposite of the narration: that the consumer resumes from offset 0. The DS series flagged the same pattern.
- Why it matters: the resume point is the whole point of committing, and the screen negates it.
- Cause: `video/src/videos/de-streaming/GroupScene.tsx:274-278` (`<Strike at={startAt + 4}>not from offset 0</Strike>`).
- Fix: strike the wrong alternative instead: `<Strike>from offset 0</Strike>` beside a ✓ "from the commit". Or drop the strike and keep "not from offset 0" in INK_SOFT.

### 3. [P2] spacing: lines through labels in the event-time figure
- When: 310-400 s, beats `time-count` to `late-trig` (frames element-350.jpeg, element-359.jpeg, element-365.jpeg, element-399.jpeg)
- What:
  - The dashed window dividers at 0, 10, 20 and 30 s cut through every tick label on both axes ("0¦s", "1¦0 s") for the whole 90 s scene.
  - During the sweep, the black "now" line runs through the red "5 clicks" count (element-350, now 14.9 s), and at 20.0 s it runs through the "20 s" tick (element-359).
  - The delay-3 watermark bar runs through "10 s" at 13.5 to 16 s and through "4 cl|cks" at 15 s (element-359).
- Why it matters: the brief lists lines through labels as a recurring defect, and here it hits the counts the narration is reading.
- Cause:
  - `video/src/videos/de-streaming/TimeScene.tsx:184`: the divider spans the whole band, and the tick labels sit inside it at `a.y - 12` and `a.y + 28` (`:187`).
  - `:298`: the now line runs from `prY - 14` to `prY + h(BAND)`, crossing the count row at `prY + h(BAND) - h(46)`.
  - `:301` and `:304-313`: the watermark bars run from `evY - h(BAND) - 6`, crossing the event counts at `evY - h(BAND) + h(8)`.
- Fix: stop each divider 30px short of the axis on the tick side (top band `y2 = a.y - 30`, bottom band `y1 = a.y + 36`). Draw the now line only from `prY - 14` to `prY + 14`, with its triangle and "now" label below the band (`prY + h(BAND) + 14`). Draw the watermark bars from `evY - 14` to `evY + 14`, with their labels above the band as now. Alternatively, give the count and tick labels a PAPER halo (`paintOrder: stroke`, 6px).

### 4. [P2] spacing: "consumer 1 resumes here" squeezed between lanes and touched by the arrow
- When: 150-161.3 s, beats `commit-def`, `commit-when` (frames element-153.jpeg, element-160.jpeg)
- What: the green label sits in the 35px gap between partition 0's lane bottom (about y 427) and partition 1's top (about 463), on the row of the "partition 1" name. The reassignment arrow from partition 1 to consumer 1 passes through its "↓" (about x 1268, y 445).
- Why it matters: the label carries the answer to Q4 and is the most crowded thing on the page.
- Cause: `video/src/videos/de-streaming/GroupScene.tsx:271-273` (`y={laneTop(1) - h(34)}`, `x={cellX(COMMITTED[1] + 1) - 4}`); the arrow is `:191` (`A(1, 0, ownerAt)`).
- Fix: move the label under partition 1's lane, between the lanes of 1 and 2 (`y = laneTop(1) + laneH + h(4)`), with "↑ consumer 1 resumes here". Or put it left of the lanes at `x = X0, y = mid(1) + h(24)`, under "not from offset 0", where the space is empty.

### 5. [P2] confusion: three stray blue bars open the windows scene
- When: 400.8-415 s, beats `windows`, `win-def`, start of `win-tumble` (frames element-402.jpeg, element-410.jpeg)
- What: before the question card is typed, three 5px blue vertical bars float in the middle of an empty page. They stay under the axis for about 14 s until "Ten seconds each" grows the tumbling boxes out of them.
- Why it matters: for the first seconds of Q11 they are the only figure on screen, and they mean nothing.
- Cause: `video/src/videos/de-streaming/WindowsScene.tsx:131-155`. Each tumbling box is rendered at `width: (ex(10) - ex(0) - 6) * p` with a 2.5px border even when `p = 0`, so its two borders draw a bar.
- Fix: `if (p <= 0) return null;` at the top of the map (or `opacity: Math.min(1, p * 3)`), as the sliding boxes already do at `:197`.

### 6. [P2] accuracy: "nothing is read twice" in Q3, then "Read again?" in Q4
- When: 114-139.5 s, beat `group-def`, against 156.4-161.3 s, beat `commit-when` (frames element-117.jpeg, element-160.jpeg)
- What: Q3 narrates "the work is split and nothing is read twice" and keeps "each partition goes to exactly one consumer in the group: split, never read twice" on screen for 25 s. Twenty seconds later Q4 shows offsets 3 and 4 "processed, never committed. Read again?", and Q5 is built on that replay. The page says only "split without duplication" across consumers.
- Why it matters: an interviewer will ask whether a consumer group prevents duplicates, and it does not.
- Cause: `script.ts:141` (`group-def`); `video/src/videos/de-streaming/GroupScene.tsx:235`.
- Fix: narration "...so the work is split, and no two consumers in the group share a partition." Screen: "each partition goes to exactly one consumer in the group: split, not shared".

### 7. [P2] explanation: Q2's ordering consequence is asserted, not shown
- When: 84.5-102.2 s, beat `parts-move` (frame element-102.jpeg)
- What: "partition 3, added" stays an empty lane, and the producer still reads `hash(key) mod 3` after "then four". The red line "a user's new clicks can be read before the old ones" comes with nothing on screen showing why. The key table does say ava moves from partition 1 to partition 3. The waffle has no key: nothing says one square is 100 keys or that blue means stayed.
- Why it matters: this is the part of Q2 an interviewer presses on, and the figure that could show it is already there.
- Cause: `video/src/videos/de-streaming/TopicScene.tsx:124` (fixed `mod 3`), `:282-297` (lane never filled), `:361-363` (the claim as text); waffle `:328-360`.
- Fix: at "then four", change the producer line to `hash(key) mod 4`. At "a user's new clicks", fly one new ava cell into partition 3 at offset 0 and ring ava's still-unread offsets 3 and 4 in partition 1, with the note "ava's new click: partition 3, read before her old ones in partition 1". Under the waffle, add "1 square = 100 keys · red moved, blue stayed".

### 8. [P2] pacing: the watermark sweep is too fast to follow
- When: 329.8-356.2 s, beats `wm-def` (2.89 w/s), `wm-three` (2.84 w/s), gap 0.6 s (tiles 347-352)
- What: in about 2.5 s (element-347 "now: 3.0 s" to element-349 "now: 13.8 s") the now marker sweeps 13.5 s of processing time. Meanwhile the watermark label jumps -2, 0, 1, 3, 8, 10 and the first window closes. wm-three then reads five numbers (three seconds, 13.5 s, four clicks, a watermark at 12, late) in 9.8 s. The rule just defined, "latest event time seen minus a delay", is never visibly applied to one click.
- Why it matters: the watermark is the hardest idea in the video, and the one moment that could prove the rule goes by too fast to read.
- Cause: `video/src/videos/de-streaming/TimeScene.tsx:111-116` (`pt` reaches `t3.closeFirst` at `closesAt + 6`); `script.ts:265` (`wm-three` in one beat).
- Fix: split `wm-three` after "with four clicks" with `pauseAfter: 1.0`. Add a clause such as "ben's click from second thirteen arrives, so the watermark moves to ten, and the window closes at thirteen and a half seconds, with four clicks". Ring ben's 13 s dot when the watermark reaches 10. Stretch the sweep over `allowAt + 4` to `withFourAt`, not `closesAt + 6`.

### 9. [P2] answer: the "skip ids already seen" consumer stops before the follow-up
- When: 223.7-249.3 s, beats `idem-how`, `idem-sim` (frame element-249.jpeg)
- What: the second technique is drawn as an in-memory set, `seen = {5, 6, 7}`, narrated as "store each message's id, and skip any you've already seen". Replays happen after a crash, which wipes an in-memory set. And if the id is recorded separately from the write, a crash between the two still duplicates or loses the row. The page says "an idempotency key ... you persist". Where the ids live, and that they are written atomically with the output, is what an interviewer asks next.
- Why it matters: as drawn, the technique does not survive the crash it exists to handle.
- Cause: `video/src/videos/de-streaming/IdemScene.tsx:222-236`; `script.ts:207`.
- Fix: narration "Or store each message's id in the sink, in the same transaction as the write, and skip any you've already seen." Redraw the box as a small table "processed ids, in the sink's database", with the note "written with the row, in one transaction".

### 10. [P2] answer: "each has to join it" is left unexplained in Q7
- When: 278.1-289.7 s, beat `eos-edge` (frame element-290.jpeg)
- What: the outside boxes (email, API call, outside database) get "each must join it, or accept idempotent writes". The video never says how a database joins a Kafka transaction (write the output and the consumed offsets in one database transaction, and resume from the stored offsets). It also never says an email or API call cannot join at all and needs an idempotency key. Downstream readers must also read committed messages only, or they see aborted writes. That is the usual follow-up to "how is exactly-once achieved".
- Why it matters: the answer ends on a slogan at the point an interviewer pushes.
- Cause: `script.ts:232` (`eos-edge`); `video/src/videos/de-streaming/IdemScene.tsx:396-401`.
- Fix: narration "...isn't in the transaction. A database can store the consumed offsets in its own transaction with the output; an email or an API call needs an idempotency key. And downstream consumers must read only committed messages." On screen, beside the boxes: "database: offsets in its own transaction" and "email, API: idempotency key". Inside the Kafka box: "readers: committed only".

### 11. [P2] accuracy: compaction "by key, not by age" and "alongside time-based retention" contradict each other
- When: 493.5-510.6 s, beat `r-compact` (frame element-510.jpeg)
- What: the narration opens with "instead of expiring by age" and the screen says "by key, not by age". Then it closes with "It runs alongside time-based retention", shown as "alongside time-based retention, not instead of it". The second line is the page's wording, but it is wrong for the topic just described. `cleanup.policy` is per topic: `compact` keeps the latest value per key with no age limit, which is what a "snapshot of current state" needs. `compact,delete` adds time-based deletion, which would drop users who have not changed recently.
- Why it matters: the viewer is left unsure whether a compacted topic expires by age, and the closing line steers them wrong.
- Cause: `script.ts:349` (`r-compact`); `video/src/videos/de-streaming/RapidScene.tsx:59` and `:90`.
- Fix: narration "...to rebuild state from. Compaction is a per-topic policy; a topic can add time-based deletion too, but a state snapshot usually doesn't." Screen: "compact: no age limit · compact + delete: both".

### 12. [P3] answer: "nothing is dropped" holds only while lag stays inside retention
- When: 451.0-464.7 s, beat `bp-def` (frame element-460.jpeg)
- What: green "and nothing is dropped". Q5 has just said at-least-once "can't save a message deleted before anyone read it". A consumer whose lag outgrows the retention period loses exactly those messages. That is the natural follow-up to "Kafka absorbs it".
- Why it matters: it is a one-clause fix to an absolute claim that is not absolute.
- Cause: `video/src/videos/de-streaming/PressureScene.tsx:157-159`; `script.ts:326`.
- Fix: "...falls behind, and nothing is dropped, as long as the lag stays inside the retention period." Screen: "and nothing is dropped (within retention)".

### 13. [P3] confusion: colors against the series' meanings
- When: 456-489 s, and 381-400 s (frames element-489.jpeg, element-399.jpeg)
- What: the push-based "slow down" loop and its label are red, although push-back is the correct mechanism for push systems, not a trap. "never silently dropped" is red, although it is the good property. The "late" firing flag is green, although late is the trap everywhere else in the scene.
- Why it matters: red is the trap and green the right answer, and these three flip that.
- Cause: `video/src/videos/de-streaming/PressureScene.tsx:161-175` (`color={ACCENT}`, `ACCENT_INK`); `video/src/videos/de-streaming/TimeScene.tsx:392` (`ACCENT_INK`), `:442-446` (`OK`, `OK_INK` for all three flags).
- Fix: draw the push loop in INK_SOFT. Draw "never silently dropped" in OK_INK. Draw the three flags in INK, or BLUE_INK for results, keeping green for none of them.

### 14. [P3] confusion: offsets are defined over empty lanes
- When: 43-51 s, beat `topic-log` (tiles 43-50)
- What: the five grey cells fade out at the split, and the clicks only fly in at `topic-key` (about 52 s). So "Each message gets an offset: its position in its partition, counting up from zero" is read over three empty lanes.
- Why it matters: the term arrives with nothing to point at, and the offsets appear 5 s later.
- Cause: `video/src/videos/de-streaming/TopicScene.tsx:85-86` (`preOut` fades the cells at the split), `:91` (first click at `hashAt + 8`).
- Fix: keep the grey cells through the split, dealt into the three lanes and numbered 0, 1, 2 at "counting up from zero". Fade them only at `hashAt`.

### 15. [P3] explanation: Q1's "✓ in order" is arrival order, and dee's click proves it
- When: 60-66 s, beat `topic-key` (frame element-063.jpeg); and 310-326 s, beat `time-count`
- What: partition 2 is ben@4, ben@13, dee@8, ben@25. It gets "✓ in order" because offsets follow arrival, yet Q8 calls dee's click out of order. The video never links the two: Kafka orders by arrival, not by event time, which is why Q8 needs event time.
- Why it matters: the link costs one note, answers an obvious "but it said in order" doubt, and is a good interview line.
- Cause: `video/src/videos/de-streaming/TopicScene.tsx:236-240`; `script.ts:113`.
- Fix: at "never across them", add a small note under partition 2: "in order of arrival: dee's click from second 8 sits after ben's from 13". In `time-count`, add "the same click that sat third in partition two".

### 16. [P3] explanation: terms used before they are defined
- When: about 81 s (`parts-cap`, "longer rebalances"), about 193 s (`sem-least`, "a message deleted before anyone read it"), about 381 s (`late-fix`, "a side output")
- What: "rebalances" is a cost in Q2 a minute before Q3 shows one. The deleted message in Q5 is deleted by retention, which is not named until the rapid round. "Side output" is never glossed.
- Why it matters: each term costs a beginner a moment while the next idea arrives.
- Cause: `script.ts:123`, `:184`, `:280`.
- Fix: "longer rebalances, when partitions are reassigned"; "a message deleted by retention before anyone read it"; "send anything later to a side output, a separate stream, not into silence".

### 17. [P3] confusion: the join figure's two halves are unlabelled
- When: 519-531 s, beat `r-join` (frame element-530.jpeg)
- What: the timelines (stream to stream) and the enrichment row (stream to table) are said aloud but carry no label. The only headings are "batch join" and "stream join".
- Why it matters: in a rapid round the viewer has no time to work out which half is which.
- Cause: `video/src/videos/de-streaming/RapidScene.tsx:110-114` (cues exist), `:134-194` (no label drawn).
- Fix: at `s2sAt` add "stream to stream" (21px, INK) above "buffered: ..."; at `tableAt` add "stream to table" above "click · ava".

### 18. [P3] confusion: the poison message skips the consumer
- When: 532-556 s, beat `r-dlq` (frame element-555.jpeg)
- What: the ✕ cell flies straight from the topic into the dead-letter queue. The only arrow left in the finished figure runs from the queue back to the topic (replay). The narration says the consumer is what catches it.
- Why it matters: the finished frame reads as the queue feeding the topic, with nothing routing into it.
- Cause: `video/src/videos/de-streaming/RapidScene.tsx:261-271` (cell path from `poisonX` to the DLQ), `:315-324` (the only DLQ arrow).
- Fix: route the cell through the consumer: topic, then consumer, then down. Add a red ElbowArrow from the consumer's bottom edge to the DLQ at `startAt + 8`.

### 19. [P3] confusion: the idempotent producer floats unconnected in Q7
- When: 256-291 s, beats `eos-producer` to `eos-edge` (frame element-290.jpeg)
- What: "idempotent producer, producer id 7" has no arrow to the input topic. It also reads as an upstream producer, while the producer in the transaction (writing "output messages") is the app's own, which is idempotent too.
- Why it matters: the two "pieces" of the answer look unrelated rather than parts of one producer.
- Cause: `video/src/videos/de-streaming/IdemScene.tsx:269-273` (box and lane, no edge).
- Fix: add a blue ElbowArrow from the producer box to the lane at `producerAt + 6`. Add "(your app's producer is one too)" under "output messages" at `outputAt`.

### 20. [P3] answer: "sliding, also called hopping" depends on the engine
- When: 421.9-431.3 s, beat `win-slide`
- What: Flink and Spark use the two names for one thing. In Kafka Streams, the system this video is built on, a hopping window is this one, and a sliding window is a different type defined by the time between two records.
- Why it matters: a Kafka-minded interviewer may correct it.
- Cause: `script.ts:308`; `video/src/videos/de-streaming/WindowsScene.tsx:167-170`.
- Fix: "Hopping windows, which Flink calls sliding, are fixed but overlap." Screen: "hopping / sliding in Flink".

### 21. [P3] pacing: the consumer-group definition is the densest beat
- When: 109.5-119.4 s, beat `group-def`, 3.15 w/s, gap 0.6 s
- What: 31 words carry the core definition of Q3 and the "exactly one" rule, at the video's highest rate.
- Why it matters: the term every later scene uses is defined in the fastest beat of the video.
- Cause: `script.ts:141`.
- Fix: split after "read one topic together" with `pauseAfter: 0.6`. Finding 6's wording change shortens the second half too.
