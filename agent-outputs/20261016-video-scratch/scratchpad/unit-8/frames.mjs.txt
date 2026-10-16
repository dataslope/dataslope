import { readFileSync, existsSync } from "node:fs";
const { buildTimeline } = await import("/home/user/dataslope/video/src/narration/timeline.ts");
const { script } = await import("/home/user/dataslope/video/src/videos/interpreting-results/script.ts");
const ap = `/home/user/dataslope/video/public/narration/${script.id}/alignment.json`;
const al = existsSync(ap) ? JSON.parse(readFileSync(ap, "utf8")) : null;
const t = buildTimeline(script, al);
const scenes = t.beats.filter((b, i) => script.beats[i].scene);
const out = [];
scenes.forEach((s, k) => {
  const next = scenes[k + 1];
  const end = next ? next.start : t.duration;
  const f = (x) => Math.round(x * 30);
  out.push(f(s.start + 1.5), f((s.start + end) / 2), f(end - 0.6));
});
console.log(out.join(" "));
console.error("duration", t.duration.toFixed(1));
