# NLP and LLM course video review brief

You are reviewing one of the fourteen NLP and LLM course videos in the Remotion
package at `/home/user/dataslope/video`: How Large Language Models Work
(`Llm-*`, narrated by Drew) and Natural Language Processing with Python
(`Nlp-*`, narrated by Hope). The brief for every review in this set is the
same:

> Inspect the videos both visually and in code. Look for spacing issues,
> visual confusion, pacing (too fast), lack of explanations, etc.

**Where your video stands.** The ten unit videos (`Llm-1` to `Llm-5`, `Nlp-1`
to `Nlp-5`) were reviewed on October 23
(`agent-outputs/20261023-1030-nlp-llm-video-review.md`, one report per video
in `agent-outputs/20261023-nlp-llm-video-review/<Id>.md`), then fixed
(`agent-outputs/20261023-1530-nlp-llm-video-fixes.md`, per-video fix reports
in `agent-outputs/20261023-nlp-llm-video-scratch/fixes/<Id>.md`), then
followed up (`agent-outputs/20261024-1400-nlp-llm-lesson-fixes-and-followups.md`,
reports in `agent-outputs/20261023-nlp-llm-video-scratch/followup/`). Nobody
has looked at them since, and the fix pass added beats, re-voiced others and
re-laid scenes. The four deep dives (`Llm-2-1-AttentionScore`,
`Llm-4-1-ConversationCost`, `Nlp-2-1-LemmasAndTags`, `Nlp-3-1-ZipfsLaw`)
were built in that fix pass and **have never been reviewed**.

**This round reviews the four deep dives only.** The ten unit videos had a
full review and a complete fix pass, so they get the automated checks instead
(`check:frames`, which since then also fails on tabular hyphens in the drawn
page, and `npm test`, which fails on SVG text drawn black). The rest of this
brief also covers a unit video, should one be reviewed later: it is a full
review of the video as it is now, with one extra job for a unit video: read its October 23 report and fix report first, and check that
every finding marked fixed is fixed in the frames. A finding that came back,
or a fix that broke something nearby, is a finding here (say which earlier
finding it is). Do not re-report something that is fixed.

This is a **read-only review**. Do not edit anything in the repository except
your own report file, do not commit, and **do not render** (no `remotion
still/render`, no `npm run check:*`): every frame you need is already
rendered, and the CPUs are shared.

## Materials (already produced)

`R` is `/tmp/claude-0/-home-user-dataslope/88cfe488-c05f-574c-9944-997241c528bb/scratchpad/review-nlp`.

- `$R/frames/<CompositionId>/timeline.txt`: every narration beat with
  start-end seconds, words per second, the silence before the next beat, the
  frame files it spans, and its text; `== SCENE` marks where a scene opens;
  scene lengths at the end. **Read it first, in full.**
- `$R/frames/<CompositionId>/sheets/sheet-NN.jpg`: contact sheets, 4x3 tiles.
  **Repeats are dropped**: a tile is kept only when the picture has changed
  since the last kept tile (by about a word of text or more), plus the last
  frame before every scene cut. Each tile's label gives its time, frame number
  and the beat being spoken, then `holds Ns`: how long the picture stays
  without a change that size, and which beats start meanwhile (yellow when 3 s
  or more). A hold is not proof of stillness (a small highlight or bob can
  still move), but a long hold across a new beat is worth a look.
- `$R/frames/<CompositionId>/tiles.txt`: the same tiles as text, one line
  each, with the sheet each is on.
- `$R/frames/<CompositionId>/element-NNN.jpeg`: full 1920x1080 frames, one a
  second (NNN = floor(t), zero-padded to 3 digits). Captions are off (the
  default).
- Source: `video/src/videos/<folder>/` (`script.ts` = narration, with a header
  naming the lesson(s) the video follows; `Video.tsx` = scene list and cuts;
  `*Scene.tsx` = scenes; `parts.tsx` or `kit.tsx` = local components;
  `data.ts` = numbers; `measure.py` and `measurements.json`, where present,
  = the lesson's own code run for the numbers). Shared kit:
  `video/src/editorial/` (`ui.tsx`, `layout.ts`, `charts.tsx`, `style.ts`,
  `Page.tsx`, `SeriesIntro.tsx`) and `video/src/components/motion.ts`.
- House rules: `video/README.md`, sections "What goes on screen" (nothing
  under 19px on the 1080p layout, about 25px between rows of text, figure
  labels, reveals keep descenders, SVG text takes `fill`, tabular figures on
  numbers only) and "Narration and timing" (including "Time to take a scene
  in", "A course video opens on the series intro" and "A video in a series
  leads into the next").
- The series plan: `agent-outputs/20261023-0700-nlp-and-llm-course-video-plan.md`
  (your video's section says what it covers and what was decided).
- The lesson(s) the video follows, in `content/courses/<course>/...mdx`,
  named in the header of `script.ts`. A course video teaches: check its
  claims, definitions and numbers against the lesson and the lesson's code
  wherever something looks doubtful. Where the lesson itself is wrong, say so.

**Deliberate, and not findings:** no burned-in captions; no running head or end
card; a plain white page; Source Serif headlines; the series intro at the start
of a unit video (a deep dive has none, and no "Next" line); one watercolor spot
illustration per scene; sentence-case labels; numbered figures ("Fig. 3").

**Fixed in the shared kit since these videos were built, so not findings:**
SVG text drawing black (`svgText`), tabular figures widening hyphens,
negative axis ticks with a hyphen, the slow push (`Drift`) starting near still
in long scenes, and `Ink` elements that stayed fully inked through their exit.
If you see one of these anyway, report it: it means the fix missed a case.

**What recurred in the October reviews and the interview reviews since**, and
is worth looking for here without assuming it: figures that contradict their
own narration, an explanation that stops one step short of the point the
lesson makes, correct statements struck through, lines or rings through
labels, text under 19px, colors used inconsistently within a video, and
scenes that clear to an empty page between ideas.

## How to work

1. For a unit video, read its October 23 report and fix report first.
2. Read `timeline.txt` and `script.ts` end to end. Note where narration is
   dense.
3. Walk every contact sheet in order (`tiles.txt` tells you which sheet holds
   which time).
4. Open full frames **only** where a tile cannot answer the question: the
   finished state of each scene (the frame before its cut) and any tile that
   looks wrong (overlap, empty screen, stale content, tiny text, a mismatch
   with the narration). Stay under about 30 full frames. Do not open a frame to
   re-check something a tile already shows clearly. Read source files in
   targeted ranges once you know which scene and line you need.
5. For each problem you see, read the scene's code to find the cause and give
   a `file:line` reference. Only report things you have actually seen in a
   frame or verified in code. Do not speculate about audio you cannot hear;
   reason from the timeline numbers instead.

## What to look for

**Accuracy.** A wrong number, definition or claim is the worst defect a course
video can have. Check claims against the lesson and the measured numbers; a
number said that differs from the one shown; a figure whose data cannot be
what its label says.

**Spacing and layout.** Overlapping or colliding elements; text touching
lines, boxes or the frame edge; labels crowding each other; misaligned columns
or baselines; clipped text or descenders; anything off-canvas; text under
about 19px at 1080p; big dead areas (most of the frame empty for several
seconds while the narration explains something that could be shown); a figure
squeezed small while space sits unused.

**Visual confusion.** The screen showing something other than what is being
said at that moment (check the beat label on each tile); a highlight on the
wrong element; a color that means one thing in one figure and another in the
next; unlabelled axes, units or legends; numbers with no context; too many
things moving at once; content from a previous idea left behind and
contradicting the current one; an empty or nearly empty screen while the
narrator talks; an exit that removes the figure the narration is still
referring to.

**Pacing (too fast).** A new term, number or figure introduced and gone within
a second or two; dense beats (above about 3 words/s) that carry a new concept;
gaps of 0.30 to 0.45 s between beats that each bring a distinct idea; on-screen
text the narrator does not read aloud that is visible for less time than it
takes to read while listening (budget about 2 words/s); an animation still
building after the narrator has moved on; a finished scene held under about
1.5 s before the cut. Quote the beat ids and timings.

**Lack of explanation.** Jargon or notation used before it is defined or never
defined (a symbol, an initialism, a library or function name); a step skipped
in an argument; a number with no source or derivation; a conclusion asserted
without the visual that supports it; a chart whose axes the narration never
explains; something the lesson explains that the video only asserts.

Also note anything else a careful viewer would stumble on (typos on screen,
an illustration that contradicts the point, an abrupt cut, a bridge into the
next video that promises something the next video does not open with).

## Output

Write your report to
`/home/user/dataslope/agent-outputs/20261030-nlp-llm-video-review/<CompositionId>.md`
and return the same content as your final message. If the write is refused,
return the report as your final message anyway; the coordinator saves it.
Format:

```
# <CompositionId> (<duration>)

## Verdict
3-5 bullets: overall quality, the biggest problems, how pacing feels, and (for
a unit video) whether the October 23 fixes held.

## Earlier findings (unit videos only)
One line: how many of the October 23 findings marked fixed are fixed in the
frames; then one bullet per one that is not, with its old number.

## Findings
### 1. [P1|P2|P3] <category: accuracy | spacing | confusion | pacing | explanation | regression | other>: <short title>
- When: 123-131 s, beat `beat-id` (frames element-123.jpeg, element-131.jpeg)
- What: concrete description of what is on screen / said.
- Why it matters: one sentence.
- Cause: `video/src/videos/<folder>/<File>.tsx:LINE` (what the code does)
- Fix: the specific change you would make (a number, a cue, a beat split, a
  pauseAfter, a re-layout, the corrected wording), not "consider improving".
```

Severity: **P1** = a viewer is likely to misunderstand or learn something
wrong, or there is an obvious visual defect (overlap, clipping, wrong number);
**P2** = noticeable and hurts quality (cramped, rushed, unexplained term, an
explanation missing the lesson's point); **P3** = polish. Order findings by
severity. Report at most about 25, the most important first; merge repeats of
the same issue into one finding listing all the times. Be concrete and terse.
No praise padding. Write in plain prose with no em dashes.
