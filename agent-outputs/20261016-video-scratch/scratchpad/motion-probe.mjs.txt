// Probe: per-frame change in a render, at 4 fps and 480 px grey.
import { spawn } from "node:child_process";
const [file] = process.argv.slice(2);
const W = 480, H = 270, FPS = 4;
const ff = spawn("npx", ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", file, "-r", String(FPS), "-vf", `scale=${W}:${H},format=gray`, "-c:v", "rawvideo", "-f", "image2pipe", "-"]);
const size = W * H; let buf = Buffer.alloc(0), prev = null, k = 0; const rows = [];
ff.stdout.on("data", (d) => {
  buf = Buffer.concat([buf, d]);
  while (buf.length >= size) {
    const f = buf.subarray(0, size); buf = buf.subarray(size);
    if (prev) { let n = 0, sum = 0; for (let i = 0; i < size; i++) { const x = Math.abs(f[i] - prev[i]); sum += x; if (x > 12) n++; } rows.push([k / FPS, n / size, sum / size]); }
    prev = Buffer.from(f); k++;
  }
});
ff.on("close", () => {
  const thr = Number(process.argv[3] ?? 0.0005);
  let run = null; const runs = [];
  for (const [t, frac] of rows) {
    if (frac < thr) { run ??= t; } else { if (run !== null && t - run >= 3) runs.push([run, t]); run = null; }
  }
  const fr = rows.map(r => r[1]).sort((a,b)=>a-b);
  console.log("frames", rows.length, "median changed", fr[Math.floor(fr.length/2)].toExponential(2), "p10", fr[Math.floor(fr.length*0.1)].toExponential(2), "p25", fr[Math.floor(fr.length*0.25)].toExponential(2));
  console.log("static >=3s at thr", thr, ":", runs.length, "spans, total", runs.reduce((s,[a,b])=>s+b-a,0).toFixed(1), "s");
  console.log(runs.slice(0, 40).map(([a,b]) => `${Math.floor(a/60)}:${(a%60).toFixed(1).padStart(4,'0')}+${(b-a).toFixed(1)}`).join("  "));
});
