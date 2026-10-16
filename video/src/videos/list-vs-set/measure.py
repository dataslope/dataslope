"""Measures every timing the ListVsSet video shows; data.ts holds the output.

    python3 -I src/videos/list-vs-set/measure.py > measurements.json

What is timed is the lesson's own lookup (content/courses/python-basics/
sets.mdx, "Sets vs lists for lookup"): `n - 1 in big_list` against
`n - 1 in big_set`, where `big_list = list(range(n))` and
`big_set = set(big_list)`. The value asked for is the last one, so the list
walks all n items before it says True.

Method. Every size is built once and kept. Then ROUNDS times over, in an order
shuffled by a seeded generator, each size is timed with `timeit`. A size's
figure is its best round divided by the loop count, which is how
`python -m timeit` reports: the minimum is the run the rest of the machine
disturbed least. Interleaving matters on a shared machine, where a slow minute
would otherwise land on whichever sizes happened to be running in it.

Two checks ride along: the same lookups for values picked at random (seeded),
where a list walks about half of itself on average, and the cost of building
the set once.
"""

import json
import platform
import random
import sys
import timeit

ROUNDS = 30
SIZES = [100_000 * k for k in range(1, 11)]
SEED = 20261015
#: Present values picked at random per size, the same ones for list and set.
PICKS = 100


def best(timer, number, rounds_store, key):
    t = timer.timeit(number) / number
    rounds_store[key] = min(rounds_store.get(key, float("inf")), t)


rng = random.Random(SEED)
data = {}
for n in SIZES:
    big_list = list(range(n))
    big_set = set(big_list)
    picks = rng.sample(range(n), PICKS)
    glb = {"big_list": big_list, "big_set": big_set, "last": n - 1, "picks": picks}
    data[n] = {
        "glb": glb,
        "list_last": timeit.Timer("last in big_list", globals=glb),
        "set_last": timeit.Timer("last in big_set", globals=glb),
        "list_missing": timeit.Timer("-1 in big_list", globals=glb),
        "list_random": timeit.Timer("for t in picks: t in big_list", globals=glb),
        "set_random": timeit.Timer("for t in picks: t in big_set", globals=glb),
        "loop_only": timeit.Timer("for t in picks: pass", globals=glb),
    }

million = data[1_000_000]["glb"]["big_list"]
build = timeit.Timer("set(big_list)", globals={"big_list": million})

found = {n: {} for n in SIZES}
build_best = float("inf")
for r in range(ROUNDS):
    order = SIZES[:]
    rng.shuffle(order)
    for n in order:
        d, out = data[n], found[n]
        # About 30 ms of list scanning per sample, at roughly 5 ns an item.
        scans = max(3, round(0.03 / (n * 5e-9)))
        best(d["list_last"], scans, out, "list_last_s")
        best(d["list_missing"], scans, out, "list_missing_s")
        best(d["set_last"], 100_000, out, "set_last_s")
        best(d["list_random"], 1, out, "list_random_s")
        best(d["set_random"], 1_000, out, "set_random_s")
        best(d["loop_only"], 1_000, out, "loop_only_s")
    t = build.timeit(3) / 3
    build_best = min(build_best, t)
    print(f"round {r + 1}/{ROUNDS}", file=sys.stderr)

rows = []
for n in SIZES:
    out = found[n]
    rows.append(
        {
            "n": n,
            "list_last_s": out["list_last_s"],
            "set_last_s": out["set_last_s"],
            "list_missing_s": out["list_missing_s"],
            # Per lookup: the loop runs over PICKS values.
            "list_random_s": out["list_random_s"] / PICKS,
            "set_random_s": out["set_random_s"] / PICKS,
            "loop_only_s": out["loop_only_s"] / PICKS,
        }
    )

print(
    json.dumps(
        {
            "python": platform.python_version(),
            "implementation": platform.python_implementation(),
            "machine": platform.machine(),
            "seed": SEED,
            "rounds": ROUNDS,
            "rows": rows,
            "build_set_1m_s": build_best,
        },
        indent=2,
    )
)
