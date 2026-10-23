# Fix pass: brief

Your video has been reviewed. Fix it, the way the October fix pass fixed the
Statistics and Database Design videos
(`agent-outputs/20261021-1530-course-video-fixes.md`).

`S` = `/tmp/claude-0/-home-user-dataslope/2a3cc9a3-7547-5d18-88e1-2b54dd0db0d9/scratchpad`.

## Read

1. Your review report: `$S/review/reports/<Id>.md` (also committed under
   `agent-outputs/20261023-nlp-llm-video-review/`). Every finding has a time,
   a cause and a suggested fix.
2. The summary, `agent-outputs/20261023-1030-nlp-llm-video-review.md`,
   for the series-wide patterns: they apply to your video even where your
   report doesn't name them.
3. Your original brief, `$S/BRIEF.md`. Every rule in it still holds: what
   you own, the render queue (`out/render-slot.sh`), your private entry
   (`VIDEO_ENTRY=out/entries/<Id>.tsx`), checking only your folder's
   typecheck and lint errors, the progress log, no commits, no lesson edits.

## What to fix

- **Every P1 and P2.** A suggested fix is a suggestion: a better fix is fine.
- **The P3s that are cheap**, which is most of them.
- **A finding you think is wrong** (the frames or the lesson say otherwise):
  leave it, and give the evidence in your fix report.
- **Where a lesson's prose and its own numbers disagree, follow the numbers**,
  and say so in the script header.
- **Deep dives are being built separately** for four ideas: how one attention
  score is computed (Llm-2), why a chat's bill grows faster than the chat
  (Llm-1, Llm-4), Zipf's law on a log-log plot (Nlp-3, Nlp-5), and lemmatizing
  with a part of speech (Nlp-1, Nlp-2, Nlp-3). If your video touches one of
  these, still fix what your report says is wrong or misleading there, but
  don't try to grow the unit into the deep dive: one clear sentence and a
  correct picture is the target.

## Voice

- Re-voice only beats whose words change. A plain `npm run narrate -- <folder>`
  voices exactly those, each on its own; `--only a,b` narrows it. Never
  `--force`, never a new take.
- **At most 900 characters re-voiced for your video** (the count `narrate
  --dry-run` gives). A new beat counts. If the fixes you want need more, do the
  most important within 900 and list the rest in your report.
- Splitting a beat at a sentence break, or moving words between neighbours
  without changing the joined text, costs nothing: `--recut` cuts it from the
  kept take.
- Timing-only changes (`pauseAfter`, a cue, a hold) cost nothing. Prefer them.
- A beat voiced alone may sound slightly apart from the take; that is accepted.
  `check:sync` must still pass, and `narrate --onsets --only <beats>` places
  a re-voiced beat's first word from the audio if it drifts.

## When done

Run every check again on the final code, through your entry and the queue:
typecheck and lint for your folder, `check:cues`, `npm test`, `check:frames`,
`check:motion`, `check:sync`, `check:mix`. Re-take stills at every place you
changed and look at each one.

Write `$S/fixes/<Id>.md` and return the same text:

- A table: finding number, P level, fixed / partly / not fixed, and one line
  on what changed or why not.
- Characters re-voiced, and which beats.
- The new length (`npm run cues`) and each check's result.
- Anything new you noticed and fixed, or left.
