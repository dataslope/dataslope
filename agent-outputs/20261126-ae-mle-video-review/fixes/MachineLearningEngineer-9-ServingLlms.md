# MachineLearningEngineer-9-ServingLlms: fixes

Review: `agent-outputs/20261126-ae-mle-video-review/MachineLearningEngineer-9-ServingLlms.md` (9 findings: 0 P1, 5 P2, 4 P3).

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P2 | The speculative-decoding verify step is never said and is shown for 0.7 s | fixed | New beat `q4-verify` (106 characters) between `q4-spec` and a new `q4-rule`, both cut free from take-4. The draft "word" turns red and is struck on "rejects" and stays that way. The draft "fast" turns grey with "dropped" on "drops the rest". The large model's row ends at its own "tokens" on "one token of its own"; a red "rejected" label holds the slot until then. Simulation note: "tokens per pass, the accepted drafts plus its own". `pauseAfter` 0.9 on the new beat. |
| 2 | P2 | "Can lose" is pinned to the 1-in-2 row, which still gains | fixed | The 1-in-2 row is no longer dimmed or tagged. The cost line goes on, in red on "can lose": ", so a draft that is usually wrong can lose". |
| 3 | P2 | 186 from "500 GB" and "2.5 GiB" reads as 200; "at most" is unexplained | fixed | Caption: "8K tokens a request: 2.5 GiB = 2.68 GB each" (`kv.per8kGB`, new in `check.mjs`). Count: "At most 186 requests of 8K tokens, before activations and runtime overhead". |
| 4 | P2 | The bar's caption stays "2.5 GiB each" under 40 GiB and 20 GiB cells | fixed | One caption per fill, cross-faded on the cells' own cues: "128K tokens a request: 40 GiB each", then "8K tokens, 64 KV heads: 20 GiB each" (`kv.per8kNoGqaGiB`, new). |
| 5 | P2 | Four attention arcs stop short of their arrowheads | fixed | The stroke stops a head's length from the tip (`(len − HEAD + 1) / len`), not at a fixed 96%. |
| 6 | P3 | "How many requests fit?" flashes at mid-right | fixed | It now sits where the answer will be (left, 32px) and holds until "At most 186 …" replaces it, about 8 s. |
| 7 | P3 | The GQA sketch groups 4 query heads; the model groups 8 | fixed | `gqaFactor` (8) Q boxes, captioned "shared by 8 query heads". |
| 8 | P3 | The batching note leaves out the full queue behind 99% | fixed | The note ends ", all waiting at the start". |
| 9 | P3 | The paged grid's last block is drawn 9/16 full; 2,000 = 125 × 16 | fixed | The fill comes from `paging.lastBlockTokens` (16, new), so the last block ends full. The newest block fills as the blocks are handed out. |

Counts: 9 fixed, 0 partly, 0 moot, 0 not fixed.

## Re-voiced

106 characters, one new beat. The split was free: `q4-spec` and `q4-rule` were re-cut from take-4 (`--recut`), and only `q4-verify` was voiced (`--only q4-verify`).

- Old `q4-spec`: "Speculative decoding lets a small draft model propose several tokens, and the large model verify them all in one forward pass, which costs about one decode step, since reading the weights dominates either way. With the standard acceptance rule, the output distribution doesn't change, so quality isn't the price."
- New `q4-spec` (cut from the take): "… since reading the weights dominates either way."
- New `q4-verify` (voiced, 106 characters): "It keeps the drafted tokens up to the first one it rejects, drops the rest, and adds one token of its own."
- New `q4-rule` (cut from the take): "With the standard acceptance rule, the output distribution doesn't change, so quality isn't the price."

The script's header records the beat and its source: the standard rule (Leviathan et al. 2023; Chen et al. 2023), which is also what `check.mjs`'s speculative simulation models.

## Images

None generated.

## Length

7:46.0 → 7:54.6 (466.0 s → 474.6 s). The new beat and its 0.9 s pause add 8.6 s. Everything after `q4-spec` moves by that much.

## Numbers

`check.mjs` passes ("the page's block reproduces the site's output, and 41 spoken numbers match"). Every existing value in `results.json` came back identical. Four values are new: `kv.per8kGB` 2.68, `kv.per8kNoGqaGiB` 20, `paging.blocksUsed` 125 and `paging.lastBlockTokens` 16. `data.ts` types them.

## Checks

CHECKS_PLACEHOLDER

## Comparisons

`$S/compare/MachineLearningEngineer-9-ServingLlms/` (`S` = the session scratchpad):

COMPARE_PLACEHOLDER
