# Backend / Software Engineer interview prep: video series plan

**Status:** approved by the owner 2026-11-06: the ten parts, leaving out
the Python fundamentals page, and about 16,000 ElevenLabs credits for
narration once the scripts are approved. Phase 1 (scripts and facts) is
under way; see "Build" below.

## What the series is for

The owner's direction: the series should **not teach coding syntax**.
Interviews are moving away from writing code from scratch because AI
assistants write it; the rounds that are growing are design discussion,
reading and debugging unfamiliar code, and judging what an assistant wrote.
So every video argues about **decisions and trade-offs**, with code on screen
only where reading it is the skill being tested (part 7).

The source is the site's track, `content/interview/backend-engineer/`
(nine pages, about 21,000 words). Every claim and number in a video comes
from those pages or from a run, as for the other three interview series.
The Python fundamentals page is the one left out: it is the syntax page
(`is` vs `==`, `*args`, dunders), the thing the owner asked the series not
to be. Its one design question, the GIL, is covered in Concurrency.

## The parts

Ten videos, about nine minutes each (the Data Engineer series runs 9:11 on
average). Composition ids `BackendEngineer-<n>-<Name>`, folders `be-*`, in a
`Backend-Engineer` Studio folder, merged for YouTube like the other tracks.

| # | Video | Source page | The argument |
| --- | --- | --- | --- |
| 0 | The interview, now | index | What the rounds test today, the two kinds of AI round (allowed and banned), fewer take-homes, more "why?" follow-ups. The map of the series. |
| 1 | Approaching system design | system-design | Requirements first, back-of-the-envelope numbers (QPS, storage, bandwidth), a first box diagram, then where it breaks. Worked through on the URL shortener. |
| 2 | Scaling a design | system-design | Load balancing, vertical vs horizontal, cache-aside and invalidation, replication, sharding, queues, rate limiting, CAP and the consistency you actually need. The news-feed fan-out question as the close. |
| 3 | API design | api-design | Resources and methods, status codes (401 vs 403), idempotency and retries, pagination, versioning, errors, auth (sessions, JWT, OAuth), REST vs GraphQL vs gRPC. |
| 4 | Databases | databases | Indexes and when they hurt, composite order, reading a plan, transactions and isolation anomalies, optimistic vs pessimistic locking, SQL vs NoSQL, the join that inflates a SUM. |
| 5 | Concurrency | concurrency | Concurrency vs parallelism, the race on a counter, locks, the four deadlock conditions, the event loop and the blocking call inside a coroutine, choosing threads, processes or async (and the GIL). |
| 6 | Designing objects | object-oriented-design | Coupling and cohesion, composition over inheritance, SOLID in plain terms (Liskov and dependency inversion with one example each), Strategy, Observer and when a pattern is over-engineering. |
| 7 | Reading and reviewing code | ai-assisted-coding | The comprehension and debugging round, the bugs assistants characteristically write, and how to review a diff you did not write. The one video where code is on screen, to be read, not typed. |
| 8 | Algorithms as reasoning | algorithms | Big-O as the argument for a design, choosing the structure (hash map, heap, stack, deque), BFS vs DFS, why a brute force is fine until it isn't. Complexity, never syntax. |
| 9 | The AI-allowed round | ai-assisted-coding | What interviewers grade when you have an assistant, how to spend the hour, prompting and verifying, and LLM features in system design: streaming, retries, cost in tokens, prompt injection. |

Each follows the house interview format the other three series use
(`src/editorial/interview.tsx`): a question on screen, the answer argued
through figures, a rapid-fire round of the page's shorter questions, and a
"Next" line into the following part.

## Look

The editorial style every video uses (white page, numbered figures, ink
wipes, watercolor spot art), with the owner's two newest rules from the
start: **one size and one family per line** (emphasis by color, weight or a
highlight) and **as many small spot images as the whitespace allows**. A
recurring animal for the track's overview and thumbnail, like the Data
Engineer meerkat, drawn on GPT Image 2.6 (low, transparent), about $0.02 an
image. Thumbnails use the green interview scheme.

## Narration and cost

- **Voice:** Drew, as for every other interview series.
- **Length:** the Data Engineer series is 88,433 characters for 12 videos,
  about 7,400 each. Ten at that length is about **74,000 characters**.
- **Credits:** at the 0.22 credits a character measured on the Data
  Engineer fixes, about **16,000 ElevenLabs credits**, plus a few hundred
  for redos after review. Images: about 100 at $0.02, roughly $2.
- Scripts and scenes can be built and checked on estimated timing before any
  audio exists, so the spend can wait until the scripts are approved.

## How it gets built

1. Scripts first, one per part, checked against the pages (facts, numbers
   from runs, no em dashes, initialisms through the lexicon). The owner
   reads them before anything is voiced.
2. Scenes, one agent per video, each on a private entry so the others can be
   mid-edit; the lead registers them in `Root.tsx`.
3. Voice (after approval), then `check:sync`, `check:mix`, `check:motion`,
   `check:frames`, and the same independent review the Data Engineer series
   had (one reviewer per video, then fixes).

## Questions for the owner

1. The ten parts above, or a different cut (for example, one system design
   video instead of two)?
2. Leave out the Python fundamentals page, as proposed?
3. Approve about 16,000 ElevenLabs credits for narration once the scripts
   are approved?

## Build

### Ids, folders, heroes, budgets

Every video's hero is a creature no earlier video drew (checked against
every `illustrations.json`). The overview's capybara is also the track's
YouTube thumbnail animal.

| # | Composition | Folder | Hero | Characters (cap 9,500) |
| --- | --- | --- | --- | --- |
| 0 | BackendEngineer-0-Interview | be-interview | capybara | ~2,000 |
| 1 | BackendEngineer-1-SystemDesign | be-system-design | crow | ~6,500 |
| 2 | BackendEngineer-2-Scaling | be-scaling | bison | ~8,000 |
| 3 | BackendEngineer-3-ApiDesign | be-api-design | puffin | ~8,000 |
| 4 | BackendEngineer-4-Databases | be-databases | chipmunk | ~8,000 |
| 5 | BackendEngineer-5-Concurrency | be-concurrency | hummingbird | ~8,000 |
| 6 | BackendEngineer-6-ObjectDesign | be-object-design | armadillo | ~7,500 |
| 7 | BackendEngineer-7-CodeReview | be-code-review | lynx | ~6,500 |
| 8 | BackendEngineer-8-Algorithms | be-algorithms | pangolin | ~9,300 |
| 9 | BackendEngineer-9-AiRound | be-ai-round | lemur | ~7,500 |
| | | | **Total** | **~71,000** |

### Which video answers which question

Each of the pages' questions is answered once, by its heading. 127 are asked
on the seven pages kept; 126 are answered (two near-identical SQL vs NoSQL
questions are answered together).

- **0, The interview, now:** the index page (what interviewers probe, how AI
  has changed the interview, the topics) and AI-assisted coding's "How have
  coding interviews changed since AI assistants became standard?". No
  question cards; a narrated overview, as `de-interview` is.
- **1, Approaching system design** (system-design, 5): "How do you approach
  an open-ended system design question?", "What back-of-the-envelope numbers
  should you estimate?", "Design a URL shortener at a high level.", "What is
  a single point of failure, and how do you remove one?", "What is a CDN and
  when do you use one?".
- **2, Scaling a design** (system-design, 12): load balancer; horizontal vs
  vertical; cache-aside; eviction policies; cache invalidation; replication;
  sharding vs partitioning; CAP; consistency models; message queues; "How
  does rate limiting work?" (the algorithms: token bucket and its kin); "Design
  a news feed, fan-out on write or on read?".
- **3, API design** (api-design, all 16). Its rate-limiting question is
  answered from the client's side (429, the limit headers, backing off) and
  points at Part 2 for the algorithms.
- **4, Databases** (databases, all 16, plus system-design's "SQL or NoSQL at
  scale, how do you choose?", answered together with "SQL vs NoSQL, when do
  you pick each?"). Its deadlock question is answered from the database's
  side (lock order across transactions, the detector that aborts one, retry).
- **5, Concurrency** (concurrency, all 16, the GIL included; the four
  deadlock conditions and prevention are answered here in general).
- **6, Designing objects** (object-oriented-design, all 15).
- **7, Reading and reviewing code** (ai-assisted-coding, 3): "What kinds of
  bugs do AI assistants characteristically introduce?", "How do you review
  code an assistant wrote?", "What happens in a code comprehension or
  debugging round?". Built around one worked example: a short diff an
  assistant wrote, read and reviewed on screen.
- **8, Algorithms as reasoning** (algorithms, all 35): about eight deep dives
  on choosing a structure and arguing complexity, then the rest in rapid
  rounds of one-line answers. Never syntax: no line-by-line implementations.
- **9, The AI-allowed round** (ai-assisted-coding, 7): what interviewers
  grade; the 60 minutes; a good prompt; designing a feature that calls an LLM
  API; estimating its cost; prompt injection; "How do you use AI tools in your
  day-to-day work?".

### How the videos join up

- **0 → 1:** the round that grew while coding rounds shrank is design.
- **1 → 2:** the first diagram works; now ten times the traffic.
- **2 → 3:** every box in it talks to the others through an API.
- **3 → 4:** behind the API, the data has to live somewhere.
- **4 → 5:** many requests arrive at once.
- **5 → 6:** code that has to keep changing without breaking.
- **6 → 7:** most of the code you will be asked about, you did not write.
- **7 → 8:** reading code includes judging what it costs.
- **8 → 9:** and when an assistant writes it with you.
- **9** closes the series.

### Phases

1. **Scripts and facts** (no scenes, no renders, no voice): five writers,
   one per pair of videos that share a page (0 and 8, 1 and 2, 3 and 4, 5
   and 6, 7 and 9), to `20261106-backend-interview-build/BRIEF-SCRIPTS.md`.
   The owner reads the scripts.
2. **Scenes** on estimated timing, one builder per video, once the
   typography pass frees render capacity.
3. **Voice**, then the checks and an independent review, as the Data
   Engineer series had.

### Said as words (for `src/narration/lexicon.ts`, before voicing)

Collected from the writers' reports; added to the lexicon, and existing
beats that say them checked for re-voicing cost, before phase 3.

- Part 7: ASCII ("ask-ee").
- Part 9: OWASP ("oh-wasp"), METR ("meter").
- Part 2: CAP ("cap"), PACELC ("pass-elk"). Part 1 says none as a word.
- Parts 5 and 6: GIL ("gil"), SOLID ("solid"), YAGNI ("yag-nee"). Read
  letter by letter as intended: CPU, IO, HTTP, OOP, UI, CSV (confirm the
  voice spells IO out in "IO-bound").

### What the writers found on the pages

All four fixed in `content/` on 2026-11-06, at the owner's request ("fix any
content issues you identify in the site while creating the videos").

- **ai-assisted-coding, the cost block:** "Here input dominates", but input
  is $2,000 of $3,500 (57%), and per token output costs five times as much.
- **ai-assisted-coding, the better prompt:** asks for a test of "a request
  exactly 60 seconds after the first" without saying whether it should be
  allowed, which leaves the edge case to the assistant.
- **object-oriented-design, encapsulation:** says `BankAccount` "rejects
  invalid operations, so no caller can push it negative", but run,
  `BankAccount(-50)` opens at -50 and `withdraw(-30)` takes 100 to 130. The
  challenge version also accepts a negative opening balance.
- **concurrency, concept check 2:** its explanation is right (`+=` is not
  atomic), but on current CPython that exact loop came out at exactly
  2,000,000 in 5 of 5 runs; one function call between the read and the
  write gave 1.31 to 1.77 million. "Can be less than two million" would be
  accurate. The page also never mentions free-threaded CPython (supported
  in 3.14).
