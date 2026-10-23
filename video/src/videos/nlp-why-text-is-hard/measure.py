"""Computes every token, list and count the "Why text is hard" video shows.

    NLTK_DATA=<nltk_data> python3 src/videos/nlp-why-text-is-hard/measure.py \
        > src/videos/nlp-why-text-is-hard/measurements.json

Run in an environment pinned to the site's Pyodide 314.0.7 (NLTK 3.9.4), with
the NLTK data packages the lessons load (punkt_tab, stopwords, wordnet). The
sentences and the code are the lessons' own, in
content/courses/natural-language-processing-python/:

- "hook" is what-is-nlp.mdx's opening sentence, "I can't believe Dr. Smith's
  startup raised $2.5M, it's unreal!" (the page escapes the dollar sign for
  KaTeX). The lesson asks how many words it is and runs no code on it; the
  video counts its characters and runs the lesson's word_tokenize and
  sent_tokenize on it, as the page's own blocks do on their sentence.
- "split" is what-is-nlp.mdx, "A first look: why .split() is not enough":
  the same sentence through str.split() and through word_tokenize(), and,
  for drawing one under the other, which split piece each token came from.
- "pipeline" is the-nlp-pipeline.mdx, "Watching a list flow through the
  pipeline": the five steps in the lesson's order, each stage's list, and
  for each surviving token the position it had in the first list. "asVerb" is what
  the lemmatizer gives the words it left alone (running, barking) when it is
  told they are verbs: the reason they stayed, which the video gives in one
  clause.
- "order" is the-nlp-pipeline.mdx, "Order matters: a concrete example":
  lowercase-then-filter against filter-then-lowercase, with the list between
  the two steps of each order.
- "layers" is what-is-nlp.mdx's diagram of layers (characters, tokens,
  normalized tokens, tagged tokens, patterns and counts), illustrated on
  three words of the pipeline sentence: their tokens, lowercased, tagged by
  nltk.pos_tag (the averaged perceptron tagger the course loads) after
  lowercasing, as the pipeline orders it, and the counts of those same
  three words. The Penn tags are named in words by their first letters
  (NN noun, VB verb, RB adverb, DT determiner).
- "stopwords" is NLTK's English list as the lessons load it.

Every printed line the lessons' blocks produce is rebuilt here and checked
against the site's prepopulated output (lib/generated/block-outputs.json,
which the site's Pyodide wrote); a mismatch exits non-zero.
"""

import json
import os
import platform
import sys

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from collections import Counter

from nltk.tokenize import sent_tokenize, word_tokenize

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
COURSE = "content/courses/natural-language-processing-python"
assert nltk.__version__ == "3.9.4", f"NLTK {nltk.__version__}, the site runs 3.9.4"


def say(*args):
    print(*args, file=sys.stderr)


# The site's own outputs for the lessons' blocks, as the page shows them.
with open(os.path.join(ROOT, "lib", "generated", "block-outputs.json")) as f:
    BLOCKS = json.load(f)


def site_prints(lesson: str) -> set[str]:
    entries = BLOCKS[f"{COURSE}/{lesson}.mdx"]
    return {
        "".join(c["content"] for c in e["cells"] if c["type"] == "stdout").strip()
        for e in entries.values()
    }


def check(lesson: str, printed: str):
    if printed.strip() not in site_prints(lesson):
        say(f"MISMATCH with the site's output for {lesson}:\n{printed}")
        sys.exit(1)
    say(f"matches the site ({lesson}):\n{printed}\n")


def pieces_of(text: str, parts: list[str], tokens: list[str]) -> list[int]:
    """Which whitespace piece each token came from, found by walking the
    string: a token is located after the previous one, and belongs to the
    piece whose span holds it."""
    spans, at = [], 0
    for p in parts:
        start = text.index(p, at)
        spans.append((start, start + len(p)))
        at = start + len(p)
    owner, at = [], 0
    for t in tokens:
        start = text.index(t, at)
        at = start + len(t)
        owner.append(next(i for i, (a, b) in enumerate(spans) if a <= start < b))
    return owner


out = {
    "env": {
        "python": platform.python_version(),
        "nltk": nltk.__version__,
    }
}

# ── The hook (what-is-nlp.mdx, opening) ──────────────────────────────────────
hook = "I can't believe Dr. Smith's startup raised $2.5M, it's unreal!"
hook_tokens = word_tokenize(hook)
out["hook"] = {
    "text": hook,
    "chars": len(hook),
    "split": hook.split(),
    "tokens": hook_tokens,
    "tokenPiece": pieces_of(hook, hook.split(), hook_tokens),
    "sentences": len(sent_tokenize(hook)),
}

# ── split() against word_tokenize (what-is-nlp.mdx) ──────────────────────────
sentence = "I can't believe it's not butter, Mr. Jones!"
naive = sentence.split()
check("what-is-nlp", f"split() gives: {naive}\nword count: {len(naive)}")
tokens = word_tokenize(sentence)
check("what-is-nlp", f"word_tokenize gives: {tokens}\ntoken count: {len(tokens)}")
out["split"] = {
    "text": sentence,
    "pieces": naive,
    "tokens": tokens,
    "tokenPiece": pieces_of(sentence, naive, tokens),
}

# ── The pipeline, step by step (the-nlp-pipeline.mdx) ────────────────────────
text = "The Cats are RUNNING quickly, and the dogs are barking loudly!"
stop = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()
# Each token carries the position it had in the tokenized list, so a figure
# can keep every word in its column as the list shrinks.
steps = []
cur = list(enumerate(word_tokenize(text)))
steps.append(("tokenized", cur))
cur = [(i, t.lower()) for i, t in cur]
steps.append(("lowercased", cur))
cur = [(i, t) for i, t in cur if t.isalpha()]
steps.append(("cleaned", cur))
cur = [(i, t) for i, t in cur if t not in stop]
steps.append(("no stops", cur))
cur = [(i, lemmatizer.lemmatize(t)) for i, t in cur]
steps.append(("lemmatized", cur))
labels = ["1. tokenized: ", "2. lowercased:", "3. cleaned:   ", "4. no stops:  ", "5. lemmatized:"]
check(
    "the-nlp-pipeline",
    "\n".join(f"{lab} {[t for _, t in s]}" for lab, (_, s) in zip(labels, steps)),
)
out["pipeline"] = {
    "text": text,
    "stages": [{"name": name, "tokens": [t for _, t in s], "cols": [i for i, _ in s]} for name, s in steps],
}

# What the lemmatizer leaves alone, and why: it reads every word as a noun
# unless it is told the part of speech. Told "verb", it reduces both.
kept = [t for (_, t), (_, before) in zip(steps[4][1], steps[3][1]) if t == before]
out["pipeline"]["asVerb"] = {t: lemmatizer.lemmatize(t, pos="v") for t in kept if lemmatizer.lemmatize(t, pos="v") != t}
assert out["pipeline"]["asVerb"] == {"running": "run", "barking": "bark"}, out["pipeline"]["asVerb"]

# ── Layers (what-is-nlp.mdx's diagram), on three words of that sentence ─────
first = [t for _, t in steps[0][1]]
WINDOW = slice(1, 4)  # Cats are RUNNING
lowered = [t.lower() for t in first]
tags = nltk.pos_tag(lowered)
NAMES = {"NN": "noun", "VB": "verb", "RB": "adverb", "DT": "determiner"}
cleaned = [t for _, t in steps[2][1]]
start = text.index(first[WINDOW][0])
end = text.index(first[WINDOW][-1]) + len(first[WINDOW][-1])
out["layers"] = {
    "chars": text[start:end],
    "tokens": first[WINDOW],
    "normalized": lowered[WINDOW],
    "tags": [t for _, t in tags[WINDOW]],
    "tagNames": [NAMES[t[:2]] for _, t in tags[WINDOW]],
    # The counts layer counts the same three words the other layers show,
    # so the figure follows one input from characters to counts.
    "counts": [[w, c] for w, c in Counter(lowered[WINDOW]).items()],
}

# ── Order matters (the-nlp-pipeline.mdx) ─────────────────────────────────────
otext = "The The THE end is near"
otokens = word_tokenize(otext)
a1 = [t.lower() for t in otokens]
a2 = [t for t in a1 if t not in stop]
b1 = [t for t in otokens if t not in stop]
b2 = [t.lower() for t in b1]
check("the-nlp-pipeline", f"Order A (lowercase then filter): {a2}\nOrder B (filter then lowercase): {b2}")
out["order"] = {
    "text": otext,
    "tokens": otokens,
    "a": {"lowered": a1, "filtered": a2},
    "b": {"filtered": b1, "lowered": b2},
}

# ── The stopword list ────────────────────────────────────────────────────────
words = ["the", "is", "are", "and", "not", "The", "THE"]
out["stopwords"] = {
    "count": len(stop),
    "first": stopwords.words("english")[:6],
    "has": {w: w in stop for w in words},
    "allLowercase": all(w == w.lower() for w in stop),
}

say(json.dumps(out["hook"]), "\n")
print(json.dumps(out, indent=2, ensure_ascii=False))
