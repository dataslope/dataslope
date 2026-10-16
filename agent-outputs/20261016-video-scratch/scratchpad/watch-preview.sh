#!/usr/bin/env bash
# watch-preview.sh <out/X-preview.mp4> <copy name>: wait until the preview is rewritten and complete, then copy it.
F=$1; NAME=$2; D=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/previews; mkdir -p $D
start=$(stat -c %Y "$F" 2>/dev/null || echo 0)
while :; do
  m=$(stat -c %Y "$F" 2>/dev/null || echo 0)
  if [ "$m" -gt "$start" ]; then
    s1=$(stat -c %s "$F"); sleep 15; s2=$(stat -c %s "$F")
    if [ "$s1" = "$s2" ] && (cd /home/user/dataslope/video && npx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 "$F" >/dev/null 2>&1); then
      cp "$F" "$D/$NAME"; cd /home/user/dataslope/video && npx remotion ffprobe -v error -show_entries format=duration:stream=codec_type -of compact "$D/$NAME"; exit 0
    fi
  fi
  sleep 20
done
