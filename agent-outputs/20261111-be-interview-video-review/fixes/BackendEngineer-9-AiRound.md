# BackendEngineer-9-AiRound: fixes

I changed only my own folder, `video/src/videos/be-ai-round/`, and its
narration in `video/public/narration/be-ai-round/`. I added no shared code,
did not touch the takes, did not edit the page, and committed nothing.

The review had 14 findings: 0 P1, 5 P2 (2 of them answer findings) and 9 P3
(3 of them answer findings). All 14 are fixed.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P2 answer | Q7 says "give a concrete workflow" and never gives one | fixed | New beat `daily-example`, voiced alone: "For example: I run the tests and read its diff like a pull request. Once it called our payments client with a parameter that doesn't exist, and the integration test caught it before review." The Verify and "time it was wrong" bins each gain a worked example in the right answer's green (24px, weight 500), each line cued to its words: "run the tests," / "read the diff like a PR", and "called our payments client" / "with a made-up parameter;" / "the integration test caught it". The category lines stay above them. |
| 5 | P2 answer | The jitter follow-up gives 115 with nothing to compare it against | fixed | New beat `design-herd` after `design-jitter`, voiced alone: "That's a peak nearly nine times lower: a trickle the provider can absorb, instead of a thundering herd that knocks it over again." The ratio is computed in `check.mjs` (`retry.peakRatio` = 1,000 / 115 = 8.70), which now fails unless it is between 8.5 and 9 and the beat says "nearly nine times lower". On screen, in green over the jittered chart, mirroring the red note on the other: "a peak 8.7 times lower" / "a trickle the provider can absorb, not a herd". `design-jitter`'s text is unchanged, so its audio is too. |
| 2 | P2 | A true sentence ("Not whether working code exists at the end.") is struck | fixed | The struck line is now the claim being rejected, "Whether working code exists at the end.", beside the unstruck "Whether you drove." (moved 40px left to sit after the shorter line). The two read as a parallel pair: one criterion struck, the other marked. |
| 3 | P2 | A 13-line Python listing on screen for 34 s | fixed | The `Listing` and the `Console` are gone. Left: "The page's example" and its three inputs as rows (requests a day 1,000,000; tokens per request 2,000 in, 300 out; USD per million tokens 1.00 in, 5.00 out, with "illustrative prices" under it), each inking on its formula word and highlighted on the example's word, as the listing's lines were. Right, "What it comes to": `input 1,000,000 × 2,000 × 1.00 / 1M = 2,000 USD a day`, the same for output, `total 3,500 USD a day, about 105,000 a month`, and (finding 10) `a request 0.0035 USD, about a third of a cent`, each on the cue its console line had. Every number is read from `results.json`. The bar starts 70px lower (`BAR_A.v` 520 to 590) to clear the four rows. |
| 4 | P2 | Q4's flowchart builds in under a second, unnarrated | fixed | New beat `design-path` after `design`, voiced alone: "The request passes a quota check, then the cache. On a miss, it goes to the provider, the reply is validated, and the app streams it back to the client." Each box and edge now draws on its word: client, app server and the request edge on "The request passes", the quota on "a quota check", the cache on "then the cache", the miss edge and its label on "On a miss", the provider lit yellow on "it goes to the provider", validation, its edge and the "invalid" loop on "the reply is validated", and the edges back to the app and the streamed edge to the client on "streams it back to the client". |
| 6 | P3 | The two-line jitter footnote is unread before the cut | fixed | Its first line now comes in with the simulation (`simAt + 20`, about 18 s up). The second ("the next two waves… 60 and 35 with jitter, 1,000 without") comes in on "a hundred and fifteen" and holds through `design-herd`, about 13 s, where it was 3. Not voiced, to keep P3 voice under 300 characters. |
| 7 | P3 | The commentary on the better prompt sits under "Weak" | fixed | "The edge comes with its answer. Name the answer, not just the edge." is now one line under the Better listing, below "A smaller diff, easier to review." (`BETTER_X`, `y(790)`), each half on its old cue. Only the red "Left out, the assistant decides…" stays in the weak column, moved up to `y(600)` under "a wish". |
| 8 | P3 | The "LLM provider" box sits alone at lower right for 10 s, title off-centre | fixed | The provider box is now drawn centred on the page (x 830, `y(430)`) under the risk words, and glides to its place in the flowchart as `design-path` starts. Every box's sub-line ("+ prompt caching", "exact match", "counted in tokens", "against a schema") is passed to `Node` only once its cue arrives, so the title sits centred until then. |
| 9 | P3 | "circuit breaker" never said to do anything | fixed | New beat `design-breaker` after `design-fail`, voiced alone: "The breaker stops calling a provider that keeps failing, so retries don't pile onto an outage." A sub-line "stops calling a failing provider" (20px, INK_SOFT) sits under "circuit breaker" on "stops calling a provider". "fallback" and its two notes moved down 28 layout px to make room. |
| 10 | P3 answer | Q5 never gives the per-request figure | fixed | New beat `cost-cent` after `cost-result`, voiced alone: "Per request, that's about a third of a cent." `check.mjs` computes `cost.perRequest` (0.0035) and `cost.perRequestCents` (0.35), and fails unless the cents are between 0.3 and 0.4 and the beat says "about a third of a cent". On screen: the fourth arithmetic row (finding 3), and the moved bar's label now reads "As written: 3,500 USD a day, about a third of a cent a request". |
| 11 | P3 answer | The scoping defense doesn't say what it stops | fixed | `inj-defend` was split in three: `inj-defend` and `inj-confirm` were recut free from the take, and the new middle beat `inj-scope`, voiced alone, says "So an email can't refund anyone else's order." (Human confirmation, already the next sentence, catches the rest.) Under the dashed ring, "only this user's orders" gains a second line, "never anyone else's", on "anyone else's order". The page's wording ("the current user's own orders") is kept. |
| 12 | P3 | The METR chart has no axis meaning | fixed | Beside "no change": "← less time on a task" on the left and "more time →" on the right, 20px INK_SOFT, on the axis row. |
| 13 | P3 answer | 50 to 55 minutes leaves the rest of the hour unexplained | fixed | `hour-past` was split: `hour-past` ("That's fifty to fifty-five minutes, and building is only half of it.") and `hour-narrate` ("Narrate throughout…") were recut free; the new middle beat `hour-spare`, voiced alone, says "Keep the rest spare, for questions or a bug that bites late." On screen, right of the dashed tail: "the rest is spare," / "for questions or a late bug", each part on its words. This is past the page (the page's table simply adds to 50 to 55), said in the script header as argued. |
| 14 | P3 | The "indirect" arrow starts in empty space | fixed | A red bracket (x 380) now gathers the four source lines, from the first line's top to the last line's foot, and the indirect arrow leaves from its midpoint. |

## Voice

Characters re-voiced: **713** (`narrate --dry-run`), of which **243** for P3s.
Seven new beats, each voiced on its own with `--only`, none of them replacing
an existing beat's audio:

| Beat | For | Characters |
| --- | --- | --- |
| `daily-example` | 1 (P2) | 192 |
| `design-path` | 4 (P2) | 150 |
| `design-herd` | 5 (P2) | 128 |
| `design-breaker` | 9 (P3) | 94 |
| `hour-spare` | 13 (P3) | 60 |
| `inj-scope` | 11 (P3) | 45 |
| `cost-cent` | 10 (P3) | 44 |

Recut free from the kept takes (`narrate --recut`): `hour-past`,
`hour-narrate`, `inj-defend`, `inj-confirm`. After the recut, only those four
beats differed from the committed `alignment.json`; every other beat's entry
and MP3 is byte-identical.

## Facts

`check.mjs` was re-run from the repository root. Every existing value in
`results.json` came back identical. Three were added, all computed:
`cost.perRequest` (0.0035), `cost.perRequestCents` (0.35) and
`retry.peakRatio` (8.695…). Two numeric checks and two narration claims were
added for them.

## Length and checks

PENDING
