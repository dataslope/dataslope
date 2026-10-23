# Llm-3-Generation: fix pass

Review: `$S/review/reports/Llm-3-Generation.md` (0 P1, 9 P2, 11 P3). **All 20 findings fixed.** Not committed.

| # | P | Result | What changed |
| --- | --- | --- | --- |
| 1 | P2 | fixed | Re-voiced `hedge-why`: "...but they land on right and wrong answers alike, because nothing inside knows which ones are wrong." Fig. 10 is now "What the instruction gets you": ✓ "More hedges", ✗ "Hedges that pick out the wrong answers", and under it "They land on right and wrong answers alike." (cued to "alike"). |
| 2 | P2 | fixed | Re-voiced `costs`: "In a million-token window, a five hundred thousand token document resent over ten turns is five million tokens billed, unless a cache steps in." Fig. 14 is titled "...in a 1,000,000-token window, resent every turn". Under "unless a cache steps in": "A cache bills a repeated prefix at a tenth of the input price or less (Unit 4)", from pricing-structure.mdx. |
| 3 | P2 | fixed | The chips have their own row above the `NextLine`: "Every token it [reads] [writes] [thinks] all on the bill". "reads" is grey (input), and none of it sits near "output rate". |
| 4 | P2 | fixed | The pay bar (106 + 13) draws on "output tokens", "106 thinking tokens, hidden" arrives on "see them", "pay output prices" is highlighted on its words, and the "You read" row arrives on "read thirteen". |
| 5 | P2 | fixed | Fig. 17: "(log scales)" in the title, "(log scale)" on the x axis, and a note on "fifteen thousand": "On log axes, a square is a line twice as steep." The reference line is now dashed (`0.012 0.009` in `pathLength` units). Fig. 19's axis: "Thinking tokens (each step past 250 doubles)". |
| 6 | P2 | fixed | Re-voiced `permission`: adds "Paste the three chapters that matter, and put the key facts first or last." On screen: green tags "key facts here" / "or here" at the curve's two ends on "first or last", and "The three chapters that matter, not the whole manual." on "three chapters". |
| 7 | P2 | fixed | Each of the first three fixes gets the lesson's reason under it, held to the cut: "the fact is in the context, not the weights", "a query you can run beats a number you must trust", "a schema leaves no field to invent". NOT_FOUND keeps its `exit` line. `works` pauseAfter 0.6 → 1.0. |
| 8 | P2 | fixed | The three draws land during the sentence (from "lines of code"), with "21.6%, drawn anyway" under the dog chip. `picker` pauseAfter 0.8 → 2.0, so the finished figure holds about 6 s. |
| 9 | P2 | fixed | Re-voiced `overthink` shorter: "On an easy problem, more thinking can even talk it out of a right answer." 2.9 words/s, down from 3.85. pauseAfter 1.0. The on-screen line matches. |
| 10 | P3 | fixed | The dial now stops at 1 before going on to 1.5. "Above 1, the gaps shrink." waits until it is past 1. |
| 11 | P3 | fixed | "Greedy decoding." sits on its own line. |
| 12 | P3 | fixed | Only the first cell of a one-kept row is padded, so the Sure row ends with the Torn row and Fig. 3. |
| 13 | P3 | fixed | Fig. 8 is captioned "The pattern of a citation, learned from millions of examples". I kept the "Journal" slot because the narration says "a journal". |
| 14 | P3 | fixed | Fig. 6's picks are grey (trunk grey 400, branches grey 600) and its labels are in ink. Fig. 13's turns are History teal. Both Fig. 16 grids are red, the color of "the work"; the token markers stay blue, the color of "the text". |
| 15 | P3 | fixed | Item 4's highlight lifts before item 1's comes on. |
| 16 | P3 | fixed | Figs. 16 and 17 dim to 45% for the turn into reasoning models. |
| 17 | P3 | fixed | Fig. 5: "Five runs of eight picks, one fixed seed (the lesson's block)", and its legend adds "from scores 1.0, 0.9 and 0.8, on every pick". The sampler's runs are labelled "The sampler, three runs", so "the sampler" in `hall-in` has a referent. Fig. 20: "...counted in the course tokenizer's tokens (o200k_base)". Fig. 21: "Reasoning effort, the setting reasoning models expose", and the re-voiced `effort` beat names it ("Most providers give you a reasoning effort setting..."). |
| 18 | P3 | fixed | "set on purpose" sits under the knob, in the label's red. |
| 19 | P3 | fixed | Turns 5 and 6 vanish as they cross the window's edge, before they reach the empty places. New turns appear only as they slide inside the frame. The empty places are captioned "trimmed turns", then "its own beginning". |
| 20 | P3 | fixed | Fig. 14 shows its ten turn places (dashed) and the suitcase from the scene's first word. The first block lands on "every input token". |

## Voice

- **658 characters re-voiced** (cap 900), 5 beats, each voiced on its own: `hedge-why`, `costs`, `permission`, `overthink`, `effort`. No new take, no `--force`. `narrate --dry-run` now reports 0 of 47 beats to voice.
- `plausible` and `costs` are marked `take: true` and `takeChars` is 2100. The plan's three takes are then exactly the three on disk. The longer `costs` beat had otherwise regrouped them.

## Length and checks

__CHECKS__

## New, noticed and fixed

- The illustrative-scores note in Fig. 1 moved to the right of the sampler row, so it no longer sits under the new "drawn anyway" line.
- Fig. 6's label now arrives with `compound`, not before it (series problem 3, the screen running ahead).
- The script header now cites the lesson for each re-voiced fact. It records that the hedging line was corrected to the lesson's "not preferentially", and gives the sources of the million-token window and the cache's tenth.

## Not fixed

Nothing. The deep-dive candidates in the review (the four fixes, lost in the middle, what training changed) got one clear sentence or gloss each here, as the brief asks, not a deep dive.
