"""Computes every tag, lemma, stem and lookup step the LemmasAndTags deep dive shows.

    export NLTK_DATA=<folder with punkt_tab, wordnet and averaged_perceptron_tagger_eng>
    python -I src/videos/nlp-lemmas-and-tags/measure.py > src/videos/nlp-lemmas-and-tags/measurements.json

Run from video/, with the versions the site's Pyodide 314.0.7 loads (NLTK
3.9.4) and the NLTK data packages the lessons fetch: tokenizers/punkt_tab,
taggers/averaged_perceptron_tagger_eng and corpora/wordnet.

Three kinds of value:

1. **The lessons' own blocks.** Two code blocks of
   content/courses/natural-language-processing-python/ are run here verbatim,
   with the names their hidden initCode imports, and what each prints must be
   exactly what the site's own Pyodide printed for it
   (lib/generated/block-outputs.json); a mismatch exits non-zero:
     stemming-and-lemmatization.mdx, "Lemmatization: looking up the dictionary
       form": the five words with no part of speech, then with one;
     pos-tagging.mdx, "POS tagging makes lemmatization accurate": the runners
       sentence tagged, its tags mapped to WordNet's four parts of speech by
       first letter, and lemmatized both ways.
   The same calls are then made directly, and their results (not parsed
   print-out) are what measurements.json holds.

2. **The lookup itself, step by step.** WordNetLemmatizer.lemmatize(word, pos)
   returns the shortest of wordnet._morphy(word, pos), or the word unchanged
   if that is empty. In NLTK 3.9.4, _morphy (nltk/corpus/reader/wordnet.py)
   does exactly this:
     a. if the word is in that part of speech's exception list (WordNet's
        noun.exc, verb.exc, adj.exc, adv.exc), the candidates are the base
        forms the list gives;
     b. otherwise they are the word with each of that part of speech's
        suffix rules (MORPHOLOGICAL_SUBSTITUTIONS) applied once;
     c. the word itself and the candidates are kept only if WordNet has them
        as a lemma of that part of speech.
   `trace()` below re-does those three steps in the open, from the same
   exception map, rule table and lemma index, and asserts that its answer is
   lemmatize()'s for every word the video traces, so the figure cannot show a
   path the library does not take.

3. **One extra call.** Porter's stems of the same runners sentence, which the
   lessons never print (stemming-and-lemmatization.mdx stems a word list).
   PorterStemmer is NLTK's, as that lesson constructs it.

Where the unit videos show the same thing, the values are asserted equal to
theirs (nlp-cleaning-text's lemmas and nlp-counting-words' runners sentence),
so a viewer who watches both sees one set of numbers.
"""

import contextlib
import io
import json
import os
import platform
import sys

import nltk
from nltk import pos_tag
from nltk.corpus import wordnet
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk.tokenize import word_tokenize

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
COURSE = "content/courses/natural-language-processing-python/"
PAGE = json.load(open(os.path.join(ROOT, "lib", "generated", "block-outputs.json")))


def say(*args):
    print(*args, file=sys.stderr)


def page_outputs(lesson):
    """Every stdout the page shows for a lesson's blocks, trimmed."""
    blocks = PAGE[COURSE + lesson + ".mdx"].values()
    return ["\n".join(c["content"] for c in b["cells"] if c["type"] == "stdout").strip() for b in blocks]


def run(lesson, code):
    """Runs one block verbatim, checks its stdout against the page, and
    returns the names it defined."""
    ns = {
        "word_tokenize": word_tokenize,
        "pos_tag": pos_tag,
        "WordNetLemmatizer": WordNetLemmatizer,
        "wordnet": wordnet,
        "nltk": nltk,
    }
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(code, ns)
    printed = buf.getvalue().strip()
    if printed not in page_outputs(lesson):
        sys.exit(f"MISMATCH in {lesson}: this run printed\n{printed}\nand the page shows none of\n{page_outputs(lesson)}")
    say(f"── {lesson}: matches the page")
    say(printed)
    return ns


# ── 1. The lessons' blocks ───────────────────────────────────────────────────

LEMMA_BLOCK = run(
    "stemming-and-lemmatization",
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
)

TAG_BLOCK = run(
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

LEMMATIZER = WordNetLemmatizer()
STEMMER = PorterStemmer()
wordnet.ensure_loaded()

# ── 2. The lookup, step by step ──────────────────────────────────────────────

RULES = wordnet.MORPHOLOGICAL_SUBSTITUTIONS
POS_NAME = {"n": "noun", "v": "verb", "a": "adjective", "r": "adverb"}


def in_wordnet(form, pos):
    return pos in wordnet._lemma_pos_offset_map.get(form, {})


def trace(word, pos):
    """_morphy's three steps in the open, then lemmatize()'s choice."""
    exceptions = wordnet._exception_map[pos]
    listed = exceptions.get(word)
    if listed is not None:
        guesses = []
        candidates = list(listed)
    else:
        guesses = [{"rule": [old, new], "form": word[: -len(old)] + new} for old, new in RULES[pos] if word.endswith(old)]
        candidates = [g["form"] for g in guesses]
    checked = []
    for form in [word] + candidates:
        if form not in [c["form"] for c in checked]:
            checked.append({"form": form, "inWordnet": in_wordnet(form, pos)})
    kept = [c["form"] for c in checked if c["inWordnet"]]
    result = min(kept, key=len) if kept else word
    actual = LEMMATIZER.lemmatize(word, pos)
    if result != actual:
        sys.exit(f"trace({word!r}, {pos!r}) gives {result!r}, lemmatize() gives {actual!r}")
    if sorted(kept) != sorted(wordnet._morphy(word, pos)):
        sys.exit(f"trace({word!r}, {pos!r}) keeps {kept}, _morphy keeps {wordnet._morphy(word, pos)}")
    return {
        "word": word,
        "pos": pos,
        "posName": POS_NAME[pos],
        "listed": listed,
        "guesses": guesses,
        "checked": checked,
        "kept": kept,
        "result": result,
        "unchanged": not kept,
    }


def measure():
    out = {"versions": {"python": platform.python_version(), "nltk": nltk.__version__}}

    # The hook: the lesson's first three words with no part of speech.
    lem = LEMMA_BLOCK["lemmatizer"]
    out["defaults"] = [{"word": w, "lemma": lem.lemmatize(w)} for w in ["running", "ran", "was"]]

    # The default itself: lemmatize()'s signature says pos="n".
    import inspect

    out["defaultPos"] = inspect.signature(WordNetLemmatizer.lemmatize).parameters["pos"].default

    # "the running of the race": running is a WordNet noun as it stands.
    out["runningNoun"] = {
        "inWordnet": in_wordnet("running", "n"),
        "senses": [s.definition() for s in wordnet.synsets("running", "n")],
    }

    # The rule table, per part of speech, as _morphy holds it.
    out["rules"] = {pos: [list(r) for r in RULES[pos]] for pos in "nvar"}
    out["exceptionCounts"] = {pos: len(wordnet._exception_map[pos]) for pos in "nvar"}

    # Fig. 3's six lookups, in the order the narration takes them.
    out["traces"] = [
        trace(w, p)
        for w, p in [("ran", "v"), ("was", "v"), ("better", "a"), ("was", "n"), ("running", "n"), ("ran", "n")]
    ]

    # Where "wa" comes from: the WordNet noun it is a lemma of.
    wa = wordnet.synsets("wa", "n")
    out["wa"] = [{"synset": s.name(), "definition": s.definition(), "lemmas": s.lemma_names()} for s in wa]

    # The pos-tagging lesson's sentence.
    tagged = TAG_BLOCK["tagged"]
    to_pos = TAG_BLOCK["to_wordnet_pos"]
    tokens = [w for w, _ in tagged]
    tags = [t for _, t in tagged]
    out["sentence"] = {
        "text": TAG_BLOCK["sentence"],
        "tokens": tokens,
        "tags": tags,
        "letters": [t[0] for t in tags],
        "wordnetPos": [to_pos(t) for t in tags],
        "naive": [lem.lemmatize(w) for w in tokens],
        "aware": [lem.lemmatize(w, to_pos(t)) for w, t in tagged],
        "porter": [STEMMER.stem(w) for w in tokens],
        # The lesson's to_wordnet_pos on one tag of each family, for Fig. 5.
        "mapping": {t: to_pos(t) for t in ["JJ", "JJR", "VB", "VBD", "RB", "NN", "NNS", "DT", "PRP", "."]},
        # How each POS-aware lemma was reached, for the script's header.
        "paths": [trace(w, to_pos(t)) for w, t in tagged],
    }
    return out


def assert_same_as_units(result):
    """The unit videos show some of the same values; they must agree."""
    cleaning = json.load(open(os.path.join(HERE, "..", "nlp-cleaning-text", "measurements.json")))
    unit = {l["word"]: l for l in cleaning["lemmas"]}
    for d in result["defaults"]:
        if unit[d["word"]]["default"] != d["lemma"]:
            sys.exit(f"nlp-cleaning-text shows {d['word']} -> {unit[d['word']]['default']}, this run {d['lemma']}")
    for t in result["traces"]:
        u = unit.get(t["word"])
        if u and u["pos"] == t["pos"] and u["withPos"] != t["result"]:
            sys.exit(f"nlp-cleaning-text shows {t['word']} ({t['pos']}) -> {u['withPos']}, this run {t['result']}")
    counting = json.load(open(os.path.join(HERE, "..", "nlp-counting-words", "measurements.json")))["lemma"]
    s = result["sentence"]
    if [list(p) for p in zip(s["tokens"], s["tags"])] != counting["tagged"]:
        sys.exit("nlp-counting-words tags the runners sentence differently")
    if s["naive"] != counting["naive"] or s["aware"] != counting["aware"]:
        sys.exit("nlp-counting-words lemmatizes the runners sentence differently")
    say("── agrees with nlp-cleaning-text and nlp-counting-words")


if __name__ == "__main__":
    if nltk.__version__ != "3.9.4":
        sys.exit(f"NLTK {nltk.__version__}: the site runs 3.9.4")
    result = measure()
    assert_same_as_units(result)
    for t in result["traces"] + result["sentence"]["paths"]:
        say(f"   {t['word']:8} {t['pos']}  listed={t['listed']}  guesses={[g['form'] for g in t['guesses']]}  kept={t['kept']}  -> {t['result']}")
    say(f"   porter: {result['sentence']['porter']}")
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
