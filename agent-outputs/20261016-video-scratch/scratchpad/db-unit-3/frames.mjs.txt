// Prints each beat's start/end frame for db-relationships (estimate or alignment).
import { existsSync, readFileSync } from "node:fs";
const root = "/home/user/dataslope/video";
const { script } = await import(`${root}/src/videos/db-relationships/script.ts`);
const { buildTimeline } = await import(`${root}/src/narration/timeline.ts`);
const ap = `${root}/public/narration/db-relationships/alignment.json`;
const t = buildTimeline(script, existsSync(ap) ? JSON.parse(readFileSync(ap, "utf8")) : null);
for (const b of t.beats) console.log(b.id.padEnd(14), Math.round(b.start * 30), Math.round(b.end * 30), b.source);
console.log("total", Math.ceil(t.duration * 30));
