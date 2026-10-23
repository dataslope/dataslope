"""Computes every count, share, prediction and slope the Zipf deep dive shows.

    export NLTK_DATA=<folder holding corpora/gutenberg and corpora/stopwords>
    python -I src/videos/nlp-zipfs-law/measure.py > src/videos/nlp-zipfs-law/measurements.json

Run from video/, with NLTK 3.9.4 and NumPy 2.4.6 (the versions the site's
Pyodide 314.0.7 installs) and the NLTK data packages the lessons fetch.
data.ts imports the output as it is. Printed checks go to stderr.

1. **The lesson's block, verbatim.** "The quiet law: Zipf" in
   content/courses/natural-language-processing-python/interesting-discussions.mdx
   loads Jane Austen's Emma as
   `[w.lower() for w in gutenberg.words("austen-emma.txt") if w.isalpha()]`,
   counts it with FreqDist and prints rank, word, count and rank times count
   for the top eight. That block runs here as written, and its stdout is
   compared with what the site's Pyodide printed for it
   (lib/generated/block-outputs.json); any difference exits non-zero.

2. **The same FreqDist, read further.** Everything else comes from the
   `ranked` list that block leaves behind:
   - the whole rank-frequency curve, as the first and last rank of every run
     of equal counts (exact: the tail is long runs of 3s, 2s and 1s), for
     the linear plot, the zoom out to rank 7,079 and the log-log plot;
   - the top twenty words, for the bars;
   - what one over the rank predicts for ranks 1 to 10, anchored on the top
     word: count(1) / rank, so the second word at half the first and the
     tenth at a tenth;
   - the least-squares slope of log count against log rank over ranks 1 to
     1,000, and the 1/rank line placed where it fits those ranks best (slope
     fixed at -1, C the mean of log(rank x count)): the same fit, range and
     rounding as the unit video nlp-history, so both show -1.14;
   - the share of the book the hundred most common words make up (60%), how
     many words appear once (2,739, 39% of the 7,079 different words) or at
     most twice (3,766, 53%), the top hundred as a share of the different
     words (1.4%: what a log rank axis gives half its width), and
     how many of the top hundred are on NLTK's English stopword list, loaded
     as frequency-distributions.mdx loads it
     (`set(stopwords.words("english"))`).

These agree with the unit videos that show the same quantities:
nlp-counting-words/measurements.json (total, distinct, top ten, hapaxes) and
nlp-history/measurements.json (top100Share, slope, lineC, secondByLaw);
the final block asserts it.
"""

import contextlib
import io
import json
import os
import platform
import sys

import nltk
import numpy as np
from nltk.corpus import gutenberg, stopwords
from nltk.probability import FreqDist

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
LESSON = "content/courses/natural-language-processing-python/interesting-discussions.mdx"
PAGE = json.load(open(os.path.join(ROOT, "lib/generated/block-outputs.json")))


def say(*args):
    print(*args, file=sys.stderr)


def r(x, d=4):
    return round(float(x), d)


# ── 1. The lesson's block, verbatim, checked against the page ───────────────
BLOCK = '''# Count words in a single public-domain book.
words = [w.lower() for w in gutenberg.words("austen-emma.txt") if w.isalpha()]
fd = FreqDist(words)
ranked = fd.most_common()

print(f"{'rank':>4} {'word':12} {'freq':>6} {'rank*freq':>10}")
for rank, (word, freq) in enumerate(ranked[:8], start=1):
    print(f"{rank:>4} {word:12} {freq:>6} {rank * freq:>10}")
'''
ns = {"gutenberg": gutenberg, "FreqDist": FreqDist}
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    exec(BLOCK, ns)
printed = buf.getvalue().strip()
page = [
    "\n".join(c["content"] for c in b["cells"] if c["type"] == "stdout").strip()
    for b in PAGE[LESSON].values()
]
if printed not in page:
    say(f"MISMATCH: this run printed\n{printed}\nand {LESSON} shows none of its outputs")
    sys.exit(1)
say(f"── {LESSON}, the Zipf block: matches the page")
say(printed)

words, ranked = ns["words"], ns["ranked"]
counts = np.array([c for _, c in ranked], dtype=float)
ranks = np.arange(1, len(counts) + 1)
N = int(counts.sum())
V = len(ranked)

# ── 2. The same FreqDist, read further ─────────────────────────────────────
# The curve: first and last rank of every run of equal counts.
curve = []
for i, c in enumerate(counts):
    if i == 0 or c != counts[i - 1] or i == len(counts) - 1 or c != counts[i + 1]:
        curve.append([int(i + 1), int(c)])

FIT = 1000
slope, _ = np.polyfit(np.log10(ranks[:FIT]), np.log10(counts[:FIT]), 1)
line_c = 10 ** float(np.mean(np.log10(ranks[:FIT] * counts[:FIT])))

top = int(counts[0])
predict = [
    {"rank": k, "word": ranked[k - 1][0], "count": ranked[k - 1][1], "law": round(top / k), "product": k * ranked[k - 1][1]}
    for k in range(1, 11)
]

hapaxes = int((counts == 1).sum())
once_or_twice = int((counts <= 2).sum())
top100 = [w for w, _ in ranked[:100]]
stop = set(stopwords.words("english"))
top100_stop = sum(1 for w in top100 if w in stop)

out = {
    "env": {"python": platform.python_version(), "nltk": nltk.__version__, "numpy": np.__version__},
    "book": "austen-emma.txt",
    "words": N,
    "distinct": V,
    "top": [{"rank": i + 1, "word": w, "count": c} for i, (w, c) in enumerate(ranked[:20])],
    "predict": predict,
    "tenthOverLaw": r(predict[9]["count"] / predict[9]["law"], 2),
    "fitRanks": FIT,
    "slope": r(slope, 3),
    "lineC": r(line_c, 1),
    "top100Share": r(counts[:100].sum() / N),
    "top100Stop": top100_stop,
    # The top hundred in rank order, each with whether it is a stopword.
    "top100Words": [[w, w in stop] for w in top100],
    "hapaxes": hapaxes,
    "hapaxShare": r(hapaxes / V),
    "firstHapaxRank": V - hapaxes + 1,
    "onceOrTwice": once_or_twice,
    "onceOrTwiceShare": r(once_or_twice / V),
    "firstOnceOrTwiceRank": V - once_or_twice + 1,
    # The top hundred ranks as a share of the different words (they take half
    # a log rank axis that runs to 10,000).
    "top100OfDistinct": r(100 / V),
    "curve": curve,
}

say(f"── Emma: {N} words, {V} different; top word {ranked[0]}, second {ranked[1]}")
say(f"   1/rank from the top word: " + ", ".join(f"{p['rank']}:{p['law']}" for p in predict))
say(f"   the tenth ({predict[9]['word']}, {predict[9]['count']}) is {out['tenthOverLaw']}x its prediction")
say(f"   slope over ranks 1-{FIT}: {slope:.3f}; 1/rank line C = {line_c:.1f}")
say(f"   top 100 = {out['top100Share']:.1%} of the book, {top100_stop} of them stopwords")
say(f"   {once_or_twice} appear once or twice = {once_or_twice / V:.1%}, from rank {V - once_or_twice + 1}; the top 100 are {100 / V:.2%} of the different words")
say(f"   {hapaxes} appear once = {out['hapaxShare']:.1%} of the different words, from rank {out['firstHapaxRank']}")
say(f"   curve: {len(curve)} points")

# ── The unit videos show some of the same quantities: they must agree ───────
unit3 = json.load(open(os.path.join(HERE, "..", "nlp-counting-words", "measurements.json")))["emma"]
unit5 = json.load(open(os.path.join(HERE, "..", "nlp-history", "measurements.json")))["zipf"]
assert (unit3["total"], unit3["distinct"], unit3["hapaxes"]) == (N, V, hapaxes)
assert unit3["top10"] == [[w, c] for w, c in ranked[:10]]
assert unit3["ranked"] == [int(c) for c in counts]
assert (unit5["words"], unit5["distinct"], unit5["hapaxes"]) == (N, V, hapaxes)
assert (unit5["top100Share"], unit5["slope"], unit5["lineC"], unit5["hapaxShare"]) == (
    out["top100Share"], out["slope"], out["lineC"], out["hapaxShare"])
assert unit5["secondByLaw"] == predict[1]["law"]
assert unit5["curve"] == curve
say("── agrees with nlp-counting-words and nlp-history")

json.dump(out, sys.stdout, indent=1, ensure_ascii=False)
print()
