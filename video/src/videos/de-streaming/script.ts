import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Streaming & messaging" (16:9), Part 8 of the Data Engineer
 * interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * content/interview/data-engineer/streaming.mdx. It answers fifteen
 * questions: twelve worked through, numbered aloud, then three quick ones
 * (numbered 13 to 15 on screen only). The page's "Batch vs streaming" is
 * answered in Part 6 (Pipelines), where the plan puts it.
 *
 *   1. Kafka topics, partitions and offsets ("topic").
 *   2. why the number of partitions matters ("parts").
 *   3. consumer groups ("group"). 4. consumer offsets and committing them
 *   ("commit").
 *   5. at-least-once, at-most-once and exactly-once ("semantics"), with
 *   Pipelines' "What is exactly-once vs at-least-once delivery semantics?"
 *   (what it adds: at-least-once can't save a message deleted before it is
 *   read; exactly-once is one effect, not one execution).
 *   6. idempotent consumers ("idem").
 *   7. exactly-once in Kafka ("eos"), with Pipelines' boundary: an email, an
 *   API call or an outside database is outside the transaction.
 *   8. event time versus processing time ("time"), with Pipelines' question
 *   (batched uploads).
 *   9. watermarks ("wm"), with Pipelines' question (progress, not proof).
 *   10. late-arriving data ("late"), with Pipelines' question (early,
 *   on-time and late results).
 *   11. windowing and the window types ("windows").
 *   12. backpressure ("pressure").
 *   Quick ("rapid-in"): 13. log compaction; 14. a streaming join against a
 *   batch join; 15. dead-letter queues, with Orchestration & reliability's
 *   "What is dead-letter handling in a pipeline?" (bad rows or whole tasks;
 *   a few bad records don't stop everything, and nothing is silently dropped).
 *
 * Reuse: none. No Data Analyst or Data Scientist page asks these questions and
 * no course video teaches them, so every figure is new.
 *
 * Opening and bridge: Part 7 hands over on "the data never stops arriving",
 * and this one opens on it; the bridge goes to Part 9, where it all lands and
 * how it is stored.
 *
 * Facts. No Kafka runs here, and no number is Kafka's output. The page has no
 * runnable code, so every number is from check.mjs, a small seeded model in
 * Pyodide 314.0.7 (Python and NumPy), into results.json, which data.ts reads;
 * the narration says "model it" or "in the model", and the screen says
 * "model" or "the video's own stream":
 *   - the stream: twelve clicks from ava, ben, cam and dee, each with an event
 *     time and a processing time (the video's own, written by hand).
 *     Hashed (CRC-32 of the name, standing in for the producer's key hash)
 *     into three partitions: ava in 1, cam in 0, ben and dee in 2.
 *   - "parts": ten thousand keys hashed into three partitions, then four:
 *     7,432 move ("seventy-four percent"); three of the four users move.
 *   - "semantics": a thousand messages, committed every fifty, crashes at
 *     232, 379 and 985: at-most-once loses 54, at-least-once processes 96
 *     twice. "idem": a blind insert leaves 1,096 rows, an idempotent one
 *     1,000.
 *   - "time": counted in tumbling ten-second windows by processing time, 4,
 *     5, 3; by event time, 5, 4, 3 (dee's click from second 8 reaches the
 *     engine at 17.2 s).
 *   - "wm": with a three-second delay the first window closes at 13.5 s,
 *     with four clicks, and dee's click arrives behind a watermark at 12;
 *     with ten it counts, and the window closes at 21.3 s, 7.8 s later
 *     ("almost eight seconds"). "late": an allowed lateness of ten seconds
 *     updates the first window from four to five.
 *   - "windows": tumbling 5, 4, 3; sliding ten seconds every five puts each
 *     click in two windows; a five-second session gap splits ava's five
 *     clicks into two sessions.
 *   - "pressure": Poisson arrivals at a hundred a second (99 on average over
 *     the first minute) into a consumer handling eighty: lag 1,143 at sixty
 *     seconds ("over eleven hundred"); a second consumer from then clears it
 *     in 18 seconds.
 *   - "r-compact": eight profile updates to four users; compaction keeps four.
 *   Defaults and rules of thumb (no global order across partitions, add but
 *   never remove partitions, lag as the health signal) are the page's own.
 *
 * Written for Drew's ear: SQL is never said; "API" in plain caps; "dead-letter
 * queue" in words, never its letters; Kafka glossed once, as "a distributed
 * log"; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "de-streaming",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "The data never stops arriving. Clicks, payments, sensor readings: the stream has no last row to wait for. Streaming interviews test how Kafka, a distributed log, spreads it across machines, what a delivery guarantee really promises, and how to count over time when events arrive late and out of order.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Fifteen questions: twelve worked through on one small stream, the video's own, of twelve clicks from four users. Then three quick ones.",
      pauseAfter: 0.7,
    },

    // ── 1, 2. Topics, partitions, offsets; the partition count ────────────
    {
      id: "topic",
      scene: true,
      text: "Question one. What are Kafka topics, partitions, and offsets?",
      pauseAfter: 0.5,
    },
    {
      id: "topic-log",
      text: "A topic is a named log that only grows at its end. It's split into partitions, the unit of parallelism. Each message gets an offset: its position in its partition, counting up from zero.",
      pauseAfter: 0.6,
    },
    {
      id: "topic-key",
      text: "The producer hashes each message's key to pick a partition, so all of ava's clicks land in one, in the order they arrived. Order holds inside a partition, never across them. A message with no key goes round-robin.",
      pauseAfter: 0.8,
    },
    {
      id: "parts",
      text: "Question two. Why does the number of partitions matter in Kafka?",
      pauseAfter: 0.5,
    },
    {
      id: "parts-cap",
      text: "Partitions cap how many consumers can share the work, and set where order holds. More of them buy throughput, at a cost: more open files, longer rebalances, more latency.",
      pauseAfter: 0.6,
    },
    {
      id: "parts-move",
      text: "You can add partitions later but never remove them, and adding them moves keys. Model it with ten thousand keys, hashed into three partitions, then four: seventy-four percent move, so a user's new clicks can be read before their old ones. Size for peak, with headroom.",
      pauseAfter: 0.8,
    },

    // ── 3, 4. Consumer groups; committing offsets ─────────────────────────
    {
      id: "group",
      scene: true,
      text: "Question three. What is a consumer group, and how does it scale consumption?",
      pauseAfter: 0.5,
    },
    {
      id: "group-def",
      text: "A consumer group is a set of consumers that read one topic together. Each partition goes to exactly one of them, so the work is split and nothing is read twice.",
      pauseAfter: 0.6,
    },
    {
      id: "group-scale",
      text: "Two consumers share three partitions. Add a third, and the group rebalances: one partition each. Add a fourth, and it sits idle. Parallelism stops at the partition count.",
      pauseAfter: 0.6,
    },
    {
      id: "group-fan",
      text: "A second group gets every message again, on its own: that's how one stream feeds several pipelines.",
      pauseAfter: 0.8,
    },
    {
      id: "commit",
      text: "Question four. What are consumer offsets and why commit them?",
      pauseAfter: 0.5,
    },
    {
      id: "commit-def",
      text: "A commit records how far the group has processed each partition, and Kafka stores it. After a crash or a rebalance, the next owner resumes from the last commit, not from the start.",
      pauseAfter: 0.6,
    },
    {
      id: "commit-when",
      text: "So when you commit decides what a crash costs.",
      pauseAfter: 0.8,
    },

    // ── 5. Delivery semantics ─────────────────────────────────────────────
    {
      id: "semantics",
      scene: true,
      text: "Question five. What is the difference between at-least-once, at-most-once, and exactly-once?",
      pauseAfter: 0.5,
    },
    {
      id: "sem-most",
      text: "Take one batch, offsets five to nine, and a crash just after seven. Commit first, then process, and eight and nine are skipped for good. That's at-most-once: no duplicates, but messages lost.",
      pauseAfter: 0.6,
    },
    {
      id: "sem-least",
      text: "Process first, then commit, and after the crash, five to seven run again. That's at-least-once: nothing lost, but duplicates. It's the usual default, though it can't save a message deleted before anyone read it.",
      pauseAfter: 0.6,
    },
    {
      id: "sem-exact",
      text: "Exactly-once means each message has one effect on the result. Not that the code runs once: it can run twice, as long as the second run changes nothing.",
      pauseAfter: 0.6,
    },
    {
      id: "sem-sim",
      text: "Model it: a thousand messages, committed every fifty, with three crashes. At-most-once loses fifty-four. At-least-once processes ninety-six of them twice.",
      pauseAfter: 0.8,
    },

    // ── 6, 7. Idempotent consumers; exactly-once in Kafka ─────────────────
    {
      id: "idem",
      scene: true,
      text: "Question six. How do you make a consumer idempotent?",
      pauseAfter: 0.5,
    },
    {
      id: "idem-how",
      text: "Make a replay harmless. Upsert by key instead of a blind insert, so a second copy overwrites its row with the same values. Or store each message's id, and skip any you've already seen.",
      pauseAfter: 0.6,
    },
    {
      id: "idem-sim",
      text: "In the model, blind inserts leave a thousand and ninety-six rows; the idempotent consumer leaves a thousand. That's effectively-once, without a distributed transaction.",
      pauseAfter: 0.8,
    },
    {
      id: "eos",
      text: "Question seven. What is exactly-once processing in Kafka, and how is it achieved?",
      pauseAfter: 0.5,
    },
    {
      id: "eos-producer",
      text: "Inside Kafka, two pieces. An idempotent producer numbers what it sends, with a producer id and a sequence number, so the broker drops a retried copy.",
      pauseAfter: 0.6,
    },
    {
      id: "eos-txn",
      text: "And a transaction writes the output messages and the consumer's offsets together: both land, or neither does. That's the consume, transform, produce loop.",
      pauseAfter: 0.6,
    },
    {
      id: "eos-edge",
      text: "The guarantee stops at Kafka's edge. An email, an API call or an outside database isn't in the transaction, so each has to join it, or accept idempotent writes.",
      pauseAfter: 0.8,
    },

    // ── 8, 9, 10. Event time, watermarks, late data ───────────────────────
    {
      id: "time",
      scene: true,
      text: "Question eight. What is event time versus processing time?",
      pauseAfter: 0.5,
    },
    {
      id: "time-def",
      text: "Event time is when it happened, stamped in the event. Processing time is when the engine handles it. Network delay, retries, a phone that was offline, batched uploads: each pulls the two apart.",
      pauseAfter: 0.6,
    },
    {
      id: "time-count",
      text: "Here are the twelve clicks, placed at both. Count them per ten seconds by arrival, and dee's click from second eight lands in the wrong window: four, then five. By event time it's five, then four. Correct counts use event time.",
      pauseAfter: 0.8,
    },
    {
      id: "wm",
      text: "Question nine. What is a watermark?",
      pauseAfter: 0.5,
    },
    {
      id: "wm-def",
      text: "A watermark is the engine's estimate that every event before some time has arrived, so it can close a window and emit it. A common rule: the latest event time seen, minus an allowed delay. It's progress, not proof: an older event can still turn up.",
      pauseAfter: 0.6,
    },
    {
      id: "wm-three",
      text: "Allow three seconds, and the first window closes at thirteen and a half seconds, with four clicks. Then dee's click arrives behind a watermark at twelve: it's late.",
      pauseAfter: 0.6,
    },
    {
      id: "wm-ten",
      text: "Allow ten, and it counts, but the window closes almost eight seconds later. A longer delay buys completeness with latency, and holds more state.",
      pauseAfter: 0.8,
    },
    {
      id: "late",
      text: "Question ten. How do you handle late-arriving data?",
      pauseAfter: 0.5,
    },
    {
      id: "late-fix",
      text: "Combine three things. Keep a window's state for an allowed lateness past the watermark, and update its result when a late event arrives: four becomes five. Send anything later to a side output, not into silence. And have the sink upsert, so the correction replaces the row instead of adding one.",
      pauseAfter: 0.6,
    },
    {
      id: "late-trig",
      text: "Some engines emit early, on-time and late results for one window. How late data gets, and how much it matters, decides the mix.",
      pauseAfter: 0.8,
    },

    // ── 11. Windows ───────────────────────────────────────────────────────
    {
      id: "windows",
      scene: true,
      text: "Question eleven. What is windowing, and what are the main window types?",
      pauseAfter: 0.5,
    },
    {
      id: "win-def",
      text: "Windowing cuts an endless stream into finite buckets you can aggregate.",
      pauseAfter: 0.5,
    },
    {
      id: "win-tumble",
      text: "Tumbling windows are fixed and never overlap. Ten seconds each, so every click lands in exactly one: five, four, three.",
      pauseAfter: 0.6,
    },
    {
      id: "win-slide",
      text: "Sliding windows, also called hopping, are fixed but overlap. Ten seconds long, starting every five, so each click counts in two.",
      pauseAfter: 0.6,
    },
    {
      id: "win-session",
      text: "Session windows have no fixed size: one closes after a gap of inactivity. With a five-second gap, ava's five clicks make two sessions, which is how you sessionize users.",
      pauseAfter: 0.8,
    },

    // ── 12. Backpressure ──────────────────────────────────────────────────
    {
      id: "pressure",
      scene: true,
      text: "Question twelve. What is backpressure, and how do streaming systems handle it?",
      pauseAfter: 0.5,
    },
    {
      id: "bp-def",
      text: "Backpressure is a consumer that can't keep up. Kafka absorbs it: the log is durable, so a slow consumer falls behind and nothing is dropped. Push-based systems push back instead, and slow the producer.",
      pauseAfter: 0.6,
    },
    {
      id: "bp-lag",
      text: "Watch consumer lag: the distance from the latest offset to the committed one. Model it: about a hundred messages a second arrive, and one consumer handles eighty. After a minute, lag is over eleven hundred.",
      pauseAfter: 0.6,
    },
    {
      id: "bp-fix",
      text: "A second consumer, on a partition of its own, clears it in eighteen seconds. Rising lag means more partitions and consumers, or faster processing.",
      pauseAfter: 0.9,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Three left, one breath each.",
      pauseAfter: 0.5,
    },
    {
      id: "r-compact",
      text: "Log compaction keeps at least the latest value for each key and clears out older ones, instead of expiring by age. The topic becomes a snapshot of current state, like each user's latest profile, to rebuild state from. It runs alongside time-based retention.",
    },
    {
      id: "r-join",
      text: "A batch join can wait for every row; a stream join can't, because neither side ends. Stream to stream, it buffers each side's recent events in a time window, matches across them, and lets the watermark expire old state. Stream to table, each event looks up a table kept current, often a compacted topic.",
    },
    {
      id: "r-dlq",
      text: "And a dead-letter queue catches messages a consumer can't process: malformed, off-schema, or failing again and again. The main stream keeps flowing instead of stalling on one poison message; the bad ones wait to be inspected, fixed and replayed. A batch pipeline sets bad rows or whole tasks aside the same way, so a few don't stop everything, and none vanish.",
      pauseAfter: 1.0,
    },
    {
      id: "next",
      text: "Every one of these streams lands somewhere, and how it's stored decides what reading it costs. Next: data warehousing and storage.",
    },
  ],
};
