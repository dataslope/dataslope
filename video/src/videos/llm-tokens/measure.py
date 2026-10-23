"""Every token, id, count and ratio on screen in Llm-1-Tokens ("What the
model reads"), computed rather than typed.

Run from the repo root, in the environment pinned to the site's Pyodide
(Python 3.13, tiktoken 0.12.0, regex 2026.3.32):

    TIKTOKEN_CACHE_DIR=<cache> python video/src/videos/llm-tokens/measure.py

It writes measurements.json beside itself, which data.ts reads.

Two kinds of fact:

1. The lessons' own code blocks, run verbatim. Each block's starterCode is
   read straight out of its .mdx file, executed, and its printed output
   compared with the output the site's Pyodide recorded for it in
   lib/generated/block-outputs.json (looked up by lib/blockOutputKey.ts's
   key). A mismatch stops the script, so the video can only show what the
   page shows. From these: the generation loop and next-token table
   (what-a-language-model-is), the byte-pair encoding walk-through
   (building-a-tokenizer, re-run step by step below with the lesson's own
   functions), and the conversation resend and the two-model price check
   (token-counts-in-practice).

2. The lessons' tokenizer, tiktoken's o200k_base (tokens.mdx: "OpenAI's
   o200k_base tokenizer (GPT-4o's)"), run on the lessons' own text: the
   strawberry pieces and ids, the opening paragraph of tokens.mdx, the
   prose and code samples of tokens.mdx's estimate block, and the three
   records of token-counts-in-practice's JSON-against-CSV block, which the
   lesson only estimates by dividing characters by a ratio. The same JSON
   is also counted by the three older encodings tiktoken ships. The four
   greetings are the video's own example, one common word in four scripts,
   to show bytes becoming tokens; UTF-8 byte counts are the encoding's.
"""

from __future__ import annotations

import contextlib
import io
import json
import re
import sys
from collections import Counter
from pathlib import Path

import tiktoken
import tiktoken.model

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
LESSONS = REPO / "content" / "courses" / "how-llms-work"
BLOCK_OUTPUTS = json.loads((REPO / "lib" / "generated" / "block-outputs.json").read_text())

ENC = "o200k_base"
enc = tiktoken.get_encoding(ENC)
OLDER = ["cl100k_base", "p50k_base", "r50k_base"]


# ── The lessons' code blocks ─────────────────────────────────────────────────


def fnv1a(s: str) -> str:
    """lib/blockOutputKey.ts's FNV-1a, over UTF-16 code units like JS."""
    h = 0x811C9DC5
    units = s.encode("utf-16-le")
    for i in range(0, len(units), 2):
        h ^= units[i] | (units[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def untemplate(s: str) -> str:
    """A JS template literal's body as the string it evaluates to (these
    blocks only escape backslashes, backticks and dollar signs)."""
    return re.sub(r"\\([\\`$])", r"\1", s)


def blocks(lesson: str) -> list[dict]:
    """Every python CodeBlock in a lesson, in page order."""
    src = (LESSONS / f"{lesson}.mdx").read_text()
    found = []
    for m in re.finditer(r"<CodeBlock\s+adapter=\"python\"(.*?)\n/>", src, re.S):
        body = m.group(1)
        init = re.search(r"initCode: `((?:\\.|[^`\\])*)`", body, re.S)
        starter = re.search(r"starterCode: `((?:\\.|[^`\\])*)`", body, re.S)
        found.append(
            {
                "init": untemplate(init.group(1)) if init else None,
                "starter": untemplate(starter.group(1)),
            }
        )
    return found


def run_block(lesson: str, index: int) -> str:
    """Run one block as the page does (initCode, then starterCode, one
    namespace) and check its output against the site's recorded one."""
    b = blocks(lesson)[index]
    out = io.StringIO()
    ns: dict = {"__name__": "__main__"}
    with contextlib.redirect_stdout(out):
        if b["init"]:
            exec(b["init"], ns)
        exec(b["starter"], ns)
    printed = out.getvalue()
    key = fnv1a(f"python\0{b['init'] or ''}\0{b['starter']}")
    entry = BLOCK_OUTPUTS[f"content/courses/how-llms-work/{lesson}.mdx"][key]
    recorded = "\n".join(c["content"] for c in entry["cells"] if c["type"] == "stdout")
    # The site's cells come back with their outer whitespace trimmed.
    if printed.strip() != recorded.strip():
        sys.exit(f"{lesson} block {index} prints something other than the page:\n{printed}\n---\n{recorded}")
    return printed


def pieces(text: str, e=enc) -> list[dict]:
    return [{"text": e.decode([i]), "id": i} for i in e.encode(text)]


# ── Part 1. A next-token machine (what-a-language-model-is) ──────────────────

loop_out = run_block("what-a-language-model-is", 0)
steps = re.findall(r"step (\d+): context=\[(.*?)\] -> '(.*?)'", loop_out)
loop = [{"context": re.findall(r"'(.*?)'", ctx), "next": nxt} for _, ctx, nxt in steps]
final = re.search(r"Final: (.*)", loop_out).group(1)

dist_out = run_block("what-a-language-model-is", 1)
dist = [{"token": t, "p": float(p)} for t, p in re.findall(r"^\s+(\S+)\s+([0-9.]+)\s+#+$", dist_out, re.M)]
shown_sum = float(re.search(r"Sum of the four shown: ([0-9.]+)", dist_out).group(1))
# The block's tokens carry a leading space (" cat"); the page prints them
# right-aligned, so the space is restored here and each gets its o200k id.
for d in dist:
    ids = enc.encode(" " + d["token"])
    assert len(ids) == 1, d
    d["id"] = ids[0]

vocab = len(enc._mergeable_ranks) + len(enc._special_tokens)

# ── Part 2. Tokens (tokens.mdx) ──────────────────────────────────────────────

bare = pieces("strawberry")
spaced = pieces(" strawberry")
assert [p["text"] for p in bare] == ["st", "raw", "berry"], bare  # the lesson's own claim
assert len(spaced) == 1
for name in OLDER:  # "The older cl100k_base, p50k_base and r50k_base give the same counts."
    e = tiktoken.get_encoding(name)
    assert (len(e.encode("strawberry")), len(e.encode(" strawberry"))) == (3, 1), name

opening = (
    "A model cannot process text. It processes numbers. Tokenization is "
    "the step that turns one into the other, and it is responsible for more "
    "surprising behavior than any other single component."
)
# The lesson's first paragraph, with its line breaks and markdown bold taken off.
assert opening in re.sub(r"\s+", " ", (LESSONS / "tokens.mdx").read_text()).replace("**", "")
opening_tokens = pieces(opening)

# ── Part 3. Byte-pair encoding (building-a-tokenizer) ────────────────────────

pairs_out = run_block("building-a-tokenizer", 0)
merges_out = run_block("building-a-tokenizer", 1)

# The lesson's own training loop, re-run a step at a time with its own
# pair_counts and merge_pair, so every intermediate split can be drawn.
ns: dict = {}
exec(blocks("building-a-tokenizer")[1]["starter"].split("freqs = Counter")[0], ns)
corpus = ns["corpus"]
pair_counts, merge_pair = ns["pair_counts"], ns["merge_pair"]
freqs = Counter(corpus.split())
splits = {w: list(w) + ["</w>"] for w in freqs}
first_pairs = [{"pair": list(p), "count": n} for p, n in pair_counts(splits, freqs).most_common(5)]
# How many distinct neighbouring pairs the first count finds (the page prints
# its top five), and the tie at the top that Python's Counter breaks in the
# order the pairs were first counted.
pair_total = len(pair_counts(splits, freqs))
top_two = pair_counts(splits, freqs).most_common(2)
assert top_two[0][1] == top_two[1][1], top_two
bpe_steps = [{"merge": None, "count": None, "splits": {w: list(s) for w, s in splits.items()}}]
for step in range(10):
    pairs = pair_counts(splits, freqs)
    if not pairs:
        break
    best, count = pairs.most_common(1)[0]
    if count < 2:
        break
    splits = merge_pair(best, splits)
    bpe_steps.append({"merge": list(best), "count": count, "splits": {w: list(s) for w, s in splits.items()}})

# Agree with what the page printed, merge by merge and word by word.
printed = re.findall(r"merge (\d+): \('(.*?)', '(.*?)'\) seen (\d+)x", merges_out)
assert [(s["merge"][0], s["merge"][1], s["count"]) for s in bpe_steps[1:]] == [(a, b, int(n)) for _, a, b, n in printed]
for word, syms in bpe_steps[-1]["splits"].items():
    assert f"{word:>8} -> {syms}" in merges_out, word
for p in first_pairs:
    assert f"  {tuple(p['pair'])} seen {p['count']}x" in pairs_out, p

# ── Part 4. Counts in practice ───────────────────────────────────────────────

# tokens.mdx's estimate block: its two samples, estimated by the page at 4
# and 3 characters a token, and counted here.
est = blocks("tokens")[1]["starter"]
est_out = run_block("tokens", 1)
sns: dict = {}
exec(est.split("print(")[0], sns)
def first_unit(text: str, times: int = 20) -> list[dict]:
    """The tokens of a sample's first repeat, as the whole sample is cut
    (a repeat's trailing space joins the next one's first word)."""
    unit = text[: len(text) // times]
    out, joined = [], ""
    for p in pieces(text):
        out.append(p)
        joined += p["text"]
        if joined in (unit, unit.rstrip(" ")):
            return out
    raise AssertionError(unit)


samples = []
for kind, text, ratio in [("prose", sns["prose"], 4.0), ("code", sns["code"], 3.0)]:
    n = len(enc.encode(text))
    samples.append(
        {
            "kind": kind,
            "chars": len(text),
            "estimate": round(len(text) / ratio),
            "tokens": n,
            "charsPerToken": round(len(text) / n, 2),
            "unit": first_unit(text),
        }
    )
for s in samples:
    assert f"{s['chars']:5d} chars -> ~{s['estimate']:4d} tokens" in est_out, s

# token-counts-in-practice's three records, as the block builds them.
fmt_src = blocks("token-counts-in-practice")[1]["starter"]
fmt_out = run_block("token-counts-in-practice", 1)
fns: dict = {}
exec(fmt_src.split('print("JSON:"')[0], fns)
as_json, as_csv = fns["as_json"], fns["as_csv"]
formats = {
    "json": {"chars": len(as_json), "text": as_json},
    "csv": {"chars": len(as_csv), "text": as_csv},
    "pageEstimate": {
        "json": int(re.search(r"JSON: \d+ chars ~ (\d+) tokens", fmt_out).group(1)),
        "csv": int(re.search(r"CSV:  \d+ chars ~ (\d+) tokens", fmt_out).group(1)),
        "ratio": float(re.search(r"Ratio: ([0-9.]+) x", fmt_out).group(1)),
    },
}
for name in [ENC, *OLDER]:
    e = tiktoken.get_encoding(name)
    formats["json"][name] = len(e.encode(as_json))
    formats["csv"][name] = len(e.encode(as_csv))
formats["ratio"] = round(formats["json"][ENC] / formats["csv"][ENC], 2)


def keyed_pieces(text: str, keys: list[str], header_only: bool) -> list[dict]:
    """The text's o200k pieces, each marked if it falls inside a key name
    (in JSON every occurrence, in CSV the header line only)."""
    limit = text.index("\n") if header_only else len(text)
    spans = [(m.start(), m.end()) for k in keys for m in re.finditer(re.escape(k), text[:limit])]
    out, at = [], 0
    for p in pieces(text):
        a, b = at, at + len(p["text"])
        at = b
        out.append({**p, "key": any(a < e and b > s for s, e in spans)})
    assert "".join(p["text"] for p in out) == text
    return out


KEYS = list(fns["records"][0].keys())
formats["json"]["pieces"] = keyed_pieces(as_json, KEYS, header_only=False)
formats["csv"]["pieces"] = keyed_pieces(as_csv, KEYS, header_only=True)
formats["keys"] = KEYS
formats["jsonKeyNames"] = sum(as_json.count(f'"{k}"') for k in KEYS)
assert len(formats["json"]["pieces"]) == formats["json"][ENC] and len(formats["csv"]["pieces"]) == formats["csv"][ENC]

# Which model each encoding belongs to, from tiktoken's own table.
families = [
    {"encoding": tiktoken.model.encoding_name_for_model(m), "model": m}
    for m in ["gpt-4o", "gpt-4", "text-davinci-003", "davinci"]
]
assert [f["encoding"] for f in families] == [ENC, *OLDER]

# One word, five scripts: characters, UTF-8 bytes, and the bytes each
# o200k token covers.
GREETINGS = [
    ("English", "hello", "hello"),
    ("Japanese", "こんにちは", "konnichiwa"),
    ("Hindi", "नमस्ते", "namaste"),
    ("Tifinagh", "ⴰⵣⵓⵍ", "azul"),
]
greetings = []
for lang, word, roman in GREETINGS:
    ids = enc.encode(word)
    sizes = [len(enc.decode_single_token_bytes(i)) for i in ids]
    assert sum(sizes) == len(word.encode("utf-8"))
    greetings.append(
        {
            "language": lang,
            "romanized": roman,
            "chars": len(word),
            "bytes": len(word.encode("utf-8")),
            "tokens": len(ids),
            "tokenBytes": sizes,
            "bytesPerChar": sorted({len(c.encode("utf-8")) for c in word}),
        }
    )

# token-counts-in-practice's conversation, run turn by turn as it is written.
conv_out = run_block("token-counts-in-practice", 3)
cns: dict = {}
conv_src = blocks("token-counts-in-practice")[3]["starter"]
exec(conv_src.split("total_input = 0")[0], cns)
system, per_user, per_reply = cns["system_prompt"], cns["per_user_turn"], cns["per_reply"]
history, total, turns = system, 0, []
for turn in range(1, 11):
    history += per_user
    total += history
    sent = history
    history += per_reply
    turns.append({"turn": turn, "sent": sent, "cumulative": total, "context": history})
assert f"Conversation is {history} tokens long." in conv_out
assert f"You were billed for {total} input tokens" in conv_out
conversation = {
    "system": system,
    "perUser": per_user,
    "perReply": per_reply,
    "turns": turns,
    "length": history,
    "billed": total,
    "ratio": round(total / history, 1),
}
assert f"{conversation['ratio']}x that." in conv_out

# The two-model check (the lesson's concept check: 20% cheaper per token,
# 30% more tokens).
cheaper, more = 0.8, 1.3
price_check = {"cheaper": cheaper, "more": more, "product": round(cheaper * more, 2)}

# ── The bridge ───────────────────────────────────────────────────────────────

bridge = {"berry": bare[2], "cherry": pieces(" cherry")[0], "cherryBare": pieces("cherry")}
assert len(pieces(" cherry")) == 1

out = {
    "meta": {
        "python": sys.version.split()[0],
        "tiktoken": tiktoken.__version__,
        "encoding": ENC,
    },
    "model": {"vocab": vocab, "loop": loop, "final": final, "dist": dist, "shownSum": shown_sum},
    "tokens": {
        "strawberry": bare,
        "spaced": spaced[0],
        "rs": "strawberry".count("r"),
        "opening": {
            "text": opening,
            "pieces": opening_tokens,
            "chars": len(opening),
            "words": len(opening.split()),
            "tokens": len(opening_tokens),
            "charsPerToken": round(len(opening) / len(opening_tokens), 1),
            "wordsPerToken": round(len(opening.split()) / len(opening_tokens), 2),
        },
    },
    "bpe": {
        "corpus": corpus,
        "freqs": dict(freqs),
        "firstPairs": first_pairs,
        "pairTotal": pair_total,
        "steps": bpe_steps,
    },
    "counts": {
        "samples": samples,
        "formats": formats,
        "families": families,
        "greetings": greetings,
        "conversation": conversation,
        "priceCheck": price_check,
    },
    "bridge": bridge,
}
(HERE / "measurements.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(json.dumps({k: v for k, v in out.items() if k != "bpe"}, ensure_ascii=False)[:3000])
