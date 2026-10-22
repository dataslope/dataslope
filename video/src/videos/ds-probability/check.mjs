// Computes every number the ds-probability video shows, in Pyodide 314.0.7
// with NumPy and SciPy, the runtime the Data Scientist probability page's
// blocks run in the reader's browser, and writes what came back to
// results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/ds-probability/check.mjs
//
// Exact answers (Bayes, the die, the bet, the birthday probability) are
// worked in fractions. The simulations are the page's own blocks with their
// own seeds (content/interview/data-scientist/probability.mdx: Monty Hall at
// seed 7, the birthday room at seed 1); the ones the page doesn't have are
// marked "the video's own" and seeded here, so a rerun writes the same file.
/* global console, URL */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scipy"] });

const out = py.runPython(`
import json, math, sys
from fractions import Fraction as F
from itertools import combinations
import numpy as np
import scipy
from scipy import stats

r = {"runtime": f"Pyodide / Python {sys.version.split()[0]} / NumPy {np.__version__} / SciPy {scipy.__version__}"}

# ── 1. Conditional probability on one die ────────────────────────────────────
faces = list(range(1, 7))
even = [f for f in faces if f % 2 == 0]
r["cond"] = {
    "faces": faces,
    "even": even,
    "pSix": str(F(1, 6)),
    "pSixGivenEven": str(F(sum(1 for f in even if f == 6), len(even))),
}

# ── 3. The rare-disease test, the page's inputs, on 10,000 people ────────────
N = 10_000
prev, sens, fpr = F(1, 100), F(99, 100), F(5, 100)
sick = N * prev
tp = sick * sens
healthy = N - sick
fp = healthy * fpr
pos = tp + fp
post = tp / pos
p_pos = sens * prev + fpr * (1 - prev)
r["test"] = {
    "people": N, "sick": int(sick), "truePos": int(tp), "healthy": int(healthy),
    "falsePos": int(fp), "positives": int(pos),
    "posterior": str(post), "posteriorFloat": round(float(post), 4),
    # The page's own block: sensitivity * prior / P(positive).
    "pageBlock": round(float(sens * prev / p_pos), 3),
}

# ── 4. Independence: the Statistics course's 1,000 users ─────────────────────
r["churn"] = {
    "paid": [30, 470], "free": [120, 380],
    "pPaid": 30 / 500, "pFree": 120 / 500, "pAll": 150 / 1000,
}

# ── 5. Mutually exclusive: a one and a two on one roll ───────────────────────
r["excl"] = {"pTwo": str(F(1, 6)), "pTwoGivenOne": "0"}

# ── 6. Expectation and variance of a fair die, from the definitions ──────────
mean = sum(F(f, 6) for f in faces)
sq = [(f - mean) ** 2 for f in faces]
var = sum(s / 6 for s in sq)
faces_np = np.arange(1, 7); p_np = np.full(6, 1 / 6)
m_np = (faces_np * p_np).sum(); v_np = ((faces_np - m_np) ** 2 * p_np).sum()
r["die"] = {
    "mean": float(mean), "squares": [float(s) for s in sq],
    "var": str(var), "varFloat": round(float(var), 3),
    "pageBlock": [float(m_np), round(float(v_np), 3)],
}

# ── 7. Linearity: ten hats handed back at random (the video's own) ───────────
rng = np.random.default_rng(2026)
n_hats, shuffles = 10, 100_000
perms = np.argsort(rng.random((shuffles, n_hats)), axis=1)
fixed = (perms == np.arange(n_hats)).sum(axis=1)
counts = np.bincount(fixed, minlength=n_hats + 1)
r["hats"] = {
    "people": n_hats, "shuffles": shuffles, "each": str(F(1, n_hats)),
    "mean": round(float(fixed.mean()), 3),
    "share": [round(float(c) / shuffles, 4) for c in counts[:6]],
}

# ── 8. The distributions, one small shape each ───────────────────────────────
ks = np.arange(0, 13)
xs = np.linspace(-3.5, 3.5, 71)
ts = np.linspace(0, 5, 51)
r["dists"] = {
    "bernoulli": {"p": 0.3, "pmf": [0.7, 0.3]},
    "binomial": {"n": 10, "p": 0.3, "pmf": [round(float(v), 5) for v in stats.binom.pmf(ks[:11], 10, 0.3)],
                 "mean": 10 * 0.3, "var": round(10 * 0.3 * 0.7, 2)},
    "poisson": {"lam": 3, "pmf": [round(float(v), 5) for v in stats.poisson.pmf(ks, 3)]},
    "normal": {"x": [round(float(v), 3) for v in xs], "pdf": [round(float(v), 5) for v in stats.norm.pdf(xs)],
               "within": [round(float(stats.norm.cdf(k) - stats.norm.cdf(-k)), 4) for k in (1, 2, 3)]},
    "exponential": {"t": [round(float(v), 3) for v in ts], "pdf": [round(float(v), 5) for v in stats.expon.pdf(ts)]},
}

# ── 9. Memoryless: waits averaging 12 minutes, as the page's chart ───────────
MEAN, EXTRA, STARTS = 12, 10, [0, 10, 30]
exact = math.exp(-EXTRA / MEAN)
rng = np.random.default_rng(12)
waits = rng.exponential(MEAN, 1_000_000)
sim = [round(float((waits > s + EXTRA).sum() / (waits > s).sum()), 4) for s in STARTS]
grid = np.linspace(0, 50, 101)
r["memory"] = {
    "mean": MEAN, "extra": EXTRA, "starts": STARTS, "exact": round(exact, 4), "simulated": sim,
    "draws": len(waits),
    "t": [round(float(v), 2) for v in grid], "survive": [round(float(math.exp(-v / MEAN)), 5) for v in grid],
}

# ── 10. A binomial with many trials and a small p, against its Poisson ───────
kk = np.arange(0, 11)
b = stats.binom.pmf(kk, 1000, 0.003)
p = stats.poisson.pmf(kk, 3)
r["limit"] = {
    "n": 1000, "p": 0.003, "lam": 3,
    "binom": [round(float(v), 5) for v in b], "poisson": [round(float(v), 5) for v in p],
    "maxGap": round(float(np.abs(b - p).max()), 4),
}

# ── 11. Monty Hall: the page's block, seed 7 ─────────────────────────────────
rng = np.random.default_rng(7)
trials = 100_000
car = rng.integers(0, 3, trials)
first_pick = rng.integers(0, 3, trials)
r["monty"] = {
    "trials": trials,
    "stay": round(float((first_pick == car).mean()), 3),
    "switch": round(float((first_pick != car).mean()), 3),
}

# ── 12. The birthday problem: exact, and the page's block at seed 1 ──────────
def shared(n):
    q = F(1)
    for i in range(n):
        q *= F(365 - i, 365)
    return 1 - q
curve = [round(float(shared(n)), 4) for n in range(1, 61)]
rng = np.random.default_rng(1)
tr, n = 50_000, 23
days = rng.integers(0, 365, size=(tr, n))
days.sort(axis=1)
has_match = (np.diff(days, axis=1) == 0).any(axis=1)
r["birthday"] = {
    "people": 23, "pairs": math.comb(23, 2), "exact": round(float(shared(23)), 4),
    "exact22": round(float(shared(22)), 4),
    "simulated": round(float(has_match.mean()), 3), "rooms": tr,
    "over99": next(n for n in range(1, 366) if shared(n) > F(99, 100)),
    "curve": curve,
}

# ── 13. Covariance against correlation (the video's own 200 people) ──────────
rng = np.random.default_rng(23)
height_cm = rng.normal(172, 9, 200)
weight_kg = 0.55 * height_cm - 25 + rng.normal(0, 8, 200)
cov_cm = float(np.cov(height_cm, weight_kg)[0, 1])
cov_m = float(np.cov(height_cm / 100, weight_kg)[0, 1])
r_cm = float(np.corrcoef(height_cm, weight_kg)[0, 1])
r_m = float(np.corrcoef(height_cm / 100, weight_kg)[0, 1])
x = np.linspace(-3, 3, 41)
r["cov"] = {
    "covCm": round(cov_cm, 1), "covM": round(cov_m, 3), "rCm": round(r_cm, 2), "rM": round(r_m, 2),
    "points": [[round(float(a), 1), round(float(b), 1)] for a, b in zip(height_cm, weight_kg)],
    "parabolaR": round(float(np.corrcoef(x, x ** 2)[0, 1]), 2) + 0.0,
    "parabola": [[round(float(a), 2), round(float(a * a), 2)] for a in x],
}

# ── 14. The bet ─────────────────────────────────────────────────────────────
win, p_win, lose = 10, F(1, 5), -3
ev = p_win * win + (1 - p_win) * lose
r["bet"] = {"win": win, "pWin": float(p_win), "lose": lose, "ev": float(ev),
            "winPart": float(p_win * win), "losePart": float((1 - p_win) * lose)}

json.dumps(r)
`);

const results = JSON.parse(out);
const file = new URL("./results.json", import.meta.url);
writeFileSync(file, JSON.stringify(results, null, 2) + "\n");
console.log(results.runtime);
for (const [k, v] of Object.entries(results)) {
  if (k === "runtime") continue;
  const short = Object.fromEntries(Object.entries(v).filter(([, x]) => !Array.isArray(x) || x.length <= 6));
  console.log(k, JSON.stringify(short));
}
