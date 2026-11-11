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
 *     last set apart in a different outline, lit on "a news feed".
 *   q1: question card; one server box grows into a taller one (vertical)
 *     until it hits a dashed ceiling line, red on "ceiling", and a red ring
 *     on "one machine".
 *   q1-horiz: beside it, the box multiplies into a row behind a load
 *     balancer (horizontal), green; a small "session" token leaves an app
 *     server for a shared store on "session state".
 *   q1-ours: the shortener's two app servers multiply into a longer row,
 *     green, with no count on it (question nine's follow-up draws four).
 *   q1-headroom, q1-buy: the page's queue chart (queue-utilization-latency),
 *     redrawn from results.json: mean wait against load, with dots at 50%
 *     ("1×"), 90% ("9×") and 99% ("99×", off the top, an arrow) lit as said;
 *     the span from 90% to 99% shaded yellow on "Headroom".
 *   q2: question card; a load balancer box with a fan of arrows to four
 *     servers.
 *   q2-algos: three small panels, one per algorithm, each lit on its name:
 *     numbered requests dealt in turn; requests going to the server with the
 *     shortest bar of open connections; a key ("aMoY42") going to the same
 *     server twice.
 *   q2-health: one server turns red, its arrow is withdrawn, the others take
 *     its share.
 *   q2-mod, q2-ring: a grid of 10,000 small squares (one per key), colored
 *     by server. Under modulo, three colors become four and 74% of the
 *     squares change color (red outline on each moved square), "74% moved"
 *     on "seventy-four"; then the same grid on the ring: only the squares
 *     that turn the new server's color change, "23% moved, all to the new
 *     server" in green. A small hash ring beside it, 100 points a server.
 *     A "simulation" note. The ring spot.
 *   q3: question card; the read path as four steps along an arrow: check
 *     the cache; miss; read the database and write the cache; return. The
 *     write path below: update the database, then invalidate the entry.
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
 *     reads fanning out to the followers on "scales reads"; then the leader
 *     is crossed out and a follower promoted (a ring), green, on "promoted".
 *   q5-lag: a timeline: "create" lands on the leader at t0; the follower's
 *     copy arrives later (the lag, shaded); an "open" read in the gap goes to
 *     the follower and comes back "not found", red.
 *   q5-fix: the same timeline with that user's read routed to the leader for
 *     a window after the write, green; then, separately, a follower promoted
 *     with its last two writes missing, red.
 *   q6: question card; one table split into pieces (partitioning), then the
 *     pieces moved onto separate server boxes (sharding). The shards spot.
 *   q6-key: eight shard columns. By creation date, all of today's new links
 *     stack on the last column, red; by hash, the million keys spread to
 *     eight near-equal bars (results.json counts), green, "within 1%".
 *   q6-cost: one redirect lights one shard; "my links" lights all eight
 *     (one user's 50 links, results.json userShards), red; a small second
 *     table "by user" answers it, green.
 *   q7: question card; the page's grid (cap-theorem-grid): rows "network
 *     healthy" and "during a partition", columns "stay consistent" and "stay
 *     available"; the top row lit first, then the bottom row on "refuses"
 *     and "answers", "refuse" and "answer, maybe stale".
 *   q7-ours: the shortener split by a red partition line. Three operations,
 *     each placed in a column as said: "redirect" (available, with two small
 *     gray notes, "not found yet" and "taken down, still works"), "new key"
 *     (available, each side drawing on its own ID block), "custom alias"
 *     (consistent: refused on the minority side).
 *   q7-pacelc: the healthy row returns with "latency or consistency" in it,
 *     and the letters P-A-C-E-L-C set out under the grid, "else" marked.
 *   q8: question card; a redirect with a database write inside it, a red
 *     spike arriving at the database.
 *   q8-queue: the write moves out onto a queue (the conveyor spot): the
 *     redirect returns at once, green; a burst lengthens the queue, workers
 *     drain it at a steady rate.
 *   q8-once: a worker crashes before its "ack"; the click comes round again;
 *     the count and a "seen IDs" table sit in one box marked "one
 *     transaction", and the repeat bounces off it, green; a small "totals
 *     run behind" note.
 *   q9: question card; a timeline from 0 to 70 s with the minute boundary at
 *     60, ten requests at 59 and ten at 61 (results.json trace). The bucket
 *     spot.
 *   q9-fixed, q9-sliding, q9-token, q9-leaky: four rows under the same
 *     timeline, one per algorithm, each request a cell, accepted green and
 *     refused red (results.json cells): fixed 20 of 20 (with "2× the limit"
 *     in red), sliding 10, token bucket 10 with its level drawn (full at the
 *     start, "burst of 10" on "burst ten"), leaky bucket with its queue and a
 *     steady drip out, one every 6 s, on "smooth stream".
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
 *     the post's ID drops into each feed. The newspaper spot.
 *   q12-storm: two posters side by side: "200 followers: 200 writes" and
 *     "50,000,000 followers: 50,000,000 writes", the second in red.
 *   q12-pull: a reader's feed assembled on request from 300 timelines,
 *     "300 reads per load" in red.
 *   q12-why: "posts: once" against "feed loads: every time", push lit green.
 *   q12-hybrid: one feed built from the precomputed list plus five
 *     celebrity timelines, "1 + 5 = 6 reads", green; the celebrity's post is
 *     no longer pushed.
 *   next: the whole grown diagram small, "350,000/s" beside it: more app
 *     servers behind the load balancer, the cache with replicas, leader and
 *     followers, eight shards, a queue, a limiter, each lit as named.
 *   next-api: every arrow between them lit on "API"; <NextLine> "Next: API
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
 *     at 90%, 99 at 99%, checked against the chart's caption ("headroom is
 *     the thing you are buying" is the page's).
 *   - q2: round-robin, least-connections, consistent hashing for sticky
 *     caches, health checks: the page. The simulation: 10,000 keys, MD5,
 *     three servers to four: 74% move under modulo (7,446 of 10,000;
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
 *   - q8: decoupling, bursts, slow work off the request path (email,
 *     transcoding), at-least-once delivery and idempotent consumers, and
 *     totals that lag (the page's "trades immediate consistency for
 *     throughput and resilience"): the page. Counting clicks and the click ID
 *     are the video's own example. Recording the ID in the same transaction
 *     as the count is what makes the skip safe: a seen-ID set written apart
 *     from the count can lose a crash between the two writes, the gap the
 *     Data Engineer review found in its streaming video.
 *   - q9: the page's four algorithms, 429, "allows short bursts" (the burst
 *     of ten a full bucket passes, results.json), the leaky bucket's
 *     "smoothing output", "trade accuracy for cheapness". The trace is the video's own: a limit of ten
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
 *     the video's own round numbers; 1 + 5 = 6 reads. "Feeds are read far more
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
      text: "Now give it ten times the traffic, three hundred and fifty thousand a second, and every box has to answer for it.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Twelve questions: nine worked through on this diagram, two quick ones, and a news feed to close.",
      pauseAfter: 0.7,
    },

    // ── 1. Horizontal or vertical ─────────────────────────────────────────
    {
      id: "q1",
      scene: true,
      text: "Question one. Horizontal versus vertical scaling, which do you reach for? Vertical is a bigger machine: simple, but it has a ceiling, and it's still one machine that can fail.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-horiz",
      text: "Horizontal is more machines behind the load balancer: nearly unlimited, and redundant, but only if any server can handle any request. So keep the app tier stateless, with session state in a shared cache or database.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-ours",
      text: "These redirect servers already are, so ten times the traffic means more of them.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-headroom",
      text: "How many more? Enough that none runs near full. In the simplest queue model, a request waits one service time on average at fifty percent load, nine at ninety percent, and ninety-nine at ninety-nine.",
      pauseAfter: 0.9,
    },
    {
      id: "q1-buy",
      text: "Headroom is what the extra servers buy.",
      pauseAfter: 0.8,
    },
    {
      id: "q1-db",
      text: "Vertical still has its place: the database holds the state, so it usually scales up first, until it nears that ceiling.",
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
      text: "Round-robin deals them in turn. Least-connections picks the server with the fewest open connections, which copes with slow requests. Consistent hashing sends a key to the same server every time, for servers that cache their own hot links.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-health",
      text: "And health checks pull a dead server out of rotation, which is what makes a pool of stateless servers highly available.",
      pauseAfter: 0.7,
    },
    {
      id: "q2-mod",
      text: "Why consistent? Simulate ten thousand short keys on three servers, by hash modulo three. Add a fourth, switch to modulo four, and seventy-four percent of the keys move, each one to a cold cache.",
      pauseAfter: 0.7,
    },
    {
      id: "q2-ring",
      text: "On a hash ring, with a hundred points a server, only twenty-three percent move, all of them to the new server.",
      pauseAfter: 0.7,
    },
    {
      id: "q2-clock",
      text: "Each key belongs to the next point clockwise, so a new server's points take only the keys just before them.",
      pauseAfter: 0.8,
    },

    // ── 3. Cache-aside ────────────────────────────────────────────────────
    {
      id: "q3",
      scene: true,
      text: "Question three. Explain the cache-aside pattern. On a read, the app checks the cache. On a miss, it reads the database, writes the value into the cache, and returns it. A write updates the database and invalidates the cached copy.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-props",
      text: "Only what's asked for gets cached, and a cache failure falls through to the database, but every key's first request pays the miss.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-sim",
      text: "Simulate two million redirects over a million links, where a few links get most of the clicks. A cache holding a thousandth of the links answers forty percent. A hundredth, fifty-eight. A tenth, seventy-seven.",
      pauseAfter: 0.8,
    },
    {
      id: "q3-loss",
      text: "And the better it works, the harder losing it lands: a dead cache multiplies the database's reads by two point four at fifty-eight percent, and by more than four at seventy-seven. So the cache needs replicas too.",
      pauseAfter: 0.8,
    },

    // ── 4. Invalidation ───────────────────────────────────────────────────
    {
      id: "q4",
      scene: true,
      text: "Question four. Why is cache invalidation hard? Because there are two copies of the truth, and they drift. Set the TTL, the time to live, too long and users see stale data; too short and you lose the cache's benefit.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-model",
      text: "Take a simple model: a key read about once a second and changed every two minutes.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-cross",
      text: "The least bad TTL is where the two failures cross, about fifteen seconds, and even there six percent of reads miss and six percent are stale.",
      pauseAfter: 0.9,
    },
    {
      id: "q4-ours",
      text: "A short link barely changes, so its TTL can be long, until one is taken down for abuse. Then delete its cached entry after the database commits. Delete it first, and a read in between puts the old value back.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-backstop",
      text: "Even then, a slow read can race the delete, so the TTL stays as a backstop: it bounds how long a wrong value lives.",
      pauseAfter: 0.7,
    },
    {
      id: "q4-write",
      text: "Write-through updates both together, consistent at a cost on every write. Write-behind batches writes for speed, and a crash loses what it hadn't written.",
      pauseAfter: 0.8,
    },

    // ── 5. Replication ────────────────────────────────────────────────────
    {
      id: "q5",
      scene: true,
      text: "Question five. What is database replication, and what does it buy you? Copies of the data on several nodes. In leader-follower replication, writes go to the leader and stream to read-only followers. That scales reads, and if the leader dies, a follower is promoted.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-lag",
      text: "The catch is replication lag. Someone creates a link and opens it at once, and the read lands on a follower that hasn't caught up: not found.",
      pauseAfter: 0.8,
    },
    {
      id: "q5-fix",
      text: "So for a short while after a user writes, send their reads to the leader. And with asynchronous replication, promoting a lagging follower loses the writes it never received.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-sync",
      text: "Semi-synchronous replication fixes that: each write waits until one follower has it, so promoting that follower loses nothing, but every write is slower.",
      pauseAfter: 0.8,
    },

    // ── 6. Sharding ───────────────────────────────────────────────────────
    {
      id: "q6",
      scene: true,
      text: "Question six. What is sharding, and how does it differ from partitioning? Partitioning splits one large table into pieces. Sharding puts the pieces on separate database servers, by a shard key, to scale writes and storage past one machine.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-key",
      text: "Shard by creation date, and today's shard takes every new link: a hot spot. Shard by a hash of the short key, and in a simulation, a million keys land on eight shards within one percent of an eighth each.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-ring",
      text: "Add a ninth shard and modulo moves eighty-nine percent of the keys; a hash ring, as in question two, moves thirteen percent.",
      pauseAfter: 0.8,
    },
    {
      id: "q6-cost",
      text: "A redirect touches one shard, but listing one user's links asks all eight: cross-shard queries are the price. Keep a second copy keyed by user for that page.",
      pauseAfter: 0.8,
    },

    // ── 7. CAP ────────────────────────────────────────────────────────────
    {
      id: "q7",
      scene: true,
      text: "Question seven. Explain the CAP theorem. During a network partition, a distributed system can't be both consistent, every read seeing the latest write, and available, every working node still answering. So each side either refuses, or answers and risks stale data.",
      pauseAfter: 0.7,
    },
    {
      id: "q7-ours",
      text: "It's a choice per operation, not a label for the database. A redirect answers from whatever copy it reaches; at worst, a brand-new link isn't found yet, or one just taken down still works. New keys can be minted on both sides, if each server draws from its own block of IDs. But a custom alias must be unique, so the side without a majority refuses it.",
      pauseAfter: 0.8,
    },
    {
      id: "q7-pacelc",
      text: "And on a healthy network, waiting for replicas to confirm a write still trades latency for consistency: the second half of PACELC.",
      pauseAfter: 0.8,
    },

    // ── 8. Message queues ─────────────────────────────────────────────────
    {
      id: "q8",
      scene: true,
      text: "Question eight. When do you introduce a message queue? When work doesn't need to finish inside the request. Counting clicks in the database makes every redirect wait on a write, and sends a viral link's whole spike there.",
      pauseAfter: 0.6,
    },
    {
      id: "q8-queue",
      text: "Queue each click instead. The redirect returns at once, workers drain the queue at their own pace, and a burst just makes it longer. Slow work, like email or video transcoding, goes the same way.",
      pauseAfter: 0.6,
    },
    {
      id: "q8-once",
      text: "The price is at-least-once delivery: a worker that crashes before acknowledging gets the click again. So make the consumer idempotent: give each click an ID, and record the ID in the same transaction that adds to the count, so a repeat changes nothing. The totals now run a little behind.",
      pauseAfter: 0.8,
    },

    // ── 9. Rate limiting ──────────────────────────────────────────────────
    {
      id: "q9",
      scene: true,
      text: "Question nine. How does rate limiting work? It caps a client's requests per window, to protect the system and keep it fair. Say ten new links a minute, and one client sends ten at fifty-nine seconds, then ten at sixty-one.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-fixed",
      text: "A fixed-window counter resets on the minute, so all twenty get through: twice the limit, for one cheap counter.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-sliding",
      text: "A sliding-window counter weighs in the minute before and refuses the second ten, though it's an estimate that assumes requests were evenly spread.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-token",
      text: "A token bucket holds ten tokens and refills one every six seconds. Each request spends one, so a client that's been quiet can burst ten at once, and an empty bucket answers HTTP four twenty-nine, too many requests. Here the first burst empties it, and the second is refused.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-leaky",
      text: "A leaky bucket queues requests and lets them out at a constant rate, one every six seconds, so the servers behind it see a smooth stream, and a burst waits its turn.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-full",
      text: "Once its queue of ten is full, the rest are refused.",
      pauseAfter: 1.4,
    },
    {
      id: "q9-shared",
      text: "The follow-up is where the count lives. With four app servers, each keeping its own bucket, round-robin hands one client four buckets: four times the limit. The count belongs in a store they all share.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-atomic",
      text: "There, the check and the spend must be one atomic step, or two servers both take the last token.",
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
      text: "When a cache fills, LRU, least recently used, drops the entry untouched longest: a good default. LFU, least frequently used, keeps popular keys through a quiet spell. First in, first out evicts in insertion order, used or not. And a TTL expires entries on a timer, bounding staleness whatever the memory pressure. Most systems pair LRU with a TTL.",
      pauseAfter: 0.7,
    },
    {
      id: "r-consist",
      text: "And the consistency models to know. Strong: every read reflects the latest write. Eventual: replicas converge once writes stop, and a read can be stale meanwhile. Between them, read-your-writes, the fix from question five, and monotonic reads, where you never see time go backwards. A feed can be eventual; a bank balance usually needs strong.",
      pauseAfter: 0.9,
    },

    // ── 12. The news feed ─────────────────────────────────────────────────
    {
      id: "q12",
      scene: true,
      text: "Question twelve. Design a news feed: fan-out on write, or on read? Fan-out on write, or push, copies each new post's ID into every follower's precomputed feed, so reading one is a cheap lookup.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-storm",
      text: "Its cost is per follower: two hundred followers, two hundred writes. A celebrity with fifty million followers makes fifty million writes from one post: a write storm.",
      pauseAfter: 0.8,
    },
    {
      id: "q12-pull",
      text: "Fan-out on read, or pull, builds the feed on request from everyone you follow. Posting is cheap, but follow three hundred accounts and every load reads three hundred timelines.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-why",
      text: "Feeds are read far more often than people post, so push usually wins:",
      pauseAfter: 0.55,
    },
    {
      id: "q12-pays",
      text: "it pays its writes once, when someone posts, and pull pays its reads on every load.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-hybrid",
      text: "So real systems mix them: push for ordinary accounts, pull for celebrities, merged at read time. Follow five celebrities, and a load is six reads, not three hundred, and no post costs fifty million writes.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "That's the design, grown for ten times the traffic.",
      pauseAfter: 0.7,
    },
    {
      id: "next-api",
      text: "Every box in it talks to the others through an API. Next: API design.",
    },
  ],
};
