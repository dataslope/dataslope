# Analytics Engineer interview videos: phase 1 brief (scripts and facts)

You are writing the **narration scripts and their facts** for two of the ten
Analytics Engineer interview videos, in the Remotion package at
`/home/user/dataslope/video`. This phase writes **no scenes, renders
nothing and voices nothing**: the coordinator reads the scripts before
anything is built on them. Four other writers work alongside you, each on
their own pair. The coordinator commits; you never do.

## Read first

1. **The plan**, `agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md`,
   all of it: what the series is for (modeling decisions and their failure
   modes; code on screen only as evidence, short), the parts, "Which video
   answers which question" (the exact questions that are yours, by the
   page's heading), "How the videos join up" (your opening and your
   bridge), "Reuse", and your budget in characters.
2. **`video/README.md`**: "Narration and timing", initialisms for the voice,
   scene gaps, bridges, and the prose rules (no em dashes, no filler,
   numbers as they are said).
3. **Your source pages**, `content/interview/analytics-engineer/<page>.mdx`:
   every answer you own, read in full, code blocks included.
4. **Finished scripts of the same shape, read in full before you write**:
   `src/videos/be-interview/script.ts` and `src/videos/de-interview/script.ts`
   for the overview; `src/videos/de-dimensional-modeling/script.ts` and
   `src/videos/de-modeling-history/script.ts` (the closest topics);
   `src/videos/de-sql-patterns/script.ts` (SQL on screen) and
   `src/videos/de-sql-performance/script.ts` with its `check.mjs`,
   `results.json` and `data.ts` (numbers from runs). Copy their header
   style, beat shape (`id`, `scene: true` on a scene's first beat,
   `pauseAfter`), `voice: "drew"`, `minPause: COURSE_MIN_PAUSE`, and how a
   deep dive reads its question aloud ("Question three." then the question
   in the page's words) before answering it.
5. What reviews of earlier series found most often, so the scripts start
   right: `agent-outputs/20261111-1900-be-interview-video-review.md` (all
   of it: answers that stop one step before the follow-up; figures that
   say the opposite of their story; correct statements struck through) and
   `agent-outputs/20261105-1900-de-interview-video-review.md`.
6. **The overlap.** Several of your questions are near-identical to ones an
   earlier series answered (the plan's "Reuse"). Find them (`grep -rn` the
   question's key words over `src/videos/*/script.ts`) and read those beats
   and their `results.json`. Reuse a measured table or number where the
   question is the same, so the series agree; write your own words for
   this video's viewer, and never refer to the other video.

## What to write, per video

Create `video/src/videos/<folder>/` with:

- **`script.ts`**: `export const script: NarrationScript`, `id` equal to the
  folder name. The header lists every question you answer (by the page's
  heading; deep dives numbered, the rapid round listed), what is on screen
  for each beat in a line or two (the figure that phase 2 will build: what
  it shows, what is highlighted when), and every fact with its source.
  Deep dives first, about 30 to 60 seconds each, each ending **one step
  past the question** (the trade-off, the failure mode, the follow-up an
  interviewer asks next); then a rapid round of the shorter questions,
  one or two sentences each, read as "Question n." then the question, as
  the Data Engineer videos' quick rounds are. Choose the deep dives as the
  questions with a mechanism or a trap worth drawing. Open fresh (no
  "welcome", no "in this video"), close on the plan's bridge ("Next: …").
  The overview has no question cards.
- **Facts**, wherever a number, a table, a result set, a plan or an error
  appears: a `check.mjs` that computes or runs it and writes
  `results.json`, read by a `data.ts`. SQL runs in the site's Postgres
  (PGlite, through `../scripts/lib/sql-engines.mjs`, as
  `de-sql-performance/check.mjs` does), the engine the page itself runs;
  DuckDB-Wasm only where Postgres can't (`QUALIFY`, for one). Prefer the
  page's own tables and queries, run as written, so the video and the page
  show the same rows. dbt, Snowflake, BigQuery, Redshift, Looker and
  MetricFlow do not run here: draw the mechanism; where a dbt model's SQL
  matters, run the SQL it compiles to (the page usually shows it). Never
  present a number as a real system's output, never invent a benchmark,
  and never quote a price or a vendor fact the page does not give. If the
  page is wrong, follow the facts and report it; do not edit `content/`.
- A short **`illustrations.json`** with the video's hero (the creature in
  the plan's table, one large simple watercolor figure, worded the way
  `src/videos/be-interview/illustrations.json` words its capybara) and two
  to five small `video-icon` spot subjects the narration names (objects,
  no text, a few large simple forms). Copy the file shape from
  `be-interview`, including `meta`. Do not generate them; phase 2 does.

## Rules for the narration

- **Decisions, not syntax.** Code appears where reading it is the skill or
  the evidence: a short query or a dbt config on screen, highlighted where
  the narration points. Never walk an implementation line by line; say
  what it does and why it is the right choice, and what goes wrong without
  it.
- **Initialisms are written as people write them** (SQL, dbt, SCD, CTE,
  OLTP, OLAP, DAG, KPI, BI, YAML, JSON, LLM). The voice reads plain caps
  letter by letter unless `src/narration/lexicon.ts` says it as a word;
  SQL ("sequel"), DAG ("dag"), OLAP ("oh-lap") and JSON are already there,
  and YAML ("yammel") will be added. List in your report any other word
  your scripts say that people say as a word. Do not edit `lexicon.ts`.
  Expand an initialism only where a beginner may not know it, the first
  time it is said in that video (SCD, OLTP, CTE, DAG, BI: yes; SQL, dbt,
  AI: no). No sentence opens with "A" before an initialism.
- **SQL keywords in the narration are lowercase words** ("qualify",
  "merge", "row number", "group by", "select star"); the screen keeps
  their capitals.
- Product names (Snowflake, BigQuery, Redshift, Looker, MetricFlow) are
  glossed in three to six words the first time one matters, and never
  treated as running here.
- **Characters** within ±20% of your plan figure and under 9,500. Count
  the beats' text with a one-line `node -e` over your `script.ts`
  (`src/Root.tsx` does not register the video yet, so `npm run narrate --
  --dry-run` cannot).
- **Pacing**: content beats at about 2.1 to 3.0 words a second;
  `pauseAfter` 0.6 to 1.0 s after a beat that defines a term or lands a
  result.
- Prose: no em dashes, no filler, numbers as they are said ("forty-five
  dollars", "twelve rows"), years in digits; every fact checked against
  the page and a run.

## What you own, and what you must not touch

Create and edit only `video/src/videos/<your folders>/`. Never edit
`src/Root.tsx`, `src/editorial/`, `src/components/`, `src/narration/`,
`scripts/`, the README, `package.json`, any other video's folder, or
anything in `content/`. Never run `git commit`, `git push`, `git stash`,
`git checkout`, `git reset`, `git clean`, `npm install` or `npm ci`. No
renders and no `npm run check:*` that renders.

Checks you can run, from `video/`: `npx tsc --noEmit 2>&1 | grep
"src/videos/<folder>/"`, `npx eslint src/videos/<folder>`, and your
`check.mjs` (`node src/videos/<folder>/check.mjs`). The root's
`node_modules` is installed, so PGlite and DuckDB load.

## When done

Return, for each of your two videos (under 50 lines each):

- Characters (deep dives, rapid round, total) and beats.
- Every question answered, deep or rapid, by the page's heading, and any
  you did not answer and why.
- Each fact and where it comes from (which run, which page line), and what
  you reused from an earlier video.
- Words said as words, for the lexicon.
- Anything the page gets wrong, with the evidence.
