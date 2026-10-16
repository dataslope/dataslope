import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const root = "/home/user/dataslope/video";
const { script } = await import(pathToFileURL(root + "/src/videos/thinking-statistically/script.ts").href);
const { buildTimeline } = await import(pathToFileURL(root + "/src/narration/timeline.ts").href);
const al = JSON.parse(readFileSync(root + "/public/narration/thinking-statistically/alignment.json", "utf8"));
const t = buildTimeline(script, al);
for (const b of t.beats) {
  console.log(`${b.id} ${b.start.toFixed(2)}-${b.end.toFixed(2)} f${Math.round(b.start*30)}`);
  console.log("   " + b.words.map((w) => `${w.text}@${w.start.toFixed(2)}`).join(" "));
}
