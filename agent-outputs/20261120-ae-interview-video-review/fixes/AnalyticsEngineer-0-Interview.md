# AnalyticsEngineer-0-Interview: fixes

Folder `video/src/videos/ae-interview/`. Review report:
`agent-outputs/20261120-ae-interview-video-review/AnalyticsEngineer-0-Interview.md`
(0 P1, 1 P2, 7 P3). Nothing committed by me. The pre-fix baseline is `0f98e6f4`;
the coordinator's checkpoint `5ff616cb` holds this work as it stands.

Order worked: finding 1 (P2), then the explanation findings (2 and 7), then the other P3s.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 pacing | fixed | The captions "Data engineering" and "Analytics" no longer fade with the hook's words. They ride up with the row and stay through the probes, until the cut at 54.4 s. Before this they were readable for 2.2 s and 1.1 s. `HookScene.tsx`, the captions' opacity. Still at 21.5 s and 53 s: the caption bottom is at y 344, 96 px clear of the first probe head. |
| 2 | P3 explanation | fixed | "The transformation layer" (`note(24, INK_SOFT)`, centred, 20 px above the stack) inks on "a layer of models" and steps back with the other hook words at `wordsOut`. Still at 8 s. Screen only: the narration still says "a layer of models". |
| 3 | P3 confusion | fixed | `coreAt` is now `n.word("ai", "AI has added")`, the scene's first word, so "Still the core" (+4 frames), the three model boxes (+6, +10, +14) and their taps arrive at 54.8 s, not 56 s. The serif "Modeling, dbt, SQL" still inks word by word. Still at 55 s: the kicker, "Still the core", and the stack building. |
| 4 | P3 spacing | fixed | "Added on top" now inks on `n.beat("ai-four").from - 4` ("So expect four more topics", 75.1 s), not on "not replaced it" (57 s). Its highlight stays on "four more topics", and the hairline still draws on "not replaced it". Stills at 74 s (no heading over the empty column) and 76.5 s (heading lit). |
| 5 | P3 spacing | fixed | The baseline and the nine part names ink on `n.word("series", "This series")` (114.9 s), keeping the 3-frame stagger, so the headline never stands alone over an empty page. The bars still rise one by one on `series-list`, and the total still lands on "hundred and forty-seven". Stills at 115.5 s and 122 s. The band between the headline and the baseline stays empty until the bars rise at 130 s. That is the chart's plot area, and it now reads as a chart waiting for its data. |
| 6 | P3 confusion | fixed | `<Mark at={askAt + 2} out={moreAt - 4}>`: the highlight on "Ask the recruiter, round by round." clears as "Part nine covers" begins. Still at 112.9 s. |
| 7 | P3 explanation | fixed | Item 2's subline now reads "Docs, tests, access rules for a language model" and inks on "documentation". It has no "and", so it matches item 4's "Grain, incremental logic, duplicate metrics". The report's first wording, "Docs, tests and access rules, for a language model", ended at x ≈ 748, 26 px from the bracket's tick. The short form ends at x ≈ 698. Still at 112.9 s. |
| 8 | P3 spacing | fixed | Probe heads now sit at `top + 22` (was `+ 18`). Measured on the 53 s still: 28-29 px under each rule (was 24-25) and 31-36 px from the text above each rule. |

No finding was judged wrong on second look. None needed the page's wording to change, and the page has no error here.

## Voice

**0 characters re-voiced.** Every fix is on screen or in timing. No beat's
text or pause changed, and `public/narration/ae-interview/` and
`takes/ae-interview/` are untouched. The `script.ts` diff is only its header
comment, which now describes the new screen.

## Facts

`node video/src/videos/ae-interview/check.mjs` passes ("ok: 7 topic pages,
148 questions, 147 answered by the nine topic videos and 1 here; concept
checks on 7, challenges on 3, bank 110"). `results.json` came back
byte-identical (`cmp` against the pre-run copy). No value changed and no new
number was needed.

## Length and checks

- Length unchanged: 166.3 s (`npm run cues -- ae-interview`, 21 beats, 350 words).
- Typecheck (`tsc --noEmit`, filtered to `ae-interview/`) and eslint on the folder: clean.
- `check:cues`: pass ("every word cue names a phrase its beat says").
- `npm test`: 79 of 79 pass.
- `check:frames` (`CHECK_SCALE=1`, own entry, through the queue): pass. 12 illustrations, largest stretch 0.22; 3 arrows, 0.0 degrees of bend; spacing, mixed-size and tabular-hyphen audits clean.
- `check:motion` (own entry, through the queue): pass. 2:46.5 checked, 0 stretches still for 2 s or more. The preview it left (`out/AnalyticsEngineer-0-Interview-preview.mp4`) is deleted.
- `check:sync` / `check:mix`: not run, since nothing was re-voiced and no sound effect moved except the AI scene's three stack taps, which moved 1.2 s earlier with the boxes.
- Stills, each looked at: 8, 20, 21.5, 53, 55, 57, 74, 76.5, 90, 90.5, 112.9, 113, 115.5 and 122 s (`video/out/review/AnalyticsEngineer-0-Interview/`).

## Noticed

- With the highlight cleared, the gap between "assistant." and "Ask the recruiter" reads a touch wide, because `Mark` keeps its 0.14 em margin when the band is gone. That is the shared component's convention (README, "A space stays a space"), so I left it.
