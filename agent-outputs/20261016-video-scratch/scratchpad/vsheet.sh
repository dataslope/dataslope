#!/usr/bin/env bash
# vsheet.sh <CompId> : 8 frames of a vertical video, tiled 4x2.
cd /home/user/dataslope/video
ID=$1; S=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/check-$ID
mkdir -p $S
d=$(npx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 out/$ID-fhd.mp4)
echo "dur=$d"
for i in 0 1 2 3 4 5 6 7; do
  t=$(python3 -c "print(round(2 + ($d - 4) * $i / 7, 2))")
  npx remotion ffmpeg -v error -y -ss $t -i out/$ID-fhd.mp4 -frames:v 1 $S/v$i.png
done
NODE_PATH=/home/user/dataslope/node_modules node -e '
const s=require("sharp");const S=process.argv[1];(async()=>{const W=405,H=720;
const c=await Promise.all([0,1,2,3,4,5,6,7].map(async i=>({input:await s(S+"/v"+i+".png").resize(W,H).toBuffer(),left:(i%4)*W,top:Math.floor(i/4)*H})));
await s({create:{width:4*W,height:2*H,channels:3,background:"#fff"}}).composite(c).jpeg({quality:85}).toFile(S+"/vsheet.jpeg");})()' $S
echo $S/vsheet.jpeg
