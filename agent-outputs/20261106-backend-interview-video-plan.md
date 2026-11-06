# Backend / Software Engineer interview prep: video series plan

**Status:** proposed, waiting on the owner for the part list and the
narration spend (below). Nothing is built or voiced yet.

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
