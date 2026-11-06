# Brief: one size per line, and more small spot art

You are revising one or more of the Dataslope tutorial videos in `video/`
(Remotion, editorial style). Read `AGENTS.md` ("Videos") and `video/README.md`
first; `video/README.md` is the runbook. Two changes, both visual only:
**no narration, script text or timing changes**, nothing re-voiced.

## 1. One line, one size, one family

The owner's rule: text that shares a line is set in **one font size and one
family**. A larger size or a serif dropped into an Inter line reads as
inconsistent: "Expected profit = $80 − $45 =" in Inter 28px with "$35" in
the serif at 72px is the example they sent. This applies to every line with
numbers and formulas, and to labels beside values.

- **Emphasis is color, weight or a highlight**, not size or face. Keep the
  number's color (it carries meaning: `STAT_INK`, green for profit, and so
  on) and give it weight (600 to 650) if it needs to stand out.
- **Formulas and sentences**: one size, one family, the line's own (usually
  Inter at the size the line's words already use). Numbers in a line of
  Inter are Inter, not the serif.
- **A label beside a big value** (a readout like "Heads 50,121", "Your gut
  99%"): either set both at one size on one line, or put the label on its
  own line above the value, which may then stay large. Choose whichever
  keeps the scene's emphasis and layout; a hero number the narration builds
  to may stay big **only on a line of its own**.
- **Allowed**: headlines (their own lines), code in the mono face beside
  prose (code is mono everywhere on the site), super- and subscripts, and
  axis tick labels beside an axis title at sizes within 12%.
- Shrinking a number frees space: close the layout up so nothing is left
  floating, and re-check what sat beside it.

The check: `PageAudit` (`video/src/editorial/audit.tsx`) reports `[mixed]`
for neighbours on one line that differ in size by more than 12% or in family
(mono excepted), and `check:frames` fails one that holds for two samples.

## 2. More small spot art, wherever the page has room

The owner wants **as many small watercolor images as the whitespace allows
while the page stays calm**. The model they pointed at: Stats-5's "Fig. 3
Three populations": a heading "Wait times / a long tail to the right" with a
small coffee cup and a queue of three people beside it (about 170px tall),
and "One die / flat: each face 1 in 6" with two dice. Small, beside the text
they illustrate, never on top of anything.

- **Subjects**: concrete nouns the scene's narration actually says (a
  warranty, a coin, a server rack, a queue, a receipt, a thermometer…),
  one idea per image. Not abstractions, not charts, no text in the image.
- **Size and place**: about 120 to 240px on the 1920x1080 page, in genuine
  empty space, at least 40px clear of every word, figure, chart, arrow and
  other image, for the whole time it is on screen. Look at every frame it
  spans, not just one: scenes build up, and space that is empty early may
  fill later (give it an `out` before that). Do not crowd: a page with a
  figure and a headline may take one or two; a page of prose and numbers
  with an empty half may take more. Aim for every scene that has room to
  get at least one.
- **Timing**: it pops in on the word that names it (`n.word(beat, phrase)`,
  a phrase the beat already says; `npm run check:cues` must pass), using the
  video's own `Spot` (or `Illustration`) component as its existing art does.
- **Sound**: if the video's existing spots arrive with a sound effect (most
  have an `<Sfx name="el-pop" …>` beside them), give each new spot the same
  sound at the same level, cued to the same frame as its pop-in, so the new
  art arrives the way the old does. Then run
  `VIDEO_ENTRY=out/entries/<Id>.tsx npm run check:mix -- <dir>` and keep it
  passing. A video whose spots are silent stays silent.
- **Pipeline** (per `AGENTS.md`, "Images go through the illustration
  pipeline"): add prompts to the video's `src/videos/<dir>/illustrations.json`
  with `"category": "video-icon"` (1024x1024) and the file's own watercolor
  style; if the file has no `video-icon` size in `meta.sizes`, add
  `"video-icon": "1024x1024"`. Subjects in volumetric, concrete language, a
  few large simple objects, brand colors, people as anonymous figures with
  no faces. Generate and import with
  `node scripts/illustrations.mjs <dir> --only id1,id2` (GPT Image 2.6 flare,
  quality low, transparent background, about $0.02 each; do not change the
  model, quality or background). Look at every result composited on white
  (the PNG preview shows transparency as black) and redraw a bad one with
  `--force --only <id>`, at most twice. Never write `OPENAI_API_KEY` into a
  file.

## How to work

- Work only in your own video folders (`src/videos/<dir>/`) and their
  `public/images/<dir>/` art. **Do not edit shared files**: `src/editorial/`,
  `src/components/`, `src/Root.tsx`, or a `parts.tsx` / `kit.tsx` another
  video imports (`grep -rl "from \"../<dir>/parts\"" src/videos`). If a fix
  needs one, make it in your scenes instead, or list it in your report.
- Other agents are editing other videos at the same time, so `src/index.ts`
  may not bundle. Render through a **private entry**: copy the video's
  `<Composition … />` block from `src/Root.tsx` into
  `out/entries/<CompositionId>.tsx` (see `out/entries/DataEngineer-0-Interview.tsx`
  for the exact shape) and set `VIDEO_ENTRY` for every render and check.
- Checks (from `video/`, with
  `REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`):
  - `CHECK_SCALE=1 VIDEO_ENTRY=out/entries/<Id>.tsx npm run check:frames -- <Id>`
    must end with every line ✓ (including the `[crowded]` space check and
    the new `[mixed]` one). Reports name the frame they were seen at.
  - Stills to look at: `VIDEO_ENTRY=out/entries/<Id>.tsx FRAMES=out/review/<Id> SCALE=0.5 node out/stills2.mjs "<Id>@<frame>,<Id>@<frame>"`
    (make the folder first). Look at every scene you changed, at the frames
    where things appear, sit together and leave.
  - `npm run check:cues -- <dir>`, `npx eslint src/videos/<dir>`, and
    `npx tsc --noEmit` (report only errors in your own folders; others may
    be mid-edit).
- Disk is tight. Never run `rm` on anything outside `out/review/` and
  `out/entries/` files you made; the scripts delete their own bundles. Run
  at most one render or check at a time.
- **Do not commit.** The lead commits.

## Report

Reply with, per video: what lines you changed and how (one line each),
the images you added (id, subject, scene, cue word, place and size), any
`[mixed]` line you left and why, any shared-file change you would need, and
the last `check:frames` summary.
