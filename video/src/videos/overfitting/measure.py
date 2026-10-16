"""Measures every curve and number the Overfitting video shows.

    python3 src/videos/overfitting/measure.py > src/videos/overfitting/measurements.json

(Run it without -I: scikit-learn is a user-site install here.)

The setting is the lesson's own (content/courses/machine-learning-scikit-learn/
generalization-and-overfitting.mdx, "Seeing both failures with one example"):
a known pattern, y = sin(1.5 x) for x in [0, 4], plus Gaussian noise with a
standard deviation of 0.25, a NumPy generator seeded with 0, and polynomials
fitted with scikit-learn's PolynomialFeatures and LinearRegression.

What differs from the lesson, and why:

- Twelve training points, not thirty, so that the most flexible model has as
  many coefficients as there are points (degree eleven) and can pass through
  every one of them. Each x is drawn uniformly inside its own twelfth of the
  range, between 15% and 85% of the way across it, so the sample covers [0, 4]
  without two points landing on top of each other. Two near-duplicate x values
  force an interpolating polynomial into spikes that say more about the draw
  than about overfitting.
- x is rescaled to [-1, 1] (MinMaxScaler) before PolynomialFeatures. On raw x
  in [0, 4], x**11 reaches four million and the least-squares solve loses
  precision: with the lesson's thirty points and no rescaling, degree fifteen
  comes out with a *higher* training error (0.098) than degree four (0.042),
  which a correct fit cannot do, since the degree-four model is one of the
  degree-fifteen models. A polynomial in a rescaled x is the same polynomial in
  x, so the rescale changes the accuracy of the fit, not the model family.
- The test set is 1,000 new points from the same source, drawn from the same
  generator after the training sample, so the error on new data is measured
  closely rather than on a handful of points.
- Cross-validation is scikit-learn's cross_val_score with KFold(5, shuffle=True,
  random_state=0) on the twelve training points only. The scaler sits inside
  the pipeline, so it is refitted on each round's four training folds.
"""

import json
import platform
import sys
import warnings

import numpy as np
import sklearn
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import KFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import MinMaxScaler, PolynomialFeatures

SEED = 0
N_TRAIN = 12
N_TEST = 1000
NOISE = 0.25
X_LO, X_HI = 0.0, 4.0
DEGREES = list(range(1, N_TRAIN))  # 1 .. 11
SHOWN = [1, 3, 11]  # the three fits drawn in Fig. 1
FOLDS = 5
GRID = np.round(np.linspace(X_LO, X_HI, 401), 4)


def truth(x):
    return np.sin(1.5 * x)


def model(degree):
    return make_pipeline(MinMaxScaler((-1, 1)), PolynomialFeatures(degree), LinearRegression())


def r(values, digits=5):
    return [round(float(v), digits) for v in values]


rng = np.random.default_rng(SEED)
x = (np.arange(N_TRAIN) + rng.uniform(0.15, 0.85, N_TRAIN)) / N_TRAIN * (X_HI - X_LO) + X_LO
y = truth(x) + rng.normal(0, NOISE, N_TRAIN)
x_test = rng.uniform(X_LO, X_HI, N_TEST)
y_test = truth(x_test) + rng.normal(0, NOISE, N_TEST)
X, X_test, G = x.reshape(-1, 1), x_test.reshape(-1, 1), GRID.reshape(-1, 1)

kfold = KFold(FOLDS, shuffle=True, random_state=0)
fold_of = [0] * N_TRAIN
for k, (_, held) in enumerate(kfold.split(X)):
    for i in held:
        fold_of[int(i)] = k

sweep = []
fits = {}
with warnings.catch_warnings():
    # A fold of 9 or 10 points cannot pin down a degree-10 polynomial; the
    # least-squares solve still returns the minimum-norm one, which is what
    # cross-validation scores. Nothing else warns.
    warnings.simplefilter("ignore")
    for d in DEGREES:
        m = model(d).fit(X, y)
        cv = -cross_val_score(model(d), X, y, cv=kfold, scoring="neg_mean_squared_error")
        sweep.append(
            {
                "degree": d,
                "train": float(mean_squared_error(y, m.predict(X))),
                "test": float(mean_squared_error(y_test, m.predict(X_test))),
                "cv": float(cv.mean()),
                "cvRounds": r(cv, 6),
            }
        )
        if d in SHOWN:
            fits[str(d)] = r(m.predict(G), 4)

train = [s["train"] for s in sweep]
assert all(b <= a + 1e-12 for a, b in zip(train, train[1:])), "training error must never rise"
assert train[-1] < 1e-12, "degree 11 should pass through all twelve points"

best_test = DEGREES[int(np.argmin([s["test"] for s in sweep]))]
best_cv = DEGREES[int(np.argmin([s["cv"] for s in sweep]))]
at = {s["degree"]: s for s in sweep}

out = {
    "meta": {
        "lesson": "content/courses/machine-learning-scikit-learn/generalization-and-overfitting.mdx",
        "pattern": "y = sin(1.5 x) + Normal(0, 0.25), x in [0, 4]",
        "seed": SEED,
        "nTrain": N_TRAIN,
        "nTest": N_TEST,
        "noise": NOISE,
        "folds": FOLDS,
        "python": platform.python_version(),
        "numpy": np.__version__,
        "sklearn": sklearn.__version__,
    },
    "train": {"x": r(x, 4), "y": r(y, 4), "truth": r(truth(x), 4)},
    "foldOf": fold_of,
    "grid": r(GRID, 4),
    "truth": r(truth(GRID), 4),
    "fits": fits,
    "sweep": [
        {**s, "train": round(s["train"], 6), "test": round(s["test"], 6), "cv": round(s["cv"], 6)} for s in sweep
    ],
    "best": {"test": best_test, "cv": best_cv},
    "ratio11to3": round(at[11]["test"] / at[3]["test"], 2),
}
json.dump(out, sys.stdout, indent=1)
sys.stdout.write("\n")
