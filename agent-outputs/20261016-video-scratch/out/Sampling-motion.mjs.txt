// Scratch (Unit 5 merged): still stretches of an MP4 of the merged video,
// labelled with the part and beats spoken over each (check:motion can only
// label from the folder's script, which for the merged video is empty).
// Usage: node out/Sampling-motion.mjs out/Sampling-preview.mjs [--max 3] [--min 2]
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { frameChanges, staticSpans } from "../scripts/lib/motion.mjs";
const ROOT = new URL("..", import.meta.url).pathname;
const imp = (p) => import(pathToFileURL(ROOT + p).href);
const { buildTimeline } = await imp("src/narration/timeline.ts");
const { planParts, mergeTimelines } = await imp("src/videos/sampling/plan.ts");
const { PARTS } = await imp("src/videos/sampling/script.ts");
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? Number(args.splice(i, 2)[1]) : d; };
const max = opt("--max", 3), min = opt("--min", 2);
const file = args[0];
const tl = PARTS.map(({ script }) => {
  const p = `${ROOT}public/narration/${script.id}/alignment.json`;
  return buildTimeline(script, existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
});
const { spans, durationInFrames } = planParts(tl, 30);
const merged = mergeTimelines(PARTS.map(({ script }, k) => ({ id: script.id, timeline: tl[k] })), spans, 30, durationInFrames);
const changes = await frameChanges(file);
const still = staticSpans(changes, { minSeconds: min });
const time = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
let bad = 0, total = 0;
for (const s of still) {
  const over = merged.beats.filter((b) => b.end > s.start && b.start < s.end).map((b) => b.id);
  const k = spans.findLastIndex((sp) => sp.from / 30 <= s.start);
  const local = k >= 0 ? (s.start - spans[k].from / 30).toFixed(1) : "-";
  const len = s.end - s.start;
  total += len;
  if (len >= max) bad++;
  console.log(`${len >= max ? "✗" : " "} ${time(s.start)}–${time(s.end)} ${len.toFixed(1).padStart(4)} s  part ${k + 1} @${local}s  over: ${over.join(", ") || "(no narration)"}`);
}
console.log(`${still.length} stretches of ${min} s or more, ${total.toFixed(1)} s in all; ${bad} of ${max} s or more.`);
