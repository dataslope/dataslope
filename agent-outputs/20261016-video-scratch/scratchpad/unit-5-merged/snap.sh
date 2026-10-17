#!/usr/bin/env bash
# snap.sh <name>: copy the video tree's sources into a scratch snapshot that
# renders exactly as the tree stood, so edits can go on while it renders.
S=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-5-merged
T=$S/$1
rm -rf "$T"; mkdir -p "$T/out"
cd /home/user/dataslope/video
cp -r src scripts package.json tsconfig.json remotion.config.ts "$T/"
cp out/Sampling-stills.mjs out/Sampling-motion.mjs out/Sampling-sync.mjs "$T/out/"
ln -s /home/user/dataslope/video/node_modules "$T/node_modules"
ln -s /home/user/dataslope/video/public "$T/public"
echo "$T"
