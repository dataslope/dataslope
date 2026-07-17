#!/usr/bin/env node
/**
 * Generate the static data file behind the `/svg-gallery` dev page.
 *
 * Why this exists:
 *
 * The gallery embeds every hand-authored inline `<svg>` across ~800 lessons.
 * Rendered server-side into the prerendered page, that multi-hundred-kB
 * payload lives in Vercel's durable ISR store, and every edge-cache miss
 * (each region, each eviction, each prefetch) re-reads it as billed ISR
 * Reads, the gallery was the single largest ISR reader on the project.
 *
 * Instead, the page is now a tiny static shell and the heavy payload ships
 * as `public/svg-gallery/data.json`, a plain static asset that the client
 * fetches on mount. Files under `public/` are served straight from the CDN
 * and never touch the ISR store, so opening the gallery costs zero ISR
 * Reads. A slower first paint is fine, the page is a development review
 * tool.
 *
 * The collector (`lib/svgGallery.ts`) is TypeScript that shares its
 * unit-tested extraction helpers with the `remarkSvgLabels` build plugin, so
 * this script bundles it with esbuild into node_modules/.cache and imports
 * the bundle, the same esbuild-at-build-time approach as
 * `build-almostnode-workers.mjs`.
 *
 * Idempotent. Runs from the `dev` and `build` scripts; the JSON reflects the
 * content at the time the dev server started, so restart `next dev` (or run
 * `npm run build:svg-gallery`) to pick up newly authored graphics.
 */

import { build } from "esbuild";
import { readdirSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  collectFiles,
  hashInputs,
  isFresh,
  writeManifest,
} from "./lib/build-cache.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BUNDLE = join(ROOT, "node_modules", ".cache", "svg-gallery", "svgGallery.mjs");
const OUT_DIR = join(ROOT, "public", "svg-gallery");
const OUT_FILE = join(OUT_DIR, "data.json");

// Skip the esbuild + full content walk when nothing that feeds the gallery
// changed: the walked content sections (lib/svgGallery.ts SECTIONS), the
// top-level lib/*.ts modules the bundle is built from, and this script.
// See scripts/lib/build-cache.mjs.
const CACHE_NAME = "svg-gallery";
const inputsHash = hashInputs(ROOT, [
  fileURLToPath(import.meta.url),
  ...collectFiles(join(ROOT, "content", "courses")),
  ...collectFiles(join(ROOT, "content", "fumadocs-dev")),
  // Top-level lib/*.ts only: that's where svgGallery.ts and the modules it
  // bundles (extractSvgGraphics, jsxSvgToHtml, …) live.
  ...readdirSync(join(ROOT, "lib"))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => join(ROOT, "lib", name)),
]);
if (isFresh(ROOT, CACHE_NAME, inputsHash, [OUT_FILE])) {
  console.log("[svg-gallery] up to date (inputs unchanged), skipping");
  process.exit(0);
}

await mkdir(dirname(BUNDLE), { recursive: true });
await build({
  entryPoints: [join(ROOT, "lib", "svgGallery.ts")],
  outfile: BUNDLE,
  bundle: true,
  platform: "node",
  format: "esm",
  // Bundle only the repo's own TS modules; npm packages (remark etc.) stay
  // external and resolve from node_modules when the bundle is imported.
  packages: "external",
});

const { getSvgGallery } = await import(pathToFileURL(BUNDLE).href);
const courses = getSvgGallery();
const total = courses.reduce((n, c) => n + c.graphics.length, 0);

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });
const json = JSON.stringify(courses);
await writeFile(OUT_FILE, json);
writeManifest(ROOT, CACHE_NAME, inputsHash);

console.log(
  `[svg-gallery] wrote public/svg-gallery/data.json, ${total} graphics in ` +
    `${courses.length} courses (${Math.round(json.length / 1024)} kB)`,
);
