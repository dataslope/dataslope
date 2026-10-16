"""Measures every number and every dot the Estimation video shows.

    python3 src/videos/estimation/measure.py > src/videos/estimation/measurements.json

Each part re-runs one of the lesson code blocks the video is built from, with
its own seed and its own calls in its own order, so what it prints is what the
page prints (the page's prepopulated outputs, lib/generated/block-outputs.json,
show the same numbers). The lessons are in
content/courses/statistics-for-data-science-python/:

- "users" is confidence-intervals.mdx, "Building a confidence interval for a
  mean" (seed 42): 50 users' monthly spend, Normal(48, 14), and its 95%
  t-interval. The video also marks x-bar +/- 2 s on the same sample, the
  lesson's "range that holds ~95% of individual values", and the same
  sample's 99.99% interval, after the lesson's "a 99.99% interval so vague".
- "coverage" is confidence-intervals.mdx, "The canonical simulation" (seed 7):
  100 samples of 40 from Normal(100, 15), a 95% t-interval from each.
- "levels" and "sizes" are confidence-intervals.mdx, "What controls the
  width" (seed 0): one sample of 200 at four confidence levels, then fresh
  samples of 25, 100, 400 and 1,600 at 95%. "spread" is the video's own: the
  same sample of 200 with every value's distance from the mean doubled, which
  doubles s and so the width, the lesson's third lever.
- "rate" is confidence-intervals.mdx, "A CI for a proportion": 540 of 3,000.
- "difference" is two of confidence-intervals.mdx's own examples: the
  callout "'The CI includes 0' is not 'no effect'" (a difference CI of
  -0.5 to 8.0), and the difference interval in its chart
  overlapping-cis-are-not-a-test (charts/overlapping-cis-are-not-a-test.mjs:
  means 100 and 111, standard errors 3.0 and 3.2, z = 1.96), recomputed here.
- "bootMean" is the-bootstrap.mdx, "Bootstrapping a mean" (seed 42): 60 wait
  times, Gamma(2, 4), 5,000 resamples. The first resample's indices are
  recovered by replaying the same generator: Generator.choice with
  replace=True on an array of length n draws integers(0, n), so choosing from
  range(60) consumes the stream identically (asserted below).
- "bootMedian" is the-bootstrap.mdx, "The payoff: a CI for the median"
  (seed 7): 120 lognormal "incomes", 5,000 resampled medians.
- "biased" and "maximum" are the video's own, for the lesson's two cautions
  ("The bootstrap cannot create information", "The statistic depends on
  extremes"). "biased": 60 waits from the lesson's own Gamma(2, 4), whose true
  mean is 8, but recorded only when under ten minutes (seed 6), bootstrapped
  like the lesson's mean. "maximum": the bootstrap distribution of the
  maximum of the lesson's 60 waits (seed 9), the lesson chart
  bootstrap-fails-for-max's "about 63% of resamples" on this sample.

Printed checks (the lessons' own output lines) go to stderr.
"""

import json
import platform
import sys

import numpy as np
import scipy
import pandas as pd
from scipy import stats


def r(x, d=4):
    return round(float(x), d)


def rs(values, d=3):
    return [round(float(v), d) for v in values]


def say(*args):
    print(*args, file=sys.stderr)


out = {
    "env": {
        "python": platform.python_version(),
        "numpy": np.__version__,
        "scipy": scipy.__version__,
        "pandas": pd.__version__,
    }
}

# ── Part 1. Fifty users (confidence-intervals, seed 42) ─────────────────────
rng = np.random.default_rng(42)
sample = rng.normal(loc=48, scale=14, size=50)
n = sample.size
x_bar = sample.mean()
s = sample.std(ddof=1)
se = s / np.sqrt(n)
low, high = stats.t.interval(0.95, df=n - 1, loc=x_bar, scale=se)
t_crit = stats.t.ppf(0.975, df=n - 1)
z_crit = stats.norm.ppf(0.975)
say(f"n            = {n}")
say(f"x-bar        = {x_bar:.2f}   (point estimate)")
say(f"std error    = {se:.2f}")
say(f"95% CI       = ({low:.2f}, {high:.2f})")
say(f"margin       = +/- {(high - low) / 2:.2f}")
two_lo, two_hi = x_bar - 2 * s, x_bar + 2 * s
inside = int(((sample >= two_lo) & (sample <= two_hi)).sum())
in_ci = int(((sample >= low) & (sample <= high)).sum())
say(f"  users: s {s:.2f}, t crit {t_crit:.4f} vs z {z_crit:.4f}; x-bar +/- 2s = {two_lo:.2f}..{two_hi:.2f} holds {inside} of {n}; the CI holds {in_ci}")
# The lesson's 99.99% aside ("a 99.99% interval so vague...") on this sample.
v_lo, v_hi = stats.t.interval(0.9999, df=n - 1, loc=x_bar, scale=se)
say(f"  users: 99.99% interval {v_lo:.2f}..{v_hi:.2f}; the population mean is the block's loc=48, inside the 95% interval")
out["users"] = {
    "seed": 42,
    # The block draws from Normal(loc=48, scale=14): the mean we know here.
    "mu": 48.0,
    "n": n,
    "values": rs(sample),
    "xBar": r(x_bar),
    "s": r(s),
    "se": r(se),
    "tCrit": r(t_crit),
    "zCrit": r(z_crit),
    "lo": r(low),
    "hi": r(high),
    "margin": r((high - low) / 2),
    # The same margin with the normal's 1.96, for the t against z comparison.
    "zLo": r(x_bar - z_crit * se),
    "zHi": r(x_bar + z_crit * se),
    "vagueLo": r(v_lo),
    "vagueHi": r(v_hi),
    "twoSdLo": r(two_lo),
    "twoSdHi": r(two_hi),
    "insideTwoSd": inside,
    "insideCi": in_ci,
    "min": r(sample.min()),
    "max": r(sample.max()),
}

# ── Part 1. A hundred intervals (confidence-intervals, seed 7) ──────────────
rng = np.random.default_rng(7)
MU_TRUE, SIGMA, N_COV, N_INTERVALS = 100.0, 15.0, 40, 100
intervals = []
first = None
for i in range(N_INTERVALS):
    smp = rng.normal(MU_TRUE, SIGMA, size=N_COV)
    if first is None:
        first = smp
    se_i = smp.std(ddof=1) / np.sqrt(N_COV)
    lo, hi = stats.t.interval(0.95, df=N_COV - 1, loc=smp.mean(), scale=se_i)
    intervals.append({"lo": r(lo, 3), "hi": r(hi, 3), "mean": r(smp.mean(), 3), "covers": bool(lo <= MU_TRUE <= hi)})
covers = np.array([iv["covers"] for iv in intervals])
n_miss = int((~covers).sum())
say(f"{N_INTERVALS - n_miss} of {N_INTERVALS} intervals covered mu.")
say(f"Coverage = {100 * covers.mean():.0f}% (target: 95%).")
out["coverage"] = {
    "seed": 7,
    "mu": MU_TRUE,
    "sigma": SIGMA,
    "n": N_COV,
    "count": N_INTERVALS,
    "intervals": intervals,
    "hits": N_INTERVALS - n_miss,
    "misses": n_miss,
    "missRows": [i for i, iv in enumerate(intervals) if not iv["covers"]],
    "first": rs(first),
    "lo": r(min(iv["lo"] for iv in intervals)),
    "hi": r(max(iv["hi"] for iv in intervals)),
}
say(f"  coverage: misses at rows {out['coverage']['missRows']}; ends {out['coverage']['lo']:.2f}..{out['coverage']['hi']:.2f}")

# ── Part 2. The levers (confidence-intervals, seed 0) ───────────────────────
rng = np.random.default_rng(0)
sample = rng.normal(50, 12, size=200)
x_bar = sample.mean()
se = sample.std(ddof=1) / np.sqrt(sample.size)
df = sample.size - 1
levels = []
for conf in (0.80, 0.90, 0.95, 0.99):
    lo, hi = stats.t.interval(conf, df=df, loc=x_bar, scale=se)
    say(f"  {int(conf * 100)}% CI: ({lo:.2f}, {hi:.2f})   width = {hi - lo:.2f}")
    levels.append({"level": int(round(conf * 100)), "lo": r(lo), "hi": r(hi), "width": r(hi - lo), "crit": r(stats.t.ppf(0.5 + conf / 2, df))})
sizes = []
for nn in (25, 100, 400, 1600):
    smp = rng.normal(50, 12, size=nn)
    se_n = smp.std(ddof=1) / np.sqrt(nn)
    lo, hi = stats.t.interval(0.95, df=nn - 1, loc=smp.mean(), scale=se_n)
    say(f"  n={nn:5d}: ({lo:.2f}, {hi:.2f})   width = {hi - lo:.2f}")
    sizes.append({"n": nn, "lo": r(lo), "hi": r(hi), "width": r(hi - lo), "mean": r(smp.mean())})
# The third lever, on the same sample: every value twice as far from the mean.
wide = x_bar + 2 * (sample - x_bar)
se_w = wide.std(ddof=1) / np.sqrt(wide.size)
w_lo, w_hi = stats.t.interval(0.95, df=df, loc=wide.mean(), scale=se_w)
out["levels"] = {
    "seed": 0,
    "n": int(sample.size),
    "xBar": r(x_bar),
    "s": r(sample.std(ddof=1)),
    "se": r(se),
    "rows": levels,
}
out["sizes"] = {"rows": sizes, "ratios": [r(sizes[i]["width"] / sizes[i + 1]["width"], 3) for i in range(3)]}
out["spread"] = {
    "s": r(sample.std(ddof=1)),
    "sWide": r(wide.std(ddof=1)),
    "lo": levels[2]["lo"],
    "hi": levels[2]["hi"],
    "width": levels[2]["width"],
    "wideLo": r(w_lo),
    "wideHi": r(w_hi),
    "wideWidth": r(w_hi - w_lo),
}
say(f"  spread doubled: s {sample.std(ddof=1):.2f} -> {wide.std(ddof=1):.2f}, width {levels[2]['width']:.2f} -> {w_hi - w_lo:.2f}")

# ── Part 2. A rate (confidence-intervals) ───────────────────────────────────
successes, visitors = 540, 3000
p_hat = successes / visitors
z = stats.norm.ppf(0.975)
se_p = np.sqrt(p_hat * (1 - p_hat) / visitors)
say(f"p-hat   = {p_hat:.4f}  ({100 * p_hat:.1f}% conversion)")
say(f"std err = {se_p:.4f}")
say(f"95% CI  = ({p_hat - z * se_p:.4f}, {p_hat + z * se_p:.4f})")
out["rate"] = {
    "successes": successes,
    "n": visitors,
    "pHat": r(p_hat),
    "se": r(se_p, 6),
    "z": r(z),
    "lo": r(p_hat - z * se_p, 6),
    "hi": r(p_hat + z * se_p, 6),
}

# ── Part 2. Intervals and tests (confidence-intervals, callout and chart) ───
A, B, Z = (100.0, 3.0), (111.0, 3.2), 1.96
diff = B[0] - A[0]
se_d = np.sqrt(A[1] ** 2 + B[1] ** 2)
out["difference"] = {
    "clear": {"lo": r(diff - Z * se_d, 2), "hi": r(diff + Z * se_d, 2), "estimate": r(diff, 2)},
    "straddle": {"lo": -0.5, "hi": 8.0},
}
say(f"  difference that clears zero: {diff - Z * se_d:.2f}..{diff + Z * se_d:.2f}; the callout's: -0.5..8.0")

# ── Part 3. Bootstrapping a mean (the-bootstrap, seed 42) ───────────────────
rng = np.random.default_rng(42)
data = rng.gamma(shape=2.0, scale=4.0, size=60)
state = rng.bit_generator.state
B_RESAMPLES = 5000
boot_means = np.empty(B_RESAMPLES)
for i in range(B_RESAMPLES):
    resample = rng.choice(data, size=len(data), replace=True)
    boot_means[i] = resample.mean()
ci_low, ci_high = np.percentile(boot_means, [2.5, 97.5])
boot_se = boot_means.std(ddof=1)
se_formula = data.std(ddof=1) / np.sqrt(len(data))
t_low, t_high = stats.t.interval(0.95, df=len(data) - 1, loc=data.mean(), scale=se_formula)
say(f"observed mean        = {data.mean():.3f}")
say(f"bootstrap SE         = {boot_se:.3f}")
say(f"formula SE (s/sqrt n)= {se_formula:.3f}")
say(f"bootstrap 95% CI = ({ci_low:.3f}, {ci_high:.3f})")
say(f"t-based   95% CI = ({t_low:.3f}, {t_high:.3f})")
# Replay the generator to recover which values the first resamples drew.
replay = np.random.default_rng()
replay.bit_generator.state = state
picks = []
for i in range(3):
    idx = replay.choice(len(data), size=len(data), replace=True)
    assert abs(data[idx].mean() - boot_means[i]) < 1e-12
    picks.append([int(j) for j in idx])
times = np.bincount(picks[0], minlength=len(data))
say(f"  first resample: {int((times == 0).sum())} values never drawn, {int((times == 1).sum())} once, {int((times == 2).sum())} twice, {int((times >= 3).sum())} three or more times (max {times.max()})")
true_mean = 2.0 * 4.0
out["bootMean"] = {
    "seed": 42,
    "n": len(data),
    "B": B_RESAMPLES,
    "values": rs(data),
    "mean": r(data.mean()),
    "median": r(np.median(data)),
    "trueMean": true_mean,
    "picks": picks,
    "pickMeans": rs(boot_means[:3], 4),
    "timesDrawn": [int(t) for t in times],
    "neverDrawn": int((times == 0).sum()),
    "drawnTwice": int((times == 2).sum()),
    "drawnThrice": int((times >= 3).sum()),
    "means": rs(boot_means),
    "bootSe": r(boot_se),
    "formulaSe": r(se_formula),
    "lo": r(ci_low),
    "hi": r(ci_high),
    "tLo": r(t_low),
    "tHi": r(t_high),
    "min": r(data.min()),
    "max": r(data.max()),
}

# ── Part 3. Bootstrapping a median (the-bootstrap, seed 7) ──────────────────
rng = np.random.default_rng(7)
data = rng.lognormal(mean=10.5, sigma=0.6, size=120)
boot_medians = np.empty(B_RESAMPLES)
for i in range(B_RESAMPLES):
    resample = rng.choice(data, size=len(data), replace=True)
    boot_medians[i] = np.median(resample)
ci_low, ci_high = np.percentile(boot_medians, [2.5, 97.5])
boot_se = boot_medians.std(ddof=1)
say(f"observed median  = {np.median(data):,.0f}")
say(f"bootstrap SE     = {boot_se:,.0f}")
say(f"95% percentile CI= ({ci_low:,.0f}, {ci_high:,.0f})")
say(f"  medians: {len(np.unique(boot_medians))} distinct values of {B_RESAMPLES}; incomes {data.min():,.0f}..{data.max():,.0f}, mean {data.mean():,.0f}")
out["bootMedian"] = {
    "seed": 7,
    "n": len(data),
    "B": B_RESAMPLES,
    "values": rs(data, 1),
    "median": r(np.median(data), 1),
    "mean": r(data.mean(), 1),
    "medians": rs(boot_medians, 1),
    "distinct": int(len(np.unique(boot_medians))),
    "bootSe": r(boot_se, 1),
    "lo": r(ci_low, 1),
    "hi": r(ci_high, 1),
    "min": r(data.min(), 1),
    "max": r(data.max(), 1),
}

# ── Part 3. The cautions (the video's own, on the lesson's waits) ───────────
# A biased sample: the lesson's Gamma(2, 4) waits, but a wait is recorded only
# when it is under ten minutes, until sixty are recorded.
rng = np.random.default_rng(6)
kept = []
while len(kept) < 60:
    w = rng.gamma(shape=2.0, scale=4.0)
    if w < 10:
        kept.append(w)
kept = np.array(kept)
bb = np.array([rng.choice(kept, size=len(kept), replace=True).mean() for _ in range(B_RESAMPLES)])
b_lo, b_hi = np.percentile(bb, [2.5, 97.5])
out["biased"] = {
    "seed": 6,
    "cutoff": 10,
    "n": len(kept),
    "trueMean": true_mean,
    "values": rs(kept),
    "mean": r(kept.mean()),
    "lo": r(b_lo),
    "hi": r(b_hi),
    "means": rs(bb),
}
say(f"  biased: 60 waits under 10 min, mean {kept.mean():.2f}, bootstrap CI {b_lo:.2f}..{b_hi:.2f}; true mean {true_mean}")

# The maximum of the lesson's 60 waits, bootstrapped.
waits = np.array(out["bootMean"]["values"])
rng = np.random.default_rng(9)
maxes = np.array([rng.choice(waits, size=len(waits), replace=True).max() for _ in range(B_RESAMPLES)])
top = np.sort(waits)[::-1]
at_top = float((maxes == top[0]).mean())
values_, counts_ = np.unique(maxes, return_counts=True)
out["maximum"] = {
    "seed": 9,
    "sampleMax": r(top[0]),
    "top": rs(top[:8]),
    "atTop": r(at_top),
    "theory": r(1 - (1 - 1 / len(waits)) ** len(waits)),
    "spikes": [{"v": r(v), "count": int(c)} for v, c in zip(values_, counts_)],
    "maxes": rs(maxes),
}
say(f"  maximum: sample max {top[0]:.2f}; {100 * at_top:.1f}% of resamples hit it (theory {100 * (1 - (59 / 60) ** 60):.1f}%); {len(values_)} distinct maxima")

json.dump(out, sys.stdout, separators=(",", ":"))
sys.stdout.write("\n")
