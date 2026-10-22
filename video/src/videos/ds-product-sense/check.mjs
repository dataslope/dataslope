// Computes every number the ds-product-sense video shows, in Pyodide with
// NumPy and SciPy, the runtime the Data Scientist pages' blocks run in the
// reader's browser, and writes what came back to results.json, which data.ts
// reads. From the repo root:
//
//   node video/src/videos/ds-product-sense/check.mjs
//
// The product-sense page has no data of its own: its questions are about a
// product nobody names. So every product number here belongs to one made-up
// recipe app, the video's own, and the screen says so. What is arithmetic on
// those numbers (the segments, the sizing, the ratio) is computed here so it
// adds up; what is random (the ordinary days of the noise chart, the weekly
// lines of the leading-lagging chart) is seeded, so a rerun writes the same
// file. The sample sizes use DA Part 7's own function and baseline (a 10%
// rate, 80% power, a two-sided 5% test), so the two series agree.
/* global console, URL */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scipy"] });

const out = py.runPython(`
import json, sys
import numpy as np
import scipy
from scipy import stats

r = {"runtime": f"Pyodide / Python {sys.version.split()[0]} / NumPy {np.__version__} / SciPy {scipy.__version__}"}

# ── The opening: two numbers from the made-up app, the same morning ──────────
r["hook"] = {"signups": 1_284_000, "signupsToday": 1_900, "retentionWas": 31, "retentionNow": 29}

# ── 3. Leading and lagging: the made-up app's weekly lines (seeded) ──────────
# An onboarding change ships in week 3. Week-one cooking (the leading line)
# shows it the next week; month-three retention (the lagging line) only once
# the first cohort through the change reaches month three, twelve weeks on.
rng = np.random.default_rng(31)
weeks = np.arange(1, 21)
change = 3
lead = np.where(weeks <= change, 0.42, 0.36) + rng.normal(0, 0.006, len(weeks))
lag = np.where(weeks <= change + 12, 0.22, 0.19) + rng.normal(0, 0.004, len(weeks))
r["lead"] = {
    "weeks": weeks.tolist(), "change": change, "lagWeeks": 12,
    "leading": [round(float(v), 4) for v in lead],
    "lagging": [round(float(v), 4) for v in lag],
}

# ── 4. Goodhart: support tickets, made up ─────────────────────────────────────
r["goodhart"] = {"closeHoursWas": 9, "closeHoursNow": 3, "reopenWas": 4, "reopenNow": 15}

# ── 6. The DAU drop, by platform, made up so the parts add up ────────────────
before = {"iPhone": 52_000, "Android": 38_000, "Web": 10_000}
after = {"iPhone": 51_500, "Android": 30_500, "Web": 10_000}
tb, ta = sum(before.values()), sum(after.values())
r["drop"] = {
    "before": before, "after": after, "totalBefore": tb, "totalAfter": ta,
    "change": round((ta - tb) / tb, 4),
    "lost": tb - ta,
    "byPlatform": {k: {"lost": before[k] - after[k], "change": round((after[k] - before[k]) / before[k], 4)} for k in before},
    "release": "5.2",
}

# ── 7. Signal or noise: eight ordinary weeks of the same metric (seeded) ─────
rng = np.random.default_rng(7)
days = 56
base = 100_000
dev = rng.normal(0, 0.03, days)
values = base * (1 + dev)
mean = float(values.mean())
sd = float(values.std(ddof=1))
pct = (values - mean) / mean
today = mean * 0.98
r["noise"] = {
    "days": days, "values": [round(float(v)) for v in values],
    "mean": round(mean), "sdShare": round(sd / mean, 4),
    "band": [round(mean - 2 * sd), round(mean + 2 * sd)],
    "today": round(today), "todayZ": round((today - mean) / sd, 2),
    "beyondTwo": int((np.abs(pct) > 0.02).sum()),
}

# ── 8. Sizing the recommendation test: DA Part 7's own function ───────────────
def n_per_arm(p1, p2, alpha=0.05, power=0.80):
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    p_bar = (p1 + p2) / 2
    return int(np.ceil(((z_alpha * np.sqrt(2 * p_bar * (1 - p_bar)) + z_beta * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / (p2 - p1) ** 2))
n_twelve = n_per_arm(0.10, 0.12)
n_one = n_per_arm(0.10, 0.11)
n_half = n_per_arm(0.10, 0.105)
r["sample"] = {
    "base": 0.10, "lift": 0.11, "halfLift": 0.105,
    "perArm": n_one, "perArmHalf": n_half, "ratio": round(n_half / n_one, 2),
    "daPart7Twelve": n_twelve,
}

# ── 10. The on-the-spot estimate: daily ingredient searches ──────────────────
mau, share, sessions, searches = 2_000_000, 0.25, 0.5, 2
r["market"] = {
    "mau": mau, "share": share, "sessionsPerDay": sessions, "searchesPerSession": searches,
    "users": int(mau * share), "sessionsDaily": int(mau * share * sessions),
    "daily": int(mau * share * sessions * searches),
}

# ── 11. A feature's impact, bounded before it is built ───────────────────────
reach, lo, hi, goal = 120_000, 0.01, 0.03, 20_000
r["impact"] = {
    "reach": reach, "liftLo": lo, "liftHi": hi, "goal": goal,
    "extraLo": round(reach * lo), "extraHi": round(reach * hi),
    "shareOfGoal": round(reach * hi / goal, 3),
}

# ── 14. A ratio that rose while its top fell ─────────────────────────────────
s0, u0, s1, u1 = 200_000, 100_000, 192_000, 80_000
r["ratio"] = {
    "savesBefore": s0, "usersBefore": u0, "savesAfter": s1, "usersAfter": u1,
    "perUserBefore": s0 / u0, "perUserAfter": s1 / u1,
    "savesChange": round((s1 - s0) / s0, 3), "usersChange": round((u1 - u0) / u0, 3),
}

# ── 12. Two metrics pulling apart: the page's own numbers ────────────────────
r["trade"] = {"sessions": 5, "unsubscribes": 2}

json.dumps(r)
`);

const results = JSON.parse(out);
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, (k, v) => (Array.isArray(v) && v.length > 8 ? `[${v.length} values]` : v), 2));
