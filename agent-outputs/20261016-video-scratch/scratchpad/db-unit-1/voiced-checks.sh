#!/usr/bin/env bash
# Voiced-timing checks for DbDesign-1-WhyDesign, run inside one render slot.
cd /home/user/dataslope/video
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
D=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/db-unit-1
mkdir -p $D/vstills
echo "== stills"; node out/variants.mjs $D/vstills DbDesign-1-WhyDesign 195 660 930 947 1290 1660 2100 2455 2880 3120 3570 3867 4320 4590 5037 5265 2>&1 | grep -v -i "memory\|cgroup\|docker\|lower amount"
echo "== motion"; npm run check:motion -- db-why-design 2>&1 | tr '\r' '\n' | grep -v -i "memory\|cgroup\|docker\|lower amount\|rendering a half"
echo "== sync"; npm run check:sync -- db-why-design 2>&1 | tr '\r' '\n' | grep -v -i "memory\|cgroup\|docker\|lower amount\|rendering"
echo "== mix"; npm run check:mix -- db-why-design 2>&1 | tr '\r' '\n' | grep -v -i "memory\|cgroup\|docker\|lower amount\|rendering"
echo "== frames"; npm run check:frames -- DbDesign-1-WhyDesign 2>&1 | tr '\r' '\n' | grep -v -i "memory\|cgroup\|docker\|lower amount" | tail -30
echo "== done"
