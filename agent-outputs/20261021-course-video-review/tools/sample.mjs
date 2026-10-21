// Renders every course composition at 1080p, one frame every half second,
// into <out>/<id>/element-NNN.jpeg (NNN = floor(t * 2)). Run from video/:
//   node ../agent-outputs/20261021-course-video-review/tools/sample.mjs <outDir> [id,id,...]
// Set REMOTION_BROWSER_EXECUTABLE where Remotion can't download its own Chrome.
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
const { getCompositions, renderFrames } = createRequire(path.resolve("package.json"))("@remotion/renderer");
import { mkdirSync, existsSync, readdirSync } from "node:fs";
const { bundleVideo } = await import(pathToFileURL(path.resolve("scripts/lib/bundle.mjs")).href);

const outRoot = process.argv[2];
const only = process.argv[3]?.split(",");
const browserExecutable =
  process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const serveUrl = await bundleVideo(path.resolve("src/index.ts"));
const comps = (await getCompositions(serveUrl, { browserExecutable, inputProps: {} })).filter(
  (c) => (only ? only.includes(c.id) : /^(Stats-\d-[A-Z]|DbDesign-)/.test(c.id)),
);
for (const composition of comps) {
  const dir = path.join(outRoot, composition.id);
  if (existsSync(dir) && readdirSync(dir).length > composition.durationInFrames / 15 - 2) {
    console.log(`skip ${composition.id}`);
    continue;
  }
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  await renderFrames({
    serveUrl,
    composition,
    inputProps: {},
    outputDir: dir,
    imageFormat: "jpeg",
    jpegQuality: 82,
    scale: 1,
    everyNthFrame: 15,
    concurrency: 4,
    browserExecutable,
    onStart: () => {},
    onFrameUpdate: () => {},
  });
  console.log(`${composition.id} ${composition.durationInFrames} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
