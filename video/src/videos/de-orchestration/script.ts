import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Orchestration & reliability" (16:9), Part 10 of the Data
 * Engineer interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * content/interview/data-engineer/orchestration-and-reliability.mdx. It answers
 * the fourteen questions the plan gives this video: eleven worked through,
 * numbered aloud, then three quick ones (numbered 12 to 14 on screen only).
 * Questions are the page's own wording; "(Pipelines)" marks one moved here
 * from content/interview/data-engineer/pipelines.mdx, whose answer this one
 * also covers.
 *
 *   1. What does an orchestrator give you over cron? ("cron"; with Pipelines'
 *      "What does an orchestrator (Airflow/Dagster) give you over cron?")
 *   2. How does Dagster model pipelines differently from Airflow? ("dagster";
 *      moved from Pipelines)
 *   3. What is a DAG, and what are common anti-patterns? ("anti"; with
 *      Pipelines' "What is a DAG in Airflow…", whose parse-time item is the
 *      same one)
 *   4. How should you configure retries, and what shouldn't you retry?
 *      ("retry", "retry-not", and the jitter that keeps a retry from being
 *      an outage, "jitter")
 *   5. What is the difference between retries, backfills, and reruns? ("kinds")
 *   6. What is a backfill, and how do you design for it? ("backfill"; with
 *      Pipelines' backfill question, whose listing it shows)
 *   7. What are data-quality checks, and where do they belong in a DAG?
 *      ("quality"; with Pipelines' "What is data quality testing…")
 *   8. What is a circuit breaker in a pipeline? ("breaker"; with Pipelines'
 *      circuit breaker question)
 *   9. What is an SLA in a pipeline, and how do you enforce it? ("sla"; with
 *      Pipelines' SLA question)
 *   10. What is data freshness, and how do you monitor it? ("fresh")
 *   11. What is a sensor, and why prefer reschedule mode? ("sensor"; with
 *      Pipelines' "What is a task vs a sensor in Airflow?", whose
 *      task-against-sensor line it opens on)
 *   Quick ("rapid-in"): 12. How do you manage dependencies between separate
 *   pipelines? 13. What should you monitor and alert on in data pipelines?
 *   14. How do you make a pipeline observable and debuggable?
 *
 * Not answered here, by the plan: "Why is idempotency the foundation of
 * reliable pipelines?" (Part 6, Pipelines, answers it; retries, reruns and
 * backfills name it as their precondition and point there) and "What is
 * dead-letter handling in a pipeline?" (Part 8, Streaming).
 *
 * Reuse: none word for word. No Data Analyst, Data Scientist or course video
 * asks these questions; the page's three charts are the shared source, as
 * they are the page's.
 *
 * The opening takes Part 9's bridge (keeping it all running on time) with a
 * night when every job succeeded and nothing was ready, which Question ten
 * comes back to. The bridge leads into Part 11, pipelines for AI.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts (check.mjs into results.json, which data.ts reads). Airflow and
 * Dagster do not run here; their behavior is quoted only as the page states
 * it, and drawn as mechanism.
 *   - "retry": the page's default_args (3 retries, 5 minutes, exponential
 *     backoff, 30 at most) as a doubling schedule, in Pyodide 314.0.7: waits
 *     of 5, 10 and 20 minutes; a fourth would be capped at 30, not 40.
 *   - "jitter": charts/idempotency-retry-storm.mjs, copied with its seed and
 *     checked against its caption: 1,000 clients without jitter land 1,000 in
 *     one 100 ms window against a capacity of 90; with jitter the peaks are
 *     261, 134 and 75 over the three rounds.
 *   - "bf-year": a 2025 backfill in Pyodide: 365 daily partitions, four at a
 *     time (the video's own throttle), 92 waves.
 *   - "bf-cost": charts/incremental-vs-full-refresh.mjs: 8,000 rows a day on
 *     200,000; a full rebuild at day 730 reprocesses 6,040,000 rows, 755 times
 *     one day's partition.
 *   - "gate": the video's own 1,000-order batch in DuckDB-Wasm 1.4.3: 4.0%
 *     null customer IDs against a limit of 1%; no duplicates, no bad amounts.
 *   - "cb-model": charts/circuit-breaker-states.mjs, copied with its seed and
 *     checked against its caption: trips at 50% errors, open 12 seconds, one
 *     failed probe, closed after the second; retries alone peak at 300
 *     requests a second against 100 and never recover.
 *   - "fresh-run": the video's own daily_orders in DuckDB, an order every
 *     three minutes on June 1 and 2, nothing on June 3; the page's check
 *     (now against max(updated_at)) with now() pinned to 06:00: 6 h 2 min on
 *     June 3, 30 h 2 min (1 day 06:02) on June 4, against the video's own
 *     12-hour threshold.
 *
 * Written for Drew's ear: SQL is "sequel"; DAG and SLA are expanded once;
 * every other initialism is plain caps, never letter-spaced; numbers as they
 * are said.
 */
export const script: NarrationScript = {
  id: "de-orchestration",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every job ran last night, and every one reported success. At six, the dashboard still shows yesterday's numbers. Nothing failed. Nothing was ready, either.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "This round is keeping data on time: tasks in order, recovery from failure, and bad data caught early. Fourteen questions: eleven with a figure, then three quick ones.",
      pauseAfter: 0.7,
    },

    // ── 1. Orchestrator over cron ─────────────────────────────────────────
    {
      id: "cron",
      scene: true,
      text: "Question one. What does an orchestrator give you over cron? Cron, the Unix job scheduler, starts a command at a set time, and nothing more. Schedule extract at one and transform at two. The night extract runs long, transform starts anyway, on half the data.",
      pauseAfter: 0.7,
    },
    {
      id: "cron-dag",
      text: "An orchestrator runs a DAG, a directed acyclic graph: tasks joined by their dependencies, so each starts only after its upstream tasks succeed. On top come retries, backfills, monitoring and lineage. Airflow, Dagster and Prefect, three open-source orchestrators, keep the graph and every run's history. Cron keeps neither.",
      pauseAfter: 0.8,
    },

    // ── 2. Dagster against Airflow ────────────────────────────────────────
    {
      id: "dagster",
      scene: true,
      text: "Question two. How does Dagster model pipelines differently from Airflow? Airflow is task-centric: you write the steps to run, and wire them in order. Dagster is asset-centric: you declare the data each function produces, a table or a file, and Dagster works out the graph from what each one reads.",
      pauseAfter: 0.6,
    },
    {
      id: "dagster-why",
      text: "So lineage and freshness come built in: every asset knows what produced it, and when. It also has stronger typing and testing primitives.",
      pauseAfter: 0.8,
    },

    // ── 3. DAG anti-patterns ──────────────────────────────────────────────
    {
      id: "anti",
      scene: true,
      text: "Question three. What is a DAG, and what are common anti-patterns? It's a workflow's tasks and the edges between them, with no cycles. Four anti-patterns come up.",
      pauseAfter: 0.5,
    },
    {
      id: "anti-list",
      text: "Expensive work at parse time, like an API call in the DAG file, run again on every parse. Monolithic tasks, where one failure redoes everything. Tasks that aren't idempotent, which corrupt state when they rerun. And large data passed through XComs, Airflow's store for small messages between tasks.",
    },
    {
      id: "anti-fix",
      text: "Write the data to storage, and pass only its path.",
      pauseAfter: 0.8,
    },

    // ── 4. Retries ────────────────────────────────────────────────────────
    {
      id: "retry",
      scene: true,
      text: "Question four. How should you configure retries, and what shouldn't you retry? Retry transient failures: a network blip, a rate limit, a brief outage. Keep the count small, and back off exponentially: wait five minutes, then ten, then twenty, and never more than thirty.",
      pauseAfter: 0.6,
    },
    {
      id: "retry-not",
      text: "Don't retry deterministic failures, like a bad sequel query or a schema mismatch: they fail the same way every time. Retry only idempotent tasks. And alert when retries run out, so repeated failures surface.",
      pauseAfter: 0.8,
    },
    {
      id: "jitter",
      scene: true,
      text: "Add jitter, too. When a shared source fails, every task reading it fails at once. Model a thousand on one backoff schedule: all thousand retry in the same tenth of a second, against a service that takes ninety.",
      pauseAfter: 0.5,
    },
    {
      id: "jitter-fix",
      text: "With random jitter, each one lands somewhere in its wait. The peak falls to two hundred sixty-one, and below ninety by the third round.",
      pauseAfter: 0.8,
    },

    // ── 5. Retries, reruns, backfills ─────────────────────────────────────
    {
      id: "kinds",
      scene: true,
      text: "Question five. What is the difference between retries, backfills, and reruns? A retry re-attempts a failed task inside one run, for a transient error. A rerun runs a finished date again, usually after a code or data fix. A backfill runs past dates that never ran, or a whole range again.",
      pauseAfter: 0.6,
    },
    {
      id: "kinds-safe",
      text: "All three are safe only on idempotent tasks, which end the same however often they run. Part six shows how.",
      pauseAfter: 0.8,
    },

    // ── 6. Backfills ──────────────────────────────────────────────────────
    {
      id: "backfill",
      scene: true,
      text: "Question six. What is a backfill, and how do you design for it? It reprocesses history, to fill a new table, fix a bug, or apply a schema change. Design for it from day one: give every run a date, and make it idempotent, so each partition runs on its own and reruns safely.",
      pauseAfter: 0.6,
    },
    {
      id: "bf-year",
      text: "Then a year of history is three hundred sixty-five daily runs. In Airflow, catchup with a sensible start date schedules them; in Dagster, partitioned assets do. Throttle them, here four at a time, so the source and the warehouse keep up.",
      pauseAfter: 0.6,
    },
    {
      id: "bf-cost",
      text: "That loop keeps each run small, too. Model a table that takes eight thousand rows a day: by day seven hundred thirty, rebuilding everything reprocesses over six million rows a run, seven hundred fifty-five times one day's partition.",
      pauseAfter: 0.8,
    },

    // ── 7. Data-quality checks ────────────────────────────────────────────
    {
      id: "quality",
      scene: true,
      text: "Question seven. What are data-quality checks, and where do they belong in a DAG? They test the data before it moves on: row counts, null rates, uniqueness, keys that resolve, value ranges, the schema, and freshness. dbt tests, Great Expectations and Soda all run them.",
      pauseAfter: 0.6,
    },
    {
      id: "gate",
      text: "Put them in a gate task between load and publish. In this batch of a thousand orders, four percent have no customer ID, against a limit of one percent. The gate fails, and publish never runs.",
      pauseAfter: 0.8,
    },

    // ── 8. Circuit breakers ───────────────────────────────────────────────
    {
      id: "breaker",
      scene: true,
      text: "Question eight. What is a circuit breaker in a pipeline? It's that gate doing its job: fail fast, alert, and halt, so one bad table stays one bad table instead of spreading to every asset and dashboard downstream.",
      pauseAfter: 0.6,
    },
    {
      id: "cb-model",
      text: "The name comes from services, where the point isn't failing faster: it's to stop sending load to something that can't recover under load. Model a failing dependency. The breaker trips at fifty percent errors and sends nothing for twelve seconds at a time, until a probe gets through. Retries alone push three hundred requests a second at it, and it never recovers.",
      pauseAfter: 0.8,
    },

    // ── 9. SLAs ───────────────────────────────────────────────────────────
    {
      id: "sla",
      scene: true,
      text: "Question nine. What is an SLA in a pipeline, and how do you enforce it? An SLA, a service level agreement, is a promise that a dataset is ready by a set time: daily orders, fresh by six in the morning, UTC.",
      pauseAfter: 0.6,
    },
    {
      id: "sla-enforce",
      text: "Enforce it three ways: a deadline callback that alerts when a task misses its target, freshness checks in the warehouse, and priority, so critical pipelines get compute first. Then track it over time as an objective, not a one-off alert.",
      pauseAfter: 0.8,
    },

    // ── 10. Freshness ─────────────────────────────────────────────────────
    {
      id: "fresh",
      scene: true,
      text: "Question ten. What is data freshness, and how do you monitor it? It's how recently a dataset was successfully updated, against what you expect. Check the newest timestamp against now, and alert when the gap passes a threshold: here, twelve hours.",
      pauseAfter: 0.6,
    },
    {
      id: "fresh-run",
      text: "At six on June third, the newest order is from two minutes to midnight: six hours old. That night the source sent nothing. The load still succeeded, with no new rows, so at six on the fourth, the newest order is thirty hours old. Every task is green. Only the freshness check fails.",
      pauseAfter: 0.6,
    },
    {
      id: "fresh-why",
      text: "It catches missing data, which quality checks can't: they only inspect the rows that are there.",
      pauseAfter: 0.8,
    },

    // ── 11. Sensors ───────────────────────────────────────────────────────
    {
      id: "sensor",
      scene: true,
      text: "Question eleven. What is a sensor, and why prefer reschedule mode? A task performs an action. A sensor is a task that polls a condition, like whether a file has landed, and blocks until it's true or it times out.",
      pauseAfter: 0.5,
    },
    {
      id: "sensor-poke",
      text: "In the default poke mode, a sensor holds a worker slot the whole time it waits. Fill the pool with waiting sensors, and nothing else can run.",
      pauseAfter: 0.6,
    },
    {
      id: "sensor-res",
      text: "Reschedule mode releases the slot between checks. This one looks every five minutes and gives up after two hours. Use it, or a deferrable sensor, for anything that waits more than briefly.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Three more, about many pipelines at once.",
      pauseAfter: 0.5,
    },
    {
      id: "r-deps",
      text: "Between pipelines, don't guess with a cron offset: it breaks the first night the upstream runs late. Use a sensor on its output, a trigger on the dataset it publishes, or one DAG if the two are tightly coupled.",
    },
    {
      id: "r-alerts",
      text: "Monitor more than success: runtime, freshness, volume, quality pass rates, and the SLAs consumers see. Alert once, to the owning team, naming the table, partition and check, and don't page on retries that heal themselves.",
    },
    {
      id: "r-observe",
      text: "And make it observable: structured logs with run and partition IDs, lineage from source to dashboard, and run metadata, like rows, duration and check results, kept as data. Then a failure at two in the morning is one slice to rerun.",
      pauseAfter: 1.2,
    },
    {
      id: "next",
      text: "All of these pipelines feed tables and dashboards. The newest ones feed AI systems. Next: pipelines for AI.",
    },
  ],
};
