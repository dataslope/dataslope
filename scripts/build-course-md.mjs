#!/usr/bin/env node
/**
 * Emit each course lesson's raw MDX as a static `.md` asset under
 * `public/courses/` (gitignored), mirroring the lesson's public URL:
 *
 *   content/courses/<course>/<lesson>.mdx → public/courses/<course>/<lesson>.md
 *   content/courses/<course>/index.mdx    → public/courses/<course>.md
 *
 * These back the "Copy Markdown" / "View as Markdown" page actions
 * (`${page.url}.md`). Plain public/ files are served by the Workers assets
 * layer before the Worker runs — no rewrite, route handler, or per-lesson
 * prerender. The slug mapping must match how Fumadocs derives lesson URLs
 * (no course file uses a `slug:` frontmatter override).
 *
 * Cached on an input hash (scripts/lib/build-cache.mjs). Runs from `dev` and
 * `build`; postinstall skips it.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectFiles, freshness } from "./lib/build-cache.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = join(ROOT, "content", "courses");
const OUT_DIR = join(ROOT, "public", "courses");

const files = collectFiles(SRC_DIR, (name) => /\.mdx?$/i.test(name));

const cache = freshness(ROOT, "course-md", {
  inputs: [fileURLToPath(import.meta.url), ...files],
  // OUT_DIR itself is the output; spot-check one expected file so a wiped
  // directory with a stale manifest still regenerates.
  outputs: files.length ? [join(ROOT, "public", `${lessonStem(files[0])}.md`)] : [],
});
if (cache.fresh) {
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
cache.commit();
console.log(`[course-md] wrote ${count} raw-Markdown mirrors to public/courses/`);
