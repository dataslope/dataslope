# BackendEngineer-0-Interview: fixes

Folder `video/src/videos/be-interview/`. Review report:
`agent-outputs/20261111-be-interview-video-review/BackendEngineer-0-Interview.md`
(0 P1, 1 P2, 7 P3). Nothing committed. The pre-fix baseline is `ca54feec`. The
coordinator's checkpoint `8523f59d` holds part of this work.

Order worked: finding 2 (the answer finding), then 1 (P2), then the other P3s.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 confusion | fixed | The single "Part 9: the AI-allowed round" line under both allowed rows is gone (`AiScene.tsx`, was 333-346). Each allowed row now ends in its own part tag, `label(22, BLUE_INK)`, 40px after the text, inking 12 frames after the row: "Part 9" on "Extend a multi-file project, assistant built in" (`partOf("be-ai-round")`) and "Part 7" on "Read, debug and speed up unfamiliar code" (`partOf("be-code-review")`). These match the labels on the `ai-moved` blocks 30 s later. The banned rows carry no tag (`Format.part` is optional). `ai-moved` was re-voiced as "So the time has moved to live rounds, **including those two**, where the interviewer watches you reason: …", so the repeat reads as the same rounds seen again. Still at 47 s. |
| 2 | P3 answer | fixed (narration + screen) | `ai-ask` was split at its sentence break, free (`--recut`): `ai-ask` "Ask the recruiter, … and prepare for both." and `ai-ask-practice`. The new beat was then re-voiced on its own as "Algorithm practice still matters where it isn't, and in phone screens; where it is, practise driving and checking the assistant." On screen, on "practise driving and checking the assistant", the allowed column's caption crossfades from "graded on how you drive and check it" to "practise driving and checking the assistant: **Part 9**". That mirrors the banned side's "algorithm practice still matters: Part 8" (still at 121.5 s). **Automated tests:** carried on screen only. The take-home line now reads "An assistant can finish a take-home / or an online test, and nobody sees how." on two lines (still at 62 s and 80 s). `ai-why` was not re-voiced (105 characters), because the P3 budget went to finding 7. The report's single-line version would have crossed the hairline at x = 960: at 26px the extended line ends near x = 1050, so the clause moved to the second line instead. `check.mjs` now also holds the page's "algorithm practice still matters for AI-off rounds and phone screens" and "take-home projects and automated code tests have lost", plus the narration's "and in phone screens". |
| 3 | P3 | fixed | `recede = 1 - 0.6 * panel` multiplies both heads ("AI allowed", "AI banned") and both captions, so the fork greys back while the take-home and survey panel is up and returns at `ai-moved` (still at 62 s and 80 s: heads at 40%). |
| 4 | P3 | fixed | Part 5's highlight now ends at `n.beat("practice").from - 4`, not at "was design" (`SeriesScene.tsx` `lit`). Still at 156 s: lit through `series-python`. Still at 164 s: not lit during `practice`. |
| 5 | P3 pacing | fixed (timing) | `ai-allowed` takes `pauseAfter: 0.8` (was the 0.55 s minimum), so there is now 0.8 s of air before `ai-allowed-who`. Not re-voiced: the beat's own rate (3.73 words/s) is the take's. Trimming it would have dropped "and check it", the grading criterion the finding wants kept, and the budget went to the answer and the garbled line. |
| 6 | P3 | fixed | The label reads "of leaders say AI makes technical skills harder to assess". It ends at x ≈ 1730, inside the page, and pairs with "of organizations …" below it (still at 80 s). |
| 7 | P3 | fixed | `practice` was re-voiced: "Every topic page has concept checks, three of them add challenges that run in the browser, and …". The cue is now `"three of them add challenges"`, and `check.mjs`'s claim is `"${n} of them add challenges"`. |
| 8 | P3 | fixed | The headline is now `lead="What every round tests,"` with the same turn "and what backend adds." on "Backend roles add" (`HookScene.tsx`). Still at 16 s. |

No finding was judged wrong. The page agrees with each fix: the code comprehension round is Part 7's, and the page has "phone screens", "the habits on this page matter for AI-on ones" and "automated code tests". There is no error on the page.

## Voice

**511 characters re-voiced** (the `narrate --dry-run` count), each beat on
its own, no new take, no `--force`:

- **P2, 211:** `ai-moved`.
- **P3s, 300:** `ai-ask-practice` 128 (finding 2) and `practice` 172 (finding 7).

Free: `ai-ask` was split into `ai-ask` and `ai-ask-practice` and recut from
take-1 before the new sentence was voiced. A per-beat comparison of
`alignment.json` against `ca54feec` shows only `ai-ask`, `ai-ask-practice`,
`ai-moved` and `practice` differ. Every other beat's entry and `meta` are
identical, every other MP3 is untouched, and `takes/be-interview/` is
untouched.

Left for budget: `ai-why`'s "or an automated test" (105 characters). It is carried on screen as "or an online test".

## Facts

`node video/src/videos/be-interview/check.mjs` passes ("ok: 7 kept pages, 127
questions, 125 answered by the nine topic videos"). `results.json` came back
byte-identical: no value changed and no new number was needed.

## Length and checks

- New length: narration 179.5 s (`npm run cues -- be-interview`, 19 beats,
  380 words, 127 wpm); the composition runs 2:59.8, up from 170.4 s.
- Typecheck and eslint, folder only: clean.
- `check:cues` / `npm test`: no failure names `be-interview`. The failures
  that remain are other folders' in-progress cues (`be-ai-round`,
  `be-api-design`, `be-code-review`, `be-concurrency`, `be-scaling`).
- `check:motion`: pass (0 stretches still for 2 s or more).
- `check:sync`: pass (worst +0.02 s, `ai-banned`).
- `check:mix`: speech a median 29.5 dB above the effects, closest 9.9 dB at 2:19.8 (no change to the effects).
- `check:frames`: FRAMES_RESULT
- Stills at 16, 47, 62, 80, 121.5, 156 and 164 s were each looked at.

## Noticed

- The `ai-ask-practice` crossfade replaces the allowed caption rather than
  adding a third line under it. "practise driving and checking the
  assistant" carries the old caption's "drive and check" criterion, so
  nothing is lost.
- No shared change is needed.
