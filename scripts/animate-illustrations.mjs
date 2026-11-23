#!/usr/bin/env node
/**
 * Animated versions of promoted cut-outs, drawn by GPT Image 2.6's native GIF
 * output (`output_format: "gif"` + `frame_count`) and served as animated WebP.
 *
 *   node scripts/animate-illustrations.mjs generate [--only id,id] [--out dir]
 *   node scripts/animate-illustrations.mjs encode   [--only id,id] [--out dir]
 *
 * `generate` sends the served `public/images/<id>-cutout.webp` to
 * /v1/images/edits as the reference image, with the motion described in
 * `data/illustration-animations.json`, and writes the GIF the model returns
 * to `<out>/<id>.gif` (default `generated-illustrations/animations`, which is
 * gitignored run state like the rest of the generator's output). Synchronous:
 * 2.6 is not offered on the Batch API.
 *
 * `encode` turns each GIF into `public/images/<id>-animated.webp`. The model
 * redraws the scene and re-frames it (the subject usually comes back larger
 * in its frame), so the frames are scaled and placed to land on the static
 * cut-out's own footprint: same canvas aspect, same subject width, same
 * baseline. That keeps the animated file a drop-in for the static one, with
 * the static manifest entry's width/height still reserving the right box.
 * An entry's optional `maxWidth` caps the canvas for art that is only ever
 * painted small: the bento icons render at 160px, so 320 covers a 2x screen
 * and cuts each file to roughly a third.
 *
 * Two things about the GIF format are worth knowing before you change this:
 *
 * - The frames come back as a sheet laid out four across and two down, and
 *   the sheet's longest edge is capped at 3840px, so a frame is at most 960px
 *   wide. 16 frames fit at 512x512; the 3:2 hero fits 8 at 960x640.
 *   (16 at 768x512 is accepted, but came back visibly worse: a wavy platform
 *   edge and smudges.) Every frame is 200ms.
 * - GIF transparency is on/off, with no partial alpha. The edges are hard but
 *   carry no halo, and the downscale here (plus the browser's, to the
 *   ~160px a bento icon is painted at) softens them. WebP keeps the result
 *   at a fraction of the GIF's bytes.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SPEC_FILE = join(ROOT, "data", "illustration-animations.json");
const IMAGES_DIR = join(ROOT, "public", "images");
const API = "https://api.openai.com/v1/images/edits";

/** Alpha at or above this counts as part of the subject when measuring. */
const ALPHA_SOLID = 128;
/** WebP settings. Lossy colour (it is a redraw at low quality already) with a
 *  lossless alpha plane, since the GIF's mask is the edge. Every frame is a
 *  fresh redraw, so there is little for inter-frame coding to share and the
 *  bytes scale with the frame count: measured on a 16-frame icon, quality 85
 *  was 186 KB, 75 is 155 KB, and `minSize`/`mixed` bought nothing for 17x
 *  the time. */
const WEBP = { quality: 75, alphaQuality: 100, effort: 4, loop: 0 };

function parseArgs(argv) {
  const opts = { command: argv[0], only: null, out: join(ROOT, "generated-illustrations", "animations") };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--only") opts.only = new Set(argv[++i].split(",").map((s) => s.trim()).filter(Boolean));
    else if (a === "--out") opts.out = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

export function buildPrompt(meta, entry) {
  return meta.promptTemplate
    .replace("{motion}", entry.motion)
    .replace("{keep}", entry.keep ? `, ${entry.keep}` : "");
}

/** The served cut-out, letterboxed (centred, transparent) into the frame size. */
async function referenceImage(id, width, height) {
  const src = join(IMAGES_DIR, `${id}-cutout.webp`);
  if (!existsSync(src)) throw new Error(`${id}: no promoted cut-out at ${src}`);
  return sharp(src)
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function generate(meta, entry, outDir) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set.");
  const [w, h] = entry.size.split("x").map(Number);
  const form = new FormData();
  form.set("model", meta.model);
  form.set("prompt", buildPrompt(meta, entry));
  form.set("size", entry.size);
  form.set("quality", meta.quality);
  form.set("background", meta.background);
  form.set("output_format", "gif");
  form.set("frame_count", String(entry.frames));
  form.set("n", "1");
  form.set("image[]", new Blob([await referenceImage(entry.id, w, h)], { type: "image/png" }), "reference.png");

  const t0 = Date.now();
  // Not retried: a resent generation is billed twice.
  const res = await fetch(API, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!res.ok) throw new Error(`${entry.id}: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  const gif = Buffer.from(json.data[0].b64_json, "base64");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${entry.id}.gif`), gif);
  console.log(
    `${entry.id}: ${entry.frames} frames at ${entry.size}, ${(gif.length / 1024).toFixed(0)} KB, ` +
      `${json.usage?.output_tokens ?? "?"} output tokens, ${((Date.now() - t0) / 1000).toFixed(0)}s`,
  );
}

/** Bounding box of pixels with alpha >= ALPHA_SOLID across every frame. */
function alphaBox(data, width, height, frames = 1) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let f = 0; f < frames; f++) {
    for (let y = 0; y < height; y++) {
      const row = (f * height + y) * width * 4;
      for (let x = 0; x < width; x++) {
        if (data[row + x * 4 + 3] >= ALPHA_SOLID) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
  }
  if (x1 < 0) throw new Error("image has no opaque pixels");
  return { x0, y0, x1: x1 + 1, y1: y1 + 1, w: x1 + 1 - x0, h: y1 + 1 - y0 };
}

/**
 * Where the animation goes. The canvas has the static cut-out's aspect at the
 * animation's native resolution: the animation's subject width maps onto the
 * static subject width, centred on it, standing on the same baseline. When a
 * motion reaches higher than the static art does (a trophy raised overhead),
 * everything shrinks just enough to keep it inside the canvas.
 */
export function placement(staticSize, staticBox, animBox, maxWidth = Infinity) {
  // canvas px per static px: the animation's native resolution, unless that
  // would make the canvas wider than the art is ever painted.
  const k = Math.min(animBox.w / staticBox.w, maxWidth / staticSize.width);
  const W = Math.round(staticSize.width * k);
  const H = Math.round(staticSize.height * k);
  const cx = ((staticBox.x0 + staticBox.x1) / 2) * k;
  const bottom = staticBox.y1 * k;
  const scale = (staticBox.w * k) / animBox.w;
  const fit = Math.min(1, bottom / (animBox.h * scale), (2 * Math.min(cx, W - cx)) / (animBox.w * scale));
  const w = Math.round(animBox.w * scale * fit);
  const h = Math.round(animBox.h * scale * fit);
  return { W, H, w, h, left: Math.round(cx - w / 2), top: Math.round(bottom - h) };
}

async function encode(entry, outDir) {
  const gifPath = join(outDir, `${entry.id}.gif`);
  if (!existsSync(gifPath)) throw new Error(`${entry.id}: no GIF at ${gifPath}; run generate first`);
  const gif = readFileSync(gifPath);
  const meta = await sharp(gif, { animated: true }).metadata();
  const frames = meta.pages;
  const fw = meta.width;
  const fh = meta.pageHeight;
  const { data: anim } = await sharp(gif, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const staticPath = join(IMAGES_DIR, `${entry.id}-cutout.webp`);
  const { data: st, info: stInfo } = await sharp(staticPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const staticBox = alphaBox(st, stInfo.width, stInfo.height);
  const animBox = alphaBox(anim, fw, fh, frames);
  const p = placement(stInfo, staticBox, animBox, entry.maxWidth);

  const out = Buffer.alloc(p.W * p.H * 4 * frames);
  for (let f = 0; f < frames; f++) {
    const frame = await sharp(anim, { raw: { width: fw, height: fh * frames, channels: 4 } })
      .extract({ left: animBox.x0, top: f * fh + animBox.y0, width: animBox.w, height: animBox.h })
      .resize(p.w, p.h, { kernel: "lanczos3" })
      .raw()
      .toBuffer();
    // placement() keeps the frame inside the canvas, so rows copy whole.
    for (let y = 0; y < p.h; y++) {
      frame.copy(out, ((f * p.H + p.top + y) * p.W + p.left) * 4, y * p.w * 4, (y + 1) * p.w * 4);
    }
  }

  const delay = meta.delay?.length === frames ? meta.delay : Array(frames).fill(200);
  const webp = await sharp(out, { raw: { width: p.W, height: p.H * frames, channels: 4, pageHeight: p.H } })
    .webp({ ...WEBP, delay })
    .toBuffer();
  const dest = join(IMAGES_DIR, `${entry.id}-animated.webp`);
  writeFileSync(dest, webp);
  console.log(
    `${entry.id}: ${frames} frames, ${p.W}x${p.H} (static ${stInfo.width}x${stInfo.height}), ` +
      `${(webp.length / 1024).toFixed(0)} KB -> public/images/${entry.id}-animated.webp`,
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const spec = JSON.parse(readFileSync(SPEC_FILE, "utf8"));
  const entries = spec.animations.filter((e) => !opts.only || opts.only.has(e.id));
  if (opts.only) {
    const known = new Set(spec.animations.map((e) => e.id));
    const unknown = [...opts.only].filter((id) => !known.has(id));
    if (unknown.length) throw new Error(`Not in ${SPEC_FILE}: ${unknown.join(", ")}`);
  }
  if (opts.command === "generate") {
    // Parallel: each request is one synchronous generation, and they are few.
    await Promise.all(entries.map((e) => generate(spec.meta, e, opts.out)));
  } else if (opts.command === "encode") {
    for (const e of entries) await encode(e, opts.out);
    console.log("Run `node scripts/build-images.mjs` to record the new files in the manifest.");
  } else {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
    process.exit(opts.command ? 1 : 0);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
