// Stills of one composition at chosen seconds, from one bundle. Run from video/:
//   VIDEO_ENTRY=out/entries/<Id>.tsx node <this> out <Id>:12.5,140,301
// writes out/<Id>-<seconds>.jpeg at 1080p.
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
const { selectComposition, renderStill } = createRequire(path.resolve("package.json"))("@remotion/renderer");
const { bundleVideo } = await import(pathToFileURL(path.resolve("scripts/lib/bundle.mjs")).href);
const [outDir, spec] = process.argv.slice(2);
const [id, secs] = spec.split(":");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const serveUrl = await bundleVideo(path.resolve(process.env.VIDEO_ENTRY ?? "src/index.ts"));
const composition = await selectComposition({ serveUrl, id, inputProps: {}, browserExecutable });
for (const s of secs.split(",").map(Number)) {
  const output = path.join(outDir, `${id}-${s}.jpeg`);
  await renderStill({ serveUrl, composition, frame: Math.min(composition.durationInFrames - 1, Math.round(s * 30)), output, imageFormat: "jpeg", jpegQuality: 88, inputProps: {}, browserExecutable, scale: 1 });
  console.log(output);
}
