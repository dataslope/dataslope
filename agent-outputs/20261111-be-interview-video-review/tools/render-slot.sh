#!/bin/bash
# Runs a command in one of two render slots, first come first served, so ten
# fixers on a shared machine never render more than two things at once.
#   out/render-slot.sh <command...>     (from video/)
D=/tmp/claude-0/-home-user-dataslope/2e695f1a-ce26-522e-a813-4d442a926d61/scratchpad/slots
mkdir -p "$D"
while true; do
  for i in 1 2; do
    exec {fd}>"$D/slot$i.lock"
    if flock -n "$fd"; then
      "$@"
      exit $?
    fi
    exec {fd}>&-
  done
  sleep 3
done
