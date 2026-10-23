"""Computes every count, ratio, tag and n-gram the CountingWords video shows.

    export NLTK_DATA=<folder holding punkt_tab, stopwords, wordnet,
                      averaged_perceptron_tagger_eng and gutenberg>
    python3 src/videos/nlp-counting-words/measure.py > src/videos/nlp-counting-words/measurements.json

Run from video/, with NLTK 3.9.4 (the version the site's Pyodide 314.0.7
installs) and the NLTK data packages the lessons fetch. data.ts imports the
output as it is.

Two kinds of number:

1. **The lessons' own blocks.** Each block the video shows is run here
   *verbatim* (the starterCode of a <CodeBlock> in
   content/courses/natural-language-processing-python/), its stdout captured,
   and compared with what the site's Pyodide printed for the same block
   (lib/generated/block-outputs.json). Any difference exits non-zero, so the
   video cannot drift from the page. The variables a block leaves behind (its
   FreqDist, its tags, its n-grams) are what the video reads.

2. **The same calls on a whole book.** Jane Austen's Emma, loaded exactly as
   interesting-discussions.mdx loads it ("The quiet law: Zipf"):
   `[w.lower() for w in gutenberg.words("austen-emma.txt") if w.isalpha()]`.
   That block is checked against the page too. Everything else on Emma is the
   lessons' own calls (FreqDist, len(set(...)) / len(...), fd.hapaxes(),
   stopwords.words("english"), nltk.util.ngrams) applied to those words:
   lexical diversity on the first 100, 1,000 and 10,000 words and the whole
   book; the rank-frequency curve; vocabulary growth; the top words with and
   without stopwords; the bigrams whose two words are both not stopwords;
   and, for n = 1 to 5, the share of distinct n-grams seen only once.

Printed checks go to stderr.
"""

import contextlib
import io
import json
import os
import platform
import sys

import nltk
from nltk import pos_tag
from nltk.corpus import gutenberg, stopwords, wordnet
from nltk.probability import FreqDist
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from nltk.util import ngrams

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
COURSE = "content/courses/natural-language-processing-python/"
PAGE = json.load(open(os.path.join(ROOT, "lib/generated/block-outputs.json")))


def say(*args):
    print(*args, file=sys.stderr)


def page_outputs(lesson):
    """Every stdout the page shows for a lesson, in the order the blocks run."""
    blocks = PAGE[COURSE + lesson + ".mdx"].values()
    return ["\n".join(c["content"] for c in b["cells"] if c["type"] == "stdout") for b in blocks]


def run(lesson, code, env=None):
    """Runs one block verbatim, checks its stdout against the page, and
    returns the names it defined."""
    ns = {
        "word_tokenize": word_tokenize,
        "FreqDist": FreqDist,
        "stopwords": stopwords,
        "pos_tag": pos_tag,
        "WordNetLemmatizer": WordNetLemmatizer,
        "wordnet": wordnet,
        "ngrams": ngrams,
        "gutenberg": gutenberg,
        **(env or {}),
    }
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(code, ns)
    # The page's cells are trimmed at both ends (a leading indent included).
    printed = buf.getvalue().strip()
    if printed not in [o.strip() for o in page_outputs(lesson)]:
        say(f"MISMATCH in {lesson}: this run printed\n{printed}\nand the page shows none of\n{page_outputs(lesson)}")
        sys.exit(1)
    say(f"── {lesson}: matches the page")
    say(printed)
    return ns


def r(x, d=4):
    return round(float(x), d)


out = {
    "env": {
        "python": platform.python_version(),
        "nltk": nltk.__version__,
    }
}

# ── frequency-distributions.mdx ─────────────────────────────────────────────

# "Counting words with FreqDist()"
ns = run(
    "frequency-distributions",
    '''text = """The fox runs. The dog runs too. The fox and the dog run together,
and the fox is faster than the dog, but the dog is happier than the fox."""

tokens = [t.lower() for t in word_tokenize(text) if t.isalpha()]
fd = FreqDist(tokens)

print("Total words (N):     ", fd.N())
print("Distinct words:      ", len(fd))
print("5 most common:       ", fd.most_common(5))
print("Count of 'fox':      ", fd["fox"])
print("Count of 'zebra':    ", fd["zebra"], "(absent words are 0, no error)")
print("Relative freq 'the': ", round(fd.freq("the"), 3))
''',
)
fd = ns["fd"]
out["fox"] = {
    "tokens": ns["tokens"],
    "total": fd.N(),
    "distinct": len(fd),
    # Every word with its count, in most_common() order (ties in first-seen order).
    "counts": [[w, c] for w, c in fd.most_common()],
    "top5": [[w, c] for w, c in fd.most_common(5)],
    "zebra": fd["zebra"],
    "theFreq": r(fd.freq("the"), 3),
}

# "Lexical diversity: how varied is the vocabulary?"
ns = run(
    "frequency-distributions",
    '''def lexical_diversity(tokens):
    if not tokens:
        return 0.0
    return len(set(tokens)) / len(tokens)

repetitive = word_tokenize("very very very good good good good")
varied = word_tokenize("an unusually eclectic vocabulary brimming with novelty")

print("Repetitive text diversity:", round(lexical_diversity(repetitive), 3))
print("Varied text diversity:    ", round(lexical_diversity(varied), 3))
''',
)
lexical_diversity = ns["lexical_diversity"]
out["diversity"] = {
    "repetitive": {
        "tokens": ns["repetitive"],
        "distinct": len(set(ns["repetitive"])),
        "total": len(ns["repetitive"]),
        "value": r(lexical_diversity(ns["repetitive"]), 3),
    },
    "varied": {
        "tokens": ns["varied"],
        "distinct": len(set(ns["varied"])),
        "total": len(ns["varied"]),
        "value": r(lexical_diversity(ns["varied"]), 3),
    },
}

# "A catch: raw frequency is dominated by stopwords" (recorded for the
# report: the page's prose describes this output differently; see script.ts)
ns = run(
    "frequency-distributions",
    '''text = """A search engine reads text and indexes the words in the text so that
a user can search for words. When a user searches, the engine finds the text
that best matches the words the user typed, ranking the best text first."""

tokens = [t.lower() for t in word_tokenize(text) if t.isalpha()]
stop = set(stopwords.words("english"))

print("Top 5 WITH stopwords:   ", FreqDist(tokens).most_common(5))

content = [t for t in tokens if t not in stop]
print("Top 5 WITHOUT stopwords:", FreqDist(content).most_common(5))
''',
)
out["search"] = {
    "withStop": [[w, c] for w, c in FreqDist(ns["tokens"]).most_common(5)],
    "withoutStop": [[w, c] for w, c in FreqDist(ns["content"]).most_common(5)],
}
STOP = ns["stop"]

# ── interesting-discussions.mdx: Emma, loaded the page's way ────────────────
ns = run(
    "interesting-discussions",
    '''# Count words in a single public-domain book.
words = [w.lower() for w in gutenberg.words("austen-emma.txt") if w.isalpha()]
fd = FreqDist(words)
ranked = fd.most_common()

print(f"{'rank':>4} {'word':12} {'freq':>6} {'rank*freq':>10}")
for rank, (word, freq) in enumerate(ranked[:8], start=1):
    print(f"{rank:>4} {word:12} {freq:>6} {rank * freq:>10}")
''',
)
words = ns["words"]
efd = ns["fd"]
ranked = ns["ranked"]
N = efd.N()
V = len(efd)
hapaxes = efd.hapaxes()
top10 = sum(c for _, c in ranked[:10])

# Vocabulary growth: distinct words after every 2,000 words read, and the end.
seen = set()
growth = []
for i, w in enumerate(words, start=1):
    seen.add(w)
    if i % 2000 == 0 or i == N:
        growth.append([i, len(seen)])
LAST = 10_000
new_at_end = len(set(words[-LAST:]) - set(words[:-LAST]))

content = [w for w in words if w not in STOP]
cfd = FreqDist(content)

# Bigrams whose two words both survive the stopword filter: adjacency is the
# book's own, nothing is joined across a removed word.
pairs = FreqDist(b for b in ngrams(words, 2) if b[0] not in STOP and b[1] not in STOP)

sparsity = []
for n in [1, 2, 3, 4, 5]:
    grams = list(ngrams(words, n))
    gfd = FreqDist(grams)
    once = sum(1 for _, c in gfd.items() if c == 1)
    sparsity.append({"n": n, "grams": len(grams), "distinct": len(gfd), "once": once, "share": r(once / len(gfd))})

out["emma"] = {
    "file": "austen-emma.txt",
    "total": N,
    "distinct": V,
    "diversity": r(V / N),
    "top10": [[w, c] for w, c in ranked[:10]],
    "top10Share": r(top10 / N),
    # Every count in rank order, for the rank-frequency curve.
    "ranked": [c for _, c in ranked],
    "hapaxes": len(hapaxes),
    "hapaxShare": r(len(hapaxes) / V),
    "byLength": [{"words": L, "distinct": len(set(words[:L])), "value": r(lexical_diversity(words[:L]))} for L in [100, 1000, 10000, N]],
    "growth": growth,
    "last": LAST,
    "newAtEnd": new_at_end,
    "withStop": [[w, c] for w, c in efd.most_common(6)],
    "withoutStop": [[w, c] for w, c in cfd.most_common(6)],
    "pairs": [[" ".join(p), c] for p, c in pairs.most_common(5)],
    "sparsity": sparsity,
}
say(f"── Emma: {N} words, {V} distinct, {len(hapaxes)} hapaxes, top ten {top10 / N:.3f} of all words")
say(f"   with stopwords {efd.most_common(6)}")
say(f"   without        {cfd.most_common(6)}")
say(f"   pairs          {pairs.most_common(5)}")
say(f"   new words in the last {LAST}: {new_at_end}")
for s in sparsity:
    say(f"   n={s['n']}: {s['distinct']} distinct, {s['once']} once ({s['share']:.3f})")

# ── pos-tagging.mdx ─────────────────────────────────────────────────────────

# "The problem POS tagging solves: words wear many hats"
ns = run(
    "pos-tagging",
    '''for sentence in ["I caught a big fish.", "We fish on weekends."]:
    tokens = word_tokenize(sentence)
    tagged = pos_tag(tokens)
    # Show just the word 'fish' and the tag it received.
    for word, tag in tagged:
        if word.lower() == "fish":
            print(f"{sentence!r}\\n   -> 'fish' tagged as {tag}")
''',
)
out["fish"] = [{"sentence": s, "tagged": [list(p) for p in pos_tag(word_tokenize(s))]} for s in ["I caught a big fish.", "We fish on weekends."]]

# "Reading the tags: the Penn Treebank tagset"
ns = run(
    "pos-tagging",
    '''sentence = "The tall man reads books."
tagged = pos_tag(word_tokenize(sentence))

for word, tag in tagged:
    print(f"  {word:10} {tag}")
''',
)
out["tall"] = [list(p) for p in ns["tagged"]]

# "A real payoff: extracting syntactic patterns"
ns = run(
    "pos-tagging",
    '''text = "The talented young engineer quietly designed a brilliant new system."
tagged = pos_tag(word_tokenize(text))

nouns = [w for w, t in tagged if t.startswith("NN")]
adjectives = [w for w, t in tagged if t.startswith("JJ")]
verbs = [w for w, t in tagged if t.startswith("VB")]
adverbs = [w for w, t in tagged if t.startswith("RB")]

print("Nouns:     ", nouns)
print("Adjectives:", adjectives)
print("Verbs:     ", verbs)
print("Adverbs:   ", adverbs)
''',
)
out["engineer"] = {
    "tagged": [list(p) for p in ns["tagged"]],
    "nouns": ns["nouns"],
    "adjectives": ns["adjectives"],
    "verbs": ns["verbs"],
    "adverbs": ns["adverbs"],
}

# "POS tagging makes lemmatization accurate"
ns = run(
    "pos-tagging",
    '''lemmatizer = WordNetLemmatizer()

def to_wordnet_pos(treebank_tag):
    # Map a Penn Treebank tag to the coarse POS WordNet expects.
    if treebank_tag.startswith("J"):
        return wordnet.ADJ
    if treebank_tag.startswith("V"):
        return wordnet.VERB
    if treebank_tag.startswith("R"):
        return wordnet.ADV
    return wordnet.NOUN  # default, including N* tags

sentence = "The runners were running and they had eaten well."
tagged = pos_tag(word_tokenize(sentence))

print("Naive (default noun) lemmas:")
print("  ", [lemmatizer.lemmatize(w) for w, t in tagged])

print("POS-aware lemmas:")
print("  ", [lemmatizer.lemmatize(w, to_wordnet_pos(t)) for w, t in tagged])
''',
)
lem = ns["lemmatizer"]
out["lemma"] = {
    "tagged": [list(p) for p in ns["tagged"]],
    "naive": [lem.lemmatize(w) for w, _ in ns["tagged"]],
    "aware": [lem.lemmatize(w, ns["to_wordnet_pos"](t)) for w, t in ns["tagged"]],
}

# ── ngrams.mdx ──────────────────────────────────────────────────────────────

# "Generating n-grams with nltk.util.ngrams"
ns = run(
    "ngrams",
    '''tokens = [t.lower() for t in word_tokenize("The quick brown fox jumps") if t.isalpha()]
print("tokens:", tokens)
print()

bigrams = list(ngrams(tokens, 2))
trigrams = list(ngrams(tokens, 3))

print("bigrams (n=2): ", bigrams)
print("trigrams (n=3):", trigrams)
print()
print(f"{len(tokens)} tokens -> {len(bigrams)} bigrams, {len(trigrams)} trigrams")
''',
)
out["window"] = {
    "tokens": ns["tokens"],
    "bigrams": [list(g) for g in ns["bigrams"]],
    "trigrams": [list(g) for g in ns["trigrams"]],
}

# "Why n-grams matter: order is meaning"
ns = run(
    "ngrams",
    '''a = [t.lower() for t in word_tokenize("the food was not good")]
b = [t.lower() for t in word_tokenize("the food was good")]

# As a SET of single words, the only difference is the lone word 'not'.
print("Unigram sets differ only by:", set(a) ^ set(b))

# As BIGRAMS, the telling pair 'not good' appears in one and not the other.
print("Bigrams of a:", list(ngrams(a, 2)))
print("'not good' in a?", ("not", "good") in list(ngrams(a, 2)))
print("'not good' in b?", ("not", "good") in list(ngrams(b, 2)))
''',
)
out["order"] = {
    "a": ns["a"],
    "b": ns["b"],
    "differ": sorted(set(ns["a"]) ^ set(ns["b"])),
    "bigramsA": [list(g) for g in ngrams(ns["a"], 2)],
    "bigramsB": [list(g) for g in ngrams(ns["b"], 2)],
    "inA": ("not", "good") in list(ngrams(ns["a"], 2)),
    "inB": ("not", "good") in list(ngrams(ns["b"], 2)),
}

# "Counting n-grams reveals phrases"
ns = run(
    "ngrams",
    '''text = """machine learning is fun. machine learning is powerful.
i love machine learning and natural language processing."""

tokens = [t.lower() for t in word_tokenize(text) if t.isalpha()]
bigram_counts = FreqDist(ngrams(tokens, 2))

print("Most common bigrams:")
for pair, count in bigram_counts.most_common(3):
    print(f"  {pair}  x{count}")
''',
)
out["phrases"] = {
    "tokens": ns["tokens"],
    "top3": [[" ".join(p), c] for p, c in ns["bigram_counts"].most_common(3)],
}

# "The trade-off: bigger n is not better" (recorded for the report: its
# "that repeat" column does not collapse on this text; see script.ts)
ns = run(
    "ngrams",
    '''text = """the cat sat on the mat. the dog sat on the log.
the cat sat on the log. the dog sat on the mat."""
tokens = [t.lower() for t in word_tokenize(text) if t.isalpha()]

for n in [1, 2, 3, 4]:
    grams = list(ngrams(tokens, n))
    fd = FreqDist(grams)
    distinct = len(fd)
    repeated = sum(1 for g, c in fd.items() if c > 1)
    print(
        f"n={n}: {len(grams):2} {n}-grams, {distinct:2} distinct, "
        f"{repeated:2} that repeat"
    )
''',
)
small = []
for n in [1, 2, 3, 4]:
    gfd = FreqDist(ngrams(ns["tokens"], n))
    small.append({"n": n, "distinct": len(gfd), "repeat": sum(1 for _, c in gfd.items() if c > 1)})
out["lessonSparsity"] = small

json.dump(out, sys.stdout, indent=1, ensure_ascii=False)
print()
