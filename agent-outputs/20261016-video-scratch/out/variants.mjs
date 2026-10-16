// Scratch: bundle once, render the same frames from several compositions.
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { bundleVideo } from "../scripts/lib/bundle.mjs";
const [, , outDir, ids, ...frames] = process.argv;
const serveUrl = await bundleVideo(path.resolve("src/index.ts"));
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
for (const id of ids.split(",")) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable, inputProps: {} });
  for (const f of frames.map(Number)) {
    await renderStill({ serveUrl, composition, frame: f, output: `${outDir}/${id}-${String(f).padStart(4, "0")}.png`, scale: 1, browserExecutable });
  }
  console.log(id, composition.durationInFrames);
}
