"""Computes every count, reply, weight and word the NLP history video shows.

    export NLTK_DATA=<folder holding corpora/gutenberg and models/word2vec_sample>
    python -I src/videos/nlp-history/measure.py > src/videos/nlp-history/measurements.json

Run with the site's Pyodide versions (NLTK 3.9.4, NumPy 2.4.6). Each part
re-runs the lesson's own code where the lesson has some
(content/courses/natural-language-processing-python/interesting-discussions.mdx),
verbatim, so what it prints is what the page prints; the printed lines go to
stderr and agree with the page's prepopulated outputs
(lib/generated/block-outputs.json, keys 420e59ef, 3ed0a4c2 and 207d9aa4).

- "zipf" is the lesson's Zipf block ("The quiet law: Zipf"): Jane Austen's
  Emma from NLTK's Gutenberg corpus, lowercased, alphabetic tokens only,
  counted with FreqDist. Beyond the block's top eight rows it keeps the top
  thirty counts (the video's bars), the book's size, how many different
  words it has, how many appear once (hapaxes), what share of the book the
  most common hundred words make up, and the least-squares slope of log
  count against log rank (the "roughly one over the rank" the script says).
- "bigram" is the lesson's next-word block ("1948, Shannon and the n-gram"):
  its fifteen-word text, the counts of what follows each word, and its
  guesses.
- "eliza" is the lesson's ELIZA block ("1966, ELIZA"): its four inputs and
  the replies its rules give.
- "idf" is Karen Spärck Jones's own weighting rule, as her 1972 paper states
  it ("A statistical interpretation of term specificity and its application
  in retrieval", Journal of Documentation 28(1), p. 15 of the 2004 reprint):
  let f(n) = m such that 2^(m-1) < n <= 2^m; in a collection of N documents
  a term in n of them weighs f(N) - f(n) + 1. Her example is the Cranfield
  collection, N = 200: a term in ninety documents weighs 2 and one in three
  weighs 7, which this asserts.
- "w2v" is word2vec: the sample of Google's pretrained GoogleNews vectors
  that NLTK distributes (nltk_data models/word2vec_sample, 43,981 words of
  300 dimensions), fetched from the same nltk_data repository the lessons
  load from. Each vector is scaled to unit length, as gensim does for
  most_similar, and king - man + woman is compared with every word by cosine
  similarity, leaving out the three words in the question (the usual
  convention, and gensim's). The figure draws five words on a plane through
  "man": the direction from man to woman, and the direction from man to king
  with its man-to-woman part taken out. "excellent" gets its six nearest
  words, for the lesson's bag-of-words point that "great" and "excellent"
  were unrelated columns.
"""

import json
import math
import os
import platform
import re
import sys
from collections import Counter, defaultdict

import nltk
import numpy as np
from nltk.corpus import gutenberg
from nltk.probability import FreqDist


def say(*args):
    print(*args, file=sys.stderr)


def r(x, d=4):
    return round(float(x), d)


out = {
    "env": {
        "python": platform.python_version(),
        "nltk": nltk.__version__,
        "numpy": np.__version__,
    }
}

# ── Zipf: the lesson's block, verbatim ──────────────────────────────────────
words = [w.lower() for w in gutenberg.words("austen-emma.txt") if w.isalpha()]
fd = FreqDist(words)
ranked = fd.most_common()

say(f"{'rank':>4} {'word':12} {'freq':>6} {'rank*freq':>10}")
for rank, (word, freq) in enumerate(ranked[:8], start=1):
    say(f"{rank:>4} {word:12} {freq:>6} {rank * freq:>10}")

counts = np.array([c for _, c in ranked], dtype=float)
ranks = np.arange(1, len(counts) + 1)
slope, _ = np.polyfit(np.log10(ranks[:1000]), np.log10(counts[:1000]), 1)
hapaxes = int((counts == 1).sum())
# The 1/rank line the chart draws for comparison: slope fixed at -1, placed
# where it fits ranks 1 to 1,000 best (the mean of log rank + log count).
zipf_c = 10 ** float(np.mean(np.log10(ranks[:1000] * counts[:1000])))
# The whole ranked curve, compactly: the first and last rank of every run of
# equal counts (the tail is long runs of 3s, 2s and 1s).
curve = []
for i, c in enumerate(counts):
    if i == 0 or c != counts[i - 1] or i == len(counts) - 1 or c != counts[i + 1]:
        curve.append([int(i + 1), int(c)])
top100 = counts[:100].sum() / counts.sum()
say(f"  zipf: {len(words)} words, {len(fd)} different, {hapaxes} once; top 100 = {top100:.1%}; slope (ranks 1-1000) {slope:.3f}; 1/rank line C = {zipf_c:.0f}; curve {len(curve)} points")
out["zipf"] = {
    "book": "austen-emma.txt",
    "top": [{"rank": i + 1, "word": w, "count": c, "product": (i + 1) * c} for i, (w, c) in enumerate(ranked[:8])],
    "bars": [{"word": w, "count": c} for w, c in ranked[:30]],
    "words": len(words),
    "distinct": len(fd),
    "hapaxes": hapaxes,
    "top100Share": r(top100),
    "slope": r(slope, 3),
    "lineC": r(zipf_c, 1),
    # One over the rank, anchored on the top word: the second at half its count.
    "secondByLaw": round(ranked[0][1] / 2),
    # ... and the tenth at a tenth: the real tenth word beside it.
    "tenth": {"rank": 10, "word": ranked[9][0], "count": ranked[9][1]},
    "tenthByLaw": round(ranked[0][1] / 10),
    "hapaxShare": r(hapaxes / len(fd)),
    "curve": curve,
}

# ── Next-word counts: the lesson's block, verbatim ──────────────────────────
text = "the cat sat the cat ran the dog sat the dog ran the cat ran".split()

# Count, for each word, which word tends to follow it.
following = defaultdict(Counter)
for first, second in zip(text, text[1:]):
    following[first][second] += 1

# Given a word, the model's best guess for the next word:
guesses = {}
for word in ["the", "cat", "dog"]:
    guess = following[word].most_common(1)[0][0]
    guesses[word] = guess
    say(f"after {word!r:6} -> guess {guess!r}   (counts: {dict(following[word])})")
out["bigram"] = {
    "text": text,
    "following": {w: dict(following[w]) for w in ["the", "cat", "dog"]},
    "guess": guesses,
}


# ── ELIZA: the lesson's block, verbatim ─────────────────────────────────────
def eliza_reply(text):
    text = text.lower().strip().rstrip(".!")
    # A few hand-written reflection rules, exactly ELIZA's style.
    m = re.search(r"\bi need (.+)", text)
    if m:
        return f"Why do you need {m.group(1)}?"
    m = re.search(r"\bi am (.+)", text)
    if m:
        return f"How long have you been {m.group(1)}?"
    m = re.search(r"\bi feel (.+)", text)
    if m:
        return f"Tell me more about feeling {m.group(1)}."
    return "Please, go on."


inputs = ["I need a break", "I am tired", "I feel stuck", "The weather is fine"]
pairs = []
for line in inputs:
    say(f"You:   {line}")
    say(f"ELIZA: {eliza_reply(line)}\n")
    pairs.append({"you": line, "eliza": eliza_reply(line)})
out["eliza"] = pairs


# ── Spärck Jones's weights (1972) ───────────────────────────────────────────
def f(n):
    """m such that 2^(m-1) < n <= 2^m."""
    return max(0, math.ceil(math.log2(n)))


def weight(n, N):
    return f(N) - f(n) + 1


N = 200
assert weight(90, N) == 2 and weight(3, N) == 7, "her Cranfield example"
steps = []
for n in range(1, N + 1):
    w = weight(n, N)
    if not steps or steps[-1]["weight"] != w:
        steps.append({"from": n, "to": n, "weight": w})
    else:
        steps[-1]["to"] = n
say("  idf: Cranfield, N = 200: " + ", ".join(f"{s['from']}-{s['to']} docs -> {s['weight']}" for s in steps))
# Her rule counts halvings, so it tracks log2(N / n) + 1 (the reviewer's
# reading, and the bridge to the course's log(N / df)).
approx = lambda n: r(math.log2(N / n) + 1, 2)  # noqa: E731
say(f"  idf: log2(200/90) + 1 = {approx(90)}, log2(200/3) + 1 = {approx(3)}")
out["idf"] = {
    "N": N,
    "steps": steps,
    "examples": [
        {"docs": 90, "weight": weight(90, N), "log2": approx(90)},
        {"docs": 3, "weight": weight(3, N), "log2": approx(3)},
    ],
}

# ── word2vec ────────────────────────────────────────────────────────────────
path = os.path.join(os.environ["NLTK_DATA"], "models", "word2vec_sample", "pruned.word2vec.txt")
vocab, rows = [], []
with open(path, encoding="utf8") as fh:
    size, dims = map(int, fh.readline().split())
    for line in fh:
        parts = line.rstrip().split(" ")
        vocab.append(parts[0])
        rows.append(np.array(parts[1:], dtype=np.float32))
V = np.vstack(rows)
assert V.shape == (size, dims)
U = V / np.linalg.norm(V, axis=1, keepdims=True)
index = {w: i for i, w in enumerate(vocab)}
u = lambda w: U[index[w]]  # noqa: E731


def nearest(v, k, leave_out=()):
    v = v / np.linalg.norm(v)
    sims = U @ v
    order = np.argsort(-sims)
    return [{"word": vocab[i], "sim": r(sims[i], 3)} for i in order if vocab[i] not in leave_out][:k]


query = u("king") - u("man") + u("woman")
answer = nearest(query, 5, ("king", "man", "woman"))
assert answer[0]["word"] == "queen"
say(f"  w2v: {size} words x {dims}; king - man + woman -> " + ", ".join(f"{a['word']} {a['sim']}" for a in answer))

g = u("woman") - u("man")
g /= np.linalg.norm(g)
k = u("king") - u("man")
k = k - (k @ g) * g
k /= np.linalg.norm(k)
plane = {}
for w in ["man", "woman", "king", "queen"]:
    d = u(w) - u("man")
    plane[w] = [r(d @ g, 3), r(d @ k, 3)]
d = query - u("man")
plane["query"] = [r(d @ g, 3), r(d @ k, 3)]
say(f"  w2v plane: {plane}")
excellent = nearest(u("excellent"), 6, ("excellent",))
say("  w2v: excellent -> " + ", ".join(f"{a['word']} {a['sim']}" for a in excellent))
out["w2v"] = {
    "source": "nltk_data models/word2vec_sample (GoogleNews vectors, pruned)",
    "words": size,
    "dims": dims,
    "analogy": answer,
    "plane": plane,
    "excellent": excellent,
}

print(json.dumps(out, indent=1, ensure_ascii=False))
