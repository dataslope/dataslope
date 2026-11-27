// Measures every number, output and timing the mle-coding video shows, in
// Pyodide 314.0.7 with NumPy and scikit-learn, the runtime the Machine
// Learning Engineer coding page's blocks run in the reader's browser, and
// writes what came back to results.json, which data.ts reads. Every random
// draw is seeded. From the repo root:
//
//   node video/src/videos/mle-coding/check.mjs
//
// Data is the page's own blocks (the 3-by-2 standardization, the five scores,
// the three labels, the cosine matrix, the overflowing softmax, the ten-row
// mini-batch generator), scikit-learn's bundled breast cancer set, or the
// video's own seeded arrays, marked as such here and in script.ts.
//
// Timings are the one thing a rerun does not reproduce: they vary from run
// to run and machine to machine, so the narration argues from ratios only
// ("roughly a hundred times", "roughly forty times", "more than ten
// times"), and this
// script fails if a run stops fitting those words. Each timing is the best of
// several runs after a warm-up.
//
// Then it fails (exit 1) if:
// - the page stops asking one of its fifteen questions, or stops saying what
//   the narration takes from it;
// - the narration stops saying, in words, a number measured here.
/* global console, process */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scikit-learn"] });

const out = py.runPython(`
import heapq, json, math, sys, time, warnings
from collections import Counter
import numpy as np
import sklearn
warnings.filterwarnings("ignore")
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

R = {"runtime": {"python": sys.version.split()[0], "numpy": np.__version__, "sklearn": sklearn.__version__}}
r2 = lambda v: round(float(v), 2)
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)

def best(f, k):
    """Best of k timed runs after one warm-up, in milliseconds."""
    f()
    ts = []
    for _ in range(k):
        t = time.perf_counter(); f(); ts.append(time.perf_counter() - t)
    return min(ts) * 1000

# ── 1. Vectorization: one user's embedding against a hundred thousand items ──
rng = np.random.default_rng(0)
N, D = 100_000, 64
E = rng.normal(size=(N, D)); q = rng.normal(size=D)
El = E.tolist(); ql = q.tolist()
def pure():
    out = []
    for row in El:
        s = 0.0
        for a, b in zip(row, ql):
            s += a * b
        out.append(s)
    return out
def per_row():
    return [float(np.dot(E[i], q)) for i in range(N)]
def matrix():
    return E @ q
agree = float(np.max(np.abs(np.array(pure()) - matrix())))
# The product takes a few milliseconds, and on a shared machine one run of it
# swings from 3 to 14 ms (2026-11-20, while other jobs ran): fifteen runs left
# its best near 10 ms three times in a row and the ratios a third of the
# writer's. The best of a thousand finds the machine's own speed again.
t_pure, t_row, t_vec = best(pure, 3), best(per_row, 3), best(matrix, 1000)
R["vector"] = {
    "items": N, "dims": D, "maxDiff": agree,
    "ms": {"loop": r2(t_pure), "perRow": r2(t_row), "matrix": r2(t_vec)},
    "ratio": {"loop": round(t_pure / t_vec, 1), "perRow": round(t_row / t_vec, 1)},
}

# ── 2. Cosine similarity: the page's matrix, then a catalog with an empty item ──
def cosine_sim_matrix(X):
    norms = np.linalg.norm(X, axis=1, keepdims=True)
    Xn = X / norms
    return Xn @ Xn.T
Xc = np.array([[1.0, 0.0], [1.0, 1.0], [0.0, 1.0]])
R["cosinePage"] = [[r3(v) for v in row] for row in cosine_sim_matrix(Xc)]
# The video's own six items, two dimensions so they can be drawn as arrows;
# item 4 is new and has no embedding yet: all zeros.
items = np.array([[0.9, 0.3], [0.2, 1.0], [0.7, 0.7], [1.0, -0.2], [0.0, 0.0], [-0.4, 0.9]])
user = np.array([1.0, 0.5])
def unguarded(M, u):
    return (M / np.linalg.norm(M, axis=1, keepdims=True)) @ (u / np.linalg.norm(u))
def guarded(M, u):
    return (M @ u) / (np.linalg.norm(M, axis=1) * np.linalg.norm(u) + 1e-12)
s_bad = unguarded(items, user); s_ok = guarded(items, user)
k = 3
part = np.argpartition(s_bad, -k)[-k:]                 # the page's top-k idiom
page_top = part[np.argsort(s_bad[part])[::-1]]
challenge_top = np.argsort(s_bad)[::-1][:k]            # the challenge's solution
part_ok = np.argpartition(s_ok, -k)[-k:]
R["cosine"] = {
    "items": [[r2(a), r2(b)] for a, b in items], "user": [r2(v) for v in user], "empty": 4,
    "scores": [None if np.isnan(v) else r3(v) for v in s_bad],
    "pageTop": [int(i) for i in page_top], "challengeTop": [int(i) for i in challenge_top],
    "argmax": int(np.argmax(s_bad)),
    "guardedScores": [r3(v) for v in s_ok],
    "guardedTop": [int(i) for i in part_ok[np.argsort(s_ok[part_ok])[::-1]]],
    "sortedWithNan": [None if np.isnan(v) else r1 for v, r1 in [(v, r2(v)) for v in np.sort(np.array([0.5, np.nan, 0.9, 0.2]))]],
}

# ── 3. Top-k: the page's five scores, and a million to time ──
scores = np.array([0.1, 0.9, 0.4, 0.7, 0.2])
part = np.argpartition(scores, -2)[-2:]
top = part[np.argsort(scores[part])[::-1]]
big = np.random.default_rng(1).random(1_000_000)
t_sort = best(lambda: np.argsort(big), 3)
t_part = best(lambda: np.argpartition(big, -10)[-10:], 7)
assert sorted(np.argpartition(big, -10)[-10:].tolist()) == sorted(np.argsort(big)[-10:].tolist())
R["topk"] = {
    "scores": scores.tolist(), "k": 2, "top": [int(i) for i in top], "topScores": [float(v) for v in scores[top]],
    "n": len(big), "ms": {"sort": r2(t_sort), "partition": r2(t_part)}, "ratio": round(t_sort / t_part, 1),
    "heapq": [int(i) for i in heapq.nlargest(2, range(5), key=lambda i: scores[i])],
}

# ── 4. Broadcasting: the page's standardization, then the silent shape bug ──
X = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])
Z = (X - X.mean(axis=0)) / X.std(axis=0)
rb = np.random.default_rng(3)
y = rb.normal(size=1000)
pred = (y + rb.normal(0, 0.5, 1000)).reshape(-1, 1)   # a model's output, as a column
wrong = pred - y
R["broadcast"] = {
    "X": X.tolist(), "mean": X.mean(axis=0).tolist(), "Z": [[r3(v) for v in row] for row in Z],
    "zMeans": [r3(abs(v)) for v in Z.mean(axis=0)],
    "n": 1000, "predShape": list(pred.shape), "yShape": list(y.shape), "wrongShape": list(wrong.shape),
    "mseRight": r2(((pred.ravel() - y) ** 2).mean()), "mseWrong": r2((wrong ** 2).mean()),
}

# ── 5. Pairwise distances: the memory, and the identity's rounding ──
n, d = 10_000, 128
rp = np.random.default_rng(5)
Xp64 = rp.normal(size=(1000, 128))                     # the video's own thousand rows,
Xp = Xp64.astype(np.float32)                            # stored as float32
sq = (Xp ** 2).sum(1)
D2 = sq[:, None] + sq[None, :] - 2 * Xp @ Xp.T
diag = np.diag(D2)
with np.errstate(invalid="ignore"):
    Dr = np.sqrt(D2)
Dc = np.sqrt(np.maximum(D2, 0))
B = np.sqrt(((Xp[:200, None, :].astype(np.float64) - Xp[None, :200, :].astype(np.float64)) ** 2).sum(-1))
R["pairwise"] = {
    "n": n, "d": d,
    "broadcastBytes": n * n * d * 8, "identityBytes": n * n * 8,
    "rows": 1000, "cols": 128, "dtype": "float32",
    "selfNegative": int((diag < 0).sum()), "nanAfterRoot": int(np.isnan(Dr).sum()),
    "selfNegative64": int((np.diag((lambda X64: (X64 ** 2).sum(1)[:, None] + (X64 ** 2).sum(1)[None, :] - 2 * X64 @ X64.T)(Xp64)) < 0).sum()),
    "nanAfterClip": int(np.isnan(Dc).sum()),
    "selfWorst": r4(np.sqrt(np.abs(diag).max())),
    "typical": r2(np.median(Dc[np.triu_indices(1000, 1)])),
    "maxAbsVsBroadcast": r4(np.abs(Dc[:200, :200] - B).max()),
}

# ── 6. float32 against float64 ──
total32 = float(np.cumsum(np.full(10_000_000, 0.1, dtype=np.float32))[-1])   # a running total
R["floats"] = {
    "embeddings": 10_000_000, "dims": 128,
    "bytes32": 10_000_000 * 128 * 4, "bytes64": 10_000_000 * 128 * 8,
    "adds": 10_000_000, "running32": total32, "runningError": r3(total32 / 1_000_000 - 1),
    "pairwise32": float(np.full(10_000_000, 0.1, dtype=np.float32).sum()),
    "running64": r4(np.cumsum(np.full(10_000_000, 0.1))[-1]),
    "spacingNearMillion": float(np.spacing(np.float32(1_000_000))),
    "stepNearMillion": float(np.float32(1_000_000) + np.float32(0.1) - np.float32(1_000_000)),
    "eps32": float(np.finfo(np.float32).eps), "eps64": float(np.finfo(np.float64).eps),
}

# ── 7. Softmax: the page's block, without and with the shift, and the log ──
def softmax(z):
    z = z - np.max(z)
    e = np.exp(z)
    return e / e.sum()
zs = np.array([1000.0, 1001.0, 1002.0])
with np.errstate(over="ignore", invalid="ignore"):
    naive = np.exp(zs) / np.exp(zs).sum()
z2 = np.array([1000.0, 100.0])
with np.errstate(divide="ignore"):
    logp = np.log(softmax(z2))
sh = z2 - z2.max()
R["softmax"] = {
    "z": zs.tolist(), "naive": ["nan" if np.isnan(v) else float(v) for v in naive],
    "stable": [r4(v) for v in softmax(zs)], "ceiling": r2(np.log(np.finfo(np.float64).max)),
    "z2": z2.tolist(), "p2": [float(v) for v in softmax(z2)], "logp": ["-inf" if np.isneginf(v) else float(v) for v in logp],
    "logSoftmax": [float(v) for v in sh - np.log(np.exp(sh).sum())],
    "shifted": (zs - zs.max()).tolist(),
}

# ── 8, 9. Mini-batches, and shuffling features and labels together ──
# The trap: a generator that seeds itself on every call (the page's own
# version until 2026-11-20, when this video's writer found it) deals every
# epoch in the same order. The page's fix: one generator for the whole run,
# passed in, so each call draws a new permutation.
def reseeding_minibatches(X, y, batch_size, seed=0):
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(X))
    for start in range(0, len(X), batch_size):
        batch = idx[start:start + batch_size]
        yield X[batch], y[batch]
def iterate_minibatches(X, y, batch_size, rng):
    idx = rng.permutation(len(X))
    for start in range(0, len(X), batch_size):
        batch = idx[start:start + batch_size]
        yield X[batch], y[batch]
Xm = np.arange(10).reshape(10, 1); ym = np.arange(10)
epoch1 = [yb.tolist() for _, yb in reseeding_minibatches(Xm, ym, batch_size=4)]
epoch2 = [yb.tolist() for _, yb in reseeding_minibatches(Xm, ym, batch_size=4)]
shared = np.random.default_rng(0)
page1 = [yb.tolist() for _, yb in iterate_minibatches(Xm, ym, batch_size=4, rng=shared)]
page2 = [yb.tolist() for _, yb in iterate_minibatches(Xm, ym, batch_size=4, rng=shared)]
assert page1 == epoch1 and page2 != epoch1, "the page's first epoch should match the reseeding one, and its second should not"
bc = load_breast_cancer()
Xb, yb_ = bc.data, bc.target                          # 1 is benign in scikit-learn
Xtr, Xte, ytr, yte = train_test_split(Xb, yb_, test_size=0.3, random_state=0, stratify=yb_)
model = lambda: make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000))
rs = np.random.default_rng(0)
idx = rs.permutation(len(Xtr))
aligned = model().fit(Xtr[idx], ytr[idx]).score(Xte, yte)
separate = model().fit(Xtr[rs.permutation(len(Xtr))], ytr[rs.permutation(len(Xtr))]).score(Xte, yte)
R["batches"] = {"epoch1": epoch1, "epoch2": epoch2, "epoch2Shared": page2, "sizes": [len(b) for b in epoch1]}
R["shuffle"] = {
    "train": int(len(ytr)), "test": int(len(yte)),
    "aligned": r3(aligned), "separate": r3(separate), "majority": r3(max(yte.mean(), 1 - yte.mean())),
    "majorityClass": "benign" if yte.mean() > 0.5 else "malignant",
}

# ── 10. Reservoir sampling: a simulation of twenty thousand streams ──
rr = np.random.default_rng(11)
L, K, RUNS = 1000, 10, 20000
kept = np.zeros(L, int)
for _ in range(RUNS):
    res = list(range(K))
    j = rr.integers(0, np.arange(K + 1, L + 1))       # item i (1-based, i > K) draws j in [0, i)
    for h in np.nonzero(j < K)[0]:
        res[j[h]] = K + h
    kept[res] += 1
share = kept / RUNS
tenths = kept.reshape(10, -1).sum(1) / (RUNS * K)
sizes = rr.binomial(L, K / L, RUNS)                   # keep each line with probability k / n
R["reservoir"] = {
    "stream": L, "k": K, "runs": RUNS,
    "itemShare": [r4(share.min()), r4(share.max())], "expected": K / L,
    "tenths": [r4(v) for v in tenths], "tenthsRange": [r4(tenths.min()), r4(tenths.max())],
    "coinSizes": {"p5": int(np.percentile(sizes, 5)), "p95": int(np.percentile(sizes, 95)),
                  "min": int(sizes.min()), "max": int(sizes.max()), "notTen": r3(np.mean(sizes != K))},
}

# ── The quick round ──
labels = ["cat", "dog", "cat", "bird", "dog", "cat"]
counts = Counter(labels)
items_d = ["b", "a", "b", "c", "a"]
P = np.array([[0.7, 0.2, 0.1], [0.1, 0.3, 0.6], [0.2, 0.5, 0.3], [0.5, 0.1, 0.4]])
yt = np.array([1, 0, 1, 0, 0, 1]); yp = np.zeros(6, int)
tp = int(((yp == 1) & (yt == 1)).sum()); fp = int(((yp == 1) & (yt == 0)).sum())
with np.errstate(invalid="ignore"):
    prec_np = np.float64(tp) / np.float64(tp + fp)
Ek = np.random.default_rng(2).normal(size=(100_000, 64)); qk = np.random.default_rng(3).normal(size=64)
dk = ((Ek - qk) ** 2).sum(1)
t_dist = best(lambda: ((Ek - qk) ** 2).sum(1), 5)
t_ksort = best(lambda: np.argsort(dk), 5)
t_kpart = best(lambda: np.argpartition(dk, 10)[:10], 9)
R["rapid"] = {
    "counts": counts.most_common(), "majority": counts.most_common(1)[0][0],
    "majorityShare": r3(counts.most_common(1)[0][1] / len(labels)),
    "dedupIn": items_d, "dedup": list(dict.fromkeys(items_d)),
    "probs": P.tolist(), "argmax1": P.argmax(axis=1).tolist(), "argmax0": P.argmax(axis=0).tolist(),
    "shapes": {"P": list(P.shape), "axis1": list(P.argmax(axis=1).shape), "axis0": list(P.argmax(axis=0).shape)},
    "precisionNumpy": "nan" if np.isnan(prec_np) else float(prec_np),
    "precisionSklearn": float(precision_score(yt, yp)),
    "knn": {"n": 100_000, "d": 64, "k": 10, "ms": {"distances": r2(t_dist), "sort": r2(t_ksort), "partition": r2(t_kpart)},
            "distShareSort": r3(t_dist / (t_dist + t_ksort)), "distSharePartition": r3(t_dist / (t_dist + t_kpart))},
}

json.dumps(R)
`);

const R = JSON.parse(out);
writeFileSync(join(here, "results.json"), JSON.stringify(R) + "\n");
const brief = (o) => JSON.stringify(o, (k, v) => (Array.isArray(v) && v.length > 12 ? `[${v.length} items]` : v));
for (const k of Object.keys(R)) console.log(k, brief(R[k]));

// ── What the narration and the screen take from the page ─────────────────
const page = readFileSync(join(here, "../../../../content/interview/machine-learning-engineer/coding.mdx"), "utf8");
const problems = [];
const QUESTIONS = [
  "Why does NumPy vectorization beat a Python `for` loop?",
  "What is broadcasting, and why is it useful?",
  "How do you find the top-k scores efficiently?",
  "When do you reach for a hash map in an ML coding task?",
  "How do you compute cosine similarity in NumPy?",
  "How do you implement mini-batching for training?",
  "Why subtract the max before exponentiating in softmax?",
  "How would you compute accuracy, precision, and recall from scratch?",
  "How do you decode class predictions from a probability matrix?",
  "How do you deduplicate a list while preserving order?",
  "What is reservoir sampling and when is it useful?",
  "Why do float32 vs float64 matter for ML data?",
  "How do you compute pairwise Euclidean distances between rows?",
  "What's the complexity of building a k-NN prediction naively vs with a heap?",
  "How do you shuffle features and labels together correctly?",
];
const asked = [...page.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
if (asked.length !== QUESTIONS.length) problems.push(`coding.mdx asks ${asked.length} questions; the video answers ${QUESTIONS.length}`);
for (const q of QUESTIONS) if (!asked.includes(q)) problems.push(`coding.mdx no longer asks: ${q}`);
const quotes = [
  "normal data-structures interview pointed at ML-adjacent tasks",
  "dispatches one call into precompiled C that runs over a\ncontiguous, typed buffer",
  "uses SIMD and cache locality",
  "reserve Python loops for the handful of steps that can't be expressed as array\nmath",
  "virtually\nstretching the smaller one along size-1 dimensions, without copying data",
  "`np.argpartition` runs in $O(n)$",
  "`heapq.nlargest(k, iterable)` maintains a size-k heap in\n$O(n \\log k)$",
  "the guard on the denominator is the one people forget",
  "L2-normalize the rows once, then a single matrix\nmultiply gives every pairwise similarity",
  "Shuffle the row indices once per epoch",
  "one generator for the whole run",
  "a function that seeds itself on every call deals every epoch in the\nsame order",
  "`exp(1000)` is beyond\nfloat64",
  "softmax is invariant to a constant shift",
  "`(n, n, d)` array",
  "computes the same result from a single matrix multiply plus norm vectors",
  "`float32` halves memory and bandwidth",
  "reductions (sums, means over large\narrays) are sometimes done in `float64`",
  "replace a random reservoir slot with\nprobability $k / i$",
  "single pass with $O(k)$ memory",
  "Never shuffle `X` and `y` independently",
  "tallying class frequencies for a baseline",
  "`dict.fromkeys(items)`",
  "sorting-based dedup is $O(n \\log n)$ and loses the original order",
  "`np.argmax(P, axis=1)`",
  "`TP = ((y_pred == 1) & (y_true == 1)).sum()`",
  "scan the distances keeping only the k smallest, $O(n \\log k)$",
  "KD-tree, ball tree,\nor an approximate index like HNSW",
];
// Compared with runs of whitespace collapsed, so a re-wrapped line still matches.
const flat = (t) => t.replace(/\s+/g, " ");
for (const q of quotes) if (!flat(page).includes(flat(q))) problems.push(`coding.mdx no longer says: ${flat(q)}`);

// ── What the measurements must still be, for the words said about them ───
const within = (v, lo, hi, what) => {
  if (!(v >= lo && v <= hi)) problems.push(`${what} is ${v}, outside ${lo} to ${hi}`);
};
// Timings: "roughly a hundred times", "roughly forty times", "more than
// ten times". On this machine, best of 15 runs, they come out about 85 to
// 120, 29 to 38 and 13 to 16.
within(R.vector.ratio.loop, 50, 200, "loop / matrix product (said: roughly a hundred times)");
within(R.vector.ratio.perRow, 30, 55, "per-row NumPy / matrix product (said: roughly forty times)");
within(R.topk.ratio, 10, 40, "sort / argpartition on a million (said: more than ten times)");
if (!(R.rapid.knn.ms.distances > R.rapid.knn.ms.sort)) problems.push("the distances no longer cost more than the full sort");
if (R.vector.maxDiff > 1e-9) problems.push("the loop and the matrix product disagree");
// Deterministic results.
const eq = (a, b, what) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(`${what}: ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
};
eq(R.cosine.pageTop[0], R.cosine.empty, "the page's top-k idiom ranks first");
eq(R.cosine.challengeTop[0], R.cosine.empty, "the challenge's argsort ranks first");
eq(R.cosine.argmax, R.cosine.empty, "argmax picks");
if (R.cosine.guardedTop.includes(R.cosine.empty)) problems.push("the guarded top three still holds the empty item");
eq(R.topk.top, [1, 3], "the page's top two");
eq(R.broadcast.wrongShape, [1000, 1000], "the broadcast shape");
eq(R.softmax.naive, ["nan", "nan", "nan"], "the unshifted softmax");
eq(R.softmax.stable, [0.09, 0.2447, 0.6652], "the shifted softmax");
eq(R.softmax.logp[1], "-inf", "the log of the underflowed probability");
eq(R.softmax.logSoftmax, [0, -900], "log-softmax");
eq(R.batches.epoch1, R.batches.epoch2, "two calls with the default seed");
eq(R.batches.sizes, [4, 4, 2], "the batch sizes");
eq(R.floats.stepNearMillion, 0.125, "0.1 added near a million");
eq(R.rapid.dedup, ["b", "a", "c"], "dict.fromkeys");
eq(R.rapid.precisionNumpy, "nan", "precision with no predicted positives, NumPy");
eq(R.rapid.precisionSklearn, 0, "precision with no predicted positives, scikit-learn");
if (R.pairwise.nanAfterClip !== 0) problems.push("clipping no longer removes every NaN");
if (R.pairwise.maxAbsVsBroadcast > 0.001 * R.pairwise.typical) problems.push("the clipped identity no longer matches the broadcast distances");

// ── The numbers the narration says in words ───────────────────────────────
const { script } = await import(pathToFileURL(join(here, "script.ts")).href);
const text = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`script.ts has no beat "${id}"`);
  return b.text.toLowerCase();
};
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const words = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
const pctWords = (v) => `${words(Math.round(v * 100))} percent`;
const tenthsOff = Math.max(...R.reservoir.tenths.map((v) => Math.abs(v - 0.1)));
/** A decimal as Drew says it: 0.24 → "point two four", 2.29 → "two point three". */
const decimal = (v, places) => {
  const [whole, frac] = v.toFixed(places).split(".");
  return `${whole === "0" ? "" : `${words(Number(whole))} `}point ${[...frac].map((c) => ONES[Number(c)]).join(" ")}`;
};
const claims = [
  ["q1-time", "a hundred thousand items"],
  ["q1-time", "roughly a hundred times slower"],
  ["q1-row-ratio", "roughly forty times slower"],
  ["q2-zero", "top three puts the empty item first"],
  ["q3-time", "more than ten times faster"],
  ["q4-trap", decimal(R.broadcast.mseWrong, 1)],
  ["q4-trap", decimal(R.broadcast.mseRight, 2)],
  ["q4-trap", "a thousand by a thousand"],
  // 102.4 GB and 800 MB: arithmetic, checked here so the bytes and the words agree.
  ["q5", R.pairwise.broadcastBytes === 102_400_000_000 ? "about a hundred gigabytes" : "(the broadcast bytes changed)"],
  ["q5-identity", R.pairwise.identityBytes === 800_000_000 ? "eight hundred megabytes" : "(the identity bytes changed)"],
  ["q5-neg", `${words(Math.round((R.pairwise.selfNegative / R.pairwise.rows) * 10))} in ten`],
  ["q5-neg", `${words(Math.round((R.pairwise.selfNegative64 / R.pairwise.rows) * 10))} in ten`],
  ["q6", R.floats.bytes32 === 5_120_000_000 && R.floats.bytes64 === 10_240_000_000 ? "about five gigabytes in float thirty-two, and ten" : "(the float bytes changed)"],
  ["q6-cost", `one million ${words(Math.round((R.floats.running32 - 1e6) / 1000))} thousand`],
  ["q6-cost", pctWords(R.floats.runningError)],
  ["q6-cost", R.floats.stepNearMillion === 0.125 ? "rounded to an eighth" : "(the step near a million changed)"],
  ["q6-fix", R.floats.pairwise32 - 1e6 === 0.125 ? "misses by only an eighth" : "(the pairwise sum changed)"],
  ["q7", `seven hundred and ${words(Math.floor(R.softmax.ceiling) - 700)}`],
  ["q7-fix", `${words(Math.round(R.softmax.stable[0] * 100))}, ${words(Math.round(R.softmax.stable[1] * 100))} and ${words(Math.round(R.softmax.stable[2] * 100))} percent`],
  ["q7-log", `minus ${words(-R.softmax.logSoftmax[1] / 100)} hundred`],
  ["q8", R.batches.sizes.map(words).join(", ").replace(/, (\w+)$/, " and $1")],
  ["q9", pctWords(R.shuffle.aligned)],
  ["q9", pctWords(R.shuffle.separate)],
  ["q9", `guessing ${R.shuffle.majorityClass}, at ${words(Math.round(R.shuffle.majority * 100))}`],
  ["q10-sim", "twenty thousand streams of a thousand"],
  ["q10-sim", "ten percent"],
  ["q10-alt", `${words(R.reservoir.coinSizes.p5)} to ${words(R.reservoir.coinSizes.p95)}`],
  ["r-hash", `${R.rapid.majority}, ${R.rapid.majorityShare === 0.5 ? "half" : "(the share changed)"} the time`],
];
for (const [id, phrase] of claims) if (!text(id).includes(phrase)) problems.push(`beat "${id}" no longer says "${phrase}"`);
// "each tenth of the stream supplied ten percent": within a fifth of a point.
if (tenthsOff > 0.002) problems.push(`a tenth of the stream supplied ${tenthsOff} away from ten percent`);
if (R.cosine.items.length !== 6) problems.push("the catalog is no longer six items");

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("\nok: the page and the narration agree with the run");
