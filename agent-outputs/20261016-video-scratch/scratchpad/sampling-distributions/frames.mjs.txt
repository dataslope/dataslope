import { pathToFileURL } from "node:url";
const root = "/home/user/dataslope/video/src";
const { script } = await import(pathToFileURL(`${root}/videos/sampling-distributions/script.ts`).href);
const { buildTimeline } = await import(pathToFileURL(`${root}/narration/timeline.ts`).href);
const t = buildTimeline(script, null);
const want = process.argv.slice(2);
for (const b of t.beats) {
  const line = [`${b.id.padEnd(10)} from ${Math.round(b.start * 30)} to ${Math.round(b.end * 30)}`];
  for (const w of b.words) if (want.includes(w.key)) line.push(`${w.key}@${Math.round(w.start * 30)}`);
  console.log(line.join("  "));
}
console.log("total", Math.round(t.duration * 30));
