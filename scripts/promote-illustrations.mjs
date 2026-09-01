#!/usr/bin/env node
/**
 * Promote chosen illustration candidates into the repository: generation
 * writes candidates to R2 or a scratch directory, a human picks the keepers,
 * and this converts those to WebP in `public/images/`, the files the site
 * serves (see "Illustrations" in AGENTS.md).
 *
 * The promoted file IS the served artifact — one encode, one copy in git; a
 * source under assets/images would be re-encoded by build-images (~1.8 dB
 * PSNR lost to save ~3 kB) and stored twice. So `--quality` is the quality
 * users see and defaults to 92. The pristine PNGs stay in R2, so a run can
 * be re-promoted at a different quality without regenerating. Cut-outs are
 * trimmed on the way through, before the single encode, which makes the crop
 * free; `trimAxesFor` in scripts/lib/cutouts.mjs decides which margins go.
 *
 * Deliberately separate from build-images.mjs, which must stay a
 * deterministic, content-hashed no-op when nothing changed; promotion is a
 * network-touching, human-triggered action.
 *
 * Usage:
 *   node scripts/promote-illustrations.mjs <ids...> [options]
 *   node scripts/promote-illustrations.mjs --all --from <dir>
 *
 * Ids are prompt ids (e.g. `python-basics-loops`). An id with a cut-out
 * promotes the cut-out and nothing else: every surface on the site asks for
 * the `-cutout` slug, so an opaque original beside it is git weight nothing
 * serves. Generation writes the cut-out directly (gpt-image-2 returns a real
 * alpha channel), so most runs have nothing else to promote.
 *
 * Options:
 *   --from <dir|r2>   Source of candidates (default: ./generated-illustrations)
 *   --run <id>        R2 run id to promote from (required when --from r2)
 *   --variant <n>     Which variant to take when several exist (default: 1)
 *   --all             Promote every candidate found in the source
 *   --quality <n>     WebP quality of the served image (default: 92)
 *   --max-width <px>  Downscale to at most this width before encoding
 *                     (default: none, the generated size is served). Never
 *                     upscales.
 *   --no-cutout       Promote only the original, ignoring any cut-out beside it
 *   --with-original   Also promote the opaque original beside the cut-out.
 *                     Off by default: nothing on the site renders it. The
 *                     pristine PNG is in R2 regardless, so a later re-promote
 *                     can bring it back.
 *   --no-build        Skip the build-images run afterwards. Required when two
 *                     promotions run at once: build-images prunes every file
 *                     missing from the manifest it just scanned, so a second
 *                     promotion writing after that scan has its files deleted
 *                     out from under it. Pass it to every concurrent run and
 *                     run `npm run build:images` once at the end.
 *   --dry-run         Report what would be promoted; write nothing
 *   -h, --help        Show this help
 *
 * R2 credentials, when --from r2: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET (see scripts/lib/r2.mjs).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { createR2Client, credentialsFromEnv } from "./lib/r2.mjs";
import { contentBounds, trimAxesFor, trimPlan } from "./lib/cutouts.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// The served file directly — no copy under assets/images (see header).
const OUT_DIR = join(ROOT, "public", "images");
export const CUTOUT_SUFFIX = "-cutout";

function parseArgs(argv) {
  const opts = {
    ids: [],
    from: join(process.cwd(), "generated-illustrations"),
    run: null,
    variant: 1,
    all: false,
    quality: 92,
    maxWidth: null,
    cutout: true,
    withOriginal: false,
    build: true,
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--from": opts.from = next(); break;
      case "--run": opts.run = next(); break;
      case "--variant": opts.variant = Math.max(1, Number(next()) || 1); break;
      case "--all": opts.all = true; break;
      case "--quality": opts.quality = Math.min(100, Math.max(1, Number(next()) || 92)); break;
      case "--max-width": opts.maxWidth = Math.max(1, Number(next()) || 0) || null; break;
      case "--no-cutout": opts.cutout = false; break;
      case "--with-original": opts.withOriginal = true; break;
      // Kept so an old command line does not silently promote 0.22 MB it
      // meant to skip; it is what this script does anyway now.
      case "--cutout-only": break;
      case "--no-build": opts.build = false; break;
      case "--dry-run": opts.dryRun = true; break;
      case "-h":
      case "--help": opts.help = true; break;
      default:
        if (a.startsWith("-")) { console.error(`Unknown argument: ${a}`); process.exit(1); }
        opts.ids.push(a);
    }
  }
  return opts;
}

function printHelp() {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  console.log(
    src.slice(src.indexOf("/**"), src.indexOf("*/") + 2)
      .replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "")
      .trim(),
  );
}

/** R2 key for one candidate image. Mirrors generate-illustrations.mjs. */
export function candidateKey(runId, promptId, variant, kind) {
  return `illustrations/${runId}/${promptId}/v${variant}/${kind}.png`;
}

/**
 * Crop a cut-out's transparent margins away, on the axes its id calls for.
 * Returns the input untouched when there is nothing worth taking, so
 * re-promoting already-trimmed art is a no-op. The geometry lives in
 * `scripts/lib/cutouts.mjs`, shared with `trim-cutouts.mjs` so the two cannot
 * disagree.
 */
async function trimCutout(buf, axes) {
  const bounds = await contentBounds(buf);
  const plan = trimPlan(bounds, { axes });
  if (!plan) return buf;
  return sharp(buf)
    .extract({ left: plan.left, top: plan.top, width: plan.width, height: plan.height })
    // Lossless hand-off to the single lossy encode below; leaving the format
    // off would re-encode at sharp's default quality 80.
    .png({ compressionLevel: 0 })
    .toBuffer();
}

/**
 * Convert one image buffer to the committed WebP source.
 * `nearLossless` is not used: these are photographic-ish raster renders, so
 * plain high-quality WebP is both smaller and visually equivalent.
 */
export async function toWebpSource(buf, quality, maxWidth = null) {
  const img = sharp(buf);
  // `withoutEnlargement` keeps this a no-op for anything already smaller, so
  // passing --max-width over a mixed run never upscales the small ones.
  if (maxWidth) img.resize({ width: maxWidth, withoutEnlargement: true });
  return img.webp({ quality, alphaQuality: 100, effort: 6 }).toBuffer();
}

/** Candidate sources: either a local directory of PNGs or an R2 run prefix. */
function makeSource(opts) {
  if (opts.from !== "r2") {
    const dir = opts.from;
    if (!existsSync(dir)) {
      console.error(`Source directory not found: ${dir}`);
      process.exit(1);
    }
    const names = readdirSync(dir).filter((f) => /\.(png|webp)$/i.test(f));
    // Ids, not file stems: a transparent generation writes only
    // `<id>-cutout.png`, so listing has to see the id behind the suffix or
    // `--all` finds nothing on a run with no opaque originals.
    const idOf = (stem) =>
      stem.endsWith(CUTOUT_SUFFIX) ? stem.slice(0, -CUTOUT_SUFFIX.length) : stem;
    return {
      describe: dir,
      list: () => [...new Set(names.map((f) => idOf(basename(f, extname(f)))))].sort(),
      has: (stem) => names.some((f) => basename(f, extname(f)) === stem),
      read: async (stem) => {
        const hit = names.find((f) => basename(f, extname(f)) === stem);
        return readFileSync(join(dir, hit));
      },
    };
  }

  if (!opts.run) {
    console.error("--from r2 needs --run <runId>.");
    process.exit(1);
  }
  const client = createR2Client(credentialsFromEnv());
  let keys = null;
  const load = async () => (keys ??= await client.list(`illustrations/${opts.run}/`));
  return {
    describe: `r2://${client.bucket}/illustrations/${opts.run}/`,
    list: async () => {
      const all = await load();
      const ids = new Set();
      for (const k of all) {
        // Either artifact names the id: a transparent run uploads only
        // `cutout.png`, an opaque one only `original.png`.
        const m = /^illustrations\/[^/]+\/([^/]+)\/v\d+\/(?:original|cutout)\.png$/.exec(k);
        if (m) ids.add(m[1]);
      }
      return [...ids].sort();
    },
    has: async (stem) => {
      const all = await load();
      const isCutout = stem.endsWith(CUTOUT_SUFFIX);
      const id = isCutout ? stem.slice(0, -CUTOUT_SUFFIX.length) : stem;
      return all.includes(candidateKey(opts.run, id, opts.variant, isCutout ? "cutout" : "original"));
    },
    read: async (stem) => {
      const isCutout = stem.endsWith(CUTOUT_SUFFIX);
      const id = isCutout ? stem.slice(0, -CUTOUT_SUFFIX.length) : stem;
      return client.get(candidateKey(opts.run, id, opts.variant, isCutout ? "cutout" : "original"));
    },
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.ids.length && !opts.all)) return printHelp();

  const source = makeSource(opts);
  const ids = opts.all ? await source.list() : opts.ids;
  if (!ids.length) {
    console.error(`No candidates found in ${source.describe}`);
    process.exit(1);
  }

  // An id with a cut-out promotes the cut-out alone: every surface reads the
  // `-cutout` slug, so the opaque `<id>.webp` renders nowhere and promoting
  // it costs ~0.22 MB of git per figure. `--with-original` overrides.
  const stems = [];
  for (const id of ids) {
    const hasCutout = opts.cutout && (await source.has(`${id}${CUTOUT_SUFFIX}`));
    if (!hasCutout || opts.withOriginal) stems.push(id);
    if (hasCutout) stems.push(`${id}${CUTOUT_SUFFIX}`);
  }

  console.log(
    `Promoting ${stems.length} image(s) from ${source.describe} ` +
      `→ public/images (webp q${opts.quality}${
        opts.maxWidth ? `, ≤${opts.maxWidth}px wide` : ""
      })${opts.dryRun ? " [dry-run]" : ""}\n`,
  );

  if (!opts.dryRun) mkdirSync(OUT_DIR, { recursive: true });
  let promoted = 0;
  let before = 0;
  let after = 0;
  for (const stem of stems) {
    if (!(await source.has(stem))) {
      console.error(`  ✗ ${stem}: not found in source`);
      continue;
    }
    const raw = await source.read(stem);

    // Trim before the one encode below — a later pass over the promoted WebP
    // would be a second lossy generation (see header).
    const isCutout = stem.endsWith(CUTOUT_SUFFIX);
    const axes = isCutout ? trimAxesFor(stem.slice(0, -CUTOUT_SUFFIX.length)) : null;
    const trimmed = isCutout ? await trimCutout(raw, axes) : raw;
    const webp = await toWebpSource(trimmed, opts.quality, opts.maxWidth);
    before += raw.length;
    after += webp.length;
    const out = join(OUT_DIR, `${stem}.webp`);
    if (!opts.dryRun) writeFileSync(out, webp);
    promoted++;
    console.log(
      `  ✓ ${stem}.webp  ${(raw.length / 1e6).toFixed(2)}MB → ${(webp.length / 1e6).toFixed(2)}MB` +
        (trimmed === raw ? "" : `  (trimmed ${axes === "both" ? "on both axes" : "vertically"})`),
    );
  }

  const saved = before - after;
  console.log(
    `\n${promoted} promoted · ${(before / 1e6).toFixed(1)}MB → ${(after / 1e6).toFixed(1)}MB ` +
      `(${saved > 0 ? (before / after).toFixed(1) : "1.0"}x smaller)`,
  );

  if (opts.dryRun) return;
  if (!opts.build) {
    console.log("Skipped build-images (--no-build); run `npm run build:images` before committing.");
    return;
  }
  console.log("\nRunning build-images…");
  execFileSync(process.execPath, [join(ROOT, "scripts", "build-images.mjs")], {
    stdio: "inherit",
  });
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
