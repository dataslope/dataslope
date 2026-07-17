#!/usr/bin/env node
/**
 * Emit each course lesson's raw MDX as a static `.md` asset under
 * `public/courses/` (gitignored), mirroring the lesson's public URL:
 *
 *   content/courses/<course>/<lesson>.mdx → public/courses/<course>/<lesson>.md
 *   content/courses/<course>/index.mdx    → public/courses/<course>.md
 *
 * These are the raw-Markdown mirrors behind the page-action buttons on every
 * lesson ("Copy Markdown" / "View as Markdown" point at `${page.url}.md`).
 * They used to be served by a `force-static` route handler
 * (app/llms/courses/[[...slug]]/route.ts) reached through a
 * `/courses/:path*.md` rewrite — which made `next build` prerender ~780
 * extra route-handler outputs (one per lesson, doubling the prerender count)
 * and write them all into the R2 incremental cache on every deploy. As plain
 * `public/` files they ship once as free static assets: the Workers assets
 * layer serves them before the Worker/router runs, so no rewrite, route
 * handler, or prerender is involved. The URL surface is unchanged.
 *
 * The slug mapping matches how Fumadocs derives lesson URLs from file paths
 * (no course file uses a `slug:` frontmatter override; this is the same
 * mapping scripts/build-search-index.mjs already relies on for search links).
 *
 * Idempotent, and cached on an input hash like the other generators (see
 * scripts/lib/build-cache.mjs). Runs from `dev` and `build`; not needed by
 * typecheck/lint/tests, so postinstall skips it.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectFiles,
  hashInputs,
  isFresh,
  writeManifest,
} from "./lib/build-cache.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = join(ROOT, "content", "courses");
const OUT_DIR = join(ROOT, "public", "courses");

const files = collectFiles(SRC_DIR, (name) => /\.mdx?$/i.test(name));

const CACHE_NAME = "course-md";
const inputsHash = hashInputs(ROOT, [
  fileURLToPath(import.meta.url),
  ...files,
]);
// OUT_DIR itself is the output; spot-check one expected file so a wiped
// directory with a stale manifest still regenerates.
const probe = files.length
  ? [join(ROOT, "public", `${lessonStem(files[0])}.md`)]
  : [];
if (isFresh(ROOT, CACHE_NAME, inputsHash, probe)) {
  console.log("[course-md] up to date (inputs unchanged), skipping");
  process.exit(0);
}

/** `content/courses/a/b.mdx` → `courses/a/b`; index collapses to its dir. */
function lessonStem(absPath) {
  const rel = absPath
    .slice(SRC_DIR.length + 1)
    .replace(/\\/g, "/")
    .replace(/\.mdx?$/i, "")
    .replace(/(^|\/)index$/i, "");
  return rel ? `courses/${rel}` : "courses";
}

rmSync(OUT_DIR, { recursive: true, force: true });
let count = 0;
for (const file of files) {
  const out = join(ROOT, "public", `${lessonStem(file)}.md`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, readFileSync(file));
  count++;
}
writeManifest(ROOT, CACHE_NAME, inputsHash);
console.log(`[course-md] wrote ${count} raw-Markdown mirrors to public/courses/`);
