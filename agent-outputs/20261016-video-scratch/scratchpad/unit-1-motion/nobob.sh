#!/usr/bin/env bash
# Diagnostic: check:motion with the spots' bob switched off (the bob is not motion the brief counts).
cd /home/user/dataslope/video
P=src/videos/thinking-statistically/parts.tsx
cp $P /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-1-motion/parts.tsx.orig
restore() { cp /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-1-motion/parts.tsx.orig $P; }
trap restore EXIT
sed -i 's|translateY(${bob(frame, 5, 110) + (1 - p) \* 30}px)|translateY(${0 * bob(frame, 5, 110) + (1 - p) * 30}px)|' $P
grep -c "0 \* bob" $P
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
out/render-slot.sh bash -c 'cp /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-1-motion/parts.tsx.orig /dev/null; npm run check:motion -- thinking-statistically'
mv out/ThinkingStatistically-preview.mp4 /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-1-motion/nobob-preview.mp4 2>/dev/null
echo DONE
