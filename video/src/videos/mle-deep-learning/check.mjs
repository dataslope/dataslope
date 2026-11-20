// Measures every number, curve and grid the mle-deep-learning video shows, in
// Pyodide 314.0.7 with NumPy and scikit-learn, the runtime the Machine
// Learning Engineer pages' blocks run in the reader's browser, and writes
// what came back to results.json, which data.ts reads. No deep-learning
// framework runs in Pyodide, so every network here is NumPy by hand. Every
// random draw is seeded, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/mle-deep-learning/check.mjs
//
// Data is either scikit-learn's bundled handwritten digits (1,797 images of
// 8 by 8 pixels), XOR's four points, the page's own code and numbers (the
// activation block, the CNN listing, the 224 by 224 by 3 image), or a seeded
// simulation, marked as such here and in script.ts:
//   - twenty random layers of 128 units, for vanishing and exploding
//     gradients;
//   - two parameters fed gradients a hundred times apart, for the optimizers.
// Arithmetic from stated assumptions (optimizer memory for a billion float32
// weights, the RNN and LSTM products over fifty steps, the double softmax
// floor) is computed here too, so the narration's numbers have one source.
//
// Then it fails (exit 1) if a page stops saying what the narration quotes
// from it, or the narration stops saying the numbers measured here.
/* global console, process, URL */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scikit-learn"] });

const out = py.runPython(`
import json, math, sys, warnings
import numpy as np
import sklearn
warnings.filterwarnings("ignore")
from sklearn.datasets import load_digits
from sklearn.linear_model import Perceptron
from sklearn.model_selection import train_test_split

r2 = lambda v: round(float(v), 2)
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)
R = {"runtime": {"python": sys.version.split()[0], "sklearn": sklearn.__version__, "numpy": np.__version__}}

digits = load_digits()
X = digits.data / 16.0
y = digits.target
R["digits"] = {"n": int(len(y)), "pixels": int(X.shape[1])}

# ── 1, 2. XOR: no line, and two ReLU units ──
Xx = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], float)
yx = np.array([0, 1, 1, 0])
grid = np.linspace(-3, 3, 61)
best = 0.0
for a in grid:
    for b in grid:
        acc = (((Xx @ [a, b])[:, None] + grid[None, :] > 0).astype(int) == yx[:, None]).mean(0).max()
        best = max(best, float(acc))
W1 = np.array([[1.0, 1.0], [1.0, 1.0]]); b1 = np.array([0.0, -1.0]); w2 = np.array([1.0, -2.0])
Hx = Xx @ W1.T + b1
R["xor"] = {
    "points": Xx.astype(int).tolist(), "labels": yx.tolist(),
    "linesSearched": int(len(grid) ** 3), "bestLine": best,
    "perceptron": r2(Perceptron(max_iter=1000, random_state=0).fit(Xx, yx).score(Xx, yx)),
    "W1": W1.tolist(), "b1": b1.tolist(), "w2": w2.tolist(),
    "hidden": np.maximum(0, Hx).tolist(),
    "withRelu": (np.maximum(0, Hx) @ w2).tolist(),
    "withoutRelu": (Hx @ w2).tolist(),
    "collapsed": {"w": (W1.T @ w2).tolist(), "b": float(b1 @ w2)},
}

# ── 3. Activations: the page's block, run as written, and curves ──
def sigmoid(z):
    return 1 / (1 + np.exp(-z))
z = np.array([-2.0, -0.5, 0.0, 0.5, 2.0])
s = sigmoid(z)
zs = np.linspace(-5, 5, 101)
gelu = lambda v: 0.5 * v * (1 + np.array([math.erf(t / math.sqrt(2)) for t in v]))
R["activations"] = {
    "page": {"z": z.tolist(), "sigmoid": s.round(3).tolist(), "sigmoidDeriv": (s * (1 - s)).round(3).tolist(),
             "relu": np.maximum(0, z).round(3).tolist(), "reluDeriv": (z > 0).astype(float).tolist()},
    "tanhDeriv": {"0": r3(1 - np.tanh(0.0) ** 2), "2": r3(1 - np.tanh(2.0) ** 2)},
    "sigmoidDerivAt2": r3(sigmoid(2.0) * (1 - sigmoid(2.0))),
    "curves": {
        "z": [r2(v) for v in zs],
        "sigmoid": [r4(v) for v in sigmoid(zs)], "sigmoidDeriv": [r4(v) for v in sigmoid(zs) * (1 - sigmoid(zs))],
        "tanh": [r4(v) for v in np.tanh(zs)], "tanhDeriv": [r4(v) for v in 1 - np.tanh(zs) ** 2],
        "relu": [r4(v) for v in np.maximum(0, zs)], "reluDeriv": [float(v > 0) for v in zs],
        "leaky": [r4(v) for v in np.where(zs > 0, zs, 0.01 * zs)], "gelu": [r4(v) for v in gelu(zs)],
    },
}

# ── 4. Backprop: what one gradient costs, and a gradient check ──
sizes = [64, 128, 128, 10]
params = sum(a * b + b for a, b in zip(sizes[:-1], sizes[1:]))
fwd = sum(a * b for a, b in zip(sizes[:-1], sizes[1:]))
bwd = fwd + sum(a * b for a, b in zip(sizes[1:-1], sizes[2:]))  # weight grads, plus input grads above layer 1
rng = np.random.default_rng(0)
Ws = [rng.normal(0, math.sqrt(2 / a), (a, b)) for a, b in zip(sizes[:-1], sizes[1:])]
bs = [np.zeros(b) for b in sizes[1:]]
xb = X[:32]; yb = y[:32]
def forward(Ws, bs):
    hs = [xb]; As = []; h = xb
    for i, (W, b) in enumerate(zip(Ws, bs)):
        a = h @ W + b; As.append(a)
        h = np.maximum(0, a) if i < len(Ws) - 1 else a
        hs.append(h)
    return hs, As
def loss(Ws, bs):
    o = forward(Ws, bs)[0][-1]
    o = o - o.max(1, keepdims=True)
    lp = o - np.log(np.exp(o).sum(1, keepdims=True))
    return -lp[np.arange(len(yb)), yb].mean()
hs, As = forward(Ws, bs)
o = hs[-1] - hs[-1].max(1, keepdims=True); p = np.exp(o); p /= p.sum(1, keepdims=True)
g = p.copy(); g[np.arange(len(yb)), yb] -= 1; g /= len(yb)
gW = [None] * len(Ws)
for i in reversed(range(len(Ws))):
    gW[i] = hs[i].T @ g
    if i > 0:
        g = (g @ Ws[i].T) * (As[i - 1] > 0)
errs = []
pairs = []
eps = 1e-6
for k in range(20):
    li = int(rng.integers(0, len(Ws))); W = Ws[li]
    i = int(rng.integers(0, W.shape[0])); j = int(rng.integers(0, W.shape[1]))
    old = W[i, j]
    W[i, j] = old + eps; up = loss(Ws, bs)
    W[i, j] = old - eps; down = loss(Ws, bs)
    W[i, j] = old
    num = (up - down) / (2 * eps)
    pairs.append([float(f"{num:.4g}"), float(f"{gW[li][i, j]:.4g}")])
    errs.append(abs(num - gW[li][i, j]) / max(1e-12, abs(num) + abs(gW[li][i, j])))
R["backprop"] = {
    "sizes": sizes, "params": int(params), "forwardMacs": int(fwd), "backwardMacs": int(bwd),
    "backwardOverForward": r2(bwd / fwd), "nudgePasses": int(params + 1),
    "checked": len(errs), "worstRelError": float(f"{max(errs):.2g}"), "batch": int(len(yb)),
    # Each checked weight's gradient, measured by nudging and by backprop.
    "pairs": pairs,
}

# ── 5. Vanishing and exploding: a seeded simulation, 20 layers of 128 ──
L, n, B = 20, 128, 256
def backward_signal(act, init, scale=1.0):
    r = np.random.default_rng(0)
    x = r.normal(0, 1, (B, n))
    sd = math.sqrt(2 / (n + n)) if init == "xavier" else math.sqrt(2 / n)
    Wl = [r.normal(0, sd * scale, (n, n)) for _ in range(L)]
    Al = []; h = x
    for W in Wl:
        a = h @ W; Al.append(a)
        h = sigmoid(a) if act == "sigmoid" else np.maximum(0, a)
    g = np.random.default_rng(99).normal(0, 1, (B, n))
    top = np.linalg.norm(g); sig = []
    for l in reversed(range(L)):
        a = Al[l]
        d = sigmoid(a) * (1 - sigmoid(a)) if act == "sigmoid" else (a > 0).astype(float)
        g = (g * d) @ Wl[l].T
        sig.append(float(np.linalg.norm(g) / top))
    return sig[::-1]   # [0]: what reaches the first layer's input; [-1]: the last layer's
runs = {"sigmoidXavier": backward_signal("sigmoid", "xavier"), "reluHe": backward_signal("relu", "he"),
        "reluTwiceHe": backward_signal("relu", "he", 2.0)}
R["vanish"] = {
    "layers": L, "width": n, "batch": B,
    "byLayer": {k: [float(f"{v:.3g}") for v in s] for k, s in runs.items()},
    "first": {k: float(f"{s[0]:.3g}") for k, s in runs.items()},
}

# ── 6. Initialization: sixteen units that start equal stay equal ──
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)
def train_tanh(W1, W2, steps=1000, lr=0.5):
    W1 = W1.copy(); W2 = W2.copy(); b1 = np.zeros(W1.shape[1]); b2 = np.zeros(10); Y = np.eye(10)[ytr]
    for _ in range(steps):
        h = np.tanh(Xtr @ W1 + b1); o = h @ W2 + b2
        o = o - o.max(1, keepdims=True); pr = np.exp(o); pr /= pr.sum(1, keepdims=True)
        gg = (pr - Y) / len(ytr)
        gW2 = h.T @ gg; gb2 = gg.sum(0); gh = gg @ W2.T * (1 - h ** 2)
        W1 -= lr * (Xtr.T @ gh); b1 -= lr * gh.sum(0); W2 -= lr * gW2; b2 -= lr * gb2
    acc = ((np.tanh(Xte @ W1 + b1) @ W2 + b2).argmax(1) == yte).mean()
    return r3(acc), float(np.abs(W1 - W1[:, :1]).max()), W1
hid = 16
accC, spreadC, W1c = train_tanh(np.full((64, hid), 0.01), np.full((hid, 10), 0.01))
ri = np.random.default_rng(0)
accR, spreadR, W1r = train_tanh(ri.normal(0, math.sqrt(2 / (64 + hid)), (64, hid)), ri.normal(0, math.sqrt(2 / (hid + 10)), (hid, 10)))
R["init"] = {
    "hidden": hid, "steps": 1000, "constant": 0.01, "train": int(len(ytr)), "test": int(len(yte)),
    "constantAcc": accC, "constantUnitSpread": spreadC, "constantDistinctUnits": len({tuple(c) for c in W1c.T}),
    "xavierAcc": accR, "xavierDistinctUnits": len({tuple(np.round(c, 9)) for c in W1r.T}),
    # first-layer weights of the first four units, as 8x8 images, for the figure
    "constantUnits": [[r4(v) for v in W1c[:, k]] for k in range(4)],
    "xavierUnits": [[r4(v) for v in W1r[:, k]] for k in range(4)],
    "xavierVar": "2 / (fan in + fan out)", "heVar": "2 / fan in",
}

# ── 7. Batch norm against layer norm: one pixel in two batches ──
px = 36  # row 4, column 4: near the middle of the 8x8 image
mid = int(np.where(np.abs(X[:, px] - 0.5) < 0.04)[0][0])
rb = np.random.default_rng(1)
pool = np.array([i for i in range(len(y)) if i != mid])
bright = rb.choice(pool[X[pool, px] > 0.75], 7, replace=False)
dark = rb.choice(pool[X[pool, px] < 0.25], 7, replace=False)
eps = 1e-5
bn = lambda v: (v - v.mean()) / math.sqrt(v.var() + eps)
ln = lambda row: (row - row.mean()) / math.sqrt(row.var() + eps)
R["norm"] = {
    "pixel": px, "image": mid, "label": int(y[mid]), "value": r3(X[mid, px]),
    "brightBatch": [int(mid)] + [int(i) for i in bright], "darkBatch": [int(mid)] + [int(i) for i in dark],
    "brightValues": [r3(v) for v in X[np.r_[mid, bright], px]], "darkValues": [r3(v) for v in X[np.r_[mid, dark], px]],
    "bnBright": r2(bn(X[np.r_[mid, bright], px])[0]), "bnDark": r2(bn(X[np.r_[mid, dark], px])[0]),
    "bnAlone": r2(bn(X[[mid], px])[0]), "layerNorm": r2(ln(X[mid])[px]),
    "images": {str(i): [r3(v) for v in X[i]] for i in [mid, *bright.tolist(), *dark.tolist()]},
}

# ── 8. Optimizers: per-parameter steps, and memory per weight ──
ro = np.random.default_rng(0)
T, lr = 100, 0.01
gr = np.stack([1.0 + 0.3 * ro.normal(size=T), 0.01 + 0.003 * ro.normal(size=T)], 1)
sgd_steps = lr * np.abs(gr).mean(0)
m = np.zeros(2); v = np.zeros(2); adam = []
for t in range(1, T + 1):
    m = 0.9 * m + 0.1 * gr[t - 1]; v = 0.999 * v + 0.001 * gr[t - 1] ** 2
    adam.append(lr * (m / (1 - 0.9 ** t)) / (np.sqrt(v / (1 - 0.999 ** t)) + 1e-8))
adam = np.abs(np.array(adam)).mean(0)
bytes_per = {"sgd": 8, "momentum": 12, "rmsprop": 12, "adam": 16}
R["optim"] = {
    "steps": T, "lr": lr, "gradientScale": [1.0, 0.01],
    "sgdStep": [float(f"{v:.3g}") for v in sgd_steps], "sgdRatio": round(float(sgd_steps[0] / sgd_steps[1])),
    "adamStep": [float(f"{v:.3g}") for v in adam], "adamRatio": r2(adam[0] / adam[1]),
    "bytesPerWeight": bytes_per,
    "gbPerBillion": {k: b for k, b in bytes_per.items()},  # 1e9 weights x bytes = GB (decimal)
}

# ── 9. Dropout left on at serving: a digit classifier trained with it ──
H = 128; pdrop = 0.5
rd = np.random.default_rng(0)
D1 = rd.normal(0, math.sqrt(2 / 64), (64, H)); c1 = np.zeros(H); D2 = rd.normal(0, math.sqrt(1 / H), (H, 10)); c2 = np.zeros(10)
P = [D1, c1, D2, c2]; Ms = [np.zeros_like(q) for q in P]; Vs = [np.zeros_like(q) for q in P]
Y = np.eye(10)[ytr]; t = 0; alr = 0.003
for ep in range(60):
    idx = rd.permutation(len(ytr))
    for s0 in range(0, len(idx), 32):
        bi = idx[s0:s0 + 32]; xq = Xtr[bi]; yq = Y[bi]
        a = xq @ D1 + c1; h = np.maximum(0, a)
        mask = (rd.random(h.shape) > pdrop) / (1 - pdrop); hd = h * mask
        o = hd @ D2 + c2; o -= o.max(1, keepdims=True); pr = np.exp(o); pr /= pr.sum(1, keepdims=True)
        gg = (pr - yq) / len(bi)
        grads = [xq.T @ ((gg @ D2.T) * mask * (a > 0)), ((gg @ D2.T) * mask * (a > 0)).sum(0), hd.T @ gg, gg.sum(0)]
        t += 1
        for q, gq, mq, vq in zip(P, grads, Ms, Vs):
            mq *= 0.9; mq += 0.1 * gq; vq *= 0.999; vq += 0.001 * gq * gq
            q -= alr * (mq / (1 - 0.9 ** t)) / (np.sqrt(vq / (1 - 0.999 ** t)) + 1e-8)
def predict(A, on, r=None):
    h = np.maximum(0, A @ D1 + c1)
    if on:
        h = h * (r.random(h.shape) > pdrop) / (1 - pdrop)
    o = h @ D2 + c2; o -= o.max(1, keepdims=True); pr = np.exp(o)
    return pr / pr.sum(1, keepdims=True)
ev = predict(Xte, False)
rs = np.random.default_rng(7)
first = predict(Xte, True, rs).argmax(1); second = predict(Xte, True, rs).argmax(1)
img = int(np.argsort(np.abs(ev.max(1) - 0.9))[0])
calls = [predict(Xte[img:img + 1], True, rs)[0] for _ in range(10)]
flips = 0
for j in range(len(yte)):
    cl = {int(predict(Xte[j:j + 1], True, rs)[0].argmax()) for _ in range(10)}
    flips += len(cl) > 1
R["dropout"] = {
    "p": pdrop, "hidden": H, "epochs": 60,
    "evalAcc": r3((ev.argmax(1) == yte).mean()), "onAcc": r3((first == yte).mean()),
    "twoCallsDiffer": r3((first != second).mean()),
    "image": {"index": img, "label": int(yte[img]), "pixels": [r3(v) for v in Xte[img]],
              "evalClass": int(ev[img].argmax()), "evalP": r2(ev[img].max()),
              "calls": [{"class": int(c.argmax()), "p": r2(c.max())} for c in calls]},
    "flipIn10": r3(flips / len(yte)), "test": int(len(yte)),
}

# ── 10, 11. CNN: a filter on a digit, a shift, and the page's weight counts ──
img0 = digits.images[0] / 16.0
K = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], float)  # responds to vertical edges
def conv(im):
    Pd = np.pad(im, 1); outm = np.zeros_like(im)
    for i in range(8):
        for j in range(8):
            outm[i, j] = (Pd[i:i + 3, j:j + 3] * K).sum()
    return outm
def shift(im, k):
    sh = np.zeros_like(im); sh[:, k:] = im[:, :8 - k]; return sh
fmap = conv(img0); fshift = conv(shift(img0, 2))
# Away from the right edge (where the shift pushed pixels out), the shifted
# image's map is the original map shifted.
eq = bool(np.allclose(fshift[:, 2:7], fmap[:, 0:5]))
conv1 = 3 * 3 * 3 * 16 + 16; conv2 = 3 * 3 * 16 * 32 + 32; head = 32 * 10 + 10
dense = 224 * 224 * 3 * 1000 + 1000
R["cnn"] = {
    "label": int(digits.target[0]), "image": [[r3(v) for v in row] for row in img0], "kernel": K.tolist(),
    "map": [[r2(v) for v in row] for row in fmap], "shiftedImage": [[r3(v) for v in row] for row in shift(img0, 2)],
    "shiftedMap": [[r2(v) for v in row] for row in fshift], "shift": 2, "equivariant": eq,
    "conv1": conv1, "conv2": conv2, "head": head, "total": conv1 + conv2 + head,
    "imageInputs": 224 * 224 * 3, "denseUnits": 1000, "dense": dense,
    "conv1Positions": 224 * 224, "conv1Macs": 224 * 224 * 3 * 3 * 3 * 16,
}

# ── 13. Softmax applied before a loss that applies it again ──
q = math.e / (math.e + 9)
R["doubleSoftmax"] = {"classes": 10, "bestP": r3(q), "lossFloor": r2(-math.log(q))}

# ── 14, 15. RNN against LSTM over fifty steps, and gate counts ──
R["rnn"] = {
    "steps": 50, "rnnFactor": 0.5, "rnnProduct": float(f"{0.5 ** 50:.2g}"),
    "forgetGate": 0.95, "lstmProduct": r3(0.95 ** 50),
    "lstmBlocks": 4, "gruBlocks": 3,
}

json.dumps(R)
`);

const R = JSON.parse(out);
writeFileSync(join(here, "results.json"), JSON.stringify(R) + "\n");
const brief = (o) => JSON.stringify(o, (k, v) => (Array.isArray(v) && v.length > 12 ? `[${v.length} items]` : v));
for (const k of Object.keys(R)) console.log(k, brief(R[k]));

// ── What the narration quotes, still on the pages ──
const content = new URL("../../../../content/interview/machine-learning-engineer/", import.meta.url);
const page = (f) => readFileSync(new URL(f, content), "utf8").replace(/\s+/g, " ");
const problems = [];
const quotes = [
  ["deep-learning.mdx", "### What is a perceptron?"],
  ["deep-learning.mdx", "famously, it can't learn XOR"],
  ["deep-learning.mdx", "### Why do we need non-linear activation functions?"],
  ["deep-learning.mdx", "must be differentiable (almost everywhere)"],
  ["deep-learning.mdx", "### Compare sigmoid, tanh, and ReLU."],
  ["deep-learning.mdx", "**Leaky ReLU**, **ELU**, and **GELU** address the dying-unit problem"],
  ["deep-learning.mdx", "Notice `sigmoid'` peaks at only 0.25"],
  ["ml-fundamentals.mdx", "### Name common activation functions and their trade-offs."],
  ["ml-fundamentals.mdx", "used in the output layer for multi-class classification"],
  ["deep-learning.mdx", "### Explain backpropagation and the chain rule."],
  ["deep-learning.mdx", "The forward pass caches intermediate activations"],
  ["deep-learning.mdx", "### What causes vanishing and exploding gradients, and how do you fix them?"],
  ["deep-learning.mdx", "**gradient clipping** to cap the norm for the exploding case"],
  ["deep-learning.mdx", "updates blow up to `nan`"],
  ["ml-fundamentals.mdx", "### What is the vanishing gradient problem?"],
  ["deep-learning.mdx", "### Why does weight initialization matter? Xavier vs He."],
  ["deep-learning.mdx", "**He** initialization uses a larger variance suited to **ReLU**, which zeros half its inputs"],
  ["deep-learning.mdx", "Initializing all weights to the same constant is fatal"],
  ["deep-learning.mdx", "### What is batch normalization, and how does layer norm differ?"],
  ["deep-learning.mdx", "at inference, where it uses running averages"],
  ["deep-learning.mdx", "which is why transformers use it"],
  ["deep-learning.mdx", "### What is the difference between SGD, Momentum, RMSProp, and Adam?"],
  ["deep-learning.mdx", "well-tuned SGD with momentum often generalizes slightly better on vision tasks"],
  ["deep-learning.mdx", "### Explain dropout, L2, and early stopping as regularizers."],
  ["deep-learning.mdx", "at inference it's disabled"],
  ["ml-fundamentals.mdx", "### What is dropout and how does it regularize a neural network?"],
  ["ml-fundamentals.mdx", "(commonly 0.2–0.5)"],
  ["ml-fundamentals.mdx", "inverted dropout scales during training"],
  ["deep-learning.mdx", "### How does a convolutional neural network (CNN) work?"],
  ["deep-learning.mdx", "nn.Conv2d(3, 16, kernel_size=3, padding=1)"],
  ["deep-learning.mdx", "nn.Conv2d(16, 32, kernel_size=3, padding=1)"],
  ["deep-learning.mdx", "nn.AdaptiveAvgPool2d(1)"],
  ["deep-learning.mdx", "nn.Linear(32, 10)"],
  ["deep-learning.mdx", "### Why are CNNs well suited to images compared to a fully-connected net?"],
  ["deep-learning.mdx", "224×224×3 image"],
  ["deep-learning.mdx", "far less data and compute for the same accuracy"],
  ["deep-learning.mdx", "### What is transfer learning / fine-tuning in deep learning?"],
  ["deep-learning.mdx", "### Why is cross-entropy paired with softmax for classification?"],
  ["deep-learning.mdx", "fuse the two (`cross_entropy` on logits)"],
  ["deep-learning.mdx", "### What is an RNN, and why does it struggle with long sequences?"],
  ["deep-learning.mdx", "### How do LSTMs and GRUs address that?"],
  ["deep-learning.mdx", "until attention did it better"],
];
for (const [file, phrase] of quotes) if (!page(file).includes(phrase.replace(/\s+/g, " "))) problems.push(`${file} no longer says: ${phrase}`);

// ── The numbers the narration says in words ──
const { script } = await import(new URL("./script.ts", import.meta.url).href);
const beat = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`no beat "${id}"`);
  return b.text;
};
const says = [
  ["q1-xor", "three of the four", R.xor.bestLine === 0.75],
  ["plan", "thirteen worked through", script.beats.filter((b) => /^Question [a-z]+(-[a-z]+)?\./.test(b.text)).length === 13],
  ["q2", "zero, one, one, zero", R.xor.withRelu.join() === "0,1,1,0"],
  ["q2-collapse", "plus two", R.xor.collapsed.b === 2 && R.xor.collapsed.w.join() === "-1,-1"],
  ["q3-sat", "a quarter", R.activations.page.sigmoidDeriv[2] === 0.25],
  ["q3-sat", "point oh seven", R.activations.tanhDeriv["2"] === 0.071],
  ["q4-cost", "twenty-six thousand", Math.round(R.backprop.params / 1000) === 26],
  ["q4-cost", "one point seven", R.backprop.backwardOverForward === 1.68],
  ["q4-check", "one part in a million", R.backprop.worstRelError < 1e-6],
  ["q5-sim", "a hundred and twenty-eight", R.vanish.width === 128 && R.vanish.layers === 20],
  ["q5-sim", "under a trillionth", R.vanish.first.sigmoidXavier < 1e-12],
  ["q5-sim", "about the size it left", R.vanish.first.reluHe > 0.5 && R.vanish.first.reluHe < 2],
  ["q5-explode", "over a million", R.vanish.first.reluTwiceHe > 1e6 && R.vanish.first.reluTwiceHe < 1e7],
  ["q6-sym", "thirty-eight percent", Math.round(R.init.constantAcc * 100) === 38 && R.init.constantDistinctUnits === 1],
  ["q6-sym", "ninety-eight", Math.round(R.init.xavierAcc * 100) === 98 && R.init.xavierDistinctUnits === 16],
  ["q7-batch", "minus two point four", R.norm.bnBright === -2.43 && R.norm.value === 0.5],
  ["q7-batch", "plus two point six", R.norm.bnDark === 2.62],
  ["q7-one", "normalizes to zero", R.norm.bnAlone === 0],
  ["q7-ln", "the same value in any batch", typeof R.norm.layerNorm === "number"],
  ["q8-rms", "a hundred and four", R.optim.sgdRatio === 104],
  ["q8-rms", "one point oh three", R.optim.adamRatio === 1.03],
  ["q8-mem", "sixteen", R.optim.bytesPerWeight.adam === 16 && R.optim.bytesPerWeight.sgd === 8],
  ["q9-bug", "forty-eight to ninety-three", (() => { const c = R.dropout.image.calls; const e = c.filter((x) => x.class === 8).map((x) => x.p); return R.dropout.image.label === 8 && e.length === 8 && Math.min(...e) === 0.48 && Math.max(...e) === 0.93 && c.filter((x) => x.class === 1).length === 2; })()],
  ["q9-dash", "ninety-eight to ninety-seven", Math.round(R.dropout.evalAcc * 100) === 98 && Math.round(R.dropout.onAcc * 100) === 97],
  ["q9-bug", "one image in ten", Math.round(R.dropout.flipIn10 * 10) === 1],
  ["q10-props", "two pixels", R.cnn.shift === 2 && R.cnn.equivariant],
  ["q11-a", "a hundred and fifty million", Math.round(R.cnn.dense / 1e7) === 15],
  ["q11-a", "four hundred and forty-eight", R.cnn.conv1 === 448],
  ["q11-cost", "five thousand four hundred and eighteen", R.cnn.total === 5418],
  ["q11-cost", "fifty thousand", Math.round(R.cnn.conv1Positions / 1000) === 50],
  ["q11-cost", "twenty-two million", Math.round(R.cnn.conv1Macs / 1e6) === 22],
  ["r-softmax", "twenty-three percent", Math.round(R.doubleSoftmax.bestP * 100) === 23],
  ["r-softmax", "one point four six", R.doubleSoftmax.lossFloor === 1.46],
  ["q14-why", "a thousand trillion", R.rnn.rnnProduct > 5e-16 && R.rnn.rnnProduct < 2e-15],
  ["q15-a", "about eight percent", Math.round(R.rnn.lstmProduct * 100) === 8],
];
for (const [id, words, ok] of says) {
  if (!beat(id).includes(words)) problems.push(`beat "${id}" no longer says "${words}"`);
  else if (!ok) problems.push(`beat "${id}" says "${words}", which results.json does not back`);
}
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("\nok: every quoted phrase is on its page, and every number said matches results.json");
