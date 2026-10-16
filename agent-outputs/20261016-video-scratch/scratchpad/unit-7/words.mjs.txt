import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
const root = "/home/user/dataslope/video";
const { script } = await import(pathToFileURL(`${root}/src/videos/testing-hypotheses/script.ts`).href);
const { buildTimeline } = await import(pathToFileURL(`${root}/src/narration/timeline.ts`).href);
const ap = `${root}/public/narration/testing-hypotheses/alignment.json`;
const t = buildTimeline(script, existsSync(ap) ? JSON.parse(readFileSync(ap, "utf8")) : null);
// usage: words.mjs from-seconds to-seconds
const [a, b] = process.argv.slice(2).map((v) => (v.includes(":") ? Number(v.split(":")[0]) * 60 + Number(v.split(":")[1]) : Number(v)));
for (const beat of t.beats) {
  if (beat.end < a - 1 || beat.start > b + 1) continue;
  console.log(`[${beat.id} ${beat.start.toFixed(2)}–${beat.end.toFixed(2)}] ` + beat.words.map((w) => `${w.text}@${w.start.toFixed(1)}`).join(" "));
}
