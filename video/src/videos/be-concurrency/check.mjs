// Computes every number the be-concurrency video shows, in Pyodide 314.0.7
// (Python 3.14), the runtime the site's Python blocks run in, and writes what
// came back to results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/be-concurrency/check.mjs
//
// No thread runs here: the Python build behind the site has none to start
// (the page says so), and a real schedule is not reproducible anyway. So
// nothing below is a thread's output. What is here:
//
//   - amdahl: the page's chart's formula, speedup = 1 / (s + (1 - s) / n),
//     at the chart's three serial fractions, and the ceiling 1 / s.
//   - race: the page's counter, modelled as two threads that each read the
//     counter, add one and write it back. Every order the steps can run in is
//     enumerated (exhaustive, no seed), from a counter of five: one increment
//     each, two each, and one increment each with the three steps held under
//     a lock (one indivisible step).
//   - bytecode: what CPython compiles the page's `counter += 1` to, read with
//     dis from a real compile (this is Python's own compiler, not a model).
//   - deadlock: two threads and two locks, A and B. Every schedule a
//     scheduler could pick is enumerated (a thread waiting on a held lock is
//     not runnable): first with the threads taking the locks in opposite
//     orders, then both A before B.
//   - async: the page's own asyncio block (fetch "a" waits 0.02 s, "b" 0.01
//     s, gathered), run for real, with the order the two finish in recorded;
//     then the same with "a"'s await replaced by a blocking time.sleep. The
//     orders are deterministic. Elapsed time is wall clock, so it is only
//     checked against the delays (max of them, then their sum) and the
//     delays are what the screen shows.
//   - semaphore: twelve downloads through an asyncio.Semaphore(5), the
//     page's "at most 5 simultaneous downloads", and the most ever in flight.
//
// asyncio.run() needs WebAssembly stack switching, which Node's Pyodide
// lacks ("WebAssembly stack switching not supported in this JavaScript
// runtime"), so each async figure awaits its main() at top level instead,
// which runs the same coroutines on the same event loop.
/* global console */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide();

const sync = py.runPython(`
import dis, json, sys
from itertools import combinations

R = {"runtime": {"python": sys.version.split()[0]}}

# ── Amdahl's law, the page's chart ───────────────────────────────────────────
def speedup(s, n):
    return 1 / (s + (1 - s) / n)

R["amdahl"] = {
    str(s): {
        "ceiling": round(1 / s, 2),
        "at": {str(n): round(speedup(s, n), 2) for n in (1, 2, 4, 8, 16, 100, 1000)},
        # The curve the figure draws: 61 core counts, evenly spaced on the
        # chart's log axis from 1 to 1000.
        "curve": [[round(10 ** (k / 20), 4), round(speedup(s, 10 ** (k / 20)), 4)] for k in range(61)],
    }
    for s in (0.01, 0.05, 0.25)
}

# ── The race: every order two threads' read, add, write can run in ───────────
STEPS = ["read", "add", "write"]

def interleavings(steps_a, steps_b):
    """Every merge of two step lists that keeps each list's own order."""
    n = len(steps_a) + len(steps_b)
    for slots in combinations(range(n), len(steps_a)):
        order, ia, ib = [], 0, 0
        for i in range(n):
            if i in slots:
                order.append(("A", steps_a[ia])); ia += 1
            else:
                order.append(("B", steps_b[ib])); ib += 1
        yield order

def run(order, start):
    shared, reg = start, {"A": None, "B": None}
    for who, step in order:
        if step == "read":
            reg[who] = shared
        elif step == "add":
            reg[who] += 1
        elif step == "write":
            shared = reg[who]
        else:  # "inc": read, add and write under a lock, as one step
            shared += 1
    return shared

def race(steps_each, start=5):
    outcomes, example, every = {}, None, []
    orders = list(interleavings(steps_each, steps_each))
    for order in orders:
        v = run(order, start)
        outcomes[v] = outcomes.get(v, 0) + 1
        # Each order as the threads that take its steps, in turn ("AABABB"),
        # and what it leaves in the counter: the figure draws every one.
        every.append({"threads": "".join(w for w, _ in order), "result": v})
        right = start + 2 * sum(1 for s in steps_each if s in ("write", "inc"))
        if v != right and example is None:
            example = [f"{w} {s}" for w, s in order]
    right = start + 2 * sum(1 for s in steps_each if s in ("write", "inc"))
    return {
        "start": start,
        "right": right,
        "orders": len(orders),
        "rightOrders": outcomes.get(right, 0),
        "outcomes": {str(k): v for k, v in sorted(outcomes.items(), reverse=True)},
        "lostExample": example,
        "every": every if len(orders) <= 20 else None,
    }

# A losing order with both reads first, the page's "both see 5", for the figure.
both_read = [("A", "read"), ("B", "read"), ("A", "add"), ("B", "add"), ("A", "write"), ("B", "write")]
R["race"] = {
    "steps": STEPS,
    "one": race(STEPS),
    "two": race(STEPS * 2),
    "locked": race(["inc"]),
    "bothRead": {"order": [f"{w} {s}" for w, s in both_read], "result": run(both_read, 5)},
}

# ── What CPython compiles counter += 1 to ────────────────────────────────────
# The page's worker, without its lock.
SRC = """counter = 0

def worker():
    global counter
    for _ in range(100000):
        counter += 1
"""
ns = {}
exec(compile(SRC, "<page>", "exec"), ns)
line = SRC.splitlines().index("        counter += 1") + 1
on_line = [i for i in dis.get_instructions(ns["worker"]) if i.positions and i.positions.lineno == line]
# The loop's own jump back to its top is filed under the body's line too; it
# is the loop's, not the increment's, so it is listed apart.
instrs = [
    (i.opname + " " + (i.argrepr or ("" if i.arg is None else str(i.argval)))).strip()
    for i in on_line
    if not i.opname.startswith("JUMP")
]
R["bytecode"] = {
    "source": "counter += 1",
    "instructions": instrs,
    "count": len(instrs),
    "loopJump": [i.opname for i in on_line if i.opname.startswith("JUMP")],
}

# ── Deadlock: every schedule of two threads over two locks ───────────────────
def schedules(t1, t2):
    progs = [t1, t2]
    done, stuck, examples = 0, 0, []
    def dfs(pc, held, trace):
        nonlocal done, stuck
        runnable = []
        for t in (0, 1):
            if pc[t] < len(progs[t]):
                op, lock = progs[t][pc[t]]
                if op == "take" and held.get(lock) not in (None, t):
                    continue  # waiting on a lock the other thread holds
                runnable.append(t)
        if not runnable:
            if pc[0] == len(t1) and pc[1] == len(t2):
                done += 1
            else:
                stuck += 1
                examples.append({
                    "trace": trace,
                    "holds": {f"T{t + 1}": sorted(l for l, h in held.items() if h == t) for t in (0, 1)},
                    "waitsFor": {f"T{t + 1}": progs[t][pc[t]][1] for t in (0, 1)},
                })
            return
        for t in runnable:
            op, lock = progs[t][pc[t]]
            h = dict(held)
            if op == "take":
                h[lock] = t
            else:
                del h[lock]
            p = list(pc); p[t] += 1
            dfs(p, h, trace + [f"T{t + 1} {op}s {lock}"])
    dfs([0, 0], {}, [])
    return {"schedules": done + stuck, "finish": done, "deadlock": stuck, "examples": examples}

A_THEN_B = [("take", "A"), ("take", "B"), ("release", "B"), ("release", "A")]
B_THEN_A = [("take", "B"), ("take", "A"), ("release", "A"), ("release", "B")]
R["deadlock"] = {
    "opposite": schedules(A_THEN_B, B_THEN_A),
    "sameOrder": schedules(A_THEN_B, A_THEN_B),
}

# ── The thread pool's map, the page's example: results in input order ──────
# The pool itself can't run here (no threads); map is what pool.map returns,
# in the same order, which is the page's point.
def square(n):
    return n * n

R["pool"] = {"workers": 4, "inputs": list(range(6)), "results": list(map(square, range(6)))}

json.dumps(R)
`);
const R = JSON.parse(sync);

// ── The page's asyncio block, and the same with one blocking call ───────────
const PAGE_ASYNC = `import asyncio

async def fetch(name, delay):
    await asyncio.sleep(delay)   # simulates non-blocking I/O
    return f"{name} done"

async def main():
    results = await asyncio.gather(
        fetch("a", 0.02),
        fetch("b", 0.01),
    )
    print(results)   # ['a done', 'b done'] (gather preserves argument order)
`;

R.async = JSON.parse(
  await py.runPythonAsync(`
import asyncio, contextlib, io, json, time

finished = []

async def fetch(name, delay):
    await asyncio.sleep(delay)
    finished.append(name)
    return f"{name} done"

async def fetch_blocking(name, delay):
    time.sleep(delay)            # a blocking call: never yields to the loop
    finished.append(name)
    return f"{name} done"

async def gathered(fa):
    finished.clear()
    t0 = time.monotonic()
    results = await asyncio.gather(fa("a", 0.02), fetch("b", 0.01))
    return {"results": results, "finished": list(finished), "elapsed": time.monotonic() - t0}

# The page's block, as written, for its printed line.
page_ns = {}
exec(${JSON.stringify(PAGE_ASYNC)}, page_ns)
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    await page_ns["main"]()

json.dumps({
    "delays": {"a": 0.02, "b": 0.01},
    "pagePrinted": buf.getvalue().strip(),
    "awaiting": await gathered(fetch),
    "blocking": await gathered(fetch_blocking),
})
`),
);

R.semaphore = JSON.parse(
  await py.runPythonAsync(`
import asyncio, json

LIMIT, DOWNLOADS = 5, 12
gate = asyncio.Semaphore(LIMIT)
in_flight = peak = 0

async def download(i):
    global in_flight, peak
    async with gate:
        in_flight += 1
        peak = max(peak, in_flight)
        await asyncio.sleep(0.01)
        in_flight -= 1

await asyncio.gather(*(download(i) for i in range(DOWNLOADS)))
json.dumps({"limit": LIMIT, "downloads": DOWNLOADS, "peak": peak})
`),
);

// ── Checks: the claims the narration makes stand on these ───────────────────
const fail = (msg) => {
  throw new Error(`be-concurrency check: ${msg}`);
};
const a5 = R.amdahl["0.05"];
if (a5.ceiling !== 20) fail(`5% serial should cap at 20x, got ${a5.ceiling}`);
if (Math.round(a5.at["100"]) !== 17) fail(`5% serial on 100 cores should be about 17x, got ${a5.at["100"]}`);
if (R.race.one.orders !== 20 || R.race.one.rightOrders !== 2) fail(`race: ${JSON.stringify(R.race.one)}`);
if (R.race.bothRead.result !== 6) fail("both reading five should write six");
if (R.race.locked.orders !== 2 || R.race.locked.rightOrders !== 2) fail(`locked race: ${JSON.stringify(R.race.locked)}`);
if (R.bytecode.count !== 4) fail(`counter += 1 compiled to ${R.bytecode.count} instructions: ${R.bytecode.instructions}`);
if (R.deadlock.opposite.deadlock === 0) fail("opposite lock orders should be able to deadlock");
if (R.deadlock.sameOrder.deadlock !== 0) fail("one lock order should never deadlock");
for (const ex of R.deadlock.opposite.examples) {
  if (ex.trace.length !== 2) fail(`a deadlock should need only both first takes: ${ex.trace}`);
}
const { awaiting, blocking, delays, pagePrinted } = R.async;
if (pagePrinted !== "['a done', 'b done']") fail(`the page's block printed ${pagePrinted}`);
for (const run of [awaiting, blocking]) {
  if (run.results.join() !== "a done,b done") fail(`gather order: ${run.results}`);
}
if (awaiting.finished.join() !== "b,a") fail(`awaiting: b should finish first, got ${awaiting.finished}`);
if (blocking.finished.join() !== "a,b") fail(`blocking: a should finish first, got ${blocking.finished}`);
const longer = Math.max(delays.a, delays.b);
const both = delays.a + delays.b;
// Wall clock: the overlapped run takes the longer wait (and less than the
// sum); the blocking run at least the sum.
if (!(awaiting.elapsed >= longer && awaiting.elapsed < both)) fail(`overlapped run took ${awaiting.elapsed} s`);
if (!(blocking.elapsed >= both)) fail(`blocking run took ${blocking.elapsed} s`);
R.async.overlapped = { total: longer, rule: "the longer wait" };
R.async.serial = { total: both, rule: "the sum of the waits" };
// Elapsed times vary run to run; keep them out of the committed file.
delete awaiting.elapsed;
delete blocking.elapsed;
if (R.semaphore.peak !== R.semaphore.limit) fail(`semaphore peak ${R.semaphore.peak}`);
if (R.race.one.every.filter((o) => o.result === R.race.one.right).length !== R.race.one.rightOrders) fail("race: every order disagrees with the count");
if (R.pool.results.join() !== "0,1,4,9,16,25") fail(`pool map: ${R.pool.results}`);

const file = join(here, "results.json");
writeFileSync(file, `${JSON.stringify(R, null, 2)}\n`);
console.log(`wrote ${file}`);
console.log(
  `amdahl 5%: ceiling ${a5.ceiling}x, 100 cores ${a5.at["100"]}x; race: ${R.race.one.rightOrders} of ${R.race.one.orders} right ` +
    `(two each: ${R.race.two.rightOrders} of ${R.race.two.orders}); bytecode: ${R.bytecode.instructions.join(" | ")}; ` +
    `deadlock: ${R.deadlock.opposite.deadlock} of ${R.deadlock.opposite.schedules} schedules, same order ${R.deadlock.sameOrder.deadlock}; ` +
    `async finished ${awaiting.finished}, blocking ${blocking.finished}; semaphore peak ${R.semaphore.peak}`,
);
