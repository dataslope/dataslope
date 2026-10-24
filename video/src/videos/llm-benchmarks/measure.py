"""Measures every number the Llm-5-Benchmarks video shows.

    $PY src/videos/llm-benchmarks/measure.py > src/videos/llm-benchmarks/measurements.json

($PY is a Python pinned to the site's Pyodide versions: NumPy 2.4.6.)

Each part re-runs one of the lesson code blocks the video is built from, as
the lesson writes it (same constants, same seed, same calls in the same
order), and checks that what it prints is exactly what the page prints: the
site's prepopulated output for that block, lib/generated/block-outputs.json,
run in the site's Pyodide. A mismatch fails the script. The lessons are in
content/courses/how-llms-work/:

- "score" is what-benchmarks-measure.mdx, "How to read a score": two models
  on MMLU, GPQA Diamond and ARC-AGI-3, each benchmark's ceiling, the gap and
  the headroom left above the leader.
- "contamination" is benchmark-pitfalls.mdx's first block: what the score
  reports for a model that memorized the test, one that is capable, both and
  neither.
- "checklist" is benchmark-pitfalls.mdx, "Reading a launch table well".
- "sizes" is evaluating-for-your-task.mdx, "How many examples" (seed 7): how
  often n examples rank a model that is truly 80% right above one that is
  truly 65% right, over 2,000 simulated evaluation sets per n. The video
  also draws the 2,000 pairs of scores at n = 20 that the same run produces
  (they are the draws behind the page's 81.3%), and the lesson's own
  follow-up, "Change true_b to 0.78 and rerun", run the same way.
- "harness" is evaluating-for-your-task.mdx, "Building the harness": the two
  stand-in models over the lesson's ten tickets.
- "cost" is evaluating-for-your-task.mdx, "Comparing on cost as well as
  accuracy": the lesson's four options (October 2026 prices, which agree
  with pricing-structure.mdx's table) at 700 tokens in, 25 out, a million
  requests a month.
- "quoted" holds the scores the lessons quote in prose and footnotes rather
  than compute, with where each is said, so data.ts reads every number from
  one file.

Printed checks go to stderr; the JSON goes to stdout.
"""

import io
import json
import platform
import sys
from contextlib import redirect_stdout
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[4]
LESSONS = "content/courses/how-llms-work"
PAGE = json.loads((ROOT / "lib/generated/block-outputs.json").read_text())


def page_says(lesson: str, printed: str) -> None:
    """Fail unless `printed` is exactly one of the lesson page's block outputs."""
    entries = PAGE[f"{LESSONS}/{lesson}.mdx"]
    outputs = ["".join(c["content"] for c in e["cells"] if c["type"] == "stdout") for e in entries.values()]
    if printed.rstrip("\n") not in [o.rstrip("\n") for o in outputs]:
        sys.stderr.write(f"--- {lesson}: measure.py printed\n{printed}\n--- the page prints\n" + "\n---\n".join(outputs))
        raise SystemExit(f"{lesson}: output differs from the page")
    print(f"[ok] {lesson}: matches the page's output", file=sys.stderr)


def run(fn):
    buf = io.StringIO()
    with redirect_stdout(buf):
        result = fn()
    return buf.getvalue(), result


# ── what-benchmarks-measure.mdx, "How to read a score" ──────────────────────


def score_block():
    # The lesson's block, verbatim.
    benchmarks = {
        "MMLU":         {"model_a": 0.923, "model_b": 0.917, "ceiling": 0.95},
        "GPQA Diamond": {"model_a": 0.960, "model_b": 0.954, "ceiling": 1.00},
        "ARC-AGI-3":    {"model_a": 0.627, "model_b": 0.302, "ceiling": 1.00},
    }

    for name, r in benchmarks.items():
        gap = r["model_a"] - r["model_b"]
        headroom = r["ceiling"] - r["model_a"]
        share = gap / headroom if headroom > 0.001 else float("inf")
        print(f"{name:<14} gap {gap:+.3f}  headroom {headroom:.3f}  "
              f"gap is {share:.0%} of remaining headroom")

    print()
    print("The same 0.6 point gap means very different things depending")
    print("on how much room is left above it.")
    return [
        {
            "name": name,
            "a": r["model_a"],
            "b": r["model_b"],
            "ceiling": r["ceiling"],
            "gap": round(r["model_a"] - r["model_b"], 4),
            "headroom": round(r["ceiling"] - r["model_a"], 4),
        }
        for name, r in benchmarks.items()
    ]


# ── benchmark-pitfalls.mdx ───────────────────────────────────────────────────


def contamination_block():
    def looks_capable(memorized_answers, genuine_capability):
        return "high score" if (memorized_answers or genuine_capability) else "low score"

    cases = [
        ("memorized the test set", True, False),
        ("genuinely capable",      False, True),
        ("both",                   True, True),
        ("neither",                False, False),
    ]

    print(f"{'situation':<26}{'reported result':>16}")
    for label, mem, cap in cases:
        print(f"{label:<26}{looks_capable(mem, cap):>16}")

    print()
    print("Rows 1 and 2 are indistinguishable from the score alone.")
    print("Only a held-out or post-cutoff test can separate them.")
    return [{"situation": label, "memorized": mem, "capable": cap, "reported": looks_capable(mem, cap)} for label, mem, cap in cases]


def checklist_block():
    checks = [
        ("Is every model within ~3 points?", "saturated, ignore this row"),
        ("Is the benchmark contamination-resistant?", "if not, discount the score"),
        ("Are the standard benchmarks present?", "if not, ask what is missing"),
        ("Are competitor versions current?", "stale comparisons inflate the gap"),
        ("Is the effort or config disclosed?", "undisclosed means not comparable"),
        ("Is it the standard harness?", "a vendor harness can swing it 30+ points"),
        ("Does the task resemble yours?", "if not, the score does not transfer"),
    ]

    print("Reading a benchmark table:")
    print()
    for i, (question, implication) in enumerate(checks, 1):
        print(f"{i}. {question}")
        print(f"   -> {implication}")
        print()

    print("If four or more raise concerns, the table is marketing, not evidence.")
    return [{"question": q, "implication": imp} for q, imp in checks]


# ── evaluating-for-your-task.mdx, "How many examples" ───────────────────────


def sizes_block(true_b=0.65, keep_n=20):
    """The lesson's simulation, verbatim but for two things the video needs:
    `true_b` as a parameter (the lesson's own "change true_b to 0.78"), and
    the draws at n = keep_n kept as they are made. Keeping them reads nothing
    from the generator, so the stream, and every printed line, is unchanged."""
    rng = np.random.default_rng(7)
    true_a = 0.80
    rates, kept = {}, []

    for n in [5, 10, 20, 50, 100]:
        correct_ranking = 0
        for _ in range(2000):
            a = rng.binomial(n, true_a) / n
            b = rng.binomial(n, true_b) / n
            if a > b:
                correct_ranking += 1
            if n == keep_n:
                kept.append((int(round(a * n)), int(round(b * n))))
        print(f"n={n:>3}: ranks them correctly {correct_ranking / 2000:.1%} of the time")
        rates[n] = correct_ranking / 2000

    print()
    print("Twenty examples already identify a 15-point gap almost always.")
    print("Try changing true_b to 0.78 and see how the picture changes.")
    return {"trueA": true_a, "trueB": true_b, "trials": 2000, "rates": rates, "keptN": keep_n, "kept": kept}


# ── evaluating-for-your-task.mdx, "Building the harness" ────────────────────


def harness_block():
    # initCode (hidden on the page), verbatim.
    def model_cheap(text):
        if "refund" in text: return "billing"
        if "password" in text: return "account"
        return "other"

    def model_good(text):
        t = text.lower()
        if any(w in t for w in ("refund", "charge", "invoice", "billing")): return "billing"
        if any(w in t for w in ("password", "login", "sign in", "locked")): return "account"
        if any(w in t for w in ("crash", "error", "broken", "bug")): return "technical"
        return "other"

    CASES = [
        ("I want a refund for last month", "billing"),
        ("My card was charged twice", "billing"),
        ("Cannot reset my password", "account"),
        ("I am locked out of my account", "account"),
        ("The app crashes on startup", "technical"),
        ("Getting a 500 error on upload", "technical"),
        ("Where do I find the invoice?", "billing"),
        ("How do I change my sign in email?", "account"),
        ("Something is broken in the export", "technical"),
        ("Do you have an office in Berlin?", "other"),
    ]

    # starterCode, verbatim.
    def evaluate(fn, cases):
        results = []
        for text, expected in cases:
            got = fn(text)
            results.append((text, expected, got, got == expected))
        accuracy = sum(r[3] for r in results) / len(results)
        return accuracy, results

    out = {}
    for name, fn in [("cheap", model_cheap), ("good", model_good)]:
        acc, results = evaluate(fn, CASES)
        print(f"{name}: {acc:.0%}")
        for text, expected, got, ok in results:
            if not ok:
                print(f"    MISS {text[:34]:<36} expected={expected:<10} got={got}")
        print()
        out[name] = {"accuracy": acc, "results": [{"text": t, "expected": e, "got": g, "ok": ok} for t, e, g, ok in results]}
    return out


# ── evaluating-for-your-task.mdx, "Comparing on cost as well as accuracy" ───


def cost_block():
    # The lesson's block, verbatim ("\$" in the MDX template literal is "$").
    options = {
        "haiku":  {"accuracy": 0.91, "in": 0.10, "out": 0.50},
        "sonnet": {"accuracy": 0.94, "in": 2.00, "out": 10.00},
        "opus":   {"accuracy": 0.95, "in": 4.00, "out": 20.00},
        "fable":  {"accuracy": 0.95, "in": 10.00, "out": 50.00},
    }
    IN_TOK, OUT_TOK, VOLUME = 700, 25, 1_000_000

    rows = []
    print(f"{'model':<8}{'acc':>6}{'monthly':>12}{'per correct':>14}")
    for name, o in options.items():
        per_req = IN_TOK / 1e6 * o["in"] + OUT_TOK / 1e6 * o["out"]
        monthly = per_req * VOLUME
        per_correct = monthly / (VOLUME * o["accuracy"])
        print(f"{name:<8}{o['accuracy']:>6.0%}${monthly:>11,.0f}${per_correct:>13.6f}")
        rows.append({
            "name": name,
            "accuracy": o["accuracy"],
            "in": o["in"],
            "out": o["out"],
            "perRequest": per_req,
            "monthly": monthly,
            "perCorrect": per_correct,
            # What a million correct answers cost: the per-correct column in
            # dollars a million, so it can be said aloud.
            "perMillionCorrect": round(per_correct * 1e6, 2),
        })

    print()
    print("Opus buys 1 extra point over sonnet for twice the money,")
    print("and fable buys nothing over opus on this task at 2.5x the price.")
    print("Whether a point is worth it depends on what an error costs you.")
    return {"inTokens": IN_TOK, "outTokens": OUT_TOK, "volume": VOLUME, "rows": rows}


# ── Run ─────────────────────────────────────────────────────────────────────

printed, score = run(score_block)
page_says("what-benchmarks-measure", printed)
printed, contamination = run(contamination_block)
page_says("benchmark-pitfalls", printed)
printed, checklist = run(checklist_block)
page_says("benchmark-pitfalls", printed)
printed, sizes = run(sizes_block)
page_says("evaluating-for-your-task", printed)
_, close = run(lambda: sizes_block(true_b=0.78, keep_n=0))
printed, harness = run(harness_block)
page_says("evaluating-for-your-task", printed)
printed, cost = run(cost_block)
page_says("evaluating-for-your-task", printed)

# What each step up the tiers costs per error it avoids: the video's own
# arithmetic on the lesson's table, not a line the page prints. Errors a month
# are (1 - accuracy) x volume; a step's break-even is its extra bill divided by
# the errors it removes. Below that price per error, the cheaper tier is the
# cheaper choice overall; above it, the dearer one. The lesson's prose ("a
# minute of triage, the cheap model wins") gets this backwards: Haiku to Sonnet
# breaks even at about 5 cents an error.
rows = cost["rows"]
for r in rows:
    r["errors"] = round((1 - r["accuracy"]) * cost["volume"])
cost["steps"] = []
for lo, hi in zip(rows, rows[1:]):
    avoided = lo["errors"] - hi["errors"]
    extra = hi["monthly"] - lo["monthly"]
    cost["steps"].append({
        "from": lo["name"],
        "to": hi["name"],
        "points": round((hi["accuracy"] - lo["accuracy"]) * 100),
        "times": round(hi["monthly"] / lo["monthly"], 2),
        "errorsAvoided": avoided,
        "extraMonthly": round(extra, 2),
        "perErrorAvoided": round(extra / avoided, 5) if avoided else None,
    })
for st in cost["steps"]:
    print(f"[break-even] {st['from']} -> {st['to']}: {st['errorsAvoided']:,} fewer errors for ${st['extraMonthly']:,.2f}"
          f" = {st['perErrorAvoided']} per error", file=sys.stderr)

# The n = 20 draws, counted: how often the worse model ties or wins, and the
# two histograms of scores (correct answers out of 20) the video draws. The
# draws themselves stay too, in run order, as two lists of counts.
kept = sizes.pop("kept")
sizes["keptA"] = [a for a, _ in kept]
sizes["keptB"] = [b for _, b in kept]
sizes["histA"] = [sizes["keptA"].count(k) for k in range(21)]
sizes["histB"] = [sizes["keptB"].count(k) for k in range(21)]
ties = sum(1 for a, b in kept if a == b)
b_wins = sum(1 for a, b in kept if b > a)
assert len(kept) - ties - b_wins == round(sizes["rates"][20] * 2000)
sizes["keptSummary"] = {"aWins": len(kept) - ties - b_wins, "ties": ties, "bWins": b_wins}
close.pop("kept")

print(f"[sizes] n=20: A ahead {len(kept) - ties - b_wins}, tied {ties}, B ahead {b_wins} of {len(kept)}", file=sys.stderr)
print(f"[sizes] true_b=0.78: {close['rates']}", file=sys.stderr)
for r in cost["rows"]:
    print(f"[cost] {r['name']}: ${r['monthly']:,.2f}/month, ${r['perMillionCorrect']:.2f} per million correct", file=sys.stderr)

quoted = {
    # what-benchmarks-measure.mdx, "Knowledge and reasoning".
    "mmluSubjects": {"value": 57, "where": "what-benchmarks-measure.mdx:19-21"},
    "mmluFrontierAbove": {"value": 92, "where": "what-benchmarks-measure.mdx:29"},
    "mmluCeiling": {"value": 95, "where": "what-benchmarks-measure.mdx:30-31"},
    "gpqaNonExpertPhd": {"value": 34, "where": "what-benchmarks-measure.mdx:34-36"},
    "gpqaLeaders": {"value": 95, "where": "what-benchmarks-measure.mdx:38-40"},
    # Footnote vals-gpqa: 24 of the 136 models one leaderboard tracks at 90% or higher.
    "gpqaAbove90": {"value": 24, "of": 136, "where": "what-benchmarks-measure.mdx:271-274"},
    # Coding: SWE-bench Verified dropped in February 2026; about 30% of Pro's tasks broken.
    "sweProBroken": {"value": 30, "where": "what-benchmarks-measure.mdx:55-57"},
    # Abstract reasoning.
    "arc3Launch": {"value": 1, "where": "what-benchmarks-measure.mdx:78-79", "note": "every frontier model under 1% at launch, March 2026"},
    "arc3Best": {"value": 62.7, "where": "what-benchmarks-measure.mdx:79-81"},
    # Contamination-resistant suites: HLE under 10% at launch (January 2025), about 60% by September 2026.
    "hleLaunch": {"value": 10, "where": "what-benchmarks-measure.mdx:99-101"},
    "hleNow": {"value": 60, "where": "what-benchmarks-measure.mdx:99-101"},
    # benchmark-pitfalls.mdx, "Selective reporting", and its footnote arc-astra.
    "astraStandard": {"value": 62.7, "usd": 26098, "where": "benchmark-pitfalls.mdx:115-119, 314-318"},
    "astraVendor": {"value": 99.9, "usd": 18817, "where": "benchmark-pitfalls.mdx:115-119, 314-318"},
    # benchmark-pitfalls.mdx, "Saturation": the tell.
    "withinPoints": {"value": 3, "where": "benchmark-pitfalls.mdx:34-35"},
    # evaluating-for-your-task.mdx, "How many examples".
    "examplesLo": {"value": 20, "where": "evaluating-for-your-task.mdx:32"},
    "examplesHi": {"value": 50, "where": "evaluating-for-your-task.mdx:32"},
}
def dumps(value, indent=0):
    """JSON with one key per line, but a list of numbers on one line."""
    pad = " " * indent
    if isinstance(value, dict):
        items = [f'{pad} {json.dumps(str(k))}: {dumps(v, indent + 1).lstrip()}' for k, v in value.items()]
        return pad + "{\n" + ",\n".join(items) + "\n" + pad + "}"
    if isinstance(value, list) and all(isinstance(v, (int, float)) for v in value):
        return pad + json.dumps(value)
    if isinstance(value, list):
        return pad + "[\n" + ",\n".join(dumps(v, indent + 1) for v in value) + "\n" + pad + "]"
    return pad + json.dumps(value)


sys.stdout.write(dumps(
    {
        "generatedBy": "src/videos/llm-benchmarks/measure.py",
        "python": platform.python_version(),
        "numpy": np.__version__,
        "score": score,
        "contamination": contamination,
        "checklist": checklist,
        "sizes": sizes,
        "sizesClose": close,
        "harness": harness,
        "cost": cost,
        "quoted": quoted,
    }
))
sys.stdout.write("\n")
