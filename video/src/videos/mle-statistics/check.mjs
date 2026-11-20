// Measures every number, interval and curve the mle-statistics video shows,
// in Pyodide 314.0.7 with NumPy and scikit-learn, the runtime the Machine
// Learning Engineer statistics page's blocks run in the reader's browser, and
// writes what came back to results.json, which data.ts reads. Every random
// draw is seeded, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/mle-statistics/check.mjs
//
// Data is the page's own blocks (the CLT simulation, the bootstrap, the
// permutation test), the page's own chart inputs (the base-rate grid's 1 in
// 1,000, 99% and 1%; the density's standard deviation of 0.3), arithmetic
// from stated assumptions (standard errors, sample sizes, power), or the
// video's own seeded simulations, each marked as such here and in script.ts:
//   - two models on the same 2,000 test examples (constructed, not drawn:
//     1,806 both right, 4 only the old model, 14 only the new);
//   - test sets for the interval's coverage, and a 40-example slice;
//   - request latencies for the bootstrap, and test rows nested in users;
//   - two equally good models checked as labels arrive (peeking);
//   - loan applicants, defaults and an approval policy, for selection bias.
//
// Then it fails (exit 1) if:
// - the page stops asking one of the seventeen questions the video answers,
//   or stops saying what the narration takes from it;
// - the narration stops saying, in words, a number computed here.
/* global console, process */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scikit-learn"] });

const out = py.runPython(`
import json, math, sys
from math import comb
from statistics import NormalDist
import numpy as np
import sklearn

R = {"runtime": {"python": sys.version.split()[0], "numpy": np.__version__, "sklearn": sklearn.__version__}}
r2 = lambda v: round(float(v), 2)
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)
Z = NormalDist()

# ── The hook: two models on the same 2,000 test examples (constructed) ──
N = 2000
old = np.zeros(N, int); new = np.zeros(N, int)
old[:1806] = 1; new[:1806] = 1
old[1806:1810] = 1        # only the old model right
new[1810:1824] = 1        # only the new model right
R["models"] = {
    "n": N, "old": r4(old.mean()), "new": r4(new.mean()),
    "bothRight": int(((old == 1) & (new == 1)).sum()), "bothWrong": int(((old == 0) & (new == 0)).sum()),
    "onlyOld": int(((old == 1) & (new == 0)).sum()), "onlyNew": int(((old == 0) & (new == 1)).sum()),
}

# ── 1. Standard deviation and standard error ──
p = float(new.mean())
sd = math.sqrt(p * (1 - p))
R["se"] = {
    "p": p, "sd": r3(sd), "n": N, "se": r4(sd / math.sqrt(N)), "half": r4(sd / math.sqrt(4 * N)), "nHalf": 4 * N,
    "margin": r4(1.96 * sd / math.sqrt(N)),
    "curve": [[n, r4(sd / math.sqrt(n))] for n in [100, 250, 500, 1000, 2000, 4000, 8000, 16000]],
}

# ── 2. The CLT: the page's own block ──
rng = np.random.default_rng(42)
population = rng.exponential(scale=3.0, size=100_000)
sample_means = np.array([rng.choice(population, 40).mean() for _ in range(3000)])
hist, edges = np.histogram(sample_means, bins=30)
phist, pedges = np.histogram(population, bins=30, range=(0, 15))
R["clt"] = {
    "popMean": r3(population.mean()), "meanOfMeans": r3(sample_means.mean()),
    "seFormula": r3(population.std() / 40 ** 0.5), "seSimulated": r3(sample_means.std()),
    "n": 40, "samples": 3000,
    "popSkew": r2(((population - population.mean()) ** 3).mean() / population.std() ** 3),
    "meanSkew": r2(((sample_means - sample_means.mean()) ** 3).mean() / sample_means.std() ** 3),
    "means": {"counts": hist.tolist(), "edges": [r3(v) for v in edges]},
    "population": {"counts": phist.tolist(), "edges": [r3(v) for v in pedges]},
}
# The law of large numbers on the same population: one running mean.
run = np.cumsum(population[:2000]) / np.arange(1, 2001)
R["lln"] = {"at": [[n, r3(run[n - 1])] for n in [1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]], "truth": r3(population.mean())}

# ── 4. Confidence intervals: a hundred test sets, then a small slice ──
rc = np.random.default_rng(2026)
TRUE = 0.91
k = rc.binomial(N, TRUE, 100); ph = k / N
half = 1.96 * np.sqrt(ph * (1 - ph) / N)
cover = (ph - half <= TRUE) & (TRUE <= ph + half)
R["ci"] = {
    "truth": TRUE, "n": N, "sets": 100, "covered": int(cover.sum()),
    "intervals": [[r4(a), r4(b), bool(c)] for a, b, c in zip(ph - half, ph + half, cover)],
}
def coverage(n, p, sims=100_000, seed=7):
    g = np.random.default_rng(seed)
    kk = g.binomial(n, p, sims); q = kk / n
    w = 1.96 * np.sqrt(q * (1 - q) / n)
    wald = np.mean((q - w <= p) & (p <= q + w))
    z = 1.96
    c = (q + z * z / (2 * n)) / (1 + z * z / n)
    h = z * np.sqrt(q * (1 - q) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    wilson = np.mean((c - h <= p) & (p <= c + h))
    return {"n": n, "p": p, "sims": sims, "wald": r3(wald), "wilson": r3(wilson), "perfect": r3(np.mean(kk == n)),
            "perfectExact": r4(p ** n)}
R["slice"] = coverage(40, 0.97)

# ── 5. The bootstrap: the page's block, a simulated p95, and rows nested in users ──
rng = np.random.default_rng(0)
data = rng.normal(loc=50, scale=10, size=200)
boot_means = np.array([rng.choice(data, size=len(data), replace=True).mean() for _ in range(5000)])
low, high = np.percentile(boot_means, [2.5, 97.5])
s = data.std(ddof=1) / math.sqrt(len(data))
R["bootPage"] = {"mean": r2(data.mean()), "low": r2(low), "high": r2(high),
                 "formula": [r2(data.mean() - 1.96 * s), r2(data.mean() + 1.96 * s)]}
rl = np.random.default_rng(95)
lat = rl.lognormal(mean=math.log(40), sigma=0.6, size=1000)       # simulated latencies, ms
boots = np.array([np.percentile(rl.choice(lat, lat.size, replace=True), 95) for _ in range(5000)])
bh, be = np.histogram(boots, bins=30)
lh, le = np.histogram(lat, bins=40, range=(0, 200))
R["bootP95"] = {
    "requests": int(lat.size), "resamples": 5000, "median": r2(np.median(lat)), "p95": r2(np.percentile(lat, 95)),
    "low": r2(np.percentile(boots, 2.5)), "high": r2(np.percentile(boots, 97.5)), "se": r2(boots.std()),
    "boots": {"counts": bh.tolist(), "edges": [r2(v) for v in be]},
    "latency": {"counts": lh.tolist(), "edges": [r2(v) for v in le], "above": int((lat > 200).sum())},
}
ru = np.random.default_rng(12)
U, M = 200, 10
skill = ru.normal(0, 1.2, U)
pu = 1 / (1 + np.exp(-(2.2 + skill)))
correct = (ru.random((U, M)) < pu[:, None]).astype(float)
flat = correct.ravel()
rowb = np.array([ru.choice(flat, flat.size).mean() for _ in range(3000)])
userb = np.array([correct[ru.integers(0, U, U)].mean() for _ in range(3000)])
truth = []
for _ in range(3000):
    s2 = ru.normal(0, 1.2, U); p2 = 1 / (1 + np.exp(-(2.2 + s2)))
    truth.append((ru.random((U, M)) < p2[:, None]).mean())
R["cluster"] = {
    "users": U, "perUser": M, "rows": U * M, "accuracy": r3(correct.mean()),
    "seRows": r4(rowb.std()), "seUsers": r4(userb.std()), "seTrue": r4(np.std(truth)),
    "narrower": r3(1 - rowb.std() / userb.std()),
}

# ── 6, 7. The p-value, and checking as labels arrive (two equal models) ──
rp = np.random.default_rng(404)
RUNS, STEP, LOOKS = 10_000, 200, 10
ACC = 0.9
a = rp.random((RUNS, STEP * LOOKS)) < ACC
b = rp.random((RUNS, STEP * LOOKS)) < ACC
stopped = np.zeros(RUNS, bool)
final = None
for look in range(1, LOOKS + 1):
    n = look * STEP
    pa = a[:, :n].mean(1); pb = b[:, :n].mean(1)
    pool = (pa + pb) / 2
    zz = (pb - pa) / np.sqrt(2 * pool * (1 - pool) / n)
    sig = np.abs(zz) > 1.96
    stopped |= sig
    if look == LOOKS:
        final = sig
R["peek"] = {"runs": RUNS, "step": STEP, "looks": LOOKS, "accuracy": ACC,
             "onceAtEnd": r3(final.mean()), "everyLook": r3(stopped.mean())}

# ── 8. The permutation test: the page's block, then the two models ──
rng = np.random.default_rng(1)
control = rng.normal(100, 15, size=50)
treatment = rng.normal(107, 15, size=50)
observed = treatment.mean() - control.mean()
pooled = np.concatenate([control, treatment])
n = len(control)
diffs = np.empty(10000)
for i in range(10000):
    perm = rng.permutation(pooled)
    diffs[i] = perm[:n].mean() - perm[n:].mean()
ph_, pe_ = np.histogram(diffs, bins=40)
R["permPage"] = {"observed": r2(observed), "p": r4(np.mean(np.abs(diffs) >= abs(observed))),
                 "null": {"counts": ph_.tolist(), "edges": [r2(v) for v in pe_]}}
rm = np.random.default_rng(7)
gap = new.mean() - old.mean()
both = np.concatenate([old, new])
un = np.empty(10000)
for i in range(10000):
    q = rm.permutation(both)
    un[i] = q[N:].mean() - q[:N].mean()
d = new - old
flips = rm.choice([-1, 1], size=(10000, N))
pa_ = (flips * d).mean(1)
uh, ue = np.histogram(un, bins=41, range=(-0.02, 0.02))
pvals = np.unique(np.round(pa_, 4), return_counts=True)
m = int((d != 0).sum()); w = int((d > 0).sum())
R["permModels"] = {
    "gap": r4(gap), "shuffles": 10000,
    "unpaired": r3(np.mean(np.abs(un) >= abs(gap) - 1e-12)),
    "paired": r3(np.mean(np.abs(pa_) >= abs(gap) - 1e-12)),
    "signTest": r4(2 * sum(comb(m, j) for j in range(w, m + 1)) / 2 ** m), "disagree": m, "newWins": w,
    "unpairedNull": {"counts": uh.tolist(), "edges": [r4(v) for v in ue]},
    "pairedNull": {"values": [r4(v) for v in pvals[0]], "counts": pvals[1].tolist()},
}

# ── 9. Power: an online test of the new model (arithmetic, then a check by simulation) ──
def n_needed(p1, p2, alpha=0.05, power=0.8):
    za = Z.inv_cdf(1 - alpha / 2); zb = Z.inv_cdf(power); pb = (p1 + p2) / 2
    return (za * math.sqrt(2 * pb * (1 - pb)) + zb * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2
def power_at(n, p1, p2, alpha=0.05):
    za = Z.inv_cdf(1 - alpha / 2); pb = (p1 + p2) / 2
    return Z.cdf((abs(p2 - p1) * math.sqrt(n) - za * math.sqrt(2 * pb * (1 - pb))) / math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)))
rw = np.random.default_rng(8)
def sim_power(n, p1, p2, sims=4000):
    x = rw.binomial(n, p1, sims) / n; y = rw.binomial(n, p2, sims) / n
    pb = (x + y) / 2
    return float(np.mean(np.abs((y - x) / np.sqrt(2 * pb * (1 - pb) / n)) > 1.96))
full = n_needed(0.05, 0.055); halfLift = n_needed(0.05, 0.0525)
R["power"] = {
    "base": 0.05, "target": 0.055, "alpha": 0.05, "power": 0.8,
    "perArm": int(math.ceil(full)), "perArmHalfLift": int(math.ceil(halfLift)), "ratio": r2(halfLift / full),
    "smallArm": 5000, "powerSmall": r3(power_at(5000, 0.05, 0.055)), "simSmall": r3(sim_power(5000, 0.05, 0.055)),
    "simFull": r3(sim_power(int(math.ceil(full)), 0.05, 0.055)),
    "curve": [[n, r3(power_at(n, 0.05, 0.055))] for n in [1000, 2000, 5000, 10000, 20000, 31234, 50000, 80000]],
}

# ── 10. Selection bias: loans, a simulation ──
rs = np.random.default_rng(31)
A = 100_000
risk = rs.normal(0, 1, A)
score = risk + rs.normal(0, 0.7, A)                 # the old model's noisy view of risk
default = rs.random(A) < 1 / (1 + np.exp(-(-2.6 + 1.3 * risk)))
approved = score < np.quantile(score, 0.6)          # it approves the 60% that look safest
ids = np.nonzero(approved)[0]
by_size = {m: r4(default[rs.choice(ids, m, replace=False)].mean()) for m in [1000, 10000, 60000]}
explore = rs.random(A) < 0.02                       # approved at random, whatever the score
R["selection"] = {
    "applicants": A, "approvedShare": 0.6, "approved": int(approved.sum()),
    "population": r4(default.mean()), "approvedRate": r4(default[approved].mean()),
    "bySize": {str(k): v for k, v in by_size.items()},
    "explore": int(explore.sum()), "exploreRate": r4(default[explore].mean()),
    "exploreSe": r4(math.sqrt(default[explore].mean() * (1 - default[explore].mean()) / explore.sum())),
}

# ── 11. Maximum likelihood ──
halves = np.full(2000, 0.5)
grid = np.linspace(0.01, 0.99, 99)
def lik(k, n):
    ll = k * np.log(grid) + (n - k) * np.log(1 - grid)
    return [r4(v) for v in np.exp(ll - ll.max())]
R["mle"] = {
    "labels": 2000, "product": float(np.prod(halves)), "logLik": r2(np.log(halves).sum()),
    "smallest": float(np.nextafter(0, 1)),
    "clicks": 3, "views": 3, "mle": 1.0, "smoothed": r2((3 + 1) / (3 + 2)),
    "grid": [r2(v) for v in grid], "curve33": lik(3, 3), "curveSmoothed": lik(4, 5),
}

# ── 12. Bayes: the page's base-rate grid, as fraud ──
def flags(prev, pop=100_000, sens=0.99, fpr=0.01):
    bad = pop * prev
    tp = sens * bad; fp = fpr * (pop - bad)
    return {"prevalence": prev, "fraud": round(bad), "caught": round(tp), "falseFlags": round(fp),
            "flagged": round(tp + fp), "precision": r4(tp / (tp + fp)), "recall": sens}
R["bayes"] = {"rare": flags(0.001), "common": flags(0.01), "population": 100_000}

# ── The quick round ──
sd_ = 0.3
x = np.linspace(-3, 3, 101)
R["rapid"] = {
    "densitySd": sd_, "densityPeak": r2(1 / (sd_ * math.sqrt(2 * math.pi))),
    "densityArea": r2(Z.cdf(1) - Z.cdf(-1)),
    "rSquare": r3(abs(np.corrcoef(x, x ** 2)[0, 1])),
}
rq = np.random.default_rng(23)
h_cm = rq.normal(170, 9, 200)
w_kg = 0.9 * (h_cm - 170) + rq.normal(70, 8, 200)
R["rapid"]["covariance"] = {"cmKg": r2(np.cov(h_cm, w_kg)[0, 1]), "mKg": r3(np.cov(h_cm / 100, w_kg)[0, 1]),
                            "r": r3(np.corrcoef(h_cm, w_kg)[0, 1]), "rM": r3(np.corrcoef(h_cm / 100, w_kg)[0, 1])}

json.dumps(R)
`);

const R = JSON.parse(out);
writeFileSync(join(here, "results.json"), JSON.stringify(R) + "\n");
const brief = (o) => JSON.stringify(o, (k, v) => (Array.isArray(v) && v.length > 12 ? `[${v.length} items]` : v));
for (const k of Object.keys(R)) console.log(k, brief(R[k]));

// ── What the narration and the screen take from the page ─────────────────
const page = readFileSync(join(here, "../../../../content/interview/machine-learning-engineer/statistics-and-probability.mdx"), "utf8");
const problems = [];
const QUESTIONS = [
  "What is a random variable, and what's the difference between a PMF and a PDF?",
  "Describe the distributions an ML engineer should know.",
  "What is Maximum Likelihood Estimation (MLE)?",
  "What is the difference between standard deviation and standard error?",
  "What does the Central Limit Theorem say, and why does it matter?",
  "What is the Law of Large Numbers, and how is it different from the CLT?",
  "What is a confidence interval, really?",
  "What is bootstrapping, and when do you use it?",
  "What exactly is a p-value?",
  "What is hypothesis testing, and what are its steps?",
  "What is a permutation test?",
  "What are Type I and Type II errors, and what is power?",
  "What sampling methods should you know?",
  "What is selection (sampling) bias?",
  "What is Bayes' theorem?",
  "Covariance vs correlation, what's the difference?",
  "Why does correlation not imply causation?",
];
// Part 1 answers this one (the plan's "answered together").
const ELSEWHERE = ["Explain the bias–variance decomposition."];
const asked = [...page.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
if (asked.length !== QUESTIONS.length + ELSEWHERE.length) problems.push(`the page asks ${asked.length} questions; this video answers ${QUESTIONS.length}, Part 1 ${ELSEWHERE.length}`);
for (const q of [...QUESTIONS, ...ELSEWHERE]) if (!asked.includes(q)) problems.push(`the page no longer asks: ${q}`);
const quotes = [
  // "q1", "q2", "q3"
  "**Standard deviation** measures the spread of individual observations",
  "spread of a *statistic* (usually the mean)",
  "each halving of the standard error costs four times\nthe data",
  "approximately normal **regardless of the population's shape**",
  "even on skewed data",
  "rng.exponential(scale=3.0, size=100_000)",
  "rng.choice(population, 40).mean() for _ in range(3000)",
  "it tells you *where* the estimate ends up. The CLT tells\nyou *what shape* the estimate's uncertainty takes",
  // "q4"
  "It's a procedure, not a probability about one interval.",
  "$z^{*} \\approx 1.96$ for 95%",
  // "q5"
  "resampling your data **with replacement** many times",
  "It needs no formula for the standard error, so it\nworks for medians, ratios, or any statistic",
  "rng.normal(loc=50, scale=10, size=200)",
  "for _ in range(5000)",
  // "q6", "q7"
  "**at least as extreme** as yours,\n**assuming the null hypothesis is true**",
  "It is **not** the probability the null is true, nor the\nprobability your result is a fluke",
  "fix $\\alpha$ and the sample size before collecting data",
  "Fixing the hypotheses and $\\alpha$ in advance is what keeps the test honest.",
  // "q8"
  "builds the null distribution by shuffling group\nlabels",
  "control   = rng.normal(100, 15, size=50)",
  "treatment = rng.normal(107, 15, size=50)",
  "diffs = np.empty(10000)",
  // "q9"
  "Power rises with larger sample size, larger effect size,\nlower variance, and higher $\\alpha$",
  "lowering $\\alpha$ trades fewer false\npositives for more false negatives",
  // "q10"
  "estimates are systematically off no matter how much data\nyou collect",
  "training on a\npopulation that differs from serving traffic",
  // "q11"
  "Because products of probabilities underflow, you maximize the\n**log-likelihood**",
  "For a Gaussian, the MLE of the mean is just the sample mean",
  "maximizing the log-likelihood of the labels *is* the training\nobjective",
  "can overfit\nsmall samples",
  // "q12"
  "with a rare condition, even a\nvery accurate test leaves a low posterior probability",
  "the p-value is computed *assuming* the\nnull, so it cannot be a probability *of* the null",
  // the quick round
  "$P(X = x) = 0$\nfor any single point",
  "a density\nis free to go above 1",
  "($\\text{mean} = \\text{variance} = \\lambda$)",
  "**Exponential** for waiting times",
  "**Stratified**\nsamples within subgroups to guarantee representation",
  "**Cluster** samples whole groups to cut cost",
  "its magnitude\ndepends on their units",
  "a zero correlation can\nstill hide a strong non-linear relationship (e.g., $y = x^2$)",
  "Ice-cream sales and drownings correlate, but temperature\ncauses both.",
  "a randomized controlled experiment or a causal-inference method",
];
const flat = (t) => t.replace(/\s+/g, " ");
for (const q of quotes) if (!flat(page).includes(flat(q))) problems.push(`the page no longer says: ${flat(q)}`);
// The page's charts the video takes its inputs from.
const chart = (slug) => readFileSync(join(here, `../../../../charts/${slug}.mjs`), "utf8");
if (!page.includes('<Chart slug="base-rate-grid" />')) problems.push("the page no longer places base-rate-grid");
if (!/TRUE_POSITIVES = 99;[\s\S]*FALSE_POSITIVES = 999;/.test(chart("base-rate-grid"))) problems.push("base-rate-grid no longer counts 99 and 999");
if (!chart("base-rate-grid").includes("1-in-1,000 base rate, 99%\n * sensitivity and a 1% false-positive rate")) problems.push("base-rate-grid no longer says its rates");
if (!/const SD = 0\.3;/.test(chart("density-is-area-not-height"))) problems.push("density-is-area-not-height no longer uses a standard deviation of 0.3");

// ── Checks on the run itself ──────────────────────────────────────────────
const M = R.models;
if (M.old !== 0.905 || M.new !== 0.91 || M.onlyOld !== 4 || M.onlyNew !== 14) problems.push("the two models are no longer 90.5% and 91.0%, apart on 4 and 14");
if (R.permModels.unpaired < 0.3) problems.push("the unpaired test is no longer clearly not significant");
if (R.permModels.paired > 0.05) problems.push("the paired test is no longer under 0.05");
if (Math.abs(R.permModels.paired - R.permModels.signTest) > 0.01) problems.push("the paired permutation and the exact sign test disagree");
if (Math.abs(R.power.simFull - 0.8) > 0.03) problems.push(`simulated power at the computed n is ${R.power.simFull}`);
if (Math.abs(R.power.simSmall - R.power.powerSmall) > 0.03) problems.push("simulated and computed power at 5,000 disagree");
if (R.mle.product !== 0) problems.push("two thousand halves no longer multiply to exactly zero");
if (Math.abs(R.cluster.seUsers - R.cluster.seTrue) > 0.002) problems.push("the user bootstrap no longer matches the true standard error");
if (Math.abs(R.slice.perfect - R.slice.perfectExact) > 0.01) problems.push("the share of perfect slices disagrees with 0.97 to the fortieth");
for (const [k, v] of Object.entries(R.selection.bySize)) if (Math.abs(v - R.selection.approvedRate) > 0.01) problems.push(`approved sample of ${k} is ${v}, not near ${R.selection.approvedRate}`);

// ── The numbers the narration says in words ───────────────────────────────
const { script } = await import(pathToFileURL(join(here, "script.ts")).href);
const text = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`script.ts has no beat "${id}"`);
  return b.text.toLowerCase();
};
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const words = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
const big = (n) => {
  if (n < 100) return words(n);
  if (n < 1000) return `${n < 200 ? "a" : words(Math.floor(n / 100))} hundred${n % 100 ? ` and ${words(n % 100)}` : ""}`;
  return `${big(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${big(n % 1000)}` : ""}`;
};
/** 0.475 → "point four seven five"; 1.33 → "one point three three". */
const decimal = (v, places) => {
  const [whole, frac] = v.toFixed(places).split(".");
  return `${whole === "0" ? "" : `${words(Number(whole))} `}point ${[...frac].map((c) => ONES[Number(c)]).join(" ")}`;
};
const pctWords = (v) => `${words(Math.round(v * 100))} percent`;
/** 0.053 → "five point three percent". */
const pct1 = (v) => `${decimal(v * 100, 1)} percent`;
const claims = [
  ["hook", "two thousand test examples"],
  ["hook", "ninety-one percent"],
  ["hook", "ninety and a half"],
  ["q1", decimal(R.se.sd, 2)],
  ["q1-se", "two thirds of a percentage point"],
  ["q1-n", "a third of a point"],
  ["q1-n", `${big(R.se.nHalf)} examples`],
  ["q2-sim", `${big(R.clt.samples)} samples of ${words(R.clt.n)}`],
  ["q2-sim", decimal(R.clt.seFormula, 3)],
  ["q2-sim", decimal(R.clt.seSimulated, 3)],
  ["q4-sim", `${words(R.ci.covered)} of the hundred`],
  ["q4-slice", `${words(R.slice.n)} examples`],
  ["q4-slice", `${words(Math.round(R.slice.perfect * 10))} slices in ten`],
  ["q4-slice", `${pctWords(R.slice.wald)}`],
  ["q4-slice", `covers ${words(Math.round(R.slice.wilson * 100))}`],
  ["q5-p95", `${big(Math.round(R.bootP95.p95))} milliseconds`],
  ["q5-p95", `between ${big(Math.round(R.bootP95.low))} and ${big(Math.round(R.bootP95.high))}`],
  ["q5-unit", Math.abs(R.cluster.narrower - 1 / 3) < 0.05 ? "a third too narrow" : "(the clustered ratio changed)"],
  ["q7-peek", `${words(Math.round(R.peek.everyLook * 100))} percent of the time`],
  ["q8", decimal(R.permPage.observed, 1)],
  ["q8", `${decimal(R.permPage.p * 100, 1)} percent of the time`],
  ["q8-models", decimal(R.permModels.unpaired, 2)],
  ["q8-paired", `disagree on only ${words(R.permModels.disagree)}`],
  ["q8-paired", `wins ${words(R.permModels.newWins)}`],
  ["q8-paired", `point oh ${words(Math.round(R.permModels.paired * 100))}`],
  ["q9-online", `about ${words(Math.round(R.power.perArm / 1000))} thousand users per arm`],
  ["q9-online", R.power.ratio > 3.6 && R.power.ratio < 4.2 ? "four times the users" : "(the half-lift ratio changed)"],
  ["q9-null", Math.abs(R.power.powerSmall - 0.2) < 0.02 ? "one time in five" : "(the small test's power changed)"],
  ["q10-loans", pct1(R.selection.approvedRate)],
  ["q10-loans", pct1(R.selection.population)],
  ["q10-fix", pct1(R.selection.exploreRate)],
  ["q11-log", `minus ${big(-Math.round(R.mle.logLik)).replace("one thousand three hundred and", "thirteen hundred and")}`],
  ["q11-small", "four in five"],
  ["q12-fraud", `${words(R.bayes.rare.caught)} frauds and ${big(R.bayes.rare.falseFlags)} honest`],
  ["q12-fraud", `${pctWords(R.bayes.rare.precision)} of the time`],
  ["q12-shift", R.bayes.common.precision === 0.5 ? "half the time" : "(the common-fraud precision changed)"],
  ["r-pdf", R.rapid.densityPeak > 1 ? "the height can pass one" : "(the density no longer passes one)"],
  ["r-corr", R.rapid.rSquare === 0 ? "a correlation of zero" : "(r for x squared changed)"],
];
for (const [id, phrase] of claims) if (!text(id).includes(phrase)) problems.push(`beat "${id}" no longer says "${phrase}"`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("\nok: the page and the narration agree with the run");
