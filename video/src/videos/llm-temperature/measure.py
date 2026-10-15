"""Computes every probability and sample the LlmTemperature video shows.

    python3 -I src/videos/llm-temperature/measure.py > src/videos/llm-temperature/measurements.json

The tokens and scores are the lesson's own example
(content/courses/how-llms-work/sampling.mdx, "Softmax turns scores into
probabilities"): " cat", " dog", " bird", " rock" with logits
[3.2, 2.1, 1.5, -0.4]. They are illustrative scores, not a real model's, and
the video labels them that way.

What it computes, with the lesson's own softmax (subtract the max, exp,
normalize) and numpy:

  - the probabilities at temperatures 0.2, 0.7, 1.0 and 1.5, and the greedy
    limit at 0 (checked against T = 0.01, which already rounds to one-hot);
  - a dense grid from T = 0.01 to 2.00, so the bars the video animates between
    those stops are drawn from computed values, never eased by hand;
  - twenty seeded draws at each temperature with `Generator.choice`. Every row
    uses a fresh generator from the same seed, so every row consumes the same
    twenty uniform numbers: numpy's choice with `p` is inverse-CDF sampling
    (`cdf.searchsorted(u, side="right")`), which the script re-does by hand
    and asserts equal. The seed is not hand-picked for a pretty row: it is
    the one of seeds 0 to 99 whose counts sit closest to the expected counts
    (smallest sum of squared differences over expected-plus-a-half), so the
    sample shown is the most typical one rather than a lucky one;
  - top-p with p = 0.9 after each temperature, the lesson's `top_p` (sort,
    accumulate until the total reaches p, renormalize).
"""

import json
import sys

import numpy as np

TOKENS = ["cat", "dog", "bird", "rock"]
LOGITS = np.array([3.2, 2.1, 1.5, -0.4])
TEMPS = [0.2, 0.7, 1.0, 1.5]
DRAWS = 20
TOP_P = 0.9
SEEDS = range(100)


def sig(v, digits=6):
    """A float kept to `digits` significant figures, so a sliver stays a sliver."""
    return float(f"{float(v):.{digits}g}")


def softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()


def probs_at(t):
    """The lesson's sampling distribution at temperature t; t = 0 is greedy."""
    if t == 0:
        out = np.zeros_like(LOGITS)
        out[np.argmax(LOGITS)] = 1.0
        return out
    return softmax(LOGITS / t)


def top_p(probs, p=TOP_P):
    """The lesson's top_p: kept indices in order, and the renormalized probs."""
    order = np.argsort(probs)[::-1]
    cumulative = 0.0
    kept = []
    running = []
    for i in order:
        kept.append(int(i))
        cumulative += probs[i]
        running.append(float(cumulative))
        if cumulative >= p:
            break
    mask = np.zeros_like(probs)
    mask[kept] = probs[kept]
    return kept, running, mask / mask.sum()


def draws(seed, t):
    rng = np.random.default_rng(seed)
    picks = rng.choice(len(TOKENS), size=DRAWS, p=probs_at(t))
    # The same thing by hand: one uniform per draw, looked up in the CDF.
    u = np.random.default_rng(seed).random(DRAWS)
    cdf = np.cumsum(probs_at(t))
    cdf /= cdf[-1]
    assert (cdf.searchsorted(u, side="right") == picks).all(), (seed, t)
    return picks, u


def typicality(seed):
    """How far a seed's counts sit from the expected counts, over all rows."""
    score = 0.0
    for t in TEMPS:
        picks, _ = draws(seed, t)
        counts = np.bincount(picks, minlength=len(TOKENS))
        expected = DRAWS * probs_at(t)
        score += float((((counts - expected) ** 2) / (expected + 0.5)).sum())
    return score


seed = min(SEEDS, key=typicality)

# The greedy limit: a vanishing temperature already puts all mass on the top.
assert np.allclose(softmax(LOGITS / 0.01), probs_at(0)), "T -> 0 is not argmax"
# Dividing by a positive temperature never reorders the tokens.
for t in np.arange(0.01, 2.0001, 0.01):
    assert (np.argsort(-probs_at(t)) == np.argsort(-LOGITS)).all()

# Every row reads the same uniforms, so as T rises a draw can only stay put or
# move down the ranking: the top-k mass falls with T for every k.
for t0, t1 in zip(TEMPS, TEMPS[1:]):
    assert (draws(seed, t1)[0] >= draws(seed, t0)[0]).all(), (t0, t1)
cdfs = [np.cumsum(probs_at(round(float(t), 2)))[:-1] for t in np.arange(0.01, 2.0001, 0.01)]
assert all((b <= a + 1e-12).all() for a, b in zip(cdfs, cdfs[1:])), "top-k mass rose with T"

rows = []
for t in TEMPS:
    p = probs_at(t)
    picks, u = draws(seed, t)
    kept, running, renorm = top_p(p)
    rows.append(
        {
            "t": t,
            "probs": [sig(v) for v in p],
            "scaled": [round(float(v), 4) for v in LOGITS / t],
            "draws": [int(i) for i in picks],
            "counts": [int(c) for c in np.bincount(picks, minlength=len(TOKENS))],
            "topP": {
                "kept": kept,
                "running": [round(v, 6) for v in running],
                "renormalized": [sig(v) for v in renorm],
            },
        }
    )

grid = [
    {"t": round(float(t), 2), "probs": [sig(v) for v in probs_at(round(float(t), 2))]}
    for t in np.arange(0.01, 2.0001, 0.01)
]

one = softmax(LOGITS)
out = {
    "source": "content/courses/how-llms-work/sampling.mdx",
    "numpy": np.__version__,
    "tokens": TOKENS,
    "logits": LOGITS.tolist(),
    "draws": DRAWS,
    "topP": TOP_P,
    "seed": seed,
    "seedRule": "of seeds 0 to 99, the one whose counts sit closest to the expected counts",
    "uniforms": [round(float(v), 6) for v in draws(seed, 1.0)[1]],
    "greedy": probs_at(0).tolist(),
    "rows": rows,
    "grid": grid,
    # The lesson's own line: "A 1.1 logit gap became a ... x probability ratio."
    "catOverDog": round(float(one[0] / one[1]), 4),
}

json.dump(out, sys.stdout, indent=1)
sys.stdout.write("\n")

# What the narration quotes, on stderr so the JSON stays clean.
log = sys.stderr
print(f"seed {seed} (typicality {typicality(seed):.3f})", file=log)
for r in rows:
    pct = "  ".join(f"{k}={v * 100:6.2f}%" for k, v in zip(TOKENS, r["probs"]))
    picks = "".join(TOKENS[i][0] for i in r["draws"])
    kept = [TOKENS[i] for i in r["topP"]["kept"]]
    print(f"T={r['t']:<4} {pct}  draws {picks} counts {r['counts']}  top-p keeps {kept}", file=log)
    print(f"        scaled {r['scaled']}  running {r['topP']['running']}  renorm {r['topP']['renormalized']}", file=log)
print(f"cat/dog at T=1: {out['catOverDog']}", file=log)
