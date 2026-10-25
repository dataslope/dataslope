# Follow-up pass: brief

PR #716 (all fourteen videos) is merged. The branch
`claude/blissful-goldberg-149yc1` has been reset to the new `main`, which
holds your video exactly as you left it. This pass finishes the findings your
fix report marked "partly", for a new PR.

Every rule from your earlier briefs still holds (`$S/BRIEF.md`,
`$S/FIX-BRIEF.md`): the render queue (`out/render-slot.sh`), your private
entry (`VIDEO_ENTRY=out/entries/<Id>.tsx`), editing only your own folders,
no commits, no lesson edits, every check again at the end.

`S` = `/tmp/claude-0/-home-user-dataslope/2a3cc9a3-7547-5d18-88e1-2b54dd0db0d9/scratchpad`.

Two things are new:

- **Don't touch `measure.py`, `measurements.json` or `data.ts`.** The
  coordinator is correcting lesson errors in parallel, including some code
  blocks your `measure.py` reads, and will update those files afterwards.
  If your fix needs a new number, compute it in a scratch script, note it in
  your report, and the coordinator will fold it in.
- **Re-voice at most 300 characters** this time, each changed beat on its
  own (a plain `npm run narrate -- <folder>`). Splits at a sentence break cost
  nothing (`--recut`).

When done, run every check again (typecheck and lint for your folder,
`check:cues`, `npm test`, `check:frames`, `check:motion`, `check:sync`,
`check:mix`), look at stills of what you changed, and write
`$S/followup/<Id>.md`: each item, done or not and why, characters
re-voiced, new length, check results. Return the same text.
