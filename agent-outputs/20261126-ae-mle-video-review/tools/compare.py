"""Before/after comparisons for the review's fixes.

Reads <dir>/compare.json and writes one PNG per item into <dir>/, named
NN-<slug>.png: a header naming the video, the finding and its severity; the
"before" frame on the left and the "after" frame on the right, each with
numbered boxes (red on before, green on after) around what changed; and a
footer listing what changed, numbered to match the boxes, plus the narration
before and after when the words changed.

    python3 -I compare.py <dir> [<dir> ...]

compare.json:
{
  "id": "MachineLearningEngineer-3-Coding",
  "items": [
    {
      "n": 4, "severity": "P1", "title": "Top-k sorts the whole array",
      "before": {"image": "/abs/before.jpeg", "t": 123.4, "beat": "topk",
                 "boxes": [{"x": 100, "y": 200, "w": 300, "h": 80, "label": "1"}]},
      "after":  {"image": "/abs/after.jpeg", "t": 130.0, "beat": "topk",
                 "boxes": [{"x": 100, "y": 200, "w": 300, "h": 80, "label": "1"}]},
      "changed": ["1. The label now says ...", "2. ..."],
      "narration": {"before": "old words", "after": "new words"}
    }
  ]
}

Box coordinates are in the frame's own 1920x1080 pixels. A box may set "tag": "above"
(default), "below", "left" or "right" to move its number off nearby text. "after" may be
omitted for a change heard rather than seen; the before frame is then shown
alone with the narration diff. "image" may be a 1080p JPEG or PNG.
"""
import json
import os
import re
import sys
import textwrap

from PIL import Image, ImageDraw, ImageFont

PANEL_W = 1200
PANEL_H = PANEL_W * 9 // 16
GAP = 28
PAD = 32
HEAD = 92
SUB = 50
RED = (255, 79, 89)  # brand red 500
GREEN = (10, 168, 15)  # brand green 600: reads on white
INK = (24, 24, 27)
SOFT = (90, 90, 98)
LINE = (220, 220, 226)


def font(size, bold=False):
    names = (
        ["DejaVuSans-Bold.ttf"] if bold else ["DejaVuSans.ttf"]
    )
    for d in ["/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/dejavu"]:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F_HEAD = font(34, True)
F_SUB = font(25, True)
F_SUBT = font(24)
F_BODY = font(25)
F_BODY_B = font(25, True)
F_TAG = font(26, True)


def mmss(t):
    t = max(0.0, float(t))
    return f"{int(t // 60)}:{t % 60:04.1f}"


def panel(spec, color):
    im = Image.open(spec["image"]).convert("RGB")
    sx = PANEL_W / im.width
    sy = PANEL_H / im.height
    im = im.resize((PANEL_W, PANEL_H), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    for b in spec.get("boxes", []):
        x0, y0 = b["x"] * sx, b["y"] * sy
        x1, y1 = (b["x"] + b["w"]) * sx, (b["y"] + b["h"]) * sy
        d.rounded_rectangle([x0, y0, x1, y1], radius=8, outline=color, width=5)
        lab = str(b.get("label", ""))
        if lab:
            r = 19
            where = b.get("tag", "above")  # above | below | left | right
            if where == "left":
                cx, cy = x0 - r - 6, (y0 + y1) / 2
            elif where == "right":
                cx, cy = x1 + r + 6, (y0 + y1) / 2
            elif where == "below":
                cx, cy = x0, y1 + r + 4
            else:
                cx = x0
                cy = y0 - r - 4 if y0 - 2 * r - 6 > 0 else y1 + r + 4
            cx = min(max(cx, r + 2), PANEL_W - r - 2)
            cy = min(max(cy, r + 2), PANEL_H - r - 2)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
            d.text((cx, cy), lab, fill="white", font=F_TAG, anchor="mm")
    return im


def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if d.textlength(trial, font=f) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def render(item, vid, out):
    have_after = bool(item.get("after"))
    W = PAD * 2 + PANEL_W * (2 if have_after else 1) + (GAP if have_after else 0)
    W = max(W, 1400)
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    text_w = W - 2 * PAD
    foot = []  # (font, color, text, indent)
    for c in item.get("changed", []):
        for k, ln in enumerate(wrap(probe, c, F_BODY, text_w - 30)):
            foot.append((F_BODY, INK, ln, 0 if k == 0 else 30))
    nar = item.get("narration")
    if nar:
        foot.append((F_BODY_B, INK, "Narration", 0))
        for tag, key, col in (("Before:", "before", RED), ("After:", "after", GREEN)):
            body = nar.get(key) or "(not said)"
            for k, ln in enumerate(wrap(probe, f"{tag} “{body}”", F_BODY, text_w - 30)):
                foot.append((F_BODY, col, ln, 0 if k == 0 else 30))
    foot_h = (len(foot) * 36 + 28) if foot else 0
    H = HEAD + SUB + PANEL_H + foot_h + PAD
    page = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(page)
    sev = item.get("severity", "")
    head = f"{vid}  ·  finding {item.get('n', '?')}" + (f"  [{sev}]" if sev else "")
    d.text((PAD, 22), head, fill=SOFT, font=F_SUBT)
    d.text((PAD, 52), item.get("title", ""), fill=INK, font=F_HEAD)
    y = HEAD + 8

    def label(x, spec, word, color):
        t = spec.get("t")
        beat = spec.get("beat")
        d.text((x, y), word, fill=color, font=F_SUB)
        wx = d.textlength(word, font=F_SUB)
        extra = "  ·  ".join(s for s in [mmss(t) if t is not None else "", f"beat {beat}" if beat else ""] if s)
        if extra:
            d.text((x + wx + 16, y + 1), extra, fill=SOFT, font=F_SUBT)

    label(PAD, item["before"], "Before", RED)
    page.paste(panel(item["before"], RED), (PAD, HEAD + SUB))
    d.rectangle([PAD - 1, HEAD + SUB - 1, PAD + PANEL_W, HEAD + SUB + PANEL_H], outline=LINE, width=1)
    if have_after:
        x2 = PAD + PANEL_W + GAP
        label(x2, item["after"], "After", GREEN)
        page.paste(panel(item["after"], GREEN), (x2, HEAD + SUB))
        d.rectangle([x2 - 1, HEAD + SUB - 1, x2 + PANEL_W, HEAD + SUB + PANEL_H], outline=LINE, width=1)
    fy = HEAD + SUB + PANEL_H + 24
    for f, col, ln, ind in foot:
        d.text((PAD + ind, fy), ln, fill=col, font=f)
        fy += 36
    page.save(out, optimize=True)


for dir_ in sys.argv[1:]:
    spec = json.load(open(os.path.join(dir_, "compare.json")))
    vid = spec["id"]
    for old in os.listdir(dir_):
        if re.match(r"^\d\d-.*\.png$", old):
            os.remove(os.path.join(dir_, old))
    for k, item in enumerate(spec["items"]):
        slug = re.sub(r"[^a-z0-9]+", "-", item.get("title", "item").lower()).strip("-")[:48]
        out = os.path.join(dir_, f"{int(item.get('n', k + 1)):02d}-{slug}.png")
        render(item, vid, out)
        print(out)
