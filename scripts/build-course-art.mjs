#!/usr/bin/env node
/**
 * Optimize the raster course/interview illustrations and generate their
 * manifest.
 *
 * Why this exists:
 *
 * The Recraft-generated topic images (`assets/course-art/*.png` — transparent
 * PNGs that read on both light `#ffffff` and dark `#121212` backgrounds) must
 * be crushed before they are served, and every lesson that embeds one needs
 * the image's intrinsic width/height so `<Illustration>` can reserve layout
 * space (no CLS) without shipping the raw file.
 *
 * This script is the single source of truth: for each source PNG it writes an
 * optimized `.png` (lossless, max zlib) and a smaller `.webp` (alpha-preserving)
 * sibling to `public/course-art/`, and emits `lib/generated/course-art.js` — a
 * slug → {width, height, formats} map that `<Illustration>` imports.
 *
 * Both outputs are gitignored and regenerated on `dev`, `build`, and
 * `postinstall` (same approach as `build-brand-fallbacks.mjs` /
 * `build-svg-gallery-data.mjs`): only the source PNGs and the committed
 * `.d.ts` sibling live in git. Serving the optimized assets from `public/`
 * keeps them off the ISR read meter — they're plain CDN static files.
 *
 * Idempotent. With no source PNGs yet it still writes an empty manifest so
 * typecheck / lint / build stay green before any image has been added.
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = join(ROOT, "assets", "course-art");
const OUT_DIR = join(ROOT, "public", "course-art");
const MANIFEST_FILE = join(ROOT, "lib", "generated", "course-art.js");

// Cap the longest edge so a hero that displays at ~640px still looks crisp on
// 2x displays without shipping a 2048px original. `withoutEnlargement` keeps
// smaller sources untouched.
const MAX_EDGE = 1600;

/** Lowercase, hyphenate to a URL/file-safe slug (mirrors the illustration
 *  helper so filenames stay predictable). */
function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Read the PNG sources, if any. A missing folder is not an error — it just
 *  means no images have been dropped in yet. */
function listSources() {
  let entries;
  try {
    entries = readdirSync(SRC_DIR);
  } catch {
    return [];
  }
  return entries
    .filter((name) => extname(name).toLowerCase() === ".png")
    .filter((name) => statSync(join(SRC_DIR, name)).isFile())
    .sort();
}

async function main() {
  const sources = listSources();

  // Load sharp lazily so the "no images yet" path never needs the native
  // binary installed — the manifest is still (re)written as an empty map.
  let sharp = null;
  if (sources.length > 0) {
    try {
      ({ default: sharp } = await import("sharp"));
    } catch (err) {
      throw new Error(
        `build-course-art: ${sources.length} source PNG(s) found in assets/course-art/ ` +
          `but the "sharp" package failed to load — run \`npm install\`. (${err.message})`,
      );
    }
  }

  // Start from a clean output dir so deleted sources don't leave stale assets.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(dirname(MANIFEST_FILE), { recursive: true });

  const manifest = {};
  const seen = new Map();

  for (const name of sources) {
    const slug = slugify(name.replace(/\.png$/i, ""));
    if (!slug) {
      console.warn(`build-course-art: skipping "${name}" — empty slug.`);
      continue;
    }
    if (seen.has(slug)) {
      throw new Error(
        `build-course-art: "${name}" and "${seen.get(slug)}" both slugify to ` +
          `"${slug}". Rename one so every image has a unique slug.`,
      );
    }
    seen.set(slug, name);

    const srcPath = join(SRC_DIR, name);
    const input = readFileSync(srcPath);

    // `rotate()` honors any EXIF orientation before we read dimensions.
    const base = sharp(input, { limitInputPixels: 268402689 }).rotate().resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });

    const pngBuf = await base
      .clone()
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer({ resolveWithObject: true });

    const webpBuf = await base
      .clone()
      .webp({ quality: 80, alphaQuality: 100, effort: 6 })
      .toBuffer();

    const { width, height } = pngBuf.info;
    writeFileSync(join(OUT_DIR, `${slug}.png`), pngBuf.data);
    writeFileSync(join(OUT_DIR, `${slug}.webp`), webpBuf);

    manifest[slug] = { width, height, formats: ["webp", "png"] };

    const srcKb = (input.length / 1024).toFixed(0);
    const pngKb = (pngBuf.data.length / 1024).toFixed(0);
    const webpKb = (webpBuf.length / 1024).toFixed(0);
    console.log(
      `build-course-art: ${slug}  ${width}x${height}  ` +
        `${srcKb}kB → png ${pngKb}kB / webp ${webpKb}kB`,
    );
  }

  // Sort keys so the generated module has a stable diff across runs.
  const sorted = Object.fromEntries(
    Object.keys(manifest)
      .sort()
      .map((k) => [k, manifest[k]]),
  );

  const banner =
    "// GENERATED by scripts/build-course-art.mjs — do not edit by hand.\n" +
    "// Rebuilt on dev/build/postinstall from assets/course-art/*.png.\n";
  writeFileSync(
    MANIFEST_FILE,
    `${banner}export default ${JSON.stringify(sorted, null, 2)};\n`,
  );

  console.log(
    `build-course-art: wrote ${Object.keys(sorted).length} image(s) to ` +
      `public/course-art/ and lib/generated/course-art.js`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
