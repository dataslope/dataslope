# Data Engineer interview video review brief

You are reviewing one of the twelve Data Engineer interview prep videos in the
Remotion package at `/home/user/dataslope/video` (`DataEngineer-0-Interview` to
`DataEngineer-11-PipelinesForAi`, narrated by Drew). They were built in #722
(record: `agent-outputs/20261030-de-interview-video-build/STATE.md`) and checked
by their builders and by `check:frames`, `check:motion`, `check:sync` and
`check:mix`, but they have never had an independent visual review. This is
that review, made the way the Data Analyst and Data Scientist videos' were
(`agent-outputs/20261029-2148-da-interview-video-review.md` and
`agent-outputs/20261029-1040-ds-interview-video-review.md`, whose per-video
reports in `agent-outputs/20261029-da-interview-video-review/` and
`agent-outputs/20261029-ds-interview-video-review/` show the depth and format
expected):

> Inspect the videos both visually and in code. Look for spacing issues,
> visual confusion, pacing (too fast), lack of explanations, etc.

These videos have one job the course videos do not: a viewer watches one to
answer an interview question. So also judge each answer as an answer: is it
right, does it answer what was asked, and would it hold up in an interview?

This is a **read-only review**. Do not edit anything in the repository except
your own report file, do not commit, and **do not render** (no `remotion
still/render`, no `npm run check:*`): every frame you need is already rendered,
and the CPUs are shared.

## Materials (already produced)

`R` is `/tmp/claude-0/-home-user-dataslope/ff63a7ac-8db0-51f1-a09c-49f6d4fdc4de/scratchpad/review-de`.

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
- Source: `video/src/videos/<folder>/` (`script.ts` = narration and a header
  listing the questions, `Video.tsx` = scene list and cuts, `*Scene.tsx` =
  scenes, `parts.tsx` = local components, `data.ts` = numbers,
  `results.json` = what `check.mjs` measured). The interview kit is
  `video/src/editorial/interview.tsx` (`QuestionCard`, `RapidFire`); the
  shared kit is `video/src/editorial/` (`ui.tsx`, `layout.ts`, `charts.tsx`,
  `style.ts`, `Page.tsx`) and `video/src/components/motion.ts`.
- House rules: `video/README.md`, sections "What goes on screen" (nothing
  under 19px on the 1080p layout, about 25px between rows of text, reveals
  keep descenders) and "Narration and timing".
- The series plan: `agent-outputs/20261030-1600-data-engineer-interview-video-plan.md`
  (your video's section says what it covers and what was decided), and the
  builder's report for your video, if there is one, in
  `agent-outputs/20261030-de-interview-video-build/reports/`.
- The page the video answers: `content/interview/data-engineer/<page>.mdx`,
  named in the header comment of `script.ts`. Check the video's answers and
  numbers against it, and against `results.json`, wherever something looks
  doubtful.

**Deliberate, and not findings:** no burned-in captions; no series intro (the
first scene starts at frame 0); no running head or end card; a plain white
page; Source Serif headlines; one watercolor spot illustration per scene;
sentence-case labels; questions numbered ("Question 5") and figures not; a
question card that is the scene's headline and is read word for word (and
wraps into balanced lines); one
meaning per color across the series (red = the trap, the wrong answer or the
error; green = the right answer; yellow = what the narration points at; blue =
data); a rapid-fire round that closes each topic video at a few seconds a
question; repeating a question the Data Analyst or Data Scientist series also answers.

**Out of scope: how initialisms are pronounced.** The narration writes SQL as
"sequel" (and MySQL as "my sequel") on purpose, and a separate re-dub will
change how initialisms such as DAG and OLAP are said. Do not report a
respelling or the pronunciation of an initialism. Do report an initialism
that is never explained where a viewer needs it, and an expansion of one
everyone knows ("AI, artificial intelligence").

**Already fixed in the shared kit before these videos were built, so not
findings:** SVG text drawing black (svgText), tabular figures widening
hyphens (`check:frames` now fails one in the drawn page), one-word orphans or
hyphen breaks in question cards, listing highlights that cover a line's
indent, double-width spaces in inline code, negative axis ticks with a
hyphen, the slow push (`Drift`) starting near still in long scenes, and the
Data Analyst review's `da-sql/parts.tsx` fixes (every mark on a `DataTable`
cell draws, the console box's height, the SQL highlighter's frame keywords
and `DAY`, `Strike` tilting less over a long phrase, `Ink` multiplying a
caller's opacity into its fade-out). If you see one of these anyway, report it: it means the
fix missed a case.

**What recurred in the Data Scientist series**, and is worth looking for here
without assuming it: answers that stop one step before the follow-up an
interviewer asks (the commonest finding, in every video), figures that
contradict their own narration, colors used against the series' meanings,
correct statements struck through, lines or rings through labels, text under
19px, and scenes that clear to an empty page between questions.

## How to work

1. Read `timeline.txt` and `script.ts` end to end. Note where narration is
   dense.
2. Walk every contact sheet in order (`tiles.txt` tells you which sheet holds
   which time).
3. Open full frames **only** where a tile cannot answer the question: the
   finished state of each scene (the frame before its cut) and any tile that
   looks wrong (overlap, empty screen, stale content, tiny text, a mismatch
   with the narration). Stay under about 30 full frames. Do not open a frame to
   re-check something a tile already shows clearly. Read source files in
   targeted ranges once you know which scene and line you need.
4. For each problem you see, read the scene's code to find the cause and give
   a `file:line` reference. Only report things you have actually seen in a
   frame or verified in code. Do not speculate about audio you cannot hear;
   reason from the timeline numbers instead.

## What to look for

**Accuracy and the answer itself.** A wrong answer, number or definition is
the worst defect an interview video can have: the viewer will repeat it to
an interviewer. Check claims against the page and `results.json`. Also: the
question on screen differs from the one read; an answer that does not answer
what was asked, or leaves out the part an interviewer would press on (the
page's own answer is the bar); a number said that differs from the one shown.

**Spacing and layout.** Overlapping or colliding elements; text touching
lines, boxes or the frame edge; labels crowding each other; misaligned columns
or baselines; clipped text or descenders; anything off-canvas; text under
about 19px at 1080p; big dead areas (most of the frame empty for several
seconds while the narration explains something that could be shown); a figure
squeezed small while space sits unused.

**Visual confusion.** The screen showing something other than what is being
said at that moment (check the beat label on each tile); a highlight on the
wrong element; a color used against the series' meanings above; unlabelled
axes, units or legends; numbers with no context; too many things moving at
once; content from a previous question left behind and contradicting the
current one; an empty or nearly empty screen while the narrator talks; an exit
that removes the figure the narration is still referring to.

**Pacing (too fast).** A new term, number or figure introduced and gone within
a second or two; dense beats (above about 3 words/s) that carry a new concept;
gaps of 0.30 to 0.45 s between beats that each bring a distinct idea; on-screen
text the narrator does not read aloud that is visible for less time than it
takes to read while listening (budget about 2 words/s), which matters most in
the rapid-fire round; an animation still building after the narrator has moved
on; a finished scene held under about 1.5 s before the cut. Quote the beat ids
and timings.

**Lack of explanation.** Jargon or notation used before it is defined or never
defined (a symbol, an initialism, a library or function name); a step skipped
in an argument; a number with no source or derivation; a conclusion asserted
without the visual that supports it; a chart whose axes the narration never
explains; something the page explains that the video only asserts.

Also note anything else a careful viewer would stumble on (inconsistent
question numbering, typos on screen, an illustration that contradicts the
point, an abrupt cut, a bridge into the next video that promises something the
next video does not open with).

## Output

Write your report to
`/home/user/dataslope/agent-outputs/20261105-de-interview-video-review/<CompositionId>.md`
and return the same content as your final message. Format:

```
# <CompositionId> (<duration>)

## Verdict
3-5 bullets: overall quality, the biggest problems, how pacing feels, and
whether the answers hold up as interview answers.

## Findings
### 1. [P1|P2|P3] <category: accuracy | answer | spacing | confusion | pacing | explanation | other>: <short title>
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
answer missing what an interviewer would press on); **P3** = polish. Order
findings by severity. Report at most about 25, the most important first; merge
repeats of the same issue into one finding listing all the times. Be concrete
and terse. No praise padding. Write in plain prose with no em dashes.
