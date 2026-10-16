"""Measures every number and every histogram the SamplingDistributions video shows.

    python3 -I src/videos/sampling-distributions/measure.py > src/videos/sampling-distributions/measurements.json

Each part runs one of the lesson's own code blocks (content/courses/
statistics-for-data-science-python/sampling-distributions.mdx), with its seed,
its population and its sample sizes, minus the plotting. The printed numbers
match the outputs the lesson page shows for those blocks.

- "three" is "Comparing the three side by side" (seed 0): a population of a
  million customers' spend, normal with mean 50 and sd 18; one sample of 40;
  and 5,000 more samples of 40, each kept as its mean.
- "levers" is "More samples vs. larger samples" (seed 1): the same population,
  first n = 40 with 500 to 32,000 samples, then 4,000 samples with n = 10 to 640.
- "any" is "It works for any statistic" (seed 5): a gamma(2, 20) population,
  samples of 60, and the mean, median and maximum of 4,000 samples each.

The one thing the video adds to "three": the sampling distribution it builds
block by block starts with the mean of the one sample it has just shown, then
takes the lesson's next 4,999 means, so the first block on screen is the
average of the forty dots on screen. Both versions are measured below, and
they agree to the second decimal.
"""

import json
import platform
import sys

import numpy as np

MU, SIGMA = 50.0, 18.0


def r(values, digits=4):
    return [round(float(v), digits) for v in values]


def hist(values, lo, hi, width):
    """Counts over [lo, hi) in bins of `width`, plus what falls outside."""
    values = np.asarray(values)
    bins = int(round((hi - lo) / width))
    idx = np.floor((values - lo) / width).astype(int)
    inside = (idx >= 0) & (idx < bins)
    counts = np.bincount(idx[inside], minlength=bins)
    return {
        "lo": lo,
        "hi": hi,
        "bin": width,
        "counts": [int(c) for c in counts],
        "below": int((idx < 0).sum()),
        "above": int((idx >= bins).sum()),
    }


def summary(values):
    values = np.asarray(values)
    return {"mean": float(values.mean()), "sd": float(values.std()), "count": int(values.size)}


# ── Part 1: the three distributions (lesson seed 0) ────────────────────────
rng = np.random.default_rng(0)
population = rng.normal(MU, SIGMA, size=1_000_000)
n = 40
pop_vals = rng.choice(population, size=5000, replace=False)
one_sample = rng.choice(population, size=n, replace=False)
samples = [rng.choice(population, size=n, replace=False) for _ in range(5000)]
many_means = np.array([s.mean() for s in samples])

# The lesson's own printout for this block.
lesson_three = {
    "population_sd": round(float(pop_vals.std()), 2),
    "one_sample_sd": round(float(one_sample.std()), 2),
    "means_sd": round(float(many_means.std()), 2),
}

# The pile the video builds: the shown sample's mean first, then 4,999 more.
pile = np.concatenate([[one_sample.mean()], many_means[:4999]])
pile_r = np.round(pile, 4)
assert hist(pile_r, 30, 70, 1)["counts"] == hist(pile, 30, 70, 1)["counts"]
assert round(float(pile.std()), 2) == lesson_three["means_sd"]

three = {
    "n": n,
    "population": {
        **summary(population),
        "hist": hist(population, 0, 100, 2),
        "negative": int((population < 0).sum()),
    },
    "sample": {**summary(one_sample), "values": r(one_sample, 2)},
    # Samples 2 and on, as dots, for the first hundred (the rest only as means).
    "next_samples": [r(s, 2) for s in samples[:100]],
    "pile": {**summary(pile), "means": r(pile, 4)},
    "lesson_means": summary(many_means),
    "lesson_printout": lesson_three,
}

# ── Part 2: more samples vs. larger samples (lesson seed 1) ────────────────
rng = np.random.default_rng(1)
population = rng.normal(MU, SIGMA, size=1_000_000)


def means_of(n, n_samples):
    return np.array([rng.choice(population, size=n, replace=False).mean() for _ in range(n_samples)])


LEVER_LO, LEVER_HI, LEVER_BIN = 30, 70, 0.5
more = []
for k in [500, 2000, 8000, 32000]:
    m = means_of(40, k)
    more.append({"n": 40, "samples": k, **summary(m), "hist": hist(m, LEVER_LO, LEVER_HI, LEVER_BIN)})
bigger = []
for nn in [10, 40, 160, 640]:
    m = means_of(nn, 4000)
    bigger.append({"n": nn, "samples": 4000, **summary(m), "hist": hist(m, LEVER_LO, LEVER_HI, LEVER_BIN)})

levers = {"more": more, "bigger": bigger}

# ── Part 3: any statistic (lesson seed 5) ──────────────────────────────────
rng = np.random.default_rng(5)
population = rng.gamma(shape=2.0, scale=20.0, size=1_000_000)
n = 60
stats = {}
for stat_name, fn in [("mean", np.mean), ("median", np.median), ("max", np.max)]:
    vals = np.array([fn(rng.choice(population, size=n, replace=False)) for _ in range(4000)])
    stats[stat_name] = {
        **summary(vals),
        "min": float(vals.min()),
        "max": float(vals.max()),
        "skew": float(((vals - vals.mean()) ** 3).mean() / vals.std() ** 3),
        "hist": hist(vals, 0, 300, 2.5),
    }

anything = {
    "n": n,
    "population": {
        **summary(population),
        "hist": hist(population, 0, 300, 5),
        "skew": float(((population - population.mean()) ** 3).mean() / population.std() ** 3),
    },
    "stats": stats,
}

json.dump(
    {
        "generated_by": "src/videos/sampling-distributions/measure.py",
        "python": platform.python_version(),
        "numpy": np.__version__,
        "three": three,
        "levers": levers,
        "any": anything,
    },
    sys.stdout,
    separators=(",", ":"),
)
sys.stdout.write("\n")

# The numbers the narration says, for checking script.ts.
print(
    f"three: pop mean {three['population']['mean']:.2f} sd {three['population']['sd']:.2f}"
    f" (negative {three['population']['negative']});"
    f" sample mean {three['sample']['mean']:.2f} sd {three['sample']['sd']:.2f};"
    f" pile mean {three['pile']['mean']:.2f} sd {three['pile']['sd']:.2f};"
    f" lesson printout {lesson_three}",
    file=sys.stderr,
)
for row in more + bigger:
    print(f"lever n={row['n']} samples={row['samples']}: sd {row['sd']:.2f}", file=sys.stderr)
for name, s in stats.items():
    print(
        f"any {name}: center {s['mean']:.2f} sd {s['sd']:.2f} range {s['min']:.1f}..{s['max']:.1f}"
        f" skew {s['skew']:.2f} outside {s['hist']['below']}/{s['hist']['above']}",
        file=sys.stderr,
    )
print(
    f"any population: mean {anything['population']['mean']:.2f} sd {anything['population']['sd']:.2f}"
    f" skew {anything['population']['skew']:.2f} above300 {anything['population']['hist']['above']}",
    file=sys.stderr,
)
