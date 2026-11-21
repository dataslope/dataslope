# Machine Learning Engineer interview videos: phase 1 brief (scripts and facts)

You are writing the **narration scripts and their facts** for some of the
eleven Machine Learning Engineer interview videos, in the Remotion package at
`/home/user/dataslope/video` (`V` below). This phase writes **no scenes,
renders nothing and voices nothing**: an independent reviewer reads the
scripts before anything is built on them or voiced. Four other writers work
alongside you, each on their own videos. The coordinator commits; you never
do.

## Read first

1. **The plan**, `agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md`,
   all of it: what the series is for (decisions and trade-offs, **never
   syntax**), the parts, **"Which video answers which question"** (the exact
   questions that are yours, including the ones answered "together" with
   another page's), "How the videos join up" (your opening and your bridge),
   your hero and your budget in characters.
2. **`V/README.md`**: "Narration and timing" (beats, scene gaps, initialisms
   for the voice, bridges, transitions inside a video) and "What goes on
   screen" (so the figures you describe can be built under those rules).
3. **Your source pages**, `content/interview/machine-learning-engineer/<page>.mdx`,
   every answer you own, and its runnable blocks (they tell you what to run).
4. **Finished scripts of the same shape, read in full before you write**:
   `V/src/videos/be-interview/script.ts` for the overview;
   `V/src/videos/be-scaling/script.ts` (with its `check.mjs`, seeded
   simulations of systems that do not run here) and
   `V/src/videos/ds-llm-evaluation/script.ts` for videos of mechanisms;
   `V/src/videos/ds-ml-models/script.ts` with its `check.mjs`,
   `results.json` and `data.ts` for a video whose numbers come from
   scikit-learn runs in Pyodide. Copy their header style, beat shape (`id`,
   `scene: true` on a scene's first beat, `pauseAfter`), `voice: "drew"`,
   `minPause: COURSE_MIN_PAUSE`, `tail`, and how a deep dive reads its
   question aloud ("Question three." then the question in the page's words)
   before answering it.
5. **The Data Scientist series overlaps yours in places**
   (`ds-ml-evaluation`, `ds-ml-models`, `ds-deep-learning`,
   `ds-statistics`, `ds-probability`, `ds-llm-evaluation`). Skim the script
   headers of any that cover your topics. Do not reuse their worked
   examples; where you can, argue from the ML engineer's side (what it means
   in production, at scale, under a latency or memory budget), since that is
   what this track's pages add.
6. **What the last review found most often**, so the scripts start right:
   `agent-outputs/20261111-1900-be-interview-video-review.md`, "Series-wide
   problems" 1 to 8. The commonest, in every series so far: **an answer
   that stops one step before the follow-up the interviewer asks next**, and
   **a figure that says something other than its own story** (a highlight,
   a color, a struck line or a label that contradicts the narration).

## What to write, per video

Create `V/src/videos/<folder>/` with:

- **`script.ts`**: `export const script: NarrationScript`, `id` equal to the
  folder name. The header lists every question you answer (by the page's
  heading, including those answered together; deep dives numbered, the rapid
  round listed), what is on screen for each beat in a line or two (the figure
  the builder will make: what it shows, what is highlighted when, which color
  means what), and every fact with its source. Deep dives first, about 30 to
  70 seconds each, each ending **one step past the question** (the
  trade-off, the failure mode, the follow-up an interviewer asks next); then
  one or two rapid rounds of short answers. A video with many questions picks
  about seven to ten for deep dives (the ones with a mechanism worth drawing
  or a trap worth showing) and answers the rest in rapid rounds. Open fresh,
  close on the plan's bridge ("Next: …"), after a pause of about 0.7 s. A
  short spoken turn at each change of topic keeps it one argument ("So the
  question is how to measure it.").
- **Facts**, wherever a number, a curve, a table or an output appears: a
  `check.mjs` that computes or runs it and writes `results.json`, read by a
  `data.ts` (see `ds-ml-models`). Python runs in **Pyodide with NumPy,
  pandas and scikit-learn** (`loadPyodide({ packages: [...] })` from the repo
  root's `node_modules`, as `ds-ml-models/check.mjs` does; it works in this
  container, packages arrive over the network). Prefer the page's own code
  and data; seed every random draw so a rerun writes the same file; round
  what goes on screen. Serving systems, feature stores, GPUs, queues, drift
  in production and LLM APIs do not run here: draw the mechanism, and where a
  number helps, compute it with a small **seeded** simulation that the
  narration calls a simulation, or with arithmetic from stated assumptions
  said aloud as assumptions (the KV-cache arithmetic is the page's own). Never
  present a number as a real system's output, never invent a benchmark or a
  timing, and never quote a price, a paper's figure or a vendor fact the page
  does not give. **Timings** (vectorized vs loop) vary by machine: if you
  show one, measure it in `check.mjs`, say it was measured once in the
  browser's Python, and argue from the ratio, not the milliseconds. If a
  page is wrong, follow the facts and report it; do not edit `content/`.
  `check.mjs` should also fail loudly if a page stops saying what the
  narration quotes from it (see `be-interview/check.mjs`).
- **`illustrations.json`**: the video's hero (the creature in the plan's
  table, one large simple watercolor figure, worded the way
  `be-interview/illustrations.json` words its capybara) and two to five small
  `video-icon` spot subjects for things the narration names (objects, no
  text, no screens with writing). Copy the file shape and `meta` exactly from
  `be-interview/illustrations.json` (model `gpt-image-2.6-flare`, the
  watercolor style). Prompt ids are `<folder>-<name>`. Do not generate them;
  the builder does.

## Rules for the narration

- **No syntax.** Code appears only where reading it is the skill (Part 3, a
  few lines at a time, when the question is what the code does: the
  max-subtraction in softmax, a broadcast's shapes). Never walk through an
  implementation line by line; argue the decision. Formulas are fine where
  the page gives one and the figure needs it (the KV-cache size, F1); say
  them in words.
- **Initialisms are written as people write them** (ML, MLE, SGD, PCA, SVM,
  kNN, ROC, AUC, RMSE, MAE, CNN, RNN, LSTM, GRU, RAG, LLM, GPU, CPU, KV, PSI,
  CI/CD, TTFT, MRR, MCP, LoRA). The voice reads plain caps letter by letter
  unless `V/src/narration/lexicon.ts` says it as a word. List in your report
  every one your scripts say that people say **as a word** (LoRA "laura",
  GloVe "glove", ReLU "ray-loo", RAG "rag", MCP is letters, ROC-AUC is
  respelled per the README), so the coordinator adds them before voicing.
  Do not edit `lexicon.ts`. Expand an initialism the first time a beginner
  may not know it. ROC-AUC: follow the README's "Respell a compound
  phonetically" (`ds-ml-evaluation/script.ts` shows how it was done, and cue
  phrases quote the respelling).
- **No sentence opens "A" before an initialism** ("A KV cache…" is read
  "ay KV"); reword it.
- **Math in words**: R² is "R squared", 0.95^10 is "point nine five to the
  tenth". Numbers as they are said ("forty gibibytes" or "forty gigabytes":
  say which the page means; "about sixty percent").
- Product and paper names (vLLM, MLflow, Feast, word2vec) are glossed in a
  few words the first time one matters, and never treated as running here.
- **Characters** within ±15% of your plan figure and under 9,500. Count the
  beats' text yourself: `node -e` over your `script.ts` is fine (strip
  audio tags like `[slowly]`, which are not billed as words but are sent).
- **Pacing**: content beats at about 2.1 to 3.0 words a second on the
  estimate; `pauseAfter` 0.6 to 1.0 s after a beat that defines a term or
  lands a result; beats of one to three sentences.
- **Prose**: no em dashes and no spaced en dashes, no filler ("delve",
  "let's dive in", "it's worth noting"), no "in the last video", every fact
  checked against the page and a run. A line on screen that stands on its own
  starts with a capital; describe on-screen text that way.
- **Colors** (for your on-screen notes): red the trap or the error, green
  the right answer, yellow what the narration points at, blue data. Never
  red for something that is merely bad luck or a normal event, never green
  for something that is not the answer.

## What you own, and what you must not touch

Create and edit only `V/src/videos/<your folders>/`. Never edit
`src/Root.tsx`, `src/series.ts`, `src/editorial/`, `src/components/`,
`src/narration/`, `scripts/`, the README, `package.json`, any other video's
folder, or anything in `content/`. Never run `git commit`, `git push`,
`git stash`, `git checkout`, `git reset`, `git clean`, `npm install` or
`npm ci`. No renders, no `npm run narrate` without `--dry-run`, no
`npm run illustrations`.

Checks you can run: your `check.mjs` (from the repo root, `node
video/src/videos/<folder>/check.mjs`; Pyodide takes about a minute to load),
`npx tsc --noEmit 2>&1 | grep "src/videos/<folder>/"` and
`npx eslint src/videos/<folder>` from `V` (run tsc through
`out/cpu-slot.sh npx tsc --noEmit` so five writers don't type-check at once).
Your `data.ts` must type-check: it is what the builder's scenes import.

## When done

Return, for each of your videos (under 45 lines each):

- Characters (deep dives, rapid rounds, total) and beats.
- Every question answered, deep or rapid, by the page's heading, with any
  answered together, and any you did not answer and why.
- Each fact and where it comes from (which run, which page line).
- The initialisms and words said as words, for the lexicon.
- Anything the page gets wrong, with the evidence from your run.
