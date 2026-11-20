# Analytics Engineer interview videos: review and fix brief

You are giving one of the ten Analytics Engineer interview prep videos
(`AnalyticsEngineer-0-Interview` to `AnalyticsEngineer-9-AiSemanticLayer`,
narrated by Drew, in the Remotion package at `/home/user/dataslope/video`)
its first independent review, and then fixing what you find. The videos were
built and voiced on 2026-11-20 (plan:
`agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md`;
briefs: `agent-outputs/20261120-ae-interview-build/BRIEF-SCRIPTS.md` and
`BRIEF-BUILD.md`) and pass `check:frames`, `check:motion`, `check:sync` and
`check:mix`, but no one but their builders has looked at them. The coordinator
spot-checked stills and already found one figure that contradicted its own
data (Part 4's overlap window), which is the kind of thing this review is for.

It runs in two phases, in this order: **review** (read-only, report written),
then **fix** (every finding, P1s first). The reviews of the Data Engineer and
Backend series are the model for depth and format:
`agent-outputs/20261111-1900-be-interview-video-review.md` and its per-video
reports in `agent-outputs/20261111-be-interview-video-review/`, and the fixers'
reports in its `fixes/` folder.

`S` = `/tmp/claude-0/-home-user-dataslope/516360a8-63bf-5ba3-b8df-0656960f2129/scratchpad`,
`R` = `$S/review-ae`, `V` = `/home/user/dataslope/video`. Nine other agents
work in the same tree at the same time, one per video.

## Phase 1: review (read-only)

> Inspect the video both visually and in code. Look for spacing issues,
> visual confusion, pacing (too fast), lack of explanations, etc.

A viewer watches one of these to answer an interview question, so also judge
each answer as an answer: is it right, does it answer what was asked, and
would it hold up in an interview? The series argues **modeling decisions and
their failure modes**; code is on screen as evidence, short, never walked
through line by line.

Do not edit anything in phase 1 except your report, and **do not render** in
phase 1: every frame you need is already rendered.

### Materials (already produced, from the video as it is now)

- `$R/frames/<Id>/timeline.txt`: every narration beat with start-end seconds,
  words per second, the silence before the next beat, the frame files it
  spans, and its text; `== SCENE` marks where a scene opens; scene lengths at
  the end. **Read it first, in full.**
- `$R/frames/<Id>/sheets/sheet-NN.jpg`: contact sheets, 4x3 tiles, repeats
  dropped (a tile is kept only when the picture has changed by about a word,
  plus the last frame before each cut). Each tile's label gives its time,
  frame and beat, then `holds Ns` and the beats that start meanwhile (yellow
  at 3 s or more).
- `$R/frames/<Id>/tiles.txt`: the same tiles as text, with the sheet each is on.
- `$R/frames/<Id>/element-NNN.jpeg`: full 1920x1080 frames, one a second
  (NNN = floor(t), zero-padded to 3 digits).
- Source: `video/src/videos/<folder>/` (`script.ts` with its header listing
  the questions and facts, `Video.tsx`, `*Scene.tsx`, `parts.tsx`, `data.ts`,
  `results.json` from `check.mjs`). The interview kit is
  `video/src/editorial/interview.tsx`; the shared kit is `video/src/editorial/`.
- House rules: `video/README.md`, "What goes on screen" and "Narration and
  timing".
- The pages the video answers: `content/interview/analytics-engineer/*.mdx`,
  named in the header of `script.ts`. **The pages were revised on
  2026-11-20 by an interview-prep review merged from main (#746)**: the YAML
  now uses dbt's stricter layout, two questions were added (dbt v2 in Part 3,
  where a semantic layer can live in Part 8), and some wording changed. The
  builders already applied what the coordinator found; check the rest.

**Deliberate, and not findings:** no burned-in captions; no series intro; no
running head or end card; a plain white page; Source Serif headlines;
sentence-case labels; questions numbered and figures not; plain text grouped
by spacing and hairlines with **no cards**; small badges stay, either
borderless tinted or outlined (`OutlineBadge`, the owner's badge review of
2026-11-20); **diagram boxes outlined in ink with no fill**, a highlight
coloring outline and text together; a question card read word for word;
**every quick-round question read aloud** ("Question n." then the question,
a choice made for this series); one meaning per color (red = the trap, the
wrong answer or the error; green = the right answer; yellow = what the
narration points at; blue = data); repeating a question another series also
answers. **Out of scope:** how initialisms are pronounced.

**What recurred in earlier series**, worth looking for without assuming it:
answers that stop one step before the follow-up an interviewer asks; figures
that contradict their own narration or data; colors against their meanings;
correct statements struck through; lines through labels; text under 19px;
scenes that clear to an empty page; a result shown for about a second before
it clears; unread text in the quick round that leaves too soon.

### How to work

1. Read `timeline.txt` and `script.ts` end to end.
2. Walk every contact sheet in order.
3. Open full frames only where a tile cannot answer the question (each
   scene's finished state, anything that looks wrong). Stay under about 30.
4. For each problem, read the scene's code for the cause (`file:line`). Report
   only what you have seen in a frame or verified in code. Check numbers on
   screen against `results.json` and the page.

### What to look for

**Accuracy and the answer** (the worst defect: a viewer repeats it in an
interview), **spacing and layout**, **visual confusion**, **pacing (too
fast)**, **lack of explanation**: as defined in
`agent-outputs/20261111-be-interview-video-review/tools/BRIEF.md`, "What to
look for". Read that section.

### Report

Write `agent-outputs/20261120-ae-interview-video-review/<Id>.md`:

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

P1 = a viewer is likely to learn something wrong, or an obvious visual
defect; P2 = noticeable and hurts quality; P3 = polish. At most about 25,
most important first. Plain prose, no em dashes, no praise padding.

## Phase 2: fix

Fix **every finding in your report**, in this order: P1s, then answer
findings, then other P2s, then P3s. A finding you think is wrong on second
look: leave it and give the evidence.

### Rules

- **Every new number comes from `check.mjs`** through `results.json` and
  `data.ts`, never typed by hand. Every existing value must come back
  identical unless a finding is about it.
- **Answers follow the page.** Where the page is wrong, follow the facts and
  say so; do not edit `content/`.
- Keep the color meanings, nothing under 19px, no line through a label.
- **What you own:** `video/src/videos/<folder>/`, `video/public/narration/<folder>/`,
  `video/takes/<folder>/`, `video/public/images/<folder>/`, files under
  `video/out/` starting with `<Id>`, `$S/<Id>/`. Never edit `src/Root.tsx`,
  `src/editorial/`, `src/components/`, `src/narration/`, `src/sound/`,
  `scripts/`, the README, `package.json`, another video's folder (copy a
  piece into yours instead), or `content/`. Never run `git commit`, `push`,
  `stash`, `checkout`, `reset`, `clean` or `npm install`.

### Working alongside nine others (4 cores)

- `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
- Every render through the queue, `out/render-slot.sh <command>`, from
  `video/`, bundling your entry `out/entries/<Id>.tsx`
  (`VIDEO_ENTRY=out/entries/<Id>.tsx`). Stills:
  `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh node out/stills.mjs out/review/<Id> <Id>:12.5,140`.
- **Long commands in the background with `timeout: 7200000`**: the queue can
  hold a job for an hour, and a shorter timeout kills it before it starts.
- Typecheck and lint only your folder. `npm test` and `check:cues` read
  every video: read only failures naming your folder.

### Voice

- Re-voice only beats whose words change, each on its own
  (`npm run narrate -- <folder> --only a,b`). Never `--force`.
- **At most 1,000 characters re-voiced for your video (600 for Part 0)**, of
  which at most 300 for P3s. If the findings need more, do the most important
  within the budget and list the rest.
- **Split before you re-voice**: split a beat at a sentence break and
  `npm run narrate -- <folder> --recut` cuts the unchanged part from the take
  for free; then re-voice only the new sentence. Timing-only changes are free;
  prefer them.
- Narration rules as in the build brief: no em dashes, SQL keywords as
  lowercase words, numbers as spoken, no sentence opening "A" before an
  initialism, every cue a literal `n.word("beat", "phrase")`.

### When done

On the final code, through your entry and the queue: typecheck and lint for
your folder, `check:cues`, `npm test`, `check:frames` (`CHECK_SCALE=1`),
`check:motion`, and if you re-voiced, `check:sync` and `check:mix`; stills
at every place you changed, looked at. Delete the WAVs and preview the
checks leave.

Write `agent-outputs/20261120-ae-interview-video-review/fixes/<Id>.md`: a
table of every finding (fixed / partly / moot / not fixed, one line each),
characters re-voiced and which beats, the new length, each check's result,
whether every existing `results.json` value came back identical.

Return a short summary: the review's counts (P1/P2/P3), the fix table's
counts, characters re-voiced, the new length, and any check that did not pass.
