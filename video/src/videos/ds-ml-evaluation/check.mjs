// Measures every number and every curve the ds-ml-evaluation video shows, in
// Pyodide 314.0.7 with scikit-learn 1.8.0 and NumPy, the runtime the Data
// Scientist machine learning page's blocks run in the reader's browser, and
// writes what came back to results.json, which data.ts reads. Every random
// draw is seeded, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/ds-ml-evaluation/check.mjs
//
// Data is either a set scikit-learn bundles (the breast cancer and diabetes
// sets, the moons), the page's own arrays (the regression metrics), or the
// video's own simulation, marked as such below and in script.ts:
//   - a sine wave with noise, for bias, variance and the learning curves;
//   - two overlapping Gaussian classes, 2% positive, for every
//     classification metric. Logistic regression is the right model for
//     that shape, so the plain fit starts out calibrated and every
//     miscalibration on screen is one the video caused on purpose.
// Gradient descent repeats the page's own chart (charts/gradient-descent-lr):
// x² from 8, at rates 0.004, 0.25 and 1.05.
/* global console */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scikit-learn"] });

const out = py.runPython(`
import json, sys, warnings
import numpy as np
import sklearn
warnings.filterwarnings("ignore")
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.datasets import load_breast_cancer, load_diabetes, make_moons
from sklearn.linear_model import ElasticNet, Lasso, LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score, average_precision_score, mean_absolute_error, mean_squared_error,
    precision_recall_curve, precision_score, r2_score, recall_score, roc_auc_score, roc_curve,
)
from sklearn.model_selection import (
    RepeatedStratifiedKFold, ShuffleSplit, StratifiedKFold, cross_val_score, learning_curve, train_test_split,
)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.tree import DecisionTreeClassifier

r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)
R = {"runtime": {"python": sys.version.split()[0], "sklearn": sklearn.__version__, "numpy": np.__version__}}

# ── Hook: an unpruned tree on the moons, half of 600 points held out ──
X, y = make_moons(n_samples=600, noise=0.35, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.5, random_state=0)
tree = DecisionTreeClassifier(random_state=0).fit(Xtr, ytr)
R["hook"] = {"n": 600, "train": r3(tree.score(Xtr, ytr)), "test": r3(tree.score(Xte, yte))}

# ── Bias and variance: twenty noisy points from a sine (the video's own) ──
P = np.polynomial.Polynomial
rng = np.random.default_rng(2)
x = rng.uniform(0, 1, 20)
ys = np.sin(2 * np.pi * x) + rng.normal(0, 0.3, 20)
xv = rng.uniform(0, 1, 2000)
yv = np.sin(2 * np.pi * xv) + rng.normal(0, 0.3, 2000)
grid = np.linspace(0, 1, 161)
fits = {d: P.fit(x, ys, d) for d in range(1, 10)}
R["bias"] = {
    "points": [[r4(a), r4(b)] for a, b in zip(x, ys)],
    "curves": {str(d): [r4(v) for v in fits[d](grid)] for d in (1, 3, 9)},
    "grid": [r4(g) for g in grid],
    "degrees": list(range(1, 10)),
    "train": [r3(np.mean((fits[d](x) - ys) ** 2)) for d in range(1, 10)],
    "val": [r3(np.mean((fits[d](xv) - yv) ** 2)) for d in range(1, 10)],
}

# ── L1 and L2 on the diabetes set, standardized ──
D = load_diabetes()
Xd = StandardScaler().fit_transform(D.data)
yd = D.target
alphas = np.logspace(-1, 1.7, 41)
lasso_paths = [Lasso(alpha=a, max_iter=100000).fit(Xd, yd).coef_ for a in alphas]
# Ridge's penalty is on the summed loss and the lasso's on the mean, so the
# axis is "penalty strength" with no units, and ridge is scaled by n to span it.
ridge_paths = [Ridge(alpha=a * len(yd)).fit(Xd, yd).coef_ for a in alphas]
pick = 1.0
# Elastic net mostly L1 with a little L2: enough L2 to share the weight
# between the two correlated cholesterol measures, enough L1 to still zero
# a feature out. (At half and half, s1 sits at -0.24, on the edge of zero.)
mix = 0.9
la = Lasso(alpha=pick, max_iter=100000).fit(Xd, yd)
en = ElasticNet(alpha=pick, l1_ratio=mix, max_iter=100000).fit(Xd, yd)
ri = Ridge(alpha=pick * len(yd)).fit(Xd, yd)
names = list(D.feature_names)

# Steadiness: refit both on fifty resamples of the patients, and count how
# often each keeps both cholesterol measures, only one, or neither.
def pair_counts(make, seed=0, B=50):
    g = np.random.default_rng(seed)
    c = {"both": 0, "s1": 0, "s2": 0, "neither": 0}
    for _ in range(B):
        i = g.integers(0, len(yd), len(yd))
        w = make().fit(Xd[i], yd[i]).coef_
        a, b = w[4] != 0, w[5] != 0
        c["both" if a and b else "s1" if a else "s2" if b else "neither"] += 1
    return c

boot = {
    "n": 50,
    "lasso": pair_counts(lambda: Lasso(alpha=pick, max_iter=100000)),
    "enet": pair_counts(lambda: ElasticNet(alpha=pick, l1_ratio=mix, max_iter=100000)),
}
R["reg"] = {
    "features": names,
    "logAlpha": [r3(np.log10(a)) for a in alphas],
    "lasso": [[r3(c) for c in row] for row in lasso_paths],
    "ridge": [[r3(c) for c in row] for row in ridge_paths],
    "pickLog": r3(np.log10(pick)),
    "lassoKept": int((la.coef_ != 0).sum()),
    "ridgeKept": int((ri.coef_ != 0).sum()),
    "enetKept": int((en.coef_ != 0).sum()),
    "lassoDropped": [names[i] for i in np.where(la.coef_ == 0)[0]],
    "enetDropped": [names[i] for i in np.where(en.coef_ == 0)[0]],
    "enetL1Ratio": mix,
    "s1s2": r3(np.corrcoef(Xd[:, 4], Xd[:, 5])[0, 1]),
    "lassoS1S2": [r3(la.coef_[4]), r3(la.coef_[5])],
    "enetS1S2": [r3(en.coef_[4]), r3(en.coef_[5])],
    "boot": boot,
}

# ── Cross-validation on the breast cancer set ──
Xb, yb = load_breast_cancer(return_X_y=True)
model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
splits = []
for s in range(200):
    a, b, c, d = train_test_split(Xb, yb, test_size=0.2, random_state=s)
    splits.append(model.fit(a, c).score(b, d))
splits = np.array(splits)
folds = cross_val_score(model, Xb, yb, cv=StratifiedKFold(5, shuffle=True, random_state=0))
# The same five-fold average, over two hundred reshuffles of the folds: how
# far the estimate itself moves, beside how far one split does.
reps = cross_val_score(model, Xb, yb, cv=RepeatedStratifiedKFold(n_splits=5, n_repeats=200, random_state=0))
means = reps.reshape(200, 5).mean(1)
R["cv"] = {
    "rows": int(len(yb)),
    "test": 114,
    "splits": [r4(v) for v in splits],
    "min": r3(splits.min()),
    "max": r3(splits.max()),
    "folds": [r3(v) for v in folds],
    "mean": r3(folds.mean()),
    "std": r3(folds.std()),
    "means": [r4(v) for v in means],
    "meansMin": r3(means.min()),
    "meansMax": r3(means.max()),
    "splitsSd": r4(splits.std()),
    "meansSd": r4(means.std()),
}

# ── Learning curves: 600 points from the same sine, twenty shuffles each ──
rng = np.random.default_rng(5)
xl = rng.uniform(0, 1, 600)
yl = np.sin(2 * np.pi * xl) + rng.normal(0, 0.3, 600)
sizes = [30, 45, 70, 100, 150, 250, 420]
learn = {"sizes": sizes, "noise": 0.09}
for d in (1, 9):
    est = make_pipeline(PolynomialFeatures(d, include_bias=False), StandardScaler(), LinearRegression())
    _, tr, va = learning_curve(est, xl[:, None], yl, cv=ShuffleSplit(20, test_size=0.3, random_state=0),
                               train_sizes=sizes, scoring="neg_mean_squared_error")
    learn[str(d)] = {"train": [r3(-v) for v in tr.mean(1)], "val": [r3(-v) for v in va.mean(1)]}
R["learn"] = learn

# ── Classification: two Gaussian classes in four features, 2% positive ──
def make(npos, nneg, seed, sep=2.2, d=4):
    g = np.random.default_rng(seed)
    mu = np.full(d, sep / np.sqrt(d))
    Xc = np.vstack([g.normal(0, 1, (nneg, d)), g.normal(0, 1, (npos, d)) + mu])
    return Xc, np.r_[np.zeros(nneg), np.ones(npos)]

Xtr, ytr = make(400, 19600, 1)
Xte, yte = make(4000, 196000, 2)
plain = LogisticRegression().fit(Xtr, ytr)
p = plain.predict_proba(Xte)[:, 1]
weighted = LogisticRegression(class_weight="balanced").fit(Xtr, ytr)
pw = weighted.predict_proba(Xte)[:, 1]
recal = CalibratedClassifierCV(LogisticRegression(class_weight="balanced"), method="sigmoid", cv=5).fit(Xtr, ytr)
pc = recal.predict_proba(Xte)[:, 1]

def pr_at(scores, t):
    flagged = scores >= t
    return {"t": t, "precision": r3(precision_score(yte, flagged, zero_division=0)),
            "recall": r3(recall_score(yte, flagged)), "flagged": int(flagged.sum())}

def thin(xs, ys, n=90):
    # Keep the curve's shape at a drawable size: evenly spaced along its length.
    xs, ys = np.asarray(xs), np.asarray(ys)
    seg = np.hypot(np.diff(xs), np.diff(ys))
    s = np.r_[0, np.cumsum(seg)]
    keep = sorted(set(np.searchsorted(s, np.linspace(0, s[-1], n)).clip(0, len(xs) - 1)))
    return [[r4(xs[i]), r4(ys[i])] for i in keep]

g = np.random.default_rng(3)
pos = np.where(yte == 1)[0]
neg = g.choice(np.where(yte == 0)[0], len(pos), replace=False)
bal = np.r_[pos, neg]
fpr, tpr, _ = roc_curve(yte, p)
fprb, tprb, _ = roc_curve(yte[bal], p[bal])
prec, rec, _ = precision_recall_curve(yte, p)
precb, recb, _ = precision_recall_curve(yte[bal], p[bal])
ts = np.round(np.linspace(0.02, 0.98, 49), 2)

def cal(scores):
    obs, pred = calibration_curve(yte, scores, n_bins=10)
    counts = np.histogram(scores, bins=np.linspace(0, 1, 11))[0]
    return {"pred": [r3(v) for v in pred], "obs": [r3(v) for v in obs], "counts": [int(c) for c in counts if c > 0]}

R["cls"] = {
    "train": int(len(ytr)),
    "test": int(len(yte)),
    "positives": int(yte.sum()),
    "prevalence": r3(yte.mean()),
    "thresholds": [pr_at(p, t) for t in (0.8, 0.5, 0.2, 0.05)],
    "curve": [[float(t), r3(precision_score(yte, p >= t, zero_division=1)), r3(recall_score(yte, p >= t))] for t in ts],
    "roc": thin(fpr, tpr),
    "rocBalanced": thin(fprb, tprb),
    "pr": thin(rec[::-1], prec[::-1]),
    "prBalanced": thin(recb[::-1], precb[::-1]),
    "auc": r3(roc_auc_score(yte, p)),
    "ap": r3(average_precision_score(yte, p)),
    "aucBalanced": r3(roc_auc_score(yte[bal], p[bal])),
    "apBalanced": r3(average_precision_score(yte[bal], p[bal])),
    # PR's chance level is the share positive: on the real test set, and on
    # the balanced one.
    "prevalenceBalanced": r3(yte[bal].mean()),
    # Why a low false positive rate can flatter: at 0.05, the false alarms
    # outnumber the catches, yet are a small share of every negative.
    "alarms": (lambda f: {"t": 0.05, "tp": int((f & (yte == 1)).sum()), "fp": int((f & (yte == 0)).sum()),
                          "negatives": int((yte == 0).sum()), "fpr": r4((f & (yte == 0)).sum() / (yte == 0).sum()),
                          "recall": r3((f & (yte == 1)).sum() / yte.sum())})(p >= 0.05),
    "allNegative": r3(accuracy_score(yte, np.zeros_like(yte))),
    "accuracy": r3(accuracy_score(yte, p >= 0.5)),
    "plainAt50": pr_at(p, 0.5),
    "weightedAt50": pr_at(pw, 0.5),
    "calPlain": cal(p),
    "calWeighted": cal(pw),
    "calRecal": cal(pc),
}

# ── Gradient descent on x², the page's chart ──
def descend(lr, steps=26, start=8.0):
    xs, v = [], start
    for _ in range(steps):
        xs.append(v)
        v -= lr * 2 * v
    return xs

R["gd"] = {"start": 8, "steps": 26, "runs": {str(lr): [r4(v) for v in descend(lr)] for lr in (0.004, 0.25, 1.05)}}

# ── Rapid round ──
yt = np.array([3.0, 5.0, 2.5, 7.0, 4.0])
yp = np.array([2.8, 5.2, 3.0, 6.5, 4.1])
R["metrics"] = {
    "true": yt.tolist(), "pred": yp.tolist(),
    "rmse": r3(np.sqrt(mean_squared_error(yt, yp))),
    "mae": r3(mean_absolute_error(yt, yp)),
    "r2": r3(r2_score(yt, yp)),
}
pp = np.round(np.linspace(0.01, 0.99, 99), 2)
R["loss"] = {
    "p": [float(v) for v in pp],
    "xent": [r3(-np.log(v)) for v in pp],
    "sq": [r3((1 - v) ** 2) for v in pp],
    "at": 0.01,
    "xentAt": r3(-np.log(0.01)),
    "sqAt": r3((1 - 0.01) ** 2),
    # How hard each loss pushes on the logit z behind a sigmoid, p = sigmoid(z),
    # at that same prediction: cross-entropy's slope is p - 1, squared error's
    # 2 (p - 1) p (1 - p), which the sigmoid's own flat end squeezes to almost
    # nothing.
    "xentGrad": r3(abs(0.01 - 1)),
    "sqGrad": r3(abs(2 * (0.01 - 1) * 0.01 * (1 - 0.01))),
}

json.dumps(R)
`);

const results = JSON.parse(out);
writeFileSync(join(here, "results.json"), JSON.stringify(results, null, 1) + "\n");
console.log(JSON.stringify(results.runtime));
const { hook, bias, reg, cv, learn, cls, metrics, loss } = results;
console.log("hook", hook);
console.log("bias train", bias.train, "val", bias.val);
console.log("reg kept", reg.lassoKept, reg.ridgeKept, reg.enetKept, reg.lassoDropped, reg.enetDropped, "s1s2", reg.s1s2, reg.lassoS1S2, reg.enetS1S2);
console.log("reg boot", JSON.stringify(reg.boot));
console.log("cv", cv.min, cv.max, cv.folds, cv.mean, cv.std, "means", cv.meansMin, cv.meansMax, "sd", cv.splitsSd, cv.meansSd);
console.log("learn", JSON.stringify(learn));
console.log("cls", cls.prevalence, cls.positives, "auc", cls.auc, cls.ap, "bal", cls.aucBalanced, cls.apBalanced, "acc", cls.allNegative, cls.accuracy);
console.log("thresholds", JSON.stringify(cls.thresholds));
console.log("at50", JSON.stringify(cls.plainAt50), JSON.stringify(cls.weightedAt50));
console.log("chance", cls.prevalence, cls.prevalenceBalanced, "alarms", JSON.stringify(cls.alarms));
console.log("cal", JSON.stringify(cls.calPlain), JSON.stringify(cls.calWeighted), JSON.stringify(cls.calRecal));
console.log("metrics", metrics.rmse, metrics.mae, metrics.r2, "loss", loss.xentAt, loss.sqAt, "grad", loss.xentGrad, loss.sqGrad);
