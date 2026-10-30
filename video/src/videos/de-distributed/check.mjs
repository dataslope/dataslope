// Measures every number the de-distributed video shows or says, and writes
// results.json, which data.ts reads. No Spark runs here (the page's own blocks
// are PySpark, which nothing in the site executes), so the numbers are of
// three kinds, each named as what it is on screen and aloud:
//
//   - The course video PandasGroupby's seven-row frame (its measurements.json,
//     pandas 3.0.5), run through a MapReduce by hand in Python: three input
//     splits, a map that emits (dept, salary), a shuffle by key, a reduce
//     that sums. The sums must be PandasGroupby's own (388, 172, 205), or
//     this script stops. The same frame with a map-side combine gives the
//     reduceByKey count.
//   - Small seeded models, in plain Python in Pyodide 314.0.7 (the runtime the
//     site's Python blocks run in): a million clicks over a thousand products
//     in four partitions (groupByKey against reduceByKey), and a million rows
//     in eight partitions where one "guest" key holds 30% of them (skew, then
//     salting). Partitions are assigned by a hash of the key, Java's String
//     hashCode modulo the partition count, the rule an RDD's HashPartitioner
//     applies; the video calls each a model, never Spark's output.
//   - The page's own charts, read from their source rather than retyped:
//     charts/memory-latency-ladder.mjs (its LEVELS, and its "if L1 took one
//     second" column, recomputed with the chart's own rule) and
//     charts/tail-latency-fanout.mjs (1 - (1 - p)^n, the first n where a 1%
//     tail passes even odds).
//
// Plus arithmetic on round sizes the video states as its own ("say sixteen
// gigabytes on sixteen cores"; the page's concept check's 2 TB fact table and
// 20 MB lookup, on a cluster of fifty executors).
//
// From the repo root (Pyodide comes from the root's node_modules):
//
//   node video/src/videos/de-distributed/check.mjs
/* global console */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const require = createRequire(join(root, "package.json"));
const { loadPyodide } = require("pyodide");

// ── The page's charts, read from their source ────────────────────────────────
const ladderSrc = readFileSync(join(root, "charts/memory-latency-ladder.mjs"), "utf8");
const levels = [...ladderSrc.matchAll(/\{ name: "([^"]+)", ns: ([\d_.]+) \}/g)].map(([, name, ns]) => ({
  name,
  ns: Number(ns.replace(/_/g, "")),
}));
if (levels.length !== 7) throw new Error(`expected seven levels in memory-latency-ladder.mjs, found ${levels.length}`);
const fanoutSrc = readFileSync(join(root, "charts/tail-latency-fanout.mjs"), "utf8");
const rates = [...fanoutSrc.matchAll(/\{ p: ([\d.]+), key: "([^"]+)" \}/g)].map(([, p, key]) => ({ p: Number(p), key }));
const maxCalls = Number(/const MAX_CALLS = (\d+);/.exec(fanoutSrc)?.[1]);
if (rates.length !== 3 || !maxCalls) throw new Error("tail-latency-fanout.mjs no longer reads as expected");

// ── PandasGroupby's frame ────────────────────────────────────────────────────
const groupby = JSON.parse(readFileSync(join(here, "../pandas-groupby/measurements.json"), "utf8"));

const py = await loadPyodide();
py.globals.set("FRAME_JSON", JSON.stringify(groupby.rows));
py.globals.set("LEVELS_JSON", JSON.stringify(levels));
py.globals.set("RATES_JSON", JSON.stringify(rates));
py.globals.set("MAX_CALLS", maxCalls);

const out = py.runPython(`
import json, math, random, sys

R = {"runtime": {"python": sys.version.split()[0]}}

def java_hash(s):
    """Java's String.hashCode, as a signed 32-bit int."""
    h = 0
    for ch in s:
        h = (31 * h + ord(ch)) & 0xFFFFFFFF
    return h - (1 << 32) if h >= (1 << 31) else h

def part(key, n):
    """An RDD HashPartitioner's rule: hashCode modulo n, made non-negative."""
    return java_hash(key) % n

# ── MapReduce by hand on PandasGroupby's seven rows ──────────────────────────
rows = json.loads(FRAME_JSON)
SPLITS = [[0, 1, 2], [3, 4], [5, 6]]
splits = [[rows[i] for i in s] for s in SPLITS]
# Map: each row emits (dept, salary).
emitted = [[(r["dept"], r["salary"]) for r in s] for s in splits]
# Shuffle: every pair for a key lands together, keys in sorted order.
keys = sorted({k for s in emitted for k, _ in s})
groups = []
for k in keys:
    vals = [(si, v) for si, s in enumerate(emitted) for kk, v in s if kk == k]
    groups.append({"dept": k, "values": [v for _, v in vals], "from": [si for si, _ in vals]})
# Reduce: sum each key's values.
reduced = [{"dept": g["dept"], "salary": sum(g["values"])} for g in groups]
# A map-side combine: each split sums its own keys before the shuffle.
combined = []
for s in emitted:
    acc = {}
    for k, v in s:
        acc[k] = acc.get(k, 0) + v
    combined.append([{"dept": k, "salary": v} for k, v in acc.items()])
R["mapreduce"] = {
    "rows": rows,
    "splits": SPLITS,
    "groups": groups,
    "reduced": reduced,
    "shuffled": sum(len(s) for s in emitted),
    "combined": combined,
    "combinedShuffled": sum(len(c) for c in combined),
}

# ── groupByKey against reduceByKey, modelled ─────────────────────────────────
# A million clicks over a thousand products, in four partitions of 250,000.
rng = random.Random(12)
EVENTS, PRODUCTS, P = 1_000_000, 1_000, 4
clicks = [rng.randrange(PRODUCTS) for _ in range(EVENTS)]
per = EVENTS // P
parts = [clicks[i * per:(i + 1) * per] for i in range(P)]
group_by_key = EVENTS  # every value crosses the shuffle
reduce_by_key = sum(len(set(p)) for p in parts)  # one partial count per key per partition
counts = {}
for c in clicks:
    counts[c] = counts.get(c, 0) + 1
R["reduceModel"] = {
    "events": EVENTS,
    "keys": PRODUCTS,
    "partitions": P,
    "perPartition": per,
    "groupByKey": group_by_key,
    "reduceByKey": reduce_by_key,
    "ratio": round(group_by_key / reduce_by_key, 1),
    "repeats": round(per / PRODUCTS),
    "biggestKey": max(counts.values()),
}

# ── Skew, then salting, modelled ─────────────────────────────────────────────
# A million rows over 10,000 users in eight partitions, with one "guest" key
# (a sentinel for logged-out traffic) on 30% of the rows.
rng = random.Random(5)
ROWS, USERS, NP, HOT, SALTS = 1_000_000, 10_000, 8, 0.30, 8
keys_ = []
for _ in range(ROWS):
    keys_.append("guest" if rng.random() < HOT else f"user-{rng.randrange(USERS)}")
before = [0] * NP
for k in keys_:
    before[part(k, NP)] += 1
guest_rows = sum(1 for k in keys_ if k == "guest")
guest_part = part("guest", NP)
# Salting: the hot key gets a random suffix 0 to 7, so it hashes to eight keys.
salted = [f"guest#{rng.randrange(SALTS)}" if k == "guest" else k for k in keys_]
after = [0] * NP
for k in salted:
    after[part(k, NP)] += 1
salt_parts = sorted({part(f"guest#{s}", NP) for s in range(SALTS)})
# Two steps: count by the salted key, then strip the salt and add the parts.
step1 = {}
for k in salted:
    if k.startswith("guest#"):
        step1[k] = step1.get(k, 0) + 1
partials = [step1[f"guest#{s}"] for s in range(SALTS)]
mean = ROWS / NP
R["skew"] = {
    "rows": ROWS,
    "users": USERS,
    "partitions": NP,
    "hotShare": round(guest_rows / ROWS, 4),
    "guestRows": guest_rows,
    "guestPartition": guest_part,
    "before": before,
    "after": after,
    "mean": mean,
    "maxBefore": max(before),
    "maxAfter": max(after),
    "ratioBefore": round(max(before) / mean, 2),
    "ratioAfter": round(max(after) / mean, 2),
    "shareBefore": round(max(before) / ROWS, 4),
    "shareAfter": round(max(after) / ROWS, 4),
    "salts": SALTS,
    "saltPartitions": salt_parts,
    "partials": partials,
    "total": sum(partials),
}

# ── A stage waits for its slowest task: the fan-out chart's arithmetic ──────
rates = json.loads(RATES_JSON)
def slow(p, n):
    return 1 - (1 - p) ** n
one = next(r for r in rates if r["p"] == 0.01)
half = next(n for n in range(MAX_CALLS + 1) if slow(one["p"], n) >= 0.5)
R["tail"] = {
    "p": one["p"],
    "half": half,
    "atHalf": round(slow(one["p"], half), 4),
    "tasks": 200,
    "at200": round(slow(one["p"], 200), 4),
    "curve": [round(slow(one["p"], n), 4) for n in range(0, MAX_CALLS + 1, 4)],
    "step": 4,
    "max": MAX_CALLS,
}

# ── The memory ladder: the chart's levels and its "if L1 took one second" ───
levels = json.loads(LEVELS_JSON)
L1 = next(l["ns"] for l in levels if l["name"] == "L1 cache")
def human(ns):
    # charts/memory-latency-ladder.mjs's own rule, line for line.
    s = ns / L1
    if s < 1: return f"{s * 1000:.0f} ms"
    if s < 90: return f"{s:.0f} s"
    if s < 5400: return f"{s / 60:.0f} min"
    if s < 172_800: return f"{s / 3600:.1f} hours"
    return f"{s / 86_400:.0f} days"
mem = next(l["ns"] for l in levels if l["name"] == "Main memory")
ssd = next(l["ns"] for l in levels if l["name"] == "NVMe SSD read")
net = next(l["ns"] for l in levels if l["name"] == "Network round trip")
R["ladder"] = {
    "levels": [{"name": l["name"], "ns": l["ns"], "scaled": human(l["ns"])} for l in levels],
    "ssdOverMemory": round(ssd / mem),
    "networkOverMemory": round(net / mem),
    "ssdOrders": round(math.log10(ssd / mem)),
    "networkOrders": round(math.log10(net / mem)),
}

# ── Partition count: arithmetic on the video's own round sizes ───────────────
GB, CORES = 16, 16
MB = GB * 1000
cases = []
for n in (4, 64, 100_000):
    cases.append({"partitions": n, "mb": MB / n, "busy": min(n, CORES), "idle": max(0, CORES - n), "perCore": n / CORES})
R["partitions"] = {"gb": GB, "cores": CORES, "cases": cases}

# ── Broadcast against sort-merge: the concept check's sizes ──────────────────
FACT_TB, DIM_MB, EXECUTORS = 2, 20, 50
R["broadcast"] = {
    "factTB": FACT_TB,
    "dimMB": DIM_MB,
    "executors": EXECUTORS,
    "broadcastMB": DIM_MB * EXECUTORS,
    "shuffleMB": FACT_TB * 1_000_000 + DIM_MB,
    "ratio": round((FACT_TB * 1_000_000 + DIM_MB) / (DIM_MB * EXECUTORS)),
}

json.dumps(R)
`);

const results = JSON.parse(out);

// The reduce must be PandasGroupby's own agg, number for number.
for (const a of groupby.agg) {
  const r = results.mapreduce.reduced.find((x) => x.dept === a.dept);
  if (!r || r.salary !== a.salary) throw new Error(`reduce of ${a.dept} is ${r?.salary}, PandasGroupby's agg is ${a.salary}`);
}
results.source = {
  frame: "src/videos/pandas-groupby/measurements.json (pandas 3.0.5)",
  ladder: "charts/memory-latency-ladder.mjs",
  fanout: "charts/tail-latency-fanout.mjs",
};

writeFileSync(join(here, "results.json"), JSON.stringify(results, null, 1) + "\n");
const { mapreduce, reduceModel, skew, tail, ladder, partitions, broadcast } = results;
console.log(JSON.stringify(results.runtime));
console.log("mapreduce", JSON.stringify(mapreduce.reduced), "shuffled", mapreduce.shuffled, "combined", mapreduce.combinedShuffled, JSON.stringify(mapreduce.combined));
console.log("reduceModel", JSON.stringify(reduceModel));
console.log("skew", JSON.stringify({ ...skew, before: skew.before.join(" "), after: skew.after.join(" ") }));
console.log("tail", JSON.stringify({ ...tail, curve: undefined }));
console.log("ladder", JSON.stringify(ladder));
console.log("partitions", JSON.stringify(partitions));
console.log("broadcast", JSON.stringify(broadcast));
