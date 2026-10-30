import results from "./results.json" with { type: "json" };

// Every number and every curve the video shows, read from results.json: what
// check.mjs measured. The three charts are the page's own specs
// (charts/idempotency-retry-storm.mjs, charts/incremental-vs-full-refresh.mjs,
// charts/circuit-breaker-states.mjs), rerun with their seeds and checked
// against the captions they export; the retry schedule and the backfill's
// partitions ran in Pyodide 314.0.7, and the quality gate and the freshness
// check in DuckDB-Wasm. Pure (no Remotion, no DOM).

export const VIDEO = "de-orchestration";

/** Whether public/images/de-orchestration/ holds the hero from illustrations.json. */
export const ILLUSTRATIONS = true;

/** The page's default_args as a doubling schedule, in minutes. */
export const RETRY = results.retry as {
  retries: number;
  delay: number;
  max: number;
  waits: number[];
  totalWait: number;
  attempts: number;
  nextUncapped: number;
  nextCapped: number;
};

/** charts/idempotency-retry-storm.mjs: retries per 100 ms bucket, 0 to 4,000 ms. */
export const STORM = results.storm as {
  clients: number;
  capacity: number;
  base: number;
  bucket: number;
  window: number;
  plain: number[];
  jittered: number[];
  peakPlain: number;
  peakJitter: number;
  /** Each backoff round's window in ms, where the plain retries land, and the jittered peak in it. */
  rounds: { from: number; to: number; plainAt: number; jitterPeak: number }[];
};

/** A backfill of 2025, one run per daily partition. */
export const BACKFILL = results.backfill as {
  start: string;
  end: string;
  partitions: number;
  parallel: number;
  waves: number;
  first: string[];
  last: string[];
  byMonth: number[];
};

/** charts/incremental-vs-full-refresh.mjs: rows one run processes. */
export const REFRESH = results.refresh as {
  days: number;
  daily: number;
  seedRows: number;
  every: number;
  refreshDays: number[];
  fullAtEnd: number;
  ratio: number;
};
/** Rows a full rebuild processes on day `d`. */
export const fullRows = (d: number) => REFRESH.seedRows + REFRESH.daily * d;

/** The video's own 1,000-order batch through a quality gate. */
export const GATE = results.gate as {
  sql: string;
  rows: number;
  nullRate: number;
  duplicates: number;
  badAmounts: number;
  limits: { minRows: number; maxNullRate: number };
  checks: { name: string; value: number; pass: boolean }[];
};

/** charts/circuit-breaker-states.mjs, one value a second for 120 seconds. */
export const BREAKER = results.breaker as {
  seconds: number;
  trip: number;
  openFor: number;
  probeShare: number;
  offered: number;
  tripAt: number;
  errorRate: number[];
  allowed: number[];
  retryOffered: number[];
  retryErrorRate: number[];
  bands: { state: "open" | "half-open"; t0: number; t1: number }[];
  retryPeak: number;
  failedProbes: number;
  recovered: boolean;
  retryEndErrorRate: number;
  endErrorRate: number;
};

type Freshness = { now: string; newest: string; minutes: number; age: string; alert: boolean };

/** The page's freshness check on the video's own daily_orders, at 06:00 on June 3 and June 4. */
export const FRESH = results.fresh as {
  sql: string;
  rowsPerDay: number;
  thresholdHours: number;
  fine: Freshness;
  stale: Freshness;
};

/** A count with thousands separators. */
export const count = (v: number) => v.toLocaleString("en-US");

/** Minutes as "6 h 2 min". */
export const hm = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
