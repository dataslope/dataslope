// Computes every number the de-pipelines-for-ai video shows, in Pyodide 314
// with NumPy, the runtime the Pipelines for AI page's one block runs in the
// reader's browser, and writes what came back to results.json, which data.ts
// reads. From the repo root, where the pyodide package is installed:
//
//   node video/src/videos/de-pipelines-for-ai/check.mjs
//
// What runs, and where each number comes from:
//
// - The page's block (content/interview/data-engineer/pipelines-for-ai.mdx),
//   read out of the page and run as written, its printed lines captured: the
//   chunks to embed and to delete (Question 4).
// - Question 5: llm-meaning's five-word space, read from that video's
//   measurements.json (the course lesson's own vectors). The "second model"
//   is the same vectors with their three axes rotated one place, which the
//   screen calls a stand-in; its kitten is searched against the first space
//   by distance, as the lesson measures closeness.
// - Questions 6 and 8: a seeded NumPy simulation, said aloud as one. 20,000
//   vectors of 32 numbers around 100 random centers, 200 queries from the
//   same mixture, the exact top ten by distance, and a cluster index of 100
//   lists from 20 rounds of k-means. Recall is the share of the exact top ten
//   a probe finds; work is the share of vectors it compares. Then a tenant
//   per vector, one of 100 at random, and the top ten post-filtered to the
//   query's tenant. No vector database runs here and no latency is claimed.
// - Question 9: two made-up rankings of five tickets each, fused by the
//   page's reciprocal rank fusion with its k = 60; and TF-IDF's idf,
//   ln(N / df), as the tf-idf course video computes it, on the eight made-up
//   tickets.
// - Question 11: the page's arithmetic (10 million chunks at about 400
//   tokens), and a rate of a million tokens a minute, for scale only.
// - Question 3: 400 tokens in characters, at the prose rate llm-tokens
//   measured (900 characters in 201 o200k tokens).
// - The close: the track's bank and concept checks, counted in content/.
/* global console, URL */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const require = createRequire(join(root, "package.json"));
const { loadPyodide } = require("pyodide");

// ── The page's block, out of the page ─────────────────────────────────────────
const track = join(root, "content/interview/data-engineer");
const page = readFileSync(join(track, "pipelines-for-ai.mdx"), "utf8");
const blocks = [...page.matchAll(/starterCode: `([\s\S]*?)`,/g)].map((m) => m[1]);
if (blocks.length !== 1) throw new Error(`expected the page's one block, found ${blocks.length}`);
const block = blocks[0];

const meaning = JSON.parse(readFileSync(join(here, "../llm-meaning/measurements.json"), "utf8"));
const tokens = JSON.parse(readFileSync(join(here, "../llm-tokens/measurements.json"), "utf8"));
const prose = tokens.counts.samples.find((s) => s.kind === "prose");

// ── The track's practice, counted ────────────────────────────────────────────
const bank = (readFileSync(join(track, "multiple-choice-questions.mdx"), "utf8").match(/<MultipleChoice/g) ?? []).length;
const topics = JSON.parse(readFileSync(join(track, "meta.json"), "utf8"))
  .pages.filter((p) => !["index", "multiple-choice-questions"].includes(p) && !p.startsWith("---"));
const withChecks = topics.filter((p) => readFileSync(join(track, `${p}.mdx`), "utf8").includes("<MultipleChoice"));

const py = await loadPyodide({ packages: ["numpy"] });
py.globals.set("BLOCK", block);
py.globals.set("SPACE_JSON", JSON.stringify(meaning.space));
py.globals.set("PROSE_JSON", JSON.stringify(prose));

const out = py.runPython(`
import contextlib, io, json, math, sys
import numpy as np

r = {"runtime": f"Pyodide / Python {sys.version.split()[0]} / NumPy {np.__version__}"}

# ── 4. The page's block, run as written ─────────────────────────────────────
buf = io.StringIO()
ns = {}
with contextlib.redirect_stdout(buf):
    exec(BLOCK, ns)
printed = buf.getvalue().rstrip("\\n").split("\\n")
r["fresh"] = {
    "printed": printed,
    "indexed": ns["indexed"],
    "current": ns["current"],
    "toEmbed": ns["to_embed"],
    "toDelete": ns["to_delete"],
    "unchanged": sorted(c for c, h in ns["current"].items() if ns["indexed"].get(c) == h),
}
assert r["fresh"]["toEmbed"] == ["doc1#1", "doc3#0"] and r["fresh"]["toDelete"] == ["doc2#0"]

# ── 5. A second model's kitten, searched in the first model's space ─────────
space = json.loads(SPACE_JSON)
axes = space["axes"]
words = {w["word"]: np.array(w["vec"], dtype=float) for w in space["words"]}
order = ["cat", "kitten", "dog", "wolf", "truck"]
# The stand-in second model: the same meanings, its axes rotated one place.
rot = [1, 2, 0]
new_axes = [axes[i] for i in rot]
kitten_new = words["kitten"][rot]
dist = {w: round(float(np.linalg.norm(kitten_new - words[w])), 3) for w in order}
nearest = min(dist, key=dist.get)
r["switch"] = {
    "axes": axes,
    "newAxes": new_axes,
    "words": [{"word": w, "vec": [round(float(x), 2) for x in words[w]]} for w in order],
    "kittenOld": [round(float(x), 2) for x in words["kitten"]],
    "kittenNew": [round(float(x), 2) for x in kitten_new],
    "dist": dist,
    "nearest": nearest,
    # The same search with the first model's own kitten: cat, as the lesson says.
    "nearestSame": min((w for w in order if w != "kitten"), key=lambda w: float(np.linalg.norm(words["kitten"] - words[w]))),
}
assert nearest == "truck"

# ── 6 and 8. The simulation ─────────────────────────────────────────────────
rng = np.random.default_rng(11)
n, d, topics, nq, k = 20_000, 32, 100, 200, 10
noise = 1.2
centers = rng.normal(size=(topics, d))
X = centers[rng.integers(0, topics, n)] + noise * rng.normal(size=(n, d))
Q = centers[rng.integers(0, topics, nq)] + noise * rng.normal(size=(nq, d))

def sqd(A, B):
    return (A * A).sum(1)[:, None] - 2 * A @ B.T + (B * B).sum(1)[None, :]

D = sqd(Q, X)
exact = np.argsort(D, 1)[:, :k]

nlist = 100
C = X[rng.choice(n, nlist, replace=False)].copy()
for _ in range(20):
    a = np.argmin(sqd(X, C), 1)
    for j in range(nlist):
        m = a == j
        if m.any():
            C[j] = X[m].mean(0)
a = np.argmin(sqd(X, C), 1)
near = np.argsort(sqd(Q, C), 1)
probes = []
for nprobe in [1, 2, 4, 8, 16, 32]:
    rec, work = [], []
    for i in range(nq):
        cand = np.where(np.isin(a, near[i, :nprobe]))[0]
        work.append(len(cand) / n)
        top = cand[np.argsort(D[i, cand])[:k]]
        rec.append(len(set(top.tolist()) & set(exact[i].tolist())) / k)
    probes.append({"probe": nprobe, "recall": round(float(np.mean(rec)), 3), "work": round(float(np.mean(work)), 4)})
sizes = np.bincount(a, minlength=nlist)
r["ann"] = {
    "n": n, "d": d, "centers": topics, "queries": nq, "k": k, "lists": nlist,
    "listSize": {"min": int(sizes.min()), "max": int(sizes.max())},
    "probes": probes,
}

tenants = 100
tenant = rng.integers(0, tenants, n)
q_tenant = rng.integers(0, tenants, nq)
kept = np.array([(tenant[exact[i]] == q_tenant[i]).sum() for i in range(nq)])
r["filter"] = {
    "tenants": tenants,
    "k": k,
    "emptyShare": round(float((kept == 0).mean()), 3),
    "meanKept": round(float(kept.mean()), 3),
    "keptHist": {str(v): int((kept == v).sum()) for v in range(int(kept.max()) + 1)},
    # Each query's results after the filter, in query order, for the grid.
    "kept": [int(v) for v in kept],
    # The chance a top ten holds none of a 1% tenant, if the two are unrelated.
    "emptyChance": round((1 - 1 / tenants) ** k, 3),
}

# ── 9. Hybrid search: two rankings, fused; and idf on the made-up tickets ───
RRF_K = 60
vector = ["#1182", "#2071", "#0934", "#3310", "#1457"]
keyword = ["#3310", "#2650", "#0412", "#2071", "#1890"]
fused = {}
for lst in (vector, keyword):
    for rank, t in enumerate(lst, start=1):
        fused[t] = fused.get(t, 0.0) + 1 / (RRF_K + rank)
ranked = sorted(fused.items(), key=lambda kv: -kv[1])
tickets = {
    "#1182": "App crashes after the update",
    "#2071": "Error message when syncing",
    "#0934": "Update failed with an error",
    "#3310": "E-4031 when pairing a sensor",
    "#1457": "Sync error every morning",
    "#2650": "Pairing a second sensor",
    "#0412": "List of error codes",
    "#1890": "Sensor pairing times out",
}
# TF-IDF's idf, ln(N / df), over the eight tickets' words.
docs = {t: set(s.lower().split()) for t, s in tickets.items()}
def df(word):
    return sum(1 for ws in docs.values() if word in ws)
N = len(docs)
r["hybrid"] = {
    "k": RRF_K,
    "tickets": tickets,
    "vector": vector,
    "keyword": keyword,
    "fused": [{"ticket": t, "score": round(s, 4),
               "vectorRank": (vector.index(t) + 1) if t in vector else None,
               "keywordRank": (keyword.index(t) + 1) if t in keyword else None} for t, s in ranked],
    "idf": {"N": N,
            "error": {"df": df("error"), "idf": round(math.log(N / df("error")), 2)},
            "code": {"df": df("e-4031"), "idf": round(math.log(N / df("e-4031")), 2)}},
}
assert ranked[0][0] == "#3310"

# ── 11. The backfill, on the page's numbers ─────────────────────────────────
chunks, per = 10_000_000, 400
total = chunks * per
per_million = total // 1_000_000
rate = 1_000_000  # tokens a minute, for scale only
minutes = total / rate
r["backfill"] = {
    "chunks": chunks, "tokensPerChunk": per, "tokens": total,
    "millions": per_million,
    "rate": rate, "minutes": round(minutes), "hours": round(minutes / 60, 1), "days": round(minutes / 60 / 24, 2),
}

# ── 3. 400 tokens in characters, at llm-tokens' measured prose rate ─────────
p = json.loads(PROSE_JSON)
cpt = p["chars"] / p["tokens"]
r["chunk"] = {
    "proseChars": p["chars"], "proseTokens": p["tokens"], "charsPerToken": round(cpt, 2),
    "low": 300, "high": 500, "overlapLow": 0.10, "overlapHigh": 0.20,
    "chars400": round(400 * cpt),
}

json.dumps(r)
`);

const results = JSON.parse(out);
results.practice = { bank, topics: topics.length, withChecks: withChecks.length };
// The block as the page prints it, for the listing on screen.
results.fresh.block = block.split("\n");
if (withChecks.length !== topics.length) throw new Error(`concept checks on ${withChecks.length} of ${topics.length} topic pages`);
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
