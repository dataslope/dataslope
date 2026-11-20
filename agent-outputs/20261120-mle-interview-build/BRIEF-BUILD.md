# Machine Learning Engineer interview videos: build brief (scenes, art, voice)

You are building **one** of the eleven Machine Learning Engineer interview
videos in the Remotion package at `/home/user/dataslope/video`, end to end:
scenes, art, voice, checks. Its **script and facts are written and reviewed**
(phase 1). Other builders work in the same tree at the same time, one per
video, on a 4-core machine. The coordinator commits; you never do.

`V` = `/home/user/dataslope/video`. `<Id>` is your composition
(`MachineLearningEngineer-5-DeepLearning`), `<folder>` your folder
(`mle-deep-learning`). Run every command from `V`.

## Read first

1. **The plan**, `agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md`:
   what the series is for (decisions and trade-offs, never syntax), your
   part, the bridges, the heroes.
2. **Your folder's `script.ts`, all of it.** Its header lists every question,
   what is on screen for each beat, and every fact with its source. Build
   exactly that. `check.mjs` → `results.json` → `data.ts` already hold the
   numbers; scenes read them from `data.ts`, never retype them.
3. **`V/README.md`, all of it**: the house manual. "What goes on screen" is
   the rulebook for every frame: content only; sentence case and when a line
   starts with a capital; nothing under 19px; **one line, one size, one
   family**; **a space stays a space**; **no cards** (badges stay: borderless,
   light tint, the hue's ink, semibold, `Badge` / `badgeStyle` from
   `src/editorial/ui.tsx`); **a diagram's boxes are outlined, not filled**
   (2px `INK` outline, black text, highlight = outline and text in one hue,
   joining lines black, Lucide icon allowed in a program's chip, Title Case
   names); vertical hairlines between side-by-side columns (`ColumnRule`)
   except where columns carry their own rule; 28px under a rule; spacing
   between groups at least 40px; SVG text colored with `fill` (`svgText()`);
   `TABULAR` on numbers only (`<Num>`); arrowheads from `arrow.ts`.
4. **Finished interview videos, read before you write a scene**:
   `src/videos/be-interview/` for the overview, `src/videos/be-scaling/` and
   `src/videos/ds-llm-evaluation/` for mechanisms, `src/videos/ds-ml-models/`
   and `src/videos/ds-ml-evaluation/` for model figures from `results.json`,
   `src/videos/be-algorithms/` for rapid rounds. Copy a `Video.tsx` cut
   pattern, `parts.tsx` idioms (a `Mark` highlight that takes back its bleed
   as margin: `src/videos/da-pandas/parts.tsx`), and how they read `data.ts`.
5. **The interview kit**, `src/editorial/interview.tsx` (`QuestionCard`,
   `RapidFire`, `QMono`, `OK`), the shared kit in `src/editorial/` and
   `src/components/`.
6. **What the last review found**, so you build it right the first time:
   `agent-outputs/20261111-1900-be-interview-video-review.md`, "Series-wide
   problems" 1 to 8: answers that stop short (the script handles most), a
   figure that says the opposite of its story, correct statements struck
   through, colors against their meanings, payoffs that leave after a
   second, near-empty pages while an answer starts, lines through labels.

## What you own, and what you must not touch

You may create and edit only `V/src/videos/<folder>/` (replace the
placeholder `Video.tsx`, keeping its export name; `src/Root.tsx` already
registers it in the `Interview-Machine-Learning-Engineer` folder with
`sfx: true`), `V/public/narration/<folder>/`, `V/takes/<folder>/`,
`V/public/images/<folder>/`, `V/.generated/<folder>/`, and files under
`V/out/` whose names start with `<Id>` (plus `out/review/<Id>/`). Never edit
`src/Root.tsx`, `src/series.ts`, `src/editorial/`, `src/components/`,
`src/narration/` (the lexicon already holds the series' words said as
words), `src/sound/`, `scripts/`, the README, `package.json`, any other
video's folder, or `content/`. If you need a shared piece, build it in your
`parts.tsx` and say so in your report. Never run `git commit`, `git push`,
`git stash`, `git checkout`, `git reset`, `git clean`, `npm install` or
`npm ci`.

**The script is reviewed.** Change its words only to fix an error (a fact a
run contradicts, a cue that cannot land, a sentence that cannot be drawn
honestly) and list every such change. Timing (`pauseAfter`) and cues are
yours.

## Working alongside the others

- **Every render goes through the render queue** (two slots), with the
  browser set:
  `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
  then `out/render-slot.sh <command>`. That covers stills and every
  `npm run check:*` that renders. **Type-checks, lint and `npm test` go
  through `out/cpu-slot.sh`**, and **`npm run narrate` (without
  `--dry-run`) through `out/voice-slot.sh`**. Long commands go in the
  background (`run_in_background`); never put a queued command in the
  foreground with a short timeout.
- **Bundle your private entry, never the shared Root**:
  `out/entries/<Id>.tsx` registers your composition alone. Set
  `VIDEO_ENTRY=out/entries/<Id>.tsx` for every render and check.
  Stills at chosen **seconds**:
  `mkdir -p out/review/<Id> && VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh node out/stills.mjs out/review/<Id> <Id>:12.5,40,95`
  (writes `out/review/<Id>/<Id>-<s>.jpeg` at 1080p; one bundle per call, so
  ask for many seconds at once). `npm run cues -- <folder>` prints when each
  beat starts.
- Typecheck and lint only your folder:
  `out/cpu-slot.sh npx tsc --noEmit 2>&1 | grep "src/videos/<folder>/"`,
  `out/cpu-slot.sh npx eslint src/videos/<folder>`. `npm test` and
  `npm run check:cues` read every video: read only failures naming your
  folder (other builders' half-finished folders may fail meanwhile).
- Disk: delete the three WAVs `check:mix` leaves (`out/<Id>-{wet,dry,fx}.wav`)
  and the `out/<Id>-preview.mp4` `check:motion` leaves, once read. Never `rm`
  anything outside your own paths.

## How to build it

1. **Scenes** (`Video.tsx`, `*Scene.tsx`, `parts.tsx`): a hook scene, one
   scene per deep dive (or a pair), the rapid round(s) (`RapidFire` or your
   own ruled list), the bridge with `<NextLine>`. On screen as the script's
   header describes. The kicker reads "Machine learning engineer interview
   questions" (the series' name), never "interview prep". Question cards
   carry the page's words.
2. **Typography and layout, from the first draft:** text that shares a line
   is one size and one family; emphasis is color, weight or a highlight. A
   label beside a big value either matches it or takes a line of its own
   above it; a hero number stays large only on a line of its own. Highlights
   take back their bleed as margin. A flex row with an `em` gap carries its
   own `fontSize`. Nothing under 19px; about 25px between rows of text; at
   least 40px between groups. Every vertical position through
   `useLayout().y()` and every vertical length through `h()`. Fill the page:
   a figure that sits in the top third with nothing under it for ten seconds
   is a near-empty page.
3. **Art. The layout comes first:** an image goes in only where there is
   enough whitespace and it does not hurt the page's design; when in doubt,
   leave it out (the owner: "I don't want to flood the videos with watercolor
   images"). Your hero in the hook (and, if it fits, the closing scene), and
   **a few small spot images** (two to four in the whole video), each only
   where it shows the thing the scene is about, never decoration for a
   passing word; at most one per scene; in clearly open space, at least 80px
   clear of every word, figure, arrow and other image and 80px from the
   page's edges for its whole time on screen. Exception: a scene laid out as
   two or three panels compared side by side may give each its own small
   image, matched in size and position. About 140 to 220px on the 1080p
   layout. Each pops in on the word that names it with
   `<Sfx name="el-pop" level={-30} />` on the same frame. Prompts are in your
   `illustrations.json` (edit or add spots there; `video-icon` 1024x1024,
   the file's watercolor style; the hero `video-hero`). **Generate and import
   with `node scripts/illustrations.mjs <folder> --only id1,id2`**: OpenAI
   GPT Image 2.6 (`gpt-image-2.6-flare`), quality low, transparent
   background, about $0.02 each. Never change the model, quality or
   background. Look at each result (Read the WebP or a still) composited on
   white; redraw a bad one (`--force --only <id>`) at most twice. Set
   `ILLUSTRATIONS = true` in `data.ts` (or your equivalent) once the art is
   in. At 4K an image may be drawn at most half its natural size on the
   1080p layout (`check:frames` fails a stretched one).
4. **Sound effects:** the `el-*` palette, cued to the animation, at the
   levels the README gives (`el-pop` -30, `el-tap` around -28, `el-pencil`
   and `el-whoosh` -34 to -37, `el-chime` about -32 in a pause). Subtle.
5. **Stills before voice.** On estimated timing, render stills of every
   scene (each figure's finished state and one mid-build) and look at them:
   layout, overlap, sizes, colors, empty stretches. Run
   `CHECK_SCALE=1 VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh npm run check:frames -- <Id>`
   and fix every ✗ (including `[crowded]` and `[mixed]`), plus typecheck,
   lint and `npm run check:cues` (your folder).
6. **Voice** with `out/voice-slot.sh npm run narrate -- <folder>` (Drew,
   `eleven_v4_turbo`, takes of about 1,800 characters). Read
   `npm run narrate -- <folder> --dry-run` first: the total must be your
   script's character count. Never `--force`. After the take, re-voice only
   beats whose words you change (`--only a,b`), at most 1,200 characters in
   all; split a long beat at a sentence break before rewording one sentence
   (the README: a split is free).
7. **Checks on the voiced video**, through your entry and the render queue:
   `npm run check:motion -- <Id>` (nothing still for 3 s), `npm run
   check:sync -- <Id>`, `npm run check:mix -- <Id>`, `CHECK_SCALE=1 npm run
   check:frames -- <Id>`. Then stills of every scene on the voiced timing,
   looked at, including each scene's last second before its cut. Fix what
   they find.

## What a good video looks like

- **The figure agrees with the narration**, word for word and number for
  number, at the moment it is said; a figure arrives as its question
  finishes being read; a result stays on screen long enough to read (at
  least two seconds after it lands, longer for a line of text).
- **One meaning per color** (`interview.tsx`): red the trap or the error,
  green the right answer, yellow what the narration points at, blue data.
  Brand tokens only, no hex; type in a hue reads `inkOf`.
- **Never strike through something the narration says is true.**
- **No line, ring or arrow crossing a label**; listing highlights found by
  text; arrowheads from `arrow.ts`.
- **No blank page at a cut**; nothing stands still for more than 3 seconds.

## When done

All passing on the final, voiced code: typecheck and lint for your folder,
`check:cues` (your folder), `npm test` (your folder's failures: none),
`check:motion`, `check:sync`, `check:mix`, `check:frames`; stills of every
scene looked at.

Return (under 50 lines): length (`npm run cues -- <folder>`, last line),
characters voiced (take and re-voices), every script change with its reason,
the art (hero and spots: id, scene, cue, place), each check's result, and
anything left undone or anything the shared kit needs.
