# Backend Engineer interview videos: review

**Reviewed:** the ten Backend Engineer interview prep videos,
`BackendEngineer-0-Interview` to `BackendEngineer-9-AiRound` (Drew), 1:32 in
all, as built in #725 and polished in #728, #730, #732 and #737 (the owner's
round of 2026-11-11, applied the same day). Their builders checked them with
`check:frames`, `check:motion`, `check:sync` and `check:mix`; this is their
first independent frame review.

**Result:** 158 findings: **3 P1**, 65 P2, 90 P3. Each video has its own
report in [`20261111-be-interview-video-review/`](20261111-be-interview-video-review/).
Every finding gives its time, beat, frame, cause (`file:line`) and a fix.

Severity is the same as in the earlier reviews:
- **P1:** a viewer is likely to misunderstand or learn something wrong, or the
  frame has an obvious defect.
- **P2:** noticeable, and it hurts the video.
- **P3:** polish.

| Video | Length | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| 0 The interview, now (overview) | 2:50 | 0 | 1 | 7 |
| 1 Approaching system design | 7:49 | 1 | 9 | 8 |
| 2 Scaling a design | 10:43 | 1 | 10 | 8 |
| 3 API design | 10:50 | 0 | 6 | 10 |
| 4 Databases | 11:06 | 0 | 9 | 10 |
| 5 Concurrency | 10:13 | 0 | 6 | 12 |
| 6 Designing objects | 9:32 | 0 | 5 | 7 |
| 7 Reading and reviewing code | 7:11 | 0 | 5 | 10 |
| 8 Algorithms as reasoning | 11:47 | 1 | 9 | 9 |
| 9 The AI-allowed round | 9:57 | 0 | 5 | 9 |
| **Total** | **1:31:57** | **3** | **65** | **90** |

## How it was reviewed

The Data Engineer review's method and tools, adapted only for the series
(`20261111-be-interview-video-review/tools/`, with `BRIEF.md` as each
reviewer's brief). One reviewer per video read the timeline, script, scene
code, `results.json` and the page in `content/interview/backend-engineer/`.

- **Frames once a second.** 5,522 frames at 1080p, rendered after the polish
  round and the Part 9 re-voice, so every report is of the videos as they are.
- **Contact sheets that drop repeats.** They kept 2,142 of the frames, on 182
  sheets.
- **A cap on full frames.** Each reviewer opened about 15 to 30.

The brief listed the owner's 2026-11-11 polish as deliberate (corner radii,
borderless nodes and blocks, the grey crack, one-decimal amounts, the Part 9
workflow art), so no reviewer asked for any of it back. Two findings do touch
that round's work and are noted below.

## What went right

- **Numbers.** In all ten videos every number checked matches `results.json`
  and the page. None of the P1s is a wrong measurement: all three are
  figures that say something other than the data behind them.
- **Layout.** Nothing is set under 19px, and almost nothing clips or
  collides. The few lines through labels are listed under 7.
- **Pacing.** Comfortable almost everywhere: content beats run at 2.0 to 3.0
  words a second, gaps are 0.55 s or more, and every scene holds 1.6 s or more
  before its cut. The fast spots are local (below).
- **The brief.** The videos argue decisions and trade-offs, as the owner
  asked. Several go past the page: Postgres's own read uncommitted and skip
  scan (Databases), the measured hash-ring move rates and cache loss
  multipliers (Scaling), the review that finds all three bugs the bug report
  missed (Code review), and the seeded jitter simulation (AI round).

## Series-wide problems

### 1. Answers stop one step before the follow-up

As in every earlier series, this is the commonest finding, in every video.
The answer is right but stops just before the question an interviewer asks
next. The main ones:

- **System design:** who hands out the ID blocks; what happens when a hashed
  key is taken (and the check-then-store race); 301 or 302; how to retry
  safely and what callers get while the breaker is open; how big the cache is
  (`check.mjs` computes 5 GB and nothing shows it).
- **Scaling:** delete-after-commit can still race; how to make failover lose
  nothing (semi-synchronous replication); what a ninth shard costs (the hash
  ring from Q2 is the answer, and is not connected); when vertical is right;
  the shared rate-limit count must be atomic.
- **API design:** what the racing idempotent retry gets back, and a reused key
  with a different body; the index a cursor needs; header and query
  versioning; OpenID Connect.
- **Databases:** what serializable adds once Postgres's repeatable read stops
  phantoms (write skew); what pessimistic locking costs; why an estimate gap
  matters, and that fresh statistics would not fix this one; "SQL can't scale
  writes".
- **Concurrency:** free-threaded CPython (3.13+, supported in 3.14), which the
  plan itself flagged; how the event loop learns a socket is ready; deadlock
  detection.
- **Object design:** which half of LSP the square breaks; "implement many,
  extend one"; Observer's failure isolation; DIP against dependency injection.
- **Code review:** the debugging round calls a still-broken fix "right" and
  never says it missed two bugs; whether the sort is worth its n log n.
- **Algorithms:** the Master Theorem's other two cases; what a BST is; when a
  hash map really hits O(n); the chain where DFS loses on memory.
- **AI round:** Question 7 names the parts of a concrete workflow and gives
  none; the jitter result has nothing to compare 115 against; the cost per
  request.

### 2. A figure that says the opposite of its own story

All three P1s are of this kind, and several P2s:

- **System design (P1):** the closing card ends saying the design was "sized
  for its estimate: 350,000 redirects a second". It was sized for 35,000, as
  Part 2 opens by saying; 350,000 is the tenfold traffic.
- **Scaling (P1):** the headroom chart clamps the curve flat at 20x, shades the
  steep 90 to 99% stretch as "Headroom: run where the wait is still flat", and
  draws the safe 50% point in the trap red.
- **Algorithms (P1):** two pointers ends "Returns (1, 3)" under cells holding
  the values 1 to 6. They are indices; they read as values that sum to 4.
- **Scaling:** the promoted "new leader" still says "read-only", with writes
  still flowing into the dead leader.
- **Object design:** the guarded constructor turns green while the balance
  still reads -50, "overdrawn already".
- **Concurrency:** "pass today, fail tomorrow" appears under the locked,
  already-fixed counter.
- **Code review:** "does what was asked" is ticked green on code the scene
  then shows failing three cases.
- **Overview:** the code comprehension round is labelled Part 9, then Part 7
  thirty seconds later (the page puts it in Part 7).
- **Algorithms:** "a shared bucket is more likely than not" over a grid where
  no bucket is shared; backtracking that never drops a branch; quicksort's
  20x zoom that makes 21 levels look like half of 999.

### 3. Correct statements struck through

- **AI round:** "Not whether working code exists at the end." is struck,
  though the narration says it as the answer.
- **Databases:** the standard's "possible" cells (dirty read at read
  uncommitted, phantom at repeatable read) are struck for "Postgres: no".
- **API design:** "log in again" struck inside "won't necessarily help".
- **Algorithms:** Dijkstra strikes the edge weight 4, which is still 4, not
  C's distance.

### 4. Wrong, briefly or in passing

Not P1, because each is on screen briefly or beside the right answer, but each
is a thing a viewer could repeat:

- **Concurrency:** compare-and-swap drawn as read, add and write fused into
  one instruction (that is fetch-and-add); processes "truly in parallel" as a
  general fact rather than CPython's.
- **Scaling:** monotonic reads placed above read-your-writes on one scale.
- **Databases:** "one day, in every run" (about one customer in nineteen has
  one); a "one day" query written as an open-ended range.
- **Algorithms:** a Python fix (`//`) for an overflow Python cannot have.
- **API design:** "the payload, decoded" leaves out `iat`.
- **Code review:** a contained-interval bug labelled "boundary".

### 5. Colors against the series' meanings

`interview.tsx` gives each color one meaning: red the trap, green the right
answer, yellow what the narration points at, blue data.

- **Red for things that are not faults:** a cache miss (System design), the
  safe 50% load point, the even hash spread recolored for one user's links,
  and the hook's question marks (Scaling).
- **Green for things that are not the answer:** the symptom patch, the
  SQL-injection string and half-open slots (Code review).
- **The right answer half-colored:** only the Square turns green in LSP's fix
  (Object design).
- **Yellow too pale to find:** the pointer marks in Algorithms' hook, heap and
  amortized scenes.

### 6. Payoffs and unread lines that leave too soon

- **A result shown for about a second before the clear:** "three after"
  (Object design), the rerun's ticks (Code review), "every Ada" (Databases),
  the struck parse line (API design), the 1.6 ms miss (System design).
- **Unread text in the quick rounds that fades at the next beat:**
  - Algorithms: the DP states, the trie's cost and the binary-search fix.
  - Databases: the foreign-key panel.
  - Scaling: the leaky bucket's refusals.
  - AI round: the jitter footnote.

### 7. Pages that wait, and lines through labels

- **Near-empty pages while the answer starts:**
  - API design: Question 8, about 11 s.
  - Scaling: cache-aside, and the start of invalidation.
  - Algorithms: BFS's definitions.
  - Concurrency: three stretches, including `gil-race`.
  - AI round: the lone provider box.
- **Lines through labels:**
  - System design: the great-circle arc through "edge".
  - Databases: the red ring through the code it circles; the retry arrow on
    BEGIN.
  - API design: the ticks on box borders; the "429"s under their heading.

### 8. Code on screen in a "never syntax" series

The AI round shows the cost estimate as a 13-line Python listing for about
34 s, and Concurrency puts five API calls on screen against its own header
("the only code on screen is the four bytecode instructions"). Part 7, where
reading code is the skill, and Part 4's query plans, which are evidence, are
not counted.

## Where the polish round shows up

Two findings sit next to the owner's 2026-11-11 changes; neither asks for the
change back:

- **AI round, Question 7:** the four watercolors and the spacing landed, but
  the columns themselves are still headings without content (#1 above).
- **Scaling, Question 5:** the follower boxes have their new padding, and the
  promoted one still says "read-only" (#2 above).

Also from today: the miss X now sits on the left app server's arrow (System
design), and that reviewer separately asks for the miss not to be red at all.

## The fixes

**Done**, the same day. One fixer per video worked to
[`tools/FIX-BRIEF.md`](20261111-be-interview-video-review/tools/FIX-BRIEF.md),
in order: P1s, then answers, then the other P2s, then P3s. Each fixer's report,
with every finding by number and what changed, is in
[`20261111-be-interview-video-review/fixes/`](20261111-be-interview-video-review/fixes/).

| Video | Findings | Characters voiced | Length before → after |
| --- | --- | --- | --- |
| 0 The interview, now | 8 fixed | 511 | 2:50 → 3:00 |
| 1 System design | 16 fixed, 1 in part, 1 moot | 928 | 7:49 → 8:47 |
| 2 Scaling | 19 fixed | 931 | 10:43 → 11:47 |
| 3 API design | 16 fixed | 405 | 10:50 → 11:17 |
| 4 Databases | 19 fixed | 922 | 11:06 → 12:09 |
| 5 Concurrency | 16 fixed, 2 in part | 891 | 10:13 → 10:58 |
| 6 Object design | 11 fixed, 1 in part | 654 (1,549 billed) | 9:32 → 10:17 |
| 7 Code review | 15 fixed | 564 | 7:11 → 7:46 |
| 8 Algorithms | 19 fixed | 668 | 11:47 → 12:42 |
| 9 AI round | 14 fixed | 713 | 9:57 → 10:50 |
| **Total** | **153 fixed, 4 in part, 1 moot** | **7,187 (8,082 billed)** | **1:31:57 → 1:39:31** |

- **Voice.** Each video stayed under its cap (1,000 characters, 600 for Part
  0). Beats were split at sentence breaks so only new sentences were voiced;
  every beat a fixer did not mean to change is byte-identical, and no take was
  re-recorded. Part 6 voiced nine split beats by mistake (895 characters),
  noticed, and cut them back from the kept takes for free, so the audio is
  right but those credits are spent. At about 0.22 credits a character the
  pass cost roughly 1,800 credits, inside the 2,000 the owner approved.
- **Values.** Every existing value in every `results.json` came back
  identical, except Part 4's one-day query, rewritten on purpose as a
  half-open range (the same 2,656 rows). New claims are measured, among them a
  cursor's index (100,001 rows scanned against 20), a ninth shard (89% of keys
  move by modulo, 13% on a ring), Python's sort on sorted input (999
  comparisons against 8,658), and the p99 tail's 401 requests.
- **Checks.** Each fixer passed typecheck, lint, `npm test`, `check:cues`,
  `check:motion`, `check:sync` (worst +0.05 s), `check:mix` and
  `check:frames` on its final code. With all ten in, the package passes
  typecheck, lint, `npm test` (79/79) and `check:cues`.
- **One owner decision kept over a finding.** Part 1's reviewer asked for the
  cache miss not to be marked in red, and its fixer replaced the red X with a
  label. The owner had placed that X at the centre of the miss arrow earlier
  the same day, so the X is back there, beside the fixer's "miss" label and
  grey cache. `check:frames` passes with it.
- **The owner's polish round is intact** in every video it touched.

**Left in part:**
- Part 1 #14: "1,000 users" against "redirects a day" still differ in unit.
  The server boxes are words now, but the narration needed 143 more P3
  characters.
- Part 5 #15: the hook's empty lower half needs a new figure.
- Part 5 #18: one fast clause in the race is left; cutting it is a paid
  re-voice.
- Part 6 #11(c): left on evidence. The cited frame caught a highlight
  mid-sweep, and the finished spacing is right.

**Shared changes:** none needed; no fixer touched a shared file.

