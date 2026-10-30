# Data Engineer interview videos: state at the pause (2026-10-30)

Paused at the user's request near the session's usage limit. Every
builder was stopped and every render killed; all work is committed.

## Finished (built, voiced with Drew, every check passed)

| Part | Folder | Length |
| --- | --- | --- |
| 0 Overview | de-interview | 2:13 |
| 2 SQL performance | de-sql-performance | 7:09 |
| 8 Streaming | de-streaming | 9:28 |
| 9 Warehousing | de-warehousing | 7:25 |

Their reports are in `reports/`.

## Voiced, final checks not all run

Each was voiced once (no re-voices) and has its stills checked; what is
left is the remaining checks on the final code, then a final look at
stills. Resume by running them through `video/out/render-slot.sh` with
`VIDEO_ENTRY=out/entries/<Id>.tsx` (recreate `out/` from the brief if the
container was reset: `render-slot.sh`, `frames.mjs` and `entries/` are
scratch and gitignored).

| Part | Folder | Done | Left |
| --- | --- | --- | --- |
| 1 SQL patterns | de-sql-patterns | voiced (8,004 chars, 9:46), voiced stills fixed | sync, mix, motion, frames |
| 3 Dimensional modeling | de-dimensional-modeling | sync, motion, mix, frames passed; effects then raised | mix again, final stills; the builder had started re-editing the hook scene when stopped, so check it renders |
| 4 Modeling history | de-modeling-history | motion, sync, mix passed | frames; the builder was mid-edit on the data vault scene, so check it renders |
| 5 Python | de-python | sync, motion passed (10:31) | mix, frames |
| 6 Pipelines | de-pipelines | sync passed; effects raised 4 dB | mix, motion, frames; was mid-edit on `parts.tsx`, so check it renders |
| 7 Distributed | de-distributed | motion, sync passed (10:04) | mix, frames |
| 10 Orchestration | de-orchestration | sync passed | motion, mix, frames |
| 11 Pipelines for AI | de-pipelines-for-ai | sync, motion passed | mix, frames |

Before anything else on resume: `npx tsc --noEmit`, `npm run lint`,
`npm test`, `npm run check:cues` in `video/`, since three builders were
stopped mid-edit.

## Page fixes already made

Committed in "Data Engineer pages: fix the errors the video builders
found" and "Streaming: a watermark subtracts an out-of-orderness bound".
Found but left alone (other tracks): about ten challenge tests in the
Analytics Engineer, Backend Engineer, Data Analyst and Data Scientist
pages whose description gives the wrong row count.
