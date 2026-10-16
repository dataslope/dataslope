"""Measures every number and every dot the InterpretingResults video shows.

    python3 src/videos/interpreting-results/measure.py > src/videos/interpreting-results/measurements.json

(scipy lives in the user site-packages here, so this runs without -I.)

Each part re-runs one of the lessons' code blocks with its own seed and its
own calls in its own order, so what it prints is what the page prints. The
lessons are in content/courses/statistics-for-data-science-python/:

- "huge" is effect-sizes.mdx, the "Significant yet negligible" challenge
  (seed 2024): two groups of 300,000, Normal(100, 15) and Normal(100.12, 15),
  its initCode then its solution. The page's own demonstration of the same
  point, "Demonstrating significance ≠ importance" (seed 0, n = 100,000), is
  run too and printed, because it is not significant (p = 0.0508): the video
  uses the challenge, and the report says why.
- "overlap" is the effect-size-overlap chart the page places under the
  small / medium / large table: how much of two unit normals d apart is
  shared, 2·Φ(−d/2), and the chart's printed "non-overlap", 1 minus that.
- "sweep" is effect-sizes.mdx, "Effect size does NOT depend on sample size"
  (seed 123): a true d of 0.30 at five sample sizes.
- "rates" is effect-sizes.mdx, "risk difference and relative risk": 90 and
  126 conversions of 3,000.
- "ci" is effect-sizes.mdx, "Always pair an effect size with a confidence
  interval" (seed 11): d and its 2,000-resample bootstrap interval.
- "simpson" is statistical-fallacies.mdx, "Simpson's paradox", its
  two-department code block, run in pandas as the block builds it.
- "confound" is the simpsons-paradox-trend chart the page places under
  "Confounding" (charts/simpsons-paradox-trend.mjs, seed 9021).
- "rtm" is statistical-fallacies.mdx, "Regression to the mean" (seed 3): 500
  salespeople, skill plus two months of luck.
- "wander" is the cherry-picked-window chart pair (charts/_wander.mjs, seed
  2800): ten years of a mean-reverting walk and its steepest four months.
- "shots" is the Texas sharpshooter, drawn: forty holes in a wall, a seeded
  layout of the video's own (the lesson gives no data), the target put round
  their densest cluster by search, and forty more holes for the second
  volley.
- "berkson" is the berksons-paradox chart (seeds 6101 and 2357, a bar of 112).
- "districts" is the ecological-fallacy chart (six districts of 55).

The charts are seeded JavaScript: `rng` below is _theme.mjs's mulberry32,
bit for bit, and `normal_samples` its Box-Muller, so the points are the
chart's points. Each chart's own printed numbers are checked at the end.

Printed checks (the lessons' own output lines) go to stderr.
"""

import json
import math
import platform
import sys

import numpy as np
import pandas as pd
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
        "scipy": scipy.__version__,
        "pandas": pd.__version__,
    }
}

# ── The charts' generator (charts/_theme.mjs), ported exactly ──────────────
M = 0xFFFFFFFF
EPS = 2.0**-52


def imul(a, b):
    return (a * b) & M


def rng(seed):
    """_theme.mjs rng(): mulberry32, every value kept as a uint32."""
    state = [seed & M]

    def nxt():
        a = state[0] = (state[0] + 0x6D2B79F5) & M
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & M) ^ t
        return ((t ^ (t >> 14)) & M) / 4294967296

    return nxt


def normal_samples(n, mean=0.0, sd=1.0, seed=42):
    u = rng(seed)
    res = []
    for _ in range(n):
        a = max(u(), EPS)
        b = u()
        res.append(mean + sd * math.sqrt(-2 * math.log(a)) * math.cos(2 * math.pi * b))
    return res


def corr(xs, ys):
    return float(np.corrcoef(xs, ys)[0, 1])


def cohens_d(a, b):
    na, nb = len(a), len(b)
    sp = np.sqrt(((na - 1) * a.var(ddof=1) + (nb - 1) * b.var(ddof=1)) / (na + nb - 2))
    return (b.mean() - a.mean()) / sp


# ── Part 1. Significant yet negligible (effect-sizes, challenge, seed 2024) ─
rng_np = np.random.default_rng(2024)
n = 300_000
a = rng_np.normal(100.00, 15, size=n)
b = rng_np.normal(100.12, 15, size=n)
_, p = stats.ttest_ind(a, b)
na, nb = len(a), len(b)
sp = np.sqrt(((na - 1) * a.var(ddof=1) + (nb - 1) * b.var(ddof=1)) / (na + nb - 2))
d = float((b.mean() - a.mean()) / sp)
say(f"p = {p:.2e},  d = {d:.4f}")
out["huge"] = {
    "seed": 2024,
    "n": n,
    "sigma": 15,
    "meanA": r(a.mean()),
    "meanB": r(b.mean()),
    "gap": r(b.mean() - a.mean()),
    "sd": r(sp),
    "p": float(f"{p:.4g}"),
    "d": r(d),
}
# The page's own demonstration, seed 0: printed for the report, not shown.
rng_np = np.random.default_rng(0)
n0 = 100_000
ga = rng_np.normal(loc=100.0, scale=15, size=n0)
gb = rng_np.normal(loc=100.1, scale=15, size=n0)
_, p0 = stats.ttest_ind(ga, gb)
d0 = cohens_d(ga, gb)
say(f"  [seed 0 demo] Observed difference : {gb.mean() - ga.mean():+.3f}")
say(f"  [seed 0 demo] p-value             : {p0:.2e}  <- the page calls this 'highly significant'")
say(f"  [seed 0 demo] Cohen's d           : {d0:.4f}")
out["demo"] = {"seed": 0, "n": n0, "gap": r(gb.mean() - ga.mean()), "p": float(f"{p0:.4g}"), "d": r(d0)}

# ── Part 1. Overlap at d = 0.2, 0.5, 0.8 (effect-size-overlap chart) ───────
out["overlap"] = [
    {
        "d": dv,
        "label": lab,
        "shared": r(2 * stats.norm.cdf(-dv / 2)),
        "nonOverlap": round((1 - 2 * stats.norm.cdf(-dv / 2)) * 100),
    }
    for dv, lab in [(0.2, "small"), (0.5, "medium"), (0.8, "large")]
]
say("  overlap: " + ", ".join(f"d={o['d']} shares {o['shared']:.0%} ({o['nonOverlap']}% non-overlap)" for o in out["overlap"]))

# ── Part 1. d does not depend on n (effect-sizes, seed 123) ────────────────
rng_np = np.random.default_rng(123)
rows = []
say(f"{'n per group':>12} | {'p-value':>10} | {'estimated d':>11}")
for n in [20, 100, 500, 5000, 50000]:
    xa = rng_np.normal(100, 10, n)
    xb = rng_np.normal(103, 10, n)
    _, p = stats.ttest_ind(xa, xb)
    say(f"{n:>12,} | {p:>10.1e} | {cohens_d(xa, xb):>11.3f}")
    rows.append({"n": n, "p": float(f"{p:.3g}"), "printed": f"{p:.1e}", "d": r(cohens_d(xa, xb), 3)})
out["sweep"] = {"seed": 123, "trueD": 0.3, "rows": rows}

# ── Part 1. Two ways to say a rate (effect-sizes) ──────────────────────────
conv_control, n_control = 90, 3000
conv_treatment, n_treatment = 126, 3000
p_control = conv_control / n_control
p_treatment = conv_treatment / n_treatment
out["rates"] = {
    "control": [conv_control, n_control],
    "treatment": [conv_treatment, n_treatment],
    "pControl": r(p_control),
    "pTreatment": r(p_treatment),
    "difference": r(p_treatment - p_control),
    "ratio": r(p_treatment / p_control, 3),
    "uplift": r((p_treatment - p_control) / p_control, 3),
}
say(f"Risk difference      : {p_treatment - p_control:+.4f}  ({(p_treatment - p_control) * 100:+.2f} pp)")
say(f"Relative risk (ratio): {p_treatment / p_control:.3f}x")
say(f"Relative uplift      : {(p_treatment - p_control) / p_control * 100:+.1f}%")

# ── Part 1. An effect size with its interval (effect-sizes, seed 11) ───────
rng_np = np.random.default_rng(11)
control = rng_np.normal(100, 15, size=120)
treatment = rng_np.normal(106, 15, size=120)
dci = cohens_d(control, treatment)
boot = []
for _ in range(2000):
    ra = rng_np.choice(control, size=len(control), replace=True)
    rb = rng_np.choice(treatment, size=len(treatment), replace=True)
    boot.append(cohens_d(ra, rb))
lo, hi = np.percentile(boot, [2.5, 97.5])
say(f"Cohen's d        : {dci:.3f}")
say(f"95% bootstrap CI : [{lo:.3f}, {hi:.3f}]")
out["ci"] = {"seed": 11, "d": r(dci, 3), "lo": r(lo, 3), "hi": r(hi, 3)}

# ── Part 2. Simpson's paradox (statistical-fallacies) ──────────────────────
data = pd.DataFrame(
    [
        ["Easy", "Men", 600, 360],
        ["Easy", "Women", 100, 65],
        ["Hard", "Men", 100, 25],
        ["Hard", "Women", 600, 165],
    ],
    columns=["dept", "gender", "applicants", "admitted"],
)
within = data.assign(rate=lambda df: df.admitted / df.applicants)
pivot = within.pivot(index="dept", columns="gender", values="rate").round(3)
say(pivot)
agg = data.groupby("gender")[["applicants", "admitted"]].sum()
agg["rate"] = agg["admitted"] / agg["applicants"]
say(agg["rate"].round(3))
out["simpson"] = {
    "rows": [
        {"dept": row.dept, "group": row.gender.lower(), "applied": int(row.applicants), "admitted": int(row.admitted), "rate": r(row.rate)}
        for row in within.itertuples()
    ],
    "pooled": {g.lower(): {"applied": int(agg.loc[g, "applicants"]), "admitted": int(agg.loc[g, "admitted"]), "rate": r(agg.loc[g, "rate"])} for g in agg.index},
}

# ── Part 2. A confounder reverses a slope (simpsons-paradox-trend, 9021) ───
u = rng(9021)


def gauss():
    a_ = max(u(), EPS)
    b_ = u()
    return math.sqrt(-2 * math.log(a_)) * math.cos(2 * math.pi * b_)


BANDS = [("30s", 55, 112), ("45s", 105, 121), ("60s", 155, 130), ("75s", 205, 139)]
WITHIN_SLOPE = -0.045
points = []
for k, (key, x_mid, base) in enumerate(BANDS):
    for _ in range(26):
        x = x_mid + gauss() * 34
        y = base + WITHIN_SLOPE * (x - x_mid) + gauss() * 3.2
        points.append({"band": k, "x": x, "y": y})


def fit(rows_):
    xs = np.array([p_["x"] for p_ in rows_])
    ys = np.array([p_["y"] for p_ in rows_])
    mx, my = xs.mean(), ys.mean()
    slope = ((xs - mx) * (ys - my)).sum() / ((xs - mx) ** 2).sum()
    return slope, my - slope * mx, float(xs.min()), float(xs.max())


pooled = fit(points)
band_fits = [fit([p_ for p_ in points if p_["band"] == k]) for k in range(4)]
out["confound"] = {
    "seed": 9021,
    "bands": [key for key, _, _ in BANDS],
    "points": [[r(p_["x"], 2), r(p_["y"], 2), p_["band"]] for p_ in points],
    "pooled": {"slope": r(pooled[0], 5), "intercept": r(pooled[1]), "x0": r(pooled[2], 2), "x1": r(pooled[3], 2)},
    "fits": [{"slope": r(f[0], 5), "intercept": r(f[1]), "x0": r(f[2], 2), "x1": r(f[3], 2)} for f in band_fits],
    "pooledPerHour": round(pooled[0] * 60, 1),
    "withinPerHour": round(WITHIN_SLOPE * 60, 1),
}
say(f"  confound: pooled {pooled[0] * 60:+.1f} mmHg per weekly hour, within a band {WITHIN_SLOPE * 60:+.1f}; band fits "
    + ", ".join(f"{f[0] * 60:+.1f}" for f in band_fits))

# ── Part 3. Regression to the mean (statistical-fallacies, seed 3) ─────────
rng_np = np.random.default_rng(3)
n = 500
skill = rng_np.normal(100, 10, size=n)
month1 = skill + rng_np.normal(0, 15, size=n)
month2 = skill + rng_np.normal(0, 15, size=n)
top = month1 >= np.quantile(month1, 0.90)
bottom = month1 <= np.quantile(month1, 0.10)
say(f"Top performers in month 1: avg = {month1[top].mean():.1f}")
say(f"...the SAME people in month 2: avg = {month2[top].mean():.1f}")
say(f"Bottom performers in month 1: avg = {month1[bottom].mean():.1f}")
say(f"...the SAME people in month 2: avg = {month2[bottom].mean():.1f}")
out["rtm"] = {
    "seed": 3,
    "n": n,
    "month1": rs(month1, 2),
    "month2": rs(month2, 2),
    "top": [int(i) for i in np.flatnonzero(top)],
    "bottom": [int(i) for i in np.flatnonzero(bottom)],
    "topBefore": r(month1[top].mean(), 2),
    "topAfter": r(month2[top].mean(), 2),
    "bottomBefore": r(month1[bottom].mean(), 2),
    "bottomAfter": r(month2[bottom].mean(), 2),
    "mean1": r(month1.mean(), 2),
    "mean2": r(month2.mean(), 2),
}

# ── Part 4. The cherry-picked window (charts/_wander.mjs, seed 2800) ───────
nxt = rng(2800)


def gauss_w():
    a_ = max(nxt(), EPS)
    return math.sqrt(-2 * math.log(a_)) * math.cos(2 * math.pi * nxt())


v = 100.0
series = []
for _ in range(120):
    v += 0.12 * (100 - v) + gauss_w() * 3.1
    series.append(v)
L = 4
best = max(range(len(series) - L + 1), key=lambda i: series[i + L - 1] - series[i])
window_pct = round((series[best + L - 1] - series[best]) / series[best] * 100)
decade_pct = round((series[-1] - series[0]) / series[0] * 100)
out["wander"] = {
    "seed": 2800,
    "series": rs(series, 3),
    "start": best,
    "end": best + L - 1,
    "length": L,
    "windowPct": window_pct,
    "decadePct": decade_pct,
}
say(f"  wander: steepest {L} months start at month {best}, {series[best]:.1f} → {series[best + L - 1]:.1f}, up {window_pct}%; decade {decade_pct}%")

# ── Part 4. The sharpshooter's wall (the video's own seeded layout) ────────
# Forty holes, uniform over a wall 1 wide and 0.6 tall; the target is the
# circle of radius 0.11 holding the most of them, its center searched on a
# fine grid. Then forty more holes from the same gun, counted inside it.
# Seed 1, the first one tried: the second volley puts 3 in the target, about
# what chance alone predicts (2.5), so the picture is the typical case.
WALL = (1.0, 0.6)
RADIUS = 0.11
shots_rng = np.random.default_rng(1)
first = shots_rng.uniform([0.03, 0.03], [WALL[0] - 0.03, WALL[1] - 0.03], size=(40, 2))
second = shots_rng.uniform([0.03, 0.03], [WALL[0] - 0.03, WALL[1] - 0.03], size=(40, 2))
best_c, best_k = None, -1
for cx in np.linspace(RADIUS, WALL[0] - RADIUS, 200):
    for cy in np.linspace(RADIUS, WALL[1] - RADIUS, 120):
        k = int((np.hypot(first[:, 0] - cx, first[:, 1] - cy) <= RADIUS).sum())
        if k > best_k:
            best_c, best_k = (cx, cy), k
inside2 = int((np.hypot(second[:, 0] - best_c[0], second[:, 1] - best_c[1]) <= RADIUS).sum())
expected = 40 * math.pi * RADIUS**2 / (WALL[0] * WALL[1])
out["shots"] = {
    "seed": 1,
    "wall": list(WALL),
    "radius": RADIUS,
    "first": [rs(s, 4) for s in first],
    "second": [rs(s, 4) for s in second],
    "target": [r(best_c[0]), r(best_c[1])],
    "inside": best_k,
    "insideAgain": inside2,
    "expected": r(expected, 2),
}
say(f"  shots: densest circle holds {best_k} of 40; the second volley puts {inside2} in it (chance alone: {expected:.1f})")

# ── Part 4. Selection makes a correlation (berksons-paradox) ───────────────
A = normal_samples(420, 50, 12, 6101)
B = normal_samples(420, 50, 12, 2357)
BAR = 112
admitted = [i for i in range(420) if A[i] + B[i] >= BAR]
r_all = corr(A, B)
r_in = corr([A[i] for i in admitted], [B[i] for i in admitted])
fit_in = np.polyfit([A[i] for i in admitted], [B[i] for i in admitted], 1)
out["berkson"] = {
    "n": 420,
    "bar": BAR,
    "ability": rs(A, 2),
    "interview": rs(B, 2),
    "admitted": admitted,
    "rAll": r(r_all, 3),
    "rIn": r(r_in, 3),
    "fitIn": [r(fit_in[0]), r(fit_in[1])],
}
say(f"  berkson: r = {r_all:.2f} for everyone; {len(admitted)} admitted, r = {r_in:.2f}")

# ── Part 4. The unit of analysis (ecological-fallacy) ──────────────────────
WOBBLE_X = [1.8, -2.4, 0.9, 2.6, -1.7, 0.4]
WOBBLE_Y = [-2.2, 2.9, -1.4, 1.1, 2.4, -2.8]
groups = []
for g in range(6):
    income = 26 + g * 8.5 + WOBBLE_X[g]
    turnout = 44 + g * 6.2 + WOBBLE_Y[g]
    xs = normal_samples(55, income, 4.4, 1000 + g * 53)
    ys = normal_samples(55, turnout, 4.6, 5000 + g * 71)
    groups.append({"x": xs, "y": ys, "meanX": float(np.mean(xs)), "meanY": float(np.mean(ys)), "r": corr(xs, ys)})
r_group = corr([gg["meanX"] for gg in groups], [gg["meanY"] for gg in groups])
r_within = sum(gg["r"] for gg in groups) / 6
out["districts"] = {
    "per": 55,
    "groups": [
        {"x": rs(gg["x"], 2), "y": rs(gg["y"], 2), "meanX": r(gg["meanX"], 3), "meanY": r(gg["meanY"], 3), "r": r(gg["r"], 3)}
        for gg in groups
    ],
    "rGroup": r(r_group, 3),
    "rWithin": r(r_within, 3),
}
say(f"  districts: r = {r_group:.2f} across district means; {r_within:.2f} within, on average")

# ── The charts' own captions, recomputed by node, must agree ───────────────
assert f"{r_all:.2f}" == "-0.01" and f"{r_in:.2f}" == "-0.56" and len(admitted) == 107, "berksons-paradox"
assert f"{r_group:.2f}" == "0.93" and f"{r_within:.2f}" == "0.07", "ecological-fallacy"
assert f"{abs(WITHIN_SLOPE * 60):.1f}" == "2.7" and f"{pooled[0] * 60:.1f}" == "8.9", "simpsons-paradox-trend"
assert best == 25 and window_pct == 25 and decade_pct == 0, "cherry-picked-window"

print(json.dumps(out, separators=(",", ":")))
