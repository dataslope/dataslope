#!/usr/bin/env node
/**
 * Trim the transparent top and bottom off promoted cut-out illustrations.
 *
 * Background removal leaves the subject floating in the frame it was generated
 * in, so a 1536x1024 cut-out is typically 1536x1024 of *layout* carrying rather
 * less than that of drawing. `<Figure>` renders at the full content width with
 * `height: auto`, so every transparent row is vertical space a lesson pays for
 * and no one sees. Measured across all 916 promoted cut-outs, the blank band
 * above and below the artwork is a median 11% of the image's height, and 41 of
 * them are over 30%.
 *
 * **Vertical only, on purpose.** The left/right margins are left exactly as
 * they are: horizontal blank costs nothing in a page that scrolls, and cropping
 * it would make each figure a different width, so a run of lessons would stop
 * sharing an edge. Only the wasted height is taken.
 *
 * Where the pixels come from, and why it matters:
 *
 *   - **`--from r2` (default)** re-crops the *pristine* `cutout.png` that
 *     `remove-background-kie.mjs` wrote, so the trimmed WebP is still a single
 *     lossy generation from the original — trimming costs nothing in quality.
 *     A prompt id is often present in several runs (a redraw writes a new run
 *     prefix and leaves the old one alone), so the right PNG is found by
 *     *matching pixels* against the file the site currently serves rather than
 *     by trusting a run id. The match is unambiguous in practice: the true
 *     source scores ~44 dB against the served WebP and every other run of the
 *     same id lands at 6-11 dB, so `MATCH_FLOOR` sits at 30.
 *   - **`--from local`** (and the automatic fallback when no R2 candidate
 *     matches, e.g. the run has aged out of the bucket) re-encodes the served
 *     WebP itself. That is a second lossy generation, measured at 41-49 dB
 *     premultiplied PSNR against the same crop of the original — visually
 *     lossless, but not free, which is why R2 is preferred when it can answer.
 *
 * **This script only ever reads from R2.** It never puts and never deletes, so
 * the background-removed originals in the bucket survive it untouched. The only
 * files it writes are `public/images/<id>-cutout.webp`, which are committed and
 * therefore revertible with git.
 *
 * How a row is judged blank: a pixel counts as drawn once its alpha clears
 * `--alpha` (16 by default, which ignores the faint halo a background remover
 * leaves), and a row counts as drawn once `--row-frac` of its pixels are (0.2%,
 * so a stray speck of leftover background cannot defeat the trim). `--pad` of
 * the original height is then kept above and below the content so nothing sits
 * flush against the edge. On all 916 cut-outs the speck-tolerant rule and a
 * strict any-drawn-pixel rule pick the same bounds, so the tolerance costs
 * nothing today and guards a future messier cut-out.
 *
 * Idempotent: a second run finds each image already tight and skips it under
 * `--min-gain`.
 *
 * Usage:
 *   node scripts/trim-cutouts.mjs <ids...> [options]
 *   node scripts/trim-cutouts.mjs --prefix python-basics-
 *
 * Ids are prompt ids (e.g. `python-basics-loops`), the same strings promotion
 * takes; the `-cutout` suffix is added for you.
 *
 * Options:
 *   --prefix <s>     Trim every promoted cut-out whose id starts with this
 *   --from r2|local  Pixel source (default: r2, falling back to local per image)
 *   --alpha <n>      Alpha above which a pixel counts as drawn (default: 16)
 *   --row-frac <n>   Fraction of a row that must be drawn (default: 0.002)
 *   --pad <n>        Padding kept, as a fraction of height (default: 0.02)
 *   --quality <n>    WebP quality, matching promotion (default: 92)
 *   --min-gain <n>   Skip when the trim removes less than this (default: 0.02)
 *   --no-build       Skip the build-images run afterwards
 *   --dry-run        Report what would change; write nothing
 *   -h, --help       Show this help
 *
 * R2 credentials, when --from r2: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET (see scripts/lib/r2.mjs).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { createR2Client, credentialsFromEnv } from "./lib/r2.mjs";
import { toWebpSource } from "./promote-illustrations.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, "public", "images");
const CUTOUT_SUFFIX = "-cutout";

// Premultiplied PSNR, in dB, above which an R2 candidate is accepted as the
// source of the served WebP. See the header: real matches score ~44, a
// different render of the same prompt 6-11.
const MATCH_FLOOR = 30;

function parseArgs(argv) {
  const opts = {
    ids: [],
    prefix: null,
    from: "r2",
    alpha: 16,
    rowFrac: 0.002,
    pad: 0.02,
    quality: 92,
    minGain: 0.02,
    build: true,
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--prefix": opts.prefix = next(); break;
      case "--from": opts.from = next(); break;
      case "--alpha": opts.alpha = Math.max(0, Number(next()) || 0); break;
      case "--row-frac": opts.rowFrac = Math.max(0, Number(next()) || 0); break;
      case "--pad": opts.pad = Math.max(0, Number(next()) || 0); break;
      case "--quality": opts.quality = Math.min(100, Math.max(1, Number(next()) || 92)); break;
      case "--min-gain": opts.minGain = Math.max(0, Number(next()) || 0); break;
      case "--no-build": opts.build = false; break;
      case "--dry-run": opts.dryRun = true; break;
      case "-h":
      case "--help": opts.help = true; break;
      default:
        if (a.startsWith("-")) { console.error(`Unknown argument: ${a}`); process.exit(1); }
        opts.ids.push(a.replace(new RegExp(`${CUTOUT_SUFFIX}$`), ""));
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

/**
 * First and last row of an RGBA image that carry drawn content.
 *
 * Exported for `__tests__/trimCutouts.test.ts`, which is where the alpha floor
 * and the speck tolerance are pinned against synthetic images.
 */
export async function verticalBounds(buf, { alpha = 16, rowFrac = 0.002 } = {}) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const need = Math.max(1, Math.round(width * rowFrac));

  const drawn = (y) => {
    let count = 0;
    const row = y * width * channels;
    for (let x = 0; x < width; x++) {
      if (data[row + x * channels + 3] > alpha && ++count >= need) return true;
    }
    return false;
  };

  let top = 0;
  let bottom = height - 1;
  while (top < height && !drawn(top)) top++;
  while (bottom >= top && !drawn(bottom)) bottom--;
  return { width, height, top, bottom, empty: top > bottom };
}

/**
 * Turn bounds into the crop to apply, or null when it isn't worth it.
 *
 * Returns null for a fully transparent image (nothing to centre the crop on)
 * and for one already tight enough that the trim would remove less than
 * `minGain` of its height — which is what makes a re-run a no-op instead of a
 * fresh lossy generation for a percent of nothing.
 *
 * Exported for the test suite.
 */
export function trimPlan(bounds, { pad = 0.02, minGain = 0.02 } = {}) {
  if (bounds.empty) return null;
  const padPx = Math.round(bounds.height * pad);
  const top = Math.max(0, bounds.top - padPx);
  const bottom = Math.min(bounds.height - 1, bounds.bottom + padPx);
  const height = bottom - top + 1;
  const removed = 1 - height / bounds.height;
  if (removed < minGain) return null;
  return { top, height, removed };
}

/**
 * Premultiplied PSNR between two images, in dB, at a common small size.
 *
 * Premultiplying matters: RGB under a fully transparent pixel is undefined and
 * each encoder is free to rewrite it, so a naive comparison reports a large
 * difference across the very blank regions this script is about to remove.
 */
async function similarity(a, b) {
  const signature = (buf) =>
    sharp(buf)
      .resize({ width: 128, height: 128, fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer();
  const [x, y] = await Promise.all([signature(a), signature(b)]);
  let se = 0;
  const pixels = x.length / 4;
  for (let i = 0; i < pixels; i++) {
    const xa = x[i * 4 + 3] / 255;
    const ya = y[i * 4 + 3] / 255;
    for (let k = 0; k < 3; k++) {
      const d = x[i * 4 + k] * xa - y[i * 4 + k] * ya;
      se += d * d;
    }
    const da = x[i * 4 + 3] - y[i * 4 + 3];
    se += da * da;
  }
  const mse = se / (pixels * 4);
  return mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse);
}

/** Read-only view of the cut-out PNGs in R2, indexed by prompt id. */
function makeR2Index() {
  const client = createR2Client(credentialsFromEnv());
  let byId = null;
  const load = async () => {
    if (byId) return byId;
    byId = new Map();
    for (const key of await client.list("illustrations/")) {
      const m = /^illustrations\/[^/]+\/([^/]+)\/v\d+\/cutout\.png$/.exec(key);
      if (!m) continue;
      if (!byId.has(m[1])) byId.set(m[1], []);
      byId.get(m[1]).push(key);
    }
    return byId;
  };
  return {
    describe: `r2://${client.bucket}/illustrations/`,
    /** The pristine PNG the served WebP was encoded from, or null. */
    async sourceFor(id, servedBuf) {
      const keys = (await load()).get(id) ?? [];
      let best = null;
      for (const key of keys) {
        const buf = await client.get(key);
        const db = await similarity(servedBuf, buf);
        if (!best || db > best.db) best = { key, buf, db };
      }
      return best && best.db >= MATCH_FLOOR ? best : null;
    },
  };
}

/** Promoted cut-out slugs to work on, resolved against public/images. */
function resolveSlugs(opts) {
  const promoted = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(`${CUTOUT_SUFFIX}.webp`))
    .map((f) => f.slice(0, -".webp".length));
  if (opts.prefix) {
    return promoted.filter((s) => s.startsWith(opts.prefix)).sort();
  }
  return opts.ids.map((id) => `${id}${CUTOUT_SUFFIX}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.ids.length && !opts.prefix)) return printHelp();

  const slugs = resolveSlugs(opts);
  if (!slugs.length) {
    console.error("No promoted cut-outs matched.");
    process.exit(1);
  }

  const r2 = opts.from === "r2" ? makeR2Index() : null;
  console.log(
    `Trimming ${slugs.length} cut-out(s)` +
      (r2 ? `, preferring pristine PNGs from ${r2.describe}` : ", from the served WebP") +
      (opts.dryRun ? " (dry run)" : "") +
      "\n",
  );

  let trimmed = 0;
  let skipped = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;
  let heightBefore = 0;
  let heightAfter = 0;

  for (const slug of slugs) {
    const file = join(OUT_DIR, `${slug}.webp`);
    if (!existsSync(file)) {
      console.error(`  ✗ ${slug}: not promoted (no ${slug}.webp)`);
      failed++;
      continue;
    }
    const served = readFileSync(file);
    try {
      const id = slug.slice(0, -CUTOUT_SUFFIX.length);
      const match = r2 ? await r2.sourceFor(id, served) : null;
      const source = match ? match.buf : served;
      const origin = match ? `r2 ${match.key.split("/")[1]} (${match.db.toFixed(0)}dB)` : "served webp";

      const bounds = await verticalBounds(source, { alpha: opts.alpha, rowFrac: opts.rowFrac });
      const plan = trimPlan(bounds, { pad: opts.pad, minGain: opts.minGain });
      if (!plan) {
        console.log(`  • skip ${slug} (${bounds.empty ? "fully transparent" : "already tight"})`);
        skipped++;
        continue;
      }

      // Crop to a PNG rather than straight to WebP so the one definition of
      // the served encode stays `toWebpSource`. PNG is lossless, so the
      // hand-off adds nothing to the image; leaving the format off instead
      // would re-encode a WebP source at sharp's default quality 80, which is
      // a real loss for the local fallback path.
      const cropped = await sharp(source)
        .extract({ left: 0, top: plan.top, width: bounds.width, height: plan.height })
        .png({ compressionLevel: 0 })
        .toBuffer();
      const out = await toWebpSource(cropped, opts.quality);

      // The served file's own height, not the source's: an R2 PNG and the WebP
      // promoted from it are the same size today, but --max-width promotion
      // means that is a convention rather than a guarantee, and the number the
      // report is about is the layout the site serves.
      const servedMeta = await sharp(served).metadata();
      const outMeta = await sharp(out).metadata();

      if (!opts.dryRun) writeFileSync(file, out);
      trimmed++;
      bytesBefore += served.length;
      bytesAfter += out.length;
      heightBefore += servedMeta.height;
      heightAfter += outMeta.height;
      console.log(
        `  ✓ ${slug.padEnd(44)} ${servedMeta.width}x${servedMeta.height} → ` +
          `${outMeta.width}x${outMeta.height}  −${(plan.removed * 100).toFixed(0)}% height  ` +
          `${(served.length / 1024).toFixed(0)}kB → ${(out.length / 1024).toFixed(0)}kB  [${origin}]`,
      );
    } catch (err) {
      failed++;
      console.error(`  ✗ ${slug}: ${err.message}`);
    }
  }

  console.log(
    `\n${trimmed} trimmed · ${skipped} skipped · ${failed} failed` +
      (trimmed
        ? `\nheight ${heightBefore}px → ${heightAfter}px ` +
          `(−${(100 * (1 - heightAfter / heightBefore)).toFixed(1)}% across the set) · ` +
          `bytes ${(bytesBefore / 1024).toFixed(0)}kB → ${(bytesAfter / 1024).toFixed(0)}kB`
        : ""),
  );
  if (failed > 0) process.exitCode = 1;

  if (opts.dryRun || !trimmed) return;
  if (!opts.build) {
    console.log("\nSkipped build-images (--no-build); run `npm run build:images` before committing.");
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
