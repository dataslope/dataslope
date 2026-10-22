// Measures every number and every dot the da-statistics-communication video shows, in Pyodide
// 314.0.7 with pandas 3.0.2 and NumPy, the runtime the Data Analyst
// statistics page's blocks run in the reader's browser, and writes what came
// back to results.json, which data.ts reads. Random data comes from NumPy's
// seeded default_rng, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/da-statistics-communication/check.mjs
//
// Each figure runs in a fresh namespace built by its own setup; its steps then
// run in order in that namespace, as cells of one notebook would. A step's last
// expression is its value, the way a block auto-displays its last line. Values
// come back the way pandas prints them: every cell of a column formatted by
// pandas itself (Series.to_string), so floats share a column's precision and a
// missing value reads NaN. Errors and warnings keep pandas' own wording.
// Data is the page's own (content/interview/data-analyst/
// statistics-and-communication.mdx) or the Statistics course's wherever one
// has it; the rest is marked "the video's own" below and in script.ts.
/* global console, URL */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "pandas", "scipy"] });

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
    if isinstance(v, (list, tuple, dict)):
        return {"kind": "json", "value": json.loads(json.dumps(v, default=lambda o: o.item() if hasattr(o, "item") else str(o)))}
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

// ── 1. The median, on skewed data ───────────────────────────────────────────

/** The Statistics course's own 500 orders (measures-of-center.mdx, "Putting
 *  it together", seed 7), binned at $2 for the histogram. */
results.figures.orders = figure(
  `rng = np.random.default_rng(7)
orders = pd.Series(np.round(rng.lognormal(mean=3.2, sigma=0.6, size=500), 2))`,
  {
    mean: "round(float(orders.mean()), 2)",
    median: "round(float(orders.median()), 2)",
    above: "int((orders > orders.mean()).sum())",
    max: "float(orders.max())",
    counts: "np.histogram(orders, bins=np.arange(0, 116, 2))[0].tolist()",
  },
);

// ── 2, 3. Correlation and causation; what r measures ────────────────────────

/** The page's example, simulated (the video's own numbers): 120 summer days,
 *  ice-cream sales and drownings each driven by the temperature alone.
 *  Held at a fixed temperature (the partial correlation: what is left of
 *  each once the temperature's straight-line effect is taken out), the two
 *  have nothing to do with each other. */
results.figures.confound = figure(
  `rng = np.random.default_rng(11)
temp = rng.uniform(15, 35, 200).round(1)
ice = (20 * temp + rng.normal(0, 60, 200)).round()
drown = rng.poisson(0.25 * (temp - 10))
days = pd.DataFrame({"temp": temp, "ice": ice, "drown": drown})`,
  {
    r: 'round(float(days["ice"].corr(days["drown"])), 2)',
    rTempIce: 'round(float(days["temp"].corr(days["ice"])), 2)',
    rTempDrown: 'round(float(days["temp"].corr(days["drown"])), 2)',
    partial: `def residual(col):
    slope, intercept = np.polyfit(days["temp"], days[col], 1)
    return days[col] - (slope * days["temp"] + intercept)
round(float(residual("ice").corr(residual("drown"))), 2)`,
    points: 'days[["temp", "ice", "drown"]].values.tolist()',
  },
);

/** The video's own: a U and an exponential curve, r against Spearman. */
results.figures.shape = figure(
  `x = np.linspace(-3, 3, 41)
u = pd.DataFrame({"x": x, "y": x ** 2})
e = pd.DataFrame({"x": x, "y": np.exp(x)})`,
  {
    uPearson: 'round(float(u["x"].corr(u["y"])), 2)',
    uSpearman: 'round(float(u["x"].corr(u["y"], method="spearman")), 2)',
    ePearson: 'round(float(e["x"].corr(e["y"])), 2)',
    eSpearman: 'round(float(e["x"].corr(e["y"], method="spearman")), 2)',
    u: 'u.round(3).values.tolist()',
    e: 'e.round(3).values.tolist()',
  },
);

// ── 4. Sampling bias ────────────────────────────────────────────────────────

/** The video's own: 100,000 users' satisfaction, the unhappy more likely to
 *  have churned, surveyed among those still active. Thirty surveys at each
 *  size show the spread narrowing around the wrong answer. */
results.figures.bias = figure(
  `rng = np.random.default_rng(21)
score = np.clip(rng.normal(6, 2, 100_000), 0, 10)
churned = rng.random(100_000) < 1 / (1 + np.exp(score - 4))
active = score[~churned]`,
  {
    truth: "round(float(score.mean()), 2)",
    activeMean: "round(float(active.mean()), 2)",
    churnedShare: "round(float(churned.mean()), 3)",
    surveys: `{n: [round(float(rng.choice(active, n, replace=False).mean()), 2) for _ in range(30)] for n in (20, 200, 2000)}`,
  },
);

// ── 5. A metric up 20% week over week ───────────────────────────────────────

/** The video's own two weeks: conversion up a fifth while orders fell. */
results.figures.metric = figure(
  `weeks = pd.DataFrame({"week": ["last", "this"], "sessions": [10_000, 8_000], "orders": [300, 288]})
weeks["conversion"] = weeks["orders"] / weeks["sessions"]`,
  {
    frame: "weeks",
    percent: '(weeks["conversion"] * 100).round(1).tolist()',
    lift: 'round(float(weeks["conversion"].iloc[1] / weeks["conversion"].iloc[0] - 1), 3)',
    ordersChange: 'round(float(weeks["orders"].iloc[1] / weeks["orders"].iloc[0] - 1), 3)',
    sessionsChange: 'round(float(weeks["sessions"].iloc[1] / weeks["sessions"].iloc[0] - 1), 3)',
  },
);

// ── 6, 7. Outliers; percentiles and quartiles ───────────────────────────────

/** The page's outlier block, all of it, then its quantiles. */
results.figures.outliers = figure(
  `df = pd.DataFrame({
    "amount": [10, 12, 11, 13, 9, 14, 10, 12, 200, 8, 11, 13, 190]
})`,
  {
    values: 'df["amount"].tolist()',
    quartiles: 'q1, q3 = df["amount"].quantile([0.25, 0.75])\n[float(q1), float(df["amount"].median()), float(q3)]',
    fences: "iqr = q3 - q1\n[float(iqr), float(q1 - 1.5 * iqr), float(q3 + 1.5 * iqr)]",
    iqrFlagged: 'df[(df["amount"] < q1 - 1.5 * iqr) | (df["amount"] > q3 + 1.5 * iqr)]["amount"].tolist()',
    mean: 'round(float(df["amount"].mean()), 1)',
    std: 'round(float(df["amount"].std()), 1)',
    z: 'z = (df["amount"] - df["amount"].mean()) / df["amount"].std()\nz.round(2).tolist()',
    zOver2: 'df[z.abs() > 2]["amount"].tolist()',
    zOver3: 'df[z.abs() > 3]["amount"].tolist()',
    p90: 'round(float(df["amount"].quantile(0.90)), 1)',
  },
);

// ── Rapid fire ──────────────────────────────────────────────────────────────

/** The page's variance block. */
results.figures.variance = figure(`s = pd.Series([10, 20, 30, 40, 50])`, {
  values: "s.tolist()",
  var: "float(s.var())",
  std: "round(float(s.std()), 2)",
  deviations: "(s - s.mean()).tolist()",
});

/** The video's own support tickets. */
results.figures.mode = figure(
  `tickets = pd.Series(["billing", "login", "billing", "shipping", "billing", "login", "refund"])`,
  {
    counts: "tickets.value_counts()",
    mode: "tickets.mode().tolist()",
  },
);

/** The video's own 100,000 normal draws, for 68, 95 and 99.7. */
results.figures.normal = figure(
  `rng = np.random.default_rng(3)
x = rng.normal(0, 1, 100_000)`,
  {
    within: "[round(float((np.abs(x) < k).mean()) * 100, 1) for k in (1, 2, 3)]",
  },
);

/** The video's own population of 10,000 order values, and three samples. */
results.figures.population = figure(
  `rng = np.random.default_rng(5)
population = pd.Series(rng.normal(50, 10, 10_000))`,
  {
    mean: "round(float(population.mean()), 1)",
    samples: "[round(float(rng.choice(population, 50, replace=False).mean()), 1) for _ in range(3)]",
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
