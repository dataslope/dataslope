# AnalyticsEngineer-3-Dbt: fixes

I changed only my own folders: `video/src/videos/ae-dbt/` and the one new
beat in `video/public/narration/ae-dbt/`. I did not touch the takes, the page,
or any shared code, and I committed nothing. (The coordinator's checkpoint
commits picked up the working tree as it stood.)

The review had 14 findings: 0 P1, 7 P2 (2 of them answer findings) and 7 P3.
All 14 are fixed. Two of the fixes took a different route from the review's
suggestion, because the take has no pause at the sentence break the review
proposed to split at. Both are noted in the table.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P2 answer | Q9 never says where targets live, or what "environments" adds | fixed | New beat `env-profile`, voiced on its own after `env`: "Each is a target in your profile, picked with the target flag, and the hosted dbt platform sets up the same split as environments." The review suggested replacing `env`'s last sentence. I added a sentence instead, because take-5 has no silence between "the credentials." and "Teams usually" (0.03 s in the alignment), so a split there would cut into a word. On screen, the two "Plus its own database and credentials" lines (the line above them already says it) became "Both are targets in `profiles.yml`, picked with `--target`" under dev, and "On the hosted dbt platform: **environments**" under prod, with "environments" marked in yellow. Each inks in on its words. `check.mjs` now quotes the page's two sentences about the profile and the platform, so a page edit fails there first. The `--target` flag is dbt's own, not the page's; the script header says so. |
| 2 | P2 answer | Q20 never names the Fusion engine | fixed | `check.mjs` reads the name out of the page (`first shipped as the "(\w+) engine"` → `Fusion`) into `dbtV2.engineName`. The page sentence was already quoted, so this adds no new quote. The GA line now reads "The **Fusion** engine, generally available since September 2026" (on screen only). That line is up for about 25 s. `r-v2` was voiced on its own, with no take to cut from, so changing its words would have re-voiced all 470 characters. |
| 3 | P2 | "What a change rebuilds → …, and the dashboard" says dbt rebuilds a dashboard | fixed | It now reads "→ 3 of 4 models, reaching the dashboard" and "→ 1 of 4 models, reaching the dashboard" (`LayersScene.tsx`). Q8 reads "The fact, and the dashboard it reaches" (`SubsetScene.tsx`). The yellow lit dashboard stays, since it marks what the change reaches. |
| 4 | P2 | The table's plan reads rows=12 beside its own "12 → 13" | fixed | `check.mjs` reads the rebuilt table under the same EXPLAIN (new step `tableRebuilt.plan`: `Seq Scan on dim_customer (actual rows=13.00 loops=1)`), and a new check holds it to 13. `data.ts` exports `MATERIALIZE.tablePlanRebuilt`. The table's PlanBox switches to it, with `rows=13` in green, on the same frame its count turns 13 (still at 244 s). |
| 5 | P2 | The macro's "Integer division" waits 3 s beside an empty slot, and its 19 gets about 2 s | fixed | The 19 inks in at "Postgres divides integers" + 4 frames, its red mark at + 10, and "Integer division" at + 10, so the label never stands alone. `r-macros`'s `pauseAfter` went from 0.9 to 1.6 (timing only). The 19 is now up from about 494.3 s to 500.6 s, about 6 s (stills at 494.6, 499 and 500.4 s). |
| 6 | P2 | `+fct_orders`'s four lit models hold about 1.3 s | fixed | Timing only, not the split the review suggested: take-5's alignment puts "A" 0.04 s after "order.", so a cut there risks clipping a word. The four models now light 8 frames apart (was 10) and stay lit until "adds everything downstream" (371.45 s), when `fct_orders+` takes over. "--select fct_orders+" still appears on "A plus after", beside the lit upstream selection. The finished upstream state now holds about 2.8 s (stills at 369.5, 371.0 and 372.5 s). |
| 7 | P2 | Q16's lineage graph is up for about 1.5 s | fixed | The edges draw from `graphAt + 8`, 4 frames apart, so the graph is whole about a second after "an interactive graph". `r-docs`'s `pauseAfter` went from 0.8 to 1.4. The whole graph is now up about 4 s before Question 17 (stills at 562.9 and 566.1 s). |
| 8 | P3 | The hook's boxes pile on top of each other mid-slide | fixed | New loose positions. Each box's straight path into build order now crosses no other box's: the fact on the middle row, stg_orders on the top, and the customers branch moving left along the bottom in step. I checked this with a frame-by-frame simulation of the eased slide, with a 12 px / 8 px margin: no overlap on any frame (was 19 overlapping frame-pairs). Stills at 14.1 and 14.4 s show the boxes still apart. |
| 9 | P3 | Q6's listing types in before its question | fixed | The listing starts at `text6At + 8`, after the headline (still at 271.5 s: headline inking, no listing; 272.3 s: listing under it). |
| 10 | P3 | The hardcoded line keeps a four-space hole before "AS o" | fixed | `hardLine` collapses the run of spaces before `AS` to one (still at 100 s). |
| 11 | P3 | Commas sit apart from their highlighted words in Q5's rule | fixed | The commas went inside the marks, "read frequency," and "data volume,", as Q4 and Q9 already do (still at 269 s). |
| 12 | P3 | "dbt" in the data blue; the broken stg_orders blue in run-then-test | fixed | In Q1, "dbt" and its bracket are now in ink, at weight 600. In Q7, `runTone("stg_orders")` turns red when its test fails, as in the build panel beside it (still at 336 s). |
| 13 | P3 | Q18's last line is gone before it can be read | fixed | `r-version`'s `pauseAfter` went from 0.8 to 1.4. The line is now up about 3.5 s past its last word (stills at 601.5 and 603.4 s). |
| 14 | P3 | Video.tsx says nineteen questions, nine quick | fixed | "Twenty questions … then ten quick ones". RapidScene's doc comment also said "nine questions" and now says ten. |

## Voice

- Characters re-voiced: **130** of the 1,000 budget, all for a P2 answer
  finding: one new beat, `env-profile`, voiced on its own
  (`npm run narrate -- ae-dbt --only env-profile`, 8.72 s). Nothing was
  re-voiced for a P3.
- Timing-only changes (free): `r-macros` `pauseAfter` 0.9 → 1.6, `r-docs`
  0.8 → 1.4, `r-version` 0.8 → 1.4.

## Length

658.5 s → **669.8 s** (11:10). The new beat adds 9.3 s and the three pauses
add 1.9 s.

## results.json

Every existing value came back identical; I diffed the rerun against the
saved copy key by key. Two values were added: `dbtV2.engineName` ("Fusion")
and `materializations.tableRebuilt.steps.plan` (Seq Scan on dim_customer,
13 rows). `check.mjs` also gained a check on that plan and two page quotes
(the profile, and the platform's environments).

## Checks

CHECKS_PENDING
