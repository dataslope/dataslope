// Scratch (Unit 5 merged): check:sync for the merged video, which plays five
// scripts rather than one. Two checks on a dry render of the merged video:
//
//   1. Speech onsets against every beat's cue, the parts' own timelines
//      shifted to where plan.ts puts each part (check:sync's own method:
//      the end of each pause in the soundtrack against the beat's first word).
//   2. The merged soundtrack against each standalone video's own dry render,
//      placed at the part's offset: the residual should be silence.
//
// Usage (from video/):
//   node out/Sampling-sync.mjs [--audio out/Sampling-dry.wav] [--parts]
// --parts compares against out/<PartId>-dry.wav (left by check:sync).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readWav, renderAudio, silences } from "../scripts/lib/audio.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const imp = (p) => import(pathToFileURL(ROOT + p).href);
const { buildTimeline } = await imp("src/narration/timeline.ts");
const { planParts, mergeTimelines } = await imp("src/videos/sampling/plan.ts");
const { PARTS } = await imp("src/videos/sampling/script.ts");
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const audio = flag("--audio");
const compareParts = args.includes("--parts");
const FPS = 30;

const tl = PARTS.map(({ script }) => {
  const p = `${ROOT}public/narration/${script.id}/alignment.json`;
  return buildTimeline(script, existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
});
const { spans, durationInFrames } = planParts(tl, FPS);
const merged = mergeTimelines(PARTS.map(({ script }, k) => ({ id: script.id, timeline: tl[k] })), spans, FPS, durationInFrames);

const wavPath = audio ? path.resolve(audio) : await renderAudio("Sampling", { tag: "dry", inputProps: { sfx: false } });
const wav = readWav(wavPath);
const time = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
const sign = (d) => `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(2)}`;

// ── 1. Onsets against cues ──
const ends = silences(wav).map((p) => p.end);
const REACH = 0.5;
const TOL = 0.12;
const rows = merged.beats.filter((b) => b.source === "alignment").map((b) => {
  const near = ends.reduce((best, e) => (Math.abs(e - b.start) < Math.abs(best - b.start) ? e : best), Infinity);
  const d = near - b.start;
  return { id: b.id, start: b.start, d: Math.abs(d) <= REACH ? d : null };
});
const checked = rows.filter((r) => r.d !== null);
const worst = checked.reduce((w, r) => (Math.abs(r.d) > Math.abs(w?.d ?? 0) ? r : w), null);
const late = checked.filter((r) => Math.abs(r.d) > TOL);
console.log(`\n1. Speech onsets in the merged video against the parts' cues, shifted by their offsets`);
PARTS.forEach(({ script }, k) => {
  const mine = checked.filter((r) => r.id.startsWith(`${script.id}/`));
  const w = mine.reduce((a, r) => (Math.abs(r.d) > Math.abs(a?.d ?? 0) ? r : a), null);
  const all = rows.filter((r) => r.id.startsWith(`${script.id}/`)).length;
  console.log(`   part ${k + 1} ${script.id.padEnd(24)} at ${time(spans[k].from / FPS)}: ${mine.length} of ${all} beats checked, worst ${w ? `${sign(w.d)} s (${w.id.split("/")[1]})` : "-"}`);
});
console.log(`   ${checked.length} beats checked, worst ${worst ? `${sign(worst.d)} s (${worst.id}, at ${time(worst.start)})` : "-"}; ${rows.length - checked.length} with no pause before them.`);
if (late.length) for (const r of late) console.log(`   ✗ ${r.id} ${sign(r.d)} s at ${time(r.start)}`);
else console.log(`   ✓ every checked beat starts within ±${TOL} s of its cue`);

// ── 2. The merged soundtrack against each standalone render at its offset ──
if (compareParts) {
  console.log(`\n2. Merged soundtrack minus each standalone dry render, placed at the part's offset`);
  const rms = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); };
  const db = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
  const ids = ["SamplingBias", "SurvivorshipBias", "SamplingDistributions", "CentralLimitTheorem", "StandardError"];
  let ok = true;
  PARTS.forEach(({ script }, k) => {
    const file = path.join(ROOT, "out", `${ids[k]}-dry.wav`);
    if (!existsSync(file)) { console.log(`   part ${k + 1}: no ${path.relative(ROOT, file)}`); ok = false; return; }
    const part = readWav(file);
    const rate = wav.rate;
    if (part.rate !== rate) throw new Error("sample rates differ");
    const off = Math.round((spans[k].from / FPS) * rate);
    // Compare up to the part's last word plus half a second: after that the
    // merged video has moved on to the next part, the standalone to its tail.
    const lastEnd = tl[k].beats.at(-1).end;
    const n = Math.min(part.channels[0].length, Math.round((lastEnd + 0.5) * rate), wav.channels[0].length - off);
    // The residual at a few lags around zero, on every 16th sample: zero
    // should be the best, which says no part is shifted even by a sample.
    const LAGS = [-441, -100, -10, -2, -1, 0, 1, 2, 10, 100, 441];
    let best = { lag: 0, res: Infinity };
    for (const lag of LAGS) {
      let s = 0;
      for (let i = 0; i < n; i += 16) {
        const j = off + i + lag;
        if (j < 0 || j >= wav.channels[0].length) continue;
        const d = wav.channels[0][j] - part.channels[0][i];
        s += d * d;
      }
      if (s < best.res) best = { lag, res: s };
    }
    const sig = rms(part.channels[0], 0, n);
    const resid = new Float32Array(n);
    for (let i = 0; i < n; i++) resid[i] = wav.channels[0][off + i] - part.channels[0][i];
    const r = rms(resid, 0, n);
    const ratio = db(r) - db(sig);
    const good = best.lag === 0 && ratio < -40;
    ok &&= good;
    console.log(`   part ${k + 1} ${script.id.padEnd(24)} speech ${db(sig).toFixed(1)} dBFS rms, residual ${Number.isFinite(ratio) ? ratio.toFixed(1) : "-inf"} dB under it, best lag ${best.lag} samples ${good ? "✓" : "✗"}`);
  });
  console.log(ok ? "   ✓ the merged voice is each standalone voice, sample for sample, at its offset" : "   ✗ mismatch");
}
