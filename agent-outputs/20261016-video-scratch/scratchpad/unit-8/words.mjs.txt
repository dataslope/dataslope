import { readFileSync, existsSync } from "node:fs";
const dir = "/home/user/dataslope/video/src/videos/interpreting-results/";
const { buildTimeline } = await import("/home/user/dataslope/video/src/narration/timeline.ts");
const { script } = await import(dir + "script.ts");
const ap = `/home/user/dataslope/video/public/narration/${script.id}/alignment.json`;
const al = existsSync(ap) ? JSON.parse(readFileSync(ap, "utf8")) : null;
const t = buildTimeline(script, al);
for (const b of t.beats) console.log(b.id.padEnd(12), b.words.map((w) => `${w.text}@${w.start.toFixed(1)}`).join(" "));
