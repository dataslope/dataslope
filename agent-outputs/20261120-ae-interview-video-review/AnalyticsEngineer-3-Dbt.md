# AnalyticsEngineer-3-Dbt (658.5 s, 10:58)

## Verdict
- Accurate and well built. Every number on screen matches `results.json` and the page: 2 sources, 4 models, 5 edges, and 3 build steps; `stg_customers+` picking 3 of 4 models and `fct_orders+` picking 1; the view's HashAggregate (12, then 13) over 24, then 25, events; the table's 12, then 13 after its rebuild; 19.99 against 19 for the macro; and dbt v2's Rust, September 2026, 1.x and 1.13. One lineage graph carries Questions 2, 3, 4, 7, 8 and 15, and it does real work as an argument: the edge that disappears when a name is hardcoded, the build steps, what a change rebuilds, and run-then-test against build.
- The answers hold up and argue failure modes rather than syntax. Two stop short of the page:
  - Q9 never says where targets live (a profile) or what "environments" means as distinct from targets, which is exactly what the question asks.
  - Q20 never names the Fusion engine, the name an interviewer will use.
- One small wrong impression: "What a change rebuilds → 3 of 4 models, and the dashboard" (and "The fact and the dashboard" in Q8) says dbt rebuilds a dashboard. An exposure is selected, but nothing is built.
- Pacing is comfortable. Only `what-wrap` (3.25 words/s) and `build-ci` (3.05) pass 3 words/s, and both have their figure in place. The weak spots are four results that leave too soon or arrive late:
  - the macro's 19 (about 2 s, after its label has sat beside an empty slot for 3 s);
  - `+fct_orders` with all four models lit (about 1.3 s);
  - Q16's lineage graph (about 1.5 s);
  - and Q5's table plan, which still says rows=12 beside its own "→ 13".
- Layout is clean, with no cards, no labels struck through and nothing under 19 px. The polish items:
  - the hook's boxes pile on top of each other mid-slide;
  - a code line with a four-space hole;
  - commas set apart from their highlighted words;
  - "dbt" set in the data blue;
  - Q6's listing typing in before its question.

## Findings

### 1. [P2] answer: Q9 says what a target is but never where targets live, or what "environments" adds
- When: 377.5-394.0 s, beat `env` (element-388.jpeg, element-393.jpeg)
- What: The answer defines a target ("a named warehouse connection: the database, the schema and the credentials") and then says "Teams usually have two environments: dev ... and prod", so the two words read as synonyms. The page's answer is the distinction itself: "A **profile** groups targets, typically `dev` ... and `prod`; the hosted dbt platform configures the same split as **environments**." The video never mentions the profile (it comes up only in Q19, as "the profiles file") and never says how a run picks its target.
- Why it matters: "Environments and targets" asks for both terms. The follow-ups are "where are they defined?" and "how do you run against prod?", and the video answers neither.
- Cause: `video/src/videos/ae-dbt/script.ts:394-397` (the `env` text); `EnvScene.tsx:124-147` shows no profile.
- Fix: Keep `env` up to "the credentials." (cut free from take-5) and replace its last sentence with a new beat, `env-profile`: "A profile groups the targets, usually dev, where each developer builds into their own schema, and prod. The hosted dbt platform sets up the same split as environments." On screen, the dev/prod columns' second lines become the profile, with "the dbt platform: environments" beside it.

### 2. [P2] answer: Q20 never names the Fusion engine
- When: 609.2-643.1 s, beat `r-v2` (element-622.jpeg, element-643.jpeg)
- What: The page's answer opens "dbt v2 is a rewrite of the engine in Rust, first shipped as the 'Fusion engine'". The video says "the engine rewritten in Rust" and shows "The engine, rewritten in Rust / Generally available since September 2026", but never says "Fusion".
- Why it matters: Interviewers and the dbt community call it Fusion. A candidate who knows the facts but not the name will stumble on "what do you think of Fusion?".
- Cause: `RapidScene.tsx:502-507` (the Fact and the GA line); `check.mjs:269-277` (`dbtV2` reads neither the name nor quotes it as a value).
- Fix: Read the name out of the page in `check.mjs` (`first shipped as the "(\w+) engine"` → `Fusion`) into `dbtV2.engineName`. Set the GA line as "The Fusion engine, generally available since September 2026". This is on screen only and free: the line is up for about 25 s, and `r-v2` was voiced alone, so changing its words would re-voice all 470 characters.

### 3. [P2] accuracy: "What a change rebuilds → ..., and the dashboard" says dbt rebuilds the dashboard
- When: 181-206 s, beats `layers-cost` and `layers-rule` (element-188.jpeg, element-205.jpeg); 371-377 s, beat `subset-plus` (element-374.jpeg)
- What: Under the heading "What a change rebuilds", each selector reads "→ 3 of 4 models, and the dashboard" or "→ 1 of 4 models, and the dashboard", with the dashboard lit like the models. In Q8, `--select fct_orders+` reads "The fact and the dashboard". The selector does pick the exposure, but dbt builds nothing for it. A dashboard is a declared consumer, not a node dbt runs.
- Why it matters: A viewer can come away thinking `dbt build` refreshes BI dashboards. That is wrong, and it is the kind of error an interviewer probes when exposures come up.
- Cause: `LayersScene.tsx:198` and `:211`; `SubsetScene.tsx:138`.
- Fix: Make it "→ 3 of 4 models, reaching the dashboard" and "→ 1 of 4 models, reaching the dashboard", and in Q8 "The fact, and the dashboard it reaches". Keep the yellow lit dashboard, since it marks what the change reaches.

### 4. [P2] confusion: the table's plan still reads rows=12 beside its own "12 → 13"
- When: 242.6-269 s, beats `mat-table` through `mat-pick` (element-244.jpeg, element-269.jpeg)
- What: After the new event, the view's plan updates to HashAggregate (rows=13) over Seq Scan (rows=25), in step with its count, 12 → 13. When the table's count goes 12 → 13 "After the next run", its plan beside it still says `Seq Scan on dim_customer (rows=12)` and stays that way for the rest of the question.
- Why it matters: The figure contradicts its own data, which is exactly the kind of mismatch this review is for. A careful viewer sees two numbers for one table.
- Cause: `MatScene.tsx:273-282` (the table plan is always `MATERIALIZE.tablePlan`); `check.mjs:205-208` (the rebuilt table is counted but never read under EXPLAIN).
- Fix: Add a `plan` step to `tableRebuilt` in `check.mjs` (expected: `Seq Scan on dim_customer (actual rows=13)`), export it as `MATERIALIZE.tablePlanRebuilt`, and switch the table's PlanBox to it, with `rows=13` in green, when `rebuilt` turns true (`nextRunAt + 16`).

### 5. [P2] pacing: the macro's "Integer division" waits 3 s beside an empty slot, and its 19 gets about 2 s
- When: 484.9-490.6 s, beat `r-macros` (element-485.jpeg, element-488.jpeg, element-489.jpeg)
- What: "Integer division" inks in at "Postgres divides integers" (484.9 s), 100 px right of the space where the result goes, and that space stays empty. The red 19 arrives on "becomes nineteen dollars" (488.2 s), and the whole panel fades for Question 13 at about 490.6 s. The punchline of Q12's answer is up for about 2 s, after a label that pointed at nothing.
- Why it matters: The integer division is the reason a macro exists here, and it is the one result the viewer has to see.
- Cause: `RapidScene.tsx:137-144` (the 19 is cued `nineteenAt`, the label `intAt`); `script.ts:433-436` (`pauseAfter: 0.9`).
- Fix: Cue the 19 at `intAt + 4` and its red mark at `intAt + 10`, and the "Integer division" label at `intAt + 10`. Raise `r-macros`'s `pauseAfter` to 1.6 (timing only, free). The result then holds about 6 s.

### 6. [P2] pacing: `+fct_orders` with all four models lit holds about 1.3 s
- When: 367.9-370.3 s, beat `subset-plus` (element-369.jpeg, element-371.jpeg)
- What: On "all four models build, in order", the models light step by step and finish at about 369 s. At "A plus after" (370.25 s) all four go back to ink and `fct_orders+` takes over. The finished upstream selection, the answer to "how do you build a model with its parents", is up for about 1.3 s.
- Why it matters: It is the result the beat promises, and it is also the fix for the missing parents the previous beat just raised.
- Cause: `SubsetScene.tsx:57` (`upAt`) and `:65` (`{ at: afterAt, tone: "plain" }`); `script.ts:386-390` (one beat with no pause between its two sentences).
- Fix: Split `subset-plus` at "in order." into `subset-plus` and `subset-down` (both recut free from take-5), and give `subset-plus` `pauseAfter: 1.0`. Keep the four models lit until `afterAt + 6`.

### 7. [P2] pacing: Q16's lineage graph is up for about 1.5 s
- When: 551.8-555.9 s, beat `r-docs` (element-553.jpeg, element-555.jpeg, element-556.jpeg)
- What: The four boxes pop in on "an interactive graph" (551.8 s), but the edges draw only from "the same ref and source calls" (553.4 s, 3 frames apart). The graph is complete at about 554.3 s, and the body fades for Question 17 at about 555.9 s.
- Why it matters: The graph is the visual half of the answer ("documentation and lineage"), and it leaves almost as soon as it is drawn.
- Cause: `RapidScene.tsx:293-296` (edges at `sameAt + i * 3`); `script.ts:453-456` (`pauseAfter: 0.8`).
- Fix: Draw the edges from `graphAt + 8 + i * 4`, so the graph is whole by "the same ref and source calls", and raise `r-docs`'s `pauseAfter` to 1.4 (free).

### 8. [P3] spacing: the hook's four boxes pile on top of each other mid-slide
- When: 13.9-14.8 s, beat `hook-dbt` (element-014.jpeg)
- What: On "Working out that order", all four loose boxes slide into build order at once over 24 frames. Their paths cross, and for about half a second `fct_orders`, `stg_customers` and `stg_orders` sit on top of one another with their names overprinted.
- Why it matters: It is the first piece of motion in the video and reads as a glitch.
- Cause: `HookScene.tsx:59-60` (one `slide` for every box) and the loose positions at `:50-56`.
- Fix: Stagger the slides so the paths never meet: `fct_orders` first (it moves right and out of the way), then `stg_customers` and `stg_orders`, then `dim_customer`, about 6 frames apart, each on its own `ease`.

### 9. [P3] confusion: Question 6's listing types in before its question is on screen
- When: 270.2-271.4 s, beat `eph` (element-271.jpeg)
- What: The `int_orders_cleaned` listing starts at "Question six" + 6 frames, so on element-271 the eyebrow and a half-typed listing are up but the headline is not.
- Why it matters: The answer's evidence arrives before the question, against the order every other scene keeps.
- Cause: `MatScene.tsx:332` (`at={q6At + 6}`).
- Fix: `at={text6At + 8}` (the headline lands at `text6At - 2`).

### 10. [P3] spacing: the hardcoded line keeps a four-space hole before "AS o"
- When: 94.3-106.4 s, beat `ref-hard` (element-100.jpeg)
- What: `FROM {{ ref('stg_orders') }}    AS o` becomes `FROM analytics.stg_orders    AS o`. The alias was aligned for the longer ref call, so after the swap it floats about 40 px from the table name, in red.
- Why it matters: It reads as a gap in the line, at the moment the narration points at it.
- Cause: `RefScene.tsx:85` (`hardLine` replaces only the call).
- Fix: Collapse the run of spaces in the swapped line: `.replace(/\s{2,}AS /, " AS ")`.

### 11. [P3] spacing: commas sit apart from their highlighted words in Q5's rule
- When: 257.8-269 s, beat `mat-pick` (element-269.jpeg)
- What: "Choose by read frequency , compute cost and data volume , not habit". The comma after each highlighted phrase is outside the highlight, so the highlight's margin pushes it a space away. Q4's "small, testable, written once" and Q9's "database, schema, credentials" keep the comma inside the mark and read correctly.
- Why it matters: It looks like a typo.
- Cause: `MatScene.tsx:312-313`.
- Fix: Put the comma inside the first mark (`<Mark>read frequency,</Mark>`), and start the trailing span with "not habit" after a comma inside the `data volume` mark.

### 12. [P3] confusion: two colors against their meanings
- When: 55-70 s, beat `what-not` (element-068.jpeg); 324-338 s, beats `build-why` and `build-ci` (element-336.jpeg)
- What: In Q1, "dbt" under the T and its bracket are in the data blue, but dbt is not data. In Q7's run-then-test panel, the broken `stg_orders` keeps its blue "built" outline under its red cross, while the same broken model in the build panel beside it is red.
- Why it matters: The series has one meaning per color, and here the same broken model takes two colors in one frame.
- Cause: `WhatScene.tsx:129-132` (`BLUE_INK`); `BuildScene.tsx:86-91` (`runTone` never turns `stg_orders` bad).
- Fix: Set "dbt" and its bracket in ink, at weight 600. Add `{ at: failsAt + 2, tone: "bad" }` to `runTone("stg_orders")`.

### 13. [P3] pacing: Q18's last line is gone before it can be read
- When: 588.2-592.5 s, beat `r-version` (element-589.jpeg, element-591.jpeg)
- What: "v2 can break things; nobody moves until they choose to" inks in from 588.2 s, and its second half from 589.8 s. The panel fades for Question 19 at about 592.5 s. Ten words, not read aloud as written, get 2.7 to 4.3 s.
- Why it matters: Unread quick-round text needs about 2 words/s.
- Cause: `script.ts:463-466` (`pauseAfter: 0.8`).
- Fix: Raise `r-version`'s `pauseAfter` to 1.4 (free).

### 14. [P3] other: Video.tsx's doc comment still counts nineteen questions
- When: none on screen.
- What: The comment reads "Nineteen questions ... then nine quick ones". The video has had twenty questions and ten quick ones since Question 20 was added.
- Why it matters: The next person to edit the video is misled.
- Cause: `video/src/videos/ae-dbt/Video.tsx:22-25`.
- Fix: "Twenty questions ... then ten quick ones".
