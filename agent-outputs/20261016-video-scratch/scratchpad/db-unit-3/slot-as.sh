#!/usr/bin/env bash
# out/render-slot.sh's queue, keeping an existing ticket's arrival time: the
# same first-come-first-served wait, for a job moved to a detached process.
# Usage: slot-as.sh <ticket-time> <command...>
L=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/render-locks
Q="$L/queue"
mkdir -p "$Q"
me="$1-$$"; shift
touch "$Q/$me"
trap 'rm -f "$Q/$me"' EXIT
while :; do
  ahead=0
  for t in $(ls "$Q" | sort); do
    [ "$t" = "$me" ] && break
    if kill -0 "${t##*-}" 2>/dev/null; then ahead=$((ahead + 1)); else rm -f "$Q/$t"; fi
  done
  if [ "$ahead" -lt 2 ]; then
    for s in slot1 slot2; do
      flock -n -E 75 "$L/$s" bash -c 'rm -f "$0"; exec "$@"' "$Q/$me" "$@"; rc=$?
      [ "$rc" -ne 75 ] && exit "$rc"
    done
  fi
  sleep 2
done
