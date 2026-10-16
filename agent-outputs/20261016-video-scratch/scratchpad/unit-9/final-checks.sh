#!/usr/bin/env bash
cd /home/user/dataslope/video
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
node out/variants.mjs /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/s4 StatisticsInPractice 3900 4530 6040 6150 6700 6760 8640 > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/stills4.log 2>&1
npm run check:motion -- statistics-in-practice > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/motion4.log 2>&1
echo done > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/final-checks.done
