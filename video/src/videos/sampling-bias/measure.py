"""Measures every number the SamplingBias video shows or says.

    python3 -I src/videos/sampling-bias/measure.py > src/videos/sampling-bias/measurements.json

The setting is the lesson's own (content/courses/statistics-for-data-science-
python/sampling-and-bias.mdx): customer satisfaction scores drawn from
Normal(70, 12) and clipped to 0..100, and a convenience scheme that weights
everyone above 75 by 1.1 and everyone else by 0.1, so a happy customer is
eleven times as likely to be picked ("happy folks ~10x likelier" in the
lesson's comment).

One population runs through the whole video: the lesson's first code block,
200,000 scores from numpy's default_rng(42), with that block's own random and
convenience samples of 500. Everything after it is drawn from the same
population with seeded generators of its own:

- "repeat": 100 samples of 500 by each method (the first of each is the
  block's own), the averages Fig. 2 piles up.
- "sweep": 400 samples by each method at 50, 200, 1,000, 5,000 and 20,000,
  the lesson's sizes up to 20,000. The lesson's second block goes on to
  100,000, out of a population of 500,000. Out of this population of 200,000
  that would be half the customers: weighted sampling without replacement then
  runs out of happy ones and the convenience estimate sags towards the truth
  for a reason that has nothing to do with sample size (it is already 0.25
  points lower at 20,000). The video stops at 20,000, one customer in ten.

The lesson's three code blocks are also run exactly as written, under
"lesson", so their printed numbers can be checked against the outputs the
site records for them (lib/generated/block-outputs.json): 69.97 / 69.64 /
80.52, the line chart's estimates, and the center/spread/bias table.

The 1936 figures are not measured; they are the published numbers, with their
sources, and only the shares are computed here.
"""

import json
import platform
import sys

import numpy as np

LESSON = "content/courses/statistics-for-data-science-python/sampling-and-bias.mdx"
THRESHOLD = 75
HAPPY_W = 1.1
OTHER_W = 0.1


def r2(x):
    return round(float(x), 2)


def r4(x):
    return round(float(x), 4)


def conv_weights(population):
    w = (population > THRESHOLD).astype(float) + OTHER_W
    return w / w.sum()


# ── The lesson's first block, exactly ────────────────────────────────────────
rng = np.random.default_rng(42)
population = rng.normal(loc=70, scale=12, size=200_000).clip(0, 100)
true_mean = population.mean()
random_sample = rng.choice(population, size=500, replace=False)
weights = conv_weights(population)
convenience_sample = rng.choice(population, size=500, replace=False, p=weights)

# Histogram in 2-point bins over [0, 100]; a clipped 100 goes in the last bin.
edges = np.arange(0, 102, 2)
hist, _ = np.histogram(population, bins=edges)

# ── Draw again: 100 samples of 500 by each method ────────────────────────────
rep_rng = np.random.default_rng(500)
REPEAT = 100
rep_random = [random_sample.mean()]
rep_conv = [convenience_sample.mean()]
for _ in range(REPEAT - 1):
    rep_random.append(rep_rng.choice(population, size=500, replace=False).mean())
    rep_conv.append(rep_rng.choice(population, size=500, replace=False, p=weights).mean())
rep_random = np.array(rep_random)
rep_conv = np.array(rep_conv)

# ── Grow the sample: 400 samples by each method at each size ─────────────────
sweep_rng = np.random.default_rng(2026)
SIZES = [50, 200, 1_000, 5_000, 20_000]
SWEEP_REPS = 400
sweep = []
for n in SIZES:
    rnd = np.array([sweep_rng.choice(population, size=n, replace=False).mean() for _ in range(SWEEP_REPS)])
    cnv = np.array(
        [sweep_rng.choice(population, size=n, replace=False, p=weights).mean() for _ in range(SWEEP_REPS)]
    )
    row = {"n": n}
    for key, means in (("random", rnd), ("convenience", cnv)):
        row[key] = {
            "center": r4(means.mean()),
            "spread": r4(means.std()),
            "bias": r4(means.mean() - true_mean),
            "lo": r4(np.quantile(means, 0.025)),
            "hi": r4(np.quantile(means, 0.975)),
            "min": r4(means.min()),
            "max": r4(means.max()),
            "means": [r4(m) for m in means],
        }
    sweep.append(row)


# ── The lesson's second and third blocks, exactly ────────────────────────────
def lesson_block_two():
    rng = np.random.default_rng(7)
    population = rng.normal(70, 12, size=500_000).clip(0, 100)
    true_mean = population.mean()
    weights = (population > 75).astype(float) + 0.1
    weights /= weights.sum()
    rows = []
    for n in [50, 200, 1_000, 5_000, 20_000, 100_000]:
        rand = rng.choice(population, size=n, replace=False).mean()
        conv = rng.choice(population, size=n, replace=False, p=weights).mean()
        rows.append({"n": n, "random": r2(rand), "convenience": r2(conv)})
    return {"trueMean": r2(true_mean), "rows": rows}


def lesson_block_three():
    rng = np.random.default_rng(0)
    population = rng.normal(70, 12, size=300_000).clip(0, 100)
    true_mean = population.mean()
    weights = (population > 75).astype(float) + 0.1
    weights /= weights.sum()

    def repeat(method, n, reps=400):
        out = []
        for _ in range(reps):
            if method == "random":
                out.append(rng.choice(population, size=n, replace=False).mean())
            else:
                out.append(rng.choice(population, size=n, replace=False, p=weights).mean())
        return np.array(out)

    rows = []
    for n in [200, 5000]:
        r = repeat("random", n)
        c = repeat("convenience", n)
        rows.append(
            {
                "n": n,
                "random": {"center": r2(r.mean()), "spread": r2(r.std()), "bias": r2(r.mean() - true_mean)},
                "convenience": {"center": r2(c.mean()), "spread": r2(c.std()), "bias": r2(c.mean() - true_mean)},
            }
        )
    return {"trueMean": r2(true_mean), "rows": rows}


# ── 1936 ─────────────────────────────────────────────────────────────────────
# Literary Digest, 31 October 1936, "Landon, 1,293,669; Roosevelt, 972,897:
# Final Returns in The Digest's Poll of Ten Million Voters".
DIGEST_LANDON = 1_293_669
DIGEST_ROOSEVELT = 972_897
# Lusinchi 2012, p. 26: "in the neighborhood of 10 million" ballots mailed;
# "nearly 2.4 million were returned, for a response rate of roughly 24 percent".
DIGEST_MAILED = 10_000_000
DIGEST_RETURNED = 2_400_000
# Gallup's final forecast of Roosevelt's share of the two-party vote, 55.7%
# (Gallup 1972, The Gallup Poll: Public Opinion 1935-1971, p. 215; quoted in
# Lusinchi 2012, p. 44).
GALLUP_ROOSEVELT = 55.7
# The popular vote, as listed by Wikipedia's "1936 United States presidential
# election" (sources differ by a few thousand votes; the share does not move).
VOTES_ROOSEVELT = 27_747_636
VOTES_LANDON = 16_679_543
STATES_ROOSEVELT = 46
STATES_TOTAL = 48

history = {
    "digestMailed": DIGEST_MAILED,
    "digestReturned": DIGEST_RETURNED,
    "responseRate": r4(DIGEST_RETURNED / DIGEST_MAILED),
    "digestLandon": DIGEST_LANDON,
    "digestRoosevelt": DIGEST_ROOSEVELT,
    "digestRooseveltShare": round(100 * DIGEST_ROOSEVELT / (DIGEST_ROOSEVELT + DIGEST_LANDON), 1),
    "digestLandonShare": round(100 * DIGEST_LANDON / (DIGEST_ROOSEVELT + DIGEST_LANDON), 1),
    "gallupRooseveltShare": GALLUP_ROOSEVELT,
    "votesRoosevelt": VOTES_ROOSEVELT,
    "votesLandon": VOTES_LANDON,
    "resultRooseveltShare": round(100 * VOTES_ROOSEVELT / (VOTES_ROOSEVELT + VOTES_LANDON), 1),
    "statesRoosevelt": STATES_ROOSEVELT,
    "statesTotal": STATES_TOTAL,
}

out = {
    "meta": {
        "lesson": LESSON,
        "python": platform.python_version(),
        "numpy": np.__version__,
        "threshold": THRESHOLD,
        "happyWeight": HAPPY_W,
        "otherWeight": OTHER_W,
        "likelier": round(HAPPY_W / OTHER_W, 6),
    },
    "population": {
        "size": int(population.size),
        "trueMean": r4(true_mean),
        "sd": r4(population.std()),
        "shareAbove": r4((population > THRESHOLD).mean()),
        "atHundred": int((population == 100).sum()),
        "binWidth": 2,
        "hist": [int(c) for c in hist],
    },
    "first": {
        "n": 500,
        "random": {
            "mean": r4(random_sample.mean()),
            "shareAbove": r4((random_sample > THRESHOLD).mean()),
            "values": [r2(v) for v in random_sample],
        },
        "convenience": {
            "mean": r4(convenience_sample.mean()),
            "shareAbove": r4((convenience_sample > THRESHOLD).mean()),
            "values": [r2(v) for v in convenience_sample],
        },
    },
    "repeat": {
        "n": 500,
        "random": [r4(m) for m in rep_random],
        "convenience": [r4(m) for m in rep_conv],
        "randomMaxMiss": r4(np.abs(rep_random - true_mean).max()),
        "randomAbove": int((rep_random > true_mean).sum()),
        "randomBelow": int((rep_random < true_mean).sum()),
        "convenienceMin": r4(rep_conv.min()),
        "convenienceMax": r4(rep_conv.max()),
    },
    "sweep": sweep,
    "lesson": {
        "blockOne": {
            "trueMean": r2(true_mean),
            "random": r2(random_sample.mean()),
            "convenience": r2(convenience_sample.mean()),
        },
        "blockTwo": lesson_block_two(),
        "blockThree": lesson_block_three(),
    },
    "history": history,
}

json.dump(out, sys.stdout, indent=1)
sys.stdout.write("\n")
