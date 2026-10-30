"""Measures every number the Llm-2-1-AttentionScore deep dive shows.

    python -I src/videos/llm-attention-score/measure.py > src/videos/llm-attention-score/measurements.json

Run in the version the site's Pyodide 314.0.7 ships: NumPy 2.4.6. It re-runs
content/courses/how-llms-work/attention-intuition.mdx, "Doing it properly,
with real vectors", with the lesson's own keys, values and query, and then the
lesson's own suggestion, the query [0.2, 1.0]. The unit video
(src/videos/llm-meaning/measure.py, "qkv") runs the same block; every number
both videos show is asserted equal to the unit's measurements.json here.

The page's prepopulated output for that block (lib/generated/block-outputs.json)
is read and its printed lines asserted against this run, so the video cannot
drift from what the lesson prints.

What this adds to the lesson's run is the working a viewer can redo by hand:

- each dot product as its two products and their sum (1.0 x 1.0 + 0.1 x 0.2);
- the scaled score (divided by sqrt(2), since d = 2);
- softmax in its two steps: e raised to each score, the total, and each share;
- the blend written out, each weight times its value.

Every number is shown rounded, so each step is asserted to reproduce from the
rounded numbers on screen, not only from the unrounded ones:

- the scaled score is the shown dot product over 1.414 (and over sqrt(2));
- the e-powers on screen are e raised to the shown scores, so a viewer's
  calculator agrees with them: 2.056, 1.327, 1.081, total 4.464. Unrounded,
  the first is 2.057 and the total 4.465, a difference in the third decimal
  of two in-between numbers that neither the lesson nor the unit prints;
- each shown e-power over the shown total rounds to the shown weight, which
  is the lesson's weight (0.461, 0.297, 0.242), and so does softmax of the
  shown scores, for both queries;
- the blend is shown to two decimals (4.85, 3.21), because the shown weights
  give 4.852, 3.212 to three while the unrounded ones give 4.849, 3.214 (the
  lesson's print and the unit's figure). To two decimals all of them agree.

The suitcase query is shown as dot products, scores and weights only; its
e-powers are not drawn (their shown total would be 4.532 against 4.531
unrounded, the one place rounding would disagree).

Softmax: the lesson's softmax subtracts the largest score before
exponentiating, for numerical safety; that changes no weight, and the video
shows the plain form, e to each score over their total.
"""

import json
import math
import pathlib
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]  # video/src/videos/<folder> -> repo root


def r(v, digits=3):
    return round(float(v), digits)


def echo(*lines):
    for line in lines:
        print(line, file=sys.stderr)


def softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()


out = {"versions": {"numpy": np.__version__}}

# ── The lesson's block, as written ────────────────────────────────────────────
tokens = ["trophy", "suitcase", "it"]
keys = np.array([[1.0, 0.2], [0.3, 1.0], [0.1, 0.1]])
values = np.array([[10.0, 0.0], [0.0, 10.0], [1.0, 1.0]])
d = keys.shape[1]
assert d == 2
root = math.sqrt(d)


def attend(q):
    """The lesson's computation, step by step, with the working kept."""
    q = np.asarray(q)
    dots = keys @ q
    scores = dots / np.sqrt(d)
    w = softmax(scores)
    output = w @ values
    exact = np.exp(scores)
    assert np.allclose(exact / exact.sum(), w)
    # On screen: e raised to the score as shown, so it can be redone by hand.
    powers = [r(math.exp(r(s))) for s in scores]
    total = r(sum(powers))
    rows = []
    for t, k, dot, s, p, wt in zip(tokens, keys, dots, scores, powers, w):
        prods = [float(q[0] * k[0]), float(q[1] * k[1])]
        assert math.isclose(sum(prods), dot)
        rows.append(
            {
                "token": t,
                "key": k.tolist(),
                "products": [r(x, 2) for x in prods],
                "dot": r(dot, 2),
                "score": r(s),
                "power": r(p),
                "weight": r(wt),
            }
        )
    return {
        "query": q.tolist(),
        "rows": rows,
        "total": total,
        "totalExact": r(exact.sum()),
        "output": [r(x) for x in output],
        "output2": [r(x, 2) for x in output],
        "argmax": tokens[int(np.argmax(w))],
    }


trophy = attend([1.0, 0.1])
suitcase = attend([0.2, 1.0])
assert trophy["argmax"] == "trophy" and suitcase["argmax"] == "suitcase"


def check_shown(a, with_powers):
    """Every step reproduces from the rounded numbers on screen."""
    q = a["query"]
    for row in a["rows"]:
        k = row["key"]
        # The products are of one-decimal numbers, so two decimals are exact.
        assert row["products"] == [round(q[0] * k[0], 2), round(q[1] * k[1], 2)], row
        assert row["dot"] == round(row["products"][0] + row["products"][1], 2), row
        assert row["score"] == round(row["dot"] / 1.414, 3), row
        assert row["score"] == round(row["dot"] / root, 3), row
        if with_powers:
            assert row["power"] == round(math.exp(row["score"]), 3), row
    shown_soft = softmax(np.array([row["score"] for row in a["rows"]]))
    assert [r(x) for x in shown_soft] == [row["weight"] for row in a["rows"]], shown_soft
    if with_powers:
        shown_total = round(sum(row["power"] for row in a["rows"]), 3)
        assert shown_total == a["total"], (shown_total, a["total"])
        for row in a["rows"]:
            assert round(row["power"] / a["total"], 3) == row["weight"], row
    # The blend from the shown weights, to two decimals, is the blend.
    shown = [sum(row["weight"] * v[j] for row, v in zip(a["rows"], values)) for j in range(2)]
    assert [round(x, 2) for x in shown] == a["output2"], (shown, a["output2"])
    a["outputFromShown"] = [r(x) for x in shown]


check_shown(trophy, with_powers=True)
check_shown(suitcase, with_powers=False)
# The weights add up to one, as shown.
assert round(sum(row["weight"] for row in trophy["rows"]), 3) == 1.0
assert round(sum(row["weight"] for row in suitcase["rows"]), 3) == 1.0

# ── Cosine, the course's earlier measure (similarity.mdx) ─────────────────────
# Cosine is the dot product of the two arrows after each is scaled to length
# one. The video says so and draws the length-one circle; it shows no cosine
# number. Recorded so the claim is checked: for the query and trophy's key,
# whose lengths are both close to one, cosine and dot product nearly agree,
# and for the pronoun's own short key they do not.
qv = np.array(trophy["query"])
cos = []
for t, k in zip(tokens, keys):
    c = float(np.dot(qv, k) / (np.linalg.norm(qv) * np.linalg.norm(k)))
    unit = float(np.dot(qv / np.linalg.norm(qv), k / np.linalg.norm(k)))
    assert math.isclose(c, unit)
    cos.append({"token": t, "cosine": r(c), "keyLength": r(np.linalg.norm(k))})
out["cosine"] = {"queryLength": r(np.linalg.norm(qv)), "keys": cos}

# ── Why scale: the same arithmetic on long vectors ────────────────────────────
# "Real queries and keys hold many more numbers, so these sums get big": the
# typical size of a dot product of two random d-number vectors, entries of
# variance one, grows as sqrt(d), and dividing by sqrt(d) brings it back to
# about one. 128 is a common size for one head's query and key. Seeded,
# measured on 1,000 pairs. Fig. 6 draws the d = 2 and d = 128 rows, each to
# one decimal (1.4 and 11.1; 1.0 and 1.0 once divided).
rng = np.random.default_rng(0)
spread = []
for dim in (2, 64, 128):
    a = rng.standard_normal((1000, dim))
    b = rng.standard_normal((1000, dim))
    dots = (a * b).sum(axis=1)
    spread.append({"d": dim, "std": r(dots.std(), 1), "stdScaled": r((dots / math.sqrt(dim)).std(), 2)})
    assert 0.9 < (dots / math.sqrt(dim)).std() < 1.1
out["spread"] = spread

# ── Why scale, on the lesson's own vectors ────────────────────────────────────
# The weights the lesson's query would give if softmax took the dot products
# undivided. Drawn under the shared-out bar: dividing by sqrt(2) evens the
# shares out, trophy's from 0.515 ("point five two" aloud) to 0.461, the same
# direction that keeps long vectors from handing everything to the top key.
unscaled = softmax(keys @ np.array(trophy["query"]))
out["unscaled"] = {"weights": [r(x) for x in unscaled], "trophy2": r(unscaled[0], 2)}
assert out["unscaled"]["trophy2"] == 0.52
assert unscaled[0] > trophy["rows"][0]["weight"]
assert all(u < row["weight"] for u, row in zip(unscaled[1:], trophy["rows"][1:]))

# ── Where the blend lands ─────────────────────────────────────────────────────
# Trophy's value pulls hardest (the biggest weight), but the new vector
# (4.85, 3.21) is nearer the value of "it" (1, 1) than trophy's (10, 0), so the
# narration says "pulls hardest", never "lands nearest".
blend_at = np.array(trophy["output"])
dist = {t: r(np.linalg.norm(blend_at - v), 2) for t, v in zip(tokens, values)}
out["blendDistance"] = dist
assert min(dist, key=dist.get) == "it" and dist["it"] < dist["trophy"] < dist["suitcase"]

out["lesson"] ={"tokens": tokens, "keys": keys.tolist(), "values": values.tolist(), "d": d, "root": r(root)}
out["trophy"] = trophy
out["suitcase"] = suitcase

# ── Against the page's own output ─────────────────────────────────────────────
blocks = json.loads((ROOT / "lib/generated/block-outputs.json").read_text())
page = blocks["content/courses/how-llms-work/attention-intuition.mdx"]
# The block prints the dot products as "raw scores", then "scaled scores".
printed = [c["content"] for b in page.values() for c in b["cells"] if "scaled scores" in c.get("content", "")]
assert len(printed) == 1, printed
text = printed[0]
fmt = lambda xs: "[" + " ".join(f"{x:.3f}" for x in xs) + "]"
assert "raw scores:    " + str(np.array([row["dot"] for row in trophy["rows"]])) in text, text
assert fmt([row["score"] for row in trophy["rows"]]) in text, text
assert fmt([row["weight"] for row in trophy["rows"]]) in text, text
assert fmt(trophy["output"]) in text, text
echo("page prints:", text)

# ── Against the unit video's numbers ──────────────────────────────────────────
unit = json.loads((HERE.parent / "llm-meaning" / "measurements.json").read_text())["qkv"]
assert unit["keys"] == keys.tolist() and unit["values"] == values.tolist()
for mine, theirs in ((trophy, unit["trophy"]), (suitcase, unit["suitcase"])):
    assert mine["query"] == theirs["query"]
    assert [row["dot"] for row in mine["rows"]] == theirs["dots"]
    assert [row["score"] for row in mine["rows"]] == theirs["scores"]
    assert [row["weight"] for row in mine["rows"]] == theirs["weights"]
    assert mine["output"] == theirs["output"]

echo("trophy:", [(row["token"], row["dot"], row["score"], row["power"], row["weight"]) for row in trophy["rows"]], trophy["total"], trophy["output2"])
echo("suitcase:", [(row["token"], row["dot"], row["score"], row["weight"]) for row in suitcase["rows"]], suitcase["output2"])
echo("cosine:", out["cosine"])
echo("spread:", spread)
echo("unscaled:", out["unscaled"], "distance from the blend:", dist)

json.dump(out, sys.stdout, indent=1)
print()
