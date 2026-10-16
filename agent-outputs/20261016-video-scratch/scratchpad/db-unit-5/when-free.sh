#!/usr/bin/env bash
# Wait until one of the two shared render slots is free, then run the command
# through out/render-slot.sh (which takes the free slot), so this job doesn't
# sit behind every newcomer on slot1's blocking wait.
L=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/render-locks
until flock -n "$L/slot1" true || flock -n "$L/slot2" true; do sleep 3; done
exec /home/user/dataslope/video/out/render-slot.sh "$@"
