// Scratch: the silence before every beat that opens a new scene, per video,
// and how long the finished outgoing scene stays put before it starts to go.
import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const { buildTimeline } = await import(pathToFileURL("src/narration/timeline.ts").href);
// Beats that open a scene without a cut("…") call, and how many frames before
// the beat each video's exit begins.
const EXTRA = { "tabs-vs-spaces": ["python"], "sql-execution-order": ["written", "error-setup", "rule", "outro"], "floating-point": ["third", "binary", "bits", "pair", "isclose", "outro"] };
const EXIT_LEAD = { "random-walks": 20, "floating-point": 20, "sql-execution-order": 14 };
const rows = [];
for (const v of readdirSync("src/videos").sort()) {
  const src = readFileSync(`src/videos/${v}/Video.tsx`, "utf8");
  const lead = EXIT_LEAD[v] ?? Number(src.match(/const LEAD = (\d+)/)?.[1] ?? 8);
  const ids = new Set([...src.matchAll(/cut\("([a-z0-9-]+)"\)/g)].map((m) => m[1]).concat(EXTRA[v] ?? []));
  const { script } = await import(pathToFileURL(`src/videos/${v}/script.ts`).href);
  const t = buildTimeline(script, null);
  const holds = [];
  t.beats.forEach((b, i) => {
    if (!ids.has(b.id) || i === 0) return;
    const gap = b.start - t.beats[i - 1].end;
    holds.push(gap - (v === "tabs-vs-spaces" && b.id === "python" ? 19 : lead) / 30);
  });
  const min = Math.min(...holds), avg = holds.reduce((a, b) => a + b, 0) / holds.length;
  rows.push([v, holds.length, min, avg, t.duration]);
  console.log(`${v.padEnd(22)} scenes ${String(holds.length + 1).padStart(2)}  hold after last word: min ${min.toFixed(2)} s, mean ${avg.toFixed(2)} s   (${holds.map((h) => h.toFixed(2)).join(", ")})`);
}
const all = rows.flatMap((r) => r[2]);
console.log(`\noverall shortest hold ${Math.min(...all).toFixed(2)} s`);
