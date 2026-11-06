/**
 * Renders every registered video, skipping the ones whose output is already
 * in out/ and whose inputs have not changed since it was rendered.
 *
 *   npm run render:all                         # every video, 4K → out/<id>.mp4
 *   npm run render:all -- --fhd                # 1080p → out/<id>-fhd.mp4
 *   npm run render:all -- BaseRate,TfIdf       # just these (id or folder)
 *   npm run render:all -- --dry-run            # list what would render
 *   npm run render:all -- --force              # render even if unchanged
 *
 * A video's fingerprint is a hash of everything its render reads:
 *
 * - every source file reachable by relative import from its Video.tsx and
 *   script.ts, plus Root.tsx's shared imports (theme, fonts, narration
 *   metadata), so an edit to the editorial kit re-renders the videos that use
 *   it and no others;
 * - its own <Composition> block in Root.tsx;
 * - public/narration, public/images and public/patterns for its folder and
 *   for any other one its sources name (a merged video times several
 *   scripts), plus all of public/sfx and public/brand;
 * - the dependency versions in package.json, remotion.config.ts, and the
 *   render settings.
 *
 * Fingerprints live in out/.render-manifest.json, written after each render,
 * so an interrupted run resumes where it stopped. A video whose output file
 * is missing renders whatever the manifest says.
 *
 * The two review kits under "Assets" in Root.tsx (ErdKit, InterviewKit) are
 * not videos and are not rendered.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
const only = args.find((a) => !a.startsWith("--"))?.split(",");

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
const rootShared = [...rootSrc.matchAll(/^import [^;]*?["'](\.\/(?!videos\/)[^"']+)["'];/gm)]
  .map((m) => resolveImport(path.join(SRC, "Root.tsx"), m[1]))
  .filter(Boolean);

/** The <Composition …/> element for `id`, as written in Root.tsx. */
const compositionBlock = (id) => {
  const start = rootSrc.indexOf(`id="${id}"`);
  return start < 0 ? "" : rootSrc.slice(start, rootSrc.indexOf("/>", start));
};

const pkg = JSON.parse(readFileSync(path.join(VIDEO_ROOT, "package.json"), "utf8"));
const GLOBAL = JSON.stringify({
  settings: SETTINGS,
  dependencies: pkg.dependencies,
  config: readFileSync(path.join(VIDEO_ROOT, "remotion.config.ts"), "utf8"),
  shared: [...filesUnder(path.join(PUBLIC, "sfx")), ...filesUnder(path.join(PUBLIC, "brand"))].map((f) => [
    path.relative(VIDEO_ROOT, f),
    hashFile(f),
  ]),
});

const ASSET_DIRS = ["narration", "images", "patterns"].map((d) => path.join(PUBLIC, d));
const assetNames = new Set(ASSET_DIRS.flatMap((d) => (existsSync(d) ? readdirSync(d) : [])));

function fingerprint({ id, folder }) {
  const dir = path.join(SRC, "videos", folder);
  const seeds = ["Video.tsx", "script.ts"].map((f) => path.join(dir, f)).filter(existsSync);
  const sources = [...importGraph([...seeds, ...rootShared])].sort();

  // Asset folders this video reads: its own, those of any video folder its
  // sources come from, and any its sources name as a string ("c-pointers").
  const names = new Set([folder]);
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

  const h = createHash("sha256").update(GLOBAL).update(compositionBlock(id));
  for (const file of [...sources, ...assets]) h.update(`${path.relative(VIDEO_ROOT, file)}\0${hashFile(file)}\n`);
  return h.digest("hex");
}

// --- Plan ------------------------------------------------------------------

let videos = registry();
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
for (const v of videos) {
  const hash = fingerprint(v);
  const output = outputOf(v.id);
  const reason = force
    ? "forced"
    : !existsSync(output)
      ? "not rendered"
      : manifest[key(v.id)] !== hash
        ? manifest[key(v.id)]
          ? "changed"
          : "no fingerprint"
        : null;
  if (reason) todo.push({ ...v, hash, output, reason });
}

console.log(`${videos.length - todo.length} up to date, ${todo.length} to render.`);
for (const v of todo) console.log(`  ${v.id}  (${v.reason})`);
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
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct !== shown) process.stdout.write(`\r${label}  ${(shown = pct)}%`);
      },
    });
    const secs = Math.round((Date.now() - started) / 1000);
    process.stdout.write(`\r${label}  → ${path.relative(VIDEO_ROOT, v.output)} (${secs}s)\n`);
    manifest[key(v.id)] = v.hash;
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
