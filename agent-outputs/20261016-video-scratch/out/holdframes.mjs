// Scratch: render, for every scene change in every video, the last frame
// before the outgoing scene starts to leave, and tile them per video.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
const sharp = createRequire(path.resolve("..", "package.json"))("sharp");
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const { buildTimeline } = await import(pathToFileURL(path.resolve("src/narration/timeline.ts")).href);
const EXIT_LEAD = { "random-walks": 20, "floating-point": 20, "sql-execution-order": 14 };
const root = readFileSync("src/Root.tsx", "utf8");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (const v of readdirSync("src/videos").sort()) {
  const src = readFileSync(`src/videos/${v}/Video.tsx`, "utf8");
  const lead = EXIT_LEAD[v] ?? Number(src.match(/const LEAD = (\d+)/)?.[1] ?? 8);
  const comp = src.match(/export const (\w+): React\.FC/)[1];
  const { script } = await import(pathToFileURL(path.resolve(`src/videos/${v}/script.ts`)).href);
  const t = buildTimeline(script, null);
  const frames = [];
  t.beats.forEach((b, i) => { if (i && script.beats[i].scene) frames.push(Math.round(b.start * 30) - lead - 1); });
  const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, inputProps: {} });
  const files = [];
  for (const f of frames) {
    const output = `${OUT}/${v}-${f}.jpeg`;
    await renderStill({ serveUrl, composition, frame: f, output, scale: 0.5, imageFormat: "jpeg", browserExecutable, overwrite: true });
    files.push(output);
  }
  const vertical = composition.height > composition.width;
  const W = vertical ? 270 : 480, H = vertical ? 480 : 270, cols = vertical ? 8 : 4;
  const tiles = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(W, H).toBuffer(), left: (i % cols) * (W + 6), top: Math.floor(i / cols) * (H + 6) })));
  const rows = Math.ceil(files.length / cols);
  await sharp({ create: { width: cols * (W + 6), height: rows * (H + 6), channels: 3, background: "#222" } }).composite(tiles).jpeg({ quality: 85 }).toFile(`${OUT}/sheet-${v}.jpeg`);
  console.log(v, comp, frames.join(" "));
}
