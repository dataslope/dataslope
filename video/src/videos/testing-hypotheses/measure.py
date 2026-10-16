"""Measures every number and every dot the TestingHypotheses video shows.

    python3 src/videos/testing-hypotheses/measure.py > src/videos/testing-hypotheses/measurements.json

(scipy lives in the user site here, so run it without -I.) Each part re-runs
one of the lesson code blocks the video is built from, with its own seed and
its own calls in its own order, so what it prints is what the page prints. The
lessons are in content/courses/statistics-for-data-science-python/:

- "checkout" is hypothesis-testing.mdx's opening: "The new checkout flow
  converted at 11.4%, the old one at 10.1%." Prose, no code.
- "steps" is hypothesis-testing.mdx, "A complete worked example, end to end"
  (seed 11): forty users' daily steps against a claimed 8,000.
- "sides" is the one-vs-two-sided chart's two cutoffs, from scipy rather than
  typed: the upper 5% point and the upper 2.5% point of the standard normal.
- "coin" is p-values.mdx, "Build it yourself: the p-value as a tail area"
  (seed 0): 100,000 runs of 100 fair flips against an observed 62 heads, and
  the exact binomial test from the block after it.
- "tiny" is p-values.mdx, "It is NOT 1 - P(alternative), nor the effect size"
  (seed 7): a fixed 0.1 effect at five sample sizes, printed to four places.
- "nullP" is errors-and-power.mdx, "The Type I error rate really is alpha"
  (seed 3): 5,000 experiments with no effect. The video histograms their
  p-values to show they are uniform, and counts the ones at or under 0.05.
- "twenty" is p-values.mdx, "The danger of looking many times" (seed 123):
  twenty tests of pure noise.
- "atLeast" is the multiple-comparisons chart's curve, 1 - 0.95^k.
- "power" is errors-and-power.mdx, "Simulating power" (seed 0): a 0.5 effect,
  30 per group, 2,000 experiments.
- "powerByN" is errors-and-power.mdx, "Power rises with sample size" (seed 1).
- "ab" is ab-testing.mdx, "Power and sample size, decided before you start":
  the two-proportion formula for 10% to 12%, and the same formula for 10% to
  11%, the halved lift the power-vs-n chart draws.
- "curse" is errors-and-power.mdx, "Why underpowered studies are doubly
  dangerous" (seed 4): a 0.3 effect at 15 per group, 6,000 runs.
- "paired" is t-tests.mdx, "Paired t-test" and the unpaired block after it
  (seed 42): 25 patients' blood pressure before and after.
- "pairwise" is anova-and-chi-square.mdx, "Why not just run a bunch of
  t-tests?" (seed 0): five identical groups, all ten pairwise tests, 800 times.
- "anova" is anova-and-chi-square.mdx, "Running a one-way ANOVA" (seed 11):
  three warehouses.
- "chi" is anova-and-chi-square.mdx, "Test of independence" (seed 5): device
  against churn for 600 users.
- "curve" is correlation-and-nonparametric.mdx, "When Pearson and Spearman
  disagree" (seed 2), and "ushape" its U-shape block (seed 3).
- "mwu" is correlation-and-nonparametric.mdx, "Mann-Whitney U" (seed 6): two
  support queues with three monster tickets each.

Printed checks (the lessons' own output lines) go to stderr.
"""

import json
import platform
import sys

import numpy as np
import pandas as pd
import scipy
from scipy import stats


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
        "scipy": scipy.__version__,
    }
}

# ── Part 1. The opening example (hypothesis-testing, prose) ─────────────────
out["checkout"] = {"newRate": 11.4, "oldRate": 10.1, "gap": r(11.4 - 10.1, 1)}

# ── Part 1. The worked example (hypothesis-testing, seed 11) ────────────────
rng = np.random.default_rng(11)
steps = rng.normal(loc=7600, scale=1800, size=40)
claimed_mean = 8000
alpha = 0.05
t_stat, p_value = stats.ttest_1samp(steps, popmean=claimed_mean)
say(f"Sample mean      : {steps.mean():.1f} steps")
say(f"Claimed mean (H0): {claimed_mean}")
say(f"t-statistic      : {t_stat:.3f}")
say(f"p-value          : {p_value:.4f}")
say("  ->", "REJECT H0" if p_value <= alpha else "FAIL TO REJECT H0")
out["steps"] = {
    "seed": 11,
    "n": 40,
    "claimed": claimed_mean,
    "alpha": alpha,
    "values": rs(steps, 1),
    "mean": r(steps.mean(), 2),
    "sd": r(steps.std(ddof=1), 2),
    "se": r(steps.std(ddof=1) / np.sqrt(40), 2),
    "t": r(t_stat),
    "p": r(p_value, 5),
    "reject": bool(p_value <= alpha),
}

# ── Part 1. One- and two-sided cutoffs (the one-vs-two-sided chart) ─────────
out["sides"] = {
    "two": r(stats.norm.ppf(0.975), 3),
    "one": r(stats.norm.ppf(0.95), 3),
}
say(f"  cutoffs: two-sided {stats.norm.ppf(0.975):.3f}, one-sided {stats.norm.ppf(0.95):.3f}")

# ── Part 2. The coin (p-values, seed 0) ─────────────────────────────────────
rng = np.random.default_rng(0)
observed_heads = 62
n_flips = 100
sims = rng.binomial(n=n_flips, p=0.5, size=100_000)
distance = abs(observed_heads - 50)
as_or_more_extreme = np.abs(sims - 50) >= distance
coin_p = as_or_more_extreme.mean()
say(f"Null distribution mean : {sims.mean():.1f} heads (should be ~50)")
say(f"Simulated p-value      : {coin_p:.4f}")
counts = np.bincount(sims, minlength=n_flips + 1)
# The exact test, from the block after it (its own seed-0 simulation is not
# needed for the exact p).
p_exact = stats.binomtest(observed_heads, n_flips, 0.5, alternative="two-sided").pvalue
say(f"scipy exact p     : {p_exact:.4f}")
out["coin"] = {
    "seed": 0,
    "runs": 100_000,
    "flips": n_flips,
    "observed": observed_heads,
    "mirror": 50 - distance,
    "distance": distance,
    "counts": [int(c) for c in counts],
    "upper": int((sims >= observed_heads).sum()),
    "lower": int((sims <= 50 - distance).sum()),
    "p": r(coin_p, 5),
    "exact": r(p_exact, 5),
}

# ── Part 2. A fixed tiny effect (p-values, seed 7) ──────────────────────────
rng = np.random.default_rng(7)
tiny = []
for n in [20, 100, 1000, 10_000, 100_000]:
    a = rng.normal(0.0, 1.0, n)
    b = rng.normal(0.1, 1.0, n)
    p = stats.ttest_ind(a, b).pvalue
    say(f"{n:>12} {p:>10.4f}")
    tiny.append({"n": n, "p": float(p), "printed": f"{p:.4f}"})
out["tiny"] = {"seed": 7, "effect": 0.1, "rows": tiny}

# ── Part 3. p-values under the null (errors-and-power, seed 3) ──────────────
rng = np.random.default_rng(3)
null_ps = []
false_positives = 0
for _ in range(5_000):
    a = rng.normal(0.0, 1.0, 40)
    b = rng.normal(0.0, 1.0, 40)
    p = stats.ttest_ind(a, b).pvalue
    null_ps.append(p)
    if p <= alpha:
        false_positives += 1
null_ps = np.array(null_ps)
type_I_rate = false_positives / 5_000
say(f"Observed Type I error rate : {type_I_rate:.4f}")
hist, _ = np.histogram(null_ps, bins=20, range=(0, 1))
out["nullP"] = {
    "seed": 3,
    "runs": 5_000,
    "bins": [int(c) for c in hist],
    "under": int(false_positives),
    "rate": r(type_I_rate),
}
say(f"  null p-values in 20 bins: {hist.min()}..{hist.max()} (expected 250 each)")

# ── Part 3. Twenty tests of nothing (p-values, seed 123) ────────────────────
rng = np.random.default_rng(123)
p_values = []
for _ in range(20):
    a = rng.normal(0, 1, 50)
    b = rng.normal(0, 1, 50)
    p_values.append(stats.ttest_ind(a, b).pvalue)
p_values = np.array(p_values)
hits = [int(i) for i in np.flatnonzero(p_values <= alpha)]
say("p-values from 20 tests where NOTHING is real:", np.round(p_values, 3))
say(f"'Significant' (p <= {alpha}) results: {len(hits)}  (test {[h + 1 for h in hits]})")
out["twenty"] = {"seed": 123, "p": rs(p_values, 4), "hits": hits}

out["atLeast"] = {
    "k": list(range(1, 21)),
    "p": [r(1 - 0.95**k) for k in range(1, 21)],
    "bonferroni": r(0.05 / 20, 4),
}
say(f"  at least one of 20: {1 - 0.95**20:.3f}; Bonferroni 0.05/20 = {0.05 / 20}")

# ── Part 4. Simulating power (errors-and-power, seed 0) ─────────────────────
rng = np.random.default_rng(0)
flags = []
for _ in range(2000):
    control = rng.normal(0.0, 1.0, 30)
    treatment = rng.normal(0.5, 1.0, 30)
    p = stats.ttest_ind(control, treatment).pvalue
    flags.append(1 if p <= alpha else 0)
power = sum(flags) / 2000
say(f"Estimated power = {power:.3f}  (catches it about {power * 100:.0f}%, misses {(1 - power) * 100:.0f}%)")
out["power"] = {
    "seed": 0,
    "effect": 0.5,
    "n": 30,
    "runs": 2000,
    "flags": "".join(str(f) for f in flags),
    "rejections": int(sum(flags)),
    "power": r(power),
}

# ── Part 4. Power against n (errors-and-power, seed 1) ──────────────────────
rng = np.random.default_rng(1)


def estimate_power(effect, n, reps=800):
    rej = 0
    for _ in range(reps):
        a = rng.normal(0.0, 1.0, n)
        b = rng.normal(effect, 1.0, n)
        if stats.ttest_ind(a, b).pvalue <= alpha:
            rej += 1
    return rej / reps


sizes = [10, 20, 40, 80, 160, 320]
power_by_n = [estimate_power(0.5, n) for n in sizes]
for n, p in zip(sizes, power_by_n):
    say(f"n = {n:>3} per group  ->  power ≈ {p:.2f}")
out["powerByN"] = {"seed": 1, "effect": 0.5, "sizes": sizes, "power": [r(p) for p in power_by_n]}

# ── Part 4. Sizing an A/B test (ab-testing) ─────────────────────────────────


def n_per_arm(p1, p2, alpha=0.05, power=0.80):
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    p_bar = (p1 + p2) / 2
    return (
        (z_alpha * np.sqrt(2 * p_bar * (1 - p_bar)) + z_beta * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
    ) / (p2 - p1) ** 2


ab = {f"{int(round(p2 * 100))}": int(np.ceil(n_per_arm(0.10, p2))) for p2 in (0.15, 0.12, 0.11)}
say(f"  Need ~{ab['12']:,} users PER ARM for 10% -> 12%; {ab['11']:,} for 10% -> 11%; {ab['15']:,} for 10% -> 15%")
out["ab"] = {"baseline": 10, "perArm": ab, "ratio": r(ab["11"] / ab["12"], 2)}

# ── Part 4. The winner's curse (errors-and-power, seed 4) ───────────────────
rng = np.random.default_rng(4)
all_estimates = []
significant = []
for _ in range(6000):
    a = rng.normal(0.0, 1.0, 15)
    b = rng.normal(0.3, 1.0, 15)
    est = b.mean() - a.mean()
    all_estimates.append(est)
    if stats.ttest_ind(a, b).pvalue <= alpha:
        significant.append(est)
all_estimates = np.array(all_estimates)
significant = np.array(significant)
say(f"Average of ALL estimates            : {all_estimates.mean():.3f}  (unbiased)")
say(f"Average of only SIGNIFICANT estimates: {significant.mean():.3f}  (inflated!)")
say(f"Power (fraction significant)        : {len(significant) / 6000:.2f}")
EDGES = np.round(np.arange(-1.5, 2.1 + 1e-9, 0.1), 2)
out["curse"] = {
    "seed": 4,
    "effect": 0.3,
    "n": 15,
    "runs": 6000,
    "lo": float(EDGES[0]),
    "bin": 0.1,
    "all": [int(c) for c in np.histogram(all_estimates, bins=EDGES)[0]],
    "sig": [int(c) for c in np.histogram(significant, bins=EDGES)[0]],
    "outside": int(((all_estimates < EDGES[0]) | (all_estimates >= EDGES[-1])).sum()),
    "meanAll": r(all_estimates.mean(), 3),
    "meanSig": r(significant.mean(), 3),
    "power": r(len(significant) / 6000, 4),
}

# ── Part 5. Paired against unpaired (t-tests, seed 42) ──────────────────────
rng = np.random.default_rng(42)
n = 25
before = rng.normal(loc=150, scale=18, size=n)
after = before - rng.normal(loc=6, scale=5, size=n)
paired = stats.ttest_rel(before, after)
unpaired = stats.ttest_ind(before, after, equal_var=False)
diffs = before - after
say(f"Mean change (before - after): {diffs.mean():.2f} mmHg")
say(f"Paired   (correct): t = {paired.statistic:6.3f}, p = {paired.pvalue:.5f}")
say(f"Unpaired (wrong)  : t = {unpaired.statistic:6.3f}, p = {unpaired.pvalue:.5f}")
out["paired"] = {
    "seed": 42,
    "n": n,
    "before": rs(before, 2),
    "after": rs(after, 2),
    "meanBefore": r(before.mean(), 2),
    "meanAfter": r(after.mean(), 2),
    "meanChange": r(diffs.mean(), 3),
    "sdBefore": r(before.std(ddof=1), 2),
    "sdChange": r(diffs.std(ddof=1), 3),
    "pairedT": r(paired.statistic, 3),
    "pairedP": float(paired.pvalue),
    "unpairedT": r(unpaired.statistic, 3),
    "unpairedP": r(unpaired.pvalue, 4),
}

# ── Part 6. Ten pairwise tests of five identical groups (seed 0) ────────────
rng = np.random.default_rng(0)
any_false_alarm = 0
for _ in range(800):
    groups = [rng.normal(100, 15, size=30) for _ in range(5)]
    fired = False
    for i in range(5):
        for j in range(i + 1, 5):
            if stats.ttest_ind(groups[i], groups[j]).pvalue <= alpha:
                fired = True
    any_false_alarm += fired
rate = any_false_alarm / 800
say(f"at least one of the 10 pairwise t-tests was 'significant' in {rate:.0%} of trials.")
out["pairwise"] = {"seed": 0, "groups": 5, "pairs": 10, "trials": 800, "rate": r(rate)}

# ── Part 6. Three warehouses (anova-and-chi-square, seed 11) ────────────────
rng = np.random.default_rng(11)
east = rng.normal(24.0, 4.0, size=40)
west = rng.normal(24.5, 4.0, size=40)
south = rng.normal(27.5, 4.0, size=40)
F_stat, p_anova = stats.f_oneway(east, west, south)
say(f"Means -> east {east.mean():.1f}, west {west.mean():.1f}, south {south.mean():.1f}")
say(f"F-statistic : {F_stat:.3f}")
say(f"p-value     : {p_anova:.4f}")
out["anova"] = {
    "seed": 11,
    "groups": {
        name: {"values": rs(v, 2), "mean": r(v.mean(), 3), "sd": r(v.std(ddof=1), 3)}
        for name, v in (("East", east), ("West", west), ("South", south))
    },
    "F": r(F_stat, 3),
    "p": float(p_anova),
}

# ── Part 6. Device and churn (anova-and-chi-square, seed 5) ─────────────────
rng = np.random.default_rng(5)
n = 600
device = rng.choice(["mobile", "desktop", "tablet"], size=n, p=[0.5, 0.4, 0.1])
base = np.where(device == "mobile", 0.32, np.where(device == "desktop", 0.18, 0.22))
churned = rng.random(n) < base
df = pd.DataFrame({"device": device, "churned": churned})
table = pd.crosstab(df["device"], df["churned"])
say(table)
chi2, p_chi, dof, expected = stats.chi2_contingency(table)
say(f"chi-square statistic : {chi2:.3f}")
say(f"degrees of freedom   : {dof}")
say(f"p-value              : {p_chi:.4f}")
say("Expected counts if INDEPENDENT:", np.round(expected, 1).tolist())
rows = list(table.index)
out["chi"] = {
    "seed": 5,
    "n": n,
    "rows": rows,
    "observed": {d: {"stayed": int(table.loc[d, False]), "churned": int(table.loc[d, True])} for d in rows},
    "expected": {
        d: {"stayed": r(expected[i][0], 1), "churned": r(expected[i][1], 1)} for i, d in enumerate(rows)
    },
    "chi2": r(chi2, 3),
    "dof": int(dof),
    "p": r(p_chi, 5),
}

# ── Part 7. Pearson and Spearman on a curve (seed 2), and a U (seed 3) ──────
rng = np.random.default_rng(2)
x = np.linspace(1, 10, 60)
y = np.exp(x / 2) + rng.normal(0, 2, size=60)
r_p, _ = stats.pearsonr(x, y)
r_s, _ = stats.spearmanr(x, y)
say(f"Pearson  r = {r_p:.3f}  (sees the CURVE -> less than 1)")
say(f"Spearman r = {r_s:.3f}  (sees perfect ORDER -> near 1)")
out["curve"] = {"seed": 2, "x": rs(x, 3), "y": rs(y, 3), "pearson": r(r_p, 3), "spearman": r(r_s, 3)}

rng = np.random.default_rng(3)
ux = rng.uniform(-5, 5, size=400)
uy = ux**2 + rng.normal(0, 1, size=400)
r_u, p_u = stats.pearsonr(ux, uy)
say(f"Pearson r = {r_u:.3f}  (p = {p_u:.3f})")
out["ushape"] = {"seed": 3, "x": rs(ux, 3), "y": rs(uy, 3), "r": r(r_u, 3), "p": r(p_u, 3)}

# ── Part 7. Mann-Whitney against Welch (seed 6) ─────────────────────────────
rng = np.random.default_rng(6)
a = rng.normal(30, 8, size=40)
b = rng.normal(36, 8, size=40)
a[:3] = [300, 280, 350]
b[:3] = [330, 410, 290]
t_res = stats.ttest_ind(a, b, equal_var=False)
u_res = stats.mannwhitneyu(a, b, alternative="two-sided")
say(f"Welch t-test     : p = {t_res.pvalue:.4f}  (outliers inflate the noise)")
say(f"Mann-Whitney U   : p = {u_res.pvalue:.4f}  (robust to outliers)")
out["mwu"] = {
    "seed": 6,
    "a": rs(a, 2),
    "b": rs(b, 2),
    "outliers": 3,
    "meanA": r(a.mean(), 2),
    "meanB": r(b.mean(), 2),
    "medianA": r(np.median(a), 2),
    "medianB": r(np.median(b), 2),
    "welchP": r(t_res.pvalue, 4),
    "mwuP": r(u_res.pvalue, 4),
}

json.dump(out, sys.stdout, separators=(",", ":"))
sys.stdout.write("\n")
