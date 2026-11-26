#!/bin/bash
# Runs a command in the one "cpu" slot, first come first served, so many
# reviewers on one 4-core machine queue rather than contend.
#   out/cpu-slot.sh <command...>     (from video/)
# A whole-package type-check is made incremental here, with one shared build
# info file: every run is serialized through this slot, so sharing it is safe,
# and a run after the first rechecks only what changed (85 s -> seconds).
D=/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/slots
mkdir -p "$D"
args=("$@")
if [ "${args[0]}" = "npx" ] && [ "${args[1]}" = "tsc" ]; then
  args+=(--incremental --tsBuildInfoFile "$D/video.tsbuildinfo")
fi
while true; do
  exec {fd}>"$D/cpu1.lock"
  if flock -n "$fd"; then
    "${args[@]}"
    exit $?
  fi
  exec {fd}>&-
  sleep 3
done
