#!/usr/bin/env bash
# One render slot: the real motion check (keeps the preview), frames, mix, sync.
cd /home/user/dataslope/video
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
