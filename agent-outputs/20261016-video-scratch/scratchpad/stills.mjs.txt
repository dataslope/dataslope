// Bundle the video package once and render many stills of one composition.
//   node stills.mjs <CompId> <outDir> <frame> [frame...]
import { createRequire } from "node:module";
import { join } from "node:path";
const VIDEO = "/home/user/dataslope/video";
const require = createRequire(join(VIDEO, "package.json"));
const { bundle } = require("@remotion/bundler");
const { selectComposition, renderStill } = require("@remotion/renderer");

const [id, outDir, ...frames] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
const serveUrl = await bundle({ entryPoint: join(VIDEO, "src/index.ts"), publicDir: join(VIDEO, "public") });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
console.log(`${id}: ${composition.durationInFrames} frames`);
for (const f of frames.map(Number)) {
  const output = join(outDir, `f${String(f).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame: f, output, scale: 1, browserExecutable, imageFormat: "png" });
  console.log("wrote", output);
}
