// Runs every snippet the ds-python-pandas video shows in Pyodide 314.0.7 with
// pandas 3.0.2, the runtime the Data Scientist Python & pandas page's blocks
// run in the reader's browser, and writes what came back to results.json,
// which data.ts reads. From the repo root, where the pyodide package (and its
// pandas wheel) is installed:
//
//   node video/src/videos/ds-python-pandas/check.mjs
//
// The harness is the one DA Part 2 (da-pandas/check.mjs) uses, so the two
// series print pandas the same way: each figure runs in a fresh namespace
// built by its own setup, its steps run in order like cells of one notebook,
// and a step's last expression is its value. Cells come back formatted by
// pandas itself; errors and warnings keep pandas' own wording.
//
// Tables are the page's own (content/interview/data-scientist/
// python-and-pandas.mdx) wherever the page has one. Where DA Part 2 answered
// the same question, the same frame is used so the two series agree (the
// share of a region, the chained assignment, the category's bytes). The rest
// are marked "the video's own" below and in script.ts.
/* global console, URL */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "pandas"] });

py.runPython(`
import ast, contextlib, io, json, time, warnings
import numpy as np
import pandas as pd

def _cells(s):
    if len(s) == 0:
        return []
    text = s.reset_index(drop=True).to_string(index=False, header=False, na_rep="NaN")
    return [t.strip() for t in text.split("\\n")]

def _labels(index):
    if isinstance(index, pd.MultiIndex):
        return [" ".join(str(p) for p in t) for t in index]
    return [str(i.date()) if isinstance(i, pd.Timestamp) and i == i.normalize() else str(i) for i in index]

def _show(v):
    if isinstance(v, pd.DataFrame):
        cols = [_cells(v.iloc[:, j]) for j in range(v.shape[1])]
        return {
            "kind": "frame",
            "index": _labels(v.index),
            "indexName": None if v.index.name is None else str(v.index.name),
            "columns": [str(c) for c in v.columns],
            "rows": [list(r) for r in zip(*cols)] if cols else [[] for _ in range(len(v))],
            "dtypes": [str(t) for t in v.dtypes],
        }
    if isinstance(v, pd.Series):
        return {
            "kind": "series",
            "name": None if v.name is None else str(v.name),
            "index": _labels(v.index),
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
    for sid, code in steps:
        tree = ast.parse(code)
        last = tree.body[-1] if tree.body and isinstance(tree.body[-1], ast.Expr) else None
        body = tree.body[:-1] if last else tree.body
        buf = io.StringIO()
        step = {"code": code}
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            try:
                with contextlib.redirect_stdout(buf):
                    exec(compile(ast.Module(body, []), "<step>", "exec"), ns)
                    value = eval(compile(ast.Expression(last.value), "<step>", "eval"), ns) if last else None
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

const results = { runtime: py.runPython("import sys, pandas; f'Pyodide / Python {sys.version.split()[0]} / pandas {pandas.__version__}'"), figures: {} };
const figure = (setup, steps) => {
  py.globals.set("_setup", setup);
  py.globals.set("_steps", py.toPy(Object.entries(steps)));
  return JSON.parse(py.runPython("json.dumps(_figure(_setup, _steps))"));
};

// ── The opening: the merge that runs and is wrong, and the plan ─────────────

/** The video's own: four orders, and a customer table where customer 2 has
 *  two rows (the address changed, and the old row was kept). The same frames
 *  carry question 6. */
const FAN_SETUP = `orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1, 2, 2, 3], "amount": [100, 80, 30, 55]})
customers = pd.DataFrame({
    "customer_id": [1, 2, 2, 3],
    "city": ["Lyon", "Oslo", "Bergen", "Porto"],
})`;
results.figures.fanout = figure(FAN_SETUP, {
  orders: "orders",
  customers: "customers",
  before: "len(orders), int(orders['amount'].sum())",
  merged: 'merged = orders.merge(customers, on="customer_id", how="left")\nmerged',
  after: "len(merged), int(merged['amount'].sum())",
  unique: 'customers["customer_id"].is_unique',
  validate: 'orders.merge(customers, on="customer_id", how="left",\n             validate="many_to_one")',
  counts: 'customers["customer_id"].value_counts()',
});

/** The video's own: the fourteen questions, counted the pandas way. */
results.figures.plan = figure(
  `questions = pd.DataFrame({"pace": ["worked"] * 9 + ["quick"] * 5})`,
  {
    size: 'questions.groupby("pace", sort=False).size()',
  },
);

// ── 1. Vectorization against a Python loop ─────────────────────────────────

/** The page's vectorization block, then the same product on a million rows
 *  (the video's own size), timed: best of 3 for the loop, best of 30 for the
 *  vectorized line. Measured in WebAssembly, so these are not a laptop's
 *  times; the script says so and speaks no exact ratio, because the
 *  vectorized time alone moves between about 0.9 and 1.8 ms from run to run
 *  (the screen prints the ratio of whatever ran last, rounded, in data.ts).
 *  Between them, the same revenues from .apply with a lambda, a loop too. */
results.figures.vector = figure(
  `df = pd.DataFrame({"price": np.arange(1, 6), "qty": np.arange(5, 0, -1)})
n = 1_000_000
big = pd.DataFrame({"price": np.arange(n) % 5 + 1, "qty": 5 - np.arange(n) % 5})

def _loop(frame):
    revenue = []
    for p, q in zip(frame["price"], frame["qty"]):
        revenue.append(p * q)
    return revenue

def _best(f, k):
    ts = []
    for _ in range(k):
        t = time.perf_counter()
        f()
        ts.append(time.perf_counter() - t)
    return min(ts)`,
  {
    frame: "df",
    loop: `revenue = []
for p, q in zip(df["price"], df["qty"]):
    revenue.append(p * q)
df["revenue"] = revenue
df`,
    vectorized: 'df["revenue"] = df["price"] * df["qty"]\ndf',
    // The follow-up: .apply with a lambda is the same Python loop, once per
    // row. Run here so the listing on screen is code that ran and agrees.
    apply: `df["revenue"] = df.apply(
    lambda r: r["price"] * r["qty"], axis=1
)
df`,
    same: '_loop(big) == list(big["price"] * big["qty"])',
    loopMs: "round(_best(lambda: _loop(big), 3) * 1000, 1)",
    vecMs: 'round(_best(lambda: big["price"] * big["qty"], 30) * 1000, 2)',
  },
);

// ── 2. Split-apply-combine, and what groupby returns ────────────────────────

/** The page's split-apply-combine block. */
results.figures.split = figure(
  `df = pd.DataFrame({
    "region": ["North", "South", "North", "East", "South", "North"],
    "amount": [100, 80, 80, 50, 70, 60],
})`,
  {
    frame: "df",
    grouped: 'type(df.groupby("region")).__name__',
    one: 'df.groupby("region")["amount"].sum()',
    named: `df.groupby("region").agg(
    total=("amount", "sum"),
    n=("amount", "size"),
    avg=("amount", "mean"),
)`,
    flat: 'df.groupby("region", as_index=False)["amount"].sum()',
  },
);

// ── 3, 4. agg, transform and apply; a percentage of each group ──────────────

/** The page's transform and percentage blocks (one frame: North 100 and 60,
 *  South 80 and 120, East 50), which DA Part 2 used too, so "62.5" agrees. */
results.figures.shapes = figure(
  `df = pd.DataFrame({
    "region": ["North", "North", "South", "South", "East"],
    "amount": [100, 60, 80, 120, 50],
})`,
  {
    frame: "df",
    agg: 'df.groupby("region")["amount"].agg("sum")',
    transform: 'df.groupby("region")["amount"].transform("sum")',
    apply: 'df.groupby("region").apply(lambda g: g.nlargest(1, "amount"))',
    pct: `df["pct_of_region"] = (
    df["amount"] / df.groupby("region")["amount"].transform("sum") * 100
)
df.round(1)`,
  },
);

// ── 5. merge, join and concat ───────────────────────────────────────────────

/** The page's merge block, then join and concat on the same frames (the
 *  second month of orders is the video's own). */
results.figures.combine = figure(
  `orders = pd.DataFrame({"customer_id": [1, 2, 2, 3], "amount": [100, 80, 30, 55]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "name": ["Ava", "Ben", "Cy", "Di"]})
march = pd.DataFrame({"customer_id": [4, 1], "amount": [40, 70]})`,
  {
    orders: "orders",
    customers: "customers",
    merged: 'orders.merge(customers, on="customer_id", how="left")',
    joined: 'orders.join(customers.set_index("customer_id"), on="customer_id")',
    stacked: "pd.concat([orders, march], ignore_index=True)",
  },
);

// ── 7. Missing data ─────────────────────────────────────────────────────────

/** The page's missing-data block. */
results.figures.missing = figure(
  `df = pd.DataFrame({"region": ["N", "S", None, "E"], "amount": [100.0, np.nan, 80.0, np.nan]})`,
  {
    frame: "df",
    nanEq: "np.nan == np.nan",
    eqCount: 'int((df["amount"] == np.nan).sum())',
    isnaSum: "df.isna().sum()",
    mean: 'df["amount"].mean()',
    filled: 'df["amount"] = df["amount"].fillna(df["amount"].mean())\ndf',
  },
);

// ── 8. SettingWithCopyWarning, under pandas 3's copy-on-write ───────────────

/** DA Part 2's view-and-copy frame, so the two series agree. */
const COPY_SETUP = `df = pd.DataFrame({
    "region": ["North", "South", "North", "East"],
    "amount": [100, 80, 120, 50],
})`;
results.figures.chained = figure(COPY_SETUP, {
  frame: "df",
  chained: 'df[df["region"] == "North"]["amount"] = 0\ndf',
  loc: 'df.loc[df["region"] == "North", "amount"] = 0\ndf',
  version: "pd.__version__",
});
results.figures.subset = figure(COPY_SETUP, {
  subset: 'subset = df[df["region"] == "North"].copy()\nsubset["amount"] = 0\nsubset',
  parent: "df",
});

// ── 9. Wide to long and back ────────────────────────────────────────────────

/** The page's reshape block. */
results.figures.reshape = figure(
  `wide = pd.DataFrame({
    "user": ["a", "b"],
    "q1": [10, 20],
    "q2": [15, 25],
})`,
  {
    wide: "wide",
    long: 'long = wide.melt(id_vars="user", var_name="quarter", value_name="sales")\nlong',
    back: 'long.pivot(index="user", columns="quarter", values="sales")',
  },
);

// ── Quick round, questions 10 to 14 ─────────────────────────────────────────

/** The page's map / apply block. */
results.figures.map = figure(
  `df = pd.DataFrame({"region": ["North", "South", "East"], "amount": [100, 80, 50]})`,
  {
    code: 'df["code"] = df["region"].map({"North": "N", "South": "S", "East": "E"})\ndf["code"]',
    label: `df["label"] = df.apply(lambda r: f"{r['code']}:{r['amount']}", axis=1)\ndf`,
    cells: 'df[["amount"]].map(lambda x: x * 2)',
  },
);
/** The page's method-chaining block. */
results.figures.chain = figure(
  `df = pd.DataFrame({
    "region": ["North", "South", "North", "East", "South"],
    "amount": [100, -20, 80, 50, 70],
})`,
  {
    result: `(
    df
    .query("amount > 0")
    .assign(tax=lambda d: d["amount"] * 0.08)
    .groupby("region", as_index=False)["tax"].sum()
)`,
  },
);
/** The page's CASE block, and the same rule with pandas' own case_when. */
results.figures.case = figure(`df = pd.DataFrame({"amount": [50, 120, 600, 80, 550]})`, {
  select: `conditions = [df["amount"] >= 500, df["amount"] >= 100]
choices = ["Large", "Medium"]
df["size"] = np.select(conditions, choices, default="Small")
df`,
  caseWhen: `pd.Series("Small", index=df.index).case_when([
    (df["amount"] >= 500, "Large"),
    (df["amount"] >= 100, "Medium"),
])`,
  bare: `df["amount"].case_when([(df["amount"] >= 500, "Large"), (df["amount"] >= 100, "Medium")])`,
});
/** DA Part 2's categorical block (300 regions), so the bytes agree; and an
 *  ordered category, the page's low < medium < high. */
results.figures.category = figure(
  `df = pd.DataFrame({
    "region": ["North", "South", "East", "West", "North", "South"] * 50,
    "amount": list(range(300)),
})
size = pd.Series(["high", "low", "medium", "low"])`,
  {
    before: 'int(df["region"].memory_usage(deep=True, index=False))',
    after: 'df["region"] = df["region"].astype("category")\nint(df["region"].memory_usage(deep=True, index=False))',
    ordered: `size = size.astype(pd.CategoricalDtype(["low", "medium", "high"], ordered=True))
size > "low"`,
  },
);
/** The video's own dates (DA Part 2's), binned by week this time. */
results.figures.dates = figure(
  `df = pd.DataFrame({
    "date": ["2026-01-05", "2026-01-07", "2026-01-13", "2026-01-15", "2026-01-21"],
    "amount": [100, 80, 120, 50, 70],
})`,
  {
    parsed: 'df["date"] = pd.to_datetime(df["date"])\nstr(df["date"].dtype)',
    weekday: 'df["date"].dt.day_name()',
    weekly: 'df.set_index("date")["amount"].resample("W").sum()',
  },
);

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
