#!/usr/bin/env bash
# check-take.sh <slug> "<cut seconds, space separated>": every cut mid-pause, and a transcript diff.
set -e
cd /home/user/dataslope/video
SLUG=$1; CUTS=$2
D=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/take-$SLUG; mkdir -p $D
npx remotion ffmpeg -hide_banner -loglevel error -y -i takes/$SLUG/take.mp3 -ac 1 -ar 44100 -c:a pcm_s16le $D/take.wav
python3 - "$D" "$CUTS" <<'PY'
import wave, array, math, sys
D, cuts = sys.argv[1], [float(c) for c in sys.argv[2].split()]
w=wave.open(D+"/take.wav"); pcm=array.array('h'); pcm.frombytes(w.readframes(w.getnframes())); sr=44100
fr=int(0.01*sr); rms=[math.sqrt(sum(x*x for x in pcm[i:i+fr])/fr) for i in range(0,len(pcm)-fr,fr)]
loud=max(rms); q=[r<0.03*loud for r in rms]; bad=0; runs=[]
for c in cuts:
    k=int(round(c/0.01))
    if not q[k]: print("  cut %.2f NOT QUIET"%c); bad+=1; continue
    a=k;b=k
    while a>0 and q[a-1]: a-=1
    while b<len(q)-1 and q[b+1]: b+=1
    runs.append((b+1-a)*0.01)
print(f"  {len(cuts)-bad}/{len(cuts)} cuts in silence, pauses {min(runs):.2f} to {max(runs):.2f} s")
PY
