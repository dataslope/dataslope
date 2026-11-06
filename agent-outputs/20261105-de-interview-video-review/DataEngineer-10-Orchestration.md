# DataEngineer-10-Orchestration (8:54)

## Verdict
- A clean, legible build. Every number on screen matches `results.json` and the page: 1,000 retries in one 100 ms against 90, jittered peaks of 261/134/75, 6,040,000 rows and 755x, 4.0% nulls against 1%, 6 h 2 min and 30 h 2 min, 365 partitions in 92 waves. Nothing overlaps or clips, and nothing is set under 19px.
- The one wrong claim is Question 10's closing line, that "quality checks can't" catch missing data. It contradicts the video's own Question 7, which lists row counts and freshness as quality checks and whose gate has a 500-row minimum. It also contradicts the page's concept check.
- The answers are right but stop one step short where an interviewer presses: where load writes before the gate (write-audit-publish), why parse-time work hurts, the breaker's three states, the SLO, and what sets a backfill's throttle. Two listings copied from the page would not run as written: `{{ ds }}` inside a TaskFlow body, and a sensor with no bucket.
- Pacing is comfortable: 2.1 to 2.9 words/s, no gap under 0.55 s, and every scene held about 1.6 s before its cut. Three beats (`fresh-run`, `cb-model`, `sensor-poke`) are dense with new numbers.
- The visual defects are small: three stray dots on the retry page for 13 s, a serif header in the freshness table, an unlabelled log scale that makes a linearly growing cost look flat, and labels left dimmed under "all three".

## Findings

### 1. [P1] accuracy: "quality checks can't" catch missing data, against the video's own Question 7
- When: 424.2-429.9 s, beat `fresh-why` (frames element-425.jpeg, element-430.jpeg); also `fresh-run` at about 422 s ("Only the freshness check fails").
- What: The narration says "It catches missing data, which quality checks can't: they only inspect the rows that are there", and the screen reads "catches missing data / quality checks only read the rows that are there". Two minutes earlier, Question 7 (beat `quality`, 290-297 s) listed "row counts" and "freshness" as data-quality checks. Its gate table shows "row count 1,000 ✓", tested against a 500-row minimum (`check.mjs:264,273`), and a load of zero new rows fails that check. The page's own concept check names "a freshness/row-count check" as the answer to this exact scenario. Its prose is narrower than the video: "missing data that passed row-level validation".
- Why it matters: A viewer would tell an interviewer that quality checks cannot catch missing data. The obvious reply is "what about a row-count or volume check?"
- Cause: `video/src/videos/de-orchestration/script.ts:259` (the `fresh-why` text), `FreshScene.tsx:232-234` (the label), and the `fresh-run` sentence "Only the freshness check fails".
- Fix: Reword the beat to "It catches data that never arrived, which row-level checks miss: they only inspect the rows that are there. A row-count check on the day's load would catch it too." Change the label to "row-level checks only read the rows that are there". Change "Only the freshness check fails" to "The freshness check fails", or add a failing "row count: 0" pill beside it.

### 2. [P2] answer: the gate "between load and publish" never says where load writes
- When: 301.4-314.0 s, beat `gate` (element-307.jpeg, element-314.jpeg). Also Question 1's DAG, 44-67 s, beat `cron-dag` (element-067.jpeg).
- What: The figure runs extract, transform, load (green ✓), quality gate (fails), publish ("never runs"), captioned "bad data stops before anyone sees it". Nothing says load writes somewhere consumers cannot read, such as a staging table or branch, with publish as the swap that exposes it. So the viewer can fairly ask how data that load has already written is hidden. Question 1's DAG also puts a "quality gate" before load, with an "alert + halt" branch the narration never mentions. The video therefore shows two placements and explains neither.
- Why it matters: "You've already loaded it, so how does halting help?" is the first follow-up. The pattern's name, write-audit-publish, is what the interviewer listens for.
- Cause: `GateScene.tsx:15` (`NODES` has a plain "load" with no target) and the `script.ts` `gate` beat. `CronScene.tsx:71-77` puts the gate third, before load.
- Fix: Label the box "load to staging" and add to `gate`: "Load into a staging table; publish swaps it into place only if the gate passes. That's write, audit, publish." In `CronScene.tsx`, move the gate after load, or drop the gate and its fail branch from Question 1.

### 3. [P2] answer: parse-time work is named, but not why it hurts
- When: 111.9-118 s, beat `anti-list` (element-115.jpeg, element-137.jpeg).
- What: The narration says "Expensive work at parse time, like an API call in the DAG file, run again on every parse", and the subtitle says the same. The viewer is never told that the scheduler re-parses every DAG file on a timer (every 30 s by default) whether or not anything runs, so "every parse" sounds like "every run".
- Why it matters: The page's reason ("slows the scheduler on every parse") is the point of this anti-pattern, and it is the follow-up an interviewer asks.
- Cause: `AntiScene.tsx:43-44` and the `script.ts` `anti-list` beat.
- Fix: Narrate "Expensive work at parse time, like an API call in the DAG file: the scheduler re-parses every file about every thirty seconds, so the call runs thousands of times a day and slows every DAG." Change the subtitle to "an API call in the DAG file: re-run on every parse, about every 30 s".

### 4. [P2] accuracy: two listings copied from the page would not run as shown
- When: 130-137 s, beat `anti-fix` (element-134.jpeg, element-137.jpeg); 439-469 s, beats `sensor` to `sensor-res` (element-469.jpeg).
- What: The green "better" XCom listing sets `path = "s3://bucket/staging/{{ ds }}.parquet"` inside a `@task` function body. Jinja is rendered only in an operator's templated fields, not in a string inside a TaskFlow function. The task therefore writes to a key literally named `{{ ds }}.parquet`, and every date overwrites the same object. The sensor listing passes a relative `bucket_key` with no `bucket_name`. `S3KeySensor` needs either a bucket name or a full `s3://` URL, and the Pipelines page's version of this listing has `bucket_name="data-lake"`.
- Why it matters: The highlighted fix is the listing a viewer copies, and as written it breaks the per-date overwrite the backfill scene relies on.
- Cause: `AntiScene.tsx:17` and `SensorScene.tsx:14-20`. Both are quoted from `orchestration-and-reliability.mdx`.
- Fix: Use `def extract(ds=None):` with `path = f"s3://bucket/staging/{ds}.parquet"` (TaskFlow injects context keys by parameter name). Add `bucket_name="data-lake",` to the sensor listing, as `pipelines.mdx` has it. Flag both lines on the page as well.

### 5. [P2] confusion: "not to fail faster" sits under the pipeline gate whose job is to "fail fast"
- When: 331.1-353.2 s, beat `cb-model` (element-336.jpeg, element-353.jpeg).
- What: At 316-320 s the narration says the pipeline breaker's job is to "fail fast, alert, and halt". At about 334 s, "not to fail faster: / stop the load on what can't recover under it" appears bottom left, directly under the bad-table, gate and downstream figure, so it reads as that figure's caption. The narration says this is the services meaning ("The name comes from services"), but nothing on screen says so. The right-hand chart is titled only "error rate at the dependency · a model".
- Why it matters: From the screen alone, the two halves contradict each other, and the pipeline half is what the question asks about.
- Cause: `BreakerScene.tsx:200-205` (the note at `X0`, under the left figure) and `BreakerScene.tsx:208-210` (the chart title).
- Fix: Change the first line to "in services, the point isn't failing faster:" and retitle the chart "a service breaker · a model". Add "fail fast, alert, halt" under the left figure on `fastAt`, so the pipeline half has its own caption.

### 6. [P2] other: three stray blue dots on an empty page for 13 s
- When: 138.5-152 s, beat `retry` (element-139.jpeg, element-145.jpeg, element-150.jpeg).
- What: Three 5px blue dots sit at y 703 (x 1014, 1117 and 1324) in the otherwise empty right half. They appear on the scene's first frame and stay until each wait segment draws, at about 150-153 s.
- Why it matters: They read as a rendering glitch on a mostly blank page while the narrator lists transient failures.
- Cause: `RetryScene.tsx:139` draws each wait `<line>` with `strokeLinecap="round"` from the scene's start. At `p = 0` a zero-length round-capped line renders as a dot.
- Fix: Return `null` while `p <= 0`, as `BackfillScene.tsx` does for its cells, or use `strokeLinecap={p > 0 ? "round" : "butt"}`.

### 7. [P3] confusion: the backfill cost chart is on an unlabelled log scale, so linear growth looks like it levels off
- When: 266-281 s, beat `bf-cost` (element-270.jpeg, element-280.jpeg).
- What: The ticks 10k, 100k, 1M and 10M are evenly spaced. The red "rebuild everything" line grows by a straight 8,000 rows a day, but it climbs steeply for about 100 days and then looks almost flat. Neither the axis nor the narration says the scale is logarithmic.
- Why it matters: The point is that a full rebuild grows with the table, and the curve's shape says it stops growing.
- Cause: `BackfillScene.tsx:30-31,89` (the log10 mapping) and `BackfillScene.tsx:202` (the heading, which has no scale note).
- Fix: Add "(log scale)" to the "rows one run processes" heading. Or draw the axis linear from 0 to 6.5M: the blue 8,000 line would then sit on the axis, which makes the 755x gap self-evident.

### 8. [P3] accuracy: Airflow already spreads its backoff, so the exact 5/10/20 and the lockstep model are not Airflow's behavior
- When: 150-157 s, beat `retry` (element-153.jpeg, element-172.jpeg); 173.7-196.2 s, beats `jitter` and `jitter-fix` (element-196.jpeg).
- What:
  - The timeline draws exact waits of 5, 10 and 20 min from the page's `default_args`. The next scene says tasks "on one backoff schedule" all retry in the same tenth of a second.
  - Airflow's `retry_exponential_backoff` adds a deterministic per-task-instance hash to each wait. Each wait lands between the doubled delay and twice that, capped by `max_retry_delay`. So 5/10/20 are lower bounds, and Airflow tasks do not retry in lockstep.
  - "Jitter" is first said at 173.7 s but not explained until 188 s ("each one lands somewhere in its wait").
  - The model switches from minutes to a 400 ms base with no mention.
- Why it matters: An interviewer who knows Airflow will correct "add jitter to the Airflow retries". The advice belongs to code that calls a shared service.
- Cause: `RetryScene.tsx:191` ("each wait doubles"), the `script.ts` beats `retry` and `jitter`, and `JitterScene.tsx:126`.
- Fix: Label the timeline "at least 5, 10, 20 min". Open `jitter` with "In code that calls a shared service, add jitter too: a random part of each wait." Change the subtitle to "a model: 1,000 clients, a 400 ms base, retries per 100 ms".

### 9. [P3] answer: the breaker chart never names its states, and one band reads as a 26 s "open 12 s"
- When: 331.1-353.2 s, beat `cb-model` (element-336.jpeg, element-345.jpeg, element-353.jpeg).
- What:
  - The grey band runs from 26 to 52 s. It holds two 12 s open spells, with a failed half-open probe at 38 s shown only as a faint 1 s line and a tiny green blip.
  - One label, "open 12 s: nothing gets through", sits over the whole band, and the failed probe is never mentioned.
  - The three states an interviewer expects in this answer (closed, open, half-open) are never named.
  - The empty axes are up from 331 s (`servicesAt`), but the curves wait for "Model a failing dependency" at about 340 s. That is about 10 s of empty chart (tile 336, held 9 s).
- Cause: `BreakerScene.tsx:217-229` (the bands), `BreakerScene.tsx:268-272` (the single label) and `BreakerScene.tsx:99` (`chartIn` cued on `servicesAt`).
- Fix:
  - Label the 38 s line "half-open: probe fails" and the 51 s line "half-open: probe passes, closed".
  - Narrate "...sends nothing for twelve seconds, then half-opens to let one probe through".
  - Cue `chartIn` on `modelAt - 10`.

### 10. [P3] answer: Question 9 never names the SLO, and the alert fires at the end of the late run instead of at the deadline
- When: 370.9-387.1 s, beat `sla-enforce` (element-379.jpeg, element-387.jpeg).
- What: "Track it over time as an objective" is the page's "objective (SLO)", but the term is never said or shown. The SLA/SLO distinction (the promise against the measured target) is the likely follow-up. On the Wednesday bar, the ✕ and "missed: alert" sit at the bar's end, about 06:45. That makes the deadline callback look as if it alerts when the late run finishes. It should alert at 06:00, while the job is still running.
- Cause: `SlaScene.tsx:142-150` (the cross and label placed at `tx(NIGHTS[1].end)`), `SlaScene.tsx:203`, and the `script.ts` `sla-enforce` beat.
- Fix: Put the ✕ and "missed: alert" on the 06:00 line at `missAt`. Label the strip "SLO: 13 of 14 nights on time", and narrate "track it over time as an objective, an SLO".

### 11. [P3] answer: Question 2 never says "software-defined assets" or what the typing and testing are
- When: 68.7-97.4 s, beats `dagster` and `dagster-why` (element-098.jpeg).
- What: The answer is right, but it never uses "software-defined assets", Dagster's name for what the scene draws and the Pipelines page's term. "Stronger typing" and "testing primitives" arrive as two pills with no example. It also skips the usual pushback: Airflow can now schedule on datasets (called assets in Airflow 3).
- Cause: the `script.ts` beats `dagster` and `dagster-why`; `DagsterScene.tsx:114,222-225`.
- Fix: "Dagster is asset-centric: you write software-defined assets, functions that each declare the table or file they produce..." Replace "testing primitives" with a concrete example, such as "an asset runs in a unit test with mocked resources".

### 12. [P3] answer: Question 6 names no setting for the throttle, or for re-running dates that already ran
- When: 248.1-264.0 s, beat `bf-year` (element-262.jpeg).
- What:
  - "Catchup with a sensible start date schedules them" never says what catchup does: it creates a run for every missed interval since `start_date`.
  - "Four at a time" never says what sets the limit (`max_active_runs`, or a pool).
  - Catchup only creates runs that never happened. Reprocessing dates that already ran, which is the "fix a bug" case on screen, takes Airflow's backfill command or clearing those runs.
- Cause: `BackfillScene.tsx:150-158,186-190` and the `script.ts` `bf-year` beat.
- Fix: Label the throttle "throttled: `max_active_runs=4`, 92 waves". Add "catchup creates a run for every missed date; to redo dates that already ran, use a backfill command".

### 13. [P3] explanation: "idempotent" is used twice before it is defined
- When: about 122 s, beat `anti-list` ("Tasks that aren't idempotent", element-124.jpeg), and about 166 s, beat `retry-not` ("Retry only idempotent tasks", element-166.jpeg). It is defined at about 219 s, beat `kinds-safe` (element-227.jpeg).
- What: The definition ("which end the same however often they run") comes 95 s after the word is first used, in a video whose retry answer depends on it.
- Cause: the `script.ts` `anti-list` beat; `AntiScene.tsx:55-56`.
- Fix: Define it at first use: "Tasks that aren't idempotent, that don't end the same however often they run, corrupt state when they rerun."

### 14. [P3] explanation: "a deferrable sensor" is recommended and never explained
- When: 464-469 s, beat `sensor-res` (element-469.jpeg).
- What: The narration and the green label recommend "reschedule, or a deferrable sensor". Nothing says what deferrable means or why it is better: it hands the wait to the triggerer process, so it holds no worker slot at all and is not re-queued for every check.
- Cause: the `script.ts` `sensor-res` beat; `SensorScene.tsx:255`.
- Fix: "...or a deferrable sensor, which hands the wait to Airflow's triggerer and holds no slot at all."

### 15. [P3] confusion: retry and rerun stay greyed out while the pill says "all three"
- When: 218.9-228 s, beat `kinds-safe` (element-227.jpeg).
- What: Each label dims when the next kind is introduced, and none comes back. The closing frame shows "retry: ..." and "rerun: ..." at about 30% opacity next to "all three: safe only on idempotent tasks".
- Cause: `KindsScene.tsx:143,159,164` (`dim={rerunAt - 6}`) and `KindsScene.tsx:176,187,189` (`dim={backAt - 6}`).
- Fix: Restore all three labels to full opacity on `safeAt`.

### 16. [P3] other: the freshness table's "now" header falls back to the serif, and the age reads like a clock time
- When: 410-430 s, beat `fresh-run` (element-430.jpeg).
- What: "now" renders in the page's serif, at a smaller size, beside "newest" and "age" in mono. The age "06:02:00" sits next to "06:00 Jun 3" and reads as a time of day rather than 6 h 2 min.
- Cause: `FreshScene.tsx:122` sets `fontFamily: c.key === "now" ? undefined : MONO` after spreading `label()`. The `undefined` removes `label()`'s SANS, so the header inherits the page's serif.
- Fix: Use `fontFamily: c.key === "now" ? SANS : MONO`. Head the column "age (h:mm:ss)", or show it with `hm()` from `data.ts` ("6 h 2 min", "30 h 2 min").

### 17. [P3] other: the backfill listing says 2024 beside a 2025 grid
- When: 240-281 s, beats `backfill` to `bf-cost` (element-280.jpeg).
- What: The listing's comment reads `ds = "2024-06-01"`, while the grid beside it reads "2025: 365 daily partitions" (the Pyodide run was over 2025).
- Cause: `BackfillScene.tsx:16`.
- Fix: Change the comment to `"2025-06-01"`, and note the edit in the listing's "word for word" doc comment.

### 18. [P3] spacing: the "reschedule mode" label crowds the poke lanes
- When: 456.3-470 s, beat `sensor-res` (element-469.jpeg).
- What: The label's cap line is about 18 px under the last "sensor, waiting" lane and about 25 px above the first reschedule lane, so it reads as part of the poke block.
- Cause: `SensorScene.tsx:63` (`resTop = y(712)`), with the label at `resTop - h(46)` (`SensorScene.tsx:218`).
- Fix: Set `resTop = y(736)`. The bottom lane then ends near 972 px, still clear of the frame edge.

### 19. [P3] pacing: three dense beats carry a new figure's numbers
- When: `fresh-run` 405.4-423.6 s (2.91 w/s over 18 s, with six times and ages); `cb-model` 331.1-353.2 s (2.80 w/s over 22 s, with four model numbers); `sensor-poke` 447.0-455.7 s (3.08 w/s).
- What: The rest of the video runs at 2.1 to 2.7 w/s. Each of these three beats introduces a figure's numbers at the top of that range, with only 0.6 s before the next beat.
- Cause: the `script.ts` beats `fresh-run`, `cb-model` and `sensor-poke`.
- Fix:
  - Split `fresh-run` after "six hours old." with `pauseAfter: 0.6`.
  - Split `cb-model` after "Model a failing dependency." with `pauseAfter: 0.5`. This also lets finding 9's empty axes fill sooner.
  - Trim `sensor-poke` to "In the default poke mode, a sensor holds a worker slot the whole time it waits. Fill the pool with them, and nothing else runs."
