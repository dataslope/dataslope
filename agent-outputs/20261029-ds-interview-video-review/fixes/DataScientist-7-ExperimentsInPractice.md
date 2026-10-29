# DataScientist-7-ExperimentsInPractice: P2 fixes

Folder `video/src/videos/ds-experiments-in-practice/`. Review:
`agent-outputs/20261029-ds-interview-video-review/DataScientist-7-ExperimentsInPractice.md`.
Nothing committed.

## The P2s

| # | Status | What changed |
| --- | --- | --- |
| 1 BH figure, procedure never explained | fixed | `many-fix` split into `many-fix` / `many-bh` / `many-end`. Only `many-bh` was re-voiced: "...the false discovery rate, the expected share of your hits that are false. It gives the smallest p-value a bar of one tenth of five percent, the next two tenths, and so on, and keeps everything up to the last one under its bar: here, the three real ones." On screen, the staircase now draws on the rule. Ranks 1-3 get green rings, and a dashed green fence runs between ranks 3 and 4 down through the rank labels, marked "← keeps ranks 1–3". Under the legend: "rank k's bar: k/10 × 0.05", then the three ranks that decide it: rank 3 0.0136 ≤ 0.015 kept, rank 4 0.0228 > 0.020 over, rank 5 0.0258 > 0.025 over. The bars come from `check.mjs` (`metrics.rows[].bar`, asserted against statsmodels' BH call). The FDR note now reads "the expected share of false hits". The "Benjamini-Hochberg" legend line now appears when the name is said, with ": keeps 3" added on the answer. Before, the note under it floated alone for about 14 s. |
| 2 DiD prints "− 2.4" | fixed | Both change rows are signed (+8.9, +2.4). The result row reads "DiD   8.9 − 2.4 = +6.5", with the subtraction in it (`DidScene.tsx`). |
| 3 Interference only shrinks; switchback skips why and how | fixed | `switchback` split into `switchback` / `sb-pool` / `sb-time` / `sb-carry`. Re-voiced `sb-pool`: "...so you can't split users: a treated rider who books faster takes a driver from a control rider, and the split overstates the effect." Re-voiced `sb-carry`: "One hour spills into the next, so drop the first minutes of each hour as a washout, and count hours, not users, as the sample." On screen: a red two-line note under the pool. While `sb-pool` plays, a no-scale sketch on the right shows "rides booked under a user split": control's bar shrinks from a dashed ghost ("← drivers taken") and "the gap comes out bigger than the real effect". It fades when "Split time instead" arrives. On "drop", every hour's first strip turns to struck-through paper, "↓ washout, dropped" labels the first one, and a green line reads "drop each hour's first minutes; count hours, not users". |
| 4 Simpson's paradox never defined | fixed | `simpson-pool` split. Its last sentence became a new beat, `simpson-def` (re-voiced): "That's Simpson's paradox: a result that holds in every segment flips in the total, because the arms have a different mix. In a randomized test the mix should match, so check it in each arm: a gap is a bug, like an SRM, and the fair comparison is the one within each segment." On screen: the definition sits as a line under the question card. On "holds in every segment" and "flips in the total" the matching verdicts highlight, and on "a different mix" both mix bars light. The closing line, in green: "Randomized arms should match: a gap is a bug, like an SRM. Compare within each segment." |
| 5 How to check parallel trends | fixed | New beat `did-check`: "You can't see that after the policy, but you can check the weeks before it: here the two cities rose together." The yellow pre-period band now enters on "check the weeks before it" and holds to the end of the scene. Inside it: "before the policy, the two rose together" / "the gap between them drifted −0.07 a week". That is `did.preGap` from `check.mjs`, already in `results.json`. |
| 6 "users who arrive after it stopped being new" | fixed | `primacy` split. Re-voiced `primacy-fix`: "For both, run past the first weeks, and compare new users, who never saw the old version, with returning ones." On screen: "compare new users / with returning ones" and "(new users never saw the old version)". The days-since-first-exposure plot is not added; the page doesn't mention it. |
| 7 Winner's-curse bar up ~1 s | fixed | `r-meta` split into `r-meta` / `r-curse`. `r-curse` has `pauseAfter: 1.8`, and `RapidFire`'s `end` is `n.beat("next").from - 4`. The 2.24× bar is full from 484.97 s to 487.47 s (2.5 s), then fades before the bridge's spot enters (checked at 486 and 487.6 s). |
| 8 Meta-analysis sketch collapses into a bullseye | fixed | Three experiments of one change on a "lift, %" axis: lifts 2, 6 and 9 with SEs 1, 2 and 3, the video's own, from `check.mjs`. Each is sized by precision (radius ∝ 1/SE) and labelled with its weight: 73%, 18%, 8%. A red tick marks "average of headlines: 5.7". A green pooled dot slides from the average to "pooled: 3.3", the inverse-variance mean; statsmodels' `combine_effects` fixed effect agrees (asserted). Re-voiced `r-meta`: "And a meta-analysis pools many experiments. Rather than averaging their headlines, it weights each by its precision, so big, tight experiments count more." |
| 9 "without the policy" on the bracket | fixed | Label moved to `at(x, split) + 30`. |

**P3s fixed on the way:**

- #17, DiD half only: the panel now says "DiD". The network bars still say "new" / "control".
- #18: "1×" and "2.24×" are both centred over their bars. The block was rewritten for #8.
- #15, Simpson's orphan only: "desktop converts less, / and the new checkout got mostly desktop" is now two set lines.

**P3s left:** 10, 11, 12, 13, 14, 15 (the network and DiD-card orphans), 16, 19, 20, 21, 22.

## Voice

- **1,240 characters re-voiced**, 7 beats, each on its own: `simpson-def`, `primacy-fix`, `many-bh`, `sb-pool`, `sb-carry`, `did-check` (new), `r-meta`.
- **Splits cut from the kept takes:** `simpson-pool` | `simpson-def`, `primacy` | `primacy-fix`, `many-fix` | `many-bh` | `many-end`, `switchback` | `sb-pool` | `sb-time` | `sb-carry`, `r-meta` | `r-curse`. `many-end`, `sb-time` and `r-curse` play their cut from the take unchanged.
- **How the recut was done.** `narrate --recut` refused at first. Takes 1, 3 and 4 no longer match the script, because `srm-test`, `network`, `did-math` and `r-ate` were re-voiced on their own in #715 when "S R M", "S U T V A", "D I D" and "A T E/A T T" became plain caps. So I put the takes' letter-spaced text back into those four beats for one `--recut` and then restored the script. I also restored those four beats' MP3s and alignment entries from a backup taken first. Every other unsplit beat re-cut byte-identical to the committed file.

## Length and checks

- **Length:** 501.2 s (8:21), up from 443.5 s. 34 beats.
- **Static checks:**
  - `tsc` and `eslint`: nothing in the folder.
  - `npm test`: pass, 59/59.
  - `check:cues`: pass.
- **`check:sync`:** pass. Worst beat is `simpson-def`, +0.03 s.
- **`check:mix`:** pass. The effects sit 30.8 LU under the narration, with a median 30.2 dB of separation. The closest point is 10.3 dB at 1:15.1, in the SRM scene, which I didn't touch.
- **`check:motion`:** pass on the final code. The longest still is 2.8 s, over `network`.
- **`check:frames`:** not run; no arrow, illustration or ERD changed.
- **Stills:** checked at 180, 187.5, 226.5, 262, 277, 330, 342, 347, 405, 422, 472, 474, 477.2, 486 and 487.6 s, on the final code where it changed.

## Noticed

- **A spaced hyphen the review didn't list.** `TABULAR` was set over the whole BH legend line, so it rendered as "Benjamini - Hochberg" (the hyphen issue `style.ts` warns about). It is removed there and from the DiD gap label; it stays on the number spans.
- **`check.mjs` can't run as its header says.** The repo has no `node_modules` with `pyodide`, so it fails with `MODULE_NOT_FOUND`. I ran it with `NODE_PATH` pointing at a private copy of pyodide 314.0.7 in scratch. The re-run reproduced every existing number exactly and added `metrics.rows[].bar` and `meta`.
- **`--recut` is broken for this video, as it was before this pass.** It still refuses, because the takes don't match the four solo beats. `planTakes` now also groups the script into 5 takes, against 4 recorded. Kit suggestion: let `--recut` cut the takes whose text matches and leave the beats of the others alone, or record the solo beats as overrides of a take, so a split next to a solo-voiced beat stays free.
- **Q7 still says spillover makes "the difference shrink".** That is right for the sharing feature, where control gets treated too. Q8 now gives the opposite direction for a shared pool, so the pair covers both.
