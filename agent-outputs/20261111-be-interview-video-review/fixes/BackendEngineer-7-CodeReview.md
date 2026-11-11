# BackendEngineer-7-CodeReview: fixes

Video `be-code-review`, from the review in
`agent-outputs/20261111-be-interview-video-review/BackendEngineer-7-CodeReview.md`.
Length 430.8 s before, **465.7 s (7:46) after** (`npm run cues -- be-code-review`).

## Findings

| # | Sev | Status | What changed |
| - | --- | ------ | ------------ |
| 1 | P2 answer | fixed | Step 5's on-screen answer narrowed to "the sort guarantees the order the loop needs". New beat `debug-more` closes the round: "Then read the lines beside the sort: the report found one bug, and there are two more.", with the `<` and `= end` lines marked yellow, then red, and a note "the report found one bug; two more sit beside the sort". `review-diff`'s opening sentence was split off as `review-back` and re-voiced: "A review before it shipped would have caught all three. Go back to the diff as it arrived." The script header's argument is now said aloud. |
| 2 | P2 | fixed | Checklist row split: "does what was asked" (flagged red on "The code keeps them apart") and "and nothing else" (ticked on "It touches one function", as before). |
| 3 | P2 | fixed | `debug-cause` pauseAfter 0.6 to 1.2 s. The report value lands at `allAt - 2`, the reproduction's at `allAt`, the rerun ticks at `allAt + 2 + i*4`. The rerun row stays until "Here, the loop relied…", and step 5's lines sit one row lower (`B + 56 + i*56`). |
| 4 | P2 | fixed | `debug-ai` moved out of step 5, to just after `debug-hypo` (inside step 3, where an assistant's answer is a hypothesis), so step 5's three parts run straight into `debug-past`. Step 5's lines stay until the test grid draws, the third question is highlighted on "And what else shares the flaw?", and step 5 stays lit to the scene's end. `Steps` (my folder's `parts.tsx`) gained `relight.until`: step 2 is relit only for the aside and hands the light back at step 4, and no other row is lit while it is. The move cost nothing (cut from the kept take). |
| 5 | P2 answer | fixed | `next` split into `next` / `next-cost` / `next-line`; `next-cost` re-voiced: "On input already in order, the sort costs close to one pass. The other choice is to require sorted input and let callers sort. For a helper this small, sort inside: the bug report came from a caller who didn't." On screen: the sort's comparisons on 1,000 intervals, 999 in order and 8,658 shuffled (new `cost` in `check.mjs`/`results.json`/`data.ts`, with a check that the in-order count is n − 1), then "or require sorted input?", "small helper: sort inside" (green) and "a caller already didn't sort". |
| 6 | P3 | fixed | Kinds now `["assumption", "boundary", "assumption"]`. |
| 7 | P3 | fixed | Symptom patch: `if iv[0] <= iv[1]` gets a red mark on "come back as an empty list". The SQL f-string sits on a red band (as `inplace=True` does). Half-open slots are now drawn in `BAR` (blue), with the open circles kept. |
| 8 | P3 | fixed | The "+3 −3" tab leaves at `closeIn` and a plain `intervals.py` tab replaces it. |
| 9 | P3 | fixed | Contained case now reads in / number line / "should be [[1, 10]]" (green) / "returns [[1, 3]]" (red) / "the merge shrank it", the same order as the touching case. |
| 10 | P3 | fixed | Stat shortened to "with ends 0 to 4, no single interval fails; 35 of 225 pairs do". |
| 11 | P3 answer | fixed | `debug-ai`'s last sentence split off as `debug-ai-sub` and re-voiced: "It's no substitute for step two: what it tells you is a hypothesis, and only a failing test proves it." (pauseAfter 0.8). On screen the line continues ": its answer is a hypothesis, a failing test proves it". |
| 12 | P3 answer | fixed (differently) | New beat `review-empty`: "The empty list and a single interval come back fine, and it hides no errors." Under the listing: `in [] returns []` ✓, `in [[5, 5]] returns [[5, 5]]` ✓, "no try or except: no error is hidden". The row keeps the page's label "handles boundaries and error paths", since both halves are now examined aloud. |
| 13 | P3 | fixed | The Boundaries card draws on "The usual suspects" (`suspectsAt + 2`), right after the survey leaves, so there is no empty page. |
| 14 | P3 | fixed | Headline "Most interview code, you didn't write." |
| 15 | P3 | fixed | The quote marks moved inside the `Mark` on the debug brief. The invented-package line's highlight span takes `marginLeft: -0.14em`, so the gap after the colon is one space. |

## Voice

There is **564 characters re-voiced** (budget 1,000), each beat voiced on its own with `--only`:

- P2: `debug-more` (87), `review-back` (89), `next-cost` (210)
- P3: `debug-ai-sub` (102), `review-empty` (76): 178 of the 300 allowed

The splits were cut free from the kept takes with `--recut`: `debug-ai`, `review-diff`, `next`, `next-line`. The recut changed only those beats' files. Every other beat's mp3 stayed byte-identical (checked with `git status` before voicing).

## Facts

`check.mjs` was run again: 21 runs pass. **Every existing value in `results.json` came back identical.** The only new key is `cost` (`n` 1,000, `inOrder` 999, `shuffled` 8,658). New narration checks are in `claims`: `review-empty` and `next-cost`.

## Checks (on the final code, through `out/entries/BackendEngineer-7-CodeReview.tsx` and the queue)

- tsc and eslint report no errors in `src/videos/be-code-review/`.
- `check:cues`: nothing names this folder. `npm test`: 79 pass, 0 fail. An earlier run failed only on `be-concurrency` cues, which belong to another fixer.
- `check:motion`: pass (7:45.8; no still stretch of 2 s or more).
- `check:frames`: pass.
- `check:sync`: pass (37 beats, worst +0.03 s at `review-empty`).
- `check:mix`: pass (speech at least 13.1 dB above the effects).
- Stills looked at, at 4, 56.5, 101, 156, 195, 230, 239, 250, 263, 270, 282, 293, 331, 357, 369, 375.5, 436, 459 and 463 s. They cover the headline, the Boundaries card arriving on "The usual suspects", the red SQL band, the quotes inside the highlight, the shortened stat, the aside with only step 2 lit, the rerun ticks with the payoff held, step 5 one row lower, the grid with the third question marked, the `debug-more` red marks and note, the split checklist, contained "should be", empty/single, the blue slots, and the closing cost table. After the first set I made two touch-ups: the `test_intervals.py +9` tab now also leaves at the closing, and 999 is right-aligned under its highlight. Both were checked on a new still.

## Notes

- The coordinator's WIP checkpoint (8523f59d) already holds most of this work. Only the later edits show as uncommitted.
- `Steps.relight` gained an optional `until` in this folder's own `parts.tsx`. No shared file was touched.
- Prettier flags formatting in this folder, including files I did not touch (`Video.tsx`). I left it alone, since `lint` passes.
