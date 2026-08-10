/**
 * Build-time lookup into the generated block-output manifest.
 *
 * ── Why this reads a file instead of importing one ──────────────────────
 * It used to `import` the generated module. That is the obvious thing to
 * write and it broke the production deploy: a static import in a server
 * component is bundled into the OpenNext Worker, and Cloudflare caps a
 * Worker at 10 MiB gzipped. The manifest pushed it to 10,375 KiB, 136 KiB
 * over, and the whole upload was rejected.
 *
 * The bundle was never the right home for it either way. Both MDX routes
 * are fully prerendered (`generateStaticParams` covers every lesson), so
 * this runs during `next build` and never at request time — the output it
 * returns is baked into static HTML long before a Worker exists. Reading it
 * with `fs` keeps the bytes at build time, where they belong: esbuild
 * bundles the *path*, not the file, so the Worker carries none of it.
 *
 * The file is read once and memoised, so 303 prerendered lessons pay for
 * one parse rather than 303.
 *
 * A missing or unparseable manifest resolves to empty, which every consumer
 * already treats as "no entries": blocks show the panel they showed before
 * this feature existed. That fallback is deliberate — prepopulated output is
 * a nicety, and it must never be able to fail a build.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { LessonBlockOutputs } from "@/app/_components/mdx/BlockOutputs";

const MANIFEST_PATH = join(process.cwd(), "lib", "generated", "block-outputs.json");

let cache: Record<string, LessonBlockOutputs> | null = null;

function manifest(): Record<string, LessonBlockOutputs> {
  if (cache) return cache;
  try {
    cache = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Record<
      string,
      LessonBlockOutputs
    >;
  } catch {
    cache = {};
  }
  return cache;
}

/**
 * Outputs for one lesson, or null.
 *
 * `contentPath` is the lesson's path relative to the repository root, e.g.
 * `content/courses/python-basics/loops.mdx`, which is how the generator keys
 * them. Fumadocs hands each route a path relative to *its* collection root,
 * so the routes prepend their own directory.
 */
export function lessonBlockOutputs(
  contentPath: string,
): LessonBlockOutputs | null {
  return manifest()[contentPath] ?? null;
}
