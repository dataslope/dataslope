#!/usr/bin/env bash
# Poll every pending video's illustration batch; download + import the ones
# that finish. Prints one line per outcome (the Monitor's events).
SLUGS="sql-null-trap why-normalization base-rate overfitting c-pointers llm-temperature window-functions left-join-trap java-equality random-walks recursion-fib"
ROOT=/home/user/dataslope
LOG=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/poll-art.log
declare -A done_
while true; do
  pending=0
  for s in $SLUGS; do
    [ -n "${done_[$s]}" ] && continue
    if ls $ROOT/video/public/images/$s/*.webp >/dev/null 2>&1; then done_[$s]=1; continue; fi
    pending=$((pending+1))
    st=$(cd $ROOT && timeout 90 node scripts/generate-illustrations.mjs status --out video/.generated/$s 2>&1 | tail -1)
    echo "$(date -u +%T) $s $st" >> $LOG
    if echo "$st" | grep -qE ': completed'; then
      if (cd $ROOT && node scripts/generate-illustrations.mjs download --prompts video/src/videos/$s/illustrations.json --out video/.generated/$s >> $LOG 2>&1) \
        && (cd $ROOT/video && node scripts/illustrations.mjs $s --import >> $LOG 2>&1) \
        && ls $ROOT/video/public/images/$s/*.webp >/dev/null 2>&1; then
        echo "IMPORTED $s $(ls $ROOT/video/public/images/$s | tr '\n' ' ')"
      else
        echo "IMPORT-FAILED $s (see poll-art.log)"
      fi
      done_[$s]=1
    elif echo "$st" | grep -qE ': (failed|expired|cancelled|cancelling)'; then
      echo "BATCH-ENDED $s $st"
      done_[$s]=1
    fi
  done
  [ $pending -eq 0 ] && { echo "ALL-ART-HANDLED"; exit 0; }
  sleep 180
done
