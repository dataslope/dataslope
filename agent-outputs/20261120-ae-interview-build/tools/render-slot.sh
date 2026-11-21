#!/bin/bash
# Runs a command in one of two render slots, first come first served, so ten
# builders on a shared 4-core machine never render more than two things at
# once.   out/render-slot.sh <command...>     (from video/)
D=/tmp/claude-0/-home-user-dataslope/516360a8-63bf-5ba3-b8df-0656960f2129/scratchpad/slots
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
