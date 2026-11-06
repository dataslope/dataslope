# Data Engineer interview videos: fix brief

Your video has been reviewed. Fix **every finding in its report**, in this
order: the **P1s**, then the **answer** findings (P2 and P3), then the **other
P2s**, then the **other P3s**. This is the pass the Data Analyst videos had
(`agent-outputs/20261029-da-interview-video-review/tools/FIX-BRIEF.md`; their
fixers' reports in `agent-outputs/20261029-da-interview-video-review/fixes/`
show the depth expected).

`S` = `/tmp/claude-0/-home-user-dataslope/ff63a7ac-8db0-51f1-a09c-49f6d4fdc4de/scratchpad`.
`V` = `/home/user/dataslope/video`. Eleven other fixers work in the same tree at
the same time, one per video.

## Read

1. Your report: `agent-outputs/20261105-de-interview-video-review/<Id>.md`. Every
   finding has a time, a beat, a cause (`file:line`) and a suggested fix.
2. The Data Analyst review's summary,
   `agent-outputs/20261029-2148-da-interview-video-review.md`, for the
   series-wide patterns and the color meanings, which this series shares.
3. `video/README.md`, "What goes on screen" and "Narration and timing",
   including "Writing initialisms for the voice".
4. The review's frames, one a second, before any fix:
   `$S/review-de/frames/<Id>/` (`timeline.txt`, `tiles.txt`, `element-NNN.jpeg`).

## Already in the shared kit (not yours to redo)

The Data Analyst review's fixes to the shared parts were made before this
series was built: every mark on a `DataTable` cell draws, SQL nulls are soft
grey italic, the console box is `consoleHeight()` tall, the highlighter knows
the frame keywords, `Strike` tilts less over a long phrase, `Mono` sets a
sans-width space, `Ink` multiplies a caller's opacity into its fade-out, and
`check:frames` fails on a hyphen set in tabular figures.

## What to fix

- **Every finding**, in the order above. A suggested fix is a suggestion; a
  better fix is fine. Most answer findings are fixed by one clause in the
  narration and, where the screen carries the answer, one short line on screen.
- **The report's times are from before any fix.** Once you change the
  narration, find each finding by its beat id and its `file:line`.
- **A finding you think is wrong** (the frames, the page or `results.json` say
  otherwise): leave it, and give the evidence in your report.
- **Every new number comes from `check.mjs`**, through `results.json` and
  `data.ts`, never typed by hand. Run it as its header says (see "Facts" below).
  Every existing value must come back identical, unless a finding is about that
  value; say which.
- **Answers follow the page** (`content/interview/data-engineer/<page>.mdx`).
  Where the page is wrong, follow the facts and say so in your report; do not
  edit the page.
- Keep the series' color meanings (`video/src/editorial/interview.tsx`): red the
  trap, the wrong answer or the error; green the right answer; yellow what the
  narration points at; blue data.
- **Nothing under 19px**, and no line or rule through a label, in anything you
  touch.
- P3s are polish: prefer the smallest change that removes the defect.

## What you own, and what you must not touch

You may create and edit only:

- `video/src/videos/<folder>/`, your own folder only. No Data Engineer video
  imports from another Data Engineer folder, so all of it is yours. The
  shared parts your scenes import (`da-sql/parts.tsx`, `da-pandas/parts.tsx`,
  `da-advanced-sql/parts.tsx`, `da-statistics-communication/parts.tsx`,
  `ds-*/parts.tsx`, `llm-meaning/parts.tsx`, `list-vs-set/data.ts`) belong to
  other videos: **never edit them**. Copy a piece into your own folder and
  change the copy.
- `video/public/narration/<folder>/`, `video/takes/<folder>/`,
  `video/public/images/<folder>/`
- files under `video/out/` whose names start with `<Id>`
- `$S/<Id>/` for scratch

Never edit anything else: not `src/Root.tsx`, `src/editorial/`, `src/reveals/`,
`src/components/`, `src/narration/`, `src/sound/`, `scripts/`, the README,
`package.json`, another video's folder, or anything in `content/`. If a fix needs
a shared file, build the piece locally in a file of your own folder, or leave
the finding and say exactly what the shared change would be.

Never run `git commit`, `git push`, `git stash`, `git checkout`, `git reset`,
`git clean` or `npm install`. Reading git is fine. The coordinator commits.

## Working alongside eleven others

- `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
- **Every render goes through the queue**, `out/render-slot.sh <command>` (two
  slots, first come first served), from `video/`. That includes stills and
  every `npm run check:*` that renders (motion, sync, mix, frames). Your entry
  is already made: `out/entries/<Id>.tsx`.
- **Bundle your own entry, never the shared Root**: another fixer's half-edited
  folder can break a bundle of `src/index.ts` at any moment.
  - Checks: `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh npm run check:motion -- <Id>`
  - Several stills for one bundle (seconds, not frames):
    `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh node $S/stills.mjs out <Id>:12.5,140,301`
    writes `out/<Id>-<seconds>.jpeg`.
- **Prefer stills to renders**: a few stills at chosen moments, then look at
  them. Crop to the region you changed before you open an image.
- **Typecheck and lint only your folder's errors**:
  `flock $S/tsc.lock npx tsc --noEmit 2>&1 | grep "src/videos/<folder>/"` and
  `npx eslint src/videos/<folder>`. `npm test` and `npm run check:cues` read
  every video: read only the failures that name your folder.
- **Long-running commands** (renders, `narrate`, `check.mjs`) go in the
  background with `timeout: 7200000`: a job waiting in the queue can otherwise
  be killed before it starts. Don't chain more checks into one slot than will
  finish in that time.
- Append one line to `$S/progress/<Id>.log` at each milestone (plan, facts
  re-run, scenes edited, stills checked, voiced, each check passed), with the
  time.

## Facts

`check.mjs` loads its engines (Pyodide, DuckDB-Wasm, Arrow, PGlite) from the
repository root's `node_modules`, which is installed. Run it as its header
says, from `video/`. Do not `npm install`.

## Voice

- Re-voice only beats whose words change. `npm run narrate -- <folder> --only a,b`
  voices exactly those, each on its own. Never `--force`, never a new take.
- **At most 1,200 characters re-voiced for your video** (the count
  `narrate --dry-run` prints), of which at most 400 for P3s. A new beat
  counts. This is half the Data Analyst budget: the ElevenLabs account has
  to cover twelve videos and a re-dub after this pass. If the findings need
  more, do the most important within the budget (P1s and answers first, and
  prefer an on-screen line or a timing change to new narration where either
  does the job) and list the rest in your report.
- **Split before you re-voice.** A beat split at a sentence break, or words
  moved between neighbours without changing the joined text, costs nothing:
  `npm run narrate -- <folder> --recut` cuts it from the kept take (it finds
  each beat in the takes by its text, and never replaces a beat voiced alone).
  Split off the sentence you need to change, then re-voice only that piece.
  After a recut, check that every beat you did not mean to change is
  byte-identical to the committed file (`git diff --stat` on the narration
  folder).
- Timing-only changes (`pauseAfter`, a cue, a hold) cost nothing. Prefer them.
- Narration is prose: no em dashes, no filler, initialisms in plain caps
  (`acronyms.test.ts`). This series writes SQL as "sequel" (and MySQL as "my
  sequel"); keep doing so in new narration, and leave DAG, OLAP and the other
  initialisms as they are written now: a separate re-dub will change how they
  are said. Every cue still names words its beat says
  (`check:cues`), and every cue is a literal `n.word("beat", "phrase")` or the
  `c.w` shorthand the rapid rounds use.
- A beat voiced alone may sound slightly apart from the take; that is accepted.
  `check:sync` must still pass.

## What the Data Scientist fixers learned

- **An SVG `<text>` takes its color from `fill`.** Wrap a text style in
  `svgText()` (`src/editorial/style.ts`); `npm test` fails otherwise.
- **`TABULAR` goes on numbers only** (`<Num>` in `src/editorial/ui.tsx`).
- **`Drift` now ramps up in two seconds**, so lengthening a scene no longer
  stills its opening; `check:motion` still has the last word.
- **Scenes that clear on the bridge's last word leave a blank page** at the cut.
  Hold the finished state until the next scene draws.

## When done

On the final code, through your entry and the queue:

1. Typecheck and lint for your folder, `npm run check:cues`, `npm test`.
2. `check:motion` (nothing still for 3 s).
3. If you re-voiced anything: `check:sync` and `check:mix`.
4. `check:frames` (it now also fails on a hyphen in tabular figures).
5. Stills at every place you changed, each looked at.

Write `agent-outputs/20261105-de-interview-video-review/fixes/<Id>.md` and
return a short summary (the table's counts, characters re-voiced, the new
length, and any check that did not pass) rather than the whole report:

- A table: every finding by its number in your report, fixed / partly / moot /
  not fixed, and one line on what changed or why not.
- Characters re-voiced, and which beats.
- The new length (`npm run cues -- <folder>`) and each check's result.
- Whether every existing value in `results.json` came back identical.
- Anything new you noticed, fixed or left, and any shared change you recommend.
