// Measures every number, path, boundary and curve the mle-models video shows,
// in Pyodide 314.0.7 with scikit-learn and NumPy, the runtime the Machine
// Learning Engineer pages' blocks run in the reader's browser, and writes what
// came back to results.json, which data.ts reads. Every random draw is seeded,
// so a rerun writes the same file (the three SVM fit times excepted: they are
// measured, once, and only their ratio is said). From the repo root:
//
//   node video/src/videos/mle-models/check.mjs
//
// Data is the page's own where it has some (content/interview/
// machine-learning-engineer/ml-fundamentals.mdx: its gradient-descent rows,
// its logistic regression and PCA blocks on make_classification, its one-hot
// block), a set scikit-learn bundles or generates (handwritten digits, two
// noisy rings, Friedman #1, stretched blobs), or the video's own simulations,
// which the narration calls simulations:
//   - customers' age in years and income in dollars, equally predictive, for
//     the neighbours' vote and for scaling;
//   - two features where the label lies along the low-variance direction, for
//     PCA's trap.
//
// Then it fails (exit 1) if a page stops saying what the narration quotes,
// if the page's blocks stop printing what the page says they print, or if the
// narration stops saying, in words, the numbers measured here.
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
import itertools, json, math, sys, time, warnings
import numpy as np
import sklearn
warnings.filterwarnings("ignore")
from sklearn.cluster import KMeans
from sklearn.datasets import load_digits, make_blobs, make_circles, make_classification, make_friedman1
from sklearn.decomposition import PCA
from sklearn.ensemble import BaggingClassifier, GradientBoostingRegressor, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

r2 = lambda v: round(float(v), 2)
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)
R = {"runtime": {"python": sys.version.split()[0], "sklearn": sklearn.__version__, "numpy": np.__version__}}

# ── The opening and question four: the page's logistic regression block ──
X, y = make_classification(n_samples=200, n_features=10, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
clf = LogisticRegression(max_iter=1000)
clf.fit(X_train_scaled, y_train)
y_pred = clf.predict(X_test_scaled)
y_prob = clf.predict_proba(X_test_scaled)[:, 1]
R["logit"] = {
    "accuracy": r3(accuracy_score(y_test, y_pred)), "first5": [r3(v) for v in y_prob[:5]],
    "printed": [f"Accuracy: {accuracy_score(y_test, y_pred):.3f}", f"First 5 probabilities: {y_prob[:5].round(3)}"],
    "parameters": int(clf.coef_.size + clf.intercept_.size), "weights": [r2(v) for v in clf.coef_[0]], "bias": r2(clf.intercept_[0]),
    "trainRows": int(X_train_scaled.shape[0]), "features": int(X_train_scaled.shape[1]), "testRows": int(len(y_test)),
    "knnStores": int(X_train_scaled.size),
}

# ── Questions one to three: the page's gradient-descent rows ──
rng = np.random.default_rng(42)
X_raw = rng.standard_normal((100, 2))
Xg = np.hstack([np.ones((100, 1)), X_raw])  # add bias column
true_theta = np.array([1.0, 2.0, -1.0])
yg = Xg @ true_theta + rng.standard_normal(100) * 0.1
def gradient_descent(X, y, lr=0.01, epochs=500):
    theta = np.zeros(X.shape[1])
    n = len(y)
    for _ in range(epochs):
        grad = (X.T @ (X @ theta - y)) / n
        theta -= lr * grad
    return theta
theta_hat = gradient_descent(Xg, yg)
ols = np.linalg.lstsq(Xg, yg, rcond=None)[0]
loss = lambda th: float(((Xg @ th - yg) ** 2).mean())
def full_run(lr, epochs, X=Xg, y=yg):
    th = np.zeros(X.shape[1]); path = [th.copy()]; L = [float(((X @ th - y) ** 2).mean())]
    for _ in range(epochs):
        th = th - lr * (X.T @ (X @ th - y)) / len(y)
        path.append(th.copy()); L.append(float(((X @ th - y) ** 2).mean()))
        if not np.isfinite(th).all() or np.abs(th).max() > 1e8:
            break
    return th, path, L
def settle(lr, X=Xg, y=yg, tol=1e-3, cap=200000):
    best = np.linalg.lstsq(X, y, rcond=None)[0]; th = np.zeros(X.shape[1])
    for e in range(cap):
        th = th - lr * (X.T @ (X @ th - y)) / len(y)
        if not np.isfinite(th).all() or np.abs(th).max() > 1e8:
            return None
        if np.linalg.norm(th - best) < tol:
            return e + 1
    return None
H = Xg.T @ Xg / 100
eig = np.linalg.eigvalsh(H)
_, page_path, page_loss = full_run(0.01, 500)
_, _, div_loss = full_run(2.5, 30)
_, fast_path, fast_loss = full_run(0.9, 30)
R["gd"] = {
    "rows": 100, "true": [1.0, 2.0, -1.0], "learned": [r3(v) for v in theta_hat], "ols": [r3(v) for v in ols],
    "printed": f"Learned theta: {theta_hat.round(3)}",
    "lossPage": [r4(v) for v in page_loss], "lossFast": [r4(v) for v in fast_loss], "lossDiverge": [r3(v) for v in div_loss], "divergeRate": 2.5,
    "eigenvalues": [r4(v) for v in eig], "limit": r3(2 / eig.max()),
    "settle": {str(lr): settle(lr) for lr in [0.01, 0.1, 0.5, 0.9, 1.5, 1.9]}, "diverges": {str(lr): settle(lr) is None for lr in [2.0, 2.05, 2.5]},
    "minLoss": r4(loss(ols)),
    # The bowl the video draws over (theta1, theta2): the loss's curvature in
    # the two weights with the bias held at its best, so a contour of loss L
    # is (d^T H d) = L - minLoss around the least-squares answer.
    "bowl": [[r4(v) for v in row] for row in H[1:, 1:]],
    # The page's run in (theta1, theta2), every tenth step.
    "pagePath": [[r3(p[1]), r3(p[2])] for p in page_path[::10]],
}
# Batch, mini-batch and single-row steps: thirty updates each at one rate,
# from zeros, rows shuffled each pass (seed 0). Path in (theta1, theta2).
def sgd(bs, lr, updates, seed=0, schedule=None):
    rs = np.random.default_rng(seed); th = np.zeros(3); path = [th[1:].copy()]; k = 0
    while k < updates:
        idx = rs.permutation(100)
        for s in range(0, 100, bs):
            if k >= updates:
                break
            b = idx[s:s + bs]
            eta = lr if schedule is None else schedule(k, updates, lr)
            th = th - eta * Xg[b].T @ (Xg[b] @ th - yg[b]) / len(b)
            path.append(th[1:].copy()); k += 1
    return th, path
batch = {}
for name, bs in [("batch", 100), ("mini", 10), ("single", 1)]:
    th, path = sgd(bs, 0.1, 30)
    batch[name] = {"rows": bs, "path": [[r3(a), r3(b)] for a, b in path], "rowsRead": 30 * bs,
                   "distance": r3(np.linalg.norm(th - ols))}
R["batch"] = {"rate": 0.1, "updates": 30, "runs": batch, "target": [r3(ols[1]), r3(ols[2])]}
# The learning-rate range test: one run of batches of ten, the rate rising
# from 1e-4 to 10 over a hundred steps; the loss after each step.
rs = np.random.default_rng(0); th = np.zeros(3); lrs = np.logspace(-4, 1, 100); rt = []; k = 0
for e in range(10):
    idx = rs.permutation(100)
    for s in range(0, 100, 10):
        b = idx[s:s + 10]; th = th - lrs[k] * Xg[b].T @ (Xg[b] @ th - yg[b]) / 10
        rt.append([float(f"{lrs[k]:.4g}"), r4(min(loss(th), 1e6))]); k += 1
lowest = min(rt, key=lambda r: r[1])
blowup = next(r for r in rt if r[0] > lowest[0] and r[1] > 10 * rt[0][1])
# Decay: single rows for twenty passes at 0.1, constant against a cosine to
# zero, twenty seeds each: the mean distance left from the best answer.
cosine = lambda k, T, lr: lr * 0.5 * (1 + math.cos(math.pi * k / T))
def ends(schedule):
    return float(np.mean([np.linalg.norm(sgd(1, 0.1, 2000, seed=s, schedule=schedule)[0] - ols) for s in range(20)]))
WARM, STEPS = 50, 1000
shape = [[k, r4(1.0 * (k / WARM) if k < WARM else 0.5 * (1 + math.cos(math.pi * (k - WARM) / (STEPS - WARM))))] for k in range(0, STEPS + 1, 10)]
R["lr"] = {
    "range": rt, "lowest": lowest, "blowup": blowup,
    "constant": r4(ends(None)), "cosine": r4(ends(cosine)), "decayPasses": 20,
    "schedule": shape, "warmup": WARM, "steps": STEPS,
}

# ── Question five: cross-entropy against squared error, from a bad start ──
# The page's logistic model, started at minus twice its fitted weights, so it
# is confidently wrong; full-batch gradient descent at 0.5, on the 160 scaled
# training rows. Squared error is the mean of (p - y)^2, whose gradient on the
# score is 2 (p - y) p (1 - p); cross-entropy's is p - y.
sig = lambda z: 1 / (1 + np.exp(-z))
w0 = clf.coef_[0].copy(); b0 = float(clf.intercept_[0])
def train(kind, steps=3000, lr=0.5, target=0.85):
    w = -2 * w0; b = -2 * b0; acc = []; hit = None
    for t in range(steps):
        p = sig(X_train_scaled @ w + b)
        g = (p - y_train) if kind == "ce" else 2 * (p - y_train) * p * (1 - p)
        w = w - lr * X_train_scaled.T @ g / len(g); b = b - lr * g.mean()
        a = float(((sig(X_train_scaled @ w + b) > 0.5) == y_train).mean()); acc.append(a)
        if hit is None and a >= target:
            hit = t + 1
    return acc, hit
p0 = sig(X_train_scaled @ (-2 * w0) - 2 * b0)
ce_acc, ce_hit = train("ce"); mse_acc, mse_hit = train("mse")
R["ce"] = {
    "start": r3(((p0 > 0.5) == y_train).mean()), "target": 0.85, "rate": 0.5,
    "ceSteps": ce_hit, "mseSteps": mse_hit,
    "ceAccuracy": [r3(v) for v in ce_acc[:1500]], "mseAccuracy": [r3(v) for v in mse_acc[:1500]],
}

# ── Questions six, seven and nine: customers' age and income ──
# The video's own simulation: 1,000 customers, age uniform 20 to 70 years,
# income uniform 20,000 to 150,000 dollars; the label depends on the two
# equally (each standardized), plus noise.
rc = np.random.default_rng(5)
n = 1000
age = rc.uniform(20, 70, n); income = rc.uniform(20000, 150000, n)
za = (age - 45) / 14.4; zi = (income - 85000) / 37500
lab = ((za + zi + rc.normal(0, 0.5, n)) > 0).astype(int)
Xc = np.column_stack([age, income])
K = 15
cv5 = lambda m, A: r3(cross_val_score(m, A, lab, cv=5).mean())
Zc = StandardScaler().fit_transform(Xc)
# The vote: the first point on a coarse sweep, in standardized units, whose
# fifteen nearest neighbours split 11 to 4, inside the cloud.
vote = None
for qa in np.linspace(-1, 1, 21):
    for qi in np.linspace(-1, 1, 21):
        d = np.sqrt(((Zc - [qa, qi]) ** 2).sum(1)); nn = np.argsort(d)[:K]; ones = int(lab[nn].sum())
        if vote is None and ones in (4, 11):
            vote = {"q": [r3(qa), r3(qi)], "qAge": r2(45 + 14.4 * qa), "qIncome": int(round(85000 + 37500 * qi, -2)),
                    "neighbors": [int(i) for i in nn], "ones": ones, "zeros": K - ones, "radius": r3(d[nn[-1]])}
R["knn"] = {
    "k": K, "rows": n, "age": [r2(v) for v in age], "income": [int(v) for v in income], "label": [int(v) for v in lab],
    "z": [[r3(a), r3(b)] for a, b in Zc], "vote": vote,
    "raw": cv5(KNeighborsClassifier(K), Xc), "scaled": cv5(make_pipeline(StandardScaler(), KNeighborsClassifier(K)), Xc),
    "incomeOnly": cv5(KNeighborsClassifier(K), Xc[:, [1]]), "ageOnly": cv5(KNeighborsClassifier(K), Xc[:, [0]]),
}
# Ten million rows, said as arithmetic: a logistic model on these ten
# features is still eleven numbers; nearest neighbours keeps every row
# (10,000,000 x 10 float32 = 400 MB) and measures every one per prediction.
R["serving"] = {"rows": 10_000_000, "features": 10, "bytes": 10_000_000 * 10 * 4, "logisticNumbers": 11, "distancesPerPrediction": 10_000_000}

# ── Question eight: support vector machines on two noisy rings ──
Xr, yr = make_circles(n_samples=2000, noise=0.2, factor=0.5, random_state=0)
Xrtr, Xrte, yrtr, yrte = train_test_split(Xr, yr, test_size=0.5, random_state=0)
lin = SVC(kernel="linear").fit(Xrtr, yrtr); rbf = SVC(kernel="rbf").fit(Xrtr, yrtr)
gx = np.linspace(-1.6, 1.6, 64); G = np.array([[a, b] for b in gx for a in gx])
grid = lambda m: ["".join(str(int(v)) for v in row) for row in m.predict(G).reshape(64, 64)]
svs = {}
for m_ in [200, 2000, 20000]:
    Xm, ym = make_circles(n_samples=m_, noise=0.2, factor=0.5, random_state=0)
    svs[str(m_)] = int(SVC().fit(Xm, ym).n_support_.sum())
times = {}
for m_ in [4000, 8000, 16000]:
    Xm, ym = make_circles(n_samples=m_, noise=0.2, factor=0.5, random_state=0)
    t0 = time.perf_counter(); SVC().fit(Xm, ym); times[str(m_)] = round(time.perf_counter() - t0, 3)
R["svm"] = {
    "linear": r3(lin.score(Xrte, yrte)), "rbf": r3(rbf.score(Xrte, yrte)),
    "x": [r2(v) for v in Xrtr[:400, 0]], "y": [r2(v) for v in Xrtr[:400, 1]], "label": [int(v) for v in yrtr[:400]],
    "support": [int(i) for i in rbf.support_ if i < 400], "range": [-1.6, 1.6], "gridLinear": grid(lin), "gridRbf": grid(rbf),
    "supportVectors": svs, "fitSeconds": times,
    "doubling": [r2(times["8000"] / times["4000"]), r2(times["16000"] / times["8000"])],
}

# ── Question nine: one column a hundred times larger, under gradient descent ──
def steps_at_best(X):
    ev = np.linalg.eigvalsh(X.T @ X / len(yg))
    return {"steps": settle(1 / ev.max(), X=X, cap=300000), "rate": float(f"{1 / ev.max():.3g}"),
            "limit": float(f"{2 / ev.max():.3g}"), "condition": float(f"{ev.max() / ev.min():.4g}")}
Xu = Xg.copy(); Xu[:, 1] *= 100
R["scale"] = {"asIs": steps_at_best(Xg), "times100": steps_at_best(Xu)}

# ── Question ten: the page's PCA block, and variance that isn't signal ──
pca = PCA(n_components=2)
X_2d = pca.fit_transform(X_train_scaled)
full = PCA().fit(X_train_scaled).explained_variance_ratio_
# The video's own simulation: 600 points, a long axis of pure noise (sd 3) and
# a short one (sd 0.5) that carries the label, turned 30 degrees.
rp = np.random.default_rng(8)
big = rp.normal(0, 3, 600); small = rp.normal(0, 0.5, 600)
plab = (small + rp.normal(0, 0.1, 600) > 0).astype(int)
ang = np.deg2rad(30); Rot = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]])
Xt = np.column_stack([big, small]) @ Rot.T
pt = PCA().fit(Xt); Zt = pt.transform(Xt)
acc = lambda cols: r3(cross_val_score(LogisticRegression(), Zt[:, cols], plab, cv=5).mean())
R["pca"] = {
    "ratio": [r3(v) for v in pca.explained_variance_ratio_], "total": r3(pca.explained_variance_ratio_.sum()),
    "printed": f"Total variance captured: {pca.explained_variance_ratio_.sum():.1%}",
    "full": [r3(v) for v in full], "zero": int((full < 1e-6).sum()),
    "trap": {"x": [r2(v) for v in Xt[:, 0]], "y": [r2(v) for v in Xt[:, 1]], "label": [int(v) for v in plab],
             "ratio": [r3(v) for v in pt.explained_variance_ratio_], "components": [[r3(a), r3(b)] for a, b in pt.components_],
             "first": acc([0]), "second": acc([1]), "both": acc([0, 1])},
}

# ── Questions eleven and twelve: one tree, bagged trees, a forest ──
# scikit-learn's handwritten digits: 1,797 images of 8 x 8 pixels; 30% held
# out, stratified. Three hundred trees each; accuracy of the first n.
Xd, yd = load_digits(return_X_y=True)
Xdt, Xde, ydt, yde = train_test_split(Xd, yd, test_size=0.3, random_state=0, stratify=yd)
tree = DecisionTreeClassifier(random_state=0).fit(Xdt, ydt)
bag = BaggingClassifier(DecisionTreeClassifier(), n_estimators=300, random_state=0).fit(Xdt, ydt)
forest = RandomForestClassifier(n_estimators=300, random_state=0).fit(Xdt, ydt)
def probs(model, i):
    est = model.estimators_[i]
    cols = model.estimators_features_[i] if hasattr(model, "estimators_features_") else slice(None)
    P = np.zeros((len(Xde), 10)); Pe = est.predict_proba(Xde[:, cols])
    for j, c in enumerate(est.classes_):
        P[:, int(c)] = Pe[:, j]
    return P
def curve(model):
    S = np.zeros((len(Xde), 10)); out = {}; single = []
    for i in range(len(model.estimators_)):
        P = probs(model, i); S += P; single.append(float((P.argmax(1) == yde).mean()))
        if i + 1 in (1, 2, 5, 10, 25, 50, 100, 200, 300):
            out[str(i + 1)] = r3((S.argmax(1) == yde).mean())
    return out, r3(np.mean(single))
bag_curve, bag_single = curve(bag); forest_curve, forest_single = curve(forest)
R["ensemble"] = {
    "images": int(len(yd)), "pixels": int(Xd.shape[1]), "tried": int(round(math.sqrt(Xd.shape[1]))), "test": int(len(yde)),
    "tree": r3(tree.score(Xde, yde)), "bagged": r3(bag.score(Xde, yde)), "forest": r3(forest.score(Xde, yde)),
    "baggedCurve": bag_curve, "forestCurve": forest_curve,
    "baggedSingle": bag_single, "forestSingle": forest_single,
    # The first image (a zero), and the eight pixels one split may try, drawn
    # at random (seeded) as a forest draws them: the square root of 64.
    "digit": [int(v) for v in Xd[0]], "digitLabel": int(yd[0]),
    "split": sorted(int(i) for i in np.random.default_rng(0).choice(64, 8, replace=False)),
    # The page's chart of the same formula: the variance of an average of n
    # equally correlated models, in units of one model's, at its correlations.
    "formula": {str(rho): [[k, r4(rho + (1 - rho) / k)] for k in range(1, 41)] for rho in (0.6, 0.3)},
}

# ── Question thirteen: gradient boosting's rate and its number of trees ──
Xf, yf = make_friedman1(n_samples=3000, noise=1.0, random_state=0)
Xtr, ytr, Xva, yva, Xte, yte = Xf[:1000], yf[:1000], Xf[1000:2000], yf[1000:2000], Xf[2000:], yf[2000:]
boost = {}
for rate in (1.0, 0.3, 0.1):
    gb = GradientBoostingRegressor(n_estimators=1000, learning_rate=rate, max_depth=3, random_state=0).fit(Xtr, ytr)
    va = [float(((p - yva) ** 2).mean()) for p in gb.staged_predict(Xva)]
    te = [float(((p - yte) ** 2).mean()) for p in gb.staged_predict(Xte)]
    b = int(np.argmin(va))
    boost[str(rate)] = {"validation": [r3(v) for v in va], "best": b + 1, "bestValidation": r3(va[b]),
                        "testAtBest": r3(te[b]), "atEnd": r3(va[-1])}
R["boost"] = {"trees": 1000, "depth": 3, "noise": 1.0, "runs": boost}

# ── Quick: k-means on round and on stretched clusters ──
Xb, yb = make_blobs(n_samples=600, centers=3, random_state=170)
Xs = Xb @ np.array([[0.6, -0.6], [-0.4, 0.8]])
def agree(labels):
    return max(sum(int(((labels == p[c]) & (yb == c)).sum()) for c in range(3)) for p in itertools.permutations(range(3))) / len(yb)
km_round = KMeans(3, n_init=10, random_state=0).fit(Xb); km_str = KMeans(3, n_init=10, random_state=0).fit(Xs)
R["kmeans"] = {
    "round": r3(agree(km_round.labels_)), "stretched": r3(agree(km_str.labels_)),
    "x": [r2(v) for v in Xs[:, 0]], "y": [r2(v) for v in Xs[:, 1]], "truth": [int(v) for v in yb], "assigned": [int(v) for v in km_str.labels_],
    "centers": [[r2(a), r2(b)] for a, b in km_str.cluster_centers_],
}

# ── Quick: the page's one-hot block, and a colour it never saw ──
enc = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
X_cat = np.array([["red"], ["green"], ["blue"], ["red"]])
encoded = enc.fit_transform(X_cat)
R["onehot"] = {
    "categories": [str(c) for c in enc.categories_[0]], "rows": [str(v[0]) for v in X_cat],
    "encoded": [[int(v) for v in r] for r in encoded], "purple": [int(v) for v in enc.transform([["purple"]])[0]],
}

json.dumps(R)
`);

const R = JSON.parse(out);
writeFileSync(join(here, "results.json"), JSON.stringify(R) + "\n");
const brief = (o) => JSON.stringify(o, (k, v) => (Array.isArray(v) && v.length > 12 ? `[${v.length} items]` : v));
for (const k of Object.keys(R)) console.log(k, brief(R[k]));

// ── What the narration quotes, still on the pages ──────────────────────────
const dir = join(here, "../../../../content/interview/machine-learning-engineer");
const page = (file) => readFileSync(join(dir, file), "utf8");
const problems = [];
const quotes = [
  ["ml-fundamentals.mdx", "### How does gradient descent work?"],
  ["ml-fundamentals.mdx", "### What is the difference between batch gradient descent, SGD, and mini-batch GD?"],
  ["ml-fundamentals.mdx", "(e.g., 32–512 examples)"],
  ["ml-fundamentals.mdx", "which can help escape local minima"],
  ["ml-fundamentals.mdx", "### How do you choose the learning rate?"],
  ["deep-learning.mdx", "### How do you choose and schedule the learning rate?"],
  ["deep-learning.mdx", "ramp up over the first few hundred steps to avoid early\ninstability"],
  ["deep-learning.mdx", "(step, cosine, or linear)"],
  ["deep-learning.mdx", "Adaptive optimizers reduce but don't eliminate\nthe need to tune the base rate"],
  ["ml-fundamentals.mdx", "### How does logistic regression work?"],
  ["ml-fundamentals.mdx", "It is trained by minimizing binary cross-entropy (log loss)"],
  ["ml-fundamentals.mdx", "Despite its name it is a\n**classification** model"],
  ["ml-fundamentals.mdx", "### What is cross-entropy loss and why is it preferred over MSE for classification?"],
  ["ml-fundamentals.mdx", "giving larger gradients\nwhen the model is wrong and confident"],
  ["ml-fundamentals.mdx", "### What is the difference between a parametric and a non-parametric model?"],
  ["ml-fundamentals.mdx", "**Non-parametric** models (kNN, kernel SVM)"],
  ["ml-fundamentals.mdx", "### How does k-nearest neighbours (kNN) work?"],
  ["ml-fundamentals.mdx", "scales poorly at inference"],
  ["ml-fundamentals.mdx", "### How does a support vector machine (SVM) work?"],
  ["ml-fundamentals.mdx", "Support vectors are the training points closest to the boundary"],
  ["ml-fundamentals.mdx", "slow on large datasets"],
  ["ml-fundamentals.mdx", "### What is feature scaling and why does it matter?"],
  ["ml-fundamentals.mdx", "Tree-based models are\nscale-invariant"],
  ["ml-fundamentals.mdx", "`X_val` and `X_test`, the discipline that prevents leakage"],
  ["ml-fundamentals.mdx", "### What is PCA and what does it do?"],
  ["ml-fundamentals.mdx", "decorrelating features"],
  ["ml-fundamentals.mdx", "### What are ensembles? Explain bagging and boosting."],
  ["ml-fundamentals.mdx", "but can overfit\nif not regularized"],
  ["ml-fundamentals.mdx", "### How does a Random Forest differ from a single decision tree?"],
  ["ml-fundamentals.mdx", "The\nrandomness decorrelates the trees"],
  ["ml-fundamentals.mdx", "### What is gradient boosting?"],
  ["ml-fundamentals.mdx", "Modern implementations (XGBoost, LightGBM,\nCatBoost) add column subsampling, row subsampling, L1/L2 regularization,\nand efficient histogram-based splitting"],
  ["ml-fundamentals.mdx", "### Supervised vs unsupervised vs reinforcement learning?"],
  ["ml-fundamentals.mdx", "### What loss functions are used for regression vs classification?"],
  ["ml-fundamentals.mdx", "Huber loss (combines both)"],
  ["ml-fundamentals.mdx", "hinge loss, contrastive loss, or\ntriplet loss"],
  ["ml-fundamentals.mdx", "### What is k-means clustering?"],
  ["ml-fundamentals.mdx", "spherical, equally-sized clusters"],
  ["ml-fundamentals.mdx", "### What is one-hot encoding?"],
  ["ml-fundamentals.mdx", "emit all-zeros for any category unseen at fit time"],
  ["ml-fundamentals.mdx", "### What is feature engineering?"],
  ["ml-fundamentals.mdx", "Good features often matter more than\nchoice of algorithm"],
  ["ml-fundamentals.mdx", "variance falls with the number of\nmodels onto a floor set by how correlated their errors are"],
];
for (const [file, phrase] of quotes) if (!page(file).includes(phrase)) problems.push(`${file} no longer says: ${phrase.replace(/\n/g, " ")}`);
// The page's ensemble chart, whose formula and correlations bag-floor draws.
const chart = readFileSync(join(here, "../../../../charts/ensemble-variance.mjs"), "utf8");
if (!chart.includes("variance: rho + (1 - rho) / n") || !chart.includes("const RHOS = [0, 0.3, 0.6];")) problems.push("charts/ensemble-variance.mjs no longer draws rho + (1 - rho) / n at 0.3 and 0.6");

// The page's blocks print what the page says they print.
if (R.onehot.encoded.map((r) => r.join("")).join() !== "001,010,100,001") problems.push(`one-hot rows are ${JSON.stringify(R.onehot.encoded)}, not the page's [[0,0,1], [0,1,0], [1,0,0], [0,0,1]]`);
if (!page("ml-fundamentals.mdx").includes("# [[0,0,1], [0,1,0], [1,0,0], [0,0,1]]")) problems.push("the page no longer comments its one-hot output");
if (R.onehot.purple.some((v) => v !== 0)) problems.push("purple does not encode as all zeros");
if (R.logit.parameters !== 11 || R.logit.trainRows !== 160) problems.push(`the logistic model has ${R.logit.parameters} numbers and ${R.logit.trainRows} training rows`);

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
/** "0.94" -> "point nine four"; "0.03" -> "point oh three". */
const point = (s) => `point ${[...s.split(".")[1]].map((d) => (d === "0" ? "oh" : ONES[Number(d)])).join(" ")}`;
/** 1.93 -> "one point nine three"; -0.94 -> "minus point nine four". */
const decimal = (v, places) => {
  const s = Math.abs(v).toFixed(places);
  const [i] = s.split(".");
  return `${v < 0 ? "minus " : ""}${i === "0" ? "" : `${whole(Number(i))} `}${point(s)}`;
};
const pct = (v) => whole(Math.round(v * 100));
const text = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`script.ts has no beat "${id}"`);
  return b.text.toLowerCase();
};
const L = R.gd.learned;
const vote = R.knn.vote;
const E = R.ensemble;
const B1 = R.boost.runs["1.0"], B01 = R.boost.runs["0.1"];
const claims = [
  ["hook", `all of it: ${whole(R.logit.parameters)} numbers`],
  ["hook", `every one of its ${whole(R.logit.trainRows).replace(/^one /, "")} training rows`],
  ["param-cost", `still ${whole(R.logit.parameters)} numbers`],
  ["param-in", `kept ${whole(R.logit.parameters)} numbers`],
  ["gd-run", `reach ${decimal(L[0], 2)}, ${decimal(L[1], 2)} and ${decimal(L[2], 2)}`],
  ["gd-run", "one, two and minus one"],
  ["gd-run", `${whole(R.gd.rows).replace(/^one /, "a ")} noisy rows`],
  ["batch-mini", "thirty-two to five hundred and twelve rows"],
  ["batch-run", `${whole(R.batch.updates)} steps each`],
  ["batch-run", `reads ${whole(R.batch.runs.batch.rowsRead)} rows`],
  ["batch-run", `read ${whole(R.batch.runs.single.rowsRead)}`],
  ["lr-band", "nearly twelve hundred steps"],
  ["lr-band", `at point nine, it settles in ${whole(R.gd.settle["0.9"])}`],
  ["lr-band", "past about two"],
  ["lr-range", "from about point five, and turns up at two"],
  ["lr-sched", `about ${point(R.lr.constant.toFixed(2))} from the best answer`],
  ["lr-sched", `about ${point(R.lr.cosine.toFixed(3))}`],
  ["logit-run", `scores ${pct(R.logit.accuracy)} percent on ${whole(R.logit.testRows)} held-out rows`],
  ["logit-run", `${point(R.logit.first5[0].toFixed(2))} and ${point(R.logit.first5[1].toFixed(2))}`],
  ["ce-run", `right on ${pct(R.ce.start)} percent of rows`],
  ["ce-run", `reaches ${pct(R.ce.target)} percent in ${whole(R.ce.ceSteps)} steps`],
  ["ce-run", `at the same rate, takes ${whole(R.ce.mseSteps)}`],
  ["knn", `${whole(R.knn.k)} neighbours vote ${whole(Math.max(vote.ones, vote.zeros))} to ${whole(Math.min(vote.ones, vote.zeros))}`],
  ["svm-kernel", `scores ${pct(R.svm.linear)} percent`],
  ["svm-kernel", `kernel, ${pct(R.svm.rbf)}`],
  ["svm-cost", `${whole(Math.round(R.svm.supportVectors["20000"] / 100) * 100)} of twenty thousand`],
  ["scale-knn", `scores ${R.knn.raw === 0.745 ? "seventy-four and a half" : pct(R.knn.raw)} percent`],
  ["scale-knn", `standardized, ${pct(R.knn.scaled)}`],
  ["scale-gd", `from ${whole(R.scale.asIs.steps)} steps to nearly eighty thousand`],
  ["pca-run", `keep ${pct(R.pca.total)} percent of the variance`],
  ["pca-run", `the last ${whole(R.pca.zero)} keep none`],
  ["pca-trap", `holds ${pct(R.pca.trap.ratio[0])} percent of the variance`],
  ["pca-trap", `the other ${pct(R.pca.trap.ratio[1])} percent predicts it at ${pct(R.pca.trap.second)}`],
  ["forest", `${whole(E.tried)} of the sixty-four pixels`],
  ["forest-run", `one tree scores ${pct(E.tree)} percent`],
  ["forest-run", `${pct(E.forestSingle)} percent against ${pct(E.baggedSingle)}`],
  ["forest-run", `score ${pct(E.forest)} against ${pct(E.bagged)}`],
  ["gb-rate", `lowest after ${whole(B1.best)} trees`],
  ["gb-rate", `until ${whole(B01.best)}`],
];
for (const [id, phrase] of claims) if (!text(id).includes(phrase)) problems.push(`script.ts "${id}" no longer says "${phrase}"`);

// Facts the narration rests on, beyond its words.
const fact = (ok, what) => ok || problems.push(what);
fact(R.gd.settle["0.01"] > 1100 && R.gd.settle["0.01"] < 1200, `"nearly twelve hundred steps": ${R.gd.settle["0.01"]}`);
fact(R.gd.limit > 1.9 && R.gd.limit < 2.05 && R.gd.diverges["2.0"] && R.gd.diverges["2.5"], `"past about two": limit ${R.gd.limit}, ${JSON.stringify(R.gd.diverges)}`);
fact(R.lr.lowest[0] > 0.4 && R.lr.lowest[0] < 0.7, `the range test bottoms out at ${R.lr.lowest[0]}, not "about point five"`);
const turn = R.lr.range.find((r) => r[0] > R.lr.lowest[0] && r[1] > 2 * R.lr.lowest[1] && r[0] > 1.5);
fact(turn && turn[0] > 1.8 && turn[0] < 2.2, `the range test turns up at ${turn && turn[0]}, not "at two"`);
fact(R.ce.ceSteps < R.ce.mseSteps / 5, "cross-entropy is not far quicker than squared error");
fact(R.knn.raw === R.knn.incomeOnly, `"exactly what income alone scores": ${R.knn.raw} against ${R.knn.incomeOnly}`);
fact(R.scale.times100.steps > 70000 && R.scale.times100.steps < 80000, `"nearly eighty thousand": ${R.scale.times100.steps}`);
fact(R.pca.trap.first < 0.6, `"barely better than a coin flip": ${R.pca.trap.first}`);
fact(R.svm.doubling.every((x) => x > 3), `"doubling the rows more than tripled the fit time": ${R.svm.doubling} (timings; rerun if this machine was busy)`);
fact(B01.bestValidation < B1.bestValidation / 2, `"less than half the error": ${B01.bestValidation} against ${B1.bestValidation}`);
fact(B1.atEnd > B1.bestValidation, "a rate of one does not overfit past its best");
fact(E.forestCurve["1"] < E.baggedCurve["1"] && E.forest > E.bagged, "the forest does not start below bagging and finish above it");
// "Single rows wander, get about as far": the three runs end
// within 0.2 of each other, from about 2.2 away.
const ends = Object.values(R.batch.runs).map((r) => r.distance);
fact(Math.max(...ends) - Math.min(...ends) < 0.2, `"about as far": the three runs end ${ends} from the answer`);
fact(text("batch-run").includes("get about as far"), `script.ts "batch-run" no longer says "get about as far"`);
// "Set the encoder to ignore unknowns": the page's encoder does.
fact(page("ml-fundamentals.mdx").includes('handle_unknown="ignore"'), `the page's one-hot block no longer sets handle_unknown="ignore", which "r-onehot" names`);
fact(text("r-onehot").includes("ignore unknowns"), `script.ts "r-onehot" no longer names the ignore setting`);
const wrong = 1 - R.kmeans.stretched;
fact(R.kmeans.round === 1 && wrong > 0.15 && wrong < 0.25, `"about one point in five lands wrong": ${wrong}`);

for (const p of problems) console.error(p);
if (problems.length) process.exit(1);
console.error("ok: every quoted phrase is on the page, and every measured number is said");
