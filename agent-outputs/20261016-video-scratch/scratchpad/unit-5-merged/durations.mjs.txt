import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
const ROOT = "/home/user/dataslope/video";
const { buildTimeline } = await import(pathToFileURL(ROOT + "/src/narration/timeline.ts").href);
let total = 0;
for (const f of ["sampling-bias","survivorship-bias","sampling-distributions","central-limit-theorem","standard-error"]) {
  const { script } = await import(pathToFileURL(`${ROOT}/src/videos/${f}/script.ts`).href);
  const p = `${ROOT}/public/narration/${script.id}/alignment.json`;
  const t = buildTimeline(script, existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
  const src = t.beats.map(b=>b.source).filter(s=>s!=="alignment");
  const chars = script.beats.reduce((n,b)=>n+b.text.length,0);
  total += t.duration;
  console.log(f, t.duration.toFixed(2), "first", t.beats[0].start.toFixed(2), "lastEnd", t.beats.at(-1).end.toFixed(2), "nonaligned", src.length, "chars", chars);
}
console.log("total", total.toFixed(1));
