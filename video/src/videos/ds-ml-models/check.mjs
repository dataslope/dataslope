// Measures every number, boundary and curve the ds-ml-models video shows, in
// Pyodide 314.0.7 with scikit-learn 1.8.0 and NumPy, the runtime the Data
// Scientist machine learning page's blocks run in the reader's browser, and
// writes what came back to results.json, which data.ts reads. Every random
// draw is seeded, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/ds-ml-models/check.mjs
//
// Data is either a set scikit-learn bundles (breast cancer, iris, wine, the
// moons and blobs generators), the page's own examples (k-means on three
// blobs, PCA on the scaled iris, one-hot colors, RFE keeping five), or the
// video's own simulation, marked as such below and in script.ts:
//   - a sine wave with noise, for bagging and boosting;
//   - a made-up customer table for the importance question, with a customer
//     ID that carries no signal at all.
// SHAP values are computed exactly, by brute force over every subset of the
// four features (the SHAP library is not in Pyodide), as interventional
// Shapley values against a background sample.
/* global console */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "pandas", "scikit-learn"] });

const out = py.runPython(`
import itertools, json, math, sys, warnings
import numpy as np
import sklearn
warnings.filterwarnings("ignore")
from sklearn.cluster import KMeans
from sklearn.datasets import load_breast_cancer, load_iris, load_wine, make_blobs, make_moons
from sklearn.decomposition import PCA
from sklearn.ensemble import BaggingRegressor, BaggingClassifier, GradientBoostingRegressor, RandomForestClassifier
from sklearn.feature_selection import RFE
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import mean_squared_error, silhouette_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
import pandas as pd

r2 = lambda v: round(float(v), 2)
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)
R = {"runtime": {"python": sys.version.split()[0], "sklearn": sklearn.__version__, "numpy": np.__version__}}

# ── The moons: the hook's three models and the k-nearest-neighbors question ──
X, y = make_moons(n_samples=300, noise=0.3, random_state=3)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=1/3, random_state=3, stratify=y)
LO = (-1.6, 2.6); HI = (-1.2, 1.7)
GX, GY = 84, 58
gx = np.linspace(LO[0], LO[1], GX); gy = np.linspace(HI[0], HI[1], GY)
G = np.array([[a, b] for b in gy for a in gx])
def grid(model):
    p = model.predict(G).reshape(GY, GX)
    return ["".join(str(int(v)) for v in row) for row in p]
R["moons"] = {
    "x": [r3(v) for v in Xtr[:, 0]], "y": [r3(v) for v in Xtr[:, 1]], "label": [int(v) for v in ytr],
    "xlim": LO, "ylim": HI, "nx": GX, "ny": GY, "nTrain": int(len(ytr)), "nTest": int(len(yte)),
}
hook = {}
for name, m in [("logistic", LogisticRegression()), ("tree", DecisionTreeClassifier(max_depth=4, random_state=0)), ("knn", KNeighborsClassifier(15))]:
    m.fit(Xtr, ytr)
    hook[name] = {"grid": grid(m), "test": r3(m.score(Xte, yte))}
R["hook"] = hook
knn = {}
for k in [1, 15, 75]:
    m = KNeighborsClassifier(k).fit(Xtr, ytr)
    knn[str(k)] = {"grid": grid(m), "train": r3(m.score(Xtr, ytr)), "test": r3(m.score(Xte, yte))}
R["knn"] = knn
# One new point, and its fifteen nearest training points: the vote. The first
# point on a coarse sweep whose vote is split, so both classes show up in it,
# in a crowded spot, so the fifteen sit close around it.
vote = None
for qx in np.linspace(-0.5, 1.5, 21):
    for qy in np.linspace(-0.5, 1.0, 16):
        d = np.sqrt(((Xtr - [qx, qy]) ** 2).sum(1))
        nn = np.argsort(d)[:15]
        ones = int(ytr[nn].sum())
        if vote is None and ones in (10, 11) and d[nn[-1]] < 0.35:
            vote = {"q": [r3(qx), r3(qy)], "neighbors": [int(i) for i in nn], "ones": ones, "zeros": 15 - ones,
                    "radius": r3(d[nn[-1]]), "predicted": int(KNeighborsClassifier(15).fit(Xtr, ytr).predict([[qx, qy]])[0])}
R["knnVote"] = vote

# ── Logistic regression on one feature: is the tumor malignant, by its radius ──
bc = load_breast_cancer()
radius = bc.data[:, list(bc.feature_names).index("mean radius")]
malignant = (bc.target == 0).astype(int)  # scikit-learn codes malignant as 0
lin = LinearRegression().fit(radius[:, None], malignant)
logit = LogisticRegression(C=1e6, max_iter=10000).fit(radius[:, None], malignant)
b0, b1 = float(logit.intercept_[0]), float(logit.coef_[0, 0])
lp = lin.predict(radius[:, None])
xs = np.linspace(6, 30, 97)
R["logit"] = {
    "n": int(len(radius)), "malignant": int(malignant.sum()),
    "radius": [r2(v) for v in radius], "label": [int(v) for v in malignant],
    "linA": r4(lin.intercept_), "linB": r4(lin.coef_[0]),
    "linBelow": int((lp < 0).sum()), "linAbove": int((lp > 1).sum()),
    "linAt": {str(v): r3(lin.predict([[v]])[0]) for v in [7, 28]},
    "b0": r3(b0), "b1": r3(b1), "oddsPerUnit": r3(math.exp(b1)),
    "curve": [[r2(x), r4(1 / (1 + math.exp(-(b0 + b1 * x))))] for x in xs],
    "line": [[r2(x), r4(lin.intercept_ + lin.coef_[0] * x)] for x in [6, 30]],
    "example": {"radius": 15, "z": r3(b0 + b1 * 15), "p": r3(1 / (1 + math.exp(-(b0 + b1 * 15))))},
    "half": r2(-b0 / b1),
}

# ── How a tree splits: iris versicolor against virginica, by petal width ──
iris = load_iris()
two = iris.target > 0
pw = iris.data[two, 3]; cls = (iris.target[two] == 2).astype(int)
def gini(lbl):
    if len(lbl) == 0:
        return 0.0
    p = lbl.mean()
    return 1 - p * p - (1 - p) * (1 - p)
vals = np.unique(pw)
cands = (vals[:-1] + vals[1:]) / 2
curve = []
for t in cands:
    L = cls[pw <= t]; Rr = cls[pw > t]
    w = (len(L) * gini(L) + len(Rr) * gini(Rr)) / len(cls)
    curve.append([r3(t), r4(w)])
best = min(curve, key=lambda c: c[1])
stump = DecisionTreeClassifier(max_depth=1, random_state=0).fit(pw[:, None], cls)
full = DecisionTreeClassifier(max_depth=1, random_state=0).fit(iris.data[two], cls)
t = best[0]
L = cls[pw <= t]; Rr = cls[pw > t]
R["tree"] = {
    "width": [r2(v) for v in pw], "label": [int(v) for v in cls],
    "parent": r3(gini(cls)), "curve": curve, "best": best,
    "sklearn": r3(stump.tree_.threshold[0]),
    "sklearnAll": {"feature": iris.feature_names[full.tree_.feature[0]], "threshold": r3(full.tree_.threshold[0])},
    "left": {"n": int(len(L)), "versicolor": int((L == 0).sum()), "virginica": int((L == 1).sum()), "gini": r3(gini(L))},
    "right": {"n": int(len(Rr)), "versicolor": int((Rr == 0).sum()), "virginica": int((Rr == 1).sum()), "gini": r3(gini(Rr))},
}
# The usual follow-up, "Gini or entropy?": the same sweep with entropy (in
# bits), and scikit-learn's own entropy stump over all four measurements.
def entropy(lbl):
    if len(lbl) == 0:
        return 0.0
    p = lbl.mean()
    return -sum(q * math.log2(q) for q in (p, 1 - p) if q > 0)
ecurve = []
for t in cands:
    L = cls[pw <= t]; Rr = cls[pw > t]
    ecurve.append([r3(t), r4((len(L) * entropy(L) + len(Rr) * entropy(Rr)) / len(cls))])
ebest = min(ecurve, key=lambda c: c[1])
efull = DecisionTreeClassifier(max_depth=1, criterion="entropy", random_state=0).fit(iris.data[two], cls)
R["tree"]["entropy"] = {
    "parent": r3(entropy(cls)), "best": ebest, "gain": r3(entropy(cls) - ebest[1]),
    "sklearnAll": {"feature": iris.feature_names[efull.tree_.feature[0]], "threshold": r3(efull.tree_.threshold[0])},
}

# ── Bagging and boosting: the video's own sine wave with noise ──
rng = np.random.default_rng(11)
xtr = np.sort(rng.uniform(0, 6, 60)); ytr_ = np.sin(xtr) + rng.normal(0, 0.35, 60)
xte = rng.uniform(0, 6, 2000); yte_ = np.sin(xte) + rng.normal(0, 0.35, 2000)
xg = np.linspace(0, 6, 241)
one = DecisionTreeRegressor(random_state=0).fit(xtr[:, None], ytr_)
bag = BaggingRegressor(DecisionTreeRegressor(), n_estimators=200, random_state=0).fit(xtr[:, None], ytr_)
gb = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=2, random_state=0).fit(xtr[:, None], ytr_)
mse = lambda m: r3(mean_squared_error(yte_, m.predict(xte[:, None])))
staged = list(gb.staged_predict(xg[:, None]))
staged_te = list(gb.staged_predict(xte[:, None]))
R["ens"] = {
    "x": [r3(v) for v in xtr], "y": [r3(v) for v in ytr_], "grid": [r3(v) for v in xg],
    "truth": [r3(np.sin(v)) for v in xg],
    "one": [r3(v) for v in one.predict(xg[:, None])],
    "trees": [[r3(v) for v in bag.estimators_[i].predict(xg[:, None])] for i in range(5)],
    "bag": [r3(v) for v in bag.predict(xg[:, None])],
    "stages": {str(s): [r3(v) for v in staged[s - 1]] for s in [1, 3, 10, 100]},
    "mse": {
        "one": mse(one), "bag": mse(bag), "gb": mse(gb),
        "stages": {str(s): r3(mean_squared_error(yte_, staged_te[s - 1])) for s in [1, 3, 10, 100]},
        "noise": r3(0.35 ** 2),
    },
}
# The first stage's residuals, which the second tree is fitted to.
p1 = gb.init_.predict(xtr[:, None]) if hasattr(gb.init_, "predict") else np.full(len(xtr), ytr_.mean())
s1 = next(gb.staged_predict(xtr[:, None]))
R["ens"]["resid1"] = [r3(v) for v in (ytr_ - s1)]
R["ens"]["fit1"] = [r3(v) for v in s1]

# ── Random forest: bagged trees against a forest, on the tumor data ──
Xb, yb = bc.data, bc.target
Xbtr, Xbte, ybtr, ybte = train_test_split(Xb, yb, test_size=0.3, random_state=0, stratify=yb)
def corr(model):
    P = np.array([e.predict_proba(Xbte)[:, 1] for e in model.estimators_])
    C = np.corrcoef(P)
    iu = np.triu_indices(len(P), 1)
    return r3(np.nanmean(C[iu]))
tree1 = DecisionTreeClassifier(random_state=0).fit(Xbtr, ybtr)
bagc = BaggingClassifier(DecisionTreeClassifier(), n_estimators=300, random_state=0).fit(Xbtr, ybtr)
rf = RandomForestClassifier(n_estimators=300, random_state=0).fit(Xbtr, ybtr)
R["forest"] = {
    "features": int(Xb.shape[1]), "tried": int(round(math.sqrt(Xb.shape[1]))), "nTest": int(len(ybte)),
    "tree": r3(tree1.score(Xbte, ybte)), "bagged": r3(bagc.score(Xbte, ybte)), "forest": r3(rf.score(Xbte, ybte)),
    "corrBagged": corr(bagc), "corrForest": corr(rf),
}

# ── AdaBoost by hand, with stumps, on twenty moons: who gets heavier ──
Xa, ya = make_moons(n_samples=24, noise=0.25, random_state=5)
sa = np.where(ya == 1, 1, -1)
w = np.full(len(ya), 1 / len(ya))
rounds = []
for r in range(3):
    st = DecisionTreeClassifier(max_depth=1, random_state=0).fit(Xa, ya, sample_weight=w)
    pred = np.where(st.predict(Xa) == 1, 1, -1)
    err = float(w[pred != sa].sum())
    alpha = 0.5 * math.log((1 - err) / err)
    rounds.append({
        "feature": int(st.tree_.feature[0]), "threshold": r3(st.tree_.threshold[0]),
        "wrong": [int(i) for i in np.where(pred != sa)[0]], "error": r3(err), "alpha": r3(alpha),
        "weights": [r4(v) for v in w],
    })
    w = w * np.exp(-alpha * sa * pred); w = w / w.sum()
R["ada"] = {"x": [r3(v) for v in Xa[:, 0]], "y": [r3(v) for v in Xa[:, 1]], "label": [int(v) for v in ya],
            "rounds": rounds, "final": [r4(v) for v in w]}

# ── k-means: the page's three blobs ──
Xk, _ = make_blobs(n_samples=300, centers=3, random_state=42)
km = KMeans(n_clusters=3, random_state=42, n_init="auto").fit(Xk)
elbow = []
for k in range(1, 9):
    m = KMeans(n_clusters=k, random_state=42, n_init="auto").fit(Xk)
    elbow.append({"k": k, "inertia": round(float(m.inertia_), 1), "silhouette": r3(silhouette_score(Xk, m.labels_)) if k > 1 else None})
# Lloyd's algorithm from three starting points picked at random, step by step.
rk = np.random.default_rng(7)
C = Xk[rk.choice(len(Xk), 3, replace=False)].copy()
steps = []
for it in range(20):
    d = ((Xk[:, None, :] - C[None, :, :]) ** 2).sum(-1)
    lab = d.argmin(1)
    newC = np.array([Xk[lab == j].mean(0) for j in range(3)])
    steps.append({"centroids": [[r3(a), r3(b)] for a, b in C], "labels": "".join(str(int(v)) for v in lab),
                  "inertia": round(float(d[np.arange(len(Xk)), lab].sum()), 1)})
    if np.allclose(newC, C):
        break
    C = newC
R["kmeans"] = {
    "x": [r3(v) for v in Xk[:, 0]], "y": [r3(v) for v in Xk[:, 1]],
    "inertia": round(float(km.inertia_), 3), "silhouette": r3(silhouette_score(Xk, km.labels_)),
    "elbow": elbow, "steps": steps,
}

# ── PCA: the page's scaled iris ──
Xi = StandardScaler().fit_transform(iris.data)
pca = PCA().fit(Xi)
Z = pca.transform(Xi)[:, :2]
R["pca"] = {
    "ratio": [r3(v) for v in pca.explained_variance_ratio_],
    "cumulative": [r3(v) for v in np.cumsum(pca.explained_variance_ratio_)],
    "x": [r3(v) for v in Z[:, 0]], "y": [r3(v) for v in Z[:, 1]], "species": [int(v) for v in iris.target],
    "loadings": {name: r3(v) for name, v in zip(iris.feature_names, pca.components_[0])},
}

# ── The curse of dimensionality: nearest against farthest, uniform points ──
rc = np.random.default_rng(1)
dims = [1, 2, 3, 5, 10, 20, 50, 100, 300, 1000]
ratio = []
for d in dims:
    P = rc.uniform(0, 1, (1000, d))
    rs = []
    for q in range(20):
        dist = np.sqrt(((P - P[q]) ** 2).sum(1))
        dist = np.delete(dist, q)
        rs.append(dist.min() / dist.max())
    ratio.append([d, r3(np.mean(rs))])
R["curse"] = {"ratio": ratio, "shell": [[d, r4(1 - 0.8 ** d)] for d in dims], "points": 1000}

# ── Importance: the video's own customer table, and exact Shapley values ──
rs = np.random.default_rng(4)
n = 1500
plan = rs.integers(0, 2, n)
region = rs.integers(0, 3, n)
tenure = rs.uniform(0, 60, n)
cid = rs.permutation(n) + 1
z = -1.0 + 1.6 * plan + 0.9 * (region == 2) - 0.03 * (tenure - 30)
churn = (rs.uniform(0, 1, n) < 1 / (1 + np.exp(-z))).astype(int)
names = ["plan", "region", "tenure", "customer ID"]
Xs = np.column_stack([plan, region, tenure, cid]).astype(float)
Xstr, Xste, ystr, yste = train_test_split(Xs, churn, test_size=0.3, random_state=0)
forest = RandomForestClassifier(n_estimators=200, random_state=0).fit(Xstr, ystr)
perm = permutation_importance(forest, Xste, yste, n_repeats=10, random_state=0)
bg = Xstr[np.random.default_rng(0).choice(len(Xstr), 100, replace=False)]
f = lambda M: forest.predict_proba(M)[:, 1]
base = float(f(bg).mean())
p = 4
subsets = [s for k in range(p + 1) for s in itertools.combinations(range(p), k)]
def value(x, S):
    M = bg.copy()
    for j in S:
        M[:, j] = x[j]
    return float(f(M).mean())
def shap_row(x):
    v = {S: value(x, S) for S in subsets}
    phi = np.zeros(p)
    for j in range(p):
        for S in subsets:
            if j in S:
                continue
            k = len(S)
            wgt = math.factorial(k) * math.factorial(p - k - 1) / math.factorial(p)
            T = tuple(sorted(S + (j,)))
            phi[j] += wgt * (v[T] - v[S])
    return phi, v[tuple(range(p))]
explain = Xste[:150]
Phi = []
for x in explain:
    phi, full = shap_row(x)
    Phi.append(phi)
Phi = np.array(Phi)
# One customer, shown as a waterfall: the one whose long tenure pulls down
# hardest while the plan pushes up, so the bars go both ways (and one the ID
# barely moves, so the waterfall is about the features that matter).
mixed = np.where((Phi[:, 0] > 0.1) & (Phi[:, 2] < 0) & (np.abs(Phi[:, 3]) < 0.03))[0]
pick = int(mixed[np.argmin(Phi[mixed, 2])])
phi, pred = shap_row(explain[pick])
R["shap"] = {
    "names": names, "n": n, "test": int(len(yste)), "explained": int(len(explain)), "background": int(len(bg)),
    "head": [[int(r[0]), int(r[1]), r2(r[2]), int(r[3]), int(c)] for r, c in zip(Xstr[:4], ystr[:4])],
    "distinct": [int(len(np.unique(Xstr[:, j]))) for j in range(p)], "train": int(len(ystr)),
    "accuracy": r3(forest.score(Xste, yste)),
    "impurity": [r3(v) for v in forest.feature_importances_],
    "permutation": [r4(v) for v in perm.importances_mean],
    "meanAbs": [r4(v) for v in np.abs(Phi).mean(0)],
    "base": r3(base),
    "row": {"values": [r2(v) for v in explain[pick]], "phi": [r3(v) for v in phi], "prediction": r3(pred),
            "sumCheck": r4(base + phi.sum() - pred)},
}

# ── Quick round ──
Xw, yw = load_wine(return_X_y=True)
R["scaling"] = {
    "knnRaw": r3(cross_val_score(KNeighborsClassifier(5), Xw, yw, cv=5).mean()),
    "knnScaled": r3(cross_val_score(make_pipeline(StandardScaler(), KNeighborsClassifier(5)), Xw, yw, cv=5).mean()),
    "treeRaw": r3(cross_val_score(DecisionTreeClassifier(random_state=0), Xw, yw, cv=5).mean()),
    "treeScaled": r3(cross_val_score(make_pipeline(StandardScaler(), DecisionTreeClassifier(random_state=0)), Xw, yw, cv=5).mean()),
    "range": {"proline": [r2(Xw[:, 12].min()), r2(Xw[:, 12].max())], "hue": [r2(Xw[:, 10].min()), r2(Xw[:, 10].max())]},
}
df = pd.DataFrame({"color": ["red", "blue", "green", "blue"]})
enc = OneHotEncoder(sparse_output=False)
E = enc.fit_transform(df[["color"]])
R["onehot"] = {"colors": list(df["color"]), "columns": [str(c) for c in enc.get_feature_names_out()], "rows": [[int(v) for v in r] for r in E]}
sel = RFE(LogisticRegression(max_iter=5000), n_features_to_select=5).fit(bc.data, bc.target)
idx = [int(i) for i in sel.get_support(indices=True)]
R["rfe"] = {"indices": idx, "names": [str(bc.feature_names[i]) for i in idx], "of": int(bc.data.shape[1])}

json.dumps(R)
`);

writeFileSync(join(here, "results.json"), JSON.stringify(JSON.parse(out)) + "\n");
const R = JSON.parse(out);
const brief = (o) => JSON.stringify(o, (k, v) => (Array.isArray(v) && v.length > 12 ? `[${v.length} items]` : v));
for (const k of Object.keys(R)) console.log(k, brief(R[k]));
