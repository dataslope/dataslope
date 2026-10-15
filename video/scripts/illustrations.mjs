#!/usr/bin/env node
/**
 * Generates a video's illustrations and imports them into public/images/.
 *
 * A thin layer over the site's own pipeline (scripts/generate-illustrations.mjs
 * at the repo root), so a video gets the same house style, the same Batch API
 * pricing, the same `quality: low` default, the same transparent background
 * and the same alpha check. The prompts live beside the video
 * (src/videos/<video>/illustrations.json) rather than in
 * data/illustration-prompts.json, so they never reach the site's gallery.
 *
 *   1. generate: Batch API → .generated/<video>/<id>-cutout.png (gitignored)
 *   2. import:   trim blank margins on both axes, encode WebP q92 →
 *                public/images/<video>/<id>.webp (committed)
 *
 * Usage (from video/; needs the repo root's `npm install` for sharp):
 *   node scripts/illustrations.mjs <video>               generate + import
 *   node scripts/illustrations.mjs <video> --dry-run     prompts and cost only
 *   node scripts/illustrations.mjs <video> --import      import what's on disk
 *   node scripts/illustrations.mjs <video> --only a,b    just these ids
 *   node scripts/illustrations.mjs <video> --force       redraw existing ones
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentBounds, trimPlan } from "../../scripts/lib/cutouts.mjs";

const VIDEO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// The site's sharp, the same one the crop helpers above use.
const sharp = createRequire(join(VIDEO_ROOT, "..", "package.json"))("sharp");
const GENERATOR = join(VIDEO_ROOT, "..", "scripts", "generate-illustrations.mjs");

const args = process.argv.slice(2);
const video = args[0] && !args[0].startsWith("--") ? args[0] : null;
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i > -1 ? args[i + 1] : null;
};

if (!video) {
  console.error("Usage: node scripts/illustrations.mjs <video> [--dry-run|--import] [--only ids] [--force]");
  process.exit(1);
}

const prompts = join(VIDEO_ROOT, "src", "videos", video, "illustrations.json");
if (!existsSync(prompts)) {
  console.error(`No ${prompts}`);
  process.exit(1);
}
const generated = join(VIDEO_ROOT, ".generated", video);
const served = join(VIDEO_ROOT, "public", "images", video);
const only = value("--only");

if (!flag("--import")) {
  const command = flag("--dry-run") ? "dry-run" : "run";
  const gen = [GENERATOR, command, "--prompts", prompts, "--out", generated, "--poll-interval", "10"];
  if (only) gen.push("--only", only);
  if (flag("--force")) gen.push("--force");
  execFileSync(process.execPath, gen, { stdio: "inherit" });
  if (command === "dry-run") process.exit(0);
}

// Import: crop each cut-out to its drawn content plus a 2% margin, on both
// axes (a video places every image in a box of its own choosing, so blank
// columns are only drawing surface the subject doesn't get), then encode once.
mkdirSync(served, { recursive: true });
const wanted = only ? new Set(only.split(",")) : null;
const ids = new Set(JSON.parse(readFileSync(prompts, "utf8")).prompts.map((p) => p.id));
for (const file of readdirSync(generated).filter((f) => f.endsWith("-cutout.png")).sort()) {
  const id = file.replace(/-cutout\.png$/, "");
  if (!ids.has(id) || (wanted && !wanted.has(id))) continue;
  const buf = readFileSync(join(generated, file));
  const plan = trimPlan(await contentBounds(buf), { axes: "both", minGain: 0 });
  const img = sharp(buf);
  if (plan) img.extract({ left: plan.left, top: plan.top, width: plan.width, height: plan.height });
  const out = join(served, `${id}.webp`);
  const info = await img.webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(out);
  console.log(
    `  ✓ ${id}.webp  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} kB` +
      (plan ? `  (trimmed ${Math.round(plan.removed * 100)}%)` : ""),
  );
}
