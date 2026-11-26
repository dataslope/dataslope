#!/bin/bash
# Runs a command in one of 2 "render" slots, first come first served, so many
# reviewers on one 4-core machine queue rather than contend.
#   out/render-slot.sh <command...>     (from video/)
D=/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/slots
mkdir -p "$D"
while true; do
  for i in $(seq 1 2); do
    exec {fd}>"$D/render$i.lock"
    if flock -n "$fd"; then
      "$@"
      exit $?
    fi
    exec {fd}>&-
  done
  sleep 3
done
