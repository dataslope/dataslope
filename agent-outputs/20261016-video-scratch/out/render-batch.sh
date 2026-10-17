#!/usr/bin/env bash
# Scratch: render the given compositions one at a time. "ID@4k" renders 4K.
cd /home/user/dataslope/video
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
for spec in "$@"; do
  id=${spec%@*}
  if [ "$spec" != "$id" ]; then scale=2; out="out/$id-4k.mp4"; else scale=1; out="out/$id-fhd.mp4"; fi
  start=$(date +%s)
  if npx remotion render "$id" "$out" --scale=$scale --concurrency=2 > "out/$id-render.log" 2>&1; then
    echo "DONE $spec $(( $(date +%s) - start ))s"
  else
    echo "FAILED $spec"
  fi
done
