# AnalyticsEngineer-3-Dbt (669.7 s, 11:10)

## Verdict
- Every fix from the 2026-11-20 pass holds on screen: Q9 now names the profile, `--target` and the platform's environments (element-424); Q20 reads "The Fusion engine" (element-653); "reaching the dashboard" and "the dashboard it reaches" replace "and the dashboard" (element-204, element-375); the table's plan reads rows=13 beside its 13 (element-268); the macro's 19 holds (element-495); `+fct_orders` holds lit (element-370); Q16's graph is whole before it goes (element-563); the hook's boxes no longer overprint (element-014); Q6's listing waits for its headline (element-272); the four-space hole and the loose commas are gone (element-100, element-268); "dbt" is in ink and the broken `stg_orders` is red in both build panels (element-068, element-336); Q18's last line has time (element-602).
- Every number on screen still matches `results.json` and the page.
- What the first pass missed is mostly in the quick round, where two answers stop one step short of the follow-up. Q18 never says what a `ref` without a version resolves to, and its screen line "nobody moves until they choose to" is wrong for an unpinned consumer, which dbt moves to the newest version by default. Q20 answers "how does it relate to dbt Core?" with naming only, and never mentions the licence, which is the other half of the page's "Naming and licensing".
- Two polish items: Q15's lit lineage, the point of its last sentence, is up for about 1.5 s, and a Q8 caption sits under the wrong column.

## Findings

### 1. [P2] answer: Q18 never says what a plain `ref` gets, and "nobody moves until they choose to" is wrong by default
- When: 596.2-604.0 s, beat `r-version` (element-600.jpeg, element-602.jpeg)
- What: The narration says "Consumers pin one with ref and a version number, so a breaking change rolls out without forcing everyone across at once." On screen, under the pinned `ref('dim_customer', version=1)`, the line reads "v2 can break things; nobody moves until they choose to". dbt resolves a `ref` with no version to the model's `latest_version`, and when that is not set it is the highest version. So adding `dim_customer_v2` moves every unpinned consumer to v2 at once, unless the maintainer holds `latest_version: 1` until consumers have moved (dbt's docs, "Model versions": "By default, the `ref` resolves to the latest version"; "If not specified explicitly, the `latest_version` would be `2`, because it's numerically greatest"). The page does not say this either; its answer stops at pinning.
- Why it matters: "What happens to the models that don't pin a version?" is the obvious follow-up, and the screen gives the wrong answer to it. A candidate who repeats "nobody moves until they choose to" will be corrected. Separately, v2's box turns the data blue on "a breaking change rolls out", a color with no meaning here, and the line opens on a lowercase "v2" although it stands on its own.
- Cause: `video/src/videos/ae-dbt/script.ts:476-479` (`r-version`'s text); `RapidScene.tsx:432-434` (the line); `RapidScene.tsx:417` (v2's `data` tone).
- Fix: Add a new beat `r-version-latest` after `r-version`, voiced on its own (about 135 characters): "A ref with no version gets the latest one, and that defaults to the highest number. Keep latest version at one until consumers have moved." On screen: "Breaking changes go in v2; pinned consumers move when they choose to", then `ref('dim_customer')` → `latest_version`, then "By default the highest: v2, at once" in red (the trap), then `latest_version: 1` "until consumers have moved" in green, each on its words. v2's box stays in ink. Move `r-version`'s 1.4 s `pauseAfter` to the new beat and give `r-version` the usual 0.8. In the script header, say the fact is dbt's documented behavior, not the page's, as the header already does for `--target`.

### 2. [P2] answer: Q20 answers "how does it relate to dbt Core?" without the licence
- When: 620.4-655.3 s, beat `r-v2` (element-633.jpeg, element-653.jpeg)
- What: The page's first point under Q20 is "**Naming and licensing.** The main distribution is now called just **dbt** and ships under dbt's own product license. **dbt OSS** is the subset built entirely from Apache 2.0 code. **dbt Core** names only the Python 1.x line." The video gives the naming (dbt, dbt Core) and leaves out the licence and dbt OSS entirely.
- Why it matters: The question asks how v2 relates to dbt Core, and for most teams that relationship is the licence: Core is the Apache-licensed Python line, the new main distribution is not. "Is v2 still open source?" is the follow-up an interviewer asks next, and the video has no answer.
- Cause: `video/src/videos/ae-dbt/RapidScene.tsx:513-524` (the `dbt` and `dbt Core` rows); `check.mjs:261-284` (`dbtV2` reads neither the licence nor dbt OSS).
- Fix: On screen only. `r-v2` was voiced on its own with no take to cut from, so a word changed in it re-voices all 470 characters, and a new beat after the YAML clause would put the licence after the YAML point, out of order. Have `check.mjs` quote the page's two licence sentences and read "Apache 2.0" out of them into `dbtV2.ossLicense`. Then the `dbt` row reads "The main distribution, under dbt's own license", and a new `dbt OSS` row reads "Its Apache 2.0 subset", inking in with the `dbt` row on "the main distribution is now just called dbt". Move the SQL and YAML lines down one row to make room. They are up for about 20 s.

### 3. [P3] pacing: Q15's lit lineage is up for about 1.5 s
- When: 546.1-548.2 s, beat `r-exposures` (element-546.jpeg, element-547.jpeg)
- What: The exposure graph draws from "They sit in the lineage graph" (542.7 s). It lights back along its edges only on "reached the revenue dashboard": the dashboard at 546.1 s, `fct_orders` and `dim_customer` at 546.5 s. Question 16 replaces the panel at 548.2 s. On element-546 the models are still ink, on element-547 they are lit, and by 548 the panel is fading.
- Why it matters: The lit path is the point of the answer's last sentence ("which is how question four's change reached the revenue dashboard"), and it leaves almost as soon as it lands.
- Cause: `video/src/videos/ae-dbt/RapidScene.tsx:281-295` (all tones cued from `reachedAt`); `script.ts:461-464` (`pauseAfter: 0.8`).
- Fix: Light the dashboard and both edges on "question four's change" (544.8 s), with the models on "reached". Raise `r-exposures`'s `pauseAfter` to 1.4 (timing only, free). The lit path then holds about 3.5 s.

### 4. [P3] spacing: Q8's "Question 4's count of what a change rebuilds" sits under the wrong selector
- When: 373.9-377.5 s, beat `subset-plus` (element-375.jpeg)
- What: The caption sits at x = 900, under the dimmed `--select +fct_orders` / "All 4 models, in order" column. It describes the right-hand selector, `--select fct_orders+` ("A plus after adds everything downstream, which is how question four counted a change").
- Why it matters: It reads as a caption to the upstream selection, which is the opposite operator.
- Cause: `video/src/videos/ae-dbt/SubsetScene.tsx:139` (`x={READ_X}`).
- Fix: `x={READ_X + 420}`, under "The fact, and the dashboard it reaches". It ends near x = 1805, inside the page.
