# Llm-4-Cost fix pass ("What a token costs", How LLMs Work Unit 4)

All 14 findings are fixed: the P1, all five P2s and all eight P3s. One part of finding 5 is left (the "Lesson 6" retrieval exception, see the table). Nothing committed. The container restarted mid-pass; my edits had survived on disk (1c08728), and the voicing and every check were run after the restart.

| # | P | Result | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | Fig. 6: on "dollar twenty" the hatch floods the **whole** 300,000-token bar from its first token, outlined in the accent; the dashed line stays only as the trigger. The caption reads "$1.20: all 300,000 tokens at 2x", and "not ~~$0.60~~ at the headline rate" now arrives on "sixty cents" instead of 2 s early. |
| 2 | P2 | fixed | New beat `weights` after `serial`: "Each pass moves every weight in the model, whether it carries eleven tokens or one. So while it writes, the hardware mostly waits." On screen: "every weight moved once" against "every weight moved 7 times", "work per pass" meters (11 tokens against 1, the token counts), and "the rest waits". `serial` 0.8 s and `weights` 0.9 s pauses, so `gap` no longer follows at a run. |
| 3 | P2 | fixed | Fig. 9 is retitled "Cost of one request on Claude Sonnet 5.5". Its legend reads "2,000 in: $0.004" and "400-token answer: $0.004", and a dollar axis ($0.00 to $0.20, "cost per request") sits under the rows. No narration aside, to keep the budget for the P1 and P2 lines. |
| 4 | P2 | fixed | Fig. 4: the first tenth of the full-price bar is tinted, with "a tenth" set inside that sliver. |
| 5 | P2 | fixed (one part left) | `effort` re-voiced as "Fourth, turn reasoning effort, the thinking budget, down to the lowest level that passes." Fig. 9 returns beside lever 4: 20,000 thinking tokens at 26.0x, an arrow on "lowest level", then 0 tokens at 1.0x. `output` and `effort` pauses go to 0.9 s, and "not interactive" is marked on "nobody's". **Left:** lever 6's retrieval exception, which needs a new beat and was the lowest priority. |
| 6 | P2 | fixed | New beat `sum`: "The bill pays for every one of these bars, plus each reply." A sweep lights each bar, and the panel header becomes "The bill: every bar, plus each reply". `triple` re-voiced as "…roughly triples, and it keeps getting worse", with x3.2 swelling on "worse". The area and the limit toward 4x are left to the resend deep dive. |
| 7 | P3 | fixed | Fig. 6 columns are now "Threshold" / "In" / "Out" (right edges 1644 / 1726 / 1800), so the header and the multipliers no longer run together. |
| 8 | P3 | fixed | Fig. 7's bracket sits 18 px below the table rule, with "100x" moved down to match; "basically nothing" moved off the rule. |
| 9 | P3 | fixed | Fig. 8's multipliers now sit to the right of their arrows, clear of "everything already paid for". |
| 10 | P3 | fixed | The caption is now "a timestamp on top: new bytes every turn". Turns 1 and 2 step back to half strength when the stamp lands, so turn 3 reads as a second case. |
| 11 | P3 | fixed | New beat `cache-resend`: "You still resend it all. The provider just recognizes that part and reads it back." Under Fig. 13: "every turn still sent in full, the prefix read back". The bars swell on "all" and on "recognizes". |
| 12 | P3 | fixed | `sheet` re-voiced as "…five prices per million tokens, always in the same proportions." Headline "Five prices, always in proportion."; Fig. 2 retitled "The five prices on every sheet, per million tokens". |
| 13 | P3 | fixed | Fig. 10: code review's "$0.12000" loses its highlight and its red when "Document summaries" is named, so red belongs to the answer alone. |
| 14 | P3 | fixed | The levers watercolor enters only after Figs. 12 and 13 have fully faded (`figsOut + 12`); it leaves for Fig. 9 on lever 4 and returns on lever 6. |

## Voice
- **545 characters re-voiced** (budget 900), 6 beats, each voiced on its own:
  - edited: `sheet`, `triple`, `effort`;
  - new: `weights`, `sum`, `cache-resend`.
- No take re-recorded, no `--force`.

## Length and checks
- **Length:** 329.1 s, 5:29 (was 301.9 s): 51 beats, 739 words, 135 wpm.
- **typecheck, lint (my folder):** clean.
- **`check:cues`:** clean for llm-cost.
- **`npm test`:** passes for llm-cost. The package shows 56/59; the three failures are all llm-meaning's (`cut("real")`, beat "scores"), not mine.
- **`check:sync`:** pass, worst +0.04 s (effort, 5:01.4).
- **`check:motion`:** CHECK_MOTION
- **`check:frames`:** CHECK_FRAMES
- **`check:mix`:** CHECK_MIX

Stills were re-taken at every changed place and looked at: Figs. 2, 3, 4, 6, 7, 8, 9, 10, 11 to 13, the Fig. 9 return, and the close.

## Also noticed and fixed
- Fig. 6's "$0.60" line used to land about 2 s before "sixty cents" (the series' "screen runs ahead" pattern). It now lands on its word.
- Fig. 9's legend items touched once the dollar amounts made them longer; they are respaced.
- The first post-fix `check:motion` found a 3.0 s still over the new `cache-resend` beat and 2.8 s over `batch`; both now move on their words (the bar swells, "not interactive" is marked).
- Script header updated for every changed fact.
- The lesson discrepancies from the build report stand. One of them (estimating-cost.mdx:267, a cache-write premium the code doesn't charge) is followed by the numbers, as the brief asks: nothing on screen shows a write premium.
