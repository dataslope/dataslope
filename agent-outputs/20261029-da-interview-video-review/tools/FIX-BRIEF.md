# Data Analyst interview videos: fix brief

Your video has been reviewed. Fix **every finding in its report**, in this
order: the **P1s**, then the **answer** findings (P2 and P3), then the **other
P2s**, then the **other P3s**. This is the pass the Data Scientist videos had in
three rounds (`agent-outputs/20261029-ds-interview-video-review/tools/FIX-BRIEF.md`
and `P3-BRIEF.md`), done in one.

`S` = `/tmp/claude-0/-home-user-dataslope/88cfe488-c05f-574c-9944-997241c528bb/scratchpad`.
`V` = `/home/user/dataslope/video`. Eight other fixers work in the same tree at
the same time, one per video.

## Read

1. Your report: `agent-outputs/20261029-da-interview-video-review/<Id>.md`. Every
   finding has a time, a beat, a cause (`file:line`) and a suggested fix.
2. The summary, `agent-outputs/20261029-2148-da-interview-video-review.md`, for
   the series-wide patterns and the color meanings.
3. `video/README.md`, "What goes on screen" and "Narration and timing",
   including "Writing initialisms for the voice".
4. The review's frames, one a second, before any fix:
   `$S/review-da/frames/<Id>/` (`timeline.txt`, `tiles.txt`, `element-NNN.jpeg`).

## Already done centrally (skip these findings, but check them in your stills)

In the shared parts, before this pass:

- **`DataTable` draws every mark on a cell** (`da-sql/parts.tsx`,
  `da-pandas/parts.tsx`), in cue order: a later mark wipes in over an earlier
  one. Highlights that never drew before now do. Check that each looks
  intended at its moment, and fix the cue in your scene if not.
- **A SQL `null` cell is soft grey italic**, the way a client prints it. Red is
  left to a `MARK_BAD` mark on a null that is the trap.
- **The console box** (`da-pandas`) is `consoleHeight()` tall, padding included,
  so its last line sits inside it.
- **The SQL highlighter** colors `QUALIFY`, `ROWS`, `RANGE`, `BETWEEN`,
  `UNBOUNDED`, `PRECEDING`, `FOLLOWING`, `CURRENT`, `ROW`, `RECURSIVE`,
  `FILTER`, `USING`, `WITHIN` and `TIMESTAMP`.
- **`Strike` tilts less over a long phrase**, so it never rises more than about
  0.12em.
- **`Mono` sets a sans-width space**, like `QMono`.
- **Tabular figures:** Spreadsheets' sheet cells and formula result, and
  AI-assisted analysis's numbered steps, now set `TABULAR` on numbers only.
  `npm run check:frames` now fails on any hyphen set in tabular figures, in
  literal text or in a value.

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
- **Answers follow the page** (`content/interview/data-analyst/<page>.mdx`).
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

- `video/src/videos/<folder>/`, **except these files, which other videos
  import**:
  - `da-sql/parts.tsx`, `da-pandas/parts.tsx` and
    `da-statistics-communication/parts.tsx`: never edit.
  - `da-advanced-sql/parts.tsx`: you may edit it, but leave `colsOf`, `geoOf`
    and `rowsAt` exactly as they are (the Data Scientist SQL video uses them).
  - `da-statistics-communication/data.ts`: leave `CORR` exactly as it is (the
    Data Scientist Statistics video uses it).
- `video/public/narration/<folder>/`, `video/takes/<folder>/`,
  `video/public/images/<folder>/`
- files under `video/out/` whose names start with `<Id>`
- `$S/<Id>/` for scratch

Never edit anything else: not `src/Root.tsx`, `src/editorial/`,
`src/components/`, `src/narration/`, `src/sound/`, `scripts/`, the README,
`package.json`, another video's folder, or anything in `content/`. If a fix needs
a shared file, build the piece locally in a file of your own folder, or leave
the finding and say exactly what the shared change would be.

Never run `git commit`, `git push`, `git stash`, `git checkout`, `git reset`,
`git clean` or `npm install`. Reading git is fine. The coordinator commits.

## Working alongside eight others

- `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
- **Every render goes through the queue**, `out/render-slot.sh <command>` (two
  slots, first come first served), from `video/`. That includes stills and
  every `npm run check:*` that renders (motion, sync, mix, frames).
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

`check.mjs` needs engines the repo root does not have installed. Do not
`npm install`. Use the private copies made for the Data Scientist fixes:

- Pyodide 314.0.7: `NODE_PATH=$S/DataScientist-1-Statistics/pyo/node_modules`
- DuckDB-Wasm, Arrow, PGlite: `$S/DataScientist-10-Sql/deps/node_modules`,
  with the resolver hook `$S/DataScientist-10-Sql/hook.mjs` (see
  `agent-outputs/20261029-ds-interview-video-review/fixes/DataScientist-10-Sql.md`).

## Voice

- Re-voice only beats whose words change. `npm run narrate -- <folder> --only a,b`
  voices exactly those, each on its own. Never `--force`, never a new take.
- **At most 2,500 characters re-voiced for your video** (the count
  `narrate --dry-run` prints), of which at most 1,000 for P3s. A new beat
  counts. If the findings need more, do the most important within the budget
  (P1s and answers first) and list the rest in your report.
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
  (`acronyms.test.ts`). Every cue still names words its beat says
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

Write `$S/da-fixes/<Id>.md` and return the same text:

- A table: every finding by its number in your report, fixed / partly / moot /
  not fixed, and one line on what changed or why not.
- Characters re-voiced, and which beats.
- The new length (`npm run cues -- <folder>`) and each check's result.
- Whether every existing value in `results.json` came back identical.
- Anything new you noticed, fixed or left, and any shared change you recommend.
