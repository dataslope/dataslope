#!/usr/bin/env node
/**
 * Key the flat background out of a generated illustration, producing a PNG with
 * a real alpha channel that sits correctly on both the light (#ffffff) and dark
 * (#121212) page backgrounds.
 *
 * Why this exists rather than a background-removal API:
 *
 * GPT Image 2 cannot emit transparency (the API rejects `background:
 * "transparent"`, and asking for it in the prompt just makes the model paint a
 * fake checkerboard). The usual fix is a hosted matting service, but those are
 * salience models trained on photographs of people and products. Our inputs are
 * flat vector / risograph art on a background *we specified in the prompt*, so
 * we know its exact colour — and classical keying beats a learned matte
 * whenever you have that ground truth. It is also free and deterministic.
 *
 * How it works:
 *
 *   1. Flood-fill inward from the frame, through pixels within `--hi` of the
 *      background colour. Filling from the frame (rather than thresholding the
 *      whole image) is what keeps interior whites — eyes, teeth, a cream belly,
 *      a highlight — opaque instead of punching holes through the subject.
 *   2. Give the filled region a *soft* alpha ramp between `--lo` and `--hi`
 *      rather than a binary cut, so anti-aliased edges stay smooth.
 *   3. Decontaminate each partial pixel. An edge pixel is a blend
 *      C = a*F + (1-a)*B, so the true foreground is F = (C - (1-a)*B) / a.
 *      Skipping this step is what leaves the tell-tale white halo when the
 *      cut-out is composited onto a dark background.
 *
 * An image whose background is not flat (a full-bleed scene, a blueprint field)
 * has nothing to key; the script reports it and leaves it alone rather than
 * chewing a hole in the artwork.
 *
 * Usage:
 *   node scripts/remove-image-background.mjs <in.png|dir> [options]
 *
 * Options:
 *   --out <dir>      Output directory (default: alongside the input, "-cutout")
 *   --lo <n>         Colour distance fully transparent below this (default: 18)
 *   --hi <n>         Colour distance fully opaque above this (default: 64)
 *   --min-bg <pct>   Skip if less than this share of pixels key out (default: 5)
 *   --force          Overwrite existing outputs
 *   -h, --help       Show this help
 */
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

function parseArgs(argv) {
  const opts = { input: null, out: null, lo: 18, hi: 64, minBg: 5, force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--out": opts.out = next(); break;
      case "--lo": opts.lo = Number(next()); break;
      case "--hi": opts.hi = Number(next()); break;
      case "--min-bg": opts.minBg = Number(next()); break;
      case "--force": opts.force = true; break;
      case "-h":
      case "--help": opts.help = true; break;
      default:
        if (!a.startsWith("-") && opts.input === null) opts.input = a;
        else { console.error(`Unknown argument: ${a}`); process.exit(1); }
    }
  }
  return opts;
}

/** Squared RGB distance, avoiding a sqrt in the inner loop. */
function dist2(data, i, bg) {
  const dr = data[i] - bg[0];
  const dg = data[i + 1] - bg[1];
  const db = data[i + 2] - bg[2];
  return dr * dr + dg * dg + db * db;
}

/**
 * Key one image. Returns {keyed, skipped, reason} — `keyed` is the share of
 * pixels made fully or partly transparent.
 */
export async function keyImage(inPath, outPath, opts) {
  const src = sharp(inPath).ensureAlpha();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;

  // Background colour: the top-left pixel. Every prompt that is meant to be cut
  // out asks for a plain field, so the corner is the background by construction.
  const bg = [data[0], data[1], data[2]];
  const lo2 = opts.lo * opts.lo;
  const hi2 = opts.hi * opts.hi;

  // Flood-fill inward from the frame through near-background pixels.
  const reached = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  const push = (x, y) => {
    const p = y * w + x;
    if (!reached[p]) stack[sp++] = p;
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

  while (sp > 0) {
    const p = stack[--sp];
    if (reached[p]) continue;
    if (dist2(data, p * channels, bg) > hi2) continue; // hit the subject
    reached[p] = 1;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  let cleared = 0;
  for (let p = 0; p < w * h; p++) if (reached[p]) cleared++;
  const keyed = cleared / (w * h);
  if (keyed * 100 < opts.minBg) {
    return { keyed, skipped: true, reason: `only ${(keyed * 100).toFixed(1)}% keyed — background is not flat` };
  }

  // Guard against the damaging case: a full-bleed scene (a blueprint field, a
  // photographic desk) has no background to key, but it often carries a thin
  // near-uniform margin. Keying that just gnaws a ragged border off the artwork
  // and leaves it looking cropped rather than cut out. Detect it by measuring
  // what the surviving opaque pixels still cover — a real cut-out shrinks to a
  // subject, a trimmed margin still spans essentially the whole canvas.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let p = 0; p < w * h; p++) {
    if (reached[p]) continue;
    const x = p % w;
    const y = (p / w) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const coverage = ((maxX - minX + 1) / w) * ((maxY - minY + 1) / h);
  if (keyed < 0.3 && coverage > 0.95) {
    return {
      keyed,
      skipped: true,
      reason:
        `subject still covers ${(coverage * 100).toFixed(0)}% of the canvas after keying ` +
        `${(keyed * 100).toFixed(1)}% — full-bleed art, nothing to cut out`,
    };
  }

  // Soft matte + background decontamination.
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const si = p * channels;
    const di = p * 4;
    const r = data[si], g = data[si + 1], b = data[si + 2];
    if (!reached[p]) {
      out[di] = r; out[di + 1] = g; out[di + 2] = b; out[di + 3] = 255;
      continue;
    }
    const d2 = dist2(data, si, bg);
    if (d2 <= lo2) { out[di + 3] = 0; continue; }
    const a = Math.min(1, (Math.sqrt(d2) - opts.lo) / (opts.hi - opts.lo));
    // F = (C - (1-a)*B) / a
    out[di] = Math.max(0, Math.min(255, Math.round((r - (1 - a) * bg[0]) / a)));
    out[di + 1] = Math.max(0, Math.min(255, Math.round((g - (1 - a) * bg[1]) / a)));
    out[di + 2] = Math.max(0, Math.min(255, Math.round((b - (1 - a) * bg[2]) / a)));
    out[di + 3] = Math.round(a * 255);
  }

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  return { keyed, skipped: false };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.input) {
    const src = await import("node:fs").then((m) => m.readFileSync(fileURLToPath(import.meta.url), "utf8"));
    console.log(src.slice(src.indexOf("/**"), src.indexOf("*/") + 2).replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "").trim());
    return;
  }

  const isDir = statSync(opts.input).isDirectory();
  const files = isDir
    ? readdirSync(opts.input).filter((f) => /\.png$/i.test(f)).map((f) => join(opts.input, f))
    : [opts.input];
  const outDir = opts.out || (isDir ? `${opts.input}-cutout` : ".");
  mkdirSync(outDir, { recursive: true });

  let done = 0, skipped = 0;
  for (const f of files.sort()) {
    const outPath = join(outDir, `${basename(f, extname(f))}.png`);
    if (!opts.force && existsSync(outPath)) { console.log(`  • skip ${basename(f)} (exists)`); continue; }
    const r = await keyImage(f, outPath, opts);
    if (r.skipped) { skipped++; console.log(`  – ${basename(f)}: ${r.reason}`); }
    else { done++; console.log(`  ✓ ${basename(f)}: ${(r.keyed * 100).toFixed(1)}% transparent`); }
  }
  console.log(`\n${done} keyed, ${skipped} left alone. Output in ${outDir}`);
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
