import { pathToFileURL } from "node:url";
const { buildTimeline } = await import(pathToFileURL("src/narration/timeline.ts").href);
const [v, ...ids] = process.argv.slice(2);
const { script } = await import(pathToFileURL(`src/videos/${v}/script.ts`).href);
const t = buildTimeline(script, null);
console.log(ids.map((spec) => { const [id, off] = spec.split("@"); if (id === "end") return Math.round(t.duration * 30) - Number(off); const b = t.beats.find((x) => x.id === id); return Math.round(b.end * 30) + Number(off ?? 0); }).join(" "));
