// Computes every number the be-system-design video says or shows, and writes
// results.json, which data.ts reads. No load balancer, cache, store or CDN
// runs here, so nothing below is any system's output. The numbers are of
// three kinds, each named on screen and aloud as what it is:
//
//   - Back-of-the-envelope arithmetic on the video's own assumptions, said
//     aloud as assumptions ("assume ten million new links a day"), with the
//     page's own rules of thumb (system-design.mdx, "What back-of-the-envelope
//     numbers should you estimate?": a million a day is about 12 a second,
//     peaks two to three times average, read-heavy at 100:1 or more; "Design
//     a URL shortener": a few hundred bytes a URL).
//   - The page's own charts, read from their source rather than retyped, and
//     checked against the caption each spec exports, so the video and the page
//     show the same figures: charts/memory-latency-ladder.mjs (its LEVELS),
//     charts/latency-percentiles.mjs (its seeded sample, copied with its seed)
//     and charts/circuit-breaker-states.mjs (its seeded simulation, copied).
//   - Physics on stated distances: light in fiber covers about 200 km a
//     millisecond (the speed of light over a refractive index of about 1.5),
//     over the great-circle distance between two named cities. A floor, not a
//     measurement: real routes are longer and add queueing.
//
// Then it reads script.ts and exits non-zero if a number the narration says
// no longer matches what is computed here.
//
// From the repo root (the charts' seeded generator, charts/_theme.mjs, needs
// the root's node_modules):
//
//   node video/src/videos/be-system-design/check.mjs
/* global console, process */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const chart = (slug) => import(pathToFileURL(join(root, "charts", `${slug}.mjs`)).href);
const { rng, mean } = await import(pathToFileURL(join(root, "charts/_theme.mjs")).href);

const check = (ok, what) => {
  if (!ok) throw new Error(`check.mjs: ${what}`);
};

const R = {};

// ── 2. The estimate (the video's own assumptions) ───────────────────────────
const DAY = 86_400;
const A = {
  newLinksPerDay: 10_000_000, // "assume ten million new links a day"
  readsPerWrite: 100, // the page's "read-heavy (100:1 or more)"
  peakFactor: 3, // the page's "peak (often 2–3x average)", the top of it
  bytesPerLink: 500, // the page's "a few hundred bytes per URL", say 500
  years: 5, // "in five years"
  bytesPerRedirect: 500, // "half a kilobyte per redirect", the response
};
const perSecond = (perDay) => perDay / DAY;
const trick = perSecond(1_000_000); // the page's "1 million requests/day is roughly 12 QPS"
check(Math.round(trick) === 12, `a million a day is ${trick} a second, not about 12`);
const writeQps = perSecond(A.newLinksPerDay);
const readsPerDay = A.newLinksPerDay * A.readsPerWrite;
const readQps = perSecond(readsPerDay);
const peakReadQps = readQps * A.peakFactor;
const peakWriteQps = writeQps * A.peakFactor;
const storagePerDay = A.newLinksPerDay * A.bytesPerLink;
const linksTotal = A.newLinksPerDay * 365 * A.years;
const storageTotal = linksTotal * A.bytesPerLink;
const peakBandwidth = peakReadQps * A.bytesPerRedirect;
R.estimate = {
  assumptions: A,
  millionPerDayQps: trick,
  writeQps,
  readsPerDay,
  readQps,
  peakReadQps,
  peakWriteQps,
  storagePerDayBytes: storagePerDay,
  linksTotal,
  storageTotalBytes: storageTotal,
  peakBandwidthBytesPerSecond: peakBandwidth,
  // A whole day's new links, held in memory: "five gigabytes".
  dayInMemoryBytes: storagePerDay,
};

// ── 3. The key: base 62 ─────────────────────────────────────────────────────
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
check(ALPHABET.length === 62, "the alphabet is 62 characters");
const base62 = (n) => {
  let s = "";
  do {
    s = ALPHABET[n % 62] + s;
    n = Math.floor(n / 62);
  } while (n > 0);
  return s;
};
const linksPerYear = A.newLinksPerDay * 365;
const keyLengths = [5, 6, 7].map((len) => ({ len, keys: 62 ** len, years: 62 ** len / linksPerYear }));
const six = keyLengths.find((k) => k.len === 6);
check(six.keys >= linksTotal, "six characters hold five years of links");
// Three counted IDs in a row, encoded: consecutive IDs make consecutive keys.
// IDs past 62^5 (916,132,832) take six characters, the length the video uses.
const counted = [9_876_543_210, 9_876_543_211, 9_876_543_212].map((id) => ({ id, key: base62(id) }));
check(counted.every((c) => c.key.length === 6), "the counted keys are six characters");
R.key = { alphabet: ALPHABET, keyLengths, counted, idBlock: 1_000_000 };

// ── 2. The latency ladder (charts/memory-latency-ladder.mjs, read) ──────────
{
  const src = readFileSync(join(root, "charts/memory-latency-ladder.mjs"), "utf8");
  const levels = [...src.matchAll(/\{ name: "([^"]+)", ns: ([\d_.]+) \}/g)].map(([, name, ns]) => ({
    name,
    ns: Number(ns.replace(/_/g, "")),
  }));
  check(levels.length === 7, `seven levels in memory-latency-ladder.mjs, found ${levels.length}`);
  const ns = (name) => levels.find((l) => l.name === name)?.ns;
  const memory = ns("Main memory");
  const ssd = ns("NVMe SSD read");
  const rtt = ns("Network round trip");
  check(memory === 100 && ssd === 100_000 && rtt === 500_000, "the ladder's memory, SSD and round trip");
  // One redirect through the diagram, network and storage time only: a cache
  // hit is two round trips inside the data center (load balancer to app
  // server, app server to cache); a miss adds one to the store and an SSD read.
  const path = { hitMs: (2 * rtt) / 1e6, missMs: (3 * rtt + ssd) / 1e6 };
  R.ladder = { levels, ssdOverMemory: ssd / memory, rttOverSsd: rtt / ssd, rttOverMemory: rtt / memory, path };
}

// ── 2. Percentiles (charts/latency-percentiles.mjs, copied with its seed) ────
{
  const N = 40_000;
  const next = rng(4242);
  const sample = Array.from({ length: N }, () => {
    const u = Math.max(next(), 1e-9);
    const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
    const base = Math.exp(3.15 + 0.44 * g);
    return next() < 0.02 ? base + 120 + next() * 260 : base;
  });
  const sorted = [...sample].sort((a, b) => a - b);
  const q = (p) => sorted[Math.floor(p * (sorted.length - 1))];
  const marks = { median: q(0.5), mean: mean(sample), p95: q(0.95), p99: q(0.99) };
  const { caption } = await chart("latency-percentiles");
  check(caption.includes(`about ${marks.median.toFixed(0)}ms`), "percentiles, median");
  check(caption.includes(`The mean is ${marks.mean.toFixed(0)}ms`), "percentiles, mean");
  check(caption.includes(`the p99 is ${marks.p99.toFixed(0)}ms`), "percentiles, p99");
  // The histogram the chart draws, binned the same way (70 thresholds across
  // its domain), so the scene can redraw it.
  const top = Math.ceil((marks.p99 * 1.12) / 20) * 20;
  const BINS = 69;
  const counts = new Array(BINS).fill(0);
  for (const ms of sample) {
    if (ms >= top) continue;
    counts[Math.floor((ms / top) * BINS)] += 1;
  }
  // The page's caption: "a page making a hundred calls hits it more often than
  // not". Each call independently in the slowest 1%: 1 - 0.99^100.
  const calls = 100;
  const hitsTail = 1 - 0.99 ** calls;
  R.percentiles = {
    n: N,
    seed: 4242,
    marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    domain: [0, top],
    counts,
    calls,
    hitsTail,
  };
}

// ── 4. The circuit breaker (charts/circuit-breaker-states.mjs, copied) ──────
{
  const N = 120;
  const TRIP_RATE = 0.5;
  const OPEN_S = 12;
  const PROBE_SHARE = 0.1;
  const RETRY_BUDGET = 2;
  const OFFERED = 100;
  const random = rng(7);
  const rows = [];
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
  const retry = [];
  {
    let h = 1;
    for (let t = 0; t < N; t++) {
      if (t >= 20 && t < 34) h -= 0.085;
      const errorRate = Math.min(1, Math.max(0, 1 - h));
      const offered = OFFERED * (1 + RETRY_BUDGET * errorRate);
      h += (0.055 - 0.05 * (offered / OFFERED)) * (t >= 34 ? 1 : 0.2);
      h = Math.min(1, Math.max(0.02, h));
      retry.push({ t, offered, errorRate });
    }
  }
  const bands = [];
  for (const r of rows) {
    const last = bands[bands.length - 1];
    if (last && last.state === r.state) last.t1 = r.t + 1;
    else bands.push({ state: r.state, t0: r.t, t1: r.t + 1 });
  }
  const probes = bands.filter((b) => b.state === "half-open");
  const recovered = rows.slice(-10).every((r) => r.errorRate < 0.15);
  const retryPeak = Math.round(Math.max(...retry.map((r) => r.offered)));
  const retryEnd = retry[retry.length - 1].errorRate;
  const { caption } = await chart("circuit-breaker-states");
  check(recovered, "breaker, the service recovers");
  check(retryEnd > 0.9, "breaker, the retry loop never recovers");
  check(probes.length === 2, `breaker, two probes (found ${probes.length}): the first fails, the second closes it`);
  check(caption.includes(`trips at ${Math.round(TRIP_RATE * 100)} percent errors`), "breaker, trip rate");
  check(caption.includes(`open for ${OPEN_S} seconds`), "breaker, open time");
  check(caption.includes(`lets ${Math.round(PROBE_SHARE * 100)} percent of traffic through`), "breaker, probe share");
  check(caption.includes(`peaks at ${retryPeak} requests per second`), "breaker, retry peak");
  check(caption.includes(`cannot serve ${OFFERED}`), "breaker, offered load");
  const r3 = (v) => Math.round(v * 1000) / 1000;
  R.breaker = {
    seconds: N,
    trip: TRIP_RATE,
    openFor: OPEN_S,
    probeShare: PROBE_SHARE,
    offered: OFFERED,
    retryBudget: RETRY_BUDGET,
    errorRate: rows.map((r) => r3(r.errorRate)),
    allowed: rows.map((r) => r.allowed),
    retryOffered: retry.map((r) => r3(r.offered)),
    retryErrorRate: retry.map((r) => r3(r.errorRate)),
    bands: bands.filter((b) => b.state !== "closed"),
    retryPeak,
    recovered,
    endErrorRate: r3(rows[rows.length - 1].errorRate),
    retryEndErrorRate: r3(retryEnd),
  };
}

// ── 5. Distance (the video's own cities) ────────────────────────────────────
{
  const KM_PER_MS = 200; // light in fiber: about 300,000 km/s over n ≈ 1.5
  const EARTH_KM = 6371;
  const places = {
    sydney: { name: "Sydney", lat: -33.87, lon: 151.21 },
    virginia: { name: "Ashburn, Virginia", lat: 39.04, lon: -77.49 },
  };
  const rad = (d) => (d * Math.PI) / 180;
  const km = (a, b) => {
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
  };
  const distance = km(places.sydney, places.virginia);
  const EDGE_KM = 50; // an edge server across the same city
  R.distance = {
    kmPerMs: KM_PER_MS,
    places,
    km: Math.round(distance),
    roundTripMs: (2 * distance) / KM_PER_MS,
    edgeKm: EDGE_KM,
    edgeRoundTripMs: (2 * EDGE_KM) / KM_PER_MS,
  };
}

// ── What the narration says, checked against the numbers ────────────────────
// Each entry: the beat, the words it says, the number those words stand for,
// and the computed value rounded the way the narration rounds it.
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
const said = [
  ["q2-trick", "about twelve a second", 12, Math.round(R.estimate.millionPerDayQps)],
  ["q2-writes", "about a hundred and twenty writes a second", 120, sig2(R.estimate.writeQps)],
  ["q2-reads", "a hundred redirects per link", 100, R.estimate.assumptions.readsPerWrite],
  ["q2-reads", "a billion a day", 1e9, R.estimate.readsPerDay],
  ["q2-reads", "about twelve thousand a second", 12_000, sig2(R.estimate.readQps)],
  ["q2-peak", "about thirty-five thousand redirects a second", 35_000, sig2(R.estimate.peakReadQps)],
  ["q2-storage", "five gigabytes a day", 5e9, R.estimate.storagePerDayBytes],
  ["q2-storage", "about nine terabytes", 9e12, Math.round(R.estimate.storageTotalBytes / 1e12) * 1e12],
  ["q2-band", "about seventeen megabytes a second", 17e6, Math.round(R.estimate.peakBandwidthBytesPerSecond / 1e6) * 1e6],
  ["q2-ladder", "a thousand times that", 1000, R.ladder.ssdOverMemory],
  ["q2-ladder", "five times more again", 5, R.ladder.rttOverSsd],
  ["q2-tail", "twenty-four milliseconds", 24, Math.round(R.percentiles.marks.median)],
  ["q2-tail", "the mean thirty-one", 31, Math.round(R.percentiles.marks.mean)],
  ["q2-tail", "two hundred and eighty-six", 286, Math.round(R.percentiles.marks.p99)],
  ["q2-fanout", "sixty-three percent", 63, Math.round(R.percentiles.hitsTail * 100)],
  ["q2-fanout", "a hundred calls", 100, R.percentiles.calls],
  ["q3-path", "about a millisecond", 1, R.ladder.path.hitMs],
  ["q3-path", "about one point six", 1.6, R.ladder.path.missMs],
  ["q3-key", "fifty-seven billion", 57e9, sig2(six.keys)],
  ["q3-key", "about fifteen years", 15, Math.floor(six.years)],
  ["q3-counter", "a million at a time", 1e6, R.key.idBlock],
  ["q4-retry", "three hundred requests a second", 300, R.breaker.retryPeak],
  ["q4-retry", "a hundred", 100, R.breaker.offered],
  ["q4-states", "errors pass half", 0.5, R.breaker.trip],
  ["q4-states", "twelve seconds", 12, R.breaker.openFor],
  ["q4-states", "a tenth of the traffic", 0.1, R.breaker.probeShare],
  ["q5-light", "about two hundred kilometers a millisecond", 200, R.distance.kmPerMs],
  ["q5-light", "a hundred and fifty-seven milliseconds", 157, Math.round(R.distance.roundTripMs)],
  ["q5-light", "under a millisecond", 1, Math.ceil(R.distance.edgeRoundTripMs)],
  ["q5-light", "over a hundred times the millisecond", 100, Math.floor(R.distance.roundTripMs / R.ladder.path.hitMs / 100) * 100],
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
      estimate: R.estimate,
      keyLengths: R.key.keyLengths,
      counted: R.key.counted,
      ladder: { ssdOverMemory: R.ladder.ssdOverMemory, rttOverSsd: R.ladder.rttOverSsd },
      percentiles: { ...R.percentiles.marks, hitsTail: R.percentiles.hitsTail },
      breaker: { retryPeak: R.breaker.retryPeak, bands: R.breaker.bands, endErrorRate: R.breaker.endErrorRate },
      distance: R.distance,
    },
    null,
    1,
  ),
);
