#!/usr/bin/env bash
# Scratch (gitignored): run a render command in one of two shared slots, so
# parallel agents never have more than two Chromium renders going at once.
# First come, first served: each waiter takes a timestamped ticket, and only
# the two oldest living tickets try for a slot, so a newcomer never takes a
# freed slot ahead of a job that has been waiting. (The first version had every
# waiter block on slot 1, so slot 2 went to whoever arrived next.)
# Usage: out/render-slot.sh <command...>
L=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/render-locks
Q="$L/queue"
mkdir -p "$Q"
me="$(date +%s%N)-$$"
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
