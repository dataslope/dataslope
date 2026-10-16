#!/usr/bin/env bash
# Unit 8: every check that renders, in one render slot.
cd /home/user/dataslope/video
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
L=/tmp/claude-0/-home-user-dataslope/834a6b33-2c34-57ca-a82d-74ab40ec3f23/scratchpad/unit-8
f() { grep -v "emory\|docker\|lower amount\|rendering a half\|Rendering\|Bundling" ; }
echo "== motion"; npm run check:motion -- interpreting-results 2>&1 | f > $L/motion-voiced.log
echo "== sync";   npm run check:sync -- interpreting-results 2>&1 | f > $L/sync.log
echo "== mix";    npm run check:mix -- interpreting-results 2>&1 | f > $L/mix.log
echo "== frames"; npm run check:frames -- InterpretingResults 2>&1 | f > $L/frames.log
echo "== done"
