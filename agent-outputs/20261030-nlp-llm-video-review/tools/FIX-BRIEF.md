# NLP and LLM deep dives: fix brief

Your deep dive has been reviewed. Fix **every finding in its report**, in this
order: the **P1s**, then the **P2s**, then the **P3s**. The pass is the one the
interview videos had
(`agent-outputs/20261029-da-interview-video-review/tools/FIX-BRIEF.md`), with
the differences below for course videos.

`S` = `/tmp/claude-0/-home-user-dataslope/88cfe488-c05f-574c-9944-997241c528bb/scratchpad`.
`V` = `/home/user/dataslope/video`. Three other fixers work in the same tree at
the same time, one per deep dive.

## Read

1. Your report: `agent-outputs/20261030-nlp-llm-video-review/<Id>.md`. Every
   finding has a time, a beat, a cause (`file:line`) and a suggested fix.
2. The summary, `agent-outputs/20261030-0700-nlp-llm-video-review.md`.
3. `video/README.md`, "What goes on screen" and "Narration and timing",
   including "Writing initialisms for the voice" and "Time to take a scene in".
4. The lesson(s) your video follows, named in the header of `script.ts`
   (`content/courses/...`), and the review's frames, one a second, before any
   fix: `$S/review-nlp/frames/<Id>/` (`timeline.txt`, `tiles.txt`,
   `element-NNN.jpeg`).

## What to fix

- **Every finding**, in the order above. A suggested fix is a suggestion; a
  better fix is fine.
- **The report's times are from before any fix.** Once you change the
  narration, find each finding by its beat id and its `file:line`.
- **A finding you think is wrong** (the frames, the lesson or
  `measurements.json` say otherwise): leave it, and give the evidence.
- **Every new number comes from `measure.py`**, through `measurements.json` and
  `data.ts`, never typed by hand. Run it from `video/` with the scratch
  environment, which has the exact versions the site runs (NLTK 3.9.4, NumPy
  2.4.6, and the NLTK data packages):

  ```
  NLTK_DATA=$S/nltk_data $S/pyenv/bin/python -I src/videos/<folder>/measure.py > src/videos/<folder>/measurements.json
  ```

  Unchanged, all four scripts reproduce their committed file, except that
  the two NLP ones now record Python 3.13.17 instead of 3.13.16; keep that
  line as it comes out. Every existing value must come back identical,
  unless a finding is about that value; say which.
- **Follow the lesson.** Where the lesson itself is wrong or inconsistent
  (a finding may say so), follow the facts in the video and say exactly what
  the lesson should change in your report. Do not edit `content/`; the
  coordinator makes lesson edits.
- **Nothing under 19px**, and no line or rule through a label, in anything you
  touch. One color, one meaning within the video.
- P3s are polish: prefer the smallest change that removes the defect.

## What you own, and what you must not touch

You may create and edit only:

- `video/src/videos/<folder>/` (no other video imports it)
- `video/public/narration/<folder>/`, `video/takes/<folder>/`,
  `video/public/images/<folder>/`
- files under `video/out/` whose names start with `<Id>`
- `$S/<Id>/` for scratch

Never edit anything else: not `src/Root.tsx`, `src/editorial/`,
`src/components/`, `src/narration/`, `src/sound/`, `scripts/`, the README,
`package.json`, another video's folder, or anything in `content/`. If a fix
needs the shared kit, build the piece locally in your folder, or leave the
finding and say exactly what the shared change would be.

Never run `git commit`, `git push`, `git stash`, `git checkout`, `git reset`,
`git clean` or `npm install`. Reading git is fine. The coordinator commits.

## Working alongside three others

- `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
- **Every render goes through the queue**, `out/render-slot.sh <command>`, from
  `video/`. That includes stills and every `npm run check:*` that renders.
- **Bundle your own entry**, `out/entries/<Id>.tsx`, never the shared Root:
  - Checks: `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh npm run check:motion -- <Id>`
  - Stills (seconds): `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh node $S/stills.mjs out <Id>:12.5,40`
    writes `out/<Id>-<seconds>.jpeg`.
- **Prefer stills to renders**, and crop to the region you changed before you
  open an image.
- **Typecheck and lint only your folder's errors**:
  `flock $S/tsc.lock npx tsc --noEmit 2>&1 | grep "src/videos/<folder>/"` and
  `npx eslint src/videos/<folder>`. `npm test` and `npm run check:cues` read
  every video: read only the failures that name your folder.
- **Long-running commands** go in the background with `timeout: 7200000`.

## An illustration

If a finding asks to redraw your video's watercolor spot, change its prompt in
your folder's `illustrations.json` and run, from `video/`:

```
NODE_PATH=$S/sharp/node_modules NODE_OPTIONS="--import $S/sharp/hook.mjs" node scripts/illustrations.mjs <folder> --only <id> --force
```

(the repo root has no `node_modules`; this loads the locked sharp from a
scratch copy). It goes through the Batch API and can take several minutes.
Look at the result over white before keeping it.

## Voice

- Your narrator is named in `script.ts` (`voice: "drew"` or `"hope"`).
  Re-voice only beats whose words change, with
  `npm run narrate -- <folder> --only a,b`. Never `--force`, never a new take.
- **At most 1,200 characters re-voiced for your video** (the count
  `narrate --dry-run` prints). If the findings need more, do the most
  important within the budget (P1s, then P2s) and list the rest.
- **Split before you re-voice.** A beat split at a sentence break is cut free
  from the kept take with `npm run narrate -- <folder> --recut`. Then voice
  only the piece whose words change. Afterwards check that every beat you did
  not mean to change is byte-identical to its committed file.
- Timing-only changes (`pauseAfter`, a cue, a hold) cost nothing. Prefer them.
- Narration is prose: no em dashes, no filler, initialisms in plain caps
  (`acronyms.test.ts`). Every cue is a literal `n.word("beat", "phrase")` that
  names words its beat says (`check:cues`).

## When done

On the final code, through your entry and the queue:

1. Typecheck and lint for your folder, `npm run check:cues`, `npm test`.
2. `check:motion`; if you re-voiced anything, `check:sync` and `check:mix`;
   and `check:frames`.
3. Stills at every place you changed, each looked at.

Write `$S/deep-fixes/<Id>.md` and return the same text as your final message
(if the write is refused, return it anyway; the coordinator saves it):

- A table: every finding by its number, fixed / partly / not fixed, and one
  line on what changed or why not.
- Characters re-voiced, and which beats.
- The new length (`npm run cues -- <folder>`) and each check's result.
- Whether every existing value in `measurements.json` came back identical.
- Any lesson change you recommend, with the exact text, and any shared change.
