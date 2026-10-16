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
