// Renders the Analytics Engineer interview videos at 1080p, one frame a
// second, into <out>/frames/<id>/element-NNN.jpeg (NNN = floor(t)). Each
// video is bundled from its private entry (out/entries/<id>.tsx), so one
// half-edited folder never breaks another's render. Run from video/:
//   node ../agent-outputs/20261120-ae-interview-video-review/tools/sample.mjs <out> [id,id,...]
// Set REMOTION_BROWSER_EXECUTABLE where Remotion can't download its own Chrome.
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, existsSync, readdirSync } from "node:fs";
const { selectComposition, renderFrames } = createRequire(path.resolve("package.json"))("@remotion/renderer");
const { bundleVideo } = await import(pathToFileURL(path.resolve("scripts/lib/bundle.mjs")).href);
const { VIDEOS } = await import(pathToFileURL(path.resolve("../agent-outputs/20261120-ae-interview-build/tools/videos.mjs")).href);

const outRoot = path.join(process.argv[2], "frames");
const only = process.argv[3]?.split(",");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
for (const [id] of VIDEOS) {
  if (only && !only.includes(id)) continue;
  const dir = path.join(outRoot, id);
  const serveUrl = await bundleVideo(path.resolve(`out/entries/${id}.tsx`));
  const composition = await selectComposition({ serveUrl, id, inputProps: {}, browserExecutable });
  const want = Math.ceil(composition.durationInFrames / composition.fps);
  if (existsSync(dir) && readdirSync(dir).filter((f) => f.startsWith("element-")).length >= want) {
    console.log(`skip ${id}`);
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
    everyNthFrame: composition.fps,
    concurrency: Number(process.env.CONCURRENCY ?? 3),
    browserExecutable,
    onStart: () => {},
    onFrameUpdate: () => {},
  });
  console.log(`${id} ${want} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
