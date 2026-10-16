#!/usr/bin/env bash
# sheet.sh <CompId> : probe duration, pull 8 evenly spaced frames, tile 2x4.
cd /home/user/dataslope/video
ID=$1; S=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/check-$ID
mkdir -p $S
d=$(npx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 out/$ID-fhd.mp4)
echo "dur=$d"
for i in 0 1 2 3 4 5 6 7; do
  t=$(python3 -c "print(round(2 + ($d - 4) * $i / 7, 2))")
  npx remotion ffmpeg -v error -y -ss $t -i out/$ID-fhd.mp4 -frames:v 1 $S/f$i.png
done
NODE_PATH=/home/user/dataslope/node_modules node -e '
const sharp=require("sharp");const S=process.argv[1];
(async()=>{const W=960,H=540;
const comp=await Promise.all([0,1,2,3,4,5,6,7].map(async i=>({input:await sharp(S+"/f"+i+".png").resize(W,H).toBuffer(),left:(i%2)*W,top:Math.floor(i/2)*H})));
await sharp({create:{width:W*2,height:H*4,channels:3,background:"#fff"}}).composite(comp).png().toFile(S+"/sheet.png");})()' $S
echo $S/sheet.png
