"""Computes every value the Nlp-4-TextToFeatures video shows; data.ts imports the output.

    NLTK_DATA=<nltk_data> python src/videos/nlp-text-to-features/measure.py \
        > src/videos/nlp-text-to-features/measurements.json

Run in an environment pinned to the site's Pyodide 314.0.7 (NLTK 3.9.4, NumPy
2.4.6, scikit-learn 1.8.0), with the NLTK data packages the lessons load
(punkt_tab, stopwords). Every example is a lesson's own code, run as the
lesson writes it, in the four lessons of Unit 4 of
content/courses/natural-language-processing-python/:

  choosing-your-pipeline.mdx  "Seeing it: one text, two pipelines"
  bag-of-words.mdx            "Building it by hand", "Counts vs. presence",
                              and the limitations list ("dog bites man")
  tf-idf.mdx                  "Step 2" and "Step 3", plus the callout on
                              scikit-learn's default (the TfIdf video's
                              measure.py, adapted: hand vs scikit-learn)
  rule-based-sentiment.mdx    "A naive first attempt", "Adding negation
                              handling", and the limits list's sarcasm line

Where a lesson block prints, the same print statements run here and their
text is compared with the site's prepopulated output in
lib/generated/block-outputs.json (what the site's Pyodide printed). Any
difference exits non-zero, so the video cannot disagree with the page.
"""

import json
import math
import platform
import sys
from collections import Counter
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

import nltk
import numpy as np
import sklearn
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.util import ngrams
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

ROOT = Path(__file__).resolve().parents[4]
COURSE = "content/courses/natural-language-processing-python"
OUTPUTS = json.loads((ROOT / "lib/generated/block-outputs.json").read_text())
TOL = 1e-12


def page_prints(lesson: str) -> list[str]:
    """Every stdout the site's prepopulated output holds for a lesson's blocks."""
    entries = OUTPUTS[f"{COURSE}/{lesson}.mdx"]
    return ["".join(c["content"] for c in e["cells"] if c["type"] == "stdout") for e in entries.values()]


def run(fn) -> str:
    buf = StringIO()
    with redirect_stdout(buf):
        fn()
    return buf.getvalue().rstrip("\n")


def agrees(lesson: str, printed: str, what: str) -> str:
    # The page's cells drop the final newline; a stdout cell may also hold a
    # leading run that the block printed first, so match on containment.
    hits = [p for p in page_prints(lesson) if printed in p]
    assert hits, f"{lesson}: {what} does not match the page's output:\n{printed}"
    return what


agreed: list[str] = []

# ── 1. choosing-your-pipeline: one text, two pipelines ─────────────────────
review = "The plot was not good, but the acting was brilliant!"
stop = set(stopwords.words("english"))
tokens = word_tokenize(review)
alpha = [t.lower() for t in tokens if t.isalpha()]

topic = [t for t in alpha if t not in stop]
keep = {"not", "no", "nor", "never", "but"}
sent_stop = stop - keep
sent = [t for t in alpha if t not in sent_stop]
sent_bigrams = list(ngrams(sent, 2))


def pipeline_block():
    print("TOPIC features (what is it about?):")
    print("  ", topic)
    print("SENTIMENT features (how does it feel?):")
    print("  unigrams:", sent)
    print("  bigrams: ", sent_bigrams)


agreed.append(agrees("choosing-your-pipeline", run(pipeline_block), "pipeline: topic and sentiment features"))

pipeline = {
    "review": review,
    "tokens": tokens,
    # After lowercasing and dropping punctuation, before any stopword filter.
    "alpha": alpha,
    # What each pipeline drops from `alpha`, and why: a stopword, or kept.
    "stopwordsInReview": [t for t in alpha if t in stop],
    "topic": topic,
    "sentiment": sent,
    "bigrams": [list(b) for b in sent_bigrams],
    "keep": sorted(keep),
    # NLTK's English list has "not", "no", "nor" and "but", not "never".
    "keepOnStopList": sorted(k for k in keep if k in stop),
    "stopListSize": len(stop),
}

# ── 2. bag-of-words: the document-term matrix, counts and presence ─────────
bow_corpus = [
    "the cat sat on the mat",
    "the dog sat on the log",
    "the cat and the dog played",
]
bow_docs = [[t.lower() for t in word_tokenize(d) if t.isalpha()] for d in bow_corpus]
bow_vocab = sorted({w for doc in bow_docs for w in doc})
bow_rows = [[Counter(doc)[w] for w in bow_vocab] for doc in bow_docs]

agreed.append(agrees("bag-of-words", f"Vocabulary: {bow_vocab}", "bag of words: vocabulary"))
# The page's table is a pandas DataFrame (an HTML cell); compare its cells.
html = next(
    "".join(c["content"] for c in e["cells"] if c["type"] == "html")
    for e in OUTPUTS[f"{COURSE}/bag-of-words.mdx"].values()
    if any(c["type"] == "html" for c in e["cells"])
)
for i, row in enumerate(bow_rows):
    tr = html.split(f"<th>doc{i + 1}</th>")[1].split("</tr>")[0]
    page_row = [int(td.split("</td>")[0]) for td in tr.split("<td>")[1:]]
    assert page_row == row, f"doc{i + 1}: {page_row} on the page, {row} here"
agreed.append("bag of words: document-term matrix")

spam_vocab = ["cheap", "free", "meeting", "report", "winner"]
spam = "free free free winner cheap".split()


def count_vector(tokens, vocab):
    counts = Counter(tokens)
    return [counts[w] for w in vocab]


def binary_vector(tokens, vocab):
    present = set(tokens)
    return [1 if w in present else 0 for w in vocab]


spam_count = count_vector(spam, spam_vocab)
spam_binary = binary_vector(spam, spam_vocab)


def spam_block():
    print("vocab:        ", spam_vocab)
    print("count vector: ", spam_count)
    print("binary vector:", spam_binary)


agreed.append(agrees("bag-of-words", run(spam_block), "bag of words: count and binary vectors"))

# The limitations list: "dog bites man" and "man bites dog" make one bag.
# The limitations list: "great" and "excellent" are unrelated columns. Two
# short reviews that mean the same thing, counted the lesson's way, share
# only the column of the word they have in common.
meaning_pair = ["great film", "excellent film"]
meaning_bags = [Counter(s.split()) for s in meaning_pair]
meaning_vocab = sorted(meaning_bags[0] | meaning_bags[1])
meaning_shared = sorted(w for w in meaning_vocab if meaning_bags[0][w] and meaning_bags[1][w])

order_pair = ["dog bites man", "man bites dog"]
order_bags = [Counter(s.split()) for s in order_pair]
order_vocab = sorted(order_bags[0] | order_bags[1])
assert order_bags[0] == order_bags[1]

bag = {
    "corpus": bow_corpus,
    "docs": bow_docs,
    "vocab": bow_vocab,
    "rows": bow_rows,
    "spam": {"tokens": spam, "vocab": spam_vocab, "count": spam_count, "binary": spam_binary},
    "order": {
        "sentences": order_pair,
        "vocab": order_vocab,
        "rows": [[b[w] for w in order_vocab] for b in order_bags],
        "same": order_bags[0] == order_bags[1],
    },
    "meaning": {
        "sentences": meaning_pair,
        "vocab": meaning_vocab,
        "rows": [[b[w] for w in meaning_vocab] for b in meaning_bags],
        "shared": meaning_shared,
    },
    # Doc 1 as the narration reads it: which words, how many times.
    "doc1Counts": {w: c for w, c in zip(bow_vocab, bow_rows[0]) if c},
    "theEveryRow": [row[bow_vocab.index("the")] for row in bow_rows],
}

# ── 3. tf-idf: the lesson's formula, by hand and with scikit-learn ─────────
TF_CORPUS = [
    "the cat sat on the mat",
    "the dog ran in the park",
    "the comet streaked across the sky",
]
docs = [d.split() for d in TF_CORPUS]
N = len(docs)
lengths = [len(d) for d in docs]
# Columns in order of first appearance: "the", then each document's own words.
vocab: list[str] = []
for d in docs:
    for w in d:
        if w not in vocab:
            vocab.append(w)

counts = [[Counter(d)[w] for w in vocab] for d in docs]
df = [sum(1 for d in docs if w in d) for w in vocab]
idf = [math.log(N / k) for k in df]
tf = [[Counter(d)[w] / len(d) for w in vocab] for d in docs]
tfidf = [[tf[i][j] * idf[j] for j in range(len(vocab))] for i in range(N)]


def idf_block():
    for word in ["the", "cat", "comet"]:
        k = sum(1 for doc in docs if word in doc)
        print(f"  IDF({word:6}) df={k}/{N}  ->  log({N}/{k}) = {math.log(N / k):.3f}")


agreed.append(agrees("tf-idf", run(idf_block).strip(), "tf-idf: idf of the, cat and comet"))

scores = {w: round(tf[0][vocab.index(w)] * idf[vocab.index(w)], 3) for w in set(docs[0])}
ranking = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))


def rank_block():
    print("Document:", " ".join(docs[0]))
    for word, score in ranking:
        print(f"  {word:6} {score}")


agreed.append(agrees("tf-idf", run(rank_block), "tf-idf: Doc 1's ranking"))

# scikit-learn, as close to the lesson as it goes: raw-count tf, idf + 1.
cv = CountVectorizer()
Xc = cv.fit_transform(TF_CORPUS).toarray()
sk_counts = Xc[:, [cv.vocabulary_[w] for w in vocab]]
tv = TfidfVectorizer(smooth_idf=False, norm=None)
Xt = tv.fit_transform(TF_CORPUS).toarray()[:, [tv.vocabulary_[w] for w in vocab]]
sk_idf = tv.idf_[[tv.vocabulary_[w] for w in vocab]] - 1.0
assert np.allclose(Xt, sk_counts * (sk_idf + 1.0)[None, :], atol=TOL)
diffs = {
    "counts": float(np.abs(sk_counts - np.array(counts)).max()),
    "idf": float(np.abs(sk_idf - np.array(idf)).max()),
    "tfidf": float(np.abs(sk_counts / np.array(lengths)[:, None] * sk_idf[None, :] - np.array(tfidf)).max()),
}
for k, v in diffs.items():
    assert v <= TOL, f"scikit-learn and the hand computation disagree on {k}: {v}"

# scikit-learn's default, the lesson's callout: idf = ln((1+N)/(1+df)) + 1,
# raw counts, each row scaled to length one.
dv = TfidfVectorizer()
Xd = dv.fit_transform(TF_CORPUS).toarray()[:, [dv.vocabulary_[w] for w in vocab]]
d_idf = dv.idf_[[dv.vocabulary_[w] for w in vocab]]
assert np.allclose(d_idf, [math.log((1 + N) / (1 + k)) + 1 for k in df], atol=TOL)
the = vocab.index("the")
top_score = max(tfidf[0])
cat = vocab.index("cat")
twice = {"count": 2, "length": lengths[0], "tf": 2 / lengths[0], "idf": idf[cat], "tfidf": 2 / lengths[0] * idf[cat]}
assert math.isclose(twice["tfidf"], 2 * tfidf[0][cat])
tf_idf = {
    "corpus": TF_CORPUS,
    "docs": docs,
    "N": N,
    "lengths": lengths,
    "vocab": vocab,
    "counts": counts,
    "df": df,
    "idf": idf,
    "tf": tf,
    "tfidf": tfidf,
    "lessonDoc0Rounded": dict(ranking),
    # Doc 1's words that tie at the top, as the lesson's prose names them.
    "doc0Top": sorted(w for w in set(docs[0]) if math.isclose(tf[0][vocab.index(w)] * idf[vocab.index(w)], top_score)),
    "theTfidfEveryRow": [row[the] for row in tfidf],
    # "Used twice in this document, cat would score twice as much": the
    # lesson's own formula on a Doc 1 where cat appeared twice in six words.
    "catTwice": twice,
    # The lesson's callout on why the log: a word in 1 of 10,000 documents
    # would weigh 10,000 without it, and ln 10,000 = 9.21 with it.
    "logExample": {"N": 10000, "df": 1, "ratio": 10000 / 1, "ln": math.log(10000 / 1)},
    "theCountEveryRow": [row[the] for row in counts],
    "maxOtherCount": max(c for row in counts for j, c in enumerate(row) if j != the),
    "sklearnDefault": {
        "call": "TfidfVectorizer()",
        "idf": d_idf.tolist(),
        "rows": Xd.tolist(),
        "theTopsEveryRow": bool(all(int(np.argmax(r)) == the for r in Xd)),
    },
    "maxAbsDiffHandVsSklearn": diffs,
}

# ── 4. rule-based-sentiment: a lexicon, then negation ─────────────────────
POSITIVE = {"good", "great", "love", "excellent", "amazing", "wonderful", "best"}
NEGATIVE = {"bad", "terrible", "hate", "awful", "worst", "poor", "boring"}
NEGATIONS = {"not", "no", "never", "n't"}
RESET = {".", "!", "?", ",", ";", "but"}


def label(score):
    return "positive" if score > 0 else "negative" if score < 0 else "neutral"


def naive_trace(text):
    """The lesson's naive_sentiment, one token at a time."""
    tokens = [t.lower() for t in word_tokenize(text)]
    steps = [{"token": t, "polarity": 1 if t in POSITIVE else -1 if t in NEGATIVE else 0} for t in tokens]
    score = sum(1 for t in tokens if t in POSITIVE) - sum(1 for t in tokens if t in NEGATIVE)
    assert score == sum(s["polarity"] for s in steps)
    return {"text": text, "steps": steps, "score": score, "label": label(score)}


def negation_trace(text):
    """The lesson's sentiment(), recording what each token does."""
    tokens = [t.lower() for t in word_tokenize(text)]
    score = 0
    negate = False
    steps = []
    for t in tokens:
        if t in NEGATIONS:
            negate = True
            steps.append({"token": t, "role": "negation", "polarity": 0, "flag": True})
            continue
        if t in RESET:
            negate = False
            steps.append({"token": t, "role": "reset", "polarity": 0, "flag": False})
            continue
        polarity = 1 if t in POSITIVE else -1 if t in NEGATIVE else 0
        flipped = False
        if polarity != 0:
            if negate:
                polarity = -polarity
                negate = False
                flipped = True
            score += polarity
        steps.append(
            {"token": t, "role": "word" if polarity == 0 else "flipped" if flipped else "scored", "polarity": polarity, "flag": negate}
        )
    return {"text": text, "steps": steps, "score": score, "label": label(score)}


naive_tests = ["I love this movie", "This film is terrible", "It is not good"]
neg_tests = [
    "I love this movie",
    "This film is terrible",
    "It is not good",
    "This is not bad at all",
    "The plot was good but the acting was awful",
]
naive = [naive_trace(t) for t in naive_tests]
negation = [negation_trace(t) for t in neg_tests]
agreed.append(
    agrees("rule-based-sentiment", "\n".join(f"{r['label']:9} <- {r['text']!r}" for r in naive), "sentiment: naive results")
)
agreed.append(
    agrees(
        "rule-based-sentiment", "\n".join(f"{r['label']:9} <- {r['text']!r}" for r in negation), "sentiment: negation results"
    )
)

# The limits list, run through the negation-aware classifier: sarcasm scores
# on its words, and a word outside the lexicon scores nothing.
sarcasm = negation_trace("Oh great, another delay.")
unknown = negation_trace("The brakes were unpredictable")


# The lesson's quiz says the RESET set "stops 'not great, but terrible' from
# having the 'not' wrongly flip 'terrible'". Under its own code the flip of
# "great" has already cleared the flag, so that sentence scores the same with
# no reset at all; a negation that meets no sentiment word before a clause
# boundary is where the reset changes the score. Recorded as evidence for the
# report, not shown on screen.
def score_with(text, reset):
    tokens = [t.lower() for t in word_tokenize(text)]
    score, negate = 0, False
    for t in tokens:
        if t in NEGATIONS:
            negate = True
            continue
        if t in reset:
            negate = False
            continue
        polarity = 1 if t in POSITIVE else -1 if t in NEGATIVE else 0
        if polarity != 0:
            if negate:
                polarity = -polarity
                negate = False
            score += polarity
    return score


# The video's own reset example, run through the lesson's sentiment() with
# the flag's state after every token, and scored again with no reset tokens.
reset_example = negation_trace("Not really, it was good")
reset_example["scoreWithoutReset"] = score_with("Not really, it was good", set())
reset_example["labelWithoutReset"] = label(reset_example["scoreWithoutReset"])
assert reset_example["score"] == 1 and reset_example["scoreWithoutReset"] == -1


# The limits list's context case: "unpredictable" is in neither list, so to
# show the problem the video adds it to NEGATIVE and scores a thriller with it.
def context_trace(text, extra_negative):
    global NEGATIVE
    saved = NEGATIVE
    NEGATIVE = NEGATIVE | {extra_negative}
    try:
        return negation_trace(text)
    finally:
        NEGATIVE = saved


context = context_trace("The thriller was unpredictable", "unpredictable")
context["added"] = "unpredictable"
assert context["score"] == -1

reset_check = {
    text: {"withReset": score_with(text, RESET), "withoutReset": score_with(text, set())}
    for text in ["Not great, but terrible", "Not really, it was good"]
}
assert score_with("Not great, but terrible", RESET) == negation_trace("Not great, but terrible")["score"]

sentiment = {
    "positive": sorted(POSITIVE),
    "negative": sorted(NEGATIVE),
    "negations": sorted(NEGATIONS),
    "reset": [".", "!", "?", ",", ";", "but"],
    "naive": naive,
    "negation": negation,
    "sarcasm": sarcasm,
    "unknown": unknown,
    "resetCheck": reset_check,
    "resetExample": reset_example,
    "context": context,
}

out = {
    "meta": {
        "python": platform.python_version(),
        "nltk": nltk.__version__,
        "numpy": np.__version__,
        "sklearn": sklearn.__version__,
        "agreesWithPage": agreed,
    },
    "pipeline": pipeline,
    "bag": bag,
    "tfidf": tf_idf,
    "sentiment": sentiment,
}

json.dump(out, sys.stdout, indent=2)
sys.stdout.write("\n")
