import { existsSync, readFileSync } from "node:fs";
const root = "/home/user/dataslope/video";
const { script } = await import(`${root}/src/videos/statistics-in-practice/script.ts`);
const { buildTimeline } = await import(`${root}/src/narration/timeline.ts`);
const ap = `${root}/public/narration/statistics-in-practice/alignment.json`;
const t = buildTimeline(script, existsSync(ap) ? JSON.parse(readFileSync(ap, "utf8")) : null);
const want = process.argv.slice(2);
for (const b of t.beats) {
  if (want.length && !want.includes(b.id)) continue;
  console.log(`${b.id} [${Math.round(b.start * 30)}–${Math.round(b.end * 30)}] ` + b.words.map((w) => `${w.text}@${Math.round(w.start * 30)}`).join(" "));
}
