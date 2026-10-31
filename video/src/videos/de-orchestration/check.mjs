// Measures every number and every curve the de-orchestration video shows, and
// writes them to results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/de-orchestration/check.mjs
//
// Airflow and Dagster do not run here, so nothing below is presented as their
// output. Three engines, each the one its numbers come from:
//   - the page's chart specs' own code and seeded generator (charts/_theme.mjs's
//     rng), for the three figures the page draws: the retry storm
//     (charts/idempotency-retry-storm.mjs), full rebuild against incremental
//     (charts/incremental-vs-full-refresh.mjs) and the circuit breaker
//     (charts/circuit-breaker-states.mjs). Each simulation is copied from its
//     spec, and its headline numbers are checked against the caption the spec
//     itself exports, so the video and the page show the same data;
//   - Pyodide 314.0.7 (plain Python, the runtime the Python pages run), for
//     the page's retry settings as a doubling schedule and a backfill's
//     partition list, the date-range loop the page's backfill answer asks for;
//   - DuckDB-Wasm (the SQL pages' engine), for the video's own quality gate on
//     a 1,000-row batch and the freshness check the page describes
//     (`MAX(updated_at)` against now) on the video's own `daily_orders`. Its
//     `now()` is pinned to a fixed instant, so a rerun writes the same file.
/* global console */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const require = createRequire(join(root, "package.json"));
const chart = (slug) => import(pathToFileURL(join(root, "charts", `${slug}.mjs`)).href);
const { rng } = await import(pathToFileURL(join(root, "charts/_theme.mjs")).href);

const R = {};
const check = (ok, what) => {
  if (!ok) throw new Error(`check.mjs disagrees with the page: ${what}`);
};

// ── The retry storm (charts/idempotency-retry-storm.mjs, copied) ─────────────
{
  const CLIENTS = 1000;
  const CAPACITY = 90;
  const BASE = 400;
  const ROUNDS = 3;
  const BUCKET = 100;
  const WINDOW = 4000;
  const next = rng(60613);
  const arrivals = (jitter) => {
    const out = [];
    for (let c = 0; c < CLIENTS; c++) {
      for (let r = 0; r < ROUNDS; r++) {
        const backoff = BASE * 2 ** r;
        out.push(jitter ? next() * backoff + BASE * (2 ** r - 1) : backoff + BASE * (2 ** r - 1));
      }
    }
    return out;
  };
  const bucketed = (times) => {
    const counts = new Array(WINDOW / BUCKET).fill(0);
    for (const t of times) {
      if (t > WINDOW) continue;
      counts[Math.min(counts.length - 1, Math.floor(t / BUCKET))] += 1;
    }
    return counts;
  };
  const plain = bucketed(arrivals(false));
  const jittered = bucketed(arrivals(true));
  // Each round's window: round r lands between BASE * (2^r - 1) and BASE * (2^(r+1) - 1).
  const rounds = Array.from({ length: ROUNDS }, (_, r) => {
    const lo = BASE * (2 ** r - 1);
    const hi = BASE * (2 ** (r + 1) - 1);
    const peak = Math.max(...jittered.slice(lo / BUCKET, hi / BUCKET));
    return { from: lo, to: hi, plainAt: BASE * 2 ** r + lo, jitterPeak: peak };
  });
  const storm = {
    clients: CLIENTS,
    capacity: CAPACITY,
    base: BASE,
    bucket: BUCKET,
    window: WINDOW,
    plain,
    jittered,
    peakPlain: Math.max(...plain),
    peakJitter: Math.max(...jittered),
    rounds,
  };
  const { caption } = await chart("idempotency-retry-storm");
  check(caption.includes(`${storm.peakPlain} arrive in the same 100ms`), "retry storm, plain peak");
  check(caption.includes(`the peak is ${storm.peakJitter}`), "retry storm, jittered peak");
  check(caption.includes(`can take ${CAPACITY}`), "retry storm, capacity");
  R.storm = storm;
}

// ── Full rebuild against incremental (charts/incremental-vs-full-refresh.mjs) ─
{
  const DAYS = 730;
  const DAILY = 8_000;
  const SEED_ROWS = 200_000;
  const FULL_REFRESH_EVERY = 60;
  const full = (d) => SEED_ROWS + DAILY * d;
  const refreshDays = [];
  for (let d = 1; d <= DAYS; d++) if (d % FULL_REFRESH_EVERY === 0) refreshDays.push(d);
  const ratio = Math.round(full(DAYS) / DAILY);
  const { caption } = await chart("incremental-vs-full-refresh");
  check(caption.includes(`${DAILY.toLocaleString()} new rows a day`), "incremental, daily rows");
  check(caption.includes(`By day ${DAYS} that is a factor of about ${ratio}`), "incremental, ratio");
  R.refresh = { days: DAYS, daily: DAILY, seedRows: SEED_ROWS, every: FULL_REFRESH_EVERY, refreshDays, fullAtEnd: full(DAYS), ratio };
}

// ── The circuit breaker (charts/circuit-breaker-states.mjs, copied) ─────────
{
  const N = 120;
  const TRIP_RATE = 0.5;
  const OPEN_S = 12;
  const PROBE_SHARE = 0.1;
  const RETRY_BUDGET = 2;
  const OFFERED = 100;
  const random = rng(7);
  const rows = [];
  {
    let health = 1;
    let state = "closed";
    let openedAt = -Infinity;
    for (let t = 0; t < N; t++) {
      if (t >= 20 && t < 34) health -= 0.085;
      const allowed = state === "closed" ? OFFERED : state === "half-open" ? OFFERED * PROBE_SHARE : 0;
      const retried = allowed * (1 + RETRY_BUDGET * Math.max(0, 1 - health));
      const pressure = retried / OFFERED;
      health += (0.055 - 0.05 * pressure) * (t >= 34 ? 1 : 0.2);
      health = Math.min(1, Math.max(0.02, health));
      const errorRate = Math.min(1, Math.max(0, 1 - health + (random() - 0.5) * 0.05));
      rows.push({ t, errorRate, allowed, state });
      if (state === "closed" && errorRate > TRIP_RATE) {
        state = "open";
        openedAt = t;
      } else if (state === "open" && t - openedAt >= OPEN_S) {
        state = "half-open";
      } else if (state === "half-open") {
        if (errorRate < 0.2) state = "closed";
        else if (errorRate > TRIP_RATE) {
          state = "open";
          openedAt = t;
        }
      }
    }
  }
  const retry = [];
  {
    let health = 1;
    for (let t = 0; t < N; t++) {
      if (t >= 20 && t < 34) health -= 0.085;
      const errorRate = Math.min(1, Math.max(0, 1 - health));
      const offered = OFFERED * (1 + RETRY_BUDGET * errorRate);
      health += (0.055 - 0.05 * (offered / OFFERED)) * (t >= 34 ? 1 : 0.2);
      health = Math.min(1, Math.max(0.02, health));
      retry.push({ t, offered, errorRate });
    }
  }
  const bands = [];
  for (const r of rows) {
    const last = bands[bands.length - 1];
    if (last && last.state === r.state) last.t1 = r.t + 1;
    else bands.push({ state: r.state, t0: r.t, t1: r.t + 1 });
  }
  const recovered = rows.slice(-10).every((r) => r.errorRate < 0.15);
  const retryPeak = Math.round(Math.max(...retry.map((r) => r.offered)));
  const probes = bands.filter((b) => b.state === "half-open").length;
  const failedProbes = Math.max(0, probes - 1);
  const tripAt = rows.find((r) => r.state === "closed" && r.errorRate > TRIP_RATE)?.t ?? null;
  const { caption } = await chart("circuit-breaker-states");
  check(recovered, "breaker, recovery");
  check(caption.includes(`trips at ${Math.round(TRIP_RATE * 100)} percent errors`), "breaker, trip rate");
  check(caption.includes(`open for ${OPEN_S} seconds`), "breaker, open time");
  check(caption.includes(`peaks at ${retryPeak} requests per second`), "breaker, retry peak");
  check(caption.includes(failedProbes === 1 ? "the first one comes back still failing" : ""), "breaker, failed probes");
  const r3 = (v) => Math.round(v * 1000) / 1000;
  R.breaker = {
    seconds: N,
    trip: TRIP_RATE,
    openFor: OPEN_S,
    probeShare: PROBE_SHARE,
    offered: OFFERED,
    tripAt,
    errorRate: rows.map((r) => r3(r.errorRate)),
    allowed: rows.map((r) => r.allowed),
    retryOffered: retry.map((r) => r3(r.offered)),
    retryErrorRate: retry.map((r) => r3(r.errorRate)),
    bands: bands.filter((b) => b.state !== "closed"),
    retryPeak,
    failedProbes,
    recovered,
    retryEndErrorRate: r3(retry[retry.length - 1].errorRate),
    endErrorRate: r3(rows[rows.length - 1].errorRate),
  };
}

// ── Pyodide: the page's retry settings, and a backfill's partitions ─────────
{
  const { loadPyodide } = require("pyodide");
  const py = await loadPyodide();
  const out = py.runPython(`
import json, math, sys
from datetime import date, timedelta

# The page's default_args: three retries, a five-minute delay that backs off
# exponentially (doubling), never more than thirty minutes.
retries = 3
retry_delay = timedelta(minutes=5)
max_retry_delay = timedelta(minutes=30)
def wait(n):                       # before retry n, counting from 1
    return min(retry_delay * 2 ** (n - 1), max_retry_delay)
waits = [int(wait(n).total_seconds() // 60) for n in range(1, retries + 1)]
uncapped = int((retry_delay * 2 ** retries).total_seconds() // 60)
capped = int(wait(retries + 1).total_seconds() // 60)

# A backfill of 2025, one run per daily partition, four at a time.
start, end = date(2025, 1, 1), date(2025, 12, 31)
days = [(start + timedelta(d)).isoformat() for d in range((end - start).days + 1)]
parallel = 4
waves = [days[i:i + parallel] for i in range(0, len(days), parallel)]
by_month = [sum(1 for d in days if int(d[5:7]) == m) for m in range(1, 13)]

json.dumps({
    "runtime": {"python": sys.version.split()[0]},
    "retry": {"retries": retries, "delay": 5, "max": 30, "waits": waits, "totalWait": sum(waits),
              "attempts": retries + 1, "nextUncapped": uncapped, "nextCapped": capped},
    "backfill": {"start": days[0], "end": days[-1], "partitions": len(days), "parallel": parallel,
                 "waves": len(waves), "first": days[:4], "last": days[-3:], "byMonth": by_month},
})
`);
  const res = JSON.parse(out);
  Object.assign(R, res);
  R.runtime.pyodide = py.version;
}

// ── DuckDB: a quality gate, and a freshness check ──────────────────────────
{
  const duckdb = require("@duckdb/duckdb-wasm");
  const { default: Worker } = await import(pathToFileURL(require.resolve("web-worker")).href);
  const dist = join(dirname(require.resolve("@duckdb/duckdb-wasm")), "..", "dist");
  const bundle = await duckdb.selectBundle({
    mvp: { mainModule: join(dist, "duckdb-mvp.wasm"), mainWorker: join(dist, "duckdb-node-mvp.worker.cjs") },
    eh: { mainModule: join(dist, "duckdb-eh.wasm"), mainWorker: join(dist, "duckdb-node-eh.worker.cjs") },
  });
  const worker = new Worker(pathToFileURL(bundle.mainWorker).href, { type: "module" });
  const db = new duckdb.AsyncDuckDB({ log: () => {} }, worker);
  await db.instantiate(bundle.mainModule);
  const conn = await db.connect();
  const one = async (sql) => (await conn.query(sql)).toArray().map((r) => r.toJSON());
  const version = (await one("SELECT version() AS v"))[0].v;

  // The video's own batch: 1,000 orders, every 25th with no customer.
  await conn.query(`CREATE TABLE orders_batch AS
    SELECT i AS order_id,
           CASE WHEN i % 25 = 0 THEN NULL ELSE 1000 + i % 300 END AS customer_id,
           round(5 + (i * 37) % 200 + 0.99, 2) AS amount
    FROM range(1, 1001) t(i)`);
  const GATE = `SELECT count(*) AS row_count,
       avg((customer_id IS NULL)::INT) AS null_rate,
       count(*) - count(DISTINCT order_id) AS duplicate_ids,
       count(*) FILTER (WHERE amount <= 0) AS bad_amounts
FROM orders_batch`;
  const g = (await one(GATE))[0];
  const limits = { minRows: 500, maxNullRate: 0.01 };
  R.gate = {
    sql: GATE,
    rows: Number(g.row_count),
    nullRate: Number(g.null_rate),
    duplicates: Number(g.duplicate_ids),
    badAmounts: Number(g.bad_amounts),
    limits,
    checks: [
      { name: "row count", value: Number(g.row_count), pass: Number(g.row_count) >= limits.minRows },
      { name: "null customer IDs", value: Number(g.null_rate), pass: Number(g.null_rate) <= limits.maxNullRate },
      { name: "duplicate order IDs", value: Number(g.duplicate_ids), pass: Number(g.duplicate_ids) === 0 },
      { name: "amounts above zero", value: Number(g.bad_amounts), pass: Number(g.bad_amounts) === 0 },
    ],
  };

  // The video's own daily_orders: an order every three minutes from 00:01 to
  // 23:58, for June 1 and June 2. June 3's source sent nothing.
  await conn.query(`CREATE TABLE daily_orders AS
    SELECT d.day + INTERVAL 1 MINUTE + i * INTERVAL 3 MINUTE AS updated_at
    FROM (VALUES (TIMESTAMP '2025-06-01'), (TIMESTAMP '2025-06-02')) d(day), range(0, 480) t(i)`);
  // The check as the page describes it, now() against MAX(updated_at). now()
  // is pinned to 06:00 on each morning, the SLA's hour.
  const FRESH = `SELECT max(updated_at) AS newest,
       now() - max(updated_at) AS age
FROM daily_orders`;
  // The query on screen is the one that runs, with only now() replaced; the
  // outer select reads its two columns back as text.
  const at = async (now) => {
    const pinned = FRESH.replace("now()", `TIMESTAMP '${now}'`);
    const row = (await one(`SELECT strftime(newest, '%Y-%m-%d %H:%M') AS newest,
       date_diff('minute', newest, newest + age) AS minutes,
       age::VARCHAR AS age
FROM (${pinned})`))[0];
    return { now: now.slice(0, 16), newest: row.newest, minutes: Number(row.minutes), age: row.age };
  };
  const rowsPerDay = (await one("SELECT count(*) AS n FROM daily_orders WHERE updated_at < TIMESTAMP '2025-06-02'"))[0].n;
  const thresholdHours = 12;
  const fine = await at("2025-06-03 06:00:00");
  const stale = await at("2025-06-04 06:00:00");
  R.fresh = {
    sql: FRESH,
    rowsPerDay: Number(rowsPerDay),
    thresholdHours,
    fine: { ...fine, alert: fine.minutes > thresholdHours * 60 },
    stale: { ...stale, alert: stale.minutes > thresholdHours * 60 },
  };
  R.runtime.duckdb = version;
  await conn.close();
  await db.terminate();
  await worker.terminate();
}

writeFileSync(join(here, "results.json"), JSON.stringify(R, null, 2) + "\n");
console.log(JSON.stringify({ ...R, storm: { ...R.storm, plain: "…", jittered: "…" }, breaker: { ...R.breaker, errorRate: "…", allowed: "…", retryOffered: "…", retryErrorRate: "…" } }, null, 1));
