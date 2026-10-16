#!/usr/bin/env bash
# One slot job: the voiced audio and frame checks for DbDesign-6-Constraints.
cd /home/user/dataslope/video
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
npm run check:sync -- db-constraints > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/db-unit-6/sync.log 2>&1; echo "exit $?" >> /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/db-unit-6/sync.log
npm run check:mix -- db-constraints > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/db-unit-6/mix.log 2>&1; echo "exit $?" >> /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/db-unit-6/mix.log
npm run check:frames -- DbDesign-6-Constraints > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/db-unit-6/frames.log 2>&1; echo "exit $?" >> /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/db-unit-6/frames.log
