# AnalyticsEngineer-2-ChangingDimensions (8:04)

## Verdict
- All ten fixes from the 2026-11-20 pass hold on screen: the bridge says "Updated every day, in order"; the snapshot cells carry the source's `updated_at`; the model box closes the null at 9999-12-31; the Type 0 note sits under its own column; the INSERT's result holds about 3 s; the trap has no dots; "Today's total" leaves with its listing; no "the page's" labels; the Type 1 legend says "history kept"; and the join titles share a line (544 and 552 px before, 555 and 552 now).
- Every number I checked matches `results.json` and the page. I re-derived the four 2022 region pairs, 24 to 44 rows (+76%), 700.00 of 1,110.00, and 50,000 to 122,000.
- The one answer-level gap the first pass missed is in Question 5. The recommended load looks keys up in `dim_customer` on the customer ID alone. That is the join Question 2 called "the trap" three minutes earlier. The dimension drawn beside it has quietly lost Acme's East version (1001), so the figure only works because the table is not the Type 2 table the video built.
- The rest is small. The snapshot scene shows two different "Run 2"s 15 s apart. The periodic-snapshot caption repeats "lands", which this video otherwise uses to mean "arrives". The three flow boxes have their titles at three different heights.
- Pacing is unchanged and comfortable: 1.9 to 3.2 words a second, every gap 0.6 s or more, and every result held long enough to read.

## Findings

### 1. [P2] answer: Question 5's load joins the dimension on the customer ID alone, the trap from Question 2
- When: 290-331 s, beats `late-drop`, `late-fix`, `late-correct` (element-297.jpeg, element-307.jpeg, element-311.jpeg)
- What: "The load's key lookup" (`JOIN dim_customer d ON d.customer_id = o.customer_id`), the green "Every fact loads" (`LEFT JOIN ... ON d.customer_id = o.customer_id`) and the correction job (`AND d.customer_id = f.customer_id`) all match on the natural key with no version predicate. At 142-159 s the video said "The trap is joining on the customer ID alone. Each order repeats once per version of its customer." The `dim_customer` drawn here keeps the page's keys (1002 for 42, 1003 for 99) but not 42's East version, 1001, which Question 2 showed two rows above the same name. Against the table Question 2 built, the green load would load order 201 twice.
- Why it matters: the right answer on screen uses the join the video just taught as the bug. "Your dimension is Type 2: which row does the lookup pick?" is the obvious press, and the figure has no answer to it.
- Cause: `video/src/videos/ae-changing-dimensions/check.mjs:223-260` (the Question 5 table has no history and no `is_current`; `load`, `loadSum`, `loadUnknown` and `correct` join on `customer_id` alone); `LateScene.tsx:147-149` (the table is titled plain "dim_customer").
- Fix: give the Question 5 table the page's two rows for 42 (1001 East, not current; 1002 West, current) and an `is_current` column. Draw it from `WHERE is_current` and title it "dim_customer, current rows". Add `AND d.is_current` to the inner-join lookup, the left-join load and the correction job. Every value comes back identical (700.00 of 1,110.00, 1,110.00, 1 row re-keyed, 0 left), and the comparison with de-modeling-history still holds. No narration changes.

### 2. [P3] confusion: two different "Run 2"s in the snapshot answer
- When: 222-233 s, beat `snap` (element-231.jpeg); then 243-279 s, beats `snap-gap` to `snap-model` (element-249.jpeg)
- What: under the snapshot table, "Run 2: the source now says West", and the table records West. Fifteen seconds later the gap figure, under the same plain title "Customer 42 in the source", has its own Run 2 record North, with West drawn dashed and "Never recorded".
- Why it matters: read side by side, the two figures contradict each other about what run 2 saw. The second one is a hypothetical ("change a row twice between runs"), but nothing on screen says so.
- Cause: `SnapScene.tsx:180` (the note) and `SnapScene.tsx:199` (the gap figure's title).
- Fix: "Next run: the source now says West" under the table. Title the gap figure "Customer 42 in the source, moving twice between runs".

### 3. [P3] explanation: "Rebuilt: the order lands in May" leans on a word the video uses for arrival
- When: 366.8-375.5 s, beat `late-fact-snap` (element-370.jpeg, element-375.jpeg)
- What: the narration says "rebuild any periodic snapshot for the period the order lands in", and the caption repeats "the order lands in May". Everywhere else in this video "lands" means "arrives": "an order for customer seventy-seven lands before customer seventy-seven does", "hold the facts back until the customer lands". This order arrives today ("Arrives today" is on the timeline above).
- Why it matters: "the period it lands in" can be heard as today's period, which is exactly the wrong one for a late fact. The lit May 2022 cell carries the right answer, so the caption only has to name it.
- Cause: `LateFactScene.tsx:301`.
- Fix: caption "Rebuilt: May, the month of its order date". This is on screen only. The narration stays: with the caption, "lands in" reads as "falls in", and a re-voice for wording alone is not warranted.

### 4. [P3] spacing: the three flow boxes start their text at three heights
- When: 260-279 s, beats `snap-keep`, `snap-model` (element-278.jpeg)
- What: the three boxes are the same height, but each centres its lines vertically. "Source: customers" (2 lines) starts at y 736, "Snapshot: snap_customers" (3 lines) at y 716 and "Model: dim_customer" (4 lines) at y 697. The titles step up across what is meant to read as one row.
- Why it matters: it is a visible misalignment in a three-box row whose labels are meant to be read across.
- Cause: `SnapScene.tsx:246-276` (the boxes' children, inside `Box`, `parts.tsx:320`, `justifyContent: "center"`).
- Fix: top-align the three boxes' contents with the same top padding, so their titles share a line.
