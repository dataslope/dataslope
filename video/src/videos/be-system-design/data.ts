import results from "./results.json" with { type: "json" };

// Every number the be-system-design video shows, read from results.json:
// what check.mjs computed from the video's own stated assumptions (the
// estimate, the key length), from the page's charts read or copied from their
// source (the latency ladder, the latency percentiles, the circuit breaker),
// and from the speed of light over two named cities. Nothing here is any real
// system's output, and the video says which numbers are assumptions and which
// are simulations. Pure (no Remotion, no DOM).

export const VIDEO = "be-system-design";

/**
 * Whether public/images/be-system-design/ holds the watercolors from
 * illustrations.json. Not yet: phase 2 generates them. Every frame is laid
 * out with room for them either way.
 */
export const ILLUSTRATIONS = false;

/** The estimate (question two): assumptions, then what follows from them. */
export const ESTIMATE = results.estimate as {
  assumptions: {
    newLinksPerDay: number;
    readsPerWrite: number;
    peakFactor: number;
    bytesPerLink: number;
    years: number;
    bytesPerRedirect: number;
  };
  millionPerDayQps: number;
  writeQps: number;
  readsPerDay: number;
  readQps: number;
  peakReadQps: number;
  peakWriteQps: number;
  storagePerDayBytes: number;
  linksTotal: number;
  storageTotalBytes: number;
  peakBandwidthBytesPerSecond: number;
  dayInMemoryBytes: number;
};

/** The key (question three): the base-62 alphabet, how long each key length
 *  lasts at the estimate's rate, and three consecutive IDs encoded. */
export const KEY = results.key as {
  alphabet: string;
  keyLengths: { len: number; keys: number; years: number }[];
  counted: { id: number; key: string }[];
  idBlock: number;
};

/** charts/memory-latency-ladder.mjs's levels, in nanoseconds, and one
 *  redirect's network time on them (question three). */
export const LADDER = results.ladder as {
  levels: { name: string; ns: number }[];
  ssdOverMemory: number;
  rttOverSsd: number;
  rttOverMemory: number;
  path: { hitMs: number; missMs: number };
};

/** charts/latency-percentiles.mjs's seeded sample: its marks in ms, its
 *  histogram (counts over `domain`, equal bins), the share at or past the
 *  p99, and the hundred-call page. */
export const PERCENTILES = results.percentiles as {
  n: number;
  seed: number;
  marks: { median: number; mean: number; p95: number; p99: number };
  domain: [number, number];
  counts: number[];
  calls: number;
  hitsTail: number;
  tailShare: number;
};

export type BreakerBand = { state: "open" | "half-open"; t0: number; t1: number };

/** charts/circuit-breaker-states.mjs's simulation, second by second: the
 *  error rate and the load let through with the breaker, the same outage
 *  under retries, and the open and half-open bands. */
export const BREAKER = results.breaker as {
  seconds: number;
  trip: number;
  openFor: number;
  probeShare: number;
  offered: number;
  retryBudget: number;
  errorRate: number[];
  allowed: number[];
  retryOffered: number[];
  retryErrorRate: number[];
  bands: BreakerBand[];
  retryPeak: number;
  recovered: boolean;
  endErrorRate: number;
  retryEndErrorRate: number;
};

/** Light in fiber between Sydney and Ashburn, Virginia, and across a city:
 *  floors, not measurements (question five). */
export const DISTANCE = results.distance as {
  kmPerMs: number;
  places: Record<"sydney" | "virginia", { name: string; lat: number; lon: number }>;
  km: number;
  roundTripMs: number;
  edgeKm: number;
  edgeRoundTripMs: number;
};
