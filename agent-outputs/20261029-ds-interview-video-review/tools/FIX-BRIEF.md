# Data Scientist interview videos: P2 fix brief

Your video has been reviewed, and its P1s are already fixed (commit `53eda7cd`).
Fix its **P2s**, the way the October and NLP/LLM fix passes fixed theirs
(`agent-outputs/20261021-1530-course-video-fixes.md`,
`agent-outputs/20261023-1530-nlp-llm-video-fixes.md`).

`S` = `/tmp/claude-0/-home-user-dataslope/88cfe488-c05f-574c-9944-997241c528bb/scratchpad`.
`V` = `/home/user/dataslope/video`. Eleven other fixers work in the same tree at
the same time, one per video.

## Read

1. Your report: `agent-outputs/20261029-ds-interview-video-review/<Id>.md`. Every
   finding has a time, a cause (`file:line`) and a suggested fix.
2. The summary, `agent-outputs/20261029-1040-ds-interview-video-review.md`, for
   the series-wide patterns, the color meanings and what is deliberate.
3. `video/README.md`, "What goes on screen" and "Narration and timing",
   including "Writing initialisms for the voice".
4. The review's frames are at `$S/review/frames/<Id>/` (one a second, before
   any fix) if you want to see what the reviewer saw.

## What to fix

- **Every P2 in your report.** A suggested fix is a suggestion; a better fix is
  fine. Many P2s are answers that stop one step before an interviewer's
  follow-up: the fix is usually one clause in the narration and, where the
  screen carries the answer, one short line on screen.
- **Not P3s**, except one the same edit fixes for free. List any you fix.
- **A finding you think is wrong** (the frames, the page or `results.json` say
  otherwise): leave it, and give the evidence in your report.
- **Every new number comes from `check.mjs`**, through `results.json` and
  `data.ts`, never typed by hand. Run `check.mjs` the way its header says.
- **Answers follow the page** (`content/interview/data-scientist/<page>.mdx`).
  Where the page is wrong, follow the facts and say so in your report; do not
  edit the page.
- Keep the series' color meanings (`video/src/editorial/interview.tsx`): red the
  trap, the wrong answer or the error; green the right answer; yellow what the
  narration points at; blue data.

## What you own, and what you must not touch

You may create and edit only:

- `video/src/videos/<folder>/`
- `video/public/narration/<folder>/`, `video/takes/<folder>/`,
  `video/public/images/<folder>/`
- files under `video/out/` whose names start with `<Id>`
- `$S/<Id>/` for scratch

Never edit anything else: not `src/Root.tsx`, `src/editorial/`,
`src/components/`, `src/narration/`, `src/sound/`, `scripts/`, the README,
`package.json`, another video's folder (including the `da-*` folders whose
parts your video imports: they are also the Data Analyst videos'), or anything
in `content/`. If a fix needs the shared kit, build the piece locally in your
folder's `parts.tsx`, or leave the finding and say what the kit would need.

Never run `git commit`, `git push`, `git stash`, `git checkout`, `git reset`,
`git clean` or `npm install`. Reading git is fine. The coordinator commits.

## Working alongside eleven others

- `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
- **Every render goes through the queue**, `out/render-slot.sh <command>` (two
  slots, first come first served), from `video/`. That includes stills and
  every `npm run check:*` that renders (motion, sync, mix, frames).
- **Bundle your own entry, never the shared Root**: another fixer's half-edited
  folder can break a bundle of `src/index.ts` at any moment.
  - Checks: `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh npm run check:motion -- <Id>`
  - Stills: `out/render-slot.sh npx remotion still out/entries/<Id>.tsx <Id> out/<Id>-f300.png --frame=300 --scale=1`
  - Several stills for one bundle (seconds, not frames):
    `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh node $S/stills.mjs out <Id>:12.5,140,301`
    writes `out/<Id>-<seconds>.jpeg`.
- **Prefer stills to renders**: a few stills at chosen frames, then look at
  them. Crop to the region you changed before you open an image.
- **Typecheck and lint only your folder's errors**:
  `flock $S/tsc.lock npx tsc --noEmit 2>&1 | grep "src/videos/<folder>/"` and
  `npx eslint src/videos/<folder>`. `npm test` and `npm run check:cues` read
  every video: read only the failures that name your folder.
- Long-running commands (renders, `narrate`, `check.mjs`) go in the background.
- Append one line to `$S/progress/<Id>.log` at each milestone (plan, facts
  re-run, scenes edited, stills checked, voiced, each check passed), with the
  time.

## Voice

- Re-voice only beats whose words change. `npm run narrate -- <folder> --only a,b`
  voices exactly those, each on its own. Never `--force`, never a new take.
- **At most 1,500 characters re-voiced for your video** (the count
  `narrate --dry-run` prints). A new beat counts. If the P2s need more, do the
  most important within the budget and list the rest in your report.
- **Split before you re-voice.** A beat split at a sentence break, or words moved
  between neighbours without changing the joined text, costs nothing:
  `narrate --recut` cuts it from the kept take. Split off the sentence you need
  to change, then re-voice only that piece.
- Timing-only changes (`pauseAfter`, a cue, a hold) cost nothing. Prefer them.
- Narration is prose: no em dashes, no filler, initialisms in plain caps
  (`acronyms.test.ts`). Every cue still names words its beat says
  (`check:cues`).
- A beat voiced alone may sound slightly apart from the take; that is accepted.
  `check:sync` must still pass.

## When done

On the final code, through your entry and the queue:

1. Typecheck and lint for your folder, `npm run check:cues`, `npm test`.
2. `check:motion` (nothing still for 3 s).
3. If you re-voiced anything: `check:sync` and `check:mix`.
4. `check:frames` only if you changed an arrow, an illustration or an ERD.
5. Stills at every place you changed, each looked at.

Write `$S/fixes/<Id>.md` and return the same text:

- A table: every P2 by its number in your report, fixed / partly / not fixed,
  and one line on what changed or why not. Then any P3 fixed on the way.
- Characters re-voiced, and which beats.
- The new length (`npm run cues -- <folder>`) and each check's result.
- Anything new you noticed, fixed or left, and any kit suggestion.
