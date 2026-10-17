import { existsSync, readFileSync } from "node:fs";
const { buildTimeline } = await import("/home/user/dataslope/video/src/narration/timeline.ts");
const { script } = await import("/home/user/dataslope/video/src/videos/estimation/script.ts");
const p = "/home/user/dataslope/video/public/narration/estimation/alignment.json";
const t = buildTimeline(script, existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const ids = process.argv.slice(2);
for (const b of t.beats) if (!ids.length || ids.includes(b.id)) console.log(b.id.padEnd(10), b.words.map((w) => `${w.text}@${w.start.toFixed(1)}`).join(" "));
