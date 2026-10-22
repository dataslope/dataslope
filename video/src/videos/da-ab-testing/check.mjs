// Measures every number and every figure the da-ab-testing video shows, and
// writes them to results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/da-ab-testing/check.mjs
//
// Three engines, each the one its numbers come from:
//   - DuckDB (the engine the page's SQL blocks run), for the funnel, the
//     conversion-rate query, the kidney-stone rates and the regional averages;
//   - Pyodide with NumPy and SciPy (the runtime the Statistics course's blocks
//     run), for the experiment, its p-value and interval, and the sample
//     sizes, re-running the course's own ab-testing.mdx code;
//   - the page's chart specs' own seeded generators (charts/_theme.mjs), for
//     the figures the page draws: the curves and simulations are copied from
//     the named spec, so the video and the page show the same data.
// Data is the page's (content/interview/data-analyst/ab-testing-and-metrics.mdx,
// and its charts) or the Statistics course's wherever one has it; the rest is
// marked "the video's own" here and in script.ts.
/* global console, URL */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../../../package.json"));
const duckdb = require("@duckdb/duckdb-wasm");
const { default: Worker } = await import(pathToFileURL(require.resolve("web-worker")).href);
const dist = join(dirname(require.resolve("@duckdb/duckdb-wasm")), "..", "dist");
const bundle = await duckdb.selectBundle({
  mvp: { mainModule: join(dist, "duckdb-mvp.wasm"), mainWorker: join(dist, "duckdb-node-mvp.worker.cjs") },
  eh: { mainModule: join(dist, "duckdb-eh.wasm"), mainWorker: join(dist, "duckdb-node-eh.worker.cjs") },
});

/** One value as a SQL client prints it, from its Arrow column type. */
function shown(value, type) {
  if (value === null || value === undefined) return null;
  const t = String(type);
  if (t.startsWith("Decimal")) {
    const scale = type.scale ?? 0;
    const digits = String(value).replace("-", "").padStart(scale + 1, "0");
    const sign = String(value).startsWith("-") ? "-" : "";
    return scale ? `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}` : `${sign}${digits}`;
  }
  if (t.startsWith("Date")) return new Date(Number(value)).toISOString().slice(0, 10);
  if (t.startsWith("Timestamp")) return new Date(Number(value)).toISOString().slice(0, 19).replace("T", " ");
  if (typeof value === "bigint") return Number(value);
  return value?.valueOf?.() ?? value;
}

async function sqlFigure(setup, steps) {
  const worker = new Worker(pathToFileURL(bundle.mainWorker).href, { type: "module" });
  const db = new duckdb.AsyncDuckDB({ log: () => {} }, worker);
  await db.instantiate(bundle.mainModule);
  const conn = await db.connect();
  for (const stmt of setup.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) await conn.query(stmt);
  const out = {};
  for (const [id, sql] of Object.entries(steps)) {
    try {
      const table = await conn.query(sql);
      const fields = table.schema.fields;
      const rows = table.toArray().map((r) => {
        const obj = r.toJSON();
        return fields.map((f) => shown(obj[f.name], f.type));
      });
      out[id] = { sql, ok: true, columns: fields.map((f) => f.name), rows };
    } catch (e) {
      // DuckDB's message is "<Kind> Error: <text>", then a LINE excerpt.
      const message = String(e.message).split("\n")[0];
      out[id] = { sql, ok: false, error: message };
    }
  }
  const version = (await conn.query("SELECT version() AS v")).toArray()[0].toJSON().v;
  await conn.close();
  await db.terminate();
  await worker.terminate();
  return { setup, steps: out, version };
}


// ── Pyodide ──────────────────────────────────────────────────────────────────

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

const pyRuntime = py.runPython("import sys, scipy; f'Pyodide / Python {sys.version.split()[0]} / SciPy {scipy.__version__}'");
const pyFigure = (setup, steps) => {
  py.globals.set("_setup", setup);
  py.globals.set("_steps", py.toPy(Object.entries(steps)));
  return JSON.parse(py.runPython("json.dumps(_figure(_setup, _steps))"));
};


const { normalSamples, mean } = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "../../../../charts/_theme.mjs")).href);

const results = { runtime: {}, sql: {}, py: {}, charts: {} };

// ── DuckDB ───────────────────────────────────────────────────────────────────

/** 4, 5. The funnel the page draws (charts/funnel-step-dropoff.mjs), as the
 *  table its step-to-step query reads. */
results.sql.funnel = await sqlFigure(
  `CREATE TABLE funnel (stage TEXT, stage_order INTEGER, users INTEGER);
INSERT INTO funnel VALUES
  ('Landing page', 1, 42000), ('Product view', 2, 27500), ('Add to cart', 3, 14200),
  ('Checkout started', 4, 8900), ('Payment entered', 5, 5100), ('Purchase', 6, 3900);`,
  {
    // The page's query, with an ORDER BY so the rows come back in funnel order.
    step: "SELECT stage, users,\n  users * 1.0 / LAG(users) OVER (ORDER BY stage_order) AS step_conversion\nFROM funnel\nORDER BY stage_order;",
    lost: "SELECT stage, LAG(users) OVER (ORDER BY stage_order) - users AS lost FROM funnel ORDER BY stage_order;",
    overall: "SELECT MIN(users) * 1.0 / MAX(users) AS overall FROM funnel;",
  },
);

/** 16. A conversion rate in SQL: the page's query on the video's own events,
 *  where user 1 purchases twice. */
results.sql.conversion = await sqlFigure(
  `CREATE TABLE events (user_id INTEGER, stage TEXT);
INSERT INTO events VALUES
  (1, 'visit'), (1, 'purchase'), (1, 'purchase'), (2, 'visit'),
  (3, 'visit'), (3, 'purchase'), (4, 'visit'), (5, 'visit');`,
  {
    table: "SELECT user_id, stage FROM events ORDER BY rowid;",
    right:
      "SELECT\n  COUNT(DISTINCT CASE WHEN stage = 'purchase' THEN user_id END) * 1.0\n  / COUNT(DISTINCT user_id) AS overall_conversion\nFROM events;",
    // Without DISTINCT in the numerator, the repeat purchase counts twice.
    repeats:
      "SELECT\n  COUNT(CASE WHEN stage = 'purchase' THEN user_id END) * 1.0\n  / COUNT(DISTINCT user_id) AS overall_conversion\nFROM events;",
  },
);

/** 14. Simpson's paradox: the page's kidney-stone counts
 *  (charts/simpsons-paradox.mjs). */
results.sql.stones = await sqlFigure(
  `CREATE TABLE stones (size TEXT, treatment TEXT, success INTEGER, n INTEGER);
INSERT INTO stones VALUES
  ('Small', 'A', 81, 87), ('Small', 'B', 234, 270),
  ('Large', 'A', 192, 263), ('Large', 'B', 55, 80);`,
  {
    bySize:
      "SELECT size, treatment, success, n,\n  ROUND(100.0 * success / n, 1) AS pct\nFROM stones\nORDER BY size DESC, treatment;",
    pooled:
      "SELECT treatment, SUM(success) AS success, SUM(n) AS n,\n  ROUND(100.0 * SUM(success) / SUM(n), 1) AS pct\nFROM stones\nGROUP BY treatment\nORDER BY treatment;",
  },
);

/** 15. A ratio metric: the page's five regional averages
 *  (charts/average-of-averages.mjs). */
results.sql.ratio = await sqlFigure(
  `CREATE TABLE regions (region TEXT, avg_order INTEGER, customers INTEGER);
INSERT INTO regions VALUES
  ('North', 52, 4200), ('South', 49, 3100), ('East', 61, 1850), ('West', 47, 2600), ('Islands', 131, 40);`,
  {
    table: "SELECT region, avg_order, customers FROM regions ORDER BY rowid;",
    averaged: "SELECT AVG(avg_order) AS average_of_averages FROM regions;",
    weighted: "SELECT SUM(avg_order * customers) * 1.0 / SUM(customers) AS per_customer FROM regions;",
  },
);
results.runtime.sql = `DuckDB ${results.sql.funnel.version}`;

// ── Pyodide ──────────────────────────────────────────────────────────────────

/** 7, 9. The Statistics course's simulated experiment (ab-testing.mdx,
 *  "Analyze", seed 42), its own code, the same one Stats-9 reads. */
results.py.experiment = pyFigure(
  `from scipy import stats
rng = np.random.default_rng(42)
n_a = n_b = 6000
true_p_a, true_p_b = 0.100, 0.118
conv_a = rng.binomial(1, true_p_a, n_a)
conv_b = rng.binomial(1, true_p_b, n_b)
x_a, x_b = conv_a.sum(), conv_b.sum()
p_a, p_b = x_a / n_a, x_b / n_b
abs_lift = p_b - p_a
rel_lift = abs_lift / p_a
p_pool = (x_a + x_b) / (n_a + n_b)
se_pool = np.sqrt(p_pool * (1 - p_pool) * (1 / n_a + 1 / n_b))
z = abs_lift / se_pool
p_value = 2 * (1 - stats.norm.cdf(abs(z)))
se_diff = np.sqrt(p_a * (1 - p_a) / n_a + p_b * (1 - p_b) / n_b)
zc = stats.norm.ppf(0.975)
ci_low, ci_high = abs_lift - zc * se_diff, abs_lift + zc * se_diff`,
  {
    counts: "[int(x_a), int(n_a), int(x_b), int(n_b)]",
    rates: "[round(float(p_a) * 100, 2), round(float(p_b) * 100, 2)]",
    lift: "[round(float(abs_lift) * 100, 2), round(float(rel_lift) * 100, 1)]",
    z: "round(float(z), 2)",
    p: "round(float(p_value), 4)",
    se: "round(float(se_diff) * 100, 2)",
    zc: "round(float(zc), 2)",
    ci: "[round(float(ci_low) * 100, 2), round(float(ci_high) * 100, 2)]",
  },
);

/** 10. The course's sample-size block (ab-testing.mdx, "Size it"), for the
 *  course's 10% to 12%, and for half that lift. */
results.py.sampleSize = pyFigure(
  `from scipy import stats
def n_per_arm(p1, p2, alpha=0.05, power=0.80):
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    p_bar = (p1 + p2) / 2
    return np.ceil(((z_alpha * np.sqrt(2 * p_bar * (1 - p_bar)) + z_beta * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / (p2 - p1) ** 2)`,
  {
    twelve: "int(n_per_arm(0.10, 0.12))",
    eleven: "int(n_per_arm(0.10, 0.11))",
    ratio: "round(float(n_per_arm(0.10, 0.11) / n_per_arm(0.10, 0.12)), 2)",
  },
);

/** 8. Significance against size: the page's chart
 *  (charts/effect-size-independent-of-n.mjs), d = 0.2 fixed, n per group. */
results.py.practical = pyFigure(
  `from scipy import stats
D = 0.2
SIZES = [10, 20, 50, 100, 200, 500, 1000, 2000]`,
  {
    rows: "[[n, float(2 * stats.norm.sf(D * np.sqrt(n / 2)))] for n in SIZES]",
    cross: "min(n for n in SIZES if 2 * stats.norm.sf(D * np.sqrt(n / 2)) < 0.05)",
  },
);

/** 11, 12. The two errors on one threshold: a two-sided 5% test, and an
 *  alternative placed so the test has 80% power (the video's own picture of
 *  the usual design target). */
results.py.errors = pyFigure(
  `from scipy import stats
crit = stats.norm.ppf(0.975)
shift = crit + stats.norm.ppf(0.80)`,
  {
    crit: "round(float(crit), 2)",
    shift: "round(float(shift), 3)",
    alpha: "round(float(2 * stats.norm.sf(crit)), 3)",
    beta: "round(float(stats.norm.cdf(crit - shift)), 3)",
    power: "round(float(stats.norm.sf(crit - shift)), 3)",
  },
);
results.runtime.py = pyRuntime;

// ── The page's charts, from their own generators ─────────────────────────────

/** 13. charts/ab-test-peeking.mjs: identical arms, the p-value every hundred
 *  visitors per arm, to the planned 8,000. Its own normal approximation. */
{
  const PLANNED = 8000;
  const STEP = 100;
  const a = normalSamples(PLANNED, 0, 1, 10);
  const b = normalSamples(PLANNED, 0, 1, 10009);
  const phi = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const Phi = (x) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    const p = 1 - phi(x) * d;
    return x >= 0 ? p : 1 - p;
  };
  const rows = [];
  for (let n = STEP; n <= PLANNED; n += STEP) {
    const z = (mean(a.slice(0, n)) - mean(b.slice(0, n))) / Math.sqrt(2 / n);
    rows.push([n, 2 * (1 - Phi(Math.abs(z)))]);
  }
  const under = rows.filter(([, p]) => p < 0.05).map(([n]) => n);
  const crossings = rows.filter(([, p], i) => p < 0.05 && (i === 0 || rows[i - 1][1] >= 0.05)).map(([n]) => n);
  results.charts.peeking = { planned: PLANNED, rows, under, crossings, final: rows.at(-1)[1] };
}

/** 6. charts/randomisation-balances-confounders.mjs: ten covariates'
 *  standardised gaps, self-selected and randomized. */
{
  const COVARIATES = [
    { key: "Age", bias: 0.62 },
    { key: "Income", bias: 0.71 },
    { key: "Education", bias: 0.55 },
    { key: "Prior use", bias: 0.88 },
    { key: "Region", bias: 0.31 },
    { key: "Device", bias: 0.44 },
    { key: "Tenure", bias: 0.58 },
    { key: "Support tickets", bias: 0.36 },
    { key: "Motivation", bias: 0.79, unmeasured: true },
    { key: "Health literacy", bias: 0.66, unmeasured: true },
  ];
  const NOISE = normalSamples(COVARIATES.length, 0, 0.055, 5_711);
  const rows = COVARIATES.map((c, i) => ({ key: c.key, unmeasured: !!c.unmeasured, selected: c.bias, randomised: Math.abs(NOISE[i]) }));
  results.charts.balance = {
    threshold: 0.1,
    rows,
    overSelected: rows.filter((r) => r.selected > 0.1).length,
    overRandomised: rows.filter((r) => r.randomised > 0.1).map((r) => [r.key, r.randomised]),
  };
}

/** 9. charts/ci-coverage.mjs: a hundred 95% intervals around a true mean
 *  of 50. */
{
  const sd = (xs) => {
    const m = mean(xs);
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
  };
  const intervals = Array.from({ length: 100 }, (_, i) => {
    const sample = normalSamples(25, 50, 10, 1000 + i);
    const m = mean(sample);
    const margin = (2.0639 * sd(sample)) / Math.sqrt(25);
    return [m - margin, m + margin];
  });
  results.charts.coverage = { truth: 50, intervals, missed: intervals.filter(([lo, hi]) => lo > 50 || hi < 50).length };
}

/** 1. charts/metric-definition-drift.mjs: three definitions of an active
 *  user over one year (its own figures). */
results.charts.drift = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  definitions: [
    { key: "Any event fired", values: [212, 228, 247, 279, 318, 372, 431, 468, 512, 566, 611, 664] },
    { key: "Two or more sessions", values: [168, 176, 187, 203, 221, 246, 271, 285, 302, 319, 334, 351] },
    { key: "Signed in and acted", values: [141, 145, 150, 157, 164, 173, 182, 187, 194, 201, 207, 214] },
  ],
};
results.charts.drift.spread = Number((664 / 214).toFixed(1));

/** 10. charts/power-vs-n.mjs: power against users per arm, for three lifts. */
{
  const normalCdf = (x) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    const p = 1 - (Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)) * d;
    return x >= 0 ? p : 1 - p;
  };
  const power = (n, p1, p2) => {
    const pBar = (p1 + p2) / 2;
    return normalCdf((Math.abs(p2 - p1) * Math.sqrt(n) - 1.959964 * Math.sqrt(2 * pBar * (1 - pBar))) / Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)));
  };
  const NS = Array.from({ length: 81 }, (_, i) => Math.pow(10, 2 + (i * Math.log10(600)) / 80));
  results.charts.power = {
    lifts: [0.15, 0.12, 0.11].map((to) => ({ to, rows: NS.map((n) => [n, power(n, 0.1, to)]) })),
  };
}

/** 17. charts/novelty-effect-fades.mjs: weekly lift for two changes. */
results.charts.novelty = {
  novelty: Array.from({ length: 8 }, (_, i) => 13.6 * Math.exp(-0.62 * i) + 0.5),
  durable: Array.from({ length: 8 }, (_, i) => 4.2 - 0.45 * Math.exp(-0.5 * i)),
};

/** 18. charts/cohort-retention.mjs: five signup cohorts over twelve weeks. */
{
  const COHORTS = [
    { key: "Jan", floor: 0.22, decay: 0.36 },
    { key: "Feb", floor: 0.28, decay: 0.34 },
    { key: "Mar", floor: 0.34, decay: 0.32 },
    { key: "Apr", floor: 0.4, decay: 0.3 },
    { key: "May", floor: 0.46, decay: 0.28 },
  ];
  results.charts.cohorts = COHORTS.map((c) => ({
    key: c.key,
    rows: Array.from({ length: 13 }, (_, w) => 100 * (c.floor + (1 - c.floor) * Math.exp(-c.decay * w))),
  }));
}

/** 19. charts/retention-curve-plateau.mjs: a curve with a core, and one
 *  without. */
results.charts.retention = {
  core: Array.from({ length: 13 }, (_, w) => 31 + 69 * Math.exp(-0.62 * w)),
  leaky: Array.from({ length: 13 }, (_, w) => 100 * Math.exp(-0.34 * w)),
};

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = [
  ...Object.entries(results.sql).flatMap(([f, fig]) => Object.entries(fig.steps).filter(([, s]) => !s.ok).map(([id, s]) => `sql.${f}.${id}: ${s.error}`)),
  ...Object.entries(results.py).flatMap(([f, fig]) => Object.entries(fig.steps).filter(([, s]) => !s.ok).map(([id, s]) => `py.${f}.${id}: ${s.error}`)),
];
console.log(`wrote ${fileURLToPath(out)} (${results.runtime.sql}; ${results.runtime.py})`);
console.log(failed.length ? `errors:\n  ${failed.join("\n  ")}` : "no errors");
