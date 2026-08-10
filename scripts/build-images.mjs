#!/usr/bin/env node
/**
 * Optimize the raster content images and generate their manifest.
 *
 * Why this exists:
 *
 * Content images (`assets/images/*`, the Recraft topic art plus any other
 * raster: photos, diagrams, screenshots) must be crushed before they are
 * served, and every page that embeds one needs the image's intrinsic
 * width/height so `<Image>` can reserve layout space (no CLS) without shipping
 * the raw file.
 *
 * Unlike the repo's other generated-asset scripts (search-corpus,
 * brand-fallbacks, cheap text passes that fully regenerate every build), image
 * encoding is expensive, so this script is *incremental and its outputs are
 * committed*:
 *
 *   - For each source it writes an optimized `.webp` plus a raster fallback
 *     (`.png` when the source has transparency, otherwise `.jpg`) to
 *     `public/images/`, and records slug → {hash, width, height, formats} in
 *     `lib/generated/images.js`.
 *   - Both the optimized assets AND the manifest are committed to git (not
 *     gitignored), so a deploy serves them straight from CDN with zero build
 *     re-encoding.
 *   - A source is only re-encoded when its content hash changes (or its output
 *     files are missing). If nothing changed the script is a true no-op, it
 *     doesn't even rewrite the manifest, so it stays cheap on `dev` / `build`
 *     / `postinstall` and produces no git churn.
 *
 * Two classes of image can reach `public/images/`:
 *
 *   1. **Pre-served WebP** written straight into `public/images/` by
 *      `scripts/promote-illustrations.mjs`. These are NOT re-encoded. Promotion
 *      already produced the exact bytes to serve, and running them through a
 *      second lossy pass cost ~1.8 dB PSNR to save ~3 kB — a bad trade. This
 *      script only reads their dimensions for the manifest, so a generated
 *      illustration is encoded once and exists in git once. Today this is
 *      every image in the repo.
 *   2. **Raster sources** under `assets/images/` (a photo, a screenshot, a
 *      scanned diagram — anything not from the illustration pipeline). These
 *      are encoded here into an optimized `.webp` plus a raster fallback. The
 *      folder is currently empty of sources; the path stays supported and
 *      tested for when one is added.
 *
 * Bumping `ENCODER_VERSION` invalidates every cached hash, forcing a one-time
 * re-encode after an encoder-settings change.
 *
 * Idempotent. With no source images it writes an empty manifest so typecheck /
 * lint / build stay green before any image has been added.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readManifest, writeManifest } from "./lib/build-cache.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = join(ROOT, "assets", "images");
const OUT_DIR = join(ROOT, "public", "images");
const MANIFEST_FILE = join(ROOT, "lib", "generated", "images.js");

// Raster source formats sharp can decode. SVG is vector and handled inline in
// the MDX, so it is intentionally excluded. GIF is also excluded: sharp reads
// only the first frame by default, so an animated GIF would be silently
// flattened, convert to PNG/WebP first.
const SOURCE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".tif",
  ".tiff",
]);

// Every format the encoder can emit (WebP + the two possible fallbacks).
// The prune step only touches files with these extensions.
const OUTPUT_EXTS = new Set([".webp", ".png", ".jpg"]);

// Cap the longest edge so an image displayed at ~640px still looks crisp on 2x
// displays without shipping a 2048px original. `withoutEnlargement` keeps
// smaller sources untouched.
const MAX_EDGE = 1600;

// Bump to invalidate every cached hash after changing the encode settings
// below (resize cap, webp/png/jpeg options). Forces a one-time full re-encode.
const ENCODER_VERSION = "2";

/** Lowercase, strip diacritics, and hyphenate to a URL/file-safe slug.
 *  Exported for the vitest suite (__tests__/figureSlugs.test.ts). */
export function slugify(value) {
  return value
    .normalize("NFKD")
    // Strip the combining-diacritics block (escapes, not literal combining
    // chars, so an editor/formatter can't silently mangle the range).
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Read the raster sources, if any. A missing folder is not an error, it just
 *  means no images have been dropped in yet. */
function listSources() {
  let entries;
  try {
    entries = readdirSync(SRC_DIR);
  } catch {
    return [];
  }
  return entries
    .filter((name) => SOURCE_EXTS.has(extname(name).toLowerCase()))
    .filter((name) => statSync(join(SRC_DIR, name)).isFile())
    .sort();
}

/** Load the previously generated manifest so unchanged images can be skipped.
 *  The file is an ES module (`export default {…}`); rather than `import()` it
 *  (which warns under this package's CommonJS-typed package.json), pull the
 *  JSON literal out of the text, the script writes it, so the shape is known.
 *  Absent/unparseable manifest → treat everything as new. */
function loadPriorManifest() {
  if (!existsSync(MANIFEST_FILE)) return {};
  try {
    const text = readFileSync(MANIFEST_FILE, "utf8");
    const match = text.match(/export default\s*(\{[\s\S]*\})\s*;?\s*$/);
    return match ? JSON.parse(match[1]) : {};
  } catch {
    return {};
  }
}

/** Serialize the manifest to its committed ES-module form. */
function renderManifest(manifest) {
  const sorted = Object.fromEntries(
    Object.keys(manifest)
      .sort()
      .map((k) => [k, manifest[k]]),
  );
  const banner =
    "// GENERATED by scripts/build-images.mjs, do not edit by hand.\n" +
    "// Committed; rebuilt (incrementally) from assets/images/*.\n";
  return `${banner}export default ${JSON.stringify(sorted, null, 2)};\n`;
}

async function main() {
  const sources = listSources();
  const prior = loadPriorManifest();

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(dirname(MANIFEST_FILE), { recursive: true });

  // Load sharp lazily, only needed when an image actually has to be encoded,
  // so the "nothing changed" / "no images yet" paths never touch the binary.
  let sharp = null;
  const ensureSharp = async () => {
    if (sharp) return sharp;
    try {
      ({ default: sharp } = await import("sharp"));
    } catch (err) {
      throw new Error(
        `build-images: an image needs (re)encoding but the "sharp" package ` +
          `failed to load, run \`npm install\`. (${err.message})`,
      );
    }
    return sharp;
  };

  // Sidecar for the adopt loop below: file → the size/mtime its content hash
  // was last computed from. Lives in node_modules/.cache rather than beside
  // the committed manifest, because mtimes are per-clone and would otherwise
  // put a machine-specific diff in git on every checkout.
  const statCache = readManifest(ROOT, "images-stat") ?? {};
  const nextStatCache = {};

  const manifest = {};
  const seen = new Map();
  let encoded = 0;
  let cached = 0;

  for (const name of sources) {
    const slug = slugify(name.replace(/\.[^.]+$/, ""));
    if (!slug) {
      console.warn(`build-images: skipping "${name}", empty slug.`);
      continue;
    }
    if (seen.has(slug)) {
      throw new Error(
        `build-images: "${name}" and "${seen.get(slug)}" both slugify to ` +
          `"${slug}". Rename one so every image has a unique slug.`,
      );
    }
    seen.set(slug, name);

    const input = readFileSync(join(SRC_DIR, name));
    const hash = createHash("sha256")
      .update(ENCODER_VERSION)
      .update(input)
      .digest("hex");

    // Reuse the cached encode when the source is unchanged and its outputs are
    // still on disk. `formats` records which files exist for this slug.
    const priorEntry = prior[slug];
    if (
      priorEntry?.hash === hash &&
      Array.isArray(priorEntry.formats) &&
      priorEntry.formats.every((ext) =>
        existsSync(join(OUT_DIR, `${slug}.${ext}`)),
      )
    ) {
      manifest[slug] = priorEntry;
      cached += 1;
      continue;
    }

    const s = await ensureSharp();
    const meta = await s(input).metadata();
    // `rotate()` honors any EXIF orientation before we read dimensions.
    // (sharp's default limitInputPixels already guards decompression bombs.)
    const base = s(input).rotate().resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });

    const webpBuf = await base
      .clone()
      .webp({ quality: 80, alphaQuality: 100, effort: 6 })
      .toBuffer();

    // Fallback for browsers without WebP: PNG preserves transparency; JPEG is
    // far smaller for opaque images (photos, screenshots).
    let fallbackExt;
    let fallbackBuf;
    let info;
    if (meta.hasAlpha) {
      const out = await base
        .clone()
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer({ resolveWithObject: true });
      fallbackExt = "png";
      fallbackBuf = out.data;
      info = out.info;
    } else {
      const out = await base
        .clone()
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      fallbackExt = "jpg";
      fallbackBuf = out.data;
      info = out.info;
    }

    writeFileSync(join(OUT_DIR, `${slug}.webp`), webpBuf);
    writeFileSync(join(OUT_DIR, `${slug}.${fallbackExt}`), fallbackBuf);
    manifest[slug] = {
      hash,
      width: info.width,
      height: info.height,
      formats: ["webp", fallbackExt],
    };
    encoded += 1;

    const webpKb = (webpBuf.length / 1024).toFixed(0);
    const fbKb = (fallbackBuf.length / 1024).toFixed(0);
    console.log(
      `build-images: encoded ${slug}  ${info.width}x${info.height}  ` +
        `webp ${webpKb}kB / ${fallbackExt} ${fbKb}kB`,
    );
  }

  // Adopt pre-served WebP: files promotion wrote directly into public/images
  // with no corresponding source under assets/images. They are already the
  // bytes we serve, so record dimensions and move on — no decode, no re-encode.
  // Registering them in the manifest is also what keeps the prune step below
  // from deleting them.
  let adopted = 0;
  for (const file of readdirSync(OUT_DIR)) {
    if (extname(file).toLowerCase() !== ".webp") continue;
    const slug = file.replace(/\.webp$/i, "");
    if (manifest[slug]) continue; // owned by a legacy source
    const priorEntry = prior[slug];

    // Fast path: the committed manifest's hash is the authority on whether a
    // file is unchanged, but *proving* it meant reading all 1832 images —
    // ~340 MB, about ten seconds on a cold page cache and worse on Windows,
    // paid on every `dev` and `build` just to conclude "nothing moved". The
    // sidecar records the size+mtime each hash was computed from, so an
    // untouched file is settled by `stat` alone. Content still decides: a
    // file whose stat moved is read and hashed exactly as before.
    const st = statSync(join(OUT_DIR, file));
    const seen = statCache[file];
    if (
      seen &&
      seen.size === st.size &&
      seen.mtime === Math.round(st.mtimeMs) &&
      priorEntry?.hash === seen.hash &&
      priorEntry.formats?.length === 1
    ) {
      manifest[slug] = priorEntry;
      nextStatCache[file] = seen;
      cached += 1;
      continue;
    }

    const buf = readFileSync(join(OUT_DIR, file));
    const hash = createHash("sha256").update(ENCODER_VERSION).update(buf).digest("hex");
    nextStatCache[file] = { size: st.size, mtime: Math.round(st.mtimeMs), hash };
    if (priorEntry?.hash === hash && priorEntry.formats?.length === 1) {
      manifest[slug] = priorEntry;
      cached += 1;
      continue;
    }
    const s2 = await ensureSharp();
    const meta = await s2(buf).metadata();
    manifest[slug] = {
      hash,
      width: meta.width,
      height: meta.height,
      formats: ["webp"],
    };
    adopted += 1;
  }

  // Prune any optimized file that isn't an expected output of a current slug
  // (source removed, renamed, or its fallback format changed).
  const expected = new Set();
  for (const [slug, entry] of Object.entries(manifest)) {
    for (const ext of entry.formats) expected.add(`${slug}.${ext}`);
  }
  let pruned = 0;
  for (const file of readdirSync(OUT_DIR)) {
    if (!OUTPUT_EXTS.has(extname(file).toLowerCase())) continue;
    if (!expected.has(file)) {
      rmSync(join(OUT_DIR, file));
      pruned += 1;
    }
  }

  // Rewrite the manifest only when it actually changed, keeps the script a
  // true no-op (and produces no git diff) when nothing was re-encoded.
  const next = renderManifest(manifest);
  const current = existsSync(MANIFEST_FILE)
    ? readFileSync(MANIFEST_FILE, "utf8")
    : null;
  if (next !== current) writeFileSync(MANIFEST_FILE, next);

  // Rebuilt from scratch each run, so a pruned or renamed file drops out
  // instead of accumulating forever.
  writeManifest(ROOT, "images-stat", nextStatCache);

  console.log(
    `build-images: ${encoded} encoded, ${adopted} adopted, ${cached} cached, ` +
      `${pruned} pruned (${Object.keys(manifest).length} image(s) total)`,
  );

  // An opaque original sitting beside its own cut-out is git weight nothing
  // renders: every surface asks for the `-cutout` slug. Two promotions run
  // before `promote-illustrations` defaulted to cut-out-only left 1,351 of
  // them, 151 MB. This is the tripwire for the next one — a warning rather
  // than a failure, because art that is genuinely shown with its background
  // is a legitimate thing to have, just a deliberate one.
  const redundant = Object.keys(manifest).filter(
    (slug) => !slug.endsWith("-cutout") && manifest[`${slug}-cutout`],
  );
  if (redundant.length > 0) {
    console.warn(
      `build-images: ${redundant.length} image(s) have a cut-out beside them and ` +
        `are unlikely to be rendered; promote with --cutout-only (the default) ` +
        `or delete them, e.g. ${redundant.slice(0, 3).join(", ")}`,
    );
  }
}

// Run only when executed directly (`node scripts/build-images.mjs`), so the
// vitest suite can import the exported helpers without triggering a build.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
