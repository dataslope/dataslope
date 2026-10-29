// Runs every snippet the da-pandas video shows in Pyodide 314.0.7 with
// pandas 3.0.2, the runtime the Data Analyst pandas page's blocks run in the
// reader's browser, and writes what came back to results.json, which data.ts
// reads. From the repo root, where the pyodide package (and its pandas wheel)
// is installed:
//
//   node video/src/videos/da-pandas/check.mjs
//
// Each figure runs in a fresh namespace built by its own setup; its steps then
// run in order in that namespace, as cells of one notebook would. A step's last
// expression is its value, the way a block auto-displays its last line. Values
// come back the way pandas prints them: every cell of a column formatted by
// pandas itself (Series.to_string), so floats share a column's precision and a
// missing value reads NaN. Errors and warnings keep pandas' own wording.
// Tables are the page's own (content/interview/data-analyst/pandas.mdx)
// wherever the page has one; the rest are marked "the video's own" below and
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
import ast, contextlib, io, json, warnings
import numpy as np
import pandas as pd

def _cells(s):
    if len(s) == 0:
        return []
    # Without its index, so no "Freq: D" footer comes along as a cell.
    text = s.reset_index(drop=True).to_string(index=False, header=False, na_rep="NaN")
    return [t.strip() for t in text.split("\\n")]

def _labels(index):
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
    ns = {"pd": pd, "np": np, "io": io}
    shown = []
    ns["display"] = lambda x: shown.append(_show(x))
    exec(setup, ns)
    out = {}
    for sid, code in steps:
        tree = ast.parse(code)
        last = tree.body[-1] if tree.body and isinstance(tree.body[-1], ast.Expr) else None
        body = tree.body[:-1] if last else tree.body
        buf = io.StringIO()
        shown.clear()
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
        step["displays"] = list(shown)
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

// ── 1, 2. loc and iloc; boolean filtering ───────────────────────────────────

/** The page's loc/iloc block. */
results.figures.loc = figure(
  `df = pd.DataFrame({
    "region": ["South", "East", "North", "West", "North"],
    "amount": [80, 200, 120, 50, 60],
})`,
  {
    frame: "df",
    loc: 'df.loc[3, "amount"]',
    iloc: "df.iloc[3, 1]",
    north: 'north = df[df["region"] == "North"]\nnorth',
    northIloc: "north.iloc[0]",
    northLoc: "north.loc[0]",
    northLabel: "north.loc[2]",
    // A slice: loc includes its end label, iloc stops before its end position.
    locSlice: "df.loc[0:2]",
    ilocSlice: "df.iloc[0:2]",
  },
);

/** The page's boolean-filter block. */
results.figures.filter = figure(
  `df = pd.DataFrame({
    "region": ["North", "South", "North", "East", "North"],
    "amount": [120, 80, 60, 200, 150],
})`,
  {
    frame: "df",
    // One comparison on its own, before the two are combined.
    gt: 'df["amount"] > 100',
    noParens: 'df[df["amount"] > 100 & df["region"] == "North"]',
    andWord: 'df[(df["amount"] > 100) and (df["region"] == "North")]',
    mask: 'mask = (df["amount"] > 100) & (df["region"] == "North")\nmask',
    result: "df.loc[mask]",
  },
);

// ── 3, 4, 5. groupby, transform against agg, a share of a group ─────────────

/** The page's percentage-of-group block, used for all three questions so the
 *  scene keeps one table. */
results.figures.groupby = figure(
  `df = pd.DataFrame({
    "region": ["North", "North", "South", "South", "East"],
    "amount": [100, 60, 80, 120, 50],
})`,
  {
    frame: "df",
    // groupby on its own computes nothing: it is a GroupBy object.
    object: 'type(df.groupby("region"))',
    sum: 'df.groupby("region")["amount"].sum()',
    agg: 'df.groupby("region").agg(\n    total=("amount", "sum"),\n    n=("amount", "size"),\n)',
    aggMean: 'df.groupby("region")["amount"].agg("mean")',
    transform: 'df.groupby("region")["amount"].transform("mean")',
    // The region totals question 5 divides by.
    transformSum: 'df.groupby("region")["amount"].transform("sum")',
    pct: 'df["pct_of_region"] = (\n    df["amount"] / df.groupby("region")["amount"].transform("sum") * 100\n)\ndf',
  },
);

// ── 6, 7, 8. merge, concat and join; several keys; stacking ─────────────────

/** The video's own: two months of orders, the customers they name, and stock
 *  and prices keyed by product and warehouse together. */
results.figures.merge = figure(
  `jan = pd.DataFrame({"order_id": [1, 2], "customer_id": [1, 2], "amount": [100, 80]})
feb = pd.DataFrame({"order_id": [3, 4], "customer_id": [2, 3], "amount": [50, 70]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "name": ["Ava", "Ben", "Cy"]})
stock = pd.DataFrame({"product_id": [7, 7], "warehouse": ["A", "B"], "qty": [5, 3]})
prices = pd.DataFrame({"product_id": [7, 7], "warehouse": ["A", "B"], "price": [10, 12]})`,
  {
    jan: "jan",
    feb: "feb",
    customers: "customers",
    stacked: "pd.concat([jan, feb])",
    // Label 0 now names two orders.
    dupLabel: "pd.concat([jan, feb]).loc[0]",
    stackedClean: "orders = pd.concat([jan, feb], ignore_index=True)\norders",
    merged: 'pd.merge(orders, customers,\n         on="customer_id", how="left")',
    stock: "stock",
    prices: "prices",
    oneKey: 'pd.merge(stock, prices, on="product_id")',
    twoKeys: 'pd.merge(stock, prices, on=["product_id", "warehouse"])',
  },
);

// ── 9, 10. Missing data; ffill and bfill ────────────────────────────────────

/** The page's missing-data block. */
results.figures.missing = figure(
  `df = pd.DataFrame({
    "region": ["North", "South", None, "East"],
    "amount": [100.0, np.nan, 80.0, np.nan],
})`,
  {
    frame: "df",
    isnaSum: "df.isna().sum()",
    equalsNan: '(df["amount"] == np.nan).sum()',
    isnaAmount: 'df["amount"].isna().sum()',
    dropna: 'df.dropna(subset=["amount"])',
    fillna: 'df["amount"].fillna(0)',
  },
);

/** The video's own: a daily price with gaps, for ffill and bfill. */
results.figures.fill = figure(
  `price = pd.Series([10.0, np.nan, np.nan, 12.0, np.nan],
                  index=pd.date_range("2026-01-05", periods=5, freq="D"))`,
  {
    filled: 'pd.DataFrame({"price": price, "ffill": price.ffill(), "bfill": price.bfill()})',
  },
);

// ── 11, 12. Chained assignment, views and copies ────────────────────────────

/** The page's view-and-copy block, under pandas 3's copy-on-write. */
const COPY_SETUP = `df = pd.DataFrame({
    "region": ["North", "South", "North", "East"],
    "amount": [100, 80, 120, 50],
})`;
results.figures.chained = figure(COPY_SETUP, {
  frame: "df",
  chained: 'df[df["region"] == "North"]["amount"] = 0\ndf',
  loc: 'mask = df["region"] == "North"\ndf.loc[mask, "amount"] = 0\ndf',
});
results.figures.subset = figure(COPY_SETUP, {
  // The page's line: a subset meant to be separate says so with .copy(),
  // which keeps the parent unchanged in every version of pandas.
  subset: 'north = df[df["region"] == "North"].copy()\nnorth["amount"] = 0\nnorth',
  parent: "df",
  version: "pd.__version__",
});

// ── 13, 14, 15. Vectorization, apply by row or column, map ──────────────────

/** The page's apply and vectorization blocks; the million rows are the
 *  video's own. What is counted is calls, not seconds: a timing changes from
 *  run to run, and the page's own "10-100x" already says how much. */
results.figures.vectorize = figure(
  `df = pd.DataFrame({"amount": [80, 120, 50, 200, 90]})`,
  {
    frame: "df",
    vectorized: 'df["amount"] * 0.9',
    applied: 'df["amount"].apply(lambda x: x * 0.9)',
    calls: `calls = 0
def discount(x):
    global calls
    calls += 1
    return x * 0.9
big = pd.Series(np.arange(1_000_000))
_ = big.apply(discount)
calls`,
  },
);

/** The page's map / apply / DataFrame.map block. */
results.figures.map = figure(
  `df = pd.DataFrame({
    "region": ["North", "South", "East"],
    "q1": [100.555, 80.123, 50.789],
    "q2": [120.111, 90.456, 60.321],
})`,
  {
    frame: "df",
    seriesMap: 'df["region"].map({"North": "N", "South": "S", "East": "E"})',
    byColumn: 'df[["q1", "q2"]].apply(lambda col: col.max() - col.min(), axis=0)',
    byRow: 'df[["q1", "q2"]].apply(lambda row: row.max() - row.min(), axis=1)',
    frameMap: 'df[["q1", "q2"]].map(lambda x: round(x, 2))',
  },
);

// ── 16, 17. Wide to long; pivot against pivot_table ─────────────────────────

/** The page's melt and pivot_table calls on the video's own rows. */
results.figures.reshape = figure(
  `wide = pd.DataFrame({"customer_id": [1, 2], "q1_sales": [100, 80], "q2_sales": [120, 90]})
long = pd.DataFrame({
    "region": ["North", "North", "South", "North"],
    "category": ["A", "A", "B", "B"],
    "amount": [10, 20, 30, 40],
})`,
  {
    wide: "wide",
    melted: `wide.melt(
    id_vars=["customer_id"],
    value_vars=["q1_sales", "q2_sales"],
    var_name="quarter",
    value_name="sales",
)`,
    long: "long",
    pivot: 'long.pivot(index="region", columns="category", values="amount")',
    // pivot_table's default aggfunc is the mean.
    pivotMean: 'long.pivot_table(index="region", columns="category", values="amount")',
    pivotTable: `long.pivot_table(
    index="region",
    columns="category",
    values="amount",
    aggfunc="sum",
    fill_value=0,
)`,
  },
);

// ── Rapid fire, questions 18 to 30: the page's own blocks ───────────────────

results.figures.categorical = figure(
  `df = pd.DataFrame({
    "region": ["North", "South", "East", "West", "North", "South"] * 50,
    "amount": list(range(300)),
})`,
  {
    before: 'int(df["region"].memory_usage(deep=True, index=False))',
    convert: 'df["region"] = df["region"].astype("category")\nlist(df["region"].cat.categories)',
    after: 'int(df["region"].memory_usage(deep=True, index=False))',
  },
);
/** The page's sort and rank calls, on the video's own amounts: a tie at 120,
 *  so min and dense ranking differ. */
results.figures.sort = figure(
  `df = pd.DataFrame({"region": ["North", "South", "East", "West"], "amount": [120, 80, 200, 120]})`,
  {
    sorted: 'df.sort_values(by="amount", ascending=False)',
    rankMin: 'df["min"] = df["amount"].rank(method="min", ascending=False)\ndf',
    ranked: 'df["dense"] = df["amount"].rank(method="dense", ascending=False)\ndf',
  },
);
results.figures.counts = figure(
  `df = pd.DataFrame({"region": ["North", "South", "North", "East", "South", "North"]})`,
  {
    counts: 'df["region"].value_counts()',
    shares: 'df["region"].value_counts(normalize=True).round(3)',
  },
);
/** The video's own dates and amounts, for .dt and resample. */
results.figures.dates = figure(
  `df = pd.DataFrame({
    "date": ["2026-01-05", "2026-01-17", "2026-01-30", "2026-02-03", "2026-02-20"],
    "amount": [100, 80, 120, 50, 70],
})`,
  {
    parsed: 'df["date"] = pd.to_datetime(df["date"])\ndf["date"].dtype',
    parts: 'df.assign(\n    year=df["date"].dt.year,\n    month=df["date"].dt.month,\n    weekday=df["date"].dt.day_name(),\n)',
    monthly: 'df.set_index("date").resample("ME")["amount"].sum()',
  },
);
results.figures.chain = figure(
  `df = pd.DataFrame({
    "region": ["North", "South", "North", "East", "South"],
    "amount": [100, -20, 80, 50, 70],
})`,
  {
    result: `(
    df
    .query("amount > 0")
    .assign(tax=lambda x: x["amount"] * 0.08)
    .groupby("region")["tax"]
    .sum()
    .reset_index()
    .rename(columns={"tax": "total_tax"})
)`,
  },
);
results.figures.duplicates = figure(
  `df = pd.DataFrame({
    "email": ["a@x.com", "b@x.com", "a@x.com", "c@x.com", "b@x.com"],
    "name":  ["Alice", "Bob", "Alice2", "Carol", "Bob2"],
})`,
  {
    frame: "df",
    // Compared on every column, no row repeats: the subset is what finds them.
    countAll: "int(df.duplicated().sum())",
    count: 'int(df.duplicated(subset=["email"]).sum())',
    clean: 'df.drop_duplicates(subset=["email"], keep="first")',
  },
);
results.figures.rename = figure(`df = pd.DataFrame({"cust_id": [1, 2, 3], "amt": [100, 200, 300]})`, {
  before: "df.columns.tolist()",
  after: 'df = df.rename(columns={"cust_id": "customer_id", "amt": "amount"})\ndf.columns.tolist()',
});
results.figures.dtypes = figure(
  `df = pd.DataFrame({"region": ["North", "South"], "amount": [100, 200], "score": [0.8, 0.9]})`,
  {
    numeric: 'df.select_dtypes(include="number").columns.tolist()',
  },
);
results.figures.case = figure(`df = pd.DataFrame({"amount": [50, 120, 600, 80, 550]})`, {
  where: 'np.where(df["amount"] >= 500, "Large", "Small")',
  sized: `conditions = [df["amount"] >= 500, df["amount"] >= 100]
choices = ["Large", "Medium"]
df["size"] = np.select(conditions, choices, default="Small")
df`,
});
/** The video's own two rows, written to a CSV file and read back, as the
 *  page's calls do (Pyodide has a filesystem in memory). Each write's second
 *  line reads the file's text back for the console; the listing shows the
 *  first. */
results.figures.csv = figure(
  `from pathlib import Path
df = pd.DataFrame({"region": ["North", "South"], "amount": [100, 80]})`,
  {
    withIndex: 'df.to_csv("sales.csv")\nPath("sales.csv").read_text()',
    readBack: 'pd.read_csv("sales.csv")',
    withoutIndex: 'df.to_csv("sales.csv", index=False)\nPath("sales.csv").read_text()',
    readClean: 'pd.read_csv("sales.csv")',
  },
);
results.figures.query = figure(
  `df = pd.DataFrame({"region": ["North", "South", "North", "East"], "amount": [120, 80, 60, 200]})`,
  {
    result: 'threshold = 100\ndf.query("amount > @threshold")',
  },
);
results.figures.shape = figure(
  `df = pd.DataFrame({
    "region": ["North", "South", "East", "West"],
    "amount": [100, 80, 200, 50],
    "flag":   [True, False, True, False],
})`,
  {
    shape: "df.shape",
    dtypes: "df.dtypes",
    memory: "int(df.memory_usage(deep=True).sum())",
    // All three at once, with the non-null counts.
    info: "df.info()",
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
