import results from "./results.json" with { type: "json" };

// Every number the be-scaling video shows, read from results.json: Part 1's
// peak (be-system-design) times ten; the page's queue and TTL charts,
// recomputed from their source; small simulations (keys on servers and
// shards, an LRU cache under Zipf clicks, four rate limiters on one trace),
// deterministic or seeded; and arithmetic on the news feed's stated counts.
// Nothing here is any real system's output, and the video calls each
// simulation one. Pure (no Remotion, no DOM).

export const VIDEO = "be-scaling";

/** Whether public/images/be-scaling/ holds the watercolors from
 *  illustrations.json: the bison and the few spots the scenes place. */
export const ILLUSTRATIONS = true;

/** Part 1's peak redirects a second, and the tenfold traffic this video
 *  scales to. */
export const TRAFFIC = results.traffic as { part1Peak: number; factor: number; peak: number };

/** The simplest (M/M/1) queue's mean wait, in service times, against load:
 *  the page's queue-utilization-latency chart. */
export const HEADROOM = results.headroom as {
  marks: { rho: number; wait: number }[];
  curve: { rho: number; wait: number }[];
};

/** 10,000 keys on three servers, then four: by hash modulo the count, and on
 *  a hash ring. `sample` is the first twelve keys and where each lands;
 *  `grid` every key's server under each scheme, one digit a key in key order;
 *  `ringPoints` the ring's 400 points, each as its place around the ring
 *  (0 to 1) and its server (3 is the fourth, the one added). */
export const HASHING = results.hashing as {
  grid: { mod3: string; mod4: string; ring3: string; ring4: string };
  ringPoints: [number, number][];
  keys: number;
  pointsPerServer: number;
  sample: { key: string; mod3: number; mod4: number; ring3: number; ring4: number }[];
  movedMod: number;
  movedRing: number;
  movedRingToNew: number;
  shareMod: number;
  shareRing: number;
  loads: { mod3: number[]; mod4: number[]; ring3: number[]; ring4: number[] };
};

/** The cache-aside simulation: one row per cache size (a share of the
 *  links), its hit rate, and how much a dead cache multiplies database reads. */
export const CACHE = results.cache as {
  links: number;
  redirects: number;
  seed: number;
  zipf: number;
  policy: string;
  sizes: { share: number; capacity: number; hitRate: number; lossMultiplier: number; topShare: number }[];
};

/** The page's cache-ttl-staleness chart: misses and stale reads against the
 *  TTL (seconds), and where they cross. */
export const TTL = results.ttl as {
  readsPerSecond: number;
  writesPerSecond: number;
  rows: { ttl: number; miss: number; stale: number }[];
  cross: { ttl: number; miss: number; stale: number };
};

/** A million keys on eight shards by hash, and one user's 50 links. */
export const SHARDS = results.shards as {
  shards: number;
  keys: number;
  counts: number[];
  worstDeviation: number;
  userLinks: number;
  userShards: number;
  allCovered: number;
  /** How many of the user's 50 links each shard holds. */
  userPerShard: number[];
};

/** The same million keys when a ninth shard is added: the share that moves
 *  by hash modulo the count, and on a hash ring with 100 points a shard. */
export const RESHARD = results.reshard as {
  from: number;
  to: number;
  keys: number;
  pointsPerShard: number;
  shareMod: number;
  shareRing: number;
};

export type RateCell = { t: number; ok: boolean };
type Limiter = { accepted: number; second: number; cells: RateCell[] };

/** One client's twenty requests under four limiters, and a burst of forty
 *  over four servers with their own buckets against one shared bucket. */
export const RATE = results.rate as {
  limit: number;
  window: number;
  refillSeconds: number;
  trace: number[];
  fixed: Limiter;
  sliding: Limiter;
  token: Limiter;
  leaky: Limiter;
  servers: number;
  burst: number;
  localOk: number;
  sharedOk: number;
};

/** The news feed's arithmetic. */
export const FEED = results.feed as {
  ordinaryFollowers: number;
  celebrityFollowers: number;
  pushWritesOrdinary: number;
  pushWritesCelebrity: number;
  following: number;
  pullReads: number;
  celebritiesFollowed: number;
  hybridReads: number;
};
