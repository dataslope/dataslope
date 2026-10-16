"""Computes every number and curve the RandomWalks video shows; data.ts imports the output.

    python3 src/videos/random-walks/measure.py > src/videos/random-walks/measurements.json

The lesson is content/courses/time-series-analysis-python/stationarity.mdx
(with differencing.mdx after it). Its random walk is
`np.cumsum(rng.normal(0, 1, 300))` under `np.random.default_rng(0)`; the video
keeps the lesson's seed and its length of 300 and makes each step a coin flip,
plus or minus one, which is the same kind of walk with the simplest possible
step.

Pairs. PAIRS pairs of independent walks are drawn from one generator,
`np.random.default_rng(SEED)`, one pair at a time: walk a's 300 flips, then
walk b's. The pair the video features is pair 0, the first one drawn, so it is
not picked for looking dramatic. Every pair is correlated as walks (Pearson r
of the two cumulative sums) and as differences (r of `np.diff` of each), and
the r values are binned for the two histograms.

Longer walks repeat the whole count with walks ten times as long, from their
own seed, to show that more data does not shrink the spread.

The stationarity check is the lesson's own: `adfuller` from statsmodels with
its defaults, and its p-value.
"""

import json
import sys
import warnings

import numpy as np

warnings.filterwarnings("ignore")
from statsmodels.tsa.stattools import adfuller  # noqa: E402

SEED = 0
STEPS = 300
PAIRS = 10_000
LONG_STEPS = 3_000
LONG_SEED = 1
#: Histogram bins of r over [-1, 1].
BIN = 0.05
EDGES = np.round(np.arange(-1, 1 + BIN / 2, BIN), 10)
#: How many of the featured walk's flips the video spells out.
SHOWN_FLIPS = 14


def flip_pairs(seed, steps, pairs):
    rng = np.random.default_rng(seed)
    out = np.empty((pairs, 2, steps), dtype=np.int8)
    for i in range(pairs):
        out[i, 0] = rng.choice([-1, 1], steps)
        out[i, 1] = rng.choice([-1, 1], steps)
    return out


def row_corr(a, b):
    a = a - a.mean(axis=1, keepdims=True)
    b = b - b.mean(axis=1, keepdims=True)
    return (a * b).sum(axis=1) / np.sqrt((a * a).sum(axis=1) * (b * b).sum(axis=1))


def counts(r):
    c, _ = np.histogram(r, bins=EDGES)
    assert c.sum() == len(r)
    return c.tolist()


def summary(r):
    a = np.abs(r)
    return {
        "mean": float(r.mean()),
        "sd": float(r.std()),
        "medianAbs": float(np.median(a)),
        "shareAbove50": float((a > 0.5).mean()),
        "shareAbove80": float((a > 0.8).mean()),
        "shareAbove25": float((a > 0.25).mean()),
        "maxAbs": float(a.max()),
        "counts": counts(r),
    }


def lag1(x):
    x = np.asarray(x, dtype=float)
    return float(np.corrcoef(x[:-1], x[1:])[0, 1])


flips = flip_pairs(SEED, STEPS, PAIRS)
walks = np.cumsum(flips.astype(np.int64), axis=2)
diffs = np.diff(walks, axis=2)
# Differencing a coin-flip walk hands back its flips, all but the first.
assert np.array_equal(diffs, flips[:, :, 1:])

r_walk = row_corr(walks[:, 0].astype(float), walks[:, 1].astype(float))
r_diff = row_corr(diffs[:, 0].astype(float), diffs[:, 1].astype(float))

a, b = walks[0, 0], walks[0, 1]
featured = {
    "flipsA": flips[0, 0, :SHOWN_FLIPS].tolist(),
    "walkA": a.tolist(),
    "walkB": b.tolist(),
    "r": float(np.corrcoef(a, b)[0, 1]),
    "rDiff": float(np.corrcoef(np.diff(a), np.diff(b))[0, 1]),
    "endA": int(a[-1]),
    "endB": int(b[-1]),
    "maxA": int(a.max()),
    "minA": int(a.min()),
    "argmaxA": int(a.argmax()),
    "argminA": int(a.argmin()),
    "lag1Walk": lag1(a),
    "lag1Diff": lag1(np.diff(a)),
    "adfWalk": float(adfuller(a.astype(float))[1]),
    "adfDiff": float(adfuller(np.diff(a).astype(float))[1]),
    "adfWalkB": float(adfuller(b.astype(float))[1]),
    "adfDiffB": float(adfuller(np.diff(b).astype(float))[1]),
}
assert abs(featured["r"] - r_walk[0]) < 1e-12 and abs(featured["rDiff"] - r_diff[0]) < 1e-12

long_flips = flip_pairs(LONG_SEED, LONG_STEPS, PAIRS)
long_walks = np.cumsum(long_flips.astype(np.int64), axis=2).astype(float)
r_long = row_corr(long_walks[:, 0], long_walks[:, 1])

json.dump(
    {
        "seed": SEED,
        "steps": STEPS,
        "pairs": PAIRS,
        "bin": BIN,
        "lo": -1,
        "featured": featured,
        "walk": summary(r_walk),
        "diff": summary(r_diff),
        "long": {"steps": LONG_STEPS, "seed": LONG_SEED, **summary(r_long)},
        "numpy": np.__version__,
    },
    sys.stdout,
    indent=1,
)
sys.stdout.write("\n")
