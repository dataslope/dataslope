"""Contact sheets: for each video, 4x3 grids of frames one second apart
(every second sampled frame), each tile labelled with its time and the beat
being spoken. Writes <root>/<id>/sheets/sheet-NN.jpg (12 s per sheet).
  python3 -I sheets.py <root> [id ...]
"""
import os
import re
import sys
from PIL import Image, ImageDraw, ImageFont

root = sys.argv[1]
only = sys.argv[2:]
TW, TH, LAB = 480, 270, 22
COLS, ROWS = 4, 3
font = None
for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans.ttf"]:
    if os.path.exists(f):
        font = ImageFont.truetype(f, 15)
if font is None:
    font = ImageFont.load_default()

for vid in sorted(os.listdir(os.path.join(root, "frames"))):
    if only and vid not in only:
        continue
    fdir = os.path.join(root, "frames", vid)
    tl = os.path.join(root, "frames", vid, "timeline.txt")
    beats = []
    if os.path.exists(tl):
        for line in open(tl):
            m = re.match(r"^(\S+)\s+([0-9.]+)-([0-9.]+)\s", line)
            if m and not line.startswith("=="):
                beats.append((float(m.group(2)), m.group(1)))
    def beat_at(t):
        cur = ""
        for s, b in beats:
            if s <= t + 0.25:
                cur = b
        return cur
    files = sorted(f for f in os.listdir(fdir) if f.startswith("element-"))
    picks = files[::2]
    sdir = os.path.join(fdir, "sheets")
    os.makedirs(sdir, exist_ok=True)
    per = COLS * ROWS
    for s in range(0, len(picks), per):
        sheet = Image.new("RGB", (COLS * TW, ROWS * (TH + LAB)), "white")
        d = ImageDraw.Draw(sheet)
        for k, f in enumerate(picks[s : s + per]):
            n = int(re.search(r"(\d+)", f).group(1))
            t = n / 2
            im = Image.open(os.path.join(fdir, f)).resize((TW, TH), Image.LANCZOS)
            x, y = (k % COLS) * TW, (k // COLS) * (TH + LAB)
            sheet.paste(im, (x, y + LAB))
            d.rectangle([x, y, x + TW - 1, y + LAB - 1], fill=(30, 30, 30))
            d.text((x + 4, y + 2), f"{t:6.1f}s  #{n:03d}  {beat_at(t)}", fill="white", font=font)
            d.line([x + TW - 1, y, x + TW - 1, y + TH + LAB], fill="white", width=2)
        sheet.save(os.path.join(sdir, f"sheet-{s // per:02d}.jpg"), quality=85)
    print(vid, len(picks), "tiles")
