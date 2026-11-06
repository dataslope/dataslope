# Brief: no cards in the existing videos

The owner, 2026-11-06, after seeing the Backend series restyled: "Can you
now expand the no-card design policy to the existing videos too?" You are
restyling the videos assigned to you. **Layout only**: no narration, script,
timing, cue or sound changes, no re-voicing, no new images.

`V` = `/home/user/dataslope/video`. Read `V/README.md`, "What goes on
screen", the bullet **No cards unless the layout needs one** and the two
paragraphs under it: that is the rule, in the owner's words. Then look at
the reference: `V/src/videos/be-interview/HookScene.tsx` and `AiScene.tsx`
(before and after stills in `V/out/review/BackendEngineer-0-Interview/voiced/`
and `.../v3/`).

## The rule

1. **No card around text.** A bordered, rounded or tinted box whose job is
   to hold a few words together goes: question bands, layer or topic
   bands, company or tool cards, note and caveat boxes, callouts, "the
   answer" boxes, summary panels, outlined chips and pills for tags. Group
   with spacing and alignment instead; separate rows with at most a 1px
   `HAIRLINE` rule. Tags become plain text separated by spacing or a
   middle dot (` · `). Emphasis that the box carried moves to the text:
   weight, color (one meaning per color: red trap, green right, yellow what
   the narration points at, blue data), or a highlight behind the words.
2. **What stays.** A box that is part of a figure keeps it: a node in a
   flow or pipeline diagram, a class or entity in a diagram (`erd.tsx`), a
   cell, a memory slot, a bar, a queue slot, a step box an arrow runs
   into. Code listings, terminal output and data tables keep the house
   look (the frame is the listing or the table itself). A highlight behind
   a word is not a card and stays. The test: if arrows or lines connect to
   it, or it stands for a thing in the system being drawn, it is a figure;
   if it only frames prose, it is a card.
3. **Side by side takes a hairline.** Two to four columns of text set side
   by side get a vertical 1px `HAIRLINE` in each gap: the height of the
   columns' text, centred in the gap, at least 24px from the text either
   side, none before the first column or after the last, inking in with the
   column to its right. Not between words on one line, and not where a
   fork's arrows already separate the columns. `ColumnRule` in
   `src/editorial/ui.tsx` draws one (`x` the gap's centre, `top`, `height`,
   `at`, optional `dim`).
4. **The padding comes back as space.** The box was doing the grouping, so
   space has to: clearly more space between groups than inside one. At
   least 40px between groups (a source block and its first figure, one stat
   and the next, one item and the next), 10 to 14px inside a group (a label
   and its bar, a title and its note), about 25px between rows of text. A
   label sits closer to the thing it names than to the thing above it.
   Re-centre or re-balance what is left so the page does not look like a
   box was lifted out of it.
5. **Existing art.** Keep it. If, once the boxes are gone, a spot image
   sits closer than 80px to text, a figure or the page edge, or runs large
   beside a figure, move it into open space or shrink it into about 140 to
   220px (`check:frames` fails one drawn above half its natural size at
   4K). Add no images and remove none.
6. **Typography rules still hold** (README: one line, one size, one
   family; a space stays a space; nothing under 19px). Fix any `[mixed]` or
   `[crowded]` line `check:frames` reports in your videos, even if you did
   not cause it.

Animations: a card that inked in, wiped in or scaled in now does the same
with its text (and its hairline, if it gained one), on the same frame. A
transition that only made sense for a box (a border drawing on, a fill
sweeping in) becomes an ease-in of the text. Keep every `<Sfx>` on its frame.

## How to work

- Work only in your assigned folders (`V/src/videos/<dir>/`, their
  `public/images/<dir>/`). **Do not edit shared files**: `src/editorial/`,
  `src/components/`, `src/Root.tsx`, the README. A `parts.tsx` or `kit.tsx`
  another video imports (`grep -rl "/<dir>/parts\|/<dir>/kit" V/src/videos`)
  may be edited only if every importer is in your assignment; otherwise
  restyle in your own scenes or list it in your report.
- Other agents are editing other videos at the same time. Render through a
  **private entry**, `V/out/entries/<Id>.tsx`, registering your composition
  alone; many exist already (`ls V/out/entries`), otherwise copy the
  shape of `out/entries/DataEngineer-0-Interview.tsx` with the
  `<Composition … />` block from `src/Root.tsx`. Set `VIDEO_ENTRY` for every
  render and check.
- **Every render goes through the shared queue**, from `V`, with
  `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
  then `out/render-slot.sh <command>` (two slots for every agent, first
  come first served). Long commands go in the background; never put a
  queued render in the foreground with a timeout. One render or check of
  yours at a time.
- **Before you change a video, take stills of it** (`before/`), so you and
  the lead can compare: `mkdir -p out/review/<Id>/before && VIDEO_ENTRY=out/entries/<Id>.tsx FRAMES=out/review/<Id>/before SCALE=0.5 out/render-slot.sh node out/stills2.mjs "<Id>@<frame>,<Id>@<frame>,…"`,
  one or two frames per scene with a card on screen, at its finished state.
  `npm run cues -- <dir>` prints each beat's frames. Read the scene code to
  find the cards first; a video with no cards needs no stills and no checks:
  say so in the report.
- After: the same frames into `after/`, and look at every pair. Is the
  grouping as clear as it was with the boxes? Is there enough space between
  groups? Does anything sit tight?
- Checks on every video you changed:
  `CHECK_SCALE=1 VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh npm run check:frames -- <Id>`
  must end with every line ✓. `npm run check:cues` (read only lines naming
  your folders), `npx eslint src/videos/<dir>`, and
  `npx tsc --noEmit 2>&1 | grep "src/videos/<dir>/"` (none). Run
  `check:motion` only if you changed an animation's timing shape, and
  `check:mix` never (no sound changes).
- Disk is tight. Never `rm` anything outside `out/review/<Id>/` and entry
  files you made; the scripts delete their own bundles.
- **Never** run `git commit`, `git push`, `git stash`, `git checkout`,
  `git reset`, `git clean`, `npm install` or `npm ci`. The lead commits.
- Work through your videos one at a time: restyle, check, stills, then the
  next. If you run short of context, finish the video in hand and report
  what is left.

## Report (under 30 lines per video)

Per video: the cards you removed (scene, what they framed), what each
became (rows with hairlines, columns with separators, plain tags…), any
box you kept as a figure and why, art you moved or shrank (old and new
size), any typography fix, the last `check:frames` summary line, and the
before and after still folders. Then anything you could not do (a shared
`parts.tsx`, a layout that needs the owner's eye).
