"""Every number SurvivorshipBias puts on screen or in its narration.

Run from anywhere:

    python3 src/videos/survivorship-bias/measure.py

It writes measurements.json beside itself, which data.ts reads. Two parts:

1. Wald's worked example, from his 1943 Statistical Research Group memoranda
   "A Method of Estimating Plane Vulnerability Based on Damage of Survivors"
   (Center for Naval Analyses reprint CRC 432, July 1980, Part V, pp. 62-65;
   the example Mangel and Samaniego, JASA 79(386), 1984, walk through). The
   inputs below are copied from the memo; the outputs are recomputed here with
   his own formulas and checked against the values he printed.

2. The mutual-fund simulation from
   content/courses/statistics-for-data-science-python/sampling-and-bias.mdx,
   "Survivorship bias: the most famous trap", run exactly as the lesson runs
   it (numpy default_rng(3), 5000 funds, closed at or below -4%).
"""

import json
from pathlib import Path

import numpy as np

# ── 1. Wald's example (memo Part V) ─────────────────────────────────────────

N = 400  # planes on the mission
# Returning planes by number of hits received: A_0 .. A_4.
A = [240, 68, 29, 12, 10]
RETURNED = sum(A)
assert RETURNED == 359, RETURNED

# The plane divided into parts, with the area each presents to the attack,
# in square feet (memo p. 63). Wald assumes a hit lands on a part with
# probability equal to its share of the area.
PARTS = [
    ("engines", "Engines", 35),
    ("fuselage", "Fuselage", 45),
    ("fuel", "Fuel system", 20),
    ("other", "Everything else", 30),
]
# Hits counted on each part of the returning planes (memo p. 64).
HITS = {"engines": 39, "fuselage": 78, "fuel": 31, "other": 54}
TOTAL_HITS = sum(HITS.values())
# The memo's check: total hits equals A_1 + 2 A_2 + 3 A_3 + 4 A_4.
assert TOTAL_HITS == sum(i * a for i, a in enumerate(A)) == 202

a = [x / N for x in A]


def basic(q: float) -> float:
    """Wald's basic equation with q_1 = q_2 = ... = q: sum a_i / q^i - (1 - a_0)."""
    return sum(a[i] / q**i for i in range(1, len(a))) - (1 - a[0])


# basic() falls monotonically on (0, 1], so bisect for its root.
lo, hi = 0.5, 1.0
for _ in range(200):
    mid = (lo + hi) / 2
    if basic(mid) > 0:
        lo = mid
    else:
        hi = mid
q0_exact = (lo + hi) / 2
# The memo prints q0 = .850, Wald's hand solution; the exact root is .847.
# Both round to .85, and the part-by-part table below is built, as the memo
# builds it, on his printed .850, so the video quotes his numbers.
assert round(q0_exact, 2) == 0.85, q0_exact
q0 = 0.850

total_area = sum(area for _, _, area in PARTS)
# The memo divides its three-place ratios, Y(i) and delta(i), as printed on
# pp. 63-64 (it prints 31/202 = .1535 as .154).
Y_PRINTED = {"engines": 0.269, "fuselage": 0.346, "fuel": 0.154, "other": 0.231}
D_PRINTED = {"engines": 0.193, "fuselage": 0.386, "fuel": 0.154, "other": 0.267}
parts = []
for key, name, area in PARTS:
    y = area / total_area  # Y(i): chance a hit lands here
    d = HITS[key] / TOTAL_HITS  # delta(i): share of the survivors' hits
    assert abs(y - Y_PRINTED[key]) < 0.001 and abs(d - D_PRINTED[key]) < 0.001, key
    q = D_PRINTED[key] / Y_PRINTED[key] * q0
    parts.append(
        {
            "key": key,
            "name": name,
            "area": area,
            "areaShare": y,
            "hits": HITS[key],
            "hitShare": d,
            "surviveOneHit": q,
            "downedByOneHit": 1 - q,
        }
    )

# The memo's printed results (p. 65): probability of surviving a single hit.
PRINTED = {"engines": 0.61, "fuselage": 0.95, "fuel": 0.85, "other": 0.98}
for p in parts:
    assert round(p["surviveOneHit"], 2) == PRINTED[p["key"]], p

wald = {
    "source": "Wald 1943, SRG memoranda (CNA reprint CRC 432, 1980), Part V, pp. 62-65",
    "planes": N,
    "returned": RETURNED,
    "lost": N - RETURNED,
    "returnedByHits": A,
    "totalHits": TOTAL_HITS,
    "totalArea": total_area,
    "q0": q0,
    "q0Exact": q0_exact,
    # With the exact root instead: engines .39, fuselage .055, fuel .15, other .02.
    "downedWithExactRoot": {p["key"]: 1 - p["surviveOneHit"] / q0 * q0_exact for p in parts},
    "parts": parts,
}

# ── 2. The lesson's mutual funds ────────────────────────────────────────────

rng = np.random.default_rng(3)
returns = rng.normal(loc=6.0, scale=8.0, size=5000)  # percent
CLOSED_AT = -4.0
survivors = returns[returns > CLOSED_AT]

true_avg = float(returns.mean())
survivor_avg = float(survivors.mean())

# What the lesson's CodeBlock prints, formatted the way it formats them.
printed = [
    f"True average across ALL 5000 funds:        {true_avg:5.2f}%",
    f"Average across SURVIVING funds only:        {survivor_avg:5.2f}%",
    f"Survivorship inflation:                     {survivor_avg - true_avg:+.2f} points",
    f"Funds that 'disappeared' from the data: {5000 - len(survivors)}",
]

# Histogram in one-point bins, with each bin's sum, so data.ts can recompute
# the survivors' mean for any cutoff on a bin edge (the video sweeps one).
LO, HI = -24, 40
assert returns.min() >= LO and returns.max() < HI
edges = np.arange(LO, HI + 1)
counts, _ = np.histogram(returns, bins=edges)
sums = [float(returns[(returns >= e) & (returns < e + 1)].sum()) for e in edges[:-1]]
assert int(counts.sum()) == 5000
# -4 is a bin edge, so "above the cutoff" is a whole number of bins.
k = int(CLOSED_AT - LO)
assert int(counts[k:].sum()) == len(survivors)
assert abs(sum(sums[k:]) / counts[k:].sum() - survivor_avg) < 1e-9

funds = {
    "source": "sampling-and-bias.mdx: default_rng(3), normal(6, 8, 5000), closed at -4",
    "n": 5000,
    "closedAt": CLOSED_AT,
    "trueAvg": true_avg,
    "survivorAvg": survivor_avg,
    "inflation": survivor_avg - true_avg,
    "closed": int(5000 - len(survivors)),
    "open": int(len(survivors)),
    "min": float(returns.min()),
    "max": float(returns.max()),
    "binLo": LO,
    "binWidth": 1,
    "counts": [int(c) for c in counts],
    "sums": sums,
    "printed": printed,
}

out = {"numpy": np.__version__, "wald": wald, "funds": funds}
path = Path(__file__).with_name("measurements.json")
path.write_text(json.dumps(out, indent=1) + "\n")

print(f"Wald: {N} planes, {RETURNED} back, q0 = {q0:.3f} as printed (exact root {q0_exact:.4f})")
for p in parts:
    print(
        f"  {p['name']:<16} area {p['areaShare']:.3f}  hits {p['hitShare']:.3f}"
        f"  survive one hit {p['surviveOneHit']:.3f}  downed {p['downedByOneHit']:.3f}"
    )
print("Funds:")
for line in printed:
    print(" ", line)
print(f"  open {len(survivors)}, min {returns.min():.2f}, max {returns.max():.2f}")
print(f"wrote {path}")
