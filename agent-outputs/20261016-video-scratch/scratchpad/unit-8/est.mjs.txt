import { readFileSync, existsSync } from "node:fs";
const { buildTimeline } = await import("/home/user/dataslope/video/src/narration/timeline.ts");
for (const v of ["thinking-statistically", "sampling-bias", "standard-error", "simpsons-paradox", "interpreting-results"]) {
  const { script } = await import(`/home/user/dataslope/video/src/videos/${v}/script.ts`);
  const ap = `/home/user/dataslope/video/public/narration/${script.id}/alignment.json`;
  const al = existsSync(ap) ? JSON.parse(readFileSync(ap, "utf8")) : null;
  const est = buildTimeline(script, null).duration;
  const real = al ? buildTimeline(script, al).duration : NaN;
  const chars = script.beats.reduce((s, b) => s + b.text.length, 0);
  console.log(v.padEnd(24), "chars", chars, "est", est.toFixed(1), "real", real.toFixed(1), "ratio", (real / est).toFixed(3));
}
