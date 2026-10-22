// Measures every number and every dot the ds-statistics video shows, in Pyodide
// 314.0.7 with NumPy and SciPy, the runtime the Data Scientist statistics
// page's blocks run in the reader's browser, and writes what came back to
// results.json, which data.ts reads. Random data comes from NumPy's seeded
// default_rng, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/ds-statistics/check.mjs
//
// Each figure is one Python block run in a fresh namespace; it leaves what it
// measured in `out`, which comes back as JSON. Where a figure is the page's
// own code (content/interview/data-scientist/statistics.mdx) or a Statistics
// course lesson's, the block is that code with its own seed, so the numbers
// agree with the page and with the course videos that show the same run
// (Stats-6 Estimation, Stats-7 TestingHypotheses, Stats-8
// InterpretingResults). The rest is marked "the video's own".
/* global console, URL */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "pandas", "scipy"] });

py.runPython(`
import json
import numpy as np

def _plain(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    return str(o)

def _figure(code):
    ns = {}
    exec(code, ns)
    return json.dumps(ns["out"], default=_plain)
`);

const results = {
  runtime: py.runPython(
    "import sys, numpy, scipy, pandas; f'Pyodide / Python {sys.version.split()[0]} / NumPy {numpy.__version__} / SciPy {scipy.__version__} / pandas {pandas.__version__}'",
  ),
  figures: {},
};
const figure = (code) => {
  py.globals.set("_code", code);
  return JSON.parse(py.runPython("_figure(_code)"));
};

// ── Hook: the two misread numbers ───────────────────────────────────────────

/** The page's confidence-interval block, as printed. */
results.figures.hook = figure(`
import numpy as np
from scipy import stats

data = np.array([12, 15, 14, 10, 13, 16, 11, 14])
n = len(data)
mean = data.mean()
se = stats.sem(data)
ci_low, ci_high = stats.t.interval(0.95, df=n - 1, loc=mean, scale=se)
out = {"mean": float(mean), "low": round(float(ci_low), 2), "high": round(float(ci_high), 2)}
`);

// ── 1, 2, 3. Parameter and statistic, SD and SE, the sampling distribution ──

/** The page's sampling-distribution block (seed 42): a skewed population of
 *  100,000, then 2,000 samples of 50. The first of those samples is drawn
 *  again from a twin generator so its 50 values can be shown; its mean is
 *  sample_means[0]. */
results.figures.sample = figure(`
import numpy as np

rng = np.random.default_rng(42)
population = rng.exponential(scale=5, size=100_000)
sample_means = [rng.choice(population, 50).mean() for _ in range(2000)]

twin = np.random.default_rng(42)
twin.exponential(scale=5, size=100_000)
first = twin.choice(population, 50)
assert abs(first.mean() - sample_means[0]) < 1e-12

mu = population.mean()
sigma = population.std()
edges = np.arange(0, 30.5, 0.5)
pop_counts = np.histogram(population, bins=edges)[0]
mean_edges = np.arange(2.5, 7.75, 0.25)
mean_counts = np.histogram(sample_means, bins=mean_edges)[0]
out = {
    "mu": round(float(mu), 2),
    "sigma": round(float(sigma), 2),
    "max": round(float(population.max()), 1),
    "beyond30": int((population > 30).sum()),
    "first": [round(float(v), 2) for v in first],
    "firstMean": round(float(first.mean()), 2),
    "firstSd": round(float(first.std(ddof=1)), 2),
    "seFormula": round(float(sigma / 50**0.5), 3),
    "seSimulated": round(float(np.std(sample_means)), 3),
    "se200": round(float(sigma / 200**0.5), 4),
    "meanOfMeans": round(float(np.mean(sample_means)), 2),
    "meanMin": round(float(np.min(sample_means)), 2),
    "meanMax": round(float(np.max(sample_means)), 2),
    "popEdges": edges.tolist(),
    "popCounts": pop_counts.tolist(),
    "meanEdges": mean_edges.tolist(),
    "meanCounts": mean_counts.tolist(),
    "means": [round(float(m), 3) for m in sample_means],
}
`);

// ── 4, 5. The CLT and the LLN ───────────────────────────────────────────────

/** The video's own: the page's population (seed 42 again), then 10,000
 *  sample means at n = 1, 5 and 30 from a second seeded generator, and one
 *  running average of 2,000 draws. Skewness is the third standardized
 *  moment (0 for a bell). */
results.figures.clt = figure(`
import numpy as np
from scipy import stats

population = np.random.default_rng(42).exponential(scale=5, size=100_000)
mu = population.mean()
sigma = population.std()
rng = np.random.default_rng(2026)
panels = []
for n in (1, 5, 30):
    means = rng.choice(population, size=(10_000, n)).mean(axis=1)
    z = (means - mu) / (sigma / n**0.5)
    edges = np.arange(-3, 5.01, 0.25)
    counts = np.histogram(z, bins=edges)[0]
    panels.append({
        "n": n,
        "sd": round(float(means.std()), 2),
        "skew": round(float(stats.skew(means)), 2),
        "edges": edges.tolist(),
        "counts": counts.tolist(),
    })

walk = np.random.default_rng(90210).choice(population, 2000)
running = np.cumsum(walk) / np.arange(1, 2001)
keep = sorted(set([*range(1, 21), *np.unique(np.round(np.geomspace(1, 2000, 160)).astype(int)).tolist()]))
out = {
    "mu": round(float(mu), 2),
    "panels": panels,
    "running": [[k, round(float(running[k - 1]), 3)] for k in keep],
    "at10": round(float(running[9]), 2),
    "at100": round(float(running[99]), 2),
    "at2000": round(float(running[1999]), 2),
}
`);

// ── 6. Maximum likelihood ───────────────────────────────────────────────────

/** The video's own: 12 clicks in 40 views, and ten times the data. The
 *  likelihood over every click rate, scaled so each curve peaks at 1; the
 *  width is where it falls below 15% of its peak (about two standard errors
 *  either side, for a curve this close to normal). */
results.figures.mle = figure(`
import numpy as np
from scipy import stats

grid = np.linspace(0, 1, 401)
curves = []
for k, n in ((12, 40), (120, 400)):
    L = stats.binom.pmf(k, n, grid)
    L = L / L.max()
    inside = grid[L >= 0.15]
    curves.append({
        "k": k, "n": n,
        "peak": round(float(grid[np.argmax(L)]), 3),
        "low": round(float(inside.min()), 3), "high": round(float(inside.max()), 3),
        "values": [round(float(v), 4) for v in L],
    })
out = {"grid": [round(float(g), 4) for g in grid], "curves": curves}
`);

// ── 7. An unbiased estimator: the n − 1 ─────────────────────────────────────

/** The video's own: 10,000 samples at each size from a population whose
 *  variance is 1, both divisors averaged. Then the page's own five values. */
results.figures.bessel = figure(`
import numpy as np

rng = np.random.default_rng(1234)
rows = []
for n in (2, 3, 5, 10, 30):
    xs = rng.normal(0, 1, size=(10_000, n))
    rows.append({
        "n": n,
        "byN": round(float(xs.var(axis=1, ddof=0).mean()), 3),
        "byN1": round(float(xs.var(axis=1, ddof=1).mean()), 3),
    })
data = np.array([4.0, 7.0, 13.0, 2.0, 1.0])
out = {
    "rows": rows,
    "page": {"unbiased": round(float(np.var(data, ddof=1)), 2), "biased": round(float(np.var(data, ddof=0)), 2)},
}
`);

// ── 8. The 95% confidence interval ──────────────────────────────────────────

/** The Statistics course's canonical simulation (confidence-intervals.mdx,
 *  seed 7), the run Stats-6 Estimation shows: 100 samples of 40 from a
 *  population with mean 100 and spread 15. */
results.figures.ci = figure(`
import numpy as np
from scipy import stats

rng = np.random.default_rng(7)

MU_TRUE = 100.0
SIGMA = 15.0
n = 40
n_intervals = 100

lows, highs, centers, covers = [], [], [], []
for _ in range(n_intervals):
    s = rng.normal(MU_TRUE, SIGMA, size=n)
    se = s.std(ddof=1) / np.sqrt(n)
    lo, hi = stats.t.interval(0.95, df=n - 1, loc=s.mean(), scale=se)
    lows.append(lo)
    highs.append(hi)
    centers.append(s.mean())
    covers.append(lo <= MU_TRUE <= hi)

covers = np.array(covers)
out = {
    "covered": int(covers.sum()),
    "missed": int((~covers).sum()),
    "intervals": [[round(float(l), 2), round(float(c), 2), round(float(h), 2), bool(v)] for l, c, h, v in zip(lows, centers, highs, covers)],
}
`);

// ── 11. The p-value ─────────────────────────────────────────────────────────

/** The Statistics course's coin (p-values.mdx, seed 0), the run Stats-7
 *  TestingHypotheses shows: 62 heads in 100 flips against 100,000 fair-coin
 *  runs, and scipy's exact test beside it. */
results.figures.coin = figure(`
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)
observed_heads = 62
n_flips = 100
sims = rng.binomial(n=n_flips, p=0.5, size=100_000)
distance = abs(observed_heads - 50)
as_or_more_extreme = np.abs(sims - 50) >= distance
p_value = as_or_more_extreme.mean()
counts = np.bincount(sims, minlength=101)
out = {
    "p": round(float(p_value), 4),
    "exact": round(float(stats.binomtest(observed_heads, n_flips, 0.5).pvalue), 4),
    "upper": int((sims >= 62).sum()),
    "lower": int((sims <= 38).sum()),
    "counts": counts[25:76].tolist(),
    "from": 25,
}
`);

// ── 12. z and t ─────────────────────────────────────────────────────────────

/** The critical values, and both curves for drawing. */
results.figures.zt = figure(`
import numpy as np
from scipy import stats

x = np.linspace(-5, 5, 201)
out = {
    "z": round(float(stats.norm.ppf(0.975)), 3),
    "t5": round(float(stats.t.ppf(0.975, 5)), 3),
    "t30": round(float(stats.t.ppf(0.975, 30)), 3),
    "x": [round(float(v), 3) for v in x],
    "normalPdf": [round(float(v), 5) for v in stats.norm.pdf(x)],
    "t5Pdf": [round(float(v), 5) for v in stats.t.pdf(x, 5)],
    "t30Pdf": [round(float(v), 5) for v in stats.t.pdf(x, 30)],
}
`);

// ── 13. Chi-square ──────────────────────────────────────────────────────────

/** The Statistics course's device and churn table (anova-and-chi-square.mdx,
 *  seed 5), the run Stats-7 TestingHypotheses shows. */
results.figures.chi = figure(`
import numpy as np
import pandas as pd
from scipy import stats

rng = np.random.default_rng(5)
n = 600
device = rng.choice(["mobile", "desktop", "tablet"], size=n, p=[0.5, 0.4, 0.1])
base = np.where(device == "mobile", 0.32, np.where(device == "desktop", 0.18, 0.22))
churned = rng.random(n) < base
df = pd.DataFrame({"device": device, "churned": churned})
table = pd.crosstab(df["device"], df["churned"])
chi2, p_value, dof, expected = stats.chi2_contingency(table)
out = {
    "devices": [str(i) for i in table.index],
    "observed": table.values.tolist(),
    "expected": np.round(expected, 1).tolist(),
    "chi2": round(float(chi2), 2),
    "p": round(float(p_value), 4),
    "dof": int(dof),
}
`);

// ── 14. ANOVA ───────────────────────────────────────────────────────────────

/** The page's own three groups, then the Statistics course's pairwise block
 *  (anova-and-chi-square.mdx, seed 0): ten t-tests on five identical groups. */
results.figures.anova = figure(`
import numpy as np
from scipy import stats
from scipy.stats import f_oneway

group_a = [5.1, 5.5, 4.9, 5.3]
group_b = [6.2, 6.5, 6.0, 6.3]
group_c = [5.0, 4.8, 5.2, 5.1]
f_stat, p_value = f_oneway(group_a, group_b, group_c)
groups3 = [group_a, group_b, group_c]
grand = np.mean(sum(groups3, []))
between = sum(len(g) * (np.mean(g) - grand) ** 2 for g in groups3) / 2
within = sum(((np.array(g) - np.mean(g)) ** 2).sum() for g in groups3) / 9

rng = np.random.default_rng(0)
alpha = 0.05
n_trials = 800
any_false_alarm = 0
for _ in range(n_trials):
    groups = [rng.normal(100, 15, size=30) for _ in range(5)]
    fired = False
    for i in range(5):
        for j in range(i + 1, 5):
            if stats.ttest_ind(groups[i], groups[j]).pvalue <= alpha:
                fired = True
    any_false_alarm += fired
out = {
    "groups": groups3,
    "means": [round(float(np.mean(g)), 3) for g in groups3],
    "grand": round(float(grand), 3),
    "f": round(float(f_stat), 1),
    "p": float(p_value),
    "between": round(float(between), 4),
    "within": round(float(within), 4),
    "pairwise": round(any_false_alarm / n_trials, 3),
}
`);

// ── 15. Effect size ─────────────────────────────────────────────────────────

/** The Statistics course's "significant yet negligible" challenge
 *  (effect-sizes.mdx, seed 2024), the run Stats-8 InterpretingResults shows. */
results.figures.effect = figure(`
import numpy as np
from scipy import stats

rng = np.random.default_rng(2024)
n = 300_000
a = rng.normal(100.00, 15, size=n)
b = rng.normal(100.12, 15, size=n)
_, p = stats.ttest_ind(a, b)
na, nb = len(a), len(b)
sp = np.sqrt(((na - 1) * a.var(ddof=1) + (nb - 1) * b.var(ddof=1)) / (na + nb - 2))
d = float((b.mean() - a.mean()) / sp)
out = {"gap": round(float(b.mean() - a.mean()), 3), "p": float(p), "d": round(d, 4)}
`);

// ── 16. p-hacking ───────────────────────────────────────────────────────────

/** The Statistics course's twenty tests of nothing (p-values.mdx, seed 123),
 *  the run Stats-7 TestingHypotheses shows. */
results.figures.hack = figure(`
import numpy as np
from scipy import stats

rng = np.random.default_rng(123)
n_tests = 20
alpha = 0.05
p_values = []
for _ in range(n_tests):
    a = rng.normal(0, 1, 50)
    b = rng.normal(0, 1, 50)
    p_values.append(stats.ttest_ind(a, b).pvalue)
p_values = np.array(p_values)
out = {
    "p": [round(float(v), 3) for v in p_values],
    "hits": int((p_values <= alpha).sum()),
    "atLeastOne": round(1 - 0.95**20, 3),
    "bonferroni": 0.05 / 20,
}
`);

// ── 17. Frequentist and Bayesian ────────────────────────────────────────────

/** The video's own reading of the page's A/B table (120 of 1,000 converted
 *  in control, 150 of 1,000 in treatment): flat Beta(1, 1) priors, the two
 *  posteriors, and the chance B's rate is higher from 200,000 seeded draws. */
results.figures.bayes = figure(`
import numpy as np
from scipy import stats

A = stats.beta(1 + 120, 1 + 880)
B = stats.beta(1 + 150, 1 + 850)
rng = np.random.default_rng(17)
draws_a = A.rvs(200_000, random_state=rng)
draws_b = B.rvs(200_000, random_state=rng)
grid = np.linspace(0.08, 0.2, 241)
out = {
    "pBetter": round(float((draws_b > draws_a).mean()), 3),
    "aLow": round(float(A.ppf(0.025)), 4), "aHigh": round(float(A.ppf(0.975)), 4),
    "bLow": round(float(B.ppf(0.025)), 4), "bHigh": round(float(B.ppf(0.975)), 4),
    "grid": [round(float(g), 4) for g in grid],
    "a": [round(float(v), 3) for v in A.pdf(grid)],
    "b": [round(float(v), 3) for v in B.pdf(grid)],
}
`);

// ── 18. Parametric and non-parametric ───────────────────────────────────────

/** The Statistics course's support queues (correlation-and-nonparametric.mdx,
 *  seed 6), the run Stats-7 TestingHypotheses shows. */
results.figures.ranks = figure(`
import numpy as np
from scipy import stats

rng = np.random.default_rng(6)
a = rng.normal(30, 8, size=40)
b = rng.normal(36, 8, size=40)
a[:3] = [300, 280, 350]
b[:3] = [330, 410, 290]
t_res = stats.ttest_ind(a, b, equal_var=False)
u_res = stats.mannwhitneyu(a, b, alternative="two-sided")
out = {
    "a": [round(float(v), 1) for v in a],
    "b": [round(float(v), 1) for v in b],
    "medianA": round(float(np.median(a)), 1),
    "medianB": round(float(np.median(b)), 1),
    "t": round(float(t_res.pvalue), 4),
    "u": round(float(u_res.pvalue), 4),
}
`);

const path = new URL("./results.json", import.meta.url);
writeFileSync(path, JSON.stringify(results, null, 1) + "\n");
console.log(`wrote ${fileURLToPath(path)} (${results.runtime})`);
for (const [id, f] of Object.entries(results.figures)) {
  const brief = Object.fromEntries(Object.entries(f).filter(([, v]) => !Array.isArray(v) || v.length <= 6));
  console.log(id, JSON.stringify(brief).slice(0, 400));
}
