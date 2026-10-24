"""Computes every number, token and string the Llm-3-Generation video shows.

    export TIKTOKEN_CACHE_DIR=...   # o200k_base, as the course's lessons load it
    python -I src/videos/llm-generation/measure.py > src/videos/llm-generation/measurements.json

Run with the site's Pyodide versions (NumPy 2.4.6, tiktoken 0.12.0). Each
section re-runs a lesson's own code block, with its own numbers and seeds,
from content/courses/how-llms-work/, and where the page prints that block's
output (lib/generated/block-outputs.json, the site's Pyodide run) the result
is asserted against it, so the video cannot disagree with the page.

  1. sampling.mdx. The lesson's four tokens and scores (" cat", " dog",
     " bird", " rock"; 3.2, 2.1, 1.5, -0.4). The probabilities at the
     temperatures the video stops at, a dense grid from 0.01 to 2.00 for the
     bars that move between stops (the same computation as the standalone
     LlmTemperature video's measure.py, which this extends), top-p 0.9 after
     T = 1.5, the confident and uncertain nucleus of the "Top-p" block, and
     the five seeded runs of "Watch randomness accumulate".
  2. why-models-hallucinate.mdx. The two continuations of the first block,
     and the rough risk score of the second, run as written.
  3. context-windows.mdx. The window budget block, the "lost in the middle"
     block's stylized recall numbers, the money example (a 500,000-token
     document over ten turns), and the quadratic attention cost from 8,000
     to 1,000,000 tokens.
  4. reasoning-models.mdx. The transcript of the first block, counted two
     ways: the lesson's words-times-1.3 estimate (what the page prints) and
     o200k_base's real count. And the stylized accuracy-versus-thinking
     curve of the second block, with its gains.
"""

import json
import re
import sys
from pathlib import Path

import numpy as np
import tiktoken

ROOT = Path(__file__).resolve().parents[4]
BLOCKS = json.loads((ROOT / "lib" / "generated" / "block-outputs.json").read_text())


def page_output(lesson, needle):
    """The text the page prints for the block of `lesson` whose output contains `needle`."""
    for entry in BLOCKS[f"content/courses/how-llms-work/{lesson}.mdx"].values():
        text = "".join(c.get("content", "") for c in entry["cells"])
        if needle in text:
            return text
    raise KeyError((lesson, needle))


def sig(v, digits=6):
    """A float kept to `digits` significant figures, so a sliver stays a sliver."""
    return float(f"{float(v):.{digits}g}")


def softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()


# ── 1. Sampling ──────────────────────────────────────────────────────────────

TOKENS = ["cat", "dog", "bird", "rock"]
LOGITS = np.array([3.2, 2.1, 1.5, -0.4])
TEMPS = [0.2, 0.7, 1.0, 1.5, 2.0]
TOP_P = 0.9


def probs_at(t):
    """The lesson's sampling distribution at temperature t; t = 0 is greedy."""
    if t == 0:
        out = np.zeros_like(LOGITS)
        out[np.argmax(LOGITS)] = 1.0
        return out
    return softmax(LOGITS / t)


def top_p(probs, p=TOP_P):
    """The lesson's top_p: kept indices in order, the running totals, and the renormalized probs."""
    order = np.argsort(probs)[::-1]
    cumulative = 0.0
    kept, running = [], []
    for i in order:
        kept.append(int(i))
        cumulative += probs[i]
        running.append(float(cumulative))
        if cumulative >= p:
            break
    mask = np.zeros_like(probs)
    mask[kept] = probs[kept]
    return kept, running, mask / mask.sum()


# Dividing by a positive temperature never reorders the tokens, and T -> 0 is argmax.
for t in np.arange(0.01, 2.0001, 0.01):
    assert (np.argsort(-probs_at(t)) == np.argsort(-LOGITS)).all()
assert np.allclose(softmax(LOGITS / 0.01), probs_at(0))

rows = []
for t in TEMPS:
    p = probs_at(t)
    kept, running, renorm = top_p(p)
    rows.append(
        {
            "t": t,
            "probs": [sig(v) for v in p],
            "scaled": [round(float(v), 4) for v in LOGITS / t],
            "topP": {"kept": kept, "running": [round(v, 6) for v in running], "renormalized": [sig(v) for v in renorm]},
        }
    )
grid = [
    {"t": round(float(t), 2), "probs": [sig(v) for v in probs_at(round(float(t), 2))]}
    for t in np.arange(0.01, 2.0001, 0.01)
]
one = softmax(LOGITS)
cat_over_dog = float(one[0] / one[1])

# Twenty seeded draws per temperature, exactly as the standalone LlmTemperature
# video's measure.py makes them: every row a fresh generator from one seed,
# the seed the most typical of 0 to 99 (counts closest to the expected ones).
# The video shows the first three draws at T = 1, "one prompt, different
# answers".
DRAW_TEMPS = [0.2, 0.7, 1.0, 1.5]
DRAWS = 20


def draws(seed, t):
    picks = np.random.default_rng(seed).choice(len(TOKENS), size=DRAWS, p=probs_at(t))
    u = np.random.default_rng(seed).random(DRAWS)
    cdf = np.cumsum(probs_at(t))
    cdf /= cdf[-1]
    assert (cdf.searchsorted(u, side="right") == picks).all(), (seed, t)
    return picks


def typicality(seed):
    score = 0.0
    for t in DRAW_TEMPS:
        counts = np.bincount(draws(seed, t), minlength=len(TOKENS))
        expected = DRAWS * probs_at(t)
        score += float((((counts - expected) ** 2) / (expected + 0.5)).sum())
    return score


seed = min(range(100), key=typicality)
standalone = json.loads((ROOT / "video" / "src" / "videos" / "llm-temperature" / "measurements.json").read_text())
assert seed == standalone["seed"]
draws_t1 = [int(i) for i in draws(seed, 1.0)]
assert draws_t1 == next(r["draws"] for r in standalone["rows"] if r["t"] == 1.0)

# The page's first two blocks print these same numbers.
softmax_page = page_output("sampling", "probability ratio")
for tok, p in zip(TOKENS, one):
    assert re.search(rf"{tok}\s+-?[\d.]+\s+{p:.3f}", softmax_page), tok
assert f"{round(cat_over_dog, 1)} x probability ratio" in softmax_page
temp_page = page_output("sampling", "Low T concentrates")
for r in rows:
    if r["t"] == 1.5:
        continue  # the video's own stop; the lesson's block prints 0.2, 0.7, 1.0 and 2.0
    line = f"T={r['t']:<4} " + "  ".join(f"{k}={v:.3f}" for k, v in zip(TOKENS, r["probs"]))
    assert line in temp_page, line

# "Top-p (nucleus) sampling", run as written: the nucleus adapts to confidence.
NUCLEUS_TOKENS = ["cat", "dog", "bird", "rock", "idea", "seven"]
nucleus = {}
for name, scores in {
    "confident": [5.0, 1.0, 0.5, 0.1, 0.0, -1.0],
    "uncertain": [1.2, 1.1, 1.0, 0.9, 0.8, 0.7],
}.items():
    probs = softmax(np.array(scores))
    kept, running, _ = top_p(probs)
    nucleus[name] = {
        "scores": scores,
        "probs": [sig(v) for v in probs],
        "kept": kept,
        "running": [round(v, 6) for v in running],
    }
nucleus_page = page_output("sampling", "nucleus holds")
assert f"nucleus holds {len(nucleus['confident']['kept'])} token(s)" in nucleus_page.split("UNCERTAIN")[0]
assert f"nucleus holds {len(nucleus['uncertain']['kept'])} token(s)" in nucleus_page.split("UNCERTAIN")[1]

# "Watch randomness accumulate", run as written (seed 0, three close scores).
rng = np.random.default_rng(0)
RUN_TOKENS = ["a", "b", "c"]
run_logits = np.array([1.0, 0.9, 0.8])
runs = []
for run in range(5):
    probs = softmax(run_logits / 1.0)
    runs.append("".join(RUN_TOKENS[rng.choice(len(RUN_TOKENS), p=probs)] for _ in range(8)))
runs_page = page_output("sampling", "five different outputs")
for k, s in enumerate(runs):
    assert f"run {k + 1}: {s}" in runs_page, s
assert len(set(runs)) == 5

# ── 2. Why models hallucinate ────────────────────────────────────────────────

continuations = [
    {"prompt": "The capital of France is", "continuation": " Paris", "grounded": True},
    {"prompt": "A 2019 study on this by", "continuation": " Chen et al. found a 23% improvement", "grounded": False},
]
cont_page = page_output("why-models-hallucinate", "No internal flag")
for c in continuations:
    assert c["prompt"] + c["continuation"] in cont_page


def risk(rare, specific, composite, recent, leading):
    factors = {
        "rarely attested": rare,
        "highly specific": specific,
        "composite claim": composite,
        "after cutoff": recent,
        "leading question": leading,
    }
    hits = [name for name, on in factors.items() if on]
    return len(hits), hits


RISK_FACTORS = ["rarely attested", "highly specific", "composite claim", "after cutoff", "leading question"]
cases = {
    "Capital of France": (0, 0, 0, 0, 0),
    "Population of a small town": (1, 1, 0, 0, 0),
    "Page number of a quotation": (1, 1, 1, 0, 0),
    "Name of the study that proved X": (1, 1, 1, 0, 1),
}
risk_rows = []
risk_page = page_output("why-models-hallucinate", "risk 0/5")
for label, flags in cases.items():
    n, hits = risk(*flags)
    risk_rows.append({"case": label, "flags": list(flags), "score": n, "hits": hits})
    assert re.search(rf"{re.escape(label)}\s+risk {n}/5", risk_page), label

# ── 3. Context windows ───────────────────────────────────────────────────────

WINDOW = 200_000
MAX_OUTPUT = 128_000
budget_parts = [("system prompt", 1_500), ("document", 180_000), ("history", 12_000), ("question", 200)]
used = sum(v for _, v in budget_parts)
room = min(WINDOW - used, MAX_OUTPUT)
budget_page = page_output("context-windows", "room for output")
assert f"{used:,} / {WINDOW:,}" in budget_page and f"{room:,}" in budget_page

POSITIONS = ["start", "10%", "25%", "50%", "75%", "90%", "end"]
POSITION_AT = [0, 10, 25, 50, 75, 90, 100]
RECALL = [0.97, 0.92, 0.81, 0.68, 0.79, 0.90, 0.96]
recall_page = page_output("context-windows", "Fact recall by position")
for pos, r in zip(POSITIONS, RECALL):
    assert re.search(rf"{re.escape(pos)}\s+{r:.2f}", recall_page), pos

# "Money": a 500,000-token document in a ten-turn conversation, resent every turn.
DOC, TURNS = 500_000, 10
billed_input = DOC * TURNS

# "Why long context was hard to build": from 8,000 to 1,000,000 tokens.
SHORT, LONG = 8_000, 1_000_000
length_ratio = LONG / SHORT
work_ratio = length_ratio**2
lengths = np.logspace(np.log10(SHORT), np.log10(LONG), 61)
attention_curve = [
    {"n": round(float(n)), "linear": sig(n / SHORT, 5), "quadratic": sig((n / SHORT) ** 2, 5)} for n in lengths
]
attention_marks = [
    {"n": n, "linear": n / SHORT, "quadratic": (n / SHORT) ** 2} for n in [8_000, 32_000, 128_000, 1_000_000]
]

# ── 4. Reasoning models ──────────────────────────────────────────────────────

transcript = """<thinking>
The question asks for compound growth over 3 years at 8%.
First attempt: 1000 * 3 * 0.08 = 240. That is simple interest,
not compound. Let me redo it.
Compound: 1000 * 1.08^3 = 1000 * 1.259712 = 1259.71
Check: year 1 -> 1080, year 2 -> 1166.40, year 3 -> 1259.71. Matches.
</thinking>
After three years the balance is $1,259.71."""
thinking, answer = transcript.split("</thinking>")
est_thinking = len(thinking.split()) * 1.3
est_answer = len(answer.split()) * 1.3
reasoning_page = page_output("reasoning-models", "more thinking than answer")
assert f"~{est_thinking:.0f} tokens" in reasoning_page and f"~{est_answer:.0f} tokens" in reasoning_page
enc = tiktoken.get_encoding("o200k_base")
# The working, from its first line to its last; the tags are the format's, not the model's words.
working = thinking.replace("<thinking>", "").strip()
answer_text = answer.strip()
thinking_lines = working.split("\n")
real_thinking = len(enc.encode(working))
real_answer = len(enc.encode(answer_text))
# The arithmetic in the working is right where it says it is: the slip, and the fix.
assert 1000 * 3 * 0.08 == 240
assert round(1000 * 1.08**3, 2) == 1259.71
assert [round(1000 * 1.08**k, 2) for k in (1, 2, 3)] == [1080.0, 1166.4, 1259.71]

budgets = [0, 250, 500, 1000, 2000, 4000, 8000, 16000]
accuracy = [0.42, 0.58, 0.66, 0.72, 0.76, 0.78, 0.79, 0.79]
gains = [None] + [round(b - a, 4) for a, b in zip(accuracy, accuracy[1:])]
per_k = [None] + [
    round((accuracy[k] - accuracy[k - 1]) / ((budgets[k] - budgets[k - 1]) / 1000), 6) for k in range(1, len(budgets))
]
curve_page = page_output("reasoning-models", "The last doubling")
for b, a in zip(budgets, accuracy):
    assert re.search(rf"\b{b}\s+{a:.2f}", curve_page), b
# The first 500 thinking tokens buy most of the gain the curve ever reaches.
total_gain = accuracy[-1] - accuracy[0]
first_500 = accuracy[budgets.index(500)] - accuracy[0]

out = {
    "source": "content/courses/how-llms-work/ (sampling, why-models-hallucinate, context-windows, reasoning-models)",
    "numpy": np.__version__,
    "tiktoken": tiktoken.__version__,
    "sampling": {
        "tokens": TOKENS,
        "logits": LOGITS.tolist(),
        "topP": TOP_P,
        "greedy": probs_at(0).tolist(),
        "rows": rows,
        "grid": grid,
        "catOverDog": round(cat_over_dog, 4),
        "seed": seed,
        "drawsT1": draws_t1,
        "nucleusTokens": NUCLEUS_TOKENS,
        "nucleus": nucleus,
        "runTokens": RUN_TOKENS,
        "runLogits": run_logits.tolist(),
        "runProbs": [sig(v) for v in softmax(run_logits)],
        "runs": runs,
    },
    "hallucination": {
        "continuations": continuations,
        "riskFactors": RISK_FACTORS,
        "risk": risk_rows,
    },
    "context": {
        "window": WINDOW,
        "maxOutput": MAX_OUTPUT,
        "budget": [{"part": k, "tokens": v} for k, v in budget_parts],
        "used": used,
        "room": room,
        "recall": [{"position": p, "at": a, "recall": r} for p, a, r in zip(POSITIONS, POSITION_AT, RECALL)],
        "money": {"document": DOC, "turns": TURNS, "billedInput": billed_input},
        "attention": {
            "short": SHORT,
            "long": LONG,
            "lengthRatio": length_ratio,
            "workRatio": work_ratio,
            "curve": attention_curve,
            "marks": attention_marks,
        },
    },
    "reasoning": {
        "thinkingLines": thinking_lines,
        "answer": answer_text,
        "estimate": {"thinking": round(est_thinking, 1), "answer": round(est_answer, 1)},
        "o200k": {"thinking": real_thinking, "answer": real_answer},
        "ratio": round(real_thinking / real_answer, 2),
        "budgets": budgets,
        "accuracy": accuracy,
        "gains": gains,
        "perK": per_k,
        "first500Share": round(first_500 / total_gain, 4),
    },
}

json.dump(out, sys.stdout, indent=1)
sys.stdout.write("\n")

# What the narration quotes, on stderr so the JSON stays clean.
log = sys.stderr
for r in rows:
    pct = "  ".join(f"{k}={v * 100:6.2f}%" for k, v in zip(TOKENS, r["probs"]))
    print(f"T={r['t']:<4} {pct}  top-p keeps {[TOKENS[i] for i in r['topP']['kept']]}", file=log)
print(f"cat/dog at T=1: {cat_over_dog:.3f}; seed {seed}, draws at T=1 {[TOKENS[i] for i in draws_t1[:5]]}", file=log)
for k, v in nucleus.items():
    print(f"nucleus {k}: keeps {[NUCLEUS_TOKENS[i] for i in v['kept']]} running {v['running']}", file=log)
print(f"runs: {runs}", file=log)
for r in risk_rows:
    print(f"risk {r['case']}: {r['score']}/5 {r['hits']}", file=log)
print(f"budget used {used:,} of {WINDOW:,}, room {room:,}; billed input {billed_input:,}", file=log)
print(f"attention: {length_ratio:.0f}x length, {work_ratio:,.0f}x work", file=log)
print(
    f"thinking o200k {real_thinking} vs answer {real_answer} ({real_thinking / real_answer:.1f}x); "
    f"estimate {est_thinking:.0f} vs {est_answer:.0f} ({est_thinking / est_answer:.1f}x)",
    file=log,
)
print(f"first 500 thinking tokens: {first_500:.2f} of {total_gain:.2f} gain ({first_500 / total_gain:.0%})", file=log)
