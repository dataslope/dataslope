#!/usr/bin/env bash
# The voiced-timing review chain for DbDesign-3-Relationships, run in one slot.
cd /home/user/dataslope/video
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
S=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/db-unit-3
node out/variants.mjs $S/voiced DbDesign-3-Relationships 693 738 2090 2134 2620 2660 2700 3482 4130 4175 4800 5568
echo "== frames"; npm run check:frames -- DbDesign-3-Relationships
echo "== motion"; npm run check:motion -- db-relationships
echo "== sync"; npm run check:sync -- db-relationships
echo "== mix"; npm run check:mix -- db-relationships
echo "== chain done"
