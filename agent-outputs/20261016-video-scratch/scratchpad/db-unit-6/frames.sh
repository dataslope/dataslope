#!/usr/bin/env bash
# Pull frames (times in seconds) from a video into a dir, then tile them 2-up.
# Usage: frames.sh <video> <outdir> <t> <t> ...
set -e
V=$1; O=$2; shift 2
mkdir -p "$O"
cd /home/user/dataslope/video
for t in "$@"; do
  npx remotion ffmpeg -loglevel error -y -ss "$t" -i "$V" -frames:v 1 "$O/f-$t.png" >/dev/null 2>&1
done
python3 - "$O" "$@" <<'PY'
import sys
from PIL import Image
o=sys.argv[1]; ts=sys.argv[2:]
ims=[Image.open(f"{o}/f-{t}.png").convert("RGB") for t in ts]
w,h=ims[0].size
for k in range(0,len(ims),6):
    grp=ims[k:k+6]
    sheet=Image.new("RGB",(w*2,h*((len(grp)+1)//2)),"white")
    for j,im in enumerate(grp): sheet.paste(im,((j%2)*w,(j//2)*h))
    sheet.save(f"{o}/sheet-{k//6:02d}.jpg",quality=85)
print("ok", len(ims))
PY
