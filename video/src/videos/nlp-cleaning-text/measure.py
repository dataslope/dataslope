"""Computes every token, stem, lemma and filtered sentence the CleaningText video shows.

    export NLTK_DATA=<folder with punkt_tab, stopwords and wordnet>
    python -I src/videos/nlp-cleaning-text/measure.py > src/videos/nlp-cleaning-text/measurements.json

Run from video/, with the versions the site's Pyodide 314.0.7 loads (NLTK
3.9.4) and the NLTK data packages the lessons fetch: tokenizers/punkt_tab,
corpora/stopwords and corpora/wordnet.

Every example is a code block of the unit's four lessons, in
content/courses/natural-language-processing-python/:

  tokenization.mdx              the split() and word_tokenize() sentence, the
                                naive split(".") and sent_tokenize(), the
                                tweet under word_tokenize and TweetTokenizer
  text-normalization.mdx        the six cased words, lower() on US, WHO and
                                Apple, the three punctuation recipes
  stopwords.mdx                 the English list, the fox sentence, the
                                negation words, the review, the custom list
  stemming-and-lemmatization.mdx  Porter's stems, the lemmatizer with and
                                without a part of speech

Each block runs twice. First its starterCode, copied here verbatim, is exec'd
with the names its hidden initCode imports, and what it prints must match the
prepopulated output the site's own Pyodide recorded for that lesson
(lib/generated/block-outputs.json); a mismatch exits non-zero. Then the same
calls are made directly, and their results, not parsed print-out, are what
measurements.json holds.

Three values are the video's own, computed from the lessons' pieces rather
than printed by a block: the order tip (text-normalization's "strip
punctuation after tokenizing") run on the recipes' own line, sent_tokenize()
before and after its punctuation is deleted; the review filtered against the
lesson's custom stoplist (its "subtract what you must keep, add your domain's
noise" recipe applied to its own review); and the fox sentence's and review's
per-token stopword flags, which the blocks compute inside a list
comprehension.
"""

import contextlib
import io
import json
import os
import platform
import re
import string
import sys

import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk.tokenize import TweetTokenizer, sent_tokenize, word_tokenize

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
COURSE = "content/courses/natural-language-processing-python"
MANIFEST = json.load(open(os.path.join(ROOT, "lib", "generated", "block-outputs.json")))

# ── The lessons' starterCode, verbatim ───────────────────────────────────────

BLOCKS = {
    "tokenization.mdx": [
        '''text = "I don't think Mr. Lee's plan will work, but we'll see!"

print("split():        ", text.split())
print("word_tokenize():", word_tokenize(text))
''',
        '''text = "Dr. Lee earned 2.5 million. He smiled. Wasn't that great?"

# Naive: split on every period.
naive = text.split(".")
print("Naive split('.') ->", len(naive), "pieces")
for piece in naive:
    print("   ", repr(piece))

print()

# Punkt: real sentence tokenization.
sentences = sent_tokenize(text)
print("sent_tokenize() ->", len(sentences), "sentences")
for s in sentences:
    print("   ", repr(s))
''',
        '''tweet = "Loving #NLP @dataslope, this is sooo cool!!! :)"

print("Default word_tokenize:")
print("  ", word_tokenize(tweet))

print("TweetTokenizer:")
tt = TweetTokenizer()
print("  ", tt.tokenize(tweet))
''',
    ],
    "text-normalization.mdx": [
        '''words = ["The", "the", "THE", "Dog", "dog", "DOG"]

# Without normalization, casing creates spurious distinct words.
print("Distinct as-is:    ", len(set(words)), "->", set(words))

# Case folding collapses them.
folded = [w.lower() for w in words]
print("Distinct lowercased:", len(set(folded)), "->", set(folded))
''',
        '''# Same letters, very different meanings, case is the only clue.
print("US".lower(), "  <- 'US' the country becomes the pronoun 'us'")
print("WHO".lower(), " <- 'WHO' the organization becomes the question word 'who'")
print("Apple".lower(), "<- the company becomes the fruit")

# For shouting, case can be a sentiment signal:
review = "this product is GARBAGE"
print("Has ALL-CAPS word:", any(w.isupper() and len(w) > 1 for w in review.split()))
''',
        '''import re
import string

text = "Hello, World! It's a GREAT day... isn't it?"

# Approach 1, keep only alphabetic tokens after a naive split.
approach1 = [w for w in text.split() if w.isalpha()]
print("1. isalpha filter: ", approach1)

# Approach 2, strip punctuation characters from each token with str.translate.
table = str.maketrans("", "", string.punctuation)
approach2 = [w.translate(table) for w in text.lower().split()]
approach2 = [w for w in approach2 if w]  # drop any now-empty strings
print("2. translate:      ", approach2)

# Approach 3, pull out runs of letters with a regular expression.
approach3 = re.findall(r"[a-z]+", text.lower())
print("3. regex findall:  ", approach3)

print()
print("string.punctuation =", repr(string.punctuation))
''',
    ],
    "stopwords.mdx": [
        '''stop = stopwords.words("english")

print("Number of English stopwords:", len(stop))
print("First 25:", stop[:25])
print()
print("Is 'the' a stopword? ", "the" in stop)
print("Is 'python' a stopword?", "python" in stop)
''',
        '''text = "The quick brown fox jumps over the lazy dog in the park"
stop = set(stopwords.words("english"))  # a set -> fast membership tests

tokens = [t.lower() for t in word_tokenize(text)]
content = [t for t in tokens if t not in stop]

print("All tokens:   ", tokens)
print("Content words:", content)
print(f"Removed {len(tokens) - len(content)} of {len(tokens)} tokens.")
''',
        '''stop = set(stopwords.words("english"))

for word in ["not", "no", "nor", "never", "but", "against", "don't", "won't"]:
    print(f"  is '{word}' a stopword? {word in stop}")
''',
        '''review = "The movie was not good at all"
stop = set(stopwords.words("english"))

tokens = [t.lower() for t in word_tokenize(review)]
content = [t for t in tokens if t not in stop]

print("Original review:", review)
print("After stopwords:", content)
print()
print("A naive sentiment reader now sees the word 'good' and no 'not'.")
print("The negative review has been turned positive.")
''',
        '''base = set(stopwords.words("english"))

# Keep negation/contrast words so sentiment survives:
keep = {"not", "no", "nor", "never", "but"}
# Add domain noise words (imagine a corpus of movie reviews):
add = {"movie", "film", "watch"}

custom = (base - keep) | add

print("'not' still a stopword?  ", "not" in custom, "  <- kept for sentiment")
print("'movie' now a stopword?  ", "movie" in custom, " <- added domain noise word")
print("'the' still a stopword?  ", "the" in custom)
''',
    ],
    "stemming-and-lemmatization.mdx": [
        '''from nltk.stem import PorterStemmer

stemmer = PorterStemmer()

words = [
    "run",
    "runs",
    "running",
    "ran",
    "study",
    "studies",
    "studying",
    "happy",
    "happily",
    "happiness",
    "organization",
    "organize",
    "organ",
]

for w in words:
    print(f"  {w:14} -> {stemmer.stem(w)}")
''',
        '''lemmatizer = WordNetLemmatizer()

# WordNetLemmatizer defaults to treating each word as a NOUN.
print("Default (noun) lemmas:")
for w in ["running", "ran", "studies", "better", "was"]:
    print(f"  {w:10} -> {lemmatizer.lemmatize(w)}")

print()
# Tell it the part of speech and the results change dramatically.
print("With the correct part of speech:")
print("  running (verb)     ->", lemmatizer.lemmatize("running", pos="v"))
print("  ran (verb)         ->", lemmatizer.lemmatize("ran", pos="v"))
print("  studies (verb)     ->", lemmatizer.lemmatize("studies", pos="v"))
print("  was (verb)         ->", lemmatizer.lemmatize("was", pos="v"))
print("  better (adjective) ->", lemmatizer.lemmatize("better", pos="a"))
''',
    ],
}

# What each lesson's hidden initCode leaves in scope.
SCOPE = {
    "word_tokenize": word_tokenize,
    "sent_tokenize": sent_tokenize,
    "TweetTokenizer": TweetTokenizer,
    "stopwords": stopwords,
    "PorterStemmer": PorterStemmer,
    "WordNetLemmatizer": WordNetLemmatizer,
    "nltk": nltk,
}


def unordered(printed):
    """A printed set's members sorted, since a set prints in hash order and
    string hashes are salted per process (the page's run and this one put
    "the" and "dog" in different places)."""
    return re.sub(r"\{([^{}]*)\}", lambda m: "{" + ", ".join(sorted(m.group(1).split(", "))) + "}", printed)


def check_against_page():
    """Every block prints what the site's Pyodide printed for it, or exit 1."""
    checked = 0
    for lesson, blocks in BLOCKS.items():
        recorded = [
            unordered(cell["content"].strip())
            for entry in MANIFEST.get(f"{COURSE}/{lesson}", {}).values()
            for cell in entry["cells"]
            if cell["type"] == "stdout"
        ]
        for code in blocks:
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                exec(code, dict(SCOPE))
            printed = unordered(out.getvalue().strip())
            if printed not in recorded:
                sys.exit(f"{lesson}: this block prints something the page does not show:\n{code}\n---\n{printed}")
            checked += 1
    return checked


# ── The values the video shows, computed directly ────────────────────────────

STOP_LIST = stopwords.words("english")
STOP = set(STOP_LIST)
STEMMER = PorterStemmer()
LEMMATIZER = WordNetLemmatizer()


def ordered_unique(items):
    """A set's members in order of first appearance (a printed set's order is
    hash order, which the page shows but the video should not depend on)."""
    seen = []
    for x in items:
        if x not in seen:
            seen.append(x)
    return seen


def filtered(text, stop):
    tokens = [t.lower() for t in word_tokenize(text)]
    return {
        "text": text,
        "tokens": tokens,
        "isStop": [t in stop for t in tokens],
        "content": [t for t in tokens if t not in stop],
    }


def measure():
    out = {
        "versions": {
            "python": platform.python_version(),
            "nltk": nltk.__version__,
        },
    }

    # tokenization.mdx
    text = "I don't think Mr. Lee's plan will work, but we'll see!"
    out["words"] = {"text": text, "split": text.split(), "tokens": word_tokenize(text)}

    text = "Dr. Lee earned 2.5 million. He smiled. Wasn't that great?"
    out["sentences"] = {"text": text, "naive": text.split("."), "sentences": sent_tokenize(text)}

    tweet = "Loving #NLP @dataslope, this is sooo cool!!! :)"
    out["tweet"] = {"text": tweet, "default": word_tokenize(tweet), "tweet": TweetTokenizer().tokenize(tweet)}

    # text-normalization.mdx
    words = ["The", "the", "THE", "Dog", "dog", "DOG"]
    folded = [w.lower() for w in words]
    out["case"] = {
        "words": words,
        "distinct": len(set(words)),
        "folded": folded,
        "foldedDistinct": ordered_unique(folded),
    }
    out["lossy"] = [{"word": w, "lower": w.lower()} for w in ["US", "WHO", "Apple"]]

    text = "Hello, World! It's a GREAT day... isn't it?"
    table = str.maketrans("", "", string.punctuation)
    approach2 = [w.translate(table) for w in text.lower().split()]
    out["punct"] = {
        "text": text,
        "split": text.split(),
        "isalpha": [w for w in text.split() if w.isalpha()],
        "translate": [w for w in approach2 if w],
        "regex": re.findall(r"[a-z]+", text.lower()),
    }
    # The lesson's order tip ("Strip punctuation after tokenizing, not before"),
    # run on the same line: Punkt on the text as written, and on the text with
    # its punctuation characters deleted first.
    stripped = text.translate(table)
    out["order"] = {
        "text": text,
        "stripped": stripped,
        "sentences": sent_tokenize(text),
        "strippedSentences": sent_tokenize(stripped),
    }

    # stopwords.mdx
    out["stopwords"] = {
        "count": len(STOP_LIST),
        "first25": STOP_LIST[:25],
        "has": {w: w in STOP for w in ["the", "is", "of", "and", "python", "very"]},
    }
    out["fox"] = filtered("The quick brown fox jumps over the lazy dog in the park", STOP)
    out["negation"] = [
        {"word": w, "isStop": w in STOP} for w in ["not", "no", "nor", "never", "but", "against", "don't", "won't"]
    ]
    out["review"] = filtered("The movie was not good at all", STOP)

    keep = ["not", "no", "nor", "never", "but"]
    add = ["movie", "film", "watch"]
    custom = (STOP - set(keep)) | set(add)
    out["custom"] = {
        "keep": keep,
        "add": add,
        "baseSize": len(STOP),
        # keep words that were on the list to begin with ("never" was not).
        "keepRemoved": [w for w in keep if w in STOP],
        "size": len(custom),
        "has": {w: w in custom for w in ["not", "movie", "the"]},
        "review": filtered("The movie was not good at all", custom),
    }

    # stemming-and-lemmatization.mdx
    stem_words = [
        "run", "runs", "running", "ran",
        "study", "studies", "studying",
        "happy", "happily", "happiness",
        "organization", "organize", "organ",
    ]
    out["stems"] = [{"word": w, "stem": STEMMER.stem(w)} for w in stem_words]
    lemma_pos = [("running", "v"), ("ran", "v"), ("studies", "v"), ("was", "v"), ("better", "a")]
    out["lemmas"] = [
        {"word": w, "default": LEMMATIZER.lemmatize(w), "pos": pos, "withPos": LEMMATIZER.lemmatize(w, pos=pos)}
        for w, pos in lemma_pos
    ]
    return out


if __name__ == "__main__":
    if nltk.__version__ != "3.9.4":
        sys.exit(f"NLTK {nltk.__version__}: the site runs 3.9.4")
    checked = check_against_page()
    result = measure()
    result["blocksChecked"] = checked
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
