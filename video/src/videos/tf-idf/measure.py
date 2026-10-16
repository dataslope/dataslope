"""Computes every number the TfIdf video shows; data.ts imports the output.

    python3 src/videos/tf-idf/measure.py > src/videos/tf-idf/measurements.json

The corpus, the tokenizer and the formulas are the lesson's own
(content/courses/natural-language-processing-python/tf-idf.mdx, "Step 3:
putting them together"):

    corpus = ["the cat sat on the mat", "the dog ran in the park",
              "the comet streaked across the sky"], each `.split()`
    tf(w, d)  = count of w in d / len(d)
    idf(w)    = math.log(N / df(w))          (natural log, no smoothing)
    tfidf     = tf * idf

Every number is computed twice and the two must agree, or this exits non-zero:

1. By hand, with `collections.Counter` and `math.log`, exactly as the lesson
   writes it.
2. With scikit-learn. Its TF is the raw count and its unsmoothed IDF is
   ln(N / df) + 1, so `TfidfVectorizer(smooth_idf=False, norm=None)` is the
   closest setting to the lesson: its `idf_` minus one must equal the lesson's
   IDF, its counts divided by the document length must equal the lesson's TF,
   and the product of those must equal the lesson's TF-IDF table.

The video also quotes scikit-learn's *default* `TfidfVectorizer()`
(smooth_idf=True, norm="l2"), where idf = ln((1 + N) / (1 + df)) + 1: that
is recorded under "sklearnDefault", checked against the formula by hand too.
"""

import json
import math
import platform
import sys
from collections import Counter

import numpy as np
import sklearn
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

LESSON = "content/courses/natural-language-processing-python/tf-idf.mdx"
CORPUS = [
    "the cat sat on the mat",
    "the dog ran in the park",
    "the comet streaked across the sky",
]
TOL = 1e-12

docs = [d.split() for d in CORPUS]
N = len(docs)
lengths = [len(d) for d in docs]

# Columns in order of first appearance: "the", then each document's own words.
vocab: list[str] = []
for d in docs:
    for w in d:
        if w not in vocab:
            vocab.append(w)

# ── 1. By hand, the lesson's way ──────────────────────────────────────────
counts = [[Counter(d)[w] for w in vocab] for d in docs]
df = [sum(1 for d in docs if w in d) for w in vocab]
idf = [math.log(N / k) for k in df]
tf = [[Counter(d)[w] / len(d) for w in vocab] for d in docs]
tfidf = [[tf[i][j] * idf[j] for j in range(len(vocab))] for i in range(N)]

# The lesson's own printed ranking for document 1 (its third code block).
lesson_doc0 = {w: round(tf[0][vocab.index(w)] * idf[vocab.index(w)], 3) for w in set(docs[0])}

# ── 2. scikit-learn, as close to the lesson as it goes ────────────────────
cv = CountVectorizer()
Xc = cv.fit_transform(CORPUS).toarray()
cols = [cv.vocabulary_[w] for w in vocab]
sk_counts = Xc[:, cols]

tv = TfidfVectorizer(smooth_idf=False, norm=None)
Xt = tv.fit_transform(CORPUS).toarray()[:, [tv.vocabulary_[w] for w in vocab]]
sk_idf_plus_one = tv.idf_[[tv.vocabulary_[w] for w in vocab]]
sk_idf = sk_idf_plus_one - 1.0
sk_tf = sk_counts / np.array(lengths)[:, None]
sk_tfidf = sk_tf * sk_idf[None, :]

# scikit-learn's raw output is count * (ln(N/df) + 1); confirm we read it right.
assert np.allclose(Xt, sk_counts * sk_idf_plus_one[None, :], atol=TOL)

diffs = {
    "counts": float(np.abs(sk_counts - np.array(counts)).max()),
    "idf": float(np.abs(sk_idf - np.array(idf)).max()),
    "tf": float(np.abs(sk_tf - np.array(tf)).max()),
    "tfidf": float(np.abs(sk_tfidf - np.array(tfidf)).max()),
}
for k, v in diffs.items():
    assert v <= TOL, f"scikit-learn and the hand computation disagree on {k}: {v}"

# ── 3. scikit-learn's default, which the video warns about ────────────────
dv = TfidfVectorizer()
Xd = dv.fit_transform(CORPUS).toarray()[:, [dv.vocabulary_[w] for w in vocab]]
d_idf = dv.idf_[[dv.vocabulary_[w] for w in vocab]]
hand_d_idf = [math.log((1 + N) / (1 + k)) + 1 for k in df]
assert np.allclose(d_idf, hand_d_idf, atol=TOL)
raw = np.array(counts) * np.array(hand_d_idf)[None, :]
hand_rows = raw / np.linalg.norm(raw, axis=1, keepdims=True)
assert np.allclose(Xd, hand_rows, atol=TOL)
the = vocab.index("the")

# ── Claims the narration makes, checked ───────────────────────────────────
checks = {
    # "The scores two in every row, more than any other word."
    "theCountEveryRow": [row[the] for row in counts],
    "maxOtherCount": max(c for row in counts for j, c in enumerate(row) if j != the),
    # "The is in all three."
    "theDf": df[the],
    # Every other word is in exactly one document.
    "otherDfs": sorted({k for j, k in enumerate(df) if j != the}),
    # "The log of three is about one point one."
    "lnThree": math.log(3),
    # "Cat is one word in six ... about zero point one eight."
    "catTf": tf[0][vocab.index("cat")],
    "catTfidf": tfidf[0][vocab.index("cat")],
    # "The column that led every row drops to zero."
    "theTfidfEveryRow": [row[the] for row in tfidf],
    # "What stays high is what only one document says": every word with df 1
    # scores the same, and above zero.
    "dfOneScores": sorted({round(tfidf[i][j], 12) for i in range(N) for j in range(len(vocab)) if df[j] == 1 and counts[i][j] > 0}),
    # Under scikit-learn's default, "the" never reaches zero and still tops
    # every row on this corpus.
    "defaultTheIdf": float(d_idf[the]),
    "defaultTheTopInEveryRow": bool(all(int(np.argmax(r)) == the for r in Xd)),
}

out = {
    "meta": {
        "lesson": LESSON,
        "python": platform.python_version(),
        "sklearn": sklearn.__version__,
        "numpy": np.__version__,
        "tolerance": TOL,
        "maxAbsDiffHandVsSklearn": diffs,
    },
    "corpus": CORPUS,
    "docs": docs,
    "lengths": lengths,
    "N": N,
    "vocab": vocab,
    "counts": counts,
    "df": df,
    "idf": idf,
    "tf": tf,
    "tfidf": tfidf,
    "lessonDoc0Rounded": dict(sorted(lesson_doc0.items(), key=lambda kv: (-kv[1], kv[0]))),
    "sklearnLesson": {
        "call": "TfidfVectorizer(smooth_idf=False, norm=None)",
        "idfPlusOne": sk_idf_plus_one.tolist(),
        "rawOutput": Xt.tolist(),
    },
    "sklearnDefault": {
        "call": "TfidfVectorizer()",
        "idf": d_idf.tolist(),
        "rows": Xd.tolist(),
    },
    "checks": checks,
}

json.dump(out, sys.stdout, indent=2)
sys.stdout.write("\n")
