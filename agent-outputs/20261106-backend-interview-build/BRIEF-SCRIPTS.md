# Backend / Software Engineer interview videos: phase 1 brief (scripts and facts)

You are writing the **narration scripts and their facts** for two of the ten
Backend / Software Engineer interview videos, in the Remotion package at
`/home/user/dataslope/video`. This phase writes **no scenes, renders
nothing and voices nothing**: the owner reads the scripts before anything
is built on them or voiced. Four other writers work alongside you, each on
their own pair. The coordinator commits; you never do.

## Read first

1. **The plan**, `agent-outputs/20261106-backend-interview-video-plan.md`, all
   of it: what the series is for (decisions and trade-offs, **never coding
   syntax**: interviews are moving away from writing code from scratch now
   that assistants write it), the parts, "Which video answers which
   question" (the exact questions that are yours), "How the videos join up"
   (your opening and your bridge), and your budget in characters.
2. **`video/README.md`**: "Narration and timing", initialisms for the voice,
   scene gaps, bridges, and the prose rules (no em dashes, no filler, numbers
   as they are said).
3. **Your source pages**, `content/interview/backend-engineer/<page>.mdx`:
   every answer you own.
4. **Finished scripts of the same shape, read in full before you write**:
   `src/videos/de-interview/script.ts` for the overview,
   `src/videos/de-pipelines/script.ts` and `src/videos/ds-llm-evaluation/script.ts`
   for videos of mechanisms, `src/videos/de-sql-performance/script.ts` (and
   its `check.mjs`, `results.json`, `data.ts`) for a video whose numbers come
   from runs. Copy their header style, beat shape (`id`, `scene: true` on a
   scene's first beat, `pauseAfter`), `voice: "drew"`, `minPause:
   COURSE_MIN_PAUSE`, and how a deep dive reads its question aloud ("Question
   three." then the question in the page's words) before answering it.
5. What the earlier reviews found most often, so the scripts start right:
   `agent-outputs/20261105-1900-de-interview-video-review.md` and
   `agent-outputs/20261029-1040-ds-interview-video-review.md`.

## What to write, per video

Create `video/src/videos/<folder>/` with:

- **`script.ts`**: `export const script: NarrationScript`. The header lists
  every question you answer (by the page's heading; deep dives numbered, the
  rapid round listed), what is on screen for each beat in a line or two (the
  figure that phase 2 will build: what it shows, what is highlighted when),
  and every fact with its source. Deep dives first, about 30 to 60 seconds
  each, each ending **one step past the question** (the trade-off, the
  failure mode, the follow-up an interviewer asks next); then a rapid round
  of one-line answers (numbers on screen only). Open fresh, close on the
  plan's bridge ("Next: …"). The overview has no question cards.
- **Facts**, where a number, table, plan, error or output appears: a
  `check.mjs` that computes or runs it and writes `results.json`, read by a
  `data.ts`. SQL runs in the site's Postgres (PGlite, through
  `scripts/lib/sql-engines.mjs`, as `de-sql-performance` does) for indexes,
  plans, transactions and isolation; DuckDB-Wasm only where Postgres can't.
  Python runs where the DE videos ran it (see `de-python/check.mjs`).
  Back-of-the-envelope estimates are arithmetic in `check.mjs` from stated
  assumptions, said aloud as assumptions. Load balancers, caches, queues,
  replicas, rate limiters, LLM APIs and concurrent schedules do not run here:
  draw the mechanism, and where a number helps, compute it with a small
  **seeded** simulation that the narration calls a simulation ("model it
  with…"). Never present a number as a real system's output, never invent a
  benchmark, and never quote a price or a vendor fact the page does not
  give. If the page is wrong, follow the facts and report it; do not edit
  `content/`.
- A short **`illustrations.json`** with the video's hero (the creature in
  the plan's table, one large simple watercolor figure, as
  `src/videos/de-interview/illustrations.json` words its meerkat) and two to
  six small `video-icon` spot subjects the narration names (objects, no
  text). Copy the file shape from `de-interview`, including `meta`. Do not
  generate them; phase 2 does.

## Rules for the narration

- **No syntax.** Code appears only where reading it is the skill (Part 7's
  diff, and at most a few lines elsewhere when a question is about what code
  does). Never walk through an implementation line by line; argue the
  decision.
- **Initialisms are written as people write them** (SQL, API, REST, HTTP,
  JSON, ACID, CAP, GIL, JWT, CDN, LRU, TTL, QPS, LLM). The voice reads plain
  caps letter by letter unless `src/narration/lexicon.ts` says it as a word;
  SQL and DAG are already there. List in your report every initialism your
  scripts say that people say **as a word** (REST "rest", ACID "acid",
  SOLID "solid", CRUD "crud", GIL "gil", NoSQL "no sequel", JSON "jay-son",
  CAP "cap"), so the coordinator adds them before voicing. Do not edit
  `lexicon.ts`. Expand an initialism only where a beginner may not know it,
  the first time it is said.
- Product names (Postgres, Redis, Kafka, nginx) are glossed in three to six
  words the first time one matters, and never treated as running here.
- **Characters** within ±20% of your plan figure and under 9,500;
  `npm run narrate -- <folder> --dry-run` prints the count once
  `src/Root.tsx` registers the video, which it does not yet, so count the
  beats' text yourself (a one-line `node -e` over your `script.ts` is fine).
- **Pacing**: content beats at about 2.1 to 3.0 words a second; `pauseAfter`
  0.6 to 1.0 s after a beat that defines a term or lands a result.
- Prose: no em dashes, no filler, numbers as they are said ("forty-five
  dollars"), every fact checked against the page and a run.

## What you own, and what you must not touch

Create and edit only `video/src/videos/<your folders>/` and files under
`video/out/` whose names start with your composition ids. Never edit
`src/Root.tsx`, `src/editorial/`, `src/components/`, `src/narration/`,
`scripts/`, the README, `package.json`, any other video's folder, or
anything in `content/`. Never run `git commit`, `git push`, `git stash`,
`git checkout`, `git reset`, `git clean`, `npm install` or `npm ci`. No
renders and no `npm run check:*` that renders: disk is tight and other
agents are rendering.

Checks you can run: `npx tsc --noEmit 2>&1 | grep "src/videos/<folder>/"`,
`npx eslint src/videos/<folder>`, and your `check.mjs`.

## When done

Return, for each of your two videos (under 50 lines each):

- Characters (deep dives, rapid round, total) and beats.
- Every question answered, deep or rapid, by the page's heading, and any
  you did not answer and why.
- Each fact and where it comes from (which run, which page line).
- The initialisms said as words, for the lexicon.
- Anything the page gets wrong, with the evidence.
