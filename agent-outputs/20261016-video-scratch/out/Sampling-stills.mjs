// Scratch (Unit 5 merged): bundle once, render chosen frames of several
// compositions. Usage: node out/Sampling-stills.mjs <outDir> Comp:f1,f2 Comp2:f3 …
// A frame may be given in seconds with an "s" suffix (12.5s).
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
const [, , outDir, ...specs] = process.argv;
mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
for (const spec of specs) {
  const [id, list] = spec.split(":");
  const composition = await selectComposition({ serveUrl, id, browserExecutable, inputProps: {} });
  const frames = (list ?? "").split(",").filter(Boolean).map((f) => (f.endsWith("s") ? Math.round(Number(f.slice(0, -1)) * composition.fps) : Number(f)));
  for (const f of frames) {
    await renderStill({ serveUrl, composition, frame: Math.min(f, composition.durationInFrames - 1), output: `${outDir}/${id}-${String(f).padStart(5, "0")}.png`, scale: 1, browserExecutable });
  }
  console.log(id, composition.durationInFrames);
}
// The bundle is a temp copy of the whole site (~100 MB): leave no trace of it.
rmSync(serveUrl, { recursive: true, force: true });
