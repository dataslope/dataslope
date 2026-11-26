# MachineLearningEngineer-0-Interview: fixes

Folder `video/src/videos/mle-interview/`. Review report:
`agent-outputs/20261126-ae-mle-video-review/MachineLearningEngineer-0-Interview.md`
(0 P1, 2 P2, 4 P3). Nothing committed by me. The pre-review baseline is
`e7ebb626`.

Order worked: findings 1 and 2 (the P2 answer findings), then 3 to 6.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 answer | fixed | `llm-not` is kept as voiced (its pause after is now 0.55 s, was 0.7). A new beat follows it, `llm-not-when`: "It's the question that separates candidates who've shipped from those who've only prototyped. Often a smaller model or a rule does the job better: tabular prediction, a strict latency or cost budget, or a task a regular expression solves." The first sentence is the page's own clause from the answered question. The cases come from the same page's "When should you not use an LLM?". Item 4 now has the line the other three items have: "a smaller model or a rule does better: tabular prediction, a strict latency or cost budget, a task a regular expression solves". The lead inks on "Often a smaller model or a rule", and each case inks as it is said. The highlight on "When not to use an LLM" holds through the new beat. `script.ts`, `LlmScene.tsx` (new `Led` line). Stills at 124.5 s and 139.5 s. |
| 2 | P2 answer | fixed | Screen only. Item 2's topics now use the index's wording of the same item: "why generation is slow, where GPU memory goes (the KV cache), what batching, quantization and speculative decoding buy". They are cued to the same spoken phrases as before. The line ends at x 1579. Still at 139.5 s. The narration keeps the LLM page's "which lever buys what". |
| 3 | P3 confusion | fixed | The four numbered names now ink into their slots on "four things" (83.7 s, 4 frames apart). Before, each waited for its own beat, and the first arrived at 85.1 s. Each name still lights, gets its part tag and inks its topics on its own beat. The still-asked rows still clear at "What LLMs added", so they are never under "LLMs added four things." A soft tap marks the names. The bare stretch is now 82.3 to 83.7 s, under the headline's turn as it is said (was 82.3 to 85.0). `LlmScene.tsx`, `Item`'s new `inAt`. Stills at 83 s and 84.4 s. |
| 4 | P3 accuracy | fixed | `data.ts` PROBES: MLOps `parts: [7, 8]`. The tag reads "Parts 7 and 8", since latency and cost are Part 7's serving questions and Part 7 also answers 3 of the mlops page's questions. Comments in `data.ts` and the `script.ts` header updated. Still at 70 s. |
| 5 | P3 spacing | fixed | `RoundsScene.tsx`: `NAME_DY` 28 to 22, `TOPICS_DY` 78 to 72. Measured on the 70 s still: 28 to 29 px from each rule to the name under it (was 34 to 35), and 22 to 23 px from each topics line to the next rule (was 15 to 17). |
| 6 | P3 spacing | fixed | `HookScene.tsx`: the flex row holding "and too expensive." and "Fix it." has no `gap` now. The two highlighters' own margins leave one space, about 16 px (was 35 px). `check:frames`' word-gap audit passes. Still at 25 s. |

No finding was judged wrong on second look. The pages have no error here: the
LLM page's "which lever buys what" is vague, not wrong, and the index's
version of the same item names the levers. The video now shows that version.

## Voice

**238 characters re-voiced**, in one new beat. The budget is 400. Nothing
else was re-voiced, and no existing beat's words changed.

- `llm-not` (kept, not re-voiced): "And judgment about when not to use an LLM at all."
- `llm-not-when` (new, voiced alone with `--only`, 15.8 s): "It's the question that separates candidates who've shipped from those who've only prototyped. Often a smaller model or a rule does the job better: tabular prediction, a strict latency or cost budget, or a task a regular expression solves."

`check.mjs` now also checks that the page still says what this beat and the
new on-screen lines quote: the "shipped / prototyped" clause, the cases, and
the index's inference-economics bullet.

## Images

None generated.

## Facts

`node video/src/videos/mle-interview/check.mjs` passes ("ok: 8 topic pages ask
167; this video answers 1 and the ten parts 166 (147 answers, 19 of the
questions answered together with a twin)"). `results.json` came back
byte-identical (`cmp` against the pre-run copy). No new number was needed.
The one changed value is a mapping in `data.ts` (MLOps to Parts 7 and 8, finding 4).

## Length and checks

- Length: 186.0 s to 202.4 s (+16.4 s, all of it the new beat and its pause).
  The LLM scene is now 68.0 s.
- Typecheck (`tsc --noEmit`, filtered to `mle-interview/`) and eslint on the folder: clean.
- `check:cues`: pass. `npm test`: 79 of 79 pass.
- `check:frames` (`CHECK_SCALE=1`, own entry, through the queue): pass. 13 illustrations, largest stretch 0.49; the word-gap, one-size-per-line and tabular-hyphen audits are clean.
- `check:motion`: PENDING
- `check:sync`: PENDING
- `check:mix`: PENDING
- Stills, each looked at: 20, 25, 70, 83, 84.4, 85.5, 101.8, 118, 124.5, 131.8, 139.5 and 196 s (`video/out/review/MachineLearningEngineer-0-Interview/`).

## Comparisons

`$S/compare/MachineLearningEngineer-0-Interview/`, PENDING
