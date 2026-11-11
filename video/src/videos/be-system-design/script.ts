import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Approaching system design" (16:9), Part 1 of the Backend /
 * Software Engineer interview prep videos
 * (agent-outputs/20261106-backend-interview-video-plan.md), after
 * content/interview/backend-engineer/system-design.mdx. It answers the five
 * of the page's questions the plan keeps here, all worked through, numbered
 * aloud and read in the page's words, on one design carried through all
 * five. No rapid round: the plan gives this part no short questions, and
 * every one of the five builds the design the next one needs.
 *
 *   1. "How do you approach an open-ended system design question?" ("q1").
 *   2. "What back-of-the-envelope numbers should you estimate?" ("q2").
 *   3. "Design a URL shortener at a high level." ("q3").
 *   4. "What is a single point of failure, and how do you remove one?" ("q4").
 *   5. "What is a CDN and when do you use one?" ("q5").
 *
 * The page asks them in another order (CDN and the shortener near the end);
 * here they follow the method question one sets out, so the requirements and
 * the estimate are the shortener's own by the time question three draws it.
 * Part 2 (be-scaling) answers the page's other twelve questions except "SQL
 * or NoSQL at scale", which Part 4 answers with the databases page's twin.
 *
 * Opening and bridge. It opens on the prompt itself, and on the index page's
 * "more live design discussion with 'why?' follow-ups" (index.mdx, "How AI
 * has changed this interview"), the change that grew this round, without
 * pointing at Part 0, so it plays on its own. It closes on the plan's bridge
 * into Part 2: the first diagram works; now ten times the traffic.
 *
 * Reuse: none. No earlier interview video asks these questions. The
 * circuit-breaker figure is the page's chart, which Data Engineer Part 10
 * (de-orchestration) also redraws; this one is copied from the chart's own
 * source, not from that video.
 *
 * On screen, beat by beat (for phase 2; nothing is built yet). Colors keep the
 * series' meanings (interview.tsx): red the trap, green the right answer,
 * yellow what the narration points at, blue data.
 *   hook: the prompt as the headline, "Design a URL shortener.", with the crow
 *     hero on its signpost at the right; under it, two small cards, "Take-home
 *     projects" with a down arrow and "Live design, with 'why?'" with an up
 *     arrow (index.mdx), inked on "fewer" and "more". The chain-link spot.
 *   plan: five numbered chips along the bottom, one per question in a few
 *     words ("Start", "Estimate", "Diagram", "Failure", "Edge"), each lit on
 *     its word.
 *   q1: question card. A sketch of three boxes is drawn, then struck through
 *     in red on "Not by drawing boxes".
 *   q1-func, q1-nonfunc: two columns build, "Functional" (shorten a URL;
 *     redirect; custom aliases?; expiry?) and "Non-functional" (scale,
 *     latency, availability, consistency), each item inked on its word; the
 *     two question marks stay gray, as questions to ask.
 *   q1-steps: a five-step strip under the lists: requirements, estimate, API,
 *     high-level design, bottlenecks; each lights as it is said, the first
 *     four filled in, the last ("bottlenecks") left open.
 *   q1-why: the "Non-functional" column takes the yellow highlight on "shapes
 *     the design"; two small figures side by side, "1,000 users" and "1
 *     billion redirects a day", over the same two feature chips, each with
 *     what it takes in words ("one small server", "many servers, caches").
 *   q2: question card; three empty slots, "Requests per second (QPS)",
 *     "Storage", "Bandwidth", each filled by the beats below, "QPS" inked on
 *     its word. The envelope-and-pencil
 *     spot.
 *   q2-trick: "1,000,000 a day ÷ 86,400 s ≈ 12 a second", the rule the rest
 *     uses, boxed.
 *   q2-writes, q2-reads, q2-peak: a worked column, assumptions in gray
 *     italics with "assume" beside them, results in blue: 10,000,000 links a
 *     day → ≈ 120 writes/s; × 100 reads per write → 1,000,000,000 redirects a
 *     day → ≈ 12,000/s; × 3 at peak → ≈ 35,000/s, highlighted yellow.
 *   q2-storage, q2-band: 500 B × 10,000,000 = 5 GB a day → ≈ 9 TB in five
 *     years; 500 B × 35,000/s ≈ 17 MB/s. Both small beside the 35,000.
 *   q2-verdict: storage and bandwidth dim; "35,000 reads/s" and a "cache"
 *     chip stay lit.
 *   q2-cache: under the cache, "a whole day of new links: 5 GB, fits in one
 *     machine's memory" (results.json dayInMemoryBytes).
 *   q2-ladder: the page's latency ladder (memory-latency-ladder), redrawn as
 *     horizontal bars on a log axis from results.json; main memory, the SSD
 *     read and the in-data-center round trip lit in turn, with "×1,000" and
 *     "×5" between them.
 *   q2-tail, q2-fanout: the page's latency histogram (latency-percentiles),
 *     redrawn from results.json's bins, with the median, mean and p99 rules
 *     placed as said (labelled 24 ms, 31 ms, 286 ms; a "simulated sample"
 *     note). On "one request in a hundred" the bins from 100 ms on grow a
 *     hundred times taller, so the tail is seen, and the band is counted:
 *     401 requests, 294 of them past the chart's 320 ms edge (tailCount,
 *     offChart). Then a row of 100 small squares, one call each, and "1 − 0.99¹⁰⁰
 *     ≈ 63% of page loads hit at least one" on "sixty-three percent".
 *   q3: question card; the API as two plain cards, "create: long URL → key"
 *     and "redirect: key → long URL". No code, no HTTP syntax.
 *   q3-key: the 62 characters in three groups (a–z, A–Z, 0–9), then an ID
 *     encoded to its six-character key; "62⁶ ≈ 57 billion keys, over 15
 *     years at 10 million a day" (results.json keyLengths).
 *   q3-temp: a third column beside the API, "which kind": "temporary (302)"
 *     in green, "permanent (301): browsers keep it" in red.
 *   q3-hash: the alternative beside it: a long URL through a hash to a few
 *     characters; "taken?" (yellow) then "add a salt, hash again"; "store
 *     only if absent: no two servers claim one key" in green; and, in gray,
 *     the same long URL always gets the same key.
 *   q3-diagram: the page's diagram, drawn box by box as named: client, load
 *     balancer, two app servers, cache, key-value store (system-design.mdx's
 *     mermaid); "100 : 1" on the cache's arrow.
 *   q3-path: one redirect travels the diagram as a dot: load balancer to an
 *     app server, app server to the cache and back (two round trips, each
 *     "0.5 ms" from the ladder), "≈ 1 ms" in green; then a miss, the dot
 *     going on to the store, "+0.5 ms +0.1 ms (SSD) ≈ 1.6 ms".
 *   q3-counter, q3-blocks, q3-coord: a single "counter" box that both app
 *     servers call, ringed in red; each server takes its own block, "from
 *     9,876,000,001" and "from 9,877,000,001" (results.json blocks, so the
 *     first holds the counted IDs below), drawn green; the counter stays,
 *     plain, with dashed arrows out to each server: it hands out the blocks,
 *     asked once per 1,000,000 IDs, and a dead server leaves a gap.
 *   q3-guess: three consecutive IDs and their keys from results.json
 *     (counted), stacked so the keys visibly differ in one last character;
 *     red on "walk through".
 *   q3-edges: Question one's edges, under them: "Custom aliases: the same
 *     keys, stored only if free"; "Expiry: a column the redirect checks".
 *   q4: question card; the q3 diagram returns, and the load balancer, the
 *     cache and the store are ringed in red on their words. On "Lose the
 *     cache", the cache fades and every arrow it carried reroutes to the store.
 *   q4-fix: each ring is answered: a second load balancer drawn dashed
 *     (standby), a replica beside the store with a failover arrow, a replica
 *     beside the cache; then the whole diagram is copied into two zone
 *     outlines. Rings turn green as each is answered.
 *   q4-goal: the green diagram holds, with the line "no single machine's
 *     death causes an outage".
 *   q4-retry, q4-states, q4-close: the page's circuit-breaker chart
 *     (circuit-breaker-states), redrawn from results.json: error rate on top,
 *     load reaching the dependency below, the open and half-open bands shaded
 *     as said; the retry line (dashed) climbing to 300 against the 100 that
 *     callers offer, in red; the breaker's error rate falling to zero, in
 *     green, on "recovers". The breaker-switch spot.
 *   q4-how: four green lines beside the time axis: retry with backoff and
 *     jitter, under a small retry budget; while it's open, fail fast, or
 *     serve a cached answer.
 *   q5: question card; a world outline with an origin dot in Virginia and a
 *     user in Sydney. The globe spot.
 *   q5-light: the arc between them with "15,700 km ÷ 200 km/ms × 2 ≈ 157 ms",
 *     a floor, and beside it q3-path's "≈ 1 ms" inside the data center, drawn
 *     to the same scale (a sliver); then an edge dot beside the user, "under
 *     1 ms".
 *   q5-use, q5-dyn: three benefits as chips (latency, origin offload,
 *     spikes), then two columns: "at the edge" (images, JavaScript, CSS,
 *     video) and "to the origin" (user-specific responses, or a short time
 *     to live, glossed; even those save handshake round trips, in green).
 *   q5-redirect: a short-link redirect moves into the edge column; "The
 *     price" and its two red notes under it there, "not counted by you" and
 *     "a taken-down link still works", and a short timer that answers both,
 *     on "keep that time short".
 *   q5-win: the line "the cheapest large win for a read-heavy, global
 *     product", the page's words.
 *   next, next-10x: the whole design small and green, behind a green "edge";
 *     "sized for its estimate: 35,000 redirects a second" beside it stays,
 *     and a row of its own, "now ten times the traffic: 350,000 redirects a
 *     second", is marked yellow on "ten times"; <NextLine> "Next: scaling a
 *     design".
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs computes every number into results.json, which data.ts
 * reads, and fails if the narration's words stop matching them:
 *   - the method (q1): the page's answer, in its order (system-design.mdx,
 *     "How do you approach..."): clarify functional and non-functional
 *     requirements, capacity estimation, the API, a high-level design, then
 *     the bottlenecks; state assumptions out loud. The shortener's two
 *     features are the page's ("Generate a short unique key per long URL...
 *     redirect on lookup"); "custom aliases? links that expire?" are
 *     questions to ask, not facts.
 *   - the estimate (q2), arithmetic on the video's own assumptions, each
 *     said as one ("assume", "say", "take"): 10,000,000 new links a day; 100
 *     redirects a link (the page's "100:1 or more"); peak 3 times average
 *     (the page's "often 2–3x"); 500 bytes a link (the page's "a few hundred
 *     bytes per URL"); five years; 500 bytes a redirect response. A million a day is 11.6 a second (the
 *     page: "roughly 12"); writes 115.7 a second ("about a hundred and
 *     twenty"); a billion redirects a day, 11,574 a second ("about twelve
 *     thousand"); peak 34,722 ("about thirty-five thousand"); 5 GB a day,
 *     9.1 TB in five years; 17.4 MB/s at peak.
 *   - the ladder (q2): charts/memory-latency-ladder.mjs's LEVELS, read from
 *     its source: main memory 100 ns, an NVMe SSD read 100,000 ns (1,000
 *     times), a round trip inside one data center 500,000 ns (5 times the
 *     SSD read). That row was corrected from a 10 ms disk seek after the Data
 *     Engineer review; the chart now carries the data-center figure.
 *   - percentiles (q2): charts/latency-percentiles.mjs's sample, copied with
 *     its seed (40,000 draws, rng(4242)): median 24 ms, mean 31 ms, p99 286
 *     ms, checked against the chart's caption; "one request in a hundred":
 *     1.0% of the sample sits at or past the p99 (tailShare). "A hundred
 *     calls, each with that one-in-a-hundred chance ... at least one on
 *     sixty-three percent": 1 − 0.99^100 = 0.634, the chart caption's "more
 *     often than not", with each call independently in the slowest 1% (said
 *     aloud as that assumption).
 *   - the key (q3): 62^6 = 56.8 billion keys, 15.6 years at 3.65 billion
 *     links a year ("over fifteen"); five years is 18.25 billion. Base 62 of
 *     an auto-increment ID, or a hash: the page's two options. The cache, the
 *     key-value store and the stateless tier behind a load balancer: the
 *     page's answer and its diagram. One redirect, on the ladder: a cache
 *     hit is two in-data-center round trips (load balancer to app server,
 *     app server to cache), 2 × 0.5 = 1 ms; a miss adds a third and an SSD
 *     read, 1.5 + 0.1 = 1.6 ms. Network time only, as the ladder gives it;
 *     no server's processing time is claimed. ID blocks ("a million at a
 *     time", handed out by the counter "once per million IDs") and
 *     consecutive keys are the follow-up, shown on the video's own IDs
 *     (9,876,543,210 and the next two: aMoY42, aMoY43, aMoY44), which the
 *     first server's block (9,876,000,001 to 9,877,000,000) holds. A day of
 *     new links in memory: the 5 GB a day the estimate stores ("Even a whole
 *     day of new links is five gigabytes"). Temporary or permanent redirect,
 *     a salted rehash with a conditional write, custom aliases and expiry:
 *     the standard follow-ups, said as design choices, no vendor named.
 *   - single points of failure (q4): the page's answer (one database, one
 *     load balancer, one cache; active-passive pairs, replicated databases
 *     with failover, multiple app servers, several availability zones). The
 *     breaker: charts/circuit-breaker-states.mjs's simulation, copied with its
 *     seed (rng(7)) and checked against its caption: trips above 50% errors,
 *     open 12 s, probes with 10% of traffic, the first probe fails and the
 *     second closes it; the retry loop's offered load peaks at 300 against
 *     the 100 callers send, and its error rate ends at 0.98 ("never"), the
 *     breaker's at 0.025. "Retry with backoff and jitter, under a small
 *     budget, ... fail fast or serve a cached answer" is the standard advice
 *     for the retries that chart blames, said without a number.
 *   - distance (q5): light in fiber about 200 km a millisecond (c over a
 *     refractive index near 1.5); Sydney to Ashburn, Virginia, 15,674 km
 *     great-circle, so at least 157 ms round trip ("over a hundred times" the
 *     1 ms of q3-path); an edge server 50 km away, 0.5 ms ("under a
 *     millisecond"). A lower bound from physics, not a
 *     measurement of any network. What a CDN caches, what bypasses it, and
 *     "the cheapest large win": the page. That an edge-answered redirect is
 *     not counted and outlives a takedown until its time to live runs out
 *     follows from the page's "offloads traffic from your origin" and "short
 *     edge TTLs" (the edge may keep its own logs, so the narration says only
 *     that your servers can't count it); no vendor feature is named.
 *
 * Written for Drew's ear: initialisms in plain caps (URL, API, QPS, ID, SSD,
 * CDN, CSS), none said as a word, so nothing here needs the lexicon; "time to live" is
 * said in words, since TTL is new to a beginner and Part 2 expands it; no
 * sentence opens with "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "be-system-design",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Design a URL shortener. Prompts like this one are where interviews have grown: fewer take-home projects, and more live design discussion, where every choice gets asked why.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Five questions, and one design carried through all of them: how to start, what to estimate, the first diagram, what can take it down, and what goes in front of it.",
      pauseAfter: 0.7,
    },

    // ── 1. The approach ───────────────────────────────────────────────────
    {
      id: "q1",
      scene: true,
      text: "Question one. How do you approach an open-ended system design question? Not by drawing boxes. First, clarify the requirements, in two lists.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-func",
      text: "Functional: what the system must do. Shorten a long URL, and send anyone who opens the short one to the long one. Then ask about the edges: custom aliases? Links that expire?",
      pauseAfter: 0.6,
    },
    {
      id: "q1-nonfunc",
      text: "Non-functional: scale, latency, availability and consistency. Redirects must be fast and almost never fail, and a short link must never start pointing somewhere else.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-steps",
      text: "Then estimate the load, define the API, sketch a high-level design, and only then drill into the bottlenecks.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-why",
      text: "The second list is the one that shapes the design: the same two features, at a thousand users or at a billion redirects a day, are different systems. Say each assumption out loud, so the interviewer can correct it before you build on it.",
      pauseAfter: 0.8,
    },

    // ── 2. The numbers ────────────────────────────────────────────────────
    {
      id: "q2",
      scene: true,
      text: "Question two. What back-of-the-envelope numbers should you estimate? The ones that turn product scale into load: requests per second, or QPS, then storage and bandwidth.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-trick",
      text: "One trick does most of the work. A million requests a day is about twelve a second.",
      pauseAfter: 0.7,
    },
    {
      id: "q2-writes",
      text: "So assume ten million new links a day: about a hundred and twenty writes a second.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-reads",
      text: "Reads matter more. Most consumer systems are read-heavy, a hundred to one or more, so assume a hundred redirects per link: a billion a day, about twelve thousand a second.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-peak",
      text: "Size for the peak, not the average. Peaks often run two to three times higher, so take three: about thirty-five thousand redirects a second.",
      pauseAfter: 0.8,
    },
    {
      id: "q2-storage",
      text: "Storage: a few hundred bytes a link, say five hundred, is five gigabytes a day, about nine terabytes in five years.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-band",
      text: "Bandwidth: say half a kilobyte per redirect, and that peak is about seventeen megabytes a second.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-verdict",
      text: "Neither is hard. This system is decided by its read traffic, and by how much of it a cache can answer.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-cache",
      text: "Even a whole day of new links is five gigabytes, so the hot set fits in one machine's memory.",
      pauseAfter: 0.8,
    },
    {
      id: "q2-ladder",
      scene: true,
      text: "Then keep one picture in your head: what each level of memory and network costs. Main memory, a hundred nanoseconds. An SSD read, a thousand times that. A round trip inside the data center, five times more again. So count the network hops in a request before anything else.",
      pauseAfter: 0.8,
    },
    {
      id: "q2-tail",
      scene: true,
      text: "And quote latency as a percentile, never a mean. In a simulated sample of forty thousand requests, the median takes twenty-four milliseconds and the mean thirty-one, but one request in a hundred takes two hundred and eighty-six or more: the ninety-ninth percentile.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-fanout",
      text: "A page that makes a hundred calls, each with that one-in-a-hundred chance, hits at least one on sixty-three percent of loads.",
      pauseAfter: 0.9,
    },

    // ── 3. The URL shortener ──────────────────────────────────────────────
    {
      id: "q3",
      scene: true,
      text: "Question three. Design a URL shortener at a high level. Start from the API: one call takes a long URL and returns a short key, and the other takes the key and redirects.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-temp",
      text: "Make that redirect temporary. Browsers keep a permanent one, so later clicks never reach you: you can't count them, or take the link down.",
      pauseAfter: 0.7,
    },
    {
      id: "q3-key",
      text: "The key is base sixty-two: lowercase, uppercase and digits. Encode an auto-incrementing ID, and six characters hold fifty-seven billion links, over fifteen years at ten million a day.",
      pauseAfter: 0.7,
    },
    {
      id: "q3-hash",
      text: "Or hash the long URL and keep a few characters. If that key is taken, add a salt and hash again, and make the write conditional, so two servers can't both claim it.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-diagram",
      scene: true,
      text: "Store the mapping in a key-value store, since every lookup is by key. Put a cache in front of it, because reads outnumber writes a hundred to one. And keep the app servers stateless, behind a load balancer, so scaling out is just adding one.",
      pauseAfter: 1.2,
    },
    {
      id: "q3-path",
      text: "Follow one redirect through it. On a cache hit, that's two round trips inside the data center, about a millisecond by the ladder. A miss adds a third, to the store, and an SSD read: about one point six milliseconds.",
      pauseAfter: 1.4,
    },
    {
      id: "q3-counter",
      text: "The follow-up is the counter. One counter that every server asks is a bottleneck, and one more thing that can fail.",
      pauseAfter: 0.8,
    },
    {
      id: "q3-blocks",
      text: "Hand each server a block of IDs instead, say a million at a time, and it counts on its own.",
      pauseAfter: 0.7,
    },
    {
      id: "q3-coord",
      text: "The counter still hands out the blocks, but it's asked once per million IDs, and a server that dies just leaves a gap.",
      pauseAfter: 1.0,
    },
    {
      id: "q3-guess",
      text: "And counted IDs make consecutive keys, so anyone can walk through everyone's links. If that matters, scramble the ID before encoding it, or use the hash.",
      pauseAfter: 0.7,
    },
    {
      id: "q3-edges",
      text: "Custom aliases share the key space, stored only if free, and expiry is a column the redirect checks.",
      pauseAfter: 0.8,
    },

    // ── 4. Single points of failure ───────────────────────────────────────
    {
      id: "q4",
      scene: true,
      text: "Question four. What is a single point of failure, and how do you remove one? It's any component whose failure takes the system down. This diagram has three: one load balancer, one store, and one cache. Lose the cache, and every read lands on the store at once.",
      pauseAfter: 0.7,
    },
    {
      id: "q4-fix",
      text: "Remove each with redundancy. Run the load balancers as an active-passive pair, so a standby takes over when the active one dies. Replicate the store, with failover to a replica, and give the cache replicas too. Then spread it all across availability zones: separate data centers in one region.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-goal",
      text: "The goal: no single machine's death causes an outage.",
      pauseAfter: 0.8,
    },
    {
      id: "q4-retry",
      scene: true,
      text: "That's half the job. The other half is not burying a dependency that's already failing. Retries add load at the worst moment: in the page's simulation, they push it to three hundred requests a second, against a service that was failing at a hundred.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-states",
      text: "A circuit breaker stops that. When errors pass half, it opens, and sends nothing for twelve seconds. Then it lets a tenth of the traffic through as a probe. Here the first probe still fails, so it opens again; the second passes, and it closes.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-close",
      text: "Left alone, the service recovers. Under retries, it never does.",
      pauseAfter: 0.7,
    },
    {
      id: "q4-how",
      text: "So retry with backoff and jitter, under a small budget, and while the breaker is open, fail fast or serve a cached answer.",
      pauseAfter: 0.8,
    },

    // ── 5. CDNs ───────────────────────────────────────────────────────────
    {
      id: "q5",
      scene: true,
      text: "Question five. What is a CDN, and when do you use one? It's a content delivery network: edge servers close to your users, caching what your origin serves.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-light",
      text: "Distance sets a floor. Light in fiber covers about two hundred kilometers a millisecond, so a user in Sydney is at least a hundred and fifty-seven milliseconds, round trip, from a server in Virginia: over a hundred times the millisecond the redirect spends inside the data center. An edge server across town is under a millisecond away.",
      pauseAfter: 0.7,
    },
    {
      id: "q5-use",
      scene: true,
      text: "So it cuts latency, takes traffic off your origin, and absorbs spikes. Use it for anything static or cacheable: images, JavaScript, CSS and video.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-dyn",
      text: "Dynamic, user-specific responses usually bypass it, or get a short time to live: how long the edge may keep a copy. Even those save handshake round trips, since the connection ends at the edge.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-redirect",
      text: "A popular short link is the same redirect for everyone, so the edge can answer it too. The price: a click the edge answers never reaches your servers, so they can't count it, and a link you take down keeps working there until its time to live runs out. So keep that time short.",
      pauseAfter: 0.7,
    },
    {
      id: "q5-win",
      text: "For a read-heavy product with users everywhere, a CDN is the cheapest large win there is.",
      pauseAfter: 0.8,
    },
    {
      id: "next",
      scene: true,
      text: "That's a first design. It's sized for its estimate, and no single machine can take it down.",
      pauseAfter: 0.7,
    },
    {
      id: "next-10x",
      text: "Now give it ten times the traffic. Next: scaling a design.",
    },
  ],
};
