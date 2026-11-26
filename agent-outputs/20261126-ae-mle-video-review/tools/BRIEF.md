# Analytics Engineer and Machine Learning Engineer videos: review and fix brief

You are reviewing **one** interview prep video in the Remotion package at
`/home/user/dataslope/video`, then fixing what you find, then making
annotated before/after comparisons of every fix for the owner. Twenty other
agents do the same for the other videos of the two series, at the same time,
in the same tree, on a 4-core machine. The coordinator commits; you never do.

- **Machine Learning Engineer** (`MachineLearningEngineer-0-Interview` to
  `-10-LlmEvals`, folders `mle-*`, Drew): built and voiced on 2026-11-20
  (plan: `agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md`,
  briefs in `agent-outputs/20261120-mle-interview-build/`). **This is their
  first independent review.** Expect real findings.
- **Analytics Engineer** (`AnalyticsEngineer-0-Interview` to
  `-9-AiSemanticLayer`, folders `ae-*`, Drew): reviewed once on 2026-11-20
  (`agent-outputs/20261120-2300-ae-interview-video-review.md`; your video's
  review and fixer's report are in `agent-outputs/20261120-ae-interview-video-review/`
  and its `fixes/`). **This is a second review.** Read both reports first.
  Check that each earlier fix holds on screen, then look for what the first
  pass missed. Do not re-raise what that pass deliberately left or decided.
  Finding little is a fine result; do not pad.

Paths: `S` = `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad`,
`R` = `$S/review`, `V` = `/home/user/dataslope/video`,
`D` = `/home/user/dataslope/agent-outputs/20261126-ae-mle-video-review`,
`B` = `$S/before/video` (a frozen copy of the package as it was before this
review, for rendering "before" stills; never edit it).

## Phase 1: review (read-only)

> Inspect the video both visually and in code. Look for spacing issues,
> visual confusion, pacing (too fast), lack of explanations, etc.

A viewer watches one of these to answer an interview question, so judge each
answer as an answer: is it right, does it answer what was asked, would it hold
up when the interviewer presses? Code is evidence on screen, never walked
through line by line.

Do not edit anything in phase 1 except your report, and do not render: the
frames you need exist.

### Materials (rendered from the video as it is now)

- `$R/frames/<Id>/timeline.txt`: every beat with start-end seconds, words per
  second, the silence before the next beat, the frame files it spans, and its
  text; `== SCENE` marks a scene opening; scene lengths at the end. **Read it
  first, in full.** `beats.json` beside it holds the same beats as JSON.
- `$R/frames/<Id>/sheets/sheet-NN.jpg`: contact sheets, 4x3 tiles, repeats
  dropped (a tile is kept when the picture changed by about a word, plus the
  last frame before each cut). A tile's label: time, frame, beat, then
  `holds Ns` and the beats that start meanwhile (yellow at 3 s or more).
- `$R/frames/<Id>/tiles.txt`: the same tiles as text.
- `$R/frames/<Id>/element-NNN.jpeg`: full 1920x1080 frames, one a second
  (NNN = floor(t), three digits).
- Source: `V/src/videos/<folder>/` (`script.ts`, whose header lists the
  questions, what is on screen and every fact with its source; `Video.tsx`;
  `*Scene.tsx`; `parts.tsx`; `data.ts`; `results.json` from `check.mjs`).
  The interview kit is `V/src/editorial/interview.tsx`; the shared kit is
  `V/src/editorial/` and `V/src/components/`.
- House rules: `V/README.md`, "What goes on screen" and "Narration and
  timing". The owner's newest preferences are listed in
  `agent-outputs/20261120-mle-interview-build/BRIEF-BUILD.md`, "The owner's
  newest preferences".
- The pages the video answers: `content/interview/<track>/*.mdx`
  (`analytics-engineer` or `machine-learning-engineer`), named in the header
  of `script.ts`.

**Deliberate, not findings:** no burned-in captions; no series intro; no
running head or end card; a plain white page; Source Serif headlines;
sentence-case labels; questions numbered, figures not; plain text grouped by
spacing and hairlines with **no cards**; small badges stay, borderless tinted
or outlined (`OutlineBadge`); **diagram boxes outlined in ink with no fill**,
a highlight coloring outline and text together; filled shapes (bars, blocks)
carry no outline; math in the math face (`<M>`); a question card read word for
word; every quick-round question read aloud; one meaning per color (red = the
trap, the wrong answer or the error; green = the right answer; yellow = what
the narration points at; blue = data); a question another series also
answers. **Out of scope:** how initialisms are pronounced; the narrator's
voice and delivery in general.

**What recurred in earlier series**, worth looking for without assuming it:
answers that stop one step before the follow-up an interviewer asks; figures
that contradict their narration or their data; colors against their
meanings; correct statements struck through; lines through labels; text
under 19px; scenes that clear to an empty page; a result shown for about a
second before it clears; quick-round text that leaves before it can be read;
near-empty pages while the narration explains something that could be shown.

### How to work

1. Read `timeline.txt` and `script.ts` end to end (and, for Analytics
   Engineer, the two earlier reports for your video).
2. Walk every contact sheet in order.
3. Open full frames only where a tile cannot answer the question (each
   scene's finished state, anything that looks wrong). Stay under about 30.
4. For each problem, read the scene's code for the cause (`file:line`).
   Report only what you have seen in a frame or verified in code. Check
   numbers on screen against `results.json` and the page.

### What to look for

Read `agent-outputs/20261111-be-interview-video-review/tools/BRIEF.md`,
"What to look for": accuracy and the answer (the worst defect: a viewer
repeats it in an interview), spacing and layout, visual confusion, pacing
(too fast), lack of explanation, and anything else a careful viewer would
stumble on.

### Report

Write `D/<Id>.md`:

```
# <Id> (<duration>)

## Verdict
3-5 bullets.

## Findings
### 1. [P1|P2|P3] <category>: <short title>
- When: 123-131 s, beat `beat-id` (element-123.jpeg)
- What: ...
- Why it matters: ...
- Cause: `video/src/videos/<folder>/<File>.tsx:LINE`
- Fix: the specific change.
```

P1 = a viewer is likely to learn something wrong, or an obvious visual defect;
P2 = noticeable and hurts the video; P3 = polish. Most important first. At most
about 25 for a Machine Learning Engineer video, about 15 for an Analytics
Engineer one; merge repeats into one finding listing every time. Plain prose,
no em dashes, no praise padding.

## Phase 2: fix

Fix **every finding in your report**: P1s first, then answer findings, then
the other P2s, then P3s. A finding you think wrong on second look: leave it
and give the evidence.

### Rules

- **Every new number comes from `check.mjs`** through `results.json` and
  `data.ts`, never typed by hand, and every existing value must come back
  identical unless a finding is about it. `check.mjs` loads the site's
  engines from the repository root's `node_modules`, which is installed.
- **Answers follow the page.** Where the page is wrong, follow the facts and
  say so in your report; do not edit `content/`.
- Keep the color meanings, nothing under 19px, no line through a label, the
  house rules in the README.
- **What you own:** `V/src/videos/<folder>/`, `V/public/narration/<folder>/`,
  `V/takes/<folder>/`, `V/public/images/<folder>/`, `V/.generated/<folder>/`,
  files under `V/out/` whose names start with `<Id>` (and `V/out/review/<Id>/`),
  `$S/compare/<Id>/`, `$S/after/<Id>/`. Never edit `src/Root.tsx`,
  `src/series.ts`, `src/editorial/`, `src/components/`, `src/narration/`,
  `src/sound/`, `scripts/`, the README, `package.json`, another video's
  folder (copy a piece into yours instead), `content/`, or anything under
  `B`. If the shared kit has a bug, work around it in your folder and say so
  in your report. Never run `git commit`, `push`, `stash`, `checkout`,
  `reset`, `clean`, `npm install` or `npm ci`.

### Voice: re-voice only what is necessary

The owner's instruction: **"If you need to revoice anything, please only
revoice the necessary parts."** So:

- Re-voice a sentence only when its words are wrong or misleading, or an
  answer lacks the clause an interviewer would press on, or a bridge or cue
  cannot work without new words. **Never** for style, a wording preference,
  or pacing (pacing is fixed with `pauseAfter`, cue changes and scene
  timing, all free).
- **Split before you re-voice.** Split the beat at a sentence break, then
  `npm run narrate -- <folder> --recut` cuts the unchanged part from the kept
  take for free; then voice only the new or changed sentence with
  `out/voice-slot.sh npm run narrate -- <folder> --only <beat>`. Always read
  `npm run narrate -- <folder> --dry-run` first: it shows what would be paid
  for. Never `--force`.
- **Budget:** at most 800 characters for a Machine Learning Engineer video
  (400 for Part 0), at most 400 for an Analytics Engineer video (250 for
  Part 0), of which at most 150 for P3s. Most videos should need far less.
  If the findings need more, do the most important within the budget and
  list the rest.
- Narration rules: no em dashes, SQL keywords as lowercase words, numbers as
  spoken, no sentence opening "A" before an initialism, every cue a literal
  `n.word("beat", "phrase")`, the README's "Writing initialisms for the
  voice".

### Images

Only where a finding needs one: an illustration that contradicts the point or
is broken, or a spot that belongs where the page sits empty. Add or edit the
prompt in your `illustrations.json` (keep its `meta.model`
`gpt-image-2.6-flare`; `gpt-image-2.6-sunburst` is also acceptable), then
`node scripts/illustrations.mjs <folder> --only <id>` (add `--force` to redraw
an existing id). That is GPT Image 2.6, **quality low, transparent
background**: never change the quality or the background. About $0.02 an
image; redraw a bad one at most twice. Look at every result on white before
placing it. The README's image rules apply (sizes, 80px clearance, an
`el-pop` on the word that names it).

### Working alongside twenty others (4 cores)

- `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
- **Every render goes through the render queue**, `out/render-slot.sh
  <command>` (two slots), from `V`, bundling your private entry
  `out/entries/<Id>.tsx` (`VIDEO_ENTRY=out/entries/<Id>.tsx`): stills and
  every `npm run check:*` that renders. **Type-checks, lint and `npm test` go
  through `out/cpu-slot.sh`**; **`npm run narrate` without `--dry-run`
  through `out/voice-slot.sh`**.
- Stills at chosen **seconds** (one bundle per call, so ask for many at once):
  `mkdir -p out/review/<Id> && VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh node out/stills.mjs out/review/<Id> <Id>:12.5,40,95`
  writes `out/review/<Id>/<Id>-<s>.jpeg` at 1080p.
- **Long commands in the background with a long timeout** (`run_in_background`,
  `timeout: 7200000`): the queue can hold a job for an hour, and a shorter
  timeout kills it before it starts. `check:motion` renders a half-size
  preview of the whole video and is the slowest.
- Typecheck and lint only your folder:
  `out/cpu-slot.sh npx tsc --noEmit 2>&1 | grep "src/videos/<folder>/"` and
  `out/cpu-slot.sh npx eslint src/videos/<folder>`. `npm test` and
  `npm run check:cues` read every video: read only failures naming your
  folder (others' half-edited folders may fail meanwhile).
- Disk: delete the WAVs `check:mix` and `check:sync` leave
  (`out/<Id>-*.wav`) and the `out/<Id>-preview.mp4` `check:motion` leaves,
  once read. Never `rm` anything outside your own paths.

### When done fixing

On the final code, through your entry and the queues: typecheck and lint for
your folder, `check:cues`, `npm test`, `CHECK_SCALE=1 npm run check:frames --
<Id>`, `npm run check:motion -- <Id>`, and if you re-voiced, `npm run
check:sync -- <Id>` and `npm run check:mix -- <Id>`. Stills at every place you
changed, looked at.

## Phase 3: before/after comparisons for the owner

The owner asked: **"Please show me before/after side-by-side screenshots with
annotations to let me know what changed."** Make one comparison per fixed
finding that changed what is seen or heard. Several small fixes on the same
frame may share one comparison, each with its own numbered box.

1. **Find the matching moments.** Before times come from
   `$R/frames/<Id>/beats.json`. After times: run
   `node D/tools/timeline.mjs $S/after <Id>` from `V` (writes
   `$S/after/frames/<Id>/beats.json` and `timeline.txt` for the video as it
   is now), and take the same beat and word. Pick the moment that shows the
   change best (usually the figure finished, or the exact second a timing fix
   matters).
2. **Render the stills.** After, from `V`:
   `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh node out/stills.mjs $S/after/<Id> <Id>:<s>,<s>,...`.
   Before, from `B` (the frozen copy; same command, run in `B`):
   `cd $S/before/video && VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh node out/stills.mjs $S/compare/<Id>/before <Id>:<s>,<s>,...`.
   (The one-a-second frames in `$R/frames/<Id>/` are before frames too, and
   do when a whole second is close enough.) Never edit anything in `B`.
3. **Write `$S/compare/<Id>/compare.json`** in the format at the top of
   `D/tools/compare.py`: per comparison, the finding number, severity, a
   short title, the before and after image paths with their time and beat,
   **boxes** in 1920x1080 frame pixels around what changed (label them 1, 2,
   ... and use the same number for the same element on both sides), a
   `changed` list numbered to match the boxes saying in plain words what
   changed and why, and `narration` {before, after} when the words changed.
   For a change that is only heard (a re-voiced sentence over an unchanged
   picture) or only a timing change, give the after frame anyway when it
   shows something (the result now held on screen, say), or omit `after` and
   say what changed in `changed` and `narration`. Keep boxes off the text
   they point at by a few pixels; the numbered tag sits above each box.
4. **Run** `python3 -I D/tools/compare.py $S/compare/<Id>` and **look at every
   PNG it writes**. Fix any box that misses its target, then run it again.

## Phase 4: report

Write `D/fixes/<Id>.md`: a table of every finding (fixed / partly / moot /
not fixed, one line each), the characters re-voiced and which beats (old and
new words), images generated (ids, why), the new length, each check's result,
whether every existing `results.json` value came back identical, and the list
of comparison PNGs.

Return a short summary (under 40 lines): the review's counts (P1/P2/P3), the
fix table's counts, characters re-voiced, images generated, the old and new
length, any check that did not pass, anything the shared kit needs, and the
paths of your two reports and your comparison folder.
