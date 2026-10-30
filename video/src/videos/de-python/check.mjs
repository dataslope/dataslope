// Runs every snippet the de-python video shows in Pyodide 314.0.7 (Python
// 3.14) with pandas 3.0.2, the runtime the Data Engineer Python page's blocks
// run in the reader's browser, and writes what came back to results.json,
// which data.ts reads. From the repo root, where the pyodide package (and its
// pandas wheel) is installed:
//
//   node video/src/videos/de-python/check.mjs
//
// The harness is the one DS Part 9 (ds-python-pandas/check.mjs) and DA Part 2
// (da-pandas/check.mjs) use: each figure runs in a fresh namespace built by its
// own setup, its steps run in order like cells of one notebook, and a step's
// last expression is its value. Two additions for this video: a step can be
// run under tracemalloc (`mem`), which records the step's peak traced memory
// in bytes, and print() output is kept line by line, so a console on screen
// shows exactly what ran.
//
// The files the figures read ("events.csv", "orders.csv") are written into
// Pyodide's in-memory file system by the setups, from a seeded generator, so
// every run writes the same bytes. Memory is measured in WebAssembly, a 32-bit
// build of CPython: a 64-bit laptop needs more bytes per object, so the screen
// says where each figure was measured, and the narration quotes ratios.
//
// Tables are the page's own (content/interview/data-engineer/python.mdx)
// wherever the page has one. The rest are marked "the video's own" below and
// in script.ts.
/* global console, URL */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "pandas"] });

py.runPython(`
import ast, contextlib, io, json, time, tracemalloc, warnings
import numpy as np
import pandas as pd

def _cells(s):
    if len(s) == 0:
        return []
    text = s.reset_index(drop=True).to_string(index=False, header=False, na_rep="NaN")
    return [t.strip() for t in text.split("\\n")]

def _show(v):
    if isinstance(v, pd.DataFrame):
        cols = [_cells(v.iloc[:, j]) for j in range(v.shape[1])]
        return {
            "kind": "frame",
            "index": [str(i) for i in v.index],
            "indexName": None if v.index.name is None else str(v.index.name),
            "columns": [str(c) for c in v.columns],
            "rows": [list(r) for r in zip(*cols)] if cols else [[] for _ in range(len(v))],
            "dtypes": [str(t) for t in v.dtypes],
        }
    if isinstance(v, pd.Series):
        return {
            "kind": "series",
            "name": None if v.name is None else str(v.name),
            "index": [str(i) for i in v.index],
            "indexName": None if v.index.name is None else str(v.index.name),
            "values": _cells(v),
            "dtype": str(v.dtype),
        }
    if v is None:
        return None
    return {"kind": "value", "repr": repr(v), "str": str(v)}

def _figure(setup, steps):
    ns = {"pd": pd, "np": np, "io": io, "time": time}
    exec(setup, ns)
    out = {}
    for sid, code, mem in steps:
        tree = ast.parse(code)
        last = tree.body[-1] if tree.body and isinstance(tree.body[-1], ast.Expr) else None
        body = tree.body[:-1] if last else tree.body
        buf = io.StringIO()
        step = {"code": code}
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            try:
                with contextlib.redirect_stdout(buf):
                    if mem:
                        tracemalloc.start()
                        tracemalloc.reset_peak()
                    try:
                        exec(compile(ast.Module(body, []), "<step>", "exec"), ns)
                        value = eval(compile(ast.Expression(last.value), "<step>", "eval"), ns) if last else None
                    finally:
                        if mem:
                            step["peak"] = tracemalloc.get_traced_memory()[1]
                            tracemalloc.stop()
                step["ok"] = True
                step["value"] = _show(value)
            except Exception as e:
                step["ok"] = False
                step["error"] = f"{type(e).__name__}: {e}"
        step["stdout"] = buf.getvalue()
        step["warnings"] = [f"{w.category.__name__}: {w.message}" for w in caught]
        out[sid] = step
    return {"setup": setup, "steps": out}
`);

const results = {
  runtime: py.runPython("import sys, pandas; f'Pyodide / Python {sys.version.split()[0]} / pandas {pandas.__version__}'"),
  figures: {},
};
/** `steps` maps an id to its code, or to [code, "mem"] to measure its peak. */
const figure = (setup, steps) => {
  py.globals.set("_setup", setup);
  const list = Object.entries(steps).map(([id, s]) => (Array.isArray(s) ? [id, s[0], true] : [id, s, false]));
  py.globals.set("_steps", py.toPy(list));
  return JSON.parse(py.runPython("json.dumps(_figure(_setup, _steps))"));
};
const MEM = (code) => [code, "mem"];

/**
 * The video's own file, standing in for a log too big to load: one line per
 * order, "<fruit>,<quantity>", the page's own record shape, from a seeded
 * generator. A million lines is 8.2 MB on disk; a second file holds the first
 * hundred thousand lines, for the size the memory is compared at.
 */
const FILES = `import os, random
from collections import Counter

def _write(path, n):
    rng = random.Random(7)
    names = ["apple", "banana", "cherry", "plum"]
    with open(path, "w") as f:
        for _ in range(n):
            f.write(f"{names[rng.randrange(4)]},{rng.randrange(1, 10)}\\n")

_write("events.csv", 1_000_000)
_write("events_100k.csv", 100_000)

def parse_rows(f):
    for line in f:
        name, qty = line.strip().split(",")
        yield name, int(qty)
`;

// ── The opening, and 1: a generator against a list ─────────────────────────

/** The page's own block, then the same parse over the video's file, held as
 *  a list and streamed by the generator, at two sizes. */
results.figures.gen = figure(FILES, {
  page: `data = io.StringIO("apple,3\\nbanana,5\\napple,2\\ncherry,7\\n")
totals = Counter()
for name, qty in parse_rows(data):
    totals[name] += qty
print(dict(totals))`,
  bytes1m: 'os.path.getsize("events.csv")',
  bytes100k: 'os.path.getsize("events_100k.csv")',
  list100k: MEM(`with open("events_100k.csv") as f:
    rows = list(parse_rows(f))
total = sum(qty for _, qty in rows)
total`),
  gen100k: MEM(`with open("events_100k.csv") as f:
    total = sum(qty for _, qty in parse_rows(f))
total`),
  list1m: MEM(`with open("events.csv") as f:
    rows = list(parse_rows(f))
total = sum(qty for _, qty in rows)
total`),
  gen1m: MEM(`with open("events.csv") as f:
    total = sum(qty for _, qty in parse_rows(f))
total`),
});

// ── 2: a generator pipeline against intermediate lists ─────────────────────

/** The video's own pipeline, three stages, written twice: with square
 *  brackets every stage is a list, with round ones a generator. Same total. */
results.figures.pipe = figure(FILES, {
  lists: MEM(`with open("events.csv") as f:
    lines = [line for line in f]
    rows = [line.split(",") for line in lines]
    qtys = [int(r[1]) for r in rows]
    total = sum(qtys)
total`),
  gens: MEM(`with open("events.csv") as f:
    lines = (line for line in f)
    rows = (line.split(",") for line in lines)
    qtys = (int(r[1]) for r in rows)
    total = sum(qtys)
total`),
  // A list can be read again; the generator is spent after one pass.
  again: `with open("events.csv") as f:
    qtys = (int(line.split(",")[1]) for line in f)
    first = sum(qtys)
    second = sum(qtys)
(first, second)`,
});

// ── 3, 4: a file too big for memory; a large CSV in pandas ─────────────────

/** The three ways to read the video's 8.2 MB file, measured; then pandas,
 *  the whole file against chunks of 100,000 rows, folded into a Counter. */
results.figures.file = figure(FILES, {
  read: MEM(`with open("events.csv") as f:
    text = f.read()
len(text)`),
  readlines: MEM(`with open("events.csv") as f:
    lines = f.readlines()
len(lines)`),
  stream: MEM(`n = 0
with open("events.csv") as f:
    for line in f:
        n += 1
n`),
  whole: MEM(`df = pd.read_csv("events.csv", names=["name", "qty"])
totals = df.groupby("name")["qty"].sum().to_dict()
totals`),
  chunks: MEM(`totals = Counter()
for chunk in pd.read_csv("events.csv", names=["name", "qty"],
                         chunksize=100_000):
    part = chunk.groupby("name")["qty"].sum()
    totals.update(part.to_dict())
dict(totals)`),
  // The page's read_lines, with a print where it opens the file: building
  // the pipeline prints nothing, and the file opens on the first next().
  lazy: `def read_lines(path):
    print("opening", path)
    with open(path) as f:
        for line in f:
            yield line.rstrip("\\n")

rows = (line.split(",") for line in read_lines("events.csv"))
print("pipeline built")
print(next(rows))`,
  nChunks: 'sum(1 for _ in pd.read_csv("events.csv", names=["name", "qty"], chunksize=100_000))',
  // A mean does not fold: averaging the chunks' means is wrong when the last
  // chunk is short. 250,000 rows in chunks of 100,000: 100k, 100k, 50k.
  meanTrue: `head = pd.read_csv("events.csv", names=["name", "qty"], nrows=250_000)
round(float(head["qty"].mean()), 4)`,
  meanOfMeans: `means = [c["qty"].mean() for c in pd.read_csv("events.csv", names=["name", "qty"], nrows=250_000, chunksize=100_000)]
round(float(sum(means) / len(means)), 4)`,
  meanFolded: `s = n = 0
for c in pd.read_csv("events.csv", names=["name", "qty"], nrows=250_000, chunksize=100_000):
    s += c["qty"].sum()
    n += len(c)
round(float(s / n), 4)`,
});

// ── 5: an iterable against an iterator ──────────────────────────────────────

/** The page's four rows, in a file of the video's own ("orders.csv"). */
results.figures.iter = figure(
  `${FILES}
with open("orders.csv", "w") as f:
    f.write("apple,3\\nbanana,5\\napple,2\\ncherry,7\\n")`,
  {
    list: `rows = list(parse_rows(open("orders.csv")))
print(len(list(rows)), len(list(rows)))
iter(rows) is rows`,
    gen: `rows = parse_rows(open("orders.csv"))
print(len(list(rows)), len(list(rows)))
iter(rows) is rows`,
    trap: `rows = parse_rows(open("orders.csv"))
n = sum(1 for _ in rows)      # count them for the log
loaded = list(rows)           # then load them
print(n, len(loaded))`,
    // The page lists files among the iterables that hand out a fresh
    // iterator; a file object is its own iterator.
    file: 'f = open("orders.csv")\niter(f) is f',
    next: `rows = parse_rows(open("orders.csv"))
for _ in range(4):
    next(rows)
next(rows)`,
  },
);

// ── 6: why dict and set lookups are O(1), and when it matters ──────────────

/** The video's own count: deduplicating n distinct keys with a list, then a
 *  set, as "have I seen this?" inside a loop. A key whose __eq__ counts its
 *  calls gives the comparisons (as ListVsSet counted its scan). */
results.figures.hash = figure(
  `class Key:
    eqs = 0
    __slots__ = ("v",)
    def __init__(self, v):
        self.v = v
    def __eq__(self, other):
        Key.eqs += 1
        return self.v == other.v
    def __hash__(self):
        return hash(self.v)

def dedup_list(keys):
    seen = []
    for k in keys:
        if k not in seen:
            seen.append(k)
    return seen

def dedup_set(keys):
    seen = set()
    for k in keys:
        if k not in seen:
            seen.add(k)
    return seen

def compares(fn, n):
    keys = [Key(i) for i in range(n)]
    Key.eqs = 0
    fn(keys)
    return Key.eqs
`,
  {
    list5k: "compares(dedup_list, 5_000)",
    list10k: "compares(dedup_list, 10_000)",
    set10k: "compares(dedup_set, 10_000)",
  },
);

// ── 7, 8: deduplicating in memory; the latest record per key in pandas ─────

/** The page's dedup block (the first per user_id) and its latest-per-key
 *  block, with the challenge's plain-Python answer on the same rows. */
results.figures.dedup = figure(
  `records = [
    {"user_id": 1, "action": "login"},
    {"user_id": 2, "action": "login"},
    {"user_id": 1, "action": "click"},
    {"user_id": 3, "action": "login"},
]
df = pd.DataFrame({
    "id":    [1, 1, 2],
    "ts":    [10, 20, 5],
    "value": ["a", "b", "c"],
})`,
  {
    records: "pd.DataFrame(records)",
    first: `seen = set()
deduped = []
for r in records:
    if r["user_id"] not in seen:
        seen.add(r["user_id"])
        deduped.append(r)
print([r["user_id"] for r in deduped])`,
    frame: "df",
    latestDict: `latest = {}
for r in df.to_dict("records"):
    if r["id"] not in latest or r["ts"] > latest[r["id"]]["ts"]:
        latest[r["id"]] = r
print({k: v["value"] for k, v in latest.items()})`,
    latest: `latest = (df.sort_values("ts")
            .drop_duplicates("id", keep="last")
            .sort_values("id")
            .reset_index(drop=True))
latest`,
  },
);

// ── 9: joining two datasets in memory ───────────────────────────────────────

/** The page's join block; then an order whose user is missing (the video's
 *  own), which the plain lookup refuses and .get() keeps, as a left join. */
results.figures.join = figure(
  `users = [{"user_id": 1, "name": "Ada"}, {"user_id": 2, "name": "Lin"}]
orders = [
    {"order_id": 10, "user_id": 1, "amount": 40},
    {"order_id": 11, "user_id": 1, "amount": 60},
    {"order_id": 12, "user_id": 2, "amount": 25},
]`,
  {
    users: "pd.DataFrame(users)",
    orders: "pd.DataFrame(orders)",
    build: `by_id = {u["user_id"]: u["name"] for u in users}
by_id`,
    probe: `joined = [
    {"order_id": o["order_id"], "name": by_id[o["user_id"]], "amount": o["amount"]}
    for o in orders
]
for row in joined:
    print(row)`,
    missing: 'orders.append({"order_id": 13, "user_id": 3, "amount": 15})\n[by_id[o["user_id"]] for o in orders]',
    after: "pd.DataFrame(orders)",
    left: '[by_id.get(o["user_id"]) for o in orders]',
  },
);

// ── 10: fixed-size batches ──────────────────────────────────────────────────

/** The page's batching block, Python 3.12's itertools.batched on the same
 *  stream, and how many calls a million rows make in batches of 1,000. */
results.figures.batch = figure(
  `import itertools

def batched(iterable, n):
    it = iter(iterable)
    while True:
        chunk = list(itertools.islice(it, n))
        if not chunk:
            return
        yield chunk`,
  {
    page: "for batch in batched(range(7), 3):\n    print(batch)",
    builtin: "for batch in itertools.batched(range(7), 3):\n    print(batch)",
    calls: "sum(1 for _ in batched(range(1_000_000), 1_000))",
  },
);

// ── 11: retries with exponential backoff and jitter ────────────────────────

/** The page's retry block as it prints; a permanent error, which it does not
 *  retry; then the video's own model of an outage: six clients fail at the
 *  same moment and retry, without jitter and with full jitter, from a seeded
 *  generator. The delays are the page's formula with a 1 s base. */
results.figures.retry = figure(
  `import random

attempts = {"n": 0}
def flaky():                       # succeeds on the 3rd try
    attempts["n"] += 1
    if attempts["n"] < 3:
        raise ConnectionError("transient")
    return "ok"

def with_retries(fn, max_tries=5, base=0.01):
    for attempt in range(1, max_tries + 1):
        try:
            return fn()
        except ConnectionError as e:
            if attempt == max_tries:
                raise                          # give up
            delay = base * (2 ** (attempt - 1))  # exponential backoff
            print(f"attempt {attempt} failed ({e}); retry in {delay:.3f}s")
            time.sleep(delay)

calls = {"n": 0}
def bad_request():
    calls["n"] += 1
    raise ValueError("400 Bad Request: no such column")

def schedule(rng, tries=5, base=1.0, jitter=False):
    t, times = 0.0, []
    for attempt in range(1, tries):
        delay = base * (2 ** (attempt - 1))
        if jitter:
            delay = rng.uniform(0, delay)
        t += delay
        times.append(round(t, 2))
    return times`,
  {
    page: "print(with_retries(flaky))",
    permanent: "with_retries(bad_request)",
    permanentCalls: 'calls["n"]',
    delays: "[1.0 * (2 ** (attempt - 1)) for attempt in range(1, 5)]",
    plain: "[schedule(None) for _ in range(6)]",
    jittered: `rng = random.Random(42)
[schedule(rng, jitter=True) for _ in range(6)]`,
  },
);

// ── 12: an idempotent transform ─────────────────────────────────────────────

/** The page's upsert block, run twice; a blind append run twice; and a
 *  keyed write that adds instead of setting, run twice (the video's own). */
results.figures.idem = figure(
  `batch = [{"id": 1, "status": "new"}, {"id": 2, "status": "new"}]
payments = [{"id": 1, "amount": 40}, {"id": 2, "amount": 25}]`,
  {
    upsert: `state = {}
def upsert(events):
    for e in events:
        state[e["id"]] = e["status"]   # keyed write, not append
upsert(batch)
upsert(batch)          # re-run after a "failure"
print(state)`,
    append: `log = []
def append(events):
    for e in events:
        log.append(e["status"])        # blind append
append(batch)
append(batch)
print(log)`,
    adds: `totals = {}
def add(events):
    for e in events:
        totals[e["id"]] = totals.get(e["id"], 0) + e["amount"]
add(payments)
add(payments)
print(totals)`,
  },
);

// ── 13, 14: messy delimited records; malformed numbers and dates ───────────

/** The page's cleaning block; the same rows with a quoted name, split by
 *  hand and by the csv module; rejects kept with their reason; then pandas
 *  and datetime on the video's own malformed values. */
results.figures.clean = figure(
  `import csv
from datetime import datetime

raw = ["  1, Alice , 30 ", "2,Bob,", "3, Carol , 25", "bad row"]

def clean(rows):
    out = []
    for row in rows:
        parts = [p.strip() for p in row.split(",")]
        if len(parts) != 3:            # skip malformed
            continue
        rid, name, age = parts
        out.append({
            "id": int(rid),
            "name": name,
            "age": int(age) if age else None,   # tolerate missing age
        })
    return out`,
  {
    page: "for rec in clean(raw):\n    print(rec)",
    quoted: `line = '4,"Smith, Jo",41'
print(line.split(","))
print(next(csv.reader([line])))`,
    quarantine: `good, rejects = [], []
for n, row in enumerate(csv.reader(raw + ['4,"Smith, Jo",41'])):
    try:
        rid, name, age = (p.strip() for p in row)
        good.append((int(rid), name, int(age) if age else None))
    except ValueError as e:
        rejects.append((n, str(e)))
print(len(good), "kept")
print(rejects)`,
    numeric: `amounts = pd.Series(["12.5", "n/a", "1,200", "7"])
pd.to_numeric(amounts, errors="coerce")`,
    badCount: 'int(pd.to_numeric(amounts, errors="coerce").isna().sum())',
    dates: `for s in ["2026-10-30", "30/10/2026", "2026-02-30"]:
    try:
        print(datetime.strptime(s, "%Y-%m-%d").date())
    except ValueError as e:
        print("ValueError:", e)`,
  },
);

// ── The quick round, 15 to 18 ───────────────────────────────────────────────

/** The page's running-aggregate block. */
results.figures.stream = figure(
  `from collections import defaultdict
stream = [("us", 3), ("eu", 5), ("us", 2), ("eu", 1), ("us", 4)]`,
  {
    running: `running = defaultdict(int)
for region, n in stream:
    running[region] += n
print(dict(running))`,
  },
);
/** The page's groupby block. */
results.figures.groupby = figure(
  `df = pd.DataFrame({
    "region": ["us", "eu", "us", "eu"],
    "amount": [100, 200, 50, 25],
})`,
  {
    agg: `agg = (df.groupby("region", as_index=False)["amount"]
         .sum()
         .sort_values("region"))
agg`,
  },
);
/** The page's pitfall (2): a string built by += in a loop, against one
 *  join, the same text either way (the video's own rows). */
results.figures.pitfall = figure(`rows = [f"{i},{i % 7}" for i in range(5)]`, {
  concat: `out = ""
for r in rows:
    out += r + "\\n"
out == "\\n".join(rows) + "\\n"`,
});

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps)
    .filter(([, s]) => !s.ok)
    .map(([id, s]) => `${f}.${id}: ${s.error}`),
);
const warned = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps)
    .filter(([, s]) => s.warnings.length)
    .map(([id, s]) => `${f}.${id}: ${s.warnings.join(" | ")}`),
);
console.log(`wrote ${fileURLToPath(out)} (${results.runtime})`);
console.log(failed.length ? `errors, as expected where a figure shows one:\n  ${failed.join("\n  ")}` : "no errors");
console.log(warned.length ? `warnings:\n  ${warned.join("\n  ")}` : "no warnings");
