"""Measures every number and every dot the DescribingData video shows.

    python3 src/videos/describing-data/measure.py > src/videos/describing-data/measurements.json

Each part re-runs one of the lesson code blocks (or lesson chart specs) the
video is built from, with its own seed and its own calls in its own order, so
what it prints is what the page prints. The lessons are in
content/courses/statistics-for-data-science-python/:

- "salaries" is measures-of-center.mdx, "Where the mean lies": ten salaries
  in thousands, then the CEO's 1,000k.
- "orders" is measures-of-center.mdx, "Putting it together" (seed 7): 500
  right-skewed order values, lognormal(3.2, 0.6), rounded to cents.
- "delivery" is measures-of-spread.mdx, "Same center, different spread": two
  services that both average 30 minutes, with pandas' std (ddof=1).
- "divisor" is measures-of-spread.mdx's chart charts/bessel-correction.mjs
  (seed 1234, 4,000 samples at each size), run in Node from its own seeded
  generator, plus its first sample of five; and the "ddof" code block's
  numpy-against-pandas sample.
- "robust" is measures-of-spread.mdx, "IQR" and "MAD": ten incomes with one
  of 9,000.
- "skew" is shape-and-outliers.mdx, "Skewness" (seed 0): symmetric, right-
  and left-skewed samples of 5,000.
- "heights" is shape-and-outliers.mdx, "Modality" (seed 1): two groups of
  1,500 heights mixed in one column.
- "tails" is shape-and-outliers.mdx, "Tail heaviness" (seed 3): 20,000
  normal draws against 20,000 from Student's t with 3 degrees of freedom.
- "outliers" is shape-and-outliers.mdx, "Two rules for flagging outliers"
  (seed 7): 200 lognormal incomes plus 120 and 200.
- "dino" is statistical-fallacies.mdx, "Trusting a summary without
  looking": the Datasaurus Dozen, from the course's pinned datasets repo.
- "bins" is visualizing-distributions.mdx's chart
  charts/histogram-bin-width.mjs (seeds 314 and 271), run in Node; the same
  thousand values give the box plot, violin and ECDF of the last scene.

Printed checks (the lessons' own output lines) go to stderr.
"""

import json
import os
import platform
import subprocess
import sys
import urllib.request

import numpy as np
import pandas as pd
import scipy
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
REPO = os.path.abspath(os.path.join(VIDEO, ".."))
CACHE = os.path.join(VIDEO, ".generated", "describing-data")
DATASETS_REF = "f7f08485960fe4a774359a43d1eb50a84514daf2"


def r(x, d=4):
    return round(float(x), d)


def rs(values, d=3):
    return [round(float(v), d) for v in values]


def say(*args):
    print(*args, file=sys.stderr)


def node(source):
    """Runs an ES module in Node from the repo root and parses its JSON."""
    done = subprocess.run(
        ["node", "--input-type=module", "-e", source], cwd=REPO, capture_output=True, text=True, check=True
    )
    return json.loads(done.stdout)


def dataset(name):
    """A CSV from the course's datasets repo at the ref the site pins."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        url = f"https://raw.githubusercontent.com/dataslope/datasets/{DATASETS_REF}/{name}"
        with urllib.request.urlopen(url) as res, open(path, "wb") as f:
            f.write(res.read())
    return pd.read_csv(path)


out = {
    "env": {
        "python": platform.python_version(),
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "scipy": scipy.__version__,
    }
}

# ── Part 1. Ten salaries and a CEO (measures-of-center) ─────────────────────
salaries = pd.Series([42, 45, 48, 50, 52, 55, 58, 60, 62, 65])
with_ceo = pd.concat([salaries, pd.Series([1000])], ignore_index=True)
say("Without the CEO:")
say(f"  Mean   = {salaries.mean():.1f}k")
say(f"  Median = {salaries.median():.1f}k")
say("With one CEO earning 1,000k:")
say(f"  Mean   = {with_ceo.mean():.1f}k")
say(f"  Median = {with_ceo.median():.1f}k")
out["salaries"] = {
    "values": salaries.tolist(),
    "ceo": 1000,
    "mean": r(salaries.mean(), 2),
    "median": r(salaries.median(), 2),
    "ceoMean": r(with_ceo.mean(), 2),
    "ceoMedian": r(with_ceo.median(), 2),
    "jump": r(with_ceo.mean() - salaries.mean(), 2),
    "below": int((with_ceo < with_ceo.mean()).sum()),
    "count": int(with_ceo.size),
}

# ── Part 1. Five hundred right-skewed orders (measures-of-center, seed 7) ───
rng = np.random.default_rng(7)
orders = pd.Series(np.round(rng.lognormal(mean=3.2, sigma=0.6, size=500), 2))
say(f"orders: mean {orders.mean():.2f}  median {orders.median():.2f}  mean_minus_median {orders.mean() - orders.median():.2f}")
ORDER_BIN = 2
order_edges = np.arange(0, 116, ORDER_BIN)
order_counts, _ = np.histogram(orders, bins=order_edges)
out["orders"] = {
    "n": int(orders.size),
    "bin": ORDER_BIN,
    "lo": 0,
    "counts": order_counts.tolist(),
    "mean": r(orders.mean(), 2),
    "median": r(orders.median(), 2),
    "gap": r(orders.mean() - orders.median(), 2),
    "min": r(orders.min(), 2),
    "max": r(orders.max(), 2),
}

# ── Part 2. Same center, different spread (measures-of-spread) ──────────────
consistent = pd.Series([28, 29, 30, 30, 31, 32, 30, 29, 31, 30])
erratic = pd.Series([5, 55, 12, 48, 30, 30, 8, 52, 31, 29])
for name, s in [("consistent", consistent), ("erratic", erratic)]:
    say(f"{name:>11}: mean={s.mean():.1f}  min={s.min():2d}  max={s.max():2d}  std={s.std():.1f}")
dev = consistent - consistent.mean()
out["delivery"] = {
    "steady": consistent.tolist(),
    "erratic": erratic.tolist(),
    "mean": r(consistent.mean(), 2),
    "erraticMean": r(erratic.mean(), 2),
    "steadyMin": int(consistent.min()),
    "steadyMax": int(consistent.max()),
    "erraticMin": int(erratic.min()),
    "erraticMax": int(erratic.max()),
    "deviations": dev.tolist(),
    "squares": (dev**2).tolist(),
    "sumSquares": r((dev**2).sum(), 4),
    "divisor": int(consistent.size - 1),
    "variance": r(consistent.var(), 4),
    "steadySd": r(consistent.std(), 4),
    "erraticSd": r(erratic.std(), 4),
}

# ── Part 2. Why n - 1 (charts/bessel-correction.mjs, seed 1234) ─────────────
bessel = node(
    """
import { normalSamples } from "./charts/_theme.mjs";
const SIGMA2 = 100, TRIALS = 4000, SIZES = [2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 80, 120];
let seed = 1234;
const rows = [];
let first5 = null;
for (const n of SIZES) {
  let sumN = 0, sumN1 = 0;
  for (let t = 0; t < TRIALS; t++) {
    const xs = normalSamples(n, 0, Math.sqrt(SIGMA2), (seed += 7));
    if (n === 5 && t === 0) first5 = xs;
    const m = xs.reduce((s, x) => s + x, 0) / n;
    const ss = xs.reduce((s, x) => s + (x - m) ** 2, 0);
    sumN += ss / n;
    sumN1 += ss / (n - 1);
  }
  rows.push({ n, byN: sumN / TRIALS, byN1: sumN1 / TRIALS });
}
console.log(JSON.stringify({ sigma2: SIGMA2, trials: TRIALS, rows, first5 }));
"""
)
five = np.array(bessel["first5"])
at5 = next(row for row in bessel["rows"] if row["n"] == 5)
say(f"n=5: divide by n {at5['byN']:.2f} ({(1 - at5['byN'] / 100) * 100:.0f}% low), divide by n-1 {at5['byN1']:.2f}")
sample = np.array([42, 45, 48, 50, 52, 55, 58, 60, 62, 65])
say("NumPy default (ddof=0, divide by n) :", round(np.std(sample), 4))
say("pandas Series default (ddof=1)       :", round(pd.Series(sample).std(), 4))
out["divisor"] = {
    "sigma2": bessel["sigma2"],
    "trials": bessel["trials"],
    "five": rs(five, 4),
    "fiveMean": r(five.mean(), 4),
    "ssAroundMean": r(((five - five.mean()) ** 2).sum(), 2),
    "ssAroundTruth": r((five**2).sum(), 2),
    "byN": r(at5["byN"], 2),
    "byN1": r(at5["byN1"], 2),
    "lowPct": r((1 - at5["byN"] / bessel["sigma2"]) * 100, 2),
    "numpyStd": r(np.std(sample), 2),
    "pandasStd": r(pd.Series(sample).std(), 2),
}

# ── Part 2. IQR and MAD (measures-of-spread) ────────────────────────────────
income = pd.Series([38, 41, 44, 47, 49, 52, 55, 60, 120, 9000])
q1, q3 = income.quantile(0.25), income.quantile(0.75)
say(f"Q1 = {q1:.1f}, Q3 = {q3:.1f}")
say(f"IQR (pandas)        : {q3 - q1:.1f}")
say(f"IQR (scipy.stats)   : {stats.iqr(income):.1f}")
say(f"Std dev (ddof=1)    : {income.std():.1f}")
data = np.array([38, 41, 44, 47, 49, 52, 55, 60, 120, 9000])
med = np.median(data)
mad_manual = np.median(np.abs(data - med))
say(f"MAD (by hand)           : {mad_manual:.1f}")
say(f"MAD (scipy, raw)        : {stats.median_abs_deviation(data):.1f}")
out["robust"] = {
    "values": income.tolist(),
    "q1": r(q1, 2),
    "q3": r(q3, 2),
    "iqr": r(q3 - q1, 2),
    "sd": r(income.std(), 2),
    "median": r(med, 2),
    "distances": sorted(rs(np.abs(data - med), 2)),
    "mad": r(mad_manual, 2),
}

# ── Part 3. Skewness (shape-and-outliers, seed 0) ──────────────────────────
rng = np.random.default_rng(0)
symmetric = rng.normal(50, 10, size=5000)
right = rng.lognormal(mean=3, sigma=0.6, size=5000)
left = 100 - rng.exponential(scale=10, size=5000)
skew = {}
for key, name, x, lo, hi in [
    ("left", "left-skew", left, 30, 100),
    ("symmetric", "symmetric", symmetric, 15, 85),
    ("right", "right-skew", right, 0, 70),
]:
    say(
        f"{name:>11}: skew={stats.skew(x):+.2f}  mean={x.mean():6.1f}  median={np.median(x):6.1f}  "
        f"(mean - median = {x.mean() - np.median(x):+.1f})"
    )
    width = (hi - lo) / 35
    counts, _ = np.histogram(x, bins=np.linspace(lo, hi, 36))
    skew[key] = {
        "lo": lo,
        "hi": hi,
        "bin": r(width, 6),
        "counts": counts.tolist(),
        "mean": r(x.mean(), 3),
        "median": r(np.median(x), 3),
        "gap": r(x.mean() - np.median(x), 3),
        "skew": r(stats.skew(x), 3),
    }
out["skew"] = skew

# ── Part 3. Two groups in one column (shape-and-outliers, seed 1) ──────────
rng = np.random.default_rng(1)
group_a = rng.normal(165, 6, size=1500)
group_b = rng.normal(185, 6, size=1500)
mixed = np.concatenate([group_a, group_b])
say(f"Mean of the mixed column: {mixed.mean():.1f} cm")
H_LO, H_HI, H_BIN = 140, 210, 2
h_edges = np.arange(H_LO, H_HI + H_BIN, H_BIN)
out["heights"] = {
    "lo": H_LO,
    "hi": H_HI,
    "bin": H_BIN,
    "counts": np.histogram(mixed, bins=h_edges)[0].tolist(),
    "countsA": np.histogram(group_a, bins=h_edges)[0].tolist(),
    "countsB": np.histogram(group_b, bins=h_edges)[0].tolist(),
    "mean": r(mixed.mean(), 2),
    "muA": 165,
    "muB": 185,
}

# ── Part 3. Tail heaviness (shape-and-outliers, seed 3) ────────────────────
rng = np.random.default_rng(3)
normal_data = rng.normal(0, 1, size=20000)
heavy_tail = rng.standard_t(df=3, size=20000)
tails = {}
for key, name, x in [("normal", "normal", normal_data), ("heavy", "heavy-tailed", heavy_tail)]:
    far_out = np.mean(np.abs(x - x.mean()) > 4 * x.std())
    say(f"{name:>13}: excess kurtosis={stats.kurtosis(x):+.2f}  share beyond 4 SD = {far_out:.4%}")
    z = (x - x.mean()) / x.std()
    counts, _ = np.histogram(z, bins=np.linspace(-4, 4, 33))
    tails[key] = {
        "n": int(x.size),
        "counts": counts.tolist(),
        "far": int((np.abs(z) > 4).sum()),
        "share": r(far_out, 6),
        "farZ": rs(np.sort(z[np.abs(z) > 4]), 3),
        "kurtosis": r(stats.kurtosis(x), 2),
    }
out["tails"] = tails

# ── Part 3. Flagging outliers (shape-and-outliers, seed 7) ─────────────────
rng = np.random.default_rng(7)
flagged = pd.Series(np.concatenate([rng.lognormal(mean=3.0, sigma=0.5, size=200), [120, 200]]))
fq1, fq3 = flagged.quantile(0.25), flagged.quantile(0.75)
fiqr = fq3 - fq1
lo, hi = fq1 - 1.5 * fiqr, fq3 + 1.5 * fiqr
iqr_flags = flagged[(flagged < lo) | (flagged > hi)]
zs = (flagged - flagged.mean()) / flagged.std(ddof=0)
z_flags = flagged[zs.abs() > 3]
say(f"IQR fence:  [{lo:.1f}, {hi:.1f}]")
say(f"IQR rule flags {len(iqr_flags)} points: {sorted(iqr_flags.round(1).tolist())}")
say(f"z>3 rule flags {len(z_flags)} points: {sorted(z_flags.round(1).tolist())}")
out["outliers"] = {
    "values": rs(flagged, 4),
    "planted": [120, 200],
    "lower": r(lo, 4),
    "upper": r(hi, 4),
    "iqrFlagged": sorted(rs(iqr_flags, 4)),
    "zFlagged": sorted(rs(z_flags, 4)),
    "zCut": r(flagged.mean() + 3 * flagged.std(ddof=0), 4),
    "iqrFlags": len(iqr_flags),
    "zFlags": len(z_flags),
    "tailFlags": int(len(iqr_flags) - len(z_flags)),
}

# ── Part 4. The Datasaurus Dozen (statistical-fallacies) ───────────────────
dd = dataset("datasaurus_dozen.csv")
summary = dd.groupby("dataset").agg(
    mean_x=("x", "mean"), mean_y=("y", "mean"), std_x=("x", "std"), std_y=("y", "std")
)
summary["corr"] = dd.groupby("dataset").apply(lambda g: g["x"].corr(g["y"]))
say(summary.round(2).to_string())
order = ["dino", "star", "circle", "h_lines", "bullseye", "x_shape", "slant_up", "dots", "wide_lines", "away", "high_lines", "v_lines", "slant_down"]
spans = {col: r(summary[col].max() - summary[col].min(), 5) for col in summary.columns}
out["dino"] = {
    "order": order,
    "points": {k: [[r(x, 2), r(y, 2)] for x, y in dd[dd.dataset == k][["x", "y"]].to_numpy()] for k in order},
    "stats": {
        k: {
            "meanX": r(summary.loc[k, "mean_x"], 4),
            "meanY": r(summary.loc[k, "mean_y"], 4),
            "sdX": r(summary.loc[k, "std_x"], 4),
            "sdY": r(summary.loc[k, "std_y"], 4),
            "corr": r(summary.loc[k, "corr"], 4),
        }
        for k in order
    },
    "spans": spans,
    "n": int((dd.dataset == "dino").sum()),
}
say("largest spread of any statistic across the 13:", max(spans.values()))

# ── Part 4. The bin trap (charts/histogram-bin-width.mjs) ──────────────────
values = np.array(
    node(
        """
import { normalSamples } from "./charts/_theme.mjs";
console.log(JSON.stringify([...normalSamples(600, 8, 1.5, 314), ...normalSamples(400, 15, 1.8, 271)]));
"""
    )
)
DOMAIN = (2, 22)
bins = {}
for width in (4, 1, 0.25):
    count = round((DOMAIN[1] - DOMAIN[0]) / width)
    idx = np.floor((values - DOMAIN[0]) / width).astype(int)
    counts = np.bincount(idx[(idx >= 0) & (idx < count)], minlength=count)
    bins[str(count)] = {"width": width, "counts": counts.tolist(), "density": rs(counts / (values.size * width), 5)}
    say(f"bins of {width}: {counts.tolist()}")
bq1, bmed, bq3 = np.percentile(values, [25, 50, 75])
biqr = bq3 - bq1
inside = values[(values >= bq1 - 1.5 * biqr) & (values <= bq3 + 1.5 * biqr)]
grid = np.linspace(DOMAIN[0], DOMAIN[1], 161)
kde = stats.gaussian_kde(values)(grid)
ecdf_x = np.sort(values)
out["bins"] = {
    "n": int(values.size),
    "lo": DOMAIN[0],
    "hi": DOMAIN[1],
    "sets": bins,
    "box": {
        "q1": r(bq1, 3),
        "median": r(bmed, 3),
        "q3": r(bq3, 3),
        "whiskerLo": r(inside.min(), 3),
        "whiskerHi": r(inside.max(), 3),
        "outliers": rs(values[(values < bq1 - 1.5 * biqr) | (values > bq3 + 1.5 * biqr)], 3),
    },
    "kde": {"grid": rs(grid, 3), "density": rs(kde, 5)},
    "ecdf": rs(ecdf_x[4::5], 3),
}

json.dump(out, sys.stdout, separators=(",", ":"))
