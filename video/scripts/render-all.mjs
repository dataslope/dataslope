/**
 * Renders every registered video, skipping the ones whose output is already
 * in out/ and whose inputs have not changed since it was rendered.
 *
 *   npm run render:all                         # every video, 4K → out/<id>.mp4
 *   npm run render:all -- --fhd                # 1080p → out/<id>-fhd.mp4
 *   npm run render:all -- BaseRate,TfIdf       # just these (id or folder)
 *   npm run render:all -- --dry-run            # list what would render
 *   npm run render:all -- --force              # render even if unchanged
 *   npm run render:all -- --concurrency 12     # frames rendered at once
 *   npm run render:all -- --x264-preset medium # the encoder's speed/size trade
 *
 * Speed. Remotion renders `--concurrency` frames at once (default: half the
 * CPU's threads); try more with `npx remotion benchmark`. The H.264 encoder
 * runs at the x264 preset `fast` by default rather than x264's `medium`: at
 * 4K the encoder is a large share of the time, and `fast` costs a slightly
 * bigger file, not visible quality, at the same CRF. Neither is part of a
 * video's fingerprint, so changing them re-renders nothing.
 *
 * A video is up to date when its output is in out/ and nothing its render
 * reads has changed since it was rendered. What it reads:
 *
 * - every source file reachable by relative import from its Video.tsx and
 *   script.ts, plus Root.tsx's shared imports (theme, fonts, narration
 *   metadata), so an edit to the editorial kit re-renders the videos that use
 *   it and no others. Root.tsx's imports that only its other folders use
 *   (the logo reveals and series openers, the thumbnails, the review kits)
 *   are left out: once they were in, a thumbnail edit re-rendered every
 *   video;
 * - its own <Composition> block in Root.tsx;
 * - public/narration, public/images and public/patterns for its folder and
 *   for any other one its sources name (a merged video times several
 *   scripts), plus all of public/sfx and public/brand;
 * - the dependency versions in package.json, remotion.config.ts, and the
 *   render settings.
 *
 * After each render, out/.render-manifest.json records a hash of every file
 * the output was made from (and of its settings), so an interrupted run
 * resumes where it stopped, and `--dry-run` names the files that changed. A
 * file that stops being read changes nothing, so narrowing these rules never
 * re-renders a video. A video whose output file is missing renders whatever
 * the manifest says.
 *
 * An output with no such record (rendered by hand, or by an older version of
 * this script, which kept one hash per video) is judged by dates: it is up
 * to date if it is newer than every file it reads. Git rewrites only the
 * files a pull changes, so a pull that changes a video makes it older than
 * its inputs. Such an output's record is written on the next run that is not
 * a dry run, and from then on the hashes decide.
 *
 * The two review kits under "Assets" in Root.tsx (ErdKit, InterviewKit) are
 * not videos and are not rendered. Compositions in EXTRAS are rendered with
 * the videos though they are not narrated: the unit opener sample, and the
 * opener before each unit of a series (src/series.ts), which
 * `npm run render:series` stitches between the videos.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openerId, SERIES, unitLabel } from "../src/series.ts";
import { registry, videoNames } from "./lib/audio.mjs";

const VIDEO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(VIDEO_ROOT, "src");
const PUBLIC = path.join(VIDEO_ROOT, "public");
const OUT = path.join(VIDEO_ROOT, "out");
const MANIFEST = path.join(OUT, ".render-manifest.json");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const fhd = flag("--fhd");
const dryRun = flag("--dry-run");
const force = flag("--force");
/** A flag's value: `--concurrency 12`. */
const VALUED = ["--concurrency", "--x264-preset"];
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = args.find((a, i) => !a.startsWith("--") && !VALUED.includes(args[i - 1]))?.split(",");

/** How many frames Remotion renders at once: a number, or Remotion's
 *  default (half the CPU's threads) when not given. */
const concurrency = value("--concurrency") === undefined ? null : Number(value("--concurrency"));
if (concurrency !== null && !(Number.isInteger(concurrency) && concurrency > 0)) {
  console.error(`--concurrency takes a whole number of frames, like 12, not "${value("--concurrency")}"`);
  process.exit(1);
}
const X264_PRESETS = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"];
const x264Preset = value("--x264-preset") ?? "fast";
if (!X264_PRESETS.includes(x264Preset)) {
  console.error(`--x264-preset takes one of ${X264_PRESETS.join(", ")}, not "${x264Preset}"`);
  process.exit(1);
}

// The same settings `npm run render` gets from the CLI and remotion.config.ts.
const SETTINGS = { scale: fhd ? 1 : 2, codec: "h264", imageFormat: "jpeg", jpegQuality: 92 };
const outputOf = (id) => path.join(OUT, fhd ? `${id}-fhd.mp4` : `${id}.mp4`);

// --- Fingerprinting --------------------------------------------------------

const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs", ".json", "/index.ts", "/index.tsx"];
const resolveImport = (from, spec) => {
  const base = path.resolve(path.dirname(from), spec);
  for (const ext of EXTENSIONS) {
    const file = base + ext;
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
};

const IMPORT = /(?:from\s+|import\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g;
const isCode = (file) => /\.(tsx?|m?js)$/.test(file);

/** Every file reachable by relative import from `seeds`. */
function importGraph(seeds) {
  const seen = new Set();
  const stack = [...seeds];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!isCode(file)) continue;
    for (const [, spec] of readFileSync(file, "utf8").matchAll(IMPORT)) {
      const hit = resolveImport(file, spec);
      if (hit) stack.push(hit);
    }
  }
  return seen;
}

const filesUnder = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => path.join(e.parentPath ?? e.path, e.name))
    : [];

const fileHashes = new Map();
const hashFile = (file) => {
  let h = fileHashes.get(file);
  if (!h) fileHashes.set(file, (h = createHash("sha256").update(readFileSync(file)).digest("hex")));
  return h;
};

const rootSrc = readFileSync(path.join(SRC, "Root.tsx"), "utf8");
/** Root.tsx's imports that no video reads: its other folders' components. */
const ROOT_ONLY = /^\.\/(reveals|thumbnails)\/|^\.\/editorial\/(ErdKit|interview)$/;
const rootShared = [...rootSrc.matchAll(/^import [^;]*?["'](\.\/(?!videos\/)[^"']+)["'];/gm)]
  .filter((m) => !ROOT_ONLY.test(m[1]))
  .map((m) => resolveImport(path.join(SRC, "Root.tsx"), m[1]))
  .filter(Boolean);

/** The <Composition …/> element for `id`, as written in Root.tsx. */
const compositionBlock = (id) => {
  const start = rootSrc.indexOf(`id="${id}"`);
  return start < 0 ? "" : rootSrc.slice(start, rootSrc.indexOf("/>", start));
};

const pkg = JSON.parse(readFileSync(path.join(VIDEO_ROOT, "package.json"), "utf8"));
/** What every render reads that is not a file of its own: the settings,
 *  the dependency versions and the Remotion config. */
const SETTINGS_KEY = JSON.stringify({
  settings: SETTINGS,
  dependencies: pkg.dependencies,
  config: readFileSync(path.join(VIDEO_ROOT, "remotion.config.ts"), "utf8"),
});
/** Files every render reads: the sound effects and the brand assets. */
const SHARED_FILES = [...filesUnder(path.join(PUBLIC, "sfx")), ...filesUnder(path.join(PUBLIC, "brand"))];
/** A path in the manifest: relative to video/, with forward slashes. */
const rel = (file) => path.relative(VIDEO_ROOT, file).replaceAll(path.sep, "/");

/**
 * Rendered with the videos though they live outside src/videos/: each id
 * with the source files (under src/) its fingerprint starts from. A series
 * opener leaves src/series.ts out of its sources and hashes its own lines
 * instead, so renaming one unit re-renders that unit's opener alone.
 */
const OPENER_SOURCES = ["reveals/presets.ts", "reveals/LogoReveal.tsx"];
const EXTRAS = [
  { id: "Columns-7-Unit-Sample", seeds: OPENER_SOURCES },
  ...Object.entries(SERIES).flatMap(([key, s]) =>
    s.units.map((u) => ({
      id: openerId(key, u),
      seeds: OPENER_SOURCES,
      ignore: ["series.ts"],
      data: { kind: s.kind, name: s.name, unit: unitLabel(s, u), title: u.title },
    })),
  ),
];

const ASSET_DIRS = ["narration", "images", "patterns"].map((d) => path.join(PUBLIC, d));
const assetNames = new Set(ASSET_DIRS.flatMap((d) => (existsSync(d) ? readdirSync(d) : [])));

function fingerprint({ id, folder, seeds: extraSeeds, ignore = [], data }) {
  const seeds = extraSeeds
    ? extraSeeds.map((f) => path.join(SRC, f))
    : ["Video.tsx", "script.ts"].map((f) => path.join(SRC, "videos", folder, f)).filter(existsSync);
  const skip = new Set(ignore.map((f) => path.join(SRC, f)));
  const sources = [...importGraph([...seeds, ...rootShared])].filter((f) => !skip.has(f)).sort();

  // Asset folders this video reads: its own, those of any video folder its
  // sources come from, and any its sources name as a string ("c-pointers").
  const names = new Set(folder ? [folder] : []);
  for (const file of sources) {
    const rel = path.relative(path.join(SRC, "videos"), file);
    if (!rel.startsWith("..")) names.add(rel.split(path.sep)[0]);
    if (isCode(file)) {
      for (const [, s] of readFileSync(file, "utf8").matchAll(/["'`]([a-z0-9]+(?:-[a-z0-9]+)*)["'`/]/g)) {
        if (assetNames.has(s)) names.add(s);
      }
    }
  }
  const assets = [...names].flatMap((n) => ASSET_DIRS.flatMap((d) => filesUnder(path.join(d, n)))).sort();

  // The settings and its own entry (its Root.tsx block, an opener's lines),
  // then a hash of each file it reads.
  const meta = createHash("sha256").update(SETTINGS_KEY).update(compositionBlock(id)).update(JSON.stringify(data ?? null)).digest("hex").slice(0, 16);
  const paths = [...new Set([...sources, ...assets, ...SHARED_FILES])];
  const files = Object.fromEntries(paths.map((f) => [rel(f), hashFile(f).slice(0, 16)]).sort(([a], [b]) => (a < b ? -1 : 1)));
  return { record: { meta, files }, paths };
}

/** A few names from a list, and how many more. */
const some = (names) => names.slice(0, 2).join(", ") + (names.length > 2 ? ` (+${names.length - 2} more)` : "");

// --- Plan ------------------------------------------------------------------

let videos = [...registry(), ...EXTRAS];
if (only) {
  const wanted = new Set(only.map((n) => videoNames(n, videos).id));
  const unknown = [...wanted].filter((id) => !videos.some((v) => v.id === id));
  if (unknown.length) {
    console.error(`Not a registered video: ${unknown.join(", ")}`);
    process.exit(1);
  }
  videos = videos.filter((v) => wanted.has(v.id));
}

let manifest = {};
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  // No manifest yet: everything renders.
}
const key = (id) => path.relative(OUT, outputOf(id)).replaceAll(path.sep, "/");

const todo = [];
/** Outputs judged up to date whose record is missing or out of form: written
 *  before rendering, so the hashes decide from then on. */
const recorded = {};
for (const v of videos) {
  const { record, paths } = fingerprint(v);
  const output = outputOf(v.id);
  const before = manifest[key(v.id)];
  let reason = null;
  if (force) reason = "forced";
  else if (!existsSync(output)) reason = "not rendered";
  else if (before && typeof before === "object") {
    // What it was rendered from: any file it reads now that differs.
    const changed = Object.keys(record.files).filter((f) => before.files?.[f] !== record.files[f]);
    if (before.meta !== record.meta) reason = "changed: its render settings or its entry in Root.tsx";
    else if (changed.length) reason = `changed: ${some(changed)}`;
    // Up to date; if it read files it no longer reads, keep the record tidy.
    else if (Object.keys(before.files).length !== Object.keys(record.files).length) recorded[key(v.id)] = record;
  } else {
    // No record of what it was made from: compare dates.
    const made = statSync(output).mtimeMs;
    const newer = paths.filter((f) => statSync(f).mtimeMs > made);
    if (newer.length) reason = `edited since it was rendered: ${some(newer.map(rel))}`;
    else recorded[key(v.id)] = record;
  }
  if (reason) todo.push({ ...v, record, output, reason });
}

const nRecorded = Object.keys(recorded).length;
if (nRecorded && !dryRun) {
  Object.assign(manifest, recorded);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
}

console.log(`${videos.length - todo.length} up to date, ${todo.length} to render.`);
for (const v of todo) console.log(`  ${v.id}  (${v.reason})`);
if (nRecorded) console.log(`${nRecorded} of the up-to-date ones had no record and were judged by date; ${dryRun ? "recorded on the next real run" : "recorded now"}.`);
if (dryRun || todo.length === 0) process.exit(0);

// --- Render ----------------------------------------------------------------

const { renderMedia, selectComposition } = await import("@remotion/renderer");
const { bundleVideo } = await import("./lib/bundle.mjs");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
mkdirSync(OUT, { recursive: true });

console.log("\nBundling…");
const serveUrl = await bundleVideo(path.join(SRC, "index.ts"));

const failed = [];
for (const [i, v] of todo.entries()) {
  const label = `[${i + 1}/${todo.length}] ${v.id}`;
  const started = Date.now();
  try {
    const composition = await selectComposition({ serveUrl, id: v.id, inputProps: {}, browserExecutable });
    let shown = -1;
    await renderMedia({
      serveUrl,
      composition,
      inputProps: {},
      outputLocation: v.output,
      overwrite: true,
      browserExecutable,
      ...SETTINGS,
      // How fast, not what: neither is in the fingerprint.
      x264Preset,
      concurrency,
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct !== shown) process.stdout.write(`\r${label}  ${(shown = pct)}%`);
      },
    });
    const secs = Math.round((Date.now() - started) / 1000);
    process.stdout.write(`\r${label}  → ${path.relative(VIDEO_ROOT, v.output)} (${secs}s)\n`);
    manifest[key(v.id)] = v.record;
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  } catch (err) {
    process.stdout.write(`\r${label}  FAILED\n`);
    console.error(err?.message ?? err);
    failed.push(v.id);
  }
}

if (failed.length) {
  console.error(`\n${failed.length} failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`\nRendered ${todo.length}.`);
