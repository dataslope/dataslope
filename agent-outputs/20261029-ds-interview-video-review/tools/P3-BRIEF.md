# Data Scientist interview videos: P3 fix brief

Your video's P1s and P2s are fixed and committed. Fix its **P3s**, the polish
findings. Everything in [`FIX-BRIEF.md`](FIX-BRIEF.md) still holds (what you
own, what you must not touch, no commits, the render queue and your private
entry, the checks, the report), with the changes below. Read it first, then
this.

`S` = `/tmp/claude-0/-home-user-dataslope/88cfe488-c05f-574c-9944-997241c528bb/scratchpad`.

## What to fix

- **Every P3 in your report** (`agent-outputs/20261029-ds-interview-video-review/<Id>.md`)
  that is not already done. Your video's P2 fix report,
  `agent-outputs/20261029-ds-interview-video-review/fixes/<Id>.md`, lists the
  P3s already fixed on the way; skip those. A P3 that a P2 fix made moot (the
  scene it describes is gone or changed), mark moot and say why.
- **Already done centrally** (commit `05b0cad8`), skip: a listing highlight
  starting at the indent (`da-pandas`, `da-sql` listings), wide spaces in
  `QMono` inline code, and tabular hyphens in the shared `Axes` titles.
- **The report's times are from before the P2 pass**, and most videos are now
  longer. Find each finding by its beat id and its `file:line`, not its time.
- **A finding you think is wrong** (the frames, the page or `results.json` say
  otherwise): leave it, with the evidence in your report.
- **A P3 that needs the shared kit** (`src/editorial/`, `src/components/`,
  another video's folder, including the `da-*` parts): don't edit it. Do the
  local version if one is reasonable, or leave it and say exactly what the
  shared change would be. The coordinator makes shared changes.
- P3s are polish: prefer the smallest change that removes the defect.

## Voice

- **At most 1,000 characters re-voiced** for your video. Most P3s are screen
  only; spend voice only where a P3 is about what is said. If the P3s need more,
  do the most important within the budget and list the rest.
- Split before you re-voice, as before. `narrate --recut` refuses most of these
  videos because their takes are stale (beats were re-voiced alone after the
  take). The P2 fixers' workaround that splits a beat from its own file with
  narrate's own cutter is `$S/DataScientist-4-MlModels/tools/split.mjs`: copy
  it into `$S/<Id>/`, change its `ID` to your folder, and check that re-cutting
  an untouched beat reproduces the committed file before you trust it.

## What the P2 fixers learned

- **`check.mjs` needs modules the repo does not have installed.** Do not
  `npm install`. Reuse the private copies the P2 fixers made:
  - Pyodide 314.0.7: `NODE_PATH=$S/DataScientist-1-Statistics/pyo/node_modules`
  - DuckDB-Wasm, Arrow, PGlite (the SQL video):
    `$S/DataScientist-10-Sql/deps/node_modules`, with the resolver hook
    `$S/DataScientist-10-Sql/hook.mjs` (see that video's P2 fix report).
  Every existing value in `results.json` must come back identical; say so.
- **Long background jobs get killed while they wait in the queue.** Give every
  queued background command `timeout: 7200000`, and don't chain more checks
  into one slot than will finish in that time.
- **An SVG `<text>` takes its color from `fill`.** `label()` and `note()` set
  CSS `color`, which SVG text ignores, so it draws black. Set `fill` on any SVG
  text whose color matters.
- **`TABULAR` over a whole span sets hyphens a digit wide** ("p - value").
  Put it on the number spans only.
- **`Drift` eases in over the whole scene**, so making a scene longer can make
  its opening card hold still; `check:motion` will say.
- **Every cue is a literal `n.word("beat", "phrase")`** (or the `c.w` shorthand
  the rapid rounds use): a wrapper function hides cues from `check:cues`.

## When done

The same checks as `FIX-BRIEF.md`, on your final code: typecheck and lint for
your folder, `check:cues`, `npm test`, `check:motion`, and `check:sync` plus
`check:mix` if you re-voiced anything. Stills at every place you changed, each
looked at.

Write `$S/p3/<Id>.md` and return the same text: a table of every P3 by its
number (fixed / partly / moot / not fixed, one line each), characters re-voiced
and which beats, the new length, each check's result, and any shared-kit change
you recommend.
