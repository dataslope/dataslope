"""Contact sheets with repeats dropped: for each video, 4x3 grids of the
one-a-second frames, keeping a frame only when it differs from the last kept
one. The October sheets showed every second; most of those tiles repeated the
one before, because the picture holds while the narration carries on.

Frames are compared small and blurred, with a pixel counting as changed only
past 32 grey levels: two renders of the same picture differ along every glyph
edge (text is anti-aliased slightly differently frame to frame), which at
full size made every frame look new. A line of new 19px text still counts.

A tile's label gives its time, frame and the beat being spoken, then how long
the picture holds from there and which beats start while it does. The
frame before each scene cut is always kept (a scene's finished state).
Writes <root>/frames/<id>/sheets/sheet-NN.jpg and <root>/frames/<id>/tiles.txt.
  python3 -I sheets.py <root> [--threshold 0.002] [id ...]
"""
import os
import re
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

args = sys.argv[1:]
root = args.pop(0)
threshold = 0.0005  # share of the frame's pixels that must change
if "--threshold" in args:
    k = args.index("--threshold")
    threshold = float(args[k + 1])
    del args[k : k + 2]
only = args
TW, TH, LAB = 480, 270, 40
COLS, ROWS = 4, 3
LEVEL = 32  # a pixel counts as changed past this many grey levels
CW, CH = 240, 135  # size frames are compared at
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
    beats, scenes = [], set()
    tl = os.path.join(fdir, "timeline.txt")
    if os.path.exists(tl):
        for line in open(tl):
            s = re.match(r"^== SCENE \S+ at ([0-9.]+) s", line)
            if s:
                scenes.add(float(s.group(1)))
            m = re.match(r"^(\S+)\s+([0-9.]+)-([0-9.]+)\s", line)
            if m and not line.startswith("=="):
                beats.append((float(m.group(2)), m.group(1)))

    def beat_at(t):
        cur = ""
        for s, b in beats:
            if s <= t + 0.5:
                cur = b
        return cur

    files = sorted(
        (f for f in os.listdir(fdir) if f.startswith("element-")),
        key=lambda f: int(re.search(r"(\d+)", f).group(1)),
    )
    if not files:
        continue
    nums = [int(re.search(r"(\d+)", f).group(1)) for f in files]
    # The last frame before a scene opens is that scene's predecessor finished.
    finals = {int(s) - 1 for s in scenes if int(s) - 1 >= 0}
    kept, last, small = [], None, {}
    for f, n in zip(files, nums):
        im = Image.open(os.path.join(fdir, f)).convert("RGB").resize((TW, TH), Image.LANCZOS)
        grey = im.convert("L").resize((CW, CH), Image.BOX).filter(ImageFilter.GaussianBlur(1.2))
        if last is None:
            changed = 1.0
        else:
            diff = ImageChops.difference(grey, last).point(lambda v: 255 if v > LEVEL else 0)
            changed = diff.histogram()[255] / (CW * CH)
        if changed >= threshold or n in finals:
            kept.append(n)
            small[n] = im
            last = grey
    end = nums[-1] + 1
    sdir = os.path.join(fdir, "sheets")
    os.makedirs(sdir, exist_ok=True)
    for old in os.listdir(sdir):
        os.remove(os.path.join(sdir, old))
    rows = []
    per = COLS * ROWS
    for s in range(0, len(kept), per):
        sheet = Image.new("RGB", (COLS * TW, ROWS * (TH + LAB)), "white")
        d = ImageDraw.Draw(sheet)
        for k, n in enumerate(kept[s : s + per]):
            i = s + k
            until = kept[i + 1] if i + 1 < len(kept) else end
            held = until - n
            during = [b for (t, b) in beats if n + 0.5 < t < until]
            x, y = (k % COLS) * TW, (k // COLS) * (TH + LAB)
            sheet.paste(small[n], (x, y + LAB))
            d.rectangle([x, y, x + TW - 1, y + LAB - 1], fill=(30, 30, 30))
            d.text((x + 4, y + 1), f"{n:4d}s  #{n:03d}  {beat_at(n)}", fill="white", font=font)
            hold = f"holds {held}s" + (f" > {', '.join(during)}" if during else "")
            d.text((x + 4, y + 20), hold[:62], fill=(255, 221, 108) if held >= 3 else "white", font=font)
            d.line([x + TW - 1, y, x + TW - 1, y + TH + LAB], fill="white", width=2)
            rows.append(f"{s // per:02d}  {n:4d}s  element-{n:03d}.jpeg  holds {held:3d}s  {beat_at(n)}" + (f"  > {', '.join(during)}" if during else ""))
        sheet.save(os.path.join(sdir, f"sheet-{s // per:02d}.jpg"), quality=85)
    with open(os.path.join(fdir, "tiles.txt"), "w") as fh:
        fh.write(f"{vid}: {len(kept)} tiles of {len(files)} frames (threshold {threshold}).\n")
        fh.write("sheet | time | full frame | how long the picture holds | beat spoken | beats that start while it holds\n")
        fh.write("\n".join(rows) + "\n")
    print(f"{vid}: kept {len(kept)} of {len(files)} frames, {(len(kept) + per - 1) // per} sheets")
