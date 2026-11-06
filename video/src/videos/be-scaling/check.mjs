// Computes every number the be-scaling video says or shows, and writes
// results.json, which data.ts reads. No load balancer, cache, replica, shard,
// queue or rate limiter runs here, so nothing below is any system's output.
// The numbers are of four kinds, each named on screen and aloud as what it is:
//
//   - Part 1's estimate (be-system-design/results.json, its peak of 34,722
//     redirects a second), times ten: the traffic this video scales to.
//   - The page's own charts, recomputed from their source and checked against
//     the caption each spec exports: charts/queue-utilization-latency.mjs
//     (the mean wait of the simplest queue, rho / (1 - rho) service times)
//     and charts/cache-ttl-staleness.mjs (misses and stale reads against the
//     TTL, for the chart's own key).
//   - Small simulations, deterministic or seeded with charts/_theme.mjs's rng
//     (the generator the site's charts use), each called a simulation aloud:
//       * hashing: 10,000 six-character base-62 keys (Part 1's IDs from
//         9,876,543,210 on), each hashed with MD5 (its first four bytes), on
//         three servers and then four, by hash modulo the count and on a
//         hash ring with 100 points a server; and 1,000,000 keys on eight
//         shards; and one user's 50 links among them;
//       * cache-aside: 2,000,000 redirects over 1,000,000 links whose
//         popularity falls off as 1 / rank (Zipf, exponent 1), seed 12,
//         through an LRU cache holding a thousandth, a hundredth and a tenth
//         of the links;
//       * rate limiting: one client's twenty requests (ten at 59 s, ten at
//         61 s) against a limit of ten a minute, under a fixed-window
//         counter, a sliding-window counter, a token bucket and a leaky
//         bucket; and forty at once spread round-robin over four servers,
//         each with its own token bucket.
//   - Arithmetic on stated assumptions: the news feed's follower counts (200,
//     an assumption; 50,000,000, the page's concept check), 300 accounts
//     followed and 5 of them celebrities (assumptions).
//
// Then it reads script.ts and exits non-zero if a number the narration says
// no longer matches what is computed here.
//
// From the repo root (charts/_theme.mjs needs the root's node_modules; run
// be-system-design/check.mjs first, since this reads its results):
//
//   node video/src/videos/be-scaling/check.mjs
/* global console, process */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const chart = (slug) => import(pathToFileURL(join(root, "charts", `${slug}.mjs`)).href);
const { rng, linspace } = await import(pathToFileURL(join(root, "charts/_theme.mjs")).href);

const check = (ok, what) => {
  if (!ok) throw new Error(`check.mjs: ${what}`);
};

const R = {};

// ── The traffic: Part 1's peak, times ten ───────────────────────────────────
{
  const part1 = JSON.parse(readFileSync(join(here, "../be-system-design/results.json"), "utf8"));
  const peak = part1.estimate.peakReadQps;
  R.traffic = { part1Peak: peak, factor: 10, peak: peak * 10, assumptions: part1.estimate.assumptions };
}

// ── 1. Headroom (charts/queue-utilization-latency.mjs) ──────────────────────
{
  const wait = (rho) => rho / (1 - rho);
  const marks = [0.5, 0.8, 0.9, 0.95, 0.99].map((rho) => ({ rho, wait: wait(rho) }));
  const curve = linspace(0, 0.985, 120).map((rho) => ({ rho, wait: wait(rho) }));
  const { caption } = await chart("queue-utilization-latency");
  check(caption.includes("At 50% utilisation you wait 1 service time"), "queue, 50%");
  check(caption.includes("at 90% you wait 9"), "queue, 90%");
  check(caption.includes("at 99% you wait 99"), "queue, 99%");
  R.headroom = { marks, curve };
}

// ── Keys, as Part 1 makes them ──────────────────────────────────────────────
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const base62 = (n) => {
  let s = "";
  do {
    s = ALPHABET[n % 62] + s;
    n = Math.floor(n / 62);
  } while (n > 0);
  return s;
};
const FIRST_ID = 9_876_543_210;
const keyOf = (i) => base62(FIRST_ID + i);
/** A stable 32-bit hash: MD5's first four bytes. */
const h32 = (s) => createHash("md5").update(s).digest().readUInt32BE(0);

// ── 2. Moving keys: modulo against a hash ring ──────────────────────────────
{
  const KEYS = 10_000;
  const POINTS = 100;
  const keys = Array.from({ length: KEYS }, (_, i) => keyOf(i));
  check(keys.every((k) => k.length === 6), "six-character keys");
  const hashes = keys.map(h32);
  const ring = (servers) => {
    const pts = [];
    for (let s = 0; s < servers; s++) for (let j = 0; j < POINTS; j++) pts.push([h32(`server-${s}#${j}`), s]);
    return pts.sort((a, b) => a[0] - b[0]);
  };
  const onRing = (pts, h) => {
    let lo = 0;
    let hi = pts.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (pts[m][0] < h) lo = m + 1;
      else hi = m;
    }
    return pts[lo % pts.length][1];
  };
  const r3 = ring(3);
  const r4 = ring(4);
  const mod3 = hashes.map((h) => h % 3);
  const mod4 = hashes.map((h) => h % 4);
  const ring3 = hashes.map((h) => onRing(r3, h));
  const ring4 = hashes.map((h) => onRing(r4, h));
  const movedMod = hashes.filter((_, i) => mod3[i] !== mod4[i]).length;
  const movedRing = hashes.filter((_, i) => ring3[i] !== ring4[i]).length;
  const movedRingToNew = hashes.filter((_, i) => ring3[i] !== ring4[i] && ring4[i] === 3).length;
  const loads = (assign, n) => Array.from({ length: n }, (_, s) => assign.filter((a) => a === s).length);
  check(movedRing === movedRingToNew, "on the ring, every key that moves goes to the new server");
  R.hashing = {
    keys: KEYS,
    pointsPerServer: POINTS,
    sample: keys.slice(0, 12).map((k, i) => ({ key: k, mod3: mod3[i], mod4: mod4[i], ring3: ring3[i], ring4: ring4[i] })),
    movedMod,
    movedRing,
    movedRingToNew,
    shareMod: movedMod / KEYS,
    shareRing: movedRing / KEYS,
    loads: { mod3: loads(mod3, 3), mod4: loads(mod4, 4), ring3: loads(ring3, 3), ring4: loads(ring4, 4) },
  };
}

// ── 3. Cache-aside: how much an LRU cache answers ───────────────────────────
{
  const LINKS = 1_000_000;
  const REDIRECTS = 2_000_000;
  const SEED = 12;
  const cum = new Float64Array(LINKS);
  let total = 0;
  for (let i = 0; i < LINKS; i++) {
    total += 1 / (i + 1);
    cum[i] = total;
  }
  const sizes = [0.001, 0.01, 0.1].map((share) => {
    const u = rng(SEED); // the same redirects for every cache size
    const capacity = Math.round(LINKS * share);
    // LRU as a doubly linked list over the link ids, most recent at the head:
    // a hit moves its link to the head, a miss inserts there and, when full,
    // evicts the tail. (A Map used the same way slows to a crawl here: V8
    // walks every deleted slot to find the oldest key.)
    const prev = new Int32Array(LINKS).fill(-1);
    const next = new Int32Array(LINKS).fill(-1);
    const cached = new Uint8Array(LINKS);
    let head = -1;
    let tail = -1;
    let size = 0;
    const unlink = (k) => {
      if (prev[k] >= 0) next[prev[k]] = next[k];
      else head = next[k];
      if (next[k] >= 0) prev[next[k]] = prev[k];
      else tail = prev[k];
      prev[k] = next[k] = -1;
    };
    const pushHead = (k) => {
      prev[k] = -1;
      next[k] = head;
      if (head >= 0) prev[head] = k;
      head = k;
      if (tail < 0) tail = k;
    };
    let hits = 0;
    for (let i = 0; i < REDIRECTS; i++) {
      const x = u() * total;
      let lo = 0;
      let hi = LINKS - 1;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (cum[m] < x) lo = m + 1;
        else hi = m;
      }
      if (cached[lo]) {
        hits += 1;
        unlink(lo);
        pushHead(lo);
      } else {
        cached[lo] = 1;
        pushHead(lo);
        size += 1;
        if (size > capacity) {
          const old = tail;
          unlink(old);
          cached[old] = 0;
          size -= 1;
        }
      }
    }
    const hitRate = hits / REDIRECTS;
    // With the cache gone, every read reaches the database: 1 / (1 - hit rate)
    // times the reads it saw with the cache.
    return { share, capacity, hitRate, lossMultiplier: 1 / (1 - hitRate) };
  });
  // The ceiling a perfect cache of each size would reach: the top links' share.
  for (const s of sizes) s.topShare = cum[s.capacity - 1] / total;
  R.cache = { links: LINKS, redirects: REDIRECTS, seed: SEED, zipf: 1, policy: "LRU", sizes };
}

// ── 4. Invalidation (charts/cache-ttl-staleness.mjs, recomputed) ────────────
{
  const READS = 1;
  const WRITES = 1 / 120;
  const misses = (ttl) => 1 / (1 + READS * ttl);
  const stale = (ttl) => 1 - (1 - Math.exp(-WRITES * ttl)) / (WRITES * ttl);
  const ttls = linspace(Math.log(1), Math.log(600), 160).map(Math.exp);
  const rows = ttls.map((ttl) => ({ ttl, miss: misses(ttl), stale: stale(ttl) }));
  const cross = rows.reduce((best, r) => (Math.abs(r.miss - r.stale) < Math.abs(best.miss - best.stale) ? r : best));
  const { caption } = await chart("cache-ttl-staleness");
  check(caption.includes(`roughly ${cross.ttl.toFixed(0)} seconds`), "ttl, crossing");
  check(caption.includes(`about ${(cross.miss * 100).toFixed(0)}% of reads still go to the database`), "ttl, misses");
  check(caption.includes(`about ${(cross.stale * 100).toFixed(0)}% come back out of date`), "ttl, stale");
  check(caption.includes("read about once a second and updated about every two minutes"), "ttl, the chart's key");
  const r4 = (v) => Math.round(v * 10_000) / 10_000;
  R.ttl = {
    readsPerSecond: READS,
    writesPerSecond: WRITES,
    rows: rows.filter((_, i) => i % 4 === 0 || i === rows.length - 1).map((r) => ({ ttl: r4(r.ttl), miss: r4(r.miss), stale: r4(r.stale) })),
    cross: { ttl: r4(cross.ttl), miss: r4(cross.miss), stale: r4(cross.stale) },
  };
}

// ── 6. Shards: a hash spreads keys; one user's links land everywhere ────────
{
  const SHARDS = 8;
  const KEYS = 1_000_000;
  const counts = new Array(SHARDS).fill(0);
  for (let i = 0; i < KEYS; i++) counts[h32(keyOf(i)) % SHARDS] += 1;
  const even = KEYS / SHARDS;
  const worst = Math.max(...counts.map((c) => Math.abs(c / even - 1)));
  // One user's 50 links: IDs drawn from the same range (seeded), the shards
  // their keys hash to, and the chance 50 random keys miss at least one shard.
  const u = rng(50);
  const USER_LINKS = 50;
  const userShards = new Set(Array.from({ length: USER_LINKS }, () => h32(keyOf(Math.floor(u() * KEYS))) % SHARDS));
  // Inclusion-exclusion: P(all eight shards hold at least one of the 50).
  let allCovered = 0;
  const choose = (n, k) => {
    let c = 1;
    for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
    return c;
  };
  for (let j = 0; j <= SHARDS; j++) allCovered += (-1) ** j * choose(SHARDS, j) * ((SHARDS - j) / SHARDS) ** USER_LINKS;
  R.shards = { shards: SHARDS, keys: KEYS, counts, worstDeviation: worst, userLinks: USER_LINKS, userShards: userShards.size, allCovered };
}

// ── 9. Rate limiting: one client, four algorithms ───────────────────────────
{
  const LIMIT = 10;
  const WINDOW = 60;
  const REFILL = WINDOW / LIMIT; // one token every six seconds
  const trace = [...new Array(10).fill(59), ...new Array(10).fill(61)];
  const run = (decide) => trace.map((t) => ({ t, ok: decide(t) }));
  const fixed = (() => {
    const n = {};
    return run((t) => {
      const w = Math.floor(t / WINDOW);
      if ((n[w] ?? 0) >= LIMIT) return false;
      n[w] = (n[w] ?? 0) + 1;
      return true;
    });
  })();
  const sliding = (() => {
    const n = {};
    return run((t) => {
      const w = Math.floor(t / WINDOW);
      const into = (t - w * WINDOW) / WINDOW;
      // The previous window's count, weighted by how much of it the last 60
      // seconds still cover, plus this window's, plus this request.
      const estimate = (n[w - 1] ?? 0) * (1 - into) + (n[w] ?? 0) + 1;
      if (estimate > LIMIT) return false;
      n[w] = (n[w] ?? 0) + 1;
      return true;
    });
  })();
  const token = (() => {
    let tokens = LIMIT; // full: the client has been quiet
    let last = 0;
    return run((t) => {
      tokens = Math.min(LIMIT, tokens + (t - last) / REFILL);
      last = t;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    });
  })();
  const leaky = (() => {
    let queued = 0;
    let last = 0;
    return run((t) => {
      queued = Math.max(0, queued - (Math.floor(t / REFILL) - Math.floor(last / REFILL)));
      last = t;
      if (queued >= LIMIT) return false;
      queued += 1;
      return true;
    });
  })();
  const accepted = (r) => r.filter((x) => x.ok).length;
  const second = (r) => r.filter((x) => x.ok && x.t === 61).length;
  // Forty at once, round-robin over four servers, each with its own full
  // bucket of ten: every server sees ten, so all forty pass. One shared
  // bucket passes ten.
  const SERVERS = 4;
  const BURST = 40;
  const perServer = new Array(SERVERS).fill(LIMIT);
  let localOk = 0;
  for (let i = 0; i < BURST; i++) {
    const s = i % SERVERS;
    if (perServer[s] >= 1) {
      perServer[s] -= 1;
      localOk += 1;
    }
  }
  const sharedOk = Math.min(BURST, LIMIT);
  R.rate = {
    limit: LIMIT,
    window: WINDOW,
    refillSeconds: REFILL,
    trace,
    fixed: { accepted: accepted(fixed), second: second(fixed), cells: fixed },
    sliding: { accepted: accepted(sliding), second: second(sliding), cells: sliding },
    token: { accepted: accepted(token), second: second(token), cells: token },
    leaky: { accepted: accepted(leaky), second: second(leaky), cells: leaky },
    servers: SERVERS,
    burst: BURST,
    localOk,
    sharedOk,
  };
}

// ── 12. The news feed: arithmetic on stated counts ──────────────────────────
{
  const ordinary = 200; // an assumption
  const celebrity = 50_000_000; // the page's concept check
  const following = 300; // an assumption
  const celebritiesFollowed = 5; // an assumption
  R.feed = {
    ordinaryFollowers: ordinary,
    celebrityFollowers: celebrity,
    pushWritesOrdinary: ordinary,
    pushWritesCelebrity: celebrity,
    following,
    pullReads: following,
    celebritiesFollowed,
    hybridReads: 1 + celebritiesFollowed,
  };
}

// ── What the narration says, checked against the numbers ────────────────────
const { script } = await import(pathToFileURL(join(here, "script.ts")).href);
const beat = (id) => {
  const b = script.beats.find((x) => x.id === id);
  check(b, `script.ts has no beat "${id}"`);
  return b.text;
};
const sig2 = (v) => {
  const p = 10 ** (Math.floor(Math.log10(Math.abs(v))) - 1);
  return Math.round(v / p) * p;
};
const pct = (v) => Math.round(v * 100);
const [thousandth, hundredth, tenth] = R.cache.sizes;
const wait = (rho) => Math.round(R.headroom.marks.find((m) => m.rho === rho).wait);
const said = [
  ["hook", "about thirty-five thousand redirects a second", 35_000, sig2(R.traffic.part1Peak)],
  ["hook-10x", "three hundred and fifty thousand a second", 350_000, sig2(R.traffic.peak)],
  ["q1-headroom", "one service time on average at fifty percent load", 1, wait(0.5)],
  ["q1-headroom", "nine at ninety percent", 9, wait(0.9)],
  ["q1-headroom", "ninety-nine at ninety-nine", 99, wait(0.99)],
  ["q2-mod", "ten thousand short keys", 10_000, R.hashing.keys],
  ["q2-mod", "seventy-four percent of the keys move", 74, pct(R.hashing.shareMod)],
  ["q2-ring", "a hundred points a server", 100, R.hashing.pointsPerServer],
  ["q2-ring", "only twenty-three percent move", 23, pct(R.hashing.shareRing)],
  ["q3-sim", "two million redirects over a million links", 2e6, R.cache.redirects],
  ["q3-sim", "answers forty percent", 40, pct(thousandth.hitRate)],
  ["q3-sim", "A hundredth, fifty-eight", 58, pct(hundredth.hitRate)],
  ["q3-sim", "A tenth, seventy-seven", 77, pct(tenth.hitRate)],
  ["q3-loss", "by two point four", 2.4, Math.round(hundredth.lossMultiplier * 10) / 10],
  ["q3-loss", "at fifty-eight percent", 58, pct(hundredth.hitRate)],
  ["q3-loss", "more than four at seventy-seven", 4, Math.floor(tenth.lossMultiplier)],
  ["q3-loss", "more than four at seventy-seven", 77, pct(tenth.hitRate)],
  ["q4-model", "about fifteen seconds", 15, Math.round(R.ttl.cross.ttl)],
  ["q4-model", "six percent of reads miss", 6, pct(R.ttl.cross.miss)],
  ["q4-model", "six percent are stale", 6, pct(R.ttl.cross.stale)],
  ["q6-key", "a million keys land on eight shards", 1e6, R.shards.keys],
  ["q6-key", "within one percent of an eighth", 1, Math.ceil(R.shards.worstDeviation * 100)],
  ["q6-cost", "asks all eight", 8, R.shards.userShards],
  ["q9", "ten new links a minute", 10, R.rate.limit],
  ["q9-fixed", "all twenty get through", 20, R.rate.fixed.accepted],
  ["q9-fixed", "twice the limit", 2, R.rate.fixed.accepted / R.rate.limit],
  ["q9-sliding", "refuses the second ten", 0, R.rate.sliding.second],
  ["q9-token", "one every six seconds", 6, R.rate.refillSeconds],
  ["q9-token", "the second is refused", 0, R.rate.token.second],
  ["q9-leaky", "one every six seconds", 6, R.rate.refillSeconds],
  ["q9-shared", "Four app servers", 4, R.rate.servers],
  ["q9-shared", "four times the limit", 4, R.rate.localOk / R.rate.sharedOk],
  ["q12-storm", "two hundred followers, two hundred writes", 200, R.feed.pushWritesOrdinary],
  ["q12-storm", "fifty million followers makes fifty million writes", 50e6, R.feed.pushWritesCelebrity],
  ["q12-pull", "reads three hundred timelines", 300, R.feed.pullReads],
  ["q12-hybrid", "Follow five celebrities", 5, R.feed.celebritiesFollowed],
  ["q12-hybrid", "a load is six reads, not three hundred", 6, R.feed.hybridReads],
];
const bad = [];
for (const [id, words, means, value] of said) {
  if (!beat(id).includes(words)) bad.push(`${id}: no longer says "${words}"`);
  if (Math.abs(means - value) > 1e-9 * Math.max(1, Math.abs(means))) bad.push(`${id}: "${words}" is ${means}, computed ${value}`);
}
if (bad.length) {
  console.error(bad.join("\n"));
  process.exit(1);
}
R.said = said.map(([beatId, words, means]) => ({ beat: beatId, words, means }));

writeFileSync(join(here, "results.json"), `${JSON.stringify(R, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      traffic: R.traffic.peak,
      headroom: R.headroom.marks,
      hashing: { ...R.hashing, sample: undefined },
      cache: R.cache.sizes,
      ttl: R.ttl.cross,
      shards: R.shards,
      rate: Object.fromEntries(["fixed", "sliding", "token", "leaky"].map((k) => [k, { accepted: R.rate[k].accepted, second: R.rate[k].second }])),
      local: [R.rate.localOk, R.rate.sharedOk],
      feed: R.feed,
    },
    null,
    1,
  ),
);
