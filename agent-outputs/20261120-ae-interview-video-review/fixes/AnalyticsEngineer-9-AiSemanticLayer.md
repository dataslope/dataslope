# AnalyticsEngineer-9-AiSemanticLayer: fixes

I changed only my own folder, `video/src/videos/ae-ai-semantic-layer/`, and
its narration in `video/public/narration/ae-ai-semantic-layer/`. No shared
code, no takes, no page edits, and I committed nothing (the coordinator's
WIP checkpoints picked the files up).

The review had 12 findings: 1 P1, 4 P2 (1 of them an answer finding) and 7
P3 (1 an answer finding). 11 are fixed and 1 is partly fixed.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P1 | Padlock under the private staging model reads "private locks the assistant out" | fixed | The padlock now pops with the grant's cross (`martsAt + 26`), left of the Assistant box, so the lock belongs to the warehouse role. The heading's soft tail moved under the private models as a two-line note, "Private stops ref()," (on "stops other models building on them") / "not queries" (on "not queries"). The heading is now plain "Access boundaries". |
| 2 | P2 answer | "Follows it to the letter" would call the metric and get 440, not 1,190 | fixed | `ready-input` split at its sentence: `ready-caution` ("One caution: documentation is now an input.") cut free from take-3; `ready-input` re-voiced alone as "Drop the words and test accounts from the end of this description, and an assistant writing its own SQL from it reports eleven hundred ninety." Label: "Net revenue, in SQL written from the description". The header notes why. |
| 3 | P2 | The strict filter's miss is on screen about a second | fixed | `review-pair` split at its sentences into `review-pair`, `review-strict` ("A filter for dates after the newest one loaded misses it.", `pauseAfter` 0.9) and `review-look`, all cut free from take-5. The red ring and "missed" now hold until "catches it" (about 2.6 s, was 0.9 s), where a green "caught" replaces "missed" and the ring returns to the late order's black. (The review's fix said "turn the ring yellow": wrong, yellow marks the re-read orders 3 to 5 and order 7 is caught, not re-read.) `check.mjs`'s claims moved to `review-look`. |
| 4 | P2 | Grain drawn on the config line, blurring `unique_key` and a `unique` test | fixed | The band now lights `order_id` in the `select` line, and a red line under the listing, "No unique test on order_id", comes in on "a unique test proving it" and clears when the incremental strip arrives. |
| 5 | P2 | Test account marked about half a second, then used unexplained | fixed | Customer 4's two `customer_id` cells in `orders` stay lit through `t2s-run` until "That's the failure to name"; at "not from the test account" the two rows that dim are the two still marked. `t2s-rows` `pauseAfter` 0.5 to 1.0, so the two tables hold a second before the query replaces customers. |
| 6 | P3 | `t2s-past` is the fastest beat | partly | Split at its sentence (`t2s-past`, `t2s-decision`, cut free from take-1) with a 0.6 s pause between the two claims; `decisionAt` and `writtenAt` moved to `t2s-decision`. The first sentence keeps the take's own pace (11 words in 2.5 s); slowing it means re-voicing, which the P3 budget went to finding 7. |
| 7 | P3 answer | Q4 stops before execution accuracy's blind spot | fixed | `check.mjs` now runs A and C again on the orders with the test account's deleted (6 left): both 440.00, recorded as `eval.withoutTest`, and fails unless they match at the governed reading and the beat says it. New beat `eval-luck`, voiced alone: "One catch: a wrong query can match by luck. Without the test account's orders, the third returns four hundred forty too, so test on data where the readings differ." Under C's column, on its words: "A match by luck" (red), "Without the test account's orders:", "→ 440.00, the same as A's 440.00", "Test on data where readings differ". |
| 8 | P3 | "it won't ask." highlighted for 75 s | fixed | `out={describeAt}`. The highlight's margin leaves a slightly wider space before "it" once the band goes, as on every `Mark`. |
| 9 | P3 | Duplication crossed on a model with no revenue | fixed | No cross; the note reads "· does it exist already?". A soft "For example" label sits over the two metric chips. |
| 10 | P3 | The golden set's three kinds are bare tags | fixed | Each kind is now a row, the chip and an example from the same orders: "Net revenue last week?", "Net revenue this month against last?", "How did we do?". The golden-cards spot moved down 74 layout px to make room. |
| 11 | P3 | "logged" floats in the warehouse's badge row | fixed | "logged" and "For audit, and the golden set" sit under "dbt Labs publishes an MCP server", where every request passes. |
| 12 | P3 | Four labels that say slightly the wrong thing | fixed | (a) "The biggest is 3.3× the smallest" (ratio from `READINGS`); (b) "Each reading runs: no error"; (c) "Order 7 is dated Nov 1, 2 days before Nov 3" (from `REVIEW`); (d) the listing's heading gains a green " · reviewed" on "a lookback window". |

## Voice

Characters re-voiced: **305** (`narrate --dry-run`), of which **163** for P3s.

| Beat | For | Characters |
| --- | --- | --- |
| `ready-input` | 2 (P2) | 142 |
| `eval-luck` | 7 (P3) | 163 |

Cut free from the kept takes (`narrate --recut`): `t2s-past`, `t2s-decision`
(take-1), `ready-caution` (take-3; cut in the middle of a 0.36 s silence
before "Drop"), `review-pair`, `review-strict`, `review-look` (take-5).

## Length

8:35.2 (515.2 s), was 8:20.0: about 12 s for the new `eval-luck` beat,
the rest from the pauses the splits added, the longer `t2s-rows` pause and
the re-voiced `ready-input`.

## Checks (final code, through `out/entries/AnalyticsEngineer-9-AiSemanticLayer.tsx` and the queue)

| Check | Result |
| --- | --- |
| `check.mjs` | ok; every claim, including the moved `review-look` ones and the new `eval-luck` one |
| typecheck (my folder) | pass, no errors |
| lint (my folder) | pass |
| `check:cues` | pass |
| `npm test` | 79 of 79 pass |
| `check:frames` (`CHECK_SCALE=1`) | pass (13 images, largest stretch 0.40; 24 arrows, worst 2.6°). Two transient `[overlap]` audit lines at 387.5 s and 391.5 s are the inserted `'3 days'` and `unique_key` text growing into their lines; not a failure |
| `check:motion` | pass, nothing holds still for 3 s |
| `check:sync` | pass, 51 beats, worst +0.05 s (`ready-input`) |
| `check:mix` | pass; effects 29.2 LU under the narration, speech a median 28.8 dB above them |

Stills looked at in `video/out/review/AnalyticsEngineer-9-AiSemanticLayer/`
at 66.8, 76, 93.5, 199, 224.5, 229, 229.2, 252, 256, 284, 316, 324, 328.8,
376.5, 394.5, 406.3, 410, 418.5, 431 and 484 s. The WAVs and the preview the
checks left are deleted.

## results.json

Every existing value came back identical (compared key by key against the
committed file). One key was added: `eval.withoutTest` (`orders` 6, `A`
"440.00", `C` "440.00", and the `DELETE` it ran).
