// Renders the NLP and LLM course videos at 1080p, one frame a second,
// into <out>/frames/<id>/element-NNN.jpeg (NNN = floor(t)). Run from video/:
//   node ../agent-outputs/20261030-nlp-llm-video-review/tools/sample.mjs <out> [id,id,...]
// Half the October reviews' rate: their contact sheets only ever showed one
// tile a second, and a reviewer opened the in-between frames rarely.
// Set REMOTION_BROWSER_EXECUTABLE where Remotion can't download its own Chrome.
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, existsSync, readdirSync } from "node:fs";
const { getCompositions, renderFrames } = createRequire(path.resolve("package.json"))("@remotion/renderer");
const { bundleVideo } = await import(pathToFileURL(path.resolve("scripts/lib/bundle.mjs")).href);

const outRoot = path.join(process.argv[2], "frames");
const only = process.argv[3]?.split(",");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const serveUrl = await bundleVideo(path.resolve("src/index.ts"));
const comps = (await getCompositions(serveUrl, { browserExecutable, inputProps: {} })).filter((c) =>
  only ? only.includes(c.id) : /^(Llm|Nlp)-/.test(c.id),
);
for (const composition of comps) {
  const dir = path.join(outRoot, composition.id);
  const want = Math.ceil(composition.durationInFrames / composition.fps);
  if (existsSync(dir) && readdirSync(dir).filter((f) => f.startsWith("element-")).length >= want) {
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
    everyNthFrame: composition.fps,
    concurrency: 4,
    browserExecutable,
    onStart: () => {},
    onFrameUpdate: () => {},
  });
  console.log(`${composition.id} ${want} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
