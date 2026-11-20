// Computes every number the mle-mlops video says or shows, and writes
// results.json, which data.ts reads. No registry, pipeline, serving
// platform, monitoring system or production traffic runs here, so nothing
// below is any real system's output. The numbers are of three kinds, each
// named on screen and aloud as what it is:
//
//   - Runs of scikit-learn in Pyodide (the runtime the site's Python blocks
//     run in) on a set it bundles (the 1,797 handwritten digits): a random
//     forest of 50 trees trained twenty times on the same split with seeds
//     0 to 19, and twice with seed 0, to show what an unlogged seed moves.
//   - Runs of scikit-learn on data the video makes up and calls a
//     simulation, seeded:
//       * the evaluation gate: a gradient-boosted incumbent trained on last
//         year's rows (one customer group in twenty behaves differently),
//         a candidate retrained on last month's, where that group is almost
//         absent and the rest has moved a little, both scored overall and on
//         the group, on today's holdout;
//       * drift: a logistic regression trained on two features, then scored
//         on a quarter where the first feature's mean moves up by one
//         (data drift) and on one where no input moves but the rule from
//         inputs to label changes (concept drift), with PSI on each input and
//         on the predictions.
//   - PSI itself, computed exactly on simulated bins (NumPy in the same
//     Pyodide): the page's own example draws (seed 42), scored with the
//     page's compute_psi (which opens its outer buckets) and with closed
//     edges at the training minimum and maximum; how often two
//     samples from one distribution score over 0.1 at window sizes of 100,
//     300 and 1,000 against a reference of 1,000 (2,000 tries each, seeded);
//     and a current window where a fifth of the values fall beyond the
//     reference's maximum.
//
// Then it checks that the pages still say what the narration quotes from
// them, reads script.ts, and exits non-zero if a number the narration says
// no longer matches what is computed here.
//
// From the repo root (pyodide needs the root's node_modules; it takes about
// a minute to load):
//
//   node video/src/videos/mle-mlops/check.mjs
/* global console, process */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const require = createRequire(join(root, "package.json"));

const problems = [];
const check = (ok, what) => {
  if (!ok) problems.push(what);
};

// ── The pages still say what the narration takes from them ─────────────────
const raw = (name) => readFileSync(join(root, "content/interview/machine-learning-engineer", `${name}.mdx`), "utf8");
const norm = (s) => s.replace(/\*\*/g, "").replace(/\s+/g, " ");
const MSD_RAW = raw("ml-system-design");
const MSD = norm(MSD_RAW);
const MLOPS = norm(raw("mlops"));
const QUOTES = [
  // Question 1.
  [MLOPS, "MLOps applies DevOps practices (automation, CI/CD, monitoring) to machine learning, but with an extra moving part: data"],
  [MLOPS, "A traditional app is code plus config; an ML system is code plus data plus a trained model, and all three must be versioned, tested, and reproducible"],
  [MLOPS, "Models also decay as the world changes even when the code is frozen"],
  // Questions 2 and 3.
  [MLOPS, "Four things: the code (in git), the data (a snapshot or query pinned to a timestamp), the config (hyperparameters, random seeds, feature definitions), and the resulting model artifact"],
  [MLOPS, "Container images pin the environment so library versions don't drift underneath you"],
  [MSD, "log all hyperparameters and random seeds"],
  [MSD, "A reproducible run should regenerate the same model artifact from the same code, data, and config"],
  [MSD, "DVC (Data Version Control) track dataset snapshots alongside git commits"],
  [MSD, "Data warehouses with time-travel (Delta Lake, Iceberg) let you query data as-of a past timestamp"],
  [MSD, "S3/GCS paths with immutable prefixes (date-partitioned or UUID-keyed)"],
  [MSD, "The goal is to reproduce the exact training set for any past model version"],
  // Questions 4 and 5.
  [MSD, "(1) data validation on new data; (2) unit and integration tests for feature transforms and preprocessing code; (3) training run on a versioned dataset; (4) evaluation gate, the new model must beat the incumbent on a holdout set; (5) model registry promotion; (6) staged rollout"],
  [MLOPS, "a staged rollout (shadow, then canary, then full)"],
  [MLOPS, "triggered by code, data, or schedule changes"],
  [MLOPS, "beating the current production model on a fixed holdout set (and clearing minimum thresholds on fairness or slice metrics)"],
  [MLOPS, "Without it, an automated retraining pipeline could silently ship a regression"],
  [MLOPS, "into a build-breaking test"],
  // Question 6.
  [MLOPS, "Operational health: latency (p50/p95/p99), error rate, throughput, resource use"],
  [MLOPS, "Model health: input feature distributions (data drift), the prediction distribution, and, once labels arrive, live accuracy/precision/recall"],
  [MLOPS, "Log inputs and predictions for debugging and replay"],
  [MLOPS, "wire alerts to a retraining and rollback path"],
  // Questions 7 and 8.
  [MLOPS, "Data drift is the input distribution shifting (a new user segment, a changed sensor unit)"],
  [MLOPS, "Concept drift is the input→label relationship shifting (fraud tactics evolve, so the same features now mean something different)"],
  [MLOPS, "Performance degradation is the measurable quality drop that either can cause"],
  [MSD, "they cannot distinguish concept drift from harmless covariate shift"],
  [MSD, "evaluate time-sliced performance and calibration, ideally against stable cohorts or controls"],
  [MSD, "Responses range from alerting to automated retraining to feature redesign if the drift is structural"],
  // Questions 9 and 10.
  [MSD, "PSI quantifies the shift between a reference distribution (training) and a current distribution (production) for a single feature"],
  [MSD, "Rules such as \"below 0.1 is stable\" and \"above 0.2 needs action\" are industry conventions, not calibrated significance levels"],
  [MSD, "PSI depends on bin boundaries, sample size, smoothing, and feature distribution"],
  [MLOPS, "population stability index (PSI), KL divergence, or a Kolmogorov–Smirnov test per feature"],
  [MLOPS, "should be calibrated to normal variation, sample size, and business impact"],
  [MLOPS, "they cannot by themselves prove concept drift or a loss of model quality"],
  [MLOPS, "Use delayed labels, audits, or randomized outcome measurement where possible"],
  [MLOPS, "Observable input or prediction drift can be a leading indicator before labels arrive"],
  // Question 11.
  [MSD, "Shadow it first (serve live traffic, log predictions, don't act on them)"],
  [MSD, "The challenger's predictions are logged but never returned to users"],
  [MSD, "compare output distributions, latency, and error rates under real traffic before any user exposure"],
  [MSD, "A canary routes a small fraction of traffic (1–5%) to the new model version"],
  [MLOPS, "ramp traffic up only if they hold; if they degrade, you immediately shift back"],
  [MLOPS, "so rollback is a config change, not a redeploy"],
  [MLOPS, "Account for downstream state, feature-store writes, A/B assignment logs, and caches"],
  [MLOPS, "Rehearse rollback"],
  // Question 12.
  [MSD, "business metrics (click-through, conversion) are compared"],
  [MSD, "users only see the champion's predictions. A/B tests measure real impact; shadow tests verify parity in outputs and latency before any user exposure"],
  [MLOPS, "run alongside it, in shadow or on a small canary slice, to prove they're better on live traffic before being promoted"],
  [MLOPS, "not just an offline benchmark"],
  // Quick round.
  [MLOPS, "makes rollback a lookup rather than a rebuild"],
  [MSD, "It enforces a promotion workflow (staging → production)"],
  [MSD, "(1) schedule, retrain weekly/monthly regardless; (2) drift alert"],
  [MSD, "(3) performance degradation, live accuracy or a proxy metric drops below a threshold; (4) data volume, enough new labeled examples have accumulated"],
  [MLOPS, "always routes the candidate through the same evaluation gate and staged rollout"],
  [MLOPS, "You flip traffic to green in one switch; if anything breaks, you flip back to blue instantly"],
  [MLOPS, "at the cost of running two environments during the cutover. Canary is a finer-grained, gradual variant of the same idea"],
  [MLOPS, "can't reliably answer \"which configuration produced the model in production?\""],
  [MLOPS, "Exporting to a framework-neutral format like ONNX decouples the model from the training framework and enables optimized runtimes"],
  [MLOPS, "The container plus a versioned artifact is the promotable unit"],
];
for (const [text, quote] of QUOTES) check(text.includes(quote), `a page no longer says "${quote}"`);
for (const [text, heading] of [
  [MLOPS, "### What is MLOps, and how does it differ from traditional DevOps?"],
  [MLOPS, "### What do you need to version to reproduce a model?"],
  [MSD, "### How do you ensure reproducibility of ML experiments?"],
  [MSD, "### How do you version training data?"],
  [MLOPS, "### How do you version training data?"],
  [MSD, "### How do you design a CI/CD pipeline for ML?"],
  [MLOPS, "### What are the stages of a CI/CD pipeline for models?"],
  [MLOPS, "### What is an evaluation gate, and why is it essential?"],
  [MSD, "### How do you monitor a model in production?"],
  [MLOPS, "### How do you monitor a model in production?"],
  [MLOPS, "### Data drift vs concept drift vs performance degradation?"],
  [MSD, "### What is drift, and what do you do about it?"],
  [MSD, "### How do you detect and respond to concept drift?"],
  [MSD, "### What is population stability index (PSI)?"],
  [MLOPS, "### How do you detect drift when labels are delayed or unavailable?"],
  [MSD, "### How do you roll out a new model version safely?"],
  [MSD, "### What is shadow deployment?"],
  [MLOPS, "### What is a shadow deployment?"],
  [MSD, "### What is a canary deployment?"],
  [MLOPS, "### What is a canary deployment?"],
  [MSD, "### How do you do rollback for a model?"],
  [MLOPS, "### How do you roll back a model safely?"],
  [MSD, "### What is A/B testing for models and how does it differ from shadow testing?"],
  [MLOPS, "### What is a champion/challenger setup?"],
  [MSD, "### What is a model registry?"],
  [MLOPS, "### What is a model registry?"],
  [MSD, "### How do you trigger model retraining?"],
  [MLOPS, "### What is continuous training (CT)?"],
  [MLOPS, "### How does blue/green deployment apply to models?"],
  [MLOPS, "### What tools support experiment tracking, and why does it matter?"],
  [MLOPS, "### How do you package a model for deployment?"],
]) {
  check(text.includes(heading), `a page no longer asks "${heading}"`);
}

// The page's PSI block, run below exactly as the page writes it: its data
// (initCode) and its compute_psi (starterCode), pulled out of the MDX.
const block = (name) => {
  const m = MSD_RAW.match(new RegExp(`${name}: \`([\\s\\S]*?)\`,`));
  if (!m) throw new Error(`check.mjs: the page's PSI block has no ${name}`);
  return m[1];
};
const PAGE_INIT = block("initCode");
const PAGE_PSI = block("starterCode").split("\nprint(")[0];
check(PAGE_PSI.includes("breakpoints[0], breakpoints[-1] = -np.inf, np.inf"), "the page's compute_psi no longer opens its outer buckets, which the video teaches");

// ── Pyodide ────────────────────────────────────────────────────────────────
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scikit-learn"] });
py.globals.set("PAGE_INIT", PAGE_INIT);
py.globals.set("PAGE_PSI", PAGE_PSI);
const out = py.runPython(`
import hashlib, json, sys, warnings
import numpy as np
import sklearn
warnings.filterwarnings("ignore")
from sklearn.datasets import load_digits
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

R = {"runtime": {"python": sys.version.split()[0], "sklearn": sklearn.__version__, "numpy": np.__version__}}
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)

# The page's PSI, exactly as written (open outer buckets since 2026-11-20,
# when this video's writer found the page dropping out-of-range values), the
# video's own open-bucket PSI, which must agree with it, and the closed-edge
# version the video warns against: edges at the training minimum and maximum,
# where np.histogram drops anything beyond them from the count.
page = {}
exec(PAGE_INIT, page)
exec(PAGE_PSI, page)
page_psi = page["compute_psi"]
def open_psi(reference, current, n_bins=10, eps=1e-8):
    edges = np.percentile(reference, np.linspace(0, 100, n_bins + 1))
    edges[0], edges[-1] = -np.inf, np.inf
    ref = np.histogram(reference, bins=edges)[0] + eps
    cur = np.histogram(current, bins=edges)[0] + eps
    ref, cur = ref / ref.sum(), cur / cur.sum()
    return float(np.sum((cur - ref) * np.log(cur / ref))), cur, ref
def closed_psi(reference, current, n_bins=10, eps=1e-8):
    edges = np.percentile(reference, np.linspace(0, 100, n_bins + 1))
    ref = np.histogram(reference, bins=edges)[0] + eps
    cur = np.histogram(current, bins=edges)[0] + eps
    ref, cur = ref / ref.sum(), cur / cur.sum()
    return float(np.sum((cur - ref) * np.log(cur / ref)))

# ── Questions 2 and 3: what an unlogged seed moves ──
X, y = load_digits(return_X_y=True)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)
accs = []
for seed in range(20):
    forest = RandomForestClassifier(n_estimators=50, random_state=seed).fit(Xtr, ytr)
    accs.append(float(forest.score(Xte, yte)))
digest = lambda m: hashlib.sha256(m.predict_proba(Xte).tobytes()).hexdigest()[:16]
a = RandomForestClassifier(n_estimators=50, random_state=0).fit(Xtr, ytr)
b = RandomForestClassifier(n_estimators=50, random_state=0).fit(Xtr, ytr)
R["seeds"] = {
    "trees": 50, "train": int(len(ytr)), "test": int(len(yte)),
    "accuracy": [r4(v) for v in accs], "min": r4(min(accs)), "max": r4(max(accs)),
    "sameSeedIdentical": bool((a.predict_proba(Xte) == b.predict_proba(Xte)).all()),
    "digestA": digest(a), "digestB": digest(b),
}

# ── Questions 4 and 5: a candidate that wins overall and fails a slice ──
rng = np.random.default_rng(3)
def world(n, group_share, recent):
    group = (rng.random(n) < group_share).astype(int)
    x1, x2 = rng.normal(0, 1, n), rng.normal(0, 1, n)
    # Most customers: the rule has moved a little since last year.
    z_most = 2.0 * x1 + (1.2 if recent else 0.0) * x2
    # One group in twenty behaves differently, and always has.
    z_group = -1.5 * x1 + 1.5 * x2
    z = np.where(group == 1, z_group, z_most)
    label = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
    return np.column_stack([x1, x2, group]), label, group
X_year, y_year, g_year = world(20_000, 0.05, recent=False)
X_month, y_month, g_month = world(4_000, 0.002, recent=True)
X_hold, y_hold, g_hold = world(10_000, 0.05, recent=True)
incumbent = HistGradientBoostingClassifier(random_state=0).fit(X_year, y_year)
candidate = HistGradientBoostingClassifier(random_state=0).fit(X_month, y_month)
def scores(m):
    p = m.predict(X_hold)
    return {"overall": r4((p == y_hold).mean()), "rest": r4((p[g_hold == 0] == y_hold[g_hold == 0]).mean()),
            "group": r4((p[g_hold == 1] == y_hold[g_hold == 1]).mean())}
R["gate"] = {
    "incumbent": scores(incumbent), "candidate": scores(candidate),
    "trainYear": int(len(y_year)), "trainMonth": int(len(y_month)),
    "groupRowsYear": int(g_year.sum()), "groupRowsMonth": int(g_month.sum()),
    "holdout": int(len(y_hold)), "groupHoldout": int(g_hold.sum()), "groupShare": r3(g_hold.mean()),
    "groupPositiveRate": r3(y_hold[g_hold == 1].mean()),
}

# ── Questions 7 and 8: data drift against concept drift ──
rng = np.random.default_rng(0)
def quarter(n, shift=0.0, concept=False):
    x1, x2 = rng.normal(shift, 1, n), rng.normal(0, 1, n)
    z = (2.0 * x1 - 1.5 * x2 - 1.0) if concept else (2.0 * x1 + 1.0 * x2)
    return np.column_stack([x1, x2]), (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
X_train, y_train = quarter(5_000)
model = LogisticRegression().fit(X_train, y_train)
p_train = model.predict_proba(X_train)[:, 1]
def watch(X, yq):
    p = model.predict_proba(X)[:, 1]
    return {"psiX1": r3(open_psi(X_train[:, 0], X[:, 0])[0]), "psiX2": r3(open_psi(X_train[:, 1], X[:, 1])[0]),
            "psiPred": r3(open_psi(p_train, p)[0]), "accuracy": r4((model.predict(X) == yq).mean()),
            "positiveRate": r3(yq.mean())}
same = quarter(2_000)
data = quarter(2_000, shift=1.0)
concept = quarter(2_000, concept=True)
R["drift"] = {
    "train": 5_000, "window": 2_000, "coef": [r3(v) for v in model.coef_[0]], "intercept": r3(model.intercept_[0]),
    "same": watch(*same), "data": watch(*data), "concept": watch(*concept),
    # For the figure: each quarter's first feature, binned on the training deciles.
    "x1Shares": {k: [r4(v) for v in open_psi(X_train[:, 0], Xq[:, 0])[1]] for k, (Xq, _) in
                 {"same": same, "data": data, "concept": concept}.items()},
}

# ── Questions 9 and 10: PSI itself ──
reference, stable, drifted = page["reference"], page["stable"], page["drifted"]
s_open, s_cur, _ = open_psi(reference, stable)
d_open, d_cur, d_ref = open_psi(reference, drifted)
R["psi"] = {
    "pageStable": r4(page_psi(reference, stable)), "pageDrifted": r4(page_psi(reference, drifted)),
    "openStable": r4(s_open), "openDrifted": r4(d_open),
    "closedStable": r4(closed_psi(reference, stable)), "closedDrifted": r4(closed_psi(reference, drifted)),
    "pageDroppedDrifted": int((drifted > reference.max()).sum() + (drifted < reference.min()).sum()),
    "stableShares": [r4(v) for v in s_cur], "driftedShares": [r4(v) for v in d_cur],
}
# No drift at all: how often a window scores over 0.1, by its size.
noise = {}
rng = np.random.default_rng(7)
TRIES = 2_000
for size in [100, 300, 1_000]:
    vals = np.array([open_psi(rng.normal(size=1_000), rng.normal(size=size))[0] for _ in range(TRIES)])
    noise[str(size)] = {"over01": r4((vals > 0.1).mean()), "over02": r4((vals > 0.2).mean()),
                        "median": r4(np.median(vals)), "p95": r4(np.percentile(vals, 95)), "max": r4(vals.max())}
R["psiNoise"] = {"reference": 1_000, "tries": TRIES, "bySize": noise}
# A fifth of the window beyond anything seen in training.
rng = np.random.default_rng(11)
ref = rng.normal(size=1_000)
beyond = np.concatenate([rng.normal(size=800), ref.max() + 0.5 + rng.random(200) * 1.5])
b_open, b_cur, _ = open_psi(ref, beyond)
R["psiEdges"] = {
    "reference": 1_000, "window": 1_000, "beyond": int((beyond > ref.max()).sum()),
    "closed": r4(closed_psi(ref, beyond)), "open": r4(b_open), "openShares": [r4(v) for v in b_cur],
}
json.dumps(R)
`);
const R = JSON.parse(out);
check(R.psi.pageStable === R.psi.openStable && R.psi.pageDrifted === R.psi.openDrifted, "the page's compute_psi and the video's open-bucket PSI disagree");

// ── What the narration says, checked against the numbers ────────────────────
const { script } = await import(pathToFileURL(join(here, "script.ts")).href);
const beat = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`check.mjs: script.ts has no beat "${id}"`);
  return b.text;
};
const pct = (v) => Math.round(v * 100);
const pct1 = (v) => Math.round(v * 1000) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;
const G = R.gate;
const D = R.drift;
const said = [
  ["q2-seed", "twenty times", 20, R.seeds.accuracy.length],
  ["q2-seed", "from ninety-six point one", 96.1, pct1(R.seeds.min)],
  ["q2-seed", "to ninety-seven point eight percent", 97.8, pct1(R.seeds.max)],
  ["q2-seed", "every prediction matches", 1, Number(R.seeds.sameSeedIdentical)],
  ["q4-slice", "seventy-seven percent to seventy-five", 77, pct(G.candidate.overall)],
  ["q4-slice", "seventy-seven percent to seventy-five", 75, pct(G.incumbent.overall)],
  ["q4-slice", "one customer in twenty", 5, pct(G.groupShare)],
  ["q4-slice", "from seventy-nine percent to forty-six", 79, pct(G.incumbent.group)],
  ["q4-slice", "from seventy-nine percent to forty-six", 46, pct(G.candidate.group)],
  ["q4-slice", "worse than a coin flip", 1, Number(G.candidate.group < 0.5 && Math.abs(G.groupPositiveRate - 0.5) < 0.05)],
  ["q7-data", "reads point nine one", 0.91, r2(D.data.psiX1)],
  ["q7-rises", "from eighty percent to eighty-four", 80, pct(D.same.accuracy)],
  ["q7-rises", "from eighty percent to eighty-four", 84, pct(D.data.accuracy)],
  ["q7-concept", "stays under point oh two", 1, Number(Math.max(D.concept.psiX1, D.concept.psiX2, D.concept.psiPred) < 0.02)],
  ["q7-concept", "accuracy falls to sixty-one", 61, pct(D.concept.accuracy)],
  ["q9-example", "a slight shift scores point oh one", 0.01, r2(R.psi.openStable)],
  ["q9-example", "a large one, one point four", 1.4, r1(R.psi.openDrifted)],
  ["q9-noise", "a window of a hundred values scores over point one almost half the time", 1, Number(R.psiNoise.bySize["100"].over01 > 0.4 && R.psiNoise.bySize["100"].over01 < 0.5)],
  ["q9-noise", "A window of a thousand: never, in two thousand tries", 0, R.psiNoise.bySize["1000"].over01],
  ["q9-noise", "A window of a thousand: never, in two thousand tries", 2000, R.psiNoise.tries],
  ["q9-edges", "a fifth of values", 0.2, R.psiEdges.beyond / R.psiEdges.window],
  ["q9-edges", "closed edges read point oh three", 0.03, r2(R.psiEdges.closed)],
  ["q9-edges", "Open ones read point two five", 0.25, r2(R.psiEdges.open)],
  ["q11-canary", "one to five percent", 5, 5],
];
for (const [id, words, means, value] of said) {
  if (!beat(id).includes(words)) problems.push(`${id}: no longer says "${words}"`);
  if (Math.abs(means - value) > 1e-9 * Math.max(1, Math.abs(means))) problems.push(`${id}: "${words}" is ${means}, computed ${value}`);
}
// Twelve numbered aloud in order, and five quick ones.
const WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const aloud = script.beats
  .map((b) => b.text.match(/^Questions? ([a-z]+)(?: and ([a-z]+))?\./))
  .filter(Boolean)
  .flatMap((m) => [m[1], m[2]].filter(Boolean));
if (aloud.join() !== WORDS.join()) problems.push(`the questions read aloud are ${aloud.join(", ")}`);
const quick = script.beats.filter((b) => b.id.startsWith("r-")).length;
if (quick !== 5) problems.push(`the quick round has ${quick} answers, not five`);
if (!beat("plan").includes("Twelve questions are worked through here, and five go quickly")) problems.push("plan: the count changed");
R.said = said.map(([beatId, words, means]) => ({ beat: beatId, words, means }));

console.log(JSON.stringify(R, (k, v) => (Array.isArray(v) && v.length > 12 ? `[${v.length} items]` : v), 1));
writeFileSync(join(here, "results.json"), `${JSON.stringify(R, null, 2)}\n`);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.error(`ok: ${QUOTES.length} quotes on the pages, ${said.length} numbers said`);
