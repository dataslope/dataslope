// Measures every number the mle-nlp-llms video shows, in Pyodide 314.0.7
// with NumPy, scikit-learn and tiktoken 0.12.0 (the runtime the Machine
// Learning Engineer pages' blocks run in the reader's browser), and writes
// what came back to results.json, which data.ts reads. Every random draw is
// seeded, so a rerun writes the same file. From the repo root:
//
//   node video/src/videos/mle-nlp-llms/check.mjs
//
// No language model runs here. The data is the track's own text
// (content/interview/machine-learning-engineer/*.mdx), a seeded simulation, or
// arithmetic from assumptions the narration says aloud:
//   - tokenization: a word vocabulary built from the track's seven other
//     topic pages, read against the NLP page's prose; the same prose in
//     characters and in o200k_base tokens (tiktoken's encoding file is
//     fetched from OpenAI's public bucket and handed to Pyodide, which has
//     no network of its own);
//   - retrieval: the track's 167 answers searched by shared words (TF-IDF
//     cosine, scikit-learn), standing in for the retrieval half of RAG;
//   - attention's scaling: a seeded simulation of queries and keys of 64
//     random numbers;
//   - multi-head cost, attention against the rest of a layer, the
//     embedding table, and LoRA: arithmetic from stated sizes.
//
// Then it fails (exit 1) if a page stops saying what the narration quotes
// from it, or the narration stops saying the numbers measured here.
/* global console, process, fetch, URL */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy", "scikit-learn", "tiktoken"] });

// tiktoken looks for its encoding file in TIKTOKEN_CACHE_DIR under the SHA-1
// of its URL, and checks the file's own hash when it loads it.
const ENCODING_URL = "https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken";
const res = await fetch(ENCODING_URL);
if (!res.ok) throw new Error(`fetching ${ENCODING_URL}: HTTP ${res.status}`);
py.FS.mkdirTree("/tiktoken");
py.FS.writeFile(`/tiktoken/${createHash("sha1").update(ENCODING_URL).digest("hex")}`, new Uint8Array(await res.arrayBuffer()));

const content = new URL("../../../../content/interview/machine-learning-engineer/", import.meta.url);
const read = (f) => readFileSync(new URL(f, content), "utf8");
const order = JSON.parse(read("meta.json")).pages.filter((p) => p !== "multiple-choice-questions");
py.globals.set("PAGES", py.toPy(Object.fromEntries(order.map((p) => [p, read(`${p}.mdx`)]))));

const out = py.runPython(`
import json, math, os, re, sys, warnings
warnings.filterwarnings("ignore")
os.environ["TIKTOKEN_CACHE_DIR"] = "/tiktoken"
import numpy as np
import sklearn
import tiktoken
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

r2 = lambda v: round(float(v), 2)
r3 = lambda v: round(float(v), 3)
R = {"runtime": {"python": sys.version.split()[0], "sklearn": sklearn.__version__, "numpy": np.__version__, "tiktoken": tiktoken.__version__}}
pages = dict(PAGES)

def prose(md):
    md = re.sub(r"^---.*?---", "", md, flags=re.S)
    md = re.sub(r"\`\`\`.*?\`\`\`", " ", md, flags=re.S)
    md = re.sub(r"<[A-Z][^>]*?/>", " ", md, flags=re.S)
    md = re.sub(r"<[A-Z][\\s\\S]*?</[A-Z][A-Za-z]*>", " ", md)
    md = re.sub(r"\\$\\$.*?\\$\\$", " ", md, flags=re.S)
    md = re.sub(r"\\$[^$\\n]*\\$", " ", md)
    md = re.sub(r"^#+ ", "", md, flags=re.M)
    md = re.sub(r"\\[([^\\]]*)\\]\\([^)]*\\)", r"\\1", md)
    md = re.sub(r"[*_\`]", "", md)
    return re.sub(r"\\s+", " ", md).strip()
P = {k: prose(v) for k, v in pages.items()}
words = lambda t: re.findall(r"[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*", t)

# ── 1. Tokenization: words, characters and subwords on the NLP page ──
others = [k for k in P if k not in ("nlp-and-llms", "index")]
vocab = {w.lower() for k in others for w in words(P[k])}
nlp = P["nlp-and-llms"]
W = [w.lower() for w in words(nlp)]
distinct = sorted(set(W))
unseen = [w for w in distinct if w not in vocab]
enc = tiktoken.get_encoding("o200k_base")
toks = enc.encode(nlp)
pieces = lambda w: [enc.decode([t]) for t in enc.encode(" " + w)]
WIDTH = 4096
R["tokens"] = {
    "vocabPages": others, "vocabWords": len(vocab),
    "pageWords": len(W), "pageDistinct": len(distinct),
    "unseenDistinct": len(unseen), "unseenDistinctShare": r3(len(unseen) / len(distinct)),
    "unseenRunningShare": r3(sum(w not in vocab for w in W) / len(W)),
    "unseenExamples": [w for w in ["hallucination", "bank", "autoregressive", "few-shot", "rlhf", "glove", "lora"] if w in unseen],
    "chars": len(nlp), "distinctChars": len(set(nlp)), "subwordTokens": len(toks),
    "charsPerToken": r2(len(nlp) / len(toks)), "tokensPerWord": r2(len(toks) / len(W)),
    "charPositionsOverTokens": r2(len(nlp) / len(toks)), "charPairsOverTokens": round((len(nlp) / len(toks)) ** 2),
    "encoding": "o200k_base", "vocabSize": enc.n_vocab,
    "pieces": {w: pieces(w) for w in ["hallucination", "tokenization", "unhappiness", "GloVe", "LoRA", "embeddings"]},
    "embeddingWidth": WIDTH, "embeddingTable": enc.n_vocab * WIDTH,
}
# The hook's sentence as o200k_base cuts it, so the chips on screen are real tokens.
HOOK = "A language model never sees your text."
R["hook"] = {"sentence": HOOK, "pieces": [enc.decode([t]) for t in enc.encode(HOOK)]}

# Two figures drawn from stated, illustrative scores (the screen says so):
# one query's four attention scores (question 4), and eight next-token
# scores for the temperature dial (the quick round). Softmaxed here.
sm = lambda v: (lambda e: e / e.sum())(np.exp(np.array(v) - max(v)))
ATT = {"words": ["the", "river", "bank", "flooded"], "query": 2, "scores": [0.2, 2.1, 1.3, 0.9]}
ATT["weights"] = [r3(v) for v in sm(ATT["scores"])]
NEXT = [3.0, 2.3, 1.7, 1.2, 0.7, 0.3, -0.2, -0.7]
p1 = sm(NEXT)
R["illustrative"] = {
    "attention": ATT,
    "nextScores": NEXT, "nextProbs": [r3(v) for v in p1],
    "topK": 3, "topP": 0.9, "topPCount": int(np.searchsorted(np.cumsum(p1), 0.9) + 1),
}

# ── 13. Retrieval by shared words over the track's 167 answers ──
docs = []
for name, md in pages.items():
    if name == "index":
        continue
    md = re.sub(r"\`\`\`.*?\`\`\`", " ", md, flags=re.S)
    for part in re.split(r"^### ", md, flags=re.M)[1:]:
        head, _, body = part.partition("\\n")
        body = re.sub(r"<[A-Z][\\s\\S]*?/>", " ", body.split("\\n## ")[0])
        docs.append((name, head.strip(), re.sub(r"\\s+", " ", body).strip()))
vec = TfidfVectorizer(stop_words="english", sublinear_tf=True)
M = vec.fit_transform([h + " " + b for _, h, b in docs])
query = "How do I stop an LLM making things up?"
s = cosine_similarity(vec.transform([query]), M)[0]
hi = [i for i, d in enumerate(docs) if d[1].startswith("What causes hallucination")][0]
an = vec.build_analyzer()
R["retrieval"] = {
    "passages": len(docs), "query": query, "queryTerms": an(query),
    "top": [{"page": docs[i][0], "question": docs[i][1], "score": r3(s[i])} for i in np.argsort(-s, kind="stable")[:3]],
    "target": {"page": docs[hi][0], "question": docs[hi][1], "score": r3(s[hi]),
               "shared": sorted(set(an(query)) & set(an(docs[hi][1] + " " + docs[hi][2]))),
               "above": int((s > s[hi]).sum())},
}

# ── 4. Why divide by the square root of the key length: a simulation ──
rng = np.random.default_rng(0)
dk, nk, rows = 64, 16, 2000
Q = rng.normal(0, 1, (rows, dk)); K = rng.normal(0, 1, (rows, nk, dk))
S = np.einsum("rd,rnd->rn", Q, K)
def softmax(x):
    x = x - x.max(1, keepdims=True); e = np.exp(x); return e / e.sum(1, keepdims=True)
Pu = softmax(S); Ps = softmax(S / math.sqrt(dk))
R["scaling"] = {
    "dk": dk, "keys": nk, "rows": rows, "rootDk": math.sqrt(dk),
    "rawSd": r2(S.std()), "scaledSd": r2((S / math.sqrt(dk)).std()),
    "topUnscaled": r3(Pu.max(1).mean()), "topScaled": r3(Ps.max(1).mean()),
    "over90Unscaled": r3((Pu.max(1) > 0.9).mean()), "over90Scaled": r3((Ps.max(1) > 0.9).mean()),
    "exampleRow": {"unscaled": [r3(v) for v in Pu[0]], "scaled": [r3(v) for v in Ps[0]]},
}

# ── 5. Multi-head costs what one head costs ──
d, h = 512, 8
R["heads"] = {"width": d, "heads": h, "headWidth": d // h, "projections": 4 * d * d,
              "pairMacsOne": d, "pairMacsMulti": h * (d // h)}

# ── 8, 9. Attention's pairs, and where they overtake the rest of a layer ──
# Per token per layer: the four attention projections (4 d^2) and a
# feed-forward four times as wide (8 d^2) are linear in the length; scores
# and the weighted sum of values are 2 n d. Equal at n = 6 d.
dm = 4096
R["cost"] = {
    "pairs": {str(n): n * n for n in [1000, 2000, 4000, 8000]},
    "width": dm, "ffnMultiple": 4, "linearPerToken": 12 * dm * dm, "crossover": 6 * dm,
    "curve": [{"n": n, "attention": 2 * n * dm, "rest": 12 * dm * dm} for n in range(0, 49153, 2048)],
}

# ── 12. LoRA, from stated sizes ──
r, layers = 8, 32
R["lora"] = {
    "width": dm, "rank": r, "layers": layers, "matricesPerLayer": 2,
    "full": dm * dm, "adapter": 2 * dm * r, "share": round(2 * dm * r / (dm * dm), 4),
    "trained": 2 * 2 * dm * r * layers, "model": 12 * dm * dm * layers,
    "trainedShare": round(2 * 2 * dm * r * layers / (12 * dm * dm * layers), 5),
    "copyGB": r2(12 * dm * dm * layers * 2 / 1e9), "adapterMB": r2(2 * 2 * dm * r * layers * 2 / 1e6),
}

json.dumps(R)
`);

const R = JSON.parse(out);
writeFileSync(join(here, "results.json"), JSON.stringify(R) + "\n");
const brief = (o) => JSON.stringify(o, (k, v) => (Array.isArray(v) && v.length > 12 ? `[${v.length} items]` : v));
for (const k of Object.keys(R)) console.log(k, brief(R[k]));

// ── What the narration quotes, still on the pages ──
const page = (f) => read(f).replace(/\s+/g, " ");
const problems = [];
const quotes = [
  ["nlp-and-llms.mdx", "### What is tokenization, and why is subword tokenization standard?"],
  ["nlp-and-llms.mdx", "frequent words stay whole, rare words split into reusable pieces"],
  ["nlp-and-llms.mdx", "no way to handle out-of-vocabulary words"],
  ["nlp-and-llms.mdx", "### What are word embeddings? Contrast word2vec and GloVe."],
  ["nlp-and-llms.mdx", "skip-gram predicts context words from a target"],
  ["nlp-and-llms.mdx", "factorizing a global word co-occurrence matrix"],
  ["ml-fundamentals.mdx", "### What are embeddings?"],
  ["ml-fundamentals.mdx", "collaborative filtering also learns user/item embeddings for recommendation"],
  ["nlp-and-llms.mdx", "### What is the difference between static and contextual embeddings?"],
  ["nlp-and-llms.mdx", 'so "bank" (river vs money) collapses into a single point'],
  ["nlp-and-llms.mdx", "### What is self-attention?"],
  ["deep-learning.mdx", "### What is self-attention?"],
  ["nlp-and-llms.mdx", "scaling keeps dot products from saturating the softmax"],
  ["nlp-and-llms.mdx", "### What is multi-head attention, and why use it?"],
  ["deep-learning.mdx", "### What is multi-head attention, and why use multiple heads?"],
  ["deep-learning.mdx", "It costs about the same as single-head attention because each head works in a smaller dimension"],
  ["nlp-and-llms.mdx", "### Describe the transformer architecture."],
  ["deep-learning.mdx", "### Describe the transformer architecture."],
  ["nlp-and-llms.mdx", "encoder-decoder models (T5) do sequence-to-sequence"],
  ["nlp-and-llms.mdx", "Dropping recurrence makes training parallel across all positions"],
  ["nlp-and-llms.mdx", "### Why did transformers replace RNNs for most NLP?"],
  ["nlp-and-llms.mdx", "### Why is attention's cost a scaling bottleneck for long documents?"],
  ["nlp-and-llms.mdx", "Doubling the context roughly quadruples the attention cost"],
  ["nlp-and-llms.mdx", "(sparse, sliding-window, or linear attention)"],
  ["nlp-and-llms.mdx", "### What is a context window, and why does its size matter?"],
  ["nlp-and-llms.mdx", "information beyond the limit is simply invisible to the model"],
  ["nlp-and-llms.mdx", "### What is pretraining, and what objectives are used?"],
  ["nlp-and-llms.mdx", "### What is the difference between pretraining and fine-tuning?"],
  ["nlp-and-llms.mdx", "**RLHF** (reinforcement learning from human feedback)"],
  ["nlp-and-llms.mdx", "### What is parameter-efficient fine-tuning (e.g., LoRA)?"],
  ["nlp-and-llms.mdx", "you train and ship a few million parameters instead of billions"],
  ["nlp-and-llms.mdx", "### What is retrieval-augmented generation (RAG), and why use it?"],
  ["nlp-and-llms.mdx", "### When would you choose RAG over fine-tuning, and vice versa?"],
  ["nlp-and-llms.mdx", "They compose: fine-tune for behavior, retrieve for facts."],
  ["llm-systems-and-evals.mdx", "hybrid keyword search"],
  ["nlp-and-llms.mdx", "### What are embeddings used for beyond input representation?"],
  ["nlp-and-llms.mdx", "### What causes hallucination, and how do you mitigate it?"],
  ["nlp-and-llms.mdx", "No method eliminates hallucination entirely"],
  ["nlp-and-llms.mdx", "### What is prompting, and what are zero-shot, few-shot, and chain-of-thought?"],
  ["nlp-and-llms.mdx", "### How do you control an LLM's output randomness?"],
  ["nlp-and-llms.mdx", "### How do you evaluate an LLM or NLP model?"],
];
for (const [file, phrase] of quotes) if (!page(file).includes(phrase.replace(/\s+/g, " "))) problems.push(`${file} no longer says: ${phrase}`);

// ── The numbers the narration says in words ──
const { script } = await import(new URL("./script.ts", import.meta.url).href);
const beat = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`no beat "${id}"`);
  return b.text;
};
const T = R.tokens;
const says = [
  ["q1-word", "seven other pages", T.vocabPages.length === 7],
  ["q1-word", "three thousand", Math.round(T.vocabWords / 1000) === 3],
  ["q1-word", "fifteen percent", Math.round(T.unseenRunningShare * 100) === 15],
  ["q1-word", "hallucination", T.unseenExamples.includes("hallucination")],
  ["q1-char", "five times", Math.round(T.charPositionsOverTokens) === 5],
  ["q1-char", "twenty-five times", T.charPairsOverTokens === 25],
  ["q1-sub", "two hundred thousand", Math.round(T.vocabSize / 1000) === 200],
  ["q1-sub", "in two", T.pieces.hallucination.length === 2],
  ["q1-sub", "one point four", Math.round(T.tokensPerWord * 10) === 14],
  ["q1-cost", "eight hundred million", Math.floor(T.embeddingTable / 1e8) === 8],
  ["q4-scale", "sixty-four", R.scaling.dk === 64],
  ["q4-scale", "eighty-five percent", Math.round(R.scaling.topUnscaled * 100) === 85],
  ["q4-scale", "eight times", R.scaling.rawSd === 8],
  ["q4-scale", "twenty-five", Math.round(R.scaling.topScaled * 100) === 25],
  ["q5-cost", "eight heads of sixty-four", R.heads.heads === 8 && R.heads.headWidth === 64],
  ["q5-cost", "five hundred and twelve", R.heads.pairMacsOne === R.heads.pairMacsMulti && R.heads.width === 512],
  ["q8-a", "a million pairs", R.cost.pairs["1000"] === 1e6],
  ["q8-a", "four million", R.cost.pairs["2000"] === 4e6],
  ["q8-when", "twenty-five thousand", Math.round(R.cost.crossover / 1000) === 25],
  ["q12-math", "seventeen million", Math.round(R.lora.full / 1e6) === 17],
  ["q12-math", "sixty-five thousand", Math.round(R.lora.adapter / 1000) === 66 || Math.floor(R.lora.adapter / 1000) === 65],
  ["q12-math", "under half a percent", R.lora.share < 0.005],
  ["q12-ship", "four million", Math.round(R.lora.trained / 1e6) === 4],
  ["q12-ship", "six and a half billion", Math.round(R.lora.model / 1e8) === 64],
  ["q12-ship", "eight-megabyte", Math.round(R.lora.adapterMB) === 8],
  ["q12-ship", "thirteen-gigabyte", Math.round(R.lora.copyGB) === 13],
  ["q13-miss", "hundred and sixty-seven", R.retrieval.passages === 167],
  ["q13-miss", "scores zero", R.retrieval.target.score === 0 && R.retrieval.target.shared.length === 0],
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
