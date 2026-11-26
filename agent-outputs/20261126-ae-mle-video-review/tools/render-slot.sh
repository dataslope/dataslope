#!/bin/bash
# Runs a command in one of 2 "render" slots, first come first served by arrival
# (tools/fifo.py in agent-outputs/20261126-ae-mle-video-review), so many
# reviewers on one 4-core machine queue in order.   out/render-slot.sh <command...>
args=("$@")
exec python3 -I /home/user/dataslope/agent-outputs/20261126-ae-mle-video-review/tools/fifo.py render 2 "${args[@]:-$@}"
