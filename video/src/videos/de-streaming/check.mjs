// Computes every number the de-streaming video shows, in Pyodide 314.0.7
// (Python and NumPy, the runtime the site's Python blocks run in), and writes
// what came back to results.json, which data.ts reads. Every random draw is
// seeded, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/de-streaming/check.mjs
//
// No Kafka runs here, and nothing below is Kafka's output. The streaming page
// has no runnable code, so every number is the video's own, from a small
// model of the mechanism, and the screen and the narration say so:
//
//   - the stream: twelve clicks from four users (ava, ben, cam, dee), each with
//     the second it happened (event time) and the second it reached the engine
//     (processing time). It is written by hand below, the video's own; what is
//     computed from it is computed here:
//   - partitions: each user hashed (CRC-32 of the name, a stand-in for a
//     producer's key hash) modulo three; offsets count up in arrival order;
//   - moving keys: ten thousand keys hashed into three partitions, then four,
//     and the share that land in a different one;
//   - windows: tumbling ten-second windows counted by event time and by
//     processing time; sliding ten-second windows every five; sessions per
//     user with a five-second gap;
//   - the watermark: the latest event time seen minus an allowed delay of
//     three or ten seconds, at every arrival; which clicks arrive behind it;
//     when the first window closes; and the first window's count before and
//     after an allowed lateness of ten seconds lets the late click in;
//   - delivery: a thousand messages committed every fifty, with three crashes
//     at seeded points, counted under at-most-once (lost) and at-least-once
//     (processed twice), and the rows a blind insert and an idempotent upsert
//     leave behind;
//   - backpressure: about a hundred messages a second (Poisson, seeded) into a
//     consumer that handles eighty, then two that handle a hundred and sixty
//     from second sixty; the consumer lag second by second;
//   - log compaction: eight updates to four users' profiles, and what a
//     compacted log keeps.
/* global console */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy"] });

const out = py.runPython(`
import json, math, random, sys, zlib
import numpy as np

R = {"runtime": {"python": sys.version.split()[0], "numpy": np.__version__}}

# ── The video's own stream: twelve clicks from four users ────────────────────
# (user, event time in s, processing time in s). dee's click from second 8
# comes from a phone that was offline and reaches the engine at 17.2 s; ben's
# from second 25 arrives after cam's from 27.
CLICKS = [
    ("ava", 1, 1.4), ("ava", 3, 3.3), ("ben", 4, 4.6), ("ava", 6, 6.5),
    ("dee", 8, 17.2), ("cam", 11, 11.4), ("ben", 13, 13.5), ("cam", 15, 15.3),
    ("ava", 18, 18.6), ("ava", 21, 21.3), ("ben", 25, 28.0), ("cam", 27, 27.4),
]
USERS = ["ava", "ben", "cam", "dee"]
arrival = sorted(range(len(CLICKS)), key=lambda i: CLICKS[i][2])

def h(key):
    return zlib.crc32(key.encode())

# ── Partitions: the key's hash modulo the partition count ───────────────────
P = 3
part = {u: h(u) % P for u in USERS}
offsets = {}
nxt = [0] * P
for i in arrival:
    p = part[CLICKS[i][0]]
    offsets[i] = nxt[p]
    nxt[p] += 1
R["stream"] = [
    {"i": i, "user": u, "t": t, "arrive": a, "partition": part[u], "offset": offsets[i], "order": arrival.index(i)}
    for i, (u, t, a) in enumerate(CLICKS)
]
R["partitions"] = {"count": P, "of": part, "sizes": nxt, "four": {u: h(u) % 4 for u in USERS}}

# ── Adding a partition moves keys ───────────────────────────────────────────
KEYS = 10_000
moved = sum(1 for k in range(KEYS) if h(f"user-{k}") % 3 != h(f"user-{k}") % 4)
R["moved"] = {"keys": KEYS, "moved": moved, "share": round(moved / KEYS, 4),
              "ours": sum(1 for u in USERS if part[u] != h(u) % 4)}

# ── Windows ─────────────────────────────────────────────────────────────────
SIZE, SLIDE, GAP, END = 10, 5, 5, 30
def tumbling(field):
    return [sum(1 for c in CLICKS if s <= c[field] < s + SIZE) for s in range(0, END, SIZE)]
starts = list(range(-SLIDE, END, SLIDE))
sliding = [{"start": s, "count": sum(1 for c in CLICKS if s <= c[1] < s + SIZE)} for s in starts]
assert all(sum(1 for w in sliding if w["start"] <= c[1] < w["start"] + SIZE) == 2 for c in CLICKS)
sessions = {}
for u in USERS:
    ts = sorted(c[1] for c in CLICKS if c[0] == u)
    spans = [[ts[0], ts[0]]]
    for t in ts[1:]:
        # A session window is [t, t + gap); two merge when they overlap.
        if t < spans[-1][1] + GAP:
            spans[-1][1] = t
        else:
            spans.append([t, t])
    sessions[u] = [{"first": a, "last": b, "end": b + GAP, "clicks": sum(1 for t in ts if a <= t <= b)} for a, b in spans]
R["windows"] = {
    "size": SIZE, "slide": SLIDE, "gap": GAP, "end": END,
    "tumblingEvent": tumbling(1), "tumblingProcessing": tumbling(2),
    "sliding": sliding, "sessions": sessions,
    "sessionCount": sum(len(v) for v in sessions.values()),
}

# ── The watermark: the latest event time seen minus an allowed delay ────────
def watermark(delay, lateness=0):
    seen = -math.inf
    trace, dropped, closed = [], [], {}
    counts = [0] * (END // SIZE)
    for i in arrival:
        u, t, a = CLICKS[i]
        wm = seen - delay
        s = (t // SIZE) * SIZE
        # A click counts while its window is open, or kept open for late
        # updates: until the watermark passes the window's end plus any
        # allowed lateness. After that it is dropped (or sent aside).
        if wm < s + SIZE + lateness:
            counts[s // SIZE] += 1
        else:
            dropped.append(i)
        before = None if wm == -math.inf else wm
        seen = max(seen, t)
        wm = seen - delay
        trace.append({"i": i, "arrive": a, "before": before, "after": wm, "behind": before is not None and t < before})
        for w in range(0, END, SIZE):
            if w not in closed and wm >= w + SIZE:
                closed[w] = a
    return {"delay": delay, "lateness": lateness, "trace": trace, "behind": [x["i"] for x in trace if x["behind"]],
            "dropped": dropped, "closeFirst": closed.get(0), "counts": counts, "firstCount": counts[0],
            "final": seen - delay}
w3 = watermark(3)
w10 = watermark(10)
w3l = watermark(3, lateness=10)
dee = next(i for i, c in enumerate(CLICKS) if c[0] == "dee")
deeTrace = next(x for x in w3["trace"] if x["i"] == dee)
# The first window's count when it closes with a 3 s delay, before dee's click.
onTime = sum(1 for i in arrival if CLICKS[i][1] < SIZE and CLICKS[i][2] <= w3["closeFirst"])
R["watermark"] = {
    "three": w3, "ten": w10, "threeLate": w3l,
    "dee": dee, "deeAt": CLICKS[dee][2], "deeBehind": deeTrace["before"],
    "firstOnTime": onTime, "firstFinal": tumbling(1)[0],
    "closeLater": round(w10["closeFirst"] - w3["closeFirst"], 1),
}
assert w3["behind"] == [dee] and w10["behind"] == [] and w3l["firstCount"] == tumbling(1)[0]

# ── Delivery: a thousand messages, committed every fifty, three crashes ─────
N, BATCH, CRASHES = 1_000, 50, 3
rng = random.Random(8)
crash_at = sorted(rng.sample(range(N), CRASHES))
lost = dup = 0
batches = []
for c in crash_at:
    b = (c // BATCH) * BATCH
    lost += b + BATCH - c   # at-most-once: committed to b + 50, processed up to c
    dup += c - b            # at-least-once: processed b .. c - 1, restarts at b
    batches.append({"crash": c, "batch": b})
R["delivery"] = {
    "messages": N, "batch": BATCH, "crashes": batches,
    "lost": lost, "duplicates": dup,
    "blindRows": N + dup, "idempotentRows": N,
}

# ── Backpressure: a hundred a second in, eighty handled, then a second consumer ──
rng = np.random.default_rng(12)
SECONDS, JOIN = 100, 60
arrivals = rng.poisson(100, SECONDS)
cap = [80 if t < JOIN else 160 for t in range(SECONDS)]
lag, L = [], 0
for t in range(SECONDS):
    L = max(0, L + int(arrivals[t]) - cap[t])
    lag.append(L)
drained = next(t for t in range(JOIN, SECONDS) if lag[t] == 0)
R["backpressure"] = {
    "rate": 100, "one": 80, "two": 160, "join": JOIN,
    "meanIn": round(float(arrivals[:JOIN].mean()), 1),
    "lag": lag, "atJoin": lag[JOIN - 1], "drainedAt": drained + 1, "drainSeconds": drained + 1 - JOIN,
}

# ── Log compaction: eight profile updates, the latest per key kept ──────────
UPDATES = [("ava", 1), ("ben", 1), ("ava", 2), ("cam", 1), ("ben", 2), ("ava", 3), ("dee", 1), ("cam", 2)]
latest = {}
for off, (u, v) in enumerate(UPDATES):
    latest[u] = off
R["compaction"] = {
    "log": [{"offset": i, "user": u, "version": v, "kept": latest[u] == i} for i, (u, v) in enumerate(UPDATES)],
    "kept": len(latest),
}

json.dumps(R)
`);

const results = JSON.parse(out);
writeFileSync(join(here, "results.json"), JSON.stringify(results, null, 1) + "\n");
const { partitions, moved, windows, watermark, delivery, backpressure, compaction } = results;
console.log(JSON.stringify(results.runtime));
console.log("partitions", JSON.stringify(partitions));
console.log("stream", results.stream.map((c) => `${c.user}@${c.t}->${c.arrive} p${c.partition}#${c.offset}`).join(" "));
console.log("moved", JSON.stringify(moved));
console.log("tumbling", windows.tumblingEvent, windows.tumblingProcessing, "sliding", JSON.stringify(windows.sliding));
console.log("sessions", JSON.stringify(windows.sessions), windows.sessionCount);
for (const k of ["three", "ten", "threeLate"]) {
  const w = watermark[k];
  console.log("watermark", k, "behind", w.behind, "dropped", w.dropped, "closeFirst", w.closeFirst, "firstCount", w.firstCount);
}
console.log("dee", watermark.deeAt, "behind", watermark.deeBehind, "onTime", watermark.firstOnTime, "final", watermark.firstFinal, "later", watermark.closeLater);
console.log("delivery", JSON.stringify(delivery));
console.log("backpressure", backpressure.meanIn, backpressure.atJoin, backpressure.drainedAt, backpressure.drainSeconds, Math.max(...backpressure.lag));
console.log("compaction", JSON.stringify(compaction));
