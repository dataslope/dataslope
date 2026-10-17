"""Measures every number and every dot the StatisticsInPractice video shows.

    PYTHONPATH=<a folder holding plotly> python3 -I src/videos/statistics-in-practice/measure.py \
        > src/videos/statistics-in-practice/measurements.json

(-I drops PYTHONPATH, so run it without -I when plotly lives outside
site-packages: `pip install --target <dir> plotly`, then PYTHONPATH=<dir>.)

Each part re-runs one of the lesson code blocks (or chart specs) the video is
built from, with its own seed and its own calls in its own order, so what it
prints is what the page prints. The lessons are in
content/courses/statistics-for-data-science-python/, the chart specs in charts/:

- "tips" is exploratory-statistical-analysis.mdx, "Step 5: relationships":
  the plotly tips dataset (px.data.tips(), 244 bills), tip_pct = tip /
  total_bill * 100, grouped by day with mean, median and count. Every bill's
  day and tip percentage is kept for the dots.
- "holdout" is the same lesson's tip "A practical workaround: hold out a
  slice": explore on 70% of the rows and lock the other 30% away. The lesson
  has no code for it, so the split is drawn here (seeded, for the layout only)
  and the video claims no test result from it.
- "design" is ab-testing.mdx, "Power and sample size": the lesson's
  two-proportion formula for 10% -> 12% at 80% power, alpha 0.05 two-sided.
- "balance" is charts/randomisation-balances-confounders.mjs, the lesson's
  "Why randomization licenses causal claims" figure: ten covariates, their
  self-selected gaps as the spec writes them, and the randomized ones from its
  seeded normalSamples(10, 0, 0.055, 5711), re-implemented here (mulberry32
  and Box-Muller, as charts/_theme.mjs has them).
- "peeking" is charts/ab-test-peeking.mjs, the lesson's "Pitfalls" figure: two
  identical arms, normalSamples(8000, 0, 1, 10) and (…, 10009), the p-value
  recomputed after every hundred visitors with the spec's own normal CDF.
- "experiment" is ab-testing.mdx, "Analyze: simulate and fully read one
  experiment" (seed 42): 6,000 users per arm, true rates 10.0% and 11.8%.
  Every user's 0/1 outcome is kept for the grid of users.
- "tiny" is the same lesson's third quiz question: 8.00% -> 8.02%, 95% CI
  [0.005pp, 0.035pp]. Its "5 million users" does not give that interval; the
  sample size the interval does imply is computed here (see the report).
- "callback" is why-statistics-matters.mdx, "Why randomness matters" (seed 0),
  the course's opening example: the first of its five draws of two groups of
  forty from Normal(50, 10).

Printed checks (the lessons' own output lines) go to stderr.
"""

import json
import math
import platform
import sys

import numpy as np
import pandas as pd
import plotly
import plotly.express as px
import scipy
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
        "pandas": pd.__version__,
        "scipy": scipy.__version__,
        "plotly": plotly.__version__,
    }
}

# ── Part 1. The tips data, by day (exploratory-statistical-analysis) ─────────
tips = px.data.tips()
tips["tip_pct"] = tips["tip"] / tips["total_bill"] * 100
by_day = tips.groupby("day")["tip_pct"].agg(["mean", "median", "count"]).round(2)
say("Tip % by day:")
say(by_day)
by_time = tips.groupby("time")["tip_pct"].agg(["mean", "median", "count"]).round(2)
say("Tip % by time:")
say(by_time)
DAYS = ["Thur", "Fri", "Sat", "Sun"]
stats_by_day = tips.groupby("day")["tip_pct"].agg(["mean", "median", "count"])
best_mean = stats_by_day["mean"].idxmax()
best_median = stats_by_day["median"].idxmax()
worst_mean = stats_by_day["mean"].idxmin()
say(f"  best by mean: {best_mean}, best by median: {best_median}, lowest mean: {worst_mean}")
# How far each day's average could wobble: its 95% interval, mean +/- 1.96
# standard errors. Not printed by the lesson; it is the "small groups wobble a
# lot" its comment names, measured with Unit 6's interval.
sd_by_day = tips.groupby("day")["tip_pct"].std(ddof=1)
half_by_day = {d: float(1.96 * sd_by_day[d] / math.sqrt(stats_by_day.loc[d, "count"])) for d in DAYS}
say("  95% interval half-widths by day:", {d: round(v, 2) for d, v in half_by_day.items()})


# The other slices an explorer reaches for: the same tip percentage by every
# categorical column, and the lesson's correlation matrix of the numeric
# columns (its own block, before tip_pct exists).
def slice_by(col):
    g = tips.groupby(col, observed=True)["tip_pct"].mean()
    return [{"key": str(k), "mean": r(v, 2)} for k, v in g.items()]


num = px.data.tips().select_dtypes("number")
corr = num.corr().round(3)
say("Correlation matrix:")
say(corr)
out["slices"] = {
    "day": [{"key": d, "mean": r(stats_by_day.loc[d, "mean"], 2)} for d in DAYS],
    "time": slice_by("time"),
    "size": slice_by("size"),
    "smoker": slice_by("smoker"),
    "sex": slice_by("sex"),
    "corr": {"cols": list(corr.columns), "r": [[float(v) for v in row] for row in corr.to_numpy()]},
}
out["tips"] = {
    "rows": len(tips),
    "days": DAYS,
    "byDay": {
        d: {
            "mean": r(stats_by_day.loc[d, "mean"]),
            "median": r(stats_by_day.loc[d, "median"]),
            "count": int(stats_by_day.loc[d, "count"]),
            "half": r(half_by_day[d]),
        }
        for d in DAYS
    },
    "bestMean": best_mean,
    "bestMedian": best_median,
    "worstMean": worst_mean,
    # Every bill: its day (an index into DAYS) and its tip percentage.
    "billDay": [DAYS.index(d) for d in tips["day"]],
    "billPct": rs(tips["tip_pct"], 2),
    "max": r(tips["tip_pct"].max(), 2),
    "maxDay": tips.loc[tips["tip_pct"].idxmax(), "day"],
}

# ── Part 1. Hold out a slice (the lesson's tip; layout only) ────────────────
HOLD = 0.30
n_hold = round(len(tips) * HOLD)
held = np.random.default_rng(30).choice(len(tips), size=n_hold, replace=False)
out["holdout"] = {
    "share": HOLD,
    "held": sorted(int(i) for i in held),
    "nHeld": n_hold,
    "nExplore": len(tips) - n_hold,
}
say(f"  holdout: {len(tips) - n_hold} to explore, {n_hold} locked away")

# ── Part 2. Sample size up front (ab-testing, "Power and sample size") ──────
p1, p2 = 0.10, 0.12  # baseline and target conversion rates
alpha, power = 0.05, 0.80
z_alpha = stats.norm.ppf(1 - alpha / 2)  # two-sided
z_beta = stats.norm.ppf(power)


def per_arm(p1, p2):
    p_bar = (p1 + p2) / 2
    return (
        (z_alpha * np.sqrt(2 * p_bar * (1 - p_bar)) + z_beta * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
    ) / (p2 - p1) ** 2


n_per_arm = per_arm(p1, p2)
say(f"Detecting {p1:.0%} -> {p2:.0%} at {power:.0%} power, alpha={alpha}:")
say(f"  Need ~{np.ceil(n_per_arm):,.0f} users PER ARM (~{2 * np.ceil(n_per_arm):,.0f} total).")
out["design"] = {
    "p1": p1,
    "p2": p2,
    "alpha": alpha,
    "power": power,
    "perArm": int(np.ceil(n_per_arm)),
    "total": int(2 * np.ceil(n_per_arm)),
    # The power-vs-n chart's other two lifts, from the same formula.
    "perArm11": int(np.ceil(per_arm(0.10, 0.11))),
    "perArm15": int(np.ceil(per_arm(0.10, 0.15))),
}


# ── The chart specs' seeded generator (charts/_theme.mjs) ───────────────────
U32 = 0xFFFFFFFF


def imul(a, b):
    return ((a & U32) * (b & U32)) & U32


def mulberry32(seed):
    a = seed & U32

    def next_():
        nonlocal a
        a = (a + 0x6D2B79F5) & U32
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & U32) ^ t
        return ((t ^ (t >> 14)) & U32) / 4294967296

    return next_


def normal_samples(n, mean=0.0, sd=1.0, seed=42):
    u = mulberry32(seed)
    eps = sys.float_info.epsilon
    res = []
    for _ in range(n):
        a = max(u(), eps)
        b = u()
        res.append(mean + sd * math.sqrt(-2 * math.log(a)) * math.cos(2 * math.pi * b))
    return res


# Checked against node on charts/_theme.mjs: normalSamples(5, 0, 1, 10).
assert abs(normal_samples(5, 0, 1, 10)[0] - 1.0197496387998672) < 1e-12

# ── Part 2. Randomization balances confounders (the lesson's chart) ─────────
COVARIATES = [
    ("Age", 0.62, False),
    ("Income", 0.71, False),
    ("Education", 0.55, False),
    ("Prior use", 0.88, False),
    ("Region", 0.31, False),
    ("Device", 0.44, False),
    ("Tenure", 0.58, False),
    ("Support tickets", 0.36, False),
    ("Motivation", 0.79, True),
    ("Health literacy", 0.66, True),
]
NOISE = normal_samples(len(COVARIATES), 0, 0.055, 5_711)
THRESHOLD = 0.1
balance = [
    {"key": k, "selected": b, "randomised": r(abs(NOISE[i]), 4), "unmeasured": u}
    for i, (k, b, u) in enumerate(COVARIATES)
]
over = sum(1 for d in balance if d["selected"] > THRESHOLD)
over_rand = sum(1 for d in balance if d["randomised"] > THRESHOLD)
say(f"  balance: self-selected over {THRESHOLD}: {over} of 10; randomized: {over_rand}")
out["balance"] = {
    "rows": balance,
    "threshold": THRESHOLD,
    "over": over,
    "overRandomised": over_rand,
    "maxRandomised": max(d["randomised"] for d in balance),
}


# ── Part 2. Peeking at a test with nothing to find (the lesson's chart) ─────
def chart_phi(x):
    """The spec's normal CDF (Zelen & Severo), so the p-values match it."""
    t = 1 / (1 + 0.2316419 * abs(x))
    d = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
    p = 1 - math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi) * d
    return p if x >= 0 else 1 - p


PLANNED, STEP, ALPHA = 8000, 100, 0.05
pa = normal_samples(PLANNED, 0, 1, 10)
pb = normal_samples(PLANNED, 0, 1, 10009)
peek = []
for n in range(STEP, PLANNED + 1, STEP):
    z = (sum(pa[:n]) / n - sum(pb[:n]) / n) / math.sqrt(2 / n)
    peek.append({"n": n, "p": r(2 * (1 - chart_phi(abs(z))), 5)})
crossings = [i for i, row in enumerate(peek) if row["p"] < ALPHA and (i == 0 or peek[i - 1]["p"] >= ALPHA)]
under = [row["n"] for row in peek if row["p"] < ALPHA]
say(f"  peeking: {len(crossings)} dips under {ALPHA}, at n = {[peek[i]['n'] for i in crossings]}; final p = {peek[-1]['p']:.2f}")
say(f"  peeking: under {ALPHA} at n = {under}")
out["peeking"] = {
    "planned": PLANNED,
    "step": STEP,
    "alpha": ALPHA,
    "rows": peek,
    "crossings": len(crossings),
    "crossingAt": [peek[i]["n"] for i in crossings],
    "underAt": under,
    "final": peek[-1]["p"],
    "minP": min(row["p"] for row in peek),
}

# ── Part 2. One finished experiment (ab-testing, "Analyze", seed 42) ────────
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
table = np.array([[x_a, n_a - x_a], [x_b, n_b - x_b]])
chi2, p_chi2, _, _ = stats.chi2_contingency(table, correction=False)
se_diff = np.sqrt(p_a * (1 - p_a) / n_a + p_b * (1 - p_b) / n_b)
zc = stats.norm.ppf(0.975)
ci_low, ci_high = abs_lift - zc * se_diff, abs_lift + zc * se_diff
h = 2 * np.arcsin(np.sqrt(p_b)) - 2 * np.arcsin(np.sqrt(p_a))
say(f"Control (A):  {x_a}/{n_a} = {p_a:.4f}")
say(f"Treatment (B):{x_b}/{n_b} = {p_b:.4f}")
say(f"Absolute lift: {abs_lift:+.4f}  ({abs_lift * 100:+.2f} pp)")
say(f"Relative lift: {rel_lift:+.1%}")
say(f"z-test:        z = {z:.2f},  p = {p_value:.4f}")
say(f"chi-square:    chi2 = {chi2:.2f}, p = {p_chi2:.4f}  (agrees with z)")
say(f"95% CI on diff:[{ci_low:+.4f}, {ci_high:+.4f}]")
say(f"Effect size:   Cohen's h = {h:.3f}")
out["experiment"] = {
    "seed": 42,
    "n": n_a,
    "trueA": true_p_a,
    "trueB": true_p_b,
    # Which users converted, by their position in each arm.
    "convertedA": [int(i) for i in np.flatnonzero(conv_a)],
    "convertedB": [int(i) for i in np.flatnonzero(conv_b)],
    "xA": int(x_a),
    "xB": int(x_b),
    "pA": r(p_a, 6),
    "pB": r(p_b, 6),
    "absLift": r(abs_lift, 6),
    "relLift": r(rel_lift, 6),
    "z": r(z, 4),
    "p": r(p_value, 6),
    "chi2": r(chi2, 4),
    "pChi2": r(p_chi2, 6),
    "ciLow": r(ci_low, 6),
    "ciHigh": r(ci_high, 6),
    "h": r(h, 4),
}

# ── Part 2. Significant and tiny (ab-testing, the third quiz question) ──────
t_a, t_b = 0.0800, 0.0802
t_low, t_high = 0.00005, 0.00035  # the quiz's [0.005pp, 0.035pp]
half = (t_high - t_low) / 2
# The users per arm a 95% interval that narrow needs (unpooled SE, as above).
implied = (zc * math.sqrt(t_a * (1 - t_a) + t_b * (1 - t_b)) / half) ** 2


def two_prop(pa_, pb_, n_):
    se_ = math.sqrt(pa_ * (1 - pa_) / n_ + pb_ * (1 - pb_) / n_)
    d = pb_ - pa_
    return d - zc * se_, d + zc * se_, 2 * (1 - stats.norm.cdf(d / se_))


q_low, q_high, q_p = two_prop(t_a, t_b, 2_500_000)
say(
    f"  tiny: the quiz's interval needs ~{implied / 1e6:.1f}M users per arm; at its 5M users "
    f"(2.5M per arm) the interval is [{q_low * 100:+.3f}pp, {q_high * 100:+.3f}pp], p = {q_p:.2f}"
)
out["tiny"] = {
    "pA": t_a,
    "pB": t_b,
    "ciLow": t_low,
    "ciHigh": t_high,
    "impliedPerArm": round(implied),
    "quizUsers": 5_000_000,
    "atQuizUsers": {"ciLow": r(q_low, 6), "ciHigh": r(q_high, 6), "p": r(q_p, 4)},
}

# ── Close. The course's first example (why-statistics-matters, seed 0) ──────
rng = np.random.default_rng(0)
a = rng.normal(50, 10, size=40)
b = rng.normal(50, 10, size=40)
say(f"Trial 1: A={a.mean():5.2f}  B={b.mean():5.2f}  gap={a.mean() - b.mean():+5.2f}")
out["callback"] = {
    "seed": 0,
    "n": 40,
    "a": rs(a),
    "b": rs(b),
    "meanA": r(a.mean()),
    "meanB": r(b.mean()),
    "gap": r(a.mean() - b.mean()),
}

json.dump(out, sys.stdout, separators=(",", ":"))
sys.stdout.write("\n")
