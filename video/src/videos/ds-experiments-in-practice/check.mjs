// Measures every number and every curve the ds-experiments-in-practice video
// shows, in Pyodide 314.0.7 with NumPy, SciPy and statsmodels, the runtime the
// Data Scientist experimentation page's blocks run in the reader's browser,
// and writes what came back to results.json, which data.ts reads. Every random
// draw is seeded, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/ds-experiments-in-practice/check.mjs
//
// Where the page has code or a chart, this runs it: the SRM block
// (`chisquare` on 4,800 against 5,200), the multiple-comparisons chart's
// curve (1 - 0.95^k) and the winner's-curse chart's question (the average
// significant estimate at 20% and 80% power, here computed exactly rather
// than by simulation). Where Data Analyst Part 7 (da-ab-testing) already drew
// the same idea, this takes its numbers, so the two series agree: the novelty
// chart's two lifts (charts/novelty-effect-fades.mjs), recomputed here and
// checked against DA Part 7's results.json. Everything else is the video's
// own, marked as such below and in script.ts:
//   - a 4,960 against 5,040 split, the SRM test's "chance" case;
//   - two A/A tests of a change that does nothing, one small and one large;
//   - a checkout test rolled out unevenly across mobile and desktop;
//   - ten metrics, three of which really moved (seed 25: the first seed in
//     0 to 59 whose raw, Benjamini-Hochberg and Bonferroni calls all differ);
//   - two cities over twelve weeks, for difference-in-differences;
//   - three experiments of one change (one big and tight, two small and
//     noisy), pooled by inverse variance for the meta-analysis.
/* global console */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scipy", "statsmodels"] });

const out = py.runPython(`
import json, math, sys, warnings
import numpy as np
import scipy
import statsmodels
from scipy import stats
from scipy.optimize import brentq
from scipy.stats import chisquare
from statsmodels.stats.multitest import multipletests
import statsmodels.api as sm
warnings.filterwarnings("ignore")

r1 = lambda v: round(float(v), 1)
r2 = lambda v: round(float(v), 2)
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)
R = {"runtime": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__, "statsmodels": statsmodels.__version__}}

# ── SRM: the page's block, and a split chance does explain (the video's own) ──
def srm(observed):
    total = sum(observed)
    chi2, p = chisquare(observed, f_exp=[total / 2, total / 2])
    return {"observed": observed, "expected": total / 2, "chi2": r2(chi2), "p": float(p)}
R["srm"] = {"bad": srm([4800, 5200]), "fine": srm([4960, 5040])}

# ── No significant difference: two A/A tests of a do-nothing change ──
# 10% conversion in both arms; 1,000 per arm and 100,000 per arm. The
# difference in points with its 95% interval (unpooled normal approximation).
rng = np.random.default_rng(11)
def null_test(n):
    a = rng.binomial(n, 0.10)
    b = rng.binomial(n, 0.10)
    pa, pb = a / n, b / n
    diff = pb - pa
    se = math.sqrt(pa * (1 - pa) / n + pb * (1 - pb) / n)
    z = diff / se
    return {"n": n, "a": int(a), "b": int(b), "diff": r2(100 * diff), "lo": r2(100 * (diff - 1.96 * se)),
            "hi": r2(100 * (diff + 1.96 * se)), "p": r3(2 * stats.norm.sf(abs(z)))}
R["nosig"] = {"base": 10, "worth": 0.5, "small": null_test(1000), "large": null_test(100000)}

# ── Simpson's paradox: a checkout rolled out unevenly (the video's own) ──
# Treatment went mostly to desktop, control mostly to mobile.
cells = {
    "Mobile": {"control": (720, 8000), "treatment": (200, 2000)},
    "Desktop": {"control": (60, 2000), "treatment": (280, 8000)},
}
rows = []
for seg, arms in cells.items():
    rows.append({"segment": seg, **{k: {"conv": c, "n": n, "rate": r2(100 * c / n)} for k, (c, n) in arms.items()}})
pooled = {k: (sum(cells[s][k][0] for s in cells), sum(cells[s][k][1] for s in cells)) for k in ("control", "treatment")}
rows.append({"segment": "Pooled", **{k: {"conv": c, "n": n, "rate": r2(100 * c / n)} for k, (c, n) in pooled.items()}})
R["simpson"] = rows

# ── Novelty: charts/novelty-effect-fades.mjs, as DA Part 7 drew it ──
weeks = np.arange(1, 9)
R["novelty"] = {
    "novelty": [float(13.6 * math.exp(-0.62 * (w - 1)) + 0.5) for w in weeks],
    "durable": [float(4.2 - 0.45 * math.exp(-0.5 * (w - 1))) for w in weeks],
}

# ── Multiple comparisons: the page's curve, and ten simulated metrics ──
R["family"] = {"k": list(range(1, 21)), "p": [float(1 - 0.95 ** k) for k in range(1, 21)], "at20": r3(1 - 0.95 ** 20)}
rng = np.random.default_rng(25)
mu = np.array([3.0] * 3 + [0.0] * 7)
z = rng.normal(mu, 1)
p = 2 * stats.norm.sf(np.abs(z))
bh = multipletests(p, 0.05, "fdr_bh")[0]
bf = multipletests(p, 0.05, "bonferroni")[0]
order = np.argsort(p)
# Benjamini-Hochberg's bar for rank k is k/m x 0.05; it keeps every rank up to
# the last one whose p is under its bar. Checked against statsmodels' call.
bars = [(i + 1) / 10 * 0.05 for i in range(10)]
under = [k for k in range(10) if p[order[k]] <= bars[k]]
assert int(bh.sum()) == (under[-1] + 1 if under else 0)
R["metrics"] = {
    "m": 10,
    "real": 3,
    "rows": [{"rank": i + 1, "p": r4(p[j]), "bar": r4(bars[i]), "real": bool(mu[j] > 0), "raw": bool(p[j] < 0.05), "bh": bool(bh[j]), "bonferroni": bool(bf[j])}
             for i, j in enumerate(order)],
    "counts": {"raw": int((p < 0.05).sum()), "bh": int(bh.sum()), "bonferroni": int(bf.sum()),
               "rawFalse": int(((p < 0.05) & (mu == 0)).sum())},
    "bonferroniCut": 0.05 / 10,
}

# ── Difference-in-differences: two cities, twelve weeks (the video's own) ──
# Weekly sign-ups. Both cities share a trend and a season; the treated city
# gets a policy from week 7 that adds 6 a week. Noise SD 1.
rng = np.random.default_rng(4)
t = np.arange(1, 13)
season = 2.5 * np.sin(2 * np.pi * (t - 1) / 12)
post = (t >= 7).astype(float)
treated = 40 + 1.0 * t + season + 6 * post + rng.normal(0, 1, 12)
control = 30 + 1.0 * t + season + rng.normal(0, 1, 12)
tb, ta = treated[t < 7].mean(), treated[t >= 7].mean()
cb, ca = control[t < 7].mean(), control[t >= 7].mean()
y = np.concatenate([treated, control])
g = np.concatenate([np.ones(12), np.zeros(12)])
pp = np.concatenate([post, post])
X = sm.add_constant(np.column_stack([g, pp, g * pp]))
fit = sm.OLS(y, X).fit()
R["did"] = {
    "weeks": t.tolist(), "start": 7, "truth": 6,
    "treated": [r2(v) for v in treated], "control": [r2(v) for v in control],
    "treatedBefore": r2(tb), "treatedAfter": r2(ta), "controlBefore": r2(cb), "controlAfter": r2(ca),
    "treatedChange": r2(ta - tb), "controlChange": r2(ca - cb), "did": r2((ta - tb) - (ca - cb)),
    "ols": r2(fit.params[3]), "olsLo": r2(fit.conf_int()[3][0]), "olsHi": r2(fit.conf_int()[3][1]),
    "preGap": r2(np.polyfit(t[t < 7], treated[t < 7] - control[t < 7], 1)[0]),
}

# ── The winner's curse: the average significant estimate, exactly ──
def curse(target):
    pw = lambda s: stats.norm.sf(1.96 - 1 / s) + stats.norm.cdf(-1.96 - 1 / s)
    se = brentq(lambda s: pw(s) - target, 0.05, 5)
    c = 1.96 * se
    a, b = (c - 1) / se, (-c - 1) / se
    upper = stats.norm.sf(a) + se * stats.norm.pdf(a)
    lower = stats.norm.cdf(b) - se * stats.norm.pdf(b)
    return {"power": target, "se": r4(se), "ratio": r2((upper + lower) / (stats.norm.sf(a) + stats.norm.cdf(b)))}
R["curse"] = [curse(v) for v in (0.2, 0.5, 0.8)]

# ── Meta-analysis: three experiments of one change (the video's own) ──
# One big, tight experiment and two small, noisy ones, each an estimated lift
# in percent with its standard error. Pooled by inverse variance (the page's
# fixed-effects model), against the plain average of the three headlines;
# statsmodels' combine_effects must agree.
from statsmodels.stats.meta_analysis import combine_effects
est = np.array([2.0, 6.0, 9.0])
se = np.array([1.0, 2.0, 3.0])
w = 1 / se ** 2
pooled = float((w * est).sum() / w.sum())
fe = combine_effects(est, se ** 2, method_re="iterated").summary_frame().loc["fixed effect", "eff"]
assert abs(fe - pooled) < 1e-9, (fe, pooled)
R["meta"] = {
    "studies": [{"est": float(e), "se": float(s), "weight": r4(wi / w.sum())} for e, s, wi in zip(est, se, w)],
    "average": r2(est.mean()),
    "pooled": r2(pooled),
    "pooledSe": r2(1 / math.sqrt(w.sum())),
}

json.dumps(R)
`);

const results = JSON.parse(out);

// The novelty lifts must be DA Part 7's, number for number.
const da = JSON.parse(readFileSync(join(here, "../da-ab-testing/results.json"), "utf8")).charts.novelty;
for (const key of ["novelty", "durable"]) {
  results.novelty[key].forEach((v, i) => {
    if (Math.abs(v - da[key][i]) > 1e-9) throw new Error(`novelty.${key}[${i}] ${v} is not DA Part 7's ${da[key][i]}`);
  });
}

writeFileSync(join(here, "results.json"), JSON.stringify(results, null, 1) + "\n");
const { srm, nosig, simpson, novelty, family, metrics, did, curse, meta } = results;
console.log(JSON.stringify(results.runtime));
console.log("srm", JSON.stringify(srm));
console.log("nosig", JSON.stringify(nosig));
console.log("simpson", JSON.stringify(simpson));
console.log("novelty week 1", novelty.novelty[0], novelty.durable[0], "week 8", novelty.novelty[7].toFixed(2), novelty.durable[7].toFixed(2));
console.log("family at 20", family.at20);
console.log("metrics", JSON.stringify(metrics.counts), metrics.rows.map((r) => `${r.p}${r.real ? "*" : ""}`).join(" "));
console.log("did", JSON.stringify({ ...did, treated: undefined, control: undefined }));
console.log("curse", JSON.stringify(curse));
console.log("meta", JSON.stringify(meta));
