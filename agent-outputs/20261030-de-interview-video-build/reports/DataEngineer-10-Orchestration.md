# DataEngineer-10-Orchestration (de-orchestration): report

**Length** LENGTH. **Voiced** 7,294 characters in 5 takes (Drew, eleven_v4_turbo), no re-voices; 35 beats, 14 scenes. Plan figure 6,100, so +19.6% (inside +20%); `--dry-run` count 7,292 before the "Part six" spelling fix.

**Questions** (page wording; deep dives numbered aloud, 12 to 14 on screen only):
1. What does an orchestrator give you over cron? (covers Pipelines' Airflow/Dagster version)
2. How does Dagster model pipelines differently from Airflow? (moved from Pipelines)
3. What is a DAG, and what are common anti-patterns? (with Pipelines' DAG question)
4. How should you configure retries, and what shouldn't you retry? (two scenes: settings, then jitter)
5. What is the difference between retries, backfills, and reruns?
6. What is a backfill, and how do you design for it? (with Pipelines'; shows its `process_partition` listing)
7. What are data-quality checks, and where do they belong in a DAG? (with Pipelines' data quality testing)
8. What is a circuit breaker in a pipeline? (with Pipelines')
9. What is an SLA in a pipeline, and how do you enforce it? (with Pipelines')
10. What is data freshness, and how do you monitor it?
11. What is a sensor, and why prefer reschedule mode? (with Pipelines' task vs sensor)
12. How do you manage dependencies between separate pipelines? 13. What should you monitor and alert on in data pipelines? 14. How do you make a pipeline observable and debuggable?
Not answered, per the plan: idempotency (Part 6; named as the precondition and pointed to as "Part six") and dead-letter handling (Part 8).

**Reuse**: no DA/DS/course video asks these, so no scene is copied. Kit pieces imported: the DA statistics part's page furniture (Drift, Kicker, Headline, Mark), the DA pandas and SQL listings, the interview kit. New local pieces in `parts.tsx`: `TaskBox` (a task/asset box that changes state), `Edge`, `Cross`, `Pill`, `CodeSpan`.

**Facts** (`check.mjs` → `results.json` → `data.ts`): the three page charts rerun from their own code and seeds and checked against the captions they export (retry storm: 1,000 in one 100 ms against 90; jittered peaks 261/134/75. Incremental: 6,040,000 against 8,000 a day, 755×. Breaker: trips at 50%, 12 s open, one failed probe, retries peak 300 and never recover). Pyodide 314.0.7: the page's `default_args` as a doubling schedule (5, 10, 20, cap 30) and a 2025 backfill (365 partitions, 4 at a time, 92 waves). DuckDB-Wasm 1.4.3: the video's own 1,000-order gate (4.0% null customer IDs against 1%) and the page's freshness check on its own `daily_orders` with `now()` pinned (06:02:00 and 1 day 06:02:00 against a 12 h threshold). Airflow/Dagster only drawn, quoted as the page states.

**Checks** (voiced code, through my entry and the queue):
CHECKS

**Page and chart issues** (not edited):
- `charts/idempotency-retry-storm.mjs`: its `title` (the alt text) says the jittered retries "spread into a flat band below" capacity; its own data peaks at 261 against a capacity of 90, and only the third round (75) is under it. The caption's numbers are right. The video says "falls to 261, and below 90 by the third round".
- `charts/incremental-vs-full-refresh.mjs`: the docstring and title say a "monthly" full refresh; the code refreshes every 60 days. The video does not mention the cadence.
- The orchestration page puts the retry-storm chart under idempotency, but it shows jitter, which the page's retries answer never mentions; the video uses it under retries.
- `pipelines.mdx`'s sensor import (`airflow.sensors.s3_key_sensor`) is the Airflow 1 path (now `airflow.providers.amazon.aws.sensors.s3`); the video shows the orchestration page's listing, which has no import.

**Kit notes**: `QMono` sets code at 0.84em, so inside a 20 to 22px label it falls under 19px; I used a local `CodeSpan` with a 19px floor. A shared DAG node/edge primitive (like `TaskBox`/`Edge`) would serve Parts 6 and 11 too.

**Left undone**: SFX levels follow the README; sensor-poke reads at 3.08 words/s, just over the 3.0 guide.
