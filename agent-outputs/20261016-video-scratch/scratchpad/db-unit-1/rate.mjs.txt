import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const root = "/home/user/dataslope/video";
const { buildTimeline } = await import(pathToFileURL(root + "/src/narration/timeline.ts").href);
for (const v of ["c-pointers", "thinking-statistically", "llm-temperature"]) {
  const { script } = await import(pathToFileURL(`${root}/src/videos/${v}/script.ts`).href);
  const al = JSON.parse(readFileSync(`${root}/public/narration/${script.id}/alignment.json`));
  const est = buildTimeline(script, null), real = buildTimeline(script, al);
  // speech-only: sum of beat durations
  const sp = (t) => t.beats.reduce((s, b) => s + (b.end - b.start), 0);
  console.log(v, "est", est.duration.toFixed(1), "real", real.duration.toFixed(1), "speech est", sp(est).toFixed(1), "real", sp(real).toFixed(1), "ratio", (sp(real)/sp(est)).toFixed(2));
}
