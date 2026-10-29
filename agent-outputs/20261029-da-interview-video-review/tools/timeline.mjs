// Writes <out>/frames/<id>/timeline.txt for each Data Analyst interview
// video: every beat with its time, the sampled frame files that fall in it,
// scene openings, and pacing numbers (words per second, gap before the next
// beat, scene length). Run from video/:
//   node ../agent-outputs/20261029-da-interview-video-review/tools/timeline.mjs <out>
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const { videoTimeline } = await import(pathToFileURL(path.resolve("scripts/lib/video-timeline.mjs")).href);

const VIDEOS = {
  "DataAnalyst-0-Interview": "da-interview",
  "DataAnalyst-1-Sql": "da-sql",
  "DataAnalyst-2-Pandas": "da-pandas",
  "DataAnalyst-3-StatisticsCommunication": "da-statistics-communication",
  "DataAnalyst-4-AdvancedSql": "da-advanced-sql",
  "DataAnalyst-5-Spreadsheets": "da-spreadsheets",
  "DataAnalyst-6-Visualization": "da-visualization",
  "DataAnalyst-7-AbTesting": "da-ab-testing",
  "DataAnalyst-8-AiAssisted": "da-ai-assisted",
};
const out = path.join(process.argv[2], "frames");
const idx = (t) => String(Math.floor(t)).padStart(3, "0"); // sampled once a second
for (const [id, folder] of Object.entries(VIDEOS)) {
  const { timeline, scripts } = await videoTimeline(folder);
  const merged = scripts.length > 1;
  const sceneIds = new Set(
    scripts.flatMap((s) => s.beats.filter((b) => b.scene).map((b) => (merged ? `${s.id}/${b.id}` : b.id))),
  );
  const lines = [
    `${id}  (src/videos/${folder}/)  duration ${timeline.duration.toFixed(1)} s`,
    `Frames: frames/${id}/element-NNN.jpeg, NNN = floor(t) (one a second, 1920x1080, captions off).`,
    `Columns: beat id | start-end s | words/s | gap to next beat s | frames spanned | text. "== SCENE" marks a beat that opens a scene.`,
    "",
  ];
  let sceneStart = null;
  let sceneName = null;
  const scenes = [];
  timeline.beats.forEach((b, k) => {
    const next = timeline.beats[k + 1];
    const isScene = sceneIds.has(b.id) || k === 0;
    if (isScene) {
      if (sceneName) scenes.push([sceneName, sceneStart, b.start]);
      sceneName = b.id;
      sceneStart = b.start;
      lines.push(`== SCENE ${b.id} at ${b.start.toFixed(1)} s`);
    }
    const dur = b.end - b.start;
    const wps = b.words.length / Math.max(dur, 0.01);
    const gap = next ? next.start - b.end : timeline.duration - b.end;
    const holdEnd = next ? next.start : timeline.duration;
    lines.push(
      `${b.id.padEnd(30)} ${b.start.toFixed(1).padStart(6)}-${b.end.toFixed(1).padEnd(6)} ` +
        `${wps.toFixed(2)} w/s  gap ${gap.toFixed(2)}  frames ${idx(b.start)}-${idx(Math.max(b.start, holdEnd - 0.01))}  ${b.text}`,
    );
  });
  scenes.push([sceneName, sceneStart, timeline.duration]);
  lines.push("", "Scene lengths (s):");
  for (const [n, a, z] of scenes) lines.push(`  ${n.padEnd(32)} ${a.toFixed(1).padStart(6)} → ${z.toFixed(1).padStart(6)}  ${(z - a).toFixed(1)} s`);
  mkdirSync(path.join(out, id), { recursive: true });
  writeFileSync(path.join(out, id, "timeline.txt"), lines.join("\n") + "\n");
  console.log(id, timeline.beats.length, "beats", scenes.length, "scenes");
}
