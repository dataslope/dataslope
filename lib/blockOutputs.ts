/**
 * Build-time lookup into the generated block-output manifest. Read with `fs`
 * rather than `import`: a static import bundles the manifest into the
 * OpenNext Worker and pushes it past Cloudflare's 10 MiB gzipped cap, while
 * both MDX routes are fully prerendered so this only runs during `next
 * build`. Read once and memoised. A missing or unparseable manifest resolves
 * to empty — prepopulated output is a nicety and must never fail a build.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { LessonBlockOutputs } from "@/app/_components/mdx/BlockOutputs";

let cache: Record<string, LessonBlockOutputs> | null = null;

/**
 * Read the manifest, or resolve to empty. Everything — the path computation
 * included — must stay inside the `try`: on a runtime without `process.cwd`
 * (a deployed Worker rendering a cache miss) a module-scope `join` threw
 * during evaluation and 500ed every render. Empty is a correct answer: the
 * reader gets the pre-feature panel and Run still works.
 */
function manifest(): Record<string, LessonBlockOutputs> {
  if (cache) return cache;
  try {
    const path = join(process.cwd(), "lib", "generated", "block-outputs.json");
    cache = JSON.parse(readFileSync(path, "utf8")) as Record<
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
