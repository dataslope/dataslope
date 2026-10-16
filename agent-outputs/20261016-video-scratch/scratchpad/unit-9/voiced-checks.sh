#!/usr/bin/env bash
cd /home/user/dataslope/video
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
node out/variants.mjs /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/s3 StatisticsInPractice 370 530 790 980 1110 1290 1420 1430 1660 1940 2360 2490 2850 3140 3260 3305 3520 3900 4250 4530 4745 5005 5410 5830 6040 6320 6720 6950 7220 7480 7880 8040 8084 8300 8640 8720 > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/stills3.log 2>&1
npm run check:motion -- statistics-in-practice > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/motion3.log 2>&1
npm run check:sync -- statistics-in-practice > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/sync.log 2>&1
npm run check:mix -- statistics-in-practice > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/mix.log 2>&1
npm run check:frames -- StatisticsInPractice > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/frames.log 2>&1
echo done > /tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-9/voiced-checks.done
