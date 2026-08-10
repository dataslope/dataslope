#!/usr/bin/env node
/**
 * Trim the transparent margins off promoted cut-out illustrations.
 *
 * Background removal leaves the subject floating in the frame it was generated
 * in, so a 1536x1024 cut-out is typically 1536x1024 of *layout* carrying rather
 * less than that of drawing. `<Figure>` renders at the full content width with
 * `height: auto`, so every transparent row is vertical space a lesson pays for
 * and no one sees. Measured across all 916 promoted cut-outs, the blank band
 * above and below the artwork is a median 11% of the image's height, and 41 of
 * them are over 30%.
 *
 * **Which margins go depends on where the image is painted.** `--axes` picks,
 * and its default, `auto`, asks `trimAxesFor` in `scripts/lib/cutouts.mjs`:
 *
 *   - **In-lesson figures: vertical only.** The left/right margins are left
 *     exactly as they are. Horizontal blank costs nothing in a page that
 *     scrolls, and cropping it would make each figure a different width, so a
 *     run of lessons would stop sharing an edge.
 *   - **Thumbnails: both axes.** A course or interview-prep thumbnail is
 *     painted ~100px wide inside a fixed box, and there the same reasoning runs
 *     the other way: a blank column is drawing surface the subject does not
 *     get, at exactly the size where it can least afford to be small. Nothing
 *     shares an edge with it — each one sits alone in its own box — so the
 *     ragged widths that rule out cropping a figure cost nothing here.
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
 * How a row or column is judged blank: a pixel counts as drawn once its alpha
 * clears `--alpha` (16 by default, which ignores the faint halo a background
 * remover leaves), and a line counts as drawn once `--frac` of its pixels are
 * (0.2%, so a stray speck of leftover background cannot defeat the trim).
 * `--pad` of the original width/height is then kept around the content so
 * nothing sits flush against the edge. On all 916 cut-outs the speck-tolerant
 * rule and a strict any-drawn-pixel rule pick the same bounds, so the tolerance
 * costs nothing today and guards a future messier cut-out.
 *
 * Idempotent: a second run finds each image already tight and skips it under
 * `--min-gain`.
 *
 * Re-running is safe and produces no git churn: the crop is derived from the
 * pristine PNG and WebP encoding is deterministic, so an already-trimmed image
 * is rewritten with the same bytes it already had.
 *
 * Usage:
 *   node scripts/trim-cutouts.mjs <ids...> [options]
 *   node scripts/trim-cutouts.mjs --prefix python-basics-
 *   node scripts/trim-cutouts.mjs --all
 *
 * Ids are prompt ids (e.g. `python-basics-loops`), the same strings promotion
 * takes; the `-cutout` suffix is added for you.
 *
 * Options:
 *   --all            Trim every promoted cut-out
 *   --prefix <s>     Trim every promoted cut-out whose id starts with this
 *   --axes <mode>    auto | vertical | both (default: auto — per id, see above)
 *   --from r2|local  Pixel source (default: r2, falling back to local per image)
 *   --concurrency <n> Images in flight at once (default: 6)
 *   --alpha <n>      Alpha above which a pixel counts as drawn (default: 16)
 *   --frac <n>       Fraction of a row/column that must be drawn (default: 0.002)
 *   --pad <n>        Padding kept, as a fraction of the frame (default: 0.02)
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
import { toWebpSource } from "./promote-illustrations.mjs";
import {
  contentBounds,
  contentSignature,
  createCandidateIndex,
  trimAxesFor,
  trimPlan,
} from "./lib/cutouts.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, "public", "images");
const CUTOUT_SUFFIX = "-cutout";


function parseArgs(argv) {
  const opts = {
    ids: [],
    all: false,
    prefix: null,
    axes: "auto",
    from: "r2",
    concurrency: 6,
    alpha: 16,
    frac: 0.002,
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
      case "--all": opts.all = true; break;
      case "--prefix": opts.prefix = next(); break;
      case "--axes": opts.axes = next(); break;
      case "--from": opts.from = next(); break;
      case "--concurrency": opts.concurrency = Math.max(1, Number(next()) || 6); break;
      case "--alpha": opts.alpha = Math.max(0, Number(next()) || 0); break;
      case "--frac": opts.frac = Math.max(0, Number(next()) || 0); break;
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

/** Promoted cut-out slugs to work on, resolved against public/images. */
function resolveSlugs(opts) {
  const promoted = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(`${CUTOUT_SUFFIX}.webp`))
    .map((f) => f.slice(0, -".webp".length))
    .sort();
  if (opts.all) return promoted;
  if (opts.prefix) return promoted.filter((s) => s.startsWith(opts.prefix));
  return opts.ids.map((id) => `${id}${CUTOUT_SUFFIX}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.ids.length && !opts.prefix && !opts.all)) return printHelp();

  if (!["auto", "vertical", "both"].includes(opts.axes)) {
    console.error(`--axes must be auto, vertical or both (got ${opts.axes}).`);
    process.exit(1);
  }

  const slugs = resolveSlugs(opts);
  if (!slugs.length) {
    console.error("No promoted cut-outs matched.");
    process.exit(1);
  }

  const r2 = opts.from === "r2" ? createCandidateIndex() : null;
  console.log(
    `Trimming ${slugs.length} cut-out(s)` +
      (opts.axes === "auto" ? "" : `, ${opts.axes === "both" ? "on both axes" : "vertically only"}`) +
      (r2 ? `, preferring pristine PNGs from ${r2.describe}` : ", from the served WebP") +
      (opts.dryRun ? " (dry run)" : "") +
      "\n",
  );

  let trimmed = 0;
  let skipped = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;
  let areaBefore = 0;
  let areaAfter = 0;

  async function trimOne(slug) {
    const file = join(OUT_DIR, `${slug}.webp`);
    if (!existsSync(file)) {
      console.error(`  ✗ ${slug}: not promoted (no ${slug}.webp)`);
      failed++;
      return;
    }
    const served = readFileSync(file);
    try {
      const id = slug.slice(0, -CUTOUT_SUFFIX.length);
      const found = r2 ? await r2.sourceFor(id, await contentSignature(served)) : null;
      const match = found?.hit ?? null;
      const source = match ? match.buf : served;
      const origin = match
        ? `r2 ${match.key.split("/")[1]} (${match.db.toFixed(0)}dB)`
        : `served webp; ${
            found?.bestDb == null
              ? "no R2 candidate"
              : `best R2 candidate only ${found.bestDb.toFixed(0)}dB`
          }`;

      const axes = opts.axes === "auto" ? trimAxesFor(id) : opts.axes;
      const bounds = await contentBounds(source, { alpha: opts.alpha, frac: opts.frac });
      const plan = trimPlan(bounds, { pad: opts.pad, minGain: opts.minGain, axes });
      if (!plan) {
        console.log(`  • skip ${slug} (${bounds.empty ? "fully transparent" : "already tight"})`);
        skipped++;
        return;
      }

      // Crop to a PNG rather than straight to WebP so the one definition of
      // the served encode stays `toWebpSource`. PNG is lossless, so the
      // hand-off adds nothing to the image; leaving the format off instead
      // would re-encode a WebP source at sharp's default quality 80, which is
      // a real loss for the local fallback path.
      const cropped = await sharp(source)
        .extract({ left: plan.left, top: plan.top, width: plan.width, height: plan.height })
        .png({ compressionLevel: 0 })
        .toBuffer();

      // Re-apply whatever downscale promotion applied. Some art is promoted
      // with `--max-width` because it is only ever painted small — the auth
      // globe pins are 264px wide for a 36 CSS px slot — and re-cropping from
      // the 1024px pristine PNG would silently undo that, handing those pins
      // back at full resolution and five times the bytes for detail no one can
      // see. The served file's own width is the record of that decision, so it
      // is what the new encode is held to.
      //
      // Held against the *crop's* width, not the source frame's: a thumbnail's
      // served file is legitimately narrower than the PNG it came from, because
      // the crop took its side margins, and measuring against the frame would
      // read that as a downscale and pin every re-trim to the width of the
      // previous one.
      const servedMeta = await sharp(served).metadata();
      const keepWidth = servedMeta.width < plan.width ? servedMeta.width : null;
      const out = await toWebpSource(cropped, opts.quality, keepWidth);
      const outMeta = await sharp(out).metadata();

      if (!opts.dryRun) writeFileSync(file, out);
      trimmed++;
      bytesBefore += served.length;
      bytesAfter += out.length;
      areaBefore += servedMeta.width * servedMeta.height;
      areaAfter += outMeta.width * outMeta.height;
      console.log(
        `  ✓ ${slug.padEnd(44)} ${servedMeta.width}x${servedMeta.height} → ` +
          `${outMeta.width}x${outMeta.height}  −${(plan.removed * 100).toFixed(0)}% ` +
          `${axes === "both" ? "box" : "height"}  ` +
          `${(served.length / 1024).toFixed(0)}kB → ${(out.length / 1024).toFixed(0)}kB  [${origin}]`,
      );
    } catch (err) {
      failed++;
      console.error(`  ✗ ${slug}: ${err.message}`);
    }
  }

  // Each image is a download, a decode, a crop and an encode, so the run is
  // alternately network- and CPU-bound and neither saturates on its own. A
  // handful of workers keeps both busy; the images are independent and each
  // writes only its own file, so there is nothing to coordinate beyond the
  // counters above.
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(opts.concurrency, slugs.length) }, async () => {
      while (next < slugs.length) await trimOne(slugs[next++]);
    }),
  );

  console.log(
    `\n${trimmed} trimmed · ${skipped} skipped · ${failed} failed` +
      (trimmed
        ? `\nlayout box −${(100 * (1 - areaAfter / areaBefore)).toFixed(1)}% across the set · ` +
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
