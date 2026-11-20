// Computes every number the mle-system-design video says or shows, and writes
// results.json, which data.ts reads. No feature store, serving endpoint, GPU,
// queue or production traffic runs here, so nothing below is any real
// system's output. The numbers are of four kinds, each named on screen and
// aloud as what it is:
//
//   - Runs of scikit-learn in Pyodide (the runtime the site's Python blocks
//     run in), on data the video makes up and calls a simulation, seeded:
//       * training-serving skew: 100,000 card transactions, 2% fraud, two
//         features (the card's transactions in the past hour, and the
//         amount); a gradient-boosted model trained with the count built the
//         way a warehouse sees it (the current transaction already logged,
//         so it counts itself) and scored offline that way, then scored on
//         the same held-out transactions with the count the serving path
//         sees (before the current one is written): one less.
//   - Runs of scikit-learn on a set it bundles (the 1,797 handwritten
//     digits): a small neural network (two hidden layers, 128 and 64 units)
//     whose weights are rounded to 8, 4, 3 and 2 bits after training
//     (symmetric, one scale per layer), each scored on the same held-out
//     digits; and the same network's probabilities for one held-out nine,
//     the soft target a distilled student would learn from.
//   - A seeded queue simulation (charts/_theme.mjs's rng, the generator the
//     site's charts use) of one GPU serving requests, on the cost model the
//     batching chart on mlops.mdx uses (charts/batch-size-throughput.mjs: a batch of b
//     takes (b + 9) / 3200 seconds, so a fixed 2.8 ms a pass plus 0.31 ms a
//     request), one at a time against dynamic batching, checked against the
//     chart's caption.
//   - Arithmetic: the recommender's funnel (10,000,000 items against 500
//     candidates, the video's own round numbers for the page's "millions"
//     and "hundreds").
//
// Then it checks that the pages still say what the narration quotes from
// them, reads script.ts, and exits non-zero if a number the narration says
// no longer matches what is computed here.
//
// From the repo root (charts/_theme.mjs and pyodide need the root's
// node_modules; Pyodide takes about a minute to load):
//
//   node video/src/videos/mle-system-design/check.mjs
/* global console, process */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const require = createRequire(join(root, "package.json"));
const { rng } = await import(pathToFileURL(join(root, "charts/_theme.mjs")).href);

const problems = [];
const check = (ok, what) => {
  if (!ok) problems.push(what);
};

// ── The pages still say what the narration takes from them ─────────────────
// Whitespace and the pages' bold markers are normalized away, so a rewrap
// does not count as a change of meaning.
const pageText = (name) =>
  readFileSync(join(root, "content/interview/machine-learning-engineer", `${name}.mdx`), "utf8")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ");
const MSD = pageText("ml-system-design");
const MLOPS = pageText("mlops");
const QUOTES = [
  // Question 1, both pages.
  [MSD, "Batch precomputes predictions on a schedule and stores them"],
  [MSD, "stale and unable to use request-time features"],
  [MSD, "you own latency budgets, scaling, and availability"],
  [MSD, "hybrids (cached batch features + online scoring) are common"],
  [MLOPS, "Choose by the freshness and latency the product needs"],
  [MSD, "Feasible only for tiny input spaces"],
  [MLOPS, "<Chart slug=\"batch-size-throughput\" />"],
  // Question 2, both pages.
  [MSD, "When a feature is computed differently at training time than at serving time (different code, data, or timing)"],
  [MSD, "Offline metrics look fine; production underperforms"],
  [MLOPS, "rather than reimplementing the logic in the serving service"],
  // Questions 3 and 4.
  [MSD, "reuse (teams share vetted features) and train/serve consistency (the same transformation backs both paths)"],
  [MSD, "holds the full historical feature values used to create training datasets"],
  [MSD, "holds only the latest feature values and serves them at low latency during inference"],
  [MSD, "Writes flow from the pipeline into both stores"],
  // Questions 5 and 6.
  [MSD, "Latency is the time to serve a single request (p50/p95/p99 percentiles matter)"],
  [MSD, "larger batches improve throughput but increase per-request latency"],
  [MSD, "Horizontal scaling (more replicas) increases throughput without hurting per-replica latency"],
  [MSD, "A single inference request leaves most GPU cores idle"],
  [MSD, "waiting up to a few milliseconds to fill a batch"],
  // Question 7.
  [MSD, "from 32-bit float to 8-bit int (INT8) or even 4-bit"],
  [MSD, "Post-training quantization is simple; quantization-aware training recovers more accuracy for aggressive compression"],
  // Question 8.
  [MSD, "you collect labels by observing the outcome triggered by the model's prediction (click, purchase, fraud confirmed)"],
  [MSD, "delayed labels (purchase happens days later)"],
  [MSD, "survivorship bias (you only see outcomes for requests the model acted on)"],
  [MSD, "label shift (the model's actions change future distribution)"],
  [MSD, "Careful logging and held-out exploration help mitigate these"],
  // Question 9.
  [MSD, "velocity features (number of transactions in last 1 h / 24 h)"],
  [MSD, "gradient boosting for tabular data or a neural network for sequence modeling"],
  [MSD, "low-latency online inference (sub-100 ms at authorization time)"],
  [MSD, "confirmed fraud from chargebacks (delayed)"],
  [MSD, "distribution drift on velocity features"],
  // Questions 10 and 11.
  [MSD, "narrows millions of items to hundreds of candidates"],
  [MSD, "re-ranking, business rules (diversity, freshness, promotions)"],
  [MSD, "so the expensive model only scores a few hundred items, not millions"],
  [MSD, "so collaborative filtering cannot produce an embedding"],
  [MSD, "use popularity-based defaults"],
  [MSD, "blends collaborative and content-based signals with learned weights"],
  // Quick round.
  [MSD, "or computed on-the-fly from request context (e.g., session recency)"],
  [MSD, "Consistency between offline training features and online serving features is the core challenge"],
  [MSD, "a new null column, a unit change in a sensor"],
  [MSD, "where the GPU kernel-launch overhead would dominate"],
  [MSD, "the soft output probabilities"],
  [MSD, "The soft targets carry inter-class similarity information"],
  [MSD, "caching repeated inputs (hashing the feature vector)"],
  [MSD, "co-locating the model with calling services to cut network hops"],
  [MSD, "request queue depth"],
  [MSD, "so spikes don't drop requests while new replicas warm up"],
];
for (const [text, quote] of QUOTES) check(text.includes(quote), `a page no longer says "${quote}"`);
for (const [text, heading] of [
  [MSD, "### Batch vs online (real-time) inference?"],
  [MLOPS, "### Batch vs online inference, and how do you choose?"],
  [MSD, "### What is training–serving skew?"],
  [MLOPS, "### What is training–serving skew?"],
  [MSD, "### What is a feature store and why use one?"],
  [MLOPS, "### What is a feature store, and what problem does it solve?"],
  [MSD, "### What is a feature store's offline vs online store?"],
  [MSD, "### What is throughput vs latency in model serving?"],
  [MSD, "### How does request batching improve GPU throughput?"],
  [MSD, "### What is model quantization?"],
  [MSD, "### What is label collection and how do feedback loops work?"],
  [MSD, "### Sketch a fraud detection ML system."],
  [MSD, "### Sketch a recommendation / ranking system."],
  [MSD, "### How do you handle the cold-start problem in a recommendation system?"],
  [MSD, "### What is the difference between online and offline feature computation?"],
  [MSD, "### What is data validation and why does it matter before training?"],
  [MSD, "### When should you use GPU vs CPU for model serving?"],
  [MSD, "### What is knowledge distillation?"],
  [MSD, "### How do you reduce model serving latency?"],
  [MSD, "### How do you scale a model serving endpoint under variable load?"],
]) {
  check(text.includes(heading), `a page no longer asks "${heading}"`);
}

// ── Pyodide: the skew simulation, quantization and the soft target ─────────
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scikit-learn"] });
const out = py.runPython(`
import json, sys, warnings
import numpy as np
import sklearn
warnings.filterwarnings("ignore")
from sklearn.datasets import load_digits
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

R = {"runtime": {"python": sys.version.split()[0], "sklearn": sklearn.__version__, "numpy": np.__version__}}
r3 = lambda v: round(float(v), 3)
r4 = lambda v: round(float(v), 4)

# ── Question 2: one feature, counted one way in training, another in serving ──
rng = np.random.default_rng(1)
n = 100_000
fraud = rng.random(n) < 0.02
# The card's transactions in the past hour, before this one.
prior = np.where(fraud, rng.poisson(4.0, n), rng.poisson(0.5, n))
amount = np.round(np.where(fraud, rng.lognormal(4.6, 0.9, n), rng.lognormal(3.8, 0.9, n)), 2)
# The warehouse already holds the current transaction, so the training count
# includes it; the serving path counts before it is written.
X_train_def = np.column_stack([prior + 1, amount])
X_serve_def = np.column_stack([prior, amount])
y = fraud.astype(int)
idx = rng.permutation(n)
tr, te = idx[:70_000], idx[70_000:]
model = HistGradientBoostingClassifier(random_state=0).fit(X_train_def[tr], y[tr])
def scored(X):
    flag = model.predict(X[te]) == 1
    return {"recall": r3(recall_score(y[te], flag)), "precision": r3(precision_score(y[te], flag)), "flagged": int(flag.sum())}
# How often each count turns up at serving time, against training time (the
# figure's two histograms), over the held-out transactions.
def hist(counts, top=8):
    return [int((counts == k).sum()) for k in range(top)] + [int((counts >= top).sum())]
R["skew"] = {
    "n": n, "fraudShare": 0.02, "train": int(len(tr)), "test": int(len(te)), "testFraud": int(y[te].sum()),
    "offline": scored(X_train_def), "serving": scored(X_serve_def),
    "trainMinCount": int(X_train_def[:, 0].min()),
    "servingZeroShare": r3((X_serve_def[te, 0] == 0).mean()),
    "histTraining": hist(X_train_def[te, 0]), "histServing": hist(X_serve_def[te, 0]),
    # The model's average fraud score at each count, the rest of each row as
    # it is: the step the model learned sits one count later at serving.
    "scoreByCount": [r4(model.predict_proba(np.column_stack([np.full(len(te), k), amount[te]]))[:, 1].mean()) for k in range(9)],
}

# ── Question 7: rounding a trained network's weights to fewer bits ──
X, yd = load_digits(return_X_y=True)
X = X / 16.0
Xtr, Xte, ytr, yte = train_test_split(X, yd, test_size=0.3, random_state=0, stratify=yd)
net = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=600, random_state=0).fit(Xtr, ytr)
# The model as served: weights and biases stored as 32-bit floats.
net.coefs_ = [w.astype(np.float32).astype(np.float64) for w in net.coefs_]
net.intercepts_ = [b.astype(np.float32).astype(np.float64) for b in net.intercepts_]
weights = int(sum(w.size for w in net.coefs_))
biases = int(sum(b.size for b in net.intercepts_))
base_pred = net.predict(Xte)
base_acc = float((base_pred == yte).mean())
rows = [{"bits": 32, "weightBytes": weights * 4, "accuracy": r4(base_acc), "changed": 0, "fixed": 0, "broke": 0}]
saved = [w.copy() for w in net.coefs_]
for bits in [8, 4, 3, 2]:
    levels = 2 ** (bits - 1) - 1  # symmetric: -levels .. +levels
    q = []
    for w in saved:
        scale = np.abs(w).max() / levels
        q.append(np.clip(np.round(w / scale), -levels, levels) * scale)
    net.coefs_ = q
    pred = net.predict(Xte)
    net.coefs_ = saved
    changed = pred != base_pred
    rows.append({
        "bits": bits, "weightBytes": weights * bits // 8, "accuracy": r4((pred == yte).mean()),
        "changed": int(changed.sum()),
        "fixed": int((changed & (pred == yte)).sum()), "broke": int((changed & (base_pred == yte)).sum()),
    })
R["quant"] = {"weights": weights, "biases": biases, "test": int(len(yte)), "train": int(len(ytr)), "rows": rows}

# ── Quick round, distillation: the soft target for one held-out nine ──
P = net.predict_proba(Xte)
srt = np.sort(P, 1)
# The nine this network is least sure of, among nines it gets right: its
# probabilities are what a student would be trained to match.
nines = np.where((yte == 9) & (base_pred == 9))[0]
pick = int(nines[np.argmax(srt[nines, -2])])
R["soft"] = {
    "index": pick, "label": int(yte[pick]), "probs": [r3(v) for v in P[pick]],
    "image": [int(v) for v in (Xte[pick] * 16).round()],
    "medianTop": r4(np.median(srt[:, -1])), "shareAbove99": r3((srt[:, -1] > 0.99).mean()),
}
json.dumps(R)
`);
const R = JSON.parse(out);

// ── Questions 5 and 6: one GPU, one request at a time or in batches ────────
// The batching chart on mlops.mdx (charts/batch-size-throughput.mjs): a batch of b takes
// (b + 9) / 3200 seconds, so throughput is 3200 b / (b + 9) a second.
{
  const PEAK = 3200;
  const OVERHEAD = 9;
  const service = (b) => (b + OVERHEAD) / PEAK;
  const { caption } = await import(pathToFileURL(join(root, "charts/batch-size-throughput.mjs")).href);
  const at = (b) => ({ b, throughput: (PEAK * b) / (b + OVERHEAD), latencyMs: service(b) * 1000 });
  const one = at(1);
  const knee = at(32);
  const big = at(128);
  check(caption.includes(`${one.throughput.toFixed(0)} requests a second at ${one.latencyMs.toFixed(1)} ms each`), "the chart's caption, batch 1");
  check(caption.includes(`to about batch ${knee.b} (${knee.throughput.toFixed(0)} a second)`), "the chart's caption, the knee at 32");
  const curve = [1, 2, 4, 8, 16, 32, 64, 128].map((b) => {
    const r = at(b);
    return { b, throughputX: r.throughput / one.throughput, latencyX: r.latencyMs / one.latencyMs };
  });

  /** Requests arrive at random (a Poisson stream at `rate` a second, seeded)
   *  for `seconds`. When the GPU is free it takes what has queued, up to
   *  `maxBatch`; with a `wait`, a batch short of full holds until its first
   *  request has waited that long. Latency is arrival to the batch's end. */
  const simulate = ({ rate, maxBatch, wait, seconds = 60, seed = 7 }) => {
    const u = rng(seed);
    const arrivals = [];
    for (let t = -Math.log(1 - u()) / rate; t < seconds; t += -Math.log(1 - u()) / rate) arrivals.push(t);
    const N = arrivals.length;
    const latencies = [];
    const sizes = [];
    const queue = [];
    let i = 0;
    let free = 0;
    let head = 0; // index of the queue's first element (avoids O(n) shifts)
    while (i < N || head < queue.length) {
      if (head === queue.length) queue.push(arrivals[i++]);
      let start = Math.max(free, queue[head]);
      while (i < N && arrivals[i] <= start) queue.push(arrivals[i++]);
      if (queue.length - head < maxBatch) {
        const deadline = queue[head] + wait;
        while (i < N && arrivals[i] <= deadline && queue.length - head < maxBatch) queue.push(arrivals[i++]);
        start = queue.length - head >= maxBatch ? Math.max(start, queue[head + maxBatch - 1]) : Math.max(start, deadline);
      }
      const b = Math.min(maxBatch, queue.length - head);
      const end = start + service(b);
      for (let k = 0; k < b; k++) latencies.push({ arrived: queue[head + k], ms: (end - queue[head + k]) * 1000 });
      head += b;
      sizes.push(b);
      free = end;
    }
    // Steady state: requests that arrived after the first ten seconds.
    const ms = latencies.filter((l) => l.arrived >= 10).map((l) => l.ms).sort((a, b) => a - b);
    const q = (p) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))];
    const r2 = (v) => Math.round(v * 100) / 100;
    // Requests still waiting when the stream stops: the backlog it built.
    const backlogAtEnd = latencies.filter((l) => l.arrived < seconds && l.ms / 1000 + l.arrived > seconds).length;
    return {
      rate, maxBatch, waitMs: wait * 1000, requests: N, p50: r2(q(0.5)), p99: r2(q(0.99)),
      meanBatch: r2(sizes.reduce((a, b) => a + b, 0) / sizes.length), backlogAtEnd, seconds,
    };
  };
  const capacityOne = PEAK / (1 + OVERHEAD);
  R.batching = {
    model: { peak: PEAK, overhead: OVERHEAD, passMs: (OVERHEAD / PEAK) * 1000, perRequestMs: (1 / PEAK) * 1000 },
    chart: { one, knee, big, curve, kneeThroughputX: knee.throughput / one.throughput, kneeLatencyX: knee.latencyMs / one.latencyMs },
    capacityOne,
    capacityBatch32: at(32).throughput,
    heavy: {
      rate: 1000,
      backlogGrowth: 1000 - capacityOne,
      oneAtATime: simulate({ rate: 1000, maxBatch: 1, wait: 0 }),
      batched: simulate({ rate: 1000, maxBatch: 32, wait: 0 }),
      batchedWait: simulate({ rate: 1000, maxBatch: 32, wait: 0.005 }),
      // Four replicas, each serving a quarter of the stream one at a time.
      fourReplicas: simulate({ rate: 250, maxBatch: 1, wait: 0 }),
    },
    light: {
      rate: 100,
      oneAtATime: simulate({ rate: 100, maxBatch: 1, wait: 0 }),
      batched: simulate({ rate: 100, maxBatch: 32, wait: 0 }),
      batchedWait: simulate({ rate: 100, maxBatch: 32, wait: 0.005 }),
    },
  };
}

// ── Questions 10 and 11: the funnel, as arithmetic ─────────────────────────
R.funnel = { items: 10_000_000, candidates: 500, ratio: 10_000_000 / 500 };

// ── What the narration says, checked against the numbers ────────────────────
const { script } = await import(pathToFileURL(join(here, "script.ts")).href);
const beat = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`check.mjs: script.ts has no beat "${id}"`);
  return b.text;
};
const pct = (v) => Math.round(v * 100);
const S = R.skew;
const B = R.batching;
const Q = Object.fromEntries(R.quant.rows.map((r) => [r.bits, r]));
const said = [
  ["q2-result", "catches sixty percent of held-out fraud", 60, pct(S.offline.recall)],
  ["q2-result", "it catches forty-two", 42, pct(S.serving.recall)],
  ["q2-result", "the count was never zero", 1, S.trainMinCount],
  ["q2-result", "zero six times in ten", 6, Math.round(S.servingZeroShare * 10)],
  ["q5-gpu", "a batch of thirty-two", 32, B.chart.knee.b],
  ["q5-gpu", "about eight times the throughput", 8, Math.round(B.chart.kneeThroughputX)],
  ["q5-gpu", "four times the latency per pass", 4, Math.round(B.chart.kneeLatencyX)],
  ["q5-sim", "a thousand requests a second", 1000, B.heavy.rate],
  ["q5-sim", "three hundred and twenty a second", 320, Math.round(B.capacityOne)],
  ["q5-sim", "grows by six hundred and eighty every second", 680, Math.round(B.heavy.backlogGrowth)],
  ["q5-sim", "up to thirty-two at once", 32, B.heavy.batched.maxBatch],
  ["q5-sim", "within about ten milliseconds", 10, Math.round(B.heavy.batched.p99)],
  ["q5-wait", "a hundred requests a second", 100, B.light.rate],
  ["q5-wait", "a five-millisecond wait", 5, B.light.batchedWait.waitMs],
  ["q5-wait", "from three milliseconds", 3, Math.round(B.light.batched.p50)],
  ["q5-wait", "to eight", 8, Math.round(B.light.batchedWait.p50)],
  ["q7-run", "seventeen thousand weights", 17, Math.round(R.quant.weights / 1000)],
  ["q7-run", "sixty-eight kilobytes", 68, Math.round(Q[32].weightBytes / 1000)],
  ["q7-run", "ninety-seven point eight percent", 97.8, Math.round(Q[32].accuracy * 1000) / 10],
  ["q7-run", "five hundred forty held-out digits", 540, R.quant.test],
  ["q7-run", "eight bits, a quarter of the size", 0.25, Q[8].weightBytes / Q[32].weightBytes],
  ["q7-run", "not one answer changes", 0, Q[8].changed],
  ["q7-cliff", "four bits, an eighth of the size", 0.125, Q[4].weightBytes / Q[32].weightBytes],
  ["q7-cliff", "accuracy still holds", Q[32].accuracy, Q[4].accuracy],
  ["q7-cliff", "collapses to twenty-nine percent", 29, pct(Q[2].accuracy)],
  ["q7-qat", "two answers changed", 2, Q[4].changed],
  ["q7-qat", "one fixed and one broken", 1, Q[4].fixed],
  ["q7-qat", "one fixed and one broken", 1, Q[4].broke],
  ["q7-qat", "accuracy didn't move", Q[32].accuracy, Q[4].accuracy],
  ["q10-why", "Ten million items", 10_000_000, R.funnel.items],
  ["q10-why", "twenty thousand times the work of five hundred", 20_000, R.funnel.ratio],
  ["q10-why", "twenty thousand times the work of five hundred", 500, R.funnel.candidates],
  ["r-distill", "sixty-five percent nine", 65, pct(R.soft.probs[9])],
  ["r-distill", "thirty-five percent three", 35, pct(R.soft.probs[3])],
  ["r-distill", "one held-out nine", 9, R.soft.label],
];
for (const [id, words, means, value] of said) {
  if (!beat(id).includes(words)) problems.push(`${id}: no longer says "${words}"`);
  if (Math.abs(means - value) > 1e-9 * Math.max(1, Math.abs(means))) problems.push(`${id}: "${words}" is ${means}, computed ${value}`);
}
// The plan's count: eleven numbered aloud in order, and six quick ones.
const WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];
const aloud = script.beats
  .map((b) => b.text.match(/^Questions? ([a-z]+)(?: and ([a-z]+))?\./))
  .filter(Boolean)
  .flatMap((m) => [m[1], m[2]].filter(Boolean));
if (aloud.join() !== WORDS.join()) problems.push(`the questions read aloud are ${aloud.join(", ")}`);
const quick = script.beats.filter((b) => b.id.startsWith("r-")).length;
if (quick !== 6) problems.push(`the quick round has ${quick} answers, not six`);
if (!beat("plan").includes("Seventeen questions: eleven worked through, then six quickly")) problems.push("plan: the count changed");
R.said = said.map(([beatId, words, means]) => ({ beat: beatId, words, means }));

console.log(JSON.stringify(R, (k, v) => (Array.isArray(v) && v.length > 12 ? `[${v.length} items]` : v), 1));
writeFileSync(join(here, "results.json"), `${JSON.stringify(R, null, 2)}\n`);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.error(`ok: ${QUOTES.length} quotes on the pages, ${said.length} numbers said`);
