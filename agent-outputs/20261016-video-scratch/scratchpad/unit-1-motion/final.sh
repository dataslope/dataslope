#!/usr/bin/env bash
# Runs inside one render slot: the bob-free diagnostic, then the real checks.
S=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-1-motion
cd /home/user/dataslope/video
P=src/videos/thinking-statistically/parts.tsx
cp $P $S/parts.tsx.orig
restore() { cp $S/parts.tsx.orig $P; }
trap restore EXIT
echo "=== nobob check:motion"
sed -i 's|translateY(${bob(frame, 5, 110) + (1 - p) \* 30}px)|translateY(${0 * bob(frame, 5, 110) + (1 - p) * 30}px)|' $P
grep -c "0 \* bob" $P
npm run check:motion -- thinking-statistically 2>&1 | grep -v -i "memory"
rm -f out/ThinkingStatistically-preview.mp4
restore
grep -c "0 \* bob" $P
echo "=== check:motion"
npm run check:motion -- thinking-statistically 2>&1 | grep -v -i "memory"
echo "=== check:frames"
npm run check:frames -- ThinkingStatistically 2>&1 | grep -v -i "memory" | tail -15
echo "=== check:mix"
npm run check:mix -- thinking-statistically 2>&1 | grep -v -i "memory" | tail -30
echo "=== check:sync"
npm run check:sync -- thinking-statistically --audio out/ThinkingStatistically-dry.wav 2>&1 | grep -v -i "memory" | tail -70
ls -la out/ThinkingStatistically-*.wav 2>/dev/null
rm -f out/ThinkingStatistically-wet.wav out/ThinkingStatistically-dry.wav out/ThinkingStatistically-fx.wav
echo "=== DONE"
