# AnalyticsEngineer-0-Interview: fixes (second review)

Folder `video/src/videos/ae-interview/`. Review report:
`agent-outputs/20261126-ae-mle-video-review/AnalyticsEngineer-0-Interview.md`
(0 P1, 0 P2, 4 P3). All eight fixes from 2026-11-20 were confirmed on screen
before any change. I committed nothing.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P3 explanation | fixed | Item 1's subline is now "Confident wrong answers from raw tables" (was "Confident wrong answers"). It still inks on "confident wrong answers". It ends at x 645, 128 px clear of the bracket. `AiScene.tsx:90`. |
| 2 | P3 explanation | fixed | Part 9's column title is now "AI assistants" (was "AI layer"), which matches the narration's "the assistants that read them". It fits on one line. `data.ts:90`. `title` is read only by the series chart, so nothing else moved. |
| 3 | P3 house rule | fixed | The probes' four topic lines now start with a capital: "Facts and dimensions", "Models", "Version control", "View, table or incremental". The rest of each line stays lowercase, as in the AI scene's sublines. `HookScene.tsx:104, 115, 128, 139`. |
| 4 | P3 spacing | fixed | The assistant's arrow now starts at `bubbleTop + BUBBLE_H - 16`, 9 to 15 px under the drawn bubble as it bobs (was 71 px), and runs 114 px into "Metric definitions" with the same tip. `AiScene.tsx:253`. |

No finding was judged wrong on second look. The page has no error that bears on this video.

## Voice

**0 characters re-voiced.** No beat's text, pause or cue changed.
`public/narration/ae-interview/` and `takes/ae-interview/` are untouched. In
`script.ts` only the header comment changed: it now describes the
capitalised topic lines and the new item 1 subline.

## Images

None generated.

## Facts

`node video/src/videos/ae-interview/check.mjs` passes ("ok: 7 topic pages, 148
questions, 147 answered by the nine topic videos and 1 here; concept checks
on 7, challenges on 3, bank 110"). `results.json` came back byte-identical
(`cmp` against a copy taken before the run). No value changed and no new
number was needed.

## Length and checks

- Length unchanged: 166.3 s. The after timeline's `beats.json` is identical to the before one.
- Typecheck (`tsc --noEmit`, filtered to `ae-interview/`): clean. eslint on the folder: clean.
- `check:cues`: pass.
- `npm test`: 79 of 79 pass.
- `check:frames` (`CHECK_SCALE=1`, own entry, through the queue): pass. 12 illustrations, largest stretch 0.22. 3 arrows, 0.0 degrees of bend under every head. The spacing, mixed-size and tabular-hyphen audits are clean.
- `check:motion` (own entry, through the queue): pass. 2:46.5 checked, 0 stretches still for 2 s or more. I deleted the preview it left.
- `check:sync` / `check:mix`: not run, since nothing was re-voiced and no sound effect moved.
- Stills, each looked at (`$S/after/AnalyticsEngineer-0-Interview/`): 26.5 s (first topic inking, capitalised), 53 s (all four probes), 72 s (the arrow just drawn), 83 s (item 1's new subline, semantic layer lit), 113 s (the AI scene finished), 145 s (the chart with "AI assistants") and 163 s (the bridge).

## Comparisons

In `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-0-Interview/`:

- `01-item-1-s-subline-says-where-the-wrong-answers-co.png` (finding 1, 113 s)
- `02-part-9-s-column-is-titled-ai-assistants-not-ai-l.png` (finding 2, 145 s)
- `03-the-probes-topic-lines-start-with-a-capital.png` (finding 3, 53 s)
- `04-the-assistant-s-arrow-leaves-the-speech-bubble.png` (finding 4, 113 s)

## Noticed, not changed

- "Still the core" stands alone over the left column for 3.2 s (55.0 to 58.2 s) before "Modeling" inks. That is the outcome the first pass chose for its finding 3, and the stack is on screen meanwhile, so I left it.
