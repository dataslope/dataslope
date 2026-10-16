// Rough motion audit: every word cue a scene uses, per scene window; prints gaps between cues > limit.
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
const root = "/home/user/dataslope/video/src/videos/testing-hypotheses";
const { script } = await import(pathToFileURL(`${root}/script.ts`).href);
const { buildTimeline, wordKey } = await import(pathToFileURL("/home/user/dataslope/video/src/narration/timeline.ts").href);
const ap = "/home/user/dataslope/video/public/narration/testing-hypotheses/alignment.json";
const t = buildTimeline(script, existsSync(ap) ? JSON.parse(readFileSync(ap, "utf8")) : null);
const limit = Number(process.argv[2] ?? 2.4);
const beat = (id) => t.beats.find((b) => b.id === id);
const word = (id, phrase, nth = 1, edge = "start") => {
  const b = beat(id);
  const keys = phrase.split(/\s+/).map(wordKey).filter(Boolean);
  let seen = 0;
  for (let i = 0; i + keys.length <= b.words.length; i++) {
    if (keys.every((k, j) => b.words[i + j].key === k) && ++seen === nth) return edge === "start" ? b.words[i].start : b.words[i + keys.length - 1].end;
  }
  throw new Error(`${id}: ${phrase}`);
};
const video = readFileSync(`${root}/Video.tsx`, "utf8");
const scenes = [...video.matchAll(/<Scene from=\{cut\("([a-z0-9-]+)"\)\} to=\{(?:until\(cut\("([a-z0-9-]+)"\)\)|durationInFrames \+ OVERLAP)\} fade=\{6\}>\s*<(\w+) \/>/g)].map((m) => ({ from: m[1], to: m[2], comp: m[3] }));
for (const sc of scenes) {
  const src = readFileSync(`${root}/${sc.comp}.tsx`, "utf8");
  const ev = [];
  for (const m of src.matchAll(/n\.word\("([^"]+)", "([^"]+)"(?:, \{ edge: "end" \})?\)/g)) ev.push({ t: word(m[1], m[2], 1, m[0].includes("end") ? "end" : "start"), w: m[2] });
  for (const m of src.matchAll(/n\.beat\("([^"]+)"\)\.(from|to)/g)) ev.push({ t: m[2] === "from" ? beat(m[1]).start : beat(m[1]).end, w: `${m[1]}.${m[2]}` });
  const start = beat(sc.from).start - 8 / 30;
  const end = sc.to ? beat(sc.to).start - 8 / 30 : t.duration;
  ev.push({ t: start, w: "(cut in)" }, { t: end, w: "(cut out)" });
  ev.sort((a, b) => a.t - b.t);
  const gaps = [];
  for (let i = 1; i < ev.length; i++) if (ev[i].t - ev[i - 1].t > limit) gaps.push(`${(ev[i].t - ev[i - 1].t).toFixed(1)}s ${ev[i - 1].w} -> ${ev[i].w}`);
  if (gaps.length) console.log(`${sc.comp}:`, gaps.join(" | "));
}
