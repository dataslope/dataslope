# Llm-3-Generation: "Choosing the next token" (How Large Language Models Work, Unit 3)

Folder `video/src/videos/llm-generation/`, Drew, intro title kept as the plan's ("Choosing the next token").

## Length, voice

- **6:18** (378.0 s, 47 beats, 915 words, 145 wpm overall, from `npm run cues -- llm-generation`).
- **5,156 characters voiced** (cap 5,700), in **3 takes** (1,538 / 1,761 / 1,857). One run, no 429s, no re-voicing, no `--force`. The script sets `takeChars: 1900` so the closing scene's 335 characters ride with take 3 instead of being a fourth take.
- Parts: sampling 4.6 to 116 s, hallucination 118 to 211 s, context windows 212 to 292 s, reasoning 294 to 375 s.

## Checks

__CHECKS__

## Scenes (15 including the intro; Figs. 1 to 21, numbered in order)

1. Series intro.
2. **ScoreScene** (Fig. 1): the last layer's score per token, called a logit (Unit 2's bridge), softmax to 64.8 / 21.6 / 11.8 / 1.8%, the 1.1 gap becoming 3.0x, and the picker's three runs (dog, cat, cat). Jar spot.
3. **TempScene** (Fig. 2): temperature divides before softmax; slider to 0.2 (99.6%), 0 (greedy), 1.5 (rock 4.8%). Adapted from LlmTemperature.
4. **TopPScene** (Figs. 3, 4): top-p 0.9 at T = 1.5 drops rock; the lesson's own block, sure context keeps 1 of 6, torn keeps 6 of 6.
5. **RunsScene** (Figs. 5, 6): the lesson's five seeded runs (five different strings) and a labelled schematic of compounding; turn into hallucination.
6. **PlausibleScene** (Figs. 7, 8): the one-sentence explanation, Paris against "Chen et al. found a 23% improvement", no "I know this one" mark, the shape of a citation. Parrot spot.
7. **RiskScene** (Fig. 9): the lesson's risk-score block filled column by column (0, 2, 3, 4 of 5).
8. **FixScene** (Figs. 10, 11): what "tell me if you don't know" changes (parrot spot again while it hedges), the lesson's four fixes in order (NOT_FOUND), turn into context windows.
9. **WindowScene** (Figs. 12, 13): the budget block (193,700 of 200,000, 6,300 left) and a long chat trimmed to fit. Suitcase spot.
10. **CostScene** (Fig. 14): 500k resent over ten turns = 5,000,000 billed, unless a cache steps in. Suitcase spot again.
11. **MiddleScene** (Fig. 15): lost in the middle (stylized, labelled); "permission, not a recommendation".
12. **SquareScene** (Figs. 16, 17): every pair compared; 8k to 1M is 125x the text and 15,625x the work; turn into reasoning.
13. **ThinkScene** (Fig. 18): the lesson's transcript, 106 thinking vs 13 answer tokens (o200k_base), training on checkable answers, the slip it catches. Hourglass spot.
14. **ReturnsScene** (Fig. 19): stylized accuracy curve, first 500 tokens buy 65% of the gain, 8k to 16k buys +0; helps / can't help / can hurt (overthinking).
15. **BillScene** (Figs. 20, 21): read 13, pay output prices for 119; effort set to the lowest that passes; bridge line and `<NextLine>` "Next: what a token costs".

Illustration ids: `llm-generation-jar`, `llm-generation-parrot`, `llm-generation-suitcase`, `llm-generation-hourglass` (all kept on the first draw). The Batch API job sat at 0 of 4 for an hour; it was cancelled (`batch_6adafa706ba08190bf4c6397ba852d8a`, confirmed `cancelling`) and the four were generated with the generator's `sync` command (about $0.02), then imported.

## Facts

Every number, token and string on screen comes from `measure.py` (NumPy 2.4.6, tiktoken 0.12.0, run with `$S/pyenv`), which re-runs the four lessons' code blocks and **asserts each against `lib/generated/block-outputs.json`** (the page's own Pyodide output), writing `measurements.json`, read by `data.ts`. The sampling numbers extend LlmTemperature's measure.py (same softmax, same grid, its seed rule re-run and asserted to give its seed 72 and its draws). Nothing on screen is typed by hand.

- **Differs from the page, on purpose:** reasoning-models' first block estimates tokens as words x 1.3 (~72 thinking, ~9 answer). The video shows o200k_base's real count, 106 and 13 (the working without its `<thinking>` tags; the raw split strings, tags and newlines included, count 109 and 14). Both put thinking near eight times the answer. Explained in the script header.
- **Stylized numbers, labelled on screen as the lesson labels them:** the lost-in-the-middle recall (Fig. 15), the accuracy-versus-thinking curve (Fig. 19), the four-token logits (Fig. 1). Figs. 6 and 13 are marked "(schematic)".
- T = 1.5 (rock 4.79%) is LlmTemperature's stop, not one the lesson's block prints; 0.2, 0.7 and 1.0 match the page.
- "Her new pet is a" is LlmTemperature's sentence, not the lesson's.

## Lesson discrepancies (not fixed)

1. `content/courses/how-llms-work/sampling.mdx:143-144` says "where the model is confident it might contain two tokens", and the concept check at `:311` says "A confident distribution reaches the threshold in two tokens". The lesson's own block (`:172-183`) and the page's output print "nucleus holds 1 token(s): [' cat']" for the confident context (cat alone is 95.6%). The video shows the block's 1.
2. `content/courses/how-llms-work/context-windows.mdx:133-134`: "roughly 15,000-fold" for 8,000 to 1,000,000 tokens; 125 squared is 15,625, and the lesson's own chart `charts/attention-cost.mjs` says "about 15,600". The video says "over fifteen thousand" and shows 15,625x.
3. `content/courses/how-llms-work/reasoning-models.mdx:55-60` (the transcript block) estimates token counts as words x 1.3 in a course whose tokenizer lesson uses o200k_base, which counts the working at 106 and the answer at 13 (the block prints ~72 and ~9). Labelled "~", so not wrong, but a third low.

## Kit suggestions

- `kit.tsx` `Headline`, `Kicker`, `Spot`, `Drift`, `Arrow`, `Marked`, `Struck`, `pulse` are copies of DbWhyDesign's `parts.tsx` and LlmTemperature's `kit.tsx`, as other videos copy them; a shared `editorial/` home would stop the copying.
- `Tag` (a rounded tinted label) and the scoped stills script `out/Llm-3-Generation-stills.mjs` (one bundle, many `renderStill`s; copied from Llm-1-Tokens') are worth having in the kit / scripts.

## Left undone

__UNDONE__
