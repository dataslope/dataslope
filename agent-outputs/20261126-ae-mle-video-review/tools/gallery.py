"""Collects every before/after comparison into one browsable page.

Reads <compare>/<Id>/compare.json and the PNGs compare.py wrote beside it,
converts each PNG to a JPEG under <out>/img/ (the PNGs run to ~1 MB each; a
q85 JPEG of the same picture is a quarter of that and reads the same), and
writes <out>/index.html: one section per video in series order, each
comparison with its finding number, severity, title, what changed and the
narration diff, and a summary table at the top.

    python3 -I gallery.py <compare-dir> <out-dir> <videos.mjs> [--title T]
"""
import html
import json
import os
import re
import sys

from PIL import Image

args = sys.argv[1:]
title = "Before and after"
if "--title" in args:
    k = args.index("--title")
    title = args[k + 1]
    del args[k : k + 2]
src, out, videos_mjs = args
order = re.findall(r'\["([A-Za-z0-9-]+)", "([a-z0-9-]+)", "[A-Za-z]+"\]', open(videos_mjs).read())
os.makedirs(os.path.join(out, "img"), exist_ok=True)

SEV = {"P1": "#BA303A", "P2": "#A35200", "P3": "#5b5b66"}
sections, rows, total = [], [], 0
for vid, folder in order:
    d = os.path.join(src, vid)
    cj = os.path.join(d, "compare.json")
    if not os.path.exists(cj):
        rows.append((vid, 0, {}))
        continue
    spec = json.load(open(cj))
    items, counts = [], {}
    for k, item in enumerate(spec["items"]):
        n = int(item.get("n", k + 1))
        # The name compare.py gives it: two comparisons may share a finding number.
        slug = re.sub(r"[^a-z0-9]+", "-", item.get("title", "item").lower()).strip("-")[:48]
        f = f"{n:02d}-{slug}.png"
        if not os.path.exists(os.path.join(d, f)):
            print(f"missing {vid}/{f}", file=sys.stderr)
            continue
        jpg = f"{vid}-{f[:-4]}.jpg"
        im = Image.open(os.path.join(d, f)).convert("RGB")
        im.save(os.path.join(out, "img", jpg), quality=85, optimize=True)
        sev = item.get("severity", "")
        counts[sev] = counts.get(sev, 0) + 1
        changed = "".join(f"<li>{html.escape(c)}</li>" for c in item.get("changed", []))
        nar = item.get("narration")
        nar_html = ""
        if nar:
            nar_html = (
                f'<p class="nar"><span class="old">Before: “{html.escape(nar.get("before") or "")}”</span><br>'
                f'<span class="new">After: “{html.escape(nar.get("after") or "")}”</span></p>'
            )
        items.append(
            f'<figure id="{vid}-{f[:-4]}"><figcaption><span class="sev" style="color:{SEV.get(sev, "#333")}">{html.escape(sev)}</span> '
            f'<b>Finding {n}.</b> {html.escape(item.get("title", ""))}</figcaption>'
            f'<a href="img/{jpg}"><img loading="lazy" src="img/{jpg}" alt="Before and after: {html.escape(item.get("title", ""))}"></a>'
            f'<ul>{changed}</ul>{nar_html}</figure>'
        )
        total += 1
    rows.append((vid, len(items), counts))
    sections.append(f'<section id="{vid}"><h2>{html.escape(vid)}</h2>{"".join(items) or "<p>No visible changes.</p>"}</section>')

table = "".join(
    f'<tr><td><a href="#{v}">{html.escape(v)}</a></td><td>{n}</td><td>{c.get("P1", 0)}</td><td>{c.get("P2", 0)}</td><td>{c.get("P3", 0)}</td></tr>'
    for v, n, c in rows
)
page = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<style>
body{{font:16px/1.5 Inter,system-ui,sans-serif;color:#18181b;background:#fff;max-width:1500px;margin:0 auto;padding:24px}}
h1{{font-size:28px;margin:0 0 4px}} h2{{font-size:22px;margin:48px 0 12px;padding-top:12px;border-top:1px solid #e4e4e7}}
table{{border-collapse:collapse;margin:16px 0 8px}} td,th{{padding:4px 14px 4px 0;text-align:left;font-variant-numeric:tabular-nums}}
th{{font-weight:600;border-bottom:1px solid #e4e4e7}}
figure{{margin:0 0 40px}} figcaption{{font-size:18px;margin-bottom:8px}} .sev{{font-weight:700;margin-right:6px}}
img{{width:100%;height:auto;border:1px solid #e4e4e7;border-radius:6px}}
ul{{margin:8px 0}} .nar{{margin:6px 0}} .old{{color:#BA303A}} .new{{color:#006F01}}
</style></head><body>
<h1>{html.escape(title)}</h1>
<p>{total} comparisons. Red boxes mark what changed on the left (before), green boxes the same places on the right (after), numbered to match the notes under each picture. Click a picture for full size.</p>
<table><tr><th>Video</th><th>Comparisons</th><th>P1</th><th>P2</th><th>P3</th></tr>{table}</table>
{"".join(sections)}
</body></html>
"""
open(os.path.join(out, "index.html"), "w").write(page)
print(f"{total} comparisons -> {os.path.join(out, 'index.html')}")
