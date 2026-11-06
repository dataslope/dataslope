# Backend / Software Engineer interview videos: build brief (scenes, art, voice)

You are building **one** of the ten Backend / Software Engineer interview
videos in the Remotion package at `/home/user/dataslope/video`, end to end:
scenes, art, voice, checks. Its **script and facts are written and approved**
(phase 1). Nine other builders work in the same tree at the same time, one
per video, and other agents are revising older videos. The coordinator
commits; you never do.

`S` = `/tmp/claude-0/-home-user-dataslope/ff63a7ac-8db0-51f1-a09c-49f6d4fdc4de/scratchpad`.
`V` = `/home/user/dataslope/video`. `<Id>` is your composition
(`BackendEngineer-5-Concurrency`), `<folder>` your folder (`be-concurrency`).

## Read first

1. **The plan**, `agent-outputs/20261106-backend-interview-video-plan.md`:
   what the series is for (decisions and trade-offs, never syntax), your
   part, the bridges, the heroes.
2. **Your folder's `script.ts`, all of it.** Its header lists every question,
   what is on screen for each beat, and every fact with its source. Build
   exactly that. `check.mjs` → `results.json` → `data.ts` already hold the
   numbers; scenes read them from `data.ts`, never retype them.
3. **`video/README.md`, all of it**: the house manual, including the newest
   rules under "What goes on screen": **a space stays a space** and **one
   line, one size, one family**.
4. **A finished interview video of the same shape, read in full before you
   write a scene**: `src/videos/de-interview/` for the overview,
   `src/videos/de-pipelines/` or `src/videos/ds-llm-evaluation/` for
   mechanisms, `src/videos/de-sql-performance/` for plans and tables,
   `src/videos/de-python/` for code on screen. Copy its `Video.tsx` cut
   pattern, its `parts.tsx` idioms, and how it reads `data.ts`.
5. **The interview kit**, `src/editorial/interview.tsx` (`QuestionCard`,
   `RapidFire`, `QMono`, `OK`), the shared kit in `src/editorial/` and
   `src/components/`.
6. **What reviews found most often**, so you build it right the first time:
   `agent-outputs/20261105-1900-de-interview-video-review.md` and
   `agent-outputs/20261029-1040-ds-interview-video-review.md`.

## What you own, and what you must not touch

You may create and edit only `video/src/videos/<folder>/` (replace the
placeholder `Video.tsx`, keeping its export name; `src/Root.tsx` already
registers it in the `Interview-Backend-Engineer` folder with `sfx: true`),
`video/public/narration/<folder>/`, `video/takes/<folder>/`,
`video/public/images/<folder>/`, and files under `video/out/` whose names
start with `<Id>`. Never edit `src/Root.tsx`, `src/editorial/`,
`src/components/`, `src/narration/` (the lexicon already says REST, JSON,
GIL, SOLID, NoSQL and the series' other words as words), `src/sound/`,
`scripts/`, the README, `package.json`, any other video's folder, or
`content/`. If you need a shared piece, build it in your `parts.tsx` and say
so in your report. Never run `git commit`, `git push`, `git stash`,
`git checkout`, `git reset`, `git clean`, `npm install` or `npm ci`.

**The script is approved.** Change its words only to fix an error (a fact a
run contradicts, a cue that cannot land) and list every such change.
Timing (`pauseAfter`) and cues are yours.

## Working alongside the others

- **Every render goes through the queue**, from `video/`, with the browser
  set: `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
  then `out/render-slot.sh <command>` (two slots, first come first served).
  That covers stills and every `npm run check:*` that renders. Long commands
  go in the background (`run_in_background`); never put a queued render in
  the foreground with a timeout.
- **Bundle your private entry, never the shared Root**:
  `out/entries/<Id>.tsx` registers your composition alone. Set
  `VIDEO_ENTRY=out/entries/<Id>.tsx` for every render and check.
  Stills: `VIDEO_ENTRY=out/entries/<Id>.tsx FRAMES=out/review/<Id> SCALE=0.5 out/render-slot.sh node out/stills2.mjs "<Id>@<frame>,<Id>@<frame>"`.
- Typecheck and lint only your folder:
  `npx tsc --noEmit 2>&1 | grep "src/videos/<folder>/"`, `npx eslint src/videos/<folder>`.
  `npm test` and `npm run check:cues` read every video: read only failures
  naming your folder.
- Disk: delete the three WAVs `check:mix` leaves (`out/<Id>-{wet,dry,fx}.wav`)
  once read. Never `rm` anything else outside `out/review/<Id>`.

## How to build it

1. **Scenes** (`Video.tsx`, `*Scene.tsx`, `parts.tsx`): a hook scene, one
   scene per deep dive (or a pair), the rapid round (`RapidFire`), the
   bridge. On screen as the script's header describes. The kicker reads
   "Backend engineer interview questions" (the series' name), never
   "interview prep". Question cards carry the page's words.
2. **Typography, from the first draft:** text that shares a line is one size
   and one family; emphasis is color, weight or a highlight. A label beside
   a big value either matches it or takes a line of its own above it; a hero
   number stays large only on a line of its own. Highlights take back their
   bleed as margin (copy a `Mark` from `src/videos/da-pandas/parts.tsx`,
   which already does). A flex row with an `em` gap carries its own
   `fontSize`. Nothing under 19px; about 25px between rows of text.
3. **Art. The layout comes first:** an image goes in only where there is
   enough whitespace and it does not hurt the page's design; judge each
   against the page without it, and when in doubt, leave it out. Your hero
   (the plan's creature) and **a few small spot images, only where they earn
   it** (revised 2026-11-06: the owner found the first
   pass too much, "I don't want to flood the videos with watercolor
   images"). At most one per scene, and many scenes get none; only where it
   shows the thing the scene is about, never decoration for a passing word;
   only in clearly open space, at least 80px clear of every word, figure,
   arrow and other image and 80px from the page's edges for its whole time
   on screen, never squeezed into a leftover strip below or beside text or
   a figure. The one exception: a scene laid out as two or three panels or
   columns compared side by side may give each panel its own small image,
   matched in size and position. About 140 to 220px on the 1080p layout. Each pops in on the
   word that names it with `<Sfx name="el-pop" level={-30} />` on the same
   frame. Prompts go in your `illustrations.json` (`video-icon`, 1024x1024,
   the file's watercolor style; the hero `video-hero`); generate and import
   with `node scripts/illustrations.mjs <folder> --only id1,id2` (GPT Image
   2.6 flare, quality low, transparent background, about $0.02 each; never
   change those). Look at each result composited on white; redraw a bad one
   (`--force --only <id>`) at most twice. Set `ILLUSTRATIONS = true` in
   `data.ts` once the art is in. At 4K an image may be drawn at most half
   its natural size on the 1080p layout (`check:frames` fails a stretched
   one). The clearance probes in `out/entries/measure-spots*.mjs` measure
   each spot's distance to everything else; adapt one.
4. **Sound effects:** the `el-*` palette, cued to the animation, at the
   levels the README gives.
5. **Stills before voice.** On estimated timing, render stills of every scene
   and look at them: layout, overlap, sizes, colors, each figure's finished
   state. Run `CHECK_SCALE=1 VIDEO_ENTRY=… out/render-slot.sh npm run check:frames -- <Id>`
   and fix every ✗ (including `[crowded]` and `[mixed]`), plus typecheck,
   lint and `check:cues`.
6. **Voice** with `npm run narrate -- <folder>` (Drew, `eleven_v4_turbo`,
   takes of about 1,800 characters). Read `--dry-run` first. Never `--force`.
   After the take, re-voice only beats whose words you change (`--only a,b`),
   at most 1,500 characters in all.
7. **Checks on the voiced video**, through your entry and the queue:
   `check:motion` (nothing still for 3 s), `check:sync`, `check:mix`,
   `check:frames` (`CHECK_SCALE=1` is fine). Then stills of every scene on
   the voiced timing, looked at. Fix what they find.

## What a good video looks like

- **The figure agrees with the narration**, word for word and number for
  number, at the moment it is said; a figure arrives as its question
  finishes being read.
- **One meaning per color** (`interview.tsx`): red the trap or the error,
  green the right answer, yellow what the narration points at, blue data.
  Brand tokens only, no hex; type in a hue reads `inkOf`.
- **Mechanical rules:** no line, ring or arrow crossing a label; listing
  highlights found by text (`lineOf`); SVG text colored with `fill`
  (`svgText()`); `TABULAR` on numbers only; arrowheads from `arrow.ts`.
- **No blank page at a cut**; nothing stands still for more than 3 seconds.

## When done

All passing on the final, voiced code: typecheck and lint for your folder,
`check:cues`, `npm test` (your folder's failures: none), `check:motion`,
`check:sync`, `check:mix`, `check:frames`; stills of every scene looked at.

Return (under 60 lines): length (`npm run cues -- <folder>`), characters
voiced (take and re-voices), every script change with its reason, the art
(hero and spots: id, scene, cue, place), each check's result, and anything
left undone or anything the shared kit needs.
