# DataEngineer-10-Orchestration: fixes

Folder `video/src/videos/de-orchestration/`. Review report:
`agent-outputs/20261105-de-interview-video-review/DataEngineer-10-Orchestration.md`
(1 P1, 5 P2, 13 P3). Nothing committed by me. The coordinator's checkpoint
`1bd4fe3` caught this work part-way through. Compare against `4bff3bc` for the
whole change.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | `fresh-run` is split into three beats. **`fresh-run`** is "At six on June third … six hours old.", with `pauseAfter: 0.6`. **`fresh-stale`** runs "That night the source sent nothing … Every task is green." Both are cut from take-4. **`fresh-why`** is re-voiced: "The freshness check fails. It catches data that never arrived, which row-level checks miss: they only inspect the rows that are there. A row-count check on the day's load would catch it too." The word "Only" is gone. On screen: "catches data that never arrived" / "row-level checks only read the rows that are there" / "a row count on the day's load catches it too". A second red pill, "row count: 0 ✗", sits under "freshness check ✗". The 0 is new in `check.mjs` (`fresh.missedDayRows`, a DuckDB count of June 3's rows), and the existing "0 new rows" label now reads it too instead of a typed 0. This now agrees with Question 7 and with the page's concept check. |
| 2 | P2 answer | fixed | `gate` is split into three beats: `gate` "Put them in a gate task between load and publish." (cut free), **`gate-wap`** re-voiced: "Load writes to a staging table, and publish swaps it in only if the gate passes. That's write, audit, publish.", and `gate-run` (the batch sentences, cut free). On screen, the box reads "load to staging" (`NODE_W` 210 → 226). Load lights on "staging" and publish lights on "swaps it in". Under the DAG: "load writes where no one reads; publish swaps it in on a pass", then "write, audit, publish" in green. In `CronScene`, the gate moves after load (extract, transform, load, quality gate, publish), the same placement as Question 7. The fail → "alert + halt" branch moves with it. To clear that box, the four extras pills move to x 1450, y(612). |
| 3 | P2 answer | fixed | `anti-list` is split into four beats. **`anti-parse`** is re-voiced: "Expensive work at parse time, like an API call in the DAG file: the scheduler re-parses every file about every thirty seconds, so the call runs all day and slows every parse." `anti-mono` and `anti-xcom` are cut free. `anti-idem` is #13. The row's detail reads "an API call in the DAG file, re-run on every parse: every 30 s, 2,880 times a day". The 30 and 2,880 come from a new `parse` block in `check.mjs`. It holds Airflow's documented `min_file_process_interval` default, labelled there as quoted, not measured, and `perDay` is computed from it. |
| 4 | P2 accuracy | fixed | XCom listing: `def extract(ds=None):` / `path = f"s3://bucket/staging/{ds}.parquet"`. The doc comment says why it differs from the page. Sensor listing: a `bucket_name="data-lake",` line, as `pipelines.mdx` has it. It is highlighted with `bucket_key` on "whether a file has landed". The "300 s: a check every 5 minutes…" note is now placed from `listingHeight(SENSOR.length, 20)`, so it follows the longer listing. **The page is wrong on both**; I did not edit it (see below). |
| 5 | P2 confusion | fixed | The bottom-left note reads "in services, the point isn't failing faster:". The chart title reads "error rate at the dependency · a service's breaker, a model". A new caption above the left figure, "in a pipeline: fail fast, alert, halt", builds on "fail fast", "alert" and "halt". It is set in ink: the action is the right one, and red stays for the bad table. |
| 6 | P2 other | fixed | `RetryScene` returns `null` for a wait segment while `p <= 0`, so the zero-length round-capped lines no longer draw. A still at 150.5 s shows only the kicker. |
| 7 | P3 confusion | fixed | The heading reads "rows one run processes · a model, 8,000 new rows a day, log scale". |
| 8 | P3 accuracy | fixed | `jitter` is split. **`jitter`** (still the scene beat) is re-voiced: "In code that calls a shared service, add jitter too: a random part of each wait." **`jitter-storm`** is the rest, cut free. On screen, under "Add jitter, too.": "in code that calls a shared service: a random part of each wait". The model subtitle reads "a model: 1,000 tasks, a 400 ms base, retries per 100 ms", read from `STORM.clients/base/bucket`. On the retry timeline, a new soft line reads "at least 5, 10, 20 min: Airflow spreads each wait up to twice that". Airflow's `retry_exponential_backoff` adds `hash % min_backoff` to a floor of `delay·2^(n-1)`, so each wait falls between the floor and twice it, capped at `max_retry_delay`. "Jitter" is now defined where it is first said. |
| 9 | P3 answer | fixed | `cb-model` is split after "Model a failing dependency." (`pauseAfter: 0.5`). **`cb-trip`** is re-voiced: "The breaker trips at fifty percent errors and sends nothing for twelve seconds at a time, then half-opens to let a probe through." `cb-retry` is cut free. The band label reads "open 12 s at a time: nothing gets through", starting at the first open spell. A leader under the axis at 38.5 s reads "half-open: probe fails" (red). One at 51.5 s reads "half-open: probe passes, closed" (green). The old "probe gets through" is gone. `chartIn` is cued on `modelAt - 10`, so the empty axes now appear about 0.3 s before "Model a failing dependency" rather than about 10 s before. |
| 10 | P3 answer | fixed | `sla-enforce` is split. **`sla-slo`** is re-voiced: "Then track it over time as an objective, an SLO, not a one-off alert." Wednesday's bar reaches 06:00 exactly on "misses its target" and runs on to 06:45 over the next second. At that moment a ✕ badge (paper disc, red ring) lands on the 06:00 line, and "missed: alert" sits on the bar just before the line. Strip label: "an objective, an SLO: 13 of 14 nights on time, not a one-off alert". The 13 and 14 come from the strip's own constants (`STRIP`, `LATE_DAYS`), so the label cannot disagree with the squares. |
| 11 | P3 answer | fixed (screen only) | The Dagster subtitle reads "**software-defined assets**: what data exists, and how it was made". Under the two pills: "outputs type-checked at run time · assets unit-tested with mock resources". The pushback is a soft note on the Airflow side: "Airflow can also run a DAG when a dataset updates / (Airflow 3 calls them assets), but its unit is still the task". The narration is unchanged, to keep within the P3 voice budget. |
| 12 | P3 answer | fixed (screen only) | "throttled: `max_active_runs=4`, 92 waves, so the source keeps up". The 4 is `BACKFILL.parallel`. A new line under the Airflow line reads "catchup runs missed dates; the backfill command reruns past ones". To make room, the grid's rows are a little shorter (pitch h(21) → h(18), cell h(18) → h(15)), so the cells are now about square. |
| 13 | P3 explanation | fixed | **`anti-idem`** is re-voiced: "Tasks that aren't idempotent, that don't end the same however often they run, corrupt state when they rerun." The row detail reads "not the same end state however often they run, so a rerun corrupts state". |
| 14 | P3 explanation | fixed (screen only) | A new line in the reschedule block, cued to "a deferrable sensor": "deferrable: Airflow's triggerer waits, no worker slot at all". It sits between the green "reschedule, or a deferrable sensor" and "for anything that waits more than briefly", in the order they are said. Not narrated (P3 budget). |
| 15 | P3 confusion | fixed | The retry group and the rerun group are each wrapped in one `div` whose opacity is `1 − 0.6·ease(dim)·(1 − ease(safeAt))`. Each sets back while the next kind is drawn, and both return to full on "All three". Their `dim` props are gone. A still at 243 s shows all three labels at full. |
| 16 | P3 other | fixed | Headers take `SANS` except `newest` (`MONO`), so "now" is no longer serif. The age column shows `hm(minutes)`: "6 h 2 min" and "30 h 2 min", in sans bold. It matches the timeline's labels and can no longer read as a clock time. |
| 17 | P3 other | fixed | The listing comment reads `ds = "2025-06-01"`, and the doc comment records the one-word departure from the page. |
| 18 | P3 spacing | fixed | `resTop = y(736)`. The lowest lane now ends at about 965 px on the frame. The right-column notes are re-pitched to the lanes (+2/+4/h(40)), so the new fifth line still ends near y 1000. |
| 19 | P3 pacing | fixed | All three splits are free cuts. `fresh-run` splits after "six hours old." (`pauseAfter: 0.6`). `cb-model` splits after "Model a failing dependency." (0.5). `sensor-poke` splits into `sensor-poke` / `sensor-pool` (0.5), not trimmed: the trim would have cost about 130 P3 characters, and a pause does the job. |

No finding was judged wrong. The frames and `results.json` agree with each one.

### Where the page is wrong (not edited)

`content/interview/data-engineer/orchestration-and-reliability.mdx`:

- **The XCom "Better" listing** sets `path = "s3://bucket/staging/{{ ds }}.parquet"` inside a `@task` body. Jinja renders only an operator's templated fields, so every date writes one object literally named `{{ ds }}.parquet`. It should take `ds` as a parameter and use an f-string.
- **The sensor listing** has a relative `bucket_key` and no `bucket_name`. `S3KeySensor` needs a bucket name, a full `s3://` URL, or a default bucket on the connection. `pipelines.mdx` has `bucket_name="data-lake"`.
- **The Q1 mermaid** puts the quality gate before load. The page's own Q7 answer says gates go "between load and publish".

## Voice

**860 characters re-voiced** (the `narrate --dry-run` count), seven beats, each
voiced on its own with `--only`:

- **P1 and P2, 474:** `fresh-why` 190, `anti-parse` 174, `gate-wap` 110.
- **P3s, 386 (cap 400):** `cb-trip` 129, `anti-idem` 108, `jitter` 80,
  `sla-slo` 69.

These beats were cut free from the kept takes with `--recut`: `anti-mono`,
`anti-xcom`, `jitter-storm`, `gate`, `gate-run`, `cb-model`, `cb-retry`,
`sla-enforce`, `fresh-run`, `fresh-stale`, `sensor-poke` and `sensor-pool`.
Against `4bff3bc`, every other beat's mp3 and alignment entry is
byte-identical, and the takes are untouched. The orphaned `anti-list` entry
and `anti-list.mp3` were removed. The voiced beats run at 2.4 to 2.8 words a
second.

Left unvoiced for budget, and done on screen instead: #11 (say "software-defined
assets"), #12 (say what catchup does and what sets the throttle) and #14 (say
what deferrable means). Voicing all three would take about 330 more P3
characters.

## Length and checks

- `npm run cues -- de-orchestration`: 46 beats, 1,330 words, **569.4 s (9:29)**,
  up from 8:54.
- Typecheck and eslint for `src/videos/de-orchestration/`: clean.
- `npm run check:cues`: passes. `npm test`: 75 pass, 0 fail.
- `check:motion`: passes, 0 stretches still for 2 s or more.
- `check:sync`: passes, all 46 beats within ±0.12 s (worst +0.03 s, `cb-retry`).
- `check:mix`: effects 30.1 LU under the narration, speech a median 29.5 dB
  above them where both sound (5th percentile 15.0 dB).
- `check:frames`: FRAMES_RESULT
- Stills, each looked at: 67.5 (Q1 DAG), 98 (Dagster), 137.8 and 148.5
  (anti-patterns, listing), 150.5 (no stray dots), 183.8 (retry floors),
  188.5 and 213 (jitter), 243 (kinds, all three full), 297 (backfill), 329.5
  and 340.5 (gate, WAP), 366.5, 377.2 and 382.5 (breaker), 405.5 and 417.6
  (SLA), 465.5 (freshness), 504.6 (sensor).

## results.json

Re-run with `check.mjs` (Pyodide 314.0.7, DuckDB-Wasm). **Every existing value
came back identical**: `storm`, `refresh`, `breaker`, `runtime`, `retry`,
`backfill`, `gate` and `fresh`. Two additions:

- `fresh.missedDayRows` (0)
- `parse` (`everySeconds` 30, `perDay` 2,880)

`data.ts` types both, and exports `PARSE`.

## Noticed, not in the report

- Nothing new needed a shared change.
- The Dagster pushback note and the "deferrable" line are un-narrated margin
  text. If the re-dub has budget, #11 and #14 are the two best places to spend
  it.
