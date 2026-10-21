"""Measures every number the Probability video shows or says.

    python3 -I src/videos/probability/measure.py > src/videos/probability/measurements.json

Each part re-runs one of the lesson code blocks the video is built from, with
its own seed and its own calls in its own order, so what it prints is what the
page prints. The lessons are in content/courses/statistics-for-data-science-python/:

- "coin" is probability-basics.mdx, "The frequentist view" (seed 7): 100,000
  fair coin flips, then 100,000 rolls of a die.
- "lln" is probability-basics.mdx, "The Law of Large Numbers" (seed 1): the
  running proportion of heads over 5,000 flips. The path is kept at every
  flip up to 200 and every tenth flip after that, enough to draw it.
- "streak" is the same page's arithmetic: two heads is 0.5 x 0.5, ten in a
  row 0.5 ** 10, and the gambler's fallacy, whose next flip is still 0.5.
- "table" is conditional-probability.mdx, "Conditional probability from a
  table": 1,000 users by plan and churn.
- "test" is conditional-probability.mdx, "The centerpiece: a 99% accurate
  test that's usually wrong": the tree on 100,000 people, Bayes' rule by
  hand, and the simulation of two million people (seed 7). The second test
  follows the page's callout ("a positive screen is followed by a second,
  independent confirmatory test"), with the same 99% and 1% rates.
  statistical-fallacies.mdx, "Base-rate neglect", runs the same numbers with
  a sensitivity of 1.00; it is echoed for comparison.
- "monty" is conditional-probability.mdx, "The Monty Hall problem" (seed 0,
  from the block's initCode): 100,000 games. The running win rates are the
  same arrays, accumulated, kept on a log-spaced schedule for drawing.
- "die", "spread" and "warranty" are random-variables.mdx: the weighted die
  and its simulation (seed 0), its variance and SD (seed 1), and the extended
  warranty (seed 3). "heads" is the page's first figure, two flips mapped to
  a number of heads. "binom" is the same page's frozen binomial, n = 10 and
  p = 0.3, drawn small in the closing scene as one of the named shapes.

Printed checks (the lessons' own output lines) go to stderr.
"""

import json
import platform
import sys
from fractions import Fraction

import numpy as np
import pandas as pd


def r(x, d=4):
    return round(float(x), d)


def say(*args):
    print(*args, file=sys.stderr)


out = {
    "env": {
        "python": platform.python_version(),
        "numpy": np.__version__,
        "pandas": pd.__version__,
    }
}

# ── Part 1. Long-run frequency (probability-basics, seed 7) ─────────────────
rng = np.random.default_rng(7)
flips = rng.integers(0, 2, size=100_000)
p_heads_estimate = flips.mean()
say(f"Estimated P(heads) from simulation: {p_heads_estimate:.4f}")
say("True value:                         0.5000")
rolls = rng.integers(1, 7, size=100_000)
p_even = np.mean(rolls % 2 == 0)
p_six = np.mean(rolls == 6)
say(f"\nEstimated P(even die roll): {p_even:.4f}  (true: 0.5)")
say(f"Estimated P(roll a 6):      {p_six:.4f}  (true: {1 / 6:.4f})")
out["coin"] = {
    "seed": 7,
    "flips": 100_000,
    "heads": int(flips.sum()),
    "pHeads": r(p_heads_estimate),
    # The first flips, to draw as a strip of coins.
    "first": [int(f) for f in flips[:24]],
    "pEven": r(p_even),
    "pSix": r(p_six),
    "trueSix": r(1 / 6),
}

# ── Part 1. The law of large numbers (probability-basics, seed 1) ───────────
rng = np.random.default_rng(1)
n = 5_000
flips = rng.integers(0, 2, size=n)
running_prop = np.cumsum(flips) / np.arange(1, n + 1)
say(f"After 10 flips:    {running_prop[9]:.3f}")
say(f"After 100 flips:   {running_prop[99]:.3f}")
say(f"After 5,000 flips: {running_prop[-1]:.3f}")
keep = sorted(set(range(1, 201)) | set(range(210, n + 1, 10)) | {n})
out["lln"] = {
    "seed": 1,
    "n": n,
    "path": [[k, r(running_prop[k - 1], 4)] for k in keep],
    "after10": r(running_prop[9], 3),
    "after100": r(running_prop[99], 3),
    "after5000": r(running_prop[-1], 3),
    # How far the running proportion strays from 0.5 before and after 100 flips.
    "maxOffEarly": r(np.abs(running_prop[:100] - 0.5).max(), 3),
    "maxOffLate": r(np.abs(running_prop[999:] - 0.5).max(), 3),
    "first10": [int(f) for f in flips[:10]],
    # The run's first five heads in a row, as the flip it starts on (1-based):
    # where the video puts the gambler's-fallacy streak on the chart.
    "streakFrom": next(k for k in range(n - 4) if flips[k : k + 5].all()) + 1,
}
say(
    f"  lln: first ten flips {flips[:10].tolist()}, widest miss before 100 flips "
    f"{out['lln']['maxOffEarly']}, after 1,000 {out['lln']['maxOffLate']}"
)

# ── Part 1. Streaks (probability-basics, the multiplication rule) ───────────
out["streak"] = {
    "two": 0.5 * 0.5,
    "ten": r(0.5**10, 6),
    "tenOneIn": round(1 / 0.5**10),
    "next": 0.5,
}
say(f"  streak: two heads {0.5 * 0.5}, ten in a row {0.5 ** 10:.6f} (one in {round(1 / 0.5 ** 10)})")

# ── Part 2. Conditioning from a table (conditional-probability) ─────────────
table = pd.DataFrame(
    {"churned": [30, 120], "stayed": [470, 380]},
    index=["paid", "free"],
)
say(table)
say(f"\nTotal users: {table.values.sum()}")
paid_total = table.loc["paid"].sum()
p_churn_given_paid = table.loc["paid", "churned"] / paid_total
say(f"\nP(churn | paid) = {table.loc['paid', 'churned']}/{paid_total} = {p_churn_given_paid:.3f}")
free_total = table.loc["free"].sum()
p_churn_given_free = table.loc["free", "churned"] / free_total
say(f"P(churn | free) = {table.loc['free', 'churned']}/{free_total} = {p_churn_given_free:.3f}")
p_churn = table["churned"].sum() / table.values.sum()
say(f"\nP(churn) overall = {p_churn:.3f}")
ratio = p_churn_given_free / p_churn_given_paid
say(f"  table: free churns {ratio:.2f} times as often as paid (the prose says 'more than five times')")
out["table"] = {
    "rows": ["paid", "free"],
    "churned": [int(v) for v in table["churned"]],
    "stayed": [int(v) for v in table["stayed"]],
    "total": int(table.values.sum()),
    "paidTotal": int(paid_total),
    "freeTotal": int(free_total),
    "pPaid": r(p_churn_given_paid, 3),
    "pFree": r(p_churn_given_free, 3),
    "pAll": r(p_churn, 3),
    "churnedTotal": int(table["churned"].sum()),
    "ratio": r(ratio, 3),
    # The same table read the other way round: of the 150 who churned, how
    # many were on the free plan (the page's quiz names this conditional).
    "pFreeGivenChurn": r(table.loc["free", "churned"] / table["churned"].sum(), 3),
}

# ── Part 3. The 99% test (conditional-probability) ──────────────────────────
base_rate = 0.001
sensitivity = 0.99
fpr = 0.01
p_pos = sensitivity * base_rate + fpr * (1 - base_rate)
ppv = (sensitivity * base_rate) / p_pos
say(f"P(positive) overall        = {p_pos:.4f}")
say(f"P(disease | positive)= PPV = {ppv:.4f}  (about {ppv * 100:.0f}%)")

# The page's tree, 100,000 people, in exact counts.
POP = 100_000
sick = Fraction(POP) * Fraction(1, 1000)
healthy = POP - sick
tp = sick * Fraction(99, 100)
fn = sick - tp
fp = healthy * Fraction(1, 100)
tn = healthy - fp
positives = tp + fp
assert all(x.denominator == 1 for x in (sick, healthy, tp, fn, fp, tn))
tree_ppv = tp / positives
# A second, independent test of everyone who tested positive.
tp2 = tp * Fraction(99, 100)
fp2 = fp * Fraction(1, 100)
ppv2 = tp2 / (tp2 + fp2)
say(
    f"  tree: {POP:,} -> {sick} sick ({tp} +, {fn} -), {healthy:,} healthy ({fp} +, {tn:,} -); "
    f"{positives:,} positives, {tp}/{positives} = {float(tree_ppv):.4f}"
)
say(f"  second test: {float(tp2):.2f} of the sick and {float(fp2):.2f} of the false alarms stay positive: {float(ppv2):.4f}")

rng = np.random.default_rng(7)
n_sim = 2_000_000
has_disease = rng.random(n_sim) < base_rate
p_positive = np.where(has_disease, sensitivity, fpr)
tests_positive = rng.random(n_sim) < p_positive
sim_pos = tests_positive.sum()
sick_and_positive = (has_disease & tests_positive).sum()
ppv_empirical = sick_and_positive / sim_pos
say(f"People simulated:            {n_sim:,}")
say(f"Tested positive:             {sim_pos:,}")
say(f"   ...of whom truly sick:    {sick_and_positive:,}")
say(f"\nEmpirical P(disease | +):   {ppv_empirical:.4f}")

# statistical-fallacies.mdx runs the same population with sensitivity 1.00.
f_tp = 100_000 * (1 / 1000) * 1.00
f_fp = (100_000 - 100) * 0.01
say(f"  statistical-fallacies: {f_tp:.0f} true, {f_fp:.0f} false positives, {f_tp / (f_tp + f_fp):.1%}")

out["test"] = {
    "baseRate": base_rate,
    "oneIn": 1000,
    "sensitivity": sensitivity,
    "specificity": 1 - fpr,
    "fpr": fpr,
    "pPos": r(p_pos, 6),
    "ppv": r(ppv, 4),
    "population": POP,
    "sick": int(sick),
    "healthy": int(healthy),
    "tp": int(tp),
    "fn": int(fn),
    "fp": int(fp),
    "tn": int(tn),
    "positives": int(positives),
    "treePpv": r(float(tree_ppv), 4),
    "lift": r(float(tree_ppv) / base_rate, 1),
    "retestTp": r(float(tp2), 2),
    "retestFp": r(float(fp2), 2),
    "ppv2": r(float(ppv2), 4),
    "simN": n_sim,
    "simPositives": int(sim_pos),
    "simSickPositive": int(sick_and_positive),
    "simPpv": r(ppv_empirical, 4),
    "fallaciesPpv": r(f_tp / (f_tp + f_fp), 4),
}

# ── Part 4. Monty Hall (conditional-probability, seed 0) ────────────────────
rng = np.random.default_rng(0)
trials = 100_000
car = rng.integers(0, 3, size=trials)
pick = rng.integers(0, 3, size=trials)
stay = pick == car
switch = pick != car
stay_wins = stay.mean()
switch_wins = switch.mean()
say(f"Win rate if you STAY   : {stay_wins:.3f}  (~1/3)")
say(f"Win rate if you SWITCH : {switch_wins:.3f}  (~2/3)")
games = np.arange(1, trials + 1)
run_stay = np.cumsum(stay) / games
# Kept at every game to 60, then about 60 points per decade.
keep = sorted(set(range(1, 61)) | {int(round(10 ** (k / 60))) for k in range(100, 301)} | {trials})
keep = [k for k in keep if 1 <= k <= trials]
out["monty"] = {
    "seed": 0,
    "trials": trials,
    "stay": r(stay_wins, 4),
    "switch": r(switch_wins, 4),
    "stayCount": int(stay.sum()),
    "switchCount": int(switch.sum()),
    # The running rate of staying; switching is one minus it, game by game.
    "path": [[k, r(run_stay[k - 1], 4)] for k in keep],
    "after10": r(run_stay[9], 3),
    "after100": r(run_stay[99], 3),
}
say(f"  monty: stay after 10 games {run_stay[9]:.3f}, after 100 {run_stay[99]:.3f}, {len(keep)} points kept")

# ── Part 5. A random variable (random-variables) ────────────────────────────
out["heads"] = {"HH": 2, "HT": 1, "TH": 1, "TT": 0}

values = np.array([1, 2, 3, 4, 5, 6])
probs = np.array([0.10, 0.10, 0.10, 0.10, 0.10, 0.50])
say("Probabilities sum to:", probs.sum())
expected = np.sum(values * probs)
say(f"E[X] by hand = {expected:.3f}")
rng = np.random.default_rng(0)
draws = rng.choice(values, size=500_000, p=probs)
say(f"Mean of 500,000 draws = {draws.mean():.3f}  (-> converges to E[X])")
out["die"] = {
    "values": [int(v) for v in values],
    "probs": [float(p) for p in probs],
    "expected": r(expected, 3),
    "mode": int(values[probs.argmax()]),
    "draws": 500_000,
    "simMean": r(draws.mean(), 3),
    # Each face's contribution, value times probability.
    "terms": [r(v * p, 3) for v, p in zip(values, probs)],
}

mu = np.sum(values * probs)
var = np.sum((values - mu) ** 2 * probs)
sd = np.sqrt(var)
say(f"E[X]        = {mu:.3f}")
say(f"Var(X)      = {var:.3f}   (squared units)")
say(f"SD(X)       = {sd:.3f}   (same units as X)")
rng = np.random.default_rng(1)
draws = rng.choice(values, size=500_000, p=probs)
say(f"\nSimulated mean = {draws.mean():.3f}, simulated SD = {draws.std():.3f}")
out["spread"] = {
    "var": r(var, 3),
    "sd": r(sd, 3),
    "simMean": r(draws.mean(), 3),
    "simSd": r(draws.std(), 3),
    # Each face's squared distance from the mean, and its weighted share.
    "squares": [r((v - mu) ** 2, 3) for v in values],
    "terms": [r((v - mu) ** 2 * p, 4) for v, p in zip(values, probs)],
}

price = 80
payout = 300
p_fail = 0.15
e_payout = payout * p_fail + 0 * (1 - p_fail)
e_profit_seller = price - e_payout
say(f"E[payout per warranty] = ${e_payout:.2f}")
say(f"E[profit to seller]    = ${e_profit_seller:.2f} per warranty")
rng = np.random.default_rng(3)
fails = rng.random(1_000_000) < p_fail
profit = price - np.where(fails, payout, 0)
say(f"\nSimulated mean profit  = ${profit.mean():.2f}  (matches E above)")
out["warranty"] = {
    "price": price,
    "payout": payout,
    "pFail": p_fail,
    "ePayout": r(e_payout, 2),
    "eProfit": r(e_profit_seller, 2),
    "sold": 1_000_000,
    "simProfit": r(profit.mean(), 2),
    "failShare": r(fails.mean(), 4),
    # What one sale does to the seller: keep $80, or pay out $220 net.
    "lose": price - payout,
}

# ── The bridge: the lesson's frozen binomial (random-variables, "Let
# scipy.stats do the bookkeeping"), drawn as one of the named shapes. The pmf
# is written out with math.comb, which is what stats.binom(10, 0.3).pmf
# returns, so the script still runs under `python3 -I` without scipy.
from math import comb

pmf = [comb(10, k) * 0.3**k * 0.7 ** (10 - k) for k in range(11)]
mean = sum(k * q for k, q in enumerate(pmf))
var = sum((k - mean) ** 2 * q for k, q in enumerate(pmf))
say(f"E[X]   = {mean:.3f}")
say(f"Var(X) = {var:.3f}")
say(f"SD(X)  = {var ** 0.5:.3f}")
say(f"P(X = 3) = {pmf[3]:.3f}")
out["binom"] = {"n": 10, "p": 0.3, "pmf": [r(q, 4) for q in pmf]}

json.dump(out, sys.stdout, separators=(",", ":"))
sys.stdout.write("\n")
