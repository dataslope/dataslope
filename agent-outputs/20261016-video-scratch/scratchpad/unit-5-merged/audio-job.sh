#!/usr/bin/env bash
# Run inside a slot, from a snapshot tree: the audio checks and the standalone stills.
S=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-5-merged
cd "$1"
for v in sampling-bias survivorship-bias sampling-distributions central-limit-theorem standard-error; do
  echo "=== check:sync $v"; node scripts/check-sync.mjs $v 2>&1 | grep -v -i "memory reported\|docker\|inadvertently\|lower amount\|Detected differing" | tr '\r' '\n' | grep -v "rendering"
done
echo "=== check:mix sampling"; node scripts/check-mix.mjs sampling 2>&1 | grep -v -i "memory reported\|docker\|inadvertently\|lower amount\|Detected differing" | tr '\r' '\n' | grep -v "rendering"
echo "=== merged sync"; node out/Sampling-sync.mjs --audio out/Sampling-dry.wav --parts 2>&1
echo "=== standalone stills"; node out/Sampling-stills.mjs $S/standalone SamplingBias:30,4600 SurvivorshipBias:30,3200 SamplingDistributions:30,5050 CentralLimitTheorem:30,2720 StandardError:30,3860 2>&1 | grep -v -i "memory reported\|docker\|inadvertently\|lower amount\|Detected differing"
echo "=== wavs"; ls -la out/*.wav; rm -f out/*.wav
echo "=== preview"; cp out/Sampling-preview.mp4 /home/user/dataslope/video/out/Sampling-preview.mp4 && node out/Sampling-motion.mjs out/Sampling-preview.mp4 > $S/motion-v4-labelled.txt 2>&1; rm -f out/Sampling-preview.mp4
echo "=== check:frames"; node scripts/check-frames.mjs Sampling,SamplingBias,SurvivorshipBias,SamplingDistributions,CentralLimitTheorem,StandardError 2>&1 | grep -v -i "memory reported\|docker\|inadvertently\|lower amount\|Detected differing" | tr '\r' '\n' | grep -v "^$" | tail -40
echo "=== done"
