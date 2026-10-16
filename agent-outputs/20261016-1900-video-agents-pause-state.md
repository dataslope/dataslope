# Unit videos: state at the 2026-10-16 usage pause

Saved when the session neared its usage limit. The Database Design agents
were paused first (Statistics first), then the Unit 1 motion fix and the
merged Unit 5. Everything they wrote is committed on
`claude/trusting-hawking-umtbd9`; renders under `video/out/` are gitignored.

## Finished
- Statistics Unit 4 `Distributions` (7:31) and Unit 6 `Estimation` (5:59): voiced, every check passes.
- Database Design Unit 1 `DbDesign-1-WhyDesign` (2:56): voiced, every check passes.

## Still running at the pause
- Statistics Units 2, 3, 7, 8, 9 (one agent each).

## How to resume each paused agent
Every command runs from `video/`. Render jobs go through `out/render-slot.sh`
(scratch, gitignored: two slots, first come, first served).

# Paused DB agents (resume after the usage reset with SendMessage)
- DB5 a8e894ea69a586643: voiced (2 takes, 3,054 chars, 4:05). Next: out/render-slot.sh bash -c "npm run check:motion -- db-relationship-patterns; npm run check:sync -- db-relationship-patterns; npm run check:mix -- db-relationship-patterns; npm run check:frames -- DbDesign-5-RelationshipPatterns", voiced stills review, report.
- DB2 a19d8196785aa562a: voiced (2 takes, 2:54), sync/mix pass; two openings re-cued + email UK badge, not re-rendered. Next: out/render-slot.sh bash -c 'node out/DbDesign-2-Entities-renders.mjs wet preview && npm run check:frames -- DbDesign-2-Entities'; check:mix --reuse; check:motion --file; stills; report.
- DB2 REPORTED (paused, unfinished). To finish: (1) out/render-slot.sh bash -c 'node out/DbDesign-2-Entities-renders.mjs wet preview && npm run check:frames -- DbDesign-2-Entities' (2) check:mix -- DbDesign-2-Entities --reuse (3) check:motion -- db-entities --file out/DbDesign-2-Entities-preview.mp4 (4) stills of re-cued spots.
- DB5 REPORTED (paused, voiced, checks not run). 4:05.
# Tooling notes from reports
- check:motion barely registers yellow highlight sweeps / pale bands (grey-frame delta); two agents hit this (Stats 6, DB 2).
- Half-built agent folders can break the shared Root bundle for everyone; DB2 used a private entry (out/DbDesign-2-Entities-entry.tsx).
- DB6 a421b5d01c659133c: voiced (3 takes, 3,231 chars, 4:07). Next: out/render-slot.sh bash -c 'npm run check:motion -- db-constraints > .../scratchpad/db-unit-6/motion3.log 2>&1; .../scratchpad/db-unit-6/voiced-checks.sh', then frames review, report.
- DB6 REPORTED (paused, voiced 4:07, voiced checks not run). No lesson discrepancies.
- DB7 a65dc67ed59e65417: voiced, check:motion passes (2.5 s), preview 4:33. Next: cd video && out/render-slot.sh bash -c 'npm run check:sync -- db-normalization && npm run check:mix -- db-normalization && npm run check:frames -- DbDesign-7-Normalization', then report.
- DB7 REPORTED (paused; sync/mix/frames not run).
- DB4 a863544ddd88aea92: voiced (2 takes, 2,871 chars, 3:40). Next: cd video && out/render-slot.sh .../scratchpad/db-unit-4/job.sh (frames, motion, sync, mix), voiced stills, report.
- DB4 REPORTED (paused; voiced checks not run).
- DB8 a4b04e7e9b8b95778: voiced (3 takes, 3,533 chars, 4:32.6). Next: cd video && export REMOTION_BROWSER_EXECUTABLE=... && out/render-slot.sh bash -c 'npm run check:motion -- db-designing-schemas; npm run check:sync -- db-designing-schemas; npm run check:mix -- db-designing-schemas; npm run check:frames -- DbDesign-8-DesigningSchemas', stills, npm test, report.
- DB9 ab6bf6e18103646cb: NOT voiced. Next: read s3 stills; out/render-slot.sh npm run check:motion -- db-relational-history; send preview; narrate --dry-run then narrate; voiced checks.
- DB8 REPORTED. DB9 REPORTED (not voiced).
- DB3 af1a281f45e8d3482: voiced (2 takes, 2,292 chars, 3:08), voiced stills in scratchpad/db-unit-3/voiced (unreviewed). Next: review stills; cd video && out/render-slot.sh bash -c 'npm run check:frames -- DbDesign-3-Relationships && npm run check:motion -- db-relationships && npm run check:sync -- db-relationships && npm run check:mix -- db-relationships'; report.
- DB3 REPORTED (voiced 3:08, checks not run).
# Kit suggestions (DB3): <Relation> fromAt/toAt to cue each end separately + optional (bare) ends; export crowsfoot's symbol layout (DB3 reimplemented as endSymbols() in its parts.tsx, and <Link>).

# Lesson discrepancies reported by the video agents (not fixed; ask the user)

## Database Design
- DB Unit 1, design-and-data-quality.mdx, Mars Climate Orbiter: says "pound-force units … newton-second values"; the board report says lb-sec vs N-sec, so the unit is pound-force seconds. Loose, not wrong. ($125M is the CNN 1999 figure, not in the report.)
- DB Unit 1, design-and-data-quality.mdx, "Types shape valid data" mermaid: NUMERIC and BOOLEAN wrapped in <code>, DATE not (mermaid rule 8). Style only.

## Statistics
- Stats Unit 6, confidence-intervals.mdx, opening + "A point estimate alone hides its own uncertainty": says "You sample 50 users, the mean is $48.20". The 50-user block (seed 42) prints x-bar = 49.28, CI (46.22, 52.33).
- Stats Unit 6, confidence-intervals.mdx, callouts "The #1 misinterpretation" / "Say it the right way": give "(48.2, 53.9)" and "between 48 and 54 … best estimate is 51, give or take about 3". No block produces these; the page's own interval is 49.28 ± 3.06.
- Stats Unit 6, the-bootstrap.mdx, under the median block: "(it can only land on actual data values)". n = 120 is even, so np.median averages the two middle values; only 37% of 5,000 resampled medians (seed 7) equal a data value.

## Tooling follow-ups (not lesson issues)
- narrate.mjs onset detection took a quiet breath for the first word of `rate-se` (estimation), cue 0.25 s early; the agent hand-set that onset in public/narration/estimation/alignment.json (0.17 -> 0.40 s). A future --recut would undo it. Fix: ignore sound far below speech level when finding onsets.
- check:motion doesn't count pale highlights (yellow marker, red-100 bands) or thin lines as change; worth a README line.
- Two stray 78-byte files at the filesystem root, /sync2.log and /mix.log, from an agent's misdirected redirect; the safety check blocked their deletion. Left for the user.
- Stats Unit 4, discrete-distributions.mdx, callout "Off-by-one: P(X ≥ k) is .sf(k − 1)": says cdf(k)+sf(k) is NOT 1 and cdf(k)+sf(k-1) is. Backwards: binom(200,0.03) cdf(4)+sf(4)=1.000000, cdf(4)+sf(3)=1.1338.
- Stats Unit 4, charts/ppf-inverts-the-cdf.mjs caption (continuous-distributions): the two answers are swapped ("fraction below 118 … is 119%", "value with 90% below … is 88"). Normal(100,15): cdf(118)=88.5%, ppf(0.9)=119.2. READER-VISIBLE. CONFIRMED by me: line 74 interpolates P_X where Q_P belongs and vice versa; a two-token swap fixes it.
- Stats Unit 4, charts/binomial-assumption-breaks.mjs: title says clustered version has "roughly five times the spread"; its own caption gives SD 20.8 vs 10.0 (2.1x spread, 4.3x variance). Doc comment: "about fifteen independent trials", "about a third the width" vs computed ~92 trials and 0.48 width.
- Stats Unit 4, the-normal-distribution.mdx misconception callout + quiz: says within 2σ may capture far less than 95% for skewed income; on the lesson's own seed-0 incomes it holds 95.2% (misses all high side). The "mean − 2σ below zero" part holds (−12,555).
- Stats Unit 4, charts/poisson-overdispersion.mjs doc comment (not reader-visible): "variance about four times the mean" vs computed 5.1; says Gamma(shape 1.5) but code sums two exponentials (shape 2).

## Database Design (cont.)
- DB Unit 5, one-to-one.mdx, "Building a one-to-one": says "Ada has a profile, and Grace does not yet". initSql inserts a profile for Grace (user_id 2); the 9 users without one are Linus, Ivan, Omar, Ruth, Tariq, Wen, Yusuf, Chidi, Elif.
- DB Unit 5, self-referencing-relationships.mdx: `employees ||--o{ employees : manages` marks the manager end exactly-one, but manager_id is nullable (Ada the CEO has NULL); should be `|o--o{`. Same for the categories / comments / folders diagram.
- DB Unit 5 (minor), one-to-many.mdx: flowcharts and bad-idea table give Ada orders 101, 102, 103; the data has ids 1 and 25.
- DB Unit 5 (minor), many-to-many.mdx: first flowchart shows Linus taking only History; data has History and Biology.
- DB Unit 2, attributes-and-domains.mdx, starter of "Types and checks define a column's domain": comment says "Try changing 'paid' to 'banana'" but the INSERT uses 'shipped'.
- DB Unit 2, entity-relationship-diagrams.mdx vs attributes-and-domains.mdx: the ER lesson's sample order has status 'placed', which the attributes lesson's own CHECK refuses (23514, orders_status_check).
- DB Unit 2, entity-relationship-diagrams.mdx: first diagram marks email UK; the "Example: customers and orders" diagram leaves it off though its SQL has email TEXT NOT NULL UNIQUE.
- DB Unit 2 (style), Chen's 1976 title written with a comma where the original has an em dash.
- DB Unit 7, first-normal-form.mdx: prose example (Ada 555-1000 and 555-2000, Grace 555-3000, "find the student with phone 555-2000") doesn't match the SQL block's rows (Ada 555-1000 and 555-2200; 555-2000 is Ruth's; 555-3000 is Priya's).
- DB Unit 7, denormalization.mdx, Northwind: "Prices rose" holds for 658 of 662 disagreeing lines; 4 (Genen Shouyu, orders 10500, 10579, 10592, 10657) were charged 15.50 against catalog 13.00, a price that fell.
- DB Unit 7, second-normal-form.mdx: ER diagrams mark order_items.order_id/product_id PK only; the DDL also makes both FKs (should be PK, FK).
- DB Unit 4, natural-vs-surrogate-keys.mdx, "A cautionary tale": "The sample was a real card, it carried the actual SSN of Hilda Schrader Whitcher." SSA history page (ssa.gov/history/ssn/misused.html) and Snopes: a printed display specimen (half size, red, marked "specimen") bearing her real number, not a real card. Other claims check out (1938, Lockport NY, voided/reissued, 5,755 at the 1943 peak).
- DB Unit 8 (minor), why-schemas-change.mdx: text and ER diagram call the new column tasks.due_on; the flowchart above says "v2: add due_date".
- DB Unit 8 (minor), case-study-ecommerce.mdx: requirement "An order contains one or more products" vs its ER diagram orders ||--o{ order_items (zero allowed); schema can't enforce at-least-one either.
- DB Unit 9, the-relational-revolution.mdx: opening ("a single fourteen-page paper") and footnote [^codd70] ("Fourteen pages"): CACM 13(6) pp. 377–387 is 11 pages; the linked PDF has 11 pages.
- DB Unit 9, from-ingres-to-postgresql.mdx, "Two grad students and a rename": "the 1996 release was numbered 6.0"; the rename and the decision were 1996, but release notes date 6.0 to 29 Jan 1997.
- DB Unit 9 (soft), SEQUEL renamed after colliding with "an aircraft company": Chamberlin's own account says only "a trademark issue"; Hawker Siddeley is from secondary sources.
- DB Unit 3, what-are-relationships.mdx, "A relationship connects rows" diagram: Ada 101 and 102, Grace 103; the lesson's own SQL block gives 102 to Grace, 103 to Linus, Ada 101 and 125.
- DB Unit 3 (diagram vs schema), reading-er-diagrams.mdx: orders ||--|{ order_items ("one or more") isn't enforced by the DDL; an order with no items is accepted.

## Paused after the notes above
- Stats Unit 5 merged (`Sampling`), agent af8dc730635440cd5: merge, motion work and el-* sounds done; check:motion passes (29 stretches of 3 s+ before, 0 now, longest 2.8 s); check:sync passes on the five standalone videos (worst +0.09 s). Still to do: check:mix -- sampling, the merged sync check (out/Sampling-sync.mjs), standalone stills, check:frames on all six compositions. Resume: S=<scratchpad>/unit-5-merged; $S/snap.sh v5-tree; cd $S/v5-tree && /home/user/dataslope/video/out/render-slot.sh bash -c "$S/audio-job.sh $S/v5-tree > $S/audio-v5.log 2>&1".
- Stats Unit 1 motion fix (`ThinkingStatistically`), agent aad79d5afd22124d5: check:motion PASSES on the voiced preview (longest 2.5 s, from 22 failures, longest 13 s); check:frames, check:sync (+0.09 s), check:mix (19.3 LU under) pass. One edit after that preview (KindsScene.tsx: US label dips under the other two in the shuffle) not yet seen. Resume: out/render-slot.sh bash -c "node out/variants.mjs <scratchpad>/unit-1-motion/sh ThinkingStatistically 7552 7556 7560 7564 7568 7576; npm run check:motion -- thinking-statistically", then report.

## Scratch tools the resume commands depend on
`video/out/` is gitignored and `<scratchpad>` is
`/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/`,
which does not survive the container. Copies of every small script in both
(the render queue `render-slot.sh`, `variants.mjs`, Unit 5's
`Sampling-motion.mjs` / `Sampling-sync.mjs`, the agents' job scripts) are in
`agent-outputs/20261016-video-scratch/`; copy them back before resuming in a
fresh container. The code files carry an extra `.txt` suffix so the site's
`tsc` and ESLint (which cover everything outside `video/`) skip them; drop it
when restoring.

## Finished after the pause notes
- Stats Unit 3 `Probability` (7:33): voiced (4 takes, 6,093 chars), check:motion (2.8 s), check:sync (+0.08 s), check:mix (19.9 LU under), check:frames all pass.
  Lesson discrepancies:
  - conditional-probability.mdx, after the table block: "Free users churn at more than five times the rate of paid users"; code prints 0.060 vs 0.240, four times.
  - probability-basics.mdx, odds block prints `'3 to 1 against' -> P(win) = 0.250  (NOT 0.25)` (self-contradicting; the trap is 1/3). Callout "Misconception: odds and probability are the same number" has draft text: "a probability of 0.25... wait, even that's a common slip."
  - probability-basics.mdx, law of large numbers block (seed 1) prints 0.500, 0.500, 0.496 at 10, 100, 5,000 flips: the checkpoints don't show the convergence the prose describes.
  - statistical-fallacies.mdx base-rate block uses sensitivity 1.00 (9.1%) while conditional-probability uses 0.99 (9.0%) for the same "99% accurate" test.
  Tooling: n.word() silently takes the first case-insensitive match ("A hundred" matched "Walk a hundred thousand"); warn when a phrase matches more than once without nth.
- Stats Unit 8 `InterpretingResults` (6:32): voiced (4 takes, 5,111 chars), check:motion (2.0 s), check:sync (+0.04 s), check:mix (20.5 LU under), check:frames all pass.
  Lesson discrepancies:
  - effect-sizes.mdx, "Demonstrating significance ≠ importance" block (seed 0, n=100,000, means 100.0/100.1, sd 15) prints `p-value : 5.08e-02 <- 'highly significant'!` and the prose says "The p-value is microscopic". p = 0.0508 is not significant; expected z for a 0.1 gap is 1.49 (p ≈ 0.14), so it isn't the seed. READER-VISIBLE.
  - statistical-fallacies.mdx, Berkeley: "department by department, women were admitted at equal or higher rates than men". UCBAdmissions: men ahead in C (36.9 vs 34.1%) and E (27.7 vs 23.9%); women lead in 4 of 6.
  - charts/simpsons-paradox-trend.mjs caption: "falls by about 2.7 mmHg per extra hour" is the generating constant; the fitted lines fall 1.4, 1.2, 1.5, 3.4.
  - charts/ecological-fallacy.mjs comment: within-district lines said to show "about flat" but are drawn flat by construction (district r: 0.06, 0.05, −0.04, 0.01, 0.03, 0.33).
  - effect-sizes.mdx, correlation block (seed 5): comment "moderate real relationship" but r = 0.59 is "strong" by the lesson's own table.
- Stats Unit 9 `StatisticsInPractice` (4:51): voiced (3 takes, 3,826 chars), check:motion (2.5 s), check:sync (+0.06 s), check:mix (19.1 LU under), check:frames all pass. Closes the course (no NextLine).
  Lesson discrepancies:
  - ab-testing.mdx, third quiz question: "With 5 million users… 8.00% to 8.02%… 95% CI [0.005pp, 0.035pp]" don't fit: with 2.5M per arm the CI is about [−0.028, +0.068] pp (p ≈ 0.41); the stated CI needs ~25M per arm.
  - charts/ab-test-peeking.mjs title (alt text): "dips below the 0.05 line several times"; its own caption and a re-run give 2 dips.
  - exploratory-statistical-analysis.mdx, outliers block prints "These look like genuine big-party bills"; 4 of the 9 flagged are parties of 2 or 3 (the largest, $50.81, a party of 3). Minor.
- Stats Unit 2 `DescribingData` (7:20): voiced (4 takes, 5,845 chars), check:motion (2.0 s), check:sync (+0.03 s), check:mix (20.4 LU under), check:frames all pass.
  Lesson discrepancies:
  - visualizing-distributions, "Why summaries lie": says the three samples share "(about) the same mean and std" and prints "Nearly identical mean and std"; the code prints SDs 14.9, 20.8, 15.0.
  - charts/histogram-bin-width.mjs: title "The wide binning hides the two peaks", comment "fuse into one lump"; at bins of 4 the counts are [50, 499, 174, 256, 21], two humps still visible.
  - measures-of-spread, opening: "swings from 5 minutes to an hour"; data tops out at 55 and the page's mermaid says "5 to 55".
  - measures-of-center, CEO block: comment says the mean "jumped by ~85k"; actual 86.0k (53.7 to 139.7). Minor.
  - statistical-fallacies, Datasaurus: "standard deviations around 17 and 26" (code prints 26.9); "to two decimal places" but the code's rounding shows 16.76 vs 16.77, −0.06 vs −0.07 (agree within 0.01).
  - shape-and-outliers, two-group heights: mean "describes nobody", "no actual person is near it"; 83 of 3,000 heights within 1 cm of 175.0.
  - shape-and-outliers, z-score quiz explanation: extremes inflate the SD "so those very points fall short of it"; in the lesson's own example the z rule flags exactly the two planted extremes (120, 200); it misses 54.6 and 61.7.
- Stats Unit 7 `TestingHypotheses` (10:00): voiced (5 takes, ~8,032 chars), check:motion (2.5 s), check:sync (+0.08 s), check:mix (21.3 LU under), check:frames all pass.
  Lesson discrepancies:
  - anova-and-chi-square.mdx lines 79, 89, 662 send the reader to Errors and Power for multiple comparisons, which that lesson doesn't cover.
  - hypothesis-testing.mdx:60 "a 1935 afternoon" is the year of Fisher's book; the tea tasting was at Rothamsted in the 1920s (Box 1978).
  - t-tests, latency block (seed 7): loc 212 gives sample mean 200.3, p = 0.954; prose "a bit above 200" undersells it.
  - t-tests, Welch block: "the two p-values differ" but they are 0.7871 and 0.7804.
  - errors-and-power: effect 0 prints power 0.06 where the prose says "near 0.05". Minor.
- DB Unit 2 `DbDesign-2-Entities` (2:54): FINISHED after resume. check:motion (no stretch of 2 s), check:sync (+0.03 s), check:mix (23.8 LU under), check:frames pass. Lesson discrepancies as listed above.
- DB Unit 5 `DbDesign-5-RelationshipPatterns` (4:05): FINISHED after resume. check:motion (2.0 s), check:sync (+0.05 s), check:mix (24.2 LU under), check:frames pass.
- DB Unit 4 `DbDesign-4-Keys` (3:40): FINISHED after resume. check:motion (2.3 s), check:sync (+0.03 s), check:mix (23.3 LU under), check:frames pass.
- DB Unit 7 `DbDesign-7-Normalization` (4:33): FINISHED after resume. check:motion (2.5 s), check:sync (+0.03 s), check:mix (24.4 LU under), check:frames pass.
- DB Unit 6 `DbDesign-6-Constraints` (4:07): FINISHED after resume. check:motion (2.3 s), check:sync (+0.06 s), check:mix (23.7 LU under), check:frames pass. One position tweak in PairScene after the last render (UNIQUE recap tag 20 px right).
- DB Unit 3 `DbDesign-3-Relationships` (3:08): FINISHED after resume. check:motion (2.0 s), check:sync (+0.02 s), check:mix (21.5 LU under), check:frames pass.
- DB Unit 8 `DbDesign-8-DesigningSchemas` (4:33): FINISHED after resume. check:motion (2.8 s), check:sync (+0.02 s), check:mix (24.7 LU under), check:frames pass.
