# Course video review brief

You are reviewing one (or part of one) of the course unit videos in the Remotion
package at `/home/user/dataslope/video` (Statistics course: `Stats-*`, narrated by
"Hope"; Database Design course: `DbDesign-*`, narrated by "Drew"). The user asked:

> Inspect the course videos both visually and in code. Look for spacing issues,
> visual confusion, pacing (too fast), lack of explanations, etc.

This is a **read-only review**. Do not edit anything in the repository, do not
commit, and **do not render** (no `remotion still/render`, no `npm run check:*`):
four CPUs are shared by many reviewers and every frame you need is already rendered.

## Materials (already produced)

`R` is the folder the tools wrote to: `sample.mjs` and `timeline.mjs` fill `$R/frames/`, and `sheets.py $R` adds the contact sheets.

- `$R/frames/<CompositionId>/timeline.txt`: every narration beat with start-end
  seconds, words per second, the silence before the next beat, the frame files it
  spans, and its text; `== SCENE` marks where a scene opens; scene lengths at the end.
  **Read it first, in full.**
- `$R/frames/<CompositionId>/sheets/sheet-NN.jpg`: contact sheets, 4x3 tiles one
  second apart (12 s per sheet, sheet-NN covers t = 12*NN .. 12*NN+11 s). Each tile
  is labelled with its time, frame number and the beat being spoken. Use these to
  follow the flow. About 2k tokens each.
- `$R/frames/<CompositionId>/element-NNN.jpeg`: full 1920x1080 frames, one every
  0.5 s (NNN = floor(t*2), zero-padded to 3 digits). Open these to judge spacing,
  legibility and anything that looks off in a tile. Captions are off (the default).
- Source: `video/src/videos/<folder>/` (`script.ts` = narration, `Video.tsx` = scene
  list and cuts, `*Scene.tsx` = scenes, `parts.tsx`/`kit.tsx` = local components,
  `data.ts` = numbers). Shared kit: `video/src/editorial/` (`ui.tsx`, `layout.ts`,
  `charts.tsx`, `erd.tsx`, `Page.tsx`), `video/src/components/motion.ts`.
- House rules for what goes on screen: `video/README.md`, section "What goes on
  screen" (nothing under 19px on the 1080p layout, ~25px between rows of text,
  figure label conventions, reveals keep descenders, etc.), and the "Narration and
  timing" section (scene gaps, `pauseAfter`, default pause 0.35 s between beats).
- The lesson(s) each video follows are named in the header comment of `script.ts`;
  they live in `content/courses/<course>/...mdx`. Check the video's claims and
  numbers against them where something looks doubtful.

Things that are deliberate and **not** findings: no burned-in captions, no running
head or end card, warm paper background, Source Serif headlines, the series intro
(first 4.6 s), one watercolor spot illustration per scene, sentence-case labels.

## How to work

1. Read `timeline.txt` and `script.ts` end to end. Note where narration is dense.
2. Walk every contact sheet in order. For each scene, open at least the full-res
   frame just before its cut (the finished state) plus any frame where a tile looks
   wrong (overlap, empty screen, stale content, tiny text, mismatch with narration).
3. For each problem you see, read the scene's code to find the cause and give a
   `file:line` reference. Only report things you have actually seen in a frame or
   verified in code. Do not speculate about audio you cannot hear; reason from the
   timeline numbers instead.

## What to look for

**Spacing and layout.** Overlapping or colliding elements; text touching lines,
boxes or the frame edge; labels crowding each other; misaligned columns or
baselines; inconsistent margins between scenes; clipped text or descenders;
anything off-canvas; text under ~19px at 1080p; big dead areas (most of the frame
empty for several seconds while the narration is explaining something that could
be shown); a figure squeezed small while space sits unused.

**Visual confusion.** The screen showing something other than what is being said
at that moment (check the beat label on each tile); a highlight on the wrong
element; colours that mean two different things; unlabelled axes, units or
legends; numbers with no context; too many things moving at once; content from a
previous beat left behind and contradicting the current one; an empty or nearly
empty screen while the narrator talks; an exit that removes the figure the
narration is still referring to.

**Pacing (too fast).** A new term, number or figure introduced and left within a
second or two; dense beats (above ~3 words/s) that carry a new concept; 0.30-0.45 s
gaps between beats that each introduce a distinct idea, with no breath to absorb
one before the next; on-screen text that the narrator does not read aloud and that
is visible for less time than it takes to read it while listening (budget about 2
words/s); an animation still building after the narrator has moved on; a finished
scene held under ~1.5 s before the cut; lists read rapid-fire with each item
flashed on screen. Quote the beat ids and timings.

**Lack of explanation.** Jargon or notation used before it is defined or never
defined (symbols like mu, sigma, x-bar, SE, p, H0, alpha; database terms like PK,
FK, UK, crow's-foot ends, cardinality, dtype); a step skipped in an argument; a
number that appears with no source or derivation; a conclusion asserted without
the visual that supports it; a chart whose axes the narration never explains;
something the lesson explains that the video only asserts. Also report factual or
numerical errors and narration/screen mismatches (a number said differs from the
number shown).

Also note anything else a careful viewer would stumble on (inconsistent figure
numbering, typos on screen, illustration that contradicts the point, abrupt cuts).

## Output

Write your report to `$R/reports/<CompositionId>[-partA|-partB].md` and return the
same content as your final message. Format:

```
# <CompositionId> (<range reviewed>)

## Verdict
3-5 bullets: overall quality, the biggest problems, and how pacing feels.

## Findings
### 1. [P1|P2|P3] <category: spacing | confusion | pacing | explanation | accuracy | other> — <short title>
- When: 123.5-131.0 s, beat `beat-id` (frames element-247.jpeg, element-262.jpeg)
- What: concrete description of what is on screen / said.
- Why it matters: one sentence.
- Cause: `video/src/videos/<folder>/<File>.tsx:LINE` (what the code does)
- Fix: the specific change you would make (a number, a cue, a beat split, a
  pauseAfter, a re-layout), not "consider improving".
```

Severity: **P1** = a viewer is likely to misunderstand or miss the point, or there
is an obvious visual defect (overlap, clipping, wrong number); **P2** = noticeable
and hurts quality (cramped, rushed, unexplained term); **P3** = polish.
Order findings by severity. Report at most ~25, the most important first; merge
repeats of the same issue into one finding listing all the times. Be concrete and
terse. No praise padding.
