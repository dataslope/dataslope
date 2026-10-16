#!/usr/bin/env bash
# check-sync.sh <slug> <mp4>: for each beat, the gap between its cue and the end of the silence before it.
cd /home/user/dataslope/video
ENDS=$(npx remotion ffmpeg -i "$2" -af silencedetect=n=-30dB:d=0.12 -vn -f null - 2>&1 | grep -oE "silence_end: [0-9.]+" | awk '{print $2}' | tr '\n' ' ')
npm run cues -- "$1" 2>/dev/null | awk '/→/ {print $1, $2}' | python3 -c "
import sys
ends=[float(x) for x in '''$ENDS'''.split()]
worst=0; rows=[]
for line in sys.stdin:
    bid, t = line.split(); t=float(t)
    near=min(ends, key=lambda e: abs(e-t)); d=near-t; worst=max(worst,abs(d)); rows.append(f'{bid} {d:+.2f}')
print('  ' + '  '.join(rows)); print(f'  worst {worst:.2f} s')
"
