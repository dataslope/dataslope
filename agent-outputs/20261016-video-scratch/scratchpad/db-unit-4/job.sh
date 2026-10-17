#!/usr/bin/env bash
# The one render job for DbDesign-4-Keys, read when it gets its slot: if the
# narration exists it runs every voiced check in turn, else check:motion only.
D=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/db-unit-4
cd /home/user/dataslope/video
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
echo "job started $(date -u +%H:%M:%S)"
if [ -f public/narration/db-keys/alignment.json ]; then
  npm run check:frames -- DbDesign-4-Keys > $D/frames.log 2>&1; echo "frames exit $?"
  npm run check:motion -- db-keys > $D/motion3.log 2>&1; echo "motion exit $?"
  npm run check:sync -- db-keys > $D/sync.log 2>&1; echo "sync exit $?"
  npm run check:mix -- db-keys > $D/mix.log 2>&1; echo "mix exit $?"
else
  npm run check:motion -- db-keys > $D/motion2.log 2>&1; echo "motion exit $?"
fi
echo "job done $(date -u +%H:%M:%S)"
