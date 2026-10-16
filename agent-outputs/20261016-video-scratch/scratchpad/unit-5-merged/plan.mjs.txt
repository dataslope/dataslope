// Prints the merged video's part spans from the real timelines.
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
const ROOT = "/home/user/dataslope/video";
const imp = (p) => import(pathToFileURL(ROOT + p).href);
const { buildTimeline } = await imp("/src/narration/timeline.ts");
const { planParts } = await imp("/src/videos/sampling/plan.ts");
const { PARTS } = await imp("/src/videos/sampling/script.ts");
const tl = PARTS.map(({ script }) => {
  const p = `${ROOT}/public/narration/${script.id}/alignment.json`;
  return buildTimeline(script, existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
});
const { spans, durationInFrames } = planParts(tl, 30);
const t = (f) => `${Math.floor(f / 30 / 60)}:${((f / 30) % 60).toFixed(1).padStart(4, "0")}`;
spans.forEach((s, k) => console.log(PARTS[k].script.id.padEnd(24), "from", s.from, t(s.from), "to", s.to, t(s.to), "first word", t(s.from + tl[k].beats[0].start * 30), "last word", t(s.from + tl[k].beats.at(-1).end * 30)));
console.log("total", durationInFrames, t(durationInFrames));
export { tl, spans };
