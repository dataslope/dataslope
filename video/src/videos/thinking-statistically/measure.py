"""Measures every number and every dot the ThinkingStatistically video shows.

    python3 -I src/videos/thinking-statistically/measure.py > src/videos/thinking-statistically/measurements.json

Each part re-runs one of the lesson code blocks the video is built from, with
its own seed and its own calls in its own order, so what it prints is what the
page prints. The lessons are in content/courses/statistics-for-data-science-python/:

- "gaps" is why-statistics-matters.mdx, "Why randomness matters" (seed 0):
  two groups of 40 drawn from the same Normal(50, 10), five times over.
- "trend" is statistical-thinking.mdx, "Signal vs. noise" (seed 3): 24 months
  of a metric that is pure noise, Normal(0, 8), around a flat 100.
- "survey" is why-statistics-matters.mdx, "Why uncertainty exists": 500
  surveyed customers of 300,000.
- "known" is populations-and-samples.mdx, "Seeing it in code: a known
  population" (seed 42): one sample of 50 from Normal(100, 15).
- "many" is populations-and-samples.mdx, "A statistic is a random variable"
  (seed 7): 1,000 samples of 50 from the same population. The video draws
  twenty rows: the seed-42 sample above, then the first 19 of these, so the
  first row on screen is the sample the previous figure showed. Both blocks
  draw from the same population, so the rows are twenty samples of it.
- "flavors" is types-of-data.mdx's opening example, "1 = vanilla,
  2 = chocolate, 3 = strawberry. Average them and you might get 1.8." The
  lesson gives no responses, so the video uses ten of its own, chosen to give
  the lesson's 1.8; their mean and mode are computed here like any column's.
- "zips" is types-of-data.mdx, "Encoding traps: when numbers aren't
  quantities", run in pandas exactly as the block builds its frame.

Printed checks (the lessons' own output lines) go to stderr.
"""

import json
import platform
import sys

import numpy as np
import pandas as pd


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
    }
}

# ── Part 1. Two groups from one process (why-statistics-matters, seed 0) ────
rng = np.random.default_rng(0)
trials = []
for trial in range(5):
    a = rng.normal(50, 10, size=40)
    b = rng.normal(50, 10, size=40)
    say(f"Trial {trial + 1}: A={a.mean():5.2f}  B={b.mean():5.2f}  gap={a.mean() - b.mean():+5.2f}")
    trials.append(
        {
            "a": rs(a),
            "b": rs(b),
            "meanA": r(a.mean()),
            "meanB": r(b.mean()),
            "gap": r(a.mean() - b.mean()),
        }
    )
all_values = np.concatenate([np.concatenate([np.array(t["a"]), np.array(t["b"])]) for t in trials])
out["gaps"] = {
    "seed": 0,
    "n": 40,
    "mu": 50,
    "sigma": 10,
    "trials": trials,
    "min": r(all_values.min()),
    "max": r(all_values.max()),
    # How many of the five draws favour A, and how many B.
    "aAhead": sum(1 for t in trials if t["gap"] > 0),
    "bAhead": sum(1 for t in trials if t["gap"] < 0),
    "neverZero": all(abs(t["gap"]) > 0 for t in trials),
}
say(f"  gaps: A ahead {out['gaps']['aAhead']}, B ahead {out['gaps']['bAhead']}; values {all_values.min():.1f}..{all_values.max():.1f}")

# ── Part 1. A trend that is pure noise (statistical-thinking, seed 3) ───────
rng = np.random.default_rng(3)
months = np.arange(1, 25)
metric = 100 + rng.normal(0, 8, size=24)
last_six = metric[-6:]
slope = last_six[-1] - last_six[0]
say(f"'Last six months' slope looks like: {slope:+.1f} units of 'movement'")
out["trend"] = {
    "seed": 3,
    "level": 100,
    "sigma": 8,
    "months": [int(m) for m in months],
    "metric": rs(metric, 3),
    "lastSixFrom": int(months[-6]),
    "lastSixTo": int(months[-1]),
    "lastSixStart": r(last_six[0]),
    "lastSixEnd": r(last_six[-1]),
    "lastSixChange": r(slope),
    "min": r(metric.min()),
    "minMonth": int(months[metric.argmin()]),
    "max": r(metric.max()),
    "maxMonth": int(months[metric.argmax()]),
    "mean": r(metric.mean()),
}
say(f"  trend: min {metric.min():.1f} (month {months[metric.argmin()]}), max {metric.max():.1f} (month {months[metric.argmax()]}), mean {metric.mean():.2f}")

# ── Part 2. The survey (why-statistics-matters, prose) ──────────────────────
SURVEYED, CUSTOMERS = 500, 300_000
assert CUSTOMERS % SURVEYED == 0
out["survey"] = {
    "surveyed": SURVEYED,
    "customers": CUSTOMERS,
    # The grid on screen: one square per 500 customers.
    "squares": CUSTOMERS // SURVEYED,
    "perSquare": SURVEYED,
}
say(f"  survey: {SURVEYED} of {CUSTOMERS:,} is one in {CUSTOMERS // SURVEYED}")

# ── Part 2. A known population (populations-and-samples, seed 42) ───────────
MU_TRUE = 100.0
SIGMA_TRUE = 15.0
rng = np.random.default_rng(42)
sample = rng.normal(MU_TRUE, SIGMA_TRUE, size=50)
x_bar = sample.mean()
s = sample.std(ddof=1)
say(f"Parameter  mu    = {MU_TRUE:.2f}")
say(f"Statistic  x-bar = {x_bar:.2f}")
say(f"Estimation error  = {x_bar - MU_TRUE:+.2f}")
say(f"Statistic  s     = {s:.2f}")
out["known"] = {
    "seed": 42,
    "mu": MU_TRUE,
    "sigma": SIGMA_TRUE,
    "n": 50,
    "values": rs(sample),
    "xBar": r(x_bar),
    "s": r(s),
    "error": r(x_bar - MU_TRUE),
    "min": r(sample.min()),
    "max": r(sample.max()),
}

# ── Part 2. A statistic is a random variable (populations-and-samples, seed 7)
rng = np.random.default_rng(7)
samples = [rng.normal(MU_TRUE, SIGMA_TRUE, 50) for _ in range(1000)]
sample_means = np.array([x.mean() for x in samples])
say(f"Average of the 1000 sample means: {sample_means.mean():.2f}")
say(f"Spread of the sample means (std): {sample_means.std():.2f}")
rows = [sample] + samples[:19]
row_means = np.array([x.mean() for x in rows])
row_values = np.concatenate(rows)
out["many"] = {
    "seed": 7,
    "samples": 1000,
    "lessonMean": r(sample_means.mean()),
    "lessonSpread": r(sample_means.std()),
    "rows": [rs(x) for x in rows],
    "rowMeans": rs(row_means, 4),
    "rowCount": len(rows),
    "above": int((row_means > MU_TRUE).sum()),
    "below": int((row_means < MU_TRUE).sum()),
    "rowMin": r(row_means.min()),
    "rowMax": r(row_means.max()),
    "valueMin": r(row_values.min()),
    "valueMax": r(row_values.max()),
}
say(
    f"  twenty rows: means {row_means.min():.2f}..{row_means.max():.2f}, "
    f"{out['many']['above']} above 100 and {out['many']['below']} below; values {row_values.min():.1f}..{row_values.max():.1f}"
)

# ── Part 3. Flavor codes (types-of-data, opening example) ───────────────────
FLAVORS = {1: "vanilla", 2: "chocolate", 3: "strawberry"}
answers = pd.Series([1, 3, 1, 2, 3, 1, 1, 3, 2, 1], name="flavor")
flavor_mean = answers.mean()
flavor_mode = answers.map(FLAVORS).mode()[0]
counts = answers.value_counts().sort_index()
assert round(float(flavor_mean), 6) == 1.8
say(f"  flavors: dtype {answers.dtype}, mean {flavor_mean:.1f}, mode {flavor_mode}, counts {dict(counts)}")
out["flavors"] = {
    "codes": {str(k): v for k, v in FLAVORS.items()},
    "answers": [int(a) for a in answers],
    "dtype": str(answers.dtype),
    "mean": r(flavor_mean),
    "mode": flavor_mode,
    "counts": {FLAVORS[int(k)]: int(v) for k, v in counts.items()},
}

# ── Part 3. Encoding traps (types-of-data, pandas) ──────────────────────────
df = pd.DataFrame(
    {
        "zip_code": [10001, 60614, 94105, 30301],  # nominal, stored as int
        "rating_1to5": [5, 3, 4, 2],  # ordinal, stored as int
        "price_usd": [19.99, 5.00, 42.50, 8.25],  # ratio, genuinely numeric
    }
)
say("Mean of zip_code:    ", df["zip_code"].mean(), "  <- NONSENSE (zips are labels)")
say("Mean of rating_1to5: ", df["rating_1to5"].mean(), "      <- shaky (ordinal: gaps not equal)")
say("Mean of price_usd:   ", round(df["price_usd"].mean(), 2), "  <- valid (ratio scale)")
say("  zip_code     -> count distinct / mode:", df["zip_code"].mode().tolist())
say("  rating_1to5  -> median:", df["rating_1to5"].median())
out["zips"] = {
    "zips": [int(z) for z in df["zip_code"]],
    "dtypes": {c: str(t) for c, t in df.dtypes.items()},
    "zipMean": r(df["zip_code"].mean()),
    "ratings": [int(v) for v in df["rating_1to5"]],
    "ratingMean": r(df["rating_1to5"].mean()),
    "ratingMedian": r(df["rating_1to5"].median()),
    "prices": [r(v, 2) for v in df["price_usd"]],
    "priceMean": round(float(df["price_usd"].mean()), 2),
    # Doubling a price means something: the video shows one of the lesson's.
    "priceDoubled": r(df["price_usd"].iloc[2] * 2, 2),
}
say(f"  dtypes {out['zips']['dtypes']}; ${df['price_usd'].iloc[2]:.2f} doubled is ${df['price_usd'].iloc[2] * 2:.2f}")

json.dump(out, sys.stdout, separators=(",", ":"))
sys.stdout.write("\n")
