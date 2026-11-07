/**
 * Renders the YouTube thumbnails, one per course and interview track, to
 * out/thumbnails/<Track>.png at 1280x720 (src/thumbnails/Thumbnail.tsx,
 * README "YouTube thumbnails").
 *
 *   npm run thumbnails                            # every track
 *   npm run thumbnails -- DataEngineer,Statistics # just these
 *   npm run thumbnails -- --list                  # the tracks it knows
 *
 * A thumbnail is a `Thumb-<Track>` still in the Studio's Thumbnails folder,
 * one per entry in TRACKS (src/thumbnails/tracks.ts). The script loads only
 * those stills: asking Remotion for every composition would also time every
 * video, and log a 404 for each one with no recorded narration. A PNG is
 * about 200 to 300 kB, well inside YouTube's 2 MB limit.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TRACKS } from "../src/thumbnails/tracks.ts";
import { bundleVideo } from "./lib/bundle.mjs";

const VIDEO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(VIDEO_ROOT, "out", "thumbnails");
const PREFIX = "Thumb-";

const args = process.argv.slice(2);
const list = args.includes("--list");
const only = args.find((a) => !a.startsWith("--"))?.split(",");

const tracks = Object.keys(TRACKS);
if (list) {
  for (const t of tracks) console.log(t);
  process.exit(0);
}
const unknown = (only ?? []).filter((t) => !tracks.includes(t));
if (unknown.length) {
  console.error(`No thumbnail for: ${unknown.join(", ")}. Tracks: ${tracks.join(", ")}`);
  process.exit(1);
}
const todo = only ?? tracks;

const { renderStill, selectComposition } = await import("@remotion/renderer");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;

console.log("Bundling…");
const serveUrl = await bundleVideo(path.join(VIDEO_ROOT, "src", "index.ts"));

mkdirSync(OUT, { recursive: true });
for (const track of todo) {
  const composition = await selectComposition({ serveUrl, id: `${PREFIX}${track}`, inputProps: {}, browserExecutable });
  const output = path.join(OUT, `${track}.png`);
  await renderStill({ serveUrl, composition, frame: 0, output, imageFormat: "png", scale: 1, overwrite: true, browserExecutable });
  console.log(`→ ${path.relative(VIDEO_ROOT, output)}`);
}
console.log(`Rendered ${todo.length}.`);
