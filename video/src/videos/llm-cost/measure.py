"""Computes every price, bill, total and saving the Llm-4-Cost video shows.

    python3 -I src/videos/llm-cost/measure.py > src/videos/llm-cost/measurements.json

(run from video/). Nothing here is looked up: the prices are the lessons' own
October 2026 snapshot, and every bill is computed with the lessons' own code.

How. The three lessons (content/courses/how-llms-work/pricing-structure.mdx,
estimating-cost.mdx and controlling-cost.mdx) are read as they are. Every
Python <CodeBlock> is pulled out of its MDX (initCode and starterCode, the JS
template literals unescaped), keyed the way lib/blockOutputKey.ts keys it,
and run; what it prints must equal, line for line, what the site's own
Pyodide printed for that block (lib/generated/block-outputs.json), or this
script stops. The structured numbers below are then computed by calling the
functions those same blocks define (`cost`, `conversation_cost`,
`request_cost`, `monthly`, `month`), with the blocks' own scenarios, so a
number on screen is the lesson's arithmetic and never a re-implementation of
it. The two markdown tables in pricing-structure.mdx (the October 2026 rates
and the length thresholds) are parsed from the MDX text, verbatim.

What it computes, part by part:

  1. The price sheet. The ten-row table: input, output, and the ratio
     (output / input) computed per row; how many rows sit at exactly 5x and
     the lowest ratio; the spread from the cheapest input to the dearest. The
     cache rates of the four tiers estimating-cost prices (fable, opus,
     sonnet, haiku) as fractions of their input rate. The lesson's
     50,000-token prefix ("Why cached input is so cheap") at Sonnet's input
     and cached rates, with `cost`. The threshold table, and the lesson's own
     concept-check case (a 300,000-token prompt against a 272,000-token
     threshold) on GPT-6.1 Sol, a GPT-6 family model: its input at the
     headline rate and at the rate above the line.
  2. Estimating. One support-bot request (1,200 in, 300 out) on each tier,
     and per 100,000 requests. The resend: `conversation_cost` on Sonnet with
     the block's defaults (2,000-token system prompt, 150-token messages,
     400-token replies), per turn and in total for 1 to 40 turns, plain and
     cached; and eight separate 5-turn chats against one 40-turn chat (the
     lesson's own comparison). Thinking: `request_cost` on Sonnet, 2,000 in,
     400 visible, at the block's five thinking budgets. The month: `monthly`
     on the block's four workloads.
  3. Controlling. The routing block's classification workload (50,000 a day,
     600 in, 15 out) on each tier with `month`, and the saving from Opus to
     Haiku; the cache lever is the same 40-turn chat, cached.

Also: the four tiers' names on screen ("Claude Sonnet 5.5") are matched to
estimating-cost's price keys ("sonnet") by name and by both prices, so a tier
can only carry a name whose row in the October table has its rates; and Fig.
3's two lines (a support question and its answer, the video's own) are cut
into tokens by tiktoken's o200k_base, the course's tokenizer.

Needs tiktoken 0.12.0 with TIKTOKEN_CACHE_DIR pointing at a cached
o200k_base.
"""

import contextlib
import io
import json
import re
import sys
from pathlib import Path

import tiktoken

ROOT = Path(__file__).resolve().parents[4]
LESSONS = ROOT / "content" / "courses" / "how-llms-work"
MANIFEST = ROOT / "lib" / "generated" / "block-outputs.json"


# ── The lessons' code blocks, run as the site runs them ─────────────────────


def fnv1a(s: str) -> str:
    """lib/blockOutputKey.ts's FNV-1a 32-bit, over UTF-16 code units."""
    h = 0x811C9DC5
    data = s.encode("utf-16-le")
    for i in range(0, len(data), 2):
        h ^= data[i] | (data[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def unescape(literal: str) -> str:
    """A JS template literal's body, as the string it evaluates to."""
    return re.sub(r"\\(.)", lambda m: {"n": "\n", "t": "\t"}.get(m.group(1), m.group(1)), literal, flags=re.S)


def blocks(lesson: str):
    """Every python CodeBlock in a lesson: (initCode or None, starterCode)."""
    text = (LESSONS / f"{lesson}.mdx").read_text()
    out = []
    for m in re.finditer(r"<CodeBlock\s+adapter=\"python\"(.*?)/>\n", text, flags=re.S):
        body = m.group(1)
        init = re.search(r"initCode:\s*`((?:[^`\\]|\\.)*)`", body, flags=re.S)
        start = re.search(r"starterCode:\s*`((?:[^`\\]|\\.)*)`", body, flags=re.S)
        out.append((unescape(init.group(1)) if init else None, unescape(start.group(1))))
    return out


def run(lesson: str, index: int):
    """Run one block (initCode, then starterCode, in one namespace), check its
    printed output against the site's manifest, and return the namespace."""
    init, starter = blocks(lesson)[index]
    key = fnv1a(f"python\0{init or ''}\0{starter}")
    want = json.loads(MANIFEST.read_text())[f"content/courses/how-llms-work/{lesson}.mdx"][key]
    want_text = "\n".join(c["content"] for c in want["cells"] if c["type"] in ("stdout", "text"))
    ns: dict = {}
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        if init:
            exec(init, ns)
        exec(starter, ns)
    got = buf.getvalue()
    norm = lambda s: [ln.strip() for ln in s.strip().splitlines()]  # the manifest trims a cell's leading spaces
    if norm(got) != norm(want_text):
        sys.exit(f"{lesson} block {index} prints something other than the site's output:\n{got}\n---\n{want_text}")
    print(f"── {lesson} block {index} ({key}) matches the site's output", file=sys.stderr)
    print(got, file=sys.stderr)
    return ns


def table(lesson: str, header: str):
    """The markdown table whose header row starts with `header`, as rows of cells."""
    lines = (LESSONS / f"{lesson}.mdx").read_text().splitlines()
    start = next(i for i, ln in enumerate(lines) if ln.startswith(f"| {header}"))
    rows = []
    for ln in lines[start + 2 :]:
        if not ln.startswith("|"):
            break
        rows.append([c.strip() for c in ln.strip("|").split("|")])
    return rows


def dollars(cell: str) -> float:
    return float(cell.replace("$", "").replace(",", ""))


def r(x: float, digits: int = 6) -> float:
    return round(x, digits)


# ── 1. The price sheet ──────────────────────────────────────────────────────

rates = [
    {"model": m, "in": dollars(i), "out": dollars(o), "ratioPrinted": ratio, "ratio": r(dollars(o) / dollars(i), 4)}
    for m, i, o, ratio in table("pricing-structure", "Model | Input")
]
assert len(rates) == 10
fives = sum(1 for row in rates if abs(row["ratio"] - 5) < 1e-9)
cheapest = min(rates, key=lambda row: row["in"])
dearest = max(rates, key=lambda row: row["in"])

thresholds = [
    {"model": m, "threshold": int(t.split()[0].replace(",", "")), "inMult": float(i.rstrip("x")), "outMult": float(o.rstrip("x"))}
    for m, t, i, o in table("pricing-structure", "Model (October 2026)")
]

five = table("pricing-structure", "Number")
sheet = [{"name": n.strip("*"), "what": w, "relation": rel.replace("**", "")} for n, w, rel in five]

ps0 = run("pricing-structure", 0)

# estimating-cost block 0: one request, and the four tiers' prices.
ec0 = run("estimating-cost", 0)
PRICES, cost = ec0["PRICES"], ec0["cost"]
cache_fraction = {m: r(p["cached"] / p["in"], 6) for m, p in PRICES.items()}

PREFIX = 50_000  # "If you send the same 50,000-token prefix on every turn"
prefix = {
    "tokens": PREFIX,
    "sonnetFull": r(cost("sonnet", input_tokens=PREFIX)),
    "sonnetCached": r(cost("sonnet", cached_tokens=PREFIX)),
}

# The concept check's oversized prompt, on GPT-6.1 Sol (the GPT-6 family's
# 272,000-token threshold, 2x input above it).
sol = next(row for row in rates if row["model"] == "GPT-6.1 Sol")
gpt6 = next(t for t in thresholds if t["model"].startswith("OpenAI GPT-6"))
BIG = 300_000
oversized = {
    "model": sol["model"],
    "tokens": BIG,
    "threshold": gpt6["threshold"],
    "past": BIG - gpt6["threshold"],
    "headline": r(BIG / 1e6 * sol["in"]),
    "above": r(BIG / 1e6 * sol["in"] * gpt6["inMult"]),
}

# ── 2. Estimating ───────────────────────────────────────────────────────────

REQ_IN, REQ_OUT, VOLUME = 1200, 300, 100_000
request = [
    {"model": m, "per": r(cost(m, input_tokens=REQ_IN, output_tokens=REQ_OUT), 8),
     "perVolume": r(cost(m, input_tokens=REQ_IN, output_tokens=REQ_OUT) * VOLUME, 4)}
    for m in PRICES
]

ec1 = run("estimating-cost", 1)
conversation_cost = ec1["conversation_cost"]
SYSTEM, USER, REPLY = 2000, 150, 400  # the function's defaults
TURNS = 40
per_turn = []
history = SYSTEM
for t in range(1, TURNS + 1):
    history += USER
    per_turn.append({"turn": t, "input": history, "resent": history - USER, "new": USER})
    history += REPLY
conversation = {
    "model": "sonnet",
    "system": SYSTEM,
    "user": USER,
    "reply": REPLY,
    "perTurn": per_turn,
    "totals": [
        {"turns": t, "plain": r(conversation_cost("sonnet", t)), "cached": r(conversation_cost("sonnet", t, cached=True))}
        for t in range(1, TURNS + 1)
    ],
}
for row in conversation["totals"]:
    row["saved"] = r(1 - row["cached"] / row["plain"], 4)
forty = conversation["totals"][39]
conversation["eightFives"] = r(8 * conversation_cost("sonnet", 5))
conversation["twentyOverTen"] = r(conversation["totals"][19]["plain"] / conversation["totals"][9]["plain"], 4)
conversation["fortyOverTwenty"] = r(forty["plain"] / conversation["totals"][19]["plain"], 4)

ec2 = run("estimating-cost", 2)
request_cost = ec2["request_cost"]
IN, VISIBLE = ec2["IN"], ec2["VISIBLE"]
base = request_cost("sonnet", IN, VISIBLE, 0)
thinking = {
    "model": "sonnet",
    "in": IN,
    "visible": VISIBLE,
    "rows": [
        {"thinking": k, "cost": r(request_cost("sonnet", IN, VISIBLE, k), 8), "times": r(request_cost("sonnet", IN, VISIBLE, k) / base, 4)}
        for k in [0, 500, 2000, 8000, 20000]
    ],
}

ec3 = run("estimating-cost", 3)
rows, total = ec3["monthly"](ec3["workloads"])
month = {
    "workloads": [
        {"name": name, "model": model, "in": ec3["workloads"][name]["in"], "out": ec3["workloads"][name]["out"],
         "perDay": ec3["workloads"][name]["per_day"], "per": r(per, 8), "month": r(m, 4)}
        for name, model, per, m in rows
    ],
    "total": r(total, 4),
}
month["dominant"] = max(month["workloads"], key=lambda w: w["month"])["name"]
month["dearestModel"] = max(month["workloads"], key=lambda w: PRICES[w["model"]]["in"])["name"]

# ── 3. Controlling ──────────────────────────────────────────────────────────

cc0 = run("controlling-cost", 0)
route_month = cc0["month"]
CL_IN, CL_OUT, CL_DAY = 600, 15, 50_000
route = {
    "in": CL_IN,
    "out": CL_OUT,
    "perDay": CL_DAY,
    "tiers": [{"model": m, "month": r(route_month(m, CL_IN, CL_OUT, CL_DAY), 4)} for m in cc0["PRICE"]],
    "saving": r(cc0["everything_on_opus"] - cc0["routed"], 4),
}
run("controlling-cost", 1)

# ── Names, and Fig. 3's tokens ──────────────────────────────────────────────

names = {}
for key, p in PRICES.items():
    row = next(row for row in rates if key in row["model"].lower())
    assert (row["in"], row["out"]) == (p["in"], p["out"]), (key, row)
    names[key] = row["model"]

enc = tiktoken.get_encoding("o200k_base")
LINES = {"prompt": "Where is my order? It was due on Monday.", "answer": "It shipped today and arrives Thursday."}
tokens = {k: [{"id": i, "piece": enc.decode([i])} for i in enc.encode(v)] for k, v in LINES.items()}
for k, v in LINES.items():
    assert "".join(t["piece"] for t in tokens[k]) == v

cache_lever = {"turns": TURNS, "plain": forty["plain"], "cached": forty["cached"], "saved": forty["saved"]}

out = {
    "rates": rates,
    "fives": fives,
    "minRatio": min(row["ratio"] for row in rates),
    "cheapest": cheapest["model"],
    "dearest": dearest["model"],
    "spread": r(dearest["in"] / cheapest["in"], 4),
    "sheet": sheet,
    "prices": PRICES,
    "cacheFraction": cache_fraction,
    "prefix": prefix,
    "thresholds": thresholds,
    "oversized": oversized,
    "request": {"in": REQ_IN, "out": REQ_OUT, "volume": VOLUME, "tiers": request},
    "conversation": conversation,
    "thinking": thinking,
    "month": month,
    "route": route,
    "cacheLever": cache_lever,
    "outputWorth": min(row["ratio"] for row in rates),
    "names": names,
    "tokens": tokens,
}
json.dump(out, sys.stdout, indent=1)
sys.stdout.write("\n")
