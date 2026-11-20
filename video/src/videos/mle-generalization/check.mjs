// Measures every number, curve and table the mle-generalization video shows,
// in Pyodide 314.0.7 with scikit-learn and NumPy, the runtime the Machine
// Learning Engineer pages' blocks run in the reader's browser, and writes
// what came back to results.json, which data.ts reads. Every random draw is
// seeded, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/mle-generalization/check.mjs
//
// Data is either the page's own (content/interview/machine-learning-engineer/
// ml-fundamentals.mdx: its train/validation/test split, its lasso and ridge
// block, its five-fold block, its precision/recall/F1 and ROC-AUC/PR-AUC
// blocks), scikit-learn's Friedman #1 benchmark (ten inputs, five of which
// matter), or the video's own simulations, which the narration calls
// simulations:
//   - two hundred rows of ten thousand random columns with coin-flip labels
//     (the opening, and the leakage question);
//   - five hundred training sets drawn from a known curve, for the
//     bias-variance decomposition;
//   - coin-flip labels on the page's split, for the selection question;
//   - sixty users with eight rows each, for grouped folds;
//   - a fraud-like problem, one transaction in a hundred positive.
//
// Then it fails (exit 1) if a page stops saying what the narration quotes
// from it, if the page's blocks stop printing what the page says they print,
// or if the narration stops saying, in words, the numbers measured here.
/* global console, process */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "pandas", "scikit-learn"] });

const out = py.runPython(String.raw`
import json, math, sys, warnings
import numpy as np
import sklearn
warnings.filterwarnings("ignore")
from sklearn.datasets import make_classification, make_friedman1, make_regression
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import Lasso, LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (average_precision_score, confusion_matrix, f1_score, precision_recall_curve,
                             precision_score, recall_score, roc_auc_score, roc_curve)
from sklearn.model_selection import (GroupKFold, KFold, RepeatedStratifiedKFold, ShuffleSplit, StratifiedKFold,
                                     cross_val_score, learning_curve, train_test_split)
from sklearn.neural_network import MLPRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

r2 = lambda v: round(float(v), 2)
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)
R = {"runtime": {"python": sys.version.split()[0], "sklearn": sklearn.__version__, "numpy": np.__version__}}

# ── The opening and question six: random columns, coin-flip labels ──
# Two hundred rows, ten thousand columns of standard normal noise, labels
# drawn 0/1 at random. "Leaky" picks the twenty columns most related to the
# label (ANOVA F) on all two hundred rows, then cross-validates on them;
# "honest" does the same pick inside each fold, on its training rows only.
# Ten repeats of stratified five-fold, so the score is not one split's luck.
rng = np.random.default_rng(0)
Xn = rng.standard_normal((200, 10000)); yn = rng.integers(0, 2, 200)
cvn = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=0)
cols = SelectKBest(f_classif, k=20).fit(Xn, yn).get_support(indices=True)
leaky = cross_val_score(LogisticRegression(max_iter=1000), Xn[:, cols], yn, cv=cvn)
honest = cross_val_score(make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression(max_iter=1000)), Xn, yn, cv=cvn)
# The same on twenty other draws (plain five-fold), so the opening is not a
# lucky draw: every leaky score is far above a coin flip.
draws = []
for s in range(1, 21):
    rs = np.random.default_rng(s)
    Xs_ = rs.standard_normal((200, 10000)); ys_ = rs.integers(0, 2, 200)
    cv5 = StratifiedKFold(5, shuffle=True, random_state=0)
    c_ = SelectKBest(f_classif, k=20).fit(Xs_, ys_).get_support(indices=True)
    a_ = cross_val_score(LogisticRegression(max_iter=1000), Xs_[:, c_], ys_, cv=cv5).mean()
    b_ = cross_val_score(make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression(max_iter=1000)), Xs_, ys_, cv=cv5).mean()
    draws.append([r3(a_), r3(b_)])
# The page's own example of leakage, a scaler fitted on every row before
# splitting, on the page's own data and five-fold block.
Xp, yp = make_classification(n_samples=200, n_features=10, random_state=42)
kf = KFold(n_splits=5, shuffle=True, random_state=42)
R["leak"] = {
    "rows": 200, "columns": 10000, "kept": 20, "positives": int(yn.sum()),
    "leaky": r3(leaky.mean()), "honest": r3(honest.mean()), "folds": int(len(leaky)),
    "leakyFolds": [r3(v) for v in leaky], "honestFolds": [r3(v) for v in honest],
    "draws": draws,
    "scalerLeaky": r3(cross_val_score(LogisticRegression(), StandardScaler().fit_transform(Xp), yp, cv=kf).mean()),
    "scalerHonest": r3(cross_val_score(make_pipeline(StandardScaler(), LogisticRegression()), Xp, yp, cv=kf).mean()),
}

# ── Question one: the bias-variance decomposition, measured ──
# A known curve, sin(2 pi x) on [0, 1], noise sd 0.3 (so the noise term is
# 0.09). Five hundred training sets of fifty points; a regression tree of each
# depth fitted to each. At 99 points across the curve: bias squared is the
# squared gap between the average prediction and the curve, variance is the
# spread of the predictions around their average, and the expected squared
# error on a fresh point is measured directly, to check the three add up.
truth = lambda x: np.sin(2 * np.pi * x)
SIGMA = 0.3
xg = np.linspace(0.01, 0.99, 99)
X0 = 0.25  # the curve's peak, where truth is 1: the dartboard
def decomp(n, depths, reps, seed):
    rs = np.random.default_rng(seed)
    preds = {d: np.zeros((reps, len(xg))) for d in depths}
    at0 = {d: np.zeros(reps) for d in depths}
    for r in range(reps):
        x = rs.uniform(0, 1, n); y = truth(x) + rs.normal(0, SIGMA, n)
        for d in depths:
            m = DecisionTreeRegressor(max_depth=d, random_state=0).fit(x[:, None], y)
            preds[d][r] = m.predict(xg[:, None]); at0[d][r] = m.predict([[X0]])[0]
    fresh = truth(xg)[None, :] + rs.normal(0, SIGMA, (reps, len(xg)))
    rows = []
    for d in depths:
        P = preds[d]
        b2 = float(((P.mean(0) - truth(xg)) ** 2).mean()); v = float(P.var(0).mean())
        rows.append({"depth": d, "bias2": r4(b2), "variance": r4(v), "noise": r4(SIGMA ** 2),
                     "sum": r4(b2 + v + SIGMA ** 2), "measured": r4(((P - fresh) ** 2).mean())})
    return rows, at0
small, at0 = decomp(50, list(range(1, 13)), 500, seed=1)
big, _ = decomp(500, [1, 3, 6], 200, seed=2)
best = min(small, key=lambda r: r["sum"])
R["bias"] = {
    "n": 50, "reps": 500, "sigma": SIGMA, "noise": r4(SIGMA ** 2), "x0": X0, "truthAt0": r3(truth(X0)),
    "curve": [[r3(x), r3(truth(x))] for x in xg],
    "rows": small, "best": best["depth"],
    "tenfold": {"n": 500, "reps": 200, "rows": big},
    "dart": {str(d): {"first": [r3(v) for v in at0[d][:60]], "mean": r3(at0[d].mean()), "sd": r3(at0[d].std())} for d in [1, 6]},
    "worstGap": r4(max(abs(r["sum"] - r["measured"]) for r in small)),
}

# ── Questions two and three: learning curves on Friedman #1 ──
# y = 10 sin(pi x1 x2) + 20 (x3 - 0.5)^2 + 10 x4 + 5 x5 + noise (sd 1), with
# x6..x10 pure noise. Ten shuffles at each training size, 30% held out.
Xf, yf = make_friedman1(n_samples=3000, noise=1.0, random_state=0)
SIZES = [30, 60, 120, 250, 500, 1000, 2000]
lcv = ShuffleSplit(n_splits=10, test_size=0.3, random_state=0)
def lc(model):
    s, tr, va = learning_curve(model, Xf, yf, train_sizes=SIZES, cv=lcv, scoring="neg_mean_squared_error")
    return {"sizes": [int(v) for v in s], "train": [r3(-v) for v in tr.mean(1)], "validation": [r3(-v) for v in va.mean(1)]}
# Underfitting's fix: the same straight line with two engineered features, a
# product of two inputs and a square, trained on 2,000 rows, tested on 1,000.
eng = lambda X: np.column_stack([X, X[:, 0] * X[:, 1], X[:, 2] ** 2])
mse = lambda m, A, b: r3(((m.predict(A) - b) ** 2).mean())
plain = LinearRegression().fit(Xf[:2000], yf[:2000])
engm = LinearRegression().fit(eng(Xf[:2000]), yf[:2000])
R["fit"] = {
    "noise": 1.0, "varianceOfY": r3(yf.var()),
    "tree": lc(DecisionTreeRegressor(random_state=0)), "linear": lc(LinearRegression()),
    "plain": mse(plain, Xf[2000:], yf[2000:]), "engineered": mse(engm, eng(Xf[2000:]), yf[2000:]),
}

# ── Question four: the page's lasso and ridge block ──
X2, y2 = make_regression(n_samples=200, n_features=20, n_informative=5, random_state=42)
X2c, y2c, true_coef = make_regression(n_samples=200, n_features=20, n_informative=5, random_state=42, coef=True)
assert np.array_equal(X2, X2c) and np.array_equal(y2, y2c)
X_train, X_test, y_train, y_test = train_test_split(X2, y2, test_size=0.2, random_state=42)
ridge = Ridge(alpha=1.0).fit(X_train, y_train)
lasso = Lasso(alpha=0.1).fit(X_train, y_train)
informative = sorted(int(i) for i in np.flatnonzero(true_coef))
useless = [i for i in range(20) if i not in informative]
R["reg"] = {
    "features": 20, "informative": informative,
    "ridgeNonZero": int((ridge.coef_ != 0).sum()), "lassoNonZero": int((lasso.coef_ != 0).sum()),
    "lassoKept": sorted(int(i) for i in np.flatnonzero(lasso.coef_)),
    "ridge": [r2(v) for v in ridge.coef_], "lasso": [r2(v) for v in lasso.coef_], "true": [r2(v) for v in true_coef],
    "ridgeUselessMaxAbs": r2(np.abs(ridge.coef_[useless]).max()),
    "ridgeUselessMedianAbs": r2(np.median(np.abs(ridge.coef_[useless]))),
    "lassoSample": [r2(v) for v in lasso.coef_[:10]],
}

# ── Question five: the page's split, and what choosing on a set does to it ──
X_train, X_test, y_train, y_test = train_test_split(Xp, yp, test_size=0.2, random_state=42)
X_train, X_val, y_train, y_val = train_test_split(X_train, y_train, test_size=0.25, random_state=42)
sizes = [len(X_train), len(X_val), len(X_test)]
# Coin-flip labels on the same rows and the same split, so every model's true
# accuracy is 50%. Fifty trees with random settings; keep the one with the best
# validation score; score that one once on the test rows. Two hundred repeats.
def trial(seed):
    rs = np.random.default_rng(seed)
    yr = rs.integers(0, 2, 200)
    Xtr, Xte, ytr, yte = train_test_split(Xp, yr, test_size=0.2, random_state=42)
    Xtr, Xva, ytr, yva = train_test_split(Xtr, ytr, test_size=0.25, random_state=42)
    vals, tests = [], []
    for i in range(50):
        m = DecisionTreeClassifier(max_depth=int(rs.integers(1, 8)), min_samples_leaf=int(rs.integers(1, 10)),
                                   max_features=float(rs.uniform(0.3, 1)), random_state=i).fit(Xtr, ytr)
        vals.append(m.score(Xva, yva)); tests.append(m.score(Xte, yte))
    b = int(np.argmax(vals))
    return vals, vals[b], tests[b]
trials = [trial(s) for s in range(200)]
R["split"] = {
    "sizes": sizes, "settings": 50, "repeats": 200,
    "winnerVal": [r3(t[1]) for t in trials], "winnerTest": [r3(t[2]) for t in trials],
    "meanWinnerVal": r3(np.mean([t[1] for t in trials])), "meanWinnerTest": r3(np.mean([t[2] for t in trials])),
    "first": {"val": [r3(v) for v in trials[0][0]], "winnerVal": r3(trials[0][1]), "winnerTest": r3(trials[0][2])},
}

# ── Question seven: the page's five folds, and folds that split a user ──
scores = cross_val_score(LogisticRegression(), Xp, yp, cv=kf, scoring="accuracy")
# Sixty users, eight rows each. Each user's rows sit close together (their
# own device, habits), and the label belongs to the user, drawn at random, so
# nothing in the features predicts the label of a user the model hasn't met.
rg = np.random.default_rng(7)
USERS, ROWS = 60, 8
centers = rg.normal(0, 1, (USERS, 6)); ulabel = rg.integers(0, 2, USERS)
Xg = np.repeat(centers, ROWS, axis=0) + rg.normal(0, 0.15, (USERS * ROWS, 6))
yg = np.repeat(ulabel, ROWS); groups = np.repeat(np.arange(USERS), ROWS)
forest = RandomForestClassifier(n_estimators=200, random_state=0)
R["cv"] = {
    "folds": [r3(v) for v in scores], "mean": r3(scores.mean()), "std": r3(scores.std()),
    "printed": f"CV accuracy: {scores.mean():.3f} ± {scores.std():.3f}",
    "users": USERS, "rowsPerUser": ROWS,
    "shuffled": r3(cross_val_score(forest, Xg, yg, cv=KFold(5, shuffle=True, random_state=0)).mean()),
    "grouped": r3(cross_val_score(forest, Xg, yg, cv=GroupKFold(5), groups=groups).mean()),
}

# ── Questions eight to ten: the page's blocks, then a fraud-like model ──
y_true = [1, 1, 0, 1, 0, 0, 1, 0]; y_pred = [1, 0, 0, 1, 0, 1, 1, 0]
tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
yt8 = [0, 0, 1, 1, 0, 1, 0, 1]; ys8 = [0.1, 0.4, 0.35, 0.8, 0.2, 0.9, 0.05, 0.7]
R["page"] = {
    "precision": r3(precision_score(y_true, y_pred)), "recall": r3(recall_score(y_true, y_pred)), "f1": r3(f1_score(y_true, y_pred)),
    "tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn),
    "rocAuc": r3(roc_auc_score(yt8, ys8)), "prAuc": r3(average_precision_score(yt8, ys8)),
}
# 200,000 transactions, 20 features (6 informative, 2 redundant), 1% fraud,
# no label noise; a logistic regression trained on the first half, scored on
# the second.
Xq, yq = make_classification(n_samples=200000, n_features=20, n_informative=6, n_redundant=2, weights=[0.99],
                             flip_y=0, class_sep=1.0, random_state=3)
Xtr, ytr, Xte, yte = Xq[:100000], yq[:100000], Xq[100000:], yq[100000:]
plainm = LogisticRegression(max_iter=2000).fit(Xtr, ytr)
p = plainm.predict_proba(Xte)[:, 1]
weighted = LogisticRegression(max_iter=2000, class_weight="balanced").fit(Xtr, ytr)
pw = weighted.predict_proba(Xte)[:, 1]
def at(probs, t):
    flag = probs >= t
    tp_ = int((flag & (yte == 1)).sum()); fp_ = int((flag & (yte == 0)).sum())
    return {"t": t, "precision": r3(tp_ / max(1, tp_ + fp_)), "recall": r3(tp_ / int(yte.sum())),
            "fpr": r4(fp_ / int((yte == 0).sum())), "tp": tp_, "fp": fp_, "flagged": int(flag.sum())}
fpr_, tpr_, _ = roc_curve(yte, p)
prec_, rec_, thr_ = precision_recall_curve(yte, p)
keep = lambda n, k: sorted(set(np.linspace(0, n - 1, k).round().astype(int).tolist()))
top = np.argsort(-p)[:1000]
grid = [round(t, 2) for t in np.linspace(0.01, 0.99, 99)]
R["fraud"] = {
    "test": int(len(yte)), "fraud": int(yte.sum()), "legit": int((yte == 0).sum()), "rate": r4(yte.mean()),
    "allLegitAccuracy": r4(1 - yte.mean()), "accuracy": r4(((p >= 0.5) == yte).mean()),
    "rocAuc": r3(roc_auc_score(yte, p)), "prAuc": r3(average_precision_score(yte, p)),
    "thresholds": [at(p, t) for t in [0.5, 0.3, 0.2, 0.1, 0.05]],
    "sweep": [[t, at(p, t)["precision"], at(p, t)["recall"]] for t in grid],
    "roc": [[r4(fpr_[i]), r4(tpr_[i])] for i in keep(len(fpr_), 240)],
    "pr": [[r4(rec_[i]), r4(prec_[i])] for i in keep(len(rec_), 240)],
    "top1000": {"flagged": 1000, "caught": int(yte[top].sum()), "precision": r3(yte[top].mean())},
    "weighted": {"meanProbability": r3(pw.mean()), "plainMeanProbability": r4(p.mean()),
                 "at": at(pw, 0.5), "rocAuc": r3(roc_auc_score(yte, pw)), "prAuc": r3(average_precision_score(yte, pw))},
}

# ── Quick: early stopping, on a small network ──
# One hidden layer of 300 units, no weight penalty, trained on 150 rows of
# Friedman #1 one epoch at a time; validation is 1,000 other rows. With a
# patience of p, training stops at the first epoch that has gone p epochs
# without a new best, and the best epoch's weights are the ones kept.
net = MLPRegressor(hidden_layer_sizes=(300,), alpha=0.0, learning_rate_init=0.01, batch_size=32, random_state=0)
tr_l, va_l = [], []
for ep in range(400):
    net.partial_fit(Xf[:150], yf[:150])
    tr_l.append(float(((net.predict(Xf[:150]) - yf[:150]) ** 2).mean()))
    va_l.append(float(((net.predict(Xf[2000:]) - yf[2000:]) ** 2).mean()))
def stopping(patience):
    best_ep, best_v = 0, float("inf")
    for e, v in enumerate(va_l):
        if v < best_v:
            best_v, best_ep = v, e
        elif e - best_ep >= patience:
            return {"patience": patience, "best": best_ep + 1, "bestValidation": r3(best_v), "stop": e + 1}
    return {"patience": patience, "best": best_ep + 1, "bestValidation": r3(best_v), "stop": None}
R["early"] = {
    "epochs": 400, "train": [r3(v) for v in tr_l], "validation": [r3(v) for v in va_l],
    "short": stopping(20), "long": stopping(50),
    "globalBest": int(np.argmin(va_l)) + 1, "globalBestValidation": r3(min(va_l)),
    "endValidation": r3(va_l[-1]), "endTrain": r3(tr_l[-1]),
}

# ── Quick: what one outlier does to RMSE and MAE ──
# Forty-nine ordinary absolute residuals (|normal, sd 3|) and one swept from
# 0 to 40, as on the page's chart, with this video's own seed.
base = np.abs(np.random.default_rng(606).normal(0, 3, 49))
sweep = []
for o in np.linspace(0, 40, 81):
    rr = np.append(base, o)
    sweep.append([r2(o), r3(np.abs(rr).mean()), r3(np.sqrt((rr ** 2).mean()))])
R["errors"] = {"n": 50, "sweep": sweep, "start": sweep[0], "end": sweep[-1]}

json.dumps(R)
`);

const R = JSON.parse(out);
writeFileSync(join(here, "results.json"), JSON.stringify(R) + "\n");
const brief = (o) => JSON.stringify(o, (k, v) => (Array.isArray(v) && v.length > 12 ? `[${v.length} items]` : v));
for (const k of Object.keys(R)) console.log(k, brief(R[k]));

// ── What the narration quotes, still on the pages ──────────────────────────
const page = (file) => readFileSync(join(here, "../../../../content/interview/machine-learning-engineer", file), "utf8");
const problems = [];
const quotes = [
  ["ml-fundamentals.mdx", "### Explain the bias–variance trade-off."],
  ["statistics-and-probability.mdx", "### Explain the bias–variance decomposition."],
  ["statistics-and-probability.mdx", "is noise you\ncan't remove"],
  ["ml-fundamentals.mdx", "### Why split data into train / validation / test?"],
  ["ml-fundamentals.mdx", "**test** is touched **once** for a final, honest\nestimate"],
  ["ml-fundamentals.mdx", "yielding a 60/20/20 train/validation/test partition"],
  ["ml-fundamentals.mdx", "### What is data leakage, and how do you prevent it?"],
  ["ml-fundamentals.mdx", "fitting a scaler on the **full** dataset before splitting"],
  ["ml-fundamentals.mdx", "or using a feature that's a proxy for the label"],
  ["ml-fundamentals.mdx", "on the **training split only** and auditing features for target leakage"],
  ["ml-fundamentals.mdx", "### What is k-fold cross-validation and when do you use it?"],
  ["ml-fundamentals.mdx", "Use it when data is too limited to\nhold out a dedicated validation set"],
  ["ml-fundamentals.mdx", "### What is overfitting and how do you combat it?"],
  ["ml-fundamentals.mdx", "getting more data,\nreducing model capacity, adding L1/L2 regularization, using dropout or\nbatch normalization, applying data augmentation, and using early stopping"],
  ["ml-fundamentals.mdx", "### What is underfitting?"],
  ["ml-fundamentals.mdx", "increasing model capacity, training longer, reducing regularization\nstrength, and engineering better features"],
  ["ml-fundamentals.mdx", "### L1 vs L2 regularization?"],
  ["ml-fundamentals.mdx", "Elastic net mixes\nboth"],
  ["ml-fundamentals.mdx", "### Explain early stopping."],
  ["ml-fundamentals.mdx", "(the patience)"],
  ["ml-fundamentals.mdx", "### What are precision, recall, and F1-score?"],
  ["ml-fundamentals.mdx", "Choose precision when false positives are\ncostly; choose recall when false negatives are"],
  ["ml-fundamentals.mdx", "### What is ROC-AUC and when does PR-AUC matter more?"],
  ["ml-fundamentals.mdx", "the probability that the model\nranks a random positive above a random negative"],
  ["ml-fundamentals.mdx", "because FPR\nstays low even with many false positives"],
  ["ml-fundamentals.mdx", "### What is the difference between RMSE, MAE, and R²?"],
  ["ml-fundamentals.mdx", "It can be negative\nwhen the model is worse than the baseline"],
  ["ml-fundamentals.mdx", "### What is class imbalance and how do you handle it?"],
  ["ml-fundamentals.mdx", "oversample\nthe minority (SMOTE) or undersample the majority; apply class weights in\nthe loss function; or use anomaly detection framing for extreme imbalance"],
];
for (const [file, phrase] of quotes) if (!page(file).includes(phrase)) problems.push(`${file} no longer says: ${phrase.replace(/\n/g, " ")}`);

// The page's blocks print what the page says they print.
if (R.split.sizes.join() !== "120,40,40") problems.push(`the page's split is ${R.split.sizes.join("/")}, not 120/40/40`);
if (R.reg.ridgeNonZero !== 20) problems.push(`ridge keeps ${R.reg.ridgeNonZero} of 20`);
if (R.reg.lassoKept.join() !== R.reg.informative.join()) problems.push(`lasso keeps ${R.reg.lassoKept}, the informative are ${R.reg.informative}`);
if (R.bias.worstGap > 0.005) problems.push(`bias + variance + noise misses the measured error by ${R.bias.worstGap}`);

// ── The numbers the narration says, in words ─────────────────────────────────
const { script } = await import(pathToFileURL(join(here, "script.ts")).href);
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const whole = (n) => {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${whole(n % 100)}` : ""}`;
  return `${whole(Math.floor(n / 1000))} thousand${n % 1000 ? (n % 1000 < 100 ? ` and ${whole(n % 1000)}` : ` ${whole(n % 1000)}`) : ""}`;
};
/** 0.14 -> "point one four"; 0.2 -> "point two" (digits as said, trailing zeros as given). */
const point = (s) => `point ${[...s.split(".")[1]].map((d) => (d === "0" ? "oh" : ONES[Number(d)])).join(" ")}`;
const pct = (v) => whole(Math.round(v * 100));
const text = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`script.ts has no beat "${id}"`);
  return b.text.toLowerCase();
};
const B = R.bias;
const d1 = B.rows[0], d3 = B.rows.find((r) => r.depth === B.best), d12 = B.rows.at(-1);
const big1 = B.tenfold.rows[0], big12 = B.tenfold.rows.at(-1);
const T = (t) => R.fraud.thresholds.find((x) => x.t === t);
const claims = [
  ["hook", `${pct(R.leak.leaky)} percent`],
  ["leak-hook", pct(R.leak.leaky)],
  ["leak-hook", `scores ${pct(R.leak.honest)}`],
  ["leak-forms", `${pct(R.leak.scalerLeaky)} percent either way`],
  ["bias-sim", "five hundred training sets of fifty points"],
  ["bias-sum", point(d1.sum.toFixed(2))],
  ["bias-sum", `${point(d1.bias2.toFixed(2))} bias`],
  ["bias-sum", `${point(d1.variance.toFixed(2))} variance`],
  ["bias-sum", `${point(d1.noise.toFixed(2))} noise`],
  ["bias-sum", `depth ${whole(B.best)} is lowest, at ${point(d3.sum.toFixed(2))}`],
  ["bias-sum", `climbs back to ${point(d12.sum.toFixed(2))}`],
  ["bias-data", `from ${point(d12.variance.toFixed(2))} to ${point(big12.variance.toFixed(2))}`],
  ["bias-data", `stays at ${point(big1.bias2.toFixed(2))}`],
  ["fit-curves", `still falling at ${whole(SIZESMAX())} rows`],
  ["under-fix", `from six point ${Math.round(R.fit.plain * 10) % 10 === 9 ? "nine" : "?"}`],
  ["under-fix", `to ${whole(Math.floor(R.fit.engineered))} point ${ONES[Math.round(R.fit.engineered * 10) % 10]}`],
  ["reg-run", `keeps all ${whole(R.reg.ridgeNonZero)}`],
  ["reg-run", `exactly the ${whole(R.reg.lassoNonZero)}`],
  ["split", "a hundred and twenty"],
  ["split-sim", `averages ${pct(R.split.meanWinnerVal)} percent`],
  ["split-sim", `and ${pct(R.split.meanWinnerTest)} on the test set`],
  ["cv-run", `from ${pct(Math.min(...R.cv.folds))} to eighty-seven and a half`],
  ["cv-run", "seventy-nine and a half"],
  ["cv-groups", `${pct(R.cv.shuffled)} percent`],
  ["cv-groups", `it scores ${pct(R.cv.grouped)}`],
  ["pr-page", point(R.page.f1.toFixed(3).replace(/0+$/, ""))],
  ["pr-thresh", `precision is ${pct(T(0.5).precision)} percent and recall ${pct(T(0.5).recall)}`],
  ["pr-thresh", `${pct(T(0.1).precision)} and ${pct(T(0.1).recall)}`],
  ["pr-cost", `${whole(R.fraud.top1000.caught)} of the ${whole(R.fraud.fraud)}`],
  ["auc-fraud", point(R.fraud.rocAuc.toFixed(2))],
  ["auc-fraud", "a thousand false alarms"],
  ["auc-pr", point(R.fraud.prAuc.toFixed(2))],
  ["imb", `${pct(R.fraud.allLegitAccuracy)} percent`],
  ["imb-trap", `from ${pct(T(0.5).recall)} percent to ${pct(R.fraud.weighted.at.recall)}`],
  ["imb-trap", `${pct(R.fraud.weighted.meanProbability)} percent likely`],
  ["imb-trap", `from ${point(R.fraud.prAuc.toFixed(2))} to ${point(R.fraud.weighted.prAuc.toFixed(2))}`],
  ["r-early", `epoch ${whole(R.early.best)}`],
  ["r-early", `stops at ${whole(R.early.stop)}`],
];
function SIZESMAX() {
  return R.fit.tree.sizes.at(-1);
}
for (const [id, phrase] of claims) if (!text(id).includes(phrase)) problems.push(`script.ts "${id}" no longer says "${phrase}"`);

// Facts the narration rests on, beyond its words.
const t01 = T(0.1);
if (!(t01.fp > 950 && t01.fp < 1050)) problems.push(`"a thousand false alarms": ${t01.fp}`);
if (!(t01.fp / t01.tp > 1.7 && t01.fp / t01.tp < 2)) problems.push(`"nearly twice the frauds caught": ${t01.fp} against ${t01.tp}`);
if (!(t01.fpr > 0.0095 && t01.fpr < 0.0105)) problems.push(`"at one percent": the false positive rate at 0.1 is ${t01.fpr}`);
if (R.fit.tree.train.some((v) => v !== 0)) problems.push("the unpruned tree's training error is not zero at every size");
const tv = R.fit.tree.validation;
if (!(tv.at(-1) < tv.at(-2))) problems.push("the tree's validation error is no longer falling at the largest size");
if (Math.abs(R.fit.linear.validation.at(-1) - 7) > 0.5 || Math.abs(R.fit.linear.train.at(-1) - 7) > 0.5) problems.push(`the line's curves end at ${R.fit.linear.train.at(-1)} and ${R.fit.linear.validation.at(-1)}, not near seven`);
if (R.leak.draws.some(([a, b]) => a < 0.7 || b > 0.6)) problems.push(`a draw where the leak is not dramatic: ${JSON.stringify(R.leak.draws)}`);
if (R.reg.ridgeUselessMaxAbs >= 0.25) problems.push(`ridge's useless weights reach ${R.reg.ridgeUselessMaxAbs}, not under a quarter`);

for (const p of problems) console.error(p);
if (problems.length) process.exit(1);
console.error("ok: every quoted phrase is on the page, and every measured number is said");
