import { readFileSync } from "node:fs";
const { buildTimeline } = await import("/home/user/dataslope/video/src/narration/timeline.ts");
for (const v of ["thinking-statistically", "standard-error"]) {
  const { script } = await import(`/home/user/dataslope/video/src/videos/${v}/script.ts`);
  const al = JSON.parse(readFileSync(`/home/user/dataslope/video/public/narration/${script.id}/alignment.json`, "utf8"));
  const e = buildTimeline(script, null), a = buildTimeline(script, al);
  console.log(v, "estimate", e.duration.toFixed(1), "voiced", a.duration.toFixed(1), "ratio", (a.duration / e.duration).toFixed(3));
  // speech-only ratio
  const sp = (t) => t.beats.reduce((s, b) => s + (b.end - b.start), 0);
  console.log("  speech-only ratio", (sp(a) / sp(e)).toFixed(3));
}
