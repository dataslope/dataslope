"""Computes every token count, bill and ratio the Llm-4-1-ConversationCost
deep dive shows.

    $S/pyenv/bin/python -I src/videos/llm-conversation-cost/measure.py \
        > src/videos/llm-conversation-cost/measurements.json

(run from video/). Nothing here is looked up: the prices are the lessons' own
October 2026 snapshot, and every bill is computed with the lessons' own code.

How. content/courses/how-llms-work/estimating-cost.mdx is read as it is: its
first two Python <CodeBlock>s ("A single request", which defines PRICES, and
"A conversation, with the resend", which defines `conversation_cost`) are
pulled out of the MDX, keyed the way lib/blockOutputKey.ts keys them, and run;
what each prints must equal, line for line, what the site's own Pyodide
printed (lib/generated/block-outputs.json), or this script stops. Every bill
below is then a call to that same `conversation_cost`, with its own defaults
(read off the function, not retyped): a 2,000-token system prompt, 150-token
messages and 400-token replies, on Sonnet. This is the same conversation, and
the same function, as the unit video's (video/src/videos/llm-cost/measure.py),
so every quantity both videos show is the same number.

What it computes:

  1. The staircase: what each of turns 1 to 40 sends, split three ways for the
     figures: the system prompt (the same every turn), the chat before this
     turn, and the new message. Also each turn's new slice, what it sends that
     the turn before did not (the last reply and the new message): it is what
     a cache cannot reuse.
  2. The bill as an area: the bill for 10, 20, 40 and 80 turns, uncached, and
     the ratio from each to the next. Each bill is split into what grows in a
     straight line with the turns (the system prompt sent every turn, and the
     replies, billed as output) and the rest, which is the chat resent: the
     triangle. The split is computed turn by turn and asserted to add back to
     `conversation_cost` exactly.
  3. The cache: `conversation_cost(..., cached=True)` for the same turns, each
     turn's input cost with and without the cache, and the saving at 40 turns.
     Sonnet's cache rate as a fraction of its input rate (a twentieth), checked
     against pricing-structure.mdx, which says so in words.
  4. Starting fresh: eight 5-turn chats against one 40-turn chat (the lesson's
     own comparison, "a 40-turn conversation can cost more than eight separate
     5-turn ones covering the same ground"), without the cache, and with it:
     the cache the scene before turns on closes most of that gap.

Also: "Claude Sonnet 5.5", the name on screen, is matched to the `sonnet`
price key by both its prices in pricing-structure.mdx's October 2026 table.
"""

import contextlib
import inspect
import io
import json
import re
import sys
from pathlib import Path

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


def r(x: float, digits: int = 6) -> float:
    return round(x, digits)


def close(a: float, b: float) -> bool:
    return abs(a - b) < 1e-12


# ── The lesson's prices and its conversation ────────────────────────────────

ec0 = run("estimating-cost", 0)
PRICES = ec0["PRICES"]
ec1 = run("estimating-cost", 1)
conversation_cost = ec1["conversation_cost"]
assert ec1["PRICES"] == PRICES

MODEL = "sonnet"
defaults = {k: v.default for k, v in inspect.signature(conversation_cost).parameters.items() if v.default is not inspect.Parameter.empty}
SYSTEM, USER, REPLY = defaults["system"], defaults["user"], defaults["reply"]
P = PRICES[MODEL]

# The tier's name on screen, matched by both prices in the October table.
lines = (LESSONS / "pricing-structure.mdx").read_text().splitlines()
start = next(i for i, ln in enumerate(lines) if ln.startswith("| Model | Input"))
rates = []
for ln in lines[start + 2 :]:
    if not ln.startswith("|"):
        break
    m, i, o, _ = [c.strip() for c in ln.strip("|").split("|")]
    rates.append((m, float(i.lstrip("$")), float(o.lstrip("$"))))
name = next(m for m, i, o in rates if MODEL in m.lower())
assert next((i, o) for m, i, o in rates if m == name) == (P["in"], P["out"]), name

# "Claude Opus 5.5 and Sonnet 5.5 ... charge a twentieth of the input price
# for a cache hit" (pricing-structure, "Why cached input is so cheap").
cache_fraction = P["cached"] / P["in"]
assert close(cache_fraction, 1 / 20)
assert "Sonnet 5.5 and OpenAI's GPT-6.1 Sol charge a" in (LESSONS / "pricing-structure.mdx").read_text().replace("\n", " ")

# ── 1. The staircase ────────────────────────────────────────────────────────

TURNS = 40
turns = []
history, prev = SYSTEM, 0
for t in range(1, TURNS + 1):
    history += USER
    sent = history
    turns.append(
        {
            "turn": t,
            "sent": sent,
            "system": SYSTEM,
            "chatBefore": sent - SYSTEM - USER,  # earlier messages and replies
            "message": USER,
            "resent": prev,  # what the turn before sent, all of it sent again
            "newSlice": sent - prev,  # the last reply and this message (turn 1: everything)
            "inputCost": r(sent / 1e6 * P["in"], 8),
            "inputCostCached": r(prev / 1e6 * P["cached"] + (sent - prev) / 1e6 * P["in"], 8),
        }
    )
    prev = sent
    history += REPLY
assert turns[0]["sent"] == SYSTEM + USER and turns[0]["newSlice"] == SYSTEM + USER
assert all(row["newSlice"] == USER + REPLY for row in turns[1:])

# ── 2. The bill, and the area it is ─────────────────────────────────────────


def bill(n: int) -> dict:
    plain = conversation_cost(MODEL, n)
    cached = conversation_cost(MODEL, n, cached=True)
    # Turn by turn: what grows in a straight line, and the chat resent.
    system_part = sum(SYSTEM / 1e6 * P["in"] for _ in range(n))
    replies = sum(REPLY / 1e6 * P["out"] for _ in range(n))
    h, chat = SYSTEM, 0.0
    for _ in range(n):
        h += USER
        chat += (h - SYSTEM) / 1e6 * P["in"]
        h += REPLY
    assert abs(system_part + replies + chat - plain) < 1e-12, n
    return {
        "turns": n,
        "plain": r(plain),
        "cached": r(cached),
        "saved": r(1 - cached / plain, 4),
        "line": r(system_part + replies),  # the system prompt every turn, and the replies
        "systemPart": r(system_part),
        "replies": r(replies),
        "triangle": r(chat),  # the chat, resent: earlier turns and each new message
        "triangleShare": r(chat / plain, 4),
        "sentTokens": sum(row["sent"] for row in turns[:n]) if n <= TURNS else None,
    }


BILL_TURNS = [5, 10, 20, 40, 80]
bills = {n: bill(n) for n in BILL_TURNS}
doublings = [
    {"from": a, "to": b, "times": r(bills[b]["plain"] / bills[a]["plain"], 4),
     "line": r(bills[b]["line"] / bills[a]["line"], 4), "triangle": r(bills[b]["triangle"] / bills[a]["triangle"], 4)}
    for a, b in [(10, 20), (20, 40), (40, 80)]
]
# The two pieces' growth: a straight line doubles, the triangle heads to 4.
assert all(close(d["line"], 2) for d in doublings)
assert all(4 < d["triangle"] < 4.2 for d in doublings)
assert [round(d["times"], 1) for d in doublings] == sorted(round(d["times"], 1) for d in doublings)

# The page's own table, as printed: 10, 20 and 40 turns, plain and cached.
printed = {10: ("0.1325", "0.0581"), 20: ("0.3750", "0.1187"), 40: ("1.1900", "0.2563")}
for n, (plain, cached) in printed.items():
    assert f"{bills[n]['plain']:.4f}" == plain and f"{bills[n]['cached']:.4f}" == cached, n

# ── 3. The cache ────────────────────────────────────────────────────────────

forty = bills[40]
cache = {
    "fraction": r(cache_fraction, 6),
    "turns": 40,
    "plain": forty["plain"],
    "cached": forty["cached"],
    "saved": forty["saved"],
    "inputPlain": r(sum(row["inputCost"] for row in turns), 8),
    "inputCached": r(sum(row["inputCostCached"] for row in turns), 8),
    "replies": forty["replies"],
}
assert abs(cache["inputCached"] + cache["replies"] - cache["cached"]) < 1e-9
assert abs(cache["inputPlain"] + cache["replies"] - cache["plain"]) < 1e-9

# ── 4. Starting fresh ───────────────────────────────────────────────────────

fresh = {
    "chats": 8,
    "turnsEach": 5,
    "each": r(conversation_cost(MODEL, 5)),
    "eight": r(8 * conversation_cost(MODEL, 5)),
    "one": forty["plain"],
    "times": r(forty["plain"] / (8 * conversation_cost(MODEL, 5)), 4),
    # The same pair with the cache the scene before turns on: eight short
    # chats against one long one, both `cached=True`. The gap nearly closes.
    "eachCached": r(conversation_cost(MODEL, 5, cached=True)),
    "eightCached": r(8 * conversation_cost(MODEL, 5, cached=True)),
    "oneCached": forty["cached"],
    "savedCached": r(1 - 8 * conversation_cost(MODEL, 5, cached=True) / conversation_cost(MODEL, 40, cached=True), 4),
}
assert bills[5]["plain"] == fresh["each"]
assert bills[5]["cached"] == fresh["eachCached"]
# Still cheaper in eight pieces, but by a few cents rather than two thirds.
assert fresh["eightCached"] < fresh["oneCached"] and fresh["savedCached"] < 0.1

out = {
    "model": MODEL,
    "name": name,
    "price": P,
    "system": SYSTEM,
    "user": USER,
    "reply": REPLY,
    "turns": turns,
    "bills": [bills[n] for n in BILL_TURNS],
    "doublings": doublings,
    "cache": cache,
    "fresh": fresh,
}
json.dump(out, sys.stdout, indent=1)
sys.stdout.write("\n")
