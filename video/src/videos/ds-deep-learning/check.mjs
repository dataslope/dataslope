// Measures every number and every curve the ds-deep-learning video shows, in
// Pyodide 314.0.7 with NumPy, the runtime the Data Scientist deep learning
// page's one runnable block uses in the reader's browser, and writes what came
// back to results.json, which data.ts reads. No deep-learning framework runs
// there, so every network here is NumPy by hand, and small on purpose: a toy,
// marked as such on screen. Every random draw is seeded, so a rerun writes the
// same file. From the repo root:
//
//   node video/src/videos/ds-deep-learning/check.mjs
//
// Data is either the page's own (its sigmoid check at z = -2, 0, 2; the
// sigmoid's 0.25 slope; ten layers of it) or the video's own, marked as such
// below and in script.ts:
//   - a neuron with three made-up inputs and weights;
//   - two 2x2 weight matrices, to show two linear layers collapse into one;
//   - a ravine-shaped loss, 0.5 * (0.1 x^2 + 10 y^2), for the optimizers;
//   - twenty noisy points from sin(3x), and a network with one hidden layer
//     of 100 tanh units trained on them for 4,000 full-batch Adam steps,
//     plain and with decoupled weight decay, for overfitting;
//   - a dropout mask, a weight-decay step, a batch for batch norm, four
//     tokens of random vectors for self-attention, and ten ReLU layers for
//     initialization.
/* global console */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy"] });

const out = py.runPython(`
import json, math, sys
import numpy as np

r2 = lambda v: round(float(v), 2)
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)
R = {"runtime": {"python": sys.version.split()[0], "numpy": np.__version__}}
sigmoid = lambda z: 1.0 / (1.0 + np.exp(-z))

# ── 1. One neuron: three inputs, three weights and a bias (the video's own) ──
x = np.array([0.5, -1.0, 2.0]); w = np.array([0.8, 0.3, 0.6]); b = 0.1
z = float(w @ x + b)
R["neuron"] = {"x": x.tolist(), "w": w.tolist(), "b": b, "products": [r2(v) for v in w * x], "z": r2(z), "a": r3(sigmoid(z))}

# ── 2. Two linear layers are one (the video's own matrices) ──
W1 = np.array([[2.0, -1.0], [1.0, 3.0]]); W2 = np.array([[1.0, 1.0], [-2.0, 1.0]])
xin = np.array([1.0, -1.0])
h = W1 @ xin
R["collapse"] = {
    "W1": W1.tolist(), "W2": W2.tolist(), "W": (W2 @ W1).tolist(), "x": xin.tolist(),
    "hidden": h.tolist(), "twoLayers": (W2 @ h).tolist(), "oneLayer": ((W2 @ W1) @ xin).tolist(),
    "relu": np.maximum(h, 0).tolist(), "withRelu": (W2 @ np.maximum(h, 0)).tolist(),
}

# ── 3. The activations, and softmax ──
zs = np.linspace(-5, 5, 101)
scores = np.array([2.0, 1.0, 0.1])
soft = np.exp(scores) / np.exp(scores).sum()
R["act"] = {
    "z": [r2(v) for v in zs],
    "sigmoid": [r4(v) for v in sigmoid(zs)],
    "tanh": [r4(v) for v in np.tanh(zs)],
    "relu": [r4(v) for v in np.maximum(zs, 0)],
    "leaky": [r4(v) for v in np.where(zs > 0, zs, 0.1 * zs)],
    "leakySlope": 0.1,
    "scores": scores.tolist(),
    "softmax": [r2(v) for v in soft],
}

# ── 4. Backpropagation through one sigmoid neuron, and the page's check ──
xb, wb, bb, yb = 1.5, 0.8, -0.2, 1.0
zb = wb * xb + bb; ab = float(sigmoid(zb)); L = (ab - yb) ** 2
dL_da = 2 * (ab - yb); da_dz = ab * (1 - ab); dz_dw = xb
grad = dL_da * da_dz * dz_dw
loss_at = lambda wv: (float(sigmoid(wv * xb + bb)) - yb) ** 2
fd = (loss_at(wb + 1e-6) - loss_at(wb - 1e-6)) / 2e-6
R["backprop"] = {
    "x": xb, "w": wb, "b": bb, "y": yb, "z": r2(zb), "a": r3(ab), "loss": r3(L),
    "dL_da": r3(dL_da), "da_dz": r3(da_dz), "dz_dw": dz_dw, "grad": r3(grad), "finiteDiff": r3(fd),
}
# The page's own block: sigmoid'(z) = s(1 - s), against a finite difference.
zp = np.array([-2.0, 0.0, 2.0]); eps = 1e-6
s = sigmoid(zp)
R["pageCheck"] = {
    "z": zp.tolist(),
    "analytic": [round(float(v), 5) for v in s * (1 - s)],
    "numeric": [round(float(v), 5) for v in (sigmoid(zp + eps) - sigmoid(zp - eps)) / (2 * eps)],
    "max": float(sigmoid(np.array([0.0]))[0] * (1 - sigmoid(np.array([0.0]))[0])),
}

# ── 5. Vanishing and exploding: ten layers of factors ──
R["vanish"] = {
    "small": 0.25, "big": 1.5,
    "smallPowers": [float(0.25 ** k) for k in range(11)],
    "bigPowers": [r2(1.5 ** k) for k in range(11)],
    "ten": float(0.25 ** 10), "tenBig": r2(1.5 ** 10),
}

# ── 6. Optimizers on a ravine: 0.5 * (0.1 x^2 + 10 y^2), from (-8, 1), 50 steps each ──
A = np.array([0.1, 10.0]); start = np.array([-8.0, 1.0]); STEPS = 50
def run(kind, lr, b1=0.9, b2=0.999, rho=0.9, e=1e-8):
    p = start.copy(); v = np.zeros(2); s2 = np.zeros(2); m = np.zeros(2); path = [p.copy()]
    for t in range(1, STEPS + 1):
        g = A * p
        if kind == "sgd": p = p - lr * g
        elif kind == "momentum": v = b1 * v + g; p = p - lr * v
        elif kind == "rmsprop": s2 = rho * s2 + (1 - rho) * g * g; p = p - lr * g / (np.sqrt(s2) + e)
        else:
            m = b1 * m + (1 - b1) * g; s2 = b2 * s2 + (1 - b2) * g * g
            p = p - lr * (m / (1 - b1 ** t)) / (np.sqrt(s2 / (1 - b2 ** t)) + e)
        path.append(p.copy())
    return np.array(path)
rates = {"sgd": 0.19, "momentum": 0.05, "rmsprop": 0.2, "adam": 0.5}
opt = {"start": start.tolist(), "steps": STEPS, "rates": rates, "paths": {}, "dist": {}}
for k, lr in rates.items():
    P = run(k, lr)
    opt["paths"][k] = [[r3(a), r3(b)] for a, b in P]
    opt["dist"][k] = r2(np.linalg.norm(P[-1]))
# How many plain steps it would take to get as close as Adam did.
p = start.copy(); n = 0
while np.linalg.norm(p) > opt["dist"]["adam"] and n < 10000:
    p = p - rates["sgd"] * A * p; n += 1
opt["sgdStepsToAdam"] = n
R["opt"] = opt

# ── 7, 9. A toy network that overfits, and the same with weight decay ──
rng = np.random.default_rng(2)
xs = rng.uniform(-1, 1, 20); ys = np.sin(3 * xs) + rng.normal(0, 0.3, 20)
xv = rng.uniform(-1, 1, 500); yv = np.sin(3 * xv) + rng.normal(0, 0.3, 500)
X, Y, XV, YV = xs[:, None], ys[:, None], xv[:, None], yv[:, None]
EPOCHS, EVERY, H = 4000, 20, 100
def train(wd):
    r = np.random.default_rng(102)
    W1 = r.normal(0, 1.0, (1, H)); b1 = r.normal(0, 1.0, H); W2 = r.normal(0, 1 / np.sqrt(H), (H, 1)); b2 = np.zeros(1)
    ps = [W1, b1, W2, b2]; m = [np.zeros_like(q) for q in ps]; v = [np.zeros_like(q) for q in ps]
    tr = []; va = []
    def record():
        tr.append(r4(np.mean((np.tanh(X @ W1 + b1) @ W2 + b2 - Y) ** 2)))
        va.append(r4(np.mean((np.tanh(XV @ W1 + b1) @ W2 + b2 - YV) ** 2)))
    record()
    for t in range(1, EPOCHS + 1):
        hh = np.tanh(X @ W1 + b1); o = hh @ W2 + b2
        go = 2 * (o - Y) / len(X)
        gz = (go @ W2.T) * (1 - hh * hh)
        gs = [X.T @ gz, gz.sum(0), hh.T @ go, go.sum(0)]
        for i, (q, g) in enumerate(zip(ps, gs)):
            if wd and i in (0, 2): q -= 0.01 * wd * q  # decoupled: shrink the weights, then step
            m[i] = 0.9 * m[i] + 0.1 * g; v[i] = 0.999 * v[i] + 0.001 * g * g
            q -= 0.01 * (m[i] / (1 - 0.9 ** t)) / (np.sqrt(v[i] / (1 - 0.999 ** t)) + 1e-8)
        if t % EVERY == 0: record()
    grid = np.linspace(-1, 1, 81)[:, None]
    fit = (np.tanh(grid @ W1 + b1) @ W2 + b2)[:, 0]
    return tr, va, [r3(f) for f in fit]
tr0, va0, fit0 = train(0.0)
tr1, va1, fit1 = train(0.3)
best = int(np.argmin(va0))
R["overfit"] = {
    "points": [[r3(a), r3(b)] for a, b in zip(xs, ys)], "noiseVar": 0.09,
    "epochs": [i * EVERY for i in range(len(tr0))], "hidden": H, "n": 20,
    "train": tr0, "val": va0, "fit": fit0, "fitDecay": fit1, "grid": [r3(g) for g in np.linspace(-1, 1, 81)],
    "bestEpoch": best * EVERY, "bestVal": va0[best], "endVal": va0[-1], "endTrain": tr0[-1],
    "decay": 0.3, "decayTrain": tr1, "decayVal": va1, "decayEndVal": va1[-1],
}

# ── 8. Dropout: half of eight activations zeroed, the rest doubled ──
rd = np.random.default_rng(1)  # a seed whose one draw drops exactly half, as p = 0.5 does on average
act = np.round(rd.uniform(0.1, 1.0, 8), 2)
mask = (rd.random(8) > 0.5).astype(int)
kept = act * mask * 2
draws = (rd.random((100000, 8)) > 0.5) * 2 * act
R["dropout"] = {
    "act": act.tolist(), "mask": mask.tolist(), "out": [r2(v) for v in kept],
    "sum": r2(act.sum()), "outSum": r2(kept.sum()), "meanSum": r2(draws.sum(1).mean()), "p": 0.5,
}

# ── 9. One weight-decay step against one step on loss + L2 penalty ──
wv = np.array([0.8, -1.2, 0.5]); gv = np.array([0.1, -0.3, 0.2]); eta, lam = 0.1, 0.5
l2 = wv - eta * (gv + lam * wv)
decay = (1 - eta * lam) * wv - eta * gv
R["decay"] = {"w": wv.tolist(), "g": gv.tolist(), "eta": eta, "lam": lam, "shrink": r2(1 - eta * lam),
              "l2": [r3(v) for v in l2], "decay": [r3(v) for v in decay], "same": bool(np.allclose(l2, decay))}

# ── 10. Batch norm on one batch of eight pre-activations ──
rb = np.random.default_rng(11)
batch = np.round(rb.normal(6.0, 2.5, 8), 1)
mu = batch.mean(); sd = batch.std()
normed = (batch - mu) / np.sqrt(sd ** 2 + 1e-5)
gamma, beta = 2.0, 1.0
R["bn"] = {"batch": batch.tolist(), "mean": r2(mu), "sd": r2(sd), "normed": [r2(v) for v in normed],
           "gamma": gamma, "beta": beta, "out": [r2(v) for v in gamma * normed + beta]}

# ── 12. Self-attention on four tokens of random vectors, d = 4 ──
# Projections drawn at a spread of 1 / sqrt(d); the seed is one whose rows,
# rounded to two places, still add to exactly 1.00 on screen.
ra = np.random.default_rng(163)
d = 4
E = ra.normal(0, 1, (4, d)); Wq, Wk, Wv = (ra.normal(0, 1 / math.sqrt(d), (d, d)) for _ in range(3))
Q, K, V = E @ Wq, E @ Wk, E @ Wv
S = Q @ K.T / math.sqrt(d)
Wt = np.exp(S - S.max(1, keepdims=True)); Wt /= Wt.sum(1, keepdims=True)
R["attn"] = {"tokens": ["the", "cat", "sat", "down"], "d": d, "scores": [[r2(v) for v in row] for row in S],
             "weights": [[r2(v) for v in row] for row in Wt], "rowSums": [r3(v) for v in Wt.sum(1)], "roundedSums": [r2(sum(round(float(v), 2) for v in row)) for row in Wt],
             "out": [[r2(v) for v in row] for row in Wt @ V]}

# ── 14. Initialization: ten ReLU layers, 256 wide, three starting scales ──
ri = np.random.default_rng(3)
x0 = ri.normal(0, 1, (1000, 256))
init = {}
for name, std in (("one", 1.0), ("small", 0.01), ("he", math.sqrt(2 / 256))):
    hcur = x0; sds = [r4(hcur.std())]
    rr = np.random.default_rng(9)
    for _ in range(10):
        hcur = np.maximum(hcur @ rr.normal(0, std, (256, 256)), 0)
        sds.append(float(hcur.std()))
    init[name] = sds
R["init"] = {"width": 256, "layers": 10, "heStd": r4(math.sqrt(2 / 256)), "sd": init}

# ── 15. Epochs, batches and iterations ──
# 10,000 / 32 is 312.5, so the last of the 313 batches is a partial one.
R["epoch"] = {"n": 10000, "batch": 32, "iterations": math.ceil(10000 / 32), "exact": 10000 / 32,
              "lastBatch": 10000 - (math.ceil(10000 / 32) - 1) * 32}

json.dumps(R)
`);

const results = JSON.parse(out);
writeFileSync(join(here, "results.json"), JSON.stringify(results, null, 1) + "\n");
console.log(JSON.stringify(results.runtime));
const { neuron, collapse, act, backprop, pageCheck, vanish, opt, overfit, dropout, decay, bn, attn, init, epoch } = results;
console.log("neuron", neuron);
console.log("collapse", JSON.stringify(collapse));
console.log("softmax", act.softmax);
console.log("backprop", backprop);
console.log("pageCheck", pageCheck);
console.log("vanish ten", vanish.ten, "big", vanish.tenBig);
console.log("opt dist", opt.dist, "sgd steps to adam", opt.sgdStepsToAdam);
console.log("overfit best", overfit.bestEpoch, overfit.bestVal, "end", overfit.endVal, "train", overfit.endTrain, "decay end", overfit.decayEndVal);
console.log("dropout", dropout);
console.log("decay", decay);
console.log("bn", bn);
console.log("attn", JSON.stringify(attn.weights), attn.rowSums);
console.log("init end", init.sd.one[10], init.sd.small[10], init.sd.he[10]);
console.log("epoch", epoch);
