"""Measures every number and every point the StandardError video shows.

    python3 src/videos/standard-error/measure.py > src/videos/standard-error/measurements.json

(Run it without -I: scipy is a user-site install here.)

Each section re-runs one code block of the lesson,
content/courses/statistics-for-data-science-python/standard-error.mdx, with its
own seed and its own calls in its own order, so every number printed here is
the number the page prints. The only additions are reads of values the
lesson's code already computes (the sample it draws, the means it averages)
and, marked below, draws made after the lesson's own have finished, so they
cannot change what the lesson prints.
"""

import json
import math

import numpy as np
from scipy import stats


def r(x, d=4):
    return round(float(x), d)


out = {}

# ── "Computing both, and seeing they differ" ────────────────────────────────
rng = np.random.default_rng(42)
sample = rng.normal(loc=41, scale=12, size=200)
n = len(sample)
sd = sample.std(ddof=1)
se = sd / np.sqrt(n)
assert abs(stats.sem(sample) - se) < 1e-12
out["ages"] = {
    "seed": 42,
    "n": n,
    "mean": r(sample.mean()),
    "sd": r(sd),
    "se": r(se),
    "sqrtN": r(np.sqrt(n)),
    "min": r(sample.min()),
    "max": r(sample.max()),
    "values": [r(v, 2) for v in sample],
}
# Added, after the lesson's draw: other samples of 200 from the same
# population, normal(41, 12), drawn by the same generator. The first few are
# the "different two hundred people" whose averages the video shows moving;
# all 2,000 measure how far that average really moves.
others = np.array([rng.normal(loc=41, scale=12, size=200).mean() for _ in range(2000)])
out["ages"]["otherMeans"] = [r(v, 3) for v in others[:6]]
out["ages"]["otherMeansSd"] = r(others.std())
out["ages"]["theorySe"] = r(12 / np.sqrt(200))

# ── "Confirming SE is the sampling distribution's SD" ───────────────────────
rng = np.random.default_rng(7)
MU, SIGMA = 100.0, 25.0
population = rng.normal(MU, SIGMA, size=1_000_000)
n = 50
# The lesson's list comprehension, written as a loop so the first samples can
# be kept: the same calls in the same order, so the same draws.
first = []
means = []
for i in range(10000):
    s = rng.choice(population, size=n, replace=False)
    if i < 3:
        first.append(s)
    means.append(s.mean())
many_means = np.array(means)
true_sampling_sd = many_means.std()
one_sample = rng.choice(population, size=n, replace=False)
estimated_se = one_sample.std(ddof=1) / np.sqrt(n)

POP_LO, POP_HI, POP_BIN = 0, 200, 4
counts, _ = np.histogram(population, bins=np.arange(POP_LO, POP_HI + POP_BIN, POP_BIN))
out["check"] = {
    "seed": 7,
    "mu": MU,
    "sigma": SIGMA,
    "popSize": len(population),
    "popMean": r(population.mean()),
    "popSd": r(population.std()),
    "n": n,
    "samples": len(many_means),
    "sigmaOverRootN": r(SIGMA / np.sqrt(n)),
    "trueSamplingSd": r(true_sampling_sd),
    "estimatedSe": r(estimated_se),
    "meansMean": r(many_means.mean()),
    "oneSampleMean": r(one_sample.mean()),
    "oneSampleSd": r(one_sample.std(ddof=1)),
    "popHist": {
        "lo": POP_LO,
        "bin": POP_BIN,
        "counts": counts.tolist(),
        "outside": int(len(population) - counts.sum()),
    },
    "first": [[r(v, 2) for v in s] for s in first],
    "firstMeans": [r(s.mean(), 3) for s in first],
    "means": [r(v, 2) for v in many_means],
}

# ── "The square-root-of-n law and diminishing returns" ──────────────────────
SIGMA = 20.0
ns = np.array([10, 25, 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800])
out["law"] = {
    "sigma": SIGMA,
    "points": [{"n": int(k), "se": r(SIGMA / np.sqrt(k))} for k in ns],
    # The 100x claim: a tenth of the error at n = 100 needs n = 10,000.
    "tenth": {"from": 100, "to": 10000, "seFrom": r(SIGMA / math.sqrt(100)), "seTo": r(SIGMA / math.sqrt(10000))},
    # "To halve your standard error, you need four times the data": exact.
    "halvings": [
        {"from": int(a), "to": int(4 * a), "ratio": r((SIGMA / math.sqrt(a)) / (SIGMA / math.sqrt(4 * a)))}
        for a in (100, 400)
    ],
}

# ── "SE is the building block of inference" ─────────────────────────────────
rng = np.random.default_rng(0)
sample = rng.normal(loc=8.0, scale=2.5, size=120)
n = len(sample)
x_bar = sample.mean()
se = stats.sem(sample)
lo, hi = x_bar - 1.96 * se, x_bar + 1.96 * se
ci = stats.t.interval(0.95, df=n - 1, loc=x_bar, scale=se)
out["interval"] = {
    "seed": 0,
    "n": n,
    "mean": r(x_bar),
    "sd": r(sample.std(ddof=1)),
    "se": r(se),
    "lo": r(lo),
    "hi": r(hi),
    "tLo": r(ci[0]),
    "tHi": r(ci[1]),
    # The value the lesson's code drew the times around, used on screen as
    # the value a test would measure the estimate against.
    "tested": 8.0,
    "gapInSe": r((x_bar - 8.0) / se),
    "min": r(sample.min()),
    "max": r(sample.max()),
    "values": [r(v, 2) for v in sample],
}

print(json.dumps(out, separators=(",", ":")))
