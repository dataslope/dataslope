// Measures every number and every curve the ds-experiment-design video shows,
// in Pyodide 314.0.7 with NumPy, SciPy and statsmodels, the runtime the Data
// Scientist experimentation page's blocks run in the reader's browser, and
// writes what came back to results.json, which data.ts reads. Every random
// draw is seeded, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/ds-experiment-design/check.mjs
//
// Where the page has code, this runs the page's code: the power block
// (NormalIndPower, effect 0.2), the sample-size function (10% baseline, a
// 2-point MDE), the CUPED block (500 users, seed 0) and the A/A block (1,000
// tests, seed 42). Where Data Analyst Part 7 (da-ab-testing) already drew the
// same idea, this takes its numbers, so the two series agree: the two errors
// on one threshold (a two-sided 5% test placed for 80% power) and the
// peeking chart (charts/ab-test-peeking.mjs: identical arms, the p-value
// every hundred visitors to a planned 8,000). Everything else is the
// video's own simulation, marked as such below and in script.ts:
//   - orders nested in users, for the randomization unit;
//   - a large and a small non-inferiority test of a cheaper checkout;
//   - 10,000 A/A tests checked on four schedules, for peeking;
//   - 2,000 sequential tests each way, for the SPRT;
//   - long-tailed revenue, for capping;
//   - twenty users, six of them heavy users, for stratification.
/* global console */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scipy", "statsmodels"] });

// DA Part 7's numbers for the same two figures.
const da = JSON.parse(readFileSync(join(here, "../da-ab-testing/results.json"), "utf8"));
const errors = Object.fromEntries(Object.entries(da.py.errors.steps).map(([k, s]) => [k, Number(s.value.repr)]));
const peeking = da.charts.peeking;

const out = py.runPython(`
import json, math, sys, warnings
import numpy as np
import scipy
import statsmodels
from scipy import stats
from statsmodels.stats.power import NormalIndPower
from statsmodels.stats.proportion import proportion_effectsize
warnings.filterwarnings("ignore")

r2 = lambda v: round(float(v), 2)
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)
R = {"runtime": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__, "statsmodels": statsmodels.__version__}}

# ── 3. The randomization unit: orders nested in users (the video's own) ──
# A/A tests: 1,000 users, each placing 1 + Poisson(4) orders; a user's
# orders share that user's level (SD 10) around 50, plus order noise (SD 15).
# Analyzed per order as if independent, and per user (one mean each).
rng = np.random.default_rng(3)
SIMS = 2000
naive = user = 0
ratio = []
for s in range(SIMS):
    k = 1 + rng.poisson(4, 1000)
    level = 50 + rng.normal(0, 10, 1000)
    arm = rng.integers(0, 2, 1000)
    owner = np.repeat(np.arange(1000), k.astype(np.intp))
    value = level[owner] + rng.normal(0, 15, owner.size)
    oarm = arm[owner]
    pn = stats.ttest_ind(value[oarm == 1], value[oarm == 0]).pvalue
    means = np.bincount(owner, weights=value) / k
    pu = stats.ttest_ind(means[arm == 1], means[arm == 0]).pvalue
    naive += pn < 0.05
    user += pu < 0.05
    if s == 0:
        se_n = math.sqrt(value[oarm == 1].var(ddof=1) / (oarm == 1).sum() + value[oarm == 0].var(ddof=1) / (oarm == 0).sum())
        se_u = math.sqrt(means[arm == 1].var(ddof=1) / (arm == 1).sum() + means[arm == 0].var(ddof=1) / (arm == 0).sum())
        R["unitExample"] = {"orders": int(owner.size), "users": 1000, "seOrders": r3(se_n), "seUsers": r3(se_u)}
R["unit"] = {"sims": SIMS, "users": 1000, "ordersPerUser": 5, "naive": r3(naive / SIMS), "user": r3(user / SIMS)}

# ── 4, 5. Power: the page's block, then one lever at a time ──
P = NormalIndPower()
n_page = P.solve_power(effect_size=0.2, alpha=0.05, power=0.8)
N = int(n_page) + 1
pw = lambda d, n, a: r3(P.power(effect_size=d, nobs1=n, alpha=a))
R["power"] = {
    "solve": r2(n_page),
    "n": N,
    "base": pw(0.2, N, 0.05),
    "levers": [
        {"key": "users", "from": f"{N}", "to": f"{2 * N}", "power": pw(0.2, 2 * N, 0.05)},
        {"key": "effect", "from": "0.2", "to": "0.3", "power": pw(0.3, N, 0.05)},
        {"key": "variance", "from": "SD", "to": "SD × 0.8", "power": pw(0.25, N, 0.05)},
        {"key": "alpha", "from": "0.05", "to": "0.10", "power": pw(0.2, N, 0.10)},
    ],
}

# ── 6. Sample size: the page's own function, and statsmodels as a check ──
def sample_size_per_variant(p1, mde, alpha=0.05, power=0.8):
    p2 = p1 + mde
    p_pool = (p1 + p2) / 2
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    n = (z_alpha + z_beta)**2 * 2 * p_pool * (1 - p_pool) / mde**2
    return math.ceil(n)

two = sample_size_per_variant(0.10, 0.02)
one = sample_size_per_variant(0.10, 0.01)
sm = P.solve_power(effect_size=proportion_effectsize(0.12, 0.10), alpha=0.05, power=0.8)
assert abs(sm - two) / two < 0.01, (sm, two)
mdes = [round(0.004 + 0.0005 * i, 4) for i in range(73)]
R["size"] = {
    "baseline": 0.10,
    "two": two,
    "one": one,
    "ratio": r2(one / two),
    "statsmodels": math.ceil(sm),
    # The formula's terms at the 2-point MDE, for the key under it on screen.
    "zAlpha": r2(stats.norm.ppf(1 - 0.05 / 2)),
    "zBeta": r2(stats.norm.ppf(0.8)),
    "pPool": r3((0.10 + 0.12) / 2),
    "curve": [[round(m * 100, 2), sample_size_per_variant(0.10, m)] for m in mdes],
}

# ── 7. One- and two-sided, on DA Part 7's design (80% power two-sided) ──
z2 = stats.norm.ppf(0.975)
z1 = stats.norm.ppf(0.95)
shift = z2 + stats.norm.ppf(0.80)
R["sides"] = {
    "z2": r2(z2),
    "z1": r3(z1),
    "shift": r3(shift),
    "twoPower": r3(stats.norm.sf(z2 - shift) + stats.norm.cdf(-z2 - shift)),
    "onePower": r3(stats.norm.sf(z1 - shift)),
    # A regression of the same size, the other way:
    "twoCatches": r3(stats.norm.cdf(-z2 + shift) + stats.norm.sf(z2 + shift)),
    "oneCatches": r4(stats.norm.sf(z1 + shift)),
}

# ── 8. Non-inferiority: a cheaper checkout, truly as good (the video's own) ──
# Control converts at 10%; so does the cheaper version. Margin: half a point.
rng = np.random.default_rng(8)
def ni(n):
    c = rng.binomial(n, 0.10) / n
    t = rng.binomial(n, 0.10) / n
    d = t - c
    se = math.sqrt(c * (1 - c) / n + t * (1 - t) / n)
    return {"n": n, "control": r4(c * 100), "treatment": r4(t * 100), "diff": r3(d * 100), "lo": r3((d - 1.96 * se) * 100), "hi": r3((d + 1.96 * se) * 100)}
R["noninf"] = {"margin": 0.5, "big": ni(60000), "small": ni(6000)}

# ── 9. Peeking: 10,000 A/A tests, checked on four schedules (the video's own) ──
rng = np.random.default_rng(9)
PLANNED = 8000
schedules = {
    "once": [8000],
    "weekly": [2000, 4000, 6000, 8000],
    "daily": [round(8000 * (i + 1) / 28) for i in range(28)],
    "every100": list(range(100, 8001, 100)),
}
hits = {k: 0 for k in schedules}
PEEKS = 10000
for s in range(PEEKS):
    a = rng.normal(0, 1, PLANNED).cumsum()
    b = rng.normal(0, 1, PLANNED).cumsum()
    for key, looks in schedules.items():
        ns = np.array(looks)
        z = (a[ns - 1] - b[ns - 1]) / ns / np.sqrt(2 / ns)
        if (np.abs(z) > z2).any():
            hits[key] += 1
R["peekRates"] = {"sims": PEEKS, **{k: {"looks": len(v), "rate": r3(hits[k] / PEEKS)} for k, v in schedules.items()}}

# ── 10. The SPRT: pairs of users, H0 no effect, H1 an effect of 0.2 SD ──
# Each pair's difference (treatment minus control) is N(mu, 2). Wald's
# boundaries for alpha 2.5% one-sided (the upper half of a two-sided 5% test)
# and beta 20%, the design the page's power block sizes at 393 per arm.
A_, B_ = 0.025, 0.20
upper = math.log((1 - B_) / A_)
lower = math.log(B_ / (1 - A_))
MU, VAR = 0.2, 2.0
step = lambda d: (MU / VAR) * d - MU * MU / (2 * VAR)
def sprt(mu, rng, cap=20000, keep=False):
    llr = 0.0
    path = [0.0]
    for i in range(1, cap + 1):
        llr += step(rng.normal(mu, math.sqrt(VAR)))
        if keep:
            path.append(r3(llr))
        if llr >= upper:
            return i, 1, path
        if llr <= lower:
            return i, 0, path
    return cap, -1, path
rng = np.random.default_rng(10)
h0 = [sprt(0.0, rng) for _ in range(2000)]
h1 = [sprt(MU, rng) for _ in range(2000)]
# Two example paths, the first of each kind from a seeded stream.
rng = np.random.default_rng(11)
ex1 = ex0 = None
while ex1 is None or ex0 is None:
    n1, hit1, p1 = sprt(MU, rng, keep=True)
    if ex1 is None and hit1 == 1 and 120 <= n1 <= 320:
        ex1 = {"n": n1, "path": p1}
    n0, hit0, p0 = sprt(0.0, rng, keep=True)
    if ex0 is None and hit0 == 0 and 80 <= n0 <= 260:
        ex0 = {"n": n0, "path": p0}
R["sprt"] = {
    "alpha": A_,
    "beta": B_,
    "upper": r3(upper),
    "lower": r3(lower),
    "fixed": N,
    "falsePositive": r3(sum(1 for _, h, _ in h0 if h == 1) / 2000),
    "power": r3(sum(1 for _, h, _ in h1 if h == 1) / 2000),
    "meanH0": int(round(np.mean([n for n, _, _ in h0]))),
    "meanH1": int(round(np.mean([n for n, _, _ in h1]))),
    "examples": {"effect": ex1, "none": ex0},
}

# ── 11. CUPED: the page's block, exactly, plus its points for the scatter ──
rng = np.random.default_rng(0)
n = 500
X = rng.normal(10, 3, n)          # pre-experiment covariate
Y = 0.7 * X + rng.normal(0, 2, n) # outcome correlated with X
theta = np.cov(Y, X)[0, 1] / np.var(X)
Y_adj = Y - theta * (X - X.mean())
R["cuped"] = {
    "n": n,
    "theta": r3(theta),
    "varY": r2(Y.var()),
    "varAdj": r2(Y_adj.var()),
    "share": r3(Y_adj.var() / Y.var()),
    "meanY": r3(Y.mean()),
    "meanAdj": r3(Y_adj.mean()),
    "meanX": r3(X.mean()),
    "corr": r3(np.corrcoef(X, Y)[0, 1]),
    "points": [[r3(a), r3(b), r3(c)] for a, b, c in zip(X, Y, Y_adj)],
}

# ── 12. Capping a long-tailed metric (the video's own revenue) ──
rng = np.random.default_rng(12)
buyers = rng.random(20000) < 0.3
revenue = np.where(buyers, rng.lognormal(3.0, 1.3, 20000), 0.0)
cap = np.quantile(revenue, 0.99)
capped = np.minimum(revenue, cap)
R["cap"] = {"users": 20000, "p99": r2(cap), "cut": r3(1 - capped.var() / revenue.var()), "max": r2(revenue.max())}

# ── 13. Stratification: twenty users, six heavy users (the video's own) ──
# The chance a fair coin per user puts five or six of the six in one arm.
p_lopsided = 2 * (math.comb(6, 5) + math.comb(6, 6)) / 2 ** 6
rng = np.random.default_rng(5)
coin = None
while coin is None:
    c = rng.integers(0, 2, 20)
    if c.sum() == 10 and c[:6].sum() == 5:
        coin = [int(v) for v in c]
R["strata"] = {"users": 20, "heavy": 6, "lopsided": r3(p_lopsided), "coin": coin}

# ── 14. The page's A/A block, exactly ──
from scipy.stats import ttest_ind
rng = np.random.default_rng(42)
false_positive_rate = sum(
    ttest_ind(rng.normal(0, 1, 200), rng.normal(0, 1, 200)).pvalue < 0.05
    for _ in range(1000)
) / 1000
R["aa"] = {"tests": 1000, "rate": r3(false_positive_rate)}

json.dumps(R)
`);

const results = JSON.parse(out);
results.errors = errors;
results.peeking = peeking;
writeFileSync(join(here, "results.json"), JSON.stringify(results, null, 1) + "\n");
const { unit, unitExample, power, size, sides, noninf, peekRates, sprt, cuped, cap, strata, aa } = results;
console.log(JSON.stringify(results.runtime));
console.log("unit", unit, unitExample);
console.log("power", JSON.stringify(power));
console.log("size", size.two, size.one, size.ratio, "statsmodels", size.statsmodels, "terms", size.zAlpha, size.zBeta, size.pPool);
console.log("sides", sides);
console.log("noninf", JSON.stringify(noninf));
console.log("peek", JSON.stringify(peekRates), "chart", peeking.crossings, peeking.final);
console.log("sprt", sprt.alpha, sprt.beta, sprt.upper, sprt.lower, sprt.fixed, sprt.falsePositive, sprt.power, sprt.meanH0, sprt.meanH1, sprt.examples.effect.n, sprt.examples.none.n);
console.log("cuped", cuped.theta, cuped.varY, cuped.varAdj, cuped.share, cuped.meanY, cuped.meanAdj, cuped.corr);
console.log("cap", cap, "strata", strata, "aa", aa, "errors", errors);
