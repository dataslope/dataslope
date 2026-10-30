"""Measures every id, vector, score and count the Llm-2-Meaning video shows.

    export TIKTOKEN_CACHE_DIR=...   # tiktoken's o200k_base, as the lessons load it
    python -I src/videos/llm-meaning/measure.py > src/videos/llm-meaning/measurements.json

Run in the versions the site's Pyodide 314.0.7 ships: NumPy 2.4.6 and
tiktoken 0.12.0. Each part re-runs one of the lesson code blocks the video is
built from, with the lesson's own numbers, in content/courses/how-llms-work/;
the page's prepopulated outputs (lib/generated/block-outputs.json) print the
same values, and the lesson's own printed lines are echoed on stderr so they
can be read against it.

- "ids": tiktoken o200k_base, the course's tokenizer (tokens.mdx). "berry" is
  19772 (Unit 1's strawberry is st, raw, berry); " cherry", with the leading
  space it has inside a sentence, is one token; and the vocabulary's own
  neighbours of 19772, decoded, so the video can say what sits next door.
- "prompt" is embeddings.mdx's "the cat sat on the mat", in o200k_base, for
  the path of a prompt in Part 4.
- "space" is embeddings.mdx, "Why a vector helps": the five hand-built
  three-number vectors [animal, size, domestic] and np.linalg.norm from cat.
- "order" is embeddings.mdx, "Position has to be added": the three 2-number
  vectors, the order-blind sum (the same for both sentences), and the
  lesson's position signal [0, 0.1 * i] added to each token. The lesson
  prints the positioned vectors one per word, as the video shows them: dog
  in the first slot is not dog in the last. Summing them would tie the two
  sentences again (both [1.5 1.8]), because a sum of word-plus-slot vectors
  is the sum of the words plus the sum of the slots, whatever the order; both
  sums are exported, and asserted equal, so that claim is checked too.
- "cosine" is similarity.mdx, "Why not straight-line distance": short [1, 1],
  long [5, 5], other [1, -1], with the lesson's cosine().
- "search" is similarity.mdx, "A working semantic search": the five documents
  over [finance, weather, sport, cooking], the finance query, and the lesson's
  search() (cosine, sorted, top 3).
- "weights" is attention-intuition.mdx, "Query, key, value": the hand-set
  relevance scores from "it" and the lesson's softmax.
- "qkv" is attention-intuition.mdx, "Doing it properly, with real vectors":
  keys, values and the query [1.0, 0.1]; the dot product of the query with
  each key (1.02, 0.40, 0.11), then divided by sqrt(2), the key dimension,
  as the lesson's code does; then the lesson's own suggestion, the query
  [0.2, 1.0], run the same way. "it"'s own query, key and value (the third
  row) are what the video's Fig. 12 draws.
- "cost" is attention-intuition.mdx, "The cost": n tokens make n * n pairs,
  the whole square the video's Fig. 16 frames. "decoder" is what the
  course's decoder-only models score of it: each token itself and every token
  before it, the lower triangle of the causal mask (np.tril), n (n + 1) / 2;
  the later tokens, the rest of the square, are never scored. Ten tokens make
  55 scores and twenty make 210, 3.82 times as many. The ratio is
  2 (2n + 1) / (n + 1), which nears four as n grows: the lesson's "roughly
  n^2/2 comparisons" and "doubling the input still quadruples the work".
- "params" is the-shape-of-a-transformer.mdx, "What the parameters are": the
  lesson's mid-sized model (vocab 128,000, d_model 4096, 32 layers,
  d_ff 14,336) and its own sums.
- "moe" is the-shape-of-a-transformer.mdx, "Mixture of experts": DeepSeek-V3's
  671 billion parameters and 37 billion per token, as the lesson cites them
  (DeepSeek-AI, DeepSeek-V3 Technical Report, arXiv:2412.19437), and the
  share that leaves; plus the lesson's own illustrative experts stack.
- "logits" is sampling.mdx, "Softmax turns scores into probabilities" (the
  next unit's lesson): the four example scores the closing figure shows as
  "a few of the vocabulary's scores".
"""

import json
import math
import sys

import numpy as np
import tiktoken


def r(v, digits=3):
    return round(float(v), digits)


def echo(*lines):
    for line in lines:
        print(line, file=sys.stderr)


def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()


out = {"versions": {"numpy": np.__version__, "tiktoken": tiktoken.__version__}}

# ── ids (tokens.mdx's tokenizer) ───────────────────────────────────────────────
enc = tiktoken.get_encoding("o200k_base")
berry = enc.encode("berry")
cherry = enc.encode(" cherry")
assert berry == [19772], berry
assert len(cherry) == 1, cherry
assert enc.encode("strawberry") == [302, 1618, 19772]
neighbours = [{"id": t, "piece": enc.decode([t])} for t in range(19768, 19777)]
out["ids"] = {
    "encoding": "o200k_base",
    "vocab": enc.n_vocab,
    "berry": berry[0],
    "cherry": cherry[0],
    "teeth": enc.encode(" teeth")[0],
    "neighbours": neighbours,
}
assert out["ids"]["teeth"] == 19770
# The prompt the path figure runs, embeddings.mdx's own sentence.
prompt = "the cat sat on the mat"
out["prompt"] = {"text": prompt, "tokens": [{"id": t, "piece": enc.decode([t])} for t in enc.encode(prompt)]}
echo("ids:", out["ids"])

# ── space (embeddings.mdx, "Why a vector helps") ───────────────────────────────
embeddings = {
    "cat": np.array([0.9, 0.2, 0.9]),
    "dog": np.array([0.9, 0.4, 0.9]),
    "wolf": np.array([0.9, 0.5, 0.1]),
    "kitten": np.array([0.9, 0.1, 0.9]),
    "truck": np.array([0.0, 0.9, 0.2]),
}
echo("", "Distance from 'cat':")
words = []
for word, vec in embeddings.items():
    d = np.linalg.norm(embeddings["cat"] - vec)
    echo(f"  {word:>7}: {d:.3f}")
    words.append({"word": word, "vec": [float(x) for x in vec], "dist": r(d)})
order_from_cat = [w["word"] for w in sorted(words, key=lambda w: w["dist"]) if w["word"] != "cat"]
assert order_from_cat == ["kitten", "dog", "wolf", "truck"], order_from_cat
out["space"] = {"axes": ["animal", "size", "domestic"], "words": words, "nearest": order_from_cat}

# ── order (embeddings.mdx, "Position has to be added") ─────────────────────────
emb = {"dog": np.array([0.9, 0.2]), "bites": np.array([0.1, 0.8]), "man": np.array([0.5, 0.5])}
s1 = ["dog", "bites", "man"]
s2 = ["man", "bites", "dog"]
pos = [np.array([0.0, 0.1 * i]) for i in range(3)]
sum1 = sum(emb[w] for w in s1)
sum2 = sum(emb[w] for w in s2)
assert np.allclose(sum1, sum2)


def positioned(words):
    return [emb[w] + pos[i] for i, w in enumerate(words)]


p1, p2 = positioned(s1), positioned(s2)
psum1, psum2 = sum(p1), sum(p2)
# Summed, the positioned vectors are equal as well: the sum hides the order again.
assert np.allclose(psum1, psum2)
assert not np.allclose(p1[0], p2[2])  # dog first is not dog last
echo("", "order-blind sums:", sum1, sum2, "positioned sums (lesson):", psum1.round(3), psum2.round(3))


def toks(words, vecs):
    return [{"word": w, "vec": [r(x) for x in v]} for w, v in zip(words, vecs)]


out["order"] = {
    "sentences": [s1, s2],
    "vectors": [toks(s1, [emb[w] for w in s1]), toks(s2, [emb[w] for w in s2])],
    "position": [[r(x) for x in p] for p in pos],
    "positioned": [toks(s1, p1), toks(s2, p2)],
    "sum": [[r(x) for x in sum1], [r(x) for x in sum2]],
    "positionedSum": [[r(x) for x in psum1], [r(x) for x in psum2]],
}

# ── cosine (similarity.mdx, "Why not straight-line distance") ──────────────────
short = np.array([1.0, 1.0])
long = np.array([5.0, 5.0])
other = np.array([1.0, -1.0])
euclid = float(np.linalg.norm(short - long))
out["cosine"] = {
    "short": short.tolist(),
    "long": long.tolist(),
    "other": other.tolist(),
    "euclid": r(euclid),
    "lengthRatio": r(np.linalg.norm(long) / np.linalg.norm(short)),
    "cosLong": r(cosine(short, long)),
    "cosOther": r(cosine(short, other)),
    "cosOpposite": r(cosine(short, -short)),
    "angleOther": r(math.degrees(math.acos(cosine(short, other))), 1),
}
echo("", "Euclidean distance short<->long:", round(euclid, 3))
echo("Cosine similarity short<->long: ", out["cosine"]["cosLong"])
echo("Cosine similarity short<->other:", out["cosine"]["cosOther"])

# ── search (similarity.mdx, "A working semantic search") ───────────────────────
DOCS = {
    "Quarterly revenue rose twelve percent": np.array([0.9, 0.0, 0.1, 0.0]),
    "Heavy rain expected across the region": np.array([0.0, 0.9, 0.1, 0.0]),
    "The match finished two goals to one": np.array([0.0, 0.1, 0.9, 0.0]),
    "Simmer the sauce for twenty minutes": np.array([0.0, 0.0, 0.0, 0.9]),
    "Earnings beat analyst expectations": np.array([0.85, 0.0, 0.0, 0.1]),
}


def search(query_vec, k=3):
    scored = [(cosine(query_vec, v), text) for text, v in DOCS.items()]
    scored.sort(reverse=True)
    return scored[:k]


query = np.array([0.95, 0.0, 0.0, 0.05])
all_scored = search(query, k=len(DOCS))
echo("", "Query is about: finance")
for score, text in search(query):
    echo(f"  {score:.3f}  {text}")
question = "How did the company perform financially?"
top = all_scored[0][1]
qwords = {w.strip("?.,").lower() for w in question.split()}
twords = {w.strip("?.,").lower() for w in top.split()}
assert not (qwords & twords), qwords & twords
out["search"] = {
    "axes": ["finance", "weather", "sport", "cooking"],
    "docs": [{"text": t, "vec": v.tolist(), "score": r(cosine(query, v))} for t, v in DOCS.items()],
    "question": question,
    "query": query.tolist(),
    "ranked": [{"text": t, "score": r(s)} for s, t in all_scored],
    "top": top,
    "sharedWords": sorted(qwords & twords),
}

# ── weights (attention-intuition.mdx, "Query, key, value") ─────────────────────
tokens = ["the", "trophy", "did", "not", "fit", "because", "it"]
raw_scores = np.array([0.1, 3.2, 0.1, 0.2, 1.1, 0.3, 0.5])
weights = softmax(raw_scores)
echo("", 'Attention from "it" to each token:')
for tok, w in zip(tokens, weights):
    echo(f"  {tok:>8}  {w:.3f}  {'#' * int(w * 50)}")
out["weights"] = {
    "tokens": tokens,
    "raw": raw_scores.tolist(),
    "weights": [r(w) for w in weights],
    "sum": r(weights.sum(), 6),
}

# ── qkv (attention-intuition.mdx, "Doing it properly, with real vectors") ──────
qk_tokens = ["trophy", "suitcase", "it"]
keys = np.array([[1.0, 0.2], [0.3, 1.0], [0.1, 0.1]])
values = np.array([[10.0, 0.0], [0.0, 10.0], [1.0, 1.0]])


def attend(q):
    dots = keys @ q  # the dot product of the query with each key
    scores = dots / np.sqrt(keys.shape[1])
    w = softmax(scores)
    return {
        "query": q.tolist(),
        "dots": [r(d) for d in dots],
        "scores": [r(s) for s in scores],
        "weights": [r(x) for x in w],
        "weightSum": r(sum(r(x) for x in w), 3),  # the three weights as shown, added
        "output": [r(x) for x in w @ values],
    }


toward_trophy = attend(np.array([1.0, 0.1]))
toward_suitcase = attend(np.array([0.2, 1.0]))
echo("", "raw scores:  ", toward_trophy["scores"], "weights:", toward_trophy["weights"], "output:", toward_trophy["output"])
echo("query [0.2, 1.0]:", toward_suitcase["scores"], toward_suitcase["weights"], toward_suitcase["output"])
assert np.argmax(toward_trophy["weights"]) == 0 and np.argmax(toward_suitcase["weights"]) == 1
assert toward_trophy["dots"] == [1.02, 0.4, 0.11], toward_trophy["dots"]
out["qkv"] = {
    "tokens": qk_tokens,
    "dim": int(keys.shape[1]),
    "keys": keys.tolist(),
    "values": values.tolist(),
    "trophy": toward_trophy,
    "suitcase": toward_suitcase,
}

# ── cost (attention-intuition.mdx, "The cost") ─────────────────────────────────
out["cost"] = [{"n": n, "scores": n * n} for n in (10, 20)]
assert out["cost"][1]["scores"] == 4 * out["cost"][0]["scores"]
# A decoder writes left to right: row i (the token scoring) has a score for
# column j (the token scored) only when j <= i, itself included.
decoder = []
for n in (10, 20):
    mask = np.tril(np.ones((n, n), dtype=bool))
    scores = int(mask.sum())
    assert scores == n * (n + 1) // 2 and int(mask.trace()) == n
    decoder.append({"n": n, "scores": scores, "later": int((~mask).sum())})
assert [d["n"] for d in decoder] == [c["n"] for c in out["cost"]]
out["decoder"] = {"counts": decoder, "ratio": r(decoder[1]["scores"] / decoder[0]["scores"], 2)}
assert 3.5 < out["decoder"]["ratio"] < 4
echo("", "decoder scores:", decoder, "ratio:", out["decoder"]["ratio"])

# ── params (the-shape-of-a-transformer.mdx, "What the parameters are") ─────────
vocab, d_model, n_layers, d_ff = 128_000, 4096, 32, 14_336
embedding = vocab * d_model
per_layer_attn = 4 * d_model * d_model
per_layer_ff = 2 * d_model * d_ff
per_layer = per_layer_attn + per_layer_ff
output_proj = vocab * d_model
total = embedding + n_layers * per_layer + output_proj
ff_share = n_layers * per_layer_ff / total
echo("", f"embedding table:   {embedding/1e9:6.2f}B")
echo(f"attention (x{n_layers}):  {n_layers*per_layer_attn/1e9:6.2f}B")
echo(f"feed-forward (x{n_layers}): {n_layers*per_layer_ff/1e9:6.2f}B")
echo(f"output projection: {output_proj/1e9:6.2f}B")
echo(f"total:             {total/1e9:6.2f}B parameters", f"Feed-forward share: {ff_share:.0%}")
out["params"] = {
    "vocab": vocab,
    "dModel": d_model,
    "layers": n_layers,
    "dFf": d_ff,
    "parts": [
        {"name": "Embedding table", "b": r(embedding / 1e9, 2)},
        {"name": "Attention", "b": r(n_layers * per_layer_attn / 1e9, 2)},
        {"name": "Feed-forward", "b": r(n_layers * per_layer_ff / 1e9, 2)},
        {"name": "Output projection", "b": r(output_proj / 1e9, 2)},
    ],
    "total": r(total / 1e9, 2),
    "ffShare": round(ff_share * 100),
}

# ── moe (the-shape-of-a-transformer.mdx, "Mixture of experts") ─────────────────
ds_total, ds_active = 671, 37  # billions, as the lesson cites DeepSeek-V3
md, mff, ml, ne, na = 4096, 2048, 36, 128, 4
per_expert = 2 * md * mff
stored = ml * ne * per_expert
used = ml * na * per_expert
out["moe"] = {
    "deepseek": {"total": ds_total, "active": ds_active, "share": r(100 * ds_active / ds_total, 1)},
    "illustrative": {"stored": r(stored / 1e9, 1), "used": r(used / 1e9, 1), "share": r(100 * used / stored, 1), "experts": ne, "active": na},
}
echo("", "moe:", out["moe"])

# ── logits (sampling.mdx, "Softmax turns scores into probabilities") ───────────
out["logits"] = {"tokens": ["cat", "dog", "bird", "rock"], "scores": [3.2, 2.1, 1.5, -0.4]}

json.dump(out, sys.stdout, indent=1)
print()
