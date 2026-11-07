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
 * so the tracks are whatever Root.tsx registers there. A PNG of one is
 * about 200 to 300 kB, well inside YouTube's 2 MB limit.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleVideo } from "./lib/bundle.mjs";

const VIDEO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(VIDEO_ROOT, "out", "thumbnails");
const PREFIX = "Thumb-";

const args = process.argv.slice(2);
const list = args.includes("--list");
const only = args.find((a) => !a.startsWith("--"))?.split(",");

const { getCompositions, renderStill } = await import("@remotion/renderer");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;

console.log("Bundling…");
const serveUrl = await bundleVideo(path.join(VIDEO_ROOT, "src", "index.ts"));
const all = (await getCompositions(serveUrl, { browserExecutable })).filter((c) => c.id.startsWith(PREFIX));
const trackOf = (c) => c.id.slice(PREFIX.length);

if (list) {
  for (const c of all) console.log(trackOf(c));
  process.exit(0);
}

let todo = all;
if (only) {
  const known = new Set(all.map(trackOf));
  const unknown = only.filter((t) => !known.has(t));
  if (unknown.length) {
    console.error(`No thumbnail for: ${unknown.join(", ")}. Tracks: ${[...known].join(", ")}`);
    process.exit(1);
  }
  todo = all.filter((c) => only.includes(trackOf(c)));
}

mkdirSync(OUT, { recursive: true });
for (const composition of todo) {
  const output = path.join(OUT, `${trackOf(composition)}.png`);
  await renderStill({ serveUrl, composition, frame: 0, output, imageFormat: "png", scale: 1, overwrite: true, browserExecutable });
  console.log(`→ ${path.relative(VIDEO_ROOT, output)}`);
}
console.log(`Rendered ${todo.length}.`);
