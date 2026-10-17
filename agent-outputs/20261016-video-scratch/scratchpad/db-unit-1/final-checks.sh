#!/usr/bin/env bash
# Second voiced pass for DbDesign-1-WhyDesign, inside one render slot.
cd /home/user/dataslope/video
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
D=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/db-unit-1
F="grep -v -i memory\|cgroup\|docker\|lower.amount\|rendering\|alignment.json"
mkdir -p $D/fstills
echo "== stills"; node out/variants.mjs $D/fstills DbDesign-1-WhyDesign 245 1320 1395 1660 2334 2345 4390 2>&1 | grep -v -i "memory\|cgroup\|docker\|lower amount"
echo "== motion"; npm run check:motion -- db-why-design 2>&1 | tr '\r' '\n' | grep -v -i "memory\|cgroup\|docker\|lower amount\|rendering a half"
echo "== mix"; npm run check:mix -- db-why-design 2>&1 | tr '\r' '\n' | grep -v -i "memory\|cgroup\|docker\|lower amount\|rendering"
echo "== done"
