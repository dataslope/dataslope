// node words.mjs <folder> <from s> <to s> : words spoken in a stretch, with times and frames
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
const ROOT = "/home/user/dataslope/video";
const [folder, a, b] = process.argv.slice(2);
const { buildTimeline } = await import(pathToFileURL(ROOT + "/src/narration/timeline.ts").href);
const { script } = await import(pathToFileURL(`${ROOT}/src/videos/${folder}/script.ts`).href);
const p = `${ROOT}/public/narration/${script.id}/alignment.json`;
const t = buildTimeline(script, existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const from = Number(a ?? 0), to = Number(b ?? 1e9);
for (const beat of t.beats) {
  if (beat.end < from || beat.start > to) continue;
  console.log(`[${beat.id}] ${beat.start.toFixed(2)}–${beat.end.toFixed(2)}${script.beats.find(x=>x.id===beat.id).scene ? " (scene)" : ""}`);
  console.log("   " + beat.words.map((w) => `${w.text}@${w.start.toFixed(1)}`).join(" "));
}
console.log("duration", t.duration.toFixed(2));
