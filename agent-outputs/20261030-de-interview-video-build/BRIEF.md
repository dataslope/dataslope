# Data Engineer interview videos: builder brief

You are building **one** of the twelve Data Engineer interview prep videos in the
Remotion package at `/home/user/dataslope/video`, end to end: narration, facts,
scenes, voice, checks. Eleven other builders work in the same tree at the same
time, one per video. The coordinator commits; you never do.

`S` = `/tmp/claude-0/-home-user-dataslope/e4f274f2-ee14-5490-ab8d-4b89636fa14c/scratchpad`.
`V` = `/home/user/dataslope/video`. `<Id>` is your composition
(`DataEngineer-5-Python`), `<folder>` your folder (`de-python`).

## Read first

1. **The plan**, `agent-outputs/20261030-1600-data-engineer-interview-video-plan.md`:
   "What is new in this series" (three rules from the user, below), the
   question table (which questions are yours, including the ones moved to you
   from other pages), your video's section, "How the videos join up" (your
   opening and your bridge), and "What carries over".
2. **`video/README.md`, all of it.** It is the house manual: what goes on
   screen, narration and timing, initialisms for the voice, scene gaps,
   bridges, voicing in takes, sound effects, images, checks.
3. **Your page**, `content/interview/data-engineer/<page>.mdx`, every answer
   you own, and the pages your moved questions come from.
4. **A finished video of the same shape, read in full before you write
   anything**: `src/videos/ds-sql/` for SQL, `ds-python-pandas/` for Python,
   `ds-llm-evaluation/` or `ds-experiments-in-practice/` for a video of
   mechanisms rather than code, `ds-interview/` for the overview. Copy its
   `Video.tsx` cut pattern, its `parts.tsx` idioms, its `check.mjs` →
   `results.json` → `data.ts` chain, and its `script.ts` header style.
5. **The interview kit**, `src/editorial/interview.tsx` (`QuestionCard`,
   `RapidFire`, `QMono`, `OK`), and the shared kit in `src/editorial/`
   (`ui.tsx`, `style.ts`, `charts.tsx`, `erd.tsx`, `layout.ts`) and
   `src/components/` (`motion.ts`, `arrow.ts`, `Illustration.tsx`).
6. **What the last review found**, so you build it right the first time:
   `agent-outputs/20261029-1040-ds-interview-video-review.md`, sections
   "Series-wide problems" and "What the fixers kept running into".

## The three rules that are new in this series

1. **Expand an initialism only when a beginner may not know it.** Say AI,
   SQL, API, CSV, JSON, CPU, PDF as they are, with no expansion. Expand on
   first use in your video, and only if your video says it: CTE (common table
   expression), SCD (slowly changing dimension), OLTP (online transaction
   processing), OLAP (online analytical processing), CDC (change data
   capture), ETL (extract, transform, load), ELT, DAG (directed acyclic
   graph), SLA (service level agreement), RDD (resilient distributed
   dataset), ACID, ORC (optimized row columnar), UUID (universally unique
   identifier), RAG (retrieval-augmented generation). For any other initialism,
   judge the same way. Where an initialism only abbreviates easy words (DLQ,
   ANN, MV, PK, FK), say the words and never the letters. Product names
   (Kafka, Spark, Airflow, Dagster, dbt, Parquet, Avro, DuckDB, Postgres,
   pgvector) are not expanded, but give a three-to-six-word gloss the first
   time one matters to the answer ("Kafka, a distributed log,").
2. **SQL is said "sequel".** In `script.ts` narration, write `sequel`
   (`Sequel` at a sentence start), never `SQL`: "a sequel query", "Spark
   sequel", "no sequel", "Postgres" for PostgreSQL. `npm test`
   (`acronyms.test.ts`) fails any `de-` script that writes `SQL`. On screen,
   in question cards, listings and labels, it stays `SQL`. Cue phrases quote
   the narration (`n.word("plan", "sequel query")`).
3. **Reuse where the overlap is near-identical.** Where your question is asked
   in the same or nearly the same words on a Data Analyst or Data Scientist
   page that already has a video, or a course video teaches exactly it (your
   plan section's "Reuse" line lists them), build from that video's scene,
   components and measured results instead of designing a new figure:
   - Import its components and helpers (`ds-sql/parts.tsx` re-exports the
     `da-sql` and `da-advanced-sql` table, listing and error kit; follow that
     pattern).
   - Use its numbers: either import its `results.json` in your `data.ts`
     (`import daAdv from "../da-advanced-sql/results.json" with { type: "json" }`),
     or re-run the same statements in your own `check.mjs` (copy them) so a
     table both videos show is the same table.
   - For a scene, **copy the file into your folder and re-cue it** to your
     beats (`n.word("your-beat", "your words")`) and your question numbers.
     Never import another video's scene component as is: it cues its own
     beat ids and prints its own question numbers.
   - Write your own narration for it (Drew re-voices it in your take): their
     audio says "S Q L", numbers questions differently and leads in from
     different neighbours.
   - **Never edit** a `da-*`, `ds-*` or course video's folder: those videos
     are finished and shipped. If a reused piece needs a change, copy it.
   - Note in your `script.ts` header which questions reuse what.

## What you own, and what you must not touch

You may create and edit only:

- `video/src/videos/<folder>/` (it holds a placeholder `script.ts`,
  `Video.tsx`, and your hero's `illustrations.json`; replace the
  placeholders, keep the exported component name and `export const script`,
  which `src/Root.tsx` already imports)
- `video/public/narration/<folder>/`, `video/takes/<folder>/`,
  `video/public/images/<folder>/`
- files under `video/out/` whose names start with `<Id>`, and `$S/de/<Id>/`

Never edit anything else: not `src/Root.tsx` (your composition is already
registered, in folder `Interview-Data-Engineer`, with `sfx: true`), not
`src/editorial/`, `src/components/`, `src/narration/`, `src/sound/`,
`scripts/`, the README, `package.json`, any other video's folder, or anything
in `content/`. If you need a shared piece changed, build it locally in your
`parts.tsx` and say in your report what the kit would need.

Never run `git commit`, `git push`, `git stash`, `git checkout`, `git reset`,
`git clean`, `npm install` or `npm ci`. Reading git is fine.

## Working alongside eleven others

- **Every render goes through the queue**, from `video/`:
  `out/render-slot.sh <command>`. One slot (four CPUs), first come first
  served; it sets `REMOTION_BROWSER_EXECUTABLE`. That covers stills and every
  `npm run check:*` that renders (frames, motion, sync, mix).
- **Bundle your own entry, never the shared Root.** Another builder's
  half-written folder can break a bundle of `src/index.ts` at any moment.
  `out/entries/<Id>.tsx` registers your composition alone.
  - Stills, many per bundle (about 40 s to bundle, then a second or two per
    frame): `out/render-slot.sh node out/frames.mjs <Id> $S/de/<Id>/stills --every 2 --from 30 --to 80 --scale 0.5`,
    or `--at 300,900,1500` for chosen frames. Writes `f-<frame>.jpeg`.
  - Checks: `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh npm run check:motion -- <Id>`
    (and the same for `check:frames`, `check:sync`, `check:mix`).
- **Look at stills rather than render videos.** Crop or scale down before you
  open an image (`sharp` is installed at the repo root).
- **Typecheck and lint only your folder's errors**:
  `flock $S/tsc.lock npx tsc --noEmit 2>&1 | grep "src/videos/<folder>/"` and
  `npx eslint src/videos/<folder>`. `npm test` and `npm run check:cues` read
  every video: read only the failures that name your folder.
- **Long commands go in the background** (renders through the queue,
  `narrate`, `check.mjs`, illustration batches) with `run_in_background`, and
  you wait for the notification. A queued render can wait a long time for the
  slot; never put one in the foreground with a timeout.
- Append one line to `$S/de/progress/<Id>.log` at each milestone (script
  drafted, facts run, scenes built, stills checked, voiced, each check
  passed), with the time.

## How to build it

1. **Script first** (`script.ts`). The header lists every question you answer
   (by the page's wording, deep dives numbered, rapid ones listed), where each
   moved question came from, what is reused from where, and the facts with
   their source. Deep-dive questions are read aloud word for word as
   "Question n." then the question; the question card shows the same words.
   The rapid round's numbers continue the deep dives' and appear on screen
   only. Open fresh (no other video's opening shape), end on the bridge in
   the plan ("Next: …"). **Characters:** stay within ±20% of your plan
   figure and under the 9,500 cap; `npm run narrate -- <folder> --dry-run`
   prints the count. Overview video: no question cards.
2. **Facts** (`check.mjs` → `results.json` → `data.ts`). Every number,
   table, plan, error and printed value on screen or in the narration comes
   from a real run in the page's engine: DuckDB-Wasm for SQL, the site's
   Postgres (PGlite, via `scripts/lib/sql-engines.mjs`) where the question is
   about something DuckDB lacks (B-tree index plans, `EXPLAIN` of an index
   scan, declarative partitions, `CLUSTER`), Pyodide 314 for Python (the
   engines are installed at the repo root; run `check.mjs` the way the
   example's header says). Seed every random draw. **Spark, Kafka, Airflow,
   Dagster, dbt and vector databases do not run here**: draw their mechanism;
   where a number helps, compute it with a small seeded Python simulation and
   say on screen and aloud that it is one ("model it with…"). Never present a
   number as Spark's or Kafka's output, and never invent a benchmark. Facts
   from the page's own prose (a default, a rule of thumb) are quoted from the
   page; if the page is wrong, follow the facts and report it, do not edit
   the page.
3. **Scenes** (`Video.tsx`, `*Scene.tsx`, `parts.tsx`). One scene per deep
   dive (or a pair), a hook scene, and the rapid round (`RapidFire`). Your
   hero is already generated: `public/images/<folder>/<folder>-<animal>.webp`
   (read its pixel size: at 4K it may be drawn at most half its natural
   width and height on the 1080p layout, e.g. 833x1017 → 416x508;
   `check:frames` fails a stretched image). Put it in the hook or the closing
   scene, with `Spot` (copy it from `ds-sql/parts.tsx`) and
   `ILLUSTRATIONS = true` in `data.ts`. One or two more watercolor spots are
   allowed if a scene truly needs one: add the prompt to your
   `illustrations.json` (same style, objects only, no text, no creature
   another video uses), then `npm run illustrations -- <folder> --only <id>`
   (Batch API, `gpt-image-2.5-flare`, quality `low`, transparent; never
   change those). If the batch is still `in_progress` an hour after
   submission, cancel it and use `sync`, as the README's "Images" says.
   Sound effects: the `el-*` palette, cued to the animation, at the levels
   the README gives.
4. **Stills before voice.** On estimated timing, render stills of every scene
   (every 2 s is plenty) and look at them: layout, overlap, text size,
   colors, the finished state of each figure. Fix, then run typecheck, lint,
   `check:cues` and `npm test` for your folder.
5. **Voice** with `npm run narrate -- <folder>` (Drew, `eleven_v4_turbo`,
   takes of about 1,800 characters). Read the `--dry-run` first. Never
   `--force`. After the take, re-voice only beats whose words you change
   (`--only a,b`), at most 1,500 characters in all; split at a sentence break
   first so the rest is cut free (`--recut`). Timing changes (`pauseAfter`,
   cues) cost nothing.
6. **Checks on the voiced video**, through your entry and the queue:
   `check:motion` (nothing still for 3 s; it keeps `out/<Id>-preview.mp4`),
   `check:sync`, `check:mix`, `check:frames`. Then stills of every scene again
   on the voiced timing, and look at them. Fix what they find.

## What a good answer looks like

These are the review findings that recurred most; each is a rule here.

- **Answer one step past the question.** Every deep dive ends on the follow-up
  an interviewer asks next, which the page usually answers: the trade-off, the
  failure mode, what to do instead, the number that makes it concrete.
- **The figure agrees with the narration**, word for word and number for
  number, at the moment it is said. A figure arrives as its question finishes
  being read, not on the first word that names it.
- **One meaning per color** (`interview.tsx`): red (`ACCENT`) the trap, the
  wrong answer or the error; green (`OK`, `OK_INK`) the right answer; yellow
  (`HIGHLIGHT`) what the narration points at; blue data. A strike-through
  means a misreading. Brand tokens only, no hex; type in a hue reads `inkOf`.
- **Mechanical rules:** nothing under 19px on the 1080p layout; about 25px
  between rows of text; no line, ring or arrow crossing a label; listing
  highlights found by text (`lineOf`), never by index; SVG `<text>` colored
  with `fill` (`svgText()`); `TABULAR` on numbers only (`<Num>`); arrowheads
  from `arrow.ts`; ERDs from `erd.tsx`.
- **No blank page at a cut**: a scene clears at the cut, not on the bridge's
  last word.
- **Openings promise only what the video delivers.** Count what it really
  does before the plan beat says "seven get worked through".
- **Prose rules for narration**: no em dashes, no filler, numbers as they are
  said, every fact checked against the page and a real run.
- **Pacing**: content beats at about 2.1 to 3.0 words a second; anything to
  be read stays at full strength for at least its word count divided by 2
  seconds; `pauseAfter` 0.6 to 1.0 s after a beat that defines a term or
  lands a result.

## When done

On the final, voiced code, all passing:

1. Typecheck and lint for your folder, `npm run check:cues`, `npm test`
   (your folder's failures: none).
2. `check:motion`, `check:sync`, `check:mix`, `check:frames`.
3. Stills of every scene on the voiced timing, looked at.

Write `$S/de/reports/<Id>.md` and return the same text (keep it under 60
lines):

- Length (`npm run cues -- <folder>`), characters voiced (take and any
  re-voices), beats.
- Every question you answer, deep or rapid, by the page's heading, and any
  you did not answer and why.
- What you reused, from where.
- Each check's result (worst sync offset, longest still stretch, effects
  loudness under the voice, the stretch figures from `check:frames`).
- Anything the page gets wrong (with the evidence), anything you noticed in
  the shared kit, and anything left undone.
