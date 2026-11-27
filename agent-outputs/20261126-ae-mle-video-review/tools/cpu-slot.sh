#!/bin/bash
# Runs a command in one of 1 "cpu" slots, first come first served by arrival
# (tools/fifo.py in agent-outputs/20261126-ae-mle-video-review), so many
# reviewers on one 4-core machine queue in order.   out/cpu-slot.sh <command...>
# A whole-package type-check is incremental, with one shared build info file:
# every run is serialized through this slot, so sharing it is safe.
args=("$@")
if [ "${args[0]}" = "npx" ] && [ "${args[1]}" = "tsc" ]; then
  args+=(--incremental --tsBuildInfoFile /tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/slots/video.tsbuildinfo)
fi
exec python3 -I /home/user/dataslope/agent-outputs/20261126-ae-mle-video-review/tools/fifo.py cpu 1 "${args[@]:-$@}"
