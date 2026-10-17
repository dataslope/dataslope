#!/usr/bin/env bash
# sheet2.sh <mp4> <outdir> <t1> <t2> ... : grab frames at the given seconds, tile them 2x3 per sheet.
cd /home/user/dataslope/video
MP4=$1; S=$2; shift 2; mkdir -p $S; rm -f $S/f*.png $S/sheet*.png
i=0; for t in "$@"; do npx remotion ffmpeg -v error -y -ss $t -i $MP4 -frames:v 1 $S/f$(printf %02d $i).png; i=$((i+1)); done
NODE_PATH=/home/user/dataslope/node_modules node -e '
const sharp=require("sharp");const fs=require("fs");const S=process.argv[1];const ts=process.argv.slice(2);
(async()=>{const W=960,H=540;const files=fs.readdirSync(S).filter(f=>/^f\d+\.png$/.test(f)).sort();
for(let s=0;s*6<files.length;s++){const part=files.slice(s*6,s*6+6);
const comp=await Promise.all(part.map(async(f,i)=>({input:await sharp(S+"/"+f).resize(W,H).toBuffer(),left:(i%2)*W,top:Math.floor(i/2)*H})));
await sharp({create:{width:W*2,height:H*3,channels:3,background:"#fff"}}).composite(comp).png().toFile(S+"/sheet"+s+".png");
console.log(S+"/sheet"+s+".png  ("+ts.slice(s*6,s*6+6).join(", ")+")");}})()' $S "$@"
