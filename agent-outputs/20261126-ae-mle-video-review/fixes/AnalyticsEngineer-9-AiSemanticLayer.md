# AnalyticsEngineer-9-AiSemanticLayer: fixes (second review)

I changed only my own folder, `video/src/videos/ae-ai-semantic-layer/`
(`SemScene.tsx`, `ReadyScene.tsx`, `ReviewScene.tsx`, `script.ts`). I touched
no shared code, no narration, no takes and no images, and I committed nothing.
The coordinator's work-in-progress snapshot has already picked up the edits.

All twelve fixes from the first review (2026-11-20) still hold on screen. The
`t2s-past` pace (4.4 words/s) is what that pass deliberately left behind,
because only a re-voice would slow it, and it stays as it is. This review
found 4 new problems: 2 P2 (1 of them an accuracy finding) and 2 P3. All 4
are fixed.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P2 accuracy | "last week" drawn as the time grain | fixed | In `sem-active`, "last week" now fills the **filters** slot on "last week", and the time grain slot reads "week" 6 frames later. A range on time is a filter; week is the grain (`SemScene.tsx`). |
| 2 | P2 | A green 440.00 beside the already-struck description, and the caution column idle for about 8 s | fixed | The arrow, the label "Net revenue, in SQL written from the description" and the green as-written 440.00 now come in on "documentation is now an input", before the strike. When the strike lands ("Drop the words"), 440.00 steps down into "As written, 440.00" and the value slot stays empty. The red 1190.00 still arrives on "eleven hundred ninety" (`ReadyScene.tsx`: `Swap` takes a `cutAt`; the unused `letterAt` cue is removed). |
| 3 | P3 | "Real statuses: completed, refunded, cancelled" complete for under a second | fixed | `ready-tests` `pauseAfter` went from 0.6 to 1.3. The finished line now holds about 1.9 s after "cancelled" (before: 1.2 s). |
| 4 | P3 | Code identifiers in the prose face | fixed | `ref()` in "Private stops ref()," and `order_id` in "No unique test on order_id" and "Merged on order_id" are now in the mono face at 0.92em (a local `CODE` style in `ReadyScene.tsx` and `ReviewScene.tsx`). |

I also updated the `script.ts` header ("On screen") for findings 1 and 2.
Earlier passes left one more stale line there, which I did not change: it
still lists an easel spot and an hourglass spot that were never drawn or
placed. That text is not visible to viewers.

## Voice

Characters re-voiced: **0**. No words were wrong or missing; every fix is on
screen or in timing.

## Images

None generated.

## Length

8:35.9 (515.9 s), was 8:35.2 (515.2 s). The extra 0.7 s is the longer
`ready-tests` pause.

## Checks (final code, through `out/entries/AnalyticsEngineer-9-AiSemanticLayer.tsx` and the queues)

| Check | Result |
| --- | --- |
| `check.mjs` | ok (PostgreSQL 18.6 / PGlite 0.5.16; readings 1450 / 1190 / 440; loads 6, 10, 7) |
| typecheck (my folder) | pass, no errors |
| lint (my folder) | pass |
| `check:cues` | pass |
| `npm test` | 79 of 79 pass |
| `check:frames` (`CHECK_SCALE=1`) | pass (13 images, largest stretch 0.40; 24 arrows, worst 2.6°; spacing, mixed-face and tabular checks all pass). Two transient `[overlap]` audit lines at frame 11760 (392.0 s): the inserted `unique_key='order_id'` growing into the config line, the same lines the first pass recorded at 391.5 s. Not a failure, and that code is untouched. |
| `check:motion` | pass: 8:36.0 checked, nothing holds still for 3 s (the preview is deleted) |
| `check:sync`, `check:mix` | not run: nothing was re-voiced |

I looked at stills at every changed place: 150.5, 178, 216.2, 230.7, 246.5,
253, 255.5, 376.7 and 420.2 s, in
`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/after/AnalyticsEngineer-9-AiSemanticLayer/`.

## results.json

Every value came back identical. I re-ran `check.mjs` and diffed the output
against the copy taken before the run: it matched.

## Comparisons

In `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-9-AiSemanticLayer/`:

- `01-last-week-is-a-filter-the-grain-is-week.png` (finding 1)
- `02-the-input-is-drawn-while-it-is-named.png` (finding 2, the caution column)
- `02-no-green-440-beside-the-struck-description.png` (finding 2, the strike)
- `03-the-real-statuses-hold-before-access-replaces-th.png` (finding 3)
- `04-ref-in-the-mono-face.png`, `04-order-id-in-the-mono-face-grain-note.png`, `04-order-id-in-the-mono-face-merge-count.png` (finding 4)

The before stills I queued from the frozen copy hit the 2-hour background
limit while still waiting in the render queue. Every before side therefore
uses the review's one-a-second frames, which fall within a second of the
matching after moment. In the finding 3 comparison the before frame is from
217.0 s and the after frame from 216.2 s; its caption gives both times
relative to "cancelled" so the comparison stays honest.
