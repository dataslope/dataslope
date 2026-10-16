import { existsSync, readFileSync } from "node:fs";
import { buildTimeline, wordKey } from "../src/narration/timeline.ts";
const at = async (video, beat, phrase, plus) => {
  const { script } = await import(`../src/videos/${video}/script.ts`);
  const path = `public/narration/${script.id}/alignment.json`;
  const t = buildTimeline(script, existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null);
  const b = t.beats.find((x) => x.id === beat);
  const keys = phrase.split(/\s+/).map(wordKey);
  for (let i = 0; i + keys.length <= b.words.length; i++)
    if (keys.every((k, j) => b.words[i + j].key === k)) return Math.round((b.words[i].start + plus) * 30);
  throw new Error(`${video} ${beat} ${phrase}`);
};
console.log(JSON.stringify({
  CPointersFig1: await at("c-pointers", "pointer", "where n lives", 1.5),
  CPointersFig3: await at("c-pointers", "fix", "now hold", 2.0),
  BoxSizing: await at("box-sizing", "overflow", "wraps", 1.6),
  ListVsSet: await at("list-vs-set", "jump", "that bucket", 1.0),
  WhyNormalization: await at("why-normalization", "fk", "pointing", 2.0),
}));
