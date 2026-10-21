"""Measures every number and every bar, dot and curve the Distributions video shows.

    python3 src/videos/distributions/measure.py > src/videos/distributions/measurements.json

Each part re-runs one of the lesson code blocks the video is built from, with
its own seed and its own calls in its own order, so what it prints is what the
page prints. The lessons are in content/courses/statistics-for-data-science-python/:

- "bernoulli" is discrete-distributions.mdx, "Bernoulli: a single yes/no
  trial": a visitor converts with p = 0.3, and its ten simulated visitors
  (random_state=0).
- "binomial" is "Binomial: counting successes in n independent trials":
  200 visitors at p = 0.03, its pmf over 0..20 (the "Plotting a binomial PMF"
  block) and its sf(9), "P(10 or more convert)".
- "poisson" is "Worked example: support tickets per hour" (lambda = 3, sf(7)
  and its "1 hour out of 84") and "Simulation as a sanity check" (seed 0,
  100,000 simulated hours). The strip of 24 hours on screen is one simulated
  day picked as typical (see "dayHours"), so it doesn't make a 7 look routine
  right before 8 or more is called a 1-in-84 spike.
- "geometric" is "Geometric: how many trials until the first success?":
  p = 0.2 per sales call.
- "exponential" is continuous-distributions.mdx, "Exponential: waiting time
  until the next event": a mean wait of 5 minutes and P(2 < wait < 8).
- "uniform" is "Uniform: every value equally likely", Uniform(0, 10) and its
  P(3 < X < 7), and "Misconception #1": Uniform(0, 0.5) has density 2.
- "quantile" is "Quantiles: inverting the question with ppf": response times,
  exponential with mean 200 ms, and their 95th percentile.
- "penguins" is the-normal-distribution.mdx, "A real measurement that's close
  to normal": Adelie flipper lengths from the site's palmer-penguins.csv.
- "rule" is "The 68-95-99.7 empirical rule" (the standard normal's cdf(k) -
  cdf(-k)) and its exam scores, mean 100 and sd 15.
- "z" is "Standardization and z-scores": a score of 130 on Normal(100, 15).
- "income" is "When the data is NOT normal" (seed 0): 5,000 lognormal
  incomes and the normal fitted to their mean and SD.
- "fit" is working-with-distributions.mdx, "Fitting a distribution to data"
  (seed 42): 500 values from Normal(72, 6), norm.fit, sf(85) and ppf(0.95).
- "qq" is "Q-Q plot intuition" (seed 7): 400 normal and 400 lognormal values,
  each against a normal fitted to it.
- "range" is "Don't extrapolate a fitted model past your data" (seed 0): 400
  values from Normal(80, 12), the fitted sf(100) and sf(200).

The histograms' bins are the video's own (the lessons leave them to plotly).
Two outlines are the video's own illustration rather than a lesson's output,
and are labelled as such on screen: "clumped" under "binomial" and "poisson",
a count with the same mean and three times the variance (a negative
binomial), which is what "real counts vary far more than the model says"
looks like.
Printed checks (the lessons' own output lines) go to stderr.
"""

import json
import math
import platform
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import scipy
from scipy import stats

ROOT = Path(__file__).resolve().parents[4]


def r(x, d=4):
    return round(float(x), d)


def rs(values, d=3):
    return [round(float(v), d) for v in values]


def say(*args):
    print(*args, file=sys.stderr)


def clumped(mean, var):
    """The negative binomial with this mean and a larger variance: a count
    whose events clump, for drawing beside a model that assumes they don't."""
    return stats.nbinom(n=mean**2 / (var - mean), p=mean / var)


def hist(values, lo, width, bins):
    """Counts in [lo + i*width, lo + (i+1)*width), the last bin closed."""
    edges = lo + width * np.arange(bins + 1)
    counts, _ = np.histogram(values, bins=edges)
    return [int(c) for c in counts]


out = {
    "env": {
        "python": platform.python_version(),
        "numpy": np.__version__,
        "scipy": scipy.__version__,
        "pandas": pd.__version__,
    }
}

# ── Part 1. Bernoulli (discrete-distributions) ──────────────────────────────
p = 0.3
b = stats.bernoulli(p)
say("P(convert)   = P(X=1) =", b.pmf(1))
say("P(no convert)= P(X=0) =", b.pmf(0))
say("mean (= p)            =", b.mean())
say("variance (= p(1-p))   =", round(float(b.var()), 4))
sample = b.rvs(size=10, random_state=0)
say("10 simulated visitors:", sample)
out["bernoulli"] = {
    "p": p,
    "pmf": [r(b.pmf(0)), r(b.pmf(1))],
    "mean": r(b.mean()),
    "var": r(b.var()),
    "sample": [int(v) for v in sample],
}

# ── Part 1. Binomial(200, 0.03) ─────────────────────────────────────────────
n, p = 200, 0.03
d = stats.binom(n, p)
say(f"Expected conversions (np)     = {d.mean()}")
say(f"Std dev of conversions        = {d.std():.2f}")
say(f"P(exactly 6 convert)          = {d.pmf(6):.4f}")
say(f"P(at most 4 convert)          = {d.cdf(4):.4f}")
say(f"P(10 or more convert) sf(9)   = {d.sf(9):.4f}")
k = np.arange(0, 21)
pmf = d.pmf(k)
say("Most likely outcomes cluster around the mean of", d.mean())
# The lesson's callout on .sf: "sanity-check that d.cdf(k) + d.sf(k) is *not* 1".
say(f"  check: cdf(4) + sf(4) = {d.cdf(4) + d.sf(4):.6f}; cdf(4) + sf(3) = {d.cdf(4) + d.sf(3):.6f}")
out["binomial"] = {
    "n": n,
    "p": p,
    "k": [int(v) for v in k],
    "pmf": rs(pmf, 5),
    "mean": r(d.mean()),
    "sd": r(d.std()),
    "mode": int(k[np.argmax(pmf)]),
    "pmfMode": r(pmf.max()),
    "atLeast": 10,
    "sfAtLeast": r(d.sf(9)),
    # Same mean, three times the variance: the count if visitors clump.
    "clumped": rs(clumped(d.mean(), 3 * d.var()).pmf(k), 5),
}

# ── Part 1. Poisson: support tickets per hour ───────────────────────────────
lam = 3
d = stats.poisson(mu=lam)
say(f"Expected tickets/hour (lambda) = {d.mean()}")
say(f"Variance (= lambda)            = {d.var()}")
say(f"P(exactly 3 tickets)           = {d.pmf(3):.4f}")
say(f"P(0 tickets this hour)         = {d.pmf(0):.4f}")
p_spike = d.sf(7)
say(f"P(8 or more tickets) = {p_spike:.4f}  (~{p_spike * 100:.1f}% of hours)")
say("So a spike that big happens in roughly 1 hour out of 84.")
# "Simulation as a sanity check", its own seed.
rng = np.random.default_rng(0)
analytic = d.sf(7)
hours = d.rvs(size=100_000, random_state=rng)
empirical = np.mean(hours >= 8)
say(f"Analytic  P(X >= 8) = {analytic:.4f}")
say(f"Simulated P(X >= 8) = {empirical:.4f}")
kp = np.arange(0, 13)
# One day of the simulation to draw: the first 24 consecutive hours, on a day
# boundary, whose counts sit close to the pmf (a chi-square distance under 3
# over 0 to 7 and 8 or more). The first day held three hours of 7, an hour
# the pmf gives 2.2%, right beside the claim that 8 is rare.
expected = np.append(d.pmf(np.arange(0, 8)), d.sf(7)) * 24
day = 0
while True:
    w = hours[24 * day : 24 * day + 24]
    seen = np.append(np.bincount(np.minimum(w, 8), minlength=9)[:8], np.sum(w >= 8))
    if np.sum((seen - expected) ** 2 / expected) < 3:
        break
    day += 1
say(f"Typical day drawn: hours {24 * day} to {24 * day + 23}, counts {list(map(int, w))}")
out["poisson"] = {
    "lambda": lam,
    "k": [int(v) for v in kp],
    "pmf": rs(d.pmf(kp), 5),
    "mean": r(d.mean()),
    "var": r(d.var()),
    "atLeast": 8,
    "sfAtLeast": r(p_spike, 5),
    "oneIn": int(round(1 / p_spike)),
    "hours": int(hours.size),
    "simulated": [r(np.mean(hours == v), 5) for v in kp],
    "simulatedAtLeast": r(empirical, 5),
    "dayFrom": 24 * day,
    "dayHours": [int(v) for v in w],
    # Same mean, three times the variance: the count if tickets clump.
    "clumped": rs(clumped(lam, 3 * d.var()).pmf(kp), 5),
}

# ── Part 1. Geometric: calls until the first sale ───────────────────────────
p = 0.2
d = stats.geom(p)
say(f"Expected calls until first sale (1/p) = {d.mean()}")
say(f"P(first sale on the 1st call)         = {d.pmf(1):.4f}")
say(f"P(first sale on the 5th call)         = {d.pmf(5):.4f}")
say(f"P(more than 10 calls needed)          = {d.sf(10):.4f}")
kg = np.arange(1, 21)
out["geometric"] = {
    "p": p,
    "k": [int(v) for v in kg],
    "pmf": rs(d.pmf(kg), 5),
    "mean": r(d.mean()),
    "median": r(d.median()),
    "moreThan": 10,
    "sfMoreThan": r(d.sf(10)),
}

# ── Part 2. Exponential: a mean wait of 5 minutes ───────────────────────────
d = stats.expon(scale=5)
say(f"Mean wait               = {d.mean()} min")
say(f"P(wait < 3 min)         = {d.cdf(3):.4f}")
say(f"P(wait > 10 min) sf(10) = {d.sf(10):.4f}")
say(f"P(2 < wait < 8 min)     = {d.cdf(8) - d.cdf(2):.4f}")
out["exponential"] = {
    "scale": 5,
    "a": 2,
    "b": 8,
    "cdfA": r(d.cdf(2)),
    "cdfB": r(d.cdf(8)),
    "between": r(d.cdf(8) - d.cdf(2)),
    "pdf0": r(d.pdf(0)),
    "point": 5,
}

# ── Part 2. Uniform: area is width times height ─────────────────────────────
d = stats.uniform(loc=0, scale=10)
say("PDF height everywhere on [0,10] =", d.pdf(5))
say("P(3 < X < 7) = cdf(7) - cdf(3)  =", round(float(d.cdf(7) - d.cdf(3)), 4))
narrow = stats.uniform(loc=0, scale=0.5)
say("Uniform(0, 0.5): density", narrow.pdf(0.25), "and area", narrow.pdf(0.25) * 0.5)
out["uniform"] = {
    "loc": 0,
    "scale": 10,
    "pdf": r(d.pdf(5)),
    "a": 3,
    "b": 7,
    "between": r(d.cdf(7) - d.cdf(3)),
    "narrowScale": 0.5,
    "narrowPdf": r(narrow.pdf(0.25)),
}

# ── Part 2. Quantiles: response times with a mean of 200 ms ─────────────────
d = stats.expon(scale=200)
p95 = d.ppf(0.95)
say(f"95th percentile response time = {p95:.1f} ms")
say(f"Check: cdf(p95) = {d.cdf(p95):.4f}")
out["quantile"] = {"scale": 200, "p": 0.95, "ppf": r(p95, 3)}

# ── Part 3. Adelie flipper lengths (the-normal-distribution) ────────────────
penguins = pd.read_csv(ROOT / ".dataset-cache" / "palmer-penguins.csv")
flippers = penguins.loc[penguins["species"] == "Adelie", "flipper_length_mm"].dropna()
mu, sigma = flippers.mean(), flippers.std()
say(f"mean = {mu:.1f} mm,  std = {sigma:.1f} mm")
out["penguins"] = {
    "n": int(flippers.size),
    "values": [int(v) if float(v).is_integer() else r(v, 1) for v in flippers],
    "mean": r(mu),
    "sd": r(sigma),
    "min": r(flippers.min(), 1),
    "max": r(flippers.max(), 1),
    # Two-millimetre bins from 170 to 212.
    "lo": 170,
    "bin": 2,
    "counts": hist(flippers, 170, 2, 21),
}

# ── Part 3. The empirical rule, and exam scores ─────────────────────────────
z = stats.norm(loc=0, scale=1)
within = []
for kk in (1, 2, 3):
    inside = z.cdf(kk) - z.cdf(-kk)
    say(f"Within {kk} sigma: {inside * 100:5.2f}% of values")
    within.append(r(inside * 100, 2))
out["rule"] = {
    "within": within,
    "mu": 100,
    "sigma": 15,
    # "a score of 145 (3σ out) is genuinely rare": the share above it.
    "rare": 145,
    "aboveRare": r(stats.norm(100, 15).sf(145) * 100, 2),
}

# ── Part 3. A z-score ───────────────────────────────────────────────────────
mu, sigma, x = 100, 15, 130
zz = (x - mu) / sigma
say(f"z-score of {x}: {zz:.2f}  (it's {zz:.0f} SDs above the mean)")
pct = stats.norm().cdf(zz)
say(f"Percentile via z-score:    {pct * 100:.1f}%")
out["z"] = {"mu": mu, "sigma": sigma, "x": x, "z": zz, "below": r(pct * 100, 2)}

# ── Part 3. Skewed incomes and a normal forced onto them (seed 0) ───────────
rng = np.random.default_rng(0)
income = rng.lognormal(mean=10.5, sigma=0.6, size=5000)
say(f"mean income   = {income.mean():,.0f}")
say(f"median income = {np.median(income):,.0f}  (well below the mean -> right skew)")
mu, sigma = income.mean(), income.std()
fitted = stats.norm(loc=mu, scale=sigma)
say(f"Fitted normal says P(income < 0) = {fitted.cdf(0):.3f}, impossible for income!")
# norm.fit on the same incomes: the maximum-likelihood normal is that same
# mean and (population) SD, numbers back for the wrong shape.
fit_loc, fit_scale = stats.norm.fit(income)
say(f"  norm.fit(income) = ({fit_loc:,.0f}, {fit_scale:,.0f})")
out["income"] = {
    "n": int(income.size),
    "mean": r(mu, 0),
    "median": r(np.median(income), 0),
    "sd": r(sigma, 0),
    "max": r(income.max(), 0),
    "belowZero": r(fitted.cdf(0) * 100, 2),
    "fitLoc": r(fit_loc, 0),
    "fitScale": r(fit_scale, 0),
    # Five-thousand-dollar bins from 0 to 150,000, and how many lie beyond.
    "lo": 0,
    "bin": 5000,
    "counts": hist(income, 0, 5000, 30),
    "beyond": int(np.sum(income >= 150_000)),
}

# ── Part 4. Fitting a normal (working-with-distributions, seed 42) ──────────
rng = np.random.default_rng(42)
sample = rng.normal(loc=72, scale=6, size=500)
loc, scale = stats.norm.fit(sample)
say(f"Fitted loc (mean) = {loc:.3f}   (sample mean = {sample.mean():.3f})")
say(f"Fitted scale (sd) = {scale:.3f} (sample std  = {sample.std():.3f})")
fitted = stats.norm(loc=loc, scale=scale)
say(f"Model says P(X > 85)      = {fitted.sf(85):.4f}")
say(f"Model says 95th pct cutoff = {fitted.ppf(0.95):.2f}")
out["fit"] = {
    "n": int(sample.size),
    # What it was drawn from: "we generated it so we can check".
    "trueLoc": 72,
    "trueScale": 6,
    "loc": r(loc),
    "scale": r(scale),
    "ppf95": r(fitted.ppf(0.95), 2),
    "sf85": r(fitted.sf(85)),
    # One-unit bins from 52 to 92.
    "lo": 52,
    "bin": 1,
    "counts": hist(sample, 52, 1, 40),
    "min": r(sample.min(), 2),
    "max": r(sample.max(), 2),
}

# ── Part 4. Q-Q plots (seed 7) ──────────────────────────────────────────────
rng = np.random.default_rng(7)
normal_data = rng.normal(loc=50, scale=8, size=400)
skewed_data = rng.lognormal(mean=3.5, sigma=0.5, size=400)


def qq_points(data):
    nn = len(data)
    probs = (np.arange(1, nn + 1) - 0.5) / nn  # plotting positions
    l, s = stats.norm.fit(data)  # fit a normal
    theoretical = stats.norm(loc=l, scale=s).ppf(probs)
    return theoretical, np.sort(data)


qq = {}
for key, label, data in [
    ("normal", "normal data (good fit)", normal_data),
    ("skewed", "skewed data (bad fit)", skewed_data),
]:
    theo, samp = qq_points(data)
    corr = np.corrcoef(theo, samp)[0, 1]
    say(f"{label:>24}: Q-Q correlation = {corr:.4f}")
    qq[key] = {"theoretical": rs(theo, 2), "sample": rs(samp, 2), "corr": r(corr)}
out["qq"] = qq

# ── Part 4. Extrapolation (seed 0) ──────────────────────────────────────────
rng = np.random.default_rng(0)
data = rng.normal(80, 12, size=400)
loc, scale = stats.norm.fit(data)
fitted = stats.norm(loc, scale)
say(f"Data range: {data.min():.1f} to {data.max():.1f}")
say(f"In-range question  P(X > 100): {fitted.sf(100):.4f}  <- supported by data")
say(f"Far-tail question  P(X > 200): {fitted.sf(200):.2e}  <- pure extrapolation")
far = fitted.sf(200)
exponent = math.floor(math.log10(far))
out["range"] = {
    "n": int(data.size),
    "values": rs(data, 2),
    "min": r(data.min(), 2),
    "max": r(data.max(), 2),
    "loc": r(loc),
    "scale": r(scale),
    "near": 100,
    "sfNear": r(fitted.sf(100), 5),
    "dataAboveNear": int(np.sum(data > 100)),
    "far": 200,
    "sfFar": float(f"{far:.3e}"),
    # 3.19e-24 written out: "0." then this many zeros, then the digits.
    "farZeros": -exponent - 1,
    "farDigits": f"{far / 10 ** exponent:.2f}".replace(".", ""),
}
say(f"  {out['range']['dataAboveNear']} of {data.size} values above 100; sf(200) = 0.{'0' * out['range']['farZeros']}{out['range']['farDigits']}")

json.dump(out, sys.stdout, separators=(",", ":"))
sys.stdout.write("\n")
