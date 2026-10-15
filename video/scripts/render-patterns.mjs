#!/usr/bin/env node
/**
 * Renders the Tabbied patterns each video lists in
 * src/videos/<video>/patterns.json to SVG under public/patterns/<video>/, in
 * the brand palette.
 *
 * Tabbied (https://tabbied.com, MIT) draws its patterns with css-doodle in a
 * browser, so this runs its CLI, which drives Chromium through Playwright.
 * Pre-rendering is deliberate: a seeded SVG is identical on every frame and
 * every machine, where mounting the live pattern in each Remotion tab would
 * redraw it per tab and cost a browser layout on every frame.
 *
 * Colors are brand token names ("blue", "teal-300", "transparent"), resolved
 * against app/brand.css so no hex value is written here.
 *
 * Usage:
 *   node scripts/render-patterns.mjs                 # every video's patterns
 *   node scripts/render-patterns.mjs <video>         # one video's
 *   node scripts/render-patterns.mjs <video> --only name[,name]
 *
 * Needs a Chromium: Playwright's own download, or TABBIED_CHROMIUM=<path>.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VIDEO = dirname(dirname(fileURLToPath(import.meta.url)));
const BRAND_CSS = join(VIDEO, "..", "app", "brand.css");
const CLI = join(VIDEO, "node_modules", "tabbied", "dist", "cli.js");

const tokens = Object.fromEntries(
  [...readFileSync(BRAND_CSS, "utf8").matchAll(/--ds-([a-z]+-\d+):\s*(#[0-9a-f]{6})/gi)].map(
    (m) => [m[1].toLowerCase(), m[2]],
  ),
);

/** "blue" → --ds-blue-500, "teal-300" → --ds-teal-300, "transparent" as is. */
function color(name) {
  if (name === "transparent") return name;
  const key = /-\d+$/.test(name) ? name : `${name}-500`;
  const hex = tokens[key];
  if (!hex) throw new Error(`No --ds-${key} in app/brand.css`);
  return hex;
}

const args = process.argv.slice(2);
const onlyIdx = args.indexOf("--only");
const only = onlyIdx > -1 ? new Set(args[onlyIdx + 1].split(",")) : null;
const videosDir = join(VIDEO, "src", "videos");
const videos = args[0] && !args[0].startsWith("--")
  ? [args[0]]
  : readdirSync(videosDir).filter((v) => existsSync(join(videosDir, v, "patterns.json")));

for (const video of videos) {
  const { patterns } = JSON.parse(readFileSync(join(videosDir, video, "patterns.json"), "utf8"));
  const dir = join(VIDEO, "public", "patterns", video);
  mkdirSync(dir, { recursive: true });
  for (const p of patterns) {
    if (only && !only.has(p.name)) continue;
    renderOne(p, join(dir, `${p.name}.svg`), video);
  }
}

function renderOne(p, out, video) {
  const cli = [
    CLI,
    "render",
    p.design,
    "--seed",
    p.seed,
    "--size",
    p.size,
    "--palette",
    p.palette.map(color).join(","),
    "--fit",
    p.fit ?? "grid",
    "--out",
    out,
  ];
  if (p.options) cli.push("--options", p.options);
  execFileSync(process.execPath, cli, { stdio: ["ignore", "ignore", "inherit"] });
  console.log(
    `  ✓ ${video}/${p.name}  ${p.design} @ ${p.size}  (${Math.round(statSync(out).size / 1024)} kB)`,
  );
}
