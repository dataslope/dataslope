import { readFileSync, existsSync, readdirSync } from "node:fs";
const dir = "/home/user/dataslope/video/src/videos/interpreting-results/";
const { buildTimeline, wordKey } = await import("/home/user/dataslope/video/src/narration/timeline.ts");
const { script } = await import(dir + "script.ts");
const ap = `/home/user/dataslope/video/public/narration/${script.id}/alignment.json`;
const al = existsSync(ap) ? JSON.parse(readFileSync(ap, "utf8")) : null;
const t = buildTimeline(script, al);
const wordTime = (id, phrase) => {
  const b = t.beats.find((x) => x.id === id);
  const keys = phrase.split(/\s+/).map(wordKey).filter(Boolean);
  for (let i = 0; i + keys.length <= b.words.length; i++) if (keys.every((k, j) => b.words[i + j].key === k)) return b.words[i].start;
  return NaN;
};
const order = ["HugeScene","DScene","SweepScene","RatesScene","AdmitScene","ConfoundScene","RtmScene","CherryScene","SharpScene","BerksonScene","UnitScene","CloseScene"];
const sceneBeats = t.beats.filter((b, i) => script.beats[i].scene);
order.forEach((name, k) => {
  const src = readFileSync(dir + name + ".tsx", "utf8");
  const times = [...src.matchAll(/word\(\s*"([a-z0-9-]+)",\s*"([^"]+)"/g)].map((m) => wordTime(m[1], m[2]));
  const start = sceneBeats[k].start, end = sceneBeats[k + 1] ? sceneBeats[k + 1].start : t.duration;
  const all = [start, ...times, end].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < all.length; i++) if (all[i] - all[i - 1] > 2.4) gaps.push(`${all[i - 1].toFixed(1)}→${all[i].toFixed(1)} (${(all[i] - all[i - 1]).toFixed(1)}s)`);
  console.log(name.padEnd(14), `${start.toFixed(1)}–${end.toFixed(1)}`, gaps.join("  "));
});
