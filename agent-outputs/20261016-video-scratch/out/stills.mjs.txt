// Scratch: bundle once, render many stills. (Deleted before commit.)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [, , id, outDir, scale, ...frames] = process.argv;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
const composition = await selectComposition({ serveUrl, id, browserExecutable, inputProps: {} });
console.log(`${id}: ${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(1)} s)`);
for (const f of frames.map(Number)) {
  await renderStill({ serveUrl, composition, frame: f, output: `${outDir}/${id}-${String(f).padStart(4, "0")}.png`, scale: Number(scale), browserExecutable });
  process.stdout.write(`${f} `);
}
console.log();
