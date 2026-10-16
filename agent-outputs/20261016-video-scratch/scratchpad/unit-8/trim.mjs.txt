import { readFileSync } from "node:fs";
const { buildTimeline } = await import("/home/user/dataslope/video/src/narration/timeline.ts");
const { script } = await import("/home/user/dataslope/video/src/videos/interpreting-results/script.ts");
const al = JSON.parse(readFileSync("/home/user/dataslope/video/public/narration/interpreting-results/alignment.json", "utf8"));
const map = { 0.5: 0.45, 0.45: 0.4, 0.4: 0.35, 0.35: 0.3, 0.7: 0.6 };
for (const [gap, tail, trimPauses] of [[1.6, 2.6, false], [1.6, 2.2, true], [1.5, 2.2, true], [1.6, 2.4, true]]) {
  const s = { ...script, sceneGap: gap, tail, beats: script.beats.map((b) => ({ ...b, pauseAfter: trimPauses && b.pauseAfter !== undefined ? (map[b.pauseAfter] ?? b.pauseAfter) : b.pauseAfter })) };
  console.log(gap, tail, trimPauses, buildTimeline(s, al).duration.toFixed(1));
}
