// Computes every number the ds-llm-evaluation video shows, in Pyodide with
// NumPy and SciPy, the runtime the Data Scientist pages' blocks run in the
// reader's browser, and writes what came back to results.json, which data.ts
// reads. From the repo root:
//
//   node video/src/videos/ds-llm-evaluation/check.mjs
//
// The LLM evaluation page's numbers are arithmetic, and they are redone here
// from the page's own inputs: the 95% interval on an 80% pass rate (its
// runnable block), the judge's kappa (90% agreement, both raters marking 90%
// "pass"), and the Rogan–Gladen correction (sensitivity 0.90, specificity
// 0.95, 20% labelled complaints). What the page states but gives no data for
// (judge biases, benchmark contamination, a provider changing the model
// mid-test) is drawn as a mechanism and carries no number at all.
//
// Two things are the video's own and the screen says so: the paired pass/fail
// table for the McNemar comparison (500 items, B passing 82% and A 79%, the
// page's concept-check scores), and the notebook whose join drops a third of
// its 10,000 rows (Data Analyst Part 8's 10,000 orders, losing rows this time
// rather than gaining them).
/* global console, URL */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scipy"] });

const out = py.runPython(`
import json, math, sys
import numpy as np
import scipy
from scipy import stats

r = {"runtime": f"Pyodide / Python {sys.version.split()[0]} / NumPy {np.__version__} / SciPy {scipy.__version__}"}

# ── 3. How large an eval set: the page's own block, p = 0.80 ─────────────────
p = 0.80
ns = [50, 100, 200, 500, 1000, 2000]
half = {n: 1.96 * math.sqrt(p * (1 - p) / n) for n in ns}
r["size"] = {
    "p": p,
    "n": ns,
    "half": [round(half[n], 4) for n in ns],
    "at100": {"lo": round(p - half[100], 4), "hi": round(p + half[100], 4), "half": round(half[100], 4)},
}

# The page's concept check on 100 items: A 79%, B 82%. Each one's interval.
def interval(q, n):
    h = 1.96 * math.sqrt(q * (1 - q) / n)
    return [round(q - h, 4), round(q + h, 4)]
r["size"]["two"] = {"n": 100, "a": 0.79, "b": 0.82, "aCI": interval(0.79, 100), "bCI": interval(0.82, 100)}

# ── 3. Pairing: the video's own 500 items, A 79% and B 82% ──────────────────
n = 500
both_pass, a_only, b_only = 385, 10, 25
both_fail = n - both_pass - a_only - b_only
a_pass, b_pass = both_pass + a_only, both_pass + b_only
assert (a_pass, b_pass) == (395, 410)
# Read as two separate samples of 500: a two-proportion z-test.
pa, pb = a_pass / n, b_pass / n
pool = (a_pass + b_pass) / (2 * n)
z = (pb - pa) / math.sqrt(pool * (1 - pool) * (2 / n))
p_unpaired = 2 * (1 - stats.norm.cdf(abs(z)))
# Paired: McNemar's exact test, a binomial test on the discordant items only.
disc = a_only + b_only
p_mcnemar = stats.binomtest(a_only, disc, 0.5).pvalue
r["pair"] = {
    "n": n, "bothPass": both_pass, "aOnly": a_only, "bOnly": b_only, "bothFail": both_fail,
    "aPass": a_pass, "bPass": b_pass, "aRate": pa, "bRate": pb,
    "discordant": disc,
    "z": round(z, 3), "pUnpaired": round(float(p_unpaired), 4),
    "pMcNemar": round(float(p_mcnemar), 4),
}

# ── 4. The judge: the page's 90% agreement, both raters 90% "pass" ──────────
# 100 items: both say pass 85, both fail 5, and 5 each way they disagree.
pp, pf, fp, ff = 85, 5, 5, 5  # judge/expert: pass/pass, pass/fail, fail/pass, fail/fail
tot = pp + pf + fp + ff
po = (pp + ff) / tot
judge_pass = (pp + pf) / tot
expert_pass = (pp + fp) / tot
pe = judge_pass * expert_pass + (1 - judge_pass) * (1 - expert_pass)
kappa = (po - pe) / (1 - pe)
# A judge that never reads the reply and always says pass.
po0 = expert_pass
pe0 = 1 * expert_pass + 0 * (1 - expert_pass)
kappa0 = (po0 - pe0) / (1 - pe0)
r["judge"] = {
    "cells": {"passPass": pp, "passFail": pf, "failPass": fp, "failFail": ff},
    "po": round(po, 4), "pe": round(pe, 4), "kappa": round(kappa, 4),
    "above": round(po - pe, 4), "room": round(1 - pe, 4),
    "alwaysPass": {"po": round(po0, 4), "kappa": round(kappa0, 4)},
}

# ── 6. Rogan–Gladen: the page's sensitivity, specificity and observed share ──
sens, spec, obs = 0.90, 0.95, 0.20
prev = (obs + spec - 1) / (sens + spec - 1)
N = 1_000_000
true_c = prev * N
caught = sens * true_c
missed = true_c - caught
false_alarm = (1 - spec) * (N - true_c)
assert abs((caught + false_alarm) / N - obs) < 1e-12
r["prev"] = {
    "sens": sens, "spec": spec, "obs": obs, "prev": round(prev, 5),
    "tickets": N, "flagged": round(obs * N),
    "trueComplaints": round(true_c), "caught": round(caught), "missed": round(missed),
    "falseAlarms": round(false_alarm), "notComplaints": round(N - true_c),
}

# ── 7. The notebook: 10,000 rows, a join that drops a third (made up) ───────
r["notebook"] = {"rows": 10_000, "afterJoin": 6_700, "lost": round(1 - 6_700 / 10_000, 3)}
# Twenty segment comparisons at 5% with no correction: the chance of at
# least one false alarm when nothing is going on.
r["notebook"]["segments"] = 20
r["notebook"]["anyFalse"] = round(1 - 0.95 ** 20, 4)

# ── The close: the track's question bank, counted ───────────────────────────
r["bank"] = 110

json.dumps(r)
`);

const results = JSON.parse(out);
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
