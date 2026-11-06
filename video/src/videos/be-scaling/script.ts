import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Scaling a design" (16:9), Part 2 of the Backend / Software
 * Engineer interview prep videos
 * (agent-outputs/20261106-backend-interview-video-plan.md), after
 * content/interview/backend-engineer/system-design.mdx. It answers the twelve
 * of the page's questions the plan keeps here: nine worked through, numbered
 * aloud and read in the page's words, then two quick ones (10 and 11,
 * numbered on screen only), then the news feed, numbered aloud, as the
 * plan's close. "SQL or NoSQL at scale, how do you choose?" is not here:
 * Part 4 answers it with the databases page's "SQL vs NoSQL".
 *
 *   1. "Horizontal vs vertical scaling, which do you reach for?" ("q1"; read
 *      "versus").
 *   2. "What is a load balancer and how does it distribute traffic?" ("q2").
 *   3. "Explain the cache-aside pattern." ("q3").
 *   4. "Why is cache invalidation hard?" ("q4").
 *   5. "What is database replication and what does it buy you?" ("q5").
 *   6. "What is sharding, and how does it differ from partitioning?" ("q6").
 *   7. "Explain the CAP theorem." ("q7").
 *   8. "When do you introduce a message queue?" ("q8").
 *   9. "How does rate limiting work?" ("q9"): the algorithms. Part 3 answers
 *      the API page's rate-limiting question from the client's side.
 *   Quick ("rapid-in"): 10. "What cache eviction policies exist, and when
 *   does each fit?" ("r-evict"); 11. "What consistency models should you
 *   know?" ("r-consist").
 *   12. "Design a news feed, fan-out on write or on read?" ("q12").
 *
 * The page asks them in another order; here each is the next thing a design
 * needs at ten times its traffic: more servers, then what spreads load over
 * them, then the cache, its invalidation, the store's replicas and shards,
 * what a partition forces, what can leave the request path, and who may send
 * how much. The two quick ones tidy up the cache and the replicas; the news
 * feed closes on a system the shortener can't teach, where fan-out is the
 * whole question.
 *
 * Opening and bridge. It opens on Part 1's bridge (the first diagram works;
 * now ten times the traffic) by drawing that diagram again with its own
 * numbers, never "in the last video", so it plays on its own. It closes on
 * the plan's bridge into Part 3: every box talks to the others through an API.
 *
 * Reuse: the opening diagram and its 35,000 redirects a second are Part 1's
 * (be-system-design/results.json, read by check.mjs, so the two cannot
 * disagree). The keys are Part 1's six-character base-62 keys. No other
 * interview video asks these questions.
 *
 * On screen, beat by beat (for phase 2; nothing is built yet). Colors keep the
 * series' meanings (interview.tsx): red the trap, green the right answer,
 * yellow what the narration points at, blue data. The shortener's diagram
 * (client, load balancer, two app servers, cache, key-value store) recurs as
 * a small map in a corner of each deep dive, with the box the question is
 * about lit yellow, so the twelve read as one design growing.
 *   hook: the diagram, drawn box by box as named, "35,000 redirects/s at
 *     peak" beside it in blue. The bison hero at the right.
 *   hook-10x: the figure becomes "350,000/s" in yellow on "ten times"; every
 *     box gets a small red question mark on "every box".
 *   plan: twelve numbered chips in a row, nine blue, two gray (quick), the
 *     last set apart in a different outline ("a different system").
 *   q1: question card; one server box grows into a taller one (vertical)
 *     until it hits a dashed ceiling line, red on "ceiling", and a red ring
 *     on "one machine".
 *   q1-horiz: beside it, the box multiplies into a row behind a load
 *     balancer (horizontal), green; a small "session" token leaves an app
 *     server for a shared store on "push session state".
 *   q1-ours: the shortener's two app servers become six, green.
 *   q1-headroom, q1-buy: the page's queue chart (queue-utilization-latency),
 *     redrawn from results.json: mean wait against load, with dots at 50%
 *     ("1×"), 90% ("9×") and 99% ("99×", off the top, an arrow) lit as said;
 *     the span from 90% to 99% shaded yellow on "the last few points".
 *   q2: question card; a load balancer box with a fan of arrows to four
 *     servers.
 *   q2-algos: three small panels, one per algorithm, each lit on its name:
 *     numbered requests dealt in turn; requests going to the server with the
 *     shortest bar of open connections; a key ("aMoY42") going to the same
 *     server twice.
 *   q2-health: one server turns red, its arrow is withdrawn, the others take
 *     its share.
 *   q2-mod, q2-ring: a grid of 10,000 small squares (one per key), colored
 *     by server. Under modulo, three colors become four and 75% of the
 *     squares change color (red outline on each moved square), "75% moved"
 *     on "seventy-five"; then the same grid on the ring: only the squares
 *     that turn the new server's color change, "23% moved, all to the new
 *     server" in green. A small hash ring beside it, 100 points a server.
 *     A "simulation" note.
 *   q3: question card; the read path as four steps along an arrow: check
 *     the cache; miss; read the database and write the cache; return. The
 *     write path below: update the database, then invalidate the entry.
 *     The drawer spot.
 *   q3-props: "first request pays the miss" under the miss step, yellow.
 *   q3-sim: three bars, cache size against share of redirects answered
 *     (0.1% → 40%, 1% → 58%, 10% → 77%, results.json), each lit on its size;
 *     a "simulation: 2,000,000 redirects, 1,000,000 links, Zipf" note.
 *   q3-loss: each bar's database load if the cache dies, "×2.4" and "×4.3",
 *     in red, the arrows from the cache rerouting to the store.
 *   q4: question card; two copies of one value, "cache" and "database",
 *     that drift apart (one changes color).
 *   q4-model: the page's chart (cache-ttl-staleness), redrawn from
 *     results.json: misses falling and stale reads rising against a log TTL
 *     axis, the crossing at about 15 s marked, "6% / 6%"; "the page's model"
 *     as its note.
 *   q4-ours: a link marked "taken down": its cached entry is deleted after
 *     a "commit" tick (green); then the wrong order (delete, a read slips in,
 *     the old value written back) in red; a small TTL clock stays on the
 *     entry as the backstop.
 *   q4-write: two short rows, write-through (cache and database written
 *     together, a clock for the cost) and write-behind (writes batched, a
 *     red crash mark over the batch).
 *   q5: question card; a leader box with arrows streaming to two followers,
 *     reads fanning out to the followers.
 *   q5-buys: the leader is crossed out and a follower is promoted (crown or
 *     ring), green.
 *   q5-lag: a timeline: "create" lands on the leader at t0; the follower's
 *     copy arrives later (the lag, shaded); an "open" read in the gap goes to
 *     the follower and comes back "not found", red.
 *   q5-fix: the same timeline with that user's read routed to the leader for
 *     a window after the write, green; then, separately, a follower promoted
 *     with its last two writes missing, red.
 *   q6: question card; one table split into pieces (partitioning), then the
 *     pieces moved onto separate server boxes (sharding). The cheese-wheel
 *     spot.
 *   q6-key: eight shard columns. By creation date, all of today's new links
 *     stack on the last column, red; by hash, the million keys spread to
 *     eight near-equal bars (results.json counts), green, "within 1%".
 *   q6-cost: one redirect lights one shard; "my links" lights all eight
 *     (one user's 50 links, results.json userShards), red; a small second
 *     table "by user" answers it, green.
 *   q7: question card; the page's grid (cap-theorem-grid): rows "network
 *     healthy" and "during a partition", columns "stay consistent" and "stay
 *     available"; the top row lit first.
 *   q7-rows: the bottom row lit, "refuse" and "answer, maybe stale".
 *   q7-ours: the shortener split by a red partition line. Three operations,
 *     each placed in a column as said: "redirect" (available), "new random
 *     key" (available, each side drawing on its own ID block), "custom alias"
 *     (consistent: refused on the minority side).
 *   q7-pacelc: the healthy row returns with "latency or consistency" in it,
 *     and the letters P-A-C-E-L-C set out under the grid, "else" marked.
 *   q8: question card; a redirect with a database write inside it, a red
 *     spike arriving at the database.
 *   q8-queue: the write moves out onto a queue (the conveyor spot): the
 *     redirect returns at once, green; a burst lengthens the queue, workers
 *     drain it at a steady rate.
 *   q8-once: a worker crashes before its "ack"; the click comes round again;
 *     a "seen IDs" box counts it once, green; a small "totals: a few seconds
 *     behind" note.
 *   q9: question card; a timeline from 0 to 70 s with the minute boundary at
 *     60, ten requests at 59 and ten at 61 (results.json trace). The bucket
 *     spot.
 *   q9-fixed, q9-sliding, q9-token, q9-leaky: four rows under the same
 *     timeline, one per algorithm, each request a cell, accepted green and
 *     refused red (results.json cells): fixed 20 of 20 (with "2× the limit"
 *     in red), sliding 10, token bucket 10 with its level drawn, leaky bucket
 *     with its queue and a steady drip out, one every 6 s.
 *   q9-shared: four server boxes, each with its own bucket, a burst of forty
 *     dealt round-robin, all forty green: "4× the limit" in red; then one
 *     shared bucket, ten pass.
 *   rapid-in: the quick round's two numbered rows (RapidFire), 10 and 11.
 *   r-evict: four small panels, LRU, LFU, first in first out, TTL, each lit on
 *     its name; "LRU + TTL" ticked green at the end.
 *   r-consist: a scale from "eventual" to "strong" with read-your-writes and
 *     monotonic reads placed between; a feed icon at the eventual end and a
 *     bank balance at the strong end.
 *   q12: question card; a poster and four followers' feed boxes; on "push",
 *     the post's ID drops into each feed. The megaphone spot.
 *   q12-storm: two posters side by side: "200 followers: 200 writes" and
 *     "50,000,000 followers: 50,000,000 writes", the second in red.
 *   q12-pull: a reader's feed assembled on request from 300 timelines,
 *     "300 reads per load" in red.
 *   q12-why: "posts: once" against "feed loads: every time", push lit green.
 *   q12-hybrid: one feed built from the precomputed list plus five
 *     celebrity timelines, "6 reads", green; no post above the threshold
 *     pushed.
 *   next: the whole grown diagram small: load balancer, cache with replicas,
 *     leader and followers, eight shards, a queue, a limiter, each named as
 *     said; every arrow between them lit on "API"; <NextLine> "Next: API
 *     design".
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs computes every number into results.json, which data.ts
 * reads, and fails if the narration's words stop matching them:
 *   - the traffic: Part 1's peak, 34,722 redirects a second ("about thirty-
 *     five thousand"), times ten, 347,222 ("three hundred and fifty
 *     thousand"), from be-system-design/results.json.
 *   - q1: vertical's ceiling and single point of failure, horizontal's
 *     redundancy and statelessness, session state to a shared store: the
 *     page. Headroom: the page's chart (queue-utilization-latency), mean wait
 *     rho / (1 - rho) service times, the simplest (M/M/1) queue: 1 at 50%, 9
 *     at 90%, 99 at 99%, checked against the chart's caption; "the last few
 *     points cost more than all the rest" is the page's.
 *   - q2: round-robin, least-connections, consistent hashing for sticky
 *     caches, health checks: the page. The simulation: 10,000 keys, MD5,
 *     three servers to four: 75% move under modulo (7,5xx of 10,000;
 *     results.json movedMod), 23% on a ring with 100 points a server, every
 *     one of them to the new server (check.mjs asserts it).
 *   - q3: the read and write paths, "only requested data hot", "tolerates
 *     cache failures", "the first request for any key pays the miss": the
 *     page. The simulation: 2,000,000 redirects over 1,000,000 links, Zipf
 *     exponent 1, seed 12, LRU: 40% at 0.1% of links cached, 58% at 1%, 77% at
 *     10%. A dead cache multiplies database reads by 1 / (1 - hit rate): 2.4
 *     and 4.3.
 *   - q4: two copies that drift, TTL too long or too short, write-through and
 *     write-behind: the page. The page's chart (cache-ttl-staleness),
 *     recomputed: its key is read once a second and written every 120 s;
 *     misses and stale reads cross near 15 s, both about 6%, checked against
 *     its caption (which itself says the rates are illustrative). Deleting
 *     the entry after the database commits, and why the other order lets a
 *     read write the old value back, is the standard cache-aside ordering,
 *     drawn as a mechanism; the TTL as a backstop bounds any race either
 *     way.
 *   - q5: leader-follower, reads fanned out, promotion, lag and a user who
 *     can't see their own update: the page. Reading your own recent writes
 *     from the leader is the usual way to give read-your-writes; that
 *     promoting a lagging follower loses what it never received holds for
 *     asynchronous replication, which the narration says.
 *   - q6: the definitions, shard key, cross-shard cost and hot spots: the
 *     page. The simulation: 1,000,000 keys hashed onto eight shards, every
 *     shard within 1% of 125,000 (worst deviation in results.json); one
 *     user's 50 links, seeded, land on all eight (and 50 random keys cover
 *     all eight with probability 0.99, by inclusion-exclusion).
 *   - q7: the page's CAP answer (a linearizable single-copy view; every
 *     request to a non-failing node answered; CP may refuse, AP may serve
 *     stale or conflicting versions; "not a label for an entire database";
 *     PACELC), and its chart's two rows. The shortener's three operations
 *     are the video's own example.
 *   - q8: decoupling, bursts, async slow work (email, transcoding), fan-out
 *     to workers, at-least-once and idempotent consumers, "trades immediate
 *     consistency for throughput and resilience": the page. The click ID is
 *     the video's own example.
 *   - q9: the page's four algorithms, 429, "allows short bursts", "trade
 *     accuracy for cheapness". The trace is the video's own: a limit of ten
 *     a minute; fixed window passes all 20 (2 times the limit), the sliding
 *     window counter none of the second ten, the token bucket (ten tokens, one
 *     every 6 s, full at the start) none of the second ten, the leaky bucket
 *     (a queue of ten, one out every 6 s) one of them, since one has drained
 *     by then (shown on screen, not said). Four servers with their own
 *     buckets pass all forty of a burst, a shared bucket ten.
 *   - r-evict, r-consist: the page's answers.
 *   - q12: push and pull, the write storm, the hybrid: the page. Fifty
 *     million followers: the page's concept check. Two hundred followers,
 *     three hundred accounts followed and five celebrities among them are
 *     assumptions, said as "say"; 1 + 5 = 6 reads. "Feeds are read far more
 *     often than people post" applies the page's read-heavy rule (100:1 or
 *     more for most consumer systems) to feeds.
 *
 * Written for Drew's ear: initialisms in plain caps; CAP and PACELC are said
 * as words (the report asks the lexicon for "cap" and "pass-elk"); LRU and LFU
 * are read as letters and expanded once; FIFO is said as "first in, first
 * out"; TTL is expanded once ("the time to live"); HTTP four twenty-nine; no
 * sentence opens with "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "be-scaling",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Here's a URL shortener that works: a load balancer, two stateless app servers, a cache and a key-value store, sized for about thirty-five thousand redirects a second at peak.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-10x",
      text: "Now give it ten times the traffic: three hundred and fifty thousand a second. Every box has to answer for it.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Twelve questions on scaling a design. Nine are worked through on this diagram, two go quickly, and the last one is a different system: a news feed.",
      pauseAfter: 0.7,
    },

    // ── 1. Horizontal or vertical ─────────────────────────────────────────
    {
      id: "q1",
      scene: true,
      text: "Question one. Horizontal versus vertical scaling, which do you reach for? Vertical means a bigger machine. It's simple, but it has a ceiling, and it's still one machine that can fail.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-horiz",
      text: "Horizontal means more machines behind the load balancer. It scales nearly without limit and adds redundancy, but only if any server can handle any request. So the app tier has to be stateless: push session state into a shared cache or a database.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-ours",
      text: "These redirect servers already are, so the answer to ten times the traffic is more of them.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-headroom",
      text: "How many more? Enough that none runs near full. In the simplest queue model, a request at fifty percent load waits one service time on average. At ninety percent, it waits nine. At ninety-nine percent, ninety-nine.",
      pauseAfter: 0.9,
    },
    {
      id: "q1-buy",
      text: "The last few points cost more than all the rest. Headroom is what the extra servers buy.",
      pauseAfter: 0.8,
    },

    // ── 2. Load balancers ─────────────────────────────────────────────────
    {
      id: "q2",
      scene: true,
      text: "Question two. What is a load balancer, and how does it distribute traffic? It sits in front of the pool and spreads requests, so no one server is overwhelmed.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-algos",
      text: "Round-robin sends them in turn. Least-connections sends each to the server with the fewest open, which copes better when some requests are slow. Consistent hashing sends the same key to the same server, which matters when each server keeps its own cache of hot links.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-health",
      text: "It also runs health checks, and takes a dead server out of rotation. That's what turns a pool of stateless servers into a highly available tier.",
      pauseAfter: 0.7,
    },
    {
      id: "q2-mod",
      text: "Why consistent hashing? Simulate ten thousand short keys spread over three servers by their hash, modulo three. Add a fourth server, switch to modulo four, and seventy-five percent of the keys move, each one to a cold cache.",
      pauseAfter: 0.7,
    },
    {
      id: "q2-ring",
      text: "Put the servers on a hash ring instead, at a hundred points each, and only twenty-three percent move, every one of them to the new server: exactly the share it takes over.",
      pauseAfter: 0.8,
    },

    // ── 3. Cache-aside ────────────────────────────────────────────────────
    {
      id: "q3",
      scene: true,
      text: "Question three. Explain the cache-aside pattern. It's the default. On a read, the app checks the cache. On a miss, it reads the database, writes the value into the cache, and returns it. A write updates the database and invalidates the cached copy.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-props",
      text: "Only what's asked for gets cached, and if the cache fails, reads fall through to the database. But the first request for every key pays the miss.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-sim",
      text: "How much does it catch? Simulate two million redirects over a million links, where a few links get most of the clicks. A cache holding a thousandth of the links answers forty percent of redirects. A hundredth, fifty-eight. A tenth, seventy-seven.",
      pauseAfter: 0.8,
    },
    {
      id: "q3-loss",
      text: "And the better it works, the harder losing it lands. At fifty-eight percent, a dead cache multiplies the database's reads by two point four. At seventy-seven, by more than four. So the cache needs replicas, or the database needs that headroom.",
      pauseAfter: 0.8,
    },

    // ── 4. Invalidation ───────────────────────────────────────────────────
    {
      id: "q4",
      scene: true,
      text: "Question four. Why is cache invalidation hard? Because there are two copies of the truth, and they drift. Set the TTL, the time to live, too long, and users see stale data. Too short, and you lose the cache.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-model",
      text: "The page models one key, read about once a second and changed about every two minutes. The TTL moves both failures, in opposite directions. The least bad setting is where they cross, at about fifteen seconds, and even there six percent of reads miss and six percent are stale.",
      pauseAfter: 0.9,
    },
    {
      id: "q4-ours",
      text: "A short link barely changes, so a long TTL costs almost nothing, until a link is taken down for abuse and has to stop now. So that write deletes the cached entry, after the database commits. Delete first, and a read in between puts the old value back. Keep the TTL anyway, as a backstop.",
      pauseAfter: 0.7,
    },
    {
      id: "q4-write",
      text: "The alternatives: write-through updates the cache and the database together, consistent at a cost on every write. Write-behind batches writes for speed, but a crash loses whatever it hadn't written yet.",
      pauseAfter: 0.8,
    },

    // ── 5. Replication ────────────────────────────────────────────────────
    {
      id: "q5",
      scene: true,
      text: "Question five. What is database replication, and what does it buy you? Copies of the data on several nodes. In leader-follower replication, writes go to the leader and stream to read-only followers.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-buys",
      text: "That scales reads, fanned out across the followers, and adds availability: if the leader dies, promote a follower.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-lag",
      text: "The catch is replication lag. Someone creates a link, gets the short key back, and opens it at once. The read lands on a follower that hasn't caught up: not found.",
      pauseAfter: 0.8,
    },
    {
      id: "q5-fix",
      text: "The usual fix: for a short while after a user writes, send that user's reads to the leader, so they always see their own update. And with asynchronous replication, promoting a follower that lags loses the writes it never received.",
      pauseAfter: 0.8,
    },

    // ── 6. Sharding ───────────────────────────────────────────────────────
    {
      id: "q6",
      scene: true,
      text: "Question six. What is sharding, and how does it differ from partitioning? Partitioning splits one large table into smaller pieces. Sharding spreads those pieces across separate database servers, each holding the rows for its share of a shard key. It scales writes and storage past one machine.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-key",
      text: "The shard key decides how well. Shard by creation date, and today's shard takes every new link: a hot spot. Shard by a hash of the short key, and in a simulation, a million keys land on eight shards within one percent of an eighth each.",
      pauseAfter: 0.8,
    },
    {
      id: "q6-cost",
      text: "A redirect now touches one shard. But one user's links hash everywhere, so listing them asks all eight: cross-shard queries are the price. Keep a second copy keyed by user for that page, and add shards on a hash ring, so few keys move.",
      pauseAfter: 0.8,
    },

    // ── 7. CAP ────────────────────────────────────────────────────────────
    {
      id: "q7",
      scene: true,
      text: "Question seven. Explain the CAP theorem. During a network partition, a distributed system can't be both consistent, with every read seeing the latest write as if there were one copy, and available, with every working node still answering.",
      pauseAfter: 0.7,
    },
    {
      id: "q7-rows",
      text: "Partitions aren't optional, so the choice is what each side does while the network is split: refuse, and stay consistent, or answer, and risk stale or conflicting data.",
      pauseAfter: 0.6,
    },
    {
      id: "q7-ours",
      text: "It's a choice per operation, not a label for the whole database. A redirect answers from whatever copy it can reach: at worst, a brand-new link isn't found yet. New keys can be minted on both sides too, if each server draws from its own block of IDs. But a custom alias must be unique, so the side that can't reach a majority refuses to grant one.",
      pauseAfter: 0.8,
    },
    {
      id: "q7-pacelc",
      text: "And the trade outlives the partition. On a healthy network, waiting for replicas to confirm a write still buys consistency with latency: the second half of PACELC.",
      pauseAfter: 0.8,
    },

    // ── 8. Message queues ─────────────────────────────────────────────────
    {
      id: "q8",
      scene: true,
      text: "Question eight. When do you introduce a message queue? When work doesn't have to happen inside the request. Counting clicks is the shortener's case. Written straight to the database, every redirect waits on a write, and a viral link sends its whole spike there.",
      pauseAfter: 0.6,
    },
    {
      id: "q8-queue",
      text: "Put each click on a queue instead. The redirect returns at once, workers drain the queue at their own pace, and a burst only makes it longer. The same goes for slow work, like sending email or transcoding video, and for fanning work out across many workers.",
      pauseAfter: 0.6,
    },
    {
      id: "q8-once",
      text: "The price is at-least-once delivery: a worker that crashes before acknowledging a click gets it again. So the consumer has to be idempotent. Give each click an ID, and count each ID once. The totals now run a little behind: throughput and resilience, traded for immediate consistency.",
      pauseAfter: 0.8,
    },

    // ── 9. Rate limiting ──────────────────────────────────────────────────
    {
      id: "q9",
      scene: true,
      text: "Question nine. How does rate limiting work? It caps how many requests a client can make in a window, to protect the system and keep it fair. Say ten new links a minute, and one client sends ten at fifty-nine seconds, then ten more at one minute and one second.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-fixed",
      text: "A fixed-window counter resets on the minute, so all twenty get through, in two seconds: twice the limit. It's one counter per client, which is why it's cheap.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-sliding",
      text: "A sliding-window counter also weighs the minute before, and refuses the second ten. It's still cheap, but it's an estimate: it assumes the last minute's requests were evenly spread.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-token",
      text: "A token bucket holds up to ten tokens and refills one every six seconds. Each request spends one, and an empty bucket answers HTTP four twenty-nine, too many requests. The first burst empties it, and the second is refused. Bursts up to the bucket's size get through, then only the refill rate.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-leaky",
      text: "A leaky bucket queues requests and lets them out at a constant rate, one every six seconds, so the load behind it stays smooth.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-shared",
      text: "The follow-up is where the count lives. With four app servers each keeping its own bucket, round-robin hands one client four buckets: four times the limit. The count has to sit in a store every server shares.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Two more, quickly.",
      pauseAfter: 0.5,
    },
    {
      id: "r-evict",
      text: "What cache eviction policies exist, and when does each fit? LRU, least recently used, drops the entry untouched for longest: a good default. LFU, least frequently used, keeps popular keys through a quiet spell. First in, first out drops the oldest entry, used or not. A TTL expires entries by age, which bounds staleness whatever the memory pressure. Most systems pair LRU with a TTL.",
      pauseAfter: 0.7,
    },
    {
      id: "r-consist",
      text: "What consistency models should you know? Strong: every read reflects the latest write. Eventual: replicas converge once writes stop, and a read can be stale until then. Between them, read-your-writes, the fix from question five, and monotonic reads, where time never goes backwards. A feed can be eventual; a bank balance usually needs strong.",
      pauseAfter: 0.9,
    },

    // ── 12. The news feed ─────────────────────────────────────────────────
    {
      id: "q12",
      scene: true,
      text: "Question twelve. Design a news feed: fan-out on write, or on read? Fan-out on write, or push: when someone posts, write the post's ID into every follower's precomputed feed. Reading a feed is then one cheap lookup.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-storm",
      text: "Its cost is per follower. An account with two hundred followers makes two hundred writes a post. A celebrity with fifty million makes fifty million: a write storm, from one post.",
      pauseAfter: 0.8,
    },
    {
      id: "q12-pull",
      text: "Fan-out on read, or pull: build the feed when it's requested, from the accounts you follow. Posting is cheap, but follow three hundred accounts and every feed load reads three hundred timelines.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-why",
      text: "Feeds are read far more often than people post, so push usually wins: it does the work once per post, where pull repeats it on every load.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-hybrid",
      text: "Real systems mix them. Push for ordinary accounts, pull for celebrities, and merge at read time: your precomputed feed, plus the handful of celebrities you follow. Say five: six reads instead of three hundred, and no post costs fifty million writes.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "A load balancer, a cache, replicas, shards, a queue and a limiter. Every box now talks to the others through an API. Next: API design.",
    },
  ],
};
